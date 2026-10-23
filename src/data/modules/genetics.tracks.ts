import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Chart series are counts of squares in the Punnett square (the square fills up during the 'punnett' phase), per
// phenotype class. Values are for the DEFAULT cross; for another option the scene must compute them (chartAt).
const ZERO2 = { 'dolu-kare': 0, 'baskin-fenotip': 0, 'cekinik-fenotip': 0 };
const F2 = { 'dolu-kare': 4, 'baskin-fenotip': 3, 'cekinik-fenotip': 1 };
const ZERO4 = { 'dolu-kare': 0, 'cift-baskin': 0, 'baskin-cekinik': 0, 'cekinik-baskin': 0, 'cift-cekinik': 0 };
const F2_DI = { 'dolu-kare': 16, 'cift-baskin': 9, 'baskin-cekinik': 3, 'cekinik-baskin': 3, 'cift-cekinik': 1 };

export const monohibritTrack: TrackInfo = {
  id: 'monohibrit',
  nameTr: 'Tek karakter çaprazlaması',
  tagline: 'Mendel\'in bezelyeleri: F1, F2 ve 3:1 oranı',
  duration: 56,
  levels: ['temel', 'ileri'],
  notes: [
    'Anlatım varsayılan çaprazlama (saf döl AA × aa, sonra F1 × F1 = Aa × Aa) içindir; başka bir ebeveyn seçilirse oranlar Punnett karesinden okunur.',
    'Grafik, F2 Punnett karesinin dolmasını izler (4 kutu).',
    'Programa göre Temel düzeyde yalnızca bezelyedeki baskın ve çekinik alellerle çalışılır; kontrol çaprazlaması İleri düzeydedir.',
  ],
  phases: [
    ph({
      id: 'ebeveynler',
      name: 'Saf döl ebeveynler',
      start: 0,
      end: 6,
      t: 'Mendel saf döl bezelyeleri çaprazladı: sarı tohumlu (AA) bitki ile yeşil tohumlu (aa) bitki. Sarı renk baskın, yeşil renk çekiniktir.',
      i: [
        'Saf döl ebeveynlerin genotipleri AA (baskın homozigot) ve aa (çekinik homozigot)\'tır.',
        [
          'A ve a, aynı genin farklı biçimleridir; bunlara alel denir.',
          'Baskın alel (A), heterozigotta çekinik alelin (a) etkisini gizler.',
          'Genotip alel birleşimidir, fenotip ise dışarıdan görünen özelliktir.',
        ],
      ],
      chart: ZERO2,
    }),
    ph({
      id: 'gametler-f1',
      name: 'Eşey hücreleri (gametler)',
      start: 6,
      end: 14,
      t: 'Her ebeveyn tek tip gamet verir: AA bitkisi yalnızca A, aa bitkisi yalnızca a taşıyan gamet üretir.',
      i: [
        'Mayozda alel çifti ayrılır; her gamet her gen için tek alel taşır (ayrılma ilkesi).',
        [
          'Ayrılma ilkesinin hücresel temeli, mayoz I\'de homolog kromozomların ayrılmasıdır.',
          'Saf döl bir birey yalnızca tek tip gamet üretir.',
          'Gametler haploittir: her gen için tek alel taşırlar.',
        ],
      ],
      chart: ZERO2,
    }),
    ph({
      id: 'f1',
      name: 'Birinci döl (F1)',
      start: 14,
      end: 20,
      t: 'Birinci dölün (F1) bütün bireyleri Aa\'dır ve hepsi sarı tohumludur. Çekinik özellik görünmez ama kaybolmamıştır.',
      i: [
        'F1 bireyleri melez (heterozigot) Aa\'dır; fenotipleri baskın özelliği gösterir.',
        [
          'Genotip Aa, fenotip sarıdır.',
          'Çekinik alel baskın alelin yanında fenotipte görünmez ama gametlere aktarılır.',
          'F1\'de bütün bireylerin ebeveynlerden biri gibi görünmesi Mendel\'in önemli gözlemidir.',
        ],
      ],
      chart: ZERO2,
    }),
    ph({
      id: 'gametler-f2',
      name: 'F1 bireylerinin gametleri',
      start: 20,
      end: 28,
      t: 'F1 bitkilerinin gametlerinin yarısı A, yarısı a taşır.',
      i: [
        'Aa bireyi eşit sayıda A ve a gameti üretir; her biri ½ olasılıkla oluşur.',
        ['Alel çifti ayrıldığı için iki tip gamet oluşur.', 'Gametlerin birleşmesi rastgeledir; hangi gametin hangisiyle birleşeceği önceden bilinmez.'],
      ],
      chart: ZERO2,
    }),
    ph({
      id: 'punnett',
      name: 'Çaprazlama tablosu (Punnett karesi)',
      start: 28,
      end: 40,
      t: 'Gametlerin olası birleşmeleri bir tabloda gösterilir: AA, Aa, Aa ve aa.',
      i: [
        'Punnett karesinde bir ebeveynin gametleri üste, diğerininkiler yana yazılır; kutular olası genotipleri verir.',
        [
          'Dört kutu da eşit olasılıklıdır (¼).',
          'Kutularda AA, Aa, Aa ve aa genotipleri oluşur.',
          'Kare kesin sonucu değil, olasılıkları gösterir.',
        ],
      ],
      chart: ZERO2,
    }),
    ph({
      id: 'genotip-orani',
      name: 'Genotip oranı',
      start: 40,
      end: 46,
      t: 'İkinci dölde (F2) genotip oranı 1 AA : 2 Aa : 1 aa\'dır.',
      i: [
        'F2 genotip oranı 1 AA : 2 Aa : 1 aa\'dır.',
        ['AA ve aa homozigot (saf), Aa heterozigottur (melez).', 'Aa iki kutuda bulunduğu için genotip oranında "2" olarak görünür.'],
      ],
      chart: F2,
    }),
    ph({
      id: 'fenotip-orani',
      name: 'Fenotip oranı (3:1)',
      start: 46,
      end: 52,
      t: 'F2\'de fenotip oranı 3 sarı : 1 yeşildir.',
      i: [
        'AA ve Aa sarı, yalnızca aa yeşil olduğundan F2 fenotip oranı 3 baskın : 1 çekiniktir.',
        [
          'Üç kutu baskın fenotip, bir kutu çekinik fenotip verir.',
          'Oran, olasılıktır: çok sayıda yavruda 3:1\'e yaklaşılır, az yavruda sapabilir.',
          'Aa × aa (kontrol çaprazlaması) ile bir baskın bireyin AA mı Aa mı olduğu anlaşılır; oran 1:1 olur.',
        ],
      ],
      chart: F2,
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç',
      start: 52,
      end: 56,
      t: 'Çekinik özellik F2\'de yeniden ortaya çıktı: özellikler karışmadan kuşaktan kuşağa aktarılır.',
      i: [
        'Mendel\'in sonucu: kalıtım birimleri (genler) karışmaz; alel çiftleri gametlerde ayrılır ve F2\'de 3:1 oranı görülür.',
        ['Çekinik özellik F1\'de gizlenir, F2\'de ortaya çıkar.', 'Bu ilke yalnızca bezelyede değil, diğer canlılarda da geçerlidir.'],
      ],
      chart: F2,
    }),
  ],
};

export const dihibritTrack: TrackInfo = {
  id: 'dihibrit',
  nameTr: 'İki karakter çaprazlaması',
  tagline: 'AaBb × AaBb: 16 kutulu kare ve 9:3:3:1',
  duration: 60,
  levels: ['ileri'],
  notes: [
    'A: sarı tohum (baskın), a: yeşil; B: yuvarlak tohum (baskın), b: buruşuk. İki gen farklı kromozomlardadır.',
    'Grafik, 16 kutulu karenin dolmasını izler; sınıflar: A_B_, A_bb, aaB_ ve aabb.',
    'Epistasi, pleiotropi ve epigenetik programa uygun olarak ele alınmaz.',
  ],
  phases: [
    ph({
      id: 'ebeveynler',
      name: 'Melez ebeveynler',
      start: 0,
      end: 6,
      i: [
        'AaBb genotipli iki bitki iki karakter bakımından melezdir; ikisi de sarı ve yuvarlak tohumludur.',
        ['Dihibrit çaprazlama, iki karakteri birlikte izler.', 'Her ebeveyn iki gen çifti için de heterozigottur.'],
      ],
      chart: ZERO4,
    }),
    ph({
      id: 'gametler',
      name: 'Gamet çeşitleri',
      start: 6,
      end: 18,
      i: [
        'Her ebeveyn dört tip gamet üretir: AB, Ab, aB ve ab; her biri ¼ olasılıklıdır.',
        [
          'Bağımsız dağılım: bir genin alelleri hangi gamete giderse gitsin, diğer genin alelleri onu etkilemez.',
          'Hücresel temeli, mayoz I\'de iki homolog çiftin yönünün birbirinden bağımsız olmasıdır.',
          'Bu, genler farklı kromozomlarda olduğunda geçerlidir.',
        ],
      ],
      chart: ZERO4,
    }),
    ph({
      id: 'punnett',
      name: 'Punnett karesi (16 kutu)',
      start: 18,
      end: 36,
      i: [
        'Dört gamet tipi hem üste hem yana yazılır; 4 × 4 = 16 kutu oluşur.',
        ['Her kutu eşit olasılıklıdır (1/16).', 'Kutular sırayla doldurulur ve her birine genotip ile fenotip atanır.'],
      ],
      chart: ZERO4,
    }),
    ph({
      id: 'genotip-orani',
      name: 'Genotip sınıfları',
      start: 36,
      end: 44,
      i: [
        '16 kutuda 9 farklı genotip bulunur: 1 AABB : 2 AABb : 2 AaBB : 4 AaBb : 1 AAbb : 2 Aabb : 1 aaBB : 2 aaBb : 1 aabb.',
        ['AaBb en sık görülen genotiptir (4/16).', 'Dört köşe genotip (AABB, AAbb, aaBB, aabb) saf döldür.'],
      ],
      chart: F2_DI,
    }),
    ph({
      id: 'fenotip-orani',
      name: 'Fenotip oranı (9:3:3:1)',
      start: 44,
      end: 52,
      i: [
        'Fenotip oranı 9 sarı-yuvarlak : 3 sarı-buruşuk : 3 yeşil-yuvarlak : 1 yeşil-buruşuktur.',
        [
          '9 kutu iki baskın özelliği birlikte gösterir; 1 kutu iki çekinik özelliği gösterir.',
          'Oran, iki ayrı 3:1 oranının çarpımıdır: ¾ × ¾ = 9/16.',
          'Yeşil-yuvarlak ve sarı-buruşuk, ebeveynlerde olmayan yeni karakter birleşimleridir.',
        ],
      ],
      chart: F2_DI,
    }),
    ph({
      id: 'yorum',
      name: 'Yorum ve kontrol çaprazlaması',
      start: 52,
      end: 60,
      i: [
        'Her karakter kendi içinde 3:1 verir; bağımsız dağılan karakterlerin oranları çarpılır.',
        [
          'Kontrol çaprazlamasında genotipi bilinmeyen baskın birey, çekinik (aabb) ile çaprazlanır.',
          'AaBb × aabb çaprazlaması 1:1:1:1 oranında dört fenotip verir; bu, bireyin dört gamet tipi ürettiğini gösterir.',
          'Yeni birleşimlerin ortaya çıkması, mayozdaki bağımsız dağılımın kalıtsal çeşitliliğe katkısını gösterir.',
        ],
      ],
      chart: F2_DI,
    }),
  ],
};
