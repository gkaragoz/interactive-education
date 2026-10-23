import {
  Color,
  DoubleSide,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  CylinderGeometry,
  ConeGeometry,
  type BufferGeometry,
  type MeshPhysicalMaterial,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { InstanceSet, ModuleContext } from '../../scene';
import { follow, type Anim } from './anim';
import { ShapePool, wrinkledGeometry } from './pools';
import { alleleTexture, textTexture, visionBadgeTexture, type TagTexture, type TextStyle } from './tags';

export { ShapePool };
export type ShapeName = 'sphere' | 'tile' | 'cube' | 'cyl' | 'cone' | 'wrinkle' | 'bubble';
const CAP: Record<ShapeName, number> = { sphere: 700, tile: 90, cube: 40, cyl: 90, cone: 40, wrinkle: 70, bubble: 80 };
const M = new Matrix4();
const Q = new Quaternion();
const E = new Euler();
const P = new Vector3();
const S = new Vector3();
const TMP = new Color();

export interface ShapeSpec {
  shape: ShapeName;
  anim: Anim;
  /** Size along each axis at scale 1 (spheres: radii; tile/cube/cyl/cone: full size, cyl/cone: radius in x and z, height in y). */
  size: readonly [number, number, number];
  color: string | ((t: number) => string);
  rot?: readonly [number, number, number];
}

export interface TagSpec {
  anim: Anim;
  /** World height at scale 1. */
  height: number;
  /** Never wider than this (the tag shrinks to fit). */
  maxWidth?: number;
  alleles?: readonly string[];
  text?: string;
  badge?: 'normal' | 'carrier' | 'blind';
  style?: TextStyle;
}

export interface ChromoSpec {
  single: boolean;
  anim: Anim;
  color: string;
  /** Allele colour drawn as a band across the chromosome. */
  band?: string;
  /** Extra rotation about Z (singles are rotated upright by the kit). */
  rotZ?: number;
}

/** Everything a track plan can ask for. Rebuilt (reset) when the options change; `update(t)` poses it all. */
export class Kit {
  readonly root = new Group();
  private readonly pools = {} as Record<Exclude<ShapeName, 'tile'>, ShapePool>;
  private readonly actors: Array<(t: number) => void> = [];
  private readonly tagMeshes: Mesh[] = [];
  private readonly textures = new Map<string, TagTexture>();
  private readonly plane = new PlaneGeometry(1, 1);
  private readonly geos: BufferGeometry[] = [this.plane];
  private chromos!: InstanceSet;
  private singles!: InstanceSet;
  private tiles!: InstanceSet;
  private tileUsed = 0;
  private tokenTpl: Object3D | null = null;
  private readonly tokens: Object3D[] = [];
  private readonly tokenMats: Array<{ dispose(): void }> = [];
  private chromoUsed = 0;
  private singleUsed = 0;

  static async create(ctx: ModuleContext): Promise<Kit> {
    const kit = new Kit();
    const detail = ctx.quality === 'low' ? 0 : ctx.quality === 'medium' ? 1 : 2;
    const lib = ctx.assets.materials;
    const clay = lib.get('gn-clay', 'clay') as MeshPhysicalMaterial;
    const bubble = lib.shell('membrane-animal');
    const seg = 12 + detail * 4;
    const geo: Record<Exclude<ShapeName, 'tile'>, BufferGeometry> = {
      sphere: new SphereGeometry(1, seg, Math.round(seg * 0.7)),
      cube: new RoundedBoxGeometry(1, 1, 1, 3, 0.12),
      cyl: new CylinderGeometry(1, 1, 1, seg + 4),
      cone: new ConeGeometry(1, 1, seg + 4),
      wrinkle: wrinkledGeometry(),
      bubble: new SphereGeometry(1, seg * 2, seg),
    };
    for (const name of Object.keys(geo) as Array<Exclude<ShapeName, 'tile'>>) {
      const pool = new ShapePool(geo[name], name === 'bubble' ? bubble : clay, CAP[name], name === 'bubble' ? 45 : 30);
      kit.pools[name] = pool;
      kit.root.add(pool.mesh);
      kit.geos.push(geo[name]);
    }
    // Punnett tiles and allele tokens are module assets (batch 4); a missing file falls back to a placeholder
    kit.tiles = await ctx.assets.instances('punnett-tile', CAP.tile, '#e4d3b5');
    kit.root.add(kit.tiles.group);
    kit.tokenTpl = await ctx.assets.loadGlb('allele-token', '#e8d9b0');
    kit.chromos = await ctx.assets.instances('chromosome', 24, '#e8b030');
    kit.singles = await ctx.assets.instances('chromosome-single', 56, '#e8b030');
    kit.root.add(kit.chromos.group, kit.singles.group);
    kit.chromos.group.renderOrder = 30;
    return kit;
  }

  /** Forget every actor (before a rebuild). */
  reset(): void {
    this.actors.length = 0;
    for (const p of Object.values(this.pools)) p.reset();
    for (const m of this.tagMeshes) {
      m.removeFromParent();
      (m.material as MeshBasicMaterial).dispose();
    }
    this.tagMeshes.length = 0;
    for (const t of this.tokens) t.removeFromParent();
    this.tokens.length = 0;
    for (const m of this.tokenMats) m.dispose();
    this.tokenMats.length = 0;
    this.tileUsed = 0;
    for (let i = 0; i < this.tiles.count; i++) this.tiles.setVisible(i, false);
    this.chromoUsed = 0;
    this.singleUsed = 0;
    for (let i = 0; i < this.chromos.count; i++) this.chromos.setVisible(i, false);
    for (let i = 0; i < this.singles.count; i++) this.singles.setVisible(i, false);
  }

  /** A Punnett tile asset: footprint from size x and y, thickness from size z; its top face (+Y) is turned to +Z. */
  private tile(spec: ShapeSpec): void {
    const slot = this.tileUsed++;
    if (slot >= this.tiles.count) throw new Error('genetics: out of tiles');
    const set = this.tiles;
    const [sx, sy, sz] = spec.size;
    const p = { x: 0, y: 0, z: 0, s: 0 };
    let last = '';
    this.actors.push((t) => {
      spec.anim(t, p);
      if (p.s < 0.001) set.setVisible(slot, false);
      else set.setMatrix(slot, M.compose(P.set(p.x, p.y, p.z), Q.setFromEuler(E.set(Math.PI / 2, 0, 0)), S.set(sx * p.s, Math.max(sz, 0.3) * p.s, sy * p.s)));
      const c = typeof spec.color === 'string' ? spec.color : spec.color(t);
      if (c !== last) {
        set.setTint(slot, c);
        last = c;
      }
    });
  }

  /** An allele token (asset sphere with a lettered face), following `anim` (scale 1 = 0.6 across). */
  token(spec: { anim: Anim; alleles: readonly string[]; color: string; scale: number }): void {
    const tpl = this.tokenTpl;
    if (!tpl) return;
    const obj = tpl.clone(true);
    // The asset's `face` mesh is hidden: its UVs do not span the whole square as meta.json says, so the letters are drawn
    // as an ordinary tag plane on the token body instead.
    obj.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name.includes('face')) mesh.visible = false;
      else {
        const m = (mesh.material as MeshPhysicalMaterial).clone();
        m.color.set(spec.color);
        mesh.material = m;
        this.tokenMats.push(m);
      }
    });
    this.tag({ alleles: spec.alleles, height: 0.42 * spec.scale, maxWidth: 0.62 * spec.scale, anim: follow(spec.anim, 0, 0, 0.3) });
    obj.visible = false;
    this.root.add(obj);
    this.tokens.push(obj);
    const p = { x: 0, y: 0, z: 0, s: 0 };
    this.actors.push((t) => {
      spec.anim(t, p);
      obj.visible = p.s > 0.02;
      if (!obj.visible) return;
      obj.position.set(p.x, p.y, p.z);
      obj.scale.setScalar(p.s * spec.scale);
    });
  }

  shape(spec: ShapeSpec): void {
    if (spec.shape === 'tile') return this.tile(spec);
    const pool = this.pools[spec.shape];
    const slot = pool.alloc();
    const [sx, sy, sz] = spec.size;
    const [rx, ry, rz] = spec.rot ?? [0, 0, 0];
    const p = { x: 0, y: 0, z: 0, s: 0 };
    let last = '';
    this.actors.push((t) => {
      spec.anim(t, p);
      pool.put(slot, p.x, p.y, p.z, sx * p.s, sy * p.s, sz * p.s, rx, ry, rz);
      const c = typeof spec.color === 'string' ? spec.color : spec.color(t);
      if (c !== last) {
        pool.mesh.setColorAt(slot, TMP.set(c));
        if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
        last = c;
      }
    });
  }

  private texture(key: string, make: () => TagTexture): TagTexture {
    let tex = this.textures.get(key);
    if (!tex) {
      tex = make();
      this.textures.set(key, tex);
    }
    return tex;
  }

  tag(spec: TagSpec): void {
    const style = spec.style ?? {};
    const key = spec.badge ? `b:${spec.badge}` : spec.alleles ? `a:${spec.alleles.join('|')}:${style.color ?? ''}:${style.bg ?? ''}` : `t:${spec.text}:${style.color ?? ''}:${style.bg ?? ''}:${style.size ?? ''}`;
    const tex = this.texture(key, () => (spec.badge ? visionBadgeTexture(spec.badge) : spec.alleles ? alleleTexture(spec.alleles, style) : textTexture(spec.text ?? '', style)));
    const mat = new MeshBasicMaterial({ map: tex.texture, transparent: true, depthWrite: false, toneMapped: false, side: DoubleSide });
    const mesh = new Mesh(this.plane, mat);
    mesh.renderOrder = 60;
    mesh.visible = false;
    this.root.add(mesh);
    this.tagMeshes.push(mesh);
    const p = { x: 0, y: 0, z: 0, s: 0 };
    this.actors.push((t) => {
      spec.anim(t, p);
      const on = p.s > 0.02;
      mesh.visible = on;
      if (!on) return;
      mesh.position.set(p.x, p.y, p.z);
      const h = Math.min(spec.height, (spec.maxWidth ?? Infinity) / tex.aspect);
      mesh.scale.set(h * p.s * tex.aspect, h * p.s, 1);
    });
  }

  chromo(spec: ChromoSpec): void {
    const set = spec.single ? this.singles : this.chromos;
    const slot = spec.single ? this.singleUsed++ : this.chromoUsed++;
    if (slot >= set.count) throw new Error('genetics: out of chromosome instances');
    const rz = (spec.single ? -Math.PI / 2 : 0) + (spec.rotZ ?? 0);
    const p = { x: 0, y: 0, z: 0, s: 0 };
    set.setTint(slot, spec.color);
    if (spec.band) {
      const w = spec.single ? 0.2 : 0.3;
      this.shape({ shape: 'sphere', anim: follow(spec.anim, 0, spec.single ? -0.2 : 0.22, 0.08), size: [w, 0.055, 0.12], color: spec.band });
    }
    this.actors.push((t) => {
      spec.anim(t, p);
      if (p.s < 0.01) {
        set.setVisible(slot, false);
        return;
      }
      set.setMatrix(slot, M.compose(P.set(p.x, p.y, p.z), Q.setFromEuler(E.set(0, 0, rz)), S.set(p.s, p.s, p.s)));
    });
  }

  update(t: number): void {
    for (const a of this.actors) a(t);
    for (const pool of Object.values(this.pools)) pool.mesh.instanceMatrix.needsUpdate = true;
    this.tiles.commit();
    this.chromos.commit();
    this.singles.commit();
  }

  get usage(): Record<string, number> {
    return { chromosome: this.chromoUsed, single: this.singleUsed, tile: this.tileUsed, token: this.tokens.length, ...Object.fromEntries(Object.entries(this.pools).map(([k, p]) => [k, p.used])), tags: this.tagMeshes.length };
  }

  dispose(): void {
    this.reset();
    for (const t of this.textures.values()) t.texture.dispose();
    this.textures.clear();
    for (const p of Object.values(this.pools)) p.mesh.dispose();
    for (const g of this.geos) g.dispose();
    this.tiles.dispose();
    this.chromos.dispose();
    this.singles.dispose();
    this.root.removeFromParent();
  }
}
