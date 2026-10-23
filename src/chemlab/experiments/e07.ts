/**
 * E7 Magnezyum şeridin yanması (virtual only): 2 Mg + O2 -> 2 MgO, mass gain from the air.
 * Sources: https://en.wikipedia.org/wiki/Magnesium (burns with brilliant white light, about 3,100 degC),
 * https://en.wikipedia.org/wiki/Magnesium_oxide (dHf -601.6 kJ/mol), https://en.wikipedia.org/wiki/Combustion ,
 * https://science.cleapss.org.uk/Resource/SSS081-Group-II-metals.pdf (never look at burning magnesium);
 * programme: MEB KIM 10.1.3, 12.1.1, MEB FEN 8.5.2-8.5.3 (docs/research/kimya-lab.md section 2/E7).
 * Our arithmetic: 0.12 g Mg = 4.94 mmol -> 0.199 g MgO; O2 taken from the air 0.079 g (ash is 1.66 x heavier).
 * Photosensitivity: the engine only reports a flash value capped at 0.8; the renderer must rate-limit and dim it.
 */
import { stage, type ExperimentDef } from './types';

export const E07: ExperimentDef = {
  id: 'magnezyum-yanma',
  no: 7,
  titleTr: 'Magnezyum şeridin yanması (yalnızca sanal)',
  summaryTr: 'Kapaklı kroznede magnezyum şeridi ısıt, kapağı aralayınca parlak beyaz ışıkla yanışını izle. Yanmadan sonra külün kütlesi neden daha büyük?',
  levels: ['temel', 'ileri'],
  virtualOnly: true,
  safetyTr: ['Gerçekte bu alev gözü kör edebilir; asla doğrudan bakılmaz, koruyucu filtre kullanılır.', 'Sanal denemede parlama otomatik olarak sınırlandırılır ve filtre seçeneği vardır.'],
  homeTr: 'Asla evde denenmez.',
  kazanim: ['FB.8.5.2', 'FB.8.5.3', 'KİM.10.1.3', 'KİM.12.1.1'],
  sources: [
    { label: 'Magnesium (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Magnesium' },
    { label: 'Magnesium oxide (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Magnesium_oxide' },
    { label: 'CLEAPSS SSS081 Group II metals', url: 'https://science.cleapss.org.uk/Resource/SSS081-Group-II-metals.pdf' },
  ],
  bench: { vessels: [{ id: 'crucible', kind: 'crucible', labelTr: 'Krozne' }] },
  shelf: ['mg-ribbon'],
  equations: [
    { id: 'e7-full', titleTr: 'Tam denklem', reactants: { 's:mg': 2, 'g:o2': 1 }, products: { 's:mgo': 2 }, wordTr: 'magnezyum + oksijen -> magnezyum oksit' },
  ],
  steps: [
    { id: 'serit', textTr: 'Kroznenin içine 0,12 g magnezyum şerit koy.', hintTr: 'Maşayla tutulur, eldiven giyilir.', done: (v) => v.did('add', 'crucible') },
    { id: 'tart', textTr: 'Krozneyi teraziye koy ve ilk kütleyi not et.', hintTr: 'Yanmadan sonra karşılaştıracaksın.', done: (v) => v.onBalance() === 'crucible' },
    { id: 'tahmin', textTr: 'Tahmin et: yanmadan sonra külün kütlesi nasıl olur?', hintTr: 'Azalır, aynı kalır ya da artar.', done: (v) => v.onBalance() === 'crucible' },
    { id: 'isit', textTr: 'Kapak kapalıyken Bunsen beki ile ısıt.', hintTr: 'Mavi alev daha sıcaktır.', done: (v) => v.did('heat', 'crucible') },
    { id: 'kapak', textTr: 'Kapağı aralayınca havadaki oksijen girer: yanışı izle.', hintTr: 'Işık çok parlaktır; filtre açık.', done: (v) => v.observed('light', 'crucible') && v.did('lid', 'crucible') },
    { id: 'son', textTr: 'Isıtmayı kapat, bekle ve külü tart.', hintTr: 'Kütle arttı mı?', done: (v) => v.heating('crucible') === null && v.solidG('crucible', 'mgo') > 0.1 },
  ],
  expectations: [
    { id: 'flash', textTr: 'Parlak beyaz ışık gözlendi.', check: (v) => v.observed('light', 'crucible') },
    { id: 'ash', textTr: 'Kül (MgO) yaklaşık 0,20 g.', check: (v) => Math.abs(v.solidG('crucible', 'mgo') - 0.199) < 0.01 },
    { id: 'no-mg', textTr: 'Magnezyumun tamamı yandı.', check: (v) => v.solidG('crucible', 'mg') < 0.005 },
  ],
  measurables: [
    { id: 'mgo-g', labelTr: 'Oluşan magnezyum oksit', unit: 'g', read: (v) => v.solidG('crucible', 'mgo'), expected: 0.199, tolerance: 0.05 },
    { id: 'mass', labelTr: 'Terazi okuması', unit: 'g', read: (v) => v.mass('crucible') },
  ],
  solution: [
    { op: 'add', reagent: 'mg-ribbon', to: 'crucible', g: 0.12 },
    { op: 'place', vessel: 'crucible' },
    { op: 'weigh', vessel: 'crucible' },
    { op: 'heat', vessel: 'crucible', source: 'bunsen-blue' },
    { op: 'wait', s: 75 },
    { op: 'lid', vessel: 'crucible', open: true },
    { op: 'wait', s: 15 },
    { op: 'heat', vessel: 'crucible', source: null },
    { op: 'wait', s: 60 },
    { op: 'weigh', vessel: 'crucible' },
  ],
  particles: [
    {
      id: 'e7-particles', equationId: 'e7-full', titleTr: 'Mg atomları O atomlarına elektron verir, iyonik MgO oluşur', durationS: 15,
      species: [
        { id: 'mg', labelTr: 'Magnezyum atomu', formula: 'Mg', charge: 0, kind: 'atom' },
        { id: 'o2', labelTr: 'Oksijen molekülü', formula: 'O2', charge: 0, kind: 'molecule' },
        { id: 'o', labelTr: 'Oksijen atomu', formula: 'O', charge: 0, kind: 'atom' },
        { id: 'mg2', labelTr: 'Magnezyum iyonu', formula: 'Mg', charge: 2, kind: 'ion' },
        { id: 'e', labelTr: 'Elektron', formula: '', charge: -1, kind: 'electron' },
        { id: 'o2m', labelTr: 'Oksit iyonu', formula: 'O', charge: -2, kind: 'ion' },
        { id: 'mgo', labelTr: 'Magnezyum oksit (örgü)', formula: 'MgO', charge: 0, kind: 'lattice' },
      ],
      stages: [
        stage('basla', 0, 3, 'Şerit düzenli Mg atomlarından oluşur; havadan O2 molekülleri çarpar.', { mg: 6, o2: 3, o: 0, mg2: 0, e: 0, o2m: 0, mgo: 0 }, 'vibrate'),
        stage('isi', 3, 6, 'Isı titreşimi artırır; O2 molekülleri yüzeyde iki O atomuna ayrılır.', { mg: 6, o2: 0, o: 6, mg2: 0, e: 0, o2m: 0, mgo: 0 }, 'vibrate', { breaks: [{ species: 'o2', bond: 'O=O' }] }),
        stage('elektron', 6, 10, 'Her Mg atomu 2 elektron bırakır. Elektronlar O atomlarına geçer.', { mg: 0, o2: 0, o: 6, mg2: 6, e: 12, o2m: 0, mgo: 0 }, 'drift', { transfers: [{ kind: 'electron', from: 'mg', to: 'o', count: 12 }] }),
        stage('iyonlar', 10, 12, 'Mg2+ ve O2- iyonları oluştu.', { mg: 0, o2: 0, o: 0, mg2: 6, e: 0, o2m: 6, mgo: 0 }, 'attract', { transfers: [{ kind: 'electron', from: 'e', to: 'o', count: 12 }] }),
        stage('orgu', 12, 15, 'Karşıt yüklü iyonlar birbirini çekip MgO örgüsü yapar. Büyük enerji ışık ve ısı olarak çıkar.', { mg: 0, o2: 0, o: 0, mg2: 0, e: 0, o2m: 0, mgo: 6 }, 'static', { forms: [{ species: 'mgo', bond: 'ionic lattice' }] }),
      ],
    },
  ],
};
