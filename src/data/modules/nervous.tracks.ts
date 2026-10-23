import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Chart values are the state at the START of each phase; the scene may replace them with smooth curves (chartAt).
export const refleksTrack: TrackInfo = {
  id: 'refleks-yayi',
  nameTr: 'Refleks yayı',
  tagline: 'Sıcak bir cisme değen el nasıl hemen geri çekilir?',
  duration: 40,
  levels: ['temel', 'ileri'],
  notes: [
    'Örnek olarak ele sıcak bir cismin değmesi (geri çekme refleksi) kullanılır; programdaki diz kapağı refleksinde ara nöron bulunmaz, o refleks iki nöronludur.',
    'Beyne giden sinyal ve acı algısı yalnızca kısaca gösterilir; beyin kabuğunun ayrıntılarına girilmez.',
    'Süreler gerçek ölçekte değildir; gerçek refleksler çok daha kısa sürer.',
  ],
  phases: [
    ph({
      id: 'uyaran',
      name: 'Uyaran',
      start: 0,
      end: 5,
      t: 'Elimiz sıcak bir cisme değer; bu bir uyarandır.',
      i: [
        'Sıcak cisim, derideki ısı ve ağrı reseptörlerini uyaran bir uyarandır.',
        ['Refleks, bir uyarana verilen hızlı, istemsiz ve basit bir tepkidir.', 'Refleks yayı: reseptör, duyu nöronu, ara nöron, motor nöron ve efektörden oluşur.'],
      ],
      chart: { 'sinyal-ilerlemesi': 0 },
    }),
    ph({
      id: 'omurilige-gider',
      name: 'Uyarı omuriliğe gider',
      start: 5,
      end: 16,
      t: 'Deriden çıkan uyarı, sinirler yoluyla omuriliğe ulaşır.',
    }),
    ph({
      id: 'reseptor',
      name: 'Reseptör',
      start: 5,
      end: 9,
      i: [
        'Duyu reseptörü uyaranı algılar ve onu sinirsel sinyale (impuls) çevirir.',
        ['Reseptörün türü uyarana göre değişir; burada ısı ve ağrı reseptörleri uyarılır.', 'Sinyal, duyu nöronunun ucundan başlar.'],
      ],
      chart: { 'sinyal-ilerlemesi': 5 },
    }),
    ph({
      id: 'duyu-noronu',
      name: 'Duyu nöronu',
      start: 9,
      end: 16,
      i: [
        'Duyu nöronu, impulsu çevresel sinir sisteminden merkezî sinir sistemine (omuriliğe) taşır.',
        ['Duyu nöronlarının gövdeleri omuriliğin hemen yanında bulunur, uzantıları deriye uzanır.', 'Bilgi bu nöron boyunca elektriksel bir sinyal olarak ilerler.'],
      ],
      chart: { 'sinyal-ilerlemesi': 15 },
    }),
    ph({
      id: 'omurilik-karar',
      name: 'Omurilik yanıtı hazırlar',
      start: 16,
      end: 22,
      t: 'Omurilik, beyne danışmadan hızlıca yanıtı hazırlar.',
    }),
    ph({
      id: 'ara-noron',
      name: 'Ara nöron',
      start: 16,
      end: 22,
      i: [
        'Omurilikteki ara nöron, gelen bilgiyi değerlendirir ve uygun yanıtı oluşturur.',
        [
          'Ara nöronlar merkezî sinir sisteminde bulunur ve duyu nöronu ile motor nöronu birbirine bağlar.',
          'Karar omurilikte verildiği için sinyal beyne çıkıp dönmez; bu da refleksi çok hızlı yapar.',
        ],
      ],
      chart: { 'sinyal-ilerlemesi': 45 },
    }),
    ph({
      id: 'yanit-kasa-gider',
      name: 'Yanıt kasa gider',
      start: 22,
      end: 35,
      t: 'Yanıt sinirler yoluyla kasa ulaşır; kas kısalır ve el geri çekilir.',
    }),
    ph({
      id: 'motor-noron',
      name: 'Motor nöron',
      start: 22,
      end: 29,
      i: [
        'Motor nöron, yanıt impulsunu omurilikten efektöre (kas ya da bez) taşır.',
        ['Motor nöronun ucu kas lifleriyle sinaps yapar.', 'Bu nöron çevresel sinir sistemine ait uzantısıyla hedef organa ulaşır.'],
      ],
      chart: { 'sinyal-ilerlemesi': 65 },
    }),
    ph({
      id: 'efektor',
      name: 'Efektör',
      start: 29,
      end: 35,
      i: [
        'Efektör olan kol kası kasılır; el tehlikeli yüzeyden uzaklaşır.',
        ['Efektör bir kas ya da bez olabilir; burada iskelet kası kasılır.', 'Hareketin kendisi kasın kısalmasıdır.'],
      ],
      chart: { 'sinyal-ilerlemesi': 85 },
    }),
    ph({
      id: 'sonuc',
      name: 'Beyin de haberdar olur',
      start: 35,
      end: 40,
      t: 'Eli çektikten sonra beyin de olayı fark eder ve acıyı hissederiz.',
      i: [
        'Sinyal omurilik yoluyla beyne de ulaşır; acıyı fark etmemiz refleksten biraz sonra olur.',
        [
          'Refleks beyin devreye girmeden gerçekleştiği için vücudu korur.',
          'Diz kapağı refleksi iki nöronludur: duyu nöronu doğrudan motor nöronla sinaps yapar, ara nöron bulunmaz.',
        ],
      ],
      chart: { 'sinyal-ilerlemesi': 100 },
    }),
  ],
};
