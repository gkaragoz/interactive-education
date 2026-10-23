import { Matrix4, Quaternion, Vector3 } from 'three';
import { CELL_CH } from './plan';
import type { Plan } from './plan';

const AXIS_Z = new Vector3(0, 0, 1);

/** Per-cell transform (position + rotation about Z) evaluated from the plan at time t. */
export class CellFrames {
  readonly vals = [new Float32Array(CELL_CH.length), new Float32Array(CELL_CH.length)];
  private readonly mats = [new Matrix4(), new Matrix4()];
  private readonly quats = [new Quaternion(), new Quaternion()];
  private readonly p = new Vector3();
  private readonly one = new Vector3(1, 1, 1);

  update(plan: Plan, t: number): void {
    for (let i = 0; i < 2; i++) {
      const v = this.vals[i] as Float32Array;
      (plan.cells[i] as { eval(t: number, o: Float32Array): void }).eval(t, v);
      (this.quats[i] as Quaternion).setFromAxisAngle(AXIS_Z, v[3] as number);
      (this.mats[i] as Matrix4).compose(this.p.set(v[1] as number, v[2] as number, 0), this.quats[i] as Quaternion, this.one);
    }
  }

  matrix(i: number): Matrix4 {
    return this.mats[i === 1 ? 1 : 0] as Matrix4;
  }

  quat(i: number): Quaternion {
    return this.quats[i === 1 ? 1 : 0] as Quaternion;
  }
}
