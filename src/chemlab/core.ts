/**
 * LabCore: the mutable state of one lab bench plus journal helpers. The `LabSim` class wraps it; ops and the stepper
 * are plain functions over it so that each file stays small and testable.
 */
import { mulberry32, type Rng } from '../core';
import type { EngineCtx, ObsTag } from './reactions';
import type { JournalEntry, JournalKind, Ledger, SimEvent } from './labTypes';
import { cloneVessel, newVessel, type Vessel, type VesselKind } from './vessel';

const MAX_JOURNAL = 2000;

export interface CoreSnapshot {
  t: number;
  ambientC: number;
  rngCalls: number;
  vessels: Vessel[];
  ledger: Ledger;
  log: JournalEntry[];
  balance: { vesselId: string | null; tare: number };
  titration: Array<{ ml: number; ph: number }>;
  done: Array<{ op: string; vessel?: string }>;
}

export class LabCore {
  t = 0;
  ambientC: number;
  rngCalls = 0;
  vessels = new Map<string, Vessel>();
  ledger: Ledger = { supplied: 0, fromAir: 0, escaped: 0, spilled: 0 };
  log: JournalEntry[] = [];
  events: SimEvent[] = [];
  balance: { vesselId: string | null; tare: number } = { vesselId: null, tare: 0 };
  titration: Array<{ ml: number; ph: number }> = [];
  done: Array<{ op: string; vessel?: string }> = [];
  private rng: Rng;

  constructor(readonly seed: number, ambientC = 22) {
    this.ambientC = ambientC;
    this.rng = mulberry32(seed);
  }

  random(): number {
    this.rngCalls++;
    return this.rng();
  }

  addVessel(id: string, kind: VesselKind, labelTr?: string): Vessel {
    const v = newVessel(id, kind, labelTr, this.ambientC);
    this.vessels.set(id, v);
    return v;
  }

  vessel(id: string): Vessel | undefined {
    return this.vessels.get(id);
  }

  journal(kind: JournalKind, textTr: string, vessel?: string, tag?: ObsTag): void {
    this.log.push({ t: this.t, kind, textTr, vessel, tag });
    if (this.log.length > MAX_JOURNAL) this.log.shift();
  }

  event(kind: SimEvent['kind'], vessel: string, value?: number): void {
    this.events.push({ t: this.t, kind, vessel, value });
    if (this.events.length > 500) this.events.shift();
  }

  /** Logs an observation once per vessel and id. */
  observe(v: Vessel, id: string, tag: ObsTag, textTr: string, flash?: number): void {
    if (flash !== undefined) {
      v.flash = Math.max(v.flash, Math.min(1, flash));
      this.event('flash', v.id, flash);
    }
    if (v.seen.includes(id)) return;
    v.seen.push(id);
    this.journal('observation', `${v.labelTr}: ${textTr}`, v.id, tag);
  }

  /** Logs an observation every time (used for changes that can repeat, e.g. temperature). */
  note(v: Vessel, tag: ObsTag, textTr: string): void {
    this.journal('observation', `${v.labelTr}: ${textTr}`, v.id, tag);
  }

  ctx(): EngineCtx {
    return {
      fromAir: (g) => {
        this.ledger.fromAir += g;
      },
      observe: (v, id, tag, text, flash) => this.observe(v, id, tag, text, flash),
    };
  }

  snapshot(): CoreSnapshot {
    return JSON.parse(
      JSON.stringify({
        t: this.t, ambientC: this.ambientC, rngCalls: this.rngCalls, vessels: [...this.vessels.values()], ledger: this.ledger,
        log: this.log, balance: this.balance, titration: this.titration, done: this.done,
      }),
    ) as CoreSnapshot;
  }

  restore(s: CoreSnapshot): void {
    const c = JSON.parse(JSON.stringify(s)) as CoreSnapshot;
    this.t = c.t;
    this.ambientC = c.ambientC;
    this.vessels = new Map(c.vessels.map((v) => [v.id, cloneVessel(v)] as const));
    this.ledger = c.ledger;
    this.log = c.log;
    this.balance = c.balance;
    this.titration = c.titration;
    this.done = c.done;
    this.events = [];
    this.rng = mulberry32(this.seed);
    for (let i = 0; i < c.rngCalls; i++) this.rng();
    this.rngCalls = c.rngCalls;
  }
}
