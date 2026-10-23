/**
 * E1 Sirke + kabartma tozu: gas evolution and conservation of mass (open flask vs balloon).
 * Sources: https://en.wikipedia.org/wiki/Sodium_bicarbonate , https://en.wikipedia.org/wiki/Vinegar ,
 * https://en.wikipedia.org/wiki/Conservation_of_mass , https://teachchemistry.org/classroom-resources/kitchen-reaction ;
 * programme: MEB FEN 8.5.2-8.5.3, MEB KIM 10.1.1 (docs/research/kimya-lab.md section 2/E1).
 * Dossier arithmetic: 2.0 g NaHCO3 = 0.0238 mol is limiting against about 0.042 mol acetic acid; CO2 1.05 g, about 0.58 L.
 */
import type { Op } from '../labTypes';
import { stage, type ExperimentDef } from './types';

const fill: Op[] = [{ op: 'pour', from: 'vinegar', to: 'flask', ml: 50 }, { op: 'place', vessel: 'flask' }];

export const E01: ExperimentDef = {
  id: 'sirke-kabartma',
  no: 1,
  titleTr: 'Sirke ile kabartma tozu: gaz çıkışı ve kütlenin korunumu',
  summaryTr: 'Sirkeye kabartma tozu atınca köpürme olur. Gaz nereye gidiyor, tartı ne gösterir? Kabı açık ve balonla kapalı olarak karşılaştır.',
  levels: ['temel', 'ileri'],
  virtualOnly: false,
  safetyTr: ['Gözlüğünü tak.', 'Gerçekte kapalı bir şişede yapma: gaz basıncı şişeyi patlatabilir.'],
  homeTr: 'Büyüklerin gözetiminde evde denenebilir; şişe asla sıkıca kapatılmaz.',
  kazanim: ['FB.8.5.2', 'FB.8.5.3', 'KİM.10.1.1'],
  sources: [
    { label: 'Sodium bicarbonate (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Sodium_bicarbonate' },
    { label: 'Conservation of mass (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Conservation_of_mass' },
    { label: 'AACT: Kitchen reaction', url: 'https://teachchemistry.org/classroom-resources/kitchen-reaction' },
  ],
  bench: { vessels: [{ id: 'flask', kind: 'erlenmeyer250', labelTr: 'Erlenmeyer' }] },
  shelf: ['vinegar', 'nahco3', 'water'],
  equations: [
    {
      id: 'e1-full', titleTr: 'Tam tepkime',
      reactants: { 'acetic-acid': 1, 's:nahco3': 1 },
      products: { 'Na+': 1, 'CH3COO-': 1, water: 1, 'g:co2': 1 },
      wordTr: 'sirke asidi + kabartma tozu -> sodyum asetat + su + karbondioksit gazı',
    },
  ],
  steps: [
    { id: 'olc', textTr: 'Erlenmeyer içine 50 mL sirke koy.', hintTr: 'Raftan sirkeyi seç ve kabın üstünde eğ.', done: (v) => v.did('pour', 'flask') },
    { id: 'tart', textTr: 'Kabı teraziye yerleştir.', hintTr: 'Terazi ekranında kütle görünür.', done: (v) => v.onBalance() === 'flask' },
    { id: 'tahmin', textTr: 'Kabartma tozunu eklemeden önce tahmin et: açık kapta kütle ne olur?', hintTr: 'Aynı kalır, azalır ya da artar.', done: (v) => v.did('place', 'flask') },
    { id: 'ekle', textTr: '2 g kabartma tozu ekle.', hintTr: 'Kaşıkla küçük küçük ekleyebilirsin.', done: (v) => v.did('add', 'flask') },
    { id: 'gaz', textTr: 'Köpürmeyi ve gaz çıkışını izle.', hintTr: 'Kabarcıklar karbondioksittir.', done: (v) => v.observed('gas', 'flask') },
    { id: 'kutle', textTr: 'Terazideki kütleyi oku ve ilk değerle karşılaştır.', hintTr: 'Fark, kaptan çıkan gazın kütlesidir.', done: (v) => v.did('weigh', 'flask') },
  ],
  expectations: [
    { id: 'gas', textTr: 'Gaz çıkışı gözlendi.', check: (v) => v.observed('gas', 'flask') },
    { id: 'loss', textTr: 'Açık kapta kütle yaklaşık 1 g azaldı.', check: (v) => Math.abs(v.escapedG() - 1.05) < 0.15 },
    { id: 'ph', textTr: 'Sonunda çözelti hâlâ hafif asidiktir (pH 4-5).', check: (v) => (v.ph('flask') ?? 0) > 4 && (v.ph('flask') ?? 9) < 5.5 },
  ],
  measurables: [
    { id: 'co2-lost-g', labelTr: 'Kaptan çıkan gazın kütlesi', unit: 'g', read: (v) => v.escapedG(), expected: 1.05, tolerance: 0.1 },
    { id: 'ph', labelTr: 'pH', unit: '', read: (v) => v.ph('flask') ?? 7 },
    { id: 'temp', labelTr: 'Sıcaklık', unit: '°C', read: (v) => v.tempC('flask') },
  ],
  solution: [...fill, { op: 'weigh', vessel: 'flask' }, { op: 'add', reagent: 'nahco3', to: 'flask', g: 2 }, { op: 'wait', s: 60 }, { op: 'weigh', vessel: 'flask' }, { op: 'dip', strip: 'universal-strip', vessel: 'flask' }],
  variants: {
    balon: [...fill, { op: 'add', reagent: 'nahco3', to: 'flask', g: 2 }, { op: 'close', vessel: 'flask', closure: 'balloon' }, { op: 'wait', s: 60 }],
  },
  particles: [
    {
      id: 'e1-particles', equationId: 'e1-full', titleTr: 'Asit protonunu verir, karbondioksit kabarcık olur', durationS: 14,
      species: [
        { id: 'acid', labelTr: 'Asetik asit', formula: 'CH3COOH', charge: 0, kind: 'molecule' },
        { id: 'acetate', labelTr: 'Asetat iyonu', formula: 'CH3COO', charge: -1, kind: 'ion' },
        { id: 'bicarb', labelTr: 'Hidrojenkarbonat iyonu', formula: 'HCO3', charge: -1, kind: 'ion' },
        { id: 'carbonic', labelTr: 'Karbonik asit', formula: 'H2CO3', charge: 0, kind: 'molecule' },
        { id: 'sodium', labelTr: 'Sodyum iyonu', formula: 'Na', charge: 1, kind: 'ion' },
        { id: 'water', labelTr: 'Su', formula: 'H2O', charge: 0, kind: 'molecule' },
        { id: 'co2', labelTr: 'Karbondioksit', formula: 'CO2', charge: 0, kind: 'molecule' },
      ],
      stages: [
        stage('basla', 0, 3, 'Sirkedeki asit molekülleri ve kabartma tozunun iyonları ayrı bölgelerde.', { acid: 6, acetate: 0, bicarb: 6, carbonic: 0, sodium: 6, water: 0, co2: 0 }, 'random'),
        stage('proton', 3, 6, 'Asit molekülleri bir H+ (proton) verir; hidrojenkarbonat iyonları alır.', { acid: 3, acetate: 3, bicarb: 3, carbonic: 3, sodium: 6, water: 0, co2: 0 }, 'approach', { transfers: [{ kind: 'proton', from: 'acid', to: 'bicarb', count: 3 }], breaks: [{ species: 'acid', bond: 'O-H' }], forms: [{ species: 'carbonic', bond: 'O-H' }] }),
        stage('bozunma', 6, 9, 'Karbonik asit kararsızdır: su ve karbondioksite ayrılır. Na+ ve asetat çözeltide kalır.', { acid: 0, acetate: 6, bicarb: 0, carbonic: 0, sodium: 6, water: 6, co2: 6 }, 'random', { breaks: [{ species: 'carbonic', bond: 'C-O' }], forms: [{ species: 'co2', bond: 'C=O' }, { species: 'water', bond: 'O-H' }], transfers: [{ kind: 'proton', from: 'acid', to: 'bicarb', count: 3 }] }),
        stage('kabarcik', 9, 14, 'CO2 molekülleri toplanıp kabarcık olur ve yükselir. Her atom türünün sayısı aynı kaldı.', { acid: 0, acetate: 6, bicarb: 0, carbonic: 0, sodium: 6, water: 6, co2: 6 }, 'rise', { focus: ['co2'] }),
      ],
    },
  ],
};
