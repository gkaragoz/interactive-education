import { BoxGeometry, Color, CylinderGeometry, Float32BufferAttribute, MeshBasicMaterial, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../../core';
import type { Kit } from '../kit';
import { clamp01 } from '../math';
import { COLORS } from '../palette';
import { InstancePool } from '../pool';
import { vmLocal } from './model';

/** Half height of the axon cut-away: the two membranes sit at y = +-WALL (mid surface). */
export const WALL = 2.5;
export const X_HALF = 10.4;
const SPACING = 0.48;

/** One phospholipid: round head, two tails; +y points at the head. Warm painted colours, brighter toward the head. */
export function lipidGeometry(detail: number): BufferGeometry {
  const head = new SphereGeometry(0.21, 8 + detail * 2, 6 + detail * 2);
  head.translate(0, 0.2, 0);
  const parts: BufferGeometry[] = [head];
  for (const sx of [-1, 1]) {
    const tail = new CylinderGeometry(0.06, 0.045, 0.34, 6, 1);
    tail.translate(sx * 0.09, -0.11, 0);
    parts.push(tail);
  }
  const heads = new Color(COLORS.membrane);
  const tails = new Color('#d49a44');
  parts.forEach((g, i) => {
    const pos = g.getAttribute('position');
    const c = new Float32Array(pos.count * 3);
    const base = i === 0 ? heads : tails;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k);
      const f = i === 0 ? 0.82 + 0.5 * clamp01(y / 0.42) : 0.8 + 0.35 * clamp01((-y + 0.1) / 0.3);
      c[k * 3] = Math.min(1, base.r * f);
      c[k * 3 + 1] = Math.min(1, base.g * f);
      c[k * 3 + 2] = Math.min(1, base.b * f);
    }
    g.setAttribute('color', new Float32BufferAttribute(c, 3));
  });
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

/** Instanced bilayer on both walls, leaving round holes (in x and z) for proteins. z runs from the cut face (0) back to -3.8. */
export function buildLipids(kit: Kit, holes: readonly { x: number; r: number }[]): void {
  const step = kit.detail === 0 ? SPACING * 1.3 : SPACING;
  const rows = kit.detail === 0 ? 5 : 9;
  const cols = Math.floor((X_HALF * 2) / step);
  const rng = mulberry32(31);
  const spots: {
    x: number;
    z: number;
    wall: 1 | -1;
    outer: boolean;
    tint: number;
  }[] = [];
  for (const wall of [1, -1] as const) {
    for (const outer of [true, false]) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const x = -X_HALF + c * step + (r % 2) * step * 0.5;
          const z = -r * step * 0.95;
          if (holes.some((h) => Math.hypot(x - h.x, z) < h.r)) continue;
          spots.push({ x, z, wall, outer, tint: 0.9 + rng() * 0.2 });
        }
      }
    }
  }
  const pool = new InstancePool(lipidGeometry(kit.detail), kit.clay('nv-lipid'), spots.length);
  pool.mesh.renderOrder = 10;
  const p = new Vector3();
  spots.forEach((s, i) => {
    const up = s.outer === (s.wall === 1); // heads point away from the cell centre (outer leaflet) or toward it (inner)
    p.set(s.x, s.wall * (WALL + (s.outer ? 0.3 : -0.3)), s.z);
    pool.set(i, p, 1, up ? 0 : Math.PI);
    pool.setColor(i, new Color(s.tint, s.tint, s.tint));
  });
  pool.commit();
  kit.root.add(pool.mesh);
  kit.track(pool);
}

const SLOTS = Array.from({ length: 21 }, (_, i) => -10 + i);

export interface Charges {
  set(t: number): void;
}

/** "+" and "-" markers along both faces of both walls: rest has - inside and + outside, the spike swaps them. Their size follows |V|. */
export function buildCharges(kit: Kit): Charges {
  const mk = (cross: boolean): BufferGeometry => {
    const bar = new BoxGeometry(0.46, 0.13, 0.08);
    if (!cross) return bar;
    const v = new BoxGeometry(0.13, 0.46, 0.08);
    const m = mergeGeometries([bar, v], false)!;
    bar.dispose();
    v.dispose();
    return m;
  };
  const mat = new MeshBasicMaterial({ toneMapped: false });
  kit.track(mat);
  const n = SLOTS.length * 4;
  const plus = new InstancePool(mk(true), mat, n);
  const minus = new InstancePool(mk(false), mat, n);
  for (const pool of [plus, minus]) {
    pool.mesh.renderOrder = 45;
    kit.root.add(pool.mesh);
    kit.track(pool);
  }
  for (let i = 0; i < n; i++) {
    plus.setColor(i, COLORS.plus);
    minus.setColor(i, COLORS.minus);
  }
  const p = new Vector3();
  return {
    set(t) {
      let k = 0;
      for (const x of SLOTS) {
        const v = vmLocal(x, t);
        const size = Math.min(1.05, Math.abs(v) / 70) * 0.95;
        for (const wall of [1, -1]) {
          for (const inside of [true, false]) {
            const positive = inside === v > 0; // inside is positive when V > 0; outside the opposite
            const y = wall * (inside ? 1.38 : 3.62);
            p.set(x, y, 0.3);
            const on = positive ? plus : minus;
            const off = positive ? minus : plus;
            on.set(k, p, size);
            off.hide(k);
            k++;
          }
        }
      }
      plus.commit();
      minus.commit();
    },
  };
}

/** Soft glow on each wall where the membrane is depolarised (one sprite per slot and wall); the wave visibly travels along the axon. */
export function buildWaveGlow(kit: Kit): { set(t: number): void } {
  const sprites = SLOTS.flatMap((x) =>
    [1, -1].map((wall) => ({
      x,
      wall,
      s: kit.sprite('#ffc83a', 2.2, 0, false),
    })),
  );
  sprites.forEach(({ x, wall, s }) => s.position.set(x, wall * WALL, 0.45));
  return {
    set(t) {
      for (const { x, s } of sprites) {
        const v = vmLocal(x, t);
        (s.material as { opacity: number }).opacity = 0.62 * clamp01((v + 62) / 60);
      }
    },
  };
}
