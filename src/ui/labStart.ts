import { getExperiment } from '../chemlab';
import { h } from '../core';
import type { LevelId } from '../data/types';
import { experimentList } from '../scene';

/** Rough minutes of a guided experiment: about a minute and a half per step (a teaching estimate, not a measurement). */
export const minutesOf = (stepCount: number): number => Math.max(3, Math.round(stepCount * 1.5));

export interface StartCard {
  el: HTMLElement;
  /** Shows the card; `last` is the remembered choice (experiment id, 'serbest' or null). */
  open(last: string | null): void;
  close(): void;
  readonly isOpen: boolean;
}

/**
 * First-run start card over the bench: ten experiment cards (number, title, Temel / İleri, Sanal, about N dk), the free
 * bench, a "Deney 1'e başla" button and, when a choice is remembered, a way back to it. Dismissible (×, Esc): the lab then
 * stays on the experiment that is already loaded. `onPick(id | null)` loads an experiment (null = free bench).
 */
export function createStartCard(level: LevelId, introTr: string, onPick: (id: string | null) => void): StartCard {
  const first = experimentList()[0];
  const grid = h('div', { class: 'start-grid', role: 'list' });
  const cards = new Map<string, HTMLButtonElement>();
  const make = (key: string, no: string, title: string, badges: HTMLElement[], note: string, disabled: boolean, onClick: () => void): HTMLButtonElement => {
    const b = h('button', { type: 'button', class: 'start-item', role: 'listitem', 'data-start': key, disabled, title: disabled ? 'Bu deney bu seviyede yok; üstteki Temel / İleri düğmesinden seviyeyi değiştir.' : '' }, h('b', { class: 'start-no' }, no), h('span', { class: 'start-title' }, title), h('span', { class: 'exp-badges' }, ...badges), h('small', {}, note));
    b.addEventListener('click', onClick);
    cards.set(key, b);
    return b;
  };
  for (const e of experimentList()) {
    const def = getExperiment(e.id);
    const badges = [...(def?.levels ?? []).map((l) => h('span', { class: 'badge' }, l === 'temel' ? 'Temel' : 'İleri')), ...(def?.virtualOnly ? [h('span', { class: 'badge virtual' }, 'Sanal')] : [])];
    grid.append(make(e.id, `${e.no}.`, e.titleTr, badges, `yaklaşık ${minutesOf(def?.steps.length ?? 4)} dk`, !(def?.levels.includes(level) ?? true), () => choose(e.id)));
  }
  grid.append(make('serbest', '+', 'Serbest tezgâh', [], 'kendi denemeni yap', false, () => choose(null)));
  const startBtn = h('button', { type: 'button', class: 'primary-btn', 'data-start-first': '' }, "Deney 1'e başla");
  const resumeBtn = h('button', { type: 'button', class: 'tool-btn', 'data-start-resume': '' }, 'Kaldığım yerden devam et');
  resumeBtn.hidden = true;
  const closeBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Kartı kapat', title: 'Kapat (Esc)', 'data-start-close': '' }, '×');
  const title = h('h2', { id: 'start-title' }, 'Kimya Laboratuvarı');
  const el = h('section', { class: 'start-card floating-keep', role: 'dialog', 'aria-labelledby': 'start-title', 'data-start-card': '' }, h('div', { class: 'start-head' }, title, closeBtn), h('p', {}, introTr), grid, h('div', { class: 'start-buttons' }, startBtn, resumeBtn));
  el.hidden = true;
  let resumeKey: string | null = null;

  const card: StartCard = {
    el,
    get isOpen() {
      return !el.hidden;
    },
    open(last): void {
      resumeKey = last;
      for (const [key, b] of cards) b.classList.toggle('last', key === last);
      resumeBtn.hidden = !last || last === first?.id;
      resumeBtn.textContent = last === 'serbest' ? 'Serbest tezgâha dön' : 'Kaldığım deneyden devam et';
      el.hidden = false;
      startBtn.focus();
    },
    close(): void {
      el.hidden = true;
    },
  };
  const choose = (id: string | null): void => {
    card.close();
    onPick(id);
  };
  startBtn.addEventListener('click', () => choose(first?.id ?? null));
  resumeBtn.addEventListener('click', () => choose(resumeKey === 'serbest' ? null : resumeKey));
  closeBtn.addEventListener('click', () => card.close());
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      card.close();
    }
  });
  return card;
}
