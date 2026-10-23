import { describe, expect, it } from 'vitest';
import { fitsInShell, shellSdf, solveLayout, worstOverlap } from '../src/scene';
import { BOUNDS_RADIUS, cells } from './fixtures/data';

const radiusOf = (id: string): number => BOUNDS_RADIUS[id] ?? 1;

describe('layout solver', () => {
  for (const cell of cells) {
    describe(cell.id, () => {
      const layout = solveLayout(cell, radiusOf);

      it('places the requested number of instances of every organelle', () => {
        for (const rule of cell.placements) {
          expect(layout.filter((i) => i.organelleId === rule.organelleId)).toHaveLength(rule.count);
        }
      });

      it('is deterministic', () => {
        expect(solveLayout(cell, radiusOf)).toEqual(layout);
      });

      it('keeps instances from overlapping', () => {
        expect(worstOverlap(layout)).toBeLessThanOrEqual(1e-9);
      });

      it('keeps every instance inside the shell', () => {
        for (const inst of layout) {
          expect(fitsInShell(cell.shell, inst.position, inst.rh, inst.rv)).toBe(true);
        }
      });

      it('never shrinks anything below a third of the authored size', () => {
        for (const inst of layout) {
          const rule = cell.placements.find((p) => p.organelleId === inst.organelleId);
          const authored = rule?.scale?.[0] ?? 1;
          expect(inst.scale[0]).toBeGreaterThan(authored * 0.33);
        }
      });
    });
  }

  it('gives different cell types different layouts', () => {
    const [a, b] = [solveLayout(cells[0]!, radiusOf), solveLayout(cells[1]!, radiusOf)];
    expect(a.length).not.toBe(b.length);
  });

  it('puts centre-zone items near the centre and wall-adjacent items near the wall', () => {
    const plant = cells.find((c) => c.id === 'plant')!;
    const layout = solveLayout(plant, radiusOf);
    const nucleus = layout.find((i) => i.organelleId === 'nucleus')!;
    expect(Math.hypot(...nucleus.position)).toBeLessThan(0.18 * Math.min(...plant.shell.halfExtents) + 1);
    for (const chloroplast of layout.filter((i) => i.organelleId === 'chloroplast')) {
      expect(shellSdf(plant.shell, chloroplast.position)).toBeGreaterThan(-chloroplast.radius - 0.4 * Math.min(...plant.shell.halfExtents));
    }
  });
});

describe('shellSdf', () => {
  it('is negative inside and positive outside for every shape', () => {
    for (const cell of cells) {
      expect(shellSdf(cell.shell, [0, 0, 0])).toBeLessThan(0);
      expect(shellSdf(cell.shell, [100, 100, 100])).toBeGreaterThan(0);
    }
  });
});

describe('flat cells (plant slab)', () => {
  // The real plant slab: wide and low (half extents as in src/data/cells.ts).
  const plant = { ...cells.find((c) => c.id === 'plant')!, shell: { shape: 'rounded-box' as const, halfExtents: [13, 7, 10] as [number, number, number] } };
  // Bounding box half sizes roughly like the authored assets: wide and low organelles.
  const half = (id: string): [number, number, number] => {
    const r = radiusOf(id);
    return id === 'chloroplast' || id === 'mitochondrion' ? [r, r * 0.45, r * 0.5] : [r * 0.8, r * 0.8, r * 0.8];
  };
  const layout = solveLayout(plant, radiusOf, undefined, half);

  it('places everything without overlap and inside the shell', () => {
    for (const rule of plant.placements) expect(layout.filter((i) => i.organelleId === rule.organelleId)).toHaveLength(rule.count);
    expect(worstOverlap(layout)).toBeLessThanOrEqual(1e-9);
    for (const inst of layout) expect(fitsInShell(plant.shell, inst.position, inst.rh, inst.rv)).toBe(true);
  });

  it('keeps organelles flat: yaw is free and tilt is small', () => {
    for (const inst of layout) {
      expect(Math.abs(inst.rotation[0])).toBeLessThanOrEqual(0.17);
      expect(Math.abs(inst.rotation[2])).toBeLessThanOrEqual(0.17);
    }
  });

  it('is deterministic and packs the floor: most chloroplasts lie in the lower half', () => {
    expect(solveLayout(plant, radiusOf, undefined, half)).toEqual(layout);
    const chloroplasts = layout.filter((i) => i.organelleId === 'chloroplast');
    const low = chloroplasts.filter((c) => c.position[1] < 0);
    expect(low.length / chloroplasts.length).toBeGreaterThanOrEqual(0.5);
  });
});
