import { describe, expect, it } from 'vitest';
import { Catalog } from '../src/core';
import { cells, kazanimlar, micrographs, organelles, sources } from '../src/data';
import { bundle } from './fixtures/data';

const real = new Catalog({ sources, kazanimlar, organelles, cells, micrographs });

describe('real data integrity', () => {
  it('has no dangling references', () => {
    expect(real.validate()).toEqual([]);
  });

  it('every organelle has at least one existing source and one existing kazanım', () => {
    for (const o of organelles) {
      expect(o.sourceIds.length, `${o.id} sources`).toBeGreaterThan(0);
      expect(o.kazanimIds.length, `${o.id} kazanımlar`).toBeGreaterThan(0);
      for (const id of o.sourceIds) expect(real.sourceById.has(id), `${o.id} -> ${id}`).toBe(true);
      for (const id of o.kazanimIds) expect(real.kazanimById.has(id), `${o.id} -> ${id}`).toBe(true);
    }
  });

  it('every placed organelle and shell part has data', () => {
    for (const cell of cells) {
      for (const p of cell.placements) expect(real.organelleById.has(p.organelleId), `${cell.id}/${p.organelleId}`).toBe(true);
      for (const id of cell.shellOrganelleIds) expect(real.organelleById.has(id), `${cell.id}/${id}`).toBe(true);
    }
  });

  it("every cell's micrograph ids exist and carry author, licence and a Commons page", () => {
    for (const cell of cells) {
      for (const id of cell.micrographIds) {
        const m = real.micrographById.get(id);
        expect(m, `${cell.id}/${id}`).toBeDefined();
        expect(m?.author.length).toBeGreaterThan(0);
        expect(m?.license.length).toBeGreaterThan(0);
        expect(m?.pageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      }
    }
  });

  it('the bibliography has a source for every kind it cites', () => {
    const cited = real.citedSourceIds();
    for (const id of cited) expect(real.sourceById.has(id)).toBe(true);
    for (const s of sources) {
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.license.length).toBeGreaterThan(0);
      expect(s.publisher.length).toBeGreaterThan(0);
    }
  });

  it('level lists agree with the texts that exist', () => {
    for (const o of organelles) for (const level of o.levels) expect(o.text[level], `${o.id}/${level}`).toBeDefined();
    for (const c of cells) for (const level of c.levels) expect(c.text[level], `${c.id}/${level}`).toBeDefined();
  });
});

describe('Catalog', () => {
  const fixture = new Catalog(bundle);

  it('validates the fixtures', () => {
    expect(fixture.validate()).toEqual([]);
  });

  it('reports dangling references', () => {
    const broken = new Catalog({
      ...bundle,
      organelles: [{ ...bundle.organelles[0]!, sourceIds: [], kazanimIds: ['nope'] }, ...bundle.organelles.slice(1)],
    });
    const issues = broken.validate().join('\n');
    expect(issues).toContain('has no source');
    expect(issues).toContain('unknown kazanım nope');
  });

  it('compares two cells into shared and exclusive organelles', () => {
    const diff = fixture.compare(fixture.cell('animal'), fixture.cell('plant'));
    expect(diff.shared).toContain('nucleus');
    expect(diff.onlyA).toContain('lysosome');
    expect(diff.onlyB).toContain('chloroplast');
    expect(diff.shared).not.toContain('chloroplast');
  });

  it('filters organelles by level', () => {
    const plant = fixture.cell('plant');
    const temel = fixture.organellesOf(plant, 'temel').map((o) => o.id);
    expect(temel).toContain('nucleus');
    expect(temel).not.toContain('rough-er');
    expect(fixture.organellesOf(plant, 'ileri').map((o) => o.id)).toContain('rough-er');
  });

  it('throws for an unknown cell', () => {
    expect(() => fixture.cell('fungus' as never)).toThrow();
  });
});
