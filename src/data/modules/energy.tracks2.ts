import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Cellular respiration and fermentation. Chart values: state at the START of each phase for ONE glucose (6 carbons).
// Programme limits: BİY.10.1.7 (glikoliz, pirüvatın oksidasyonu, Krebs, ETS; no Krebs intermediates, no ETS protein names,
// no chemiosmosis; "ATP üretildiği vurgulanır"), BİY.10.1.1 (ATP synthesis pathways not given), FB.8.7.3 (grade 8: no
// equation, types or stages of respiration). ATP synthase appears only as a labelled "Ek bilgi".

export const solunumTrack: TrackInfo = {
  id: 'hucresel-solunum',
  nameTr: 'Hücresel solunum',
  tagline: 'Glikozdan ATP: glikoliz, Krebs ve elektron taşıma',
  duration: 66,
  levels: ['temel', 'ileri'],
  notes: [
    'Programa göre Krebs döngüsünün ara bileşikleri, elektron taşıma sistemindeki protein adları ve kimyasal ozmoz gösterilmez; yalnızca karbon sayıları, ürünler ve ATP üretimi vurgulanır.',
    'Toplam ATP verimi kaynaklara göre değişir (yaklaşık 29–38); burada yaklaşık 30 alınmıştır. Basamak ATP değerleri şematiktir.',
    'Temel düzeyde (8. sınıf programı) kimyasal denklem, solunum türleri ve evreler anlatılmaz; yalnızca besinden enerji eldesi ve sonuçta karbondioksit ile suyun açığa çıkması söylenir.',
  ],
  phases: [
    ph({
      id: 'baslangic',
      name: 'Hücrenin enerji ihtiyacı',
      start: 0,
      end: 6,
      t: 'Hücreler yaşamak için enerjiye ihtiyaç duyar; besinlerdeki enerjiyi hücrenin kullanabileceği biçime çevirir.',
      i: [
        'Hücre, besinlerin kimyasal enerjisini enerji para birimi olan ATP\'ye aktarır.',
        [
          'ATP, hücrede enerji aktarımında kullanılan moleküldür; hücre onu depolamak yerine sürekli yeniler.',
          'Bu modelde yalnızca ATP\'nin üretildiği vurgulanır; ATP sentezi yolları ayrıntılandırılmaz.',
        ],
      ],
      chart: { 'glikoz-kalan': 100, 'atp-toplam': 0, 'co2-cikis': 0, 'o2-kullanimi': 0 },
    }),
    ph({
      id: 'enerji-eldesi',
      name: 'Besinden enerji elde edilir',
      start: 6,
      end: 58,
      t: 'Hücre, besini oksijen kullanarak adım adım parçalar ve açığa çıkan enerjiyi kullanılabilir hâle getirir. Bu sırada karbondioksit ve su açığa çıkar. Mitokondri bu işte önemli rol oynar.',
    }),
    ph({
      id: 'glikoliz',
      name: 'Glikoliz',
      start: 6,
      end: 18,
      i: [
        'Glikoz sitoplazmada, oksijen gerekmeden iki pirüvata yıkılır.',
        [
          'Altı karbonlu glikozdan üç karbonlu iki pirüvat oluşur.',
          'Net 2 ATP kazanılır.',
          'Glikoliz oksijen gerektirmez; hem oksijenli solunumun hem fermantasyonun ilk basamağıdır.',
        ],
      ],
      chart: { 'glikoz-kalan': 100, 'atp-toplam': 0, 'co2-cikis': 0, 'o2-kullanimi': 0 },
    }),
    ph({
      id: 'piruvat',
      name: 'Pirüvatın oksidasyonu',
      start: 18,
      end: 26,
      i: [
        'Pirüvat mitokondri matriksine girer; karbonlarından biri CO₂ olarak ayrılır ve iki karbonlu bir asetil grubu kalır.',
        [
          'Pirüvatın oksidasyonu mitokondri matriksinde gerçekleşir.',
          'Her glikozdan iki pirüvat oluştuğu için bu basamakta toplam 2 CO₂ açığa çıkar.',
          'Asetil grubu Krebs döngüsüne girer.',
        ],
      ],
      chart: { 'glikoz-kalan': 0, 'atp-toplam': 2, 'co2-cikis': 0, 'o2-kullanimi': 0 },
    }),
    ph({
      id: 'krebs',
      name: 'Krebs döngüsü',
      start: 26,
      end: 38,
      i: [
        'Asetil gruplarının karbonları Krebs döngüsünde CO₂\'ye kadar yıkılır ve yüksek enerjili taşıyıcılar yüklenir.',
        [
          'Krebs döngüsü mitokondri matriksinde gerçekleşir.',
          'Döngüde 4 CO₂ daha açığa çıkar; altı karbonlu glikozun bütün karbonları artık CO₂ olmuştur.',
          'Az miktarda ATP burada da üretilir.',
          'Programa göre döngünün ara bileşikleri verilmez; yalnızca karbon sayıları ve ürünler izlenir.',
        ],
      ],
      chart: { 'glikoz-kalan': 0, 'atp-toplam': 2, 'co2-cikis': 2, 'o2-kullanimi': 0 },
    }),
    ph({
      id: 'etz',
      name: 'Elektron taşıma sistemi',
      start: 38,
      end: 52,
      i: [
        'Yüksek enerjili taşıyıcılardan alınan elektronlar iç zardaki elektron taşıma sisteminden geçer; oksijen son elektron alıcısıdır ve su oluşur. Bu süreçte çok sayıda ATP üretilir.',
        [
          'Elektron taşıma sistemi mitokondrinin iç zarında yer alır.',
          'Oksijen elektronları alıp su oluşturur; solunumda oksijenin gerekliliği bundandır.',
          'Oksijen yoksa bu basamak durur ve ATP üretimi çok düşer.',
          'Ek bilgi (programın ötesinde): ATP üretimi iç zardaki ATP sentaz enzimiyle yapılır.',
        ],
      ],
      chart: { 'glikoz-kalan': 0, 'atp-toplam': 4, 'co2-cikis': 6, 'o2-kullanimi': 0 },
    }),
    ph({
      id: 'verim',
      name: 'Toplam verim',
      start: 52,
      end: 58,
      i: [
        'Bir glikozdan yaklaşık 30 ATP elde edilir (kaynaklara göre 29–38 arasında değişen değerler verilir); enerjinin kalanı ısı olarak açığa çıkar.',
        [
          'Glikozun enerjisinin yaklaşık %34\'ü ATP\'ye aktarılır; kalanı ısıdır.',
          'Verim hücre türüne ve koşullara göre değişir.',
        ],
      ],
      chart: { 'glikoz-kalan': 0, 'atp-toplam': 30, 'co2-cikis': 6, 'o2-kullanimi': 100 },
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç',
      start: 58,
      end: 66,
      t: 'Besindeki enerji hücrenin kullanabileceği ATP\'ye aktarıldı; karbondioksit ve su dışarı verilir. Solunum bütün canlılarda gerçekleşir.',
      i: [
        'Özet: glikoz ve oksijen kullanılır; karbondioksit, su ve enerji (ATP ve ısı) açığa çıkar.',
        [
          'Fotosentez besin ve oksijen üretir, hücresel solunum ise onları kullanır; iki süreç birbirini tamamlar.',
          'Enerji ihtiyacı yüksek hücrelerde (örneğin kas) çok sayıda mitokondri bulunur.',
        ],
      ],
      chart: { 'glikoz-kalan': 0, 'atp-toplam': 30, 'co2-cikis': 6, 'o2-kullanimi': 100 },
    }),
  ],
};

export const fermantasyonTrack: TrackInfo = {
  id: 'fermantasyon',
  nameTr: 'Fermantasyon',
  tagline: 'Oksijen yokken enerji: laktik asit ve alkol fermantasyonu',
  duration: 50,
  levels: ['ileri'],
  notes: [
    'Aynı glikoz için iki fermantasyon yolu art arda gösterilir; grafik her yolun ürününü kendi evresinde izler.',
    'Verim karşılaştırması yaklaşık değerlerle yapılır (fermantasyon 2 ATP, oksijenli solunum yaklaşık 30 ATP).',
    'Fermantasyon deneyi (BİY.10.1.9) animasyona dahil değildir; yalnızca basit bir deney fikri sunulur.',
  ],
  phases: [
    ph({
      id: 'baslangic',
      name: 'Oksijen yok',
      start: 0,
      end: 6,
      i: [
        'Oksijensiz ortamda hücre, glikolizle enerji elde etmeyi sürdürür.',
        ['Oksijen yoksa elektron taşıma sistemi çalışamaz.', 'Glikolizin sürmesi için NADH\'nin yeniden NAD⁺\'ya çevrilmesi gerekir.'],
      ],
      chart: { 'atp-toplam': 0, 'laktik-asit': 0, etanol: 0, 'co2-cikis': 0 },
    }),
    ph({
      id: 'glikoliz',
      name: 'Glikoliz',
      start: 6,
      end: 14,
      i: [
        'Glikoz iki pirüvata yıkılır ve net 2 ATP kazanılır.',
        ['Glikoliz sitoplazmada gerçekleşir ve oksijen gerektirmez.', 'Bu basamak oksijenli solunumdakiyle aynıdır.'],
      ],
      chart: { 'atp-toplam': 0, 'laktik-asit': 0, etanol: 0, 'co2-cikis': 0 },
    }),
    ph({
      id: 'laktik',
      name: 'Laktik asit fermantasyonu',
      start: 14,
      end: 26,
      i: [
        'Pirüvat laktik aside çevrilir; böylece NADH yeniden NAD⁺ olur ve glikoliz sürebilir.',
        [
          'Bu yolda CO₂ açığa çıkmaz.',
          'Kas hücrelerinde oksijen yetersizken laktik asit birikir.',
          'Yoğurt ve turşu gibi besinlerin yapımında kullanılır.',
        ],
      ],
      chart: { 'atp-toplam': 2, 'laktik-asit': 0, etanol: 0, 'co2-cikis': 0 },
    }),
    ph({
      id: 'alkol',
      name: 'Alkol (etanol) fermantasyonu',
      start: 26,
      end: 38,
      i: [
        'Pirüvat etanole ve CO₂\'ye çevrilir; NAD⁺ yenilenir. Bu yolu mayalar kullanır.',
        [
          'Mayalı hamurun kabarması, açığa çıkan CO₂ sayesindedir.',
          'Ekmek, bira ve şarap yapımında kullanılır.',
          'Mayalar oksijen varlığında oksijenli solunum da yapabilir.',
        ],
      ],
      chart: { 'atp-toplam': 2, 'laktik-asit': 2, etanol: 0, 'co2-cikis': 0 },
    }),
    ph({
      id: 'verim',
      name: 'Verim karşılaştırması',
      start: 38,
      end: 46,
      i: [
        'Fermantasyon bir glikozdan yalnızca 2 ATP verir; oksijenli solunumda bu değer yaklaşık 30\'dur.',
        [
          'Fermantasyonda glikoz tam yıkılmaz; enerjinin büyük kısmı laktik asit ya da etanolde kalır.',
          'Bu yüzden fermantasyon yapan hücre aynı ATP için çok daha fazla glikoz harcamak zorundadır.',
          'Glikoliz iki yolda da ortaktır.',
        ],
      ],
      chart: { 'atp-toplam': 2, 'laktik-asit': 2, etanol: 2, 'co2-cikis': 2 },
    }),
    ph({
      id: 'sonuc',
      name: 'Basit deney fikri',
      start: 46,
      end: 50,
      i: [
        'Şekerli suya katılan maya CO₂ çıkarır; bir balonun şişmesi bunu gösterebilir.',
        ['Sıcaklık ya da şeker miktarı gibi tek bir değişken değiştirilerek fermantasyon hızı karşılaştırılabilir.'],
      ],
      chart: { 'atp-toplam': 2, 'laktik-asit': 2, etanol: 2, 'co2-cikis': 2 },
    }),
  ],
};
