import type { TrackInfo } from '../moduleTypes';
import { chartRow } from './membrane-transport.charts';
import { ph } from './phase';

const id = 'difuzyon';

// Simple diffusion, 44 s. Default option 'orta': 36 molecules outside, 12 inside (48 in all).
export const difuzyonTrack: TrackInfo = {
  id,
  nameTr: 'Basit difüzyon',
  tagline: 'Moleküller çok olan yerden az olan yere yayılır',
  duration: 44,
  levels: ['temel', 'ileri'],
  notes: [
    'Moleküller görülebilsin diye büyütülmüş, hareketleri yavaşlatılmıştır; gerçek zar çok daha incedir ve moleküller çok daha hızlıdır.',
    'Sayılar küçük tutulmuştur (48 molekül). Geçişler rastgele olduğu için grafikte küçük dalgalanmalar olması normaldir.',
    'Seçeneklerle derişim farkını ve (İleri düzeyde) sıcaklığı değiştirip grafikteki net geçiş hızını karşılaştırabilirsin.',
  ],
  phases: [
    ph({
      id: 'dengesiz-baslangic',
      name: 'Dengesiz başlangıç',
      start: 0,
      end: 6,
      t: 'Hücre zarı içeriyi dışarıdan ayırır. Dışarıda çok, içeride az küçük molekül var; moleküller sürekli kıpırdar.',
      i: [
        'Zarın iki yanında derişim farkı var: dışarıda molekül çok, içeride az. Moleküller kinetik enerjileriyle sürekli rastgele hareket eder.',
        [
          'Derişim, birim hacimdeki molekül sayısıdır; iki ortam arasındaki fark derişim farkıdır (derişim gradyanı).',
          'Fosfolipit çift katman küçük ve yüksüz (apolar) molekülleri geçirir; büyük ve yüklü olanları geçirmez. Bu özelliğe seçici geçirgenlik denir.',
        ],
      ],
      chart: chartRow(id, 'dengesiz-baslangic'),
    }),
    ph({
      id: 'net-gecis',
      name: 'Net geçiş',
      start: 6,
      end: 18,
      t: 'Moleküller zardan tek başına geçer. Çok olan taraftan az olan tarafa geçen molekül sayısı daha fazladır.',
      i: [
        'Küçük ve yağda çözünen moleküller lipit çift katmanın arasından geçer. Her molekül rastgele hareket eder, ancak çok olan taraftan az olan tarafa geçen sayı daha fazladır (net akış).',
        [
          'Taşıyıcı protein ve enerji gerekmez: basit difüzyon pasif bir taşımadır.',
          'Net akış derişim farkıyla orantılıdır; fark büyükse net geçiş hızı da büyüktür.',
          'Büyük ve yüklü molekül (pembe) zardan geçemez, yüzeyden geri döner.',
        ],
      ],
      chart: chartRow(id, 'net-gecis'),
    }),
    ph({
      id: 'yavaslama',
      name: 'Yavaşlama',
      start: 18,
      end: 32,
      t: 'Aradaki fark azaldıkça zardan geçen net molekül sayısı da azalır.',
      i: [
        'İki taraftaki molekül sayıları birbirine yaklaştıkça iki yönlü geçişler eşitlenmeye başlar ve net geçiş hızı düşer.',
        [
          'Net geçiş hızı derişim farkıyla birlikte azalır; grafikteki net geçiş eğrisi sıfıra yaklaşır.',
          'Sıcaklık artarsa moleküller daha hızlı hareket eder ve difüzyon hızlanır; bunu seçenekten deneyebilirsin.',
        ],
      ],
      chart: chartRow(id, 'yavaslama'),
    }),
    ph({
      id: 'dinamik-denge',
      name: 'Dinamik denge',
      start: 32,
      end: 44,
      t: 'İki tarafta molekül sayısı yaklaşık eşit oldu. Moleküller hâlâ geçiyor ama içeri ve dışarı geçenlerin sayısı eşit.',
      i: [
        'Dinamik denge: geçişler sürer, ancak iki yöndeki geçiş sayısı eşit olduğundan net değişim yoktur.',
        [
          'Denge, hareketin durması değil iki yöndeki akışın eşitlenmesidir.',
          'Basit difüzyon sırasında hücre ATP harcamaz; hareket enerjisi moleküllerin kendi ısı enerjisidir.',
        ],
      ],
      chart: chartRow(id, 'dinamik-denge'),
    }),
  ],
};
