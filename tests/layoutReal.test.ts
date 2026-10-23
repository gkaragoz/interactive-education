import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cells } from '../src/data';
import { fitsInShell, overlapOf, solveLayout, type PlacedInstance } from '../src/scene';

const worstOverlapOf = overlapOf;

interface Meta {
  boundsRadius: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
}
const metaOf = (id: string): Meta => JSON.parse(readFileSync(join(process.cwd(), 'public/models/organelles', `${id}.meta.json`), 'utf8')) as Meta;
const halfOf = (id: string): [number, number, number] => {
  const m = metaOf(id);
  return [0, 1, 2].map((a) => Math.max(Math.abs(m.bboxMin[a] ?? 0), Math.abs(m.bboxMax[a] ?? 0))) as [number, number, number];
};

/**
 * The solver packs bounding spheres built from the assets' real metadata, so the honest check is the same shape:
 * a sphere that holds the asset's true extent (the larger of boundsRadius and its longest half axis), scaled.
 * Bounding-box corners would be too strict (a round nucleus has empty corners).
 */
function trueRadius(inst: PlacedInstance): number {
  const m = metaOf(inst.organelleId);
  const longest = Math.max(...halfOf(inst.organelleId).map((v, a) => v * (inst.scale[a] ?? 1)));
  return Math.max(m.boundsRadius * Math.max(...inst.scale), longest);
}

describe('layout with the real asset bounding boxes', () => {
  for (const cell of cells) {
    describe(cell.id, () => {
      const layout = solveLayout(cell, (id) => metaOf(id).boundsRadius, undefined, halfOf);

      it('places every instance the data asks for', () => {
        for (const rule of cell.placements) expect(layout.filter((i) => i.organelleId === rule.organelleId)).toHaveLength(rule.count);
      });

      it('the metadata radius holds the longest half axis of every asset', () => {
        for (const id of new Set(layout.map((i) => i.organelleId))) expect(metaOf(id).boundsRadius).toBeGreaterThanOrEqual(Math.max(...halfOf(id)) - 0.02);
      });

      it('no two organelles overlap (true-extent spheres, with a margin)', () => {
        const hits: string[] = [];
        for (let i = 0; i < layout.length; i++) {
          for (let j = i + 1; j < layout.length; j++) {
            const a = layout[i] as PlacedInstance;
            const b = layout[j] as PlacedInstance;
            const gap = new Vector3(...a.position).distanceTo(new Vector3(...b.position)) - trueRadius(a) - trueRadius(b);
            // Flat cells squash organelles in y, so they may sit closer than the spheres: judge them by the solver's ellipsoids.
            if (gap < -0.01 && worstOverlapOf(a, b) > 0) hits.push(`${a.organelleId}#${a.index} x ${b.organelleId}#${b.index}`);
          }
        }
        expect(hits).toEqual([]);
      });

      it('every organelle sits fully inside the shell', () => {
        const outside = layout.filter((i) => !fitsInShell(cell.shell, i.position, i.rh, i.rv)).map((i) => i.organelleId);
        expect([...new Set(outside)]).toEqual([]);
      });
    });
  }
});
