import type { TrackInfo } from '../moduleTypes';
import { chartRow } from './membrane-transport.charts';
import { ph } from './phase';

const id = 'endositoz-ekzositoz';

// Endocytosis and exocytosis, 56 s. Three sites on one membrane: phagocytosis (left), pinocytosis (middle), exocytosis (right).
// Charts count "units of cargo": one particle, five droplets, six secretion molecules (12 in all).
export const endoTrack: TrackInfo = {
  id,
  nameTr: 'Endositoz ve ekzositoz',
  tagline: 'Büyük maddeler kesecikle içeri girer, dışarı çıkar',
  duration: 56,
  levels: ['temel', 'ileri'],
  notes: [
    'Hücre zarı yarı kesit olarak gösterilir; böylece zarın çukurlaşması ve kesecik içi görülebilir.',
    'Boyutlar gerçek oranlı değildir: zar çok daha ince, kesecikler ve parçacıklar çok daha küçüktür.',
    'Grafikler madde birimlerini sayar: bir parçacık, beş sıvı damlacığı ve altı salgı molekülü (toplam 12).',
    'Fagositozdan sonra veziküller lizozomla birleşip içerik sindirilir; bu adım gösterilmemiştir.',
  ],
  phases: [
    ph({
      id: 'ortam',
      name: 'Büyük maddeler',
      start: 0,
      end: 5,
      t: 'Büyük parçacıklar ve sıvı damlacıkları zardan geçemez. Hücre bunları kesecikler yardımıyla içeri alır ya da dışarı verir.',
      i: [
        'Büyük parçacıklar ve sıvı, zardan geçmek yerine zarın oluşturduğu keseciklerle (vezikül) taşınır: endositozla içeri, ekzositozla dışarı.',
        [
          'Bu taşıma türleri ATP gerektirir.',
          'Zar bu sırada şekil değiştirir; zarın bir kısmı kesecik oluşurken ayrılır, kaynaşırken geri katılır.',
        ],
      ],
      chart: chartRow(id, 'ortam'),
    }),
    ph({
      id: 'fagositoz',
      name: 'Fagositoz',
      start: 5,
      end: 19,
      t: 'Fagositoz: hücre zarı katı bir parçacığın çevresini sarar ve onu kesecik içinde içeri alır.',
      i: [
        'Fagositozda zar parçacığa tutunur, çevresini sarar ve kenarlar birleşince parçacığı içeren vezikül (fagozom) hücre içine kopar.',
        [
          'Akyuvarlar ve amipler bu yolla bakteri ve besin parçacığı alır.',
          'Vezikül sonra genelde lizozomla birleşir ve içeriği sindirilir.',
        ],
      ],
      chart: chartRow(id, 'fagositoz'),
    }),
    ph({
      id: 'pinositoz',
      name: 'Pinositoz',
      start: 19,
      end: 30,
      t: 'Pinositoz: zar küçük bir çukur açar ve dışarıdaki sıvı damlacıklarını içeri alır.',
      i: [
        'Pinositozda zar, sıvının ve çözünmüş maddelerin bulunduğu bölgeyi içe çökertir; oluşan küçük vezikül boyun kısmından kopar.',
        [
          'Fagositoz katı parçacık, pinositoz sıvı alımıdır; ikisi de endositozdur.',
          'Boyun daralıp kapanırken lipitler birbirine karışır ve zar bütünlüğü korunur.',
        ],
      ],
      chart: chartRow(id, 'pinositoz'),
    }),
    ph({
      id: 'ekzositoz',
      name: 'Ekzositoz',
      start: 30,
      end: 44,
      t: 'Ekzositoz: içi dolu kesecik zara gelir, zarla kaynaşır ve içindekini hücre dışına boşaltır.',
      i: [
        'Ekzositozda vezikül zara bağlanır, zarlar kaynaşır, açılan gözenekten içerik dışarı salınır ve vezikülün zarı hücre zarına katılır.',
        [
          'Hormonlar, sindirim enzimleri ve sinir hücrelerinde iletici maddeler bu yolla salınır.',
          'Vezikül zarı hücre zarının parçası olur: endositozda ayrılan zar böylece geri kazanılır.',
        ],
      ],
      chart: chartRow(id, 'ekzositoz'),
    }),
    ph({
      id: 'ozet',
      name: 'Özet',
      start: 44,
      end: 56,
      t: 'İki yolda da kesecikler kullanıldı: endositoz içeri alır, ekzositoz dışarı verir. İkisi de ATP harcar.',
      i: [
        'Endositozda zar içe çökerek vezikül oluşturur, ekzositozda vezikül zarla kaynaşır; ikisi de ATP harcar ve zar alanı dengede kalır.',
        [
          'Taşıma türlerini madde büyüklüğü, enerji gereksinimi ve yön bakımından ayırmak BİY.9.2.2’nin hedefidir.',
          'Karşılaştırma: difüzyon ve ozmoz enerjisizdir ve derişim yönündedir; aktif taşıma ATP ile derişime karşıdır; endositoz ve ekzositoz ATP ile büyük madde taşır.',
        ],
      ],
      chart: chartRow(id, 'ozet'),
    }),
  ],
};
