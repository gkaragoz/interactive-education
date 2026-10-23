import type { OrganelleInfo } from './types';

// Shell parts: the selectable boundaries of each cell type. Own wording, cross-checked against the cited Sources.
const membraneTemel = {
  summary: 'Hücre zarı, hücreyi dıştan saran ince ve esnek bir örtüdür.',
  function: 'Hücreye neyin girip çıkacağını kontrol eder.',
  details: [] as string[],
};

const membraneIleri = {
  summary: 'Hücre zarı, proteinlerin gömülü olduğu çift katlı bir fosfolipit tabakadır.',
  function: 'Hücrenin iç ortamını dış ortamdan ayırır ve su, iyon, besin ve atıkların geçişini seçici olarak denetler.',
  details: [
    'İki fosfolipit tabakası ile içine gömülü proteinlerden (ve hayvan hücrelerinde kolesterolden) oluşur.',
    'Seçici geçirgendir: bazı maddeler kolayca geçerken bazıları taşıyıcı protein veya enerji ister.',
    'Emilim yapan hücrelerde (örneğin ince bağırsak) zar parmak gibi çıkıntılar yapıp yüzeyi artırır.',
    'Zardan madde geçiş türleri (difüzyon, osmoz, aktif taşıma, endositoz, ekzositoz) 9. sınıf biyolojide ayrıca işlenir.',
  ],
};

export const shellOrganelles: OrganelleInfo[] = [
  {
    id: 'membrane-animal',
    nameTr: 'Hücre zarı',
    nameEn: 'Cell membrane',
    tagline: 'Hücrenin seçici sınırı',
    sizeUm: 'Kalınlığı yaklaşık 6–10 nm (µm\'nin binde birkaçı)',
    location: 'Hayvan hücresinin en dış sınırı',
    visibleInLightMicroscope: false,
    levels: ['temel', 'ileri'],
    text: { temel: { ...membraneTemel }, ileri: { ...membraneIleri } },
    funFact: 'Hücre zarı o kadar incedir ki ışık mikroskobunda tek başına seçilemez.',
    kazanimIds: ['FB.5.3.1', 'BİY.9.2.1', 'BİY.9.2.2'],
    sourceIds: ['meb-fen-2026', 'meb-biyoloji-2026', 'wp-tr-hucre-zari', 'wp-en-cell-membrane', 'os-4-3'],
    color: '#d6a5b0',
  },
  {
    id: 'membrane-plant',
    nameTr: 'Hücre zarı',
    nameEn: 'Cell membrane',
    tagline: 'Duvarın hemen altındaki seçici sınır',
    sizeUm: 'Kalınlığı yaklaşık 6–10 nm (µm\'nin binde birkaçı)',
    location: 'Bitki hücresinde hücre duvarının hemen iç tarafı',
    visibleInLightMicroscope: false,
    levels: ['temel', 'ileri'],
    text: {
      temel: { ...membraneTemel },
      ileri: {
        ...membraneIleri,
        details: [
          ...membraneIleri.details.filter((d) => !d.startsWith('Seçici geçirgendir') && !d.startsWith('Emilim')),
          'Bitki hücresinde zar, hücre duvarının hemen içinde yer alır; madde geçişini denetleyen asıl yapı duvar değil zardır.',
        ],
      },
    },
    funFact: 'Bitki hücresinde duvar sağlamlık verir; neyin içeri girip çıkacağına ise asıl hücre zarı karar verir.',
    kazanimIds: ['FB.5.3.1', 'BİY.9.2.1', 'BİY.9.2.2'],
    sourceIds: ['meb-fen-2026', 'meb-biyoloji-2026', 'wp-tr-hucre-zari', 'wp-en-cell-membrane', 'wp-en-cell-wall', 'os-4-3'],
    color: '#a8c47a',
  },
  {
    id: 'wall-plant',
    nameTr: 'Hücre duvarı',
    nameEn: 'Cell wall',
    tagline: 'Bitkiye şekil veren sert kılıf',
    sizeUm: 'Kalınlığı yaklaşık 0,1 µm ile birkaç µm arasında',
    location: 'Bitki hücre zarının dışında',
    visibleInLightMicroscope: true,
    levels: ['temel', 'ileri'],
    text: {
      temel: {
        summary: 'Hücre duvarı, bitki hücresini saran sert bir katmandır.',
        function: 'Hücreyi korur ve ona şeklini verir.',
        details: [],
      },
      ileri: {
        summary: 'Bitki hücre duvarı, hücre zarının dışında yer alan, başlıca selülozdan yapılmış sağlam bir yapıdır.',
        function: 'Hücreyi korur, mekanik destek sağlar ve hücrenin şeklini belirler; bitkinin dik durmasına katkıda bulunur.',
        details: [
          'Ana maddesi, glikoz birimlerinin uzun zincirler yaptığı selülozdur.',
          'Duvar, hücreye su girdiğinde hücrenin aşırı şişip patlamasını engeller.',
          'Mantar hücrelerinde ve bazı protistlerde de hücre duvarı bulunur; hayvan hücrelerinde yoktur.',
          'Duvarın kalınlığı hücre türüne göre değişir.',
        ],
      },
    },
    funFact: 'Bitki hücre duvarı yaklaşık 0,1 µm ile birkaç µm kalınlıktadır; hücre zarı ise yaklaşık 6–10 nm, yani duvardan en az on kat incedir.',
    kazanimIds: ['FB.5.3.1', 'BİY.9.2.1'],
    sourceIds: ['meb-fen-2026', 'meb-biyoloji-2026', 'wp-tr-hucre-duvari', 'wp-en-cell-wall', 'os-4-3'],
    color: '#7d9a52',
  },
  {
    id: 'envelope-bacterium',
    nameTr: 'Hücre zarfı',
    nameEn: 'Bacterial cell envelope',
    tagline: 'Bakterinin çok katlı koruyucu kabuğu',
    sizeUm: 'Hücreyi tümüyle saran ince katmanlar bütünü',
    location: 'Bakteri hücresinin en dışı: zar, duvar ve çoğu zaman kapsül',
    visibleInLightMicroscope: false,
    levels: ['ileri'],
    text: {
      ileri: {
        summary: 'Hücre zarfı, bakterinin iç zarını, hücre duvarını ve varsa kapsülünü bir arada ifade eden dış katmanlar bütünüdür.',
        function: 'Hücreye şekil ve koruma sağlar, hücrenin su alıp patlamasını engeller ve yüzeylere tutunmaya yardım eder.',
        details: [
          'En içte, madde geçişini denetleyen hücre zarı bulunur.',
          'Çoğu bakteride bunun dışında peptidoglikan içeren bir hücre duvarı vardır.',
          'Gram negatif bakterilerde duvarın dışında ek bir dış zar daha yer alır.',
          'Birçok bakteri, en dışta şeker yapılı bir kapsül taşır; kapsül yüzeye tutunmaya yarar.',
        ],
      },
    },
    funFact: 'Bir bakteriyi saran zarf; zar, duvar ve kapsül olmak üzere üç katmana kadar çıkabilir.',
    kazanimIds: ['BİY.9.2.1'],
    sourceIds: ['meb-biyoloji-2026', 'wp-tr-hucre-zarfi', 'wp-en-cell-envelope', 'wp-en-bacterial-capsule', 'os-4-2'],
    color: '#5fa8a0',
  },
];
