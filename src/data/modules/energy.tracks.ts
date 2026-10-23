import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Chart values are the state at the START of each phase, for the DEFAULT options (medium light, normal CO2); the
// scene scales them for other options. Programme limits (BİY.10.1.2, FB.8.7.1): general stages only, no mechanism of
// photophosphorylation, cyclic/non-cyclic flow, photosystem types or Calvin intermediates; no chemical equation at Temel.

export const fotosentezTrack: TrackInfo = {
  id: 'fotosentez',
  nameTr: 'Fotosentez',
  tagline: 'Bitki ışıkla nasıl besin yapar?',
  duration: 60,
  levels: ['temel', 'ileri'],
  notes: [
    'Işığa bağımlı tepkimeler ve Calvin döngüsü genel basamaklarıyla gösterilir; fotosistemler, devirli akış ve Calvin döngüsünün ara bileşikleri programda yer almaz.',
    'Kimyasal denklem ve katsayılar gösterilmez; miktarlar şematiktir (son değer = %100).',
    'Işık şiddeti ve CO₂ derişimi seçenekleri deney (BİY.10.1.3, FB.8.7.2) hissi içindir; sonuç değerlerini sahne seçime göre ölçekler.',
  ],
  phases: [
    ph({
      id: 'baslangic',
      name: 'Girdiler',
      start: 0,
      end: 6,
      t: 'Yaprak hücrelerindeki kloroplastlara ışık, su ve karbondioksit ulaşır.',
      i: [
        'Fotosentez, yapraktaki kloroplast içeren hücrelerde gerçekleşir; girdiler ışık, su ve karbondioksittir.',
        [
          'Su köklerden gelir; karbondioksit yaprağın gözeneklerinden (stoma) girer.',
          'Fotosentez ışık enerjisini kimyasal enerjiye çevirir.',
        ],
      ],
      chart: { 'o2-miktari': 0, 'co2-alinan': 0, 'glikoz-miktari': 0, 'atp-nadph': 0 },
    }),
    ph({
      id: 'besin-yapimi',
      name: 'Bitki besin yapar',
      start: 6,
      end: 46,
      t: 'Bitki, ışık enerjisini kullanarak karbondioksit ve sudan besin (glikoz) yapar; bu sırada oksijen açığa çıkar.',
    }),
    ph({
      id: 'isik-yakalama',
      name: 'Işık yakalanır',
      start: 6,
      end: 14,
      i: [
        'Klorofil gibi pigmentler ışık enerjisini yakalar.',
        [
          'Klorofil en çok mavi ve kırmızı ışığı soğurur, yeşil ışığı yansıtır; yaprak bu yüzden yeşil görünür.',
          'Karotenoidler gibi başka pigmentler de ışık yakalar ve enerjiyi aktarır.',
          'Işığa bağımlı tepkimeler kloroplastın tilakoit zarlarında gerçekleşir.',
        ],
      ],
      chart: { 'o2-miktari': 0, 'co2-alinan': 0, 'glikoz-miktari': 0, 'atp-nadph': 0 },
    }),
    ph({
      id: 'su-ayrisimi',
      name: 'Su parçalanır',
      start: 14,
      end: 26,
      i: [
        'Işık enerjisiyle su parçalanır ve oksijen açığa çıkar; elektronlar bir elektron taşıma sisteminden geçerken ATP ve NADPH yapılır.',
        [
          'Fotosentezde açığa çıkan oksijen sudan gelir.',
          'Işık enerjisi ATP ve NADPH\'de kimyasal enerji olarak depolanır.',
          'Bu tepkimeler ışığa bağımlıdır; ışık yoksa durur.',
        ],
      ],
      chart: { 'o2-miktari': 0, 'co2-alinan': 0, 'glikoz-miktari': 0, 'atp-nadph': 0 },
    }),
    ph({
      id: 'calvin',
      name: 'Calvin döngüsü',
      start: 26,
      end: 46,
      i: [
        'Işığın doğrudan kullanılmadığı tepkimelerde (Calvin döngüsü) CO₂ bağlanır ve ATP ile NADPH kullanılarak glikoza dönüştürülür.',
        [
          'Calvin döngüsü kloroplastın stromasında gerçekleşir.',
          'Bir glikoz molekülü için döngü altı kez döner (altı CO₂ bağlanır).',
          'ATP ve NADPH tükenir; ışığa bağımlı tepkimeler onları yeniden üretir.',
        ],
      ],
      chart: { 'o2-miktari': 100, 'co2-alinan': 0, 'glikoz-miktari': 0, 'atp-nadph': 100 },
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç: besin ve oksijen',
      start: 46,
      end: 52,
      t: 'Yapılan besin bitkinin büyümesi ve enerjisi için kullanılır; oksijen havaya verilir.',
      i: [
        'Glikoz nişasta ve selüloz gibi moleküllerin yapımında ve hücresel solunumda kullanılır; oksijen stomalardan atmosfere çıkar.',
        [
          'Fotosentez, ışık enerjisini canlılar için kullanılabilir kimyasal enerjiye çeviren temel süreçtir.',
          'Üreticilerin yaptığı besin, besin zincirindeki diğer canlıları da besler.',
        ],
      ],
      chart: { 'o2-miktari': 100, 'co2-alinan': 100, 'glikoz-miktari': 100, 'atp-nadph': 20 },
    }),
    ph({
      id: 'deney',
      name: 'Deney: ışık ve CO₂',
      start: 52,
      end: 60,
      t: 'Işık ya da karbondioksit arttıkça fotosentez hızlanır; ama bir noktadan sonra daha fazla artış hızı artırmaz.',
      i: [
        'Işık şiddeti, CO₂ derişimi, sıcaklık ve su miktarı fotosentez hızını etkiler.',
        [
          'Deneyde değiştirilen faktör bağımsız, ölçülen hız (örneğin oksijen kabarcığı sayısı) bağımlı değişkendir.',
          'Işık yeterince artınca başka bir faktör (örneğin CO₂) hızı sınırlar ve hız artık yükselmez.',
        ],
      ],
      chart: { 'o2-miktari': 100, 'co2-alinan': 100, 'glikoz-miktari': 100, 'atp-nadph': 20 },
    }),
  ],
};

export const kemosentezTrack: TrackInfo = {
  id: 'kemosentez',
  nameTr: 'Kemosentez',
  tagline: 'Işık olmadan besin üretimi',
  duration: 32,
  levels: ['ileri'],
  notes: [
    'Kemosentez kısa bir bilgi parçasıdır; programa göre kemosentez tepkimelerine girilmez, bu yüzden kimyasal denklemler gösterilmez.',
    'Hidrotermal baca bir örnek ortamdır; kemosentez başka ortamlarda da görülür.',
  ],
  phases: [
    ph({
      id: 'isik-yok',
      name: 'Işığın ulaşmadığı yerler',
      start: 0,
      end: 7,
      i: [
        'Derin deniz tabanı, hidrotermal bacalar ve mağaralar gibi güneş ışığının ulaşmadığı yerlerde de canlılar yaşar.',
        ['Bu ortamlarda fotosentez yapılamaz.', 'Besin yine de üretilir: üreticiler kemosentez yapan bakterilerdir.'],
      ],
      chart: { 'organik-madde': 0, 'isik-miktari': 0 },
    }),
    ph({
      id: 'enerji',
      name: 'Kimyasal enerji',
      start: 7,
      end: 16,
      i: [
        'Kemosentez yapan canlılar, hidrojen sülfür, hidrojen gazı ya da demir iyonları gibi inorganik maddelerin kimyasal enerjisini kullanır.',
        ['Enerji kaynağı ışık değil, bu maddelerin kimyasal enerjisidir.', 'Bu süreçteki tepkimeler programda ayrıntılandırılmaz.'],
      ],
      chart: { 'organik-madde': 0, 'isik-miktari': 0 },
    }),
    ph({
      id: 'sentez',
      name: 'Organik madde sentezi',
      start: 16,
      end: 25,
      i: [
        'Elde edilen kimyasal enerjiyle karbondioksitten organik madde (besin) üretilir.',
        ['Fotosentezde olduğu gibi inorganik karbondan organik madde yapılır; yalnızca enerji kaynağı farklıdır.', 'Üretilen besin hem bakteriyi hem ona bağımlı canlıları besler.'],
      ],
      chart: { 'organik-madde': 0, 'isik-miktari': 0 },
    }),
    ph({
      id: 'onem',
      name: 'Ekolojik önem',
      start: 25,
      end: 32,
      i: [
        'Kemosentetik bakteriler ışıksız ekosistemlerin üreticileridir; diğer canlılar onlarla beslenir ya da onlarla birlikte yaşar.',
        ['Hidrotermal baca topluluklarında büyük hayvan popülasyonları kemosentetik üretime dayanır.', 'Bazı kemosentetik canlılar kirlilik gidermede (biyoremediasyon) da rol oynar.'],
      ],
      chart: { 'organik-madde': 100, 'isik-miktari': 0 },
    }),
  ],
};
