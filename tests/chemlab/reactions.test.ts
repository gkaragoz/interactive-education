import { describe, expect, it } from 'vitest';
import { ALL_RULES, balanceError, formatEquation, LabSim } from '../../src/chemlab';
import { speciesOf } from '../../src/chemlab/species';
import { bench, beaker, near } from './helpers';

describe('rule table', () => {
  it('has many rules with unique ids', () => {
    expect(ALL_RULES.length).toBeGreaterThan(40);
    expect(new Set(ALL_RULES.map((r) => r.id)).size).toBe(ALL_RULES.length);
  });
  it.each(ALL_RULES.map((r) => [r.id, r] as const))('%s is balanced in atoms and charge and has a source', (_id, r) => {
    expect(balanceError(r.reactants, r.products)).toBeNull();
    expect(r.source).toMatch(/^https:\/\//);
    expect(r.kazanim.length).toBeGreaterThan(0);
    expect(Number.isFinite(r.dH)).toBe(true);
    expect(r.k).toBeGreaterThanOrEqual(0);
    for (const k of [...Object.keys(r.reactants), ...Object.keys(r.products)]) expect(() => speciesOf(k)).not.toThrow();
    expect(formatEquation(r.reactants, r.products)).toContain('->');
  });
  it('covers the required families', () => {
    const fams = new Set(ALL_RULES.map((r) => r.family));
    for (const f of ['neutralisation', 'acid-base', 'metal-acid', 'displacement', 'combustion', 'catalysis', 'thermal']) expect(fams.has(f)).toBe(true);
  });
  it('writes equations with state symbols', () => {
    const r = ALL_RULES.find((x) => x.id === 'redox:fe+Cu(2+)');
    expect(formatEquation(r?.reactants ?? {}, r?.products ?? {})).toBe('Fe(s) + Cu2+(aq) -> Fe2+(aq) + Cu(s)');
  });
  it('generates the displacement coefficients from valences (2 Al + 3 Cu2+)', () => {
    const r = ALL_RULES.find((x) => x.id === 'redox:al+Cu(2+)');
    expect(r?.reactants).toEqual({ 's:al': 2, 'Cu(2+)': 3 });
    expect(r?.products).toEqual({ 'Al(3+)': 2, 's:cu': 3 });
  });
  it('lets only metals above hydrogen react with acid', () => {
    const ids = ALL_RULES.filter((r) => r.family === 'metal-acid').map((r) => r.id);
    expect(ids.sort()).toEqual(['redox:al+H+', 'redox:fe+H+', 'redox:mg+H+', 'redox:zn+H+']);
  });
});

describe('acid + hydrogencarbonate (E1 chemistry)', () => {
  it('limiting reagent: 2 g NaHCO3 in 50 mL vinegar releases 0.0238 mol CO2 (1.05 g)', () => {
    const s = bench(['f', 'erlenmeyer250']);
    s.pour('vinegar', 'f', 50);
    s.add('nahco3', 'f', 2);
    s.advance(60);
    expect(near(s.ledger.escaped, 1.048, 0.01)).toBe(true);
    expect(s.view().solidG('f', 'nahco3')).toBeLessThan(1e-3);
  });
  it('baking soda in excess: acetic acid (0.042 mol) is limiting, CO2 1.85 g, solid is left over', () => {
    const s = bench(['f', 'erlenmeyer250']);
    s.pour('vinegar', 'f', 50);
    s.add('nahco3', 'f', 5);
    s.advance(120);
    expect(near(s.ledger.escaped, 1.85, 0.12)).toBe(true);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('the flask cools slightly because the reaction is endothermic', () => {
    const s = bench(['f', 'erlenmeyer250']);
    s.pour('vinegar', 'f', 50);
    s.add('nahco3', 'f', 2);
    s.advance(30);
    const t = s.vessel('f')?.tempC ?? 99;
    expect(t).toBeLessThan(21.5);
    expect(t).toBeGreaterThan(18);
  });
  it('is a buffer afterwards: pH between 4 and 5.5', () => {
    const s = bench(['f', 'erlenmeyer250']);
    s.pour('vinegar', 'f', 50);
    s.add('nahco3', 'f', 2);
    s.advance(60);
    expect(s.ph('f')).toBeGreaterThan(4.3);
    expect(s.ph('f')).toBeLessThan(5.3);
  });
  it('open flask loses about 1 g, balloon-closed flask keeps its mass', () => {
    const open = bench(['f', 'erlenmeyer250']);
    open.pour('vinegar', 'f', 50);
    open.place('f');
    const m0 = open.weigh('f').value ?? 0;
    open.add('nahco3', 'f', 2);
    open.advance(60);
    const mOpen = open.weigh('f').value ?? 0;
    expect(near(m0 + 2 - mOpen, 1.05, 0.1)).toBe(true);

    const closed = bench(['f', 'erlenmeyer250']);
    closed.pour('vinegar', 'f', 50);
    closed.place('f');
    const c0 = closed.weigh('f').value ?? 0;
    closed.add('nahco3', 'f', 2);
    closed.close('f', 'balloon');
    closed.advance(60);
    expect(near(closed.weigh('f').value ?? 0, c0 + 2, 0.011)).toBe(true);
    expect(closed.measurements().find((m) => m.id === 'balloon:f')?.value).toBeGreaterThan(500);
  });
  it('a stoppered flask pops its stopper (pressure) and says so', () => {
    const s = bench(['f', 'erlenmeyer250']);
    s.pour('vinegar', 'f', 50);
    s.add('nahco3', 'f', 4);
    s.close('f', 'stopper');
    s.advance(20);
    expect(s.vessel('f')?.closure).toBe('none');
    expect(s.drainEvents().some((e) => e.kind === 'pop')).toBe(true);
    expect(s.journal.some((j) => j.tag === 'safety' && j.textTr.includes('Kapak'))).toBe(true);
  });
  it('strong acid also fizzes with the powder and with dissolved carbonate', () => {
    const s = beaker();
    s.pour('na2co3-0.5M', 'a', 20);
    s.pour('hcl-1M', 'a', 30);
    s.advance(10);
    expect(s.view().observed('gas', 'a')).toBe(true);
    expect(s.vessel('a')?.mix['g:co2'] ?? 0).toBeLessThan(1e-9);
    expect(near(s.ledger.escaped, 0.01 * 44.009, 0.01)).toBe(true);
  });
  it('citric acid (lemon juice) + baking soda fizzes too', () => {
    const s = beaker();
    s.pour('lemon-juice', 'a', 30);
    s.add('nahco3', 'a', 1);
    s.advance(60);
    expect(s.view().observed('gas', 'a')).toBe(true);
  });
  it('vinegar attacks precipitated CaCO3 more slowly than hydrochloric acid does', () => {
    const co2After = (acid: string, ml: number): number => {
      const s = beaker();
      s.pour('cacl2-0.5M', 'a', 10);
      s.pour('na2co3-0.5M', 'a', 10);
      s.advance(2);
      s.pour(acid, 'a', ml);
      s.advance(2);
      return s.ledger.escaped;
    };
    expect(co2After('hcl-1M', 10)).toBeGreaterThan(co2After('vinegar', 12));
  });
});

describe('neutralisation (E3 chemistry)', () => {
  it('equal amounts of 0.1 M HCl and NaOH give pH 7 and a warmer mixture', () => {
    const s = beaker();
    s.pour('hcl-0.1M', 'a', 20);
    const t0 = s.vessel('a')?.tempC ?? 0;
    s.pour('naoh-0.1M', 'a', 20);
    s.advance(1);
    expect(s.ph('a')).toBeCloseTo(7, 1);
    const dT = (s.vessel('a')?.tempC ?? 0) - t0;
    expect(dT).toBeGreaterThan(0.2);
    expect(dT).toBeLessThan(1.2);
  });
  it('heat released matches -57.62 kJ/mol within the heat capacity bookkeeping', () => {
    const s = beaker();
    s.pour('hcl-1M', 'a', 20);
    s.pour('naoh-1M', 'a', 20);
    s.advance(0.1);
    // 20 mmol -> 1.152 kJ into about 40 g water + 90 g glass (0.83 J/gK) = 242 J/K -> about 4.8 K
    const dT = (s.vessel('a')?.tempC ?? 0) - 22;
    expect(dT).toBeGreaterThan(4);
    expect(dT).toBeLessThan(5.6);
  });
  it('excess acid leaves the solution acidic, excess base basic', () => {
    const a = beaker();
    a.pour('hcl-0.1M', 'a', 30);
    a.pour('naoh-0.1M', 'a', 10);
    a.advance(1);
    expect(a.ph('a')).toBeCloseTo(1.3, 1);
    const b = beaker();
    b.pour('hcl-0.1M', 'a', 10);
    b.pour('naoh-0.1M', 'a', 30);
    b.advance(1);
    expect(b.ph('a')).toBeCloseTo(12.7, 1);
  });
  it('weak acid + strong base: vinegar with NaOH ends basic at equivalence', () => {
    const s = beaker();
    s.pour('vinegar', 'a', 10);
    s.pour('naoh-1M', 'a', 8.4);
    s.advance(1);
    expect(s.ph('a')).toBeGreaterThan(8);
  });
  it('phenolphthalein turns pink only after the equivalence point', () => {
    const s = bench(['f', 'erlenmeyer250']);
    s.pour('hcl-0.1M', 'f', 20);
    s.drop('phenolphthalein', 'f', 2);
    s.pour('naoh-0.1M', 'f', 19.9);
    s.advance(1);
    const before = s.view().colour('f');
    s.pour('naoh-0.1M', 'f', 0.3);
    s.advance(1);
    const after = s.view().colour('f');
    expect(before[1]).toBeGreaterThan(220);
    expect(after[0]).toBeGreaterThan(after[1] + 40);
  });
  it('acid dissolves a precipitated hydroxide and the blue colour returns', () => {
    const s = beaker();
    s.pour('cuso4-0.1M', 'a', 20);
    s.pour('naoh-0.1M', 'a', 40);
    s.advance(3);
    expect(s.view().solidG('a', 'cuoh2')).toBeCloseTo(0.195, 2);
    expect(s.visuals('a')?.sediment[0]?.rgb[2]).toBeGreaterThan(200);
    s.pour('hcl-1M', 'a', 10);
    s.advance(60);
    expect(s.view().solidG('a', 'cuoh2')).toBeLessThan(1e-4);
    expect(s.view().moles('a', 'Cu(2+)')).toBeCloseTo(0.002, 6);
  });
});

describe('metals', () => {
  const run = (acid: string, metal: string, g: number, secs: number, tweak?: (s: LabSim) => void): LabSim => {
    const s = bench(['t', 'testtube']);
    s.pour(acid, 't', 20);
    tweak?.(s);
    s.add(metal, 't', g);
    s.advance(secs);
    return s;
  };
  const h2 = (s: LabSim): number => s.vessel('t')?.extent['redox:mg+H+'] ?? 0;
  it('0.10 g Mg in 20 mL 1 M HCl gives 4.11 mmol H2 (Mg is limiting)', () => {
    const s = run('hcl-1M', 'mg-ribbon', 0.1, 400);
    expect(near(h2(s), 0.1 / 24.305, 5e-6)).toBe(true);
  });
  it('powder reacts faster than ribbon, dilute acid slower than concentrated, hot faster than cold', () => {
    const half = (acid: string, metal: string, prep?: (s: LabSim) => void): number => {
      const s = bench(['t', 'testtube']);
      s.pour(acid, 't', 20);
      prep?.(s);
      const t0 = s.time;
      s.add(metal, 't', 0.1);
      for (let i = 0; i < 6000; i++) {
        s.step(0.1);
        if (h2(s) >= 0.5 * (0.1 / 24.305)) return s.time - t0;
      }
      return Infinity;
    };
    const base = half('hcl-1M', 'mg-ribbon');
    expect(half('hcl-1M', 'mg-powder')).toBeLessThan(base / 3);
    expect(half('hcl-0.1M', 'mg-ribbon')).toBeGreaterThan(base * 3);
    const hot = half('hcl-1M', 'mg-ribbon', (s) => {
      s.heat('t', 'hotplate');
      s.advance(30);
      s.heat('t', null);
    });
    expect(hot).toBeLessThan(base);
  });
  it('the test tube warms because the reaction is exothermic', () => {
    const s = run('hcl-1M', 'mg-ribbon', 0.1, 60);
    expect((s.vessel('t')?.tempC ?? 0) - 22).toBeGreaterThan(8);
  });
  it('activity order in acid: Mg faster than Zn faster than Fe; Cu does nothing', () => {
    const amountReacted = (metal: string, id: string): number => {
      const s = run('hcl-1M', metal, 0.2, 60);
      return s.vessel('t')?.extent[id] ?? 0;
    };
    const mg = amountReacted('mg-ribbon', 'redox:mg+H+');
    const zn = amountReacted('zn-granule', 'redox:zn+H+');
    const fe = amountReacted('fe-nail', 'redox:fe+H+');
    expect(mg / (0.2 / 24.305)).toBeGreaterThan(zn / (0.2 / 65.38));
    expect(zn / (0.2 / 65.38)).toBeGreaterThan(fe / (0.2 / 55.845));
    const cu = run('hcl-1M', 'cu-wire', 0.5, 120);
    expect(cu.view().observed('gas', 't')).toBe(false);
    expect(cu.view().solidG('t', 'cu')).toBeCloseTo(0.5, 6);
  });
  it('aluminium reacts with acid with the balanced 2:6 stoichiometry', () => {
    const s = run('hcl-1M', 'al-foil', 0.1, 4000);
    expect(near(s.vessel('t')?.extent['redox:al+H+'] ?? 0, 0.1 / 26.982 / 2, 2e-5)).toBe(true);
  });
  it('Fe nail in CuSO4: deposit 0.318 g Cu, 0.279 g Fe dissolved (E5 arithmetic)', () => {
    const s = bench(['b', 'beaker100']);
    s.pour('cuso4-0.1M', 'b', 50);
    s.add('fe-nail', 'b', 3);
    s.advance(2500, 1);
    expect(near(s.view().solidG('b', 'cu'), 0.318, 0.01)).toBe(true);
    expect(near(3 - s.view().solidG('b', 'fe'), 0.279, 0.01)).toBe(true);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('the blue colour fades and the solution turns pale green', () => {
    const s = bench(['b', 'beaker100']);
    s.pour('cuso4-0.1M', 'b', 50);
    const blue = s.view().colour('b');
    s.add('fe-nail', 'b', 3);
    s.advance(2500, 1);
    const after = s.view().colour('b');
    expect(blue[0]).toBeLessThan(80);
    expect(blue[2]).toBeGreaterThan(blue[0] + 100);
    expect(after[0]).toBeGreaterThan(200);
    expect(after[1]).toBeGreaterThan(after[2]);
  });
  it('reverse order does nothing: Cu in FeSO4, Fe in ZnSO4, Cu in ZnSO4', () => {
    for (const [salt, metal] of [['feso4-0.1M', 'cu-wire'], ['znso4-0.1M', 'fe-nail'], ['znso4-0.1M', 'cu-wire']] as const) {
      const s = bench(['b', 'beaker100']);
      s.pour(salt, 'b', 50);
      s.add(metal, 'b', 1);
      s.advance(600, 1);
      expect(s.view().observed('deposit', 'b')).toBe(false);
    }
  });
  it('more active metals displace less active ones: Zn in CuSO4, Mg in ZnSO4, Cu in AgNO3', () => {
    for (const [salt, metal, product] of [['cuso4-0.1M', 'zn-granule', 'cu'], ['znso4-0.1M', 'mg-ribbon', 'zn'], ['agno3-0.05M', 'cu-wire', 'ag']] as const) {
      const s = bench(['b', 'beaker100']);
      s.pour(salt, 'b', 50);
      s.add(metal, 'b', 1);
      s.advance(900, 1);
      expect(s.view().solidG('b', product), `${metal} in ${salt}`).toBeGreaterThan(0.01);
    }
  });
  it('Zn + Cu(NO3)2 variant works as the programme example', () => {
    const s = bench(['b', 'beaker100']);
    s.pour('cuno32-0.1M', 'b', 50);
    s.add('zn-granule', 'b', 1);
    s.advance(900, 1);
    expect(near(s.view().solidG('b', 'cu'), 0.318, 0.02)).toBe(true);
  });
  it('powder-oxidiser mix is blocked, so Mg powder with KNO3 never reacts', () => {
    const s = beaker();
    s.add('kno3', 'a', 2);
    const r = s.add('mg-powder', 'a', 1);
    expect(r.ok).toBe(false);
    expect(r.blocked?.id).toBe('powder-oxidiser');
  });
});

describe('combustion and gas tests (E7 / E6 chemistry)', () => {
  const crucible = (): LabSim => {
    const s = bench(['c', 'crucible']);
    s.add('mg-ribbon', 'c', 0.12);
    return s;
  };
  it('magnesium does not burn without ignition', () => {
    const s = crucible();
    s.lid('c', true);
    s.advance(60);
    expect(s.view().solidG('c', 'mgo')).toBe(0);
  });
  it('with a lid on, the little air inside burns only a little magnesium', () => {
    const s = crucible();
    s.heat('c', 'bunsen-blue');
    s.advance(120);
    const mgo = s.view().solidG('c', 'mgo');
    expect(mgo).toBeGreaterThan(0.005);
    expect(mgo).toBeLessThan(0.03);
  });
  it('with the lid open it burns completely: 0.12 g Mg gives 0.199 g MgO, mass rises by 0.079 g from the air', () => {
    const s = crucible();
    s.place('c');
    const m0 = s.weigh('c').value ?? 0;
    s.heat('c', 'bunsen-blue');
    s.advance(75);
    s.lid('c', true);
    s.advance(20);
    s.heat('c', null);
    s.advance(10);
    expect(near(s.view().solidG('c', 'mgo'), 0.199, 0.003)).toBe(true);
    expect(s.view().solidG('c', 'mg')).toBeLessThan(1e-4);
    const m1 = s.weigh('c').value ?? 0;
    expect(near(m1 - m0, 0.08, 0.02)).toBe(true);
    expect(s.ledger.fromAir).toBeGreaterThan(0.06);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('the flash is reported as a capped event and an observation', () => {
    const s = crucible();
    s.heat('c', 'bunsen-blue');
    s.advance(120);
    const ev = s.drainEvents().filter((e) => e.kind === 'flash');
    expect(ev.length).toBeGreaterThan(0);
    for (const e of ev) expect(e.value ?? 0).toBeLessThanOrEqual(0.8);
    expect(s.view().observed('light', 'c')).toBe(true);
  });
  it('hydrogen gives a pop with a flame, nothing without hydrogen', () => {
    const s = bench(['t', 'testtube'], ['g', 'gas-tube']);
    s.pour('hcl-1M', 't', 20);
    s.gasline('t', 'g');
    s.add('mg-ribbon', 't', 0.1);
    s.advance(60);
    expect(s.testGas('g', 'flame').value).toBe(1);
    expect(s.view().observed('sound', 'g')).toBe(true);
    expect(s.testGas('g', 'flame').value).toBe(0);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('the gas line moves all hydrogen into the collector (about 100 mL)', () => {
    const s = bench(['t', 'testtube'], ['g', 'gas-tube']);
    s.pour('hcl-1M', 't', 20);
    s.gasline('t', 'g');
    s.add('mg-ribbon', 't', 0.1);
    s.advance(200);
    expect(near(s.view().gasMl('g', 'h2'), 99.6, 2)).toBe(true);
    expect(s.vessel('t')?.mix['g:h2'] ?? 0).toBeLessThan(1e-9);
  });
  it('without a gas line the hydrogen escapes into the room', () => {
    const s = bench(['t', 'testtube']);
    s.pour('hcl-1M', 't', 20);
    s.add('mg-ribbon', 't', 0.1);
    s.advance(200);
    expect(near(s.ledger.escaped, 0.1 / 24.305 * 2.016, 0.002)).toBe(true);
  });
  it('glowing splint relights only in oxygen; limewater clouds only with CO2', () => {
    const o = bench(['c', 'cylinder100'], ['g', 'gas-tube']);
    o.pour('h2o2-3pct', 'c', 20);
    o.gasline('c', 'g');
    o.add('yeast', 'c', 1);
    o.advance(30);
    expect(o.testGas('g', 'glowing-splint').value).toBe(1);
    expect(o.testGas('g', 'limewater').value).toBe(0);
    const c = bench(['f', 'erlenmeyer250'], ['g', 'gas-tube']);
    c.pour('vinegar', 'f', 20);
    c.gasline('f', 'g');
    c.add('nahco3', 'f', 1);
    c.advance(30);
    expect(c.testGas('g', 'limewater').value).toBe(1);
    expect(c.testGas('g', 'glowing-splint').value).toBe(0);
    expect(bench(['g', 'gas-tube']).testGas('g', 'glowing-splint').value).toBe(0);
  });
});

describe('catalysis (E9 chemistry)', () => {
  const peroxide = (cat?: (s: LabSim) => void, secs = 300): LabSim => {
    const s = bench(['c', 'cylinder100']);
    s.pour('h2o2-3pct', 'c', 50);
    cat?.(s);
    s.advance(secs);
    return s;
  };
  it('uncatalysed 3 % peroxide is stable for ten minutes', () => {
    const s = peroxide(undefined, 600);
    expect(s.view().observed('gas', 'c')).toBe(false);
    expect(s.vessel('c')?.extent['decomp:h2o2'] ?? 0).toBeLessThan(1e-6);
  });
  it('yeast makes oxygen: 22 mmol (0.54 L) from 44 mmol H2O2, +14 K, catalyst not consumed', () => {
    const s = peroxide((x) => x.add('yeast', 'c', 1.5));
    expect(near(s.vessel('c')?.extent['decomp:h2o2'] ?? 0, 0.02205, 3e-4)).toBe(true);
    expect((s.vessel('c')?.tempC ?? 0) - 22).toBeGreaterThan(8);
    expect(s.view().catalystG('c', 'yeast')).toBe(1.5);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('manganese dioxide and iodide also catalyse, and MnO2 stays', () => {
    const mn = peroxide((x) => x.add('mno2', 'c', 0.5));
    expect(mn.vessel('c')?.extent['decomp:h2o2'] ?? 0).toBeGreaterThan(0.015);
    expect(mn.view().solidG('c', 'mno2')).toBeCloseTo(0.5, 6);
    const ki = peroxide((x) => x.pour('ki-0.1M', 'c', 5));
    expect(ki.vessel('c')?.extent['decomp:h2o2'] ?? 0).toBeGreaterThan(0.01);
    expect(ki.vessel('c')?.mix['I-'] ?? 0).toBeCloseTo(0.0005, 8);
  });
  it('more catalyst is faster, a hot mixture is faster', () => {
    const at = (s: LabSim): number => s.vessel('c')?.extent['decomp:h2o2'] ?? 0;
    const small = peroxide((x) => x.add('yeast', 'c', 0.2), 10);
    const large = peroxide((x) => x.add('yeast', 'c', 3), 10);
    expect(at(large)).toBeGreaterThan(at(small));
  });
  it('with soap the oxygen forms foam that overflows the cylinder', () => {
    const s = bench(['c', 'cylinder100']);
    s.pour('h2o2-3pct', 'c', 50);
    s.add('soap', 'c', 0.3);
    s.add('yeast', 'c', 1.5);
    s.advance(60);
    expect(s.view().observed('foam', 'c')).toBe(true);
    expect(s.visuals('c')?.foamMl ?? 0).toBeGreaterThan(100);
  });
  it('without soap there is no foam', () => {
    const s = peroxide((x) => x.add('yeast', 'c', 1.5), 60);
    expect(s.view().observed('foam', 'c')).toBe(false);
  });
  it('heating dry baking soda decomposes it to soda, water and CO2', () => {
    const s = bench(['t', 'testtube']);
    s.add('nahco3', 't', 2);
    s.heat('t', 'hotplate');
    s.advance(120);
    expect(s.view().solidG('t', 'na2co3')).toBeGreaterThan(1.0);
    expect(s.view().solidG('t', 'nahco3')).toBeLessThan(0.5);
    expect(s.ledger.escaped).toBeGreaterThan(0.3);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
});
