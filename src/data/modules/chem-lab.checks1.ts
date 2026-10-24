import type { CheckQuestion, PredictPrompt } from '../moduleTypes';
import { chk, onlyTemel, pred } from './phase';

// Checks and predicts for experiments 1-5. Distractors target misconceptions listed in
// docs/research/kimya-lab-misconceptions.md. Which-phase questions are İleri only (Temel does not name the layers).

const T = onlyTemel;

export const checks1: CheckQuestion[] = [
  // ---- sirke-kabartma
  chk('sirke-kabartma', 'azalir', 12, true, 'concept', 'Köpürme bitti ve kap açık. Terazi, sirke ile kabartma tozunun toplam kütlesine göre ne gösterir?',
    ['Azalır: CO₂ gazı kaptan ayrılmıştır', 'Aynı kalır: hiçbir şey kaybolmaz', 'Artar: gaz da kütle ekler', 'Sıfıra iner'], 0,
    'Çıkan CO₂ açık kaptan uzaklaşır ve kendi kütlesini de götürür. Kütle yok olmaz; kaptan çıkan gazın içindedir.'),
  chk('sirke-kabartma', 'kabarcik', 10, true, 'concept', 'Köpüren kabarcıklar nedir?',
    ['Tepkimede oluşan karbondioksit gazı', 'Kapta baştan var olan hava', 'Su buharı', 'Oksijen gazı'], 0,
    'Kabarcıklar tepkimede yeni oluşan CO₂\'dir; kaptaki hava ya da kaynayan su değildir.'),
  chk('sirke-kabartma', 'kanit', 11, true, 'concept', 'Hangisi kimyasal değişimin bir kanıtıdır?',
    ['Gaz çıkışı', 'Kabın şeklinin değişmesi', 'Sirkenin kaba dökülmesi', 'Kabın teraziye konması'], 0,
    'Yeni bir maddenin (gazın) oluşması, kimyasal değişimin göstergelerindendir: gaz çıkışı, renk değişimi, yeni katı, enerji değişimi.'),
  chk('sirke-kabartma', 'balon', 13, true, 'what-next', 'Aynı deney kap balonla kapatılarak yapılırsa terazi ne gösterir?',
    ['Değişmez: gaz balona dolar, toplam kütle korunur', 'Azalır: gaz yine kaybolur', 'Artar: balon ağırlık ekler', 'Sıfır olur'], 0,
    'Kapalı sistemde gaz kaçamaz; kap, sirke, kabartma tozu ve balon birlikte tartıldığından toplam kütle sabit kalır.'),
  chk('sirke-kabartma', 'atom', 19, true, 'concept', 'Kimyasal tepkimede atomlara ne olur?',
    ['Yok olmaz; yeniden düzenlenir (bağlar kopar, yenileri oluşur)', 'Bir kısmı yok olur', 'Başka atomlara dönüşür', 'Sayıları artar'], 0,
    'Kimyasal değişimde yalnızca bağlar kopar ve oluşur; atomların türü ve sayısı korunur.'),
  chk('sirke-kabartma', 'proton', 18, false, 'concept', 'Bu tepkimede H⁺ (proton) kimden kime geçer?',
    ['Asetik asitten HCO₃⁻ iyonuna', 'HCO₃⁻ iyonundan asetik aside', 'Sudan CO₂\'ye', 'Na⁺ iyonundan asetata'], 0,
    'H⁺ veren asetik asit (asit), H⁺ alan HCO₃⁻ (baz) iyonudur; böylece asetat ve H₂CO₃ oluşur.'),
  chk('sirke-kabartma', 'c-say', 21, false, 'count', 'CH₃COOH ve NaHCO₃\'ın birer biriminde toplam kaç C atomu vardır?',
    ['2', '3', '4', '5'], 1,
    'CH₃COOH\'ta 2, NaHCO₃\'ta 1 C atomu vardır: toplam 3; ürünlerde de 3 C bulunur (asetatta 2, CO₂\'de 1).'),
  chk('sirke-kabartma', 'proton-faz', 18, false, 'which-phase', 'H⁺, asetik asitten HCO₃⁻ iyonuna geçiyor. Parçacık düzeyinde hangi evredeyiz?',
    ['Başlangıç', 'H⁺ aktarımı', 'Karbonik asit bozunur', 'Kabarcıklar'], 1,
    'Asit-baz tepkimesinin birinci basamağı H⁺ aktarımıdır; bozunma ve kabarcık oluşumu bunu izler.'),
  chk('sirke-kabartma', 'kayip', 35, true, 'count', '2 g kabartma tozu sirkeyle tepkimeye girdi. Açık kapta ölçülen kütle kaybı yaklaşık kaç gramdır?',
    ['Yaklaşık 1 g', '0 g', 'Yaklaşık 10 g', 'Yaklaşık 50 g'], 0,
    '2 g (0,024 mol) kabartma tozu yaklaşık 0,024 mol CO₂ verir; bu yaklaşık 1,05 g\'dır.'),
  chk('sirke-kabartma', 'asidik', 38, false, 'concept', 'Tepkime bittiğinde çözelti neden hâlâ hafif asidiktir?',
    ['Kabartma tozu sınırlayıcıdır; asit fazla kalmıştır', 'Tepkime hiç gerçekleşmemiştir', 'CO₂ güçlü bir asittir', 'Terazi hatalıdır'], 0,
    'Kabartma tozu tükenince tepkime durur; kalan asetik asit çözeltiyi hafif asidik (pH yaklaşık 4,9) tutar.'),
];

export const predicts1: PredictPrompt[] = [
  pred('sirke-kabartma', 4, true, 'Kabartma tozunu eklersek açık kapta terazi ne gösterir?', 'Önce 2 g artar; köpürme sürerken CO₂ kaptan çıkar ve değer yaklaşık 1 g düşer.'),
  pred('sirke-kabartma', 14, true, 'Kabı balonla kapatırsak toplam kütle değişir mi?', 'Değişmez: gaz balona dolar ve kapalı sistemde toplam kütle korunur.'),
  pred('sirke-kabartma', 17, false, 'Hangi parçacık H⁺ verecek, hangisi alacak?', 'Asetik asit H⁺ verir, hidrojenkarbonat iyonu (HCO₃⁻) alır.'),

  // ---- kirmizi-lahana (Temel only)
];

export const checks2: CheckQuestion[] = [
  T(chk('kirmizi-lahana', 'limon', 2, true, 'concept', 'Limon suyu kırmızı lahana ayıracını hangi renge çevirir?',
    ['Mavi', 'Kırmızı / pembe', 'Yeşil', 'Sarı'], 1,
    'Asitler lahana ayıracını kırmızıya yakın bir renge çevirir; limon suyu asittir.')),
  T(chk('kirmizi-lahana', 'mor', 8, true, 'concept', 'Saf suda ayıracın mor kalması ne söyler?',
    ['Su nötrdür (pH 7)', 'Su çok güçlü asittir', 'Su çok güçlü bazdır', 'Suda hiçbir madde yoktur'], 0,
    'Mor renk nötr ortamın rengidir; pH 7\'ye yakın değerlerde görülür.')),
  T(chk('kirmizi-lahana', 'kabartma', 11, true, 'what-next', 'Kabartma tozu çözeltisi ayıracı hangi yöne çevirir?',
    ['Maviye (baz tarafına)', 'Kırmızıya (asit tarafına)', 'Renk değişmez', 'Beyaza'], 0,
    'Baz özelliği gösteren çözeltiler ayıracı mavi-yeşil yöne kaydırır.')),
  T(chk('kirmizi-lahana', 'ph3-5', 14, true, 'concept', 'pH 3 ile pH 5 çözeltilerinden hangisi daha asidiktir?',
    ['pH 3', 'pH 5', 'İkisi eşit', 'Karşılaştırılamaz'], 0,
    'pH küçüldükçe asitlik artar; 7\'den küçük her değer asittir ve 3, 5\'ten daha asidiktir.')),
  T(chk('kirmizi-lahana', 'neden-renk', 20, true, 'concept', 'Ayıracın rengi neden değişir?',
    ['Ayıraç parçacığı asit ya da baza göre şekil değiştirir', 'Ayıraç çözeltideki suyu emer', 'Ayıraç yanar', 'Renk, sıvının sıcaklığından gelir'], 0,
    'Ayıracın renk veren parçacığı ortama göre şekil değiştirir; şekil değişince ışığı farklı soğurur ve renk değişir.')),
  T(chk('kirmizi-lahana', 'siralama', 25, true, 'count', 'Hangi sıra asitten baza doğrudur?',
    ['Limon suyu, su, sabunlu su', 'Sabunlu su, su, limon suyu', 'Su, limon suyu, sabunlu su', 'Sirke, sabunlu su, su'], 0,
    'Limon suyu (pH ≈ 2) asit, su nötr (pH 7), sabunlu su baz (pH > 7) tarafındadır.')),
  T(chk('kirmizi-lahana', 'yaklasik', 30, true, 'concept', 'Ayıracın rengi tam pH değerini mi verir?',
    ['Hayır, yaklaşık bir aralık verir', 'Evet, tam değeri verir', 'Yalnızca asitlerde tam verir', 'Yalnızca bazlarda tam verir'], 0,
    'Renk bir pH aralığını gösterir; kesin değer için pH ölçer ya da çok sayıda ayıraç gerekir.')),
  T(chk('kirmizi-lahana', 'guvenlik', 33, true, 'concept', 'Bilinmeyen bir sıvıyı incelerken ne yapılmaz?',
    ['Tadılır ya da koklanır', 'Ayıraçla denenir', 'Gözlük takılır', 'Etiketi okunur'], 0,
    'Bilinmeyen maddeler asla tadılmaz ya da koklanmaz; ayıraçla ve koruyucu donanımla incelenir.')),
  T(chk('kirmizi-lahana', 'baz', 36, true, 'concept', 'pH 7\'den büyük bir sıvı için hangisi doğrudur?',
    ['Baz özelliği gösterir', 'Asittir', 'Nötrdür', 'Tuzdur'], 0,
    'pH 7\'den küçük asit, 7 nötr, 7\'den büyük baz demektir.')),
];

export const predicts2: PredictPrompt[] = [
  T(pred('kirmizi-lahana', 0, true, 'Sence sabunlu su ayıracı hangi renge çevirir?', 'Mavi tarafa: sabunlu su baz özelliği gösterir (pH 7\'den büyük).')),
  T(pred('kirmizi-lahana', 6, true, 'Saf sudaki ayıracın rengi ne olur?', 'Mor kalır: su nötrdür, ayıraç nötr ortamın rengindedir.')),
  T(pred('kirmizi-lahana', 19, true, 'Baz eklendikçe ayıraç parçacığına ne olacak?', 'Parçacıktan hidrojen koparılır, şekli değişir ve renk mora, sonra maviye döner.')),
];

export const checks3: CheckQuestion[] = [
  // ---- notrallesme
  chk('notrallesme', 'renksiz', 3, true, 'concept', 'Başlangıçta fenolftaleinli asit çözeltisi neden renksizdir?',
    ['Fenolftalein asitli ortamda renksizdir', 'Asit rengi siler', 'Çözeltide fenolftalein yoktur', 'Çözelti çok soğuktur'], 0,
    'Fenolftalein pH 8,3\'ün altında renksiz, üstünde pembedir; asitli çözeltide renksiz görünür.'),
  chk('notrallesme', 'on-ml', 7, true, 'what-next', '10 mL baz eklendi. Çözelti hangi renkte olur?',
    ['Renksiz kalır; asit hâlâ fazladır', 'Hemen pembe olur', 'Mor olur', 'Sarı olur'], 0,
    'Eşdeğerlik 20 mL\'de olduğundan 10 mL baz asidin yalnızca yarısını nötrler; pH hâlâ düşüktür ve çözelti renksizdir.'),
  chk('notrallesme', 'pembe', 13, true, 'concept', 'Çözeltinin ilk kalıcı pembe olduğu anda ne olmuştur?',
    ['Asit ile baz birbirini hemen hemen tam nötrlemiştir', 'Asit hiç tepkime vermemiştir', 'Baz hiç kullanılmamıştır', 'Çözeltinin pH\'ı 1\'dir'], 0,
    'Dönüm noktasında eklenen baz miktarı asidi yaklaşık tam nötrler; küçük bir baz fazlası fenolftaleini pembeleştirir.'),
  chk('notrallesme', 'tuz-su', 21, true, 'concept', 'Asit ile baz tepkimesinde ne oluşur?',
    ['Tuz ve su', 'Yalnızca su', 'Asit ve baz karışımı', 'Gaz ve katı'], 0,
    'Nötralleşmede asit ve baz tepkimeye girerek tuz ve su oluşturur; burada tuz sodyum klorürdür.'),
  chk('notrallesme', 'artan-iyon', 25, false, 'concept', 'Eşdeğerlik noktasında çözeltide hangi iyonlar kalır?',
    ['Na⁺ ve Cl⁻', 'Hiçbiri; çözelti saf sudur', 'H⁺ ve OH⁻', 'Yalnızca Cl⁻'], 0,
    'Nötr çözelti "boş" değildir: tuzun iyonları (Na⁺, Cl⁻) çözeltide kalır; H⁺ ve OH⁻ ise suya dönüşmüştür.'),
  chk('notrallesme', 'net', 30, false, 'concept', 'Bu tepkimenin net iyon denklemi hangisidir?',
    ['H⁺ + OH⁻ → H₂O', 'Na⁺ + Cl⁻ → NaCl', 'HCl → H⁺ + Cl⁻', 'NaOH → Na⁺ + OH⁻'], 0,
    'Na⁺ ve Cl⁻ izleyicidir; tepkimeyi yalnızca H⁺ ve OH⁻ iyonlarının birleşmesi özetler.'),
  chk('notrallesme', 'hacim', 13, false, 'count', 'Eşdeğerlik noktasında eklenen NaOH hacmi yaklaşık kaç mL\'dir?',
    ['10,0', '20,0', '25,0', '40,0'], 1,
    '20,0 mL × 0,100 M = 2,00 mmol HCl vardır; 2,00 mmol NaOH için 0,100 M çözeltiden 20,0 mL gerekir.'),
  chk('notrallesme', 'dik', 11, false, 'concept', 'pH eğrisi uç noktaya yaklaşırken neden çok dikleşir?',
    ['Kalan H⁺ çok azaldığı için küçük bir OH⁻ fazlası pH\'ı çok değiştirir', 'Bazın derişimi birden artar', 'Fenolftalein pH\'ı yükseltir', 'Sıcaklık hızla artar'], 0,
    'pH logaritmiktir: H⁺ neredeyse bittiğinde bir damla bile büyük bir değişim yaratır.'),
  chk('notrallesme', 'ph7', 32, false, 'concept', 'Eşdeğerlik noktasında pH ne zaman 7 olur?',
    ['Kuvvetli asit ile kuvvetli bazda', 'Her asit-baz çiftinde', 'Yalnızca zayıf asitlerde', 'Hiçbir zaman'], 0,
    'pH 7, yalnızca kuvvetli asit ve kuvvetli baz çiftinde eşdeğerliğin pH\'ıdır; zayıf asit ya da baz için farklıdır.'),
  chk('notrallesme', 'baz-faz', 20, false, 'which-phase', 'OH⁻ iyonları H₃O⁺ ile birleşip su oluşturuyor. Parçacık düzeyinde hangi evre?',
    ['Asitli çözelti', 'Baz eklenir', 'Eşdeğerlik', 'Baz fazlası'], 1,
    'Damla damla gelen OH⁻\'nin H₃O⁺ ile birleşmesi "baz eklenir" evresini tanımlar.'),
];

export const predicts3: PredictPrompt[] = [
  pred('notrallesme', 5, true, '10 mL baz eklenince çözeltinin rengi ne olur?', 'Renksiz kalır; asit hâlâ fazladır ve fenolftalein asitte renksizdir.'),
  pred('notrallesme', 12, true, 'Sona yaklaşırken bir damla bazın daha eklenmesi neyi değiştirir?', 'Çözelti ilk kez kalıcı pembeye dönebilir: asit tükendiğinde bir damla fazlası renk değiştirir.'),
  pred('notrallesme', 23, false, 'Eşdeğerlik noktasında pH kaç olur?', 'Kuvvetli asit ve kuvvetli baz için pH 7\'ye yakın olur.'),
];

export const checks4: CheckQuestion[] = [
  // ---- cokelme-kalsiyum-karbonat
  chk('cokelme-kalsiyum-karbonat', 'yeni-madde', 3, false, 'concept', 'İki renksiz çözelti karışınca beyaz katı oluşması neyi gösterir?',
    ['Yeni bir madde oluştu: kimyasal değişim', 'Karışım yalnızca bulandı, değişim yok', 'Çözeltiler buharlaştı', 'Su donmuştur'], 0,
    'Çözeltilerde bulunmayan yeni bir katının oluşması, kimyasal değişimin (çökelme) göstergesidir.'),
  chk('cokelme-kalsiyum-karbonat', 'kutle', 4, false, 'count', '5,0 mmol CaCO₃ (M ≈ 100 g/mol) yaklaşık kaç g çökelek verir?',
    ['Yaklaşık 0,05 g', 'Yaklaşık 0,5 g', 'Yaklaşık 5 g', 'Yaklaşık 50 g'], 1,
    '0,0050 mol × 100 g/mol ≈ 0,50 g.'),
  chk('cokelme-kalsiyum-karbonat', 'suzuntu', 8, false, 'concept', 'Süzüntüde hangi iyonlar kalır?',
    ['Na⁺ ve Cl⁻', 'Ca²⁺ ve CO₃²⁻', 'Yalnızca Na⁺', 'Hiçbiri: süzüntü saf sudur'], 0,
    'Ca²⁺ ve CO₃²⁻ çökeleğe geçmiştir; izleyici Na⁺ ve Cl⁻ iyonları çözeltide kalır. İyonlar yok olmaz.'),
  chk('cokelme-kalsiyum-karbonat', 'asit-testi', 12, false, 'concept', 'Katı asitle köpürüyorsa bu neyi gösterir?',
    ['Karbonat içerir (CO₂ çıkıyor)', 'Klorür içerir', 'Şeker içerir', 'Sodyum içerir'], 0,
    'Karbonatlar asitle tepkimeye girerek CO₂ gazı verir; köpürme bu testin sonucudur.'),
  chk('cokelme-kalsiyum-karbonat', 'yaklas-faz', 20, false, 'which-phase', 'Ca²⁺ ve CO₃²⁻ birbirini çekip yaklaşıyor. Parçacık düzeyinde hangi evre?',
    ['Ayrı iyonlar', 'İyonlar yaklaşır', 'Katı örgü', 'Süzme'], 1,
    'İki zıt yüklü iyonun birbirine doğru gelmesi "iyonlar yaklaşır" evresidir.'),
  chk('cokelme-kalsiyum-karbonat', 'orgu-faz', 25, false, 'which-phase', 'İyonlar dizilip kümeler yapıyor ve beyaz çökelek oluşuyor. Hangi evre?',
    ['Ayrı iyonlar', 'İyonlar yaklaşır', 'Katı örgü', 'Süzme'], 2,
    'Düzenli dizilen iyonlar katı örgüyü (çökeleği) oluşturur.'),
  chk('cokelme-kalsiyum-karbonat', 'net', 30, false, 'concept', 'Net iyon denklemi hangisidir?',
    ['Ca²⁺ + CO₃²⁻ → CaCO₃(k)', 'Na⁺ + Cl⁻ → NaCl', 'CaCl₂ → Ca²⁺ + 2 Cl⁻', 'Na₂CO₃ → 2 Na⁺ + CO₃²⁻'], 0,
    'Çökelen iyonlar Ca²⁺ ve CO₃²⁻\'dir; izleyici iyonlar net denklemde yer almaz.'),
  chk('cokelme-kalsiyum-karbonat', 'tur', 33, false, 'concept', 'Çökelme tepkimesi hangi tür tepkimedir?',
    ['Çift yer değiştirme', 'Yanma', 'Tek yer değiştirme', 'Bozunma'], 0,
    'İki tuzun iyonları eş değiştirir: Ca²⁺ CO₃²⁻ ile, Na⁺ Cl⁻ ile eşleşir; bu çift yer değiştirmedir.'),
  chk('cokelme-kalsiyum-karbonat', 'cozunurluk', 36, false, 'concept', 'Çözünürlük kurallarına göre sodyum tuzları için ne söylenir?',
    ['Çoğu suda çözünür', 'Çoğu çökelek yapar', 'Hiçbiri çözünmez', 'Hepsi gaz verir'], 0,
    'Sodyum tuzlarının çoğu suda çok çözünür; bu yüzden Na⁺ iyonları çözeltide izleyici olarak kalır.'),
  chk('cokelme-kalsiyum-karbonat', 'kursun', 38, false, 'concept', 'Bu deneyde neden zehirli kurşun tuzu yerine kalsiyum karbonat çökeltildi?',
    ['Kalsiyum karbonat zararsızdır; güvenli bir örnek seçildi', 'Kurşun tuzu çökelek vermez', 'Kurşun tuzları renksizdir', 'Kalsiyum daha pahalıdır'], 0,
    'Çökelme tepkimesini göstermek için güvenli bir örnek yeterlidir; kurşun bileşikleri zehirlidir ve okulda dikkatle ele alınır.'),
];

export const predicts4: PredictPrompt[] = [
  pred('cokelme-kalsiyum-karbonat', 0, false, 'İki renksiz çözeltiyi karıştırırsak ne gözleriz?', 'Anında beyaz bir bulanıklık: kalsiyum karbonat çökeleği.'),
  pred('cokelme-kalsiyum-karbonat', 14, false, 'Hangi iyonlar bir araya gelip katı oluşturacak?', 'Ca²⁺ ve CO₃²⁻; Na⁺ ve Cl⁻ çözeltide kalacak.'),
  pred('cokelme-kalsiyum-karbonat', 28, false, 'Süzüntüde ne kalır?', 'Na⁺ ve Cl⁻ iyonları (sofra tuzu çözeltisi); katı kalmaz.'),
];

export const checks5: CheckQuestion[] = [
  // ---- demir-bakir
  chk('demir-bakir', 'mavi', 3, false, 'concept', 'Bakır(II) sülfat çözeltisinin mavi rengi hangi iyondan gelir?',
    ['Cu²⁺', 'Fe²⁺', 'SO₄²⁻', 'Na⁺'], 0,
    'Mavi renk Cu²⁺ iyonlarından gelir; sülfat iyonu renksizdir.'),
  chk('demir-bakir', 'kaplama', 8, false, 'concept', 'Çivinin yüzeyi neden kırmızımsıya döner?',
    ['Bakır metali birikir', 'Demir paslanır', 'Çivi bakıra dönüşür', 'Çözeltideki su çivide kalır'], 0,
    'Çivi bakıra dönüşmez: çözeltideki Cu²⁺ iyonları indirgenip bakır atomu olarak yüzeye yapışır.'),
  chk('demir-bakir', 'solma', 12, false, 'what-next', 'Çözeltinin mavisi solarsa ne olmuştur?',
    ['Cu²⁺ iyonları azalmıştır', 'Fe atomları artmıştır', 'Su buharlaşmıştır', 'Sülfat iyonu bitmiştir'], 0,
    'Mavi rengi Cu²⁺ verir; çözeltide Cu²⁺ azaldıkça mavi solar.'),
  chk('demir-bakir', 'elektron-faz', 19, false, 'which-phase', 'Yüzeydeki Fe atomları 2\'şer elektron bırakıyor. Parçacık düzeyinde hangi evre?',
    ['Başlangıç', 'Demir elektron verir', 'Bakır birikir', 'Sonuç'], 1,
    'Elektronların demirden ayrılması "demir elektron verir" evresidir.'),
  chk('demir-bakir', 'bakir-faz', 23, false, 'which-phase', 'Cu²⁺ iyonları elektron alıp atom oluyor ve yüzeye yapışıyor. Hangi evre?',
    ['Başlangıç', 'Demir elektron verir', 'Bakır birikir', 'Sonuç'], 2,
    'Elektron alan Cu²⁺ bakır atomuna dönüşür ve yüzeyde birikir.'),
  chk('demir-bakir', 'yukseltgenen', 20, false, 'concept', 'Bu tepkimede hangi tanecik yükseltgenir?',
    ['Fe', 'Cu²⁺', 'SO₄²⁻', 'H₂O'], 0,
    'Elektron veren (yükseltgenen) Fe atomudur; elektron alan Cu²⁺ indirgenir.'),
  chk('demir-bakir', 'izleyici', 26, false, 'concept', 'Sülfat iyonları bu tepkimede ne yapar?',
    ['İzleyicidir: değişmeden kalır', 'Elektron alır', 'Demirle birleşip çöker', 'Bakıra dönüşür'], 0,
    'SO₄²⁻ iyonu net denkleme girmez; çözeltide aynı kalır.'),
  chk('demir-bakir', 'siralama', 32, false, 'concept', 'Etkinlik sırasına göre hangi tepkime gerçekleşir?',
    ['Fe + CuSO₄', 'Cu + FeSO₄', 'Cu + ZnSO₄', 'Ag + CuSO₄'], 0,
    'Etkin metal (Fe) daha az etkin metalin (Cu) iyonunu çökeltir; ters yönde ya da gümüşle tepkime olmaz.'),
  chk('demir-bakir', 'elektron-say', 30, false, 'count', 'Net iyon denkleminde bir Fe atomu kaç elektron verir?',
    ['1', '2', '3', '4'], 1,
    'Fe → Fe²⁺ + 2 e⁻: iki elektron.'),
  chk('demir-bakir', 'yuk', 36, false, 'concept', 'Bu tepkimede toplam yük korunur mu?',
    ['Evet: verilen elektron sayısı alınana eşittir', 'Hayır: yük artar', 'Hayır: yük azalır', 'Yalnızca demir için'], 0,
    'Fe 2 elektron verir, Cu²⁺ 2 elektron alır; yük denkliği sağlanır.'),
];

export const predicts5: PredictPrompt[] = [
  pred('demir-bakir', 0, false, 'Çivinin yüzeyi hangi renge döner?', 'Kırmızımsı bakır rengine: çivide bakır birikir.'),
  pred('demir-bakir', 14, false, 'Demir atomları ne yapacak?', 'Elektron bırakıp Fe²⁺ olarak çözeltiye geçecek.'),
  pred('demir-bakir', 28, false, 'Bakır teli demir(II) sülfat çözeltisine batırırsak ne olur?', 'Hiçbir şey olmaz: bakır, demirden daha az etkindir ve onun iyonunu yerinden edemez.'),
];
