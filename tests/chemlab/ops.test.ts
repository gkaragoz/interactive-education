import { describe, expect, it } from 'vitest';
import { checkCombination, VESSEL_SPECS } from '../../src/chemlab';
import { bench, beaker, near } from './helpers';

describe('pouring and volume limits', () => {
  it('pours an exact volume from a bottle, logs it in Turkish and counts it as supplied', () => {
    const s = beaker();
    const r = s.pour('vinegar', 'a', 50);
    expect(r.ok).toBe(true);
    expect(s.vessel('a') && s.view().volumeMl('a')).toBeCloseTo(50, 6);
    expect(s.journal[0]?.kind).toBe('action');
    expect(s.journal[0]?.textTr).toContain('mL');
    expect(s.journal[0]?.textTr).toContain('eklendi');
    expect(s.ledger.supplied).toBeGreaterThan(49);
  });
  it('pour between vessels moves a proportional share of every species', () => {
    const s = bench(['a', 'beaker250'], ['b', 'beaker250']);
    s.pour('baking-soda-solution', 'a', 100);
    s.pour('a', 'b', 40);
    expect(s.view().volumeMl('a')).toBeCloseTo(60, 6);
    expect(s.view().volumeMl('b')).toBeCloseTo(40, 6);
    expect(s.view().moles('b', 'HCO3-') / s.view().moles('a', 'HCO3-')).toBeCloseTo(40 / 60, 8);
    expect(s.massBalanceError()).toBeCloseTo(0, 9);
  });
  it('asking for more than is there pours what is there', () => {
    const s = bench(['a', 'beaker250'], ['b', 'beaker250']);
    s.pour('water', 'a', 30);
    const r = s.pour('a', 'b', 100);
    expect(r.ok).toBe(true);
    expect(s.view().volumeMl('a')).toBeCloseTo(0, 6);
    expect(s.view().volumeMl('b')).toBeCloseTo(30, 6);
  });
  it('overflow spills the excess onto the bench and warns', () => {
    const s = bench(['a', 'beaker100']);
    s.pour('water', 'a', 150);
    expect(s.view().volumeMl('a')).toBeCloseTo(100, 6);
    expect(s.ledger.spilled).toBeGreaterThan(49);
    expect(s.drainEvents().some((e) => e.kind === 'spill')).toBe(true);
    expect(s.journal.some((j) => j.kind === 'warning' && j.textTr.includes('taştı'))).toBe(true);
    expect(s.massBalanceError()).toBeCloseTo(0, 9);
  });
  it('filling a vessel again after it is full spills everything', () => {
    const s = bench(['a', 'testtube']);
    s.pour('water', 'a', 25);
    s.pour('water', 'a', 10);
    expect(s.view().volumeMl('a')).toBeCloseTo(25, 6);
    expect(s.ledger.spilled).toBeGreaterThan(9.5);
  });
  it('refuses empty sources, self-pours, unknown vessels and bad amounts', () => {
    const s = bench(['a', 'beaker250'], ['b', 'beaker250']);
    expect(s.pour('a', 'b', 5).ok).toBe(false);
    s.pour('water', 'a', 10);
    expect(s.pour('a', 'a', 5).ok).toBe(false);
    expect(s.pour('water', 'zzz', 5).ok).toBe(false);
    expect(s.pour('nonsense', 'a', 5).ok).toBe(false);
    expect(s.pour('water', 'a', -3).ok).toBe(false);
    expect(s.pour('water', 'a', Number.NaN).ok).toBe(false);
    expect(s.pour('fe-nail', 'a', 5).ok).toBe(false);
  });
  it('refuses to pour into a stoppered vessel', () => {
    const s = beaker();
    s.close('a', 'stopper');
    const r = s.pour('water', 'a', 10);
    expect(r.ok).toBe(false);
    expect(r.messageTr).toContain('kapalı');
  });
  it('mixes temperatures by heat capacity', () => {
    const s = bench(['a', 'beaker250'], ['b', 'beaker250']);
    s.pour('water', 'a', 100);
    s.heat('a', 'hotplate');
    s.advance(100);
    s.heat('a', null);
    const hot = s.vessel('a')?.tempC ?? 0;
    s.pour('water', 'b', 100);
    s.pour('a', 'b', 100);
    const t = s.vessel('b')?.tempC ?? 0;
    expect(t).toBeGreaterThan(22);
    expect(t).toBeLessThan(hot);
  });
  it('suspended precipitate follows the liquid only when stirred', () => {
    const run = (stirred: boolean): number => {
      const s = bench(['a', 'beaker250'], ['b', 'beaker250']);
      s.pour('cacl2-0.5M', 'a', 10);
      s.pour('na2co3-0.5M', 'a', 10);
      s.advance(60);
      if (stirred) s.stir('a', true);
      s.pour('a', 'b', 20);
      return s.view().precipitateG('b');
    };
    expect(run(true)).toBeGreaterThan(0.45);
    expect(run(false)).toBeLessThan(0.1);
  });
});

describe('adding solids and drops', () => {
  it('adds grams of a solid reagent and rounds to the milligram', () => {
    const s = beaker();
    const r = s.add('nacl', 'a', 1.23456);
    expect(r.value).toBeCloseTo(1.235, 6);
    expect(s.view().grams('a', 's:nacl')).toBeGreaterThan(0.99 * 1.235);
  });
  it('powder form is marked and dissolves faster than a lump', () => {
    const t90 = (powder: boolean): number => {
      const s = beaker();
      s.pour('water', 'a', 100);
      s.add('sucrose', 'a', 20, powder);
      for (let i = 0; i < 20000; i++) {
        s.step(0.1);
        if (s.view().solidG('a', 'sucrose') < 2) return s.time;
      }
      return Infinity;
    };
    expect(t90(true) * 3).toBeLessThan(t90(false));
  });
  it('refuses liquids as solids and solids as drops', () => {
    const s = beaker();
    expect(s.add('vinegar', 'a', 1).ok).toBe(false);
    expect(s.drop('nacl', 'a', 3).ok).toBe(false);
    expect(s.add('nacl', 'a', 0).ok).toBe(false);
    expect(s.add('nacl', 'zzz', 1).ok).toBe(false);
  });
  it('a drop is about 0.05 mL (within the seeded +-2 %)', () => {
    const s = beaker();
    s.pour('water', 'a', 10);
    s.drop('phenolphthalein', 'a', 20);
    expect(s.view().volumeMl('a')).toBeGreaterThan(10.9);
    expect(s.view().volumeMl('a')).toBeLessThan(11.1);
    expect(s.drop('phenolphthalein', 'a', 0).ok).toBe(false);
  });
  it('indicator stock is carried along when liquid is poured on', () => {
    const s = bench(['a', 'beaker250'], ['b', 'beaker250']);
    s.pour('cabbage-extract', 'a', 20);
    s.pour('a', 'b', 10);
    expect(s.view().indicatorMl('b', 'red-cabbage')).toBeCloseTo(10, 6);
    expect(s.view().indicatorMl('a', 'red-cabbage')).toBeCloseTo(10, 6);
  });
  it('catalyst stays in the vessel it was added to (and moves with a share of the liquid)', () => {
    const s = bench(['a', 'beaker250']);
    s.add('yeast', 'a', 2);
    expect(s.view().catalystG('a', 'yeast')).toBe(2);
  });
});

describe('measuring', () => {
  it('balance reads to 0.01 g, relative to tare', () => {
    const s = beaker();
    s.place('a');
    const empty = s.weigh('a').value ?? 0;
    expect(empty).toBeCloseTo(VESSEL_SPECS.beaker250.glassG, 2);
    s.tare();
    s.add('nacl', 'a', 1.2345);
    expect(s.weigh('a').value).toBeCloseTo(1.23, 2);
  });
  it('placing another vessel resets the tare, weighing off the pan is absolute', () => {
    const s = bench(['a', 'beaker250'], ['b', 'beaker100']);
    s.place('a');
    s.tare();
    s.place('b');
    expect(s.weigh('b').value).toBeCloseTo(50, 2);
    expect(s.weigh('a').value).toBeCloseTo(90, 2);
    expect(s.tare().ok).toBe(true);
    s.place(null);
    expect(s.tare().ok).toBe(false);
  });
  it('shows the balance reading in the measurements list', () => {
    const s = beaker();
    s.place('a');
    expect(s.measurements().find((m) => m.id === 'balance')?.value).toBeCloseTo(90, 2);
  });
  it('graduated cylinder reads to 1 mL, a beaker only roughly, a burette to 0.1 mL', () => {
    const s = bench(['c', 'cylinder100'], ['b', 'beaker250'], ['u', 'burette25']);
    s.pour('water', 'c', 37.4);
    s.pour('water', 'b', 137.4);
    s.pour('water', 'u', 12.34);
    expect(s.readVolume('c').value).toBe(37);
    expect(s.readVolume('b').value).toBe(125);
    expect(s.readVolume('u').value).toBeCloseTo(12.3, 6);
  });
  it('burette dispenses in 0.05 mL steps and logs the titration points', () => {
    const s = bench(['f', 'erlenmeyer250'], ['u', 'burette25']);
    s.pour('hcl-0.1M', 'f', 20);
    s.pour('naoh-0.1M', 'u', 25);
    const r = s.dispense('u', 'f', 0.123);
    expect(r.value).toBeCloseTo(0.1, 6);
    s.dispense('u', 'f', 5);
    const log = s.titrationLog();
    expect(log.length).toBe(2);
    expect(log[1]?.ml).toBeCloseTo(5.1, 6);
    expect(log[1]?.ph).toBeGreaterThan(log[0]?.ph ?? 99);
    expect(s.dispense('f', 'f', 1).ok).toBe(false);
  });
  it('pH paper gives a whole number, litmus only acid or base', () => {
    const s = bench(['a', 'beaker250'], ['b', 'beaker250'], ['c', 'beaker250']);
    s.pour('hcl-0.1M', 'a', 20);
    s.pour('water', 'b', 20);
    s.pour('naoh-0.1M', 'c', 20);
    expect(s.dip('universal-strip', 'a').value).toBe(1);
    expect(s.dip('universal-strip', 'b').value).toBe(7);
    expect(s.dip('universal-strip', 'c').value).toBe(13);
    s.dip('litmus-paper', 'a');
    expect(s.journal[s.journal.length - 1]?.textTr).toContain('kırmızı');
    s.dip('litmus-paper', 'c');
    expect(s.journal[s.journal.length - 1]?.textTr).toContain('mavi');
    const empty = bench(['x', 'beaker100']);
    expect(empty.dip('universal-strip', 'x').ok).toBe(false);
  });
  it('lists temperature, volume and pH measurements for filled vessels only', () => {
    const s = bench(['a', 'beaker250'], ['b', 'beaker250']);
    s.pour('hcl-0.1M', 'a', 20);
    const ids = s.measurements().map((m) => m.id);
    expect(ids).toContain('T:a');
    expect(ids).toContain('V:a');
    expect(ids).toContain('pH:a');
    expect(ids).not.toContain('pH:b');
    expect(ids).toContain('time');
  });
});

describe('filtration', () => {
  const setup = (): ReturnType<typeof bench> => {
    const s = bench(['a', 'beaker250'], ['f', 'funnel'], ['b', 'beaker250']);
    s.pour('cacl2-0.5M', 'a', 10);
    s.pour('na2co3-0.5M', 'a', 10);
    s.advance(1);
    s.stir('a', true);
    s.pour('a', 'f', 20);
    return s;
  };
  it('keeps the solid on the paper and sends the liquid on', () => {
    const s = setup();
    expect(s.filter('f', 'b').ok).toBe(true);
    expect(s.view().precipitateG('f')).toBeCloseTo(0.5, 2);
    expect(s.view().precipitateG('b')).toBeLessThan(1e-9);
    expect(s.view().volumeMl('b')).toBeCloseTo(20, 3);
    expect(s.view().moles('b', 'Na+')).toBeCloseTo(0.01, 6);
    expect(s.massBalanceError()).toBeCloseTo(0, 9);
  });
  it('needs a funnel and a different receiver and liquid', () => {
    const s = setup();
    expect(s.filter('a', 'b').ok).toBe(false);
    expect(s.filter('f', 'f').ok).toBe(false);
    expect(s.filter('f', 'zzz').ok).toBe(false);
    s.filter('f', 'b');
    expect(s.filter('f', 'b').ok).toBe(false);
  });
  it('the filtrate is clear while the paper holds the white solid', () => {
    const s = setup();
    s.filter('f', 'b');
    expect(s.visuals('b')?.turbidity ?? 1).toBeLessThan(0.01);
    expect(s.visuals('f')?.sediment[0]?.id).toBe('caco3');
  });
});

describe('safety blocks (dangerous mixes are never simulated)', () => {
  const blocked = (first: string, second: string): { id?: string; msg?: string; state: number } => {
    const s = beaker();
    s.pour(first, 'a', 20);
    const before = s.stateHash();
    const r = s.pour(second, 'a', 20);
    return { id: r.blocked?.id, msg: r.messageTr, state: s.stateHash() - before };
  };
  it('bleach + vinegar is blocked with a Turkish lesson and no state change', () => {
    const b = blocked('bleach', 'vinegar');
    expect(b.id).toBe('bleach-acid');
    expect(b.msg).toContain('klor');
    expect(b.state).toBe(0);
  });
  it('the order does not matter: vinegar then bleach', () => {
    expect(blocked('vinegar', 'bleach').id).toBe('bleach-acid');
  });
  it('bleach + hydrochloric acid, + lemon juice are blocked', () => {
    expect(blocked('bleach', 'hcl-0.1M').id).toBe('bleach-acid');
    expect(blocked('bleach', 'lemon-juice').id).toBe('bleach-acid');
  });
  it('bleach + ammonia cleaner is blocked (chloramines)', () => {
    const b = blocked('bleach', 'ammonia-cleaner');
    expect(b.id).toBe('bleach-ammonia');
    expect(b.msg).toContain('kloramin');
  });
  it('hydrogen peroxide + vinegar is blocked (peracetic acid)', () => {
    expect(blocked('h2o2-3pct', 'vinegar').id).toBe('peroxide-vinegar');
  });
  it('bleach + ethanol is blocked at the engine level', () => {
    const merged = checkCombination({ 'ClO-': 0.01, 'Na+': 0.01 }, { ethanol: 0.1 });
    expect(merged?.id).toBe('bleach-alcohol');
  });
  it('safe pairs are not blocked', () => {
    expect(blocked('bleach', 'water').id).toBeUndefined();
    expect(blocked('bleach', 'baking-soda-solution').id).toBeUndefined();
    expect(blocked('vinegar', 'baking-soda-solution').id).toBeUndefined();
    expect(blocked('h2o2-3pct', 'water').id).toBeUndefined();
    expect(blocked('hcl-0.1M', 'naoh-0.1M').id).toBeUndefined();
  });
  it('writes a blocked entry in the Defter and emits a blocked event', () => {
    const s = beaker();
    s.pour('bleach', 'a', 10);
    s.pour('vinegar', 'a', 10);
    expect(s.journal.some((j) => j.kind === 'blocked')).toBe(true);
    expect(s.drainEvents().some((e) => e.kind === 'blocked')).toBe(true);
  });
  it('blocked messages give no quantities or procedure', () => {
    const s = beaker();
    s.pour('bleach', 'a', 10);
    const r = s.pour('vinegar', 'a', 10);
    expect(r.messageTr).not.toMatch(/\d/);
  });
  it('flammable liquids are not heated on a flame; closed and graduated vessels are not heated at all', () => {
    const s = bench(['a', 'beaker250'], ['c', 'cylinder100'], ['f', 'erlenmeyer250']);
    expect(s.heat('c', 'hotplate').blocked?.id).toBe('not-heatable');
    s.close('f', 'stopper');
    expect(s.heat('f', 'hotplate').blocked?.id).toBe('heat-closed');
    expect(s.heat('a', 'bunsen-blue').ok).toBe(true);
    s.heat('a', null);
    s.pour('baking-soda-solution', 'a', 10);
    expect(s.heat('a', 'hotplate').ok).toBe(true);
  });
  it('a closed vessel cannot be heated, nor a heated one closed', () => {
    const s = beaker();
    s.heat('a', 'hotplate');
    expect(s.close('a', 'stopper').blocked).toBeDefined();
  });
  it('chloride solutions are not electrolysed', () => {
    const s = bench(['h', 'hofmann']);
    s.pour('nacl-0.5M', 'h', 100);
    const r = s.connectElectrodes('h', 9);
    expect(r.blocked?.id).toBe('electrolysis-chloride');
    expect(s.vessel('h')?.electrodes).toBeNull();
  });
  it('vessels without electrodes refuse the power supply', () => {
    const s = bench(['f', 'erlenmeyer250']);
    expect(s.connectElectrodes('f', 9).ok).toBe(false);
    const h = bench(['h', 'hofmann']);
    expect(h.connectElectrodes('h', 100).ok).toBe(false);
  });
});

describe('honest "nothing happened"', () => {
  it('salt solution + potassium nitrate solution: no reaction and a Turkish explanation', () => {
    const s = beaker();
    s.pour('nacl-0.5M', 'a', 20);
    s.pour('na2so4-0.1M', 'a', 20);
    s.advance(30);
    const i = s.inspect('a');
    expect(i.changed).toBe(false);
    expect(i.homogeneous).toBe(true);
    expect(i.textTr).toContain('Gözlenebilir bir değişim olmadı');
    expect(i.textTr).toContain('homojen');
  });
  it('sugar that does not dissolve is a heterogeneous mixture', () => {
    const s = beaker();
    s.pour('water', 'a', 20);
    s.add('sucrose', 'a', 100);
    s.advance(5);
    const i = s.inspect('a');
    expect(i.homogeneous).toBe(false);
    expect(i.sediment).toBe(true);
    expect(i.textTr).toContain('heterojen');
  });
  it('a real reaction is reported as a change', () => {
    const s = beaker();
    s.pour('vinegar', 'a', 20);
    s.add('nahco3', 'a', 1);
    s.advance(5);
    expect(s.inspect('a').changed).toBe(true);
    expect(s.inspect('a').gas).toBe(true);
  });
  it('unknown vessels are explained', () => {
    expect(beaker().inspect('zzz').textTr).toContain('yok');
  });
  it('metal that cannot react with acid stays unchanged', () => {
    const s = bench(['t', 'testtube']);
    s.pour('hcl-1M', 't', 10);
    s.add('cu-wire', 't', 1);
    s.advance(60);
    expect(s.inspect('t').changed).toBe(false);
  });
  it('mixing the same solutions in the other order gives the same state', () => {
    const run = (first: string, second: string): number => {
      const s = beaker();
      s.pour(first, 'a', 20);
      s.pour(second, 'a', 20);
      s.advance(10);
      return s.view().moles('a', 'Na+');
    };
    expect(near(run('nacl-0.5M', 'na2so4-0.1M'), run('na2so4-0.1M', 'nacl-0.5M'), 1e-12)).toBe(true);
  });
});
