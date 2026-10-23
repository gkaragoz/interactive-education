/** The ten experiments of the chemistry lab, in dossier order. */
import { E01 } from './e01';
import { E02 } from './e02';
import { E03 } from './e03';
import { E04 } from './e04';
import { E05 } from './e05';
import { E06 } from './e06';
import { E07 } from './e07';
import { E08 } from './e08';
import { E09 } from './e09';
import { E10 } from './e10';
import type { ExperimentDef } from './types';

export const EXPERIMENTS: readonly ExperimentDef[] = [E01, E02, E03, E04, E05, E06, E07, E08, E09, E10];

export function getExperiment(id: string): ExperimentDef | undefined {
  return EXPERIMENTS.find((e) => e.id === id);
}

export type { ExperimentDef, ExperimentStep, ParticleScript, ParticleStage, ParticleSpecies, EquationDef, Expectation, Measurable, SourceRef } from './types';
