import { h, type AppState, type QualityMode } from '../core';
import { icon } from './icons';
import type { Component, UiContext } from './types';

const OPTIONS: { mode: QualityMode; label: string; hint: string }[] = [
  { mode: 'auto', label: 'Otomatik', hint: 'Cihazın hızına göre kendiliğinden ayarlanır' },
  { mode: 'low', label: 'Düşük', hint: 'Eski ve entegre ekran kartları için' },
  { mode: 'medium', label: 'Orta', hint: 'Çoğu bilgisayar için' },
  { mode: 'high', label: 'Yüksek', hint: 'Güçlü ekran kartları için' },
];

/** Header button with a small popover: the user-visible control for the quality presets. */
export function createSettingsMenu(ctx: UiContext): Component {
  const radios = new Map<QualityMode, HTMLInputElement>();
  const group = h('fieldset', { class: 'settings-group' }, h('legend', {}, 'Görüntü kalitesi'));
  for (const option of OPTIONS) {
    const input = h('input', { type: 'radio', name: 'quality-mode', value: option.mode, id: `q-${option.mode}` });
    input.addEventListener('change', () => ctx.actions.setQualityMode(option.mode));
    radios.set(option.mode, input);
    group.append(h('label', { class: 'settings-option', for: `q-${option.mode}` }, input, h('span', {}, h('b', {}, option.label), h('small', {}, option.hint))));
  }
  const note = h('p', { class: 'settings-note' }, 'Adres satırındaki quality= değeri bu seçimi geçersiz kılar.');
  note.hidden = !ctx.qualityLocked;
  const popover = h('div', { class: 'settings-popover', id: 'settings-popover', role: 'group', 'aria-label': 'Ayarlar' }, group, note);
  popover.hidden = true;
  const button = h('button', { class: 'nav-link settings-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'settings-popover' }, icon('gear'), 'Ayarlar');
  const el = h('div', { class: 'settings' }, button, popover);

  const setOpen = (open: boolean, restoreFocus = false): void => {
    popover.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) radios.get([...radios.keys()].find((k) => radios.get(k)?.checked) ?? 'auto')?.focus();
    else if (restoreFocus) button.focus();
  };
  button.addEventListener('click', () => setOpen(popover.hidden));
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !popover.hidden) {
      ev.stopPropagation();
      setOpen(false, true);
    }
  });
  document.addEventListener('pointerdown', (ev) => {
    if (!popover.hidden && ev.target instanceof Node && !el.contains(ev.target)) setOpen(false);
  });

  return {
    el,
    update(state: AppState): void {
      for (const [mode, input] of radios) {
        input.checked = state.qualityMode === mode;
        input.disabled = ctx.qualityLocked;
      }
    },
  };
}
