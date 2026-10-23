import type { ModuleInfo } from '../../data/moduleTypes';

/**
 * Test module for the framework (dev builds and `?demo`): a chromosome-like capsule pair that spins, pulls apart and
 * settles. It exercises phases, labels, charts, checks, predict prompts and options. It is not learner content, so it
 * carries no Source or kazanım and is never listed on the home page.
 */
export const demoInfo: ModuleInfo = {
  id: 'cell', // replaced by the definition: the demo uses its own id
  nameTr: 'Deneme modülü',
  tagline: 'Çerçeve denemesi: dönen ve ayrılan kapsül çifti',
  introTr: 'Bu modül yalnızca oynatıcıyı, zaman çizelgesini, soruları ve grafikleri denemek için vardır.',
  levels: ['temel', 'ileri'],
  tracks: [
    {
      id: 'demo',
      nameTr: 'Ayrılma',
      tagline: 'Üç evreli deneme',
      duration: 12,
      levels: ['temel', 'ileri'],
      notes: ['Bu bir deneme sahnesidir; gerçek bir canlı yapıyı göstermez.'],
      phases: [
        { id: 'donme', nameTr: 'Dönme', start: 0, end: 4, levels: ['temel', 'ileri'], chartPoints: { ayrilma: 0, sayi: 2 }, text: { temel: { summary: 'Çift birlikte döner.', details: [] }, ileri: { summary: 'Çift birlikte döner; açısal hız sabittir.', details: ['Dönme eksen etrafındadır.'] } } },
        { id: 'ayrilma', nameTr: 'Ayrılma', start: 4, end: 8, levels: ['temel', 'ileri'], chartPoints: { ayrilma: 0, sayi: 2 }, text: { temel: { summary: 'İkisi birbirinden uzaklaşır.', details: [] }, ileri: { summary: 'İkisi zıt yönlere çekilir.', details: ['Uzaklık zamanla düzgün artar.'] } } },
        { id: 'durulma', nameTr: 'Durulma', start: 8, end: 12, levels: ['ileri'], chartPoints: { ayrilma: 1, sayi: 2 }, text: { ileri: { summary: 'Hareket yavaşlayıp durur.', details: ['Yalnızca İleri seviyede gösterilir.'] } } },
      ],
    },
    {
      id: 'ek',
      nameTr: 'Ek (yalnızca İleri)',
      tagline: 'Yalnızca İleri seviyede görünen ikinci animasyon',
      duration: 12,
      levels: ['ileri'],
      notes: [],
      phases: [{ id: 'tek', nameTr: 'Tek evre', start: 0, end: 12, levels: ['ileri'], chartPoints: { ayrilma: 0, sayi: 2 }, text: { ileri: { summary: 'Tek evreli ek animasyon.', details: [] } } }],
    },
  ],
  charts: [
    { id: 'ayrilma', labelTr: 'Ayrılma', unitTr: 'birim', color: '#7b5aa6', min: 0, max: 1 },
    { id: 'sayi', labelTr: 'Parça sayısı', unitTr: 'adet', color: '#3f6b3a', min: 0, max: 4 },
  ],
  checks: [
    { id: 'demo-1', trackId: 'demo', atTime: 3, levels: ['temel', 'ileri'], kind: 'which-phase', promptTr: 'Şu an hangi evredeyiz?', options: ['Dönme', 'Ayrılma', 'Durulma'], correctIndex: 0, explanationTr: 'Çift henüz ayrılmadı, birlikte dönüyor.' },
    { id: 'demo-2', trackId: 'demo', atTime: 7, levels: ['ileri'], kind: 'what-next', promptTr: 'Sırada ne olacak?', options: ['Durulma', 'Dönme', 'Hiçbiri'], correctIndex: 0, explanationTr: 'Ayrılmadan sonra hareket yavaşlar.' },
  ],
  predicts: [{ trackId: 'demo', atTime: 5, levels: ['temel', 'ileri'], promptTr: 'Sence kapsüller sonra ne yapacak?', answerTr: 'Birbirinden daha da uzaklaşacaklar.' }],
  options: [{ id: 'sayi', labelTr: 'Kapsül sayısı', choices: [{ id: '2', labelTr: 'İki' }, { id: '4', labelTr: 'Dört', levels: ['ileri'] }], defaultChoice: '2' }],
  kazanimIds: [],
  sourceIds: [],
  simplifications: ['Gerçek bir yapı değil, denemedir.'],
  glossary: [{ termTr: 'Evre', definitionTr: 'Bir sürecin ayırt edilebilen aşaması.' }],
  funFacts: [],
};
