import { h, safeUrl } from '../core';
import type { Micrograph, Source, SourceKind } from '../data/types';
import { licenseLabel, micrographSrc, type UiContext } from './types';

const KIND_TITLES: Record<SourceKind, string> = {
  meb: 'MEB öğretim programları',
  wikipedia: 'Vikipedi / Wikipedia',
  openstax: 'OpenStax ders kitapları',
  commons: 'Wikimedia Commons dosyaları',
};
const KIND_ORDER: SourceKind[] = ['meb', 'wikipedia', 'openstax', 'commons'];

function extLink(url: string, text: string): HTMLElement {
  const href = safeUrl(url);
  return href ? h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text) : h('span', {}, text);
}

function isShareAlike(license: string): boolean {
  return /BY-SA/i.test(license);
}

function isAttribution(license: string): boolean {
  return /\bBY\b/i.test(license) && !/BY-SA/i.test(license);
}

/** The bibliography is generated entirely from the data: every Source, every micrograph, every kazanım. */
export function renderBibliography(ctx: UiContext): HTMLElement {
  const { catalog } = ctx;
  const usedBy = new Map<string, string[]>();
  for (const o of catalog.data.organelles) {
    for (const id of o.sourceIds) usedBy.set(id, [...(usedBy.get(id) ?? []), o.nameTr]);
  }
  for (const c of catalog.data.cells) {
    for (const id of c.sourceIds) usedBy.set(id, [...(usedBy.get(id) ?? []), c.nameTr]);
  }

  const sourceItem = (s: Source): HTMLElement => {
    const users = [...new Set(usedBy.get(s.id) ?? [])];
    return h(
      'li',
      { class: 'src-item', id: `src-${s.id}`, 'data-source-id': s.id },
      h('div', { class: 'title' }, extLink(s.url, s.title)),
      h('div', { class: 'meta' }, `${s.publisher} · Lisans: ${licenseLabel(s.license)} · Dil: ${s.lang === 'tr' ? 'Türkçe' : 'İngilizce'} · Erişim: ${s.accessed}`),
      users.length > 0 ? h('div', { class: 'meta' }, `Kullanıldığı yerler: ${users.join(', ')}`) : null,
    );
  };

  const groups = KIND_ORDER.map((kind) => ({ kind, items: catalog.data.sources.filter((s) => s.kind === kind) })).filter((g) => g.items.length > 0);
  const sections = groups.map((g) =>
    h('section', { class: 'card', 'aria-label': KIND_TITLES[g.kind] }, h('h3', {}, KIND_TITLES[g.kind]), h('ul', { class: 'src-list' }, ...g.items.map(sourceItem))),
  );

  const micrographItem = (m: Micrograph): HTMLElement => {
    const source = catalog.sourceById.get(m.sourceId);
    return h(
      'li',
      { class: 'src-item mg-item', 'data-micrograph-id': m.id },
      h('img', { src: micrographSrc(ctx.baseUrl, m.file), alt: m.titleTr, loading: 'lazy' }),
      h(
        'div',
        {},
        h('div', { class: 'title' }, extLink(m.pageUrl, m.titleTr)),
        h('div', { class: 'meta' }, `Yazar: ${m.author} · Lisans: ${licenseLabel(m.license)}`),
        source ? h('div', { class: 'meta' }, `Kaynak kaydı: ${source.title}`) : null,
        isShareAlike(m.license)
          ? h('div', { class: 'meta' }, 'Bu görsel aynı lisansla paylaşım (share-alike) şartıyla kullanılabilir; yazara atıf yapılmıştır.')
          : isAttribution(m.license)
            ? h('div', { class: 'meta' }, 'Bu görsel yazara atıf yapılarak kullanılabilir.')
            : null,
      ),
    );
  };

  const kazRows = catalog.data.kazanimlar.map((k) => {
    const s = catalog.sourceById.get(k.sourceId);
    return h(
      'tr',
      {},
      h('td', {}, h('b', {}, k.id)),
      h('td', {}, `${k.grade}. sınıf, ${k.subject === 'biyoloji' ? 'Biyoloji' : 'Fen Bilimleri'}`),
      h('td', {}, k.theme),
      h('td', {}, k.summaryTr),
      h('td', {}, s ? h('a', { href: `#/kaynakca/${encodeURIComponent(s.id)}` }, s.publisher) : k.sourceId),
    );
  });

  return h(
    'div',
    { class: 'page-inner' },
    h('h2', {}, 'Kaynakça'),
    h('p', {}, 'Bu sayfa sitedeki bütün kaynakları, görselleri ve kazanım kodlarını veriden otomatik üretir. Açıklamalar bu kaynaklardan öğrenilip kendi cümlelerimizle yazılmıştır; kaynaklardan metin kopyalanmamıştır.'),
    h(
      'div',
      { class: 'notice' },
      h('p', {}, h('b', {}, 'Lisans notları. '), 'Vikipedi içeriği CC BY-SA 4.0 ile, bazı Commons görselleri CC BY veya CC BY-SA ile lisanslıdır. CC BY: yazara atıf gerekir. CC BY-SA: atıf gerekir ve türev işler aynı lisansla paylaşılır.'),
      h('p', {}, 'Mikroskop görselleri yalnızca Wikimedia Commons’tan alınmıştır; her birinin yazarı ve lisansı aşağıda ve görselin büyütülmüş halinde gösterilir.'),
      h('p', {}, 'OpenStax Biology 2e (CC BY-NC-SA 4.0) yalnızca bilgi doğrulamak için kullanıldı; metin ve şekil kopyalanmadı. Erişim: ', extLink('https://openstax.org/books/biology-2e/pages/1-introduction', 'https://openstax.org/books/biology-2e/pages/1-introduction')),
    ),
    ...sections,
    h('section', { class: 'card', 'aria-label': 'Mikroskop görselleri' }, h('h3', {}, 'Mikroskop görselleri (mikrograflar)'), h('ul', { class: 'src-list' }, ...catalog.data.micrographs.map(micrographItem))),
    h(
      'section',
      { class: 'card', 'aria-label': 'Kazanımlar' },
      h('h3', {}, 'MEB kazanımları'),
      h('table', { class: 'kaz-table' }, h('thead', {}, h('tr', {}, ...['Kod', 'Sınıf / ders', 'Tema', 'Özet (kendi cümlemiz)', 'Kaynak'].map((t) => h('th', { scope: 'col' }, t)))), h('tbody', {}, ...kazRows)),
    ),
  );
}
