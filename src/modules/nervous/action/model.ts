import { pchip, ramp } from '../math';

/** Pure model of the action potential track: the voltage curve, the channel states and the ion bookkeeping. */
export const AP_DURATION = 36;

/** Membrane potential (mV) at the recording site: passes through the data's value at every phase start (see data/modules/nervous.tracks2.ts). */
export const VM_POINTS: readonly (readonly [number, number])[] = [
  [0, -70],
  [6, -70],
  [9, -55],
  [15, 30],
  [22, -70],
  [29, -80],
  [34, -70],
  [36, -70],
];
export const vmAt = pchip(VM_POINTS);

/** The wave starts at the left end (x <= X0 has no delay) and takes LAG seconds per world unit to travel right. */
export const WAVE_X0 = -6.4;
export const LAG = 0.42;
export const lagAt = (x: number): number => Math.max(0, x - WAVE_X0) * LAG;
/** Local time of the membrane at x. */
export const localTime = (x: number, t: number): number => t - lagAt(x);
/** Membrane potential at x and time t (the wave passes x `lagAt(x)` seconds after the recording site). */
export const vmLocal = (x: number, t: number): number => vmAt(localTime(x, t));

/** A site is one Na+ channel, one K+ channel and one pump on each wall (top and bottom), with the same x on both walls. */
export const SITES = [-7.2, -2.9, 1.4, 5.7] as const;
export const NA_DX = 0;
export const K_DX = 1.15;
export const PUMP_DX = 2.55;

export type ChannelState = 'closed' | 'open' | 'inactivated';

/** Activation flap of the Na+ channel (0 closed .. 1 open): opens at the threshold, closes again late in the undershoot. */
export const naActivation = (tau: number): number => ramp(tau, 8.6, 9.3) - ramp(tau, 28, 29.2);
/** Inactivation ball of the Na+ channel (0 away .. 1 plugging the pore): plugs at the peak, lets go as the membrane recovers. */
export const naInactivation = (tau: number): number => ramp(tau, 14.6, 15.4) - ramp(tau, 27.8, 29.2);
/** Gate of the K+ channel (0 closed .. 1 open): opens just after the peak, closes during the undershoot. */
export const kGate = (tau: number): number => ramp(tau, 15, 15.9) - ramp(tau, 26.5, 28.6);

export function naState(tau: number): ChannelState {
  if (tau >= 9 && tau < 15) return 'open';
  if (tau >= 15 && tau < 29) return 'inactivated';
  return 'closed';
}
export function kState(tau: number): ChannelState {
  return tau >= 15.5 && tau < 27.5 ? 'open' : 'closed';
}

export interface Transit {
  /** Time (local seconds) the ion enters the gate and leaves it. */
  t0: number;
  t1: number;
}

/** Each site passes 3 Na+ in (while the Na+ channel is open) and 2 K+ out; the pump later returns 3 Na+ out and 2 K+ in (its 3:2 ratio). */
export const NA_IN: readonly Transit[] = [0, 1, 2].map((j) => ({
  t0: 9.5 + 1.5 * j,
  t1: 10.6 + 1.5 * j,
}));
export const K_OUT: readonly Transit[] = [0, 1].map((j) => ({
  t0: 16.5 + 3.2 * j,
  t1: 17.7 + 3.2 * j,
}));
export const NA_PUMP: readonly Transit[] = [0, 1, 2].map((j) => ({
  t0: 29.3 + 1.5 * j,
  t1: 30.4 + 1.5 * j,
}));
export const K_PUMP: readonly Transit[] = [0, 1].map((j) => ({
  t0: 29.8 + 1.5 * j,
  t1: 30.9 + 1.5 * j,
}));

const mid = (tr: Transit): number => (tr.t0 + tr.t1) / 2;
const count = (list: readonly Transit[], tau: number): number => list.filter((tr) => mid(tr) <= tau).length;

export interface IonCounts {
  /** Na+ ions that have entered minus those pumped out, summed over all 8 site-walls. */
  naInside: number;
  /** K+ ions that have left minus those pumped back. */
  kOutside: number;
  /** Total Na+ pumped out so far and K+ pumped in (always in the ratio 3:2 per finished turn). */
  naPumped: number;
  kPumped: number;
}

export function ionCounts(t: number): IonCounts {
  let naInside = 0;
  let kOutside = 0;
  let naPumped = 0;
  let kPumped = 0;
  for (const x of SITES) {
    const tau = localTime(x, t);
    const out = count(NA_PUMP, tau);
    const back = count(K_PUMP, tau);
    naInside += 2 * (count(NA_IN, tau) - out);
    kOutside += 2 * (count(K_OUT, tau) - back);
    naPumped += 2 * out;
    kPumped += 2 * back;
  }
  return { naInside, kOutside, naPumped, kPumped };
}
