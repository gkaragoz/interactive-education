import type { Ev } from '../chart';
import type { Trip } from '../flock';
import type { Key } from '../math';
import { go, ring } from '../paths';
import { R1_END } from './glyco';
import { add, bead, CHAIN, KREBS, KREBS_R, MAT_A, MAT_B, POOL2, R_MATRIX } from './layout';

export const R2_END = 37.4;

export interface Carrier {
  kind: 'nadh' | 'fadh2';
  t: number;
}

export interface KrebsPlan {
  trips: Trip[];
  events: Ev[];
  carriers: Carrier[];
  /** Times each of the six carbons becomes CO2. */
  co2Times: number[];
}

const OMEGA = (2 * Math.PI) / 4.6;
const K = (dx: number, dy: number): [number, number, number] => [KREBS[0] + dx, KREBS[1] + dy, KREBS[2]];

/** Pyruvate oxidation and the Krebs cycle in the matrix close-up (İleri, station R2). Each carbon ends as CO2. */
export function krebsTrips(): KrebsPlan {
  const trips: Trip[] = [];
  const events: Ev[] = [];
  const co2Times: number[] = [];
  const S = R_MATRIX;
  const mat = [MAT_A, MAT_B] as const;
  const arrive = [R1_END + 1.4, R1_END + 1.8];
  const lapStart = [26.2, 31.6];
  const release = [[28.8, 30.6], [34.4, 36.2]] as const;
  const co2Start = [22.4, 23.4];

  for (let i = 0; i < 6; i++) {
    const g = i < 3 ? 0 : 1;
    const j = i % 3;
    const m = add(mat[g]!, CHAIN[j]!);
    const keys: Key[] = [[R1_END, -9.5, m[1] + 0.3, 0.5], [arrive[g]!, m[0], m[1], m[2]]];
    if (j === 2) {
      keys.push([co2Start[g]! + 0.3, m[0], m[1], m[2]]);
      trips.push(bead(S, keys));
      const t = co2Start[g]!;
      trips.push(go('co2', S, 0.4, [[t, m[0], m[1], m[2]], [t + 1.4, -2.0, 2.8, 0.6], [t + 3.9, -5.5, 5.2, 0.6], [t + 6.4, -10.5, 7.5, 0.4]], { wobble: 0.05 }));
      events.push({ series: 'co2-cikis', t: t + 0.9, amount: 1, dur: 0.9 });
      co2Times.push(t + 0.9);
      continue;
    }
    // acetyl bead: waits at the cycle's door, then runs round the ring until it leaves as CO2
    const w = K(-KREBS_R - 0.5 - 0.35 * j, g === 0 ? 0.4 : -0.4);
    keys.push([arrive[g]! + 2.4, w[0], w[1], w[2]], [lapStart[g]!, w[0], w[1], w[2]]);
    const tr = release[g]![j]!;
    const off = -j * 0.55;
    for (let t = lapStart[g]! + 0.4; t < tr; t += 0.4) {
      const q = ring(KREBS, KREBS_R, Math.PI + (t - lapStart[g]!) * OMEGA + off);
      keys.push([t, q[0], q[1], q[2]]);
    }
    const q = ring(KREBS, KREBS_R, Math.PI + (tr - lapStart[g]!) * OMEGA + off);
    keys.push([tr, q[0], q[1], q[2]]);
    trips.push(bead(S, keys));
    trips.push(go('co2', S, 0.4, [[tr, q[0], q[1], q[2]], [tr + 1.3, q[0] + 0.3, 2.6, 0.6], [tr + 3.6, -2.0, 4.6, 0.6], [tr + 6.1, -10.5, 7.5, 0.4]], { wobble: 0.05 }));
    events.push({ series: 'co2-cikis', t: tr + 0.9, amount: 1, dur: 0.9 });
    co2Times.push(tr + 0.9);
  }

  // water enters the cycle (six used, so the water made at the membrane nets out to six)
  for (let i = 0; i < 6; i++) {
    const t = 26.4 + i * 1.9;
    trips.push(go('h2o', S, 0.34, [[t - 2.4, -1.5, 5.8, 0.6], [t, KREBS[0] - 0.7, KREBS[1] + 1.0, 0.5]], { wobble: 0.06 }));
  }

  // ATP: two from the cycle
  [30.0, 36.0].forEach((t, k) => {
    const from = ring(KREBS, KREBS_R, 1.5 * Math.PI);
    const pool = add(POOL2, [k * 0.9, 0, 0]);
    trips.push(go('atp', S, 0.55, [[t, from[0], from[1], from[2]], [t + 2.6, pool[0], pool[1], pool[2]], [R2_END, pool[0], pool[1], pool[2]]], { hold: true, wobble: 0.04 }));
    events.push({ series: 'atp-toplam', t: t + 0.8, amount: 1, dur: 0.8 });
  });

  // loaded carriers (10 NADH, 2 FADH2 in all) queue up for the membrane
  const carriers: Carrier[] = [
    { kind: 'nadh', t: R1_END + 0.4 },
    { kind: 'nadh', t: R1_END + 0.9 },
    { kind: 'nadh', t: 22.9 },
    { kind: 'nadh', t: 24.0 },
    { kind: 'nadh', t: 27.8 },
    { kind: 'nadh', t: 29.2 },
    { kind: 'nadh', t: 30.5 },
    { kind: 'fadh2', t: 31.0 },
    { kind: 'nadh', t: 33.2 },
    { kind: 'nadh', t: 34.6 },
    { kind: 'nadh', t: 35.8 },
    { kind: 'fadh2', t: 36.3 },
  ];
  carriers.forEach((c, k) => {
    const src: [number, number, number] = k < 2 ? [-9.5, -2.2 - k * 0.5, 0.6] : k < 4 ? add(MAT_A, [0.8, -0.8, 0.3]) : ring(KREBS, KREBS_R, 0.5 * Math.PI);
    const q: [number, number, number] = [-2.2 + (k % 6) * 0.7, -3.3 - Math.floor(k / 6) * 0.55, 0.9];
    trips.push(go(c.kind, S, 0.45, [[c.t, src[0], src[1], src[2]], [Math.max(c.t + 1.8, k < 2 ? R1_END + 2.4 : 0), q[0], q[1], q[2]], [R2_END, q[0], q[1], q[2]]], { hold: true, wobble: 0.04 }));
  });
  return { trips, events, carriers, co2Times };
}
