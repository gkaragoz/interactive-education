import { Color, DynamicDrawUsage, Euler, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Material } from 'three';

export const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const M = new Matrix4();
const Q = new Quaternion();
const E = new Euler();
const P = new Vector3();
const S = new Vector3();
const TMP = new Color();

function withWhiteColors(geo: BufferGeometry): BufferGeometry {
  const n = geo.getAttribute('position').count;
  geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  return geo;
}

/** Wrinkled pea: a low-poly ball whose radius varies with direction (so neighbouring faces never tear apart). */
export function wrinkledGeometry(): BufferGeometry {
  const geo = new IcosahedronGeometry(1, 2);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.hypot(x, y, z);
    const r = 0.92 + 0.12 * Math.sin(x * 6.1 + z * 3.3) * Math.cos(y * 5.3 - x * 2.1) - 0.08 * Math.cos(z * 7.7 + y * 2.9);
    pos.setXYZ(i, (x / len) * r, (y / len) * r * 0.92, (z / len) * r);
  }
  geo.computeVertexNormals();
  return geo;
}

/** One InstancedMesh of a shape with per-instance transform and tint (the painted-clay material tints through `instanceColor`). */
export class ShapePool {
  readonly mesh: InstancedMesh;
  used = 0;
  constructor(geo: BufferGeometry, material: Material, readonly capacity: number, order: number) {
    this.mesh = new InstancedMesh(withWhiteColors(geo), material, capacity);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    this.reset();
  }
  reset(): void {
    this.used = 0;
    for (let i = 0; i < this.capacity; i++) {
      this.mesh.setMatrixAt(i, HIDDEN);
      this.mesh.setColorAt(i, TMP.set('#ffffff'));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  alloc(): number {
    if (this.used >= this.capacity) throw new Error(`genetics: ${this.capacity} instances of one shape are not enough`);
    return this.used++;
  }
  put(i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx: number, ry: number, rz: number): void {
    this.mesh.setMatrixAt(i, M.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz)));
  }
}
