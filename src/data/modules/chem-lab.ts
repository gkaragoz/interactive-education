import type { ChartSeries, ModuleInfo, ModuleOption } from '../moduleTypes';
import { chemSources } from '../sources-chem';
import { checks1, checks2, checks3, checks4, checks5, predicts1, predicts2, predicts3, predicts4, predicts5 } from './chem-lab.checks1';
import { checks6, checks7, checks8, checks9, checks10, predicts6, predicts7, predicts8, predicts9, predicts10 } from './chem-lab.checks2';
import { chemGlossary } from './chem-lab.glossary';
import { cokelmeTrack, demirBakirTrack } from './chem-lab.tracks2';
import { lahanaTrack, sirkeTrack } from './chem-lab.tracks1';
import { magnezyumAsitTrack, notrallesmeTrack } from './chem-lab.tracks5';
import { cozunmeTrack, yanmaTrack } from './chem-lab.tracks3';
import { elektrolizTrack, peroksitTrack } from './chem-lab.tracks4';

// Module 'chem-lab' (Kimya Laboratuvarı): ten "Nedenini göster" explainers, one per engine experiment
// (src/chemlab/experiments, ids identical). Each track has three layers: Gözlem, Parçacık düzeyi (engine particle
// script stages with identical times) and Denklem. Own wording (ADR 0004). Programme limits are noted per track.
const series = (id: string, labelTr: string, unitTr: string, color: string, min: number, max: number, trackIds: string[]): ChartSeries => ({ id, labelTr, unitTr, color, min, max, trackIds });

const option = (id: string, labelTr: string, trackIds: string[], defaultChoice: string, choices: ModuleOption['choices']): ModuleOption => ({ id, labelTr, trackIds, choices, defaultChoice });

export const chemLab: ModuleInfo = {
  id: 'chem-lab',
  nameTr: 'Kimya Laboratuvarı: Nedenini Göster',
  tagline: 'Gözlemden parçacıklara, parçacıklardan denkleme',
  introTr:
    'Her deneyi önce masada gözle, sonra "nedenini göster" ile parçacık düzeyine in ve en sonda denklemi gör. Sanal laboratuvarda tehlikeli işler güvenle gösterilir; gerçek hayatta bunların bir kısmı asla evde denenmez.',
  levels: ['temel', 'ileri'],
  tracks: [sirkeTrack, lahanaTrack, notrallesmeTrack, cokelmeTrack, demirBakirTrack, magnezyumAsitTrack, yanmaTrack, cozunmeTrack, peroksitTrack, elektrolizTrack],
  charts: [
    series('kutle-kaybi', 'Kaptan çıkan gazın kütlesi', 'g', '#8c6d46', 0, 1.5, ['sirke-kabartma']),
    series('ph', 'pH', 'pH birimi', '#7c4dbd', 0, 14, ['sirke-kabartma', 'kirmizi-lahana', 'notrallesme', 'cokelme-kalsiyum-karbonat']),
    series('sicaklik', 'Sıcaklık', '°C', '#d9822b', 0, 100, ['sirke-kabartma', 'magnezyum-asit', 'cozunme-doygunluk', 'hidrojen-peroksit-katalizor']),
    series('baz-hacmi', 'Eklenen baz', 'mL', '#3f8fa8', 0, 25, ['notrallesme']),
    series('cokelek', 'Çökelek kütlesi', 'g', '#a58b6f', 0, 0.6, ['cokelme-kalsiyum-karbonat']),
    series('bakir-kaplama', 'Biriken bakır', 'g', '#c25a8a', 0, 0.35, ['demir-bakir']),
    series('bakir-cozelti', 'Çözeltideki Cu²⁺', 'mmol', '#4a90c2', 0, 6, ['demir-bakir']),
    series('gaz-hacmi', 'Toplanan gaz', 'mL (sanal ölçek)', '#5a9e3b', 0, 600, ['magnezyum-asit', 'hidrojen-peroksit-katalizor']),
    series('magnezyum-oksit', 'Oluşan magnezyum oksit', 'g', '#a58b6f', 0, 0.25, ['magnezyum-yanma']),
    series('kutle-farki', 'Kül ile şerit arasındaki kütle farkı', 'g', '#8c6d46', 0, 0.1, ['magnezyum-yanma']),
    series('sicaklik-yuksek', 'Kroze sıcaklığı', '°C (sanal ölçek)', '#d9822b', 0, 800, ['magnezyum-yanma']),
    series('cozunmeyen-tuz', 'Çözünmeyen / kristal tuz', 'g', '#3f8fa8', 0, 20, ['cozunme-doygunluk']),
    series('hidrojen-hacmi', 'Katottaki hidrojen', 'mL (sanal ölçek)', '#4a90c2', 0, 15, ['su-elektrolizi']),
    series('oksijen-hacmi', 'Anottaki oksijen', 'mL (sanal ölçek)', '#d9822b', 0, 15, ['su-elektrolizi']),
  ],
  checks: [...checks1, ...checks2, ...checks3, ...checks4, ...checks5, ...checks6, ...checks7, ...checks8, ...checks9, ...checks10],
  predicts: [...predicts1, ...predicts2, ...predicts3, ...predicts4, ...predicts5, ...predicts6, ...predicts7, ...predicts8, ...predicts9, ...predicts10],
  options: [
    option('kap-durumu', 'Kap durumu', ['sirke-kabartma'], 'acik', [
      { id: 'acik', labelTr: 'Açık kap' },
      { id: 'balon', labelTr: 'Balonla kapalı kap' },
    ]),
    option('cozunme-kosulu', 'Çözünme koşulu', ['cozunme-doygunluk'], 'kno3-oda', [
      { id: 'kno3-oda', labelTr: 'Potasyum nitrat, oda sıcaklığı' },
      { id: 'seker-topak', labelTr: 'Topak şeker' },
      { id: 'seker-toz', labelTr: 'Toz şeker, karıştırarak' },
    ]),
    option('metal-cifti', 'Metal ve çözelti', ['demir-bakir'], 'demir-cuso4', [
      { id: 'demir-cuso4', labelTr: 'Demir çivi + bakır(II) sülfat', levels: ['ileri'] },
      { id: 'cinko-cu-nitrat', labelTr: 'Çinko + bakır(II) nitrat', levels: ['ileri'] },
      { id: 'bakir-feso4', labelTr: 'Bakır + demir(II) sülfat (tepkime olmaz)', levels: ['ileri'] },
    ]),
    option('hiz-etkeni', 'Hız etkeni', ['magnezyum-asit'], 'normal', [
      { id: 'normal', labelTr: 'Şerit, 1 M HCl, oda sıcaklığı', levels: ['ileri'] },
      { id: 'seyreltik', labelTr: 'Seyreltik asit (yarı derişim)', levels: ['ileri'] },
      { id: 'toz', labelTr: 'Magnezyum tozu', levels: ['ileri'] },
      { id: 'sicak', labelTr: 'Isıtılmış asit', levels: ['ileri'] },
    ]),
    option('katalizor', 'Katalizör', ['hidrojen-peroksit-katalizor'], 'maya', [
      { id: 'maya', labelTr: 'Maya (katalaz)', levels: ['ileri'] },
      { id: 'yok', labelTr: 'Katalizör yok', levels: ['ileri'] },
      { id: 'iyodur', labelTr: 'İyodür çözeltisi', levels: ['ileri'] },
    ]),
    option('elektrolit', 'Elektrolit', ['su-elektrolizi'], 'sodyum-sulfat', [
      { id: 'sodyum-sulfat', labelTr: 'Sodyum sülfatlı su', levels: ['ileri'] },
      { id: 'saf-su', labelTr: 'Saf su (akım çok az geçer)', levels: ['ileri'] },
    ]),
  ],
  kazanimIds: [
    'FB.7.5.8', 'FB.7.5.9', 'FB.8.5.2', 'FB.8.5.3', 'FB.8.5.5', 'FB.8.5.6', 'FB.8.5.7', 'FB.8.5.8',
    'KİM.10.1.1', 'KİM.10.1.2', 'KİM.10.1.3', 'KİM.10.2.1', 'KİM.10.2.4', 'KİM.10.2.5', 'KİM.10.2.6',
    'KİM.11.1.1', 'KİM.11.1.5', 'KİM.11.1.7', 'KİM.11.2.10', 'KİM.11.2.11', 'KİM.12.1.1', 'KİM.12.1.2', 'KİM.12.1.6', 'KİM.12.1.7',
  ],
  sourceIds: ['meb-fen-2026', 'meb-kimya-2026', ...chemSources.map((s) => s.id)],
  simplifications: [
    'Miktarlar sanal ölçektedir (örneğin 50 mL sirke, 2 g kabartma tozu, 0,10 g magnezyum); gerçek okul deneylerinde de çok küçük miktarlar kullanılır.',
    'Gözlem evreleri gerçek süreçleri hızlandırır (time-lapse): gerçek çözünme, kaplanma ya da elektroliz dakikalar sürebilir.',
    'Parçacık sayıları çizim içindir (her türden birkaç ila birkaç düzine); gerçek çözeltide milyarlarca milyar tanecik vardır. Her evrede atom sayısı ve toplam yük korunacak biçimde seçilmiştir.',
    'Renkler yaklaşıktır ve ekran ile ışığa göre değişir; ayıraç renkleri pH aralığını gösterir, tam değeri vermez.',
    'Motor, çözeltileri homojen karıştırır ve tepkimeleri sınırlayıcı maddeye kadar tamamlar; dengeler yalnızca çözünürlük ve asit-baz ailelerinde modellenir. pH, Kw 25 °C için sabit alınarak hesaplanır.',
    'Çözünürlük 100 mL su başına gram olarak verilir; 1 mL su 1 g sayılır, çözünme hacmi değiştirmez ve hidratlı tuzlar susuz tuz gibi ele alınır.',
    'Isı modeli tek bir ısı kapasitesi ve Newton soğumasıyla yapılır; alev sabit güçle ısıtır. Kroze sıcaklığı sanal ölçektedir, gerçek magnezyum alevi çok daha sıcaktır.',
    'Gazlar ideal sayılır ve açık kaplardan saniyede belirli bir hızla kaçar; gaz yasası hesaplarına girilmez (KİM.10.1.9-10), gaz miktarları yalnızca grafikte gösterilir.',
    'Magnezyumun yanışı yalnızca sanaldır; parlama kısılmıştır ve gerçeği yansıtmaz. Tehlikeli karışımlar engellenir ve miktar ya da yöntem vermeyen bir ders kartı gösterilir.',
    'Temel düzeyde denklem denkleştirmeye ve iyon terimlerine girilmez (FB.8.5.3, FB.8.5.5); formüllü denklemler, yarı tepkimeler ve mol hesapları İleri düzeydedir.',
    'Sabun sodyum laurat, limon suyu sitrik asit çözeltisi olarak modellenmiştir; gerçek ürünlerin içeriği daha karmaşıktır.',
    'Peroksit, kemosentez ve elektroliz parçaları programın doğrudan adlandırmadığı konuları içerir; bunlar "Ek bilgi" olarak etiketlidir.',
  ],
  glossary: chemGlossary,
  funFacts: [
    { level: 'temel', text: 'Kırmızı lahananın rengi antosiyanin denen bir pigmentten gelir; bu pigment ortam asitten baza doğru değiştikçe kırmızıdan mora, maviye, yeşile ve sarıya döner.', sourceId: 'wp-en-anthocyanin' },
    { level: 'temel', text: 'Magnezyum yanarken çok parlak beyaz ışık verir; bu yüzden gerçek deneylerde doğrudan alevine bakılmaz.', sourceId: 'wp-en-magnesium' },
    { level: 'temel', text: 'Sirke, suda çözünmüş asetik asittir; marketteki sirkenin asetik asit oranı yaklaşık yüzde beş ile sekiz arasındadır.', sourceId: 'wp-en-vinegar' },
    { level: 'ileri', text: 'Kalsiyum karbonat suda çok az çözünür (yaklaşık 0,013 g/L); bu yüzden Ca²⁺ ve CO₃²⁻ karışınca hemen çöker.', sourceId: 'wp-en-calcium-carbonate' },
    { level: 'ileri', text: 'Katalaz enzimi, saniyede milyonlarca hidrojen peroksit molekülünü su ve oksijene bozabilir.', sourceId: 'wp-en-catalase' },
    { level: 'ileri', text: 'Suyun elektrolizi için gereken en küçük gerilim yaklaşık 1,23 V\'tur; uygulamada daha yüksek gerilim kullanılır.', sourceId: 'wp-en-electrolysis-of-water' },
  ],
};
