import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Chart values are the state at the START of each phase (the scene may smooth them).
// Programme limits (FB.8.3.2, BİY.12.2.2): enzyme names such as helikaz and ligaz are not given; here they appear only
// as "Ek bilgi (programın ötesinde)". Kesintisiz/kesikli zincir and the semi-conservative model are in the programme.

export const yapiTrack: TrackInfo = {
  id: 'dna-yapisi',
  nameTr: 'DNA\'nın yapısı',
  tagline: 'Nükleotidlerden çift sarmala',
  duration: 44,
  levels: ['temel', 'ileri'],
  notes: [
    'Gösterimde sekiz baz çiftli kısa bir DNA parçası kullanılır; gerçek bir kromozomdaki DNA milyonlarca baz çiftinden oluşur.',
    'Programa göre 8. sınıfta bağların adlarına, pürin-pirimidin ayrımına ve nükleotid hesaplamalarına girilmez; bunlar yalnızca İleri düzeydedir.',
    'Sarmalın dönüş sayısı ve oyukları şematiktir.',
  ],
  phases: [
    ph({
      id: 'nukleotit',
      name: 'Nükleotid',
      start: 0,
      end: 7,
      t: 'DNA, nükleotid denen küçük birimlerin art arda dizilmesiyle oluşur. Her nükleotid bir şeker, bir fosfat ve bir azotlu bazdan yapılır.',
      i: [
        'Nükleotit üç bileşenden oluşur: beş karbonlu bir şeker (DNA\'da deoksiriboz), bir fosfat grubu ve bir azotlu organik baz.',
        [
          'DNA\'da dört baz bulunur: adenin (A), timin (T), guanin (G) ve sitozin (C).',
          'RNA nükleotitlerinde şeker riboz, T yerine urasil (U) bulunur.',
          'DNA ve RNA, nükleotitlerin uzun zincirleridir.',
        ],
      ],
      chart: { 'baz-cifti': 0, 'zincir-sayisi': 0 },
    }),
    ph({
      id: 'tek-zincir',
      name: 'Tek zincir',
      start: 7,
      end: 14,
      t: 'Nükleotidler şeker ve fosfat kısımlarından birbirine bağlanarak uzun bir zincir yapar; bazların dizilişi bilgiyi taşır.',
      i: [
        'Bir nükleotidin şekeri ile sonrakinin fosfatı bağlanarak şeker-fosfat omurgası oluşur; bazlar omurgadan içeri doğru uzanır.',
        [
          'Zincirdeki baz dizisi genetik bilgiyi belirler.',
          'Zincirin iki ucu farklıdır: bir ucu 5\' (fosfat), diğer ucu 3\' (şeker) ucudur.',
        ],
      ],
      chart: { 'baz-cifti': 0, 'zincir-sayisi': 1 },
    }),
    ph({
      id: 'baz-eslesmesi',
      name: 'Baz eşleşmesi',
      start: 14,
      end: 24,
      t: 'İki zincir bazlarından birbirine bağlanır: A her zaman T ile, G her zaman C ile eşleşir.',
      i: [
        'Bazlar tamamlayıcı çiftler yapar: A–T iki, G–C üç hidrojen bağıyla bağlanır.',
        [
          'Eşleşme kuralı sayesinde bir zincirin dizisi, diğer zincirin dizisini belirler.',
          'Her çiftte bir büyük baz (pürin) ile bir küçük baz (pirimidin) eşleşir; bu yüzden çift sarmalın çapı her yerde eşittir.',
          'Hidrojen bağları zayıf olduğu için iki zincir gerektiğinde ayrılabilir.',
        ],
      ],
      chart: { 'baz-cifti': 0, 'zincir-sayisi': 1 },
    }),
    ph({
      id: 'cift-sarmal-temel',
      name: 'Çift sarmal',
      start: 24,
      end: 38,
      t: 'Birbirine bağlı iki zincir, bükülmüş bir merdiven gibi çift sarmal oluşturur.',
    }),
    ph({
      id: 'cift-sarmal',
      name: 'Çift sarmal',
      start: 24,
      end: 32,
      i: [
        'İki zincir ortak bir eksen etrafında bükülerek çift sarmal oluşturur.',
        [
          'Şeker-fosfat omurgaları dışarıda, baz çiftleri içeridedir.',
          'Çift sarmal modeli, Watson ve Crick tarafından 1950\'lerde Franklin\'in X ışını verilerinden yararlanılarak önerildi.',
        ],
      ],
      chart: { 'baz-cifti': 8, 'zincir-sayisi': 2 },
    }),
    ph({
      id: 'antiparalel',
      name: 'Zıt yönlü zincirler',
      start: 32,
      end: 38,
      i: [
        'İki zincir antiparaleldir: biri 5\'→3\', diğeri 3\'→5\' yönündedir.',
        [
          'Bu zıt yönlenme, pürin-pirimidin eşleşmesiyle birlikte sarmalın düzgün çapını açıklar.',
          'Replikasyonda ve transkripsiyonda yeni zincir yalnızca 5\'→3\' yönünde uzar.',
        ],
      ],
      chart: { 'baz-cifti': 8, 'zincir-sayisi': 2 },
    }),
    ph({
      id: 'gen-kromozom',
      name: 'Gen ve kromozom',
      start: 38,
      end: 44,
      t: 'DNA\'nın üzerinde genler bulunur: gen, bir özelliğin yapımı için gereken bilgiyi taşıyan DNA bölümüdür. DNA sarılıp paketlenerek kromozomu oluşturur.',
      i: [
        'Gen, DNA\'nın bir ürünün (protein ya da RNA) bilgisini taşıyan bölümüdür; DNA proteinlerle sarılarak kromozomu oluşturur.',
        [
          'Nükleotit, gen, DNA ve kromozom birbirine bağlı kavramlardır: nükleotidler DNA\'yı, DNA üzerindeki bölümler genleri oluşturur.',
          'Kromozom, hücre bölünmesinde kısalıp kalınlaşan DNA-protein yapısıdır.',
        ],
      ],
      chart: { 'baz-cifti': 8, 'zincir-sayisi': 2 },
    }),
  ],
};

export const replikasyonTrack: TrackInfo = {
  id: 'replikasyon',
  nameTr: 'DNA replikasyonu',
  tagline: 'DNA kendini nasıl eşler? Yarı korunumlu model',
  duration: 56,
  levels: ['temel', 'ileri'],
  notes: [
    'Yalnızca tek bir replikasyon çatalı gösterilir; gerçek hücrelerde çok sayıda başlangıç noktası ve çatal vardır.',
    'Programa göre helikaz, ligaz gibi enzim adları verilmez; yalnızca "Ek bilgi" olarak anılırlar. Temel düzeyde enzimler adlandırılmaz.',
    'Süreler ve nükleotit sayıları gösterim içindir; gerçek replikasyon çok daha hızlı ve uzundur.',
  ],
  phases: [
    ph({
      id: 'baslangic',
      name: 'DNA eşlenmeye hazırlanır',
      start: 0,
      end: 6,
      t: 'Hücre bölünmeden önce DNA\'sının bir kopyasını yapar; buna DNA\'nın kendini eşlemesi (replikasyon) denir.',
      i: [
        'Replikasyon, hücre döngüsünün S evresinde olur ve her yavru hücreye tam bir DNA kopyasının geçmesini sağlar.',
        ['Mitoz ve mayoz öncesinde DNA eşlenir (bkz. Mitoz ve Mayoz modülü).', 'Eşleme, var olan DNA\'yı kalıp olarak kullanır.'],
      ],
      chart: { 'sentezlenen-dna': 0, 'dna-miktari': 1 },
    }),
    ph({
      id: 'acilma',
      name: 'Sarmal açılır',
      start: 6,
      end: 14,
      t: 'Çift sarmal bir noktadan açılır ve iki zincir birbirinden ayrılır.',
      i: [
        'DNA\'yı açan bir enzim iki zinciri ayırır; Y biçimli bir replikasyon çatalı oluşur.',
        [
          'Ayrılan her zincir, yeni zincir için kalıp olur.',
          'Ek bilgi (programın ötesinde): zincirleri ayıran enzimin adı helikazdır.',
        ],
      ],
      chart: { 'sentezlenen-dna': 0, 'dna-miktari': 1 },
    }),
    ph({
      id: 'yeni-zincirler',
      name: 'Yeni zincirler yapılır',
      start: 14,
      end: 38,
      t: 'Her eski zincirin karşısına eşleşme kuralına göre (A–T, G–C) yeni nükleotidler eklenir ve yeni zincirler oluşur.',
    }),
    ph({
      id: 'kesintisiz',
      name: 'Kesintisiz zincir',
      start: 14,
      end: 26,
      i: [
        'DNA polimeraz, çatalın açılma yönünde ilerleyen kalıp üzerinde yeni zinciri aralıksız uzatır; buna kesintisiz zincir denir.',
        [
          'DNA polimeraz, nükleotitleri baz eşleşmesine göre ekler ve yalnızca 5\'→3\' yönünde çalışır.',
          'Bu zincir çatalla aynı yönde uzadığı için tek parça hâlinde sentezlenir.',
          'Ek bilgi (programın ötesinde): sentez, primaz enziminin yaptığı kısa bir başlangıç parçasıyla (primer) başlar.',
        ],
      ],
      chart: { 'sentezlenen-dna': 0, 'dna-miktari': 1 },
    }),
    ph({
      id: 'kesikli',
      name: 'Kesikli zincir',
      start: 26,
      end: 38,
      i: [
        'Diğer kalıpta sentez çatalın açılma yönüne ters olduğundan yeni zincir kısa parçalar hâlinde yapılır; buna kesikli zincir denir.',
        [
          'Kısa parçalara Okazaki parçaları denir.',
          'Çatal ilerledikçe yeni parçalar art arda sentezlenir ve sonra birbirine eklenir.',
          'Ek bilgi (programın ötesinde): parçaları birleştiren enzim ligazdır.',
        ],
      ],
      chart: { 'sentezlenen-dna': 50, 'dna-miktari': 1.5 },
    }),
    ph({
      id: 'yari-korunumlu',
      name: 'Yarı korunumlu eşleme',
      start: 38,
      end: 48,
      t: 'Oluşan iki DNA\'nın her biri bir eski, bir yeni zincirden oluşur; bu yüzden bu eşlemeye "yarı korunumlu" denir.',
      i: [
        'Her yeni DNA molekülü, bir eski (kalıp) zincir ile bir yeni zincirden oluşur: yarı korunumlu model.',
        [
          'Yarı korunumlu model, Meselson ve Stahl\'ın deneyiyle desteklenmiştir.',
          'İki yeni DNA birbirinin ve ana DNA\'nın aynısıdır (hata yoksa).',
          'Her yavru hücre, ana DNA\'dan bir eski zincir taşır.',
        ],
      ],
      chart: { 'sentezlenen-dna': 100, 'dna-miktari': 2 },
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç: iki özdeş DNA',
      start: 48,
      end: 56,
      t: 'Hücrede artık iki özdeş DNA vardır; her biri bir yavru hücreye gidecek.',
      i: [
        'Replikasyonda hatalar olabilir; hücre çoğu hatayı onarır, onarılmayanlar mutasyona dönüşebilir.',
        [
          'DNA onarım mekanizmaları kopyalama hatalarının çoğunu düzeltir.',
          'Onarılamayan değişimler kalıcı olur (bkz. Mutasyon bölümü).',
        ],
      ],
      chart: { 'sentezlenen-dna': 100, 'dna-miktari': 2 },
    }),
  ],
};
