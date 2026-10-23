/**
 * Acid-base indicators with pH -> colour tables (our rgb renderings of the documented colour ranges).
 * - Red cabbage (anthocyanin): red at pH 2, purple 4-6, blue 8, blue-green 10, greenish yellow 12:
 *   https://en.wikipedia.org/wiki/PH_indicator and https://en.wikipedia.org/wiki/Anthocyanin
 * - Phenolphthalein: colourless below 8.3, pink 8.3-10 (fading to colourless above about 13):
 *   https://en.wikipedia.org/wiki/Phenolphthalein
 * - Universal indicator: red <= 3, orange/yellow 4-6, green 7, blue 8-10, violet >= 11:
 *   https://en.wikipedia.org/wiki/Universal_indicator
 * - Litmus: red below about 4.5, blue above about 8.3: https://en.wikipedia.org/wiki/Litmus
 * The exact rgb values and the `ratioForFull` (mL of stock per mL of liquid at which the colour is about 63 % developed)
 * are our own teaching choices, not measurements.
 */
import type { Rgb } from './ions';

export interface Indicator {
  id: string;
  nameTr: string;
  /** [pH, colour] stops in ascending pH order; colour is linearly interpolated, clamped at the ends. */
  stops: ReadonlyArray<readonly [number, Rgb]>;
  ratioForFull: number;
  /** One drop is about 0.05 mL. */
  source: string;
}

const CLEAR: Rgb = [255, 255, 255];

export const INDICATORS: Readonly<Record<string, Indicator>> = {
  'red-cabbage': {
    id: 'red-cabbage', nameTr: 'Kırmızı lahana ayıracı', ratioForFull: 0.12, source: 'https://en.wikipedia.org/wiki/PH_indicator',
    stops: [[2, [215, 45, 70]], [4, [170, 50, 135]], [6, [140, 85, 190]], [8, [75, 100, 205]], [10, [50, 170, 170]], [12, [200, 210, 80]]],
  },
  phenolphthalein: {
    id: 'phenolphthalein', nameTr: 'Fenolftalein', ratioForFull: 0.002, source: 'https://en.wikipedia.org/wiki/Phenolphthalein',
    stops: [[8.2, CLEAR], [8.7, [250, 215, 235]], [9.6, [230, 60, 160]], [12.5, [230, 60, 160]], [13.5, CLEAR]],
  },
  universal: {
    id: 'universal', nameTr: 'Evrensel indikatör', ratioForFull: 0.004, source: 'https://en.wikipedia.org/wiki/Universal_indicator',
    stops: [[2, [230, 40, 40]], [4, [250, 140, 30]], [5, [245, 215, 40]], [7, [90, 190, 70]], [9, [50, 110, 205]], [11, [130, 60, 170]]],
  },
  litmus: {
    id: 'litmus', nameTr: 'Turnusol', ratioForFull: 0.05, source: 'https://en.wikipedia.org/wiki/Litmus',
    stops: [[4.5, [220, 50, 55]], [6.4, [150, 70, 150]], [8.3, [60, 80, 205]]],
  },
};

export function indicatorColor(id: string, pH: number): Rgb {
  const ind = INDICATORS[id];
  if (!ind) return CLEAR;
  const s = ind.stops;
  const first = s[0];
  const last = s[s.length - 1];
  if (!first || !last) return CLEAR;
  if (pH <= first[0]) return first[1];
  if (pH >= last[0]) return last[1];
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1];
    const b = s[i];
    if (!a || !b || pH > b[0]) continue;
    const f = (pH - a[0]) / (b[0] - a[0]);
    return [0, 1, 2].map((c) => Math.round((a[1][c] ?? 0) + f * ((b[1][c] ?? 0) - (a[1][c] ?? 0)))) as unknown as Rgb;
  }
  return last[1];
}

/** How developed the indicator colour is (0..1) for `ml` of stock in `volumeMl` of liquid. */
export function indicatorStrength(id: string, ml: number, volumeMl: number): number {
  const ind = INDICATORS[id];
  if (!ind || volumeMl <= 0 || ml <= 0) return 0;
  return 1 - Math.exp(-(ml / volumeMl) / ind.ratioForFull);
}
