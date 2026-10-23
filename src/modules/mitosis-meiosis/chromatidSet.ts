import { Color, Euler, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3, DynamicDrawUsage, type BufferGeometry, type Group, type Material } from 'three';
import type { Plan } from './plan';
import { CHR_CH } from './plan';
import type { CellFrames } from './cellFrames';

const eul = new Euler(0, 0, 0, 'XZY');
const qLocal = new Quaternion();
const qWorld = new Quaternion();
const pos = new Vector3();
const scl = new Vector3();
const m = new Matrix4();
const one = new Vector3(1, 1, 1);
const kp = new Vector3();
const off = new Vector3();
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

export const CAP = 16;

/** The chromatids (instanced, bent and painted in the shader) and their kinetochores. */
export class ChromatidSet {
  readonly mesh: InstancedMesh;
  readonly kineto: InstancedMesh;
  readonly vals = Array.from({ length: CAP }, () => new Float32Array(CHR_CH.length));
  /** World position of each kinetochore and of each centromere after the last `update`. */
  readonly kpos = new Float32Array(CAP * 3);
  readonly cpos = new Float32Array(CAP * 3);
  readonly kvis = new Float32Array(CAP);
  /** World position of each long-arm tip (where a chiasma forms) and world rotation (xyzw) of each chromatid. */
  readonly tpos = new Float32Array(CAP * 3);
  readonly qw = new Float32Array(CAP * 4);
  private readonly iA = new InstancedBufferAttribute(new Float32Array(CAP * 4), 4);
  private readonly iAlt = new InstancedBufferAttribute(new Float32Array(CAP * 3), 3);
  count = 0;

  constructor(parent: Group, geometry: BufferGeometry, material: Material, kGeometry: BufferGeometry, kMaterial: Material) {
    this.iA.setUsage(DynamicDrawUsage);
    geometry.setAttribute('iA', this.iA);
    geometry.setAttribute('iAlt', this.iAlt);
    this.mesh = new InstancedMesh(geometry, material, CAP);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 30;
    this.kineto = new InstancedMesh(kGeometry, kMaterial, CAP);
    this.kineto.instanceMatrix.setUsage(DynamicDrawUsage);
    this.kineto.frustumCulled = false;
    this.kineto.renderOrder = 31;
    for (let i = 0; i < CAP; i++) {
      this.mesh.setMatrixAt(i, HIDDEN);
      this.kineto.setMatrixAt(i, HIDDEN);
      this.mesh.setColorAt(i, new Color(1, 1, 1));
      this.kineto.setColorAt(i, new Color('#d99a2b'));
    }
    parent.add(this.mesh, this.kineto);
  }

  /** Static per-chromatid colours (base tint through instanceColor, exchanged segment colour through iAlt). */
  setMeta(plan: Plan): void {
    const c = new Color();
    this.count = plan.chr.length;
    plan.meta.forEach((mt, i) => {
      this.mesh.setColorAt(i, c.set(mt.tint));
      this.iAlt.setXYZ(i, ...(c.set(mt.alt).toArray() as [number, number, number]));
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.iAlt.needsUpdate = true;
  }

  update(plan: Plan, t: number, frames: CellFrames): void {
    const n = plan.chr.length;
    for (let i = 0; i < CAP; i++) {
      if (i >= n) {
        this.mesh.setMatrixAt(i, HIDDEN);
        this.kineto.setMatrixAt(i, HIDDEN);
        continue;
      }
      const v = this.vals[i] as Float32Array;
      (plan.chr[i] as { eval(t: number, o: Float32Array): void }).eval(t, v);
      const phase = (plan.meta[i] as { phase: number }).phase;
      const on = v[0] as number;
      const cell = Math.round(v[1] as number);
      const wob = 0.03 * Math.min(1, (v[15] as number) + 0.3);
      pos.set((v[3] as number) + wob * Math.sin(t * 1.7 + phase), (v[4] as number) + wob * Math.sin(t * 1.3 + phase * 2), (v[5] as number) + wob * Math.cos(t * 1.9 + phase));
      eul.set(v[6] as number, v[8] as number, v[7] as number, 'XZY');
      qLocal.setFromEuler(eul);
      const cm = frames.matrix(cell);
      const cq = frames.quat(cell);
      qWorld.copy(cq).multiply(qLocal);
      pos.applyMatrix4(cm);
      const thick = (v[10] as number) * on;
      scl.set(thick, (v[9] as number) * on, thick);
      this.mesh.setMatrixAt(i, m.compose(pos, qWorld, scl));
      this.iA.setXYZW(i, v[11] as number, v[12] as number, phase * 3, v[13] as number);
      this.cpos.set([pos.x, pos.y, pos.z], i * 3);
      this.qw.set([qWorld.x, qWorld.y, qWorld.z, qWorld.w], i * 4);
      const bq = v[11] as number;
      const armLen = 0.65 * (v[9] as number) * on;
      off.set(armLen * Math.sin(bq), -armLen * Math.cos(bq), 0).applyQuaternion(qWorld).add(pos);
      this.tpos.set([off.x, off.y, off.z], i * 3);
      // kinetochore: on the outer face (-X) of the centromere
      const kin = (v[14] as number) * on;
      off.set(-1.2 * thick, 0, 0).applyQuaternion(qWorld);
      kp.copy(pos).add(off);
      this.kpos.set([kp.x, kp.y, kp.z], i * 3);
      this.kvis[i] = kin;
      const kk = (v[10] as number) / 0.19;
      scl.set(0.1 * kin * kk, 0.24 * kin * kk, 0.24 * kin * kk);
      this.kineto.setMatrixAt(i, m.compose(kp, qWorld, scl));
    }
    this.mesh.count = CAP;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.kineto.instanceMatrix.needsUpdate = true;
    this.iA.needsUpdate = true;
    void one;
  }

  dispose(): void {
    this.mesh.dispose();
    this.kineto.dispose();
  }
}
