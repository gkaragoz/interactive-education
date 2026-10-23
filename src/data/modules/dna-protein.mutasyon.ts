import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Mutation track (İleri only, BİY.12.2.4). Programme: effects on life, repair of UV damage, positive and negative
// effects; "mutasyon çeşitlerine değinilmez", so the silent / missense / nonsense classification is labelled "Ek bilgi".
// Example gene 'melh': mRNA AUG GAA CUG CAU UGA gives Met-Glu-Leu-His; the default change is GAA to GUA (Glu to Val).
export const mutasyonTrack: TrackInfo = {
  id: 'mutasyon',
  nameTr: 'Mutasyon: DNA değişince',
  tagline: 'Bir baz değişirse protein nasıl etkilenir?',
  duration: 40,
  levels: ['ileri'],
  notes: [
    'Örnek olarak tek bir baz değişimi (nokta mutasyonu) gösterilir; gerçek mutasyonlar çok daha çeşitlidir.',
    'Programa göre mutasyon çeşitlerine girilmez; sessiz, yanlış anlamlı ve anlamsız mutasyon ayrımı yalnızca "Ek bilgi" olarak, seçenekle gösterilir.',
    'Grafik, varsayılan değişimi (GAA → GUA) izler; başka bir seçenekte değerleri sahne hesaplamalıdır.',
  ],
  phases: [
    ph({
      id: 'normal',
      name: 'Normal gen',
      start: 0,
      end: 6,
      i: [
        'Normal gende DNA\'daki üçlüler doğru amino asit dizisini verir (mRNA: AUG GAA CUG CAU UGA; protein: Met-Glu-Leu-His).',
        ['Dizi bozulmadığı sürece protein işlevini yapar.', 'Genetik kod her kodonu belirli bir amino asitle eşler.'],
      ],
      chart: { 'dogru-aa-orani': 100 },
    }),
    ph({
      id: 'hasar',
      name: 'DNA hasarı',
      start: 6,
      end: 14,
      i: [
        'Morötesi ışık, bazı kimyasallar ya da kopyalama hataları DNA\'da hasara yol açabilir.',
        [
          'UV ışığı yan yana duran timinlerin birbirine bağlanmasına (timin dimeri) neden olabilir.',
          'Mutasyona yol açan etmenlere mutajen denir.',
        ],
      ],
      chart: { 'dogru-aa-orani': 100 },
    }),
    ph({
      id: 'tamir',
      name: 'Onarım',
      start: 14,
      end: 22,
      i: [
        'Hücre DNA hasarının çoğunu onarır; her hasar kalıcı mutasyon olmaz.',
        [
          'UV hasarı gibi bazı hasarlar onarım sistemleriyle düzeltilir.',
          'Onarılamayan hasar DNA\'da kalıcı bir değişime dönüşebilir.',
        ],
      ],
      chart: { 'dogru-aa-orani': 100 },
    }),
    ph({
      id: 'kalici',
      name: 'Kalıcı değişim',
      start: 22,
      end: 30,
      i: [
        'Onarılmayan değişim replikasyonla yeni zincire kopyalanır ve kalıcı bir mutasyon olur.',
        [
          'Mutasyon, hücre bölününce yavru hücrelere aktarılır.',
          'Üreme hücrelerinde (gametlerde) olan mutasyonlar sonraki nesillere aktarılabilir.',
        ],
      ],
      chart: { 'dogru-aa-orani': 100 },
    }),
    ph({
      id: 'etki',
      name: 'Proteine etkisi',
      start: 30,
      end: 36,
      i: [
        'Değişen bir baz mRNA\'da bir kodonu değiştirir: GAA yerine GUA gelir ve protein bir amino asit farklı olur (Glu yerine Val).',
        [
          'Mutasyonun etkisi zararlı, yararlı ya da hiç olmayabilir.',
          'Orak hücreli anemide β-globin geninde tek bir baz değişir ve proteinde glutamik asit yerine valin yer alır.',
          'Ek bilgi (programın ötesinde): bu değişim "yanlış anlamlı"dır; amino asidi değiştirmeyenler "sessiz", erken dur kodonu oluşturanlar "anlamsız" adını alır.',
        ],
      ],
      chart: { 'dogru-aa-orani': 100 },
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç',
      start: 36,
      end: 40,
      i: [
        'Dört amino asidin üçü değişmeden kalmıştır; küçük bir değişim bile proteinin işlevini etkileyebilir.',
        ['Her mutasyon zararlı değildir; bazıları canlıya avantaj sağlayabilir.', 'Mutasyonlar kalıtsal çeşitliliğin ham maddesidir.'],
      ],
      chart: { 'dogru-aa-orani': 75 },
    }),
  ],
};
