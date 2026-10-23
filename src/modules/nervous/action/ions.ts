import { Vector3 } from 'three';
import { mulberry32 } from '../../../core';
import type { Kit } from '../kit';
import { COLORS } from '../palette';
import { InstancePool } from '../pool';
import { makeWander, walkerAt, type Walker } from '../walk';
import { K_DX, K_OUT, K_PUMP, NA_DX, NA_IN, NA_PUMP, PUMP_DX, SITES, lagAt, type Transit } from './model';

const R = 0.22;
const OUT_MOUTH = 3.7;
const IN_MOUTH = 1.45;

interface Ion {
  walker: Walker;
  /** Seconds the local clock of this ion runs behind the recording site. */
  lag: number;
}

export interface IonField {
  at(t: number): void;
  /** Position of one ambient Na+ (outside) or K+ (inside) ion, for legend labels. */
  ref(kind: 'na' | 'k', t: number): [number, number, number];
}

const v = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);

/** Na+ (red) and K+ (blue-violet): ambient ions that jiggle on their side of the membrane and the ions that cross through the channels and pumps. */
export function buildIons(kit: Kit): IonField {
  const rng = mulberry32(77);
  const na: Ion[] = [];
  const k: Ion[] = [];
  const leg = (tr: Transit, a: Vector3, b: Vector3, home: Vector3): Walker['legs'][number] => ({ t0: tr.t0, t1: tr.t1, a, b, home });
  const mk = (home0: Vector3, lag: number, legs: Walker['legs'] = []): Ion => ({
    walker: { wander: makeWander(rng), home0, legs, radius: 1 },
    lag,
  });

  for (const sx of SITES) {
    const lag = lagAt(sx);
    const xNa = sx + NA_DX;
    const xK = sx + K_DX;
    const xP = sx + PUMP_DX;
    for (const w of [1, -1]) {
      for (let j = 0; j < 3; j++) {
        na.push(
          mk(v(xNa + (j - 1) * 0.75, w * (4.5 + 0.5 * j), -0.3 - 0.5 * j), lag, [
            leg(NA_IN[j]!, v(xNa, w * OUT_MOUTH, 0), v(xNa, w * IN_MOUTH, 0), v(xNa + (j - 1) * 0.8, w * (0.55 + 0.3 * j), -0.5 - 0.4 * j)),
            leg(NA_PUMP[j]!, v(xP - 0.25, w * IN_MOUTH, 0), v(xP - 0.25, w * OUT_MOUTH, 0), v(xP + (j - 1) * 0.8, w * (4.4 + 0.4 * j), -0.4 - 0.4 * j)),
          ]),
        );
      }
      for (let j = 0; j < 2; j++) {
        k.push(
          mk(v(xK + (j - 0.5) * 0.7, w * (0.6 + 0.35 * j), -0.4 - 0.5 * j), lag, [
            leg(K_OUT[j]!, v(xK, w * IN_MOUTH, 0), v(xK, w * OUT_MOUTH, 0), v(xK + (j - 0.5) * 0.9, w * (4.4 + 0.5 * j), -0.5 - 0.4 * j)),
            leg(K_PUMP[j]!, v(xP + 0.28, w * OUT_MOUTH, 0), v(xP + 0.28, w * IN_MOUTH, 0), v(xP + (j - 0.5) * 0.8, w * (0.7 + 0.3 * j), -0.6)),
          ]),
        );
      }
    }
  }
  // ambient: Na+ crowd outside, K+ crowd inside, a few of each on the "wrong" side
  const outY = (): number => (rng() < 0.5 ? 1 : -1) * (4.0 + rng() * 2.3);
  const inY = (): number => (rng() * 2 - 1) * 1.25;
  const ambient = kit.detail === 0 ? 0.5 : 1;
  const place = (list: Ion[], n: number, y: () => number): void => {
    for (let i = 0; i < Math.round(n * ambient); i++) list.push(mk(v((rng() * 2 - 1) * 9.6, y(), -0.3 - rng() * 2.8), 0));
  };
  const a0 = na.length;
  place(na, 26, outY);
  const b0 = k.length;
  place(k, 20, inY);
  place(na, 6, inY);
  place(k, 6, outY);
  // legend ions: easy to find, near the middle of the picture
  const pick = (list: Ion[], from: number, ok: (p: Vector3) => boolean): number => {
    const found = list.findIndex((ion, idx) => idx >= from && ok(ion.walker.home0));
    return found < 0 ? from : found;
  };
  const refNa = pick(na, a0, (h) => Math.abs(h.x) < 4 && Math.abs(h.y) > 4 && Math.abs(h.y) < 4.9);
  const refK = pick(k, b0, (h) => Math.abs(h.x) < 4 && Math.abs(h.y) < 1);

  const mat = kit.clay('nv-ion');
  const naPool = new InstancePool(null, mat, na.length, 14);
  const kPool = new InstancePool(null, mat, k.length, 14);
  for (const [pool, n, color] of [
    [naPool, na.length, COLORS.sodium],
    [kPool, k.length, COLORS.potassium],
  ] as const) {
    for (let i = 0; i < n; i++) pool.setColor(i, color);
    kit.root.add(pool.mesh);
    kit.track(pool);
  }
  const p = new Vector3();
  const place2 = (pool: InstancePool, list: Ion[], t: number): void => {
    list.forEach((ion, i) => {
      walkerAt(ion.walker, t - ion.lag, kit.wander, p);
      pool.set(i, p, R);
    });
    pool.commit();
  };
  return {
    at(t) {
      place2(naPool, na, t);
      place2(kPool, k, t);
    },
    ref(kind, t) {
      const ion = kind === 'na' ? na[refNa]! : k[refK]!;
      walkerAt(ion.walker, t, kit.wander, p);
      return [p.x, p.y, p.z + 0.4];
    },
  };
}
