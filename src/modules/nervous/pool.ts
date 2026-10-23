import { Color, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh, Matrix4, Quaternion, SphereGeometry, Vector3, type BufferGeometry, type Material } from 'three';

const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const Q = new Quaternion();
const M = new Matrix4();
const SC = new Vector3();
const Z_AXIS = new Vector3(0, 0, 1);

/** Instanced copies of one geometry (ions, neurotransmitters, lipids, markers): one draw call, own colour and scale each. */
export class InstancePool {
  readonly mesh: InstancedMesh;
  private readonly tint = new Color();

  constructor(
    geometry: BufferGeometry | null,
    material: Material,
    readonly capacity: number,
    segments = 14,
  ) {
    const geo = geometry ?? new SphereGeometry(1, segments, Math.max(6, Math.round(segments * 0.7)));
    if (!geo.getAttribute('color')) geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 3).fill(1), 3));
    this.mesh = new InstancedMesh(geo, material, capacity);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 30;
    for (let i = 0; i < capacity; i++) {
      this.mesh.setMatrixAt(i, HIDDEN);
      this.mesh.setColorAt(i, this.tint.set('#ffffff'));
    }
  }

  setColor(i: number, color: string | number | Color): void {
    this.mesh.setColorAt(i, this.tint.set(color as Color));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Position, uniform radius and optional rotation about z. */
  set(i: number, pos: Vector3, radius: number, angleZ = 0): void {
    SC.set(radius, radius, radius);
    Q.setFromAxisAngle(Z_AXIS, angleZ);
    this.mesh.setMatrixAt(i, M.compose(pos, Q, SC));
  }

  /** Non-uniform scale (stretched markers). */
  setXYZ(i: number, pos: Vector3, sx: number, sy: number, sz: number, angleZ = 0): void {
    SC.set(sx, sy, sz);
    Q.setFromAxisAngle(Z_AXIS, angleZ);
    this.mesh.setMatrixAt(i, M.compose(pos, Q, SC));
  }

  hide(i: number): void {
    this.mesh.setMatrixAt(i, HIDDEN);
  }

  commit(): void {
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}
