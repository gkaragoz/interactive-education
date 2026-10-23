import { h, type AppState } from '../core';
import type { LevelId, LevelText, OrganelleInfo } from '../data/types';
import type { Component, UiContext } from './types';

const LEVELS: { id: LevelId; label: string }[] = [
  { id: 'temel', label: 'Temel' },
  { id: 'ileri', label: 'İleri' },
];

function pickText(info: OrganelleInfo, level: LevelId): LevelText | undefined {
  return info.text[level] ?? info.text.ileri ?? info.text.temel;
}

export function createInfoCard(ctx: UiContext): Component {
  const { catalog, actions } = ctx;
  const levelButtons = new Map<LevelId, HTMLButtonElement>();
  const switcher = h('div', { class: 'level-switch', role: 'group', 'aria-label': 'Açıklama seviyesi' });
  for (const level of LEVELS) {
    const btn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => actions.setLevel(level.id) }, level.label);
    levelButtons.set(level.id, btn);
    switcher.append(btn);
  }
  const body = h('div', { class: 'scroll', 'aria-live': 'polite' });
  const el = h('section', { class: 'card', style: 'display:flex;flex-direction:column;min-height:0', 'aria-labelledby': 'h-info' }, h('h2', { class: 'card-title', id: 'h-info' }, 'Organel ayrıntıları'), switcher, body);
  let builtFor = '';

  const kazChips = (ids: string[]): HTMLElement =>
    h(
      'ul',
      { class: 'chips' },
      ...ids.map((id) => {
        const k = catalog.kazanimById.get(id);
        return h('li', {}, h('span', { class: 'chip kaz', title: k ? `${k.summaryTr} (${k.grade}. sınıf)` : id, tabindex: 0 }, id));
      }),
    );
  const sourceChips = (ids: string[]): HTMLElement =>
    h(
      'ul',
      { class: 'chips' },
      ...ids.map((id) => {
        const s = catalog.sourceById.get(id);
        return h('li', {}, h('a', { class: 'chip', href: `#/kaynakca/${encodeURIComponent(id)}`, title: s ? `${s.publisher}, ${s.license}` : id }, s?.title ?? id));
      }),
    );

  const buildOrganelle = (info: OrganelleInfo, level: LevelId): HTMLElement => {
    const text = pickText(info, level);
    const orb = h('span', { class: 'info-orb', style: `--orb:${info.color}` });
    return h(
      'div',
      { class: 'notes' },
      h('div', { class: 'info-head' }, orb, h('div', {}, h('h3', {}, info.nameTr), h('p', {}, info.tagline))),
      h(
        'dl',
        { class: 'facts' },
        h('dt', {}, 'Boyut'),
        h('dd', {}, info.sizeUm),
        h('dt', {}, 'Konum'),
        h('dd', {}, info.location),
        h('dt', {}, 'Işık mikroskobunda'),
        h('dd', {}, info.visibleInLightMicroscope ? 'Görünür' : 'Görünmez'),
        h('dt', {}, 'İngilizce adı'),
        h('dd', {}, info.nameEn),
      ),
      h('h3', { class: 'sub' }, 'Biyolojik notlar'),
      text ? h('p', {}, text.summary) : null,
      text ? h('p', {}, text.function) : null,
      text && text.details.length > 0 ? h('ul', {}, ...text.details.map((d) => h('li', {}, d))) : null,
      // Some fun facts go beyond the 5th grade programme, so they only appear at İleri.
      info.funFact && level !== 'temel' ? h('p', { class: 'fun-fact' }, `İlginç bilgi: ${info.funFact}`) : null,
      h('h3', { class: 'sub' }, 'Kazanımlar'),
      kazChips(info.kazanimIds),
      h('h3', { class: 'sub' }, 'Kaynaklar'),
      sourceChips(info.sourceIds),
    );
  };

  return {
    el,
    update(state: AppState): void {
      const cell = catalog.cell(state.cellId);
      for (const [id, btn] of levelButtons) {
        btn.setAttribute('aria-pressed', String(state.level === id));
        btn.disabled = !cell.levels.includes(id);
      }
      const key = `${state.cellId}:${state.level}:${state.selectedId ?? ''}`;
      if (key === builtFor) return;
      builtFor = key;
      const info = state.selectedId ? catalog.organelleById.get(state.selectedId) : undefined;
      if (info) {
        body.replaceChildren(buildOrganelle(info, state.level));
        return;
      }
      const text = cell.text[state.level] ?? cell.text.ileri ?? cell.text.temel;
      body.replaceChildren(
        h(
          'div',
          { class: 'notes' },
          h('p', { class: 'empty-note' }, 'Bir organel seçmek için 3B modele tıkla ya da soldaki listeden seç.'),
          h('h3', { class: 'sub' }, cell.nameTr),
          text ? h('p', {}, text.summary) : null,
          text && text.details.length > 0 ? h('ul', {}, ...text.details.map((d) => h('li', {}, d))) : null,
          h('h3', { class: 'sub' }, 'Kazanımlar'),
          kazChips(cell.kazanimIds),
          h('h3', { class: 'sub' }, 'Kaynaklar'),
          sourceChips(cell.sourceIds),
        ),
      );
    },
  };
}
