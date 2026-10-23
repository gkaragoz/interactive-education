/** Shared types of the lab simulation: operation results, journal (Defter), events, measurements and scripted ops. */
import type { HazardBlock } from './hazards';
import type { ObsTag } from './reactions';
import type { HeatSource, Closure, VesselKind } from './vessel';

export interface OpResult {
  ok: boolean;
  /** Present when the engine refused to simulate a dangerous combination or action. */
  blocked?: HazardBlock;
  /** Turkish explanation for refusals and warnings. */
  messageTr?: string;
  /** A number the op produced (balance reading, pH, volume, ...). */
  value?: number;
}

export type JournalKind = 'action' | 'observation' | 'measurement' | 'warning' | 'blocked';

/** One line of the lab notebook (Defter). */
export interface JournalEntry {
  /** Simulated seconds since the start. */
  t: number;
  kind: JournalKind;
  vessel?: string;
  tag?: ObsTag;
  textTr: string;
}

/** Things the renderer may want to react to (sounds are out of scope for the first release; this is for flashes and spills). */
export interface SimEvent {
  t: number;
  kind: 'flash' | 'spill' | 'pop' | 'blocked' | 'boil' | 'limb-full' | 'pour';
  vessel: string;
  value?: number;
}

export interface SimMeasurement {
  id: string;
  labelTr: string;
  value: number | string;
  unit?: string;
}

export interface Ledger {
  /** Mass drawn from bottles (g), including catalysts. */
  supplied: number;
  /** Oxygen taken from the air by reactions (g). */
  fromAir: number;
  /** Gas and vapour that left open vessels (g). */
  escaped: number;
  /** Liquid that overflowed onto the bench (g). */
  spilled: number;
}

export interface BenchSetup {
  ambientC?: number;
  vessels: ReadonlyArray<{ id: string; kind: VesselKind; labelTr?: string }>;
  /** Ops applied right after the vessels are created (pre-filled containers). */
  preload?: readonly Op[];
}

export type Op =
  | { op: 'pour'; from: string; to: string; ml: number }
  | { op: 'dispense'; burette: string; to: string; ml: number }
  | { op: 'add'; reagent: string; to: string; g: number; powder?: boolean }
  | { op: 'drop'; reagent: string; to: string; n: number }
  | { op: 'heat'; vessel: string; source: HeatSource | null }
  | { op: 'cool'; vessel: string; on: boolean }
  | { op: 'stir'; vessel: string; on: boolean }
  | { op: 'place'; vessel: string | null }
  | { op: 'tare' }
  | { op: 'weigh'; vessel: string }
  | { op: 'readvol'; vessel: string }
  | { op: 'filter'; from: string; to: string }
  | { op: 'close'; vessel: string; closure: Closure }
  | { op: 'lid'; vessel: string; open: boolean }
  | { op: 'gasline'; from: string; to: string | null }
  | { op: 'ignite'; vessel: string }
  | { op: 'testgas'; vessel: string; test: 'flame' | 'glowing-splint' | 'limewater' }
  | { op: 'electrodes'; vessel: string; volts: number | null }
  | { op: 'dip'; strip: 'universal-strip' | 'litmus-paper'; vessel: string }
  | { op: 'wait'; s: number };

/** Read-only view for step predicates in the experiment definitions. */
export interface LabView {
  readonly t: number;
  hasVessel(id: string): boolean;
  /** Mass of vessel plus contents in grams. */
  mass(id: string): number;
  /** Moles of a species key in a vessel. */
  moles(id: string, key: string): number;
  /** Grams of a species key in a vessel. */
  grams(id: string, key: string): number;
  volumeMl(id: string): number;
  ph(id: string): number | null;
  tempC(id: string): number;
  /** Cumulative extent of a rule (mol). */
  extent(id: string, ruleId: string): number;
  indicatorMl(id: string, indicator: string): number;
  catalystG(id: string, catalyst: string): number;
  gasMl(id: string, gas: string): number;
  closure(id: string): Closure;
  heating(id: string): HeatSource | null;
  stirring(id: string): boolean;
  electrodesVolts(id: string): number | null;
  gasLine(id: string): string | null;
  onBalance(): string | null;
  /** True if the journal holds an observation with this tag (optionally for one vessel). */
  observed(tag: ObsTag, vessel?: string): boolean;
  /** True if a journal line contains this text (Turkish fragment), optionally for one vessel. */
  noted(fragment: string, vessel?: string): boolean;
  /** True if the learner has done this kind of op (actions are counted when they succeed). */
  did(op: Op['op'], vessel?: string): boolean;
  /** Last pH reading taken with a strip on the vessel, if any. */
  dipped(vessel: string): boolean;
  colour(id: string): readonly [number, number, number];
  precipitateG(id: string): number;
  solidG(id: string, substanceId: string): number;
  /** Grams of gas and vapour that left open vessels so far. */
  escapedG(): number;
  /** Titration log: volume added from the burette and the flask pH after each addition. */
  titration(): ReadonlyArray<{ ml: number; ph: number }>;
}
