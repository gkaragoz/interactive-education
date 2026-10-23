import { gate, path, still, type Key } from './anim';
import type { Kit } from './kit';
import { addOrganism } from './organisms';
import { classInfo, fillWindow, lookOf, type CrossKind, type Square } from './punnett';

/** Where the Punnett square stands: centre, square size, number of gametes per side. */
export interface SquareLayout {
  cx: number;
  cy: number;
  cs: number;
  n: number;
}

export const layoutFor = (n: number, cx: number, cy: number): SquareLayout => ({ cx, cy, cs: n === 2 ? 2.4 : 1.55, n });

export const cellX = (l: SquareLayout, col: number): number => l.cx + (col - (l.n - 1) / 2) * l.cs;
export const cellY = (l: SquareLayout, row: number): number => l.cy + ((l.n - 1) / 2 - row) * l.cs;
/** Header places: top (gametes of the right parent) and left side (gametes of the left parent). */
export const colHeader = (l: SquareLayout, col: number): [number, number] => [cellX(l, col), l.cy + (l.n * l.cs) / 2 + l.cs * 0.72];
export const rowHeader = (l: SquareLayout, row: number): [number, number] => [l.cx - (l.n * l.cs) / 2 - l.cs * 0.72, cellY(l, row)];

export const mix = (a: string, b: string, f: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number): number => Math.round(((pa >> sh) & 255) * (1 - f) + ((pb >> sh) & 255) * f);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
};
export const EMPTY = '#efe3cc';

/** The board, the header plates and, cell by cell, flying gametes, the genotype letters and the offspring picture. */
export function buildSquare(kit: Kit, kind: CrossKind, sq: Square, l: SquareLayout, t0: number, t1: number, appear: number, orbColor: (allele: string) => string): void {
  const board = l.n * l.cs + 0.3;
  kit.shape({ shape: 'tile', anim: gate(still(l.cx, l.cy, 1, -0.22), appear, appear + 0.8), size: [board, board, 1], color: '#e4d3b5' });
  for (let i = 0; i < l.n; i++) {
    const [hx, hy] = colHeader(l, i);
    kit.shape({ shape: 'tile', anim: gate(still(hx, hy, 1, -0.12), appear, appear + 0.8), size: [l.cs * 0.9, l.cs * 0.9, 1], color: '#c3aedf' });
    const [rx, ry] = rowHeader(l, i);
    kit.shape({ shape: 'tile', anim: gate(still(rx, ry, 1, -0.12), appear, appear + 0.8), size: [l.cs * 0.9, l.cs * 0.9, 1], color: '#c3aedf' });
  }
  sq.cells.forEach((cell, k) => {
    const x = cellX(l, cell.col);
    const y = cellY(l, cell.row);
    const { start, win } = fillWindow(k, sq.n, t0, t1);
    const full = classInfo(kind, cell.cls).color;
    kit.shape({
      shape: 'tile',
      anim: gate(still(x, y), appear, appear + 0.8),
      size: [l.cs * 0.92, l.cs * 0.92, 1],
      color: (t) => mix(EMPTY, mix(full, '#ffffff', 0.35), Math.min(1, Math.max(0, (t - start - win * 0.45) / (win * 0.55)))),
    });
    // two gametes (one from the side header, one from the top header) meet in the cell
    const orbs: Array<[number, number, string]> = [
      [...rowHeader(l, cell.row), orbColor((sq.rows[cell.row] as readonly string[])[0] as string)],
      [...colHeader(l, cell.col), orbColor((sq.cols[cell.col] as readonly string[])[0] as string)],
    ];
    for (const [hx, hy, color] of orbs) {
      const keys: Key[] = [[start - 0.01, hx, hy, 0], [start + win * 0.15, hx, hy, 1], [start + win * 0.62, x, y, 0.9, 0.5, 0.5], [start + win * 0.8, x, y, 0]];
      kit.shape({ shape: 'sphere', anim: path(keys), size: [0.17 * l.cs, 0.17 * l.cs, 0.17 * l.cs], color });
    }
    const flat = cell.genes.flatMap((g) => [...g]);
    kit.tag({ alleles: flat, height: l.cs * 0.34, maxWidth: l.cs * 0.86, anim: gate(still(x, y + l.cs * 0.25, 1, 0.25), start + win * 0.5, start + win * 0.95) });
    const look = lookOf(kind, cell.genes);
    const scale = look.kind === 'pea' ? l.cs * 0.62 : l.cs * 0.2;
    addOrganism(kit, look, gate(still(x, y - l.cs * (look.kind === 'pea' ? 0.2 : 0.15), scale, 0.2), start + win * 0.55, start + win), true);
  });
}
