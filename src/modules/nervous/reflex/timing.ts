import { lerp, ramp } from '../math';

/** One stretch of the impulse's way: it moves along a path between `t0` and `t1` (seconds at speed 1). */
export interface Leg {
  id: 'sensory' | 'inter' | 'motor' | 'brain';
  t0: number;
  t1: number;
}

/** The reflex arc is fast (sensory 9-16 s, spinal cord 16.6-21.4 s, motor 22-29 s); the branch to the brain is slow and arrives last. */
export const LEGS: readonly Leg[] = [
  { id: 'sensory', t0: 9, t1: 16 },
  { id: 'inter', t0: 16.6, t1: 21.4 },
  { id: 'motor', t0: 22, t1: 29 },
  { id: 'brain', t0: 16.6, t1: 36 },
];

export const REFLEX_DURATION = 40;

/** Position (0..1) of the impulse along one leg; 0 before and 1 after it. Linear in time, so it is monotonic. */
export function legProgress(leg: Leg, t: number): number {
  return Math.min(1, Math.max(0, (t - leg.t0) / (leg.t1 - leg.t0)));
}

export const leg = (id: Leg['id']): Leg => LEGS.find((l) => l.id === id)!;

/** Elbow angle (radians, positive lowers the hand): lowers onto the plate in 0-2.4 s, pulls away from 29.2 s on. */
export const FLEX_START = -0.17;
export const FLEX_AWAY = -0.62;
export function flexAt(t: number): number {
  const down = ramp(t, 0.2, 2.4);
  const away = ramp(t, 29.2, 33.8);
  return lerp(FLEX_START, 0, down) + (FLEX_AWAY - 0) * away;
}

/** Biceps contraction 0 (relaxed) .. 1 (contracted); it starts when the impulse reaches the muscle at 29 s. */
export const contractionAt = (t: number): number => ramp(t, 29, 31.6);

/** Heat felt at the fingertip: builds when the hand touches the plate and stops when it is pulled away. */
export const heatAt = (t: number): number => ramp(t, 2.0, 3.6) * (1 - ramp(t, 31, 34.5));

/** Brain lights up when the slow branch arrives and the pain is noticed. */
export const brainGlowAt = (t: number): number => ramp(t, 35.4, 37.2);

/** Strength of a leg's glow: on while the impulse is on it, fading for a while after. */
export function legAmount(l: Leg, t: number): number {
  return ramp(t, l.t0 - 0.2, l.t0 + 0.2) * (1 - ramp(t, l.t1 + 0.4, l.t1 + 3.2));
}
