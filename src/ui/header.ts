import { h, routeHash, moduleHash, type AppState, type Route } from '../core';
import type { LevelId } from '../data/types';
import { icon } from './icons';
import { brandMark } from './brand';
import type { Component, UiContext } from './types';

const LEVELS: { id: LevelId; label: string; hint: string }[] = [
  { id: 'temel', label: 'Temel', hint: '5–8. sınıf düzeyi' },
  { id: 'ileri', label: 'İleri', hint: '9–12. sınıf düzeyi' },
];

/** Slim global header: brand (home), module switcher, level toggle, Kaynakça, Hakkında, Ayarlar. */
export function createHeader(ctx: UiContext, settings: Component): Component {
  const { actions, catalog } = ctx;
  const brand = h('a', { class: 'brand', href: routeHash('home'), 'aria-label': 'Bilim Atölyesi, ana sayfa', onclick: (ev: Event) => { ev.preventDefault(); actions.navigate('home'); } }, brandMark(), h('h1', { class: 'brand-name' }, 'Bilim Atölyesi'));

  // --- module switcher (a small popover with one link per module) -------------------------------------------
  const switchLabel = h('span', {}, 'Modüller');
  const switchBtn = h('button', { class: 'nav-link switch-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'module-menu', 'aria-haspopup': 'true' }, icon('grid'), switchLabel);
  const menu = h('div', { class: 'module-menu popover', id: 'module-menu', role: 'group', 'aria-label': 'Modüller' });
  menu.hidden = true;
  for (const m of ctx.modules) {
    menu.append(
      h('a', { class: 'menu-item', href: m.id === 'cell' ? routeHash('explore') : moduleHash(m.id), 'data-module': m.id, onclick: (ev: Event) => { ev.preventDefault(); setOpen(false); actions.openModule(m.id); } }, h('b', {}, m.nameTr), m.preview ? h('span', { class: 'badge' }, 'Önizleme') : null, h('small', {}, m.tagline)),
    );
  }
  menu.append(h('a', { class: 'menu-item home-item', href: routeHash('home'), onclick: (ev: Event) => { ev.preventDefault(); setOpen(false); actions.navigate('home'); } }, h('b', {}, 'Tüm modüller')));
  const switcher = h('div', { class: 'switcher' }, switchBtn, menu);
  const setOpen = (open: boolean): void => {
    menu.hidden = !open;
    switchBtn.setAttribute('aria-expanded', String(open));
  };
  switchBtn.addEventListener('click', () => setOpen(menu.hidden));
  switcher.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !menu.hidden) {
      ev.stopPropagation();
      setOpen(false);
      switchBtn.focus();
    }
  });
  document.addEventListener('pointerdown', (ev) => {
    if (!menu.hidden && ev.target instanceof Node && !switcher.contains(ev.target)) setOpen(false);
  });

  // --- level toggle -----------------------------------------------------------------------------------------
  const levelButtons = new Map<LevelId, HTMLButtonElement>();
  const levelSwitch = h('div', { class: 'level-switch', role: 'group', 'aria-label': 'Anlatım seviyesi' });
  for (const level of LEVELS) {
    const btn = h('button', { type: 'button', 'aria-pressed': 'false', title: level.hint, onclick: () => actions.setLevel(level.id) }, level.label);
    levelButtons.set(level.id, btn);
    levelSwitch.append(btn);
  }

  const links = new Map<Route, HTMLAnchorElement>();
  const nav = h('nav', { 'aria-label': 'Ana gezinme' });
  for (const [route, label, iconName] of [['kaynakca', 'Kaynakça', 'books'], ['hakkinda', 'Hakkında', 'info']] as const) {
    const a = h('a', { class: 'nav-link', href: routeHash(route), onclick: (ev: Event) => { ev.preventDefault(); actions.navigate(route); } }, icon(iconName), label);
    links.set(route, a);
    nav.append(a);
  }
  const el = h('header', { class: 'topbar' }, brand, switcher, h('div', { class: 'spacer' }), levelSwitch, nav, settings.el);

  return {
    el,
    update(state: AppState): void {
      const supported = state.route === 'explore' ? catalog.cell(state.cellId).levels : (['temel', 'ileri'] as LevelId[]);
      for (const [id, btn] of levelButtons) {
        btn.setAttribute('aria-pressed', String(state.level === id));
        btn.disabled = !supported.includes(id);
      }
      for (const [route, a] of links) {
        if (route === state.route) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
      const current = ctx.modules.find((m) => m.id === state.moduleId);
      switchLabel.textContent = state.route === 'explore' || state.route === 'modul' ? (current?.nameTr ?? 'Modüller') : 'Modüller';
      switchBtn.toggleAttribute('data-current', state.route === 'home' || state.route === 'explore' || state.route === 'modul');
      settings.update(state);
    },
  };
}
