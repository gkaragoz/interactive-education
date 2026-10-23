import { clamp01, evalKeys, lerp, type Keys } from './math';

/** World size of the sarcomere group (model micrometres to scene units). */
export const K = 5.0;
export const PITCH = 1.9;
/** Magnification from level k to level k + 1 (arm, muscle, fascicle, fibre, myofibril, sarcomere). */
export const F3 = 5;
/** The arm is drawn 1.2 times larger than its natural size so it fills the view. */
export const ARM_SCALE = 1.0;
const MAG = [5.5 / ARM_SCALE, 5, 5, F3, K / PITCH];
export const LEVEL_NAMES = ['arm', 'muscle', 'fascicle', 'fibre', 'myofibril', 'sarcomere'] as const;
export const LEVELS = LEVEL_NAMES.length;

/** Cumulative natural log of the magnification at each level focus. */
const LAMBDA: number[] = MAG.reduce<number[]>((acc, f) => [...acc, acc[acc.length - 1]! + Math.log(f)], [0]);

/** Zoom position z (0 = whole arm, 5 = one sarcomere); between levels the scale is interpolated in log space. */
const lam = (z: number): number => {
  const c = Math.min(Math.max(z, 0), LEVELS - 1);
  const k = Math.min(Math.floor(c), LEVELS - 2);
  return lerp(LAMBDA[k]!, LAMBDA[k + 1]!, c - k);
};

/** Scale of level k's group when the zoom is at z (1 when it is the level in focus). */
export const levelScale = (k: number, z: number): number => Math.exp(lam(z) - LAMBDA[k]!);

/** Opacity weight of level k: full near its own focus, crossfading to the neighbours. */
export const levelWeight = (k: number, z: number): number => {
  const d = z - k;
  // a level we are zooming past leaves quickly (its big shell must not veil the view); the next one arrives early
  return d >= 0 ? clamp01(1 - (d - 0.1) / 0.5) : clamp01(1 - (-d - 0.2) / 0.6);
};

/** Zoom keys of the `kasilma` track at ileri level: the flythrough, the long stay at the sarcomere and the pull-back. */
export const ZOOM_ILERI: Keys = [[0, 0], [0.8, 0], [2.2, 1], [2.5, 1], [3.9, 2], [4.2, 2], [5.5, 3], [6.8, 3], [8.1, 4], [8.5, 4], [9.9, 5], [33.5, 5], [40, 0]];
export const zoomAt = (t: number): number => evalKeys(ZOOM_ILERI, t);

/** Distance from the camera to the zoom axis (constant: the zoom is done by scaling the levels). */
export const CAMERA_DISTANCE = 28;
/** A little farther while the whole arm is in view. */
export const cameraDistance = (z: number): number => CAMERA_DISTANCE + 3.5 * (1 - Math.min(1, Math.max(0, z)));
