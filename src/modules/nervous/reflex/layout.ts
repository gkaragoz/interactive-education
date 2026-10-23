import { Vector3 } from 'three';

/** World layout of the reflex scene (units are schematic): hand and hot plate on the left, spinal cord in the middle, brain above it. */
export const ARM_Y = -1.2;
export const ELBOW = new Vector3(-3, ARM_Y, 0);
export const SHOULDER = new Vector3(2.4, ARM_Y, 0);
export const CORD = new Vector3(6.6, 0.3, 0);
export const CORD_R = 3.0;
export const BRAIN = new Vector3(7.4, 7.0, 0);
export const PLATE = new Vector3(-13.1, -1.1, 0);
/** Fingertip where the hand touches the plate (in world space with the forearm at rest). */
export const FINGERTIP = new Vector3(-10.98, -0.84, 0.3);

const p = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);

/** Sensory neuron, forearm part (world coordinates at rest; the forearm group rotates about the elbow). */
export const SENSORY_FORE = [p(-10.98, -0.84, 0.3), p(-10.0, -0.78, 0.42), p(-8.9, -0.9, 0.58), p(-7.0, -1.0, 0.68), p(-5.0, -1.0, 0.68), p(-3.0, -1.0, 0.68)];
/** Sensory neuron from the elbow to its terminal in the dorsal horn; the cell body sits on the way (dorsal root ganglion). */
export const SENSORY_STATIC = [
  p(-3.0, -1.0, 0.68),
  p(-1.0, -1.0, 0.68),
  p(1.2, -1.0, 0.68),
  p(2.5, -0.4, 0.58),
  p(3.0, 1.0, 0.46),
  p(3.5, 2.2, 0.38),
  p(4.2, 2.6, 0.34),
  p(4.9, 2.15, 0.34),
  p(5.5, 1.5, 0.34),
];
/** Where along `SENSORY_STATIC` (0..1) the ganglion cell body sits. */
export const GANGLION_U = 0.66;

export const INTER_SOMA = p(6.25, 0.55, 0.34);
export const INTER_PATH = [p(5.72, 1.2, 0.34), p(5.95, 0.92, 0.34), INTER_SOMA, p(6.2, 0.15, 0.34), p(5.88, -0.18, 0.34)];

export const MOTOR_SOMA = p(5.5, -0.65, 0.34);
export const MOTOR_PATH = [
  MOTOR_SOMA,
  p(5.05, -1.3, 0.34),
  p(4.5, -1.9, 0.36),
  p(3.5, -2.0, 0.46),
  p(2.5, -1.7, 0.64),
  p(1.2, -1.42, 0.7),
  p(0.0, -1.2, 0.74),
  p(-0.8, -0.8, 0.76),
];

/** Slow branch to the brain. */
export const BRAIN_PATH = [p(5.5, 1.5, 0.3), p(5.8, 2.6, 0.22), p(6.5, 3.6, 0.12), p(7.0, 4.5, 0.06), p(7.2, 5.3, 0.04), p(7.3, 6.1, 0.04)];

export const MUSCLE_CENTER = p(-0.5, -0.62, 0.05);
export const MUSCLE_RADII = p(2.0, 0.74, 0.78);
