import type { Ev } from '../chart';
import type { Trip } from '../flock';
import { go } from '../paths';
import { CELL_MITO } from './stations';
import { R_CELL, R_MITO } from './layout';

const mito = (i: number): [number, number, number] => {
  const c = CELL_MITO[i % CELL_MITO.length]!;
  return [c[0], c[1], c[2] + 0.3];
};

/** R0 before the stages: glucose and oxygen come in from outside the cell and head for the mitochondria. */
export function cellIntro(): Trip[] {
  const out: Trip[] = [];
  for (let i = 0; i < 3; i++) {
    const t = -1.6 + i * 0.95;
    const m = mito(i * 2);
    out.push(go('glucose', R_CELL, 0.6, [[t, -12.5, 3.5 - i * 1.6, 0.8], [t + 1.6, -6.5, 1.0 - i, 0.6], [t + 3.6, m[0] - 1.0, m[1], m[2]]], { wobble: 0.08, fade: 0.5 }));
  }
  for (let i = 0; i < 6; i++) {
    const t = -1.2 + i * 0.6;
    const m = mito(i);
    out.push(go('o2', R_CELL, 0.4, [[t, -12.5, -5 + (i % 3), 0.8], [t + 1.5, -6.0, -2.5, 0.6], [t + 3.2, m[0], m[1] - 0.6, m[2]]], { wobble: 0.1 }));
  }
  return out;
}

/** R0 after the stages: CO2 and water leave the cell, ATP goes off to power the cell's work. */
export function cellOutro(t0: number, end: number): Trip[] {
  const out: Trip[] = [];
  for (let i = 0; i < 6; i++) {
    const t = t0 + 0.3 + i * 0.45;
    const m = mito(i);
    out.push(go('co2', R_CELL, 0.4, [[t, m[0], m[1] + 0.3, m[2]], [t + 1.8, 7.5, 1 + i * 0.6, 0.8], [t + 3.6, 13, 3.5 + i * 0.4, 0.8]], { wobble: 0.1 }));
    out.push(go('h2o', R_CELL, 0.35, [[t + 0.2, m[0], m[1] - 0.3, m[2]], [t + 2.0, 6.0, -4.2, 0.8], [t + 4.0, 12, -6.0 - i * 0.3, 0.8]], { wobble: 0.1 }));
  }
  const targets: [number, number, number][] = [[-3.4, 3.3, 0], [-7, 1, 0.5], [6.5, 3.0, 0.4], [7.5, -1.0, 0.6], [-1.5, 4.0, 0.2], [2.0, -4.0, 0.4]];
  for (let i = 0; i < 10; i++) {
    const t = t0 + 0.8 + i * 0.5;
    const m = mito(i);
    const tg = targets[i % targets.length]!;
    out.push(go('atp', R_CELL, 0.5, [[t, m[0], m[1], m[2]], [t + 2.2, tg[0], tg[1], tg[2] + 0.6], [Math.min(t + 3.4, end), tg[0], tg[1] + 0.2, tg[2] + 0.6]], { wobble: 0.05, fade: 0.5 }));
  }
  return out;
}

/** Temel: one coarse view. Glucose and oxygen go into the mitochondrion; carbon dioxide, water and ATP come out. */
export function coarseFlow(t0: number, end: number): { trips: Trip[]; events: Ev[] } {
  const trips: Trip[] = [];
  const events: Ev[] = [];
  trips.push(go('glucose', R_MITO, 0.7, [[t0 + 0.6, -11, 4.2, 0.6], [t0 + 4.6, -4.0, 0.8, 0.5], [t0 + 7.4, 0.2, 0.3, 0.4], [t0 + 8.4, 1.6, 0.3, 0.4]], { wobble: 0.05, fade: 0.6, spin: 0.4 }));
  events.push({ series: 'glikoz-kalan', t: t0 + 7.8, amount: -100, dur: 3.5 });
  for (let i = 0; i < 6; i++) {
    const ti = 14 + i * 6.2;
    trips.push(go('co2', R_MITO, 0.4, [[ti, 2.0 + (i % 3) * 0.6, 0.4, 0.6], [ti + 2.0, 0.5, 2.4, 0.7], [ti + 4.5, -9.5, 7.0, 0.5]], { wobble: 0.06 }));
    events.push({ series: 'co2-cikis', t: ti + 1.0, amount: 1, dur: 1 });
    const to = 12 + i * 6.2;
    trips.push(go('o2', R_MITO, 0.4, [[to, -11, -4.2 + (i % 2), 0.6], [to + 2.8, -3.0, -1.6, 0.6], [to + 4.6, 2.5 + (i % 3) * 0.5, -0.6, 0.5]], { wobble: 0.06 }));
    events.push({ series: 'o2-kullanimi', t: to + 4.6, amount: 100 / 6, dur: 1.2 });
    const tw = 30 + i * 3.6;
    trips.push(go('h2o', R_MITO, 0.35, [[tw, 4.5, -0.4, 0.6], [tw + 2.2, 8.0, -3.4, 0.6], [tw + 4.4, 11.5, -5.2, 0.5]], { wobble: 0.06 }));
  }
  for (let i = 0; i < 30; i++) {
    const t = 18 + i * 1.12;
    const x = 2.2 + (i % 10) * 0.9;
    const y = 4.2 - Math.floor(i / 10) * 0.9;
    trips.push(go('atp', R_MITO, 0.5, [[t, 3.4, 0.4, 0.8], [t + 2.2, x, y, 0.8], [end, x, y, 0.8]], { hold: true, upright: true, spin: 0, phase: 0, wobble: 0.02 }));
    events.push({ series: 'atp-toplam', t: t + 1.0, amount: 1, dur: 0.8 });
  }
  return { trips, events };
}
