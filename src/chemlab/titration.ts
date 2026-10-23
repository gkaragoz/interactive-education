/**
 * Titration curves computed with the same rules and pH solver as the lab: pH versus added titrant volume. Strong
 * acid / strong base has its steep jump through pH 7 at the equivalence point; a weak acid starts higher, buffers around
 * pH = pKa at half-equivalence and ends above 7 (https://en.wikipedia.org/wiki/Titration ,
 * https://en.wikipedia.org/wiki/Equivalence_point , https://en.wikipedia.org/wiki/Henderson%E2%80%93Hasselbalch_equation).
 */
import { addTo } from './mixture';
import { phOfMix } from './ph';
import { solution } from './reagents';
import { stepReactions } from './reactions';
import { ACID_BASE_RULES } from './rulesAcidBase';
import { newVessel } from './vessel';

export interface TitrationOptions {
  /** Flask contents: volume (mL) and solutes as [aq key, mol/L]. */
  flask: { volumeMl: number; solutes: ReadonlyArray<readonly [string, number]> };
  /** Burette solution as [aq key, mol/L]. */
  titrant: ReadonlyArray<readonly [string, number]>;
  maxMl: number;
  stepMl: number;
}
export interface TitrationPoint {
  ml: number;
  ph: number;
}

const ctx = { fromAir: (): void => undefined, observe: (): void => undefined };

export function titrationCurve(o: TitrationOptions): TitrationPoint[] {
  const out: TitrationPoint[] = [];
  const n = Math.round(o.maxMl / o.stepMl);
  for (let i = 0; i <= n; i++) {
    const ml = Math.round(i * o.stepMl * 1e6) / 1e6;
    const v = newVessel('t', 'beaker250', undefined, 25);
    const a = solution(o.flask.volumeMl, o.flask.solutes);
    for (const [k, x] of Object.entries(a.mix)) addTo(v.mix, k, x);
    if (ml > 0) {
      const b = solution(ml, o.titrant);
      for (const [k, x] of Object.entries(b.mix)) addTo(v.mix, k, x);
    }
    for (let r = 0; r < 3; r++) stepReactions(ACID_BASE_RULES, v, 50, ctx);
    const ph = phOfMix(v.mix);
    if (ph !== null) out.push({ ml, ph });
  }
  return out;
}

/** Volume with the steepest pH rise (the equivalence point estimate). */
export function equivalenceMl(curve: readonly TitrationPoint[]): number {
  let best = 0;
  let at = 0;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (!a || !b) continue;
    const slope = (b.ph - a.ph) / (b.ml - a.ml);
    if (slope > best) {
      best = slope;
      at = (a.ml + b.ml) / 2;
    }
  }
  return at;
}
