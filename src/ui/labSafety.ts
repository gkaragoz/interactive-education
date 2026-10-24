import { getExperiment } from '../chemlab';
import { h } from '../core';
import { blockedCombos, getSource, homeAttemptTable, ppeItems, safetyRules, type HomeVerdict } from '../data';

const VERDICT: Record<HomeVerdict, { label: string; hint: string }> = {
  gozetimle: { label: 'Gözetimle', hint: 'Yalnızca bir büyüğün gözetiminde' },
  hayir: { label: 'Hayır', hint: 'Evde denenmez' },
  asla: { label: 'Asla', hint: 'Gözetimle bile evde denenmez' },
};

const sourceLink = (id: string): HTMLElement => {
  const s = getSource(id);
  return s ? h('a', { class: 'src-link', href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title) : h('span', { class: 'src-link' }, id);
};

export interface SafetySheet {
  el: HTMLElement;
  /** Opens the sheet; `onClose` runs when it is dismissed (the first-visit flow continues with the start card). */
  open(extraLinesTr?: string[], onClose?: () => void): void;
  close(): void;
  readonly isOpen: boolean;
}

/**
 * "Güvenlik": the lab's safety content (`src/data/chemlabSafety.ts`) as one sheet: the rules, protective equipment,
 * the "evde deneme" table with verdict badges (colour plus text, never colour alone), the combinations the engine
 * refuses, and a source for every line. An accessible modal dialog: focus moves in, Esc closes, focus goes back.
 */
export function createSafetySheet(): SafetySheet {
  const lines = h('ul', { class: 'safety-extra' });
  const table = h(
    'table',
    { class: 'safety-table' },
    h('caption', {}, 'Evde deneme tablosu'),
    h('thead', {}, h('tr', {}, ...['Deney', 'Karar', 'Neden'].map((t) => h('th', { scope: 'col' }, t)))),
    h(
      'tbody',
      {},
      ...homeAttemptTable.map((a) =>
        h(
          'tr',
          { 'data-home-experiment': a.experimentId },
          h('th', { scope: 'row' }, getExperiment(a.experimentId)?.titleTr ?? a.experimentId),
          h('td', {}, h('span', { class: `verdict verdict-${a.verdict}`, title: VERDICT[a.verdict].hint }, VERDICT[a.verdict].label), h('p', {}, a.textTr)),
          h('td', {}, a.reasonTr, ' ', sourceLink(a.sourceId)),
        ),
      ),
    ),
  );
  const close = h('button', { type: 'button', class: 'primary-btn', 'data-safety-close': '' }, 'Anladım');
  const title = h('h2', { id: 'safety-sheet-title' }, 'Laboratuvar güvenliği');
  const body = h(
    'div',
    { class: 'safety-body' },
    h('p', { class: 'safety-intro' }, 'Sanal laboratuvarda hiçbir şey sana zarar veremez, ama gerçek bir laboratuvarda bu kurallar hayat kurtarır. Gerçek deneyleri yalnızca öğretmeninin gözetiminde yap.'),
    lines,
    h('section', {}, h('h3', {}, 'Kurallar'), h('ol', {}, ...safetyRules.map((r) => h('li', {}, r.textTr, ' ', sourceLink(r.sourceId))))),
    h('section', {}, h('h3', {}, 'Koruyucu donanım'), h('ul', {}, ...ppeItems.map((p) => h('li', {}, h('b', {}, `${p.nameTr}: `), p.whenTr, ' ', sourceLink(p.sourceId))))),
    h('section', {}, table),
    h('section', {}, h('h3', {}, 'Asla karıştırma'), h('ul', {}, ...blockedCombos.map((c) => h('li', {}, h('b', {}, `${c.titleTr}. `), c.lessonTr, ' ', sourceLink(c.sourceId))))),
  );
  const el = h('div', { class: 'safety-sheet floating-keep', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'safety-sheet-title', 'data-safety-sheet': '' }, title, body, close);
  el.hidden = true;
  let back: HTMLElement | null = null;
  let done: (() => void) | undefined;
  const sheet: SafetySheet = {
    el,
    get isOpen() {
      return !el.hidden;
    },
    open(extra = [], onClose): void {
      back = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      done = onClose;
      lines.replaceChildren(...extra.map((t) => h('li', {}, t)));
      lines.hidden = extra.length === 0;
      el.hidden = false;
      body.scrollTop = 0;
      close.focus();
    },
    close(): void {
      if (el.hidden) return;
      el.hidden = true;
      back?.focus();
      const cb = done;
      done = undefined;
      cb?.();
    },
  };
  close.addEventListener('click', () => sheet.close());
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      sheet.close();
    }
  });
  return sheet;
}
