import { Vector3 } from 'three';
import { clamp01, lerp, smooth } from '../math';
import { makeWander, wanderAt, type Wander } from '../walk';
import { mulberry32 } from '../../../core';
import { ARRIVE, ENZYME_Y, NT_COUNT, PER_VESICLE, PLAN, POST_X, PRE_X, TRANSPORTER_Y, TRAVEL, VESICLE_R, VESICLE_Y, dockAt, type NtPlan } from './model';

const tmp = new Vector3();
const tmp2 = new Vector3();
const tmp3 = new Vector3();

/** Inner surface of the presynaptic membrane (the vesicles dock against it). */
export const PRE_INNER = PRE_X - 0.28;
export const DOCK_X = PRE_INNER - VESICLE_R;

/** Centre of vesicle v: floats in the reserve pool, docks between 2 and 9 s; after it fused the slot grows a new vesicle at the reserve spot. */
export function vesicleCenter(v: number, t: number, out: Vector3): Vector3 {
  const y = VESICLE_Y[v]!;
  const rx = -4.2 - 0.25 * (v % 2);
  const ry = y + 0.4 * Math.sin(v * 2.1);
  const d = dockAt(t);
  const wob = 1 - d;
  out.set(lerp(rx, DOCK_X, d) + 0.12 * Math.sin(t * 0.9 + v) * wob, lerp(ry, y, d) + 0.14 * Math.cos(t * 1.1 + v * 1.7) * wob, 0.45);
  return out;
}

/** Where the new vesicle of slot v sits in the last phase (near the reserve pool). */
export function refillCenter(v: number, t: number, out: Vector3): Vector3 {
  return out.set(-3.5 - 0.2 * (v % 2) + 0.1 * Math.sin(t * 0.9 + v), VESICLE_Y[v]! + 0.1 * Math.cos(t * 1.1 + v), 0.45);
}

/** Position of cargo molecule j inside a vesicle (relative to its centre). */
export function cargoOffset(j: number, out: Vector3): Vector3 {
  const a = j * 2.399;
  const r = 0.3 * Math.sqrt((j + 0.5) / PER_VESICLE);
  return out.set(Math.cos(a) * r, Math.sin(a) * r, ((j % 3) - 1) * 0.12);
}

const wanders: Wander[] = Array.from({ length: NT_COUNT }, (_, i) => makeWander(mulberry32(900 + i)));
const OPEN_Y = (v: number): number => VESICLE_Y[v]!;

export const transporterMouth = (k: number, out: Vector3): Vector3 => out.set(PRE_X + 0.55, TRANSPORTER_Y[k]!, 0.45);
export const enzymePocket = (k: number, out: Vector3): Vector3 => out.set(POST_X - 1.0, ENZYME_Y[k]!, 0.45);

/** Position of neurotransmitter i at time t (a pure function of the plan); `amp` is the Brownian amplitude. */
export function ntPos(i: number, t: number, amp: number, out: Vector3): Vector3 {
  const n: NtPlan = PLAN[i]!;
  cargoOffset(n.j, tmp2);
  if (t < n.tRel) return vesicleCenter(n.v, t, out).add(tmp2);
  // 1. release through the opening and drift to a place in the cleft
  const from = vesicleCenter(n.v, n.tRel, tmp).add(tmp2);
  const open = tmp3.set(PRE_X + 0.2, OPEN_Y(n.v), 0.4);
  const u = smooth((t - n.tRel) / ARRIVE);
  if (u < 0.3) out.copy(from).lerp(open, u / 0.3);
  else out.copy(open).lerp(n.dwell, (u - 0.3) / 0.7);
  const tNext = n.bind ? n.bind.t - 1.2 : n.tRem - TRAVEL;
  const f = clamp01((t - n.tRel - 1) / (ARRIVE - 1)) * (1 - clamp01((t - tNext + 0.6) / 0.6));
  wanderAt(wanders[i]!, t, amp * f, tmp);
  out.add(tmp);
  // 2. binding trip, then 3. the trip to the transporter or enzyme
  const target = n.how === 'reuptake' ? transporterMouth(n.at, tmp2) : enzymePocket(n.at, tmp2);
  if (n.bind) {
    if (t >= tNext) out.copy(n.dwell).lerp(n.bind.site, smooth((t - tNext) / 1.2));
    if (t >= n.tRem - TRAVEL) out.copy(n.bind.site).lerp(target, smooth((t - (n.tRem - TRAVEL)) / TRAVEL));
  } else if (t >= tNext) out.copy(n.dwell).lerp(target, smooth((t - tNext) / TRAVEL));
  return out;
}
