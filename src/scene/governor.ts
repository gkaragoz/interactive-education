import type { QualityName } from '../core';

const ORDER: QualityName[] = ['low', 'medium', 'high'];
const WINDOW = 45;
const SLOW_MS = 24;
const FAST_MS = 18;
const COOLDOWN_S = 1.5;
const RETRY_AFTER_S = 25;

/**
 * Adaptive quality: watches the time between consecutive drawn frames and steps the preset down when the page cannot
 * keep about 45 fps, and back up (never above `ceiling`) after a long calm stretch. A level that just failed is not
 * retried for a while, so the picture does not flicker between two presets.
 */
export class QualityGovernor {
  private sum = 0;
  private count = 0;
  private calmWindows = 0;
  private quietUntil = 0;
  private readonly failedAt = new Map<QualityName, number>();

  constructor(
    public level: QualityName,
    private readonly ceiling: QualityName = 'medium',
  ) {}

  /** Feed the milliseconds between two consecutive drawn frames; returns a new level when it should change. */
  frame(dtMs: number, nowS: number): QualityName | null {
    if (nowS < this.quietUntil) return null;
    this.sum += dtMs;
    this.count++;
    if (this.count < WINDOW) return null;
    const avg = this.sum / this.count;
    this.sum = 0;
    this.count = 0;
    const index = ORDER.indexOf(this.level);
    if (avg > SLOW_MS && index > 0) {
      this.failedAt.set(this.level, nowS);
      return this.change(ORDER[index - 1] as QualityName, nowS);
    }
    this.calmWindows = avg < FAST_MS ? this.calmWindows + 1 : 0;
    const up = ORDER[index + 1];
    if (up && this.calmWindows >= 4 && ORDER.indexOf(up) <= ORDER.indexOf(this.ceiling) && nowS - (this.failedAt.get(up) ?? -Infinity) > RETRY_AFTER_S) {
      return this.change(up, nowS);
    }
    return null;
  }

  private change(level: QualityName, nowS: number): QualityName {
    this.level = level;
    this.calmWindows = 0;
    this.quietUntil = nowS + COOLDOWN_S;
    return level;
  }
}
