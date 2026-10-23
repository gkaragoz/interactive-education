import { h, safeUrl, type AppState } from '../core';
import type { CellTypeId, Micrograph } from '../data/types';
import { cellGlyph } from './icons';
import { licenseLabel, micrographSrc, type Component, type UiContext } from './types';

const MAX_TILES = 4;
const KIND_LABEL: Record<Micrograph['kind'], string> = {
  light: 'Işık mikroskobu',
  stained: 'Boyalı preparat',
  em: 'Elektron mikroskobu',
};

export function createMicroscopePanel(ctx: UiContext): Component {
  const { catalog } = ctx;
  const row = h('div', { class: 'micro-row' });
  const image = h('img', { alt: '' });
  const caption = h('p', { style: 'font-weight:700;font-size:1.2rem' });
  const credit = h('p');
  const counter = h('span', { class: 'gallery-count', 'aria-live': 'polite' });
  const link = h('a', { target: '_blank', rel: 'noopener noreferrer' }, 'Wikimedia Commons sayfası');
  const prevBtn = h('button', { type: 'button', 'aria-label': 'Önceki görsel' }, '‹ Önceki');
  const nextBtn = h('button', { type: 'button', 'aria-label': 'Sonraki görsel' }, 'Sonraki ›');
  const closeBtn = h('button', { type: 'button' }, 'Kapat');
  const nav = h('div', { class: 'gallery-nav' }, prevBtn, counter, nextBtn);
  const dialog = h('dialog', { class: 'lightbox', 'aria-label': 'Mikrograf' }, image, caption, credit, h('p', {}, link), nav, closeBtn);
  let gallery: Micrograph[] = [];
  let at = 0;

  const show = (index: number): void => {
    if (gallery.length === 0) return;
    at = (index + gallery.length) % gallery.length;
    const m = gallery[at] as Micrograph;
    image.src = micrographSrc(ctx.baseUrl, m.file);
    image.alt = m.titleTr;
    // Titles that already name the technique ("... (Elektron mikroskobu)") are not suffixed a second time.
    caption.textContent = /mikroskop/i.test(m.titleTr) ? m.titleTr : `${m.titleTr} (${KIND_LABEL[m.kind]})`;
    credit.textContent = `Yazar: ${m.author}. Lisans: ${licenseLabel(m.license)}.`;
    const href = safeUrl(m.pageUrl);
    if (href) link.setAttribute('href', href);
    else link.removeAttribute('href');
    counter.textContent = `${at + 1} / ${gallery.length}`;
    nav.hidden = gallery.length < 2;
  };
  const open = (list: Micrograph[], index: number): void => {
    gallery = list;
    show(index);
    if (!dialog.open) dialog.showModal();
  };
  prevBtn.addEventListener('click', () => show(at - 1));
  nextBtn.addEventListener('click', () => show(at + 1));
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') show(at - 1);
    if (ev.key === 'ArrowRight') show(at + 1);
  });

  const el = h('section', { class: 'card', 'aria-labelledby': 'h-micro' }, h('h2', { class: 'card-title', id: 'h-micro' }, 'Mikroskop görünümü'), row, dialog);
  let builtFor = '';
  return {
    el,
    update(state: AppState): void {
      const key = `${state.cellId}:${state.selectedId ?? ''}`;
      if (key === builtFor) return;
      builtFor = key;
      const all = catalog.micrographsOf(catalog.cell(state.cellId));
      // Images of the selected organelle come first; the rest of the cell's images follow.
      const mine = all.filter((m) => m.organelleId && m.organelleId === state.selectedId);
      const ordered = [...mine, ...all.filter((m) => !mine.includes(m))];
      // Up to four tiles; with more images the fourth tile is "+N" and opens the whole set.
      const shown = ordered.length > MAX_TILES ? ordered.slice(0, MAX_TILES - 1) : ordered;
      const tiles = shown.map((m, i) =>
        h(
          'button',
          { class: 'micro-btn', type: 'button', onclick: () => open(ordered, i), title: `${m.titleTr}, ${m.author}, ${licenseLabel(m.license)}` },
          h('img', { src: micrographSrc(ctx.baseUrl, m.file), alt: m.titleTr, loading: 'lazy' }),
          h('span', {}, KIND_LABEL[m.kind]),
        ),
      );
      if (ordered.length > MAX_TILES) {
        const more = ordered.length - shown.length;
        tiles.push(h('button', { class: 'micro-btn micro-more', type: 'button', onclick: () => open(ordered, shown.length), 'aria-label': `${more} görsel daha, hepsini göster` }, h('strong', {}, `+${more}`), h('span', {}, 'Hepsini gör')));
      }
      row.replaceChildren(...(tiles.length === 0 ? [h('p', { class: 'empty-note' }, 'Bu hücre için mikrograf yok.')] : tiles));
    },
  };
}

export function createComparePanel(ctx: UiContext): Component {
  const { catalog, actions } = ctx;
  const left = h('div', { class: 'compare-cell' });
  const select = h('select', { 'aria-label': 'Karşılaştırılacak hücre' });
  select.addEventListener('change', () => actions.setCompareCell(select.value as CellTypeId));
  const right = h('div', { class: 'compare-cell' }, select);
  const toggle = h('button', { class: 'primary-btn', type: 'button', 'aria-pressed': 'false', onclick: () => actions.setCompare(!toggle.matches('[aria-pressed="true"]')) }, 'Karşılaştırma görünümünü aç');
  const legend = h('div', { class: 'compare-legend', 'aria-live': 'polite' });
  const el = h('section', { class: 'card', 'aria-labelledby': 'h-compare' }, h('h2', { class: 'card-title', id: 'h-compare' }, 'Hücreleri karşılaştır'), h('div', { class: 'compare-body' }, left, h('span', { class: 'vs', 'aria-hidden': 'true' }, 'VS'), right), toggle, legend);
  let builtFor = '';
  return {
    el,
    update(state: AppState): void {
      const key = `${state.cellId}:${state.compareCellId}:${state.compareOn}`;
      toggle.setAttribute('aria-pressed', String(state.compareOn));
      toggle.textContent = state.compareOn ? 'Karşılaştırmayı kapat' : 'Karşılaştırma görünümünü aç';
      if (key === builtFor) return;
      builtFor = key;
      const cell = catalog.cell(state.cellId);
      left.replaceChildren(cellGlyph(cell.id), h('span', {}, h('b', {}, cell.nameTr), h('br'), h('small', {}, '(şu an)')));
      select.replaceChildren(
        ...catalog.data.cells.filter((c) => c.id !== state.cellId).map((c) => h('option', { value: c.id, selected: c.id === state.compareCellId }, c.nameTr)),
      );
      select.value = state.compareCellId;
      const other = catalog.cell(state.compareCellId);
      const diff = catalog.compare(cell, other);
      const names = (ids: string[]): string => ids.map((id) => catalog.organelleById.get(id)?.nameTr ?? id).join(', ') || 'yok';
      legend.replaceChildren(
        h('span', {}, h('b', {}, 'Ortak: '), names(diff.shared)),
        h('span', {}, h('b', {}, `Yalnızca ${cell.nameTr}: `), names(diff.onlyA)),
        h('span', {}, h('b', {}, `Yalnızca ${other.nameTr}: `), names(diff.onlyB)),
      );
    },
  };
}
