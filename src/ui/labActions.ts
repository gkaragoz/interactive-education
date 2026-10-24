import { getReagent, type Hazard } from '../chemlab';
import { h } from '../core';
import type { SimActionResult, SimCommand, SimInteractions, SimItem } from '../scene';

const HAZARDS: Record<Hazard, { glyph: string; labelTr: string }> = {
  corrosive: { glyph: 'A', labelTr: 'Aşındırıcı' },
  flammable: { glyph: 'Y', labelTr: 'Yanıcı' },
  oxidiser: { glyph: 'O', labelTr: 'Yükseltgen' },
  toxic: { glyph: 'Z', labelTr: 'Zehirli' },
  irritant: { glyph: '!', labelTr: 'Tahriş edici' },
};

/** GHS-style diamonds with a letter; colour is never the only carrier (text name in the label and title). */
export function hazardBadges(hazards: readonly Hazard[]): HTMLElement {
  const wrap = h('span', { class: 'haz-list' });
  for (const hz of hazards) {
    const info = HAZARDS[hz];
    wrap.append(h('span', { class: `haz haz-${hz}`, role: 'img', 'aria-label': `Tehlike: ${info.labelTr}`, title: info.labelTr }, info.glyph));
  }
  return wrap;
}

export interface ActionCallbacks {
  /** An action ran (ok or refused); the view refreshes, checkpoints the history and announces. */
  onRun(result: SimActionResult, summaryTr: string): void;
  /** The item under the keyboard focus changed (draw the highlight in 3D). */
  onFocus(id: string | null): void;
  /** The selected item changed (null: none): the lab view points the camera and the label at it. */
  onSelect?(id: string | null): void;
}

export interface ActionPanel {
  /** Item lists by group heading: 'Kaplar' (Malzeme dolabı) and 'Reaktifler'. */
  lists: { equipment: HTMLElement; reagents: HTMLElement };
  /** The command form for the selected item. */
  panel: HTMLElement;
  refresh(): void;
  select(id: string | null): void;
}

/**
 * The keyboard and menu path: pick an item (list), pick a command, pick a target and an amount, confirm with
 * "Uygula". It is the accessible twin of drag and drop and talks to the sim only through `SimInteractions`.
 */
export function createActionPanel(inter: SimInteractions, cb: ActionCallbacks): ActionPanel {
  const equipment = h('div', { class: 'lab-list', role: 'listbox', 'aria-label': 'Malzeme dolabı: kaplar', 'aria-orientation': 'vertical' });
  const reagents = h('div', { class: 'lab-list', role: 'listbox', 'aria-label': 'Reaktifler', 'aria-orientation': 'vertical' });
  const panel = h('section', { class: 'lab-actions', 'aria-label': 'Eylemler' });
  let selected: string | null = null;
  const buttons = new Map<string, HTMLButtonElement>();

  const itemButton = (item: SimItem): HTMLButtonElement => {
    const reagent = getReagent(item.id);
    const btn = h('button', { type: 'button', class: 'lab-item', role: 'option', 'aria-selected': 'false', 'data-item': item.id, title: item.hintTr }, h('span', { class: 'lab-item-name' }, item.labelTr), reagent ? hazardBadges(reagent.hazards) : null, reagent?.virtualOnly ? h('span', { class: 'badge' }, 'Sanal') : null);
    btn.addEventListener('click', () => select(selected === item.id ? null : item.id));
    btn.addEventListener('focus', () => cb.onFocus(item.id));
    btn.addEventListener('blur', () => cb.onFocus(null));
    btn.addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
      const list = [...(btn.parentElement?.querySelectorAll<HTMLButtonElement>('.lab-item') ?? [])];
      const next = list[list.indexOf(btn) + (ev.key === 'ArrowDown' ? 1 : -1)];
      if (next) {
        ev.preventDefault();
        next.focus();
      }
    });
    buttons.set(item.id, btn);
    return btn;
  };

  const renderForm = (id: string, cmd: SimCommand, itemLabel: string): HTMLElement => {
    const form = h('form', { class: 'lab-form', 'aria-label': `${cmd.labelTr}: ${itemLabel}` });
    let target: HTMLSelectElement | null = null;
    let amount: HTMLInputElement | null = null;
    let choice: HTMLSelectElement | null = null;
    if (cmd.targets) {
      target = h('select', { 'aria-label': 'Hedef kap', 'data-field': 'target' }, ...cmd.targets.map((t) => h('option', { value: t.id }, t.labelTr)));
      form.append(h('label', {}, 'Hedef ', target));
    }
    if (cmd.amount) {
      amount = h('input', { type: 'number', min: String(cmd.amount.min), max: String(cmd.amount.max), step: String(cmd.amount.step), value: String(cmd.amount.default), 'aria-label': `Miktar (${cmd.amount.unit})`, 'data-field': 'amount' });
      form.append(h('label', {}, 'Miktar ', amount, ` ${cmd.amount.unit}`));
    }
    if (cmd.choices) {
      choice = h('select', { 'aria-label': 'Seçenek', 'data-field': 'choice' }, ...cmd.choices.map((c) => h('option', { value: c.id }, c.labelTr)));
      form.append(h('label', {}, 'Seçenek ', choice));
    }
    form.append(h('button', { type: 'submit', class: 'primary-btn', 'data-apply': '' }, 'Uygula'));
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      run(id, cmd, { targetId: target?.value, amount: amount ? Number(amount.value) : undefined, choice: choice?.value }, itemLabel);
    });
    return form;
  };

  const run = (id: string, cmd: SimCommand, args: { targetId?: string; amount?: number; choice?: string }, itemLabel: string): void => {
    const res = inter.run(id, cmd.id, args);
    const targetLabel = cmd.targets?.find((t) => t.id === args.targetId)?.labelTr;
    const summary = `${itemLabel}: ${cmd.labelTr}${targetLabel ? ` → ${targetLabel}` : ''}${args.amount !== undefined && cmd.amount ? ` (${args.amount} ${cmd.amount.unit})` : ''}`;
    result.textContent = res.messageTr ?? (res.ok ? `${summary}: yapıldı.` : `${summary}: yapılamadı.`);
    result.classList.toggle('bad', !res.ok);
    cb.onRun(res, summary);
  };

  const result = h('p', { class: 'lab-result', role: 'status', 'aria-live': 'polite' });

  const select = (id: string | null): void => {
    selected = id;
    result.textContent = '';
    cb.onSelect?.(id);
    for (const [bid, btn] of buttons) btn.setAttribute('aria-selected', String(bid === id));
    panel.replaceChildren();
    if (!id) {
      panel.append(h('p', { class: 'empty-note' }, 'Bir kap veya reaktif seç; sonra yapmak istediğin eylemi seç.'));
      return;
    }
    const item = inter.items().find((i) => i.id === id);
    const label = item?.labelTr ?? id;
    const form = h('div', { class: 'lab-form-slot' });
    const cmds = inter.commands(id);
    const cmdBar = h('div', { class: 'lab-cmds', role: 'group', 'aria-label': `${label}: eylemler` });
    for (const cmd of cmds) {
      const needs = Boolean(cmd.targets || cmd.amount || cmd.choices);
      const b = h('button', { type: 'button', class: 'lab-cmd', 'data-cmd': cmd.id, 'aria-pressed': 'false' }, cmd.labelTr);
      b.addEventListener('click', () => {
        for (const other of cmdBar.querySelectorAll('button')) other.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-pressed', 'true');
        if (needs) {
          form.replaceChildren(renderForm(id, cmd, label));
          form.querySelector<HTMLElement>('select, input')?.focus();
        } else {
          form.replaceChildren();
          run(id, cmd, {}, label);
        }
      });
      cmdBar.append(b);
    }
    panel.append(h('h3', { class: 'lab-actions-title' }, label), cmdBar, form, result);
  };

  const refresh = (): void => {
    buttons.clear();
    const items = inter.items();
    equipment.replaceChildren(...items.filter((i) => i.group !== 'Reaktifler').map(itemButton));
    reagents.replaceChildren(...items.filter((i) => i.group === 'Reaktifler').map(itemButton));
    if (selected && !items.some((i) => i.id === selected)) selected = null;
    select(selected);
  };
  refresh();
  return { lists: { equipment, reagents }, panel, refresh, select };
}
