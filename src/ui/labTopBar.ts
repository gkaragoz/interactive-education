import { getExperiment } from '../chemlab';
import { h, TIMELAPSE } from '../core';
import type { LevelId } from '../data/types';
import { experimentList } from '../scene';

export interface ExperimentPicker {
  el: HTMLElement;
  /** Shows the current experiment's name on the button (null: nothing chosen). */
  setCurrent(id: string | null): void;
}

/**
 * "Deney seç": a button with the current experiment's name that opens a listbox popover of all ten experiments, each
 * with its number, Temel / İleri badges and a "Sanal" badge for virtual-only ones. Experiments the current level does
 * not offer stay in the list, disabled, so the learner sees why they are missing. Arrow keys, Enter, Esc work.
 */
export function createExperimentPicker(level: LevelId, onPick: (id: string) => void): ExperimentPicker {
  const label = h('span', { class: 'exp-name' }, 'Deney seç');
  const button = h('button', { type: 'button', class: 'tool-btn exp-btn', 'data-experiment': '', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': 'exp-list' }, label, h('span', { 'aria-hidden': 'true' }, ' ▾'));
  const list = h('div', { class: 'exp-list popover', id: 'exp-list', role: 'listbox', 'aria-label': 'Deneyler' });
  list.hidden = true;
  const options = new Map<string, HTMLButtonElement>();
  for (const e of experimentList()) {
    const def = getExperiment(e.id);
    const offered = def?.levels.includes(level) ?? true;
    const badges = h('span', { class: 'exp-badges' }, ...(def?.levels ?? []).map((l) => h('span', { class: 'badge' }, l === 'temel' ? 'Temel' : 'İleri')), def?.virtualOnly ? h('span', { class: 'badge virtual' }, 'Sanal') : null);
    const opt = h('button', { type: 'button', class: 'exp-option', role: 'option', 'aria-selected': 'false', 'data-exp': e.id, disabled: !offered, title: offered ? '' : 'Bu deney bu seviyede yok; üstteki Temel / İleri düğmesinden seviyeyi değiştir.' }, h('b', {}, `${e.no}. `), h('span', { class: 'exp-title' }, e.titleTr), badges);
    opt.addEventListener('click', () => {
      setOpen(false);
      onPick(e.id);
    });
    options.set(e.id, opt);
    list.append(opt);
  }
  const el = h('div', { class: 'exp-picker' }, button, list);

  const setOpen = (open: boolean): void => {
    list.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) (list.querySelector<HTMLButtonElement>('.exp-option[aria-selected=true]:not(:disabled), .exp-option:not(:disabled)'))?.focus();
  };
  button.addEventListener('click', () => setOpen(list.hidden));
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !list.hidden) {
      ev.stopPropagation();
      setOpen(false);
      button.focus();
    } else if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && !list.hidden) {
      const all = [...list.querySelectorAll<HTMLButtonElement>('.exp-option:not(:disabled)')];
      const at = all.indexOf(document.activeElement as HTMLButtonElement);
      all[Math.min(Math.max(at + (ev.key === 'ArrowDown' ? 1 : -1), 0), all.length - 1)]?.focus();
      ev.preventDefault();
    } else if (ev.key === 'ArrowDown' && list.hidden && ev.target === button) {
      setOpen(true);
      ev.preventDefault();
    }
  });
  const away = (ev: PointerEvent): void => {
    if (!list.hidden && ev.target instanceof Node && !el.contains(ev.target)) setOpen(false);
  };
  document.addEventListener('pointerdown', away);

  return {
    el,
    setCurrent(id): void {
      for (const [oid, opt] of options) opt.setAttribute('aria-selected', String(oid === id));
      const info = experimentList().find((e) => e.id === id);
      label.textContent = info ? `${info.no}. ${info.titleTr}` : 'Deney seç';
      button.title = info ? info.titleTr : '';
    },
  };
}

export type LabelMode = 'off' | 'focus' | 'all';
const LABEL_TEXT: Record<LabelMode, string> = { focus: 'Etiketler: seçili', all: 'Etiketler: hepsi', off: 'Etiketler: kapalı' };
const NEXT: Record<LabelMode, LabelMode> = { focus: 'all', all: 'off', off: 'focus' };

/** The camera presets and the label mode of the lab toolbar. */
export function createCameraGroup(onOverview: () => void, onTop: () => void, onZoom: () => void, onLabels: (m: LabelMode) => void): HTMLElement {
  let mode: LabelMode = 'focus';
  const labels = h('button', { type: 'button', class: 'tool-btn', 'data-labels': '', title: 'Etiketler: yalnız seçili kap, hepsi veya kapalı' }, LABEL_TEXT[mode]);
  labels.addEventListener('click', () => {
    mode = NEXT[mode];
    labels.textContent = LABEL_TEXT[mode];
    onLabels(mode);
  });
  return h(
    'div',
    { class: 'lab-camera', role: 'group', 'aria-label': 'Kamera' },
    h('button', { type: 'button', class: 'tool-btn', 'data-view': 'overview', title: 'Tüm tezgâhı göster', onclick: onOverview }, 'Genel'),
    h('button', { type: 'button', class: 'tool-btn', 'data-view': 'top', title: 'Tezgâha yukarıdan bak', onclick: onTop }, 'Üstten'),
    h('button', { type: 'button', class: 'tool-btn', 'data-view': 'zoom', title: 'Seçili kaba yakınlaş (önce soldan bir kap seç)', onclick: onZoom }, 'Yakınlaştır'),
    labels,
  );
}

/** "Rehberli deney" / "Serbest tezgâh" tabs. */
export function createModeTabs(initial: 'guided' | 'free', onMode: (mode: 'guided' | 'free') => void): { el: HTMLElement; buttons: Map<string, HTMLButtonElement> } {
  const buttons = new Map<string, HTMLButtonElement>();
  const el = h('div', { class: 'lab-modes', role: 'tablist', 'aria-label': 'Çalışma biçimi' });
  for (const [id, label] of [['guided', 'Rehberli deney'], ['free', 'Serbest tezgâh']] as const) {
    const b = h('button', { type: 'button', class: 'tab', role: 'tab', 'data-mode': id, 'aria-selected': String(id === initial) }, label);
    b.addEventListener('click', () => onMode(id));
    buttons.set(id, b);
    el.append(b);
  }
  return { el, buttons };
}

/** Time-lapse factors (1x is real time). */
export function createLapse(onSpeed: (factor: number) => void): { el: HTMLElement; buttons: Map<number, HTMLButtonElement> } {
  const buttons = new Map<number, HTMLButtonElement>();
  const el = h('div', { class: 'lab-lapse', role: 'group', 'aria-label': 'Zaman atlaması' });
  for (const f of TIMELAPSE) {
    const b = h('button', { type: 'button', class: 'tool-btn', 'data-lapse': String(f), 'aria-pressed': String(f === 1), title: f === 1 ? 'Gerçek zaman' : `${f} kat hızlı` }, `${f}×`);
    b.addEventListener('click', () => onSpeed(f));
    buttons.set(f, b);
    el.append(b);
  }
  return { el, buttons };
}
