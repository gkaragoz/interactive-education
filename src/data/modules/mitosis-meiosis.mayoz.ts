import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Meiosis I (50 s) and meiosis II (40 s). Chart values: 2n=4 model, chromosomes counted by centromeres PER CELL
// (values at the START of each phase), DNA in C units per cell (2C = one G1 cell), cells = cells in the picture.
// FB.8.3.3 says phases are not entered at grade 8 (only that meiosis has two stages), so Temel uses coarse steps.
export const mayoz1Track: TrackInfo = {
  id: 'mayoz-1',
  nameTr: 'Mayoz I',
  tagline: 'Homolog kromozomlar ayrılır, kromozom sayısı yarıya iner',
  duration: 50,
  levels: ['temel', 'ileri'],
  notes: [
    'Gösterimde 2n=4 (iki homolog çift) kullanılır; insanda 23 homolog çift vardır.',
    'Mayozdan önceki DNA eşlenmesi tamamlanmış kabul edilir; süreler gerçek ölçekte değildir.',
    'Krossing over\'ın sayısı ve yeri gerçekte her mayozda farklıdır; burada birkaç örnek gösterilir.',
    'Sperm ve yumurta oluşumundaki farklar (sitoplazmanın paylaşımı) gösterilmez.',
  ],
  phases: [
    ph({
      id: 'interfaz',
      name: 'Mayozdan önce',
      start: 0,
      end: 5,
      t: 'Hücre bölünmeden önce kromozomlarının kopyasını yapmıştır.',
      i: [
        'Mayoz I\'den önceki S evresinde DNA eşlenmiştir: 2n=4 kromozomun her biri iki kardeş kromatitlidir.',
        ['DNA miktarı 4C, kromozom sayısı 2n=4\'tür.', 'Homolog kromozomlar, biri anneden biri babadan gelen ve aynı genleri taşıyan çiftlerdir.'],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'cift-eslesme-ayrilma',
      name: 'Benzer kromozomlar eşleşir ve ayrılır',
      start: 5,
      end: 35,
      t: 'Anneden ve babadan gelen benzer kromozomlar çift çift eşleşir, ortada dizilir ve sonra çiftin üyeleri hücrenin zıt uçlarına ayrılır.',
    }),
    ph({
      id: 'profaz-1',
      name: 'Profaz I',
      start: 5,
      end: 19,
      i: [
        'Homolog kromozomlar yan yana gelip eşleşir; kromatitler arasında parça değişimi (krossing over) olur.',
        [
          'Eşleşmiş homologlar, dört kromatitli bir yapı (tetrat) oluşturur.',
          'Krossing over, homologların kardeş olmayan kromatitleri arasında parça alışverişidir; X biçimli temas noktalarına kiyazma denir.',
          'Parça değişimi mayozda kalıtsal çeşitliliğin ilk kaynağıdır.',
          'Çekirdek zarı ve çekirdekçik dağılır, iğ ipliği kurulur.',
        ],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'metafaz-1',
      name: 'Metafaz I',
      start: 19,
      end: 27,
      i: [
        'Homolog çiftler (tetratlar) ekvator düzleminde dizilir; çiftin her üyesi bir kutuptan gelen ipliğe bağlanır.',
        [
          'Çiftlerin ekvatordaki yönü rastgeledir: anne kökenli homologun hangi kutba gideceği her çift için bağımsız belirlenir (bağımsız dağılım).',
          'Homolog çift sayısı n ise 2ⁿ eş olasılıklı yönelim vardır: 2n=4 modelinde 4, insanda 2²³ (8 milyonun üzerinde). 2n=4\'te simetri sayılırsa 2 görünüm kalır: anne kökenli kromozomlar aynı kutupta ya da karışık.',
          'Mitoz metafazından fark: ekvatorda tek tek kromozomlar değil, çiftler dizilir.',
        ],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'anafaz-1',
      name: 'Anafaz I',
      start: 27,
      end: 35,
      i: [
        'Homolog kromozomlar birbirinden ayrılıp zıt kutuplara çekilir; sentromerler bölünmez.',
        [
          'Her kromozom hâlâ iki kromatitlidir; kutup başına 2 kromozom gider.',
          'Kromozom sayısının yarıya indiği basamak budur; bu yüzden mayoz I\'e indirgenme bölünmesi denir.',
          'Hücredeki sentromer sayısı değişmez (2n=4 modelinde 4).',
        ],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'iki-hucre-olusur',
      name: 'İki hücre oluşur',
      start: 35,
      end: 45,
      t: 'Hücre ikiye ayrılır; her yeni hücrede kromozom sayısı başlangıçtakinin yarısıdır.',
    }),
    ph({
      id: 'telofaz-1',
      name: 'Telofaz I ve sitokinez',
      start: 35,
      end: 45,
      i: [
        'Kutuplarda iki haploit çekirdek oluşur ve sitoplazma bölünür.',
        [
          'Her yavru hücre n=2 kromozom taşır; kromozomlar hâlâ iki kromatitlidir (2C).',
          'Mayoz I ile II arasında DNA yeniden eşlenmez.',
          'Yavru hücrelerdeki kromozomlar anneden ve babadan gelen parçaların karışımıdır.',
        ],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç: iki hücre',
      start: 45,
      end: 50,
      t: 'İki hücre oluştu; her birinde kromozom sayısı yarıya inmiştir.',
      i: [
        'Mayoz I sonunda haploit (n=2) iki hücre oluşur; kromozomlar hâlâ iki kromatitlidir.',
        ['Hücre başına DNA miktarı 2C\'dir.', 'Mayoz II bu iki hücrede kardeş kromatitleri ayıracaktır.'],
      ],
      chart: { 'chromosome-count': 2, 'dna-amount': 2, 'cell-count': 2 },
    }),
  ],
};

export const mayoz2Track: TrackInfo = {
  id: 'mayoz-2',
  nameTr: 'Mayoz II',
  tagline: 'Kardeş kromatitler ayrılır, dört hücre oluşur',
  duration: 40,
  levels: ['temel', 'ileri'],
  notes: [
    'Mayoz I\'in iki yavru hücresi de gösterilir; zaman çizelgesi her ikisi için aynıdır, grafik hücre başına değerleri verir.',
    'Gösterimde n=2 (2n=4 modeli); süreler gerçek ölçekte değildir.',
    'Sperm ve yumurta oluşumundaki farklar (dört eşit hücre yerine tek büyük yumurta) gösterilmez.',
  ],
  phases: [
    ph({
      id: 'ara',
      name: 'Mayoz I ile II arası',
      start: 0,
      end: 3,
      t: 'İki hücre, ikinci bölünmeye hazırlanır.',
      i: [
        'Kısa bir ara evrede DNA yeniden eşlenmez; hücre başına n=2 kromozom (2C) bulunur.',
        ['Bazı türlerde bu ara evre (interkinez) çok kısadır ya da hiç görülmez.', 'Her kromozom hâlâ iki kromatitlidir.'],
      ],
      chart: { 'chromosome-count': 2, 'dna-amount': 2, 'cell-count': 2 },
    }),
    ph({
      id: 'kardes-kromatitler-ayrilir',
      name: 'Kromozomların yarıları ayrılır',
      start: 3,
      end: 25,
      t: 'Her kromozom hücrenin ortasında dizilir, sonra iki yarısı zıt uçlara çekilir.',
    }),
    ph({
      id: 'profaz-2',
      name: 'Profaz II',
      start: 3,
      end: 10,
      i: [
        'İki hücrenin her birinde iğ ipliği yeniden kurulur ve kromozomlar yoğunlaşır.',
        [
          'Homologlar eşleşmez ve krossing over olmaz.',
          'Kardeş kromatitler krossing over nedeniyle artık tamamen özdeş değildir.',
        ],
      ],
      chart: { 'chromosome-count': 2, 'dna-amount': 2, 'cell-count': 2 },
    }),
    ph({
      id: 'metafaz-2',
      name: 'Metafaz II',
      start: 10,
      end: 17,
      i: [
        'Her hücrede kromozomlar ekvator düzleminde tek sıra dizilir.',
        [
          'Görünüm mitoz metafazına benzer; fark, kromozom sayısının n=2 olmasıdır.',
          'Her kardeş kromatit, karşı kutuptan gelen bir iğ ipliğine bağlıdır.',
        ],
      ],
      chart: { 'chromosome-count': 2, 'dna-amount': 2, 'cell-count': 2 },
    }),
    ph({
      id: 'anafaz-2',
      name: 'Anafaz II',
      start: 17,
      end: 25,
      i: [
        'Sentromerler bölünür; kardeş kromatitler ayrılıp zıt kutuplara çekilir.',
        [
          'Her hücrede kromozom sayısı geçici olarak ikiye katlanır (2 → 4).',
          'Ayrılan kromatitler farklı gen kombinasyonları taşıyabilir.',
        ],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 2, 'cell-count': 2 },
    }),
    ph({
      id: 'dort-hucre-olusur',
      name: 'Dört hücre oluşur',
      start: 25,
      end: 35,
      t: 'Her hücre yeniden ikiye bölünür; toplam dört hücre oluşur.',
    }),
    ph({
      id: 'telofaz-2',
      name: 'Telofaz II ve sitokinez',
      start: 25,
      end: 35,
      i: [
        'Her kutupta çekirdek zarı yeniden oluşur ve sitoplazma bölünür; dört haploit hücre meydana gelir.',
        ['İğ iplikleri dağılır, kromozomlar açılır.', 'Dört hücrenin her biri n=2 kromozom taşır.'],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 2, 'cell-count': 2 },
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç: dört hücre',
      start: 35,
      end: 40,
      t: 'Sonunda dört hücre oluştu; her birinde başlangıçtaki hücrenin yarısı kadar kromozom vardır.',
      i: [
        'Mayoz sonunda genetik olarak birbirinden farklı dört haploit (n=2) hücre oluşur.',
        [
          'Her hücre n=2 kromozom taşır; DNA miktarı 1C\'dir.',
          'Farklılığın kaynakları krossing over ve kromozomların bağımsız dağılımıdır.',
          'Bu hücreler üreme hücrelerinin (gametlerin) oluşumunun temelidir.',
        ],
      ],
      chart: { 'chromosome-count': 2, 'dna-amount': 1, 'cell-count': 4 },
    }),
  ],
};
