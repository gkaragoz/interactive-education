/**
 * Blocked combinations. The engine does not simulate these; it returns a Turkish lesson card with no quantities and no
 * procedure (docs/research/kimya-lab.md section 4).
 * - Bleach + acid releases toxic chlorine gas; bleach + ammonia forms toxic chloramines:
 *   https://en.wikipedia.org/wiki/Sodium_hypochlorite
 * - Bleach + ethanol can form chloroform: https://en.wikipedia.org/wiki/Chloroform (haloform reaction,
 *   https://en.wikipedia.org/wiki/Haloform_reaction)
 * - Hydrogen peroxide + vinegar forms peracetic acid, which is corrosive and irritating:
 *   https://en.wikipedia.org/wiki/Peracetic_acid
 * - Metal powder + an oxidising salt makes a flash-powder type mixture: https://en.wikipedia.org/wiki/Flash_powder
 * - Heating flammable liquids on a flame, sealing a gas-producing vessel, electrolysing chloride: general lab safety
 *   (https://en.wikipedia.org/wiki/Laboratory_safety , https://en.wikipedia.org/wiki/Electrolysis_of_water).
 */
import { amount } from './mixture';
import { VESSEL_SPECS, type HeatSource, type Vessel } from './vessel';
import type { Mix } from './species';

export interface HazardBlock {
  id: string;
  titleTr: string;
  messageTr: string;
}

const has = (m: Mix, k: string): boolean => amount(m, k) > 1e-6;
const hasAny = (m: Mix, ks: string[]): boolean => ks.some((k) => has(m, k));

const ACIDS = ['H+', 'acetic-acid', 'citric-acid'];
const OXIDISERS = ['s:kno3', 's:kno3:p', 's:nano3', 's:nano3:p', 's:nh4no3', 's:agno3'];

const COMBOS: ReadonlyArray<{ test: (m: Mix) => boolean; block: HazardBlock }> = [
  {
    test: (m) => has(m, 'ClO-') && hasAny(m, ACIDS),
    block: { id: 'bleach-acid', titleTr: 'Çamaşır suyu asitle karışmaz', messageTr: 'Çamaşır suyu asitle (sirke, tuz ruhu, kireç çözücü) karışırsa zehirli klor gazı çıkar. Bu karışım simülasyonda da engellendi. Gerçek hayatta bu ürünleri asla birbirine karıştırma.' },
  },
  {
    test: (m) => has(m, 'ClO-') && hasAny(m, ['nh3', 'NH4+']),
    block: { id: 'bleach-ammonia', titleTr: 'Çamaşır suyu amonyakla karışmaz', messageTr: 'Çamaşır suyu ile amonyaklı temizleyiciler karışırsa zehirli kloraminler oluşur. Bu karışım engellendi. Temizlik ürünlerini asla karıştırma.' },
  },
  {
    test: (m) => has(m, 'ClO-') && has(m, 'ethanol'),
    block: { id: 'bleach-alcohol', titleTr: 'Çamaşır suyu alkolle karışmaz', messageTr: 'Çamaşır suyu alkolle karışırsa zehirli ve zararlı maddeler (kloroform gibi) oluşabilir. Bu karışım engellendi.' },
  },
  {
    test: (m) => has(m, 'h2o2') && has(m, 'acetic-acid'),
    block: { id: 'peroxide-vinegar', titleTr: 'Hidrojen peroksit sirkeyle karışmaz', messageTr: 'Hidrojen peroksit ile sirke karışırsa gözü ve cildi tahriş eden aşındırıcı peroksiasetik asit oluşabilir. Bu karışım engellendi.' },
  },
  {
    test: (m) => (has(m, 's:mg:p') || has(m, 's:al:p')) && hasAny(m, OXIDISERS),
    block: { id: 'powder-oxidiser', titleTr: 'Metal tozu yükseltgenle karışmaz', messageTr: 'İnce metal tozu ile yükseltgen bir tuzun karışımı çok tehlikelidir, kıvılcımla parlayıp patlayabilir. Bu karışım engellendi.' },
  },
];

/** Checks what the vessel would hold after adding `incoming`. */
export function checkCombination(existing: Mix, incoming: Mix): HazardBlock | null {
  const merged: Mix = { ...existing };
  for (const [k, n] of Object.entries(incoming)) merged[k] = (merged[k] ?? 0) + n;
  for (const c of COMBOS) if (c.test(merged)) return c.block;
  return null;
}

export function checkHeating(v: Vessel, source: HeatSource): HazardBlock | null {
  const spec = VESSEL_SPECS[v.kind];
  if (!spec.heatable) {
    return { id: 'not-heatable', titleTr: 'Bu kap ısıtılmaz', messageTr: 'Dereceli kaplar, büretler ve huniler ısıtılmaz; ısıdan çatlar ve ölçüleri bozulur. Beher, deney tüpü veya krozne kullan.' };
  }
  if (v.closure !== 'none') {
    return { id: 'heat-closed', titleTr: 'Kapalı kap ısıtılmaz', messageTr: 'Kapalı kabı ısıtırsan içeride basınç artar ve kap patlayabilir. Önce kapağı veya balonu çıkar.' };
  }
  const flame = source !== 'hotplate';
  if (flame && (has(v.mix, 'ethanol') || Object.keys(v.mix).some((k) => k === 'g:h2'))) {
    return { id: 'flame-flammable', titleTr: 'Yanıcı maddeyi alevle ısıtma', messageTr: 'Etanol gibi yanıcı sıvılar ve hidrojen gazı açık alevle ısıtılmaz; buharları alev alır. Isıtıcı tabla kullanılır.' };
  }
  return null;
}

export function checkElectrolysis(mix: Mix): HazardBlock | null {
  if (has(mix, 'Cl-') || has(mix, 'ClO-')) {
    return { id: 'electrolysis-chloride', titleTr: 'Klorürlü çözelti elektroliz edilmez', messageTr: 'İçinde klorür (tuz) olan bir çözeltiyi elektroliz edersen zehirli klor gazı çıkabilir. Bu deney için sodyum sülfat gibi güvenli bir elektrolit kullanılır.' };
  }
  return null;
}
