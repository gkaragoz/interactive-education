import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Enrichment tracks (İleri only): not detailed in the MEB programme text.
export const aksiyonTrack: TrackInfo = {
  id: 'aksiyon-potansiyeli',
  nameTr: 'Aksiyon potansiyeli',
  tagline: 'Sinir hücresinde elektriksel sinyal nasıl doğar?',
  duration: 36,
  levels: ['ileri'],
  notes: [
    'Bu parça MEB biyoloji programında ayrıntılı yer almaz; BİY.11.1.7 ve 11.1.8 ile ilişkili ek bilgi olarak sunulur.',
    'Voltaj değerleri tipik örnek değerlerdir (dinlenim −70 mV, eşik −55 mV, doruk +30 mV, en düşük −80 mV); hücreye göre değişir.',
    'Grafik, evre başlangıç değerleri arasında doğrusal çizilir; gerçek eğri düzgün bir sivri tepedir.',
  ],
  phases: [
    ph({
      id: 'dinlenim',
      name: 'Dinlenim potansiyeli',
      start: 0,
      end: 6,
      i: [
        'Dinlenen nöronda zarın iç yüzü dışına göre negatiftir (yaklaşık −70 mV).',
        [
          'Hücre içinde K⁺, dışında Na⁺ derişimi yüksektir.',
          'Dinlenimde zar K⁺ iyonuna Na⁺ iyonundan çok daha geçirgendir; potansiyeli en çok K⁺ dağılımı belirler.',
          'Sodyum-potasyum pompası bu derişim farkını sürdürür.',
        ],
      ],
      chart: { 'membran-potansiyeli': -70 },
    }),
    ph({
      id: 'esik',
      name: 'Eşik değere ulaşma',
      start: 6,
      end: 9,
      i: [
        'Yeterince güçlü bir uyaran zarı eşik değere (yaklaşık −55 mV) kadar depolarize eder.',
        [
          'Eşiğe ulaşılmazsa aksiyon potansiyeli oluşmaz.',
          'Eşiğe ulaşılırsa aksiyon potansiyeli her seferinde aynı büyüklükte oluşur (ya hep ya hiç).',
        ],
      ],
      chart: { 'membran-potansiyeli': -70 },
    }),
    ph({
      id: 'depolarizasyon',
      name: 'Depolarizasyon',
      start: 9,
      end: 15,
      i: [
        'Voltaj kapılı Na⁺ kanalları açılır; Na⁺ hücreye girer ve zarın içi pozitifleşir.',
        ['Zar potansiyeli yaklaşık +30 mV\'a kadar yükselir.', 'Na⁺ girişi, komşu kanalları da açarak olayı kendiliğinden hızlandırır.'],
      ],
      chart: { 'membran-potansiyeli': -55 },
    }),
    ph({
      id: 'repolarizasyon',
      name: 'Repolarizasyon',
      start: 15,
      end: 22,
      i: [
        'Na⁺ kanalları kapanır, K⁺ kanalları açılır; K⁺ hücre dışına çıkar ve zar yeniden negatifleşir.',
        ['Potasyum kanallarını engelleyen maddeler bu evreyi yavaşlatır, depolarizasyonu etkilemez.', 'Zar dinlenim değerine doğru geri döner.'],
      ],
      chart: { 'membran-potansiyeli': 30 },
    }),
    ph({
      id: 'hiperpolarizasyon',
      name: 'Hiperpolarizasyon',
      start: 22,
      end: 29,
      i: [
        'K⁺ çıkışı bir süre daha sürer; zar potansiyeli dinlenim değerinden daha negatif olur (yaklaşık −80 mV).',
        ['Bu kısa dönemde nöronun yeniden uyarılması zordur.', 'K⁺ kanalları kapandıkça zar dinlenime yaklaşır.'],
      ],
      chart: { 'membran-potansiyeli': -70 },
    }),
    ph({
      id: 'normale-donus',
      name: 'Dinlenime dönüş',
      start: 29,
      end: 34,
      i: [
        'İyonların kanallardan geçişi dengelenir ve zar dinlenim değerine döner.',
        ['Sodyum-potasyum pompası Na⁺\'ı dışarı, K⁺\'ı içeri taşıyarak derişim farkını yeniler.', 'Pompa her tur için 3 Na⁺ çıkarır, 2 K⁺ alır.'],
      ],
      chart: { 'membran-potansiyeli': -80 },
    }),
    ph({
      id: 'sonuc',
      name: 'Yeni uyarıya hazır',
      start: 34,
      end: 36,
      i: [
        'Nöron yeniden dinlenim potansiyelindedir ve yeni bir uyarıyı iletebilir.',
        ['Aksiyon potansiyeli akson boyunca komşu bölgeleri uyararak ilerler ve impuls olarak taşınır.'],
      ],
      chart: { 'membran-potansiyeli': -70 },
    }),
  ],
};

export const sinapsTrack: TrackInfo = {
  id: 'sinaps',
  nameTr: 'Sinaps',
  tagline: 'Sinyal, iki nöron arasındaki boşluğu nasıl geçer?',
  duration: 36,
  levels: ['ileri'],
  notes: [
    'Bu parça MEB biyoloji programında ayrıntılı yer almaz; BİY.11.1.7 ile ilişkili ek bilgi olarak sunulur.',
    'Kimyasal sinaps gösterilir; elektriksel sinapslar anılmaz. Sinaptik aralık ve vezikül boyutları orantısız büyütülmüştür.',
    'Nörotransmitter miktarı ve postsinaptik potansiyel şematik değerlerdir.',
  ],
  phases: [
    ph({
      id: 'impuls',
      name: 'İmpuls uca ulaşır',
      start: 0,
      end: 5,
      i: [
        'Aksiyon potansiyeli, presinaptik nöronun akson ucuna ulaşır.',
        ['Sinaps, bir nöronun başka bir nörona (ya da kas, bez hücresine) bilgi aktardığı bağlantı yeridir.', 'İki hücre arasında sinaptik aralık denen küçük bir boşluk vardır.'],
      ],
      chart: { 'nt-miktari': 0, 'postsinaptik-potansiyel': -70 },
    }),
    ph({
      id: 'kalsiyum',
      name: 'Kalsiyum girişi',
      start: 5,
      end: 10,
      i: [
        'Ucun zarındaki kalsiyum kanalları açılır ve Ca²⁺ iyonları akson ucuna girer.',
        ['Kalsiyum girişi, nörotransmitter salımını başlatan işarettir.', 'Kalsiyum yoksa vezikül kaynaşması gerçekleşmez.'],
      ],
      chart: { 'nt-miktari': 0, 'postsinaptik-potansiyel': -70 },
    }),
    ph({
      id: 'salim',
      name: 'Nörotransmitter salımı',
      start: 10,
      end: 16,
      i: [
        'Nörotransmitter dolu veziküller presinaptik zarla kaynaşır ve içeriklerini sinaptik aralığa boşaltır.',
        ['Veziküller, akson ucunda nörotransmitter taşıyan küçük zarlı keseciklerdir.', 'Salım, kaynaşma yoluyla (ekzositoz benzeri) gerçekleşir.'],
      ],
      chart: { 'nt-miktari': 0, 'postsinaptik-potansiyel': -70 },
    }),
    ph({
      id: 'difuzyon',
      name: 'Aralıkta yayılma',
      start: 16,
      end: 21,
      i: [
        'Nörotransmitter molekülleri sinaptik aralığa yayılır ve karşı tarafa doğru ilerler.',
        ['Aralık çok dar olduğu için yayılma hızlı olur.', 'Sinyal bu aşamada kimyasaldır: elektrik sinyali aralığı geçmez.'],
      ],
      chart: { 'nt-miktari': 100, 'postsinaptik-potansiyel': -70 },
    }),
    ph({
      id: 'baglanma',
      name: 'Reseptöre bağlanma',
      start: 21,
      end: 27,
      i: [
        'Nörotransmitter, postsinaptik zardaki reseptör proteinlerine bağlanır ve iyon kanalları açılır.',
        [
          'Uyarıcı sinapslarda pozitif iyonlar içeri girer ve postsinaptik zar depolarize olur.',
          'Yeterli depolarizasyon eşiğe ulaşırsa yeni nöron bir aksiyon potansiyeli başlatır.',
          'Sinyal yalnızca presinaptikten postsinaptiğe doğru geçer (tek yönlü).',
        ],
      ],
      chart: { 'nt-miktari': 70, 'postsinaptik-potansiyel': -70 },
    }),
    ph({
      id: 'temizleme',
      name: 'Sinyalin sona ermesi',
      start: 27,
      end: 33,
      i: [
        'Nörotransmitter sinaptik aralıktan uzaklaştırılır; böylece sinyal sona erer.',
        ['Uzaklaştırma, geri alım ya da enzimle yıkım yoluyla olabilir.', 'Postsinaptik potansiyel dinlenim değerine döner.'],
      ],
      chart: { 'nt-miktari': 40, 'postsinaptik-potansiyel': -60 },
    }),
    ph({
      id: 'sonuc',
      name: 'Yeni sinyale hazır',
      start: 33,
      end: 36,
      i: [
        'Sinaps yeniden dinlenme durumundadır ve yeni bir impuls için hazırdır.',
        ['Veziküller yeniden nörotransmitterle dolar.'],
      ],
      chart: { 'nt-miktari': 0, 'postsinaptik-potansiyel': -70 },
    }),
  ],
};
