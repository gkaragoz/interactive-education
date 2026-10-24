import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Experiments 9-10 (İleri only). Programme: KİM.11.1.1/5/7 (energy change, collision theory, catalyst as a rate factor;
// the peroxide experiment itself is enrichment, labelled "Ek bilgi" in the notes), KİM.12.1.6-7 (electrolytic cell
// components; qualitative current-time-amount relation, no maths). Gas amounts are shown on the chart only.

export const peroksitTrack: TrackInfo = {
  id: 'hidrojen-peroksit-katalizor',
  nameTr: 'Hidrojen peroksit ve katalizör',
  tagline: 'Katalizör tepkimeyi hızlandırır ama harcanmaz',
  duration: 42,
  levels: ['ileri'],
  notes: [
    'Ek bilgi: bu deney MEB programında adıyla geçmez; katalizörün hız etkeni olması (KİM.11.1.7) ve enerji değişimi (KİM.11.1.1) için örnek olarak seçilmiştir.',
    'Sanal ölçek: 50 mL %3 hidrojen peroksit, bir tutam maya ve biraz sabun; gerçek köpürme saniyeler içinde olur. Güçlü peroksit cildi yakar ve hiç kullanılmaz.',
    'Maya, katalaz enzimi kaynağıdır; enzimin ayrıntısı ve etkinleşme enerjisi grafiği şematiktir.',
    'Kapalı şişede yapılmaz: biriken oksijen basıncı şişeyi patlatabilir.',
  ],
  phases: [
    ph({
      id: 'gozlem-hazirlik',
      name: 'Gözlem: katalizörsüz karışım',
      start: 0,
      end: 4,
      i: [
        'Silindirde 50 mL %3 hidrojen peroksit ve biraz sabun var; katalizör olmadığı için tepkime çok yavaştır.',
        ['Hidrojen peroksit kendi kendine çok yavaş bozunur; gözle fark edilen bir değişim olmaz.'],
      ],
      chart: { 'gaz-hacmi': 0, sicaklik: 22 },
    }),
    ph({
      id: 'gozlem-katalizor',
      name: 'Gözlem: maya eklenir, köpük oluşur',
      start: 4,
      end: 14,
      i: [
        'Maya eklenince oksijen hızla çıkar; sabunlu karışım köpürüp silindirden yükselir ve silindir ısınır (22 °C\'den yaklaşık 32 °C\'ye).',
        [
          'Gaz çıkışı, köpük ve ısınma kimyasal değişimin göstergeleridir; tepkime ekzotermiktir.',
          'Köpük buhar değil, sabun filminde tutulan oksijen kabarcıklarıdır.',
          'Maya sonunda aynı miktarda kalır: katalizör harcanmamıştır.',
        ],
      ],
      chart: { 'gaz-hacmi': 0, sicaklik: 22 },
    }),
    ph({
      id: 'basla',
      name: 'Parçacık düzeyi: başlangıç',
      start: 14,
      end: 17,
      i: [
        'Suda H₂O₂ molekülleri vardır ve çok yavaş bozunurlar; katalizör henüz etkili değildir.',
        ['Tepkimenin hızlı olabilmesi için molekül çarpışmalarının yeterli enerjiyle ve uygun yönelimle olması gerekir (KİM.11.1.5).'],
      ],
      chart: { 'gaz-hacmi': 538, sicaklik: 31.9 },
    }),
    ph({
      id: 'baglan',
      name: 'Parçacık düzeyi: katalizör bağlanır',
      start: 17,
      end: 20,
      i: [
        'Katalizör (katalaz) H₂O₂\'yi yakalar ve daha düşük enerjili bir yol sunar: etkinleşme enerjisi azalır.',
        ['Katalizör tepkimenin yönünü ya da ürün miktarını değiştirmez, yalnızca hızını artırır.'],
      ],
      chart: { 'gaz-hacmi': 538, sicaklik: 31.9 },
    }),
    ph({
      id: 'kop',
      name: 'Parçacık düzeyi: bağ kopar',
      start: 20,
      end: 24,
      i: [
        'H₂O₂ içindeki O–O bağı kopar: su molekülleri ve O atomları oluşur.',
        ['Peroksit bağı zayıftır; katalizör bu bağın kopmasını kolaylaştırır.'],
      ],
      chart: { 'gaz-hacmi': 538, sicaklik: 31.9 },
    }),
    ph({
      id: 'o2',
      name: 'Parçacık düzeyi: oksijen çıkar',
      start: 24,
      end: 28,
      i: [
        'O atomları ikişer ikişer birleşip O₂ olur; kabarcıklar sabun filminde tutulup köpüğü yükseltir. Katalizör aynen kalır.',
        ['Katalizör tepkimeden sonra değişmeden çıkar ve yeni peroksit moleküllerini bozmaya devam eder.'],
      ],
      chart: { 'gaz-hacmi': 538, sicaklik: 31.9 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem',
      start: 28,
      end: 42,
      i: [
        '2 H₂O₂(aq) → 2 H₂O(s) + O₂(g) (katalizör okun üstüne yazılır).',
        [
          'Tepkime ekzotermiktir: yaklaşık −98 kJ/mol H₂O₂ ısı verir.',
          'Katalizör denkleme girmez, çünkü tepkimenin sonunda aynı miktardadır.',
          'Oluşan O₂ mol sayısı, bozunan H₂O₂ mol sayısının yarısıdır.',
        ],
      ],
      chart: { 'gaz-hacmi': 538, sicaklik: 31.9 },
    }),
  ],
};

export const elektrolizTrack: TrackInfo = {
  id: 'su-elektrolizi',
  nameTr: 'Suyun elektrolizi',
  tagline: 'Elektrik akımıyla sudan hidrojen ve oksijen',
  duration: 44,
  levels: ['ileri'],
  notes: [
    'Gerçek elektroliz yavaştır (burada 9 V ile yaklaşık 10 dakikada 13 mL hidrojen); gözlem evresi zamanı hızlandırır.',
    'Çözeltiye az miktarda sodyum sülfat katılır, çünkü saf su akımı çok az iletir. Sofra tuzu klor gazı oluşturabileceğinden kullanılmaz.',
    'Gaz hacimleri yalnızca grafikte gösterilir; Faraday hesabına girilmez, yalnızca akım ve süre arttıkça madde miktarının arttığı söylenir (KİM.12.1.7).',
    'Hidrojen ve oksijen karışımı patlayıcıdır; gerçek deney evde önerilmez.',
  ],
  phases: [
    ph({
      id: 'gozlem-hazirlik',
      name: 'Gözlem: düzenek',
      start: 0,
      end: 4,
      i: [
        'Hofmann voltametresinde 150 mL su ve 1,5 g sodyum sülfat vardır; elektrotlar 9 V doğru akım kaynağına bağlanacaktır.',
        ['Elektrolitik hücrenin bileşenleri: anot, katot, elektrolit ve güç kaynağıdır.', 'Sodyum sülfat iyon sağlayarak akımı taşır.'],
      ],
      chart: { 'hidrojen-hacmi': 0, 'oksijen-hacmi': 0 },
    }),
    ph({
      id: 'gozlem-akim',
      name: 'Gözlem: kabarcıklar ve gaz hacimleri',
      start: 4,
      end: 14,
      i: [
        'Akım geçince iki elektrotta kabarcık çıkar; katot tüpünde oksijen tüpünün iki katı hacimde hidrojen toplanır.',
        [
          'Gaz çıkışı, kimyasal değişimin göstergesidir.',
          'Hacim oranı H₂ : O₂ = 2 : 1\'dir; bu, suyun formülü H₂O ile uyumludur.',
          'Akım ve süre arttıkça toplanan gaz miktarı da artar (niteliksel ilişki).',
        ],
      ],
      chart: { 'hidrojen-hacmi': 0, 'oksijen-hacmi': 0 },
    }),
    ph({
      id: 'basla',
      name: 'Parçacık düzeyi: iyonlar sürüklenir',
      start: 14,
      end: 18,
      i: [
        'Suda Na⁺ ve SO₄²⁻ iyonları vardır; akım bağlanınca Na⁺ katoda, SO₄²⁻ anoda doğru sürüklenir.',
        ['Pozitif yüklü iyonlar katoda (eksi uç), negatif yüklü iyonlar anoda (artı uç) gider.'],
      ],
      chart: { 'hidrojen-hacmi': 13.4, 'oksijen-hacmi': 6.7 },
    }),
    ph({
      id: 'elektrot',
      name: 'Parçacık düzeyi: elektrotlardaki tepkimeler',
      start: 18,
      end: 24,
      i: [
        'Katotta su molekülleri elektron alır: H₂ ve OH⁻ oluşur. Anotta su elektron verir: O₂ ve H⁺ oluşur. Elektronlar dış telde anottan katoda akar.',
        [
          'Katot indirgenme, anot yükseltgenme olayının gerçekleştiği elektrottur.',
          'Her O₂ için 4 elektron geçer; bu yüzden katotta iki kat H₂ oluşur.',
        ],
      ],
      chart: { 'hidrojen-hacmi': 13.4, 'oksijen-hacmi': 6.7 },
    }),
    ph({
      id: 'birles',
      name: 'Parçacık düzeyi: H⁺ ve OH⁻ birleşir',
      start: 24,
      end: 27,
      i: [
        'H⁺ ve OH⁻ yeniden birleşip su olur. Net sonuç: 2 su molekülü 2 H₂ ve 1 O₂ vermiştir.',
        ['Sodyum sülfat harcanmaz; yalnızca iyon sağlayarak akımı taşır.'],
      ],
      chart: { 'hidrojen-hacmi': 13.4, 'oksijen-hacmi': 6.7 },
    }),
    ph({
      id: 'gaz',
      name: 'Parçacık düzeyi: gaz toplanır',
      start: 27,
      end: 30,
      i: [
        'Gaz molekülleri tüplerin tepesinde toplanır: katotta iki kat fazla hidrojen vardır.',
        ['Gaz, tüpteki suyu aşağı iter; hacim doğrudan okunur.'],
      ],
      chart: { 'hidrojen-hacmi': 13.4, 'oksijen-hacmi': 6.7 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem',
      start: 30,
      end: 44,
      i: [
        'Katot: 2 H₂O + 2 e⁻ → H₂ + 2 OH⁻. Anot: 2 H₂O → O₂ + 4 H⁺ + 4 e⁻. Toplam: 2 H₂O → 2 H₂ + O₂.',
        [
          'Elektrik enerjisi, kendiliğinden olmayan bir tepkimeyi yürütür; kimyasal enerji depolanır.',
          'Suyun elektrolizi için gereken en küçük gerilim yaklaşık 1,23 V\'tur; uygulamada daha yüksek gerilim kullanılır.',
          'Yarı tepkimeler toplanırken elektronlar sadeleşir ve yük denkliği sağlanır.',
        ],
      ],
      chart: { 'hidrojen-hacmi': 13.4, 'oksijen-hacmi': 6.7 },
    }),
  ],
};
