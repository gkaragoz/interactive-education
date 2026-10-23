import type { Ev } from '../chart';
import type { Trip } from '../flock';
import type { Key } from '../math';
import { go } from '../paths';
import { add, bead, CHAIN } from '../resp/layout';
import { F_CELL, F_COMPARE, F_FLASK, F_MUSCLE, F_YEAST } from './stations';

export const T_LACTIC = 15.2;
export const T_ALCOHOL = 26.8;
export const T_COMPARE = 39.0;
export const T_FLASK = 46.6;

const G = [-5.5, 0.8, 0.3] as const;
const PYR = [[-5.2, 2.3, 0.3], [-5.2, -0.4, 0.3]] as const;
const LACTATE = '#c25a8a';
const ETHANOL = '#d9822b';

export interface FermPlan {
  trips: Trip[];
  events: Ev[];
}

/** Glycolysis without oxygen (station F0): one glucose becomes two pyruvates and two ATP. */
export function glycolysis(): FermPlan {
  const trips: Trip[] = [];
  const events: Ev[] = [];
  trips.push(go('glucose', F_CELL, 0.55, [[4.4, -12, 4.2, 0.5], [7.0, G[0], G[1], G[2]], [8.4, G[0], G[1], G[2]]], { wobble: 0.04, fade: 0.5, spin: 0.4 }));
  for (let i = 0; i < 6; i++) {
    const g = i < 3 ? 0 : 1;
    const a = (i / 6) * Math.PI * 2;
    const r = add(G, [Math.cos(a) * 0.75, Math.sin(a) * 0.75, 0]);
    const p = add(PYR[g]!, CHAIN[i % 3]!);
    trips.push(bead(F_CELL, [[7.9, r[0], r[1], r[2]], [8.5, r[0], r[1], r[2]], [10.2, p[0], p[1], p[2]], [T_LACTIC, p[0], p[1], p[2]]], { fade: 0.4 }));
  }
  [11.2, 12.8].forEach((t, k) => {
    trips.push(go('atp', F_CELL, 0.5, [[t, -4.5, -0.6, 0.7], [t + 2.2, -9 + k * 1.0, 4.8, 0.6], [T_LACTIC, -9 + k * 1.0, 4.8, 0.6]], { hold: true, wobble: 0.04 }));
    events.push({ series: 'atp-toplam', t: t + 0.8, amount: 1, dur: 0.8 });
  });
  [10.6, 11.4].forEach((t, k) => {
    trips.push(go('nadh', F_CELL, 0.4, [[t, G[0] + 0.6, G[1] - 0.7, 0.6], [t + 2.2, -2.8, -1.4 - k * 0.6, 0.7], [T_LACTIC, -2.8, -1.4 - k * 0.6, 0.7]], { hold: true, wobble: 0.04 }));
  });
  return { trips, events };
}

/** Lactic acid fermentation (station F1): the pyruvate becomes lactic acid, NADH gives back NAD+; no CO2. */
export function lactic(): FermPlan {
  const trips: Trip[] = [];
  const events: Ev[] = [];
  const tint = [18.2, 20.6];
  for (let g = 0; g < 2; g++) {
    const pos = add([-3.6, g === 0 ? 1.4 : -1.4, 0.3], [0, 0, 0]);
    for (let j = 0; j < 3; j++) {
      const p = add(pos, CHAIN[j]!);
      const out = [8.2 + j * 0.45, g === 0 ? 2.6 : -2.6, 0.5] as const;
      const keys: Key[] = [[T_LACTIC, -9.5, p[1], 0.5], [T_LACTIC + 1.5, p[0], p[1], p[2]], [tint[g]! + 1.2, p[0], p[1], p[2]], [tint[g]! + 4.6, out[0], out[1], out[2]], [T_ALCOHOL, out[0], out[1], out[2]]];
      trips.push(bead(F_MUSCLE, keys, { hold: true, tintTo: { to: LACTATE, at: tint[g]! } }));
    }
    const t = tint[g]!;
    const q: [number, number, number] = [pos[0] - 1.4, pos[1] - 1.0, 0.7];
    trips.push(go('nadh', F_MUSCLE, 0.45, [[T_LACTIC + 0.2, -9.5, -2.6, 0.6], [t - 0.4, q[0], q[1], q[2]], [t + 0.3, q[0], q[1], q[2]]], { wobble: 0.04, fade: 0.3 }));
    trips.push(go('carrierOff', F_MUSCLE, 0.45, [[t - 0.1, q[0], q[1], q[2]], [t + 2.6, -9.5, -3.4 + g * 0.6, 0.6]], { wobble: 0.04, fade: 0.3 }));
    events.push({ series: 'laktik-asit', t: t + 0.5, amount: 1, dur: 0.6 });
  }
  return { trips, events };
}

/** Alcohol fermentation (station F2): one carbon of each pyruvate leaves as CO2, the other two become ethanol. */
export function alcohol(): FermPlan {
  const trips: Trip[] = [];
  const events: Ev[] = [];
  const tCo2 = [29.2, 32.6];
  for (let g = 0; g < 2; g++) {
    const pos: [number, number, number] = [-3.8, g === 0 ? 1.6 : -1.6, 0.3];
    const t = tCo2[g]!;
    for (let j = 0; j < 3; j++) {
      const p = add(pos, CHAIN[j]!);
      const keys: Key[] = [[T_ALCOHOL, -10.5, p[1], 0.5], [T_ALCOHOL + 1.4 + g * 0.6, p[0], p[1], p[2]]];
      if (j === 2) {
        keys.push([t, p[0], p[1], p[2]]);
        trips.push(bead(F_YEAST, keys));
        trips.push(go('co2', F_YEAST, 0.45, [[t, p[0], p[1], p[2]], [t + 1.6, 0.5, 3.4, 0.6], [t + 3.4, 3.5, 8.0, 0.6], [t + 5.4, 5.5, 12, 0.4]], { wobble: 0.1 }));
        events.push({ series: 'co2-cikis', t: t + 0.9, amount: 1, dur: 0.9 });
      } else {
        const out = [8.0 + j * 0.5, g === 0 ? 1.4 : -1.4, 0.5] as const;
        keys.push([t + 0.4, p[0], p[1], p[2]], [t + 4.0, out[0], out[1], out[2]], [T_COMPARE, out[0], out[1], out[2]]);
        trips.push(bead(F_YEAST, keys, { hold: true, tintTo: { to: ETHANOL, at: t + 0.4 } }));
      }
    }
    const q: [number, number, number] = [pos[0] - 1.4, pos[1] - 1.1, 0.7];
    trips.push(go('nadh', F_YEAST, 0.45, [[T_ALCOHOL + 0.2, -10.5, -2.6, 0.6], [t - 0.3, q[0], q[1], q[2]], [t + 0.4, q[0], q[1], q[2]]], { wobble: 0.04, fade: 0.3 }));
    trips.push(go('carrierOff', F_YEAST, 0.45, [[t, q[0], q[1], q[2]], [t + 2.6, -10.5, -3.4 + g * 0.6, 0.6]], { wobble: 0.04, fade: 0.3 }));
    events.push({ series: 'etanol', t: t + 1.0, amount: 1, dur: 0.6 });
  }
  return { trips, events };
}

/** Yield comparison (station F3): 2 ATP against about 30 ATP from the same glucose. */
export function compare(): Trip[] {
  const out: Trip[] = [];
  out.push(go('glucose', F_COMPARE, 0.7, [[T_COMPARE + 0.3, -6, -2.5, 0.4], [T_FLASK, -6, -2.5, 0.4]], { hold: true, fade: 0.5, spin: 0.3 }));
  out.push(go('glucose', F_COMPARE, 0.7, [[T_COMPARE + 0.3, 4.6, -2.5, 0.4], [T_FLASK, 4.6, -2.5, 0.4]], { hold: true, fade: 0.5, spin: 0.3 }));
  for (let i = 0; i < 2; i++) {
    const x = -6.6 + i * 1.3;
    out.push(go('atp', F_COMPARE, 0.6, [[T_COMPARE + 1.0 + i * 0.4, x, -1.2, 0.5], [T_COMPARE + 1.9 + i * 0.4, x, -0.6, 0.5], [T_FLASK, x, -0.6, 0.5]], { hold: true, upright: true, spin: 0, phase: 0, wobble: 0.02 }));
  }
  for (let i = 0; i < 30; i++) {
    const x = 1.8 + (i % 6) * 1.1;
    const y = -0.6 + Math.floor(i / 6) * 0.9;
    out.push(go('atp', F_COMPARE, 0.6, [[T_COMPARE + 1.6 + i * 0.1, x, -1.4, 0.5], [T_COMPARE + 2.5 + i * 0.1, x, y, 0.5], [T_FLASK, x, y, 0.5]], { hold: true, upright: true, spin: 0, phase: 0, wobble: 0.02 }));
  }
  return out;
}

/** Experiment idea (station F4): CO2 bubbles rise through the sugar water into the balloon. */
export function flask(t0: number): Trip[] {
  const out: Trip[] = [];
  for (let i = 0; i < 14; i++) {
    const t = t0 + 0.4 + i * 0.22;
    const x = (i % 5) * 0.5 - 1.0;
    out.push(go('bubble', F_FLASK, 0.13, [[t, x, -2.6, 0.2], [t + 1.0, x * 0.6, -0.8, 0.1], [t + 1.8, 0, 0.6, 0]], { wobble: 0.05, fade: 0.2 }));
    out.push(go('co2', F_FLASK, 0.3, [[t + 1.4, 0, 1.2, 0], [t + 2.4, 0, 4.0, 0], [t + 3.0, 0, 4.8 + (i % 3) * 0.6, 0.2]], { wobble: 0.08, fade: 0.3 }));
  }
  return out;
}
