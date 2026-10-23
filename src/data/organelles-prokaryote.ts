import type { OrganelleInfo } from './types';

// Bacterial structures (İleri only; ADR/curriculum decision 3). Own wording, cross-checked against the cited Sources.
export const prokaryoteOrganelles: OrganelleInfo[] = [
  {
    id: 'nucleoid',
    nameTr: 'Nükleoit (çekirdeksi bölge)',
    nameEn: 'Nucleoid',
    tagline: 'Zarsız kalıtım bölgesi',
    sizeUm: 'Bakteri hücresinin (yaklaşık 0,1–5 µm) içinde sınırı belirsiz bir bölge',
    location: 'Bakteri sitoplazmasının orta kesimleri',
    visibleInLightMicroscope: false,
    levels: ['ileri'],
    text: {
      ileri: {
        summary: 'Nükleoit, bakterinin ana DNA\'sının toplandığı, zarla çevrili olmayan bölgedir.',
        function: 'Bakterinin yaşamsal bilgisini taşıyan kromozomu barındırır; çekirdek zarı olmadığı için DNA sitoplazmayla doğrudan temas eder.',
        details: [
          'Genellikle tek, halka biçimli bir kromozom içerir.',
          'Etrafında zar yoktur; bu, prokaryot ile ökaryot hücreyi ayıran temel farklardandır.',
          'DNA sıkıca katlanarak küçük bir hacme sığar.',
          'Ribozomlar nükleoite çok yakın çalışabilir, DNA okunurken protein yapımı başlayabilir.',
        ],
      },
    },
    funFact: 'Nükleoit "çekirdeğimsi" anlamına gelir; ama gerçek bir çekirdek gibi zarı yoktur.',
    kazanimIds: ['BİY.9.2.1'],
    sourceIds: ['meb-biyoloji-2026', 'wp-tr-nukleoit', 'wp-en-nucleoid', 'os-4-2'],
    color: '#6a5acd',
  },
  {
    id: 'plasmid',
    nameTr: 'Plazmit (plazmid)',
    nameEn: 'Plasmid',
    tagline: 'Ek bilgi taşıyan küçük DNA halkası',
    sizeUm: 'Ana kromozomdan çok daha küçük bir DNA halkası',
    location: 'Bakteri sitoplazmasında, nükleoitten ayrı',
    visibleInLightMicroscope: false,
    levels: ['ileri'],
    text: {
      ileri: {
        summary: 'Plazmit, bakteride ana kromozomdan bağımsız çoğalabilen küçük, halka biçimli DNA parçasıdır.',
        function: 'Bakteriye zorunlu olmayan ama işine yarayabilecek ek genler sağlar.',
        details: [
          'Bir bakteri hücresinde birden fazla plazmit bulunabilir.',
          'Taşıdığı genler arasında örneğin antibiyotiğe dayanıklılık genleri olabilir.',
          'Küçük ve kendi başına çoğalabildiği için plazmit, genetik mühendisliğinde gen taşıyıcısı olarak kullanılır.',
          'Plazmitler bakterilerde yaygındır; bazı ökaryotlarda da bulunabilir.',
        ],
      },
    },
    funFact: 'Laboratuvarlarda plazmitler, bir hücreye yeni gen taşımak için araç olarak kullanılır.',
    kazanimIds: ['BİY.9.2.1'],
    sourceIds: ['meb-biyoloji-2026', 'wp-tr-plazmid', 'wp-en-plasmid', 'wp-en-bacterial-cell-structure'],
    color: '#c0508a',
  },
  {
    id: 'flagellum',
    nameTr: 'Kamçı (flagellum)',
    nameEn: 'Flagellum',
    tagline: 'Bakterinin yüzme motoru',
    sizeUm: 'İp gibi uzun; kalınlığı yaklaşık 20 nm, boyu hücre boyunu aşabilir',
    location: 'Bazı bakterilerin hücre yüzeyinden dışarı uzanır',
    visibleInLightMicroscope: false,
    levels: ['ileri'],
    text: {
      ileri: {
        summary: 'Kamçı, bazı bakterilerin yüzeyinden çıkan, ince ve uzun, ip biçimli bir hareket organelidir.',
        function: 'Hücreyi bulunduğu ortamda ilerletir; dönen bir motor gibi çalışarak bakterinin yüzmesini sağlar.',
        details: [
          'Filament adı verilen uzun bölümü, flagellin adlı protein alt birimlerinden oluşan içi boş bir borudur.',
          'Hücre zarfına tutunan taban kısmı filamenti döndürür.',
          'Kamçıların sayısı ve yerleşimi bakteri türüne göre değişir; bazı bakterilerde hiç yoktur.',
          'Işık mikroskobunda çok ince olduğu için doğrudan görülemez, özel boyama gerekir.',
        ],
      },
    },
    funFact: 'Bakteri kamçısı kırbaç gibi çırpmaz; tabanındaki motor sayesinde pervane gibi döner.',
    kazanimIds: ['BİY.9.2.1'],
    sourceIds: ['meb-biyoloji-2026', 'wp-tr-kamci', 'wp-en-flagellum', 'wp-en-bacterial-cell-structure', 'os-4-2'],
    color: '#8c6d46',
  },
  {
    id: 'pilus',
    nameTr: 'Pilus',
    nameEn: 'Pilus',
    tagline: 'Bakterinin tutunma ve aktarma saçakları',
    sizeUm: 'Kalınlığı yaklaşık 3–10 nm, boyu birkaç µm\'ye ulaşabilir',
    location: 'Bakteri hücresinin dış yüzeyi',
    visibleInLightMicroscope: false,
    levels: ['ileri'],
    text: {
      ileri: {
        summary: 'Pilus, bakteri yüzeyinde bulunan saç benzeri ince protein uzantısıdır.',
        function: 'Bakterinin yüzeylere ve konak hücrelere tutunmasını sağlar.',
        details: [
          'Tutunmada görev alan kısa ve çok sayıdaki uzantılara genelde fimbria denir.',
          'Ek bilgi: eşeysel pilus denen tür, bakteriler arasındaki DNA aktarımında (konjugasyon) iki hücreyi birbirine bağlar.',
          'Bir bakteri üzerinde çok sayıda pilus bulunabilir.',
          'Işık mikroskobuyla seçilemeyecek kadar ince protein iplikleridir.',
        ],
      },
    },
    funFact: 'Pilus sözcüğü Latincede "saç" demektir; çoğulu "pili"dir.',
    kazanimIds: ['BİY.9.2.1'],
    sourceIds: ['meb-biyoloji-2026', 'wp-tr-pilus', 'wp-en-pilus', 'os-4-2'],
    color: '#a58b6f',
  },
];
