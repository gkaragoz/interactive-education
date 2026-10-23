import { BufferAttribute, BufferGeometry, Euler, Group, InstancedMesh, Matrix4, Points, PointsMaterial, Quaternion, Vector3, type Plane } from 'three';
import { hashString, mulberry32, type Rng } from '../core';
import type { CellInfo } from '../data/types';
import type { OrganelleAsset } from './assetTypes';
import { fitsInShell, shellSdf, type PlacedInstance } from './layout';
import type { MaterialLibrary } from './materials';

/** Decor assets: not organelles (no legend entry, no info card, never selectable), only there to make the cell feel full. */
export const DECOR_IDS = ['cytoskeleton', 'vesicle'] as const;
export const isDecorId = (id: string): boolean => (DECOR_IDS as readonly string[]).includes(id);

const CYTOSKELETON_COUNT = 34;
const VESICLES_PER_HOST = 3;
const PARTICLES = 90;
/** Organelles whose neighbourhood gets vesicles (the secretory pathway). */
const VESICLE_HOSTS = new Set(['golgi', 'rough-er', 'smooth-er']);

type Vec3 = [number, number, number];

interface Drifter {
  index: number;
  base: Vector3;
  rotation: Quaternion;
  scale: number;
  phase: number;
  speed: number;
}

function inside(cell: CellInfo, p: Vec3, r: number): boolean {
  return fitsInShell(cell.shell, p, r, r);
}

/** True when a sphere at p with radius r would touch any placed organelle (plus a little air). */
function touches(placed: readonly PlacedInstance[], p: Vec3, r: number): boolean {
  return placed.some((o) => Math.hypot(p[0] - o.position[0], p[1] - o.position[1], p[2] - o.position[2]) < o.radius * 0.92 + r);
}

function randomPoint(cell: CellInfo, rng: Rng): Vec3 {
  const [hx, hy, hz] = cell.shell.halfExtents;
  return [(rng() * 2 - 1) * hx, (rng() * 2 - 1) * hy - 0.15 * hy, (rng() * 2 - 1) * hz];
}

/**
 * Ambient layer: cytoskeleton filaments spread through the cytoplasm, vesicles next to the Golgi and the ER, and
 * slowly floating particles. Only at medium and high quality; the drift stops with prefers-reduced-motion.
 * Everything is instanced or a single Points object, never pickable, never labelled.
 */
export class AmbientLayer {
  readonly group = new Group();
  private readonly meshes: InstancedMesh[] = [];
  private readonly vesicles: { meshes: InstancedMesh[]; drifters: Drifter[] }[] = [];
  private readonly particles: Points | null;
  private readonly particleBase: Float32Array;
  private readonly matrix = new Matrix4();

  constructor(
    cell: CellInfo,
    placed: readonly PlacedInstance[],
    assets: ReadonlyMap<string, OrganelleAsset>,
    materials: MaterialLibrary,
    clipPlane: Plane,
  ) {
    this.group.name = 'ambient';
    const rng = mulberry32(hashString(`ambient:${cell.id}`));
    const min = Math.min(...cell.shell.halfExtents);

    // Cytoskeleton: short filaments in free space, any direction, a little thicker/longer near the centre.
    const filament = assets.get('cytoskeleton');
    if (filament) {
      const spots: { p: Vec3; q: Quaternion; s: number }[] = [];
      const radius = filament.boundsRadius;
      for (let tries = 0; tries < 900 && spots.length < Math.round(CYTOSKELETON_COUNT * Math.min(1, min / 7)); tries++) {
        const s = 0.7 + rng() * 0.8;
        const p = randomPoint(cell, rng);
        if (!inside(cell, p, radius * s * 0.6) || touches(placed, p, radius * s * 0.55)) continue;
        spots.push({ p, q: new Quaternion().setFromEuler(new Euler(rng() * 6.28, rng() * 6.28, rng() * 6.28)), s });
      }
      this.addInstanced(filament, materials, spots.map((x) => new Matrix4().compose(new Vector3(...x.p), x.q, new Vector3(x.s, x.s, x.s))));
    }

    // Vesicles: small clusters hugging the Golgi and the ER; they drift a little.
    const vesicle = assets.get('vesicle');
    if (vesicle) {
      const drifters: Drifter[] = [];
      const r = vesicle.boundsRadius;
      for (const host of placed.filter((o) => VESICLE_HOSTS.has(o.organelleId))) {
        let made = 0;
        for (let tries = 0; tries < 60 && made < VESICLES_PER_HOST; tries++) {
          const dir = new Vector3(rng() - 0.5, (rng() - 0.5) * 0.7, rng() - 0.5).normalize();
          const distance = host.radius * (1.0 + rng() * 0.45) + r;
          const p: Vec3 = [host.position[0] + dir.x * distance, host.position[1] + dir.y * distance, host.position[2] + dir.z * distance];
          const others = placed.filter((o) => o !== host);
          if (!inside(cell, p, r * 1.6) || touches(others, p, r * 1.2) || shellSdf(cell.shell, p) > -r * 1.6) continue;
          const s = 0.8 + rng() * 0.6;
          drifters.push({ index: drifters.length, base: new Vector3(...p), rotation: new Quaternion().setFromEuler(new Euler(rng() * 6, rng() * 6, 0)), scale: s, phase: rng() * 6.28, speed: 0.35 + rng() * 0.4 });
          made++;
        }
      }
      if (drifters.length > 0) {
        const meshes = this.addInstanced(vesicle, materials, drifters.map((d) => new Matrix4().compose(d.base, d.rotation, new Vector3(d.scale, d.scale, d.scale))));
        this.vesicles.push({ meshes, drifters });
      }
    }

    // Floating particles: tiny warm motes in the cytoplasm.
    this.particleBase = new Float32Array(PARTICLES * 3);
    let count = 0;
    for (let tries = 0; tries < 800 && count < PARTICLES; tries++) {
      const p = randomPoint(cell, rng);
      if (!inside(cell, p, 0.4) || touches(placed, p, 0.3)) continue;
      this.particleBase.set(p, count * 3);
      count++;
    }
    if (count > 0) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(this.particleBase.slice(0, count * 3), 3));
      const material = new PointsMaterial({ color: '#fff3d6', size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0.6, depthWrite: false, clippingPlanes: [clipPlane] });
      this.particles = new Points(geometry, material);
      this.particles.renderOrder = 45;
      this.particles.frustumCulled = false;
      this.group.add(this.particles);
    } else {
      this.particles = null;
    }
  }

  /** How many decor instances exist (tests). */
  get counts(): { filaments: number; vesicles: number; particles: number } {
    const vesicleMeshes = new Set(this.vesicles.flatMap((v) => v.meshes));
    const filaments = this.meshes.filter((m) => !vesicleMeshes.has(m)).reduce((n, m) => Math.max(n, m.count), 0);
    return { filaments, vesicles: this.vesicles.reduce((n, v) => n + v.drifters.length, 0), particles: this.particles?.geometry.getAttribute('position').count ?? 0 };
  }

  private addInstanced(asset: OrganelleAsset, materials: MaterialLibrary, matrices: Matrix4[]): InstancedMesh[] {
    const parts = asset.lods[1] ?? asset.lods[0] ?? [];
    const made: InstancedMesh[] = [];
    for (const part of parts) {
      const mesh = new InstancedMesh(part.geometry, materials.get(asset.id, part.kind), matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.renderOrder = part.kind === 'gel' ? 41 : 31;
      this.group.add(mesh);
      this.meshes.push(mesh);
      made.push(mesh);
    }
    return made;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /** Gentle drift of the vesicles and the particles. `seconds` is wall time; amplitude is a few tenths of a micrometre. */
  update(seconds: number): void {
    for (const { meshes, drifters } of this.vesicles) {
      for (const d of drifters) {
        const t = seconds * d.speed + d.phase;
        const p = new Vector3(d.base.x + Math.sin(t) * 0.22, d.base.y + Math.sin(t * 1.3 + 1) * 0.16, d.base.z + Math.cos(t * 0.9) * 0.22);
        this.matrix.compose(p, d.rotation, new Vector3(d.scale, d.scale, d.scale));
        for (const m of meshes) m.setMatrixAt(d.index, this.matrix);
      }
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    }
    if (this.particles) {
      const pos = this.particles.geometry.getAttribute('position') as BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const t = seconds * 0.25 + i * 1.7;
        pos.setXYZ(i, (this.particleBase[i * 3] ?? 0) + Math.sin(t) * 0.35, (this.particleBase[i * 3 + 1] ?? 0) + Math.sin(t * 0.8 + i) * 0.3 + ((seconds * 0.05 + i * 0.13) % 0.5), (this.particleBase[i * 3 + 2] ?? 0) + Math.cos(t * 1.1) * 0.35);
      }
      pos.needsUpdate = true;
    }
  }

  /** Whether there is anything that moves. */
  get hasMotion(): boolean {
    return this.vesicles.length > 0 || this.particles !== null;
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.dispose();
    this.particles?.geometry.dispose();
    (this.particles?.material as PointsMaterial | undefined)?.dispose();
    this.group.removeFromParent();
  }
}
