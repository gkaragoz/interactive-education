import type { Rng } from '../../core';

/** A place where molecules cross: a gap between lipids, a channel or a carrier. `index` < 0 means "never busy". */
export interface Gate {
  index: number;
  kind: 'gap' | 'channel' | 'carrier';
  x: number;
  z: number;
}

export interface Timing {
  approach: number;
  ride: number;
  leave: number;
  /** Extra time the gate is busy after the molecule has left (a carrier flipping back). */
  reset: number;
}

export interface Transit {
  mol: number;
  gate: Gate;
  dir: 1 | -1;
  t0: number;
  tIn: number;
  tOut: number;
  t1: number;
  tFree: number;
}

export interface DesConfig {
  /** Starting side of each molecule: 0 outside, 1 inside. */
  sides: readonly (0 | 1)[];
  /** Attempts per second for molecule m (can be 0). */
  rate(m: number): number;
  /** Molecules start trying only after this time and stop after `tEnd`. */
  tStart: number;
  /** Optional later start for some molecules (e.g. ones added during the animation). */
  startOf?(m: number): number;
  tEnd: number;
  /** Gate chosen for an attempt (null = this molecule cannot cross). */
  pick(m: number, rng: Rng): Gate | null;
  timing(g: Gate, dir: 1 | -1): Timing;
  rng: Rng;
}

/**
 * Discrete-event simulation of crossings, done once when the scene is built. Every molecule tries to cross at random
 * moments; equal rates both ways mean the net flow is proportional to the concentration difference (Fick), and a
 * busy carrier or channel simply refuses the attempt, which gives saturation. The result is fixed data, so poses
 * stay a pure function of time.
 */
export function simulateCrossings(cfg: DesConfig): Transit[] {
  const attempts: { t: number; m: number }[] = [];
  const n = cfg.sides.length;
  for (let m = 0; m < n; m++) {
    const r = cfg.rate(m);
    if (r <= 0) continue;
    let t = cfg.startOf?.(m) ?? cfg.tStart;
    for (;;) {
      t += -Math.log(1 - cfg.rng()) / r;
      if (t > cfg.tEnd) break;
      attempts.push({ t, m });
    }
  }
  attempts.sort((a, b) => a.t - b.t || a.m - b.m);
  const side = [...cfg.sides];
  const busyMol = new Float64Array(n).fill(-1);
  const busyGate = new Map<number, number>();
  const out: Transit[] = [];
  for (const { t, m } of attempts) {
    if (t < busyMol[m]!) continue;
    const gate = cfg.pick(m, cfg.rng);
    if (!gate) continue;
    if (gate.index >= 0 && (busyGate.get(gate.index) ?? -1) > t) continue;
    const dir: 1 | -1 = side[m] === 0 ? 1 : -1;
    const tm = cfg.timing(gate, dir);
    const tr: Transit = { mol: m, gate, dir, t0: t, tIn: t + tm.approach, tOut: t + tm.approach + tm.ride, t1: t + tm.approach + tm.ride + tm.leave, tFree: 0 };
    tr.tFree = tr.t1 + tm.reset;
    side[m] = side[m] === 0 ? 1 : 0;
    busyMol[m] = tr.t1;
    if (gate.index >= 0) busyGate.set(gate.index, tr.tFree);
    out.push(tr);
  }
  return out;
}

/** Net molecules moved inside per second, over a window centred on t. */
export function netFlux(legsOf: readonly { tCross: number; dir: 1 | -1 }[], t: number, half = 2): number {
  let net = 0;
  for (const l of legsOf) if (l.tCross >= t - half && l.tCross < t + half) net += l.dir;
  return net / (2 * half);
}
