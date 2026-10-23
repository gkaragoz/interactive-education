import { Quaternion, Vector3 } from 'three';

// Path of the free mRNA through the nuclear pore: it runs straight along -X, bends round an elbow and then dives into
// the pore along -Z (away from the camera), 5' end first. `xh` is a nucleotide's horizontal distance from the pore axis.

export const RHO = 2.4;
const QZ90 = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
const QY = new Quaternion();
const AXIS_Y = new Vector3(0, 1, 0);

/** Pose of a nucleotide at horizontal offset `xh` from the pore axis (pore at `px`, strand height `y`, approach depth `z0`). */
export function mrnaPose(xh: number, px: number, y: number, z0: number, outPos: Vector3, outQuat: Quaternion): void {
  if (xh >= RHO) {
    outPos.set(px + xh, y, z0);
    outQuat.copy(QZ90);
    return;
  }
  const arc = (Math.PI * RHO) / 2;
  if (xh >= RHO - arc) {
    const phi = (RHO - xh) / RHO;
    outPos.set(px + RHO - RHO * Math.sin(phi), y, z0 - RHO + RHO * Math.cos(phi));
    outQuat.copy(QY.setFromAxisAngle(AXIS_Y, -phi)).multiply(QZ90);
    return;
  }
  const r = RHO - arc - xh;
  outPos.set(px, y, z0 - RHO - r);
  outQuat.copy(QY.setFromAxisAngle(AXIS_Y, -Math.PI / 2)).multiply(QZ90);
}
