import { h, moduleHash, routeHash } from '../core';
import { brandMark } from './brand';
import type { ModuleCard, UiContext } from './types';

const GRADIENTS = ['#cfe3b0,#8fb36a', '#f6d3c4,#e29b86', '#cdd9f3,#8da7dc', '#efe3b4,#cdb86a', '#e3d1f0,#b28fd6'];
const GLYPHS: Record<string, string> = { cell: '🔬', 'mitosis-meiosis': '🧬', 'membrane-transport': '💧', 'dna-protein': '🧪', energy: '⚡', muscle: '💪', nervous: '🧠', genetics: '🌱' };

function thumb(ctx: UiContext, id: string, index: number): HTMLElement {
  const [from, to] = (GRADIENTS[index % GRADIENTS.length] as string).split(',');
  const box = h('div', { class: 'card-thumb', style: `background:linear-gradient(135deg,${from},${to})` }, h('span', { class: 'glyph', 'aria-hidden': 'true' }, GLYPHS[id] ?? '✦'));
  // A rendered still, when one exists (public/thumbs/<id>.webp); otherwise the gradient and the glyph stay.
  const img = h('img', { src: `${ctx.baseUrl}thumbs/${encodeURIComponent(id)}.webp`, alt: '', loading: 'lazy' });
  img.addEventListener('load', () => box.classList.add('has-image'));
  img.addEventListener('error', () => img.remove());
  box.prepend(img);
  return box;
}

function levelChips(card: ModuleCard): HTMLElement {
  return h('ul', { class: 'chips' }, ...card.levels.map((l) => h('li', { class: 'chip' }, l === 'temel' ? 'Temel' : 'İleri')));
}

/** Home page: hero, one card per openable module, "Yakında" cards for announced ones. */
export function renderHome(ctx: UiContext): HTMLElement {
  const open = ctx.modules.map((m, i) =>
    h(
      'li',
      { class: 'module-card', 'data-module-card': m.id },
      thumb(ctx, m.id, i),
      h('div', { class: 'card-body' }, h('h3', {}, m.nameTr, m.preview ? h('span', { class: 'badge' }, 'Önizleme') : null), h('p', {}, m.tagline), levelChips(m)),
      h('a', { class: 'primary-btn open-btn', href: m.id === 'cell' ? routeHash('explore') : moduleHash(m.id), onclick: (ev: Event) => { ev.preventDefault(); ctx.actions.openModule(m.id); } }, 'Aç', h('span', { class: 'sr-only' }, `: ${m.nameTr}`)),
    ),
  );
  const soon = ctx.upcoming.map((u, i) =>
    h(
      'li',
      { class: 'module-card soon', 'data-soon': u.id, 'aria-disabled': 'true' },
      thumb(ctx, u.id, i + 2),
      h('div', { class: 'card-body' }, h('h3', {}, u.nameTr), h('p', {}, u.tagline), h('span', { class: 'soon-tag' }, `Yakında · ${u.version}`)),
    ),
  );
  return h(
    'div',
    { class: 'home' },
    h('section', { class: 'hero' }, brandMark(), h('div', {}, h('h2', {}, 'Bilim Atölyesi'), h('p', {}, 'Canlılığı mikroskobik düzeyde keşfet: 3B modeller, adım adım animasyonlar ve her bilginin kaynağı.'), h('p', { class: 'hero-note' }, 'Seviyeni üstteki Temel / İleri düğmesinden seçebilirsin; seçimin hatırlanır.'))),
    h('section', { 'aria-labelledby': 'h-modules' }, h('h2', { class: 'section-title', id: 'h-modules' }, 'Modüller'), h('ul', { class: 'module-grid' }, ...open, ...soon)),
  );
}
