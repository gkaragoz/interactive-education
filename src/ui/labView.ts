import { getExperiment, type ExperimentDef } from '../chemlab';
import { h, loadLabSafetySeen, saveLabLast, saveLabSafetySeen, TIMELAPSE } from '../core';
import type { ModuleInfo, SimInfo } from '../data/moduleTypes';
import type { LevelId } from '../data/types';
import type { CameraPresetId, LabSimScene } from '../scene';
import { experimentList } from '../scene';
import { createActionPanel } from './labActions';
import { createExplainer, type Explainer } from './labExplainer';
import { createGuide, createLabPrompt } from './labGuide';
import { watchLayout } from './labLayout';
import { createSafetySheet } from './labSafety';
import { createStartCard } from './labStart';
import { createCameraGroup, createExperimentPicker, createLapse, createModeTabs } from './labTopBar';
import { copyText, createDefter, createMeasurements } from './labParts';

export interface LabViewHandlers {
  setSpeed(factor: number): void;
  setPaused(paused: boolean): void;
  /** Loads an experiment (null = free bench): the host rebuilds the scene and updates the address. */
  loadExperiment(id: string | null): void;
  reset(): void;
  replayTo(t: number): void;
  /** Snapshot after a learner action (Defter replay). */
  checkpoint(): void;
  explain(scriptId: string): void;
  explainSeek(t: number): void;
  explainClose(): void;
  preset(preset: CameraPresetId): void;
  /** Fly the camera to an item (null: back to the overview). Returns false when the item has no 3D object. */
  focusItem(id: string | null): boolean;
  /** Labels on the stage: off, only the hovered/focused/selected item (default), or all. */
  labelMode(mode: 'off' | 'focus' | 'all'): void;
  /** The keyboard focus (or the list selection) moved to an item. */
  itemFocus(id: string | null): void;
  softFlash(on: boolean): void;
  screenshot(): void;
  toast(text: string): void;
  safeArea?(insets: { left: number; right: number; top: number; bottom: number }): void;
}

export interface LabView {
  el: HTMLElement;
  /** Container the 3D stage mounts its canvas into. */
  viewport: HTMLElement;
  bind(info: SimInfo, scene: LabSimScene, handlers: LabViewHandlers, opts: { level: LevelId; experimentId: string | null; softFlash: boolean; timeline?: ModuleInfo | null; intro?: { firstVisit: boolean; startCard: boolean; last: string | null } }): void;
  /** Re-reads the engine: measurements, Defter, steps, prompts. Called after sim steps and after learner actions. */
  refresh(): void;
  /** Real frame time, for the explainer player. */
  tick(dt: number): void;
  setLoading(text: string | null): void;
  /** Sorular setting: off = no prompt after steps. */
  setQuestions(on: boolean): void;
  dispose(): void;
}

/**
 * The lab screen: the 3D bench fills the page and glass panels float over it. Top: mode, experiment, time-lapse, pause.
 * Left: guide, "Malzeme dolabı" and "Reaktifler" with the keyboard action form. Right: Defter and measurements.
 */
export function createLabView(reducedMotion: boolean): LabView {
  const viewport = h('div', { class: 'stage-viewport' });
  const loading = h('div', { class: 'loading', role: 'status' }, h('h3', {}, 'Laboratuvar hazırlanıyor…'));
  loading.hidden = true;
  const root = h('div', { class: 'lab-view' });
  let cleanup: (() => void)[] = [];
  let questionsOn = true;
  let explainer: Explainer | null = null;
  let refreshFn: () => void = () => undefined;
  let tickFn: (dt: number) => void = () => undefined;

  const view: LabView = {
    el: root,
    viewport,
    setLoading(text): void {
      loading.hidden = text === null;
      const t = loading.querySelector('h3');
      if (t && text) t.textContent = text;
    },
    setQuestions(on): void {
      questionsOn = on;
      explainer?.setQuestions(on);
      root.classList.toggle('questions-off', !on);
    },
    refresh: () => refreshFn(),
    tick: (dt) => tickFn(dt),
    dispose(): void {
      for (const fn of cleanup) fn();
      cleanup = [];
      refreshFn = () => undefined;
      tickFn = () => undefined;
      explainer = null;
      root.classList.remove('compact');
      root.replaceChildren();
    },
    bind(info, scene, handlers, opts): void {
      view.dispose();
      const lab = scene.lab;
      const level = opts.level;
      let mode: 'guided' | 'free' = opts.experimentId ? 'guided' : 'free';
      let exp: ExperimentDef | null = opts.experimentId ? (getExperiment(opts.experimentId) ?? null) : null;
      let paused = false;
      let pendingTitle: string | null = null;
      let selectedItem: string | null = null;
      let lastExperiment: string | null = opts.experimentId;
      let seenBlocked = 0;
      const asked = new Set<string>();
      let tally = { answered: 0, correct: 0 };

      const live = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite', 'data-live': '' });
      const announce = (text: string): void => {
        live.textContent = '';
        window.setTimeout(() => (live.textContent = text), 30);
      };

      // ---- safety card --------------------------------------------------------------------------------------
      const cardTitle = h('h3', { id: 'safety-title' });
      const cardText = h('p', {});
      const cardOk = h('button', { type: 'button', class: 'primary-btn', 'data-safety-ok': '' }, 'Anladım');
      const card = h('div', { class: 'safety-card floating-keep', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'safety-title', 'data-safety-card': '' }, cardTitle, cardText, cardOk);
      card.hidden = true;
      let returnFocus: HTMLElement | null = null;
      const openCard = (title: string, text: string): void => {
        returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        cardTitle.textContent = title;
        cardText.textContent = text;
        card.hidden = false;
        cardOk.focus();
        announce(`${title}. ${text}`);
      };
      const closeCard = (): void => {
        card.hidden = true;
        returnFocus?.focus();
      };
      cardOk.addEventListener('click', closeCard);
      card.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          ev.stopPropagation();
          closeCard();
        }
      });

      // ---- actions, lists, defter, measurements ---------------------------------------------------------------
      const inter = scene.interactions;
      const actions = inter ? createActionPanel(inter, { onFocus: (id) => handlers.itemFocus(id ?? selectedItem), onSelect: (id) => { selectedItem = id; handlers.itemFocus(id); }, onRun: (res, summary) => { if (res.blockedTitleTr) pendingTitle = res.blockedTitleTr; handlers.checkpoint(); refresh(); announce(res.messageTr ?? `${summary}.`); } }) : null;
      const defter = createDefter((t) => handlers.replayTo(t), (text) => void copyText(text).then((ok) => handlers.toast(ok ? 'Defter metni kopyalandı.' : 'Kopyalanamadı.')));
      const meas = createMeasurements();
      const prompt = createLabPrompt();
      const dock = createExplainer(opts.timeline ?? null, level, reducedMotion, { onSeek: (t) => handlers.explainSeek(t), onClose: () => { handlers.explainClose(); setPaused(false); } });
      explainer = dock;
      dock.setQuestions(questionsOn);
      const guide = createGuide((e) => {
        const script = e.particles[0];
        if (!script) return;
        setPaused(true);
        dock.open(e, script);
        handlers.explain(script.id);
      });

      // ---- top bar ------------------------------------------------------------------------------------------------
      const { el: modes, buttons: modeBtns } = createModeTabs(mode, (m) => setMode(m));
      const picker = createExperimentPicker(level, (id) => loadExp(id));
      picker.setCurrent(opts.experimentId);
      const camera = createCameraGroup(
        () => handlers.focusItem(null),
        () => handlers.preset('top'),
        () => {
          if (!selectedItem || !handlers.focusItem(selectedItem)) handlers.toast('Önce soldan bir kap seç; sonra Yakınlaştır.');
        },
        (m) => handlers.labelMode(m),
      );
      const { el: lapse, buttons: lapseBtns } = createLapse((f) => setSpeed(f));
      const pauseBtn = h('button', { type: 'button', class: 'tool-btn', 'data-pause': '', 'aria-pressed': 'false', title: 'Duraklat / sürdür (Boşluk)' }, 'Duraklat');
      pauseBtn.addEventListener('click', () => setPaused(!paused));
      const resetBtn = h('button', { type: 'button', class: 'tool-btn', 'data-reset': '', title: 'Deneyi baştan başlat' }, 'Sıfırla');
      resetBtn.addEventListener('click', () => { handlers.reset(); asked.clear(); tally = { answered: 0, correct: 0 }; seenBlocked = 0; guide.setExperiment(exp, level); refresh(); handlers.checkpoint(); });
      const flash = h('input', { type: 'checkbox', checked: opts.softFlash, 'data-soft-flash': '' });
      flash.addEventListener('change', () => handlers.softFlash(flash.checked));
      const safetyBtn = h('button', { type: 'button', class: 'tool-btn', 'data-safety': '' }, 'Güvenlik');
      const sheet = createSafetySheet();
      const start = createStartCard(level, info.introTr, (id) => loadExp(id));
      safetyBtn.addEventListener('click', () => sheet.open(exp ? exp.safetyTr : []));
      const shot = h('button', { type: 'button', class: 'tool-btn', onclick: handlers.screenshot }, 'Ekran görüntüsü');
      const top = h('header', { class: 'lab-top floating' }, modes, picker.el, lapse, pauseBtn, resetBtn, camera, h('label', { class: 'lab-flash' }, flash, ' Yumuşak parlama'), safetyBtn, shot);

      // ---- left drawer -----------------------------------------------------------------------------------------------
      const tabsEl = h('div', { class: 'lab-tabs', role: 'tablist', 'aria-label': 'Sol panel' });
      const panes = new Map<string, HTMLElement>();
      const tabBtns = new Map<string, HTMLButtonElement>();
      const tally$ = h('p', { class: 'lab-tally', 'aria-live': 'polite' });
      const paneDefs: [string, string, HTMLElement[]][] = [
        ['guide', 'Deney', [guide.el, tally$]],
        ['equipment', 'Malzeme dolabı', actions ? [actions.lists.equipment] : []],
        ['reagents', 'Reaktifler', actions ? [actions.lists.reagents] : []],
      ];
      for (const [id, label, kids] of paneDefs) {
        const pane = h('div', { class: 'lab-pane', role: 'tabpanel', 'data-pane': id }, ...kids);
        panes.set(id, pane);
        const b = h('button', { type: 'button', class: 'tab', role: 'tab', 'data-tab': id, 'aria-selected': 'false' }, label);
        b.addEventListener('click', () => showTab(id));
        tabBtns.set(id, b);
        tabsEl.append(b);
      }
      const showTab = (id: string): void => {
        for (const [pid, pane] of panes) pane.hidden = pid !== id;
        for (const [bid, b] of tabBtns) b.setAttribute('aria-selected', String(bid === id));
      };
      const leftToggle = h('button', { type: 'button', class: 'icon-btn rail-toggle', 'aria-expanded': 'true', 'aria-label': 'Sol paneli daralt', title: 'Paneli daralt / aç' }, '‹');
      const left = h('aside', { class: 'lab-left floating', 'aria-label': 'Malzeme dolabı ve reaktifler' }, leftToggle, h('div', { class: 'lab-left-body' }, tabsEl, ...panes.values(), actions?.panel ?? h('p', {})));
      const body = left.querySelector<HTMLElement>('.lab-left-body') as HTMLElement;
      const setLeft = (open: boolean): void => {
        body.hidden = !open;
        left.classList.toggle('collapsed', !open);
        leftToggle.setAttribute('aria-expanded', String(open));
        leftToggle.textContent = open ? '‹' : '›';
        leftToggle.setAttribute('aria-label', open ? 'Sol paneli daralt' : 'Sol paneli aç');
      };
      leftToggle.addEventListener('click', () => setLeft(body.hidden));
      const right = h('aside', { class: 'lab-right', 'aria-label': 'Defter ve ölçümler' }, defter.el, meas.el);

      const wrap = h('div', { class: 'stage-wrap module-wrap lab-wrap' }, h('div', { class: 'card stage-card module-stage' }, viewport, loading), top, left, right, dock.el, prompt.el, card, sheet.el, start.el, live);
      root.append(wrap);

      // ---- state changes ---------------------------------------------------------------------------------------------
      const setSpeed = (f: number): void => {
        handlers.setSpeed(f);
        for (const [k, b] of lapseBtns) b.setAttribute('aria-pressed', String(k === f));
      };
      const setPaused = (p: boolean): void => {
        paused = p;
        handlers.setPaused(p);
        pauseBtn.textContent = p ? 'Sürdür' : 'Duraklat';
        pauseBtn.setAttribute('aria-pressed', String(p));
      };
      const loadExp = (id: string | null, remember = true): void => {
        if (remember) saveLabLast(id ?? 'serbest');
        exp = id ? (getExperiment(id) ?? null) : null;
        mode = exp ? 'guided' : 'free';
        asked.clear();
        tally = { answered: 0, correct: 0 };
        seenBlocked = 0;
        setPaused(false);
        handlers.loadExperiment(id);
        guide.setExperiment(exp, level);
        actions?.refresh();
        applyMode();
        refresh();
      };
      const setMode = (m: 'guided' | 'free'): void => {
        if (m === mode) return;
        loadExp(m === 'free' ? null : (lastExperiment ?? experimentList()[0]?.id ?? null));
      };
      const applyMode = (): void => {
        for (const [id, b] of modeBtns) b.setAttribute('aria-selected', String(id === mode));
        picker.el.hidden = mode !== 'guided';
        if (exp) lastExperiment = exp.id;
        picker.setCurrent(exp?.id ?? null);
        const guided = mode === 'guided';
        tabBtns.get('guide')!.hidden = !guided;
        showTab(guided ? 'guide' : 'equipment');
        safetyBtn.hidden = false;
      };

      const refresh = (): void => {
        meas.refresh(scene.measurements());
        const fresh = defter.refresh(lab);
        if (fresh.length > 0) announce(fresh.join(' '));
        const log = lab.journal;
        const blocked = log.filter((e) => e.kind === 'blocked');
        if (blocked.length > seenBlocked) {
          const last = blocked[blocked.length - 1];
          seenBlocked = blocked.length;
          if (last) openCard(pendingTitle ?? 'Güvenlik uyarısı', last.textTr);
          pendingTitle = null;
        }
        if (mode === 'guided' && exp) {
          const { newlyDone } = guide.refresh(lab.view());
          for (const stepId of newlyDone) {
            const p = info.prompts.find((q) => q.experimentId === exp?.id && q.afterStepId === stepId && q.levels.includes(level) && !asked.has(q.id));
            if (p && questionsOn && !prompt.open) {
              asked.add(p.id);
              setPaused(true);
              prompt.show(p, (correct) => {
                tally = { answered: tally.answered + 1, correct: tally.correct + (correct ? 1 : 0) };
                tally$.textContent = `Sorular: ${tally.correct} / ${tally.answered} doğru`;
                setPaused(false);
              });
            }
          }
        }
        tally$.hidden = tally.answered === 0;
      };
      refreshFn = refresh;
      tickFn = (dt) => dock.tick(dt);

      // ---- keyboard ------------------------------------------------------------------------------------------------
      const onKey = (ev: KeyboardEvent): void => {
        const t = ev.target as HTMLElement | null;
        if (t && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(t.tagName)) return;
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        if (ev.key === ' ') setPaused(!paused);
        else if (ev.key >= '1' && ev.key <= '4') setSpeed(TIMELAPSE[Number(ev.key) - 1] ?? 1);
        else return;
        ev.preventDefault();
      };
      document.addEventListener('keydown', onKey);
      cleanup.push(() => document.removeEventListener('keydown', onKey));

      // ---- compact mode and safe area -------------------------------------------------------------------------------
      cleanup.push(watchLayout(root, wrap, [top, left, right, () => dock.el.querySelector<HTMLElement>('.explain-dock:not([hidden])'), prompt.el], handlers.safeArea, (compact) => {
        setLeft(!compact);
        defter.setCollapsed(compact);
      }));
      guide.setExperiment(exp, level);
      applyMode();
      actions?.select(null);
      refresh();
      // First visit: the safety sheet (once), then the start card; a returning learner resumes where they were.
      const intro = opts.intro;
      const afterSafety = (): void => {
        if (intro?.startCard) start.open(intro.last);
      };
      if (intro?.firstVisit && !loadLabSafetySeen()) {
        sheet.open(exp ? exp.safetyTr : [], () => {
          saveLabSafetySeen();
          afterSafety();
        });
      } else afterSafety();
    },
  };
  return view;
}
