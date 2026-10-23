/**
 * E10 Suyun elektrolizi (Hofmann voltametresi): 2 H2O -> 2 H2 + O2, volume ratio 2 : 1, Faraday's law.
 * Sources: https://en.wikipedia.org/wiki/Electrolysis_of_water (minimum 1.23 V), https://en.wikipedia.org/wiki/Hofmann_voltameter ,
 * https://en.wikipedia.org/wiki/Faraday_constant , https://en.wikipedia.org/wiki/Electrolysis ;
 * programme: MEB KIM 12.1.6 (water electrolysis visuals, electrodes, electrolyte, power source), 12.1.7 (qualitative
 * relation between current, time and amount; no calculation) (docs/research/kimya-lab.md section 2/E10).
 * Real runs are slow (about 0.02 mL of H2 per second here); the app should offer a time-lapse.
 */
import { stage, type ExperimentDef } from './types';

export const E10: ExperimentDef = {
  id: 'su-elektrolizi',
  no: 10,
  titleTr: 'Suyun elektrolizi (Hofmann voltametresi)',
  summaryTr: 'Az miktarda tuz katılmış suya doğru akım ver. Bir tüpte, diğerinin iki katı hidrojen toplanır: su H2O formülüne uygun olarak 2 hidrojen + 1 oksijenden oluşur.',
  levels: ['ileri'],
  virtualOnly: false,
  safetyTr: ['Hidrojen ve oksijen karışımı patlayıcıdır; gerçek deneyde alevden uzak dur.', 'Çözeltiye sofra tuzu katılmaz: klor gazı çıkabilir (sanal deneyde engellenir).'],
  homeTr: 'Evde önerilmez: patlayıcı gaz karışımı ve elektrik tehlikesi var.',
  kazanim: ['KİM.12.1.6', 'KİM.12.1.7'],
  sources: [
    { label: 'Electrolysis of water (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Electrolysis_of_water' },
    { label: 'Hofmann voltameter (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Hofmann_voltameter' },
    { label: 'Faraday constant (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Faraday_constant' },
  ],
  bench: { vessels: [{ id: 'hofmann', kind: 'hofmann', labelTr: 'Hofmann voltametresi' }] },
  shelf: ['water', 'na2so4', 'na2so4-0.1M', 'cuso4-0.1M', 'nacl-0.5M'],
  equations: [
    { id: 'e10-full', titleTr: 'Toplam tepkime', reactants: { water: 2 }, products: { 'g:h2': 2, 'g:o2': 1 }, wordTr: 'su -> hidrojen + oksijen (elektrik enerjisiyle)' },
  ],
  steps: [
    { id: 'su', textTr: 'Voltametreye 150 mL su doldur.', hintTr: 'Saf su akımı çok az iletir.', done: (v) => v.volumeMl('hofmann') >= 149 },
    { id: 'tuz', textTr: '1,5 g sodyum sülfat ekle (iyon kaynağı).', hintTr: 'İyonlar akımı taşır.', done: (v) => v.did('add', 'hofmann') },
    { id: 'tahmin', textTr: 'Tahmin et: hangi tüp daha çok gaz toplar?', hintTr: 'Formülü H2O olan suya bak.', done: (v) => v.did('add', 'hofmann') },
    { id: 'baglan', textTr: 'Elektrotları 9 V doğru akım kaynağına bağla.', hintTr: 'Eksi uç katot, artı uç anot.', done: (v) => (v.electrodesVolts('hofmann') ?? 0) >= 3 },
    { id: 'gaz', textTr: 'İki elektrotta kabarcıkları ve gaz hacimlerini izle.', hintTr: 'Katottaki tüp hidrojenle dolar.', done: (v) => v.gasMl('hofmann', 'h2') > 5 },
    { id: 'oran', textTr: 'Gaz hacimlerini karşılaştır: oran yaklaşık 2 : 1.', hintTr: 'Katot : anot', done: (v) => v.gasMl('hofmann', 'h2') > 5 && v.gasMl('hofmann', 'o2') > 2 },
  ],
  expectations: [
    { id: 'bubbles', textTr: 'Elektrotlarda kabarcık gözlendi.', check: (v) => v.observed('gas', 'hofmann') },
    { id: 'ratio', textTr: 'Hidrojen hacmi oksijenin yaklaşık 2 katı.', check: (v) => Math.abs(v.gasMl('hofmann', 'h2') / v.gasMl('hofmann', 'o2') - 2) < 0.05 },
  ],
  measurables: [
    { id: 'h2-ml', labelTr: 'Katot tüpündeki hidrojen', unit: 'mL', read: (v) => v.gasMl('hofmann', 'h2') },
    { id: 'o2-ml', labelTr: 'Anot tüpündeki oksijen', unit: 'mL', read: (v) => v.gasMl('hofmann', 'o2') },
    { id: 'ratio', labelTr: 'H2 / O2 hacim oranı', unit: '', read: (v) => v.gasMl('hofmann', 'h2') / Math.max(1e-9, v.gasMl('hofmann', 'o2')), expected: 2, tolerance: 0.03 },
  ],
  solution: [
    { op: 'pour', from: 'water', to: 'hofmann', ml: 150 },
    { op: 'add', reagent: 'na2so4', to: 'hofmann', g: 1.5 },
    { op: 'stir', vessel: 'hofmann', on: true },
    { op: 'wait', s: 200 },
    { op: 'stir', vessel: 'hofmann', on: false },
    { op: 'electrodes', vessel: 'hofmann', volts: 9 },
    { op: 'wait', s: 600 },
  ],
  variants: {
    'saf-su': [{ op: 'pour', from: 'water', to: 'hofmann', ml: 150 }, { op: 'electrodes', vessel: 'hofmann', volts: 9 }, { op: 'wait', s: 600 }],
  },
  particles: [
    {
      id: 'e10-particles', equationId: 'e10-full', titleTr: 'Katotta su elektron alır, anotta verir; H2 : O2 = 2 : 1', durationS: 16,
      species: [
        { id: 'water', labelTr: 'Su', formula: 'H2O', charge: 0, kind: 'molecule' },
        { id: 'na', labelTr: 'Sodyum iyonu', formula: 'Na', charge: 1, kind: 'ion' },
        { id: 'so4', labelTr: 'Sülfat iyonu', formula: 'SO4', charge: -2, kind: 'ion' },
        { id: 'h2', labelTr: 'Hidrojen', formula: 'H2', charge: 0, kind: 'molecule' },
        { id: 'oh', labelTr: 'Hidroksit iyonu', formula: 'OH', charge: -1, kind: 'ion' },
        { id: 'o2', labelTr: 'Oksijen', formula: 'O2', charge: 0, kind: 'molecule' },
        { id: 'h', labelTr: 'Hidrojen iyonu', formula: 'H', charge: 1, kind: 'ion' },
      ],
      stages: [
        stage('basla', 0, 4, 'Suda Na+ ve SO4 2- iyonları var. Akım bağlanınca Na+ katoda, SO4 2- anoda doğru sürüklenir.', { water: 6, na: 2, so4: 1, h2: 0, oh: 0, o2: 0, h: 0 }, 'drift', { focus: ['na', 'so4'] }),
        stage('elektrot', 4, 10, 'Katotta su molekülleri elektron alır: H2 ve OH- oluşur. Anotta su elektron verir: O2 ve H+ oluşur. Elektronlar dış telde anottan katota akar.', { water: 0, na: 2, so4: 1, h2: 2, oh: 4, o2: 1, h: 4 }, 'random', { transfers: [{ kind: 'electron', from: 'o2', to: 'h2', count: 4 }], breaks: [{ species: 'water', bond: 'O-H' }], forms: [{ species: 'h2', bond: 'H-H' }, { species: 'o2', bond: 'O=O' }] }),
        stage('birles', 10, 13, 'H+ ve OH- yeniden birleşip su olur. Net sonuç: 2 su molekülü 2 H2 ve 1 O2 vermiş.', { water: 4, na: 2, so4: 1, h2: 2, oh: 0, o2: 1, h: 0 }, 'approach'),
        stage('gaz', 13, 16, 'Gaz molekülleri tüplerin tepesinde toplanır: katotta iki kat fazla hidrojen.', { water: 4, na: 2, so4: 1, h2: 2, oh: 0, o2: 1, h: 0 }, 'rise', { focus: ['h2', 'o2'] }),
      ],
    },
  ],
};
