import type { ExperimentDef, ParticleScript } from '../chemlab';
import { h, ModuleSession, phaseText, SPEEDS } from '../core';
import type { ModuleInfo } from '../data/moduleTypes';
import type { LevelId } from '../data/types';
import { createExplainerDock } from './labGuide';
import { fmtClock } from './labParts';
import { createPromptPanel } from './modulePrompts';

export interface Explainer {
  el: HTMLElement;
  /** Opens "Nedenini göster" for an experiment: the level-aware timeline track when the content has one, else the engine's captions. */
  open(exp: ExperimentDef, script: ParticleScript): void;
  close(): void;
  /** Real frame time: advances the player and fires the prompts. */
  tick(dt: number): void;
  /** Sorular setting. */
  setQuestions(on: boolean): void;
  readonly isOpen: boolean;
}

export interface ExplainerHooks {
  /** Time inside the particle script (seconds) to pose the 3D explainer at. */
  onSeek(t: number): void;
  onClose(): void;
}

/**
 * The explainer dock. With the content agent's `ModuleInfo` for the lab (tracks whose ids are the engine experiment ids)
 * it behaves like a timeline module: phase card with the level's text, segments, scrub bar with pause markers, speed,
 * step buttons, and the "Kendini dene" list plus the checks and predicts that pause the animation (only when Sorular is
 * on). The track has a macro (Gözlem) layer before the particle layer; the 3D scene is posed from the start of the first
 * particle stage on. Without a track the dock falls back to the engine's stage captions.
 */
export function createExplainer(timeline: ModuleInfo | null, level: LevelId, reducedMotion: boolean, hooks: ExplainerHooks): Explainer {
  const fallback = createExplainerDock(reducedMotion, hooks.onSeek, () => hooks.onClose());
  const host = h('div', { class: 'explainer' }, fallback.el);
  let session: ModuleSession | null = null;
  let unsub: (() => void)[] = [];
  let questionsOn = true;
  let panel: HTMLElement | null = null;
  let isOpen = false;

  const closeTimeline = (): void => {
    for (const fn of unsub) fn();
    unsub = [];
    session?.player.pause();
    session = null;
    panel?.remove();
    panel = null;
  };

  const openTimeline = (exp: ExperimentDef, script: ParticleScript): boolean => {
    const track = timeline?.tracks.find((t) => t.id === exp.id);
    if (!timeline || !track) return false;
    session = new ModuleSession(timeline, exp.id, level, reducedMotion);
    session.setQuestionsEnabled(questionsOn);
    const s = session;
    const first = s.phases.find((p) => p.id === script.stages[0]?.id);
    const offset = first?.start ?? 0;

    const title = h('h3', { class: 'explain-title' }, s.track.nameTr);
    const phaseTitle = h('h4', { class: 'phase-title' });
    const summary = h('p', { class: 'explain-caption', 'aria-live': 'polite' });
    const details = h('ul', { class: 'explain-details' });
    const playBtn = h('button', { type: 'button', class: 'dock-btn play', 'aria-label': 'Oynat', 'data-play': '' }, '▶');
    const prev = h('button', { type: 'button', class: 'dock-btn', 'aria-label': 'Önceki evre', 'data-prev': '' }, '⏮');
    const next = h('button', { type: 'button', class: 'dock-btn', 'aria-label': 'Sonraki evre', 'data-next': '' }, '⏭');
    const slider = h('input', { type: 'range', min: '0', max: String(s.track.duration), step: '0.05', value: '0', class: 'scrub', 'aria-label': 'Açıklama zaman çizelgesi', 'data-scrub': '' });
    const segments = h('div', { class: 'segments', 'aria-hidden': 'true' });
    for (const p of s.phases) segments.append(h('button', { type: 'button', class: 'segment', tabindex: -1, style: `flex:${Math.max(p.end - p.start, 0.1)}`, title: p.nameTr, onclick: () => s.player.seek(p.start) }, h('span', {}, p.nameTr)));
    const markers = h('div', { class: 'markers', 'aria-hidden': 'true' });
    for (const q of s.questions) markers.append(h('span', { class: 'marker', style: `left:${(q.atTime / s.track.duration) * 100}%`, title: `${Math.round(q.atTime)}. sn: ${q.promptTr}` }));
    const time = h('span', { class: 'time' }, '00:00');
    const speed = h('select', { 'aria-label': 'Hız', 'data-speed': '' }, ...SPEEDS.map((v) => h('option', { value: String(v), selected: v === 1 }, `${v}x`)));
    const back = h('button', { type: 'button', class: 'primary-btn', 'data-back': '' }, 'Tezgâha dön');
    const prompts = createPromptPanel(s);
    const qDetails = h('details', { class: 'explain-questions' }, h('summary', {}, `Kendini dene (${s.questions.length})`), prompts.list);
    qDetails.hidden = s.questions.length === 0;
    const el = h('section', { class: 'explain-dock floating-keep', 'aria-label': 'Nedenini göster' }, title, h('div', { class: 'explain-phase' }, phaseTitle, summary, details), h('div', { class: 'explain-controls' }, prev, playBtn, next, h('div', { class: 'scrub-wrap' }, segments, h('div', { class: 'slider-row' }, slider, markers)), time, speed, back), qDetails, prompts.overlay);
    panel = el;
    host.append(el);

    let lastPhase = '';
    const render = (): void => {
      const t = s.player.time;
      if (document.activeElement !== slider) slider.value = String(t);
      const phase = s.currentPhase;
      slider.setAttribute('aria-valuetext', `${phase?.nameTr ?? ''}, ${fmtClock(t)} / ${fmtClock(s.track.duration)}`);
      time.textContent = `${fmtClock(t)} / ${fmtClock(s.track.duration)}`;
      playBtn.textContent = s.player.playing ? '⏸' : '▶';
      playBtn.setAttribute('aria-label', s.player.playing ? 'Duraklat' : 'Oynat');
      if (phase && phase.id !== lastPhase) {
        lastPhase = phase.id;
        const text = phaseText(phase, level);
        phaseTitle.textContent = phase.nameTr;
        summary.textContent = text?.summary ?? '';
        details.replaceChildren(...(text?.details ?? []).map((d) => h('li', {}, d)));
        const index = s.phases.indexOf(phase);
        [...segments.children].forEach((seg, i) => seg.classList.toggle('now', i === index));
      }
      hooks.onSeek(Math.min(Math.max(t - offset, 0), script.durationS));
    };
    unsub.push(s.player.subscribe(render), s.subscribe(() => prompts.update()));
    playBtn.addEventListener('click', () => s.player.toggle());
    prev.addEventListener('click', () => s.player.stepPhase(-1));
    next.addEventListener('click', () => s.player.stepPhase(1));
    slider.addEventListener('input', () => {
      s.rewound(Number(slider.value));
      s.player.seek(Number(slider.value));
    });
    speed.addEventListener('change', () => s.player.setSpeed(Number(speed.value)));
    back.addEventListener('click', () => ex.close());
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        ex.close();
      }
    });
    prompts.update();
    render();
    back.focus();
    return true;
  };

  const ex: Explainer = {
    el: host,
    get isOpen() {
      return isOpen;
    },
    open(exp, script): void {
      isOpen = true;
      closeTimeline();
      if (!openTimeline(exp, script)) fallback.open(script);
    },
    close(): void {
      if (!isOpen) return;
      isOpen = false;
      closeTimeline();
      if (!fallback.el.hidden) fallback.close();
      else hooks.onClose();
    },
    tick(dt): void {
      if (session) session.tick(dt);
      else fallback.tick(dt);
    },
    setQuestions(on): void {
      questionsOn = on;
      session?.setQuestionsEnabled(on);
    },
  };
  return ex;
}
