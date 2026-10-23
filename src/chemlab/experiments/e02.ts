/**
 * E2 Kırmızı lahana ayıracı: colour of an anthocyanin indicator in five household liquids.
 * Sources: https://en.wikipedia.org/wiki/Anthocyanin , https://en.wikipedia.org/wiki/PH_indicator ,
 * https://en.wikipedia.org/wiki/PH , https://en.wikipedia.org/wiki/Vinegar (distilled vinegar pH about 2.6);
 * programme: MEB FEN 8.5.5-8.5.7 (docs/research/kimya-lab.md section 2/E2).
 */
import type { Op } from '../labTypes';
import { stage, type ExperimentDef } from './types';

const TUBES = ['t1', 't2', 't3', 't4', 't5'] as const;
const LIQUIDS = ['lemon-juice', 'vinegar', 'water', 'baking-soda-solution', 'soap-solution'] as const;

const solution: Op[] = [
  ...TUBES.map((t): Op => ({ op: 'pour', from: 'cabbage-extract', to: t, ml: 5 })),
  ...TUBES.map((t, i): Op => ({ op: 'pour', from: LIQUIDS[i] ?? 'water', to: t, ml: 5 })),
  { op: 'wait', s: 1 },
  { op: 'dip', strip: 'universal-strip', vessel: 't1' },
];

export const E02: ExperimentDef = {
  id: 'kirmizi-lahana',
  no: 2,
  titleTr: 'Kırmızı lahana ayıracı',
  summaryTr: 'Mor lahana suyu asitte kırmızıya, bazda maviye ve yeşile döner. Beş sıvıyı sına ve renklerinden pH sırasını tahmin et.',
  levels: ['temel'],
  virtualOnly: false,
  safetyTr: ['Bilinmeyen sıvıları tatma ve koklama.', 'Gerçekte çamaşır suyu ve tuz ruhu gibi temizlik ürünleriyle deneme yapılmaz.'],
  homeTr: 'Yenilebilir sıvılarla evde denenebilir.',
  kazanim: ['FB.8.5.5', 'FB.8.5.6', 'FB.8.5.7'],
  sources: [
    { label: 'Anthocyanin (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Anthocyanin' },
    { label: 'pH indicator (Wikipedia)', url: 'https://en.wikipedia.org/wiki/PH_indicator' },
    { label: 'Vinegar (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Vinegar' },
  ],
  bench: { vessels: TUBES.map((t, i) => ({ id: t, kind: 'testtube' as const, labelTr: `Tüp ${i + 1}` })) },
  shelf: ['cabbage-extract', ...LIQUIDS, 'universal-indicator'],
  equations: [],
  steps: [
    { id: 'ayirac', textTr: 'Her tüpe 5 mL lahana ayıracı koy.', hintTr: 'Ayıraç mordur: nötr suda bu renktedir.', done: (v) => TUBES.every((t) => v.indicatorMl(t, 'red-cabbage') >= 4.5) },
    { id: 'tahmin', textTr: 'Tahmin et: sabunlu su ayıracı hangi renge çevirir?', hintTr: 'Asit kırmızı, baz mavi-yeşil yönüne götürür.', done: (v) => TUBES.every((t) => v.volumeMl(t) >= 4.5) },
    { id: 'sivilar', textTr: 'Tüplere sırayla limon suyu, sirke, su, kabartma tozu çözeltisi ve sabunlu su ekle (5 mL).', hintTr: 'Her tüpe farklı bir sıvı.', done: (v) => TUBES.every((t) => v.volumeMl(t) >= 9.5) },
    { id: 'renk', textTr: 'Renkleri karşılaştır ve asitten baza doğru sırala.', hintTr: 'Kırmızı, mor, mavi, yeşil.', done: (v) => v.observed('colour') },
    { id: 'ph', textTr: 'Bir tüpü pH kâğıdıyla da kontrol et.', hintTr: 'Kâğıt yaklaşık bir değer verir, tam sayı gibi.', done: (v) => TUBES.some((t) => v.dipped(t)) },
  ],
  expectations: [
    { id: 'lemon-red', textTr: 'Limon suyu tüpü kırmızımsı.', check: (v) => v.colour('t1')[0] > v.colour('t1')[2] + 60 },
    { id: 'vinegar-red', textTr: 'Sirke tüpü kırmızımsı.', check: (v) => v.colour('t2')[0] > v.colour('t2')[2] + 30 },
    { id: 'water-purple', textTr: 'Su tüpü mor (kırmızı ve mavi birlikte).', check: (v) => v.colour('t3')[0] > v.colour('t3')[1] && v.colour('t3')[2] > v.colour('t3')[0] },
    { id: 'soda-blue', textTr: 'Kabartma tozu tüpü mavi tarafa kayar.', check: (v) => v.colour('t4')[2] > v.colour('t4')[0] + 50 },
    { id: 'order', textTr: 'pH sırası: limon < sirke < su < kabartma tozu.', check: (v) => (v.ph('t1') ?? 0) < (v.ph('t2') ?? 0) && (v.ph('t2') ?? 0) < (v.ph('t3') ?? 0) && (v.ph('t3') ?? 0) < (v.ph('t4') ?? 0) },
  ],
  measurables: TUBES.map((t, i) => ({ id: `ph-${t}`, labelTr: `Tüp ${i + 1} pH`, unit: '', read: (v) => v.ph(t) ?? 7 })),
  solution,
  particles: [
    {
      id: 'e2-particles', equationId: 'none', titleTr: 'Ayıraç molekülü H+ kaybettikçe şekli ve rengi değişir', durationS: 12, 
      species: [
        { id: 'flav', labelTr: 'Pigment, asidik şekil (kırmızı)', formula: 'C15H11O6', charge: 1, kind: 'ion' },
        { id: 'quin', labelTr: 'Pigment, nötr şekil (mor)', formula: 'C15H10O6', charge: 0, kind: 'molecule' },
        { id: 'anion', labelTr: 'Pigment, bazik şekil (mavi-yeşil)', formula: 'C15H9O6', charge: -1, kind: 'ion' },
        { id: 'oh', labelTr: 'Hidroksit iyonu', formula: 'OH', charge: -1, kind: 'ion' },
        { id: 'water', labelTr: 'Su', formula: 'H2O', charge: 0, kind: 'molecule' },
        { id: 'na', labelTr: 'Sodyum iyonu', formula: 'Na', charge: 1, kind: 'ion' },
        { id: 'cl', labelTr: 'Klorür iyonu', formula: 'Cl', charge: -1, kind: 'ion' },
      ],
      stages: [
        stage('asit', 0, 4, 'Asidik çözeltide pigment H+ taşır ve kırmızıdır. Baz (Na+ ve OH-) henüz ayrı bekliyor.', { flav: 4, quin: 0, anion: 0, oh: 8, water: 0, na: 8, cl: 4 }, 'random'),
        stage('notr', 4, 8, 'OH- iyonları pigmentten H+ koparır; su oluşur. Pigment mora döner.', { flav: 0, quin: 4, anion: 0, oh: 4, water: 4, na: 8, cl: 4 }, 'approach', { transfers: [{ kind: 'proton', from: 'flav', to: 'oh', count: 4 }], breaks: [{ species: 'flav', bond: 'O-H' }], forms: [{ species: 'water', bond: 'O-H' }] }),
        stage('baz', 8, 12, 'Daha fazla baz ikinci bir H+ daha koparır; pigment mavi-yeşile döner.', { flav: 0, quin: 0, anion: 4, oh: 0, water: 8, na: 8, cl: 4 }, 'random', { transfers: [{ kind: 'proton', from: 'quin', to: 'oh', count: 4 }] }),
      ],
    },
  ],
};
