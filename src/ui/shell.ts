import { h, parseRouteAnchor, routeHash, type AppState, type Route } from '../core';
import { renderAbout } from './about';
import { renderBibliography } from './bibliography';
import { createComparePanel, createMicroscopePanel } from './bottomRow';
import { icon, type IconName } from './icons';
import { createInfoCard } from './infoCard';
import { createSettingsMenu } from './settings';
import { createCellList, createLegend } from './leftColumn';
import { createStagePanel } from './stagePanel';
import type { UiContext } from './types';
import './styles.css';

export interface Shell {
  /** Mount point for the 3D stage. */
  viewport: HTMLElement;
  setLoading(fraction: number | null): void;
  setPerfText(text: string | null): void;
  /** Small non-blocking message at the bottom of the page; it fades by itself. */
  toast(text: string): void;
  /** Full-stage overlay with a message (graphics connection lost), or null to clear it. */
  setStageStatus(text: string | null): void;
  update(state: AppState): void;
}

const NAV: { route: Route; label: string; icon: IconName }[] = [
  { route: 'explore', label: 'Keşfet', icon: 'grid' },
  { route: 'kaynakca', label: 'Kaynakça', icon: 'books' },
  { route: 'hakkinda', label: 'Hakkında', icon: 'info' },
];

const TITLES: Record<Route, string> = {
  explore: 'Bilim Atölyesi · Hücre',
  kaynakca: 'Kaynakça · Bilim Atölyesi',
  hakkinda: 'Hakkında · Bilim Atölyesi',
};

function brandMark(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('class', 'brand-mark');
  svg.setAttribute('aria-hidden', 'true');
  const shapes: [string, Record<string, string>][] = [
    ['rect', { x: '3', y: '6', width: '38', height: '32', rx: '11', fill: '#b9d28a', stroke: '#5b7f33', 'stroke-width': '2' }],
    ['circle', { cx: '19', cy: '21', r: '8', fill: '#8a63b8' }],
    ['circle', { cx: '19', cy: '21', r: '3', fill: '#5f3a85' }],
    ['ellipse', { cx: '32', cy: '28', rx: '5', ry: '3', fill: '#e08a3c' }],
    ['circle', { cx: '30', cy: '14', r: '3', fill: '#7fb4d6' }],
  ];
  for (const [tag, attrs] of shapes) {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  }
  return svg;
}

export function createShell(root: HTMLElement, ctx: UiContext): Shell {
  const cellList = createCellList(ctx);
  const legend = createLegend(ctx);
  const stage = createStagePanel(ctx);
  const info = createInfoCard(ctx);
  const micro = createMicroscopePanel(ctx);
  const compare = createComparePanel(ctx);
  const settings = createSettingsMenu(ctx);

  const navLinks = new Map<Route, HTMLAnchorElement>();
  const nav = h('nav', { 'aria-label': 'Ana gezinme' });
  for (const item of NAV) {
    const a = h('a', { class: 'nav-link', href: routeHash(item.route), onclick: (ev: Event) => { ev.preventDefault(); ctx.actions.navigate(item.route); } }, icon(item.icon), item.label);
    navLinks.set(item.route, a);
    nav.append(a);
  }
  const header = h(
    'header',
    { class: 'topbar' },
    h('a', { class: 'brand', href: routeHash('explore'), 'aria-label': 'Bilim Atölyesi Hücre, ana sayfa', onclick: (ev: Event) => { ev.preventDefault(); ctx.actions.navigate('explore'); } }, brandMark(), h('h1', {}, 'Bilim Atölyesi · Hücre'), h('span', { class: 'tagline' }, 'Canlılığı mikroskobik düzeyde keşfet ✦')),
    nav,
    settings.el,
  );

  const workspace = h(
    'main',
    { class: 'workspace', id: 'main' },
    h('div', { class: 'col' }, cellList.el, legend.el),
    h('div', { class: 'center' }, stage.el, h('div', { style: 'display:grid;grid-template-columns:1.1fr 1fr;gap:16px;min-height:0' }, micro.el, compare.el)),
    h('div', { class: 'col' }, info.el),
  );
  const page = h('main', { class: 'page', id: 'page', tabindex: -1 });
  page.hidden = true;
  const perf = h('div', { class: 'perf-overlay', 'aria-hidden': 'true' });
  perf.hidden = true;
  const skip = h('a', { class: 'skip-link', href: '#main', onclick: (ev: Event) => { ev.preventDefault(); (workspace.querySelector('canvas') ?? workspace).focus?.(); } }, 'Ana içeriğe geç');

  const toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const smallScreen = h('div', { class: 'small-screen-note', role: 'note' }, h('h2', {}, 'Bilim Atölyesi · Hücre'), h('p', {}, 'Bu sürüm masaüstü ekranlar için tasarlandı. Lütfen daha geniş bir ekranda veya tarayıcı penceresini büyüterek aç.'));
  root.replaceChildren(skip, h('div', { class: 'app' }, header, workspace, page), perf, toastEl, smallScreen);

  let pageRoute: Route | null = null;
  let pageAnchor: string | null = null;

  const showPage = (route: Route): void => {
    const anchor = route === 'kaynakca' ? parseRouteAnchor(location.hash) : null;
    if (pageRoute !== route) {
      page.replaceChildren(route === 'kaynakca' ? renderBibliography(ctx) : renderAbout(ctx));
      pageRoute = route;
      page.scrollTop = 0;
    }
    if (anchor && anchor !== pageAnchor) {
      const target = page.querySelector<HTMLElement>(`[data-source-id="${CSS.escape(anchor)}"]`);
      target?.scrollIntoView({ block: 'center' });
      target?.setAttribute('tabindex', '-1');
      target?.focus({ preventScroll: true });
    }
    pageAnchor = anchor;
  };

  return {
    viewport: stage.viewport,
    setLoading: stage.setLoading,
    setStageStatus: stage.setStatus,
    toast(text: string): void {
      toastEl.textContent = text;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 6500);
    },
    setPerfText(text: string | null): void {
      perf.hidden = text === null;
      if (text !== null) perf.textContent = text;
    },
    update(state: AppState): void {
      const explore = state.route === 'explore';
      workspace.hidden = !explore;
      page.hidden = explore;
      for (const [route, a] of navLinks) {
        if (route === state.route) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
      document.title = TITLES[state.route];
      if (!explore) showPage(state.route);
      else pageRoute = null;
      for (const c of [cellList, legend, stage, info, micro, compare, settings]) c.update(state);
    },
  };
}
