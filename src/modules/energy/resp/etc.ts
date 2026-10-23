import type { Ev } from '../chart';
import type { Trip } from '../flock';
import type { Key } from '../math';
import { go, hash01, still } from '../paths';
import type { Carrier } from './krebs';
import { MX, R_MEMB } from './layout';
import { rotor } from '../photo/inner-trips';

export const R3_START = 37.4;
export const R3_END = 52.9;
const S = R_MEMB;

export interface EtcPlan {
  trips: Trip[];
  events: Ev[];
  /** Times of the 26 ATP made at the synthase and of the six oxygen molecules consumed. */
  atpTimes: number[];
  o2Times: number[];
}

/** Electron transport chain on the inner membrane: carriers unload, electrons run down the chain to oxygen, protons gather above and flow back through ATP synthase. */
export function etcTrips(carriers: readonly Carrier[]): EtcPlan {
  const trips: Trip[] = [];
  const events: Ev[] = [];
  const up = { upright: true, spin: 0 } as const;
  const [x1, x3, x4, xs] = [MX.c1, MX.c3, MX.c4, MX.synth];

  // the membrane machinery (natural scale of the painted proteins; extra copies behind make it look populated)
  const still_ = (kind: 'etcA' | 'etcB' | 'etcC' | 'etcII', x: number, z: number, ph: number, flipX = false): Trip =>
    still(kind, S, 1.6, [x, 0, z], 0, R3_END, { ...up, phase: ph, ...(flipX ? { base: [0, Math.PI, 0] as const } : {}) });
  trips.push(still_('etcA', x1, 0, 0), still_('etcB', x3, 0, 0.3), still_('etcC', x4, 0, 0.6));
  trips.push(still_('etcII', MX.c2, 0, 0.9));
  trips.push(still_('etcA', x1 + 2.2, -3.4, 2.0), still_('etcB', x3 + 1.6, -3.5, 1.0), still_('etcC', x4 + 1.4, 3.4, 3.0), still_('etcA', x1 + 0.4, 3.5, 4.0), still_('etcC', x3 - 1.6, 3.3, 2.0));
  const flipDown = { ...up, base: [Math.PI, 0, 0] } as const;
  trips.push(still('atpSynthase', S, 1.5, [xs + 3.0, 0, -3.2], 0, R3_END, { ...flipDown, phase: 1.0 }));
  trips.push(still('atpSynthase', S, 1.5, [xs - 2.2, 0, 3.2], 0, R3_END, { ...flipDown, phase: 2.0 }));

  // twelve loaded carriers unload at the first complex
  const td = (c: number): number => R3_START + 1.6 + c * 0.8;
  carriers.forEach((c, k) => {
    const t = td(k);
    const y = -3.4 - (k % 3) * 0.5;
    trips.push(go(c.kind, S, 0.4, [[R3_START, -11 + (k % 6) * 0.3, y, 0.8], [t - 0.3, x1 + 0.2, -2.7, 0.2]], { wobble: 0.04, fade: 0.2 }));
    trips.push(go('carrierOff', S, 0.4, [[t - 0.3, x1 + 0.2, -2.7, 0.2], [t + 2.6, -10.5, -4.0 - (k % 3) * 0.5, 0.8]], { wobble: 0.04, fade: 0.2 }));
    const e: Key[] = [[t, x1, -0.6, 0], [t + 1.0, (x1 + x3) / 2, 0.5, 0.9], [t + 2.0, x3, 0.6, 0.9], [t + 3.0, (x3 + x4) / 2, 2.9, 0.9], [t + 4.0, x4, 2.4, 0.9], [t + 4.7, x4, -0.7, 0]];
    trips.push(go('electron', S, 0.17, e, { fade: 0.15 }));
  });

  // shuttles: ubiquinone in the membrane, cytochrome c along the outer face
  for (let i = 0; i < 5; i++) {
    const t = R3_START + 2.0 + i * 2.2;
    trips.push(go('ubiquinone', S, 0.3, [[t, x1 + 0.7, 0.3, 0.9], [t + 1.8, x3 - 0.7, 0.3, 0.9], [t + 3.6, x1 + 0.7, 0.3, 0.9]], { wobble: 0.03, fade: 0.2 }));
    const u = R3_START + 4.0 + i * 2.2;
    trips.push(go('cytc', S, 0.4, [[u, x3 + 0.4, 2.9, 0.9], [u + 1.8, x4 - 0.4, 2.9, 0.9], [u + 3.6, x3 + 0.4, 2.9, 0.9]], { wobble: 0.03, fade: 0.2 }));
  }

  // protons: pumped up at the three complexes, gather above the membrane, flow back through ATP synthase
  const atpTimes: number[] = [];
  const flow: number[] = [];
  const pumpX = [x1, x3, x4];
  for (let m = 0; m < 26; m++) {
    const tp = R3_START + 2.2 + m * 0.3;
    const px = pumpX[m % 3]!;
    const tf = tp + 2.8 + (m % 2) * 0.2;
    flow.push(tf);
    const wait: Key = [tp + 1.7, -9 + hash01(m + 1) * 18, 3.3 + hash01(m + 7) * 1.4, (hash01(m + 3) - 0.5) * 2.4];
    trips.push(
      go('hplus', S, 0.15, [[tp, px, -2.0, 0.1], [tp + 0.7, px, 0.0, 0.1], [tp + 1.2, px + 0.2, 2.5, 0.3], wait, [tf - 0.1, xs, 2.6, 0], [tf + 0.6, xs, 0.1, 0], [tf + 1.3, xs + 0.2, -3.0, 0]], { wobble: 0.1 }),
    );
    const ta = tf + 1.0;
    atpTimes.push(ta + 0.4);
    const px2 = 5.6 + (m % 7) * 0.9;
    const py2 = -5.0 - Math.floor(m / 7) * 0.75;
    trips.push(go('atp', S, 0.5, [[ta - 0.3, xs, -3.2, 0], [ta + 2.2, px2, py2, 0.5], [R3_END, px2, py2, 0.5]], { hold: true, wobble: 0.04 }));
    events.push({ series: 'atp-toplam', t: ta + 0.4, amount: 1, dur: 0.8 });
  }
  const o2Times: number[] = [];
  for (let j = 0; j < 6; j++) {
    const to = R3_START + 4.2 + j * 1.6;
    o2Times.push(to + 0.2);
    trips.push(go('o2', S, 0.3, [[to - 2.6, 6.6, -5.4, 0.5], [to - 0.8, 3.0, -2.6, 0.3], [to, x4, -2.3, 0]], { wobble: 0.06 }));
    events.push({ series: 'o2-kullanimi', t: to + 0.2, amount: 100 / 6, dur: 1.2 });
    for (let q = 0; q < 2; q++) {
      const t = to + 0.3 + q * 0.7;
      trips.push(go('h2o', S, 0.3, [[t, x4 + 0.1, -2.3, 0], [t + 1.6, -1.2 + q, -3.6, 0.4], [t + 3.8, -6.5 + q * 2, -5.6, 0.4]], { wobble: 0.06 }));
    }
  }
  // ATP synthase turns while protons flow through it
  trips.push(...rotor(S, [xs, 0, 0], 1.5, 0, R3_END, [[flow[0]! - 0.1, flow[25]! + 1.3, -5]], [Math.PI, 0, 0]));
  return { trips, events, atpTimes, o2Times };
}
