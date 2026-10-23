import { h, type AppState, type ViewMode } from '../core';
import type { LoadProgress } from '../scene';
import { icon, type IconName } from './icons';
import { createLoadingScreen, loadingTips } from './loadingScreen';
import type { Component, UiContext } from './types';

export interface StagePanel extends Component {
  /** Container the 3D stage mounts its canvas into. */
  viewport: HTMLElement;
  /** Empty toolbar next to the tools; the shell fills it with the bottom-drawer tabs. */
  tabSlot: HTMLElement;
  setLoading(progress: LoadProgress | null): void;
  /** Overlay with a custom message (e.g. connection lost); null clears it. */
  setStatus(text: string | null): void;
}

const MODES: { id: ViewMode; label: string; icon: IconName; hint: string }[] = [
  { id: 'full', label: 'Tam', icon: 'cube', hint: 'Bütün hücre' },
  { id: 'cutaway', label: 'Kesit', icon: 'layers', hint: 'Hücreyi ortadan kes' },
  { id: 'isolate', label: 'Yalıt', icon: 'target', hint: 'Seçili organeli tek başına göster' },
];

function toolButton(label: string, iconName: IconName, onclick: () => void, title: string): HTMLButtonElement {
  return h('button', { class: 'tool-btn', type: 'button', title, 'aria-label': label, onclick }, icon(iconName), h('span', { class: 'lbl' }, label));
}

export function createStagePanel(ctx: UiContext): StagePanel {
  const { actions, catalog } = ctx;
  const viewport = h('div', { class: 'stage-viewport' });
  const title = h('h2', { id: 'cell-title' });
  const subtitle = h('p');
  const head = h('div', { class: 'stage-head' }, title, subtitle);
  const tip = h('div', { class: 'tip-note' }, 'İpucu: sürükle = döndür, kaydır = yakınlaştır, Ctrl + sürükle = taşı.');
  // The hint is only for the first moments: it fades away with the first interaction.
  const dismissTip = (): void => tip.classList.add('gone');
  viewport.addEventListener('pointerdown', dismissTip, { once: true });

  const modeButtons = new Map<ViewMode, HTMLButtonElement>();
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Görünüm modu' });
  for (const mode of MODES) {
    const btn = h('button', { class: 'seg-btn', type: 'button', 'aria-pressed': 'false', 'aria-label': mode.label, title: mode.hint, onclick: () => actions.setViewMode(mode.id) }, icon(mode.icon), h('span', { class: 'lbl' }, mode.label));
    modeButtons.set(mode.id, btn);
    seg.append(btn);
  }
  const cutInput = h('input', { type: 'range', min: '0', max: '0.85', step: '0.01', id: 'cut-slider', 'aria-label': 'Kesit konumu' });
  cutInput.addEventListener('input', () => actions.setCut(Number(cutInput.value)));
  const cutRow = h('div', { class: 'cut-row', hidden: true }, h('label', { for: 'cut-slider' }, 'Kesit konumu'), cutInput);
  const viewPanel = h('section', { class: 'view-panel floating', 'aria-label': 'Görünüm' }, h('h3', {}, 'Görünüm modu'), seg, cutRow);

  const rotateBtn = toolButton('Döndür', 'rotate', actions.toggleAutoRotate, 'Kendiliğinden dönmeyi aç / kapat');
  const hideOthersBtn = toolButton('Diğerlerini gizle', 'hideOthers', actions.toggleHideOthers, 'Seçili organel dışındakileri gizle');
  const resetBtn = toolButton('Görünümü sıfırla', 'reset', actions.resetView, 'Kamerayı başa döndür (R)');
  const labelsBtn = toolButton('Etiketler', 'tag', actions.toggleLabels, 'Organel etiketlerini aç / kapat');
  const shotBtn = toolButton('Ekran görüntüsü', 'camera', actions.screenshot, 'PNG olarak indir');
  for (const b of [rotateBtn, hideOthersBtn, labelsBtn]) b.setAttribute('aria-pressed', 'false');
  const infoBtn = toolButton('Bilgi', 'info', () => (infoBtn.getAttribute('aria-pressed') === 'true' ? actions.closeInfo() : actions.openInfo()), 'Bilgi panelini aç / kapat');
  infoBtn.setAttribute('aria-pressed', 'false');
  const tools = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Görünüm araçları' }, rotateBtn, hideOthersBtn, resetBtn, labelsBtn, shotBtn, infoBtn);
  /** Where the shell puts the "Mikroskop / Karşılaştır" tab buttons. */
  const tabSlot = h('div', { class: 'toolbar tab-slot', role: 'tablist', 'aria-label': 'Alt paneller' });
  const dockBar = h('div', { class: 'dock-bar floating' }, tools, tabSlot);

  const captionA = h('span');
  const captionB = h('span');
  const captions = h('div', { class: 'compare-captions', hidden: true }, captionA, captionB);

  let tipsFor = '';
  const loadingScreen = createLoadingScreen(ctx.reducedMotion);
  const loading = loadingScreen.el;

  const el = h('section', { class: 'card stage-card', 'aria-label': '3B hücre sahnesi' }, viewport, head, tip, captions, viewPanel, dockBar, loading);

  return {
    el,
    viewport,
    tabSlot,
    setLoading(progress: LoadProgress | null): void {
      loadingScreen.setProgress(progress);
      el.setAttribute('aria-busy', String(progress !== null));
    },
    setStatus(text: string | null): void {
      loadingScreen.setStatus(text);
      el.setAttribute('aria-busy', String(text !== null));
    },
    update(state: AppState): void {
      const cell = catalog.cell(state.cellId);
      title.textContent = cell.nameTr;
      subtitle.textContent = cell.tagline;
      head.hidden = state.compareOn;
      tip.hidden = state.compareOn;
      if (state.selectedId !== null) dismissTip();
      captions.hidden = !state.compareOn;
      captionA.textContent = cell.nameTr;
      captionB.textContent = catalog.cell(state.compareCellId).nameTr;
      for (const [id, btn] of modeButtons) btn.setAttribute('aria-pressed', String(id === state.viewMode));
      cutRow.hidden = state.viewMode !== 'cutaway';
      if (document.activeElement !== cutInput) cutInput.value = String(state.cutPosition);
      rotateBtn.setAttribute('aria-pressed', String(state.autoRotate));
      hideOthersBtn.setAttribute('aria-pressed', String(state.hideOthers));
      hideOthersBtn.disabled = state.selectedId === null;
      labelsBtn.setAttribute('aria-pressed', String(state.labels));
      labelsBtn.disabled = state.compareOn;
      infoBtn.setAttribute('aria-pressed', String(state.infoOpen));
      modeButtons.get('isolate')?.toggleAttribute('disabled', state.selectedId === null && state.viewMode !== 'isolate');
      const tipKey = `${state.cellId}:${state.level}`;
      if (tipKey !== tipsFor) {
        tipsFor = tipKey;
        loadingScreen.setTips(loadingTips(catalog, state));
      }
      el.dataset.cell = state.cellId;
      el.dataset.mode = state.viewMode;
      el.dataset.selected = state.selectedId ?? '';
    },
  };
}
