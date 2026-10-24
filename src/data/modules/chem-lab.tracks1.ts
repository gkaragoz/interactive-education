import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// 'Nedenini göster' explainers for experiments 1-3. Each track has three layers: Gözlem (macro), Parçacık düzeyi
// (phases = the engine's particle-script stages, times offset by the Gözlem length) and Denklem (symbolic).
// Chart values are the state at the START of each phase (virtual-scale numbers from the engine's reference runs).
// Programme limits: FB.8.5.2-3 (no balancing at grade 8, word equations), FB.8.5.5 (acid + base without equations),
// FB.8.5.6-7 (indicators, pH scale), KİM.10.1.1/10.1.3, KİM.11.2.10-11 (strong acid with strong base).

export const sirkeTrack: TrackInfo = {
  id: 'sirke-kabartma',
  nameTr: 'Sirke + kabartma tozu',
  tagline: 'Gaz nereye gidiyor? Kütle korunuyor mu?',
  duration: 42,
  levels: ['temel', 'ileri'],
  notes: [
    'Miktarlar sanal ölçektedir (50 mL sirke, 2 g kabartma tozu); köpürme gerçekte saniyeler sürer, burada zaman hızlandırılmıştır.',
    'Parçacık sayıları çizim içindir; gerçek çözeltide milyarlarca tanecik vardır. Atom sayıları her evrede korunacak biçimde seçilmiştir.',
    'Temel düzeyde denklem denkleştirmeye girilmez (FB.8.5.3); sözlü denklem verilir.',
  ],
  phases: [
    ph({
      id: 'gozlem-hazirlik',
      name: 'Gözlem: hazırlık',
      start: 0,
      end: 4,
      t: 'Erlenmeyer kabında 50 mL sirke var ve kap teraziye konmuş. Kabartma tozu henüz eklenmedi.',
      i: [
        'Başlangıç: açık Erlenmeyer kabında 50 mL sirke (pH yaklaşık 2,4) teraziye konmuştur.',
        [
          'Sirke, suda yaklaşık %5 asetik asit çözeltisidir.',
          'Açık kapta çıkan gaz kaptan ayrılabilir; bu yüzden terazi kütle kaybı gösterebilir.',
        ],
      ],
      chart: { 'kutle-kaybi': 0, ph: 2.4, sicaklik: 22 },
    }),
    ph({
      id: 'gozlem-kopurme',
      name: 'Gözlem: köpürme ve kütle',
      start: 4,
      end: 14,
      t: 'Kabartma tozu eklenince köpürme başlar. Açık kapta terazi yaklaşık 1 g azalır: giden, kapta tutulmayan gazdır.',
      i: [
        '2 g kabartma tozu eklenince CO₂ çıkar: açık kapta yaklaşık 1,05 g kütle kaybı olur, pH yaklaşık 4,9\'a yükselir ve kap hafif soğur.',
        [
          'Kabartma tozu sınırlayıcıdır (yaklaşık 0,024 mol); asit fazla olduğu için çözelti hâlâ hafif asidiktir.',
          'Kap balonla kapatılırsa gaz balona dolar ve terazideki toplam kütle değişmez: kütle korunur.',
          'Köpürme, kimyasal değişimin bir göstergesidir: gaz çıkışı (ayrıca enerji değişimi).',
        ],
      ],
      chart: { 'kutle-kaybi': 0, ph: 2.4, sicaklik: 22 },
    }),
    ph({
      id: 'basla',
      name: 'Parçacık düzeyi: başlangıç',
      start: 14,
      end: 17,
      t: 'Sirkede asit molekülleri, kabartma tozunda yüklü tanecikler (iyonlar) var; hepsi ayrı bölgelerde dolaşıyor.',
      i: [
        'CH₃COOH molekülleri ile Na⁺ ve HCO₃⁻ iyonları (çizimde altışar tane) çözeltide ayrı bölgelerde hareket eder.',
        [
          'Asetik asit zayıf bir asittir: molekülünün yalnızca küçük bir kısmı suda iyonlaşır.',
          'Çizimdeki tanecik sayıları gerçeği temsil etmez.',
        ],
      ],
      chart: { 'kutle-kaybi': 1.05, ph: 4.9, sicaklik: 20.9 },
    }),
    ph({
      id: 'proton',
      name: 'Parçacık düzeyi: H⁺ aktarımı',
      start: 17,
      end: 20,
      t: 'Asit molekülleri bir hidrojen parçası (H⁺) verir, kabartma tozunun tanecikleri onu alır. Bağlar kopar, yeni bağlar kurulur.',
      i: [
        'Asit molekülleri H⁺ (proton) verir, HCO₃⁻ iyonları alır: asetat (CH₃COO⁻) ve karbonik asit (H₂CO₃) oluşur.',
        [
          'Bu bir asit-baz tepkimesidir: H⁺ veren asit, H⁺ alan bazdır.',
          'Atom sayıları ve türleri değişmez; yalnızca atomların bağlandığı yerler değişir.',
        ],
      ],
      chart: { 'kutle-kaybi': 1.05, ph: 4.9, sicaklik: 20.9 },
    }),
    ph({
      id: 'bozunma',
      name: 'Parçacık düzeyi: karbonik asit bozunur',
      start: 20,
      end: 23,
      t: 'Oluşan karbonik asit kararsızdır: su ve karbondioksit gazına ayrılır. Sodyum ve asetat çözeltide kalır.',
      i: [
        'H₂CO₃ kararsızdır; H₂O ve CO₂\'ye ayrışır. Na⁺ ile CH₃COO⁻ çözeltide kalıp sodyum asetat çözeltisini oluşturur.',
        [
          'Bozunmada bir C–O bağı kopar, CO₂\'deki C=O bağları ve su molekülü oluşur.',
          'Toplamda atomlar yeniden düzenlenmiştir; hiçbiri yok olmamıştır.',
        ],
      ],
      chart: { 'kutle-kaybi': 1.05, ph: 4.9, sicaklik: 20.9 },
    }),
    ph({
      id: 'kabarcik',
      name: 'Parçacık düzeyi: kabarcıklar',
      start: 23,
      end: 28,
      t: 'Karbondioksit molekülleri toplanıp kabarcık yapar ve yükselir. Her atom türünün sayısı baştakiyle aynı.',
      i: [
        'CO₂ molekülleri toplanıp kabarcık oluşturur ve çözeltiden çıkar; kaptaki C, H, O ve Na sayısı toplamda sabittir.',
        [
          'Kabarcıklar kaptaki hava değildir: tepkimede yeni oluşan CO₂ gazıdır.',
          'Gaz açık kaptan ayrılırsa kaptaki kütle azalır; gazla birlikte toplam kütle korunur.',
        ],
      ],
      chart: { 'kutle-kaybi': 1.05, ph: 4.9, sicaklik: 20.9 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem',
      start: 28,
      end: 42,
      t: 'Sözlü denklem: sirke asidi + kabartma tozu → sodyum asetat + su + karbondioksit gazı. Atomlar yeniden düzenlenir, sayıları değişmez.',
      i: [
        'CH₃COOH(aq) + NaHCO₃(k) → CH₃COONa(aq) + H₂O(s) + CO₂(g): katsayıların hepsi 1\'dir.',
        [
          'Net iyon biçimi: CH₃COOH + HCO₃⁻ → CH₃COO⁻ + H₂O + CO₂.',
          'Atom envanteri her iki yanda aynıdır: C 3, H 5, O 5, Na 1.',
          'Kütlenin korunumu: kapalı sistemde başlangıç ve son kütle eşittir; açık kapta fark, kaçan CO₂\'dir.',
        ],
      ],
      chart: { 'kutle-kaybi': 1.05, ph: 4.9, sicaklik: 20.9 },
    }),
  ],
};

export const lahanaTrack: TrackInfo = {
  id: 'kirmizi-lahana',
  nameTr: 'Kırmızı lahana ayıracı',
  tagline: 'Renk, sıvının asit mi baz mı olduğunu söyler',
  duration: 40,
  levels: ['temel'],
  notes: [
    'Renkler yaklaşıktır; ekran ve ışık koşullarına göre değişir. Renk tam pH değerini değil, yaklaşık bir aralığı gösterir.',
    'pH değerleri sanal ölçekli örnek çözeltilerin hesaplanmış değerleridir (limon suyu 2,0; sirke 2,6; su 7; kabartma tozu çözeltisi 8,3; sabunlu su 8,3).',
    'Grafik, tüpler arasında doğrusal geçiş çizer; gerçekte her tüp ayrı bir ölçümdür.',
    'Bu parça Temel düzeydir (FB.8.5.5-7): ayıraç mekanizması şekil değiştirme olarak anlatılır, ayrıntılı iyon denklemleri verilmez.',
  ],
  phases: [
    ph({ id: 'gozlem-limon', name: 'Gözlem: limon suyu', start: 0, end: 3, t: 'Limon suyu eklenen tüpte ayıraç kırmızıya yakın renk alır: limon suyu asittir (pH yaklaşık 2).', chart: { ph: 2.0 } }),
    ph({ id: 'gozlem-sirke', name: 'Gözlem: sirke', start: 3, end: 6, t: 'Sirke de ayıracı kırmızımsı yapar (pH yaklaşık 2,6): sirke de asittir.', chart: { ph: 2.6 } }),
    ph({ id: 'gozlem-su', name: 'Gözlem: su', start: 6, end: 9, t: 'Saf suda ayıraç mor kalır: su nötrdür (pH 7).', chart: { ph: 7 } }),
    ph({ id: 'gozlem-kabartma', name: 'Gözlem: kabartma tozu', start: 9, end: 12, t: 'Kabartma tozu çözeltisi ayıracı maviye çevirir: hafif bazdır (pH 7\'den büyük).', chart: { ph: 8.3 } }),
    ph({ id: 'gozlem-sabun', name: 'Gözlem: sabunlu su', start: 12, end: 15, t: 'Sabunlu su da ayıracı mavi tarafa kaydırır: baz özelliği gösterir. Kuvvetli bazlarda renk yeşile, sarıya döner.', chart: { ph: 8.3 } }),
    ph({
      id: 'asit',
      name: 'Parçacık düzeyi: asitli ortam',
      start: 15,
      end: 19,
      t: 'Asitli ortamda ayıracın renk veren parçacığı fazladan bir hidrojen taşır ve kırmızı görünür. Baz henüz ayrı bekliyor.',
      chart: { ph: 8.3 },
    }),
    ph({
      id: 'notr',
      name: 'Parçacık düzeyi: nötr ortam',
      start: 19,
      end: 23,
      t: 'Baz eklenince ortam, ayıraç parçacığından hidrojeni çeker; parçacığın şekli değişir ve renk mora döner.',
      chart: { ph: 8.3 },
    }),
    ph({
      id: 'baz',
      name: 'Parçacık düzeyi: bazlı ortam',
      start: 23,
      end: 27,
      t: 'Daha fazla baz bir hidrojen daha çeker: parçacığın şekli yine değişir, renk mavi-yeşile döner.',
      chart: { ph: 8.3 },
    }),
    ph({
      id: 'denklem',
      name: 'Denklem ve semboller: pH çizelgesi',
      start: 27,
      end: 40,
      t: 'pH 7\'den küçükse asit, 7 ise nötr, 7\'den büyükse baz. Lahana ayıracı bu çizelgede kırmızı, mor, mavi, yeşil, sarı sırasıyla değişir; renk yalnızca yaklaşık bilgi verir.',
      chart: { ph: 8.3 },
    }),
  ],
};
