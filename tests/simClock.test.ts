import { describe, expect, it } from 'vitest';
import { SIM_DT, SimClock, SimHistory, TIMELAPSE } from '../src/core';

/** A toy sim: the state depends only on the sequence of dts it was stepped with. */
const run = (frames: number[], speed = 1): { clock: SimClock; steps: number[]; state: number } => {
  const clock = new SimClock();
  clock.setSpeed(speed);
  const steps: number[] = [];
  let state = 0;
  for (const f of frames) {
    clock.advance(f, (dt) => {
      steps.push(dt);
      state = state * 0.999 + dt;
    });
  }
  return { clock, steps, state };
};

describe('SimClock (fixed step with time-lapse)', () => {
  it('steps whole 1/60 s steps however the frames are cut', () => {
    for (const fps of [30, 60, 144]) {
      const frames = Array.from({ length: fps * 2 }, () => 1 / fps);
      const { steps, clock } = run(frames);
      expect(steps.every((d) => Math.abs(d - SIM_DT) < 1e-12)).toBe(true);
      expect(Math.abs(steps.length - 120)).toBeLessThanOrEqual(1);
      expect(clock.simTime).toBeCloseTo(steps.length * SIM_DT, 9);
    }
  });

  it('is deterministic: equal step counts give equal state', () => {
    const a = run(Array.from({ length: 120 }, () => 1 / 60));
    const b = run(Array.from({ length: 240 }, () => 1 / 120));
    expect(a.steps.length).toBe(b.steps.length);
    expect(a.state).toBe(b.state);
  });

  it('time-lapse stretches the step, never past 0.25 s, and runs at most 5 steps per frame', () => {
    for (const f of TIMELAPSE) {
      const clock = new SimClock();
      clock.setSpeed(f);
      expect(clock.dt).toBeLessThanOrEqual(0.25);
      const per = clock.advance(1 / 60, () => undefined);
      expect(per).toBeLessThanOrEqual(5);
      // one second of real time is about f simulated seconds
      const c2 = new SimClock();
      c2.setSpeed(f);
      for (let i = 0; i < 60; i++) c2.advance(1 / 60, () => undefined);
      expect(c2.simTime).toBeGreaterThan(f * 0.9);
      expect(c2.simTime).toBeLessThan(f * 1.1);
    }
  });

  it('pauses, ignores huge frames (tab in the background) and resyncs', () => {
    const clock = new SimClock();
    clock.paused = true;
    expect(clock.advance(1, () => undefined)).toBe(0);
    clock.paused = false;
    let n = 0;
    clock.advance(30, () => n++);
    expect(n).toBeLessThanOrEqual(5);
    clock.resync(12);
    expect(clock.simTime).toBe(12);
  });
});

describe('SimHistory (Defter replay)', () => {
  it('returns the newest snapshot at or before a time and drops an abandoned future', () => {
    const h = new SimHistory<string>(50);
    [0, 1, 2, 3].forEach((t) => h.record(t, `s${t}`));
    expect(h.nearest(2.5)?.state).toBe('s2');
    expect(h.nearest(-1)?.state).toBe('s0');
    h.record(1.5, 'x');
    expect(h.length).toBe(3);
    expect(h.nearest(99)?.state).toBe('x');
  });

  it('stays bounded and keeps the first and last entries', () => {
    const h = new SimHistory<number>(20);
    for (let t = 0; t < 500; t++) h.record(t, t);
    expect(h.length).toBeLessThanOrEqual(20);
    expect(h.nearest(0)?.state).toBe(0);
    expect(h.nearest(1000)?.state).toBe(499);
  });
});
