import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Sarcomere model values (model micrometres, illustrative): at rest A 1.6 + I 0.8 = 2.4, H 0.4;
// fully contracted A 1.6 + I 0.4 = 2.0, H 0. Values are the state at the START of each phase.
const REST = { 'sarkomer-boyu': 2.4, 'a-bandi': 1.6, 'i-bandi': 0.8, 'h-bandi': 0.4 };
const FULL = { 'sarkomer-boyu': 2.0, 'a-bandi': 1.6, 'i-bandi': 0.4, 'h-bandi': 0 };

export const kasilmaTrack: TrackInfo = {
  id: 'kasilma',
  nameTr: 'Kas nasıl kısalır?',
  tagline: 'Kayan iplikler modeli: aktin ve miyozin filamentleri kayar',
  duration: 40,
  levels: ['temel', 'ileri'],
  notes: [
    'Bant ve sarkomer uzunlukları modelleme için seçilmiş örnek değerlerdir; gerçek değerler kasa ve kasılma durumuna göre değişir.',
    'Programa uygun olarak kasılmanın hücresel moleküler ayrıntılarına ve enerji kaynaklarına girilmez; İleri düzeydeki "Ek bilgi" maddeleri programın ötesindedir.',
    'Bir kas lifinde çok sayıda sarkomer art arda dizilidir; burada tek bir sarkomer ve onun büyütülmüş görünümü gösterilir.',
  ],
  phases: [
    ph({
      id: 'dinlenme',
      name: 'Gevşek kas',
      start: 0,
      end: 6,
      t: 'Kas gevşektir; uzun ve yumuşak durur.',
      i: [
        'Dinlenen sarkomerde ince (aktin) ve kalın (miyozin) filamentler kısmen üst üste biner.',
        [
          'Sarkomer, iki Z çizgisi arasında kalan kasılma birimidir.',
          'A bandı kalın filamentlerin uzunluğuna denk gelir ve koyu görünür.',
          'I bandı yalnızca ince filament bulunan açık bölgedir; ortasından Z çizgisi geçer.',
          'H bandı, A bandının ortasında yalnızca kalın filamentin bulunduğu açık bölgedir.',
        ],
      ],
      chart: REST,
    }),
    ph({
      id: 'kas-kisalir',
      name: 'Kas kısalır',
      start: 6,
      end: 28,
      t: 'Sinirden gelen uyarıyla kas kısalır (kasılır) ve bağlı olduğu kemiği kendine doğru çeker.',
    }),
    ph({
      id: 'uyari',
      name: 'Uyarı gelir',
      start: 6,
      end: 10,
      i: [
        'İskelet kası, sinir sisteminden gelen uyarıyla kasılmaya başlar.',
        [
          'Her kas lifine bir motor nöronun dalı ulaşır ve lifi kasılmaya yönlendirir.',
          'Kas lifi, içinde sarkomerlerin dizildiği ince miyofibrillerle doludur.',
        ],
      ],
      chart: REST,
    }),
    ph({
      id: 'kasilma',
      name: 'Kasılma',
      start: 10,
      end: 24,
      i: [
        'Aktin filamentleri, miyozin filamentlerinin üzerinden kayarak sarkomerin ortasına doğru ilerler; Z çizgileri birbirine yaklaşır.',
        [
          'Filamentlerin kendisi kısalmaz, yalnızca birbiri üzerinde kayar (kayan iplikler hipotezi).',
          'I bandı ve H bandı daralır; A bandının uzunluğu değişmez.',
          'Sarkomerler kısalınca kas lifi ve bütün kas kısalır.',
          'Ek bilgi (programın ötesinde): kaymanın sürmesi için kalsiyum iyonları ve ATP gerekir; miyozin başları aktini çeker.',
        ],
      ],
      chart: REST,
    }),
    ph({
      id: 'tam-kasilma',
      name: 'En kısa hâl',
      start: 24,
      end: 28,
      i: [
        'Kas en kısa hâlindedir: I bandı en dar düzeydedir ve H bandı kapanmıştır.',
        ['İnce filament uçları sarkomerin ortasında birbirine ulaşır; H bandı bu modelde görünmez olur.', 'Kasılı kas kemiği çeker ya da yükü tutar.'],
      ],
      chart: FULL,
    }),
    ph({
      id: 'gevseme',
      name: 'Gevşeme',
      start: 28,
      end: 38,
      t: 'Uyarı kesilince kas gevşer ve eski uzunluğuna döner.',
      i: [
        'Aktin filamentleri geri kayar; sarkomer eski uzunluğuna döner, I ve H bantları yeniden genişler.',
        [
          'Gevşeme sırasında filament boyları yine değişmez; yalnızca üst üste binme azalır.',
          'Gevşeyen kas kendiliğinden uzamaz: karşıt çalışan kas ya da yükün ağırlığı onu eski boyuna getirir.',
        ],
      ],
      chart: FULL,
    }),
    ph({
      id: 'sonuc',
      name: 'Başlangıç durumu',
      start: 38,
      end: 40,
      t: 'Kas yeniden gevşek hâldedir ve yeni bir kasılmaya hazırdır.',
      i: [
        'Bir kasılma-gevşeme döngüsünde filamentlerin boyu değişmez, sarkomerin boyu değişir.',
        ['A bandı döngü boyunca sabit kalır; I ve H bantları daralıp genişler.'],
      ],
      chart: REST,
    }),
  ],
};

export const eklemTrack: TrackInfo = {
  id: 'eklem-hareketi',
  nameTr: 'Kas çifti ve eklem hareketi',
  tagline: 'Biseps ve triseps dirseği nasıl büker ve açar?',
  duration: 36,
  levels: ['temel', 'ileri'],
  notes: [
    'Kolun yalnızca iki kası (biseps ve triseps) gösterilir; gerçekte birçok kas birlikte çalışır.',
    'Kas etkinliği ve dirsek açısı gösterim için şematik değerlerdir.',
    'Programa göre 5. sınıfta kasların çalışma ilkelerine girilmez; bu parça en çok 11. sınıf düzeyiyle (BİY.11.1.9) örtüşür.',
  ],
  phases: [
    ph({
      id: 'dinlenme',
      name: 'Kol rahat',
      start: 0,
      end: 4,
      t: 'Kol rahat durur; kollardaki kaslar gevşektir.',
      i: [
        'Dirsek eklemi, üst kol kemiği ile ön kol kemiklerini hareketli biçimde birleştirir.',
        ['Kaslar, kirişlerle (tendon) kemiklere bağlanır.', 'Öndeki kas biseps, arkadaki kas triseps; ikisi de şimdi gevşektir.'],
      ],
      chart: { 'dirsek-acisi': 160, biseps: 0, triseps: 0 },
    }),
    ph({
      id: 'bukulme',
      name: 'Kol bükülür',
      start: 4,
      end: 14,
      t: 'Öndeki kas kısalıp ön kolu yukarı çeker; kol bükülür. Arkadaki kas gevşer.',
      i: [
        'Biseps kasılır, triseps gevşer; dirsek eklemi bükülür.',
        [
          'Biseps kısalınca kirişi aracılığıyla ön kol kemiğini çeker.',
          'Kaslar yalnızca çekebilir, itemez; bu yüzden hareketin iki yönü için karşıt çalışan iki kas gerekir.',
          'Gevşeyen triseps, hareketi engellemeyecek şekilde uzar.',
        ],
      ],
      chart: { 'dirsek-acisi': 160, biseps: 0, triseps: 0 },
    }),
    ph({
      id: 'tutma',
      name: 'Kol bükülü kalır',
      start: 14,
      end: 19,
      t: 'Kol bükülü tutulurken öndeki kas kısalmış hâlde kalır.',
      i: [
        'Biseps kasılı kalır, triseps gevşek kalır.',
        ['Yük tutarken kas, boyu değişmese de gerilim üretmeyi sürdürür.', 'Bu sırada sinir sistemi kasları eş güdümlü olarak denetler.'],
      ],
      chart: { 'dirsek-acisi': 45, biseps: 80, triseps: 0 },
    }),
    ph({
      id: 'acilma',
      name: 'Kol açılır',
      start: 19,
      end: 29,
      t: 'Arkadaki kas kısalıp kolu açar; öndeki kas gevşer.',
      i: [
        'Triseps kasılır, biseps gevşer; dirsek eklemi açılır.',
        [
          'Biseps ve triseps zıt işlev görür: biri kolu büker, diğeri açar.',
          'İskelet, kas ve eklemler sinir sisteminin denetiminde eş güdümlü çalışır.',
          'Ek bilgi (programın ötesinde): bir kasın kuvveti, motor ünite denen birimlerin (bir motor nöron ve onun kas lifleri) devreye girmesiyle ayarlanır.',
        ],
      ],
      chart: { 'dirsek-acisi': 45, biseps: 80, triseps: 0 },
    }),
    ph({
      id: 'acik',
      name: 'Kol açık',
      start: 29,
      end: 33,
      t: 'Kol açıldı; kaslar yeniden gevşemeye başlar.',
      i: [
        'Eklem açılınca triseps gevşemeye başlar.',
        ['Kol yeniden bükülmek istenirse görev bisepse geçer.'],
      ],
      chart: { 'dirsek-acisi': 140, biseps: 0, triseps: 80 },
    }),
    ph({
      id: 'sonuc',
      name: 'Başlangıç durumu',
      start: 33,
      end: 36,
      t: 'Kol başlangıç konumuna döndü; her hareket için bir kas çifti iş birliği yaptı.',
      i: [
        'Hareket, birbirine karşıt çalışan bir kas çiftinin sırayla kasılıp gevşemesiyle tamamlandı.',
        ['Her iki kas da gevşek hâlde yeni harekete hazırdır.'],
      ],
      chart: { 'dirsek-acisi': 160, biseps: 0, triseps: 0 },
    }),
  ],
};
