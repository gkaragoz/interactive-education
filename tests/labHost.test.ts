import { describe, expect, it } from 'vitest';
import { LabSim, getExperiment } from '../src/chemlab';
import { loadSoftFlash, moduleHash, parseModuleRoute, saveSoftFlash } from '../src/core';
import { findModule, homeModules, openableModules } from '../src/modules';
import { benchOf, createLabInteractions, experimentList, shelfOf } from '../src/scene/labInteractions';

describe('chem-lab registry entry', () => {
  it('is a sim module: preview only with ?demo, never on the home page until released', () => {
    expect(findModule('chem-lab', { demo: false })).toBeNull();
    const entry = findModule('chem-lab', { demo: true });
    expect(entry?.sim?.id).toBe('chem-lab');
    expect(entry?.definition).toBeNull();
    expect(homeModules().some((m) => m.id === 'chem-lab')).toBe(false);
    expect(openableModules({ demo: true }).some((m) => m.id === 'chem-lab')).toBe(true);
  });

  it('routes #/modul/chem-lab[/experiment|serbest]', () => {
    expect(parseModuleRoute('#/modul/chem-lab')).toMatchObject({ id: 'chem-lab' });
    expect(parseModuleRoute('#/modul/chem-lab/serbest')?.track).toBe('serbest');
    expect(moduleHash('chem-lab', 'serbest')).toBe('#/modul/chem-lab/serbest');
  });

  it('loads its info lazily with the kazanim codes of the ten experiments', async () => {
    const def = findModule('chem-lab', { demo: true })!.sim!;
    const { info } = await def.load();
    expect(info.kind).toBe('sim');
    expect(info.kazanimIds.length).toBeGreaterThan(0);
    expect(experimentList()).toHaveLength(10);
  });
});

describe('keyboard path (createLabInteractions)', () => {
  const make = (id: string | null): { lab: LabSim; inter: ReturnType<typeof createLabInteractions> } => {
    const lab = new LabSim({ seed: 1, bench: benchOf(id) });
    return { lab, inter: createLabInteractions(lab, () => shelfOf(id)) };
  };
  const first = experimentList()[0]!.id;

  it('lists vessels and the experiment shelf, with commands per item', () => {
    const { inter } = make(first);
    const items = inter.items();
    expect(items.some((i) => i.group === 'Kaplar')).toBe(true);
    expect(items.map((i) => i.id)).toEqual(expect.arrayContaining(['flask', 'vinegar', 'nahco3']));
    expect(inter.commands('vinegar').map((c) => c.id)).toEqual(['pour', 'drop']);
    expect(inter.commands('nahco3')[0]?.choices?.map((c) => c.id)).toEqual(['lump', 'powder']);
    expect(inter.commands('flask').map((c) => c.id)).toEqual(expect.arrayContaining(['heat', 'place', 'tare', 'dip']));
  });

  it('runs the same operations as a drag and drop would', () => {
    const { lab, inter } = make(first);
    expect(inter.run('vinegar', 'pour', { targetId: 'flask', amount: 50 }).ok).toBe(true);
    expect(inter.run('flask', 'place', {}).ok).toBe(true);
    expect(inter.run('nahco3', 'add', { targetId: 'flask', amount: 2, choice: 'powder' }).ok).toBe(true);
    lab.advance(20);
    const exp = getExperiment(first)!;
    expect(exp.steps.some((s) => s.done(lab.view()))).toBe(true);
    expect(lab.journal.some((e) => e.kind === 'action')).toBe(true);
  });

  it('turns a refused dangerous mix into a safety card title', () => {
    const { inter } = make(null);
    inter.run('bleach', 'pour', { targetId: 'beaker1', amount: 20 });
    const res = inter.run('vinegar', 'pour', { targetId: 'beaker1', amount: 20 });
    expect(res.ok).toBe(false);
    expect(res.blockedTitleTr).toMatch(/Çamaşır suyu/);
  });

  it('rejects unknown items instead of throwing', () => {
    const { inter } = make(null);
    expect(inter.run('nope', 'pour', {}).ok).toBe(false);
    expect(inter.commands('nope')).toEqual([]);
  });
});

describe('Yumuşak parlama storage', () => {
  it('defaults on, remembers off, survives blocked storage', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    expect(loadSoftFlash(storage)).toBe(true);
    saveSoftFlash(false, storage);
    expect(loadSoftFlash(storage)).toBe(false);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadSoftFlash(blocked)).toBe(true);
    expect(() => saveSoftFlash(false, blocked)).not.toThrow();
  });
});
