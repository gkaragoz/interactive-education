import { Vector2 } from 'three';
import { inset, slab, superEllipse } from '../geo';
import type { Kit } from '../kit';
import { COLORS } from '../palette';

/** Chaikin corner cutting: rounds the join between the neck and the bulb. */
export function smoothPolygon(poly: readonly Vector2[], rounds: number): Vector2[] {
  let p = poly.slice();
  for (let r = 0; r < rounds; r++) {
    const q: Vector2[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i]!;
      const b = p[(i + 1) % p.length]!;
      q.push(new Vector2(a.x * 0.75 + b.x * 0.25, a.y * 0.75 + b.y * 0.25), new Vector2(a.x * 0.25 + b.x * 0.75, a.y * 0.25 + b.y * 0.75));
    }
    p = q;
  }
  return p;
}

export const NECK_H = 1.05;
export const MEMBRANE_W = 0.55;

/** Axon terminal: a rounded bulb with the axon as a long neck to the left. */
export function terminalPolygon(): Vector2[] {
  const cx = -6.5;
  const a = 5.2;
  const base = superEllipse(cx, 0, a, 5.3, 3.2, 120);
  const out: Vector2[] = [];
  let done = false;
  for (const p of base) {
    if (p.x < cx && Math.abs(p.y) < NECK_H) {
      if (!done) out.push(new Vector2(-26, NECK_H), new Vector2(-26, -NECK_H));
      done = true;
      continue;
    }
    out.push(p);
  }
  return smoothPolygon(out, 2);
}

/** Receiving cell: a big rounded cell on the right. */
export function receiverPolygon(): Vector2[] {
  return superEllipse(6.7, 0, 5.3, 5.5, 3.2, 100);
}

/** Two cut-away plates per cell: the membrane (outer ring) and the cytoplasm face (inset), the cut surface toward the viewer. */
export function buildCells(kit: Kit): void {
  const cells: [Vector2[], string, string, string, string][] = [
    [terminalPolygon(), COLORS.membrane, COLORS.cytoplasm, 'nv-pre', 'nv-pre-in'],
    [receiverPolygon(), COLORS.postMembrane, COLORS.postCytoplasm, 'nv-post', 'nv-post-in'],
  ];
  for (const [poly, ring, fill, ringId, fillId] of cells) {
    kit.mesh(slab(poly, -1.0, 1.0, ring, 0.1), kit.clay(ringId));
    kit.mesh(slab(inset(poly, MEMBRANE_W), -1.0, 1.12, fill, 0.1), kit.clay(fillId));
  }
  kit.band(
    -30,
    26,
    -8,
    8,
    -1.6,
    [
      [0, 'rgba(120,186,216,0.85)'],
      [0.5, 'rgba(176,218,226,0.8)'],
      [1, 'rgba(120,186,216,0.85)'],
    ],
    0.95,
  );
}
