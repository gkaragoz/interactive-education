import type { Vec3 } from '../../../scene';
import { clamp01 } from './math';

export interface CamKey {
  t: number;
  /** camera position */
  p: Vec3;
  /** look-at target */
  l: Vec3;
}

const hermite = (p0: number, p1: number, m0: number, m1: number, u: number, h: number): number => {
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * h * m1;
};

/** Smooth cinematic path through keyframes (cubic Hermite with Catmull-Rom tangents), clamped at both ends. */
export function camAt(keys: readonly CamKey[], t: number): { position: Vec3; target: Vec3 } {
  const n = keys.length;
  let k = 0;
  while (k < n - 2 && t > (keys[k + 1] as CamKey).t) k++;
  const a = keys[k] as CamKey;
  const b = keys[Math.min(k + 1, n - 1)] as CamKey;
  const h = b.t - a.t || 1;
  const u = clamp01((t - a.t) / h);
  const prev = keys[Math.max(k - 1, 0)] as CamKey;
  const next = keys[Math.min(k + 2, n - 1)] as CamKey;
  const out = (pa: Vec3, pb: Vec3, pp: Vec3, pn: Vec3): Vec3 => {
    const r: Vec3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const m0 = k === 0 ? 0 : ((pb[i] as number) - (pp[i] as number)) / (b.t - prev.t || 1);
      const m1 = k + 1 >= n - 1 ? 0 : ((pn[i] as number) - (pa[i] as number)) / (next.t - a.t || 1);
      r[i] = hermite(pa[i] as number, pb[i] as number, m0, m1, u, h);
    }
    return r;
  };
  return { position: out(a.p, b.p, prev.p, next.p), target: out(a.l, b.l, prev.l, next.l) };
}
