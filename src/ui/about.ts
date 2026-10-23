import { h } from '../core';
import type { UiContext } from './types';

export function renderAbout(ctx: UiContext): HTMLElement {
  const grades = new Map<string, string[]>();
  for (const k of ctx.catalog.data.kazanimlar) {
    const key = k.grade <= 8 ? 'temel' : 'ileri';
    grades.set(key, [...(grades.get(key) ?? []), k.id]);
  }
  const list = (key: string): string => (grades.get(key) ?? []).join(', ') || '—';
  return h(
    'div',
    { class: 'page-inner' },
    h('h2', {}, 'Hakkında'),
    h('p', {}, 'Bilim Atölyesi, ortaokul ve lise öğrencileri için hazırlanmış etkileşimli bir 3B fen öğrenme sitesidir. İlk modül hücre biyolojisidir: hayvan, bitki ve bakteri hücresini döndürebilir, ortadan kesebilir, organelleri tek tek inceleyebilirsin. Bütün metinler MEB kazanımlarına bağlanmış ve kaynakları gösterilmiştir.'),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'h-levels' },
      h('h3', { id: 'h-levels' }, 'Seviyeler'),
      h('p', {}, h('b', {}, 'Temel (5–8. sınıf): '), `Fen Bilimleri düzeyi; çekirdek kazanım 5. sınıfta (FB.5.3.1). Organeller yalnızca adları ve görevleriyle anlatılır; ayrıntılı yapı verilmez. Bağlı kazanımlar: ${list('temel')}.`),
      h('p', {}, h('b', {}, 'İleri (9–12. sınıf): '), `Biyoloji düzeyi; içerik 9. sınıf Biyoloji kazanımı BİY.9.2.1’e (hücrenin alt birimleri ve görevleri) bağlıdır ve sonraki sınıfların ön bilgisini de kullanır. Prokaryot ve ökaryot hücreler, organellerin yapısı ve ayrıntılı görevleri anlatılır. Bakteri hücresi yalnızca bu seviyede bulunur. Bağlı kazanımlar: ${list('ileri')}.`),
      h('p', {}, 'Seviyeyi sağdaki “Organel ayrıntıları” kartından değiştirebilirsin; model aynı kalır, yalnızca açıklamanın derinliği değişir.'),
    ),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'h-keys' },
      h('h3', { id: 'h-keys' }, 'Kullanım ve klavye'),
      h(
        'dl',
        { class: 'keys' },
        h('dt', {}, 'Sürükle'), h('dd', {}, 'Modeli döndürür (Ctrl + sürükle: kaydırır, tekerlek: yakınlaştırır).'),
        h('dt', {}, 'Tıkla'), h('dd', {}, 'Bir organeli seçer ve kamerayı ona odaklar; boş yere tıklamak seçimi kaldırır.'),
        h('dt', {}, 'Ok tuşları'), h('dd', {}, '3B alan odaktayken modeli döndürür.'),
        h('dt', {}, h('kbd', {}, '+'), ' ', h('kbd', {}, '-')), h('dd', {}, 'Yakınlaştırır ve uzaklaştırır.'),
        h('dt', {}, h('kbd', {}, 'R')), h('dd', {}, 'Görünümü sıfırlar.'),
        h('dt', {}, h('kbd', {}, 'Esc')), h('dd', {}, 'Seçimi kaldırır.'),
        h('dt', {}, 'Tab'), h('dd', {}, 'Bütün düğmelere ve listelere klavyeyle ulaşılır; odak halkası görünür.'),
      ),
    ),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'h-url' },
      h('h3', { id: 'h-url' }, 'Adres parametreleri'),
      h('p', {}, h('code', {}, '?cell=plant|animal|bacterium'), ' hücreyi, ', h('code', {}, 'level=temel|ileri'), ' seviyeyi, ', h('code', {}, 'quality=low|medium|high'), ' görüntü kalitesini seçer; ', h('code', {}, 'perf'), ' kare hızı bilgisini gösterir.'),
    ),
    h('p', { class: 'footer-note' }, '© gkaragoz and Contributors. PolyForm Noncommercial 1.0.0 lisansı ve ek şartlarıyla sunulur; yazılım bileşenleri THIRD_PARTY_NOTICES.md dosyasında listelenmiştir.'),
  );
}
