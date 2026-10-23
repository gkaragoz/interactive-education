import { QUALITY_PRESETS, type QualityMode, type QualityName, type QualitySettings } from '../core';
import { QualityGovernor } from './governor';

/** The preset in force and the adaptive governor that may change it. */
export class StageQuality {
  level: QualityName;
  settings: QualitySettings;
  private governor: QualityGovernor | null;

  constructor(level: QualityName, auto: boolean) {
    this.level = level;
    this.settings = QUALITY_PRESETS[level];
    this.governor = auto ? new QualityGovernor(level) : null;
  }

  /** Records the new level (the caller applies it to the renderer and scenes). */
  set(level: QualityName): void {
    this.level = level;
    this.settings = QUALITY_PRESETS[level];
  }

  /** Menu choice: the governor (never above medium) or a fixed preset. Returns the level to switch to. */
  setMode(mode: QualityMode): QualityName {
    const level = mode === 'auto' ? (this.level === 'high' ? 'medium' : this.level) : mode;
    this.governor = mode === 'auto' ? new QualityGovernor(level) : null;
    return level;
  }

  /** Feeds the time between two consecutive drawn frames; returns a level when the governor wants a change. */
  frame(dtMs: number, nowS: number): QualityName | null {
    return this.governor?.frame(dtMs, nowS) ?? null;
  }
}
