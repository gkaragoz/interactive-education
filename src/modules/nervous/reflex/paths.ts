import { CatmullRomCurve3, Vector3 } from 'three';
import { ELBOW } from './layout';

interface Seg {
  curve: CatmullRomCurve3;
  len: number;
  /** In forearm-local coordinates (relative to the elbow); the point is rotated by the elbow angle. */
  local: boolean;
}

/** A neuron's centre line made of one or two curves, addressed by arc parameter u in 0..1 over its whole length. */
export class NeuronPath {
  readonly segs: Seg[] = [];
  readonly total: number;

  constructor(parts: { points: readonly Vector3[]; local?: boolean }[]) {
    for (const p of parts) {
      const pts = p.local ? p.points.map((v) => v.clone().sub(ELBOW)) : p.points.map((v) => v.clone());
      const curve = new CatmullRomCurve3(pts, false, 'centripetal');
      this.segs.push({ curve, len: curve.getLength(), local: !!p.local });
    }
    this.total = this.segs.reduce((a, s) => a + s.len, 0);
  }

  /** Arc parameter range covered by segment i. */
  range(i: number): [number, number] {
    let a = 0;
    for (let k = 0; k < i; k++) a += this.segs[k]!.len;
    return [a / this.total, (a + this.segs[i]!.len) / this.total];
  }

  /** World position at u (the forearm part follows the elbow angle `flex`). */
  pointAt(u: number, flex: number, out: Vector3): Vector3 {
    let d = Math.min(1, Math.max(0, u)) * this.total;
    for (const s of this.segs) {
      if (d <= s.len + 1e-9) {
        s.curve.getPointAt(Math.min(1, d / s.len), out);
        if (s.local) out.applyAxisAngle(Z, flex).add(ELBOW);
        return out;
      }
      d -= s.len;
    }
    const last = this.segs[this.segs.length - 1]!;
    last.curve.getPointAt(1, out);
    if (last.local) out.applyAxisAngle(Z, flex).add(ELBOW);
    return out;
  }
}

const Z = new Vector3(0, 0, 1);

/** Points of the bead and of its tail: head at u, then every `step` (in length units) further back. */
export function beadPoints(path: NeuronPath, u: number, flex: number, count: number, step: number, out: Vector3[]): Vector3[] {
  for (let i = 0; i < count; i++) {
    if (!out[i]) out[i] = new Vector3();
    path.pointAt(Math.max(0, u - (i * step) / path.total), flex, out[i]!);
  }
  out.length = count;
  return out;
}
