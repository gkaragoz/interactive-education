/**
 * Experiment definitions: bench setup, steps with detection predicates, expectations, measurables, balanced equations
 * as data and particle scripts for the explainer. Learner-facing strings are Turkish and written in our own words
 * (ADR 0004); sources are listed per experiment and in docs/research/kimya-lab-sources.md.
 */
import type { BenchSetup, LabView, Op } from '../labTypes';
import type { Side } from '../equation';

export interface SourceRef {
  label: string;
  url: string;
}

export interface EquationDef {
  id: string;
  /** Short title, e.g. 'Tam tepkime' or 'Net iyon denklemi'. */
  titleTr: string;
  reactants: Side;
  products: Side;
  /** Word equation for the Temel level (no formulas). */
  wordTr?: string;
}

export interface ExperimentStep {
  id: string;
  textTr: string;
  hintTr: string;
  /** True when the engine state shows the step is done. */
  done: (v: LabView) => boolean;
}

export interface Expectation {
  id: string;
  textTr: string;
  check: (v: LabView) => boolean;
}

export interface Measurable {
  id: string;
  labelTr: string;
  unit: string;
  read: (v: LabView) => number;
  /** Value the dossier arithmetic predicts, with a relative tolerance for tests. */
  expected?: number;
  tolerance?: number;
}

export type ParticleKind = 'molecule' | 'ion' | 'atom' | 'lattice' | 'electron' | 'catalyst';
export interface ParticleSpecies {
  id: string;
  labelTr: string;
  /** Chemical formula without charge; '' for electrons and catalysts. */
  formula: string;
  charge: number;
  kind: ParticleKind;
}
export interface BondEvent {
  species: string;
  /** e.g. 'O-H', 'C=O', 'O-O', 'metal lattice'. */
  bond: string;
}
export interface Transfer {
  kind: 'proton' | 'electron';
  from: string;
  to: string;
  count: number;
}
export type Motion = 'random' | 'approach' | 'rise' | 'drift' | 'vibrate' | 'static' | 'attract';
export interface ParticleStage {
  id: string;
  fromS: number;
  toS: number;
  captionTr: string;
  /** Number of particles of every species at the END of this stage (all species listed, atoms are conserved). */
  counts: Record<string, number>;
  breaks: BondEvent[];
  forms: BondEvent[];
  transfers: Transfer[];
  motion: Motion;
  focus?: string[];
}
/** Compact particle-level story of one reaction, as data for the render layer. */
export interface ParticleScript {
  id: string;
  equationId: string;
  titleTr: string;
  durationS: number;
  species: ParticleSpecies[];
  stages: ParticleStage[];
}

export interface ExperimentDef {
  id: string;
  no: number;
  titleTr: string;
  summaryTr: string;
  levels: Array<'temel' | 'ileri'>;
  virtualOnly: boolean;
  /** Safety lines shown at check-in. */
  safetyTr: string[];
  /** Whether it is fine to try at home (text for the never-at-home table). */
  homeTr: string;
  kazanim: string[];
  sources: SourceRef[];
  bench: BenchSetup;
  /** Reagent ids offered on the shelf for this experiment. */
  shelf: string[];
  equations: EquationDef[];
  steps: ExperimentStep[];
  expectations: Expectation[];
  measurables: Measurable[];
  /** Scripted op sequence that reaches every expectation (also used by the tests). */
  solution: Op[];
  variants?: Record<string, Op[]>;
  particles: ParticleScript[];
}

/** Helper for compact particle stages. */
export function stage(id: string, fromS: number, toS: number, captionTr: string, counts: Record<string, number>, motion: Motion, extra: Partial<ParticleStage> = {}): ParticleStage {
  return { id, fromS, toS, captionTr, counts, motion, breaks: [], forms: [], transfers: [], ...extra };
}
