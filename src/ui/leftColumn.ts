import { h, shortName, type AppState } from '../core';
import type { CellTypeId } from '../data/types';
import { cellGlyph, icon } from './icons';
import type { Component, UiContext } from './types';

const THUMB: Record<CellTypeId, [string, string]> = {
  plant: ['#d6e8b4', '#9bbf63'],
  animal: ['#fbdccd', '#e8a98f'],
  bacterium: ['#efe3b4', '#cdb86a'],
};

const KIND_LABEL: Record<string, string> = { ökaryot: 'Ökaryot hücre', prokaryot: 'Prokaryot hücre' };

export function createCellList(ctx: UiContext): Component {
  const list = h('ul', { class: 'cell-list' });
  const buttons = new Map<CellTypeId, HTMLButtonElement>();
  for (const cell of ctx.catalog.data.cells) {
    const [c1, c2] = THUMB[cell.id];
    const thumb = h('span', { class: 'cell-thumb', style: `--c1:${c1};--c2:${c2}` }, cellGlyph(cell.id));
    const onlyAdvanced = !cell.levels.includes('temel');
    const btn = h(
      'button',
      { class: 'cell-item', type: 'button', 'aria-pressed': 'false', onclick: () => ctx.actions.selectCell(cell.id) },
      thumb,
      h(
        'span',
        {},
        h('span', { class: 'cell-name' }, cell.nameTr),
        h('br'),
        h('span', { class: 'cell-kind' }, KIND_LABEL[cell.kind] ?? cell.kind),
        onlyAdvanced ? h('span', { class: 'badge', title: 'Bu hücre yalnızca İleri seviyede var' }, 'İleri') : null,
      ),
    );
    buttons.set(cell.id, btn);
    list.append(h('li', {}, btn));
  }
  const el = h('section', { class: 'card', 'aria-labelledby': 'h-cells' }, h('h2', { class: 'card-title', id: 'h-cells' }, 'Hücre türleri'), list);
  return {
    el,
    update(state: AppState): void {
      for (const [id, btn] of buttons) btn.setAttribute('aria-pressed', String(id === state.cellId));
    },
  };
}

export function createLegend(ctx: UiContext): Component {
  const list = h('ul', { class: 'legend' });
  const scroll = h('div', { class: 'scroll', style: 'flex:1' }, list);
  const el = h('section', { class: 'card', style: 'flex:1;min-height:0;display:flex;flex-direction:column', 'aria-labelledby': 'h-orgs' }, h('h2', { class: 'card-title', id: 'h-orgs' }, 'Organeller'), scroll);
  let builtFor = '';
  const rows = new Map<string, { select: HTMLButtonElement; toggle: HTMLButtonElement; eye: HTMLElement }>();

  const build = (state: AppState): void => {
    list.replaceChildren();
    rows.clear();
    const cell = ctx.catalog.cell(state.cellId);
    for (const info of ctx.catalog.organellesOf(cell, state.level)) {
      const select = h(
        'button',
        { class: 'legend-select', type: 'button', 'aria-pressed': 'false', onclick: () => ctx.actions.selectOrganelle(info.id) },
        h('span', { class: 'dot', style: `background:${info.color}` }),
        h('span', { title: info.nameTr }, shortName(info.nameTr)),
      );
      const eye = h('span', {});
      eye.append(icon('eye'));
      const toggle = h('button', { class: 'icon-btn', type: 'button', 'aria-pressed': 'true', 'aria-label': `${info.nameTr} göster veya gizle`, title: 'Göster / gizle', onclick: () => ctx.actions.toggleHidden(info.id) }, eye);
      rows.set(info.id, { select, toggle, eye });
      list.append(h('li', { class: 'legend-row' }, select, toggle));
    }
  };

  return {
    el,
    update(state: AppState): void {
      const key = `${state.cellId}:${state.level}`;
      if (key !== builtFor) {
        build(state);
        builtFor = key;
      }
      for (const [id, row] of rows) {
        const hidden = state.hidden.has(id);
        row.select.setAttribute('aria-pressed', String(state.selectedId === id));
        row.select.dataset.hidden = String(hidden);
        row.toggle.setAttribute('aria-pressed', String(!hidden));
        row.eye.replaceChildren(icon(hidden ? 'eyeOff' : 'eye'));
      }
    },
  };
}
