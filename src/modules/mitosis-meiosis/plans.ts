import type { Rng } from '../../core';
import { buildMeiosis } from './meiosisPlan';
import { buildMitosis } from './mitosisPlan';
import type { Plan } from './plan';

export function parsePairs(o: Record<string, string>): number {
  return o['chromosome-set'] === '2n6' ? 3 : 2;
}

/** Bit i set = pair i is oriented the other way at metaphase I (independent assortment): 'a' = 0, 'b' = all flipped, anything else ('karisik') mixes the pairs. */
export function parseAssortment(o: Record<string, string>): number {
  const raw = o.assortment;
  if (raw === 'a') return 0;
  if (raw === 'b') return 7;
  const v = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(v) ? v : 2;
}

export function buildPlan(trackId: string, np: number, assort: number, rngFactory: (seed: number) => Rng): Plan {
  switch (trackId) {
    case 'mayoz-1':
      return buildMeiosis('m1', np, assort, rngFactory);
    case 'mayoz-2':
      return buildMeiosis('m2', np, assort, rngFactory);
    case 'mayoz-1-ayrilmama':
      return buildMeiosis('nd', np, 0, rngFactory);
    default:
      return buildMitosis(np, rngFactory(7));
  }
}
