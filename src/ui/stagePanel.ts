import { h, type AppState, type ViewMode } from '../core';
import { icon, type IconName } from './icons';
import type { Component, UiContext } from './types';

export interface StagePanel extends Component {
  /** Container the 3D stage mounts its canvas into. */
  viewport: HTMLElement;
  setLoading(fraction: number | null): void;
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
  const viewPanel = h('section', { class: 'view-panel', 'aria-label': 'Görünüm' }, h('h3', {}, 'Görünüm modu'), seg, cutRow);

  const rotateBtn = toolButton('Döndür', 'rotate', actions.toggleAutoRotate, 'Kendiliğinden dönmeyi aç / kapat');
  const hideOthersBtn = toolButton('Diğerlerini gizle', 'hideOthers', actions.toggleHideOthers, 'Seçili organel dışındakileri gizle');
  const resetBtn = toolButton('Görünümü sıfırla', 'reset', actions.resetView, 'Kamerayı başa döndür (R)');
  const labelsBtn = toolButton('Etiketler', 'tag', actions.toggleLabels, 'Organel etiketlerini aç / kapat');
  const shotBtn = toolButton('Ekran görüntüsü', 'camera', actions.screenshot, 'PNG olarak indir');
  for (const b of [rotateBtn, hideOthersBtn, labelsBtn]) b.setAttribute('aria-pressed', 'false');
  const leftBar = h('div', { class: 'toolbar left', role: 'toolbar', 'aria-label': 'Görünüm araçları' }, rotateBtn, hideOthersBtn, resetBtn);
  const rightBar = h('div', { class: 'toolbar right', role: 'toolbar', 'aria-label': 'Etiket ve kayıt' }, labelsBtn, shotBtn);

  const captionA = h('span');
  const captionB = h('span');
  const captions = h('div', { class: 'compare-captions', hidden: true }, captionA, captionB);

  const bar = h('i');
  const loadingText = h('span', {}, 'Hücre hazırlanıyor…');
  const loading = h('div', { class: 'loading', role: 'status', 'aria-live': 'polite' }, loadingText, h('div', { class: 'bar' }, bar), h('small', {}, 'Bilim Atölyesi · © gkaragoz and Contributors'));

  const el = h('section', { class: 'card stage-card', 'aria-label': '3B hücre sahnesi' }, viewport, head, tip, captions, viewPanel, leftBar, rightBar, loading);

  return {
    el,
    viewport,
    setLoading(fraction: number | null): void {
      loading.hidden = fraction === null;
      if (fraction !== null) bar.style.width = `${Math.round(fraction * 100)}%`;
      el.setAttribute('aria-busy', String(fraction !== null));
    },
    setStatus(text: string | null): void {
      loading.hidden = text === null;
      loadingText.textContent = text ?? 'Hücre hazırlanıyor…';
      bar.style.width = text === null ? '0%' : '100%';
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
      modeButtons.get('isolate')?.toggleAttribute('disabled', state.selectedId === null && state.viewMode !== 'isolate');
      el.dataset.cell = state.cellId;
      el.dataset.mode = state.viewMode;
      el.dataset.selected = state.selectedId ?? '';
    },
  };
}
