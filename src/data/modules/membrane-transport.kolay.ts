import type { TrackInfo } from '../moduleTypes';
import { chartRow } from './membrane-transport.charts';
import { ph } from './phase';

const id = 'kolaylastirilmis-difuzyon';

// Facilitated diffusion, 48 s. Charted molecule: glucose (carriers). 16 glucose at the start (12 outside, 4 inside); 16 more are added at 30 s.
export const kolayTrack: TrackInfo = {
  id,
  nameTr: 'Kolaylaştırılmış difüzyon',
  tagline: 'Kanal ve taşıyıcı proteinler yol açar',
  duration: 48,
  levels: ['temel', 'ileri'],
  notes: [
    'Grafikler yalnızca glikoz (pembe büyük toplar) için çizilir; iyonlar (küçük pembe toplar) kanallardan geçer.',
    'Kanallar animasyonda hep açık gösterilir; gerçekte birçoğu bir sinyalle açılıp kapanan kapılara sahiptir.',
    'Proteinlerin biçimi sadeleştirilmiştir; gerçek taşıyıcılar uzun amino asit zincirlerinin katlanmasıyla oluşur.',
  ],
  phases: [
    ph({
      id: 'proteinler',
      name: 'Zardaki proteinler',
      start: 0,
      end: 7,
      t: 'Zarda kanal ve taşıyıcı proteinler bulunur. Kanallar iyonlara, taşıyıcılar glikoz gibi büyük moleküllere yol açar.',
      i: [
        'Kolaylaştırılmış difüzyon, lipit kısımdan geçemeyen iyon ve büyük, kutuplu moleküllerin taşıyıcı proteinler aracılığıyla yaptığı pasif geçiştir.',
        [
          'Geçiş yine derişimi çok olan taraftan az olan tarafadır ve ATP gerektirmez.',
          'Proteinler seçicidir: her protein yalnızca belirli bir madde ya da madde grubunu geçirir.',
        ],
      ],
      chart: chartRow(id, 'proteinler'),
    }),
    ph({
      id: 'kanal',
      name: 'Kanal proteinler',
      start: 7,
      end: 19,
      t: 'İyonlar kanal proteinin dar yolundan akar. Yol yalnızca uygun iyona açıktır.',
      i: [
        'Kanal protein zarı baştan sona geçen bir gözenek oluşturur; yükü ve boyutu uygun iyonlar bu gözenekten derişim farkı yönünde akar.',
        [
          'Kanaldan geçiş taşıyıcıya göre çok daha hızlıdır; iyonlar sırayla geçer.',
          'Birçok kanal kapılıdır ve bir sinyal ya da gerilim değişimiyle açılıp kapanır.',
        ],
      ],
      chart: chartRow(id, 'kanal'),
    }),
    ph({
      id: 'tasiyici',
      name: 'Taşıyıcı proteinler',
      start: 19,
      end: 32,
      t: 'Taşıyıcı protein glikozu yakalar, şekil değiştirir ve öbür yüze bırakır.',
      i: [
        'Taşıyıcı protein molekülü bağlar, şekil değiştirerek bağlanma bölgesini önce bir yüze sonra öbür yüze açar ve molekülü bırakır.',
        [
          'Taşıyıcı yönü kendisi belirlemez: derişimin çok olduğu yüzde molekül daha sık bağlandığı için net geçiş o yöndedir.',
          'Her taşıyıcı bir seferde tek molekül taşır ve tur bitmeden yenisini alamaz.',
        ],
      ],
      chart: chartRow(id, 'tasiyici'),
    }),
    ph({
      id: 'doyma',
      name: 'Doyma',
      start: 32,
      end: 48,
      t: 'Glikoz çok artınca taşıyıcılar sürekli meşgul olur; geçiş hızı artık hızlanmaz.',
      i: [
        'Doyma: taşıyıcı sayısı sınırlı olduğundan derişim belli bir düzeyi aşınca tüm taşıyıcılar meşgul olur ve geçiş hızı en yüksek değerinde sabitlenir.',
        [
          'Basit difüzyonda hız derişim farkıyla sürekli artar; taşıyıcılı geçişte ise bir üst sınır (doyma) vardır.',
          'Grafikte net geçiş, derişim artsa bile belli bir düzeyde kalır.',
        ],
      ],
      chart: chartRow(id, 'doyma'),
    }),
  ],
};
