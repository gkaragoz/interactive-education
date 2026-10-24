// Content contract for animated learning modules (cell division, transport, DNA, energy, ...).
// Owned by the lead. Learner-facing strings are Turkish; ids are English kebab-case.
// Reuses LevelId / Source / Kazanim from ./types.

import type { LevelId } from './types';

export type { LevelId };

export type ModuleId =
  | 'cell' // the existing cell explorer
  | 'mitosis-meiosis'
  | 'membrane-transport'
  | 'dna-protein'
  | 'energy'
  | 'muscle'
  | 'nervous'
  | 'genetics'
  | 'chem-lab';

export interface PhaseText {
  summary: string; // 1-2 sentences, what the learner sees right now
  details: string[]; // short facts; empty at 'temel' when the programme limits detail
}

/** One named stage of the timeline (e.g. profaz). Times are seconds at speed 1. */
export interface PhaseInfo {
  id: string; // kebab-case, unique inside the track
  nameTr: string;
  start: number;
  end: number;
  levels: LevelId[]; // levels this phase is shown at (meiosis II or crossing over may be 'ileri' only)
  text: Partial<Record<LevelId, PhaseText>>;
  /** Value of each chart series at the START of the phase (series interpolate linearly between phase points unless the scene supplies its own). */
  chartPoints?: Record<string, number>;
}

/** A track is one animation (e.g. 'mitoz', 'mayoz-1', 'mayoz-2'); a module can have several, shown as tabs. */
export interface TrackInfo {
  id: string;
  nameTr: string;
  tagline: string;
  duration: number;
  levels: LevelId[];
  phases: PhaseInfo[];
  /** Simplification notes shown under the stage (see ADR on simplifications), e.g. '2n=4 gösterim için sadeleştirilmiştir'. */
  notes: string[];
}

export interface ChartSeries {
  /** Tracks that show this series; undefined = every track of the module. */
  trackIds?: string[];
  id: string; // e.g. 'chromosome-count', 'dna-amount'
  labelTr: string;
  unitTr: string;
  color: string; // hex
  min: number;
  max: number;
}

export interface CheckQuestion {
  id: string;
  trackId: string;
  /** Shown when the playhead reaches `atTime` (pause + prompt); also reachable from the 'Kendini dene' list. */
  atTime: number;
  levels: LevelId[];
  promptTr: string;
  options: string[]; // 3-4 short options
  correctIndex: number;
  explanationTr: string; // shown after answering, in our own words
  kind: 'which-phase' | 'what-next' | 'count' | 'concept';
}

export interface PredictPrompt {
  /** Track the prompt belongs to; undefined = every track of the module. */
  trackId?: string;
  atTime: number; // pause point
  levels: LevelId[];
  promptTr: string; // 'Sence sırada ne olacak?'
  answerTr: string; // revealed on resume
}

export interface ModuleOption {
  /** Tracks this option applies to; undefined = every track of the module. */
  trackIds?: string[];
  id: string; // e.g. 'chromosome-set'
  labelTr: string;
  choices: { id: string; labelTr: string; levels?: LevelId[] }[];
  defaultChoice: string;
}

export interface ModuleInfo {
  id: ModuleId;
  nameTr: string;
  tagline: string;
  /** Short intro on the module home card and header. */
  introTr: string;
  levels: LevelId[];
  tracks: TrackInfo[];
  charts: ChartSeries[];
  checks: CheckQuestion[];
  predicts: PredictPrompt[];
  options: ModuleOption[];
  kazanimIds: string[]; // must exist in kazanimlar
  sourceIds: string[]; // at least one; must exist in sources
  /** Each simplification the animation makes, listed on the module page. */
  simplifications: string[];
  glossary: { termTr: string; definitionTr: string }[];
  funFacts: { level: LevelId; text: string; sourceId: string }[];
}

/** A question the lab asks when a guided step is done ("Kendini dene"); respects the Sorular setting like timeline checks. */
export interface SimPrompt {
  id: string;
  experimentId: string;
  /** Asked right after this step of the experiment is detected as done. */
  afterStepId: string;
  promptTr: string;
  options: string[];
  correctIndex: number;
  explanationTr: string;
  levels: LevelId[];
}

/** Content of an interactive sim module (docs/SIMS.md): the same card fields as ModuleInfo, no tracks or timeline data. */
export interface SimInfo {
  kind: 'sim';
  id: ModuleId;
  nameTr: string;
  tagline: string;
  introTr: string;
  levels: LevelId[];
  prompts: SimPrompt[];
  kazanimIds: string[];
  sourceIds: string[];
  simplifications: string[];
  glossary: { termTr: string; definitionTr: string }[];
  funFacts: { level: LevelId; text: string; sourceId: string }[];
}
