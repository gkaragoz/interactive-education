/**
 * E8 Çözünme hızı, doygun çözelti, kristallendirme (KNO3 and sugar).
 * Sources: https://en.wikipedia.org/wiki/Potassium_nitrate (133/316/2439 g/L at 0/20/100 degC), https://en.wikipedia.org/wiki/Solvation ,
 * https://en.wikipedia.org/wiki/Supersaturation , https://en.wikipedia.org/wiki/Crystallization ,
 * https://en.wikipedia.org/wiki/Sucrose (2.01 g/mL at 20 degC); programme: MEB FEN 7.5.8, 7.5.9, MEB KIM 10.2.1, 10.2.4-10.2.6.
 * Dossier arithmetic at 20 degC: 50 mL water dissolves 15.8 g KNO3, 20 g added leaves 4.2 g; at 0 degC 6.65 g stay dissolved
 * and about 13.35 g crystallise. The engine includes the heat of solution of KNO3 (endothermic), so the beaker cools while it
 * dissolves; the 4.2 g figure holds once the beaker has returned to room temperature (about 40 minutes of simulated time).
 */
import type { Op } from '../labTypes';
import { stage, type ExperimentDef } from './types';

const BASE: Op[] = [
  { op: 'pour', from: 'water', to: 'beaker', ml: 50 },
  { op: 'add', reagent: 'kno3', to: 'beaker', g: 20 },
  { op: 'stir', vessel: 'beaker', on: true },
  { op: 'wait', s: 3000 },
  { op: 'stir', vessel: 'beaker', on: false },
];

export const E08: ExperimentDef = {
  id: 'cozunme-doygunluk',
  no: 8,
  titleTr: 'Çözünme hızı, doygun çözelti ve kristallendirme',
  summaryTr: 'Bir tuz suda ne kadar çözünür? Karıştırma, toz hâli ve sıcaklık hızı nasıl değiştirir? Çözeltiyi ısıtıp soğutarak kristal elde et.',
  levels: ['temel', 'ileri'],
  virtualOnly: false,
  safetyTr: ['Potasyum nitrat yükseltgendir; yanıcı maddelerden uzak tut.', 'Sıcak suyla çalışırken maşa kullan.'],
  homeTr: 'Şeker ve sofra tuzuyla evde denenebilir; potasyum nitratla denenmez.',
  kazanim: ['FB.7.5.8', 'FB.7.5.9', 'KİM.10.2.1', 'KİM.10.2.4', 'KİM.10.2.5', 'KİM.10.2.6'],
  sources: [
    { label: 'Potassium nitrate (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Potassium_nitrate' },
    { label: 'Supersaturation (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Supersaturation' },
    { label: 'Sucrose (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Sucrose' },
  ],
  bench: { ambientC: 20, vessels: [{ id: 'beaker', kind: 'beaker100', labelTr: 'Beher' }, { id: 'beaker2', kind: 'beaker100', labelTr: 'İkinci beher' }] },
  shelf: ['water', 'kno3', 'sucrose', 'nacl'],
  equations: [
    { id: 'e8-diss', titleTr: 'Çözünme', reactants: { 's:kno3': 1 }, products: { 'K+': 1, 'NO3-': 1 } },
  ],
  steps: [
    { id: 'su', textTr: 'Behere 50 mL su koy.', hintTr: 'Oda sıcaklığı 20 °C.', done: (v) => v.volumeMl('beaker') >= 49.5 },
    { id: 'tuz', textTr: '20 g potasyum nitrat ekle.', hintTr: 'Hepsi çözünecek mi?', done: (v) => v.did('add', 'beaker') },
    { id: 'karistir', textTr: 'Karıştır ve çözünmeyi izle.', hintTr: 'Karıştırma çözünmeyi hızlandırır, toplam miktarı değiştirmez.', done: (v) => v.stirring('beaker') || v.observed('dissolve', 'beaker') },
    { id: 'doygun', textTr: 'Dipte çözünmeyen tuz kaldı: çözelti doygun.', hintTr: 'Doygun çözelti, o sıcaklıkta daha fazla çözemez.', done: (v) => v.noted('doygun', 'beaker') },
    { id: 'isit', textTr: 'Isıtıcı tablayla ısıt ve katının çözünmesini izle.', hintTr: 'Sıcak suda çözünürlük çok artar.', done: (v) => v.did('heat', 'beaker') },
    { id: 'sogut', textTr: 'Isıtmayı kapat ve buzlu su banyosunda soğut.', hintTr: 'Çözelti çözebileceğinden fazlasını tutamaz.', done: (v) => v.did('cool', 'beaker') },
    { id: 'kristal', textTr: 'Oluşan kristalleri gözle.', hintTr: 'Kristaller dipte birikir.', done: (v) => v.observed('precipitate', 'beaker') },
  ],
  expectations: [
    { id: 'saturated', textTr: 'Oda sıcaklığında yaklaşık 4,2 g tuz çözünmeden kaldı (doygun).', check: (v) => v.observed('dissolve', 'beaker') },
    { id: 'hot', textTr: 'Sıcakken katının tamamı çözündü.', check: (v) => v.solidG('beaker', 'kno3') < 0.5 || v.observed('precipitate', 'beaker') },
    { id: 'crystals', textTr: 'Soğutunca kristaller oluştu.', check: (v) => v.observed('precipitate', 'beaker') },
  ],
  measurables: [
    { id: 'undissolved-g', labelTr: 'Çözünmeyen tuz', unit: 'g', read: (v) => v.solidG('beaker', 'kno3') },
    { id: 'temp', labelTr: 'Sıcaklık', unit: '°C', read: (v) => v.tempC('beaker') },
  ],
  solution: [
    ...BASE,
    { op: 'heat', vessel: 'beaker', source: 'hotplate' },
    { op: 'stir', vessel: 'beaker', on: true },
    { op: 'wait', s: 100 },
    { op: 'heat', vessel: 'beaker', source: null },
    { op: 'cool', vessel: 'beaker', on: true },
    { op: 'wait', s: 900 },
  ],
  variants: {
    'doygun-oda': BASE,
    'seker-topak': [{ op: 'pour', from: 'water', to: 'beaker', ml: 50 }, { op: 'add', reagent: 'sucrose', to: 'beaker', g: 10 }, { op: 'wait', s: 120 }],
    'seker-toz-karisan': [{ op: 'pour', from: 'water', to: 'beaker', ml: 50 }, { op: 'stir', vessel: 'beaker', on: true }, { op: 'add', reagent: 'sucrose', to: 'beaker', g: 10, powder: true }, { op: 'wait', s: 120 }],
  },
  particles: [
    {
      id: 'e8-particles', equationId: 'e8-diss', titleTr: 'Su molekülleri iyonları kristalden koparıp sarar; soğuyunca iyonlar geri dizilir', durationS: 16,
      species: [
        { id: 'water', labelTr: 'Su molekülü', formula: 'H2O', charge: 0, kind: 'molecule' },
        { id: 'kno3', labelTr: 'Potasyum nitrat (kristal)', formula: 'KNO3', charge: 0, kind: 'lattice' },
        { id: 'k', labelTr: 'Potasyum iyonu', formula: 'K', charge: 1, kind: 'ion' },
        { id: 'no3', labelTr: 'Nitrat iyonu', formula: 'NO3', charge: -1, kind: 'ion' },
      ],
      stages: [
        stage('kristal', 0, 3, 'Kristal suyun içinde: iyonlar düzenli dizilmiş.', { water: 12, kno3: 6, k: 0, no3: 0 }, 'vibrate'),
        stage('cozunme', 3, 8, 'Su molekülleri yüzeydeki iyonlara çarpar ve onları sarar (hidrasyon). Sıcak suda çarpışma daha çok, çözünme daha hızlı.', { water: 12, kno3: 0, k: 6, no3: 6 }, 'approach', { breaks: [{ species: 'kno3', bond: 'ionic lattice' }], focus: ['water'] }),
        stage('doygun', 8, 12, 'Doygunlukta çözünen ve kristale geri dönen iyon sayısı eşit olur.', { water: 12, kno3: 2, k: 4, no3: 4 }, 'random'),
        stage('soguma', 12, 16, 'Soğuyunca iyonlar yavaşlar ve kristal çekirdeğine tutunur; kristal büyür.', { water: 12, kno3: 5, k: 1, no3: 1 }, 'attract', { forms: [{ species: 'kno3', bond: 'ionic lattice' }] }),
      ],
    },
  ],
};
