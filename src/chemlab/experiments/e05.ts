/**
 * E5 Demir çivi + bakır(II) sülfat: single displacement (redox).
 * Sources: https://en.wikipedia.org/wiki/Copper(II)_sulfate , https://en.wikipedia.org/wiki/Reactivity_series ,
 * https://en.wikipedia.org/wiki/Iron(II)_sulfate , https://en.wikipedia.org/wiki/Redox ; programme: MEB KIM 10.1.3,
 * 12.1.1, 12.1.2 (docs/research/kimya-lab.md section 2/E5). Our arithmetic: 50 mL x 0.10 M = 5.0 mmol Cu2+, at most
 * 0.318 g Cu deposited and 0.279 g Fe dissolved (the nail, about 3 g, is in excess). The expected pale green of Fe2+ is
 * the dossier's "to be verified" colour.
 */
import type { Op } from '../labTypes';
import { stage, type ExperimentDef } from './types';

const solution: Op[] = [
  { op: 'pour', from: 'cuso4-0.1M', to: 'beaker', ml: 50 },
  { op: 'add', reagent: 'fe-nail', to: 'beaker', g: 3 },
  { op: 'wait', s: 1500 },
];

export const E05: ExperimentDef = {
  id: 'demir-bakir',
  no: 5,
  titleTr: 'Demir çivi + bakır(II) sülfat: yer değiştirme',
  summaryTr: 'Mavi bakır sülfat çözeltisine demir çivi batır. Çivinin yüzeyi bakır rengine dönerken çözeltinin mavisi solar: demir bakırı yerinden etti.',
  levels: ['ileri'],
  virtualOnly: false,
  safetyTr: ['Gözlük ve eldiven tak.', 'Bakır tuzları suda yaşayanlara zararlıdır; atık ağır metal kabına gider.'],
  homeTr: 'Evde denenmez.',
  kazanim: ['KİM.10.1.3', 'KİM.12.1.1', 'KİM.12.1.2'],
  sources: [
    { label: 'Copper(II) sulfate (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Copper(II)_sulfate' },
    { label: 'Reactivity series (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Reactivity_series' },
    { label: 'Iron(II) sulfate (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Iron(II)_sulfate' },
  ],
  bench: { vessels: [{ id: 'beaker', kind: 'beaker100', labelTr: 'Beher' }] },
  shelf: ['cuso4-0.1M', 'fe-nail', 'zn-granule', 'cu-wire', 'znso4-0.1M', 'water'],
  equations: [
    { id: 'e5-full', titleTr: 'Tam denklem', reactants: { 's:fe': 1, 'Cu(2+)': 1, 'SO4(2-)': 1 }, products: { 'Fe(2+)': 1, 'SO4(2-)': 1, 's:cu': 1 }, wordTr: 'demir + bakır sülfat -> demir sülfat + bakır' },
    { id: 'e5-net', titleTr: 'Net iyon denklemi', reactants: { 's:fe': 1, 'Cu(2+)': 1 }, products: { 'Fe(2+)': 1, 's:cu': 1 } },
  ],
  steps: [
    { id: 'cozelti', textTr: 'Behere 50 mL 0,1 M bakır(II) sülfat çözeltisi koy.', hintTr: 'Çözeltinin mavi rengine dikkat et.', done: (v) => v.volumeMl('beaker') >= 49.5 },
    { id: 'tahmin', textTr: 'Tahmin et: çivinin yüzeyi hangi renge dönecek?', hintTr: 'Daha etkin metal, daha az etkin metali çıkarır.', done: (v) => v.volumeMl('beaker') >= 49.5 },
    { id: 'civi', textTr: 'Temiz demir çiviyi çözeltiye bırak.', hintTr: 'Çivi yaklaşık 3 g.', done: (v) => v.grams('beaker', 's:fe') > 2.5 },
    { id: 'kaplama', textTr: 'Çivi yüzeyinde kırmızımsı kaplamayı izle.', hintTr: 'Bu bakırdır.', done: (v) => v.observed('deposit', 'beaker') },
    { id: 'renk', textTr: 'Çözeltinin renginin solmasını izle.', hintTr: 'Mavi Cu2+ iyonları azalıyor.', done: (v) => v.did('add', 'beaker') && v.colour('beaker')[0] > 150 },
  ],
  expectations: [
    { id: 'deposit', textTr: 'Çivinin üzerinde bakır birikti (yaklaşık 0,32 g).', check: (v) => Math.abs(v.solidG('beaker', 'cu') - 0.318) < 0.03 },
    { id: 'iron', textTr: 'Demirden yaklaşık 0,28 g çözündü.', check: (v) => Math.abs(3 - v.solidG('beaker', 'fe') - 0.279) < 0.03 },
    { id: 'fade', textTr: 'Çözeltinin mavisi büyük ölçüde soldu.', check: (v) => v.colour('beaker')[0] > 190 },
    { id: 'fe2', textTr: 'Çözeltide Fe2+ var (açık yeşilimsi).', check: (v) => v.moles('beaker', 'Fe(2+)') > 0.0045 },
  ],
  measurables: [
    { id: 'cu-g', labelTr: 'Biriken bakır', unit: 'g', read: (v) => v.solidG('beaker', 'cu'), expected: 0.318, tolerance: 0.1 },
    { id: 'cu2', labelTr: 'Çözeltideki Cu2+', unit: 'mol', read: (v) => v.moles('beaker', 'Cu(2+)') },
  ],
  solution,
  variants: {
    'cinko-bakir-nitrat': [
      { op: 'pour', from: 'cuno32-0.1M', to: 'beaker', ml: 50 },
      { op: 'add', reagent: 'zn-granule', to: 'beaker', g: 2 },
      { op: 'wait', s: 600 },
    ],
    'bakir-demir-sulfat': [
      { op: 'pour', from: 'feso4-0.1M', to: 'beaker', ml: 50 },
      { op: 'add', reagent: 'cu-wire', to: 'beaker', g: 2 },
      { op: 'wait', s: 600 },
    ],
  },
  particles: [
    {
      id: 'e5-particles', equationId: 'e5-net', titleTr: 'Demir atomları elektron verir, Cu2+ elektron alıp bakır olur', durationS: 14,
      species: [
        { id: 'fe', labelTr: 'Demir atomu (çivi)', formula: 'Fe', charge: 0, kind: 'atom' },
        { id: 'fe2', labelTr: 'Demir(II) iyonu', formula: 'Fe', charge: 2, kind: 'ion' },
        { id: 'cu2', labelTr: 'Bakır(II) iyonu', formula: 'Cu', charge: 2, kind: 'ion' },
        { id: 'cu', labelTr: 'Bakır atomu (kaplama)', formula: 'Cu', charge: 0, kind: 'atom' },
        { id: 'so4', labelTr: 'Sülfat iyonu', formula: 'SO4', charge: -2, kind: 'ion' },
        { id: 'e', labelTr: 'Elektron', formula: '', charge: -1, kind: 'electron' },
      ],
      stages: [
        stage('basla', 0, 3, 'Çivinin yüzeyinde Fe atomları, suda mavi Cu2+ ve sülfat iyonları.', { fe: 4, fe2: 0, cu2: 4, cu: 0, so4: 4, e: 0 }, 'random'),
        stage('elektron', 3, 7, 'Yüzeydeki her Fe atomu 2 elektron bırakır ve Fe2+ olarak suya geçer. Elektronlar metalde ilerler.', { fe: 0, fe2: 4, cu2: 4, cu: 0, so4: 4, e: 8 }, 'drift', { transfers: [{ kind: 'electron', from: 'fe', to: 'e', count: 8 }], breaks: [{ species: 'fe', bond: 'metallic' }] }),
        stage('bakir', 7, 11, 'Yakındaki Cu2+ iyonları bu elektronları alır, bakır atomuna dönüşüp yüzeye yapışır.', { fe: 0, fe2: 4, cu2: 0, cu: 4, so4: 4, e: 0 }, 'attract', { transfers: [{ kind: 'electron', from: 'e', to: 'cu2', count: 8 }], forms: [{ species: 'cu', bond: 'metallic' }] }),
        stage('sonuc', 11, 14, 'Sülfat iyonları değişmeden izleyici kaldı. Çözeltide mavi azaldı, çivide kırmızımsı bakır var.', { fe: 0, fe2: 4, cu2: 0, cu: 4, so4: 4, e: 0 }, 'static', { focus: ['cu'] }),
      ],
    },
  ],
};
