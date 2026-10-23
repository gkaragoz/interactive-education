import type { CellInfo, Kazanim, Micrograph, OrganelleInfo, Source } from '../../src/data/types';
import type { DataBundle } from '../../src/core';

/** Small hand-written dataset for unit tests and for developing the UI before the real content exists. */

export const sources: Source[] = [
  { id: 'meb-fen', kind: 'meb', title: 'Fen Bilimleri Dersi Öğretim Programı', url: 'https://tymm.meb.gov.tr/', publisher: 'MEB', license: 'MEB (resmi program)', lang: 'tr', accessed: '2026-10-01' },
  { id: 'wp-tr-hucre', kind: 'wikipedia', title: 'Hücre', url: 'https://tr.wikipedia.org/wiki/H%C3%BCcre', publisher: 'Vikipedi', license: 'CC BY-SA 4.0', lang: 'tr', accessed: '2026-10-01' },
  { id: 'cm-test', kind: 'commons', title: 'Test <b>micrograph</b>', url: 'https://commons.wikimedia.org/wiki/File:Test.jpg', publisher: 'Jane Author', license: 'CC BY 4.0', lang: 'en', accessed: '2026-10-01' },
];

export const kazanimlar: Kazanim[] = [
  { id: 'FB.5.3.1', grade: 5, subject: 'fen-bilimleri', theme: 'Canlıların Yapısına Yolculuk', summaryTr: 'Bitki ve hayvan hücrelerini karşılaştırır.', sourceId: 'meb-fen' },
];

const text = (s: string): OrganelleInfo['text'] => ({
  temel: { summary: s, function: `${s} (işlev)`, details: [] },
  ileri: { summary: s, function: `${s} (işlev, ileri)`, details: ['Ayrıntı bir', 'Ayrıntı iki'] },
});

const org = (id: string, nameTr: string, color: string, levels: OrganelleInfo['levels'] = ['temel', 'ileri']): OrganelleInfo => ({
  id,
  nameTr,
  nameEn: id,
  tagline: `${nameTr} kısa tanım`,
  sizeUm: '1–5 µm',
  location: 'Sitoplazma',
  visibleInLightMicroscope: id === 'nucleus',
  levels,
  text: text(`${nameTr} özeti`),
  funFact: `${nameTr} hakkında ilginç bilgi`,
  kazanimIds: ['FB.5.3.1'],
  sourceIds: ['meb-fen', 'wp-tr-hucre'],
  color,
});

export const organelles: OrganelleInfo[] = [
  org('nucleus', 'Çekirdek', '#7b5aa6'),
  org('mitochondrion', 'Mitokondri', '#e08a3c'),
  org('rough-er', 'Granüllü ER', '#d56c6c', ['ileri']),
  org('smooth-er', 'Granülsüz ER', '#e2a0a0', ['ileri']),
  org('golgi', 'Golgi aygıtı', '#d8b24a', ['ileri']),
  org('ribosome', 'Ribozom', '#555e8a', ['ileri']),
  org('lysosome', 'Lizozom', '#8fa83c'),
  org('centrosome', 'Sentrozom', '#4f9aa8', ['ileri']),
  org('vacuole', 'Koful', '#6fa8d6'),
  org('chloroplast', 'Kloroplast', '#5f9a3a'),
  org('nucleoid', 'Nükleoid', '#8a5a9a', ['ileri']),
  org('plasmid', 'Plazmit', '#c05a8a', ['ileri']),
  org('flagellum', 'Kamçı', '#7a7a3a', ['ileri']),
  org('pilus', 'Pilus', '#9a8a5a', ['ileri']),
  org('membrane-animal', 'Hücre zarı', '#e7b9a0'),
  org('membrane-plant', 'Hücre zarı', '#e7b9a0'),
  org('wall-plant', 'Hücre duvarı', '#8fae5a'),
  org('envelope-bacterium', 'Hücre zarfı', '#c9b57a', ['ileri']),
];

const base = { levels: ['temel', 'ileri'] as CellInfo['levels'], kazanimIds: ['FB.5.3.1'], sourceIds: ['meb-fen'] };

export const cells: CellInfo[] = [
  {
    ...base,
    id: 'animal',
    nameTr: 'Hayvan hücresi',
    kind: 'ökaryot',
    tagline: 'Duvarı olmayan ökaryot hücre',
    text: { temel: { summary: 'Hayvan hücresi', details: [] }, ileri: { summary: 'Hayvan hücresi ileri', details: ['a'] } },
    shell: { shape: 'ellipsoid', halfExtents: [16, 12, 14] },
    placements: [
      { organelleId: 'nucleus', count: 1, zone: 'center' },
      { organelleId: 'mitochondrion', count: 8, zone: 'cytoplasm' },
      { organelleId: 'rough-er', count: 2, zone: 'nucleus-near' },
      { organelleId: 'golgi', count: 1, zone: 'nucleus-near' },
      { organelleId: 'lysosome', count: 6, zone: 'cytoplasm' },
      { organelleId: 'centrosome', count: 1, zone: 'nucleus-near' },
      { organelleId: 'ribosome', count: 14, zone: 'cytoplasm' },
    ],
    shellOrganelleIds: ['membrane-animal'],
    micrographIds: ['mg-1'],
  },
  {
    ...base,
    id: 'plant',
    nameTr: 'Bitki hücresi',
    kind: 'ökaryot',
    tagline: 'Duvarlı, kloroplastlı ökaryot hücre',
    text: { temel: { summary: 'Bitki hücresi', details: [] }, ileri: { summary: 'Bitki hücresi ileri', details: ['a'] } },
    shell: { shape: 'rounded-box', halfExtents: [20, 12, 14] },
    placements: [
      { organelleId: 'nucleus', count: 1, zone: 'center' },
      { organelleId: 'vacuole', count: 1, zone: 'cytoplasm' },
      { organelleId: 'chloroplast', count: 10, zone: 'wall-adjacent' },
      { organelleId: 'mitochondrion', count: 6, zone: 'periphery' },
      { organelleId: 'rough-er', count: 2, zone: 'nucleus-near' },
      { organelleId: 'golgi', count: 3, zone: 'cytoplasm' },
    ],
    shellOrganelleIds: ['wall-plant', 'membrane-plant'],
    micrographIds: ['mg-1'],
  },
  {
    ...base,
    id: 'bacterium',
    nameTr: 'Bakteri hücresi',
    kind: 'prokaryot',
    tagline: 'Çekirdeksiz prokaryot hücre',
    levels: ['ileri'],
    text: { ileri: { summary: 'Bakteri ileri', details: ['a'] } },
    shell: { shape: 'capsule', halfExtents: [10, 4, 4] },
    placements: [
      { organelleId: 'nucleoid', count: 1, zone: 'center' },
      { organelleId: 'plasmid', count: 3, zone: 'cytoplasm' },
      { organelleId: 'ribosome', count: 30, zone: 'cytoplasm' },
      { organelleId: 'flagellum', count: 1, zone: 'wall-adjacent' },
      { organelleId: 'pilus', count: 6, zone: 'wall-adjacent' },
    ],
    shellOrganelleIds: ['envelope-bacterium'],
    micrographIds: [],
  },
];

export const micrographs: Micrograph[] = [
  { id: 'mg-1', cellId: 'plant', kind: 'light', titleTr: 'Soğan zarı', file: 'micrographs/plant-onion-epidermis.webp', pageUrl: 'https://commons.wikimedia.org/wiki/File:Test.jpg', author: 'Jane Author', license: 'CC BY 4.0', sourceId: 'cm-test' },
];

export const bundle: DataBundle = { sources, kazanimlar, organelles, cells, micrographs };

/** Radius table roughly matching docs/ASSETS.md sizes, for layout tests. */
export const BOUNDS_RADIUS: Record<string, number> = {
  nucleus: 3,
  mitochondrion: 1.8,
  'rough-er': 2,
  'smooth-er': 1.8,
  golgi: 1.9,
  ribosome: 0.7,
  lysosome: 0.6,
  centrosome: 0.9,
  vacuole: 6,
  chloroplast: 2.8,
  nucleoid: 1.8,
  plasmid: 0.5,
  flagellum: 3.6,
  pilus: 1.1,
};
