import { Color, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh, Matrix4, Quaternion, SphereGeometry, Vector3, type Material } from 'three';

const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const Q = new Quaternion();
const M = new Matrix4();
const P = new Vector3();
const SC = new Vector3();

/** Instanced spheres (molecules, ions, water, ATP): one draw call, each with its own radius and colour. */
export class MoleculePool {
  readonly mesh: InstancedMesh;
  private readonly tint = new Color();

  constructor(material: Material, readonly capacity: number, segments = 14) {
    const geo = new SphereGeometry(1, segments, Math.max(6, Math.round(segments * 0.7)));
    const white = new Float32Array(geo.getAttribute('position').count * 3).fill(1);
    geo.setAttribute('color', new Float32BufferAttribute(white, 3));
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

  set(i: number, pos: Vector3, radius: number): void {
    P.copy(pos);
    SC.set(radius, radius, radius);
    this.mesh.setMatrixAt(i, M.compose(P, Q, SC));
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
