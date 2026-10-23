import type { CheckQuestion, ModuleInfo, PhaseInfo, PredictPrompt, TrackInfo } from '../data/moduleTypes';
import type { LevelId } from '../data/types';
import { chartValuesAt, Player, type PlayerEvent } from './timeline';

export type Prompt =
  | { kind: 'check'; check: CheckQuestion; answered: number | null }
  | { kind: 'predict'; predict: PredictPrompt; revealed: boolean };

export interface Tally {
  answered: number;
  correct: number;
}

type Listener = () => void;

const levelOk = (levels: readonly LevelId[], level: LevelId): boolean => levels.includes(level);

/** Phases shown at a level; a track whose phases all lack the level keeps them all so the timeline never goes empty. */
export function phasesFor(track: TrackInfo, level: LevelId): PhaseInfo[] {
  const shown = track.phases.filter((p) => levelOk(p.levels, level));
  return [...(shown.length > 0 ? shown : track.phases)].sort((a, b) => a.start - b.start);
}

/** Tracks offered at a level (e.g. the non-disjunction track is İleri only). Never empty: falls back to all tracks. */
export function tracksFor(info: ModuleInfo, level: LevelId): TrackInfo[] {
  const shown = info.tracks.filter((t) => levelOk(t.levels, level));
  return shown.length > 0 ? shown : [...info.tracks];
}

/** The requested track when it exists at this level, otherwise the first track that does. */
export function resolveTrack(info: ModuleInfo, trackId: string | null, level: LevelId): TrackInfo {
  const list = tracksFor(info, level);
  const track = list.find((t) => t.id === trackId) ?? list[0];
  if (!track) throw new Error(`module ${info.id} has no tracks`);
  return track;
}

/** Level-filtered text of a phase (falls back to the other level so a phase is never blank). */
export function phaseText(phase: PhaseInfo, level: LevelId): { summary: string; details: string[] } | null {
  return phase.text[level] ?? phase.text.ileri ?? phase.text.temel ?? null;
}

/**
 * Everything the module UI needs besides the picture: the player, the level-filtered phases, the chart values and the
 * "Kendini dene" / "Tahmin et" prompts. A prompt fires when the playhead crosses its `atTime` while playing: playback
 * pauses and the prompt waits for an answer. Pure logic, no DOM, no three.js.
 */
export class ModuleSession {
  readonly player: Player;
  readonly track: TrackInfo;
  readonly phases: PhaseInfo[];
  prompt: Prompt | null = null;
  tally: Tally = { answered: 0, correct: 0 };
  private readonly checks: CheckQuestion[];
  private readonly predicts: PredictPrompt[];
  private readonly done = new Set<string>();
  private readonly listeners = new Set<Listener>();

  constructor(
    readonly info: ModuleInfo,
    trackId: string,
    readonly level: LevelId,
    reducedMotion: boolean,
  ) {
    const track = resolveTrack(info, trackId, level);
    this.track = track;
    this.phases = phasesFor(track, level);
    this.player = new Player(track.duration, this.phases, reducedMotion);
    this.checks = info.checks.filter((c) => c.trackId === track.id && levelOk(c.levels, level)).sort((a, b) => a.atTime - b.atTime);
    // A prompt without a trackId belongs to every track.
    this.predicts = info.predicts.filter((p) => levelOk(p.levels, level) && (p.trackId === undefined || p.trackId === track.id));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of [...this.listeners]) l();
  }

  get currentPhase(): PhaseInfo | null {
    const i = this.player.phaseIndexAt(this.player.time);
    return this.phases[i] ?? null;
  }

  chartValues(t = this.player.time): Record<string, number> {
    return chartValuesAt(this.info.charts, this.phases, t);
  }

  /** All questions of the track at this level (the "Kendini dene" list). */
  get questions(): readonly CheckQuestion[] {
    return this.checks;
  }

  /** Advances the player by `dt` real seconds and fires the prompts the playhead passed. */
  tick(dt: number): PlayerEvent | null {
    if (this.prompt) return null;
    const event = this.player.tick(dt);
    if (event) this.fire(event.from, event.to, event.wrapped);
    return event;
  }

  private fire(from: number, to: number, wrapped: boolean): void {
    if (wrapped) this.done.clear();
    const crossed = (at: number): boolean => (wrapped ? at > from || at <= to : at > from && at <= to);
    const check = this.checks.find((c) => !this.done.has(c.id) && crossed(c.atTime));
    const predict = check ? undefined : this.predicts.find((p) => !this.done.has(`p@${p.atTime}`) && crossed(p.atTime));
    if (check) {
      this.done.add(check.id);
      this.openPrompt({ kind: 'check', check, answered: null }, check.atTime);
    } else if (predict) {
      this.done.add(`p@${predict.atTime}`);
      this.openPrompt({ kind: 'predict', predict, revealed: false }, predict.atTime);
    }
  }

  private openPrompt(prompt: Prompt, at: number): void {
    this.player.pause();
    this.player.seek(at);
    this.prompt = prompt;
    this.emit();
  }

  /** Opens one question from the list (user chose it): the playhead moves to its time. */
  openCheck(id: string): void {
    const check = this.checks.find((c) => c.id === id);
    if (!check) return;
    this.done.add(check.id);
    this.openPrompt({ kind: 'check', check, answered: null }, check.atTime);
  }

  /** Records an answer; returns whether it was right (null when there is no open question or it was answered). */
  answer(index: number): boolean | null {
    const p = this.prompt;
    if (!p || p.kind !== 'check' || p.answered !== null) return null;
    p.answered = index;
    const correct = index === p.check.correctIndex;
    this.tally = { answered: this.tally.answered + 1, correct: this.tally.correct + (correct ? 1 : 0) };
    this.emit();
    return correct;
  }

  /** Predict prompts reveal their answer first; `dismiss` then closes any prompt and the playback can go on. */
  reveal(): void {
    const p = this.prompt;
    if (p?.kind === 'predict') {
      p.revealed = true;
      this.emit();
    }
  }

  dismiss(resume = false): void {
    if (!this.prompt) return;
    this.prompt = null;
    this.emit();
    if (resume) this.player.play();
  }

  /** Forgets answered prompts when the learner seeks backwards, so they fire again on the next pass. */
  rewound(to: number): void {
    for (const c of this.checks) if (c.atTime > to) this.done.delete(c.id);
    for (const p of this.predicts) if (p.atTime > to) this.done.delete(`p@${p.atTime}`);
  }
}
