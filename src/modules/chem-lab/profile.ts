/** Radius profile of a vessel cavity (pure maths on vertex positions; unit-tested). */
export const PROFILE_N = 16;

export interface Profile {
  /** Radius at PROFILE_N evenly spaced heights between yMin and yMax. */
  r: Float32Array;
  yMin: number;
  yMax: number;
  /** Axis position (x, z) of the cavity. */
  cx: number;
  cz: number;
}

/** Samples the cavity radius along Y from a closed `inner` mesh: the farthest vertex from the axis per height bin. */
export function profileOf(positions: ArrayLike<number>, yMin: number, yMax: number): Profile {
  const n = positions.length / 3;
  let sx = 0;
  let sz = 0;
  let c = 0;
  for (let i = 0; i < n; i++) {
    sx += positions[i * 3] ?? 0;
    sz += positions[i * 3 + 2] ?? 0;
    c++;
  }
  const cx = c ? sx / c : 0;
  const cz = c ? sz / c : 0;
  const r = new Float32Array(PROFILE_N);
  const span = Math.max(1e-6, yMax - yMin);
  const bin = span / (PROFILE_N - 1);
  for (let i = 0; i < n; i++) {
    const y = positions[i * 3 + 1] ?? 0;
    const k = Math.round((y - yMin) / bin);
    if (k < 0 || k >= PROFILE_N) continue;
    const d = Math.hypot((positions[i * 3] ?? 0) - cx, (positions[i * 3 + 2] ?? 0) - cz);
    if (d > (r[k] ?? 0)) r[k] = d;
  }
  // bins without vertices (smooth surfaces of revolution have rings only at some heights) take their neighbours
  let last = 0;
  for (let k = 0; k < PROFILE_N; k++) if ((r[k] ?? 0) > 0) { last = r[k] as number; break; }
  for (let k = 0; k < PROFILE_N; k++) {
    if ((r[k] ?? 0) > 0) last = r[k] as number;
    else r[k] = last;
  }
  return { r, yMin, yMax, cx, cz };
}

/** Linear interpolation of the profile at height y (clamped). */
export function radiusAt(p: Profile, y: number): number {
  const t = Math.min(1, Math.max(0, (y - p.yMin) / Math.max(1e-6, p.yMax - p.yMin))) * (PROFILE_N - 1);
  const i = Math.min(PROFILE_N - 2, Math.floor(t));
  const f = t - i;
  return (p.r[i] ?? 0) * (1 - f) + (p.r[i + 1] ?? 0) * f;
}

/** Cross-section area (cm2) at height y. */
export const areaAt = (p: Profile, y: number): number => Math.PI * radiusAt(p, y) ** 2;
