import type { TrackInfo } from '../moduleTypes';
import { chartRow } from './membrane-transport.charts';
import { ph } from './phase';

const id = 'aktif-tasima';

// Active transport, 46 s: two Na+/K+ pumps. Pump A starts cycles at 7 s and 20 s, pump B at 14 s and 27 s (13 s per cycle).
// Charted ion: Na+ (14 inside, 34 outside at the start). Each cycle: 3 Na+ out, 2 K+ in, one ATP.
export const aktifTrack: TrackInfo = {
  id,
  nameTr: 'Aktif taşıma',
  tagline: 'ATP enerjisiyle, derişime karşı',
  duration: 46,
  levels: ['temel', 'ileri'],
  notes: [
    'Grafikler Na⁺ iyonları içindir (hücre içi ve dışı sayısı ile harcanan ATP).',
    'Gösterimde iki pompa vardır ve her biri tur başına bir ATP harcar; gerçek hücrede zarda çok sayıda pompa bulunur ve iyonlar sızıntı yoluyla da geri döner (gösterilmemiştir).',
    'Tur süreleri gösterim için yavaşlatılmıştır; gerçekte bir pompa saniyede birkaç tur yapar.',
  ],
  phases: [
    ph({
      id: 'derisime-karsi',
      name: 'Derişime karşı',
      start: 0,
      end: 7,
      t: 'Dışarıda Na⁺ (sodyum), içeride K⁺ (potasyum) çok. Hücre bu farkı korumak için pompaya ve ATP’ye ihtiyaç duyar.',
      i: [
        'Hücre dışında Na⁺ derişimi içinden yüksek, hücre içinde K⁺ derişimi dışından yüksektir. Bu fark, iyonları derişim yönüne karşı taşıyan Na⁺/K⁺ pompasıyla korunur.',
        [
          'Difüzyon bu farkı yok etmeye çalışır (Na⁺ içeri, K⁺ dışarı); pompa tersini yapar.',
          'Aktif taşıma ATP enerjisi kullanır; pompa, ATP’yi parçalayarak şekil değiştiren bir taşıyıcı proteindir.',
        ],
      ],
      chart: chartRow(id, 'derisime-karsi'),
    }),
    ph({
      id: 'na-ve-atp',
      name: 'Na⁺ ve ATP bağlanır',
      start: 7,
      end: 11.2,
      t: 'Pompa içerideki 3 Na⁺ iyonunu bağlar. ATP gelir ve parçalanarak pompaya enerji verir.',
      i: [
        'İçe açık pompa 3 Na⁺ bağlar; ATP bağlanıp ADP ile fosfata parçalanınca fosfat pompaya geçer (fosforilasyon).',
        [
          'ATP → ADP + P: açığa çıkan enerji pompanın şekil değiştirmesini sağlar.',
          'Fosfat pompaya geçici olarak bağlı kalır; ADP pompadan ayrılır.',
        ],
      ],
      chart: chartRow(id, 'na-ve-atp'),
    }),
    ph({
      id: 'sekil-degisimi',
      name: 'Şekil değişimi, Na⁺ dışarı',
      start: 11.2,
      end: 14,
      t: 'Pompa şekil değiştirir ve 3 Na⁺ iyonunu hücre dışına bırakır.',
      i: [
        'Fosforillenmiş pompa dışa açık duruma geçer; Na⁺ bağlanma yerleri zayıflar ve 3 Na⁺ dışarı salınır. Na⁺ derişimin zaten yüksek olduğu tarafa taşınmış olur.',
        ['Bu adım derişime karşıdır, bu yüzden enerji ister.', 'Pompanın şekil değiştirmesi iyonları zardan geçiren asıl harekettir.'],
      ],
      chart: chartRow(id, 'sekil-degisimi'),
    }),
    ph({
      id: 'k-alimi',
      name: 'K⁺ alımı',
      start: 14,
      end: 20,
      t: 'Dışarıdan 2 K⁺ iyonu bağlanır, fosfat ayrılır; pompa eski şekline döner ve K⁺ iyonlarını içeri bırakır.',
      i: [
        'Dışa açık pompa 2 K⁺ bağlar; fosfatın ayrılmasıyla içe açık hâline döner ve K⁺ iyonlarını içeri bırakır.',
        [
          'K⁺ da derişimin yüksek olduğu tarafa, yani içeri taşınır: iki iyon da derişime karşı taşınır.',
          'Bir turda 3 Na⁺ dışarı, 2 K⁺ içeri gider; bu yüzden zarın iki yanında elektrik yükü farkı da oluşur.',
        ],
      ],
      chart: chartRow(id, 'k-alimi'),
    }),
    ph({
      id: 'dongu',
      name: 'Döngü sürer',
      start: 20,
      end: 34,
      t: 'Pompa bu turu tekrar tekrar yapar; Na⁺ dışarıda, K⁺ içeride birikir.',
      i: [
        'Pompalar döngüyü sürdürür; her turda bir ATP harcanır ve derişim farkı büyür (grafik).',
        ['Her pompa kendi hızıyla çalışır; turlar birbirinden bağımsızdır.', 'Harcanan ATP sayısı, taşınan iyon miktarıyla doğru orantılıdır.'],
      ],
      chart: chartRow(id, 'dongu'),
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç',
      start: 34,
      end: 46,
      t: 'Fark büyüdü; bunun bedeli harcanan ATP’dir. Aktif taşıma her zaman enerji ister.',
      i: [
        'Pompa derişim farkını artırdı: Na⁺ dışarıda, K⁺ içeride daha çok. Bu fark sinir iletimi ve hücre hacminin dengesi için kullanılır.',
        [
          'Pasif taşımalar (difüzyon, ozmoz) farkı azaltır; aktif taşıma farkı oluşturur ve korur.',
          'Gerçek hücrede iyonlar zardan sızıntı yoluyla da geri döner; pompa bu sızıntıyı sürekli dengeler (animasyonda gösterilmemiştir).',
        ],
      ],
      chart: chartRow(id, 'sonuc'),
    }),
  ],
};
