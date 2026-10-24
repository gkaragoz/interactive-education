import { DoubleSide, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2, type BufferGeometry } from 'three';
import type { Vessel, VesselKind, VesselVisual } from '../../chemlab';
import { Bubbles, type BubbleField } from './fxBubbles';
import { approach, clamp } from './helpers';
import { partGeometry, type LabAsset } from './labAssets';
import { LiquidMesh } from './liquid';
import { profileOf, type Profile } from './profile';
import { VesselView, type ViewDeps } from './vesselView';

const MOLAR_ML = 24465;
const LIMB_ML = 50;

/** Crucible with a lid (no GLB): a porcelain lathe body and a loose lid that lifts when the engine says it is open. */
export class CrucibleView extends VesselView {
  private lid = new Group();
  private lidOpen = 0;
  private readonly mats: MeshStandardMaterial[] = [];
  private readonly geos: BufferGeometry[] = [];

  override build(): void {
    const porcelain = new MeshStandardMaterial({ color: '#f4eee2', roughness: 0.42, metalness: 0.02, side: DoubleSide });
    this.mats.push(porcelain);
    const body = new LatheGeometry([new Vector2(0.001, 0), new Vector2(1.1, 0), new Vector2(1.5, 0.35), new Vector2(2.0, 2.6), new Vector2(2.2, 3.5), new Vector2(2.1, 3.6), new Vector2(1.85, 3.2), new Vector2(1.5, 0.85), new Vector2(0.001, 0.85)], 40);
    const lidGeo = new LatheGeometry([new Vector2(0.001, 0.75), new Vector2(0.45, 0.7), new Vector2(1.2, 0.35), new Vector2(2.4, 0.08), new Vector2(2.5, 0), new Vector2(2.2, 0.0), new Vector2(0.001, 0.4)], 40);
    this.geos.push(body, lidGeo);
    const mesh = new Mesh(body, porcelain);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const lid = new Mesh(lidGeo, porcelain);
    lid.castShadow = true;
    this.lid.add(lid);
    this.lid.position.set(0, 3.55, 0);
    this.body.add(mesh, this.lid);
    this.body.traverse((o) => {
      o.userData['simId'] = this.id;
    });
    this.profile = { r: new Float32Array(16).fill(1.5), yMin: 0.85, yMax: 3.2, cx: 0, cz: 0 };
    this.addShadow();
  }

  protected override buildLiquids(): void {
    // nothing is poured into the crucible; the metal and the ash are drawn by the pieces layer
  }

  override update(dt: number): void {
    super.update(dt);
    const open = this.raw?.lidOpen ?? false;
    this.lidOpen = approach(this.lidOpen, open ? 1 : 0, 5, dt);
    this.lid.position.set(this.lidOpen * 3.4, 3.55 + this.lidOpen * 1.6, 0);
    this.lid.rotation.z = -this.lidOpen * 0.55;
  }

  override dispose(): void {
    for (const m of this.mats) m.dispose();
    for (const g of this.geos) g.dispose();
    super.dispose();
  }
}

/** Funnel with its paper cone: the liquid uses the lathe cavity. The paper takes the colour of what is left on it. */
export class FunnelView extends VesselView {
  override build(): void {
    super.build();
    const paper = this.deps.assets.objectNow('filter-paper-cone').group;
    const origin = this.deps.assets.metaOf('filter-paper-cone').funnelOrigin ?? [0, 7.3, 0];
    paper.position.set(origin[0], origin[1] - 5, origin[2]);
    this.body.add(paper);
    paper.traverse((o) => {
      o.userData['simId'] = this.id;
    });
  }
}

/** Gas collection tube: a water-filled tube standing upside down; the engine's gas pushes the water out of it. */
export class GasTubeView extends VesselView {
  private gasFrac = 0;
  private gasTarget = 0;

  override build(): void {
    super.build();
    this.body.rotation.x = Math.PI;
    this.body.position.set(-this.def.lipX, this.def.topY, 0);
    this.target.rgb = [225, 238, 250];
    this.target.alpha = 0.34;
  }

  override sample(vis: VesselVisual, v: Readonly<Vessel>): void {
    super.sample(vis, v);
    let ml = 0;
    for (const k of Object.keys(v.mix)) if (k.startsWith('g:')) ml += (v.mix[k] ?? 0) * MOLAR_ML;
    this.gasTarget = clamp(ml / 50);
    this.target.rgb = [225, 238, 250];
    this.target.alpha = 0.34;
  }

  override update(dt: number): void {
    this.gasFrac = approach(this.gasFrac, this.gasTarget, 3, dt);
    this.fill = 1 - this.gasFrac;
    this.target.fill = this.fill;
    super.update(dt);
  }

  protected override updateLiquids(dt: number): void {
    const lm = this.liquids[0];
    if (!lm) return;
    const p = this.profile;
    // object space is flipped: the gas fills from the closed end (yMin) up to this height
    lm.set(this.liquidState(p.yMin + this.gasFrac * (p.yMax - p.yMin)), dt);
    lm.mesh.visible = true;
  }
}

/** Hofmann voltameter: three liquid columns; the electrode gases push the water down in the two limbs (H2 twice as fast). */
export class HofmannView extends VesselView {
  private readonly cols: { lm: LiquidMesh; profile: Profile; role: 'h2' | 'o2' | 'mid' }[] = [];
  private gas = { h2: 0, o2: 0 };
  private gasShown = { h2: 0, o2: 0 };
  private bubblesL: Bubbles | null = null;
  private bubblesR: Bubbles | null = null;
  private current = 0;
  private readonly fieldL: BubbleField = { y0: 0, ySurf: 0, radius: () => 0.9, cx: 0, cz: 0 };
  private readonly fieldR: BubbleField = { y0: 0, ySurf: 0, radius: () => 0.9, cx: 0, cz: 0 };
  private yTop = 40;
  private yBottom = 4.4;
  private readonly electrodeX = { l: -5, r: 5 };

  constructor(id: string, kind: VesselKind, labelTr: string, deps: ViewDeps, private readonly rng: (seed: number) => () => number) {
    super(id, kind, labelTr, deps);
  }

  protected override attachGlass(group: Group, asset: LabAsset): void {
    for (const n of ['inner-left', 'inner-right', 'inner-centre']) group.getObjectByName(n)?.removeFromParent();
    super.attachGlass(group, asset);
  }

  protected override buildLiquids(): void {
    const asset = this.asset;
    const liquids = asset?.meta.liquids;
    const defs: [string, 'h2' | 'o2' | 'mid'][] = [['inner-left', 'h2'], ['inner-right', 'o2'], ['inner-centre', 'mid']];
    for (const [name, role] of defs) {
      const geo = asset ? partGeometry(asset, name) : null;
      const info = liquids?.[name];
      if (!geo || !info) continue;
      const profile = profileOf(geo.getAttribute('position').array, info.yMin, info.yMax);
      const lm = new LiquidMesh(geo, profile, this.deps.low);
      this.body.add(lm.mesh);
      this.liquids.push(lm);
      this.cols.push({ lm, profile, role });
      if (role === 'h2') {
        this.yBottom = info.yMin;
        this.yTop = info.yMax;
        this.electrodeX.l = profile.cx;
      }
      if (role === 'o2') this.electrodeX.r = profile.cx;
    }
    const n = this.deps.low ? 30 : 90;
    const mk = (seed: number): Bubbles => {
      const b = new Bubbles(n, this.rng(seed));
      this.body.add(b.mesh);
      return b;
    };
    this.bubblesL = mk(77);
    this.bubblesR = mk(78);
  }

  override sample(vis: VesselVisual, v: Readonly<Vessel>): void {
    super.sample(vis, v);
    this.gas = { h2: (v.mix['g:h2'] ?? 0) * MOLAR_ML, o2: (v.mix['g:o2'] ?? 0) * MOLAR_ML };
    this.current = v.electrodes ? clamp(v.electrodes.volts / 9, 0.15, 1) : 0;
  }

  protected override updateLiquids(dt: number): void {
    const k = 1 - Math.exp(-dt * 3);
    this.gasShown.h2 += (this.gas.h2 - this.gasShown.h2) * k;
    this.gasShown.o2 += (this.gas.o2 - this.gasShown.o2) * k;
    const span = this.yTop - this.yBottom;
    for (const c of this.cols) {
      const p = c.profile;
      let level = p.yMin + clamp(this.fill) * (p.yMax - p.yMin);
      if (c.role === 'h2') level = p.yMax - clamp(this.gasShown.h2 / LIMB_ML) * span * 0.86 - (1 - clamp(this.fill * 4)) * span;
      if (c.role === 'o2') level = p.yMax - clamp(this.gasShown.o2 / LIMB_ML) * span * 0.86 - (1 - clamp(this.fill * 4)) * span;
      if (c.role === 'mid') level = p.yMin + (0.62 + 0.08 * clamp((this.gasShown.h2 + this.gasShown.o2) / 75)) * (p.yMax - p.yMin) * clamp(this.fill * 4);
      c.lm.set(this.liquidState(level), dt);
      c.lm.mesh.visible = this.fill > 0.01;
    }
    const intensity = this.current > 0 ? 0.35 + 0.65 * this.current : 0;
    if (this.fill > 0.01) {
      this.feed(this.bubblesL, this.fieldL, this.cols.find((q) => q.role === 'h2'), this.electrodeX.l, this.gasShown.h2, intensity, dt);
      this.feed(this.bubblesR, this.fieldR, this.cols.find((q) => q.role === 'o2'), this.electrodeX.r, this.gasShown.o2, intensity * 0.55, dt);
    }
  }

  private feed(b: Bubbles | null, f: BubbleField, c: { profile: Profile } | undefined, x: number, gasMl: number, intensity: number, dt: number): void {
    if (!b || !c) return;
    f.y0 = this.yBottom + 1.5;
    f.ySurf = c.profile.yMax - clamp(gasMl / LIMB_ML) * (this.yTop - this.yBottom) * 0.86;
    f.cx = x;
    f.cz = c.profile.cz;
    b.update(dt, intensity, this.deps.low ? 'low' : 'medium', this.deps.reduced, f);
  }

  override dispose(): void {
    this.bubblesL?.dispose();
    this.bubblesR?.dispose();
    super.dispose();
  }
}

