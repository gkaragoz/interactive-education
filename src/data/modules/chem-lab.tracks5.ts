import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Experiments 3 and 6 (see chem-lab.tracks1.ts and chem-lab.tracks2.ts for the conventions and programme limits).

export const notrallesmeTrack: TrackInfo = {
  id: 'notrallesme',
  nameTr: 'Nötralleşme ve pH eğrisi',
  tagline: 'Asit ile baz birbirini nasıl nötrler?',
  duration: 42,
  levels: ['temel', 'ileri'],
  notes: [
    'Sanal ölçekli titrasyon: 20,0 mL 0,100 M HCl, 0,100 M NaOH ve fenolftalein. Gözlem evresi, gerçekte dakikalar süren işlemin özetidir.',
    'Eğri noktaları motorun hesapladığı değerlerdir (kuvvetli asit ve kuvvetli baz); zayıf asit ya da baz için eşdeğerlik pH\'ı 7 olmaz.',
    'Temel düzeyde asit ile baz → tuz + su sözlü olarak verilir, formül denklemi yazılmaz (FB.8.5.5).',
    'Gerçek hidroklorik asit ve sodyum hidroksit aşındırıcıdır; bu deney evde yapılmaz.',
  ],
  phases: [
    ph({
      id: 'gozlem-asit',
      name: 'Gözlem: asit ve ayıraç',
      start: 0,
      end: 5,
      t: 'Erlenmeyerde 20 mL asit (HCl) ve 2 damla fenolftalein var; çözelti renksiz. Büretten baz damlatmaya başlıyoruz.',
      i: [
        'Başlangıç: 20,0 mL 0,100 M HCl (pH 1) ve 2 damla fenolftalein; büret 0,100 M NaOH ile dolu.',
        ['Fenolftalein pH 8,3\'ün altında renksizdir, üstünde pembedir.', 'Kuvvetli asit ve kuvvetli baz titrasyonunun amacı derişimi belirlemektir (KİM.11.2.11).'],
      ],
      chart: { 'baz-hacmi': 0, ph: 1.0 },
    }),
    ph({
      id: 'gozlem-ilk',
      name: 'Gözlem: ilk 10 mL baz',
      start: 5,
      end: 9,
      t: 'İlk 10 mL baz eklenince renk değişmez; asit hâlâ fazla olduğu için çözelti renksiz kalır.',
      i: [
        '10 mL NaOH sonrasında pH yaklaşık 1,5\'tir: eğri düz ve alçaktır.',
        ['Eklenen OH⁻ iyonları H⁺ ile birleşip suya dönüşür, bu yüzden pH çok yükselmez.', 'Çözeltiye ısı verilir ama çok az (yaklaşık +0,7 K): gözle seçilmez.'],
      ],
      chart: { 'baz-hacmi': 10, ph: 1.48 },
    }),
    ph({
      id: 'gozlem-yaklasir',
      name: 'Gözlem: sona yaklaşırken',
      start: 9,
      end: 12,
      t: 'Sona yaklaşırken bazı damla damla ekleriz. Çözelti hâlâ renksiz; ama asit neredeyse bitmek üzere.',
      i: [
        '19,9 mL\'de pH yaklaşık 3,6\'dır; bu noktadan sonra eğri çok dikleşir.',
        ['Her damla pH\'ı artık çok daha fazla değiştirir; bu yüzden titrasyonun sonu damla damla ilerlenir.'],
      ],
      chart: { 'baz-hacmi': 19.9, ph: 3.6 },
    }),
    ph({
      id: 'gozlem-donum',
      name: 'Gözlem: dönüm noktası',
      start: 12,
      end: 14,
      t: 'Son damlalarla çözelti ilk kez kalıcı pembeye döner: asit ile baz birbirini tam nötrledi.',
      i: [
        'Eşdeğerlik noktası 20,00 mL\'dedir (pH 7); yarım mL içinde pH 3,6\'dan 10\'a sıçrar ve fenolftalein pembeleşir.',
        ['Uç nokta (renk dönümü) eşdeğerlik noktasına çok yakındır; küçük fark ihmal edilir.'],
      ],
      chart: { 'baz-hacmi': 20.0, ph: 7.0 },
    }),
    ph({
      id: 'asit',
      name: 'Parçacık düzeyi: asitli çözelti',
      start: 14,
      end: 18,
      t: 'Asitte çok sayıda H⁺ ve Cl⁻ var. Büretteki baz henüz kapta değil.',
      i: [
        'Asitte çok sayıda H₃O⁺ ve Cl⁻ iyonu bulunur; bazın Na⁺ ve OH⁻ iyonları henüz kapta değildir.',
        ['Suda H⁺ iyonu pratikte H₃O⁺ (hidronyum) olarak bulunur.'],
      ],
      chart: { 'baz-hacmi': 20.05, ph: 10.1 },
    }),
    ph({
      id: 'baz',
      name: 'Parçacık düzeyi: baz eklenir',
      start: 18,
      end: 23,
      t: 'Her damla Na⁺ ve OH⁻ getirir. OH⁻, H⁺ ile karşılaşıp su yapar; Na⁺ ve Cl⁻ olduğu gibi kalır.',
      i: [
        'Her damla Na⁺ ve OH⁻ getirir; OH⁻, H₃O⁺ ile birleşip iki su molekülü yapar.',
        ['Na⁺ ve Cl⁻ tepkimeye katılmaz, izleyici iyondur.', 'Proton aktarımı: H₃O⁺ veren, OH⁻ alan taraftır.'],
      ],
      chart: { 'baz-hacmi': 20.05, ph: 10.1 },
    }),
    ph({
      id: 'denk',
      name: 'Parçacık düzeyi: eşdeğerlik',
      start: 23,
      end: 26,
      t: 'Asit ve baz tam dengeye gelince H⁺ ve OH⁻ neredeyse kalmaz. Çözeltide Na⁺ ve Cl⁻ yani tuz çözeltisi kalır.',
      i: [
        'Eşdeğerlik noktasında H₃O⁺ ve OH⁻ sayıları eşittir ve neredeyse tükenmiştir; çözeltide Na⁺ ve Cl⁻ vardır.',
        ['Nötr demek, hiçbir şey kalmadı demek değildir: tuzun iyonları çözeltide durmaktadır.'],
      ],
      chart: { 'baz-hacmi': 20.05, ph: 10.1 },
    }),
    ph({
      id: 'fazla',
      name: 'Parçacık düzeyi: baz fazlası',
      start: 26,
      end: 28,
      t: 'Biraz daha baz eklenirse OH⁻ artar ve fenolftalein pembeye döner.',
      i: [
        'Eşdeğerlikten sonra eklenen her damla OH⁻ biriktirir; pH hızla 10\'un üzerine çıkar ve fenolftalein pembeleşir.',
        ['Büretteki NaOH\'nin pH\'ı 13\'tür; eğri sonunda buna doğru düzleşir.'],
      ],
      chart: { 'baz-hacmi': 20.05, ph: 10.1 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem',
      start: 28,
      end: 42,
      t: 'Sözlü denklem: asit + baz → tuz + su. Burada hidroklorik asit + sodyum hidroksit → sodyum klorür (sofra tuzu) + su.',
      i: [
        'Tam iyonik: H⁺ + Cl⁻ + Na⁺ + OH⁻ → Na⁺ + Cl⁻ + H₂O. Net iyon denklemi: H⁺ + OH⁻ → H₂O.',
        [
          'Eşdeğerlik noktasında n(asit) = n(baz) = 2,00 mmol (20,0 mL × 0,100 M).',
          'Kuvvetli asit ile kuvvetli bazın titrasyonunda eşdeğerlik pH\'ı 7\'dir; zayıf asit ya da baz için farklı olabilir.',
          'Nötralleşme ısı verir (kuvvetli asit ve baz için yaklaşık −57,6 kJ/mol su).',
        ],
      ],
      chart: { 'baz-hacmi': 20.05, ph: 10.1 },
    }),
  ],
};

export const magnezyumAsitTrack: TrackInfo = {
  id: 'magnezyum-asit',
  nameTr: 'Magnezyum + seyreltik HCl',
  tagline: 'Hidrojen gazı ve tepkime hızı',
  duration: 43,
  levels: ['ileri'],
  notes: [
    'Sanal ölçek: 0,10 g Mg şerit ve 20 mL 1 M HCl; asit fazladır, magnezyum sınırlayıcıdır. Gaz miktarı yalnızca grafikte gösterilir; gaz yasası hesabına girilmez (KİM.10.1.9-10).',
    'Hidrojenin alevle sınanması yalnızca sanal denemede gösterilir; gerçekte hidrojen çok kolay yanar ve patlayıcı karışım oluşturabilir.',
    'Hız etkenleri (derişim, sıcaklık, magnezyum tozu) seçenekle denenir; grafikler varsayılan deney içindir.',
    'Gerçek asit yakıcıdır ve evde denenmez.',
  ],
  phases: [
    ph({
      id: 'gozlem-hazirlik',
      name: 'Gözlem: düzenek',
      start: 0,
      end: 4,
      i: [
        '20 mL 1 M HCl bulunan deney tüpü, hortumla gaz toplama tüpüne bağlıdır; 0,10 g magnezyum şerit atılacaktır.',
        ['Magnezyum etkin bir metaldir ve asitlerle tepkime verir.', 'Çıkacak gaz, hortumdan geçip toplama tüpünde birikecektir.'],
      ],
      chart: { 'gaz-hacmi': 0, sicaklik: 22 },
    }),
    ph({
      id: 'gozlem-tepkime',
      name: 'Gözlem: kabarcıklar ve ısınma',
      start: 4,
      end: 11,
      i: [
        'Magnezyum şerit kabarcık çıkararak küçülür; tüp ısınır (22 °C\'den yaklaşık 40 °C\'ye) ve gaz toplama tüpüne geçer.',
        ['Gaz çıkışı ve ısınma, kimyasal değişimin göstergeleridir.', 'Tepkime ekzotermiktir: ortama ısı verir.'],
      ],
      chart: { 'gaz-hacmi': 0, sicaklik: 22 },
    }),
    ph({
      id: 'gozlem-alev',
      name: 'Gözlem: gazı sına (yalnızca sanal)',
      start: 11,
      end: 14,
      i: [
        'Toplama tüpündeki gaz (yaklaşık 100 mL) alevle kısa bir "tık" sesiyle yanar: hidrojen.',
        ['Gerçekte hidrojen çok kolay tutuşur; böyle bir deney yalnızca öğretmen gözetiminde, çok küçük miktarda yapılır.'],
      ],
      chart: { 'gaz-hacmi': 100.6, sicaklik: 40.3 },
    }),
    ph({
      id: 'basla',
      name: 'Parçacık düzeyi: başlangıç',
      start: 14,
      end: 17,
      i: [
        'Şeridin yüzeyinde Mg atomları, çözeltide H₃O⁺ ve Cl⁻ iyonları vardır.',
        ['Seyreltik HCl çözeltisinde asit tamamen iyonlaşmış durumdadır.'],
      ],
      chart: { 'gaz-hacmi': 100.6, sicaklik: 40.3 },
    }),
    ph({
      id: 'elektron',
      name: 'Parçacık düzeyi: magnezyum elektron verir',
      start: 17,
      end: 21,
      i: [
        'Her Mg atomu 2 elektron bırakır ve Mg²⁺ olarak çözeltiye geçer.',
        ['Yükseltgenme: Mg → Mg²⁺ + 2 e⁻.'],
      ],
      chart: { 'gaz-hacmi': 100.6, sicaklik: 40.3 },
    }),
    ph({
      id: 'hidrojen',
      name: 'Parçacık düzeyi: hidrojen oluşur',
      start: 21,
      end: 25,
      i: [
        'Yüzeydeki H₃O⁺ iyonları elektron alır: H atomu ve su oluşur.',
        ['İndirgenme: H⁺ elektron alarak H atomuna dönüşür; çözeltideki Cl⁻ değişmez.'],
      ],
      chart: { 'gaz-hacmi': 100.6, sicaklik: 40.3 },
    }),
    ph({
      id: 'kabarcik',
      name: 'Parçacık düzeyi: H₂ kabarcıkları',
      start: 25,
      end: 29,
      i: [
        'İki H atomu birleşip H₂ molekülü olur; H₂ kabarcıkları yükselir. Cl⁻ izleyicidir.',
        ['Hız etkenleri: asit derişimi, sıcaklık ve magnezyumun yüzeyi arttıkça çarpışma sıklığı ve hız artar.'],
      ],
      chart: { 'gaz-hacmi': 100.6, sicaklik: 40.3 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem',
      start: 29,
      end: 43,
      i: [
        'Mg(k) + 2 HCl(aq) → MgCl₂(aq) + H₂(g). Net iyon denklemi: Mg + 2 H⁺ → Mg²⁺ + H₂.',
        [
          'Yarı tepkimeler: Mg → Mg²⁺ + 2 e⁻ ve 2 H⁺ + 2 e⁻ → H₂ (yük denkliği sağlanır).',
          'Magnezyum sınırlayıcı, asit fazladır; bu yüzden gaz miktarını magnezyum belirler.',
          'Derişimi ikiye katlamak, sıcaklığı artırmak ya da şeridi toz yapmak çarpışma sayısını artırarak hızı yükseltir (KİM.11.1.5-7).',
        ],
      ],
      chart: { 'gaz-hacmi': 100.6, sicaklik: 40.3 },
    }),
  ],
};
