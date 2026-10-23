import { Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3, type BufferGeometry, type Material } from 'three';
import type { ModuleContext } from '../../scene';
import { atomsGeometry, atomsRadius, coinGeometry, KINDS, type KindId, type KindSpec } from './kinds';

const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const M = new Matrix4();
const SC = new Vector3();
const TINT = new Color();

/** `count` instances of one molecule kind: a painted GLB when the file exists, else a procedural ball model. */
export interface MolSet {
  readonly mesh: InstancedMesh | null;
  readonly group: import('three').Object3D;
  pose(i: number, pos: Vector3, q: Quaternion, scale: number): void;
  /** Pose with a rotor turning by `angle` about the vertical axis (only painted assets that have a rotor part). */
  poseSpin?(i: number, pos: Vector3, q: Quaternion, scale: number, angle: number): void;
  hide(i: number): void;
  tint(i: number, color: Color): void;
  commit(): void;
  dispose(): void;
}

class ProcSet implements MolSet {
  readonly mesh: InstancedMesh;
  readonly group: InstancedMesh;
  private colorDirty = false;

  constructor(spec: KindSpec, material: Material, count: number, detail: number) {
    const geo = spec.coin ? coinGeometry(spec.coin.face, spec.coin.rim, spec.coin.bumps, 14 + detail * 6) : atomsGeometry(spec.atoms, 8 + detail * 4);
    this.mesh = new InstancedMesh(geo, material, Math.max(count, 1));
    this.group = this.mesh;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = spec.glow ? 45 : 30;
    this.mesh.castShadow = !spec.glow;
    for (let i = 0; i < this.mesh.count; i++) {
      this.mesh.setMatrixAt(i, HIDDEN);
      this.mesh.setColorAt(i, TINT.set('#ffffff'));
    }
  }

  pose(i: number, pos: Vector3, q: Quaternion, scale: number): void {
    this.mesh.setMatrixAt(i, M.compose(pos, q, SC.set(scale, scale, scale)));
  }

  hide(i: number): void {
    this.mesh.setMatrixAt(i, HIDDEN);
  }

  tint(i: number, color: Color): void {
    this.mesh.setColorAt(i, color);
    this.colorDirty = true;
  }

  commit(): void {
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.colorDirty && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.colorDirty = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}

/** Painted GLB path: every mesh of the asset is its own instanced mesh; parts named `rotor` can turn on their own. */
class AssetSet implements MolSet {
  readonly mesh = null;
  readonly group = new Group();
  private readonly meshes: { mesh: InstancedMesh; spins: boolean }[] = [];
  private readonly count: number;
  private colorDirty = false;
  private readonly m2 = new Matrix4();
  private readonly qs = new Quaternion();
  private readonly ys = new Vector3(0, 1, 0);

  constructor(
    parts: readonly { name: string; geometry: BufferGeometry; kind: 'clay' | 'gel' }[],
    id: string,
    ctx: ModuleContext,
    count: number,
    private readonly unit: number,
  ) {
    this.count = Math.max(count, 1);
    this.group.name = `${id}-instances`;
    for (const part of parts) {
      const mesh = new InstancedMesh(part.geometry, ctx.assets.materials.get(id, part.kind), this.count);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = part.kind === 'clay';
      mesh.renderOrder = part.kind === 'gel' ? 40 : 30;
      for (let i = 0; i < this.count; i++) {
        mesh.setMatrixAt(i, HIDDEN);
        mesh.setColorAt(i, TINT.set('#ffffff'));
      }
      this.group.add(mesh);
      this.meshes.push({ mesh, spins: /rotor/.test(part.name) });
    }
  }

  pose(i: number, pos: Vector3, q: Quaternion, scale: number): void {
    M.compose(pos, q, SC.setScalar(scale * this.unit));
    for (const { mesh } of this.meshes) mesh.setMatrixAt(i, M);
  }

  poseSpin(i: number, pos: Vector3, q: Quaternion, scale: number, angle: number): void {
    M.compose(pos, q, SC.setScalar(scale * this.unit));
    this.qs.setFromAxisAngle(this.ys, angle);
    this.m2.makeRotationFromQuaternion(this.qs);
    this.m2.premultiply(M);
    for (const { mesh, spins } of this.meshes) mesh.setMatrixAt(i, spins ? this.m2 : M);
  }

  hide(i: number): void {
    for (const { mesh } of this.meshes) mesh.setMatrixAt(i, HIDDEN);
  }
  tint(i: number, color: Color): void {
    for (const { mesh } of this.meshes) mesh.setColorAt(i, color);
    this.colorDirty = true;
  }
  commit(): void {
    for (const { mesh } of this.meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (this.colorDirty && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.colorDirty = false;
  }
  dispose(): void {
    for (const { mesh } of this.meshes) mesh.dispose();
    this.group.removeFromParent();
  }
}

const probed = new Map<string, Promise<number | null>>();
/** Bounding radius from `<asset>.meta.json`, or null when the model does not exist (no toast, no placeholder). */
function probe(id: string): Promise<number | null> {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
  const url = `${base}models/modules/${id}.meta.json`;
  let p = probed.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<{ boundsRadius?: number }>) : null))
      .then((m) => (m && typeof m.boundsRadius === 'number' && m.boundsRadius > 0 ? m.boundsRadius : null))
      .catch(() => null);
    probed.set(url, p);
  }
  return p;
}

const glowMaterials = new WeakMap<object, MeshBasicMaterial>();

export async function createMolSet(ctx: ModuleContext, kind: KindId, count: number, own: Array<{ dispose(): void }>): Promise<MolSet> {
  const spec: KindSpec = KINDS[kind];
  if (spec.asset) {
    const radius = await probe(spec.asset);
    if (radius) {
      const asset = await ctx.assets.asset(spec.asset);
      const parts = asset.lods[ctx.quality === 'low' ? 1 : 0] ?? asset.lods[0] ?? [];
      const set = new AssetSet(parts, spec.asset, ctx, count, atomsRadius(spec.atoms) / radius);
      own.push(set);
      return set;
    }
  }
  const detail = ctx.quality === 'low' ? 0 : ctx.quality === 'medium' ? 1 : 2;
  let material: Material;
  if (spec.glow) {
    const key = ctx.assets;
    let mat = glowMaterials.get(key);
    if (!mat) {
      mat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
      glowMaterials.set(key, mat);
      own.push(mat);
    }
    material = mat;
  } else material = ctx.assets.materials.get('energy-mol', 'clay');
  const set = new ProcSet(spec, material, count, detail);
  own.push(set);
  return set;
}
