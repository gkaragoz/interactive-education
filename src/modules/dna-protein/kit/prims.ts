import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
} from 'three';

/** The shared painted materials expect a white vertex colour on every geometry. */
function whiten<T extends BufferGeometry>(g: T): T {
  const n = g.getAttribute('position').count;
  g.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  return g;
}

/** Unit primitives: sphere r=1, cylinder r=1 h=1 along Y (centred), cone r=1 h=1 (tip +Y), box 1x1x1, torus R=1 r=0.06 in XY. */
export function unitGeometries(detail: number): { sphere: BufferGeometry; cylinder: BufferGeometry; cone: BufferGeometry; box: BufferGeometry; torus: BufferGeometry } {
  return {
    sphere: whiten(new SphereGeometry(1, 8 + detail * 4, 6 + detail * 3)),
    cylinder: whiten(new CylinderGeometry(1, 1, 1, 6 + detail * 3, 1)),
    cone: whiten(new CylinderGeometry(0, 1, 1, 6 + detail * 3, 1)),
    box: whiten(new BoxGeometry(1, 1, 1)),
    torus: whiten(new TorusGeometry(1, 0.06, 8 + detail * 3, 20 + detail * 8)),
  };
}

const _q = new Quaternion();
const _d = new Vector3();
const _s = new Vector3();
const _p = new Vector3();
const _m = new Matrix4();
const UP = new Vector3(0, 1, 0);
const Q_FLAT = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
const _one = new Vector3();
const Q_ID = new Quaternion();

/**
 * A pool of instances of one unit primitive with per-instance colours. Per frame: `begin()`, any number of `add*` calls,
 * `end()`. Only the used instances are drawn (`count`), nothing is allocated.
 */
export class PrimSet {
  readonly mesh: InstancedMesh;
  private n = 0;

  constructor(
    parent: Group,
    geometry: BufferGeometry,
    material: Material,
    readonly cap: number,
    order = 30,
  ) {
    this.mesh = new InstancedMesh(geometry, material, cap);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.renderOrder = order;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, new Color(1, 1, 1));
    parent.add(this.mesh);
  }

  begin(): void {
    this.n = 0;
  }

  get used(): number {
    return this.n;
  }

  /** Raw matrix and colour. */
  push(m: Matrix4, color: Color): void {
    if (this.n >= this.cap) return;
    this.mesh.setMatrixAt(this.n, m);
    this.mesh.setColorAt(this.n, color);
    this.n++;
  }

  sphere(x: number, y: number, z: number, r: number, color: Color): void {
    if (r <= 0.0005) return;
    this.push(_m.makeScale(r, r, r).setPosition(x, y, z), color);
  }

  /** A cylinder (or cone, tip at b) from a to b with radius r. */
  between(ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, color: Color): void {
    _d.set(bx - ax, by - ay, bz - az);
    const len = _d.length();
    if (len < 1e-5 || r <= 0.0005) return;
    _q.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
    _p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    _s.set(r, len, r);
    this.push(_m.compose(_p, _q, _s), color);
  }

  /** A torus lying flat (axis Y) of radius r (use with the torus geometry). */
  ring(x: number, y: number, z: number, r: number, color: Color): void {
    if (r <= 0.0005) return;
    _p.set(x, y, z);
    this.push(_m.compose(_p, Q_FLAT, _one.set(r, r, r)), color);
  }

  /** A torus facing the camera (axis Z), for highlight rings. */
  ringFace(x: number, y: number, z: number, r: number, color: Color): void {
    if (r <= 0.0005) return;
    _p.set(x, y, z);
    this.push(_m.compose(_p, Q_ID, _one.set(r, r, r)), color);
  }

  box(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: Color): void {
    if (sx <= 0.0005) return;
    this.push(_m.makeScale(sx, sy, sz).setPosition(x, y, z), color);
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}
