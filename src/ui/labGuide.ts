import { formatEquation, type ExperimentDef, type LabView, type ParticleScript } from '../chemlab';
import { h, Player, SPEEDS } from '../core';
import type { LevelId } from '../data/types';
import type { SimPrompt } from '../data/moduleTypes';
import { fmtClock } from './labParts';

export interface Guide {
  el: HTMLElement;
  explainBtn: HTMLButtonElement;
  setExperiment(exp: ExperimentDef | null, level: LevelId): void;
  /** Checks every step against the engine state; returns the ids of steps that became done since the last call. */
  refresh(view: LabView | null): { newlyDone: string[]; allDone: boolean };
}

/** "Rehberli deney": summary, safety reminder, the step checklist driven by `done(view)`, hints and "Nedenini göster". */
export function createGuide(onExplain: (exp: ExperimentDef) => void): Guide {
  const title = h('h3', { class: 'guide-title' });
  const summary = h('p', { class: 'guide-summary' });
  const virtual = h('p', { class: 'guide-virtual badge' }, 'Sanal deney: evde yapma. Güvenli değildir.');
  const safetyList = h('ul', {});
  const safety = h('details', { class: 'guide-safety', open: true }, h('summary', {}, 'Güvenlik hatırlatması'), safetyList);
  const steps = h('ol', { class: 'guide-steps', 'aria-label': 'Deney adımları' });
  const progress = h('p', { class: 'guide-progress', 'aria-live': 'polite' });
  const doneToggle = h('button', { type: 'button', class: 'tool-btn', 'data-toggle-done': '', 'aria-expanded': 'false' }, 'Tamamlananları göster');
  doneToggle.hidden = true;
  doneToggle.addEventListener('click', () => {
    const open = !steps.classList.contains('show-done');
    steps.classList.toggle('show-done', open);
    doneToggle.setAttribute('aria-expanded', String(open));
    doneToggle.textContent = open ? 'Tamamlananları gizle' : `Tamamlananları göster (${done.size})`;
  });
  const hintBtn = h('button', { type: 'button', class: 'tool-btn', 'data-hint': '' }, 'İpucu');
  const hint = h('p', { class: 'guide-hint', role: 'status' });
  const equations = h('div', { class: 'guide-equations' });
  const explainBtn = h('button', { type: 'button', class: 'primary-btn', 'data-explain': '', disabled: true }, 'Nedenini göster');
  const el = h('section', { class: 'guide', 'aria-labelledby': 'h-guide' }, h('h2', { class: 'card-title', id: 'h-guide' }, 'Rehberli deney'), title, summary, virtual, safety, progress, steps, doneToggle, h('div', { class: 'guide-buttons' }, hintBtn, explainBtn), hint, equations);
  let exp: ExperimentDef | null = null;
  let level: LevelId = 'ileri';
  let done = new Set<string>();
  let current = 0;
  let safetyCollapsed = false;

  const showHint = (): void => {
    const step = exp?.steps[current];
    hint.textContent = step ? step.hintTr : 'Tüm adımlar tamam. Sonucu Defter de oku.';
  };
  hintBtn.addEventListener('click', showHint);
  explainBtn.addEventListener('click', () => exp && onExplain(exp));

  return {
    el,
    explainBtn,
    setExperiment(next, lv): void {
      exp = next;
      level = lv;
      done = new Set();
      current = 0;
      hint.textContent = '';
      progress.textContent = '';
      safety.open = true;
      safetyCollapsed = false;
      steps.classList.remove('show-done');
      doneToggle.hidden = true;
      equations.replaceChildren();
      el.hidden = next === null;
      explainBtn.disabled = true;
      if (!next) return;
      title.textContent = `${next.no}. ${next.titleTr}`;
      summary.textContent = next.summaryTr;
      virtual.hidden = !next.virtualOnly;
      safetyList.replaceChildren(...next.safetyTr.map((t) => h('li', {}, t)));
      steps.replaceChildren(...next.steps.map((s, i) => h('li', { 'data-step': s.id, 'data-done': 'false', 'aria-current': i === 0 ? 'step' : undefined }, h('span', { class: 'step-state sr-only' }, 'Bekliyor. '), s.textTr)));
      explainBtn.hidden = next.particles.length === 0;
    },
    refresh(view): { newlyDone: string[]; allDone: boolean } {
      const newly: string[] = [];
      if (!exp || !view) return { newlyDone: newly, allDone: false };
      exp.steps.forEach((s, i) => {
        let ok = done.has(s.id);
        if (!ok) {
          try {
            ok = s.done(view);
          } catch {
            ok = false;
          }
          if (ok) {
            done.add(s.id);
            newly.push(s.id);
          }
        }
        const li = steps.children[i] as HTMLElement | undefined;
        li?.setAttribute('data-done', String(ok));
        const state = li?.querySelector('.step-state');
        if (state) state.textContent = ok ? 'Tamamlandı. ' : 'Bekliyor. ';
      });
      current = exp.steps.findIndex((s) => !done.has(s.id));
      if (current < 0) current = exp.steps.length;
      [...steps.children].forEach((li, i) => (i === current ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current')));
      const allDone = done.size === exp.steps.length;
      progress.textContent = allDone ? `Tüm adımlar tamam (${done.size}/${exp.steps.length})` : `Adım ${Math.min(current + 1, exp.steps.length)} / ${exp.steps.length}`;
      doneToggle.hidden = done.size === 0;
      if (!steps.classList.contains('show-done')) doneToggle.textContent = `Tamamlananları göster (${done.size})`;
      if (done.size > 0 && !safetyCollapsed) {
        safetyCollapsed = true;
        safety.open = false;
      }
      explainBtn.disabled = !allDone;
      if (allDone && equations.childElementCount === 0) {
        equations.append(
          h('h4', {}, 'Denklem'),
          ...exp.equations.map((eq) => h('p', { class: 'eq' }, `${eq.titleTr}: `, level === 'temel' && eq.wordTr ? eq.wordTr : formatEquation(eq.reactants, eq.products))),
        );
      }
      return { newlyDone: newly, allDone };
    },
  };
}

export interface ExplainerDock {
  el: HTMLElement;
  open(script: ParticleScript): void;
  close(): void;
  /** Advances the player with the real frame time. */
  tick(dt: number): void;
  readonly player: Player | null;
}

/** "Nedenini göster": the particle story of one reaction as a small timeline (play, pause, scrub, speed, stage captions). */
export function createExplainerDock(reducedMotion: boolean, onSeek: (t: number) => void, onClose: () => void): ExplainerDock {
  const caption = h('p', { class: 'explain-caption', 'aria-live': 'polite' });
  const counts = h('ul', { class: 'explain-counts', 'aria-label': 'Tanecik sayıları' });
  const playBtn = h('button', { type: 'button', class: 'dock-btn play', 'aria-label': 'Oynat', 'data-play': '' }, '▶');
  const slider = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: '0', class: 'scrub', 'aria-label': 'Açıklama zaman çizelgesi', 'data-scrub': '' });
  const time = h('span', { class: 'time' }, '00:00');
  const speed = h('select', { 'aria-label': 'Hız', 'data-speed': '' }, ...SPEEDS.map((s) => h('option', { value: String(s), selected: s === 1 }, `${s}x`)));
  const back = h('button', { type: 'button', class: 'primary-btn', 'data-back': '' }, 'Tezgâha dön');
  const title = h('h3', { class: 'explain-title' });
  const el = h('section', { class: 'explain-dock floating-keep', 'aria-label': 'Nedenini göster' }, title, caption, counts, h('div', { class: 'explain-controls' }, playBtn, slider, time, speed, back));
  el.hidden = true;
  let script: ParticleScript | null = null;
  let player: Player | null = null;
  let unsub: (() => void) | null = null;
  let lastStage = '';

  const render = (): void => {
    if (!script || !player) return;
    const t = player.time;
    const stage = script.stages.find((s) => t >= s.fromS && t < s.toS) ?? script.stages[script.stages.length - 1];
    if (document.activeElement !== slider) slider.value = String(t);
    slider.setAttribute('aria-valuetext', `${stage?.captionTr ?? ''}, ${fmtClock(t)}`);
    time.textContent = `${fmtClock(t)} / ${fmtClock(script.durationS)}`;
    playBtn.textContent = player.playing ? '⏸' : '▶';
    playBtn.setAttribute('aria-label', player.playing ? 'Duraklat' : 'Oynat');
    if (stage && stage.id !== lastStage) {
      lastStage = stage.id;
      caption.textContent = stage.captionTr;
      counts.replaceChildren(...script.species.map((sp) => h('li', {}, `${sp.labelTr}: ${stage.counts[sp.id] ?? 0}`)));
    }
    onSeek(t);
  };

  playBtn.addEventListener('click', () => player?.toggle());
  slider.addEventListener('input', () => player?.seek(Number(slider.value)));
  speed.addEventListener('change', () => player?.setSpeed(Number(speed.value)));
  back.addEventListener('click', () => dock.close());
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      dock.close();
    }
  });

  const dock: ExplainerDock = {
    el,
    get player() {
      return player;
    },
    open(next): void {
      script = next;
      unsub?.();
      player = new Player(next.durationS, next.stages.map((s) => ({ id: s.id, start: s.fromS, end: s.toS })), reducedMotion);
      unsub = player.subscribe(render);
      slider.max = String(next.durationS);
      title.textContent = next.titleTr;
      lastStage = '';
      el.hidden = false;
      render();
      slider.focus();
    },
    close(): void {
      if (el.hidden) return;
      el.hidden = true;
      unsub?.();
      unsub = null;
      player?.pause();
      player = null;
      script = null;
      onClose();
    },
    tick(dt): void {
      if (player?.playing) player.tick(dt);
    },
  };
  return dock;
}

export interface LabPrompt {
  el: HTMLElement;
  /** Shows a check; `done(correct)` runs after the learner continues. */
  show(prompt: SimPrompt, done: (correct: boolean) => void): void;
  hide(): void;
  readonly open: boolean;
}

/** "Kendini dene" after a guided step (only when Sorular is on). */
export function createLabPrompt(): LabPrompt {
  const body = h('div', { class: 'prompt', role: 'dialog', 'aria-label': 'Soru' });
  const el = h('div', { class: 'prompt-overlay floating-keep', 'data-lab-prompt': '' }, body);
  el.hidden = true;
  return {
    el,
    get open() {
      return !el.hidden;
    },
    hide(): void {
      el.hidden = true;
      body.replaceChildren();
    },
    show(prompt, done): void {
      el.hidden = false;
      let answered: number | null = null;
      const render = (): void => {
        body.replaceChildren(
          h('p', { class: 'q' }, prompt.promptTr),
          h('div', { class: 'options', role: 'group' }, ...prompt.options.map((text, i) => h('button', { type: 'button', class: `option${answered !== null && i === prompt.correctIndex ? ' right' : ''}${answered === i && i !== prompt.correctIndex ? ' wrong' : ''}`, disabled: answered !== null, onclick: () => { answered = i; render(); } }, text))),
          ...(answered !== null
            ? [h('p', { class: 'feedback', role: 'status' }, `${answered === prompt.correctIndex ? 'Doğru! ' : 'Tam değil. '}${prompt.explanationTr}`), h('button', { type: 'button', class: 'primary-btn', 'data-continue': '', onclick: () => { el.hidden = true; done(answered === prompt.correctIndex); } }, 'Devam et')]
            : []),
        );
        body.querySelector<HTMLElement>('.option:not(:disabled), [data-continue]')?.focus();
      };
      render();
    },
  };
}
