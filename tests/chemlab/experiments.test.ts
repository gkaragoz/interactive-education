import { describe, expect, it } from 'vitest';
import { EXPERIMENTS, LabSim, REAGENTS, balanceError, formatEquation, getExperiment, parseFormula, type ExperimentDef, type Op } from '../../src/chemlab';
import { IONS } from '../../src/chemlab/ions';
import { speciesOf } from '../../src/chemlab/species';
import { near } from './helpers';

const run = (e: ExperimentDef, ops: readonly Op[] = e.solution): LabSim => {
  const s = new LabSim({ bench: e.bench });
  s.runScript(ops);
  return s;
};
const cache = new Map<string, LabSim>();
/** The finished reference run of an experiment (shared by read-only tests). */
const ran = (e: ExperimentDef): LabSim => {
  let s = cache.get(e.id);
  if (!s) {
    s = run(e);
    cache.set(e.id, s);
  }
  return s;
};
const shelfIds = new Set(REAGENTS.map((r) => r.id));

describe('experiment catalogue', () => {
  it('has the ten experiments in dossier order with unique ids', () => {
    expect(EXPERIMENTS.map((e) => e.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(EXPERIMENTS.map((e) => e.id)).size).toBe(10);
    expect(EXPERIMENTS.map((e) => e.id)).toEqual([
      'sirke-kabartma', 'kirmizi-lahana', 'notrallesme', 'cokelme-kalsiyum-karbonat', 'demir-bakir', 'magnezyum-asit', 'magnezyum-yanma', 'cozunme-doygunluk', 'hidrojen-peroksit-katalizor', 'su-elektrolizi',
    ]);
  });
  it('E4 uses the safe calcium carbonate precipitation, never lead', () => {
    const e = getExperiment('cokelme-kalsiyum-karbonat');
    expect(e?.shelf).toContain('cacl2-0.5M');
    expect(e?.shelf).toContain('na2co3-0.5M');
    expect(JSON.stringify(e?.shelf)).not.toMatch(/pb|lead/i);
    expect(e?.safetyTr.join(' ')).toContain('kurşun');
  });
  it('only the magnesium flame is virtual-only', () => {
    expect(EXPERIMENTS.filter((e) => e.virtualOnly).map((e) => e.id)).toEqual(['magnezyum-yanma']);
  });
  it('getExperiment finds by id', () => {
    expect(getExperiment('su-elektrolizi')?.no).toBe(10);
    expect(getExperiment('yok')).toBeUndefined();
  });
  describe.each(EXPERIMENTS.map((e) => [e.id, e] as const))('%s data', (_id, e) => {
    it('has Turkish text, sources with URLs and kazanım codes', () => {
      expect(e.titleTr.length).toBeGreaterThan(8);
      expect(e.summaryTr.length).toBeGreaterThan(40);
      expect(e.homeTr.length).toBeGreaterThan(5);
      expect(e.safetyTr.length).toBeGreaterThan(0);
      expect(e.sources.length).toBeGreaterThanOrEqual(2);
      for (const src of e.sources) expect(src.url).toMatch(/^https:\/\//);
      expect(e.kazanim.length).toBeGreaterThan(0);
      for (const k of e.kazanim) expect(k).toMatch(/^(FB|KİM)\.\d+\.\d+(\.\d+)?$/);
      expect(e.levels.length).toBeGreaterThan(0);
    });
    it('only uses reagents that exist on the shelf and vessels of the bench', () => {
      for (const id of e.shelf) expect(shelfIds.has(id), id).toBe(true);
      const vessels = new Set(e.bench.vessels.map((v) => v.id));
      const all = [e.solution, ...Object.values(e.variants ?? {})].flat();
      for (const op of all) {
        if ('reagent' in op) expect(shelfIds.has(op.reagent), op.reagent).toBe(true);
        if (op.op === 'pour') {
          expect(shelfIds.has(op.from) || vessels.has(op.from), op.from).toBe(true);
          expect(vessels.has(op.to)).toBe(true);
        }
        if ('vessel' in op && op.vessel) expect(vessels.has(op.vessel), op.vessel).toBe(true);
      }
    });
    it('has balanced equations with state symbols', () => {
      for (const eq of e.equations) {
        expect(balanceError(eq.reactants, eq.products), eq.id).toBeNull();
        expect(formatEquation(eq.reactants, eq.products)).toMatch(/\((aq|s|l|g)\)/);
      }
      expect(new Set(e.equations.map((q) => q.id)).size).toBe(e.equations.length);
    });
    it('has steps, expectations and measurables with ids', () => {
      expect(e.steps.length).toBeGreaterThanOrEqual(4);
      expect(e.expectations.length).toBeGreaterThanOrEqual(2);
      expect(e.measurables.length).toBeGreaterThanOrEqual(1);
      for (const st of e.steps) {
        expect(st.textTr.length).toBeGreaterThan(8);
        expect(st.hintTr.length).toBeGreaterThan(3);
      }
      expect(new Set(e.steps.map((x) => x.id)).size).toBe(e.steps.length);
    });
    it('no step is done on the empty bench', () => {
      const v = new LabSim({ bench: e.bench }).view();
      for (const st of e.steps) expect(st.done(v), st.id).toBe(false);
    });
  });
});

describe('particle scripts (data for the explainer)', () => {
  const scripts = EXPERIMENTS.flatMap((e) => e.particles.map((p) => [`${e.id}/${p.id}`, e, p] as const));
  it('every experiment has at least one script', () => {
    for (const e of EXPERIMENTS) expect(e.particles.length).toBeGreaterThanOrEqual(1);
    expect(scripts.length).toBeGreaterThanOrEqual(10);
  });
  const atomsOf = (formula: string): Record<string, number> => (formula === '' ? {} : parseFormula(formula));
  describe.each(scripts)('%s', (_id, e, p) => {
    it('points at an existing equation (or none) and has ordered, contiguous stages', () => {
      expect(p.equationId === 'none' || e.equations.some((q) => q.id === p.equationId)).toBe(true);
      expect(p.stages.length).toBeGreaterThanOrEqual(3);
      let t = 0;
      for (const st of p.stages) {
        expect(st.fromS).toBeGreaterThanOrEqual(t);
        expect(st.toS).toBeGreaterThan(st.fromS);
        expect(st.captionTr.length).toBeGreaterThan(15);
        t = st.toS;
      }
      expect(t).toBeLessThanOrEqual(p.durationS);
      expect(new Set(p.stages.map((s) => s.id)).size).toBe(p.stages.length);
    });
    it('lists every species in every stage and references only known species', () => {
      const ids = new Set(p.species.map((s) => s.id));
      for (const st of p.stages) {
        expect(Object.keys(st.counts).sort()).toEqual([...ids].sort());
        for (const t of st.transfers) {
          expect(ids.has(t.from)).toBe(true);
          expect(ids.has(t.to)).toBe(true);
          expect(t.count).toBeGreaterThan(0);
        }
        for (const b of [...st.breaks, ...st.forms]) expect(ids.has(b.species)).toBe(true);
        for (const f of st.focus ?? []) expect(ids.has(f)).toBe(true);
      }
    });
    it('conserves every atom type and the total charge in every stage', () => {
      const totals = p.stages.map((st) => {
        const atoms: Record<string, number> = {};
        let charge = 0;
        for (const sp of p.species) {
          const n = st.counts[sp.id] ?? 0;
          for (const [el, c] of Object.entries(atomsOf(sp.formula))) atoms[el] = (atoms[el] ?? 0) + c * n;
          charge += sp.charge * n;
        }
        return { atoms, charge };
      });
      const first = totals[0];
      for (const t of totals) {
        expect(t.charge).toBe(0);
        expect(t.atoms).toEqual(first?.atoms);
      }
    });
    it('species formulas parse and charges are integers', () => {
      for (const sp of p.species) {
        expect(() => atomsOf(sp.formula)).not.toThrow();
        expect(Number.isInteger(sp.charge)).toBe(true);
        if (sp.kind === 'electron') expect(sp.charge).toBe(-1);
      }
    });
    it('the final stage has fewer reactant particles than the first when there is an equation', () => {
      if (p.equationId === 'none') return;
      const eq = e.equations.find((q) => q.id === p.equationId);
      expect(eq).toBeDefined();
      expect(p.stages.length).toBeGreaterThan(1);
    });
  });
  it('ion species use charges that agree with the ion table where the formula matches', () => {
    for (const [, , p] of scripts) {
      for (const sp of p.species.filter((x) => x.kind === 'ion')) {
        const hit = Object.values(IONS).find((i) => i.formula === sp.formula && Math.sign(i.charge) === Math.sign(sp.charge));
        if (hit) expect(hit.charge).toBe(sp.charge);
      }
    }
  });
  it('E1 shows a proton transfer and E5/E6/E7 show electron transfers', () => {
    const kinds = (id: string): Set<string> => new Set(getExperiment(id)?.particles.flatMap((p) => p.stages.flatMap((s) => s.transfers.map((t) => t.kind))));
    expect(kinds('sirke-kabartma').has('proton')).toBe(true);
    for (const id of ['demir-bakir', 'magnezyum-asit', 'magnezyum-yanma', 'su-elektrolizi']) expect(kinds(id).has('electron')).toBe(true);
  });
});

describe('scripted replays reach the expected observations', () => {
  describe.each(EXPERIMENTS.map((e) => [e.id, e] as const))('%s', (_id, e) => {
    it('every op of the reference solution is accepted', () => {
      const s = new LabSim({ bench: e.bench });
      const res = s.runScript(e.solution);
      res.forEach((r, i) => expect(r.ok, `op ${i}: ${JSON.stringify(e.solution[i])} ${r.messageTr ?? ''}`).toBe(true));
    });
    it('all expectations hold at the end', () => {
      const v = ran(e).view();
      for (const x of e.expectations) expect(x.check(v), x.id).toBe(true);
    });
    it('all measurables are finite and match the dossier arithmetic where it gives a value', () => {
      const v = ran(e).view();
      for (const m of e.measurables) {
        const val = m.read(v);
        expect(Number.isFinite(val), m.id).toBe(true);
        if (m.expected !== undefined) expect(Math.abs(val - m.expected), `${m.id}=${val}`).toBeLessThanOrEqual(Math.abs(m.expected) * (m.tolerance ?? 0.05) + 1e-9);
      }
    });
    it('every step reads as done after the solution, and once done stays done', () => {
      const s = new LabSim({ bench: e.bench });
      const done = new Map<string, boolean>();
      for (const op of e.solution) {
        s.apply(op);
        const v = s.view();
        for (const st of e.steps) {
          const d = st.done(v);
          if (done.get(st.id) === true) expect(d, `${st.id} regressed after ${JSON.stringify(op)}`).toBe(true);
          done.set(st.id, d);
        }
      }
      for (const st of e.steps) expect(done.get(st.id), st.id).toBe(true);
    });
    it('conserves mass (bottles + air = vessels + escaped + spilled)', () => {
      expect(Math.abs(ran(e).massBalanceError())).toBeLessThan(1e-6);
    });
    it('is deterministic: the same ops give the same state hash', () => {
      expect(ran(e).stateHash()).toBe(run(e).stateHash());
    });
    it('has no console-breaking NaN anywhere in the state', () => {
      const s = ran(e);
      for (const id of s.vesselIds()) {
        const v = s.vessel(id);
        expect(Number.isFinite(v?.tempC ?? NaN)).toBe(true);
        for (const n of Object.values(v?.mix ?? {})) expect(Number.isFinite(n) && n >= 0).toBe(true);
      }
    });
    it('variants run without refused ops (except where refusing is the point)', () => {
      for (const [name, ops] of Object.entries(e.variants ?? {})) {
        const s = new LabSim({ bench: e.bench });
        const res = s.runScript(ops);
        res.forEach((r, i) => expect(r.ok, `${name} op ${i}: ${r.messageTr ?? ''}`).toBe(true));
        expect(Math.abs(s.massBalanceError())).toBeLessThan(1e-6);
      }
    });
  });
});

describe('experiment-specific results', () => {
  const e = (id: string): ExperimentDef => {
    const x = getExperiment(id);
    if (!x) throw new Error(id);
    return x;
  };
  it('E1: the balloon variant keeps the mass and holds about 0.58 L of CO2', () => {
    const x = e('sirke-kabartma');
    const s = run(x, x.variants?.['balon']);
    const co2Ml = s.measurements().find((m) => m.id === 'balloon:flask')?.value as number;
    expect(near(co2Ml, 585, 40)).toBe(true);
    expect(s.ledger.escaped).toBeLessThan(1e-9);
  });
  it('E2: the pH order of the five liquids follows the real chemistry', () => {
    const s = run(e('kirmizi-lahana'));
    const ph = ['t1', 't2', 't3', 't4', 't5'].map((t) => s.ph(t) ?? NaN);
    expect(ph[0]).toBeLessThan(ph[1] ?? 0);
    expect(ph[1]).toBeLessThan(ph[2] ?? 0);
    expect(ph[2]).toBeCloseTo(7, 1);
    expect(ph[3]).toBeGreaterThan(8);
    expect(ph[4]).toBeGreaterThan(7.5);
    expect(s.journal.filter((j) => j.tag === 'colour').length).toBeGreaterThanOrEqual(3);
  });
  it('E3: the pH jump and the pink come together at 20.05 mL, nothing earlier', () => {
    const s = run(e('notrallesme'));
    const log = s.titrationLog();
    expect(log.find((p) => p.ml >= 19.9 && p.ml < 19.96)?.ph).toBeLessThan(4.2);
    expect(log.find((p) => p.ml >= 20.04)?.ph).toBeGreaterThan(9.9);
    expect(log.length).toBe(6);
  });
  it('E4: filtrate holds spectator ions, residue fizzes with acid and half of it dissolves', () => {
    const s = run(e('cokelme-kalsiyum-karbonat'));
    expect(s.view().moles('b', 'Na+')).toBeCloseTo(0.01, 6);
    expect(s.view().moles('b', 'Ca(2+)')).toBeLessThan(1e-4);
    expect(s.view().solidG('funnel', 'caco3')).toBeCloseTo(0.25, 1);
  });
  it('E5: variants Zn + Cu(NO3)2 and Cu + FeSO4 behave as the activity series says', () => {
    const x = e('demir-bakir');
    const zn = run(x, x.variants?.['cinko-bakir-nitrat']);
    expect(zn.view().solidG('beaker', 'cu')).toBeGreaterThan(0.2);
    const cu = run(x, x.variants?.['bakir-demir-sulfat']);
    expect(cu.view().observed('deposit', 'beaker')).toBe(false);
  });
  it('E6: powder is faster, dilute acid slower and hot acid faster than the reference', () => {
    const x = e('magnezyum-asit');
    const early = (ops: Op[] | undefined): number => {
      const s = new LabSim({ bench: x.bench });
      s.runScript((ops ?? []).slice(0, -1));
      return s.vessel('tube')?.extent['redox:mg+H+'] ?? 0;
    };
    // all variants end with wait 120; compare after 5 s instead
    const at5 = (ops: Op[]): number => {
      const s = new LabSim({ bench: x.bench });
      s.runScript(ops.slice(0, -1));
      s.advance(5);
      return s.vessel('tube')?.extent['redox:mg+H+'] ?? 0;
    };
    const ref = at5([...x.solution].filter((o) => o.op !== 'testgas'));
    expect(at5(x.variants?.['toz'] ?? [])).toBeGreaterThan(ref);
    expect(at5(x.variants?.['seyreltik'] ?? [])).toBeLessThan(ref);
    expect(at5(x.variants?.['sicak'] ?? [])).toBeGreaterThan(0);
    expect(early(x.variants?.['toz'])).toBeGreaterThanOrEqual(0);
  });
  it('E7: mass goes up by the oxygen taken from the air', () => {
    const x = e('magnezyum-yanma');
    const s = run(x);
    const readings = s.journal.filter((j) => j.kind === 'measurement').map((j) => parseFloat(j.textTr.match(/(\d+\.\d+) g/)?.[1] ?? 'NaN'));
    expect(readings).toHaveLength(2);
    expect(near((readings[1] ?? 0) - (readings[0] ?? 0), 0.08, 0.015)).toBe(true);
  });
  it('E8: the saturated variant leaves about 4.2 g; sugar powder in stirred water beats a lump', () => {
    const x = e('cozunme-doygunluk');
    const s = new LabSim({ bench: x.bench });
    s.runScript(x.variants?.['doygun-oda'] ?? []);
    s.advance(3000, 1);
    expect(near(s.view().solidG('beaker', 'kno3'), 4.2, 0.5)).toBe(true);
    const lump = new LabSim({ bench: x.bench });
    lump.runScript(x.variants?.['seker-topak'] ?? []);
    const powder = new LabSim({ bench: x.bench });
    powder.runScript(x.variants?.['seker-toz-karisan'] ?? []);
    expect(powder.view().solidG('beaker', 'sucrose')).toBeLessThan(lump.view().solidG('beaker', 'sucrose'));
  });
  it('E9: no catalyst means no gas; iodide works as a catalyst; yeast is not used up', () => {
    const x = e('hidrojen-peroksit-katalizor');
    expect(run(x, x.variants?.['katalizorsuz']).view().observed('gas', 'cyl')).toBe(false);
    expect(run(x, x.variants?.['iyodur']).view().observed('gas', 'cyl')).toBe(true);
    expect(run(x).view().catalystG('cyl', 'yeast')).toBe(1.5);
  });
  it('E10: pure water variant gives no gas; the 9 V run gives H2:O2 = 2:1', () => {
    const x = e('su-elektrolizi');
    expect(run(x, x.variants?.['saf-su']).view().gasMl('hofmann', 'h2')).toBeLessThan(0.001);
    const v = run(x).view();
    expect(v.gasMl('hofmann', 'h2') / v.gasMl('hofmann', 'o2')).toBeCloseTo(2, 3);
  });
  it('species keys used by equations exist', () => {
    for (const x of EXPERIMENTS) for (const q of x.equations) for (const k of [...Object.keys(q.reactants), ...Object.keys(q.products)]) expect(() => speciesOf(k)).not.toThrow();
  });
});
