import type { Ev } from '../chart';
import type { Trip } from '../flock';
import { go, hash01 } from '../paths';
import { CELL_POS, STOMA, VEIN_X } from './leaf';
import { sunPhotons } from './light';
import type { PhotoCounts } from './rates';

export const LEAF = 0;
export const CELL = 1;
export const CHLORO = 2;
export const INNER = 3;
export const LAB = 4;
export const GRANUM = 5;

/** Station 0 (first visit): sunlight, CO2 entering at the stoma and water climbing the vein. */
export function leafIntro(light: number, end: number): Trip[] {
  const out = sunPhotons(0.1, end, light);
  for (let i = 0; i < 6; i++) {
    const t = 0.2 + i * 0.45;
    out.push(go('co2', LEAF, 0.34, [[t, -6.5 + (i % 3), -5.8, 0.4], [t + 1.1, -3.0, -3.4, 0.2], [t + 1.9, STOMA[0], STOMA[1], 0], [t + 2.8, -1.4, -0.4, 0.1]], { wobble: 0.08 }));
    out.push(go('h2o', LEAF, 0.34, [[t + 0.1, VEIN_X, -6.4, 0.3], [t + 1.5, VEIN_X, -0.3, 0], [t + 2.5, 2.6, 0.5, 0.2]], { wobble: 0.06 }));
  }
  return out;
}

/** Station 1: ingredients arrive at the chloroplasts of one cell. */
export function cellTrips(t0: number, light: number): Trip[] {
  const out: Trip[] = [];
  for (let i = 0; i < 8; i++) {
    const c = CELL_POS[i % 4]!;
    const t = t0 + 0.05 + i * 0.12;
    out.push(go('co2', CELL, 0.3, [[t, -7.5, 4.2, 0.6], [t + 1.3, c[0] - 0.5, c[1] + 0.2, c[2]]], { wobble: 0.1 }));
    out.push(go('h2o', CELL, 0.3, [[t, 7.5, -4.0, 0.6], [t + 1.3, c[0] + 0.4, c[1] - 0.2, c[2]]], { wobble: 0.1 }));
  }
  for (let i = 0, t = t0; t < t0 + 1.2; i++, t += 0.12 / light) {
    const c = CELL_POS[i % 4]!;
    out.push(go('photon', CELL, 0.22, [[t, -7.5, 6.5, 0.4], [t + 1.0, c[0], c[1] + 0.9, c[2]]], { fade: 0.1 }));
  }
  return out;
}

/** Station 2, arrival (İleri): the last metres of the zoom, with the ingredients heading into the chloroplast. */
export function chloroArrive(t0: number, light: number): Trip[] {
  const out: Trip[] = [];
  for (let i = 0; i < 4; i++) {
    const t = t0 + i * 0.35;
    out.push(go('co2', CHLORO, 0.55, [[t, -10, 3, 0.8], [t + 1.8, -2.2 + i * 0.4, 0.4, 0]], { wobble: 0.1 }));
    out.push(go('h2o', CHLORO, 0.55, [[t + 0.1, -9, -4, 0.8], [t + 1.8, -1.6 + i * 0.4, -0.6, 0]], { wobble: 0.1 }));
  }
  for (let i = 0, t = t0; t < t0 + 1.9; i++, t += 0.16 / light) out.push(go('photon', CHLORO, 0.35, [[t, -9, 8, 0.6], [t + 1.2, -3 + (i % 7), 1.9, 0]], { fade: 0.1 }));
  return out;
}

/** Station 5: light lands on the stack of thylakoid sacs. */
export function granumTrips(t0: number, t1: number, light: number): Trip[] {
  const out: Trip[] = [];
  for (let i = 0, t = t0; t < t1 - 0.6; i++, t += 0.18 / light) {
    out.push(go('photon', GRANUM, 0.3, [[t, -10 + (i % 4), 9, 0.8], [t + 1.1, -3.2 + ((i * 5) % 9) * 0.8, 2.9, 1.2]], { fade: 0.1 }));
  }
  return out;
}

/** Station 2, departure: oxygen and the finished sugar leave the chloroplast. */
export function chloroLeave(t0: number, c: PhotoCounts): Trip[] {
  const out: Trip[] = [];
  for (let i = 0; i < c.n; i++) {
    const t = t0 + 0.1 + i * 0.28;
    out.push(go('o2', CHLORO, 0.55, [[t, 0.5 + i * 0.4, 0.5 - (i % 2), 0.2], [t + 1.2, 4.5, 2.4 + (i % 3) * 0.4, 0.4], [t + 2.4, 9.5, 5.4, 0.2]], { wobble: 0.12 }));
  }
  const size = 0.55 * (0.55 + 0.45 * (c.n / 6));
  out.push(go('glucose', CHLORO, size, [[t0, 0.5, -0.5, 0.2], [t0 + 2.2, 9.5, -2.5, 0.3]], { fade: 0.5 }));
  return out;
}

/** Station 0 (second visit): oxygen leaves through the stoma, the sugar travels down the vein. */
export function leafOutro(t0: number, c: PhotoCounts, light: number, end: number): Trip[] {
  const out: Trip[] = [];
  for (const p of sunPhotons(t0, end, light)) out.push(p);
  for (let i = 0; i < c.n; i++) {
    const t = t0 + i * 0.16;
    out.push(go('o2', LEAF, 0.34, [[t, -1.2 + (i % 3) * 0.6, 0.6, 0.3], [t + 0.8, STOMA[0] + 0.1, -0.8, 0], [t + 1.5, STOMA[0], STOMA[1], 0], [t + 2.9, -3.4, -5.3, 0.5]], { wobble: 0.08 }));
  }
  const size = 0.4 * (0.55 + 0.45 * (c.n / 6));
  out.push(go('glucose', LEAF, size, [[t0, 2.8, 0.6, 0.2], [t0 + 0.9, VEIN_X, -0.2, 0], [end + 1, VEIN_X, -5.2, 0]], { fade: 0.4 }));
  return out;
}

/** Station 4: the pond-plant experiment. Bubble count follows the rate; dissolved CO2 follows the CO2 option. */
export function labTrips(t0: number, end: number, rate: number, co2: string): { trips: Trip[]; bubbles: number } {
  const bubbles = Math.min(13, Math.round(10 * rate));
  const out: Trip[] = [];
  for (let i = 0; i < bubbles; i++) {
    const t = t0 + 0.6 + (i * (end - t0 - 3)) / Math.max(1, bubbles);
    const x = 0.1 + (hash01(i) - 0.5) * 0.15;
    out.push(go('bubble', LAB, 0.09 + hash01(i + 5) * 0.04, [[t, x, 0.35, 0.1], [t + 0.9, x + 0.08, 0.95, 0.12], [t + 1.8, x - 0.06, 1.55, 0.1]], { wobble: 0.02, fade: 0.2 }));
  }
  const count = ({ low: 3, normal: 8, high: 16 } as Record<string, number>)[co2] ?? 8;
  for (let i = 0; i < count; i++) {
    const a = hash01(i * 3 + 1) * Math.PI * 2;
    const r = 0.5 + hash01(i + 11) * 1.2;
    const y = -1.9 + hash01(i + 21) * 3.1;
    out.push(go('co2', LAB, 0.22, [[t0, Math.cos(a) * r, y, Math.sin(a) * r], [end, Math.cos(a + 1.3) * r, y + (hash01(i + 31) - 0.5) * 0.6, Math.sin(a + 1.3) * r]], { hold: true, wobble: 0.12 }));
  }
  return { trips: out, bubbles };
}

/** Temel: one continuous flow through the chloroplast (no stages). Events drive the chart. */
export function chloroFlow(c: PhotoCounts, light: number, t0: number, end: number): { trips: Trip[]; events: Ev[]; tGlucose: number } {
  const trips: Trip[] = [];
  const events: Ev[] = [];
  for (let i = 0, t = t0 + 1.0; t < end - 3; i++, t += 0.55 / light) {
    trips.push(go('photon', CHLORO, 0.35, [[t, -9 + (i % 3), 8, 0.6], [t + 1.3, -3.5 + (i % 8) * 0.9, 1.9, 0]], { fade: 0.1 }));
  }
  const tc = (i: number): number => 8 + i * 6.2 * c.k;
  const tGlucose = tc(c.n - 1) + 2.6;
  for (let i = 0; i < c.n; i++) {
    const t = tc(i);
    trips.push(go('co2', CHLORO, 0.55, [[t - 2.6, -10.5, 3.2, 0.8], [t - 1.0, -5.5, 1.4, 0.4], [t, -1.8, 0.4, 0]], { wobble: 0.1 }));
    trips.push(go('h2o', CHLORO, 0.55, [[t - 2.3, -10, -4.2, 0.8], [t - 0.8, -5, -1.4, 0.4], [t + 0.3, -1.0, -0.6, 0]], { wobble: 0.1 }));
    const a = (i / 6) * Math.PI * 2;
    const sx = 3.0 + Math.cos(a) * 0.9;
    const sy = -0.4 + Math.sin(a) * 0.9;
    trips.push(go('carbon', CHLORO, 0.45, [[t, -1.8, 0.4, 0], [t + 2.0, sx, sy, 0.2], [tGlucose, sx, sy, 0.2]], { tint: '#5e5955', fade: 0.3 }));
    const tO = t + 1.6;
    trips.push(go('o2', CHLORO, 0.55, [[tO, 0.0, 0.7, 0.2], [tO + 2.4, 4.5, 3.0, 0.4], [tO + 4.8, 10, 5.4, 0.2]], { wobble: 0.12 }));
    events.push({ series: 'co2-alinan', t: t + 1, amount: 100 / 6, dur: 1.5 });
    events.push({ series: 'glikoz-miktari', t: t + 1, amount: 100 / 6, dur: 1.5 });
    events.push({ series: 'o2-miktari', t: tO + 0.4, amount: 100 / 6, dur: 1.2 });
  }
  const size = 0.55 * (0.55 + 0.45 * (c.n / 6));
  trips.push(go('glucose', CHLORO, size, [[tGlucose - 0.4, 3.0, -0.4, 0.2], [tGlucose + 1.2, 3.4, -0.6, 0.2], [end, 10, -2.6, 0.3]], { fade: 0.6, spin: 0.5 }));
  events.push({ series: 'atp-nadph', t: 45, amount: 20, dur: 44 });
  return { trips, events, tGlucose };
}
