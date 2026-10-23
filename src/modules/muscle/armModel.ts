import { evalKeys, type Keys } from './math';

// Planar model of the elbow (side view, x forward, y up). The elbow is the origin, the upper arm points straight up to
// the shoulder and the forearm hangs at the flexion angle phi = 180 - elbow angle.
export const UPPER = 6.2;
export const FORE = 5.6;
/** Muscle attachments: origin on the shoulder girdle (arm frame) and insertion in the forearm frame (along, anterior). */
export const BICEPS = { origin: [0.55, 5.4] as const, insert: [0.95, 0.25] as const, prox: 0.45, dist: 0.95, r0: 0.5 };
export const TRICEPS = { origin: [-0.5, 5.3] as const, insert: [-0.3, -0.6] as const, prox: 0.2, dist: 0.75, r0: 0.55 };

/** Elbow angle (degrees) and muscle activity (percent) of the `eklem-hareketi` track, matching the chart values of the data. */
export const ANGLE_KEYS: Keys = [[0, 160], [4, 160], [14, 45], [21.2, 45], [29, 140], [33, 160], [36, 160]];
export const BICEPS_KEYS: Keys = [[0, 0], [4, 0], [14, 80], [19, 80], [23, 0], [36, 0]];
export const TRICEPS_KEYS: Keys = [[0, 0], [20, 0], [25, 80], [29, 80], [33, 0], [36, 0]];

export interface ArmState {
  /** Elbow angle in degrees (180 = straight). */
  angle: number;
  /** 0..100 */
  biceps: number;
  triceps: number;
}

export const armAt = (t: number): ArmState => ({ angle: evalKeys(ANGLE_KEYS, t), biceps: evalKeys(BICEPS_KEYS, t), triceps: evalKeys(TRICEPS_KEYS, t) });

export type P = readonly [number, number];
export const flexion = (angle: number): number => ((180 - angle) * Math.PI) / 180;

/** Forearm frame -> arm frame: `a` along the forearm (down when hanging), `n` anterior. */
export function forearmPoint(angle: number, along: number, anterior: number): P {
  const phi = flexion(angle);
  const a: P = [Math.sin(phi), -Math.cos(phi)];
  const n: P = [Math.cos(phi), Math.sin(phi)];
  return [a[0] * along + n[0] * anterior, a[1] * along + n[1] * anterior];
}

export interface MuscleLine {
  origin: P;
  insertion: P;
  length: number;
}
function line(origin: P, insert: P, angle: number): MuscleLine {
  const insertion = forearmPoint(angle, insert[0], insert[1]);
  return { origin, insertion, length: Math.hypot(insertion[0] - origin[0], insertion[1] - origin[1]) };
}
export const bicepsLine = (angle: number): MuscleLine => line(BICEPS.origin, BICEPS.insert, angle);
export const tricepsLine = (angle: number): MuscleLine => line(TRICEPS.origin, TRICEPS.insert, angle);

/** Length of the fleshy belly (the tendons keep their length). */
export const bicepsBelly = (angle: number): number => bicepsLine(angle).length - BICEPS.prox - BICEPS.dist;
export const tricepsBelly = (angle: number): number => tricepsLine(angle).length - TRICEPS.prox - TRICEPS.dist;

/** Elbow angle (degrees) at which the biceps belly is `ratio` of its length at `from` degrees (bisection; monotonic). */
export function angleForBicepsRatio(ratio: number, from = 160): number {
  const target = bicepsBelly(from) * ratio;
  let lo = 20;
  let hi = from;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bicepsBelly(mid) > target) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Girth factor of a belly: volume stays constant when it shortens, and a working muscle swells a little more. */
export const girth = (rest: number, now: number, activity: number): number => Math.sqrt(rest / Math.max(now, 0.3)) * (1 + 0.16 * (activity / 100));
