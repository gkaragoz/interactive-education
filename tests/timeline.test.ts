import { describe, expect, it } from 'vitest';
import { chartValueAt, chartValuesAt, ModuleSession, moduleHash, parseModuleRoute, parseRoute, phasesFor, Player, SPEEDS } from '../src/core';
import { findModule, homeModules, openableModules, RELEASED, UPCOMING } from '../src/modules';
import { demoInfo } from '../src/modules/demo/info';
import { demoPose } from '../src/modules/demo/scene';

const phases = [
  { id: 'a', start: 0, end: 4 },
  { id: 'b', start: 4, end: 8 },
  { id: 'c', start: 8, end: 12 },
];

describe('Player', () => {
  it('is deterministic: the same ticks always give the same times', () => {
    const run = (): number[] => {
      const p = new Player(12, phases, false);
      p.setSpeed(1.5);
      p.play();
      return Array.from({ length: 30 }, () => (p.tick(0.1), p.time));
    };
    expect(run()).toEqual(run());
    expect(run().at(-1)).toBeCloseTo(4.5, 9);
  });

  it('stops at the end, restarts from zero on play, and wraps when looping', () => {
    const p = new Player(10, phases, false);
    p.play();
    const end = p.tick(11);
    expect(end).toMatchObject({ ended: true, wrapped: false });
    expect(p.playing).toBe(false);
    expect(p.time).toBe(10);
    p.play();
    expect(p.time).toBe(0);
    p.setLoop(true);
    const wrap = p.tick(13);
    expect(wrap).toMatchObject({ ended: true, wrapped: true });
    expect(p.playing).toBe(true);
    expect(p.time).toBeCloseTo(3, 9);
  });

  it('clamps seek and speed, and ignores ticks while paused', () => {
    const p = new Player(12, phases, false);
    p.seek(-5);
    expect(p.time).toBe(0);
    p.seek(99);
    expect(p.time).toBe(12);
    p.setSpeed(10);
    expect(p.speed).toBe(2);
    p.setSpeed(0.01);
    expect(p.speed).toBe(0.25);
    p.seek(1);
    expect(p.tick(1)).toBeNull();
    expect(p.time).toBe(1);
  });

  it('steps through phases forward and back', () => {
    const p = new Player(12, phases, false);
    p.stepPhase(1);
    expect(p.time).toBe(4);
    p.seek(5);
    p.stepPhase(-1);
    expect(p.time).toBe(4);
    p.stepPhase(-1);
    expect(p.time).toBe(0);
    p.seek(9);
    p.stepPhase(1);
    expect(p.time).toBe(12);
    expect(p.phaseIndexAt(4)).toBe(1);
    expect(p.phaseIndexAt(12)).toBe(2);
  });

  it('with reduced motion play does nothing but stepping and seeking work', () => {
    const p = new Player(12, phases, true);
    expect(p.play()).toBe(false);
    expect(p.playing).toBe(false);
    p.stepPhase(1);
    expect(p.time).toBe(4);
  });

  it('nudges the speed along the allowed steps', () => {
    const p = new Player(12, phases, false);
    p.nudgeSpeed(1);
    expect(p.speed).toBe(1.5);
    p.nudgeSpeed(1);
    p.nudgeSpeed(1);
    expect(p.speed).toBe(SPEEDS.at(-1));
    for (let i = 0; i < 8; i++) p.nudgeSpeed(-1);
    expect(p.speed).toBe(SPEEDS[0]);
  });
});

describe('charts', () => {
  const track = demoInfo.tracks[0]!;
  it('interpolates linearly between phase points and holds after the last', () => {
    const series = { id: 'x', labelTr: 'x', unitTr: '', color: '#000', min: 0, max: 10 };
    const ph = [
      { ...track.phases[0]!, start: 0, chartPoints: { x: 0 } },
      { ...track.phases[1]!, start: 10, chartPoints: { x: 10 } },
    ];
    expect(chartValueAt(series, ph, 5)).toBeCloseTo(5, 9);
    expect(chartValueAt(series, ph, 20)).toBe(10);
    expect(chartValueAt(series, ph, -3)).toBe(0);
    expect(chartValuesAt([series], [], 3)).toEqual({ x: 0 });
  });
});

describe('ModuleSession', () => {
  const make = (level: 'temel' | 'ileri' = 'ileri', reduced = false): ModuleSession => new ModuleSession(demoInfo, 'demo', level, reduced);

  it('filters phases and questions by level', () => {
    expect(make('temel').phases.map((p) => p.id)).toEqual(['donme', 'ayrilma']);
    expect(make('ileri').phases.map((p) => p.id)).toEqual(['donme', 'ayrilma', 'durulma']);
    expect(make('temel').questions).toHaveLength(1);
    expect(make('ileri').questions).toHaveLength(2);
    expect(phasesFor(demoInfo.tracks[0]!, 'temel')).toHaveLength(2);
  });

  it('pauses and prompts when the playhead crosses a question, then continues after the answer', () => {
    const s = make();
    s.player.play();
    for (let i = 0; i < 40 && !s.prompt; i++) s.tick(0.1);
    expect(s.prompt?.kind).toBe('check');
    expect(s.player.playing).toBe(false);
    expect(s.player.time).toBe(3);
    expect(s.tick(1)).toBeNull(); // frozen while a prompt is open
    expect(s.answer(1)).toBe(false);
    expect(s.answer(0)).toBeNull(); // only one answer
    expect(s.tally).toEqual({ answered: 1, correct: 0 });
    s.dismiss(true);
    expect(s.player.playing).toBe(true);
    for (let i = 0; i < 40 && !s.prompt; i++) s.tick(0.1);
    expect(s.prompt?.kind).toBe('predict'); // the predict prompt at 5 s comes next
    s.reveal();
    expect(s.prompt).toMatchObject({ kind: 'predict', revealed: true });
  });

  it('fires prompts again after the learner rewinds, and counts right answers', () => {
    const s = make();
    s.openCheck('demo-1');
    expect(s.answer(0)).toBe(true);
    expect(s.tally).toEqual({ answered: 1, correct: 1 });
    s.dismiss();
    s.player.seek(0);
    s.rewound(0);
    s.player.play();
    for (let i = 0; i < 40 && !s.prompt; i++) s.tick(0.1);
    expect(s.prompt?.kind).toBe('check');
  });

  it('predict prompts follow their track: a prompt for another track never fires', () => {
    const only = { ...demoInfo, predicts: [{ trackId: 'other', atTime: 1, levels: ['ileri' as const], promptTr: 'x', answerTr: 'y' }, { atTime: 2, levels: ['ileri' as const], promptTr: 'all', answerTr: 'y' }], checks: [] };
    const s = new ModuleSession(only, 'demo', 'ileri', false);
    s.player.play();
    for (let i = 0; i < 40 && !s.prompt; i++) s.tick(0.1);
    expect(s.prompt).toMatchObject({ kind: 'predict', predict: { promptTr: 'all' } });
  });

  it('chart values come from the phase points', () => {
    expect(Object.keys(make().chartValues(6))).toEqual(['ayrilma', 'sayi']);
  });
});

describe('module routes', () => {
  it('parses #/modul/<id>[/<track>] and rejects anything unsafe', () => {
    expect(parseModuleRoute('#/modul/mitosis-meiosis')).toEqual({ id: 'mitosis-meiosis', track: null });
    expect(parseModuleRoute('#/modul/mitosis-meiosis/mayoz-1')).toEqual({ id: 'mitosis-meiosis', track: 'mayoz-1' });
    expect(parseModuleRoute('#/modul/__demo')).toEqual({ id: '__demo', track: null });
    expect(parseModuleRoute('#/modul')).toBeNull();
    expect(parseModuleRoute('#/modul/<script>')).toBeNull();
    expect(parseModuleRoute('#/modul/a/../b')).toBeNull();
    expect(parseModuleRoute('#/modul/%E0%A4%A')).toBeNull();
    expect(parseModuleRoute('#/kaynakca')).toBeNull();
    expect(moduleHash('energy', 'foto')).toBe('#/modul/energy/foto');
  });

  it('route names: modules are their own route, and the cell module is the explorer', () => {
    expect(parseRoute('#/modul/energy')).toBe('modul');
    expect(parseRoute('#/modul/cell')).toBe('explore');
    expect(parseRoute('#/kaynakca')).toBe('kaynakca');
  });
});

describe('module registry', () => {
  it('lists only released modules on the home page; unreleased ones are just announced', () => {
    expect(homeModules().map((m) => m.id)).toEqual(RELEASED.map((m) => m.id));
    expect(RELEASED.map((m) => m.id)).toContain('cell');
    for (const u of UPCOMING) expect(findModule(u.id, { demo: false })).toBeNull();
  });

  it('exposes the test module only when asked', () => {
    expect(findModule('__demo', { demo: false })).toBeNull();
    expect(findModule('__demo', { demo: true })?.definition).not.toBeNull();
    expect(openableModules({ demo: false }).some((m) => m.id === '__demo')).toBe(false);
    expect(homeModules().some((m) => m.id === '__demo')).toBe(false);
  });

  it('loads a definition lazily and its info matches its scene duration', async () => {
    const entry = findModule('__demo', { demo: true })!;
    const { info } = await entry.definition!.load();
    expect(info.id).toBe('__demo');
    expect(info.tracks[0]?.duration).toBe(12);
  });
});

describe('demo scene is a pure function of time', () => {
  it('gives the same pose for the same t, in any order', () => {
    const times = [0, 3, 6, 9, 12];
    const forward = times.map((t) => demoPose(t, 1, 2).position.x);
    const backward = [...times].reverse().map((t) => demoPose(t, 1, 2).position.x).reverse();
    expect(forward).toEqual(backward);
    expect(demoPose(8, 1, 2).position.x).toBeGreaterThan(demoPose(0, 1, 2).position.x);
  });
});
