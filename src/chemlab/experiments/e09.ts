/**
 * E9 Hidrojen peroksit + katalizör (safe version, 3 % peroxide, yeast as catalase source): 2 H2O2 -> 2 H2O + O2.
 * Sources: https://en.wikipedia.org/wiki/Elephant%27s_toothpaste , https://en.wikipedia.org/wiki/Catalase ,
 * https://en.wikipedia.org/wiki/Catalysis , https://en.wikipedia.org/wiki/Activation_energy ;
 * programme: MEB KIM 11.1.1, 11.1.5, 11.1.7 (enrichment, "Ek bilgi"; docs/research/kimya-lab.md section 2/E9).
 * Our arithmetic: 50 mL x 0.88 M = 44 mmol H2O2 -> 22 mmol O2, about 0.54 L; dH about -98 kJ/mol H2O2 warms the mix by about 14 K.
 */
import type { Op } from '../labTypes';
import { stage, type ExperimentDef } from './types';

const prep: Op[] = [
  { op: 'pour', from: 'h2o2-3pct', to: 'cyl', ml: 50 },
  { op: 'add', reagent: 'soap', to: 'cyl', g: 0.3 },
];

export const E09: ExperimentDef = {
  id: 'hidrojen-peroksit-katalizor',
  no: 9,
  titleTr: 'Hidrojen peroksit ve katalizör: köpük',
  summaryTr: 'Seyreltik hidrojen peroksit kendi kendine çok yavaş bozunur. Maya (katalaz) eklenince oksijen hızla çıkar ve sabunlu karışım köpük olup taşar. Katalizör kendisi harcanmaz.',
  levels: ['ileri'],
  virtualOnly: false,
  safetyTr: ['Gözlük tak.', 'Sanal denemede yalnızca %3 peroksit vardır; güçlü peroksit cildi yakar ve hiç denenmez.', 'Kapalı şişede yapma.'],
  homeTr: 'Yalnızca %3 peroksitle ve büyüklerin gözetiminde; kuvvetli peroksitle asla.',
  kazanim: ['KİM.11.1.1', 'KİM.11.1.5', 'KİM.11.1.7'],
  sources: [
    { label: "Elephant's toothpaste (Wikipedia)", url: 'https://en.wikipedia.org/wiki/Elephant%27s_toothpaste' },
    { label: 'Catalase (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Catalase' },
    { label: 'Catalysis (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Catalysis' },
  ],
  bench: { vessels: [{ id: 'cyl', kind: 'cylinder100', labelTr: 'Uzun silindir' }] },
  shelf: ['h2o2-3pct', 'soap', 'yeast', 'mno2', 'ki-0.1M', 'water'],
  equations: [
    { id: 'e9-full', titleTr: 'Bozunma tepkimesi (katalizör okun üstünde)', reactants: { h2o2: 2 }, products: { water: 2, 'g:o2': 1 }, wordTr: 'hidrojen peroksit -> su + oksijen (katalizör varken hızlı)' },
  ],
  steps: [
    { id: 'peroksit', textTr: 'Silindire 50 mL %3 hidrojen peroksit koy.', hintTr: 'Gözlüğünü tak.', done: (v) => v.volumeMl('cyl') >= 49.5 },
    { id: 'sabun', textTr: 'Biraz sabun ekle (köpük için).', hintTr: 'Sabun gazı tutar.', done: (v) => v.grams('cyl', 'laurate-') > 0.1 || v.did('add', 'cyl') },
    { id: 'tahmin', textTr: 'Tahmin et: mayayı eklemezsek köpük olur mu?', hintTr: 'Katalizör olmadan tepkime çok yavaştır.', done: (v) => v.did('add', 'cyl') },
    { id: 'maya', textTr: '1,5 g maya ekle.', hintTr: 'Maya katalaz denen enzim taşır.', done: (v) => v.catalystG('cyl', 'yeast') >= 1 },
    { id: 'kopuk', textTr: 'Köpüğü izle.', hintTr: 'Oksijen sabun filminde tutulur.', done: (v) => v.observed('foam', 'cyl') },
    { id: 'sicaklik', textTr: 'Silindirin ısındığını fark et.', hintTr: 'Tepkime ısı veriyor.', done: (v) => v.observed('temperature', 'cyl') },
  ],
  expectations: [
    { id: 'gas', textTr: 'Hızlı oksijen çıkışı gözlendi.', check: (v) => v.observed('gas', 'cyl') },
    { id: 'foam', textTr: 'Köpük oluştu.', check: (v) => v.observed('foam', 'cyl') },
    { id: 'warm', textTr: 'Karışım ısındı (yaklaşık +10 °C ve üstü).', check: (v) => v.tempC('cyl') > 30 },
    { id: 'o2', textTr: 'Yaklaşık 0,5 L oksijen oluştu.', check: (v) => Math.abs(v.extent('cyl', 'decomp:h2o2') * 24465 - 540) < 40 },
    { id: 'catalyst', textTr: 'Katalizör harcanmadı.', check: (v) => v.catalystG('cyl', 'yeast') >= 1.49 },
  ],
  measurables: [
    { id: 'o2-ml', labelTr: 'Oluşan oksijen', unit: 'mL', read: (v) => v.extent('cyl', 'decomp:h2o2') * 24465, expected: 540, tolerance: 0.08 },
    { id: 'temp', labelTr: 'Sıcaklık', unit: '°C', read: (v) => v.tempC('cyl') },
  ],
  solution: [...prep, { op: 'add', reagent: 'yeast', to: 'cyl', g: 1.5 }, { op: 'wait', s: 400 }],
  variants: {
    katalizorsuz: [...prep, { op: 'wait', s: 600 }],
    iyodur: [...prep, { op: 'pour', from: 'ki-0.1M', to: 'cyl', ml: 5 }, { op: 'wait', s: 400 }],
  },
  particles: [
    {
      id: 'e9-particles', equationId: 'e9-full', titleTr: 'Katalizör daha kolay bir yol açar; O-O bağı kopar, O2 çıkar', durationS: 14,
      species: [
        { id: 'h2o2', labelTr: 'Hidrojen peroksit', formula: 'H2O2', charge: 0, kind: 'molecule' },
        { id: 'cat', labelTr: 'Katalizör (katalaz)', formula: '', charge: 0, kind: 'catalyst' },
        { id: 'water', labelTr: 'Su', formula: 'H2O', charge: 0, kind: 'molecule' },
        { id: 'o', labelTr: 'Oksijen atomu', formula: 'O', charge: 0, kind: 'atom' },
        { id: 'o2', labelTr: 'Oksijen molekülü', formula: 'O2', charge: 0, kind: 'molecule' },
      ],
      stages: [
        stage('basla', 0, 3, 'Peroksit molekülleri suda yavaş yavaş bozunur; katalizör henüz yok sayılır.', { h2o2: 6, cat: 1, water: 0, o: 0, o2: 0 }, 'random'),
        stage('baglan', 3, 6, 'Katalizör peroksiti yakalar ve düşük enerjili bir yol sunar (etkinleşme enerjisi azalır).', { h2o2: 6, cat: 1, water: 0, o: 0, o2: 0 }, 'approach', { focus: ['cat'] }),
        stage('kop', 6, 10, 'O-O bağı kopar: su molekülleri ve O atomları oluşur.', { h2o2: 0, cat: 1, water: 6, o: 6, o2: 0 }, 'random', { breaks: [{ species: 'h2o2', bond: 'O-O' }], forms: [{ species: 'water', bond: 'O-H' }] }),
        stage('o2', 10, 14, 'O atomları ikişer ikişer birleşip O2 olur; kabarcıklar sabun filminde tutulup köpüğü yükseltir. Katalizör aynen kalır.', { h2o2: 0, cat: 1, water: 6, o: 0, o2: 3 }, 'rise', { forms: [{ species: 'o2', bond: 'O=O' }], focus: ['o2'] }),
      ],
    },
  ],
};
