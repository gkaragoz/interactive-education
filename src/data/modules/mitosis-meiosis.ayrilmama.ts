import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Variant track (İleri only, BİY.12.1.4): non-disjunction of one homologous pair in anaphase I.
// Chart: 'chromosome-count' follows the cell that receives the EXTRA chromosome (n+1); no DNA series here.
export const ayrilmamaTrack: TrackInfo = {
  id: 'mayoz-1-ayrilmama',
  nameTr: 'Mayoz I\'de ayrılmama',
  tagline: 'Bir homolog çift ayrılamazsa gametler nasıl etkilenir?',
  duration: 55,
  levels: ['ileri'],
  notes: [
    'Gösterimde 2n=4 kullanılır: A çifti normal ayrılır, B çifti ayrılamaz.',
    'Yalnızca mayoz I\'de tek bir çiftin ayrılmaması gösterilir; ayrılmama mayoz II\'de kardeş kromatitlerde de olabilir.',
    'Grafik, fazladan kromozom alan (n+1) hücrenin kromozom sayısını izler.',
  ],
  phases: [
    ph({
      id: 'baslangic',
      name: 'Başlangıç',
      start: 0,
      end: 4,
      i: [
        'DNA\'sı eşlenmiş 2n=4 hücrede iki homolog çift vardır: A çifti ve B çifti.',
        ['Bu hücrede A çifti normal ayrılacak, B çifti ise ayrılamayacak.', 'Ayrılmama kendiliğinden gelişen bir kromozom dağılım hatasıdır.'],
      ],
      chart: { 'chromosome-count': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'profaz-1',
      name: 'Profaz I',
      start: 4,
      end: 12,
      i: [
        'Homologlar eşleşir ve parça değişimi olur; bu evrede süreç normal görünür.',
        ['Hata, kromozomların ayrılma anına kadar fark edilmez.', 'Eşleşmiş çiftler tetrat oluşturur.'],
      ],
      chart: { 'chromosome-count': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'metafaz-1',
      name: 'Metafaz I',
      start: 12,
      end: 19,
      i: [
        'Homolog çiftler ekvatora dizilir; B çiftinin üyeleri birbirinden ayrılamayacak şekilde birlikte kalır.',
        ['A çifti normal bağlanır: her üye farklı kutuptan gelen ipliğe tutunur.', 'Ayrılmama, çiftin iki üyesinin aynı kutba gitmesi demektir.'],
      ],
      chart: { 'chromosome-count': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'anafaz-1-ayrilmama',
      name: 'Anafaz I: ayrılmama',
      start: 19,
      end: 29,
      i: [
        'A çiftinin üyeleri zıt kutuplara gider; B çiftinin iki üyesi ise birlikte aynı kutba çekilir.',
        [
          'Bir kutupta 3, diğerinde 1 kromozom toplanır (2n=4 modeli).',
          'Ayrılmama mayoz I\'de homologların, mayoz II\'de kardeş kromatitlerin ayrılmamasıyla ortaya çıkabilir.',
        ],
      ],
      chart: { 'chromosome-count': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'telofaz-1',
      name: 'Telofaz I ve sitokinez',
      start: 29,
      end: 36,
      i: [
        'İki hücre oluşur: biri 3 kromozomlu (n+1), diğeri 1 kromozomlu (n−1).',
        ['Normal mayozda her iki hücre de n=2 kromozom taşırdı.', 'Hata bu aşamada kalıcı hâle gelir; sonraki bölünme onu düzeltmez.'],
      ],
      chart: { 'chromosome-count': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'mayoz-2-ozet',
      name: 'Mayoz II (normal işler)',
      start: 36,
      end: 46,
      i: [
        'İkinci bölünme normal gerçekleşir: iki hücrenin her biri kardeş kromatitlerini ayırarak ikiye bölünür.',
        ['Mayoz II kromozom sayısını düzeltemez; kromozomlar yalnızca kromatitlerine ayrılır.', 'Sonuçta dört hücre oluşur.'],
      ],
      chart: { 'chromosome-count': 3, 'cell-count': 2 },
    }),
    ph({
      id: 'gametler',
      name: 'Sonuç: n+1 ve n−1 gametler',
      start: 46,
      end: 55,
      i: [
        'İki gamet n+1 (3 kromozom), iki gamet n−1 (1 kromozom) taşır; normal (n=2) gamet oluşmaz.',
        [
          'n+1 gametle normal gametin birleşmesi trizomik (2n+1), n−1 gametle birleşmesi monozomik (2n−1) zigot verir.',
          'İnsanda 21. kromozomun üç kopya olması Down sendromuna yol açar (47 kromozom).',
          'İnsanda çoğu otozomal kromozom sayısı bozukluğu embriyonun gelişimini sürdürmesine izin vermez.',
        ],
      ],
      chart: { 'chromosome-count': 3, 'cell-count': 4 },
    }),
  ],
};
