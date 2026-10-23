import { Vector3 } from 'three';
import { pchip, ramp, smooth } from '../math';

/** Pure model of the synapse track: vesicle fusion times, where every neurotransmitter molecule is and when it leaves, calcium and receptor bookkeeping. */
export const SYN_DURATION = 36;

/** Faces of the two cells (x of the membrane's centre line) and the docked vesicles' y positions. */
export const PRE_X = -1.6;
export const POST_X = 1.6;
export const VESICLE_Y = [-2.8, -1.4, 0, 1.4, 2.8] as const;
export const VESICLE_R = 0.52;
export const CA_Y = [-2.1, -0.7, 0.7, 2.1] as const;
export const REC_Y = [-2.4, -0.8, 0.8, 2.4] as const;
export const TRANSPORTER_Y = [-3.9, 3.9] as const;
export const ENZYME_Y = [-3.9, 3.9] as const;

/** Time the AP bead enters the axon and reaches the terminal. */
export const AP_START = 0.4;
export const AP_END = 4.8;
/** Ca2+ channels are open between these times; calcium crosses one ion per 0.9 s per channel. */
export const CA_OPEN: readonly [number, number] = [5.2, 9.6];
export const CA_IN = [0, 1, 2].map((j) => ({
  t0: 5.6 + 0.8 * j,
  t1: 6.6 + 0.8 * j,
}));
/** Calcium reaches the vesicle sensors, just before the first vesicle starts to fuse. */
export const CA_BIND = 9.7;

/** Fusion of vesicle v starts at tf and takes FUSE seconds to open, then the cup merges with the membrane. */
export const tf = (v: number): number => 10.4 + 0.9 * v;
export const FUSE = 1.4;
export const MERGE = 1.0;
export const DOCK: readonly [number, number] = [2, 9];

/** Docking progress 0 (in the reserve pool) .. 1 (touching the membrane). */
export const dockAt = (t: number): number => smooth((t - DOCK[0]) / (DOCK[1] - DOCK[0]));
/** Fusion progress 0..1 (cup opens) and merge progress 0..1 (cup melts into the membrane). */
export const fuseAt = (v: number, t: number): number => smooth((t - tf(v)) / FUSE);
export const mergeAt = (v: number, t: number): number => smooth((t - tf(v) - FUSE) / MERGE);
/** The vesicle membrane comes back as a new, refilled vesicle in the last phase (the same slot grows again). */
export const refillAt = (t: number): number => ramp(t, 33.2, 35.4);

export const PER_VESICLE = 10;
export const NT_COUNT = VESICLE_Y.length * PER_VESICLE;

export type Removal = 'reuptake' | 'enzyme';

export interface NtPlan {
  v: number;
  j: number;
  /** Release time: the molecule leaves the opened vesicle. It reaches its place in the cleft `ARRIVE` seconds later. */
  tRel: number;
  /** Where it drifts to in the cleft. */
  dwell: Vector3;
  /** Receptor site and the time it gets there, or null for molecules that never bind. */
  bind: { site: Vector3; channel: number; t: number } | null;
  /** Removal time (fully gone) and how: reuptake into a transporter or breakdown at an enzyme. */
  tRem: number;
  how: Removal;
  /** The transporter or enzyme it goes to (index into TRANSPORTER_Y / ENZYME_Y). */
  at: number;
}

export const ARRIVE = 2.0;
export const TRAVEL = 1.4;

function hash(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** The whole plan: 50 molecules, 5 vesicles x 10. Removal times are chosen so the cleft holds 100% at 16 s, 70% at 21 s, 40% at 27 s and 0% at 33 s. */
export function buildPlan(): NtPlan[] {
  const plan: NtPlan[] = [];
  let freeC = 0;
  let boundK = 0;
  for (let v = 0; v < VESICLE_Y.length; v++) {
    for (let j = 0; j < PER_VESICLE; j++) {
      const i = v * PER_VESICLE + j;
      const tRel = tf(v) + 0.9 + 0.06 * j;
      const y = VESICLE_Y[v]!;
      const dwell = new Vector3(-0.85 + hash(i, 1) * 1.7, Math.max(-3.4, Math.min(3.4, y + (hash(i, 2) - 0.5) * 3.2)), -0.5 + hash(i, 3) * 1.0);
      let tRem: number;
      let bind: NtPlan['bind'] = null;
      if (v === 0 || (v === 1 && j < 5)) tRem = 16.6 + (v === 0 ? j : 10 + j) * (4 / 14);
      else if ((v === 1 && j >= 5) || v === 2) tRem = 21.5 + (v === 1 ? j - 5 : 5 + j) * (5 / 14);
      else if (v === 3 && j < 8) {
        const k = boundK++;
        tRem = 29.4 + 0.45 * k;
        const ch = Math.floor(k / 2);
        bind = {
          site: new Vector3(POST_X - 1.2, REC_Y[ch]! + (k % 2 === 0 ? 0.2 : -0.2), 0.45),
          channel: ch,
          t: 21.4 + 0.6 * k,
        };
      } else tRem = 27.4 + 0.35 * freeC++;
      plan.push({
        v,
        j,
        tRel,
        dwell,
        bind,
        tRem,
        how: i % 2 === 0 ? 'reuptake' : 'enzyme',
        at: (bind ? bind.site.y : dwell.y) >= 0 ? 1 : 0,
      });
    }
  }
  return plan;
}

export const PLAN: readonly NtPlan[] = buildPlan();

/** Share (0..1) of molecule i that is in the cleft at time t (smooth ramps at both ends, no pops). */
export const presence = (n: NtPlan, t: number): number => ramp(t, n.tRel, n.tRel + 0.5) * (1 - ramp(t, n.tRem - 0.3, n.tRem));

/** Cleft transmitter amount as % of all molecules (the chart series `nt-miktari`). */
export function ntPercent(t: number): number {
  let s = 0;
  for (const n of PLAN) s += presence(n, t);
  return (100 * s) / PLAN.length;
}

/** Postsynaptic potential (mV): rests at -70, depolarises while transmitter is bound, back to -70 (the data's values at phase starts). */
export const pspAt = pchip([
  [0, -70],
  [21, -70],
  [27, -60],
  [33, -70],
  [36, -70],
]);

/** Number of bound molecules at time t (0..8). */
export function boundCount(t: number): number {
  return PLAN.filter((n) => n.bind && t >= n.bind.t && t < n.tRem - TRAVEL).length;
}

/** Opening of postsynaptic channel k (0..1): opens once its first molecule binds, closes as the last one leaves. */
export function channelOpen(k: number, t: number): number {
  const mine = PLAN.filter((n) => n.bind?.channel === k);
  const t0 = Math.min(...mine.map((n) => n.bind!.t));
  const t1 = Math.max(...mine.map((n) => n.tRem - TRAVEL));
  return ramp(t, t0, t0 + 0.8) * (1 - ramp(t, t1, t1 + 0.8));
}

/** Na+ entering through postsynaptic channel k: ion i starts 0.8 s after the channel opened and then every 1.2 s. */
export function postIonWindow(k: number, i: number): { t0: number; t1: number } {
  const mine = PLAN.filter((n) => n.bind?.channel === k);
  const t0 = Math.min(...mine.map((n) => n.bind!.t)) + 0.9 + 1.25 * i;
  return { t0, t1: t0 + 1.1 };
}

/** Calcium channel opening (all four open and close together). */
export const caOpen = (t: number): number => ramp(t, CA_OPEN[0] - 0.2, CA_OPEN[0] + 0.5) * (1 - ramp(t, CA_OPEN[1] - 0.2, CA_OPEN[1] + 0.6));
