import { h, shortName, type AppState, type Catalog } from '../core';
import type { LoadProgress } from '../scene';

const PHASES: { id: LoadProgress['phase']; label: string }[] = [
  { id: 'models', label: 'Modeller' },
  { id: 'textures', label: 'Dokular' },
  { id: 'scene', label: 'Sahne hazırlanıyor' },
];
/** The loading screen only appears when loading takes longer than this: cached visits never flash it. */
const SHOW_DELAY_MS = 300;
const TIP_MS = 4800;

/** Overall 0..1 from the phase: models 60 %, textures 30 %, the last 10 % is assembling the scene. */
export function overallProgress(p: LoadProgress): number {
  if (p.phase === 'models') return 0.6 * p.fraction;
  if (p.phase === 'textures') return 0.6 + 0.3 * p.fraction;
  return 0.9 + 0.1 * p.fraction;
}

/**
 * "Biliyor muydun?" tips from the data only (no new claims): at İleri the organelles' fun facts, at Temel their short
 * taglines, because some fun facts go beyond the 5th grade programme.
 */
export function loadingTips(catalog: Catalog, state: Pick<AppState, 'level' | 'cellId'>): string[] {
  const infos = catalog.organellesOf(catalog.cell(state.cellId), state.level);
  const tips = infos.flatMap((o) => (state.level === 'ileri' ? (o.funFact ? [o.funFact] : []) : [`${shortName(o.nameTr)}: ${o.tagline}`]));
  return tips.slice(0, 12);
}

export interface LoadingScreen {
  el: HTMLElement;
  /** Phase progress, or null when loading is done. */
  setProgress(progress: LoadProgress | null): void;
  /** A plain message instead of the progress (graphics connection lost), or null to clear it. */
  setStatus(text: string | null): void;
  setTips(tips: string[]): void;
}

export function createLoadingScreen(reducedMotion: boolean): LoadingScreen {
  const phaseItems = new Map<LoadProgress['phase'], HTMLElement>();
  const phaseList = h('ol', { class: 'load-phases' });
  for (const phase of PHASES) {
    const li = h('li', {}, phase.label);
    phaseItems.set(phase.id, li);
    phaseList.append(li);
  }
  const fill = h('i');
  const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Yükleme durumu', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, fill);
  const title = h('h3', {}, 'Hücre hazırlanıyor…');
  const tipText = h('p', { class: 'tip-text', 'aria-live': 'off' });
  const tipBox = h('div', { class: 'load-tip' }, h('b', {}, 'Biliyor muydun?'), tipText);
  const el = h('div', { class: 'loading', role: 'status', 'aria-live': 'polite' }, title, phaseList, bar, tipBox, h('small', {}, 'Bilim Atölyesi · © gkaragoz and Contributors'));
  el.hidden = true;

  let tips: string[] = [];
  let tipIndex = 0;
  let tipTimer: ReturnType<typeof setInterval> | undefined;
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hiding = false;
  const nextTip = (): void => {
    tipBox.hidden = tips.length === 0;
    if (tips.length === 0) return;
    if (!reducedMotion) tipText.classList.remove('in');
    tipText.textContent = tips[tipIndex % tips.length] ?? '';
    tipIndex++;
    if (!reducedMotion) requestAnimationFrame(() => tipText.classList.add('in'));
  };
  const reveal = (): void => {
    el.hidden = false;
    nextTip();
    clearInterval(tipTimer);
    tipTimer = setInterval(nextTip, TIP_MS);
  };
  const hide = (): void => {
    clearTimeout(showTimer);
    showTimer = undefined;
    hiding = false;
    clearInterval(tipTimer);
    el.hidden = true;
    phaseList.hidden = false;
  };

  return {
    el,
    setTips(list: string[]): void {
      tips = list;
      tipIndex = 0;
    },
    setProgress(progress: LoadProgress | null): void {
      if (progress === null) {
        // A visible screen first shows its last frame (100 %, every phase done) for a moment, then goes.
        if (!el.hidden && !reducedMotion) {
          fill.style.width = '100%';
          bar.setAttribute('aria-valuenow', '100');
          for (const li of phaseItems.values()) li.className = 'done';
          clearTimeout(showTimer);
          hiding = true;
          showTimer = setTimeout(hide, 350);
          return;
        }
        hide();
        return;
      }
      if (hiding) {
        // A new load started while the last frame was still showing: keep the screen.
        hiding = false;
        clearTimeout(showTimer);
        showTimer = undefined;
      }
      title.textContent = 'Hücre hazırlanıyor…';
      const pct = Math.round(overallProgress(progress) * 100);
      fill.style.width = `${pct}%`;
      bar.setAttribute('aria-valuenow', String(pct));
      let reached = false;
      for (const phase of PHASES) {
        const li = phaseItems.get(phase.id) as HTMLElement;
        const current = phase.id === progress.phase;
        reached = reached || current;
        li.className = current ? 'now' : reached ? '' : 'done';
        if (current) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      }
      if (el.hidden && showTimer === undefined) showTimer = setTimeout(reveal, SHOW_DELAY_MS);
    },
    setStatus(text: string | null): void {
      if (text === null) {
        hide();
        return;
      }
      clearTimeout(showTimer);
      title.textContent = text;
      fill.style.width = '100%';
      phaseList.hidden = true;
      tipBox.hidden = true;
      el.hidden = false;
    },
  };
}
