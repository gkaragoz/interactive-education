import type { ChartSeries, PhaseInfo } from '../data/moduleTypes';

export const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const;
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 2;

export interface PlayerEvent {
  /** The playhead reached the end (and stopped, or wrapped when looping). */
  ended: boolean;
  wrapped: boolean;
  /** Time span this tick covered, for prompts that fire when the playhead crosses a point: (from, to]. */
  from: number;
  to: number;
}

type Listener = () => void;

/**
 * Play / pause / seek / speed / loop / phase stepping over a fixed duration. Pure arithmetic: `tick(dt)` adds
 * `dt * speed` seconds, so the same sequence of calls always gives the same times (a scene only ever sees `seek(t)`).
 * With reduced motion `play()` does nothing: the learner steps through the phases instead.
 */
export class Player {
  time = 0;
  playing = false;
  speed = 1;
  loop = false;
  private readonly listeners = new Set<Listener>();

  constructor(
    readonly duration: number,
    /** Phases the player steps through, sorted by start (already filtered to the level). */
    readonly phases: readonly Pick<PhaseInfo, 'id' | 'start' | 'end'>[],
    readonly reducedMotion: boolean,
  ) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of [...this.listeners]) l();
  }

  /** Starts playing; returns false when that is not allowed (reduced motion). At the end it restarts from 0. */
  play(): boolean {
    if (this.reducedMotion) return false;
    if (this.time >= this.duration - 1e-6) this.time = 0;
    this.playing = true;
    this.emit();
    return true;
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.emit();
  }

  toggle(): boolean {
    if (this.playing) {
      this.pause();
      return true;
    }
    return this.play();
  }

  seek(t: number): void {
    this.time = Math.min(Math.max(t, 0), this.duration);
    this.emit();
  }

  setSpeed(speed: number): void {
    this.speed = Math.min(Math.max(speed, MIN_SPEED), MAX_SPEED);
    this.emit();
  }

  /** Next entry of SPEEDS in the given direction (keyboard + and -). */
  nudgeSpeed(direction: 1 | -1): void {
    const i = SPEEDS.findIndex((s) => Math.abs(s - this.speed) < 1e-6);
    const at = i < 0 ? SPEEDS.findIndex((s) => s >= this.speed) : i;
    this.setSpeed(SPEEDS[Math.min(Math.max(at + direction, 0), SPEEDS.length - 1)] as number);
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
    this.emit();
  }

  /** Index of the phase containing t (the last one at the very end), or -1 without phases. */
  phaseIndexAt(t: number): number {
    if (this.phases.length === 0) return -1;
    for (let i = this.phases.length - 1; i >= 0; i--) if (t >= (this.phases[i] as { start: number }).start - 1e-9) return i;
    return 0;
  }

  /** Jumps to the start of the next phase, or back to the start of this one (or the previous when near its start). Pauses. */
  stepPhase(direction: 1 | -1): void {
    this.playing = false;
    if (this.phases.length === 0) {
      this.seek(direction > 0 ? this.duration : 0);
      return;
    }
    const i = this.phaseIndexAt(this.time);
    const here = this.phases[i] as { start: number };
    let target: number;
    if (direction > 0) target = i + 1 < this.phases.length ? (this.phases[i + 1] as { start: number }).start : this.duration;
    else target = this.time - here.start > 0.25 ? here.start : i > 0 ? (this.phases[i - 1] as { start: number }).start : 0;
    this.seek(target);
  }

  /** Advances by a frame of `dt` real seconds. Returns what happened, or null when paused. */
  tick(dt: number): PlayerEvent | null {
    if (!this.playing) return null;
    const from = this.time;
    let to = from + dt * this.speed;
    let ended = false;
    let wrapped = false;
    if (to >= this.duration) {
      ended = true;
      if (this.loop) {
        wrapped = true;
        to = this.duration > 0 ? to % this.duration : 0;
      } else {
        to = this.duration;
        this.playing = false;
      }
    }
    this.time = to;
    this.emit();
    return { ended, wrapped, from, to };
  }
}

/**
 * Value of a chart series at time t. Phases carry the value at their start (`chartPoints`); in between the series is
 * linear, after the last phase start it holds. Missing points fall back to the series minimum.
 */
export function chartValueAt(series: ChartSeries, phases: readonly PhaseInfo[], t: number): number {
  const points = phases.filter((p) => p.chartPoints && series.id in p.chartPoints).map((p) => ({ t: p.start, v: (p.chartPoints as Record<string, number>)[series.id] as number }));
  if (points.length === 0) return series.min;
  if (t <= (points[0] as { t: number }).t) return (points[0] as { v: number }).v;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as { t: number; v: number };
    const b = points[i] as { t: number; v: number };
    if (t <= b.t) return b.t === a.t ? b.v : a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t);
  }
  return (points[points.length - 1] as { v: number }).v;
}

export function chartValuesAt(charts: readonly ChartSeries[], phases: readonly PhaseInfo[], t: number): Record<string, number> {
  return Object.fromEntries(charts.map((c) => [c.id, chartValueAt(c, phases, t)]));
}
