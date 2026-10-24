import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Experiments 7-8. Programme limits: FB.8.5.1 (Na gives, Cl takes an electron as an example), FB.8.5.2-3 (conservation,
// no balancing at grade 8), FB.7.5.8-9 (solution, rate factors; NaCl ions in water), KİM.10.1.3 (Mg combustion named),
// KİM.10.2.4-6 (solubility per 100 g water, saturated / unsaturated / supersaturated), KİM.12.1.1 (half equations).

export const yanmaTrack: TrackInfo = {
  id: 'magnezyum-yanma',
  nameTr: 'Magnezyum şeridin yanması',
  tagline: 'Kül neden şeritten ağır? (yalnızca sanal)',
  duration: 43,
  levels: ['temel', 'ileri'],
  notes: [
    'Bu deney yalnızca sanaldır: gerçek magnezyum alevi çok parlaktır ve gözü kalıcı olarak zedeleyebilir; asla doğrudan bakılmaz, evde denenmez.',
    'Parlama otomatik olarak kısılmıştır ve filtre seçeneği vardır; ışık yoğunluğu gerçeği yansıtmaz.',
    'Sıcaklık, kroze için sanal ölçekli bir değerdir; gerçek alev sıcaklığı çok daha yüksektir (yaklaşık 3100 °C).',
    'Kütle farkı, kül kütlesi (0,199 g) ile şerit kütlesinin (0,12 g) farkıdır; havadan alınan oksijenin kütlesidir.',
  ],
  phases: [
    ph({
      id: 'gozlem-isitma',
      name: 'Gözlem: ısıtma',
      start: 0,
      end: 7,
      t: 'Kapaklı kroznede 0,12 g magnezyum şerit ısıtılır. Önce terazi okuması not edilir; sonra kapak aralanacak.',
      i: [
        'Kapaklı kroznede 0,12 g Mg şerit Bunsen beki ile ısıtılır; başlangıç kütlesi teraziden okunmuştur.',
        ['Kapak kapalıyken kroznede az hava vardır; yanma çok yavaştır.', 'Maşa ve eldiven kullanılır; deney yalnızca sanal gösterilir.'],
      ],
      chart: { 'magnezyum-oksit': 0, 'kutle-farki': 0, 'sicaklik-yuksek': 22 },
    }),
    ph({
      id: 'gozlem-yanma',
      name: 'Gözlem: parlak yanma',
      start: 7,
      end: 11,
      t: 'Kapak aralanınca havadaki oksijen girer; magnezyum çok parlak beyaz ışıkla yanar (sanal denemede ışık kısılmıştır).',
      i: [
        'Kapak aralanınca oksijen girer ve Mg çok parlak beyaz ışık vererek yanar; kroze sıcaklığı yaklaşık 700 °C\'ye çıkar.',
        ['Işık ve ısı, kimyasal değişimin (ekzotermik tepkime) göstergeleridir.', 'Gerçek alev gözü bozar; koruyucu filtre olmadan bakılmaz.'],
      ],
      chart: { 'magnezyum-oksit': 0.017, 'kutle-farki': 0, 'sicaklik-yuksek': 669 },
    }),
    ph({
      id: 'gozlem-son',
      name: 'Gözlem: kül ve kütle',
      start: 11,
      end: 14,
      t: 'Yanma bitince kül (magnezyum oksit) beyaz bir tozdur ve şeritten daha ağırdır: fark, havadan alınan oksijenin kütlesidir.',
      i: [
        'Kül yaklaşık 0,20 g\'dır (şerit 0,12 g idi): artış yaklaşık 0,08 g, havadan alınan oksijenin kütlesidir.',
        ['Kül, şeritten 1,66 kat ağırdır.', 'Kütle yok olmaz ya da artmaz: oksijen de tepkimeye katılmıştır.'],
      ],
      chart: { 'magnezyum-oksit': 0.199, 'kutle-farki': 0.079, 'sicaklik-yuksek': 729 },
    }),
    ph({
      id: 'basla',
      name: 'Parçacık düzeyi: başlangıç',
      start: 14,
      end: 17,
      t: 'Şerit, düzenli dizilmiş magnezyum atomlarından oluşur. Havadan oksijen molekülleri yüzeye çarpar.',
      i: [
        'Şerit düzenli bir Mg atomu örgüsüdür; havadan O₂ molekülleri yüzeye çarpar.',
        ['Çizimde atom sayıları küçük tutulmuştur; Mg ve O sayısı tepkime boyunca korunur.'],
      ],
      chart: { 'magnezyum-oksit': 0.199, 'kutle-farki': 0.079, 'sicaklik-yuksek': 683 },
    }),
    ph({
      id: 'isi',
      name: 'Parçacık düzeyi: oksijen ayrışır',
      start: 17,
      end: 20,
      t: 'Isı, taneciklerin titreşimini artırır. Oksijen molekülleri yüzeyde ikişer oksijen atomuna ayrılır.',
      i: [
        'Isı titreşimi artırır; O₂ molekülleri yüzeyde ikişer O atomuna ayrılır (O=O bağı kopar).',
        ['Tepkimenin başlaması için yeterli enerji gerekir (KİM.11.1.5).'],
      ],
      chart: { 'magnezyum-oksit': 0.199, 'kutle-farki': 0.079, 'sicaklik-yuksek': 683 },
    }),
    ph({
      id: 'elektron',
      name: 'Parçacık düzeyi: elektron geçişi',
      start: 20,
      end: 24,
      t: 'Her magnezyum atomu 2 elektron verir, oksijen atomları alır. Böylece yüklü tanecikler (iyonlar) oluşur.',
      i: [
        'Her Mg atomu 2 elektron bırakır; elektronlar O atomlarına geçer: Mg → Mg²⁺ + 2 e⁻ ve O + 2 e⁻ → O²⁻.',
        ['Elektron veren Mg yükseltgenir, elektron alan O indirgenir.'],
      ],
      chart: { 'magnezyum-oksit': 0.199, 'kutle-farki': 0.079, 'sicaklik-yuksek': 683 },
    }),
    ph({
      id: 'iyonlar',
      name: 'Parçacık düzeyi: iyonlar',
      start: 24,
      end: 26,
      t: 'Mg²⁺ ve O²⁻ iyonları oluştu: artı ve eksi yüklü tanecikler.',
      i: [
        'Mg²⁺ ve O²⁻ iyonları oluşmuştur; toplam yük sıfırdır (6 Mg²⁺ ve 6 O²⁻ için).',
        ['Atom sayıları değişmemiştir: yalnızca elektronlar yer değiştirmiştir.'],
      ],
      chart: { 'magnezyum-oksit': 0.199, 'kutle-farki': 0.079, 'sicaklik-yuksek': 683 },
    }),
    ph({
      id: 'orgu',
      name: 'Parçacık düzeyi: MgO örgüsü',
      start: 26,
      end: 29,
      t: 'Zıt yüklü iyonlar birbirini çekip magnezyum oksit örgüsü yapar. Büyük enerji ışık ve ısı olarak açığa çıkar.',
      i: [
        'Karşıt yüklü iyonlar birbirini çekerek MgO iyonik örgüsünü kurar; açığa çıkan büyük enerji ışık ve ısı olur.',
        ['Oluşum entalpisi çok negatiftir (yaklaşık −602 kJ/mol MgO): tepkime güçlü ekzotermiktir.'],
      ],
      chart: { 'magnezyum-oksit': 0.199, 'kutle-farki': 0.079, 'sicaklik-yuksek': 683 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem',
      start: 29,
      end: 43,
      t: 'Sözlü denklem: magnezyum + oksijen → magnezyum oksit. Mg ve O atomlarının sayısı iki yanda aynı; kütle korunur, külün fazlası havadaki oksijendendir.',
      i: [
        '2 Mg(k) + O₂(g) → 2 MgO(k). Yarı tepkimeler: Mg → Mg²⁺ + 2 e⁻ ve O₂ + 4 e⁻ → 2 O²⁻.',
        [
          'Kütle çizelgesi: 0,12 g Mg + yaklaşık 0,08 g O₂ = yaklaşık 0,20 g MgO.',
          'Magnezyum ve demirin yanması, programda redoks örnekleri olarak geçer (KİM.10.1.3).',
          'Havada az miktarda Mg₃N₂ de oluşabilir; model yalnızca MgO\'yu gösterir.',
        ],
      ],
      chart: { 'magnezyum-oksit': 0.199, 'kutle-farki': 0.079, 'sicaklik-yuksek': 683 },
    }),
  ],
};

export const cozunmeTrack: TrackInfo = {
  id: 'cozunme-doygunluk',
  nameTr: 'Çözünme, doygunluk ve kristal',
  tagline: 'Su ne kadar tuz çözer? Soğuyunca ne olur?',
  duration: 44,
  levels: ['temel', 'ileri'],
  notes: [
    'Sanal ölçek: 50 mL su ve 20 g potasyum nitrat. Gerçek çözünme dakikalar sürer; gözlem evresi zamanı hızlandırır.',
    'Çözünürlük değerleri (KNO₃ için 100 mL suda yaklaşık 13,3 g / 31,6 g / 243,9 g, sırasıyla 0 / 20 / 100 °C) tablodan alınmıştır; motor 1 mL suyu 1 g sayar ve çözünmenin hacmi değiştirmediğini varsayar.',
    'Potasyum nitrat yükseltgendir ve evde denenmez; şeker ve sofra tuzuyla benzer gözlemler yapılabilir.',
    'Temel düzeyde "doygun" kavramı yalnızca "bir noktadan sonra çözünmez" biçiminde anılır; doymamış, doygun ve aşırı doygun ayrımı İleri düzeydedir (KİM.10.2.6).',
  ],
  phases: [
    ph({
      id: 'gozlem-oda',
      name: 'Gözlem: oda sıcaklığında çözünme',
      start: 0,
      end: 5,
      t: '50 mL suya 20 g potasyum nitrat atılıp karıştırılınca tuzun bir kısmı çözünür; çözünmeyen tuz dipte kalır.',
      i: [
        'Oda sıcaklığında yaklaşık 15,8 g çözünür; kalan 4–5 g dipte kalır: çözelti doygundur.',
        [
          'Çözünme ısı alır (endotermik): çözelti hafif soğur (yaklaşık 18 °C).',
          'Karıştırma çözünme hızını artırır, çözünen toplam miktarı değiştirmez.',
        ],
      ],
      chart: { 'cozunmeyen-tuz': 20, sicaklik: 20 },
    }),
    ph({
      id: 'gozlem-isit',
      name: 'Gözlem: ısıtma',
      start: 5,
      end: 9,
      t: 'Isıtılınca bütün tuz çözünür: sıcak su çok daha fazla tuz çözebilir.',
      i: [
        'Yaklaşık 58 °C\'de 20 g tuzun tamamı çözünür: sıcaklık arttıkça katıların çözünürlüğü genelde artar.',
        ['KNO₃\'ın çözünürlüğü 100 °C\'de 20 °C\'dekinin yaklaşık 7–8 katıdır.'],
      ],
      chart: { 'cozunmeyen-tuz': 5.4, sicaklik: 18.3 },
    }),
    ph({
      id: 'gozlem-sogut',
      name: 'Gözlem: soğutma ve kristal',
      start: 9,
      end: 14,
      t: 'Buzlu suda soğutulunca çözelti tuzun çoğunu tutamaz: kristaller oluşur.',
      i: [
        '0–1 °C\'ye soğutulunca yaklaşık 13 g kristal ayrılır: çözünürlük düştüğü için fazla tuz katı olarak çıkar.',
        ['Soğutma yavaşsa kristaller daha büyük ve düzgün olur.'],
      ],
      chart: { 'cozunmeyen-tuz': 0, sicaklik: 57.8 },
    }),
    ph({
      id: 'kristal',
      name: 'Parçacık düzeyi: kristal',
      start: 14,
      end: 17,
      t: 'Kristal suyun içinde: tuzun tanecikleri düzenli dizilmiş.',
      i: [
        'Kristalde K⁺ ve NO₃⁻ iyonları düzenli bir iyonik örgü oluşturur; çevresinde su molekülleri dolaşır.',
        ['Su molekülü kutupludur: bir ucu hafif artı, öbür ucu hafif eksi yüklüdür.'],
      ],
      chart: { 'cozunmeyen-tuz': 13.2, sicaklik: 0.5 },
    }),
    ph({
      id: 'cozunme',
      name: 'Parçacık düzeyi: çözünme',
      start: 17,
      end: 22,
      t: 'Su molekülleri yüzeydeki taneciklere çarpar ve onları çevreler. Sıcak suda çarpışma daha çok, çözünme daha hızlı.',
      i: [
        'Su molekülleri yüzeydeki iyonlara çarpıp onları sarar (hidrasyon) ve örgüden koparır.',
        [
          'Sıcak suda moleküller hızlıdır: saniyedeki çarpışma sayısı artar ve çözünme hızlanır.',
          'Karıştırma, kristale yakın bölgedeki suyu yeniler; toz hâli yüzeyi büyütür (FB.7.5.9).',
        ],
      ],
      chart: { 'cozunmeyen-tuz': 13.2, sicaklik: 0.5 },
    }),
    ph({
      id: 'doygun',
      name: 'Parçacık düzeyi: doygunluk',
      start: 22,
      end: 26,
      t: 'Bir noktada çözünen ve kristale geri dönen tanecik sayısı eşitlenir; çözelti daha fazla tuz çözemez.',
      i: [
        'Doygunlukta çözünme ve kristalleşme hızı eşittir; çözeltideki iyon sayısı sabit kalır (dinamik denge).',
        ['Doymamış çözelti daha fazla çözebilir; doygun çözelti çözemez; aşırı doygun çözelti (soğutulunca) kararsızdır ve kristalleşir.'],
      ],
      chart: { 'cozunmeyen-tuz': 13.2, sicaklik: 0.5 },
    }),
    ph({
      id: 'soguma',
      name: 'Parçacık düzeyi: soğuma ve kristal büyümesi',
      start: 26,
      end: 30,
      t: 'Soğuyunca tanecikler yavaşlar ve kristalin yüzeyine tutunur; kristal büyür.',
      i: [
        'Soğuyunca iyonlar yavaşlar ve kristal çekirdeğine tutunur; kristal büyür (aşırı doygunluk giderilir).',
        ['Çözünürlük sıcaklıkla düştüğü için çözeltide kalabilen iyon sayısı azalır.'],
      ],
      chart: { 'cozunmeyen-tuz': 13.2, sicaklik: 0.5 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem',
      start: 30,
      end: 44,
      t: 'Çözünme fiziksel bir değişimdir: tuz suda iyonlarına ayrılır, yeni bir madde oluşmaz (KNO₃ → K⁺ + NO₃⁻).',
      i: [
        'KNO₃(k) ⇌ K⁺(aq) + NO₃⁻(aq). Doygunlukta iki yöndeki hızlar eşittir.',
        [
          'Çözünürlük: belirli sıcaklıkta 100 g suda çözünebilen en çok madde miktarıdır; KNO₃ için 0, 20 ve 100 °C\'de yaklaşık 13,3, 31,6 ve 243,9 g.',
          'Çözeltiler doymamış, doygun ve aşırı doygun olarak sınıflandırılır (KİM.10.2.6).',
          'Katılar için çözünürlük genelde sıcaklıkla artar; gazlar için basınç da etkilidir (KİM.10.2.5).',
        ],
      ],
      chart: { 'cozunmeyen-tuz': 13.2, sicaklik: 0.5 },
    }),
  ],
};
