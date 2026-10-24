import type { JournalEntry, LabSim, SimMeasurement } from '../chemlab';
import { h } from '../core';

export const fmtClock = (t: number): string => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const KIND_LABEL: Record<JournalEntry['kind'], string> = {
  action: 'Eylem',
  observation: 'Gözlem',
  measurement: 'Ölçüm',
  warning: 'Uyarı',
  blocked: 'Engellendi',
};

/** One Defter line: a journal entry, or several amounts of the same kind added to one vessel merged into a running total. */
export interface DefterLine {
  t: number;
  kind: JournalEntry['kind'];
  textTr: string;
  /** How many journal lines it stands for. */
  count: number;
}

const AMOUNT = /^(\d+(?:[.,]\d+)?) (mL|g) (.+?)\.?$/;
const fmtAmount = (n: number): string => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

/**
 * Journal to Defter lines. Pouring or dripping in several chunks writes one engine line per chunk ("20.0 mL Sirke ...
 * eklendi."); the notebook shows them as one line that keeps updating ("Sirke ... eklendi. (toplam 85 mL)") as long as
 * the same kind of addition to the same vessel continues within `windowS` simulated seconds. Other lines are untouched.
 */
export function mergeLines(log: readonly JournalEntry[], windowS = 4): DefterLine[] {
  const out: DefterLine[] = [];
  let open: { line: DefterLine; key: string; vessel: string | undefined; unit: string; rest: string; total: number; last: number } | null = null;
  for (const e of log) {
    const m = e.kind === 'action' ? AMOUNT.exec(e.textTr) : null;
    if (m) {
      const amount = Number((m[1] as string).replace(',', '.'));
      const unit = m[2] as string;
      const rest = m[3] as string;
      const key = `${e.vessel ?? ''}|${unit}|${rest}`;
      if (open && open.key === key && e.t - open.last <= windowS) {
        open.total += amount;
        open.last = e.t;
        open.line.count++;
        open.line.textTr = `${open.rest}. (toplam ${fmtAmount(open.total)} ${open.unit})`;
        continue;
      }
      const line: DefterLine = { t: e.t, kind: e.kind, textTr: e.textTr, count: 1 };
      out.push(line);
      open = { line, key, vessel: e.vessel, unit, rest, total: amount, last: e.t };
      continue;
    }
    if (e.kind === 'action') open = null;
    out.push({ t: e.t, kind: e.kind, textTr: e.textTr, count: 1 });
  }
  return out;
}

export interface Defter {
  el: HTMLElement;
  /** Re-reads the journal; returns the texts of lines added since the last call (for the live announcement). */
  refresh(lab: LabSim): string[];
  /** Plain text of the whole notebook (the copy button). */
  text(lab: LabSim): string;
  setCollapsed(collapsed: boolean): void;
}

/** The lab notebook: timestamped journal lines (click one to replay that moment), collapsible, with a copy button. */
export function createDefter(onReplay: (t: number) => void, onCopy: (text: string) => void): Defter {
  const list = h('ol', { class: 'defter-list', 'aria-label': 'Defter satırları' });
  const empty = h('p', { class: 'empty-note' }, 'Henüz bir kayıt yok. Bir şey yaptığında ve bir şey gözlediğinde buraya yazılır.');
  const body = h('div', { class: 'defter-body' }, empty, list);
  const copyBtn = h('button', { type: 'button', class: 'tool-btn', 'data-copy': '' }, 'Metni kopyala');
  const toggle = h('button', { type: 'button', class: 'icon-btn', 'aria-expanded': 'true', 'aria-controls': 'defter-body', 'aria-label': 'Defteri daralt', title: 'Defteri daralt / aç' }, '›');
  body.id = 'defter-body';
  const el = h('section', { class: 'defter floating', 'aria-labelledby': 'h-defter' }, h('div', { class: 'defter-head' }, h('h2', { class: 'card-title', id: 'h-defter' }, 'Defter'), copyBtn, toggle), body);
  let rendered = 0;
  let rawSeen = 0;
  let lastLab: LabSim | null = null;

  const setCollapsed = (collapsed: boolean): void => {
    body.hidden = collapsed;
    el.classList.toggle('collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.textContent = collapsed ? '‹' : '›';
    toggle.setAttribute('aria-label', collapsed ? 'Defteri aç' : 'Defteri daralt');
  };
  toggle.addEventListener('click', () => setCollapsed(!body.hidden));
  const line = (e: DefterLine): string => `${fmtClock(e.t)} ${KIND_LABEL[e.kind]}: ${e.textTr}`;
  const text = (lab: LabSim): string => mergeLines(lab.journal).map(line).join('\n');
  copyBtn.addEventListener('click', () => {
    if (lastLab) onCopy(text(lastLab));
  });

  return {
    el,
    setCollapsed,
    text,
    refresh(lab): string[] {
      lastLab = lab;
      const log = lab.journal;
      const fresh: string[] = [];
      if (log.length < rawSeen) {
        list.replaceChildren();
        rendered = 0;
        rawSeen = 0;
      }
      const merged = mergeLines(log);
      // the last rendered line may have grown (a running total); everything after it is new
      const from = Math.max(0, rendered - 1);
      for (let i = from; i < merged.length; i++) {
        const e = merged[i] as DefterLine;
        const li = list.children[i] as HTMLElement | undefined;
        if (li) {
          const text = li.querySelector('.defter-text');
          if (text && text.textContent !== e.textTr) text.textContent = e.textTr;
          continue;
        }
        const btn = h('button', { type: 'button', class: 'defter-line', title: 'Bu ana geri dön', onclick: () => onReplay(e.t) }, h('time', { datetime: `PT${Math.round(e.t)}S` }, fmtClock(e.t)), h('span', { class: `kind kind-${e.kind}` }, KIND_LABEL[e.kind]), h('span', { class: 'defter-text' }, e.textTr));
        list.append(h('li', { 'data-kind': e.kind }, btn));
      }
      // announce only what is new in the raw journal (merging must not repeat or hide an observation)
      for (let i = rawSeen; i < log.length; i++) {
        const e = log[i] as JournalEntry;
        if (e.kind !== 'action') fresh.push(e.textTr);
      }
      rawSeen = log.length;
      rendered = merged.length;
      empty.hidden = merged.length > 0;
      if (fresh.length > 0) body.scrollTop = body.scrollHeight;
      return fresh;
    },
  };
}

export interface Measurements {
  el: HTMLElement;
  refresh(items: readonly SimMeasurement[]): void;
}

/** Balance, thermometers, pH and volumes grouped by vessel; one card per vessel, values updated in place. */
export function createMeasurements(): Measurements {
  const body = h('div', { class: 'meas-body' });
  const el = h('section', { class: 'measurements floating', 'aria-labelledby': 'h-meas' }, h('h2', { class: 'card-title', id: 'h-meas' }, 'Ölçümler'), body);
  const values = new Map<string, HTMLElement>();
  let signature = '';
  const unit = (m: SimMeasurement): string => (m.unit ? ` ${m.unit}` : '');
  return {
    el,
    refresh(items): void {
      const sig = items.map((m) => m.id).join('|');
      if (sig !== signature) {
        signature = sig;
        values.clear();
        const groups = new Map<string, SimMeasurement[]>();
        for (const m of items) {
          const key = m.id.includes(':') ? (m.id.split(':')[1] as string) : m.id;
          groups.set(key, [...(groups.get(key) ?? []), m]);
        }
        body.replaceChildren(
          ...[...groups].map(([key, ms]) =>
            h(
              'dl',
              { class: 'meas-card', 'data-group': key },
              ...ms.flatMap((m) => {
                const dd = h('dd', {}, '');
                values.set(m.id, dd);
                return [h('dt', {}, m.labelTr), dd];
              }),
            ),
          ),
        );
      }
      for (const m of items) {
        const dd = values.get(m.id);
        if (dd) dd.textContent = `${typeof m.value === 'number' ? m.value.toLocaleString('tr-TR') : m.value}${unit(m)}`;
      }
    },
  };
}

/** Writes text to the clipboard (async API first, a hidden textarea as the fallback). */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0' });
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
};
