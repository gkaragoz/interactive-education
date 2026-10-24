import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Experiments 4-6 (İleri only). Particle phases copy the engine stages (id, times offset by the Gözlem length).
// Programme limits: KİM.10.1.3 (precipitation = double displacement; redox examples with dilute HCl or salt solutions),
// KİM.12.1.1-2 (half equations with charge balance, activity series, virtual allowed), KİM.10.1.9-10 (no gas-law
// calculations: gas amounts are shown on the chart only, never computed in the text), KİM.11.1.5-7 (rate factors).

export const cokelmeTrack: TrackInfo = {
  id: 'cokelme-kalsiyum-karbonat',
  nameTr: 'Çökelme: kalsiyum karbonat',
  tagline: 'İki renksiz çözeltiden beyaz katı',
  duration: 42,
  levels: ['ileri'],
  notes: [
    'Güvenli çökelme örneği seçilmiştir (kalsiyum karbonat); kurşun gibi zehirli tuzlar kullanılmaz.',
    'Sanal ölçekli miktarlar: 10 mL 0,5 M CaCl₂ ve 10 mL 0,5 M Na₂CO₃; süzme ve asit damlatma işlemleri özetlenmiştir.',
    'Grafikte pH, karıştırdıktan sonra çökelek oluşunca düşer; çökelek kütlesi 5,0 mmol × 100,09 g/mol ≈ 0,50 g olarak hesaplanmıştır.',
  ],
  phases: [
    ph({
      id: 'gozlem-karistir',
      name: 'Gözlem: çözeltileri karıştır',
      start: 0,
      end: 6,
      i: [
        'İki renksiz çözelti (CaCl₂ ve Na₂CO₃) karıştırılınca anında beyaz bir bulanıklık oluşur: çökelek.',
        [
          'Yeni bir katının oluşması, kimyasal değişimin göstergelerinden biridir.',
          'Beklenen çökelek kütlesi yaklaşık 0,50 g (5,0 mmol CaCO₃).',
          'Karıştırmadan sonra pH yaklaşık 10\'a iner: karbonat iyonlarının çoğu çökelekte tutulmuştur.',
        ],
      ],
      chart: { cokelek: 0, ph: 7 },
    }),
    ph({
      id: 'gozlem-suzme',
      name: 'Gözlem: süzme',
      start: 6,
      end: 10,
      i: [
        'Bulanık karışım huniden süzülür: katı süzgeç kâğıdında kalır, berrak süzüntü ikinci kaba iner.',
        ['Süzüntüde Na⁺ ve Cl⁻ iyonları (yaklaşık 0,010 mol) bulunur, katı yoktur.', 'Süzme, heterojen karışımı (çökelek ve çözelti) ayırır.'],
      ],
      chart: { cokelek: 0.5, ph: 9.96 },
    }),
    ph({
      id: 'gozlem-asit',
      name: 'Gözlem: asit damlat',
      start: 10,
      end: 14,
      i: [
        'Süzgeçteki katıya 1 M HCl damlatılınca köpürme olur: CO₂ çıkar, katı yavaşça çözünür.',
        ['Karbonatlar asitle CO₂ verir; bu, katının kalsiyum karbonat olduğunu gösteren bir testtir.'],
      ],
      chart: { cokelek: 0.5, ph: 9.96 },
    }),
    ph({
      id: 'ayri',
      name: 'Parçacık düzeyi: ayrı iyonlar',
      start: 14,
      end: 18,
      i: [
        'İki çözeltide iyonlar ayrı gezer: Ca²⁺ ile Cl⁻ bir yanda, Na⁺ ile CO₃²⁻ öbür yanda.',
        ['Her iki tuz da suda iyonlarına ayrışmış hâldedir.'],
      ],
      chart: { cokelek: 0.5, ph: 9.96 },
    }),
    ph({
      id: 'yaklas',
      name: 'Parçacık düzeyi: iyonlar yaklaşır',
      start: 18,
      end: 22,
      i: [
        'Karışımda Ca²⁺ ve CO₃²⁻ iyonları birbirini çeker ve yaklaşır; Na⁺ ve Cl⁻ uzak durur.',
        ['Zıt yüklü iyonlar arasındaki elektriksel çekim, katı örgüyü kurar.'],
      ],
      chart: { cokelek: 0.5, ph: 9.96 },
    }),
    ph({
      id: 'kume',
      name: 'Parçacık düzeyi: katı örgü',
      start: 22,
      end: 28,
      i: [
        'Ca²⁺ ve CO₃²⁻ sıkıca dizilip küçük kümeler, sonra beyaz çökelek (CaCO₃) oluşturur; Na⁺ ve Cl⁻ çözeltide kalır.',
        [
          'Çökelek, az çözünen iyonik bir katıdır (CaCO₃ yaklaşık 0,013 g/L).',
          'Na⁺ ve Cl⁻ izleyici iyonlardır: tepkimeye katılmaz.',
        ],
      ],
      chart: { cokelek: 0.5, ph: 9.96 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem',
      start: 28,
      end: 42,
      i: [
        'CaCl₂(aq) + Na₂CO₃(aq) → CaCO₃(k) + 2 NaCl(aq). Net iyon denklemi: Ca²⁺ + CO₃²⁻ → CaCO₃(k).',
        [
          'Çökelme tepkimesi, iyonların eş değiştirdiği çift yer değiştirme tepkimesidir.',
          'Çözünürlük kuralı: karbonat tuzlarının çoğu suda az çözünür; sodyum tuzları ise çözünür.',
          'Çökeleğin asitle verdiği gaz: CaCO₃(k) + 2 H⁺ → Ca²⁺ + CO₂(g) + H₂O.',
        ],
      ],
      chart: { cokelek: 0.5, ph: 9.96 },
    }),
  ],
};

export const demirBakirTrack: TrackInfo = {
  id: 'demir-bakir',
  nameTr: 'Demir çivi + bakır(II) sülfat',
  tagline: 'Etkin metal, daha az etkin metalin yerini alır',
  duration: 42,
  levels: ['ileri'],
  notes: [
    'Gözlem evresi yaklaşık 25 dakikalık süreci hızlandırır (time-lapse). Çivi (yaklaşık 3 g) fazladır; bakır en çok yaklaşık 0,32 g birikir.',
    'Çözeltinin son rengi "yeşilimsi" olarak yaklaşıktır; hidratlı demir(II) tuzları mavi-yeşilimsi görünür.',
    'Redoks örnekleri programa uygun olarak asitli ya da bazlı ortamda seçilmemiştir (KİM.12.1.1).',
    'Gerçek bakır tuzları suda yaşayanlar için zararlıdır; atıklar ağır metal kabına konur, evde denenmez.',
  ],
  phases: [
    ph({
      id: 'gozlem-hazirlik',
      name: 'Gözlem: çözelti ve çivi',
      start: 0,
      end: 4,
      i: [
        'Beherde 50 mL 0,1 M bakır(II) sülfat çözeltisi mavidir; içine temiz, yaklaşık 3 g\'lık bir demir çivi bırakılır.',
        ['Mavi renk, çözeltideki Cu²⁺ iyonlarından gelir.', 'Beklenen: daha etkin olan demir, bakırın yerini alır.'],
      ],
      chart: { 'bakir-kaplama': 0, 'bakir-cozelti': 5.0 },
    }),
    ph({
      id: 'gozlem-kaplama',
      name: 'Gözlem: bakır kaplama',
      start: 4,
      end: 14,
      i: [
        'Zamanla çivi yüzeyi kırmızımsı bakır rengine döner, çözeltinin mavisi solar ve yeşilimsi bir renge kayar.',
        [
          'En çok yaklaşık 0,32 g bakır birikir; çözeltideki 5,0 mmol Cu²⁺ tükenir.',
          'Yeni bir madde (bakır metali) oluşmuştur: renk değişimi ve katı oluşumu kimyasal değişim göstergesidir.',
        ],
      ],
      chart: { 'bakir-kaplama': 0, 'bakir-cozelti': 5.0 },
    }),
    ph({
      id: 'basla',
      name: 'Parçacık düzeyi: başlangıç',
      start: 14,
      end: 17,
      i: [
        'Çivinin yüzeyinde Fe atomları, suda mavi Cu²⁺ iyonları ve SO₄²⁻ iyonları bulunur.',
        ['Metal yüzeyi, atomların düzenli dizildiği bir örgüdür.'],
      ],
      chart: { 'bakir-kaplama': 0.31, 'bakir-cozelti': 0 },
    }),
    ph({
      id: 'elektron',
      name: 'Parçacık düzeyi: demir elektron verir',
      start: 17,
      end: 21,
      i: [
        'Yüzeydeki her Fe atomu 2 elektron bırakır ve Fe²⁺ olarak çözeltiye geçer; elektronlar metalde ilerler.',
        ['Elektron veren Fe yükseltgenir: Fe → Fe²⁺ + 2 e⁻.'],
      ],
      chart: { 'bakir-kaplama': 0.31, 'bakir-cozelti': 0 },
    }),
    ph({
      id: 'bakir',
      name: 'Parçacık düzeyi: bakır birikir',
      start: 21,
      end: 25,
      i: [
        'Yakındaki Cu²⁺ iyonları bu elektronları alır, bakır atomuna dönüşüp yüzeye yapışır.',
        ['Elektron alan Cu²⁺ indirgenir: Cu²⁺ + 2 e⁻ → Cu.'],
      ],
      chart: { 'bakir-kaplama': 0.31, 'bakir-cozelti': 0 },
    }),
    ph({
      id: 'sonuc',
      name: 'Parçacık düzeyi: sonuç',
      start: 25,
      end: 28,
      i: [
        'Sülfat iyonları değişmeden izleyici kalır; çözeltide mavi azalmış, çivide kırmızımsı bakır kaplama oluşmuştur.',
        ['Yük korunmuştur: giden 2 elektron, gelen 2 elektrondur.'],
      ],
      chart: { 'bakir-kaplama': 0.31, 'bakir-cozelti': 0 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem',
      start: 28,
      end: 42,
      i: [
        'Fe(k) + CuSO₄(aq) → FeSO₄(aq) + Cu(k). Net iyon denklemi: Fe + Cu²⁺ → Fe²⁺ + Cu.',
        [
          'Yarı tepkimeler: Fe → Fe²⁺ + 2 e⁻ (yükseltgenme), Cu²⁺ + 2 e⁻ → Cu (indirgenme).',
          'Etkinlik sırası Mg > Zn > Fe > Cu olduğundan demir, bakır iyonunun yerini alabilir; tersi (Cu + FeSO₄) olmaz.',
          'Bu bir yer değiştirme tepkimesidir; aynı zamanda redokstur.',
        ],
      ],
      chart: { 'bakir-kaplama': 0.31, 'bakir-cozelti': 0 },
    }),
  ],
};
