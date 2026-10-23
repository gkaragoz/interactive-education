import { Quaternion, Vector3 } from 'three';
import { hash, smoother } from './math';

const _a = new Vector3();

/** A parabolic hop from `a` to `b` (progress `s` 0..1); `lift` is the extra offset at mid flight. */
export function hop(out: Vector3, a: Vector3, b: Vector3, s: number, lift: Vector3): Vector3 {
  const e = smoother(s);
  _a.copy(lift).multiplyScalar(4 * e * (1 - e));
  return out.lerpVectors(a, b, e).add(_a);
}

/** A reproducible tumbling orientation for free-floating part number `k`, turning slowly with time. */
export function tumble(out: Quaternion, k: number, t: number): Quaternion {
  return out.set(hash(k, 1) - 0.5, hash(k, 2) - 0.5, hash(k, 3) - 0.5, 0.6 + 0.4 * Math.sin(t * 0.8 + k)).normalize();
}
