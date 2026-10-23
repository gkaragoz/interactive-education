/**
 * Reagent shelf: bottles and jars the learner can draw from. Solutions are built so that the volume model returns exactly
 * the poured volume; solids are measured in grams.
 * Concentrations: vinegar 5 % w/w acetic acid (https://en.wikipedia.org/wiki/Vinegar , commercial 5-8 %); 3 % hydrogen
 * peroxide (https://en.wikipedia.org/wiki/Hydrogen_peroxide) = 30 g/L = 0.88 M; lemon juice about 5-6 % citric acid
 * (https://en.wikipedia.org/wiki/Lemon , treated as pure citric acid solution, our simplification); household bleach
 * about 5 % NaClO (https://en.wikipedia.org/wiki/Sodium_hypochlorite). Baking-soda solution 0.12 M (10 g/L), soap solution
 * 1 g/L and the household ammonia 0.5 M are our shelf choices. The indicator stock volumes are mL of stock; drops are
 * 0.05 mL (https://en.wikipedia.org/wiki/Drop_(unit)). Hazard flags: GHS (see substances.ts).
 */
import type { Hazard } from './substances';
import { requireSubstance } from './substances';
import { speciesOf, solidKey, type Mix } from './species';

export type ReagentCategory = 'acid' | 'base' | 'indicator' | 'salt' | 'metal' | 'household' | 'other';
export interface Portion {
  mix: Mix;
  indicators: Record<string, number>;
  catalysts: Record<string, number>;
}
export interface Reagent {
  id: string;
  nameTr: string;
  category: ReagentCategory;
  /** 'mL' for liquids and solutions, 'g' for solids. */
  unit: 'mL' | 'g';
  hazards: readonly Hazard[];
  virtualOnly?: boolean;
  /** Short label such as '0,1 M'. */
  labelTr: string;
  build(amount: number, powder?: boolean): Portion;
}

const WATER_G_PER_ML = 0.998;
const WATER_M = 18.015;

/** Builds `volMl` of a solution; the water amount makes the derived volume equal volMl. */
export function solution(volMl: number, solutes: ReadonlyArray<readonly [string, number]> = [], indicators: Record<string, number> = {}): Portion {
  const mix: Mix = {};
  let liquidVol = 0;
  for (const [k, c] of solutes) {
    const n = (c * volMl) / 1000;
    mix[k] = (mix[k] ?? 0) + n;
    const sp = speciesOf(k);
    if (sp.liquidVolume) liquidVol += (n * sp.molarMass) / sp.density;
  }
  mix['water'] = (Math.max(0, volMl - liquidVol) * WATER_G_PER_ML) / WATER_M;
  const ind: Record<string, number> = {};
  for (const [k, perMl] of Object.entries(indicators)) ind[k] = perMl * volMl;
  return { mix, indicators: ind, catalysts: {} };
}

const sol = (id: string, nameTr: string, category: ReagentCategory, labelTr: string, solutes: Array<[string, number]>, hazards: Hazard[] = [], extra: Partial<Reagent> = {}, ind: Record<string, number> = {}): Reagent => ({
  id, nameTr, category, unit: 'mL', hazards, labelTr, build: (ml) => solution(ml, solutes, ind), ...extra,
});

const solid = (id: string, nameTr: string, category: ReagentCategory, subId: string, extra: Partial<Reagent> = {}, forcePowder = false): Reagent => {
  const sub = requireSubstance(subId);
  return {
    id, nameTr, category, unit: 'g', hazards: sub.hazards, virtualOnly: sub.virtualOnly, labelTr: sub.formula,
    build: (g, powder = false) => ({ mix: { [solidKey(subId, powder || forcePowder)]: g / sub.molarMass }, indicators: {}, catalysts: {} }), ...extra,
  };
};

const catalystSolid = (id: string, nameTr: string): Reagent => ({
  id, nameTr, category: 'other', unit: 'g', hazards: [], labelTr: 'katalizör', build: (g) => ({ mix: {}, indicators: {}, catalysts: { [id]: g } }),
});

export const REAGENTS: readonly Reagent[] = [
  sol('water', 'Saf su', 'other', 'H2O', []),
  sol('hcl-0.1M', 'Hidroklorik asit', 'acid', '0,1 M', [['H+', 0.1], ['Cl-', 0.1]], ['irritant']),
  sol('hcl-1M', 'Hidroklorik asit', 'acid', '1 M', [['H+', 1], ['Cl-', 1]], ['corrosive']),
  sol('vinegar', 'Sirke', 'household', '%5', [['acetic-acid', 0.84]]),
  sol('lemon-juice', 'Limon suyu', 'household', 'sitrik asit', [['citric-acid', 0.3]]),
  sol('naoh-0.1M', 'Sodyum hidroksit', 'base', '0,1 M', [['Na+', 0.1], ['OH-', 0.1]], ['irritant']),
  sol('naoh-1M', 'Sodyum hidroksit', 'base', '1 M', [['Na+', 1], ['OH-', 1]], ['corrosive']),
  sol('baking-soda-solution', 'Kabartma tozu çözeltisi', 'household', '10 g/L', [['Na+', 0.12], ['HCO3-', 0.12]]),
  sol('soap-solution', 'Sabunlu su', 'household', '1 g/L', [['Na+', 0.0045], ['laurate-', 0.0045]]),
  sol('ammonia-cleaner', 'Amonyaklı cam temizleyici', 'household', '0,5 M', [['nh3', 0.5]], ['irritant']),
  sol('bleach', 'Çamaşır suyu', 'household', '%5', [['Na+', 0.7], ['ClO-', 0.7]], ['corrosive', 'oxidiser'], { virtualOnly: true }),
  sol('h2o2-3pct', 'Hidrojen peroksit', 'other', '%3', [['h2o2', 0.88]], ['oxidiser']),
  sol('cabbage-extract', 'Kırmızı lahana ayıracı', 'indicator', 'özüt', [], [], {}, { 'red-cabbage': 1 }),
  sol('phenolphthalein', 'Fenolftalein', 'indicator', 'damla', [], [], {}, { phenolphthalein: 1 }),
  sol('universal-indicator', 'Evrensel indikatör', 'indicator', 'damla', [], [], {}, { universal: 1 }),
  sol('litmus', 'Turnusol çözeltisi', 'indicator', 'damla', [], [], {}, { litmus: 1 }),
  sol('cuso4-0.1M', 'Bakır(II) sülfat', 'salt', '0,1 M', [['Cu(2+)', 0.1], ['SO4(2-)', 0.1]], ['irritant', 'toxic']),
  sol('cuno32-0.1M', 'Bakır(II) nitrat', 'salt', '0,1 M', [['Cu(2+)', 0.1], ['NO3-', 0.2]], ['oxidiser', 'irritant']),
  sol('znso4-0.1M', 'Çinko sülfat', 'salt', '0,1 M', [['Zn(2+)', 0.1], ['SO4(2-)', 0.1]], ['irritant']),
  sol('feso4-0.1M', 'Demir(II) sülfat', 'salt', '0,1 M', [['Fe(2+)', 0.1], ['SO4(2-)', 0.1]]),
  sol('agno3-0.05M', 'Gümüş nitrat', 'salt', '0,05 M', [['Ag+', 0.05], ['NO3-', 0.05]], ['corrosive', 'oxidiser'], { virtualOnly: true }),
  sol('cacl2-0.5M', 'Kalsiyum klorür', 'salt', '0,5 M', [['Ca(2+)', 0.5], ['Cl-', 1]], ['irritant']),
  sol('na2co3-0.5M', 'Sodyum karbonat', 'salt', '0,5 M', [['Na+', 1], ['CO3(2-)', 0.5]], ['irritant']),
  sol('na2so4-0.1M', 'Sodyum sülfat', 'salt', '0,1 M', [['Na+', 0.2], ['SO4(2-)', 0.1]]),
  sol('nacl-0.5M', 'Sofra tuzu çözeltisi', 'salt', '0,5 M', [['Na+', 0.5], ['Cl-', 0.5]]),
  sol('ki-0.1M', 'Potasyum iyodür', 'salt', '0,1 M', [['K+', 0.1], ['I-', 0.1]]),
  sol('bacl2-0.1M', 'Baryum klorür', 'salt', '0,1 M', [['Ba(2+)', 0.1], ['Cl-', 0.2]], ['toxic'], { virtualOnly: true }),
  solid('nacl', 'Sofra tuzu', 'salt', 'nacl'),
  solid('cacl2', 'Kalsiyum klorür (katı, kış tuzu)', 'salt', 'cacl2'),
  solid('nh4no3', 'Amonyum nitrat (soğuk paket tuzu)', 'salt', 'nh4no3'),
  solid('kno3', 'Potasyum nitrat', 'salt', 'kno3'),
  solid('sucrose', 'Şeker', 'household', 'sucrose'),
  solid('nahco3', 'Kabartma tozu', 'household', 'nahco3'),
  solid('na2so4', 'Sodyum sülfat', 'salt', 'na2so4'),
  solid('cuso4', 'Bakır(II) sülfat (susuz)', 'salt', 'cuso4'),
  solid('ki', 'Potasyum iyodür', 'salt', 'ki'),
  solid('citric-acid', 'Limon tuzu', 'household', 'citric-acid'),
  solid('soap', 'Sabun', 'household', 'soap'),
  solid('mno2', 'Mangan(IV) oksit', 'other', 'mno2'),
  solid('mg-ribbon', 'Magnezyum şerit', 'metal', 'mg'),
  solid('mg-powder', 'Magnezyum tozu', 'metal', 'mg', {}, true),
  solid('zn-granule', 'Çinko granül', 'metal', 'zn'),
  solid('fe-nail', 'Demir çivi', 'metal', 'fe'),
  solid('cu-wire', 'Bakır tel', 'metal', 'cu'),
  solid('al-foil', 'Alüminyum folyo', 'metal', 'al'),
  catalystSolid('yeast', 'Kuru maya (katalaz kaynağı)'),
];

const BY_ID = new Map(REAGENTS.map((r) => [r.id, r] as const));
export const getReagent = (id: string): Reagent | undefined => BY_ID.get(id);

/** Volume of one drop in mL. */
export const DROP_ML = 0.05;
