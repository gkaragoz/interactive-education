import { h, parseRouteAnchor, type AppState, type Route } from '../core';
import type { LoadProgress } from '../scene';
import { renderAbout } from './about';
import { renderBibliography } from './bibliography';
import { createComparePanel, createMicroscopePanel } from './bottomRow';
import { createHeader } from './header';
import { renderHome } from './home';
import { attachIdleFade } from './idle';
import { createInfoCard } from './infoCard';
import { createCellList, createLegend } from './leftColumn';
import { createLabView, type LabView } from './labView';
import { createModuleView, type ModuleView } from './moduleView';
import { createSettingsMenu } from './settings';
import { createStagePanel } from './stagePanel';
import type { UiContext } from './types';
import './styles.css';

export interface Shell {
  /** Mount point for the cell explorer's 3D stage. */
  viewport: HTMLElement;
  setLoading(progress: LoadProgress | null): void;
  /** The animated-module screen (timeline, phases, charts); its stage mounts into `moduleView.viewport`. */
  moduleView: ModuleView;
  /** The interactive lab screen (sim modules); its stage mounts into `labView.viewport`. */
  labView: LabView;
  setPerfText(text: string | null): void;
  /** Small non-blocking message at the bottom of the page; it fades by itself. */
  toast(text: string): void;
  /** Full-stage overlay with a message (graphics connection lost), or null to clear it. */
  setStageStatus(text: string | null): void;
  /** Called with the pixels the rail (left) and the info drawer (right) cover, so the 3D picture can stay centred in the free area. */
  onInsets(listener: (left: number, right: number) => void): void;
  update(state: AppState): void;
}

const TITLES: Record<Route, string> = {
  home: 'Bilim Atölyesi',
  explore: 'Hücre · Bilim Atölyesi',
  modul: 'Modül · Bilim Atölyesi',
  kaynakca: 'Kaynakça · Bilim Atölyesi',
  hakkinda: 'Hakkında · Bilim Atölyesi',
};

/** Widths (px) the floating rail and drawer take, kept in step with styles.css. */
const RAIL_OPEN = 318;
const RAIL_CLOSED = 74;
const DRAWER = 420;

export function createShell(root: HTMLElement, ctx: UiContext): Shell {
  const cellList = createCellList(ctx);
  const legend = createLegend(ctx);
  const stage = createStagePanel(ctx);
  const info = createInfoCard(ctx);
  const micro = createMicroscopePanel(ctx);
  const compare = createComparePanel(ctx);
  const settings = createSettingsMenu(ctx);
  const header = createHeader(ctx, settings);

  // --- left rail: cell types + organelle legend, collapsible -------------------------------------------------
  const railToggle = h('button', { class: 'icon-btn rail-toggle', type: 'button', 'aria-expanded': 'true', 'aria-controls': 'rail-body', 'aria-label': 'Sol paneli daralt', title: 'Paneli daralt / genişlet' }, '‹');
  const railBody = h('div', { class: 'rail-body', id: 'rail-body' }, cellList.el, legend.el);
  const rail = h('aside', { class: 'rail floating', 'aria-label': 'Hücre türleri ve organeller' }, railToggle, railBody);
  let railOpen = true;
  let insetListener: ((left: number, right: number) => void) | null = null;
  let infoOpen = false;
  const compact = typeof matchMedia === 'function' ? matchMedia('(max-width: 1500px)') : null;
  const reportInsets = (): void => {
    const narrow = compact?.matches === true;
    insetListener?.(railOpen ? (narrow ? RAIL_OPEN - 48 : RAIL_OPEN) : RAIL_CLOSED, infoOpen ? (narrow ? DRAWER - 48 : DRAWER) : 0);
  };
  compact?.addEventListener?.('change', reportInsets);
  railToggle.addEventListener('click', () => {
    railOpen = !railOpen;
    rail.classList.toggle('collapsed', !railOpen);
    railToggle.setAttribute('aria-expanded', String(railOpen));
    railToggle.setAttribute('aria-label', railOpen ? 'Sol paneli daralt' : 'Sol paneli aç');
    railToggle.textContent = railOpen ? '‹' : '›';
    railBody.inert = !railOpen;
    wrap.classList.toggle('rail-closed', !railOpen);
    reportInsets();
  });

  // --- right drawer: the info card ---------------------------------------------------------------------------
  const drawer = h('aside', { class: 'drawer', 'aria-label': 'Bilgi paneli' }, info.el);
  drawer.inert = true;
  drawer.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      ctx.actions.closeInfo();
    }
  });

  // Esc closes the drawer from anywhere (popovers and the sheet handle and stop their own Esc first).
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && infoOpen && !ev.defaultPrevented) ctx.actions.closeInfo();
  });

  // --- bottom drawer with tabs: Mikroskop / Karşılaştır --------------------------------------------------------
  const panels = [
    { id: 'micro', label: 'Mikroskop', el: micro.el },
    { id: 'compare', label: 'Karşılaştır', el: compare.el },
  ];
  let sheetTab: string | null = null;
  const tabButtons = new Map<string, HTMLButtonElement>();
  const sheet = h('section', { class: 'sheet floating', 'aria-label': 'Alt paneller' }, ...panels.map((p) => p.el));
  sheet.hidden = true;
  const showTab = (id: string | null): void => {
    sheetTab = id;
    sheet.hidden = id === null;
    for (const p of panels) p.el.hidden = p.id !== id;
    for (const [pid, btn] of tabButtons) btn.setAttribute('aria-selected', String(pid === id));
  };
  for (const p of panels) {
    p.el.hidden = true;
    const btn = h('button', { class: 'tool-btn', type: 'button', role: 'tab', 'aria-selected': 'false', 'aria-controls': p.el.id || undefined, 'data-tab': p.id, onclick: () => showTab(sheetTab === p.id ? null : p.id) }, p.label);
    tabButtons.set(p.id, btn);
    stage.tabSlot.append(btn);
  }

  // --- screens ----------------------------------------------------------------------------------------------
  const wrap = h('div', { class: 'stage-wrap' }, stage.el, rail, drawer, sheet);
  const explore = h('main', { class: 'explore', id: 'main' }, wrap);
  const moduleView = createModuleView(ctx.reducedMotion);
  const moduleMain = h('main', { class: 'module-main-page', id: 'modul' }, moduleView.el);
  const labView = createLabView(ctx.reducedMotion);
  const labMain = h('main', { class: 'module-main-page', id: 'lab' }, labView.el);
  const homeMain = h('main', { class: 'page home-page', id: 'home', tabindex: -1 });
  const page = h('main', { class: 'page', id: 'page', tabindex: -1 });
  for (const m of [explore, moduleMain, labMain, homeMain, page]) m.hidden = true;
  const perf = h('div', { class: 'perf-overlay', 'aria-hidden': 'true' });
  perf.hidden = true;
  const skip = h('a', { class: 'skip-link', href: '#main', onclick: (ev: Event) => { ev.preventDefault(); (explore.querySelector('canvas') ?? explore).focus?.(); } }, 'Ana içeriğe geç');
  const toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const smallScreen = h('div', { class: 'small-screen-note', role: 'note' }, h('h2', {}, 'Bilim Atölyesi'), h('p', {}, 'Bu sürüm masaüstü ekranlar için tasarlandı. Lütfen daha geniş bir ekranda veya tarayıcı penceresini büyüterek aç.'));
  root.replaceChildren(skip, h('div', { class: 'app' }, header.el, explore, moduleMain, labMain, homeMain, page), perf, toastEl, smallScreen);
  attachIdleFade(wrap);
  attachIdleFade(moduleMain);
  attachIdleFade(labMain);

  let pageRoute: Route | null = null;
  let pageAnchor: string | null = null;
  let homeBuilt = false;

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
    moduleView,
    labView,
    setStageStatus: stage.setStatus,
    onInsets(listener): void {
      insetListener = listener;
      reportInsets();
    },
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
      const route = state.route;
      explore.hidden = route !== 'explore';
      const sim = route === 'modul' && ctx.modules.find((m) => m.id === state.moduleId)?.kind === 'sim';
      moduleMain.hidden = route !== 'modul' || sim;
      labMain.hidden = !sim;
      homeMain.hidden = route !== 'home';
      page.hidden = route !== 'kaynakca' && route !== 'hakkinda';
      document.title = TITLES[route];
      if (route === 'home' && !homeBuilt) {
        homeMain.replaceChildren(renderHome(ctx));
        homeBuilt = true;
      }
      if (route === 'kaynakca' || route === 'hakkinda') showPage(route);
      else pageRoute = null;
      const open = state.infoOpen && route === 'explore';
      if (open !== infoOpen) {
        infoOpen = open;
        drawer.classList.toggle('open', open);
        drawer.inert = !open;
        wrap.classList.toggle('drawer-open', open);
        reportInsets();
      }
      for (const c of [header, cellList, legend, stage, info, micro, compare]) c.update(state);
    },
  };
}
