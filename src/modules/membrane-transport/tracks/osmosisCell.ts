import { Group, Mesh, SphereGeometry, Vector3, type BufferGeometry, type Material, type MeshPhysicalMaterial } from 'three';
import { COLORS } from '../palette';
import { paint } from '../proteins';

/** Distance from the centre to a super-ellipsoid |x/a|^p + |y/b|^p + |z/c|^p = 1 along the unit direction u. */
export function superRadius(ux: number, uy: number, uz: number, a: number, b: number, c: number, p: number): number {
  const k = Math.pow(Math.abs(ux / a), p) + Math.pow(Math.abs(uy / b), p) + Math.pow(Math.abs(uz / c), p);
  return Math.pow(k, -1 / p);
}

/** A cell shape the water particles live in and around. `s` is the linear size ratio (1 = start size). */
export interface CellView {
  group: Group;
  /** Radius of the membrane along unit direction u at size ratio s. */
  radius(u: Vector3, s: number): number;
  update(s: number): void;
  dispose(): void;
}

/** Unit sphere whose vertices are moved every frame (geometry normals are recomputed). */
function liveSphere(material: Material, seg: number, color: string): { mesh: Mesh; base: Float32Array } {
  const geo = paint(new SphereGeometry(1, 28 + seg * 8, 20 + seg * 6), color, 0.1);
  const pos = geo.getAttribute('position');
  const base = new Float32Array(pos.array as Float32Array);
  const mesh = new Mesh(geo, material);
  mesh.renderOrder = 10;
  return { mesh, base };
}

function reshape(mesh: Mesh, base: Float32Array, fn: (x: number, y: number, z: number, out: Vector3) => void): void {
  const geo = mesh.geometry as BufferGeometry;
  const pos = geo.getAttribute('position');
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    fn(base[i * 3]!, base[i * 3 + 1]!, base[i * 3 + 2]!, v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

const R0 = 2.1;

/** Animal cell: a translucent membrane ball that swells, or shrinks and crinkles; the nucleus follows. */
export function createAnimalCell(shell: MeshPhysicalMaterial, clay: MeshPhysicalMaterial, seg: number): CellView {
  shell.opacity = 0.46;
  const group = new Group();
  const { mesh, base } = liveSphere(shell, seg, '#e7b3b8');
  const nucleus = new Mesh(paint(new SphereGeometry(0.62, 18, 14), COLORS.nucleus, 0.2), clay);
  group.add(mesh, nucleus);
  return {
    group,
    radius: (_u, s) => R0 * s,
    update(s) {
      const wrinkle = Math.min(1, Math.max(0, (1 - s) / 0.18)) * 0.1;
      reshape(mesh, base, (x, y, z, out) => {
        const n = Math.sin(7 * x + 1.3) * Math.sin(6 * y + 0.4) + Math.sin(5 * z + 2.1) * Math.sin(8 * x - 3 * y);
        out.set(x, y, z).multiplyScalar(R0 * s * (1 + wrinkle * n));
      });
      nucleus.scale.setScalar(0.85 + 0.15 * s);
    },
    dispose() {
      mesh.geometry.dispose();
      nucleus.geometry.dispose();
      group.removeFromParent();
    },
  };
}

const AX = new Vector3(2.75, 2.2, 1.8);

/** Plant cell: a fixed wall (it only bulges a little) and a protoplast with a vacuole that fills it, or pulls away. */
export function createPlantCell(wallMat: MeshPhysicalMaterial, shell: MeshPhysicalMaterial, vacuoleMat: MeshPhysicalMaterial, clay: MeshPhysicalMaterial, seg: number): CellView {
  const group = new Group();
  const wall = liveSphere(wallMat, seg, COLORS.wall);
  const proto = liveSphere(shell, seg, '#d9c07a');
  const vac = liveSphere(vacuoleMat, seg, COLORS.vacuole);
  const chloro = Array.from({ length: 5 }, (_, i) => {
    const m = new Mesh(paint(new SphereGeometry(0.34, 14, 10), COLORS.chloroplast, 0.2), clay);
    m.scale.set(1.5, 0.8, 0.9);
    m.userData.u = new Vector3(Math.cos(i * 1.9 + 0.4), Math.sin(i * 2.7) * 0.7, Math.sin(i * 1.9 + 0.4) * 0.9).normalize();
    return m;
  });
  group.add(wall.mesh, proto.mesh, vac.mesh, ...chloro);
  const exponent = (s: number): number => 2.5 + 3.5 * Math.min(1, Math.max(0, (s - 0.7) / 0.3));
  const wallScale = (s: number): number => (s > 1 ? 1 + 0.4 * (s - 1) : 1);
  const protoAxes = (s: number): number => 0.97 * (s > 1 ? wallScale(s) : s);
  reshape(wall.mesh, wall.base, (x, y, z, out) => {
    const r = superRadius(x, y, z, AX.x, AX.y, AX.z, 6);
    out.set(x, y, z).multiplyScalar(r);
  });
  return {
    group,
    radius(u, s) {
      const k = protoAxes(s);
      return superRadius(u.x, u.y, u.z, AX.x * k, AX.y * k, AX.z * k, exponent(s) + (s > 1 ? 0 : 0));
    },
    update(s) {
      const k = protoAxes(s);
      const p = exponent(s);
      reshape(proto.mesh, proto.base, (x, y, z, out) => out.set(x, y, z).multiplyScalar(superRadius(x, y, z, AX.x * k, AX.y * k, AX.z * k, p)));
      reshape(vac.mesh, vac.base, (x, y, z, out) => out.set(x, y, z).multiplyScalar(0.62 * superRadius(x, y, z, AX.x * k, AX.y * k, AX.z * k, p)));
      wall.mesh.scale.setScalar(wallScale(s));
      for (const m of chloro) {
        const u = m.userData.u as Vector3;
        m.position.copy(u).multiplyScalar(0.86 * superRadius(u.x, u.y, u.z, AX.x * k, AX.y * k, AX.z * k, p));
      }
    },
    dispose() {
      for (const m of [wall.mesh, proto.mesh, vac.mesh, ...chloro]) m.geometry.dispose();
      group.removeFromParent();
    },
  };
}

