import type { Vec3 } from '../../scene';

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Smoothstep ease between 0 and 1. */
export const smooth = (x: number): number => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** Smooth 0 to 1 ramp between `a` and `b` (either order of time). */
export const ramp = (t: number, a: number, b: number): number => smooth(b === a ? (t >= b ? 1 : 0) : (t - a) / (b - a));
export const v3 = (x: number, y: number, z: number): Vec3 => [x, y, z];

/** Piecewise camera keys: smooth moves between keyframes. */
export interface CamKey {
  t: number;
  pos: Vec3;
  target: Vec3;
}
export function cameraPath(keys: readonly CamKey[]): (t: number) => { position: Vec3; target: Vec3 } {
  return (t) => {
    const first = keys[0]!;
    if (t <= first.t) return { position: first.pos, target: first.target };
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1]!;
      const b = keys[i]!;
      if (t <= b.t) {
        const u = smooth((t - a.t) / (b.t - a.t));
        return {
          position: [lerp(a.pos[0], b.pos[0], u), lerp(a.pos[1], b.pos[1], u), lerp(a.pos[2], b.pos[2], u)],
          target: [lerp(a.target[0], b.target[0], u), lerp(a.target[1], b.target[1], u), lerp(a.target[2], b.target[2], u)],
        };
      }
    }
    const last = keys[keys.length - 1]!;
    return { position: last.pos, target: last.target };
  };
}
