import { describe, expect, it } from 'vitest';
import { QUALITY_PRESETS } from '../src/core';
import { QualityGovernor } from '../src/scene/governor';

/** Feeds `frames` frames of the same duration; returns the first level change, if any. */
function run(g: QualityGovernor, frames: number, ms: number, startS: number): { level: string | null; at: number } {
  let t = startS;
  for (let i = 0; i < frames; i++) {
    t += ms / 1000;
    const next = g.frame(ms, t);
    if (next) return { level: next, at: t };
  }
  return { level: null, at: t };
}

describe('QualityGovernor', () => {
  it('steps down when frames are slow and never below low', () => {
    const g = new QualityGovernor('medium');
    const first = run(g, 200, 40, 0);
    expect(first.level).toBe('low');
    expect(run(g, 400, 80, first.at).level).toBeNull();
    expect(g.level).toBe('low');
  });

  it('stays put at a steady 60 fps', () => {
    const g = new QualityGovernor('medium');
    expect(run(g, 600, 16.7, 0).level).toBeNull();
  });

  it('steps back up after a long calm stretch, but not past the ceiling and not right after a failure', () => {
    const g = new QualityGovernor('medium', 'medium');
    const down = run(g, 200, 40, 0);
    expect(down.level).toBe('low');
    // The failed level is not retried within 25 s even though frames are now fast.
    expect(run(g, 600, 10, down.at).level).toBeNull();
    const up = run(g, 4000, 10, down.at + 20);
    expect(up.level).toBe('medium');
    expect(run(g, 4000, 10, up.at).level).toBeNull(); // ceiling
  });
});

describe('quality presets', () => {
  it('get strictly lighter from high to low', () => {
    const { low, medium, high } = QUALITY_PRESETS;
    expect(low.triBudget).toBeLessThan(medium.triBudget);
    expect(medium.triBudget).toBeLessThan(high.triBudget);
    expect(low.maxPixelRatio).toBeLessThanOrEqual(medium.maxPixelRatio);
    expect(low.studs).toBe(false);
    expect(low.organelleCaps).toBe(false);
    expect(low.gtao || low.bloom || low.smaa).toBe(false);
  });
});
