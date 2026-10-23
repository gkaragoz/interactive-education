import type { TrackInfo } from '../moduleTypes';
import { ph } from './phase';

// Gene expression tracks. Programme limit (BİY.12.2.3): promoter sequences (TATA, TAAT), transcription factors and
// eukaryotic mRNA processing are not covered; mRNA processing appears only as a labelled "Ek bilgi".
// All three example genes are 15 nucleotides (5 codons) and give a 4-residue peptide, so charts hold for every option.

export const transkripsiyonTrack: TrackInfo = {
  id: 'transkripsiyon',
  nameTr: 'Transkripsiyon',
  tagline: 'Gen kopyalanır: DNA\'dan mRNA\'ya',
  duration: 44,
  levels: ['temel', 'ileri'],
  notes: [
    'Her örnek gen 15 nükleotit uzunluğundadır; gerçek genler yüzlerce ila binlerce nükleotit uzunluğundadır.',
    'Programa göre promotör dizilerine, transkripsiyon faktörlerine ve ökaryotik mRNA işlenmesine girilmez.',
    'Temel düzeyde RNA polimeraz ve promotör gibi terimler kullanılmaz; yalnızca "genin RNA kopyası çıkarılır" anlatılır.',
  ],
  phases: [
    ph({
      id: 'gen',
      name: 'Gen',
      start: 0,
      end: 6,
      t: 'Hücre bir protein yapacağı zaman önce ilgili geni kopyalar.',
      i: [
        'Transkripsiyonda genin kalıp zinciri okunarak mRNA yapılır.',
        [
          'Her gen bir ürünün (protein ya da RNA) bilgisini taşır.',
          'Ökaryotlarda transkripsiyon çekirdekte, prokaryotlarda sitoplazmada gerçekleşir.',
        ],
      ],
      chart: { 'mrna-uzunlugu': 0 },
    }),
    ph({
      id: 'rna-kopyasi',
      name: 'RNA kopyası çıkarılır',
      start: 6,
      end: 32,
      t: 'Gen bölgesinde DNA açılır; zincirlerden biri örnek alınır ve karşısına RNA nükleotidleri dizilir. Böylece haberci RNA (mRNA) oluşur.',
    }),
    ph({
      id: 'baslama',
      name: 'Başlama',
      start: 6,
      end: 14,
      i: [
        'RNA polimeraz, genin başındaki promotör bölgesine bağlanır ve DNA o noktada açılır.',
        [
          'Promotör, RNA polimerazın bağlandığı ve transkripsiyonun başladığı bölgedir.',
          'Açılan bölgede yalnızca bir zincir (kalıp zincir) okunur.',
        ],
      ],
      chart: { 'mrna-uzunlugu': 0 },
    }),
    ph({
      id: 'uzama',
      name: 'Uzama',
      start: 14,
      end: 28,
      i: [
        'RNA polimeraz kalıp zincir boyunca ilerler ve baz eşleşmesine göre RNA nükleotitlerini ekler: A–U, T–A, G–C, C–G.',
        [
          'RNA\'da timin yerine urasil bulunur.',
          'RNA zinciri 5\'→3\' yönünde uzar.',
          'DNA, polimerazın arkasında yeniden kapanır.',
        ],
      ],
      chart: { 'mrna-uzunlugu': 3 },
    }),
    ph({
      id: 'sonlanma',
      name: 'Sonlanma',
      start: 28,
      end: 32,
      i: [
        'RNA polimeraz bitiş (terminatör) bölgesine gelince durur; mRNA ve polimeraz DNA\'dan ayrılır.',
        ['Bu noktada mRNA\'nın zinciri tamamlanmıştır.', 'DNA çift sarmalı eski hâline döner.'],
      ],
      chart: { 'mrna-uzunlugu': 15 },
    }),
    ph({
      id: 'sonuc',
      name: 'mRNA ribozoma gider',
      start: 32,
      end: 44,
      t: 'mRNA, genin bilgisini ribozoma götürür; DNA ise hücrede korunur.',
      i: [
        'mRNA tek zincirlidir ve genin geçici bir kopyasıdır; bilgiyi translasyona taşır.',
        [
          'Ökaryotlarda mRNA çekirdekten sitoplazmaya geçer; prokaryotlarda translasyon, transkripsiyon bitmeden başlayabilir.',
          'Ek bilgi (programın ötesinde): ökaryotlarda mRNA ribozoma gitmeden önce işlenir.',
        ],
      ],
      chart: { 'mrna-uzunlugu': 15 },
    }),
  ],
};

export const translasyonTrack: TrackInfo = {
  id: 'translasyon',
  nameTr: 'Translasyon',
  tagline: 'mRNA\'dan proteine: ribozom kodonları okur',
  duration: 56,
  levels: ['temel', 'ileri'],
  notes: [
    'Gösterimde tek bir ribozom ve dört amino asitlik kısa bir zincir kullanılır; gerçek proteinler yüzlerce amino asit uzunluğundadır.',
    'tRNA\'ya amino asidin yüklenmesi gösterilmez; ribozomun A, P, E bölgeleri yalnızca İleri düzeyde, sadeleştirilmiş olarak gösterilir.',
    'Kodon çevirisi standart genetik koda göre yapılır (bkz. kodon tablosu).',
  ],
  phases: [
    ph({
      id: 'mrna-ribozom',
      name: 'mRNA ribozomla buluşur',
      start: 0,
      end: 8,
      t: 'mRNA sitoplazmada bir ribozoma bağlanır.',
      i: [
        'mRNA, iki alt birimden (büyük ve küçük) oluşan ribozomla buluşur.',
        ['Ribozom, mRNA\'daki şifreyi okuyup protein yapan moleküler makinedir.', 'Ribozomlar sitoplazmada serbest ya da granüllü ER\'ye bağlı bulunur.'],
      ],
      chart: { 'polipeptit-uzunlugu': 0 },
    }),
    ph({
      id: 'protein-yapimi',
      name: 'Protein zinciri yapılır',
      start: 8,
      end: 48,
      t: 'Ribozom mRNA\'yı üçlü gruplar (kodon) hâlinde okur; her kodon bir amino asidi belirler. Amino asitler getirilip art arda bağlanarak protein zinciri oluşur.',
    }),
    ph({
      id: 'baslama',
      name: 'Başlama',
      start: 8,
      end: 16,
      i: [
        'Ribozom mRNA\'daki AUG başlangıç kodonunu bulur; metiyonin taşıyan başlatıcı tRNA buraya yerleşir.',
        [
          'AUG hem başlama işareti hem metiyonin kodonudur.',
          'tRNA\'nın antikodonu (UAC), AUG kodonuyla baz eşleşmesi yapar.',
          'Okuma çerçevesi AUG\'ye göre belirlenir.',
        ],
      ],
      chart: { 'polipeptit-uzunlugu': 0 },
    }),
    ph({
      id: 'uzama',
      name: 'Uzama',
      start: 16,
      end: 40,
      i: [
        'Her kodona antikodonu uyan tRNA gelir ve amino asidini bırakır; amino asitler peptit bağıyla bağlanır, ribozom bir kodon ilerler.',
        [
          'Kodon–antikodon eşleşmesi baz eşleşme kuralına dayanır.',
          'tRNA, bir ucunda antikodon, diğer ucunda amino asit taşıyan adaptör moleküldür.',
          'Peptit bağı, bir amino asidin karboksil ucu ile diğerinin amino ucu arasında kurulur.',
          'Genetik kodda 64 kodon, 20 amino asit olduğu için birden fazla kodon aynı amino asidi belirleyebilir.',
        ],
      ],
      chart: { 'polipeptit-uzunlugu': 1 },
    }),
    ph({
      id: 'sonlanma',
      name: 'Sonlanma',
      start: 40,
      end: 48,
      i: [
        'Ribozom bir dur kodonuna (UAA, UAG ya da UGA) ulaşınca zincir serbest kalır.',
        ['Dur kodonları amino asit belirlemez.', 'Ribozom alt birimleri ayrılır ve yeniden kullanılabilir.'],
      ],
      chart: { 'polipeptit-uzunlugu': 4 },
    }),
    ph({
      id: 'sonuc',
      name: 'Sonuç: protein',
      start: 48,
      end: 56,
      t: 'Amino asit zinciri katlanarak çalışan bir protein olur.',
      i: [
        'Polipeptit zinciri katlanarak üç boyutlu yapıya geçer; proteinin işlevi bu yapıya bağlıdır.',
        ['Aynı mRNA\'dan çok sayıda protein kopyası yapılabilir.', 'Zincirdeki amino asit sırası, genin baz dizisi tarafından belirlenmiştir.'],
      ],
      chart: { 'polipeptit-uzunlugu': 4 },
    }),
  ],
};
