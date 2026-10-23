import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Chart series are counts of squares in the 4-square Punnett square by phenotype class, for the DEFAULT cross.
const Z_BLOOD = { 'dolu-kare': 0, 'grup-a': 0, 'grup-b': 0, 'grup-ab': 0, 'grup-o': 0 };
const BLOOD = { 'dolu-kare': 4, 'grup-a': 1, 'grup-b': 1, 'grup-ab': 1, 'grup-o': 1 };
const Z_SEX = { 'dolu-kare': 0, saglikli: 0, tasiyici: 0, 'renk-koru': 0 };
const SEX = { 'dolu-kare': 4, saglikli: 2, tasiyici: 1, 'renk-koru': 1 };

export const kanTrack: TrackInfo = {
  id: 'kan-gruplari',
  nameTr: 'Kan grupları: eş baskınlık ve çok alellilik',
  tagline: 'IAi × IBi çaprazlamasında dört kan grubu',
  duration: 48,
  levels: ['ileri'],
  notes: [
    'Yalnızca ABO sistemi gösterilir; Rh faktörü ve kan grubunun deneyle belirlenmesi (BİY.12.2.6 deneyi) animasyonda yer almaz.',
    'Anlatım varsayılan çaprazlama (IAi × IBi) içindir; başka bir ebeveyn seçilirse oranlar Punnett karesinden okunur.',
    'Grafik, 4 kutulu karenin kan grubuna göre dolmasını izler.',
  ],
  phases: [
    ph({
      id: 'aleller',
      name: 'Üç alel: çok alellilik',
      start: 0,
      end: 8,
      i: [
        'ABO kan grubu tek bir gen tarafından belirlenir ve bu genin üç alel biçimi vardır: IA, IB ve i.',
        [
          'Bir gen için ikiden fazla alel bulunmasına çok alellilik denir; bir birey bu alellerden yalnızca ikisini taşır.',
          'IA ve IB birbirine karşı eş baskındır: ikisi birlikte bulunursa ikisi de etkisini gösterir.',
          'i aleli, IA ve IB\'ye karşı çekiniktir.',
        ],
      ],
      chart: Z_BLOOD,
    }),
    ph({
      id: 'genotip-fenotip',
      name: 'Genotip ve kan grubu',
      start: 8,
      end: 18,
      i: [
        'IAIA ve IAi genotipleri A grubunu, IBIB ve IBi B grubunu, IAIB AB grubunu, ii ise O grubunu verir.',
        [
          'A grubu iki farklı genotipten (IAIA, IAi) oluşabilir; B grubu için de aynısı geçerlidir.',
          'AB grubunda eş baskınlık görülür: iki alelin ürünü de bulunur.',
          'O grubu yalnızca çekinik homozigot (ii) bireylerde görülür.',
        ],
      ],
      chart: Z_BLOOD,
    }),
    ph({
      id: 'ebeveynler',
      name: 'Ebeveynler',
      start: 18,
      end: 24,
      i: [
        'A grubu ve IAi genotipli bir ebeveyn, B grubu ve IBi genotipli bir ebeveynle çaprazlanır.',
        ['İki ebeveyn de heterozigottur ve her biri çekinik i alelini taşır.', 'Ebeveynlerin kan grupları, çocukların olası gruplarını sınırlar.'],
      ],
      chart: Z_BLOOD,
    }),
    ph({
      id: 'gametler',
      name: 'Gametler',
      start: 24,
      end: 30,
      i: [
        'IAi bireyi IA veya i, IBi bireyi IB veya i taşıyan gametler üretir; her biri ½ olasılıkla.',
        ['Mayozda alel çifti ayrıldığı için her gamet yalnızca bir alel taşır.'],
      ],
      chart: Z_BLOOD,
    }),
    ph({
      id: 'punnett',
      name: 'Punnett karesi',
      start: 30,
      end: 40,
      i: [
        'Kutular IAIB, IAi, IBi ve ii genotiplerini verir.',
        ['Her kutu ¼ olasılıklıdır.', 'Dört kutu dört farklı kan grubuna karşılık gelir.'],
      ],
      chart: Z_BLOOD,
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç: dört kan grubu',
      start: 40,
      end: 48,
      i: [
        'Çocukların kan grubu eşit olasılıkla AB, A, B veya O olabilir (her biri ¼).',
        [
          'Ebeveynler yalnızca A ve B grubunda olduğu hâlde çocuklarda O ve AB grubu da ortaya çıkabilir.',
          'İki O grubu (ii × ii) ebeveynin çocukları yalnızca O grubu olur.',
          'Bir ebeveyn O grubuysa çocuk AB olamaz, çünkü AB için hem IA hem IB gerekir.',
        ],
      ],
      chart: BLOOD,
    }),
  ],
};

export const eseyTrack: TrackInfo = {
  id: 'eseye-bagli',
  nameTr: 'Eşeye bağlı kalıtım: renk körlüğü',
  tagline: 'Taşıyıcı anne ve normal baba: yavrular nasıl olur?',
  duration: 52,
  levels: ['ileri'],
  notes: [
    'Örnek özellik, X kromozomuna bağlı çekinik kırmızı-yeşil renk körlüğüdür; XC normal, Xc renk körlüğü aleli.',
    'Anlatım varsayılan çaprazlama (XCXc × XCY) içindir; başka bir ebeveyn seçilirse oranlar Punnett karesinden okunur.',
    'Soyağacı yalnızca özetlenir; öğrenci kendi soyağacı modelini oluşturma görevi (BİY.12.2.7) animasyonun dışındadır.',
  ],
  phases: [
    ph({
      id: 'eseyler',
      name: 'Eşey kromozomları',
      start: 0,
      end: 8,
      i: [
        'İnsanda cinsiyeti eşey kromozomları belirler: dişide XX, erkekte XY bulunur.',
        [
          'Anne yalnızca X taşıyan gamet verir; baba X ya da Y taşıyan gamet verebilir.',
          'Çocuğun cinsiyetini babadan gelen eşey kromozomu belirler.',
        ],
      ],
      chart: Z_SEX,
    }),
    ph({
      id: 'x-baglanti',
      name: 'X\'e bağlı gen',
      start: 8,
      end: 16,
      i: [
        'Kırmızı-yeşil renk körlüğü geni X kromozomu üzerindedir; çekinik alel (Xc) renk körlüğüne yol açar.',
        [
          'Dişide iki X olduğu için bir normal alel (XC) çekinik aleli maskeler; XCXc kadın taşıyıcıdır.',
          'Erkekte tek X vardır ve Y kromozomunda bu genin karşılığı yoktur; Xc taşıyan erkek renk körüdür.',
          'Bu yüzden çekinik eşeye bağlı özellikler erkeklerde daha sık görülür.',
        ],
      ],
      chart: Z_SEX,
    }),
    ph({
      id: 'ebeveynler',
      name: 'Ebeveynler',
      start: 16,
      end: 22,
      i: [
        'Taşıyıcı bir anne (XCXc) ile normal görüşlü bir baba (XCY) çaprazlanır.',
        ['Anne renk körü değildir ama çekinik aleli taşır.', 'Baba normal görür ve Y kromozomunda bu genin karşılığı yoktur.'],
      ],
      chart: Z_SEX,
    }),
    ph({
      id: 'gametler',
      name: 'Gametler',
      start: 22,
      end: 30,
      i: [
        'Anne XC veya Xc taşıyan, baba XC veya Y taşıyan gametler üretir; her biri ½ olasılıkla.',
        ['Babanın Y taşıyan gameti erkek, X taşıyan gameti kız çocuk verir.'],
      ],
      chart: Z_SEX,
    }),
    ph({
      id: 'punnett',
      name: 'Punnett karesi',
      start: 30,
      end: 40,
      i: [
        'Kutular XCXC, XCXc, XCY ve XcY genotiplerini verir.',
        ['Her kutu ¼ olasılıklıdır.', 'Kutular, cinsiyet ve renk görme durumunu birlikte belirler.'],
      ],
      chart: Z_SEX,
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç',
      start: 40,
      end: 47,
      i: [
        'Kız çocukların hiçbiri renk körü olmaz: biri sağlıklı (XCXC), biri taşıyıcıdır (XCXc). Erkek çocukların yarısı renk körüdür (XcY).',
        [
          'Tüm yavrular içinde renk körü olma olasılığı ¼, erkekler arasında ½\'dir.',
          'Renk körü bir erkek aleli yalnızca kızlarına aktarabilir; oğulları X kromozomunu anneden alır.',
        ],
      ],
      chart: SEX,
    }),
    ph({
      id: 'soyagaci',
      name: 'Soyağacındaki örüntü',
      start: 47,
      end: 52,
      i: [
        'Çekinik eşeye bağlı kalıtım soyağacında tipik bir örüntü verir: özellik erkeklerde daha sık görülür ve çoğu kez taşıyıcı anneden oğula geçer.',
        [
          'Babadan oğula X kromozomu geçmez; bu nedenle baba oğul geçişi eşeye bağlı çekinik özellik için beklenmez.',
          'Özelliği gösteren kızların babası da özelliği göstermelidir; anne ise en az taşıyıcıdır.',
        ],
      ],
      chart: SEX,
    }),
  ],
};
