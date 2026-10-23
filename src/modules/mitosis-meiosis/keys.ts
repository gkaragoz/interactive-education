/** Keyframe tracks: every animated quantity is a table of keys evaluated purely from t (no state, no clock). */
export type Ease = 'smooth' | 'linear' | 'step' | 'in' | 'out';

const ease = (e: Ease, w: number): number => {
  switch (e) {
    case 'smooth':
      return w * w * (3 - 2 * w);
    case 'in':
      return w * w;
    case 'out':
      return 1 - (1 - w) * (1 - w);
    case 'step':
      return w >= 1 ? 1 : 0;
    default:
      return w;
  }
};

export type Patch = Record<string, number>;

/** A named set of float channels animated by keys. `to` appends a key that is reached from the previous one. */
export class KeyTrack {
  readonly n: number;
  private readonly index = new Map<string, number>();
  private readonly times: number[] = [];
  private readonly vals: Float32Array[] = [];
  private readonly eases: Ease[] = [];
  private cur: Float32Array;
  /** Maps canonical times to this track's times (lets one choreography serve several timelines). */
  warp: (t: number) => number = (t) => t;

  constructor(readonly names: readonly string[], init: Patch = {}) {
    this.n = names.length;
    names.forEach((nm, i) => this.index.set(nm, i));
    this.cur = new Float32Array(this.n);
    this.apply(init);
    this.times.push(-1e9);
    this.vals.push(this.cur.slice());
    this.eases.push('linear');
  }

  idx(name: string): number {
    const i = this.index.get(name);
    if (i === undefined) throw new Error(`unknown channel ${name}`);
    return i;
  }

  private apply(p: Patch): void {
    for (const k of Object.keys(p)) this.cur[this.idx(k)] = p[k] as number;
  }

  /** Current (last key) value of a channel while building. */
  last(name: string): number {
    return this.cur[this.idx(name)] as number;
  }

  /** Ramp to `patch` (other channels hold) arriving at canonical time `t`. */
  to(t: number, patch: Patch = {}, e: Ease = 'smooth'): this {
    const tt = this.warp(t);
    if (this.times.length === 1) {
      this.times.push(this.warp(0));
      this.vals.push(this.cur.slice());
      this.eases.push('linear');
    }
    const prev = this.times[this.times.length - 1] as number;
    this.apply(patch);
    this.times.push(Math.max(tt, prev + 1e-6));
    this.vals.push(this.cur.slice());
    this.eases.push(e);
    return this;
  }

  /** Change values instantly at `t` (two keys a hair apart): for representation switches that look identical. */
  jump(t: number, patch: Patch): this {
    this.to(t, {}, 'linear');
    const tt = (this.times[this.times.length - 1] as number) + 1e-4;
    this.apply(patch);
    this.times.push(tt);
    this.vals.push(this.cur.slice());
    this.eases.push('step');
    return this;
  }

  eval(t: number, out: Float32Array): void {
    const T = this.times;
    let i = T.length - 1;
    if (t >= (T[i] as number)) {
      out.set(this.vals[i] as Float32Array);
      return;
    }
    while (i > 0 && (T[i - 1] as number) > t) i--;
    // segment (i-1, i)
    const a = this.vals[i - 1] as Float32Array;
    const b = this.vals[i] as Float32Array;
    const t0 = T[i - 1] as number;
    const w = ease(this.eases[i] as Ease, (t - t0) / ((T[i] as number) - t0));
    for (let c = 0; c < this.n; c++) out[c] = (a[c] as number) + ((b[c] as number) - (a[c] as number)) * w;
  }
}

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a: number, b: number, x: number): number => {
  const w = clamp01((x - a) / (b - a));
  return w * w * (3 - 2 * w);
};
/** Linear ramp of `v0 -> v1` between times a and b. */
export const ramp = (t: number, a: number, b: number, v0: number, v1: number): number => v0 + (v1 - v0) * clamp01((t - a) / (b - a));
