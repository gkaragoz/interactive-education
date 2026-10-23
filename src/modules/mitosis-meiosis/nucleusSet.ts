import { Color, DynamicDrawUsage, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Group, type Material } from 'three';
import type { CellFrames } from './cellFrames';
import type { Plan } from './plan';
import { NUC_CH } from './plan';
import { smoothstep } from './keys';

export const SLOTS = 7;
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

interface Patch {
  dir: Vector3;
  sx: number;
  sy: number;
  h: number;
  tx: Vector3;
  ty: Vector3;
}

/** Sphere tiled by lat/long patches (about 82): the same tiling serves every nucleus. */
function tiling(): Patch[] {
  const bands = 4;
  const out: Patch[] = [];
  let id = 0;
  for (let j = 0; j < bands; j++) {
    const lat = ((j + 0.5) / bands) * Math.PI - Math.PI / 2;
    const n = Math.max(3, Math.round(2 * bands * Math.cos(lat)));
    for (let i = 0; i < n; i++, id++) {
      const lon = ((i + (j % 2) * 0.5) / n) * Math.PI * 2;
      const dir = new Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
      const east = new Vector3(-Math.sin(lon), 0, Math.cos(lon));
      const north = new Vector3().crossVectors(dir, east).negate();
      const h = Math.abs(Math.sin(id * 12.9898) * 43758.5453) % 1;
      out.push({
        dir,
        sx: (Math.PI * Math.cos(lat)) / n / 0.5 * 0.93,
        sy: (Math.PI / bands / 2) / 0.5 * 0.95,
        h,
        tx: east,
        ty: north,
      });
    }
  }
  return out;
}

const PATCHES = tiling();
export const PATCH_COUNT = PATCHES.length;

const mat = new Matrix4();
const basis = new Matrix4();
const q = new Quaternion();
const p = new Vector3();
const c = new Vector3();
const s3 = new Vector3();
const dx = new Vector3();
const dy = new Vector3();
const dz = new Vector3();

/** Nuclear envelopes as instanced fragments (they can break up and re-form), plus nucleoplasm and nucleoli. */
export class NucleusSet {
  readonly patches: InstancedMesh;
  readonly fill: InstancedMesh;
  readonly nucleoli: InstancedMesh;
  readonly vals = Array.from({ length: SLOTS }, () => new Float32Array(NUC_CH.length));
  readonly world = new Float32Array(SLOTS * 3);
  readonly materials: Material[];

  constructor(parent: Group, patch: BufferGeometry, patchMat: Material, sphere: BufferGeometry, fillMat: Material, nucleolusMat: Material) {
    this.materials = [patchMat, fillMat];
    this.patches = new InstancedMesh(patch, patchMat, SLOTS * PATCH_COUNT);
    this.fill = new InstancedMesh(sphere, fillMat, SLOTS);
    this.nucleoli = new InstancedMesh(sphere, nucleolusMat, SLOTS);
    for (const mesh of [this.patches, this.fill, this.nucleoli]) {
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
    }
    this.patches.renderOrder = 45;
    this.fill.renderOrder = 22;
    this.nucleoli.renderOrder = 28;
    const white = new Color('#cbbbe6');
    for (let i = 0; i < SLOTS * PATCH_COUNT; i++) {
      this.patches.setMatrixAt(i, HIDDEN);
      this.patches.setColorAt(i, white);
    }
    for (let i = 0; i < SLOTS; i++) {
      this.fill.setMatrixAt(i, HIDDEN);
      this.fill.setColorAt(i, new Color('#9a86c8'));
      this.nucleoli.setMatrixAt(i, HIDDEN);
      this.nucleoli.setColorAt(i, new Color('#6d4a8f'));
    }
    parent.add(this.fill, this.nucleoli, this.patches);
  }

  update(plan: Plan, t: number, frames: CellFrames): void {
    for (let s = 0; s < SLOTS; s++) {
      const v = this.vals[s] as Float32Array;
      (plan.nuc[s] as { eval(t: number, o: Float32Array): void }).eval(t, v);
      const on = v[0] as number;
      const cm = frames.matrix(Math.round(v[1] as number));
      const cq = frames.quat(Math.round(v[1] as number));
      c.set(v[2] as number, v[3] as number, v[4] as number).applyMatrix4(cm);
      this.world.set([c.x, c.y, c.z], s * 3);
      const r = v[5] as number;
      const integ = v[6] as number;
      const scat = v[7] as number;
      const e = integ * integ * (3 - 2 * integ);
      const base = s * PATCH_COUNT;
      if (on < 0.02 || r < 0.05) {
        for (let i = 0; i < PATCH_COUNT; i++) this.patches.setMatrixAt(base + i, HIDDEN);
        this.fill.setMatrixAt(s, HIDDEN);
        this.nucleoli.setMatrixAt(s, HIDDEN);
        continue;
      }
      for (let i = 0; i < PATCH_COUNT; i++) {
        const pt = PATCHES[i] as Patch;
        const away = r + scat * (0.4 + 1.0 * pt.h);
        const k = e * r + (1 - e) * away;
        // dispersed fragments drift toward a flatter shell around the former nucleus and tumble
        p.copy(pt.dir).multiplyScalar(k);
        const tilt = (1 - e) * (1.2 + pt.h);
        dz.copy(pt.dir).addScaledVector(pt.tx, Math.sin(pt.h * 40) * tilt * 0.6).addScaledVector(pt.ty, Math.cos(pt.h * 31) * tilt * 0.6).normalize();
        dx.copy(pt.tx).addScaledVector(dz, -pt.tx.dot(dz)).normalize();
        dy.crossVectors(dz, dx);
        basis.makeBasis(dx, dy, dz);
        q.setFromRotationMatrix(basis);
        q.premultiply(cq);
        const zs = r * (0.35 + 0.65 * e) * on;
        p.addScaledVector(dz, -zs).applyQuaternion(cq).add(c);
        const sz = (e + (1 - e) * 0.38) * on;
        s3.set(r * pt.sx * sz, r * pt.sy * sz, zs);
        this.patches.setMatrixAt(base + i, mat.compose(p, q, s3));
      }
      const fillS = r * 0.97 * smoothstep(0.55, 0.95, integ) * on;
      this.fill.setMatrixAt(s, fillS < 0.01 ? HIDDEN : mat.compose(c, q.identity(), s3.set(fillS, fillS, fillS)));
      const nl = (v[8] as number) * on;
      const ns = r * 0.2 * nl;
      p.set(r * 0.28, r * 0.18, r * 0.1).applyQuaternion(cq).add(c);
      this.nucleoli.setMatrixAt(s, ns < 0.01 ? HIDDEN : mat.compose(p, q.identity(), s3.set(ns, ns, ns)));
    }
    this.patches.instanceMatrix.needsUpdate = true;
    this.fill.instanceMatrix.needsUpdate = true;
    this.nucleoli.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.patches.dispose();
    this.fill.dispose();
    this.nucleoli.dispose();
  }
}
