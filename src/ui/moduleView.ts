import { h, phaseText, SPEEDS, tracksFor, type ModuleSession } from '../core';
import type { ModuleInfo } from '../data/moduleTypes';
import type { LevelId } from '../data/types';
import type { CameraPresetId } from '../scene';
import { icon } from './icons';
import { createChartStrip, type ChartStrip } from './moduleCharts';
import { createPromptPanel } from './modulePrompts';

export interface ModuleViewHandlers {
  selectTrack(id: string): void;
  setOption(id: string, choice: string): void;
  preset(preset: CameraPresetId | 'auto'): void;
  labels(on: boolean): void;
  /** The learner moved the playhead: the host rewinds prompts and poses the scene. */
  seek(t: number): void;
  /** Chart values at t (scene `chartAt`, else the phase interpolation). */
  values(t: number): Record<string, number>;
  screenshot(): void;
  /** Pixels of the stage the floating panels cover on each side; the host keeps the 3D picture centred in the free area. */
  safeArea?(insets: { left: number; right: number; top: number; bottom: number }): void;
}

export interface ModuleView {
  el: HTMLElement;
  /** Container the 3D stage mounts its canvas into. */
  viewport: HTMLElement;
  bind(info: ModuleInfo, session: ModuleSession, options: Record<string, string>, handlers: ModuleViewHandlers): void;
  setLoading(text: string | null): void;
  /** Sorular setting: when off the pause markers are dimmed and the list says prompts will not stop the animation. */
  setQuestions(on: boolean): void;
  dispose(): void;
}

const fmt = (t: number): string => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const SHORTCUTS: [string, string][] = [
  ['Boşluk', 'Oynat / duraklat'],
  ['← →', 'Önceki / sonraki evre'],
  ['+ −', 'Hızı artır / azalt'],
  ['L', 'Döngüyü aç / kapat'],
  ['?', 'Bu yardım penceresi'],
];

/**
 * Module screen, stage first: the 3D stage fills the screen and everything else floats over it as glass panels that
 * fade when idle: title and tabs (top left), tools (top right), phase card and charts (above the dock), the timeline
 * dock (bottom), a question and notes drawer (right) and the question that fired at the playhead (centre).
 */
export function createModuleView(reducedMotion: boolean): ModuleView {
  const viewport = h('div', { class: 'stage-viewport' });
  const loading = h('div', { class: 'loading', role: 'status' }, h('h3', {}, 'Modül hazırlanıyor…'));
  loading.hidden = true;
  const stageCard = h('div', { class: 'card stage-card module-stage' }, viewport, loading);
  const root = h('div', { class: 'module-view' });
  let cleanup: (() => void)[] = [];

  const view: ModuleView = {
    el: root,
    viewport,
    setLoading(text): void {
      loading.hidden = text === null;
      const title = loading.querySelector('h3');
      if (title && text) title.textContent = text;
    },
    setQuestions(on): void {
      root.classList.toggle('questions-off', !on);
    },
    dispose(): void {
      for (const fn of cleanup) fn();
      cleanup = [];
      root.classList.remove('compact', 'is-playing');
      root.replaceChildren();
    },
    bind(info, session, options, handlers): void {
      view.dispose();
      const { player, track } = session;
      const level: LevelId = session.level;

      // --- top left: title, track tabs, options ------------------------------------------------------------
      const tabs = h('div', { class: 'track-tabs', role: 'tablist', 'aria-label': 'Animasyonlar' });
      for (const t of tracksFor(info, level)) {
        tabs.append(h('button', { type: 'button', role: 'tab', 'aria-selected': String(t.id === track.id), 'data-track': t.id, class: 'tab', onclick: () => handlers.selectTrack(t.id) }, t.nameTr));
      }
      const optionBar = h('div', { class: 'module-options' });
      for (const o of info.options.filter((o) => !o.trackIds || o.trackIds.includes(track.id))) {
        const select = h('select', { 'aria-label': o.labelTr, 'data-option': o.id });
        for (const c of o.choices.filter((c) => !c.levels || c.levels.includes(level))) select.append(h('option', { value: c.id, selected: (options[o.id] ?? o.defaultChoice) === c.id }, c.labelTr));
        select.addEventListener('change', () => handlers.setOption(o.id, select.value));
        optionBar.append(h('label', {}, `${o.labelTr}: `, select));
      }
      // Compact stages show the options as a small popover behind one button.
      const optionsBtn = h('button', { type: 'button', class: 'tool-btn options-btn', 'aria-expanded': 'false', 'aria-controls': 'module-options', 'data-options-btn': '' }, 'Seçenekler ▾');
      optionBar.id = 'module-options';
      optionsBtn.hidden = optionBar.childElementCount === 0;
      optionsBtn.addEventListener('click', () => {
        const open = optionsBtn.getAttribute('aria-expanded') !== 'true';
        optionsBtn.setAttribute('aria-expanded', String(open));
        optionBar.classList.toggle('open', open);
      });
      const head = h('header', { class: 'module-head floating' }, h('h2', {}, info.nameTr), h('p', { class: 'sub-tag' }, track.tagline), tabs, optionsBtn, optionBar);

      // --- dock: play, steps, scrub bar with phase segments, speed, loop -----------------------------------------
      const playBtn = h('button', { type: 'button', class: 'dock-btn play', 'aria-label': 'Oynat', 'data-play': '', disabled: reducedMotion, title: reducedMotion ? 'Hareket azaltma açık: evreleri adım adım izle' : 'Oynat (Boşluk)' }, '▶');
      const prevBtn = h('button', { type: 'button', class: 'dock-btn', 'aria-label': 'Önceki evre', 'data-prev': '', title: 'Önceki evre (←)' }, '⏮');
      const nextBtn = h('button', { type: 'button', class: 'dock-btn', 'aria-label': 'Sonraki evre', 'data-next': '', title: 'Sonraki evre (→)' }, '⏭');
      const slider = h('input', { type: 'range', min: '0', max: String(track.duration), step: '0.05', value: '0', class: 'scrub', 'aria-label': 'Zaman çizelgesi', 'data-scrub': '' });
      const segments = h('div', { class: 'segments', 'aria-hidden': 'true' });
      for (const p of session.phases) segments.append(h('button', { type: 'button', class: 'segment', tabindex: -1, style: `flex:${Math.max(p.end - p.start, 0.1)}`, title: p.nameTr, 'aria-label': p.nameTr, onclick: () => handlers.seek(p.start) }, h('span', {}, p.nameTr)));
      // Pause markers: where a check or predict stops the animation.
      const markers = h('div', { class: 'markers', 'aria-hidden': 'true' });
      for (const q of session.questions) markers.append(h('span', { class: 'marker', style: `left:${(q.atTime / track.duration) * 100}%`, title: `${Math.round(q.atTime)}. sn: ${q.promptTr}` }));
      const time = h('span', { class: 'time' }, '0:00');
      const speed = h('select', { 'aria-label': 'Hız', 'data-speed': '' });
      for (const s of SPEEDS) speed.append(h('option', { value: String(s), selected: s === player.speed }, `${s}x`));
      speed.addEventListener('change', () => player.setSpeed(Number(speed.value)));
      const loopBtn = h('button', { type: 'button', class: 'dock-btn', 'aria-pressed': 'false', 'aria-label': 'Döngü', 'data-loop': '', title: 'Döngü (L)' }, '🔁');
      const dock = h('div', { class: 'dock', role: 'group', 'aria-label': 'Oynatma denetimleri' }, prevBtn, playBtn, nextBtn, h('div', { class: 'scrub-wrap' }, segments, h('div', { class: 'slider-row' }, slider, markers)), time, speed, loopBtn);

      // --- top right: camera, labels, screenshot, help, drawer -----------------------------------------------------
      const presets = h('div', { class: 'preset-bar', role: 'group', 'aria-label': 'Kamera' });
      for (const [id, label] of [['auto', 'Otomatik'], ['home', 'Genel'], ['front', 'Ön'], ['side', 'Yan'], ['top', 'Üst']] as const) {
        presets.append(h('button', { type: 'button', class: 'tool-btn', 'data-preset': id, onclick: () => handlers.preset(id) }, label));
      }
      let labelsOn = true;
      const labelsBtn = h('button', { type: 'button', class: 'tool-btn', 'aria-pressed': 'true', 'aria-label': 'Etiketler', title: 'Etiketler', onclick: () => { labelsOn = !labelsOn; labelsBtn.setAttribute('aria-pressed', String(labelsOn)); handlers.labels(labelsOn); } }, icon('tag'), h('span', { class: 'lbl' }, 'Etiketler'));
      const shotBtn = h('button', { type: 'button', class: 'tool-btn', 'aria-label': 'Ekran görüntüsü', title: 'Ekran görüntüsü', onclick: handlers.screenshot }, icon('camera'), h('span', { class: 'lbl' }, 'Ekran görüntüsü'));
      const helpBtn = h('button', { type: 'button', class: 'tool-btn', 'aria-expanded': 'false', 'aria-controls': 'shortcut-help', 'data-help': '', 'aria-label': 'Kısayollar (?)', title: 'Klavye kısayolları (?)' }, icon('info'), h('span', { class: 'lbl' }, 'Kısayollar (?)'));
      const drawerBtn = h('button', { type: 'button', class: 'tool-btn', 'aria-expanded': 'false', 'aria-controls': 'module-drawer', 'data-drawer': '', 'aria-label': 'Sorular ve notlar', title: 'Sorular ve notlar' }, icon('books'), h('span', { class: 'lbl' }, 'Sorular ve notlar'));
      const tools = h('div', { class: 'module-tools floating' }, presets, labelsBtn, shotBtn, helpBtn, drawerBtn);
      const help = h('div', { class: 'help-sheet', id: 'shortcut-help', role: 'dialog', 'aria-label': 'Klavye kısayolları' }, h('h3', {}, 'Klavye kısayolları'), h('dl', { class: 'keys' }, ...SHORTCUTS.flatMap(([k, d]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, d)])));
      help.hidden = true;
      const setHelp = (open: boolean): void => {
        help.hidden = !open;
        helpBtn.setAttribute('aria-expanded', String(open));
      };
      helpBtn.addEventListener('click', () => setHelp(help.hidden));

      // --- floating cards: phase, charts ------------------------------------------------------------------------
      const phaseTitle = h('h3', { class: 'phase-title' });
      const phaseSummary = h('p', {});
      const phaseDetails = h('ul', {});
      const phaseCard = h('section', { class: 'card phase-card floating', 'aria-labelledby': 'h-phase' }, h('h2', { class: 'card-title', id: 'h-phase' }, 'Şu an ne oluyor?'), phaseTitle, phaseSummary, phaseDetails);
      const live = h('div', { class: 'sr-only', 'aria-live': 'polite', role: 'status' });
      const charts: ChartStrip = createChartStrip(info.charts.filter((c) => !c.trackIds || c.trackIds.includes(track.id)), session.phases, track.duration);
      charts.el.classList.add('floating');
      const chartToggle = h('button', { type: 'button', class: 'tool-btn chart-toggle', 'aria-expanded': 'true', 'data-charts': '' }, 'Grafikler');
      const chartTray = h('div', { class: 'chart-tray' }, chartToggle, charts.el);
      chartTray.hidden = charts.el.childElementCount === 0;

      let chartTouched = false;
      const setCharts = (open: boolean): void => {
        chartToggle.setAttribute('aria-expanded', String(open));
        chartTray.classList.toggle('collapsed', !open);
        measure();
      };
      chartToggle.addEventListener('click', () => {
        chartTouched = true;
        setCharts(chartToggle.getAttribute('aria-expanded') !== 'true');
      });
      const prompts = createPromptPanel(session);

      // --- right drawer: questions, notes, glossary -------------------------------------------------------------
      const notes = h('section', { class: 'card notes-card', 'aria-labelledby': 'h-notes' }, h('h2', { class: 'card-title', id: 'h-notes' }, 'Sadeleştirmeler ve notlar'), h('ul', {}, ...[...track.notes, ...info.simplifications].map((n) => h('li', {}, n))));
      const glossary = h('section', { class: 'card', 'aria-labelledby': 'h-gloss' }, h('h2', { class: 'card-title', id: 'h-gloss' }, 'Sözlük'), h('dl', { class: 'glossary' }, ...info.glossary.flatMap((g) => [h('dt', {}, g.termTr), h('dd', {}, g.definitionTr)])));
      const drawerClose = h('button', { type: 'button', class: 'icon-btn drawer-close', 'aria-label': 'Paneli kapat', onclick: () => setDrawer(false) }, '×');
      const drawer = h('aside', { class: 'drawer module-drawer floating-keep', id: 'module-drawer', 'aria-label': 'Sorular ve notlar' }, h('div', { class: 'drawer-head' }, h('h2', { class: 'card-title' }, 'Sorular ve notlar'), drawerClose), h('p', { class: 'intro' }, info.introTr), prompts.list, notes, ...(info.glossary.length > 0 ? [glossary] : []));
      drawer.inert = true;
      const setDrawer = (open: boolean): void => {
        drawer.classList.toggle('open', open);
        drawer.inert = !open;
        wrap.classList.toggle('drawer-open', open);
        drawerBtn.setAttribute('aria-expanded', String(open));
      };
      drawerBtn.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
      drawer.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          ev.stopPropagation();
          setDrawer(false);
          drawerBtn.focus();
        }
      });

      const wrap = h('div', { class: 'stage-wrap module-wrap' }, stageCard, head, tools, phaseCard, chartTray, dock, prompts.overlay, drawer, help, live);
      root.append(wrap);

      // --- safe area: tell the host how much of the stage the panels cover --------------------------------------
      let measureQueued = false;
      const doMeasure = (): void => {
        measureQueued = false;
        const w = wrap.getBoundingClientRect();
        if (w.width < 10) return;
        // Compact mode for narrow or short stages (1366x768 and below).
        const compact = w.width < 1450 || w.height < 740;
        if (root.classList.contains('compact') !== compact) {
          root.classList.toggle('compact', compact);
          if (compact && !chartTouched) setCharts(false);
          if (!compact && !chartTouched) setCharts(true);
          if (!compact) {
            optionBar.classList.remove('open');
            optionsBtn.setAttribute('aria-expanded', 'false');
          }
        }
        // Every visible panel is an obstacle: wide ones block the top or bottom, tall ones the left or right side.
        const ins = { left: 0, right: 0, top: 0, bottom: 0 };
        for (const el of [head, tools, phaseCard, chartTray, dock, optionBar.classList.contains('open') ? optionBar : null]) {
          if (!el || el.hidden || el.closest('[hidden]')) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) continue;
          const cx = (r.left + r.right) / 2 - w.left;
          const cy = (r.top + r.bottom) / 2 - w.top;
          const vertical = r.width > w.width * 0.5 || r.height < w.height * 0.16 || r.top - w.top < 90 || w.bottom - r.bottom < 60;
          if (vertical) {
            // Only panels that sit across the middle of the picture matter for the vertical split.
            if (cy < w.height / 2) ins.top = Math.max(ins.top, r.bottom - w.top + 6);
            else ins.bottom = Math.max(ins.bottom, w.bottom - r.top + 6);
          } else if (cx < w.width / 2) ins.left = Math.max(ins.left, r.right - w.left + 8);
          else ins.right = Math.max(ins.right, w.right - r.left + 8);
        }
        handlers.safeArea?.({ left: Math.min(ins.left, w.width * 0.4), right: Math.min(ins.right, w.width * 0.4), top: Math.min(ins.top, w.height * 0.4), bottom: Math.min(ins.bottom, w.height * 0.4) });
      };
      const measure = (): void => {
        if (measureQueued) return;
        measureQueued = true;
        requestAnimationFrame(doMeasure);
      };
      const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
      for (const el of [wrap, phaseCard, chartTray, dock, tools]) ro?.observe(el);
      cleanup.push(() => ro?.disconnect());
      wrap.addEventListener('transitionend', measure);

      // --- reflect the session ---------------------------------------------------------------------------
      let lastPhase = '';
      const refresh = (): void => {
        const t = player.time;
        if (document.activeElement !== slider) slider.value = String(t);
        const phase = session.currentPhase;
        slider.setAttribute('aria-valuetext', `${phase?.nameTr ?? ''}, ${fmt(t)} / ${fmt(track.duration)}`);
        time.textContent = `${fmt(t)} / ${fmt(track.duration)}`;
        root.classList.toggle('is-playing', player.playing);
        playBtn.textContent = player.playing ? '⏸' : '▶';
        playBtn.setAttribute('aria-label', player.playing ? 'Duraklat' : 'Oynat');
        loopBtn.setAttribute('aria-pressed', String(player.loop));
        speed.value = String(player.speed);
        if (phase && phase.id !== lastPhase) {
          lastPhase = phase.id;
          const text = phaseText(phase, level);
          phaseTitle.textContent = phase.nameTr;
          phaseSummary.textContent = text?.summary ?? '';
          phaseDetails.replaceChildren(...(text?.details ?? []).map((d) => h('li', {}, d)));
          live.textContent = `Evre: ${phase.nameTr}. ${text?.summary ?? ''}`;
          const index = session.phases.indexOf(phase);
          [...segments.children].forEach((seg, i) => seg.classList.toggle('now', i === index));
        }
        charts.update(t, handlers.values(t));
      };
      cleanup.push(player.subscribe(refresh));
      cleanup.push(session.subscribe(() => prompts.update()));
      playBtn.addEventListener('click', () => player.toggle());
      prevBtn.addEventListener('click', () => { player.stepPhase(-1); handlers.seek(player.time); });
      nextBtn.addEventListener('click', () => { player.stepPhase(1); handlers.seek(player.time); });
      loopBtn.addEventListener('click', () => player.setLoop(!player.loop));
      slider.addEventListener('input', () => handlers.seek(Number(slider.value)));

      const onKey = (ev: KeyboardEvent): void => {
        const target = ev.target as HTMLElement | null;
        if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName) && ev.key !== '?' && target !== slider) return;
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        let used = true;
        if (ev.key === ' ' && target?.tagName !== 'BUTTON') player.toggle();
        else if (ev.key === 'ArrowRight' && target !== slider && target?.tagName !== 'CANVAS') { player.stepPhase(1); handlers.seek(player.time); }
        else if (ev.key === 'ArrowLeft' && target !== slider && target?.tagName !== 'CANVAS') { player.stepPhase(-1); handlers.seek(player.time); }
        else if (ev.key === '+' || ev.key === '=') player.nudgeSpeed(1);
        else if (ev.key === '-' || ev.key === '_') player.nudgeSpeed(-1);
        else if (ev.key === 'l' || ev.key === 'L') player.setLoop(!player.loop);
        else if (ev.key === '?') setHelp(help.hidden);
        else if (ev.key === 'Escape' && !help.hidden) setHelp(false);
        else used = false;
        if (used) ev.preventDefault();
      };
      document.addEventListener('keydown', onKey);
      cleanup.push(() => document.removeEventListener('keydown', onKey));
      refresh();
      prompts.update();
    },
  };
  return view;
}
