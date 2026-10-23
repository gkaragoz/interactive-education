import type { Ev } from '../chart';
import type { Trip } from '../flock';
import type { Key } from '../math';
import { go, ring, still } from '../paths';
import { DEPOT, RING_C, RING_R, X } from './inner';
import type { PhotoCounts } from './rates';

const S = 3;
export const SLATE = '#5e5955';

/** An ATP synthase that turns only inside the given windows [t0, t1, speed]; the angle is continuous across the joins. */
export function rotor(station: number, pos: readonly [number, number, number], size: number, t0: number, t1: number, windows: readonly (readonly [number, number, number])[], base?: readonly [number, number, number]): Trip[] {
  const out: Trip[] = [];
  let cursor = t0;
  let angle = 0;
  const seg = (a: number, b: number, speed: number): void => {
    out.push(go('atpSynthase', station, size, [[a, pos[0], pos[1], pos[2]], [b, pos[0], pos[1], pos[2]]], { upright: true, rotor: true, spin: speed, phase: angle - speed * a, fade: 0.001, hold: true, ...(base ? { base } : {}) }));
    angle += speed * (b - a);
  };
  for (const [a, b, speed] of windows) {
    if (a > cursor) seg(cursor, a, 0);
    seg(a, b, speed);
    cursor = b;
  }
  if (t1 > cursor) seg(cursor, t1, 0);
  return out;
}

export interface InnerPlan {
  trips: Trip[];
  events: Ev[];
  /** Time the glucose is complete in the depot. */
  tGlucose: number;
  /** Start of each Calvin turn. */
  turns: number[];
  /** Last time the light reactions have made something. */
  tLight: number;
}

/** The light-dependent reactions and the Calvin cycle in the chloroplast (İleri, station 3). */
export function innerTrips(c: PhotoCounts, light: number, end: number): InnerPlan {
  const { n, k, atp, protons } = c;
  const trips: Trip[] = [];
  const events: Ev[] = [];
  const nW = 2 * n;
  const tw = (i: number): number => 14.4 + i * 0.62 * k;
  const ts = (j: number): number => 26.2 + j * 3.3 * k;
  const tD = (j: number): number => ts(j) + 3.0;
  const turns = Array.from({ length: n }, (_, j) => ts(j));
  const up = { upright: true, spin: 0 } as const;
  const flip = { ...up, base: [Math.PI, 0, 0] } as const;

  // fixed machinery in the membrane (the extra copies make it look populated)
  trips.push(still('psII', S, 1.45, [X.psII, 0, 0], 0, end, { ...flip, phase: 0.4 }));
  trips.push(still('cyt', S, 0.85, [X.cyt, 0.05, 0], 0, end, up));
  trips.push(still('psI', S, 1.45, [X.psI, 0, 0], 0, end, { ...flip, phase: 1.1 }));
  trips.push(still('psII', S, 1.45, [X.psII + 2.6, 0, -3.0], 0, end, { ...flip, phase: 2.3 }));
  trips.push(still('psI', S, 1.45, [X.psI - 2.4, 0, -3.0], 0, end, { ...flip, phase: 0.2 }));
  trips.push(still('cyt', S, 0.85, [X.cyt + 1.6, 0.05, 3.0], 0, end, up));
  trips.push(still('psII', S, 1.45, [X.psII + 0.8, 0, 3.0], 0, end, { ...flip, phase: 3.1 }));
  trips.push(still('atpSynthase', S, 1.5, [X.atpase + 2.8, 0.0, -2.6], 0, end, { ...up, phase: 1.0 }));
  trips.push(still('atpSynthase', S, 1.5, [X.atpase - 2.0, 0.0, 2.8], 0, end, { ...up, phase: 2.0 }));
  trips.push(still('rubisco', S, 0.6, [RING_C[0] - RING_R - 0.1, RING_C[1], 0.1], 0, end, { wobble: 0.05, spin: 0.2 }));

  // photons absorbed by the photosystems
  const step = 0.5 / light;
  for (let i = 0, t = 9.0; t < 25.5; i++, t += step) {
    const tx = i % 2 === 0 ? X.psII : X.psI;
    trips.push(go('photon', S, 0.3, [[t, -11 + (i % 4), -9.5, 0.5], [t + 1.5, tx + ((i * 7) % 5) * 0.12 - 0.25, -1.5, 0]], { fade: 0.12 }));
  }

  // water -> photosystem II; oxygen out; electrons along the membrane
  for (let i = 0; i < nW; i++) {
    const t = tw(i);
    trips.push(go('h2o', S, 0.3, [[t - 2.2, -9.4, -3.8, 0.6], [t - 1.0, -7.6, -2.5, 0.3], [t, X.psII, -1.25, 0]], { wobble: 0.08 }));
    const e: Key[] = [[t + 0.3, X.psII, 0.9, 0], [t + 1.2, -4.5, 1.15, 0.2], [t + 2.0, X.cyt, 0.55, 0], [t + 2.7, -1.2, 1.0, 0], [t + 3.2, X.psI, 0.65, 0], [t + 3.9, 1.7, 2.4, 0]];
    trips.push(go('electron', S, 0.16, e, { fade: 0.15 }));
  }
  let tLight = 0;
  for (let j = 0; j < n; j++) {
    const tO = tw(2 * j + 1) + 0.8;
    trips.push(go('o2', S, 0.3, [[tO - 0.6, X.psII, -1.3, 0], [tO + 1.2, -7.7, -2.4, 0.2], [tO + 3.2, -10.4, -2.0, 0.1]], { wobble: 0.1 }));
    events.push({ series: 'o2-miktari', t: tO, amount: 100 / 6, dur: 1.2 });
    // NADP+ takes two electrons at photosystem I and leaves as NADPH; the ring uses it in turn j
    const te = tw(2 * j + 1) + 3.9;
    tLight = Math.max(tLight, te);
    const tu = ts(j) + 1.5;
    trips.push(go('carrierOff', S, 0.32, [[te - 2.6, 3.2, 5.0, 0.5], [te - 0.2, 1.5, 2.8, 0.3]], { wobble: 0.06 }));
    trips.push(go('nadph', S, 0.32, [[te - 0.3, 1.5, 2.8, 0.3], [te + 2.8, 3.3, 4.9, 0.4], [tu - 1.0, 3.3, 5.0, 0.4], [tu, RING_C[0] - 1.0, RING_C[1] - 1.7, 0.2]], { wobble: 0.06 }));
    trips.push(go('carrierOff', S, 0.32, [[tu - 0.1, RING_C[0] - 1.0, RING_C[1] - 1.7, 0.2], [tu + 2.4, 1.6, 3.0, 0.3]], { wobble: 0.06 }));
    events.push({ series: 'atp-nadph', t: te, amount: 100 / 15, dur: 1 });
    events.push({ series: 'atp-nadph', t: tu + 0.2, amount: -100 / 15, dur: 1 });
  }

  // protons: released in the lumen, pumped by the carrier chain, then flow back through ATP synthase
  const rel: { t: number; from: Key[] }[] = [];
  for (let i = 0; i < nW; i++) {
    for (let q = 0; q < 2; q++) {
      const t = tw(i) + 0.3 + q * 0.2;
      rel.push({ t, from: [[t, X.psII + 0.4, -1.5, 0.1 * q]] });
    }
  }
  for (let p = 0; p < protons - 2 * nW; p++) {
    const t = 16.5 + p * 2.2 * k;
    rel.push({ t, from: [[t, X.cyt, 2.8, 0.3], [t + 1.0, X.cyt, 0.0, 0.2], [t + 2.0, X.cyt + 0.1, -1.7, 0.2]] });
  }
  rel.sort((a, b) => a.t - b.t);
  const flow: number[] = [];
  rel.forEach((r, m) => {
    const arrive = r.from[r.from.length - 1]![0];
    const tf = Math.max(18.6 + m * 0.2 * k, arrive + 1.4, (flow[m - 1] ?? 0) + 0.15);
    flow.push(tf);
    const keys: Key[] = [...r.from];
    const tWait = Math.min(arrive + 1.2, tf - 1.0);
    if (tWait > arrive) keys.push([tWait, -4.2 + (m % 9) * 1.0, -1.7 - (m % 3) * 0.7, ((m % 4) - 1.5) * 0.6]);
    keys.push([tf - 0.1, X.atpase, -1.3, 0], [tf + 0.5, X.atpase, 0.2, 0], [tf + 1.3, X.atpase + 0.1, 3.9, 0]);
    trips.push(go('hplus', S, 0.14, keys, { wobble: 0.1 }));
  });
  for (let j = 0; j < atp; j++) {
    const tA = (flow[3 * j + 2] ?? flow[flow.length - 1] ?? 20) + 0.5;
    tLight = Math.max(tLight, tA + 0.4);
    events.push({ series: 'atp-nadph', t: tA + 0.4, amount: 100 / 15, dur: 1 });
    const keys: Key[] = [[tA - 0.2, X.atpase, 3.5, 0], [tA + 2.2, X.atpase - 0.2, 4.9, 0.2]];
    if (j < n) {
      const tu = ts(j) + 0.8;
      keys.push([tu - 0.9, 4.5, 5.2, 0.3], [tu, RING_C[0] - 0.6, RING_C[1] - 1.9, 0.2]);
      trips.push(go('atp', S, 0.3, keys, { wobble: 0.05 }));
      trips.push(go('adp', S, 0.3, [[tu - 0.1, RING_C[0] - 0.6, RING_C[1] - 1.9, 0.2], [tu + 2.6, X.atpase - 0.4, 3.4, 0.2]], { wobble: 0.05 }));
      events.push({ series: 'atp-nadph', t: tu + 0.2, amount: -100 / 15, dur: 1 });
    } else {
      keys.push([end, X.atpase + 0.6 + (j - n) * 1.1, 4.4, 0.5]);
      trips.push(go('atp', S, 0.3, keys, { wobble: 0.05, hold: true }));
    }
  }

  // Calvin cycle: CO2 captured, its carbon runs round the ring and joins the sugar in the depot
  const lap = Math.PI / 4;
  for (let m = 0; m < 4; m++) {
    const keys: Key[] = [];
    for (let i = 0; 26 + i * 0.75 <= end + 0.75; i++) {
      const p = ring(RING_C, RING_R, Math.PI - (m * Math.PI) / 2 - i * lap);
      keys.push([26 + i * 0.75, p[0], p[1], p[2]]);
    }
    trips.push(go('carbon', S, 0.24, keys, { tint: '#9db36f', hold: true, fade: 1.0 }));
  }
  const tGlucose = tD(n - 1) + 0.5;
  for (let j = 0; j < n; j++) {
    const t = ts(j);
    trips.push(go('co2', S, 0.3, [[t - 2.2, -1.8, 11.0, 0.5], [t - 0.9, -0.6, 8.6, 0.3], [t, RING_C[0] - RING_R - 0.2, RING_C[1] + 0.1, 0.1]], { wobble: 0.08 }));
    const keys: Key[] = [[t + 0.05, RING_C[0] - RING_R, RING_C[1], 0]];
    for (let i = 1; i <= 4; i++) {
      const p = ring(RING_C, RING_R, Math.PI + i * lap);
      keys.push([t + 0.05 + i * 0.6, p[0], p[1], p[2]]);
    }
    const a = (j / 6) * Math.PI * 2;
    const sx = DEPOT[0] + Math.cos(a) * 0.62;
    const sy = DEPOT[1] + Math.sin(a) * 0.62;
    keys.push([tD(j), sx, sy, 0], [tGlucose, sx, sy, 0]);
    trips.push(go('carbon', S, 0.28, keys, { tint: SLATE, fade: 0.3 }));
    events.push({ series: 'co2-alinan', t: tD(j), amount: 100 / 6, dur: 1.5 });
    events.push({ series: 'glikoz-miktari', t: tD(j), amount: 100 / 6, dur: 1.5 });
  }
  const size = 0.4 * (0.55 + 0.45 * (n / 6));
  trips.push(go('glucose', S, size, [[tGlucose - 0.4, DEPOT[0], DEPOT[1], 0], [end, DEPOT[0] + 0.4, DEPOT[1] + 0.5, 0.1]], { hold: true, fade: 0.7, spin: 0.5 }));

  // ATP synthase turns while protons flow
  trips.push(...rotor(S, [X.atpase, 0, 0], 1.5, 0, end, [[flow[0] ?? 18.6, (flow[flow.length - 1] ?? 24) + 1.2, 5]]));
  return { trips, events, tGlucose, turns, tLight };
}
