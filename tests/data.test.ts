import { describe, expect, it } from 'vitest';
import { cells, kazanimlar, micrographs, organelles, organellesForCell, sources, getCell, getOrganelle } from '../src/data';

// Vite's glob lists the files on disk without needing Node typings.
const micrographFiles = new Set(
  Object.keys(import.meta.glob('../public/micrographs/*.webp')).map((p) => p.split('/').pop()),
);
const ASSET_IDS = [
  'nucleus', 'mitochondrion', 'rough-er', 'smooth-er', 'golgi', 'ribosome', 'lysosome', 'centrosome', 'vacuole', 'chloroplast',
  'nucleoid', 'plasmid', 'flagellum', 'pilus',
  'membrane-animal', 'membrane-plant', 'wall-plant', 'envelope-bacterium',
];
const BACTERIAL = ['nucleoid', 'plasmid', 'flagellum', 'pilus', 'envelope-bacterium'];

const sourceIds = new Set(sources.map((s) => s.id));
const kazanimIds = new Set(kazanimlar.map((k) => k.id));
const organelleIds = new Set(organelles.map((o) => o.id));

/** Collect every string in a value, so "no empty strings" covers nested data. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe('ids are unique', () => {
  it.each([
    ['sources', sources],
    ['kazanimlar', kazanimlar],
    ['organelles', organelles],
    ['cells', cells],
    ['micrographs', micrographs],
  ] as const)('%s', (_name, list) => {
    const ids = list.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('sources', () => {
  it.each(sources.map((s) => [s.id, s] as const))('%s is well formed', (_id, s) => {
    expect(s.url.startsWith('https://')).toBe(true);
    expect(s.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.license.length).toBeGreaterThan(0);
    expect(s.publisher.length).toBeGreaterThan(0);
  });
  it('OpenStax is recorded under its real licence', () => {
    for (const s of sources.filter((x) => x.kind === 'openstax')) expect(s.license).toBe('CC BY-NC-SA 4.0');
  });
});

describe('kazanimlar', () => {
  it.each(kazanimlar.map((k) => [k.id, k] as const))('%s points at an existing source', (_id, k) => {
    expect(sourceIds.has(k.sourceId)).toBe(true);
    expect(k.id).toMatch(/^(FB|BİY|KİM)\.\d+\.\d+\.\d+$/);
  });
});

describe('organelles', () => {
  it('cover exactly the asset ids', () => {
    expect([...organelleIds].sort()).toEqual([...ASSET_IDS].sort());
  });

  it.each(organelles.map((o) => [o.id, o] as const))('%s', (_id, o) => {
    expect(o.sourceIds.length).toBeGreaterThanOrEqual(1);
    expect(o.kazanimIds.length).toBeGreaterThanOrEqual(1);
    for (const id of o.sourceIds) expect(sourceIds.has(id), `source ${id}`).toBe(true);
    for (const id of o.kazanimIds) expect(kazanimIds.has(id), `kazanim ${id}`).toBe(true);
    expect(o.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(o.levels.length).toBeGreaterThan(0);
    // Every declared level has text, and no undeclared level has text.
    for (const level of ['temel', 'ileri'] as const) {
      expect(Boolean(o.text[level]), `${level} text vs levels`).toBe(o.levels.includes(level));
    }
    // Temel is names and functions only (grade-5 programme limit).
    if (o.text.temel) {
      expect(o.text.temel.details).toEqual([]);
      expect(o.text.temel.function.length).toBeGreaterThan(0);
    }
    if (o.text.ileri) {
      expect(o.text.ileri.details.length).toBeGreaterThanOrEqual(3);
      expect(o.text.ileri.details.length).toBeLessThanOrEqual(5);
    }
  });

  it('bacterial structures are İleri only', () => {
    for (const id of BACTERIAL) {
      const o = getOrganelle(id)!;
      expect(o.levels).toEqual(['ileri']);
      expect(o.text.temel).toBeUndefined();
    }
  });

  it('the cited kazanım set lists the programme source for kazanım-linked organelles', () => {
    for (const o of organelles) {
      const hasMeb = o.sourceIds.some((id) => sources.find((s) => s.id === id)?.kind === 'meb');
      expect(hasMeb, `${o.id} cites a MEB programme`).toBe(true);
    }
  });
});

describe('text quality', () => {
  const all = strings({ organelles, cells, kazanimlar, micrographs });
  it('has no empty or whitespace-padded strings', () => {
    for (const s of all) {
      expect(s.trim().length).toBeGreaterThan(0);
      expect(s).toBe(s.trim());
    }
  });
  it('keeps texts within sensible limits', () => {
    for (const o of organelles) {
      expect(o.tagline.length).toBeLessThanOrEqual(60);
      for (const level of ['temel', 'ileri'] as const) {
        const t = o.text[level];
        if (!t) continue;
        expect(t.summary.length).toBeLessThanOrEqual(260);
        expect(t.function.length).toBeLessThanOrEqual(260);
        t.details.forEach((d) => expect(d.length).toBeLessThanOrEqual(220));
      }
      if (o.text.temel) {
        expect(o.text.temel.summary.length + o.text.temel.function.length).toBeLessThanOrEqual(220);
      }
      if (o.funFact) expect(o.funFact.length).toBeLessThanOrEqual(200);
    }
  });
});

describe('cells', () => {
  it('exist for animal, plant and bacterium', () => {
    expect(cells.map((c) => c.id).sort()).toEqual(['animal', 'bacterium', 'plant']);
  });

  it.each(cells.map((c) => [c.id, c] as const))('%s references only existing data', (_id, c) => {
    for (const p of c.placements) {
      expect(organelleIds.has(p.organelleId), `placement ${p.organelleId}`).toBe(true);
      expect(p.count).toBeGreaterThan(0);
    }
    for (const id of c.shellOrganelleIds) expect(organelleIds.has(id), `shell ${id}`).toBe(true);
    for (const id of c.kazanimIds) expect(kazanimIds.has(id)).toBe(true);
    for (const id of c.sourceIds) expect(sourceIds.has(id)).toBe(true);
    for (const id of c.micrographIds) expect(micrographs.some((m) => m.id === id), `micrograph ${id}`).toBe(true);
    expect(c.sourceIds.length).toBeGreaterThanOrEqual(1);
    expect(c.kazanimIds.length).toBeGreaterThanOrEqual(1);
    expect(organellesForCell(c.id).length).toBeGreaterThan(0);
    for (const level of c.levels) expect(c.text[level], `${level} text`).toBeDefined();
    if (c.text.temel) expect(c.text.temel.details).toEqual([]);
  });

  it('bacterium is İleri only and uses only prokaryote parts', () => {
    const b = getCell('bacterium')!;
    expect(b.levels).toEqual(['ileri']);
    const ids = b.placements.map((p) => p.organelleId).sort();
    expect(ids).toEqual(['flagellum', 'nucleoid', 'pilus', 'plasmid', 'ribosome']);
  });

  it('plant has one central vacuole and no centrosome or lysosome; animal has no chloroplast', () => {
    const plant = getCell('plant')!.placements.map((p) => p.organelleId);
    expect(plant).not.toContain('centrosome');
    expect(plant).not.toContain('lysosome');
    expect(getCell('plant')!.placements.find((p) => p.organelleId === 'vacuole')).toMatchObject({ count: 1, zone: 'center' });
    expect(getCell('animal')!.placements.map((p) => p.organelleId)).not.toContain('chloroplast');
  });
});

describe('micrographs', () => {
  it.each(micrographs.map((m) => [m.id, m] as const))('%s', (_id, m) => {
    expect(micrographFiles.has(m.file), `file ${m.file}`).toBe(true);
    expect(m.pageUrl.startsWith('https://commons.wikimedia.org/wiki/File:')).toBe(true);
    expect(m.author.length).toBeGreaterThan(0);
    expect(m.license).toMatch(/^(CC BY(-SA)? \d\.\d|CC0|PD)$/);
    const src = sources.find((s) => s.id === m.sourceId);
    expect(src?.kind).toBe('commons');
    expect(src?.license).toBe(m.license);
    if (m.organelleId) expect(organelleIds.has(m.organelleId)).toBe(true);
  });
  it('count is 8 to 12', () => {
    expect(micrographs.length).toBeGreaterThanOrEqual(8);
    expect(micrographs.length).toBeLessThanOrEqual(12);
  });
});
