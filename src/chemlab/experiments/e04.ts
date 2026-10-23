/**
 * E4 Çökelme: safe calcium carbonate precipitation CaCl2 + Na2CO3 (replaces the lead iodide "altın yağmuru";
 * decision recorded in docs/adr/0005-sim-modules-and-chem-lab-decisions.md).
 * Sources: https://en.wikipedia.org/wiki/Calcium_carbonate (0.013 g/L), https://en.wikipedia.org/wiki/Precipitation_(chemistry) ,
 * https://en.wikipedia.org/wiki/Solubility_chart , https://en.wikipedia.org/wiki/Calcium_chloride ,
 * https://en.wikipedia.org/wiki/Sodium_carbonate ; programme: MEB KIM 10.1.3, 10.2.4-10.2.6.
 * Our arithmetic: 10 mL x 0.5 M of each = 5.0 mmol, CaCO3 M = 100.09 g/mol, so 0.50 g precipitate.
 */
import type { Op } from '../labTypes';
import { stage, type ExperimentDef } from './types';

const solution: Op[] = [
  { op: 'pour', from: 'cacl2-0.5M', to: 'a', ml: 10 },
  { op: 'pour', from: 'na2co3-0.5M', to: 'a', ml: 10 },
  { op: 'wait', s: 5 },
  { op: 'stir', vessel: 'a', on: true },
  { op: 'pour', from: 'a', to: 'funnel', ml: 20 },
  { op: 'stir', vessel: 'a', on: false },
  { op: 'filter', from: 'funnel', to: 'b' },
  { op: 'pour', from: 'hcl-1M', to: 'funnel', ml: 5 },
  { op: 'wait', s: 30 },
];

export const E04: ExperimentDef = {
  id: 'cokelme-kalsiyum-karbonat',
  no: 4,
  titleTr: 'Çökelme: iki berrak çözeltiden beyaz katı',
  summaryTr: 'İki renksiz çözeltiyi karıştır; beyaz bir katı (çökelek) oluşsun. Süzerek ayır ve asit damlatıp ne olduğunu bul.',
  levels: ['ileri'],
  virtualOnly: false,
  safetyTr: ['Gözlük tak.', 'Bu deneyde kurşun gibi zehirli tuzlar kullanılmaz; kalsiyum karbonat güvenli bir çökeleğidir.'],
  homeTr: 'Evde denenmez; çözeltiler laboratuvar malzemesidir.',
  kazanim: ['KİM.10.1.3', 'KİM.10.2.4', 'KİM.10.2.5', 'KİM.10.2.6'],
  sources: [
    { label: 'Calcium carbonate (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Calcium_carbonate' },
    { label: 'Precipitation (chemistry) (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Precipitation_(chemistry)' },
    { label: 'Solubility chart (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Solubility_chart' },
  ],
  bench: {
    vessels: [
      { id: 'a', kind: 'beaker250', labelTr: 'Beher A' },
      { id: 'funnel', kind: 'funnel', labelTr: 'Süzgeçli huni' },
      { id: 'b', kind: 'beaker250', labelTr: 'Beher B (süzüntü)' },
    ],
  },
  shelf: ['cacl2-0.5M', 'na2co3-0.5M', 'hcl-1M', 'water'],
  equations: [
    { id: 'e4-full', titleTr: 'Tam denklem', reactants: { 'Ca(2+)': 1, 'Cl-': 2, 'Na+': 2, 'CO3(2-)': 1 }, products: { 's:caco3': 1, 'Na+': 2, 'Cl-': 2 }, wordTr: 'kalsiyum klorür + sodyum karbonat -> kalsiyum karbonat (çökelek) + sodyum klorür' },
    { id: 'e4-net', titleTr: 'Net iyon denklemi', reactants: { 'Ca(2+)': 1, 'CO3(2-)': 1 }, products: { 's:caco3': 1 } },
    { id: 'e4-acid', titleTr: 'Çökelek asitle gaz verir', reactants: { 's:caco3': 1, 'H+': 2 }, products: { 'Ca(2+)': 1, 'g:co2': 1, water: 1 } },
  ],
  steps: [
    { id: 'cacl2', textTr: 'Beher A içine 10 mL kalsiyum klorür çözeltisi koy.', hintTr: 'Çözelti renksizdir.', done: (v) => v.volumeMl('a') >= 9.5 || v.did('pour', 'funnel') },
    { id: 'tahmin', textTr: 'Tahmin et: ikinci çözeltiyi katınca ne olacak?', hintTr: 'Yeni bir madde oluşursa katı ayrılabilir.', done: (v) => v.did('pour', 'a') },
    { id: 'karbonat', textTr: '10 mL sodyum karbonat çözeltisi ekle.', hintTr: 'Hemen izle.', done: (v) => v.observed('precipitate', 'a') },
    { id: 'karistir', textTr: 'Karıştırıp bulanık karışımı hunide süz.', hintTr: 'Çökelek kâğıtta kalır, sıvı Beher B ye iner.', done: (v) => v.did('filter') },
    { id: 'asit', textTr: 'Süzgeçteki katıya 1 M asit damlat: gaz çıkıyor mu?', hintTr: 'Karbonatlar asitle CO2 verir.', done: (v) => v.observed('gas', 'funnel') },
  ],
  expectations: [
    { id: 'ppt', textTr: 'Beyaz çökelek oluştu.', check: (v) => v.observed('precipitate', 'a') },
    { id: 'mass', textTr: 'Çökelek yaklaşık 0,50 g (süzgeçte, asit damlatmadan önce).', check: (v) => Math.abs(v.extent('funnel', 'ab:H++s:caco3') * 100.087 + v.solidG('funnel', 'caco3') - 0.5) < 0.06 },
    { id: 'filtrate', textTr: 'Süzüntüde Na+ ve Cl- kaldı (izleyici iyonlar), katı yok.', check: (v) => Math.abs(v.moles('b', 'Na+') - 0.01) < 5e-4 && Math.abs(v.moles('b', 'Cl-') - 0.01) < 5e-4 && v.precipitateG('b') < 0.01 },
    { id: 'fizz', textTr: 'Asit damlatınca karbondioksit çıktı.', check: (v) => v.observed('gas', 'funnel') },
  ],
  measurables: [
    { id: 'ppt-g', labelTr: 'Çökelek kütlesi (A kabı, karıştırmadan sonra)', unit: 'g', read: (v) => v.precipitateG('a') + v.precipitateG('funnel') + v.extent('funnel', 'ab:H++s:caco3') * 100.087, expected: 0.5, tolerance: 0.1 },
    { id: 'na', labelTr: 'Süzüntüde Na+', unit: 'mol', read: (v) => v.moles('b', 'Na+'), expected: 0.01, tolerance: 0.05 },
  ],
  solution,
  variants: {
    'cokelek-olcum': [
      { op: 'pour', from: 'cacl2-0.5M', to: 'a', ml: 10 },
      { op: 'pour', from: 'na2co3-0.5M', to: 'a', ml: 10 },
      { op: 'wait', s: 5 },
    ],
  },
  particles: [
    {
      id: 'e4-particles', equationId: 'e4-net', titleTr: 'Ca2+ ve CO3 2- bir araya gelip katı örgü yapar', durationS: 14,
      species: [
        { id: 'ca', labelTr: 'Kalsiyum iyonu', formula: 'Ca', charge: 2, kind: 'ion' },
        { id: 'co3', labelTr: 'Karbonat iyonu', formula: 'CO3', charge: -2, kind: 'ion' },
        { id: 'na', labelTr: 'Sodyum iyonu', formula: 'Na', charge: 1, kind: 'ion' },
        { id: 'cl', labelTr: 'Klorür iyonu', formula: 'Cl', charge: -1, kind: 'ion' },
        { id: 'caco3', labelTr: 'Kalsiyum karbonat (katı örgü)', formula: 'CaCO3', charge: 0, kind: 'lattice' },
      ],
      stages: [
        stage('ayri', 0, 4, 'İki çözeltide iyonlar ayrı ayrı gezer: Ca2+ ve Cl- ile Na+ ve CO3 2-.', { ca: 4, co3: 4, na: 8, cl: 8, caco3: 0 }, 'random'),
        stage('yaklas', 4, 8, 'Ca2+ ve CO3 2- birbirini çeker ve yaklaşır. Na+ ve Cl- uzak durur.', { ca: 4, co3: 4, na: 8, cl: 8, caco3: 0 }, 'attract', { focus: ['ca', 'co3'] }),
        stage('kume', 8, 14, 'Ca2+ ve CO3 2- sıkıca dizilip küçük kümeler, sonra beyaz çökelek oluşturur. Na+ ve Cl- çözeltide kalır.', { ca: 0, co3: 0, na: 8, cl: 8, caco3: 4 }, 'static', { forms: [{ species: 'caco3', bond: 'ionic lattice' }] }),
      ],
    },
  ],
};
