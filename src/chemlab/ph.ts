/**
 * pH from composition: charge balance solved by bisection on log10[H+] (strong acids and bases count as their ions,
 * weak acids/bases and ampholytes come from the protic families). Activity coefficients and the temperature
 * dependence of Kw are ignored (simplification). Background: https://en.wikipedia.org/wiki/PH ,
 * https://en.wikipedia.org/wiki/Henderson%E2%80%93Hasselbalch_equation , https://en.wikipedia.org/wiki/Charge_balance_(chemistry)
 */
import { alphas, FAMILIES, familyOf, KW } from './families';
import { liquidVolumeMl } from './mixture';
import { speciesOf, type Mix } from './species';

/** pH of the solution in a mixture, or null when there is no liquid. */
export function phOfMix(mix: Mix, volumeMl = liquidVolumeMl(mix)): number | null {
  if (volumeMl < 1e-6) return null;
  const vL = volumeMl / 1000;
  let fixed = 0;
  const totals = new Map<string, number>();
  for (const [k, n] of Object.entries(mix)) {
    const sp = speciesOf(k);
    if (sp.phase !== 'aq' || k === 'H+' || k === 'OH-') continue;
    const fam = familyOf(k);
    if (fam) totals.set(fam.id, (totals.get(fam.id) ?? 0) + n / vL);
    else if (sp.charge !== 0) fixed += (sp.charge * n) / vL;
  }
  const g = (x: number): number => {
    const h = Math.pow(10, x);
    let s = h - KW / h + fixed;
    for (const f of FAMILIES) {
      const c = totals.get(f.id);
      if (!c) continue;
      const a = alphas(f, h);
      f.levels.forEach((l, i) => {
        s += c * l.charge * (a[i] ?? 0);
      });
    }
    return s;
  };
  let lo = -14.5; // very basic
  let hi = 1.5; // very acidic
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) hi = mid;
    else lo = mid;
  }
  return -(lo + hi) / 2;
}
