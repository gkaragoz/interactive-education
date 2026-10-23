// Filament lattice of the sarcomere slab: positions in the (y, z) plane. Five thick filaments in two staggered
// layers, thin filaments at the triangle centres between them (each thin filament touches three thick ones).
export type P2 = readonly [number, number];

export const LATTICE_D = 0.46;
export const THICK_R = 0.07;
export const THIN_R = 0.028;

const D = LATTICE_D;
const H3 = Math.sqrt(3) / 2;
const point = (i: number, j: number): P2 => [D * (i + j / 2), -H3 * D * j];

const THICK_IDX: ReadonlyArray<readonly [number, number]> = [[-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1]];

export const THICK: P2[] = THICK_IDX.map(([i, j]) => point(i, j));

function buildThin(): P2[] {
  const has = (i: number, j: number): boolean => THICK_IDX.some(([a, b]) => a === i && b === j);
  const out: P2[] = [];
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      const up = [[i, j], [i + 1, j], [i, j + 1]] as const;
      const down = [[i + 1, j], [i, j + 1], [i + 1, j + 1]] as const;
      for (const tri of [up, down]) {
        const n = tri.filter(([a, b]) => has(a, b)).length;
        if (n < 2) continue;
        const pts = tri.map(([a, b]) => point(a, b));
        out.push([(pts[0]![0] + pts[1]![0] + pts[2]![0]) / 3, (pts[0]![1] + pts[1]![1] + pts[2]![1]) / 3]);
      }
    }
  }
  return out;
}
export const THIN: P2[] = buildThin();

/** Centre and half sizes of the slab (for the Z discs and the camera). */
export const SLAB = (() => {
  const all = [...THICK, ...THIN];
  const ys = all.map((p) => p[0]);
  const zs = all.map((p) => p[1]);
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  return { cy, cz, hy: (Math.max(...ys) - Math.min(...ys)) / 2 + 0.2, hz: (Math.max(...zs) - Math.min(...zs)) / 2 + 0.2 };
})();

/** Unit directions (y, z) from thick filament `k` to the thin filaments around it. */
export function partnersOf(k: number): P2[] {
  const t = THICK[k]!;
  return THIN.filter((p) => Math.hypot(p[0] - t[0], p[1] - t[1]) < D * 0.62).map((p) => {
    const dy = p[0] - t[0];
    const dz = p[1] - t[1];
    const len = Math.hypot(dy, dz);
    return [dy / len, dz / len] as const;
  });
}
