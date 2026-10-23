import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Mitosis track, 45 s. Chart values are for the default 2n=4 model, counted by centromeres, DNA in C units
// (2C = DNA of one G1 cell) and cells = number of cells in the picture. Values are the state at the START of
// each phase; the scene should hold them as steps where a change is instantaneous (see track notes).
export const mitozTrack: TrackInfo = {
  id: 'mitoz',
  nameTr: 'Mitoz',
  tagline: 'Bir hücreden, aynı kromozomlu iki hücre',
  duration: 45,
  levels: ['temel', 'ileri'],
  notes: [
    'Gösterimde 2n=4 (iki homolog çift) kullanılır; insan vücut hücresinde 46 kromozom vardır.',
    'Evrelerin süreleri gerçek ölçekte değildir; gerçek hücrelerde süreler hücre türüne göre çok değişir.',
    'Kromozom sayısı sentromerlere göre sayılır: kardeş kromatitler anafazda ayrılınca sayı ikiye katlanır.',
  ],
  phases: [
    ph({
      id: 'g1',
      name: 'Büyüme (G1)',
      start: 0,
      end: 4,
      t: 'Hücre büyür ve görevini yapar; kromozomlar ince iplikler gibi dağınıktır.',
      i: [
        'G1: hücre büyür, organelleri çoğalır ve DNA eşlenmesine hazırlanır.',
        ['Her kromozom bu evrede tek bir DNA molekülünden (tek kromatit) oluşur.', 'Kromozomlar uzamış kromatin ipliği hâlindedir; mikroskopta tek tek seçilemez.'],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 2, 'cell-count': 1 },
    }),
    ph({
      id: 's',
      name: 'DNA eşlenmesi (S)',
      start: 4,
      end: 8,
      t: 'Hücre DNA\'sının bir kopyasını yapar; her kromozom iki yarıdan oluşur.',
      i: [
        'S: DNA eşlenir; her kromozom, sentromerden bağlı iki özdeş kardeş kromatit hâline gelir.',
        ['DNA miktarı 2C\'den 4C\'ye çıkar; sentromer sayısı, yani kromozom sayısı değişmez.', 'Hayvan hücrelerinde sentrozom da bu evrede eşlenir.'],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 2, 'cell-count': 1 },
    }),
    ph({
      id: 'g2',
      name: 'Hazırlık (G2)',
      start: 8,
      end: 11,
      t: 'Hücre bölünmeye hazırlanır.',
      i: [
        'G2: eşlenmiş DNA\'ya sahip hücre büyümesini sürdürür ve bölünme için gerekli yapıları hazırlar.',
        ['DNA miktarı 4C düzeyindedir.', 'Kromozomlar henüz yoğunlaşmamıştır; yoğunlaşma profazda başlar.'],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'kromozomlar-ortada-dizilir',
      name: 'Kromozomlar belirginleşir ve ortada dizilir',
      start: 11,
      end: 26,
      t: 'Kromozomlar kalınlaşıp görünür hâle gelir, sonra hücrenin ortasında bir sıra oluşturur.',
    }),
    ph({
      id: 'profaz',
      name: 'Profaz',
      start: 11,
      end: 17,
      i: [
        'Kromozomlar yoğunlaşıp kısalır ve kalınlaşır; iğ ipliklerinin kurulumu başlar.',
        [
          'Her kromozom, sentromerden bağlı iki kardeş kromatit olarak görülür.',
          'Çekirdekçik kaybolur; çekirdek zarı bu evrede henüz yerindedir.',
          'Hayvan hücrelerinde eşlenmiş sentrozomlar zıt kutuplara doğru ayrılır; bitki hücrelerinde sentrozom yoktur.',
        ],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'prometafaz',
      name: 'Prometafaz',
      start: 17,
      end: 21,
      i: [
        'Çekirdek zarı dağılır; iğ iplikleri kromozomların sentromerindeki kinetokorlara bağlanır.',
        [
          'Kinetokor, sentromerde oluşan ve iğ ipliğinin tutunduğu protein yapısıdır.',
          'İğ ipliklerinin çekişiyle kromozomlar hücrenin ortasına doğru hareket eder.',
          'Bazı kaynaklar bu evreyi profazın son kısmı sayar.',
        ],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'metafaz',
      name: 'Metafaz',
      start: 21,
      end: 26,
      i: [
        'Kromozomlar ekvator düzleminde tek sıra hâlinde dizilir; her kardeş kromatit karşı kutuptan gelen bir iğ ipliğine bağlıdır.',
        [
          'Kromozomlar en çok yoğunlaştığı bu evrede en kolay seçilir ve sayılır.',
          'Sentromerler ekvator düzleminde yer alır, kromozom kolları rastgele yönlere uzanır.',
          'İki kutuptan gelen iplikler kromozomları eşit kuvvetle çeker.',
        ],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'kromozomlar-ayrilir',
      name: 'Kromozomların yarıları ayrılır',
      start: 26,
      end: 37,
      t: 'Her kromozomun iki yarısı hücrenin zıt uçlarına çekilir; her uçta yeni bir çekirdek oluşur.',
    }),
    ph({
      id: 'anafaz',
      name: 'Anafaz',
      start: 26,
      end: 31,
      i: [
        'Sentromerler bölünür; kardeş kromatitler birbirinden ayrılıp zıt kutuplara çekilir.',
        [
          'Ayrılan her kromatit artık bağımsız bir kromozom sayılır: hücredeki kromozom sayısı geçici olarak ikiye katlanır (2n=4 modelinde 4 → 8).',
          'İğ iplikleri kısalır; kutuplar birbirinden uzaklaşır.',
          'Her kutupta ana hücrenin kromozom takımının tam bir kopyası toplanır.',
        ],
      ],
      chart: { 'chromosome-count': 8, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'telofaz',
      name: 'Telofaz',
      start: 31,
      end: 37,
      i: [
        'Kutuplarda kromozomlar açılır; çekirdek zarı ve çekirdekçik yeniden oluşur.',
        [
          'İğ iplikleri dağılır.',
          'Kromozomlar yeniden ince ve uzamış kromatin ipliğine döner.',
          'Sitokinez çoğu zaman telofazla örtüşür; bu animasyonda ardışık gösterilir.',
        ],
      ],
      chart: { 'chromosome-count': 8, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'sitokinez',
      name: 'Sitokinez',
      start: 37,
      end: 42,
      t: 'Hücre ikiye ayrılır ve iki yeni hücre oluşur.',
      i: [
        'Sitoplazma ikiye bölünür: hayvan hücresi boğumlanarak, bitki hücresi ortada yeni bir plak kurarak ayrılır.',
        [
          'Hayvan hücresinde ekvator çevresindeki halka büzülür ve hücreyi boğumlar.',
          'Bitki hücresinde keseciklerin kaynaşmasıyla hücre plağı oluşur ve yeni hücre duvarına dönüşür.',
          'Sitoplazma ve organeller iki yavru hücre arasında yaklaşık eşit paylaşılır.',
        ],
      ],
      chart: { 'chromosome-count': 8, 'dna-amount': 4, 'cell-count': 1 },
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç: iki özdeş hücre',
      start: 42,
      end: 45,
      t: 'Ana hücreyle aynı sayıda kromozom taşıyan, birbirinin aynısı iki hücre oluştu.',
      i: [
        'Mitoz, genetik olarak özdeş iki diploit (2n) yavru hücre verir.',
        [
          'Her yavru hücre 2n=4 kromozom taşır ve DNA miktarı 2C\'dir.',
          'Yavru hücreler G1\'e girerek döngüyü yeniden başlatabilir.',
          'Mitoz büyüme, gelişme, onarım ve eşeysiz üremede görev alır.',
        ],
      ],
      chart: { 'chromosome-count': 4, 'dna-amount': 2, 'cell-count': 2 },
    }),
  ],
};
