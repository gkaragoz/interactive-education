import type { TrackInfo } from '../moduleTypes';
import { chartRow } from './membrane-transport.charts';
import { ph } from './phase';

const id = 'ozmoz';

// Osmosis, 54 s. Three cells side by side (hypotonic, isotonic, hypertonic); each one starts at its own moment
// (6 s, 20 s, 30 s). Charts follow the cell that is in focus: hypotonic until 20 s, isotonic until 30 s, then hypertonic.
export const ozmozTrack: TrackInfo = {
  id,
  nameTr: 'Ozmoz',
  tagline: 'Su, çözünen maddenin çok olduğu tarafa geçer',
  duration: 54,
  levels: ['temel', 'ileri'],
  notes: [
    'Mavi toplar su, turuncu toplar zarın geçiremediği çözünmüş maddedir. Sayılar küçük tutulmuş, hacim değişimi görünür olsun diye abartılmıştır.',
    'Hücre türünü seçenekten değiştirebilirsin: hayvan hücresi ya da hücre duvarlı bitki hücresi.',
    'Grafikler o anda incelenen hücreyi gösterir (önce sol, sonra orta, sonra sağ hücre); hücre değişince değerler de değişir.',
    'İleri düzeyde ve “Büyük fark” seçilince hipotonik ortamdaki hayvan hücresi patlar (lizis); Temel düzeyde ve diğer seçeneklerde şişme sınırlı tutulur.',
  ],
  phases: [
    ph({
      id: 'zar-ve-su',
      name: 'Seçici geçirgen zar',
      start: 0,
      end: 6,
      t: 'Üç hücre, üç farklı çözeltide. Zar suyu geçirir; çözünmüş maddeyi (turuncu toplar) geçirmez.',
      i: [
        'Ozmoz, suyun seçici geçirgen bir zardan geçişidir. Zar çözünen maddeyi tutar, su ise iki yöne geçebilir.',
        [
          'Sol ortam hipotonik (hücreden seyreltik), orta ortam izotonik (hücreyle eşit derişimli), sağ ortam hipertonik (hücreden derişik).',
          'Su, çözünen madde derişiminin az olduğu yerden çok olduğu yere doğru net olarak geçer.',
        ],
      ],
      chart: chartRow(id, 'zar-ve-su'),
    }),
    ph({
      id: 'hipotonik',
      name: 'Hipotonik ortam',
      start: 6,
      end: 20,
      t: 'Dışarısı hücreden daha seyreltik: su içeri girer. Hayvan hücresi şişer, bitki hücresi gerilir (turgor).',
      i: [
        'Hipotonik ortamda dışarıdaki çözünen derişimi hücre içinden düşüktür; net su girişi olur. Hayvan hücresi şişer ve sınırı aşarsa patlayabilir; bitkide hücre duvarı şişmeyi sınırlar ve turgor basıncı oluşur.',
        [
          'Hücre içindeki çözünen miktarı sabittir; su girdikçe içerisi seyrelir ve fark azaldığı için su girişi yavaşlar.',
          'Turgor basıncı bitki hücresinin sert ve dik kalmasını sağlar; bitkinin solması bu basıncın düşmesidir.',
        ],
      ],
      chart: chartRow(id, 'hipotonik'),
    }),
    ph({
      id: 'izotonik',
      name: 'İzotonik ortam',
      start: 20,
      end: 30,
      t: 'İki tarafın derişimi eşit: su iki yöne eşit sayıda geçer, hücre aynı boyutta kalır.',
      i: [
        'İzotonik ortamda net su geçişi yoktur; hücre hacmi değişmez, ancak iki yönde de su geçişi sürer.',
        [
          'Hayvan hücreleri için vücut sıvıları yaklaşık izotoniktir; damardan verilen serum fizyolojik de kan hücreleriyle izotonik olacak biçimde hazırlanır.',
          'Bitki hücresi izotonik ortamda gevşektir (turgor düşüktür), hücre zarı duvara yeni değmiştir.',
        ],
      ],
      chart: chartRow(id, 'izotonik'),
    }),
    ph({
      id: 'hipertonik',
      name: 'Hipertonik ortam',
      start: 30,
      end: 44,
      t: 'Dışarısı daha derişik: su dışarı çıkar. Hayvan hücresi büzülür, bitki hücresinde zar duvardan ayrılır (plazmoliz).',
      i: [
        'Hipertonik ortamda net su kaybı olur: hayvan hücresi büzülür, bitki hücresinde protoplast hücre duvarından ayrılır; bu olaya plazmoliz denir.',
        [
          'Plazmolizde hücre duvarı şeklini korur; zar ile duvar arasındaki boşluğu dış çözelti doldurur.',
          'Tuzlanan soğanın ve şekerle bekletilen meyvenin sulanması bu olayla açıklanır; ortam seyreltilirse plazmoliz geri dönebilir.',
        ],
      ],
      chart: chartRow(id, 'hipertonik'),
    }),
    ph({
      id: 'karsilastirma',
      name: 'Karşılaştırma',
      start: 44,
      end: 54,
      t: 'Su hep çözünen maddenin çok olduğu tarafa doğru gider; hücrenin boyutu buna göre değişir.',
      i: [
        'Üç ortamı karşılaştır: hacim hipotonikte artar, izotonikte sabit kalır, hipertonikte azalır. Net su akışı her zaman çözünen derişiminin yüksek olduğu tarafadır.',
        [
          'Ozmoz enerji gerektirmeyen (pasif) bir taşımadır; yönünü su ve çözünen derişimleri belirler.',
          'Bir soğan zarını ya da patates dilimini farklı tuz çözeltilerine koyup kütle değişimini ölçerek bunu deneyle de gösterebilirsin.',
        ],
      ],
      chart: chartRow(id, 'karsilastirma'),
    }),
  ],
};
