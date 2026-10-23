import type { CellInfo } from './types';

// Placement rules feed the scene layout solver. Counts are illustrative, not measured; they follow the usual
// textbook picture of each cell type. Shell half-extents are in scene units (micrometres, mildly exaggerated).
export const cells: CellInfo[] = [
  {
    id: 'animal',
    nameTr: 'Hayvan hücresi',
    kind: 'ökaryot',
    tagline: 'Zarla çevrili organelleri olan, duvarsız hücre',
    levels: ['temel', 'ileri'],
    text: {
      temel: {
        summary: 'Hayvan hücresinde hücre zarı, sitoplazma, çekirdek ve mitokondri gibi parçalar bulunur. Kloroplastı ve hücre duvarı yoktur.',
        details: [],
      },
      ileri: {
        summary: 'Hayvan hücresi, çekirdeği ve zarlı organelleri olan bir ökaryot hücredir; hücre duvarı ve kloroplast taşımaz.',
        details: [
          'DNA, çift zarlı çekirdeğin içinde bulunur.',
          'Mitokondriler enerji üretir; ER ve Golgi aygıtı protein ve lipit işlemleme hattını oluşturur.',
          'Lizozomlar sindirimi, sentrozom hücre bölünmesindeki iplik düzenini organize eder.',
          'Küçük kofullar bulunur; büyük merkezî koful yoktur.',
          'Ökaryot hücrelerin çapı yaklaşık 10–100 µm arasındadır.',
        ],
      },
    },
    shell: { shape: 'ellipsoid', halfExtents: [11, 8.5, 9.5] },
    placements: [
      { organelleId: 'nucleus', count: 1, zone: 'center' },
      { organelleId: 'rough-er', count: 2, zone: 'nucleus-near' },
      { organelleId: 'smooth-er', count: 2, zone: 'cytoplasm' },
      { organelleId: 'golgi', count: 1, zone: 'nucleus-near' },
      { organelleId: 'centrosome', count: 1, zone: 'nucleus-near' },
      { organelleId: 'mitochondrion', count: 11, zone: 'cytoplasm' },
      { organelleId: 'lysosome', count: 8, zone: 'cytoplasm' },
      { organelleId: 'ribosome', count: 18, zone: 'cytoplasm' },
      { organelleId: 'vacuole', count: 3, zone: 'periphery', scale: [0.4, 0.4, 0.4] },
    ],
    shellOrganelleIds: ['membrane-animal'],
    kazanimIds: ['FB.5.3.1', 'BİY.9.2.1'],
    sourceIds: ['meb-fen-2026', 'meb-biyoloji-2026', 'wp-tr-hucre', 'wp-tr-okaryot', 'wp-tr-organel', 'wp-en-cell', 'os-4-3'],
    micrographIds: ['mg-cheek-cells', 'mg-nucleus-rer', 'mg-mitochondria', 'mg-golgi', 'mg-centriole'],
  },
  {
    id: 'plant',
    nameTr: 'Bitki hücresi',
    kind: 'ökaryot',
    tagline: 'Duvarlı, kloroplastlı ve büyük kofullu hücre',
    levels: ['temel', 'ileri'],
    text: {
      temel: {
        summary: 'Bitki hücresinde hayvan hücresindekilere ek olarak hücre duvarı, kloroplast ve büyük bir koful bulunur.',
        details: [],
      },
      ileri: {
        summary: 'Bitki hücresi, selüloz duvarı, kloroplastları ve büyük merkezî kofulu olan bir ökaryot hücredir.',
        details: [
          'Hücre duvarı, hücre zarının dışında yer alır ve hücreye sağlamlık kazandırır.',
          'Kloroplastlar fotosentezle besin üretir; mitokondriler bu besinden enerji elde eder.',
          'Büyük merkezî koful sitoplazmayı ve çekirdeği hücre çeperine doğru iter.',
          'Çoğu bitki hücresinde sentrozom ve lizozom bulunmaz; sindirim büyük ölçüde kofulda yapılır.',
          'Golgi aygıtı ve ER, hayvan hücresindekiyle benzer işlevleri sürdürür.',
        ],
      },
    },
    shell: { shape: 'rounded-box', halfExtents: [13, 7, 10] },
    placements: [
      { organelleId: 'vacuole', count: 1, zone: 'center', scale: [2.7, 2, 3] },
      { organelleId: 'nucleus', count: 1, zone: 'periphery' },
      { organelleId: 'chloroplast', count: 14, zone: 'periphery' },
      { organelleId: 'mitochondrion', count: 10, zone: 'cytoplasm' },
      { organelleId: 'rough-er', count: 3, zone: 'nucleus-near' },
      { organelleId: 'smooth-er', count: 3, zone: 'periphery' },
      { organelleId: 'golgi', count: 3, zone: 'periphery' },
      { organelleId: 'ribosome', count: 24, zone: 'cytoplasm' },
    ],
    shellOrganelleIds: ['membrane-plant', 'wall-plant'],
    kazanimIds: ['FB.5.3.1', 'FB.8.7.1', 'BİY.9.2.1'],
    sourceIds: ['meb-fen-2026', 'meb-biyoloji-2026', 'wp-tr-hucre', 'wp-tr-okaryot', 'wp-tr-organel', 'wp-en-plant-cell', 'wp-en-cell', 'os-4-3'],
    micrographIds: ['mg-onion', 'mg-elodea', 'mg-chloroplast'],
  },
  {
    id: 'bacterium',
    nameTr: 'Bakteri hücresi',
    kind: 'prokaryot',
    tagline: 'Çekirdeği ve zarlı organelleri olmayan küçük hücre',
    levels: ['ileri'],
    text: {
      ileri: {
        summary: 'Bakteri, DNA\'sı zarla çevrili bir çekirdekte bulunmayan, zarlı organelleri olmayan prokaryot bir hücredir.',
        details: [
          'DNA, nükleoit adı verilen zarsız bölgede toplanır; ayrıca küçük halkalı plazmitler bulunabilir.',
          'Protein yapımı serbest ribozomlarla yapılır.',
          'Hücre zarfı zar, duvar ve çoğu zaman kapsülden oluşur.',
          'Bazı bakterilerde hareket için kamçı, tutunma ve DNA aktarımı için pilus bulunur.',
          'Prokaryot hücreler genellikle ökaryotlardan çok daha küçüktür (yaklaşık 0,1–5 µm).',
        ],
      },
    },
    shell: { shape: 'capsule', halfExtents: [6.2, 2, 2] },
    placements: [
      { organelleId: 'nucleoid', count: 1, zone: 'center' },
      { organelleId: 'plasmid', count: 4, zone: 'cytoplasm' },
      { organelleId: 'ribosome', count: 22, zone: 'cytoplasm' },
      { organelleId: 'flagellum', count: 1, zone: 'wall-adjacent' },
      { organelleId: 'pilus', count: 8, zone: 'wall-adjacent' },
    ],
    shellOrganelleIds: ['envelope-bacterium'],
    kazanimIds: ['BİY.9.2.1', 'BİY.9.2.5'],
    sourceIds: ['meb-biyoloji-2026', 'wp-tr-prokaryot', 'wp-tr-bakteri', 'wp-en-bacterial-cell-structure', 'wp-en-prokaryote', 'os-4-2'],
    micrographIds: ['mg-ecoli'],
  },
];
