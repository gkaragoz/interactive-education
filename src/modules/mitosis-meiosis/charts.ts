import { ramp } from './keys';

type ChartFn = (t: number) => Record<string, number>;

/**
 * Chart values follow the track data: chromosome count (centromeres) and cells jump as steps, DNA in C units per cell
 * ramps during S. `u` scales the counts for the 2n=6 option (np = 3 pairs).
 */
export function chartMitosis(np: number): ChartFn {
  const n = 2 * np;
  return (t) => ({
    'chromosome-count': t < 26 ? n : t < 42 ? 2 * n : n,
    'dna-amount': t < 4 ? 2 : t < 8 ? ramp(t, 4, 8, 2, 4) : t < 42 ? 4 : 2,
    'cell-count': t < 42 ? 1 : 2,
  });
}

export function chartMeiosis1(np: number): ChartFn {
  const n = 2 * np;
  return (t) => ({
    'chromosome-count': t < 45 ? n : np,
    'dna-amount': t < 45 ? 4 : 2,
    'cell-count': t < 43 ? 1 : 2,
  });
}

export function chartMeiosis2(np: number): ChartFn {
  return (t) => ({
    'chromosome-count': t < 17 ? np : t < 35 ? 2 * np : np,
    'dna-amount': t < 35 ? 2 : 1,
    'cell-count': t < 34 ? 2 : 4,
  });
}

/** Non-disjunction: follows the cell that gets the extra chromosome (n+1). */
export function chartNondisjunction(np: number): ChartFn {
  const n = 2 * np;
  return (t) => ({
    'chromosome-count': t < 36 ? n : np + 1,
    'cell-count': t < 34 ? 1 : t < 46 ? 2 : 4,
  });
}
