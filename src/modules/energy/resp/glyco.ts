import type { Ev } from '../chart';
import type { Trip } from '../flock';
import type { Key } from '../math';
import { go } from '../paths';
import { add, bead, CHAIN, G, POOL, PYR_A, PYR_B, R_MITO, TIP } from './layout';

/** End of the overview scene (the pyruvates have reached the mitochondrion; the next station is the matrix). */
export const R1_END = 19.6;
/** Times the two pyruvates reach the entrance. */
export const TIP_TIMES = [18.4, 19.0] as const;

/** Glycolysis in the cytoplasm of the overview (İleri, station R1): one glucose, six carbons, tracked bead by bead. */
export function glycoTrips(): { trips: Trip[]; events: Ev[] } {
  const trips: Trip[] = [];
  const events: Ev[] = [];
  const S = R_MITO;
  trips.push(go('glucose', S, 0.55, [[6.0, -11, 4.2, 0.5], [8.8, G[0], G[1], G[2]], [10.6, G[0], G[1], G[2]]], { wobble: 0.04, fade: 0.5, spin: 0.4 }));
  events.push({ series: 'glikoz-kalan', t: 10.6, amount: -100, dur: 1.9 });
  for (let i = 0; i < 6; i++) {
    const g = i < 3 ? 0 : 1;
    const a = (i / 6) * Math.PI * 2;
    const ringPos = add(G, [Math.cos(a) * 0.75, Math.sin(a) * 0.75, 0]);
    const p = add(g === 0 ? PYR_A : PYR_B, CHAIN[i % 3]!);
    const tLeave = TIP_TIMES[g]! - 1.8;
    const e = add(TIP, [CHAIN[i % 3]![0] - 0.2 * g, g === 0 ? 0.5 : -0.4, 0]);
    const keys: Key[] = [[10.0, ringPos[0], ringPos[1], ringPos[2]], [10.7, ringPos[0], ringPos[1], ringPos[2]], [12.8, p[0], p[1], p[2]], [tLeave, p[0], p[1], p[2]], [TIP_TIMES[g]!, e[0], e[1], e[2]]];
    trips.push(bead(S, keys, { fade: 0.4 }));
  }
  // two ATP (net gain) gather in a pool; two NADH go in with the pyruvates
  [14.6, 16.2].forEach((t, k) => {
    const pool = add(POOL, [k * 0.9, 0, 0]);
    trips.push(go('atp', S, 0.5, [[t, -5.0, -0.8, 0.7], [t + 2.4, pool[0], pool[1], pool[2]], [R1_END, pool[0], pool[1], pool[2]]], { hold: true, wobble: 0.04 }));
    events.push({ series: 'atp-toplam', t: t + 0.8, amount: 1, dur: 0.8 });
  });
  [13.4, 14.4].forEach((t, k) => {
    trips.push(go('nadh', S, 0.4, [[t, G[0] + 0.6, G[1] - 0.7, 0.6], [t + 2.2, -4.0, -1.0 - k * 0.5, 0.7], [TIP_TIMES[k]! + 0.3, TIP[0], TIP[1] - 0.9, 0.7]], { wobble: 0.04, fade: 0.4 }));
  });
  return { trips, events };
}

/** Thirty ATP gather in the mitochondrion overview after the electron transport (station R1, second visit). */
export function yieldTokens(t0: number, end: number): Trip[] {
  const out: Trip[] = [];
  for (let i = 0; i < 30; i++) {
    const x = 2.2 + (i % 10) * 0.9;
    const y = 4.2 - Math.floor(i / 10) * 0.9;
    out.push(go('atp', R_MITO, 0.5, [[t0 + i * 0.12, x - 0.3, y - 0.8, 0.8], [t0 + i * 0.12 + 0.8, x, y, 0.8], [end, x, y, 0.8]], { hold: true, upright: true, spin: 0, phase: 0, wobble: 0.02 }));
  }
  return out;
}
