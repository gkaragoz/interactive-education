import { Color, DynamicDrawUsage, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Group, type Material } from 'three';
import type { CellFrames } from './cellFrames';
import type { ChromatidSet } from './chromatidSet';
import type { Plan } from './plan';
import { POLE_CH, SPN_CH } from './plan';
import type { InstanceSet, QualityPreset } from '../../scene';

const X = new Vector3(1, 0, 0);
const q = new Quaternion();
const m = new Matrix4();
const a = new Vector3();
const b = new Vector3();
const d = new Vector3();
const one = new Vector3(1, 1, 1);
const s3 = new Vector3();
const zAxis = new Vector3(0, 0, 1);
const pL = new Vector3();
const pR = new Vector3();
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

export const KF = 16;
const FIBRES_PER_CELL = (ip: number, ast: number): number => ip * 2 + ast * 2;

const hash = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Spindle fibres (kinetochore, interpolar, astral rays) and the centrosomes, all instanced. */
export class SpindleSet {
  readonly fibres: InstancedMesh;
  readonly poleVals = Array.from({ length: 4 }, () => new Float32Array(POLE_CH.length));
  /** Pole world positions after the last update. */
  readonly ppos = new Float32Array(12);
  private readonly spn = [new Float32Array(SPN_CH.length), new Float32Array(SPN_CH.length)];
  private readonly ip: number;
  private readonly ast: number;
  private readonly per: number;
  private readonly cap: number;
  private readonly tint = {
    kf: new Color('#e0a63a'),
    ip: new Color('#d9a441'),
    ast: new Color('#e3b95c'),
  };

  /** `kfibres` (2 x KF) and `polePieces` (4) are instance sets of the painted GLBs (or their placeholders). */
  constructor(parent: Group, fibre: BufferGeometry, fibreMat: Material, private readonly kfibres: InstanceSet, private readonly polePieces: InstanceSet, quality: QualityPreset) {
    this.ip = quality === 'low' ? 2 : quality === 'medium' ? 3 : 4;
    this.ast = quality === 'low' ? 0 : quality === 'medium' ? 6 : 10;
    this.per = FIBRES_PER_CELL(this.ip, this.ast);
    this.cap = this.per * 2;
    this.fibres = new InstancedMesh(fibre, fibreMat, this.cap);
    this.fibres.instanceMatrix.setUsage(DynamicDrawUsage);
    this.fibres.frustumCulled = false;
    this.fibres.renderOrder = 25;
    for (let i = 0; i < this.cap; i++) {
      this.fibres.setMatrixAt(i, HIDDEN);
      this.fibres.setColorAt(i, this.tint.ast);
    }
    parent.add(this.fibres);
  }

  private put(slot: number, from: Vector3, to: Vector3, len: number, radius: number, color: Color): void {
    d.subVectors(to, from);
    const full = d.length();
    if (full < 1e-5 || len < 0.02) {
      this.fibres.setMatrixAt(slot, HIDDEN);
      return;
    }
    d.multiplyScalar(1 / full);
    q.setFromUnitVectors(X, d);
    s3.set(len, radius, radius);
    this.fibres.setMatrixAt(slot, m.compose(from, q, s3));
    this.fibres.setColorAt(slot, color);
  }

  update(plan: Plan, t: number, frames: CellFrames, chroms: ChromatidSet): void {
    // poles: world positions
    for (let i = 0; i < 4; i++) {
      const v = this.poleVals[i] as Float32Array;
      (plan.poles[i] as { eval(t: number, o: Float32Array): void }).eval(t, v);
      const cell = Math.round(v[1] as number);
      const ang = v[2] as number;
      const rad = v[3] as number;
      a.set(Math.cos(ang) * rad, Math.sin(ang) * rad, v[4] as number).applyMatrix4(frames.matrix(cell));
      this.ppos.set([a.x, a.y, a.z], i * 3);
      const size = v[0] as number;
      q.setFromAxisAngle(zAxis, ang + frames.vals[cell === 1 ? 1 : 0]![3]!);
      const sc = 1.1 * size * (0.6 + 0.4 * (v[5] as number));
      s3.set(sc, sc, sc);
      if (size < 0.02) this.polePieces.setVisible(i, false);
      else this.polePieces.setMatrix(i, m.compose(a, q, s3));
    }
    this.polePieces.commit();

    for (let s = 0; s < 2; s++) {
      const sp = this.spn[s] as Float32Array;
      (plan.spn[s] as { eval(t: number, o: Float32Array): void }).eval(t, sp);
      const base = s * this.per;
      let slot = base;
      const cm = frames.matrix(s);
      pL.set(this.ppos[s * 6] as number, this.ppos[s * 6 + 1] as number, this.ppos[s * 6 + 2] as number);
      pR.set(this.ppos[s * 6 + 3] as number, this.ppos[s * 6 + 4] as number, this.ppos[s * 6 + 5] as number);
      const sizeL = (this.poleVals[s * 2] as Float32Array)[0] as number;
      const sizeR = (this.poleVals[s * 2 + 1] as Float32Array)[0] as number;
      // kinetochore fibres (the painted GLB, pivot at the kinetochore end): grow from the kinetochore toward the pole
      for (let i = 0; i < KF; i++) {
        const k = s * KF + i;
        const att = i < plan.chr.length && Math.round((chroms.vals[i] as Float32Array)[1] as number) === s ? ((chroms.vals[i] as Float32Array)[15] as number) : 0;
        if (att < 0.02) {
          this.kfibres.setVisible(k, false);
          continue;
        }
        const right = Math.round((chroms.vals[i] as Float32Array)[2] as number) === 1;
        a.copy(right ? pR : pL);
        b.set(chroms.kpos[i * 3] as number, chroms.kpos[i * 3 + 1] as number, chroms.kpos[i * 3 + 2] as number);
        d.subVectors(a, b);
        const full = d.length();
        if (full < 1e-5) {
          this.kfibres.setVisible(k, false);
          continue;
        }
        d.multiplyScalar(1 / full);
        q.setFromUnitVectors(X, d);
        s3.set(full * Math.min(1, att), 0.5, 0.5);
        this.kfibres.setMatrix(k, m.compose(b, q, s3));
      }
      // interpolar fibres: each pole to a point past the equator on a thin core around the axis
      const ip = sp[0] as number;
      const ovl = sp[1] as number;
      for (let j = 0; j < this.ip; j++) {
        const al = (j / this.ip) * Math.PI * 2 + 0.4;
        for (let side = 0; side < 2; side++, slot++) {
          if (ip < 0.02 || (side === 0 ? sizeL : sizeR) < 0.5) {
            this.fibres.setMatrixAt(slot, HIDDEN);
            continue;
          }
          const sg = side === 0 ? 1 : -1;
          a.copy(side === 0 ? pL : pR);
          b.set(sg * ovl, 0.5 * Math.cos(al), 0.5 * Math.sin(al)).applyMatrix4(cm);
          this.put(slot, a, b, a.distanceTo(b) * ip, 0.8, this.tint.ip);
        }
      }
      // astral rays
      for (let side = 0; side < 2; side++) {
        const pv = this.poleVals[s * 2 + side] as Float32Array;
        const aster = pv[5] as number;
        const ang = pv[2] as number;
        const rot = frames.vals[s]![3] as number;
        for (let j = 0; j < this.ast; j++, slot++) {
          if (aster < 0.05 || pv[0]! < 0.5) {
            this.fibres.setMatrixAt(slot, HIDDEN);
            continue;
          }
          const h1 = hash(j + side * 31 + s * 7);
          const h2 = hash(j * 3 + 11 + side * 5);
          const phi = 0.25 + 1.0 * h1;
          const psi = j * 2.399 + h2;
          const ca = Math.cos(ang + rot);
          const sa = Math.sin(ang + rot);
          // outward axis (ca, sa, 0), sideways (-sa, ca, 0) and depth (0,0,1)
          const cp = Math.cos(phi);
          const sp2 = Math.sin(phi);
          d.set(ca * cp - sa * sp2 * Math.cos(psi), sa * cp + ca * sp2 * Math.cos(psi), sp2 * Math.sin(psi));
          a.set(this.ppos[(s * 2 + side) * 3] as number, this.ppos[(s * 2 + side) * 3 + 1] as number, this.ppos[(s * 2 + side) * 3 + 2] as number);
          b.copy(a).addScaledVector(d, 1);
          this.put(slot, a, b, aster * (0.9 + 0.9 * h2), 0.7, this.tint.ast);
        }
      }
    }
    this.fibres.instanceMatrix.needsUpdate = true;
    if (this.fibres.instanceColor) this.fibres.instanceColor.needsUpdate = true;
    this.kfibres.commit();
    void one;
  }

  dispose(): void {
    this.fibres.dispose();
    this.kfibres.dispose();
    this.polePieces.dispose();
  }
}
