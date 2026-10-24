/**
 * Fixed-step clock for interactive sims (docs/SIMS.md). Real frame time goes in, whole fixed steps come out: the sim
 * is only ever stepped with the same `dt`, so equal histories give equal states however the frames were timed. Chemistry
 * runs in real seconds, so the clock has a time-lapse factor; for fast factors the step grows (never beyond 0.25 s)
 * instead of running hundreds of steps in one frame. Pure: no DOM, no wall clock.
 */
export const SIM_DT = 1 / 60;
/** Time-lapse choices offered in the lab ("1x" is real time). */
export const TIMELAPSE = [1, 5, 20, 60] as const;
export type Timelapse = (typeof TIMELAPSE)[number];

const MAX_STEPS_PER_FRAME = 5;
const MAX_FRAME = 0.1;

export class SimClock {
  private acc = 0;
  private _speed: number = 1;
  paused = false;
  /** Simulated seconds stepped so far (sum of the steps, not wall time). */
  simTime = 0;

  get speed(): number {
    return this._speed;
  }

  setSpeed(factor: number): void {
    this._speed = Math.max(1, factor);
    this.acc = 0;
  }

  /** The step size at the current factor: 1/60 s up to 5x, then stretched so a frame needs at most 5 steps. */
  get dt(): number {
    return Math.min(0.25, SIM_DT * Math.max(1, this._speed / MAX_STEPS_PER_FRAME));
  }

  /** Feeds one rendered frame of `frameSeconds`; calls `step(dt)` for every whole step due. Returns the step count. */
  advance(frameSeconds: number, step: (dt: number) => void): number {
    if (this.paused) return 0;
    const dt = this.dt;
    this.acc += Math.min(Math.max(frameSeconds, 0), MAX_FRAME) * this._speed;
    let n = 0;
    while (this.acc >= dt && n < MAX_STEPS_PER_FRAME) {
      step(dt);
      this.simTime += dt;
      this.acc -= dt;
      n++;
    }
    // A slow machine must not build up a backlog it can never repay.
    if (this.acc > dt * MAX_STEPS_PER_FRAME) this.acc = 0;
    return n;
  }

  /** Forget the fractional step (after a restore or reset). */
  resync(simTime = 0): void {
    this.acc = 0;
    this.simTime = simTime;
  }
}

/** Snapshots of a sim over time (Defter replay and scrub back): a bounded list, thinned from the middle when full. */
export class SimHistory<S = unknown> {
  private readonly items: { t: number; state: S }[] = [];

  constructor(private readonly capacity = 400) {}

  get length(): number {
    return this.items.length;
  }

  record(t: number, state: S): void {
    const last = this.items[this.items.length - 1];
    if (last && t < last.t) {
      // recording in the past (after a restore) drops the abandoned future
      while (this.items.length > 0 && (this.items[this.items.length - 1] as { t: number }).t >= t) this.items.pop();
    }
    this.items.push({ t, state });
    if (this.items.length > this.capacity) {
      // keep the first and the last entries, drop every second one in between
      const keep = this.items.filter((_, i) => i === 0 || i === this.items.length - 1 || i % 2 === 0);
      this.items.length = 0;
      this.items.push(...keep);
    }
  }

  /** The latest snapshot taken at or before `t`, or the oldest one. */
  nearest(t: number): { t: number; state: S } | null {
    let best: { t: number; state: S } | null = this.items[0] ?? null;
    for (const item of this.items) {
      if (item.t <= t + 1e-9) best = item;
      else break;
    }
    return best;
  }

  clear(): void {
    this.items.length = 0;
  }
}
