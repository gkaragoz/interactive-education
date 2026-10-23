// Tiny keyframe vocabulary: every moving thing is an `Anim` = a pure function of time writing a pose (x, y, z, scale).
// Scale 0 means hidden, so things appear and disappear by growing, never by popping.

export interface Pose {
  x: number;
  y: number;
  z: number;
  s: number;
}
export type Anim = (t: number, out: Pose) => void;
/** [time, x, y, scale = 1, z = 0, lift = 0]; `lift` raises the path in an arc on the segment that ENDS at this key. */
export type Key = readonly [number, number, number, number?, number?, number?];

export const smooth = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const ramp = (t: number, a: number, b: number): number => smooth((t - a) / (b - a));
export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Smooth interpolation through keys (held before the first and after the last). */
export function path(keys: readonly Key[]): Anim {
  const n = keys.length;
  return (t, o) => {
    let i = 0;
    while (i < n - 1 && t >= (keys[i + 1] as Key)[0]) i++;
    const a = keys[i] as Key;
    const b = keys[Math.min(i + 1, n - 1)] as Key;
    const span = b[0] - a[0];
    const u = span > 0 ? smooth((t - a[0]) / span) : 1;
    const e = t <= a[0] ? 0 : u;
    o.x = a[1] + (b[1] - a[1]) * e;
    o.y = a[2] + (b[2] - a[2]) * e + (b[5] ?? 0) * 4 * e * (1 - e);
    o.s = (a[3] ?? 1) + ((b[3] ?? 1) - (a[3] ?? 1)) * e;
    o.z = (a[4] ?? 0) + ((b[4] ?? 0) - (a[4] ?? 0)) * e;
  };
}

export const still = (x: number, y: number, s = 1, z = 0): Anim => (_t, o) => {
  o.x = x;
  o.y = y;
  o.z = z;
  o.s = s;
};

/** A point rigidly attached to a parent pose (offset scales with the parent). */
export function follow(parent: Anim, dx: number, dy: number, dz = 0, ds = 1): Anim {
  const p: Pose = { x: 0, y: 0, z: 0, s: 0 };
  return (t, o) => {
    parent(t, p);
    o.x = p.x + dx * p.s;
    o.y = p.y + dy * p.s;
    o.z = p.z + dz * p.s;
    o.s = p.s * ds;
  };
}

/** Same pose, scale multiplied by a time window: 0 before `a`, grows to 1 by `b`; optional shrink between `c` and `d`. */
export function gate(base: Anim, a: number, b: number, c = 1e9, d = 1e9 + 1): Anim {
  return (t, o) => {
    base(t, o);
    o.s *= ramp(t, a, b) * (1 - ramp(t, c, d));
  };
}
