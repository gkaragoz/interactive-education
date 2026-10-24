// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LabSim, getExperiment } from '../src/chemlab';
import type { SimInfo } from '../src/data/moduleTypes';
import { benchOf, createLabInteractions, experimentList, shelfOf, type LabSimScene } from '../src/scene';
import { getModule } from '../src/data';
import { createLabView, type LabViewHandlers } from '../src/ui/labView';
import { mergeLines } from '../src/ui/labParts';
import type { JournalEntry } from '../src/chemlab';

const first = experimentList()[0]!.id;

const info = (prompts: SimInfo['prompts'] = []): SimInfo => ({
  kind: 'sim', id: 'chem-lab', nameTr: 'Kimya laboratuvarı', tagline: '', introTr: '', levels: ['temel', 'ileri'], prompts,
  kazanimIds: [], sourceIds: [], simplifications: [], glossary: [], funFacts: [],
});

/** A scene without 3D: the engine and the keyboard path are all the lab view talks to. */
function makeScene(): { scene: LabSimScene; lab: LabSim } {
  let id: string | null = first;
  const lab = new LabSim({ seed: 1, bench: benchOf(id) });
  const inter = createLabInteractions(lab, () => shelfOf(id));
  const scene = {
    lab,
    root: undefined,
    params: [],
    interactions: inter,
    step: (dt: number) => lab.step(dt),
    setParam: () => undefined,
    reset: () => lab.reset(),
    measurements: () => lab.measurements(),
    snapshot: () => lab.snapshot(),
    restore: (s: unknown) => lab.restore(s),
    loadExperiment: (next: string | null) => {
      id = next;
      lab.loadBench(benchOf(next));
    },
    dispose: () => undefined,
  } as unknown as LabSimScene;
  return { scene, lab };
}

function setup(prompts: SimInfo['prompts'] = [], questions = true, extra: { intro?: { firstVisit: boolean; startCard: boolean; last: string | null }; timeline?: boolean; motion?: boolean } = {}) {
  const calls: string[] = [];
  const made = makeScene();
  const handlers: LabViewHandlers = {
    setSpeed: (f) => calls.push(`speed:${f}`),
    setPaused: (p) => calls.push(`paused:${p}`),
    loadExperiment: (id) => {
      calls.push(`load:${id}`);
      made.scene.loadExperiment(id);
    },
    reset: () => calls.push('reset'),
    replayTo: (t) => calls.push(`replay:${t}`),
    checkpoint: () => calls.push('checkpoint'),
    explain: (s) => calls.push(`explain:${s}`),
    explainSeek: () => undefined,
    explainClose: () => calls.push('explainClose'),
    preset: () => undefined,
    focusItem: (id) => {
      calls.push(`focus:${id}`);
      return true;
    },
    labelMode: (m) => calls.push(`labels:${m}`),
    itemFocus: (id) => calls.push(`item:${id}`),
    softFlash: (on) => calls.push(`flash:${on}`),
    screenshot: () => undefined,
    toast: (t) => calls.push(`toast:${t}`),
  };
  const view = createLabView(!extra.motion);
  document.body.append(view.el);
  const { scene, lab } = made;
  view.setQuestions(questions);
  view.bind(info(prompts), scene, handlers, { level: 'ileri', experimentId: first, softFlash: true, intro: extra.intro, timeline: extra.timeline ? (getModule('chem-lab') ?? null) : null });
  const q = <T extends HTMLElement>(sel: string): T => view.el.querySelector<T>(sel) as T;
  return { view, scene, lab, calls, q };
}

const run = (q: ReturnType<typeof setup>['q'], item: string, cmd: string, fields: Record<string, string> = {}): void => {
  q<HTMLButtonElement>(`[data-item="${item}"]`).click();
  q<HTMLButtonElement>(`[data-cmd="${cmd}"]`).click();
  for (const [k, v] of Object.entries(fields)) {
    const el = q<HTMLSelectElement | HTMLInputElement>(`[data-field="${k}"]`);
    el.value = v;
  }
  const apply = q<HTMLButtonElement>('[data-apply]');
  if (apply) apply.click();
};

describe('lab view', () => {
  it('has a guided mode with the experiment list, the step checklist and the free bench switch', () => {
    const { q, calls, view } = setup();
    expect(view.el.querySelectorAll('[data-exp]')).toHaveLength(10);
    expect(view.el.querySelectorAll('[data-exp]:not(:disabled)')).toHaveLength(experimentList().filter((e) => getExperiment(e.id)!.levels.includes('ileri')).length);
    expect(q('[data-experiment]').textContent).toContain(getExperiment(first)!.titleTr);
    expect(q('[data-mode=guided]').getAttribute('aria-selected')).toBe('true');
    expect(q('.guide-steps').children.length).toBe(getExperiment(first)!.steps.length);
    q<HTMLButtonElement>('[data-mode=free]').click();
    expect(calls).toContain('load:null');
    expect(q('[data-mode=free]').getAttribute('aria-selected')).toBe('true');
    expect(q('.guide').hidden).toBe(true);
  });

  it('time-lapse, pause and reset call the host; Space pauses', () => {
    const { q, calls } = setup();
    q<HTMLButtonElement>('[data-lapse="20"]').click();
    expect(calls).toContain('speed:20');
    expect(q('[data-lapse="20"]').getAttribute('aria-pressed')).toBe('true');
    q<HTMLButtonElement>('[data-pause]').click();
    expect(calls).toContain('paused:true');
    expect(q('[data-pause]').textContent).toBe('Sürdür');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(calls.filter((c) => c === 'paused:false')).toHaveLength(1);
    q<HTMLButtonElement>('[data-reset]').click();
    expect(calls).toContain('reset');
  });

  it('operates the bench from the keyboard path, fills the Defter and the measurements, ticks the steps', () => {
    const { q, lab, view } = setup();
    q<HTMLButtonElement>('[data-tab=reagents]').click();
    run(q, 'vinegar', 'pour', { target: 'flask', amount: '50' });
    expect(lab.vessel('flask')?.mix['acetic-acid']).toBeGreaterThan(0);
    expect(q('.defter-list').children.length).toBeGreaterThan(0);
    expect(q('.meas-body').textContent).toContain('Erlenmeyer');
    view.refresh();
    expect(q('.guide-steps li[data-done="true"]')).not.toBeNull();
    expect(q('[data-live]')).not.toBeNull();
  });

  it('Defter lines replay a moment and the copy button gives plain text', async () => {
    const { q, calls, lab } = setup();
    run(q, 'vinegar', 'pour', { target: 'flask', amount: '20' });
    q<HTMLButtonElement>('.defter-line').click();
    expect(calls.some((c) => c.startsWith('replay:'))).toBe(true);
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t: string) => void (copied = t) }, configurable: true });
    q<HTMLButtonElement>('[data-copy]').click();
    await Promise.resolve();
    expect(copied).toContain('Sirke');
    expect(copied.split('\n').length).toBe(lab.journal.length);
  });

  it('shows a safety card (alertdialog) when the engine refuses a dangerous mix', () => {
    const { q, view } = setup();
    q<HTMLButtonElement>('[data-mode=free]').click();
    q<HTMLButtonElement>('[data-tab=reagents]').click();
    run(q, 'bleach', 'pour', { target: 'beaker1', amount: '20' });
    run(q, 'vinegar', 'pour', { target: 'beaker1', amount: '20' });
    view.refresh();
    const card = q('[data-safety-card]');
    expect(card.hidden).toBe(false);
    expect(card.getAttribute('role')).toBe('alertdialog');
    expect(card.textContent).toMatch(/klor/);
    q<HTMLButtonElement>('[data-safety-ok]').click();
    expect(card.hidden).toBe(true);
  });

  it('asks the prompt after its step only when Sorular is on, and pauses while it is open', () => {
    const exp = getExperiment(first)!;
    const step = exp.steps[0]!;
    const prompt = { id: 'p1', experimentId: first, afterStepId: step.id, promptTr: 'Soru?', options: ['a', 'b'], correctIndex: 1, explanationTr: 'Çünkü.', levels: ['temel', 'ileri'] as ('temel' | 'ileri')[] };
    const on = setup([prompt], true);
    run(on.q, 'vinegar', 'pour', { target: 'flask', amount: '50' });
    on.view.refresh();
    expect(on.q('[data-lab-prompt]').hidden).toBe(false);
    expect(on.calls).toContain('paused:true');
    on.q<HTMLButtonElement>('.option:nth-child(2)').click();
    on.q<HTMLButtonElement>('[data-continue]').click();
    expect(on.q('.lab-tally').textContent).toBe('Sorular: 1 / 1 doğru');
    expect(on.calls.filter((c) => c === 'paused:false').length).toBeGreaterThan(0);

    const off = setup([prompt], false);
    run(off.q, 'vinegar', 'pour', { target: 'flask', amount: '50' });
    off.view.refresh();
    expect(off.q('[data-lab-prompt]').hidden).toBe(true);
  });

  it('"Nedenini göster" is disabled until the steps are done', () => {
    const { q } = setup();
    expect(q<HTMLButtonElement>('[data-explain]').disabled).toBe(true);
  });
});

describe('lab view: picker, camera, labels, guide, settings', () => {
  it('the experiment picker names the current experiment and loads the one picked', () => {
    const { q, calls } = setup();
    q<HTMLButtonElement>('[data-experiment]').click();
    expect(q('.exp-list').hidden).toBe(false);
    const other = [...q('.exp-list').querySelectorAll<HTMLButtonElement>('.exp-option:not(:disabled)')].find((b) => b.dataset['exp'] !== first)!;
    other.click();
    expect(calls).toContain(`load:${other.dataset['exp']}`);
    expect(q('.exp-list').hidden).toBe(true);
    expect(q('[data-experiment]').textContent).not.toBe('Deney seç');
  });

  it('badges: level and virtual-only experiments are marked in the list', () => {
    const { view } = setup();
    expect(view.el.querySelector('.exp-option .badge')).not.toBeNull();
    const virtual = experimentList().filter((e) => getExperiment(e.id)!.virtualOnly).length;
    expect(view.el.querySelectorAll('.exp-list .exp-badges .badge.virtual')).toHaveLength(virtual);
  });

  it('camera row: overview, top, zoom needs a selection; labels cycle focus, all, off', () => {
    const { q, calls } = setup();
    q<HTMLButtonElement>('[data-view=zoom]').click();
    expect(calls.some((c) => c.startsWith('toast:'))).toBe(true);
    q<HTMLButtonElement>('[data-tab=equipment]').click();
    q<HTMLButtonElement>('[data-item=flask]').click();
    q<HTMLButtonElement>('[data-view=zoom]').click();
    expect(calls).toContain('focus:flask');
    q<HTMLButtonElement>('[data-view=overview]').click();
    expect(calls).toContain('focus:null');
    const labels = q<HTMLButtonElement>('[data-labels]');
    expect(labels.textContent).toBe('Etiketler: seçili');
    labels.click();
    labels.click();
    expect(calls.filter((c) => c.startsWith('labels:'))).toEqual(['labels:all', 'labels:off']);
  });

  it('the step list hides finished steps behind a toggle and highlights the current one', () => {
    const { q, view } = setup();
    q<HTMLButtonElement>('[data-tab=reagents]').click();
    run(q, 'vinegar', 'pour', { target: 'flask', amount: '50' });
    view.refresh();
    expect(q('.guide-steps').classList.contains('show-done')).toBe(false);
    const toggle = q<HTMLButtonElement>('[data-toggle-done]');
    expect(toggle.hidden).toBe(false);
    expect(q('.guide-steps li[aria-current="step"]').getAttribute('data-done')).toBe('false');
    expect(q('.guide-progress').textContent).toMatch(/Adım \d+ \/ \d+/);
    toggle.click();
    expect(q('.guide-steps').classList.contains('show-done')).toBe(true);
  });

  it('Yumuşak parlama starts from the saved choice and reports changes', () => {
    const { q, calls } = setup();
    expect(q<HTMLInputElement>('[data-soft-flash]').checked).toBe(true);
    const box = q<HTMLInputElement>('[data-soft-flash]');
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    expect(calls).toContain('flash:false');
  });
});

describe('Defter merging', () => {
  const act = (t: number, textTr: string, vessel = 'beaker1'): JournalEntry => ({ t, kind: 'action', vessel, textTr });
  it('merges chunks of one pour into a line with a running total', () => {
    const lines = mergeLines([act(1, '20.0 mL Sirke Beher 1 içine eklendi.'), act(1.5, '15.0 mL Sirke Beher 1 içine eklendi.'), act(2, '10.0 mL Sirke Beher 1 içine eklendi.')]);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.textTr).toBe('Sirke Beher 1 içine eklendi. (toplam 45 mL)');
    expect(lines[0]?.count).toBe(3);
  });

  it('keeps different reagents, vessels, a later pause and other lines apart', () => {
    const lines = mergeLines([
      act(1, '20.0 mL Sirke Beher 1 içine eklendi.'),
      act(1.2, '20.0 mL Su Beher 1 içine eklendi.'),
      act(1.4, '20.0 mL Su Beher 2 içine eklendi.', 'beaker2'),
      act(30, '20.0 mL Su Beher 2 içine eklendi.', 'beaker2'),
      { t: 31, kind: 'observation', vessel: 'beaker2', textTr: 'Köpürme.' },
    ]);
    expect(lines.map((l) => l.count)).toEqual([1, 1, 1, 1, 1]);
  });

  it('an observation between chunks does not split the pour, another action does', () => {
    const obs: JournalEntry = { t: 1.2, kind: 'observation', vessel: 'beaker1', textTr: 'Gaz çıkıyor.' };
    expect(mergeLines([act(1, '20.0 mL Sirke Beher 1 içine eklendi.'), obs, act(1.4, '10.0 mL Sirke Beher 1 içine eklendi.')])).toHaveLength(2);
    expect(mergeLines([act(1, '20.0 mL Sirke Beher 1 içine eklendi.'), act(1.1, 'Beher 1 karıştırılıyor.'), act(1.4, '10.0 mL Sirke Beher 1 içine eklendi.')])).toHaveLength(3);
  });
});

describe('lab view: first visit, safety sheet, explainer', () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) });
  });

  it("shows the safety sheet once, then the start card; 'Deney 1'e başla' loads experiment 1 and remembers it", () => {
    const { q, calls } = setup([], true, { intro: { firstVisit: true, startCard: true, last: null } });
    const sheet = q('[data-safety-sheet]');
    expect(sheet.hidden).toBe(false);
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(sheet.querySelectorAll('.safety-table tbody tr')).toHaveLength(10);
    const verdicts = [...sheet.querySelectorAll('.verdict')].map((v) => v.textContent);
    expect(verdicts).toEqual(expect.arrayContaining(['Gözetimle', 'Hayır', 'Asla']));
    expect(sheet.querySelectorAll('a.src-link').length).toBeGreaterThan(10);
    expect(q('[data-start-card]').hidden).toBe(true);
    q<HTMLButtonElement>('[data-safety-close]').click();
    expect(localStorage.getItem('bilim.labSafetySeen')).toBe('1');
    expect(q('[data-start-card]').hidden).toBe(false);
    expect(q('[data-start-card]').querySelectorAll('.start-item')).toHaveLength(11);
    q<HTMLButtonElement>('[data-start-first]').click();
    expect(q('[data-start-card]').hidden).toBe(true);
    expect(calls).toContain(`load:${first}`);
    expect(localStorage.getItem('bilim.labLast')).toBe(first);
  });

  it('the start card is dismissible, can pick the free bench, and the toolbar button reopens the safety sheet', () => {
    const { q, calls } = setup([], true, { intro: { firstVisit: false, startCard: true, last: 'serbest' } });
    expect(q('[data-safety-sheet]').hidden).toBe(true);
    expect(q('[data-start-card]').hidden).toBe(false);
    q<HTMLButtonElement>('[data-start-close]').click();
    expect(q('[data-start-card]').hidden).toBe(true);
    expect(calls.some((c) => c.startsWith('load:'))).toBe(false);
    q<HTMLButtonElement>('[data-safety]').click();
    expect(q('[data-safety-sheet]').hidden).toBe(false);
    q<HTMLButtonElement>('[data-safety-close]').click();
    const again = setup([], true, { intro: { firstVisit: false, startCard: true, last: 'serbest' } });
    again.q<HTMLButtonElement>('[data-start=serbest]').click();
    expect(again.calls).toContain('load:null');
    expect(localStorage.getItem('bilim.labLast')).toBe('serbest');
  });

  it('"Nedenini göster" opens the level-aware timeline track; Sorular decides whether questions pause it', () => {
    for (const questions of [true, false]) {
      const { q, lab, view, calls } = setup([], questions, { timeline: true, motion: true });
      lab.runScript(getExperiment(first)!.solution);
      view.refresh();
      q<HTMLButtonElement>('[data-explain]').click();
      expect(calls).toContain('paused:true');
      expect(q('.explain-phase .phase-title').textContent).not.toBe('');
      expect(q('.explain-phase .explain-caption').textContent!.length).toBeGreaterThan(10);
      expect(q('.explain-dock:not([hidden]) .segments').children.length).toBeGreaterThan(3);
      expect(q('.explain-dock:not([hidden]) .markers').children.length).toBeGreaterThan(0);
      q<HTMLSelectElement>('.explain-dock:not([hidden]) [data-speed]').value = '2';
      q<HTMLSelectElement>('.explain-dock:not([hidden]) [data-speed]').dispatchEvent(new Event('change'));
      q<HTMLButtonElement>('.explain-dock:not([hidden]) [data-play]').click();
      let prompted = false;
      let t = 0;
      for (let i = 0; i < 400 && !prompted; i++) {
        view.tick(0.25);
        const overlay = q('.explain-dock:not([hidden]) .prompt-overlay');
        prompted = !overlay.hidden;
        t = Number(q<HTMLInputElement>('.explain-dock:not([hidden]) [data-scrub]').value);
      }
      expect(prompted).toBe(questions);
      if (!questions) expect(t).toBeGreaterThan(20);
      q<HTMLButtonElement>('.explain-dock:not([hidden]) [data-back]').click();
      expect(calls).toContain('explainClose');
    }
  });
});
