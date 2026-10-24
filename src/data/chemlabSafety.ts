// Safety content of the chemistry lab as data (docs/research/kimya-lab.md section 4, src/chemlab/hazards.ts).
// The UI shows it at the safety check-in, in the "asla evde deneme" table and when the engine blocks an action.
// Texts are our own wording; every entry names a Source (src/data/sources*.ts). Lesson cards never give quantities
// or procedures for hazardous mixtures.

export interface SafetyRule {
  id: string;
  textTr: string;
  sourceId: string;
}

export interface PpeItem {
  id: string;
  nameTr: string;
  whenTr: string;
  sourceId: string;
}

/** gozetimle: with an adult or teacher present; hayir: not at home; asla: never, also not with supervision at home. */
export type HomeVerdict = 'gozetimle' | 'hayir' | 'asla';

export interface HomeAttempt {
  /** Engine experiment id (src/chemlab/experiments). */
  experimentId: string;
  verdict: HomeVerdict;
  textTr: string;
  reasonTr: string;
  sourceId: string;
}

export interface BlockedCombo {
  /** Same id as the engine's HazardBlock. */
  id: string;
  titleTr: string;
  lessonTr: string;
  sourceId: string;
}

export const safetyRules: SafetyRule[] = [
  { id: 'koruyucu', textTr: 'Deneye başlamadan gözlüğünü ve eldivenini tak; saçını topla.', sourceId: 'wp-en-ppe' },
  { id: 'tatma', textTr: 'Bilinmeyen bir maddeyi asla tatma ve koklama; asit ve bazlara elinle dokunma.', sourceId: 'meb-fen-2026' },
  { id: 'piktogram', textTr: 'Şişenin üzerindeki tehlike işaretlerini (piktogramları) oku; ne anlama geldiklerini bilmeden madde kullanma.', sourceId: 'wp-en-ghs' },
  { id: 'kucuk-miktar', textTr: 'Mümkün olduğunca az madde kullan; küçük ölçekli deneyler hem daha güvenli hem de daha az atık bırakır.', sourceId: 'meb-kimya-2026' },
  { id: 'atik', textTr: 'Atıkları ayrı kaplara koy: asit-baz, ağır metal ve katı atık aynı yere dökülmez.', sourceId: 'wp-en-laboratory-safety' },
  { id: 'hidrojen', textTr: 'Hidrojen çok kolay yanar; çıkan gazı alevden uzak tut ve havalandırılan yerde çalış.', sourceId: 'wp-en-hydrogen-safety' },
  { id: 'kapali-sise', textTr: 'Gaz çıkaran bir tepkimeyi kapalı şişede yapma: basınç artıp şişe patlayabilir.', sourceId: 'wp-en-laboratory-safety' },
  { id: 'isitma', textTr: 'Isıtırken kabın ağzını kimseye çevirme; sıcak kabı maşa ya da tüp tutacağıyla tut.', sourceId: 'wp-en-laboratory-safety' },
  { id: 'zehirli-tuz', textTr: 'Kurşun gibi zehirli tuzlar yalnızca öğretmen izniyle ve özel önlemlerle kullanılır; bu laboratuvarda hiç yoktur.', sourceId: 'wp-en-lead-iodide' },
  { id: 'ogretmen', textTr: 'Gerçek bir deneyi her zaman öğretmeninin izniyle ve gözetiminde yap.', sourceId: 'meb-kimya-2026' },
];

export const ppeItems: PpeItem[] = [
  { id: 'gozluk', nameTr: 'Koruyucu gözlük', whenTr: 'Her deneyde; sıçrama, parlama ya da gaz ihtimali varsa daha da önemli.', sourceId: 'wp-en-ppe' },
  { id: 'eldiven', nameTr: 'Eldiven', whenTr: 'Asit, baz ve tuz çözeltileriyle çalışırken.', sourceId: 'wp-en-ppe' },
  { id: 'onluk', nameTr: 'Laboratuvar önlüğü', whenTr: 'Giysiyi sıçramalardan korumak için her deneyde.', sourceId: 'wp-en-laboratory-safety' },
  { id: 'tutac', nameTr: 'Maşa ve tüp tutacağı', whenTr: 'Isıtılan kabı ve krozeyi tutarken.', sourceId: 'wp-en-laboratory-safety' },
  { id: 'havalandirma', nameTr: 'Havalandırma ya da çeker ocak', whenTr: 'Gaz çıkan tepkimelerde (örneğin hidrojen).', sourceId: 'wp-en-laboratory-safety' },
  { id: 'gozyikama', nameTr: 'Göz yıkama çeşmesi ve yangın battaniyesi', whenTr: 'Kaza hâlinde kullanılmak üzere yeri önceden öğrenilir.', sourceId: 'wp-en-laboratory-safety' },
];

/** One entry per engine experiment id; the test checks that none is missing. */
export const homeAttemptTable: HomeAttempt[] = [
  { experimentId: 'sirke-kabartma', verdict: 'gozetimle', textTr: 'Büyüklerin gözetiminde evde denenebilir; şişe asla sıkıca kapatılmaz.', reasonTr: 'Kapalı şişede biriken CO₂ basıncı şişeyi patlatabilir.', sourceId: 'wp-en-sodium-bicarbonate' },
  { experimentId: 'kirmizi-lahana', verdict: 'gozetimle', textTr: 'Yalnızca yenilebilir sıvılarla (limon, sirke, su, kabartma tozu) denenebilir.', reasonTr: 'Çamaşır suyu ve tuz ruhu gibi temizlik ürünleriyle ayıraç denemesi yapılmaz; bilinmeyen sıvı tadılmaz.', sourceId: 'meb-fen-2026' },
  { experimentId: 'notrallesme', verdict: 'hayir', textTr: 'Evde denenmez.', reasonTr: 'Hidroklorik asit ve sodyum hidroksit aşındırıcıdır; göze ve cilde zarar verir.', sourceId: 'wp-en-laboratory-safety' },
  { experimentId: 'cokelme-kalsiyum-karbonat', verdict: 'hayir', textTr: 'Evde denenmez.', reasonTr: 'Çözeltiler laboratuvar malzemesidir; çökelek atığı ayrı kapta toplanmalıdır. Kurşun tuzlarıyla çökelme deneyleri okulda bile özel önlem ister.', sourceId: 'wp-en-lead-iodide' },
  { experimentId: 'demir-bakir', verdict: 'hayir', textTr: 'Evde denenmez.', reasonTr: 'Bakır tuzları yutulursa zararlıdır, gözü yaralar ve suda yaşayanlar için zehirlidir; atıklar ağır metal kabına gider.', sourceId: 'wp-en-copper-sulfate' },
  { experimentId: 'magnezyum-asit', verdict: 'hayir', textTr: 'Evde denenmez.', reasonTr: 'Asit aşındırıcıdır, çıkan hidrojen çok kolay yanar ve magnezyum alev alabilir.', sourceId: 'wp-en-hydrogen-safety' },
  { experimentId: 'magnezyum-yanma', verdict: 'asla', textTr: 'Asla evde denenmez.', reasonTr: 'Yanan magnezyumun parlak ışığı gözü kalıcı olarak zedeleyebilir; alev sıcaklığı çok yüksektir.', sourceId: 'wp-en-magnesium' },
  { experimentId: 'cozunme-doygunluk', verdict: 'gozetimle', textTr: 'Şeker ve sofra tuzuyla evde denenebilir; potasyum nitratla denenmez.', reasonTr: 'Potasyum nitrat yükseltgendir; yanıcı maddelerden uzak tutulmalıdır. Sıcak suyla çalışırken haşlanma riski vardır.', sourceId: 'wp-en-potassium-nitrate' },
  { experimentId: 'hidrojen-peroksit-katalizor', verdict: 'gozetimle', textTr: 'Yalnızca eczanede satılan %3\'lük çözeltiyle ve büyüklerin gözetiminde; güçlü peroksitle asla.', reasonTr: 'Derişik hidrojen peroksit cildi yakar ve çok sıcak köpük verir; kapalı şişede yapılmaz.', sourceId: 'wp-en-elephants-toothpaste' },
  { experimentId: 'su-elektrolizi', verdict: 'hayir', textTr: 'Evde önerilmez.', reasonTr: 'Hidrojen ve oksijen karışımı patlayıcıdır, elektrikle çalışılır; sofra tuzu kullanılırsa klor gazı çıkabilir.', sourceId: 'wp-en-electrolysis-of-water' },
];

/** Combinations the engine refuses; each is a lesson card, never a recipe. */
export const blockedCombos: BlockedCombo[] = [
  { id: 'bleach-acid', titleTr: 'Çamaşır suyu asitle karışmaz', lessonTr: 'Çamaşır suyu sirke, tuz ruhu ya da kireç çözücü gibi asitlerle karışırsa zehirli klor gazı çıkar. Temizlik ürünlerini asla birbirine karıştırma.', sourceId: 'wp-en-sodium-hypochlorite' },
  { id: 'bleach-ammonia', titleTr: 'Çamaşır suyu amonyakla karışmaz', lessonTr: 'Çamaşır suyu ile amonyaklı temizleyiciler karışırsa zehirli kloraminler oluşur; solunması ciddi zarar verir.', sourceId: 'wp-en-sodium-hypochlorite' },
  { id: 'bleach-alcohol', titleTr: 'Çamaşır suyu alkolle karışmaz', lessonTr: 'Çamaşır suyu alkolle karışırsa kloroform gibi zararlı maddeler oluşabilir.', sourceId: 'wp-en-chloroform' },
  { id: 'peroxide-vinegar', titleTr: 'Hidrojen peroksit sirkeyle karışmaz', lessonTr: 'Peroksit ile sirke karışırsa gözü ve cildi tahriş eden, aşındırıcı peroksiasetik asit oluşur.', sourceId: 'wp-en-peracetic-acid' },
  { id: 'powder-oxidiser', titleTr: 'Metal tozu yükseltgenle karışmaz', lessonTr: 'İnce metal tozu ile yükseltgen bir tuzun karışımı kıvılcımla patlayabilir; bu karışım hiçbir yerde hazırlanmaz.', sourceId: 'wp-en-flash-powder' },
  { id: 'not-heatable', titleTr: 'Bu kap ısıtılmaz', lessonTr: 'Dereceli kaplar, büretler ve huniler ısıtılmaz; çatlar ve ölçüleri bozulur. Isıtma için beher, deney tüpü ya da kroze kullanılır.', sourceId: 'wp-en-laboratory-safety' },
  { id: 'heat-closed', titleTr: 'Kapalı kap ısıtılmaz', lessonTr: 'Kapalı kabı ısıtırsan içeride basınç artar ve kap patlayabilir; önce kapağı ya da balonu çıkar.', sourceId: 'wp-en-laboratory-safety' },
  { id: 'flame-flammable', titleTr: 'Yanıcı madde alevle ısıtılmaz', lessonTr: 'Etanol gibi yanıcı sıvıların ve hidrojenin buharları açık alevle tutuşur; ısıtma gerekirse sıcak tabla ve uzman gözetimi gerekir.', sourceId: 'wp-en-laboratory-safety' },
  { id: 'electrolysis-chloride', titleTr: 'Klorürlü çözelti elektroliz edilmez', lessonTr: 'İçinde klorür (tuz) olan bir çözeltiyi elektroliz etmek zehirli klor gazı üretebilir.', sourceId: 'wp-en-electrolysis-of-water' },
];
