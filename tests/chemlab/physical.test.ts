import { describe, expect, it } from 'vitest';
import { LabSim, requireSubstance, solubilityAt } from '../../src/chemlab';
import { capacityUnits, dissolvedUnits } from '../../src/chemlab/solubility';
import type { Vessel } from '../../src/chemlab';
import { bench, beaker, near } from './helpers';

const set = (s: LabSim, id: string, tempC: number): void => {
  (s.vessel(id) as { tempC: number }).tempC = tempC;
};

describe('heating, cooling and boiling', () => {
  it('a hot plate heats 100 mL of water by about 150 W x t / C', () => {
    const s = bench(['a', 'beaker250']);
    s.pour('water', 'a', 100);
    s.heat('a', 'hotplate');
    s.advance(60);
    const dT = (s.vessel('a')?.tempC ?? 0) - 22;
    // C = 100 g x 4.18 + 90 g x 0.83 = 493 J/K; 150 W x 60 s = 9 kJ -> 18 K minus a little for cooling and the heater curve
    expect(dT).toBeGreaterThan(14);
    expect(dT).toBeLessThan(19);
  });
  it('the Bunsen burner is hotter than the hot plate and the yellow flame is cooler than the blue', () => {
    const t = (src: 'bunsen-blue' | 'bunsen-yellow' | 'hotplate' | 'alcohol'): number => {
      const s = bench(['a', 'beaker250']);
      s.pour('water', 'a', 100);
      s.heat('a', src);
      s.advance(40);
      return s.vessel('a')?.tempC ?? 0;
    };
    expect(t('bunsen-blue')).toBeGreaterThan(t('bunsen-yellow'));
    expect(t('bunsen-yellow')).toBeGreaterThan(t('alcohol') - 5);
    expect(t('bunsen-blue')).toBeGreaterThan(t('hotplate'));
  });
  it('water boils at 100 C, the temperature stays there and steam leaves with the mass', () => {
    const s = bench(['a', 'beaker250']);
    s.pour('water', 'a', 100);
    s.heat('a', 'bunsen-blue');
    s.advance(400);
    expect(s.vessel('a')?.tempC).toBeLessThanOrEqual(100.001);
    expect(s.vessel('a')?.tempC).toBeGreaterThan(99.5);
    expect(s.ledger.escaped).toBeGreaterThan(5);
    expect(s.view().volumeMl('a')).toBeLessThan(95);
    expect(s.journal.some((j) => j.textTr.includes('kaynıyor'))).toBe(true);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('boiling dry leaves the dissolved salt behind as a solid', () => {
    const s = bench(['a', 'beaker100']);
    s.pour('nacl-0.5M', 'a', 30);
    s.heat('a', 'bunsen-blue');
    s.advance(2000, 1);
    expect(s.vessel('a')?.mix['water'] ?? 0).toBeLessThan(1e-6);
    expect(s.view().solidG('a', 'nacl')).toBeCloseTo(0.5 * 0.03 * 58.44, 2);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('a hot vessel cools towards the room by Newton cooling (about 15 min time constant)', () => {
    const s = bench(['a', 'beaker250']);
    s.pour('water', 'a', 100);
    set(s, 'a', 82);
    s.advance(900, 1);
    const t = s.vessel('a')?.tempC ?? 0;
    expect(near(t, 22 + 60 * Math.exp(-1), 1.5)).toBe(true);
  });
  it('an ice bath cools to a few degrees above zero', () => {
    const s = bench(['a', 'beaker100']);
    s.pour('water', 'a', 50);
    s.cool('a', true);
    s.advance(600, 1);
    expect(s.vessel('a')?.tempC).toBeLessThan(3);
    expect(s.vessel('a')?.tempC).toBeGreaterThan(0.4);
  });
  it('taking the bath away lets it warm up again', () => {
    const s = bench(['a', 'beaker100']);
    s.pour('water', 'a', 50);
    s.cool('a', true);
    s.advance(300, 1);
    s.cool('a', false);
    s.advance(1800, 1);
    expect(s.vessel('a')?.tempC).toBeGreaterThan(12);
  });
  it('the ambient temperature parameter changes where things settle', () => {
    const s = bench(['a', 'beaker100']);
    s.setParam('ambientC', 30);
    s.pour('water', 'a', 50);
    s.advance(3600, 1);
    expect(s.vessel('a')?.tempC).toBeCloseTo(30, 0);
    expect(s.params.find((p) => p.id === 'ambientC')?.default).toBe(22);
  });
  it('an empty vessel at room temperature stays idle', () => {
    const s = bench(['a', 'beaker100']);
    s.advance(10);
    expect(s.vessel('a')?.tempC).toBe(22);
    expect(Object.keys(s.vessel('a')?.mix ?? {})).toHaveLength(0);
  });
});

describe('dissolution, saturation and crystallisation (E8 chemistry)', () => {
  const settle = (extra: (s: LabSim) => void = () => undefined): LabSim => {
    const s = bench(['a', 'beaker100']);
    s.setParam('ambientC', 20);
    s.pour('water', 'a', 50);
    set(s, 'a', 20);
    s.add('kno3', 'a', 20);
    s.stir('a', true);
    extra(s);
    s.advance(5000, 1);
    return s;
  };
  it('at room temperature 50 mL of water holds only about 15.8 g KNO3, the rest stays at the bottom', () => {
    const s = settle();
    expect(near(s.view().solidG('a', 'kno3'), 4.2, 0.4)).toBe(true);
    expect(s.journal.some((j) => j.textTr.includes('doygun'))).toBe(true);
  });
  it('the saturated solution is exactly at capacity (ions in solution = solubility x volume)', () => {
    const s = settle();
    const v = s.vessel('a') as Vessel;
    const sub = requireSubstance('kno3');
    const cap = capacityUnits(sub, s.view().volumeMl('a'), v.tempC);
    const dis = dissolvedUnits(v, [['K+', 1], ['NO3-', 1]]);
    expect(near(dis, cap, cap * 0.01)).toBe(true);
  });
  it('dissolving KNO3 cools the beaker (endothermic) before it warms back up', () => {
    const s = bench(['a', 'beaker100']);
    s.pour('water', 'a', 50);
    s.add('kno3', 'a', 20);
    s.stir('a', true);
    s.advance(120, 1);
    expect(s.vessel('a')?.tempC).toBeLessThan(15);
    expect(s.journal.some((j) => j.tag === 'temperature' && j.textTr.includes('düştü'))).toBe(true);
  });
  it('heating dissolves all of it (capacity at 60 C is far above 20 g)', () => {
    const s = settle();
    expect(s.view().solidG('a', 'kno3')).toBeGreaterThan(3);
    s.heat('a', 'hotplate');
    s.advance(100);
    s.heat('a', null);
    s.advance(60);
    expect(s.view().solidG('a', 'kno3')).toBeLessThan(1e-3);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('cooling in ice crystallises about 13.2 g (the dossier says 13.35 g at 0 C)', () => {
    const s = settle();
    s.heat('a', 'hotplate');
    s.advance(100);
    s.heat('a', null);
    s.cool('a', true);
    s.advance(1500, 1);
    expect(near(s.view().solidG('a', 'kno3'), 13.2, 0.7)).toBe(true);
    expect(s.journal.some((j) => j.tag === 'precipitate' && j.textTr.includes('Kristal'))).toBe(true);
  });
  it('a solution can stay supersaturated until 12 % over capacity (no seed crystals), then crystallises', () => {
    const s = bench(['a', 'beaker250']);
    s.pour('water', 'a', 50);
    set(s, 'a', 80);
    s.stir('a', true);
    s.add('sucrose', 'a', 120);
    s.advance(240);
    expect(s.view().solidG('a', 'sucrose')).toBeLessThan(1e-3);
    set(s, 'a', 30); // capacity about 110 g -> ratio 1.09
    s.stir('a', false);
    s.advance(5);
    expect(s.view().solidG('a', 'sucrose')).toBeLessThan(1e-3);
    set(s, 'a', 15); // ratio about 1.3 -> nucleation
    s.advance(60);
    expect(s.view().solidG('a', 'sucrose')).toBeGreaterThan(5);
  });
  it('a seed crystal lets crystallisation start at the first sign of supersaturation', () => {
    const s = bench(['a', 'beaker250']);
    s.pour('water', 'a', 50);
    set(s, 'a', 80);
    s.stir('a', true);
    s.add('sucrose', 'a', 120);
    s.advance(240);
    s.add('sucrose', 'a', 0.5);
    s.stir('a', false);
    set(s, 'a', 30);
    s.advance(60);
    expect(s.view().solidG('a', 'sucrose')).toBeGreaterThan(5);
  });
  it('stirring, powder and temperature speed dissolution up but not the total amount', () => {
    const t90 = (stir: boolean, powder: boolean, hot: boolean): number => {
      const s = bench(['a', 'beaker250']);
      s.pour('water', 'a', 100);
      if (hot) set(s, 'a', 50);
      if (stir) s.stir('a', true);
      s.add('sucrose', 'a', 20, powder);
      for (let i = 0; i < 200000; i++) {
        s.step(0.1);
        if (s.view().solidG('a', 'sucrose') < 2) return s.time;
      }
      return Infinity;
    };
    const base = t90(false, false, false);
    expect(t90(true, false, false)).toBeLessThan(base / 2);
    expect(t90(false, true, false)).toBeLessThan(base / 2);
    expect(t90(false, false, true)).toBeLessThan(base / 2);
  });
  it('stirring does not change how much finally dissolves', () => {
    const final = (stir: boolean): number => {
      const s = bench(['a', 'beaker100']);
      s.setParam('ambientC', 20);
      s.pour('water', 'a', 50);
      set(s, 'a', 20);
      s.add('kno3', 'a', 20);
      if (stir) s.stir('a', true);
      s.advance(6000, 1);
      return s.view().solidG('a', 'kno3');
    };
    expect(near(final(true), final(false), 0.15)).toBe(true);
  });
  it('NaCl dissolves with almost no temperature change and is far from saturated at 10 g in 100 mL', () => {
    const s = bench(['a', 'beaker250']);
    s.pour('water', 'a', 100);
    s.add('nacl', 'a', 10);
    s.stir('a', true);
    s.advance(300, 1);
    expect(s.view().solidG('a', 'nacl')).toBeLessThan(1e-3);
    expect(Math.abs((s.vessel('a')?.tempC ?? 0) - 22)).toBeLessThan(1.5);
  });
  it('calcium chloride dissolving warms the water, ammonium nitrate and KNO3 cool it (cold pack)', () => {
    const dT = (reagent: string, g: number): number => {
      const s = bench(['a', 'beaker250']);
      s.pour('water', 'a', 100);
      s.add(reagent, 'a', g);
      s.stir('a', true);
      s.advance(30, 1);
      return (s.vessel('a')?.tempC ?? 0) - 22;
    };
    expect(dT('cacl2', 10)).toBeGreaterThan(4);
    expect(dT('nh4no3', 15)).toBeLessThan(-4);
    expect(dT('kno3', 15)).toBeLessThan(-2);
  });
  it('sparingly soluble CaCO3 stays practically solid (0.013 g/L)', () => {
    const s = bench(['a', 'beaker250']);
    s.pour('cacl2-0.5M', 'a', 10);
    s.pour('na2co3-0.5M', 'a', 10);
    s.advance(10);
    const ca = s.view().moles('a', 'Ca(2+)');
    const cap = (solubilityAt(requireSubstance('caco3'), 25) * 20) / 100 / 100.09;
    expect(ca).toBeLessThan(cap * 3);
    expect(s.view().solidG('a', 'caco3')).toBeCloseTo(0.5, 2);
  });
  it('solubility rules: chloride + silver, sulfate + barium and hydroxide + iron(III) give precipitates, nitrates never do', () => {
    const ppt = (a: string, b: string, solid: string): number => {
      const s = beaker();
      s.pour(a, 'a', 10);
      s.pour(b, 'a', 10);
      s.advance(5);
      return s.view().solidG('a', solid);
    };
    expect(ppt('agno3-0.05M', 'nacl-0.5M', 'agcl')).toBeGreaterThan(0.05);
    expect(ppt('bacl2-0.1M', 'na2so4-0.1M', 'baso4')).toBeGreaterThan(0.1);
    expect(ppt('cuso4-0.1M', 'naoh-0.1M', 'cuoh2')).toBeGreaterThan(0.04);
    expect(ppt('cuso4-0.1M', 'na2co3-0.5M', 'cuco3')).toBeGreaterThan(0.1);
    expect(ppt('cuno32-0.1M', 'nacl-0.5M', 'cuco3')).toBe(0);
    expect(ppt('nacl-0.5M', 'na2so4-0.1M', 'nacl')).toBe(0);
  });
  it('precipitates show their own colour: Cu(OH)2 blue, AgCl white', () => {
    const s = beaker();
    s.pour('cuso4-0.1M', 'a', 20);
    s.pour('naoh-0.1M', 'a', 40);
    s.advance(3);
    const ppt = s.visuals('a')?.sediment[0];
    expect(ppt?.id).toBe('cuoh2');
    expect(ppt?.rgb[2]).toBeGreaterThan(ppt?.rgb[0] ?? 255);
  });
  it('the solution above the settled precipitate turns clear and the cloud is stirred up again', () => {
    const s = beaker();
    s.pour('cacl2-0.5M', 'a', 10);
    s.pour('na2co3-0.5M', 'a', 10);
    s.advance(0.2);
    const cloudy = s.visuals('a')?.turbidity ?? 0;
    s.advance(120);
    const settled = s.visuals('a')?.turbidity ?? 1;
    s.stir('a', true);
    s.advance(1);
    const stirred = s.visuals('a')?.turbidity ?? 0;
    expect(settled).toBeLessThan(cloudy);
    expect(stirred).toBeGreaterThan(settled);
  });
});

describe('electrolysis (E10 chemistry)', () => {
  const run = (volts: number, secs: number, salt = 1.5): LabSim => {
    const s = bench(['h', 'hofmann']);
    s.pour('water', 'h', 150);
    if (salt > 0) s.add('na2so4', 'h', salt);
    s.stir('h', true);
    s.advance(300);
    s.stir('h', false);
    s.connectElectrodes('h', volts);
    s.advance(secs, 1);
    return s;
  };
  it('produces hydrogen and oxygen in the volume ratio 2 : 1', () => {
    const s = run(9, 600);
    expect(s.view().gasMl('h', 'h2') / s.view().gasMl('h', 'o2')).toBeCloseTo(2, 3);
    expect(s.view().gasMl('h', 'h2')).toBeGreaterThan(5);
  });
  it('follows Faraday: n(H2) = Q / (2 F)', () => {
    const s = run(9, 600);
    const q = s.vessel('h')?.charge ?? 0;
    expect(near(s.vessel('h')?.mix['g:h2'] ?? 0, q / (2 * 96485.33), 1e-12)).toBe(true);
    expect(near(s.vessel('h')?.mix['g:o2'] ?? 0, q / (4 * 96485.33), 1e-12)).toBe(true);
  });
  it('consumes water in proportion (mass is conserved)', () => {
    const s = run(9, 600);
    const nH2 = s.vessel('h')?.mix['g:h2'] ?? 0;
    expect(near(s.view().moles('h', 'water'), 150 * 0.998 / 18.015 - nH2, 1e-6)).toBe(true);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('twice the time gives about twice the gas; a higher voltage gives more gas', () => {
    const h2 = (x: LabSim): number => x.vessel('h')?.mix['g:h2'] ?? 0;
    const a = h2(run(9, 300));
    const b = h2(run(9, 600));
    const c = h2(run(15, 300));
    expect(b / a).toBeCloseTo(2, 1);
    expect(c).toBeGreaterThan(a);
  });
  it('below the decomposition voltage nothing happens', () => {
    const s = run(1.5, 600);
    expect(s.view().gasMl('h', 'h2')).toBe(0);
  });
  it('pure water conducts so poorly that practically no gas forms', () => {
    const s = run(9, 600, 0);
    expect(s.view().gasMl('h', 'h2')).toBeLessThan(0.001);
  });
  it('more electrolyte conducts better', () => {
    expect(run(9, 300, 3).view().gasMl('h', 'h2')).toBeGreaterThan(run(9, 300, 0.5).view().gasMl('h', 'h2'));
  });
  it('the cathode tube stops at 50 mL of hydrogen', () => {
    const s = run(24, 6000);
    expect(s.view().gasMl('h', 'h2')).toBeLessThan(55);
    expect(s.journal.some((j) => j.textTr.includes('doldu'))).toBe(true);
  });
  it('copper sulfate deposits copper at the cathode and makes acid (and oxygen) at the anode', () => {
    const s = bench(['b', 'beaker250']);
    s.pour('cuso4-0.1M', 'b', 100);
    s.connectElectrodes('b', 9);
    s.advance(900, 1);
    expect(s.view().solidG('b', 'cu')).toBeGreaterThan(0.02);
    expect(s.view().moles('b', 'H+')).toBeGreaterThan(0.0005);
    expect(s.ph('b') ?? 7).toBeLessThan(2.5);
    expect(s.vessel('b')?.mix['g:h2'] ?? 0).toBe(0);
    expect(s.massBalanceError()).toBeCloseTo(0, 8);
  });
  it('electrolysis heats the solution a little (Joule heat)', () => {
    const s = run(12, 600);
    expect(s.vessel('h')?.tempC ?? 0).toBeGreaterThan(22);
  });
  it('disconnecting stops the gas', () => {
    const s = run(9, 300);
    const before = s.vessel('h')?.mix['g:h2'] ?? 0;
    s.connectElectrodes('h', null);
    s.advance(300, 1);
    expect(s.vessel('h')?.mix['g:h2']).toBe(before);
  });
});

describe('journal, visuals and events', () => {
  it('journal entries are chronological and Turkish', () => {
    const s = bench(['f', 'erlenmeyer250']);
    s.pour('vinegar', 'f', 50);
    s.advance(1);
    s.add('nahco3', 'f', 2);
    s.advance(30);
    const ts = s.journal.map((j) => j.t);
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThanOrEqual(ts[i - 1] ?? 0);
    expect(s.journal.some((j) => j.kind === 'observation' && /gaz|köpür/i.test(j.textTr))).toBe(true);
  });
  it('every observation entry is tagged and attached to a vessel', () => {
    const s = bench(['f', 'erlenmeyer250']);
    s.pour('vinegar', 'f', 50);
    s.add('nahco3', 'f', 2);
    s.advance(30);
    for (const j of s.journal.filter((x) => x.kind === 'observation')) {
      expect(j.tag).toBeDefined();
      expect(j.vessel).toBe('f');
    }
  });
  it('colour change observations name the colours', () => {
    const s = bench(['t', 'testtube']);
    s.pour('cabbage-extract', 't', 5);
    s.advance(1);
    s.pour('lemon-juice', 't', 5);
    s.advance(1);
    expect(s.journal.some((j) => j.tag === 'colour' && j.textTr.includes('->'))).toBe(true);
  });
  it('visuals report fill level, bubbles, balloon and flame for the renderer', () => {
    const s = bench(['f', 'erlenmeyer250'], ['b', 'beaker250']);
    s.pour('vinegar', 'f', 125);
    s.add('nahco3', 'f', 3);
    s.close('f', 'balloon');
    s.advance(3);
    const v = s.visuals('f');
    expect(v?.fillLevel).toBeCloseTo(0.5, 1);
    expect(v?.bubbles).toBeGreaterThan(0);
    expect(v?.balloonFill).toBeGreaterThan(0);
    s.pour('water', 'b', 10);
    s.heat('b', 'bunsen-blue');
    expect(s.visuals('b')?.flameOn).toBe(true);
    expect(s.visuals('zzz')).toBeUndefined();
  });
  it('liquid colours: copper sulfate is blue, iron(III) chloride yellow-brown, water nearly clear', () => {
    const s = bench(['a', 'beaker250'], ['b', 'beaker250'], ['c', 'beaker250']);
    s.pour('cuso4-0.1M', 'a', 50);
    s.pour('water', 'b', 50);
    expect(s.visuals('a')?.liquidRgb[2]).toBeGreaterThan((s.visuals('a')?.liquidRgb[0] ?? 255) + 100);
    expect(s.visuals('b')?.liquidRgb[0]).toBeGreaterThan(220);
    expect(s.visuals('c')?.fillLevel).toBe(0);
  });
  it('glow rises with temperature of a hot crucible', () => {
    const s = bench(['c', 'crucible']);
    s.heat('c', 'bunsen-blue');
    s.advance(100);
    expect(s.visuals('c')?.glow).toBeGreaterThan(0);
  });
});
