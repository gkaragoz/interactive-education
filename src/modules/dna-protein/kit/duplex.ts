import { Quaternion, Vector3 } from 'three';

// Geometry of the schematic double helix. Local frame: the DNA axis is Y and base pairs follow DOWN it, so the native
// nucleotide (5'->3' chain running down Y) is strand A on the left (x = -R); strand B is the same nucleotide turned 180
// degrees about Z and sits on the right (x = +R), running up. A rung rotated by `phi` about Y gives the helix.

export const RISE = 0.7; // distance between base pairs
export const RADIUS = 1.0; // sugar distance from the axis
export const TWIST = Math.PI / 5; // ten base pairs per turn

let groove = 0;
/** Unequal major / minor groove (strand B sits `g` radians off the exact opposite side); 0 = equal grooves. */
export const setGroove = (g: number): void => {
  groove = g;
};

const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
const Q_FLIP = new Quaternion().setFromAxisAngle(Z, Math.PI);
const _qy = new Quaternion();

/** Position (relative to the rung centre) and rotation of the nucleotide on `side` (-1 = strand A, +1 = strand B). */
export function rungSide(side: -1 | 1, phi: number, r: number, outPos: Vector3, outQuat: Quaternion): void {
  // phi runs the right-handed way (strands rise to the right on the near side)
  const a = phi - (side > 0 ? groove : 0);
  outPos.set(side * r * Math.cos(a), 0, side * r * Math.sin(a));
  _qy.setFromAxisAngle(Y, -a);
  if (side > 0) outQuat.multiplyQuaternions(_qy, Q_FLIP);
  else outQuat.copy(_qy);
}

/** y of base pair `i` when the top pair is at `top`. */
export const rungY = (i: number, top = 0): number => top - i * RISE;
