import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../core';
import { CupTable, type CupHit } from './cup';
import { clamp01, smooth } from './math';
import { COLORS } from './palette';

export const LIPID_SPACING = 0.48;
/** Distance of a lipid's centre from the bilayer mid surface. */
export const LIPID_OFFSET = 0.3;

/** One phospholipid: round head, two tails; the origin is its centre, +y points at the head. */
export function lipidGeometry(detail: number): BufferGeometry {
  const head = new SphereGeometry(0.21, 8 + detail * 2, 6 + detail * 2);
  head.translate(0, 0.2, 0);
  const parts: BufferGeometry[] = [head];
  for (const sx of [-1, 1]) {
    const tail = new CylinderGeometry(0.06, 0.045, 0.34, 6, 1);
    tail.translate(sx * 0.09, -0.11, 0);
    parts.push(tail);
  }
  parts.forEach((g, i) => {
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    const col = i === 0 ? COLORS.head : COLORS.tail;
    const pos = g.getAttribute('position');
    for (let k = 0; k < n; k++) {
      // heads: a saturated warm tint that brightens toward the top; tails: darker amber, lighter toward the tips
      const y = pos.getY(k);
      const f = i === 0 ? 0.82 + 0.5 * Math.min(1, Math.max(0, (y - 0.0) / 0.42)) : 0.8 + 0.35 * Math.min(1, Math.max(0, (-y + 0.1) / 0.3));
      c[k * 3] = Math.min(1, col[0] * f);
      c[k * 3 + 1] = Math.min(1, col[1] * f);
      c[k * 3 + 2] = Math.min(1, col[2] * f);
    }
    g.setAttribute('color', new Float32BufferAttribute(c, 3));
  });
  const merged = mergeGeometries(parts, false) ?? head;
  parts.forEach((g) => g.dispose());
  return merged;
}

export interface DeformSite {
  cx: number;
  cz: number;
  /** Mid-surface radius of the vesicle bulb. */
  rb: number;
  /** Radius of the zone that follows the map (fades out to the flat sheet at the border). */
  zone: number;
  /** 0 flat .. 1 closed sphere. */
  p: number;
  /** Downward shift of the closed vesicle. */
  drop: number;
}

const UP = new Vector3(0, 1, 0);
const QZ = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
const Q = new Quaternion();
const AX = new Vector3();
const P = new Vector3();
const ONE = new Vector3(1, 1, 1);
const M = new Matrix4();
const HIT: CupHit = { r: 0, z: 0, psi: 0, inCup: false };

export interface PatchOptions {
  xHalf: number;
  zFront: number;
  zBack: number;
  exclude?: (x: number, z: number) => boolean;
  detail: number;
  seed: number;
  spacing?: number;
}

/** A flat bilayer patch of instanced lipids (two leaflets), optionally deformed around endocytosis/exocytosis sites. */
export class BilayerPatch {
  readonly mesh: InstancedMesh;
  readonly count: number;
  private readonly xs: Float32Array;
  private readonly zs: Float32Array;
  private readonly ph: Float32Array;
  private readonly tables: { up: CupTable; down: CupTable }[] = [];

  constructor(material: Material, o: PatchOptions) {
    const sp = o.spacing ?? LIPID_SPACING;
    const rng = mulberry32(o.seed);
    const xs: number[] = [];
    const zs: number[] = [];
    const nx = Math.floor(o.xHalf / sp);
    for (let i = -nx; i <= nx; i++) {
      for (let z = o.zFront; z >= o.zBack - 1e-6; z -= sp) {
        if (o.exclude?.(i * sp, z)) continue;
        xs.push(i * sp + (rng() - 0.5) * 0.04);
        zs.push(z + (rng() - 0.5) * 0.04);
      }
    }
    this.count = xs.length;
    this.xs = Float32Array.from(xs);
    this.zs = Float32Array.from(zs);
    this.ph = Float32Array.from(xs, () => rng() * Math.PI * 2);
    this.mesh = new InstancedMesh(lipidGeometry(o.detail), material, this.count * 2);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    const tint = new Color();
    for (let i = 0; i < this.count * 2; i++) {
      const k = 0.92 + rng() * 0.16;
      this.mesh.setColorAt(i, tint.setRGB(k, k * (0.97 + rng() * 0.06), k));
    }
  }

  /** Pose every lipid for time t. Pure: only `t` and `sites` matter. */
  pose(t: number, sites: readonly DeformSite[] = []): void {
    const n = this.count;
    const live = sites.filter((s) => s.p > 1e-3);
    const tabs = live.map((s, k) => {
      const tab = (this.tables[k] ??= { up: new CupTable(), down: new CupTable() });
      tab.up.fill(s.rb, s.p, LIPID_OFFSET);
      tab.down.fill(s.rb, s.p, -LIPID_OFFSET);
      return tab;
    });
    for (let i = 0; i < n; i++) {
      const x = this.xs[i]!;
      const z = this.zs[i]!;
      const bob = 0.018 * Math.sin(1.3 * t + this.ph[i]!);
      let site = -1;
      let dx = 0;
      let dz = 0;
      let rho = 0;
      for (let k = 0; k < live.length; k++) {
        const s = live[k]!;
        dx = x - s.cx;
        dz = z - s.cz;
        rho = Math.hypot(dx, dz);
        if (rho < s.zone) {
          site = k;
          break;
        }
      }
      for (let leaflet = 0; leaflet < 2; leaflet++) {
        const sign = leaflet === 0 ? 1 : -1;
        const idx = leaflet === 0 ? i : n + i;
        if (site < 0) {
          M.compose(P.set(x, sign * LIPID_OFFSET + bob, z), leaflet === 0 ? Q.identity() : Q.copy(QZ), ONE);
        } else {
          const s = live[site]!;
          const tab = leaflet === 0 ? tabs[site]!.up : tabs[site]!.down;
          tab.map(rho, HIT);
          const w = smooth(clamp01((s.zone - rho) / (s.zone * 0.3)));
          const phi = Math.atan2(dz, dx);
          const c = Math.cos(phi);
          const sn = Math.sin(phi);
          const r = rho + (HIT.r - rho) * w;
          const psi = HIT.psi * w;
          let y = sign * LIPID_OFFSET * (1 - w) + HIT.z * w + bob;
          if (HIT.inCup) y -= s.drop;
          P.set(s.cx + r * c, y, s.cz + r * sn);
          AX.set(-Math.sin(psi) * c, Math.cos(psi), -Math.sin(psi) * sn);
          Q.setFromUnitVectors(UP, AX);
          if (leaflet === 1) Q.multiply(QZ);
          M.compose(P, Q, ONE);
        }
        this.mesh.setMatrixAt(idx, M);
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}
