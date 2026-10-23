/**
 * E6 Magnezyum + seyreltik HCl: hydrogen gas and reaction rate (concentration, surface, temperature).
 * Sources: https://en.wikipedia.org/wiki/Magnesium , https://en.wikipedia.org/wiki/Hydrogen_safety ,
 * https://science.cleapss.org.uk/Resource/SSS081-Group-II-metals.pdf , https://en.wikipedia.org/wiki/Reaction_rate ;
 * programme: MEB KIM 12.1.1, 11.1.5-11.1.7, 10.1.3, MEB FEN 8.5.8 (docs/research/kimya-lab.md section 2/E6).
 * Our arithmetic: 0.10 g Mg = 4.11 mmol -> 4.11 mmol H2, about 0.10 L at 25 degC; 20 mL of 1 M HCl (20 mmol) is in excess.
 */
import type { Op } from '../labTypes';
import { stage, type ExperimentDef } from './types';

const setup: Op[] = [
  { op: 'pour', from: 'hcl-1M', to: 'tube', ml: 20 },
  { op: 'gasline', from: 'tube', to: 'collector' },
];

export const E06: ExperimentDef = {
  id: 'magnezyum-asit',
  no: 6,
  titleTr: 'Magnezyum + seyreltik HCl: hidrojen ve tepkime hızı',
  summaryTr: 'Magnezyum şerit asitte kabarcıklar çıkararak çözünür. Çıkan hidrojeni tüpte topla, alevle sına; asit derişimi, toz hâli ve sıcaklığın hızı nasıl değiştirdiğini karşılaştır.',
  levels: ['ileri'],
  virtualOnly: false,
  safetyTr: ['Gözlük ve eldiven tak, havalandırılan bir yerde çalış.', 'Hidrojen çok kolay yanar; alevden uzak tut. Sanal denemede tüpteki gazı alevle sınayabilirsin.'],
  homeTr: 'Evde denenmez.',
  kazanim: ['FB.8.5.8', 'KİM.10.1.3', 'KİM.11.1.5', 'KİM.11.1.7', 'KİM.12.1.1'],
  sources: [
    { label: 'Magnesium (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Magnesium' },
    { label: 'Hydrogen safety (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Hydrogen_safety' },
    { label: 'CLEAPSS SSS081 Group II metals', url: 'https://science.cleapss.org.uk/Resource/SSS081-Group-II-metals.pdf' },
  ],
  bench: { vessels: [{ id: 'tube', kind: 'testtube', labelTr: 'Deney tüpü' }, { id: 'collector', kind: 'gas-tube', labelTr: 'Gaz toplama tüpü' }] },
  shelf: ['hcl-1M', 'hcl-0.1M', 'water', 'mg-ribbon', 'mg-powder', 'zn-granule', 'fe-nail', 'cu-wire'],
  equations: [
    { id: 'e6-full', titleTr: 'Tam denklem', reactants: { 's:mg': 1, 'H+': 2, 'Cl-': 2 }, products: { 'Mg(2+)': 1, 'Cl-': 2, 'g:h2': 1 }, wordTr: 'magnezyum + hidroklorik asit -> magnezyum klorür + hidrojen' },
    { id: 'e6-net', titleTr: 'Net iyon denklemi', reactants: { 's:mg': 1, 'H+': 2 }, products: { 'Mg(2+)': 1, 'g:h2': 1 } },
  ],
  steps: [
    { id: 'asit', textTr: 'Deney tüpüne 20 mL 1 M HCl koy.', hintTr: 'Gözlüğünü unutma.', done: (v) => v.volumeMl('tube') >= 19.5 },
    { id: 'hortum', textTr: 'Tüpü gaz toplama tüpüne hortumla bağla.', hintTr: 'Çıkan gaz toplama tüpüne gidecek.', done: (v) => v.gasLine('tube') === 'collector' },
    { id: 'tahmin', textTr: 'Tahmin et: asit derişimini iki katına çıkarırsak hız ne olur?', hintTr: 'Çarpışma sayısı artar.', done: (v) => v.did('gasline', 'tube') },
    { id: 'mg', textTr: '0,10 g magnezyum şerit at.', hintTr: 'Şerit asidin içine düşer.', done: (v) => v.did('add', 'tube') },
    { id: 'gaz', textTr: 'Kabarcıkları ve toplanan gazı izle.', hintTr: 'Tüp ısınıyor mu?', done: (v) => v.observed('gas', 'tube') && v.extent('tube', 'redox:mg+H+') > 1e-3 },
    { id: 'alev', textTr: 'Toplama tüpündeki gazı alevle sına.', hintTr: 'Hidrojen tık sesiyle yanar.', done: (v) => v.did('testgas', 'collector') },
  ],
  expectations: [
    { id: 'gas', textTr: 'Magnezyum kabarcık çıkararak çözündü.', check: (v) => v.observed('gas', 'tube') },
    { id: 'h2', textTr: 'Toplanan hidrojen yaklaşık 100 mL (95 mL den fazla olmalı, test yanması hariç).', check: (v) => v.extent('tube', 'redox:mg+H+') * 24465 > 95 },
    { id: 'pop', textTr: 'Gaz alevle tık sesi verdi.', check: (v) => v.observed('sound', 'collector') },
    { id: 'warm', textTr: 'Tüp ısındı.', check: (v) => v.observed('temperature', 'tube') },
  ],
  measurables: [
    { id: 'h2-ml', labelTr: 'Üretilen hidrojen', unit: 'mL', read: (v) => v.extent('tube', 'redox:mg+H+') * 24465, expected: 100.6, tolerance: 0.1 },
    { id: 'temp', labelTr: 'Tüp sıcaklığı', unit: '°C', read: (v) => v.tempC('tube') },
  ],
  solution: [...setup, { op: 'add', reagent: 'mg-ribbon', to: 'tube', g: 0.1 }, { op: 'wait', s: 120 }, { op: 'testgas', vessel: 'collector', test: 'flame' }],
  variants: {
    seyreltik: [{ op: 'pour', from: 'hcl-1M', to: 'tube', ml: 10 }, { op: 'pour', from: 'water', to: 'tube', ml: 10 }, { op: 'gasline', from: 'tube', to: 'collector' }, { op: 'add', reagent: 'mg-ribbon', to: 'tube', g: 0.1 }, { op: 'wait', s: 120 }],
    toz: [...setup, { op: 'add', reagent: 'mg-powder', to: 'tube', g: 0.1 }, { op: 'wait', s: 120 }],
    sicak: [...setup, { op: 'heat', vessel: 'tube', source: 'hotplate' }, { op: 'wait', s: 60 }, { op: 'heat', vessel: 'tube', source: null }, { op: 'add', reagent: 'mg-ribbon', to: 'tube', g: 0.1 }, { op: 'wait', s: 120 }],
  },
  particles: [
    {
      id: 'e6-particles', equationId: 'e6-net', titleTr: 'Mg elektron verir, H+ elektron alıp H2 olur', durationS: 15,
      species: [
        { id: 'mg', labelTr: 'Magnezyum atomu', formula: 'Mg', charge: 0, kind: 'atom' },
        { id: 'mg2', labelTr: 'Magnezyum iyonu', formula: 'Mg', charge: 2, kind: 'ion' },
        { id: 'h3o', labelTr: 'Hidronyum iyonu', formula: 'H3O', charge: 1, kind: 'ion' },
        { id: 'cl', labelTr: 'Klorür iyonu', formula: 'Cl', charge: -1, kind: 'ion' },
        { id: 'e', labelTr: 'Elektron', formula: '', charge: -1, kind: 'electron' },
        { id: 'h', labelTr: 'Hidrojen atomu', formula: 'H', charge: 0, kind: 'atom' },
        { id: 'h2', labelTr: 'Hidrojen molekülü', formula: 'H2', charge: 0, kind: 'molecule' },
        { id: 'water', labelTr: 'Su', formula: 'H2O', charge: 0, kind: 'molecule' },
      ],
      stages: [
        stage('basla', 0, 3, 'Şeridin yüzeyinde Mg atomları, çözeltide H3O+ ve Cl- iyonları.', { mg: 3, mg2: 0, h3o: 12, cl: 12, e: 0, h: 0, h2: 0, water: 0 }, 'random'),
        stage('elektron', 3, 7, 'Her Mg atomu 2 elektron bırakır; Mg2+ olarak çözeltiye geçer.', { mg: 0, mg2: 3, h3o: 12, cl: 12, e: 6, h: 0, h2: 0, water: 0 }, 'drift', { transfers: [{ kind: 'electron', from: 'mg', to: 'e', count: 6 }], breaks: [{ species: 'mg', bond: 'metallic' }] }),
        stage('hidrojen', 7, 11, 'Yüzeydeki H3O+ iyonları elektron alır; H atomu ve su oluşur.', { mg: 0, mg2: 3, h3o: 6, cl: 12, e: 0, h: 6, h2: 0, water: 6 }, 'attract', { transfers: [{ kind: 'electron', from: 'e', to: 'h3o', count: 6 }], breaks: [{ species: 'h3o', bond: 'O-H' }] }),
        stage('kabarcik', 11, 15, 'İki H atomu birleşip H2 molekülü olur; H2 kabarcıkları yükselir. Cl- izleyicidir.', { mg: 0, mg2: 3, h3o: 6, cl: 12, e: 0, h: 0, h2: 3, water: 6 }, 'rise', { forms: [{ species: 'h2', bond: 'H-H' }], focus: ['h2'] }),
      ],
    },
  ],
};
