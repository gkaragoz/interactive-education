/**
 * LabSim: the engine side of the SimScene contract (docs/SIMS.md) for the chemistry lab. No three.js and no DOM; the
 * render layer reads `visuals()`, `measurements()` and the journal. All outcomes are deterministic given the seed and the
 * op sequence (fixed steps, ordered rules, seeded RNG only for the size of a drop).
 */
import { hashString } from '../core';
import { liquidRgb, visualOf, type VesselVisual } from './colors';
import { LabCore, type CoreSnapshot } from './core';
import { gasVolumeMl } from './electrolysis';
import { balloonMl } from './gas';
import type { BenchSetup, JournalEntry, LabView, Op, OpResult, SimEvent, SimMeasurement } from './labTypes';
import { solidMol } from './mixture';
import * as ops from './ops';
import type { ObsTag } from './reactions';
import { stepLab } from './stepper';
import { MOLAR_VOLUME_L, speciesOf } from './species';
import { getSubstance } from './substances';
import { contentMass, totalMass, volumeMl, vesselPh, type Closure, type HeatSource, type Vessel, type VesselKind } from './vessel';

export interface SimParam { id: string; labelTr: string; unit?: string; min: number; max: number; step: number; default: number; lockedInChallenge?: boolean }

export const FIXED_DT = 1 / 60;

export class LabSim {
  private core: LabCore;
  private bench: BenchSetup | null = null;
  readonly params: SimParam[] = [{ id: 'ambientC', labelTr: 'Oda sıcaklığı', unit: '°C', min: 10, max: 35, step: 1, default: 22 }];

  constructor(opts: { seed?: number; ambientC?: number; bench?: BenchSetup } = {}) {
    this.core = new LabCore(opts.seed ?? 1, opts.ambientC ?? opts.bench?.ambientC ?? 22);
    if (opts.bench) this.loadBench(opts.bench);
  }

  get seed(): number {
    return this.core.seed;
  }
  get time(): number {
    return this.core.t;
  }

  // ---- setup -------------------------------------------------------------------------------------------------

  loadBench(bench: BenchSetup): void {
    this.bench = bench;
    this.core = new LabCore(this.core.seed, bench.ambientC ?? this.core.ambientC);
    for (const v of bench.vessels) this.addVessel(v.id, v.kind, v.labelTr);
    for (const op of bench.preload ?? []) this.apply(op);
    this.core.log = [];
    this.core.done = [];
    this.core.events = [];
    for (const v of this.core.vessels.values()) v.seen = [];
  }

  addVessel(id: string, kind: VesselKind, labelTr?: string): void {
    if (this.core.vessels.has(id)) throw new Error(`Vessel ${id} already exists`);
    const v = this.core.addVessel(id, kind, labelTr);
    if (kind === 'crucible') {
      // air inside the lidded crucible: 25 mL at 21 % oxygen
      const n = (25 / 1000 / MOLAR_VOLUME_L) * 0.21;
      v.mix['g:o2'] = n;
      this.core.ledger.supplied += n * speciesOf('g:o2').molarMass;
    }
  }

  reset(values?: Record<string, number>): void {
    const amb = values?.['ambientC'];
    if (amb !== undefined) this.setParam('ambientC', amb);
    const bench = this.bench;
    const seed = this.core.seed;
    this.core = new LabCore(seed, this.core.ambientC);
    this.bench = null;
    if (bench) this.loadBench(bench);
  }

  setParam(id: string, value: number): void {
    if (id === 'ambientC') this.core.ambientC = Math.min(35, Math.max(10, value));
  }

  // ---- stepping ----------------------------------------------------------------------------------------------

  step(dt: number = FIXED_DT): void {
    stepLab(this.core, dt);
  }

  /** Advances `seconds` of simulated time in steps of dt. */
  advance(seconds: number, dt = 0.1): void {
    let left = seconds;
    while (left > 1e-9) {
      const d = Math.min(dt, left);
      this.step(d);
      left -= d;
    }
  }

  // ---- operations --------------------------------------------------------------------------------------------

  apply(op: Op): OpResult {
    switch (op.op) {
      case 'pour': return this.pour(op.from, op.to, op.ml);
      case 'dispense': return this.dispense(op.burette, op.to, op.ml);
      case 'add': return this.add(op.reagent, op.to, op.g, op.powder);
      case 'drop': return this.drop(op.reagent, op.to, op.n);
      case 'heat': return this.heat(op.vessel, op.source);
      case 'cool': return this.cool(op.vessel, op.on);
      case 'stir': return this.stir(op.vessel, op.on);
      case 'place': return this.place(op.vessel);
      case 'tare': return this.tare();
      case 'weigh': return this.weigh(op.vessel);
      case 'readvol': return this.readVolume(op.vessel);
      case 'filter': return this.filter(op.from, op.to);
      case 'close': return this.close(op.vessel, op.closure);
      case 'lid': return this.lid(op.vessel, op.open);
      case 'gasline': return this.gasline(op.from, op.to);
      case 'ignite': return this.ignite(op.vessel);
      case 'testgas': return this.testGas(op.vessel, op.test);
      case 'electrodes': return this.connectElectrodes(op.vessel, op.volts);
      case 'dip': return this.dip(op.strip, op.vessel);
      case 'wait': this.advance(op.s, Math.min(1, Math.max(0.1, op.s / 100))); return { ok: true };
    }
  }

  runScript(script: readonly Op[]): OpResult[] {
    return script.map((o) => this.apply(o));
  }

  pour(from: string, to: string, mL: number): OpResult { return ops.pour(this.core, from, to, mL); }
  dispense(burette: string, to: string, mL: number): OpResult { return ops.dispense(this.core, burette, to, mL); }
  add(reagent: string, to: string, grams: number, powder = false): OpResult { return ops.add(this.core, reagent, to, grams, powder); }
  drop(reagent: string, to: string, n: number): OpResult { return ops.drop(this.core, reagent, to, n); }
  heat(vessel: string, source: HeatSource | null): OpResult { return ops.heat(this.core, vessel, source); }
  cool(vessel: string, on = true): OpResult { return ops.cool(this.core, vessel, on); }
  stir(vessel: string, on = true): OpResult { return ops.stir(this.core, vessel, on); }
  place(vessel: string | null): OpResult { return ops.place(this.core, vessel); }
  tare(): OpResult { return ops.tare(this.core); }
  weigh(vessel: string): OpResult { return ops.weigh(this.core, vessel); }
  readVolume(vessel: string): OpResult { return ops.readVolume(this.core, vessel); }
  dip(strip: 'universal-strip' | 'litmus-paper', vessel: string): OpResult { return ops.dip(this.core, strip, vessel); }
  filter(funnel: string, receiver: string): OpResult { return ops.filter(this.core, funnel, receiver); }
  close(vessel: string, closure: Closure): OpResult { return ops.close(this.core, vessel, closure); }
  lid(vessel: string, open: boolean): OpResult { return ops.lid(this.core, vessel, open); }
  gasline(from: string, to: string | null): OpResult { return ops.gasline(this.core, from, to); }
  ignite(vessel: string): OpResult { return ops.ignite(this.core, vessel); }
  connectElectrodes(vessel: string, volts: number | null): OpResult { return ops.electrodes(this.core, vessel, volts); }

  /** Gas tests: a burning splint (pop for hydrogen), a glowing splint (relights in oxygen), limewater (cloudy with CO2). */
  testGas(vessel: string, test: 'flame' | 'glowing-splint' | 'limewater'): OpResult {
    const v = this.core.vessel(vessel);
    if (!v) return { ok: false, messageTr: `Bilinmeyen kap: ${vessel}` };
    const n = (id: string): number => v.mix[`g:${id}`] ?? 0;
    if (test === 'flame') {
      const before = v.extent['combustion:h2'] ?? 0;
      ops.ignite(this.core, vessel);
      this.advance(0.3, 0.05);
      const popped = (v.extent['combustion:h2'] ?? 0) > before + 1e-5;
      if (!popped) this.core.journal('observation', `${v.labelTr}: Alev söndü veya aynen yanmaya devam etti; tık sesi duyulmadı.`, v.id, 'none');
      this.core.done.push({ op: 'testgas', vessel });
      return { ok: true, value: popped ? 1 : 0 };
    }
    const hit = test === 'glowing-splint' ? n('o2') > 1e-6 : n('co2') > 1e-6;
    const textTr = test === 'glowing-splint'
      ? (hit ? 'Közlü çıra yeniden alev aldı: tüpte oksijen var.' : 'Közlü çıra yeniden yanmadı.')
      : (hit ? 'Kireç suyu bulanıklaştı: gaz karbondioksit.' : 'Kireç suyu berrak kaldı.');
    this.core.journal('observation', `${v.labelTr}: ${textTr}`, v.id, hit ? 'precipitate' : 'none');
    this.core.done.push({ op: 'testgas', vessel });
    return { ok: true, value: hit ? 1 : 0 };
  }

  // ---- reading state -----------------------------------------------------------------------------------------

  /**
   * What the learner can see in a vessel. Honest about "nothing happened": the engine never invents a reaction, and when
   * no observation followed the last action on the vessel it says so (and whether the mixture is homogeneous or not).
   */
  inspect(vessel: string): { homogeneous: boolean; sediment: boolean; gas: boolean; changed: boolean; textTr: string } {
    const v = this.core.vessel(vessel);
    if (!v) return { homogeneous: true, sediment: false, gas: false, changed: false, textTr: 'Böyle bir kap yok.' };
    let last = -1;
    this.core.log.forEach((e, i) => {
      if (e.vessel === vessel && e.kind === 'action') last = i;
    });
    const changed = this.core.log.slice(last + 1).some((e) => e.vessel === vessel && e.kind === 'observation' && e.tag !== 'none');
    const sediment = Object.keys(v.mix).some((k) => k.startsWith('s:'));
    const gas = Object.keys(v.mix).some((k) => k.startsWith('g:')) || v.gasRate > 1e-6;
    const homogeneous = !sediment && v.foam === 0;
    const textTr = changed
      ? 'Bir değişim gözlendi; Defter e bak.'
      : `Gözlenebilir bir değişim olmadı. ${homogeneous ? 'Karışım tek görünümlü (homojen).' : 'Karışım tek görünümlü değil (heterojen): katı madde var.'}`;
    return { homogeneous, sediment, gas, changed, textTr };
  }

  vessel(id: string): Readonly<Vessel> | undefined { return this.core.vessel(id); }
  vesselIds(): string[] { return [...this.core.vessels.keys()]; }
  get journal(): readonly JournalEntry[] { return this.core.log; }
  get ledger(): Readonly<LabCore['ledger']> { return this.core.ledger; }
  drainEvents(): SimEvent[] { const e = this.core.events; this.core.events = []; return e; }
  visuals(id: string): VesselVisual | undefined { const v = this.core.vessel(id); return v ? visualOf(v) : undefined; }
  ph(id: string): number | null { const v = this.core.vessel(id); return v ? vesselPh(v) : null; }
  titrationLog(): ReadonlyArray<{ ml: number; ph: number }> { return this.core.titration; }

  /** Mass that entered minus mass accounted for (vessels + escaped + spilled), grams; zero when mass is conserved. */
  massBalanceError(): number {
    const l = this.core.ledger;
    let inVessels = 0;
    for (const v of this.core.vessels.values()) inVessels += contentMass(v);
    return l.supplied + l.fromAir - (inVessels + l.escaped + l.spilled);
  }

  measurements(): SimMeasurement[] {
    const out: SimMeasurement[] = [{ id: 'time', labelTr: 'Süre', value: Number(this.core.t.toFixed(1)), unit: 's' }];
    for (const v of this.core.vessels.values()) {
      const vol = volumeMl(v);
      out.push({ id: `T:${v.id}`, labelTr: `${v.labelTr} sıcaklık`, value: Number(v.tempC.toFixed(1)), unit: '°C' });
      if (vol > 0) {
        out.push({ id: `V:${v.id}`, labelTr: `${v.labelTr} hacim`, value: Number(vol.toFixed(1)), unit: 'mL' });
        const ph = vesselPh(v);
        if (ph !== null) out.push({ id: `pH:${v.id}`, labelTr: `${v.labelTr} pH`, value: Number(ph.toFixed(2)) });
      }
      const gas = Object.keys(v.mix).filter((k) => k.startsWith('g:'));
      if (gas.length > 0) {
        const ml = gas.reduce((s, k) => s + gasVolumeMl(v, k.slice(2)), 0);
        out.push({ id: `gas:${v.id}`, labelTr: `${v.labelTr} içindeki gaz`, value: Number(ml.toFixed(1)), unit: 'mL' });
      }
      if (v.closure === 'balloon') out.push({ id: `balloon:${v.id}`, labelTr: 'Balon hacmi', value: Number(balloonMl(v).toFixed(0)), unit: 'mL' });
    }
    const b = this.core.balance.vesselId;
    const bv = b ? this.core.vessel(b) : undefined;
    if (bv) out.push({ id: 'balance', labelTr: 'Terazi', value: Number((Math.round((totalMass(bv) - this.core.balance.tare) * 100) / 100).toFixed(2)), unit: 'g' });
    return out;
  }

  /** Short hash of the whole state, equal for equal histories (determinism tests). */
  stateHash(): number {
    const parts: string[] = [this.core.t.toFixed(6)];
    for (const v of this.core.vessels.values()) {
      parts.push(v.id, v.tempC.toPrecision(10), ...Object.keys(v.mix).sort().map((k) => `${k}=${(v.mix[k] ?? 0).toPrecision(10)}`));
    }
    return hashString(parts.join('|'));
  }

  snapshot(): CoreSnapshot { return this.core.snapshot(); }
  restore(s: unknown): void { this.core.restore(s as CoreSnapshot); }

  /** Read-only view used by the step predicates of the experiment definitions. */
  view(): LabView {
    const c = this.core;
    const need = (id: string): Vessel => {
      const v = c.vessel(id);
      if (!v) throw new Error(`No vessel ${id}`);
      return v;
    };
    return {
      get t() { return c.t; },
      hasVessel: (id) => c.vessels.has(id),
      mass: (id) => totalMass(need(id)),
      moles: (id, key) => {
        const v = need(id);
        return key.startsWith('s:') && !key.endsWith(':p') ? solidMol(v.mix, key.slice(2)) : (v.mix[key] ?? 0);
      },
      grams: (id, key) => {
        const v = need(id);
        const n = key.startsWith('s:') && !key.endsWith(':p') ? solidMol(v.mix, key.slice(2)) : (v.mix[key] ?? 0);
        return n * speciesOf(key).molarMass;
      },
      volumeMl: (id) => volumeMl(need(id)),
      ph: (id) => vesselPh(need(id)),
      tempC: (id) => need(id).tempC,
      extent: (id, rule) => need(id).extent[rule] ?? 0,
      indicatorMl: (id, ind) => need(id).indicators[ind] ?? 0,
      catalystG: (id, cat) => need(id).catalysts[cat] ?? 0,
      gasMl: (id, gas) => gasVolumeMl(need(id), gas),
      closure: (id) => need(id).closure,
      heating: (id) => need(id).heat,
      stirring: (id) => need(id).stirring,
      electrodesVolts: (id) => need(id).electrodes?.volts ?? null,
      gasLine: (id) => need(id).gasTo,
      onBalance: () => c.balance.vesselId,
      observed: (tag: ObsTag, vessel?: string) => c.log.some((e) => e.kind === 'observation' && e.tag === tag && (vessel === undefined || e.vessel === vessel)),
      noted: (fragment, vessel) => c.log.some((e) => e.textTr.includes(fragment) && (vessel === undefined || e.vessel === vessel)),
      did: (op, vessel) => c.done.some((d) => d.op === op && (vessel === undefined || d.vessel === vessel)),
      dipped: (vessel) => c.done.some((d) => d.op === 'dip' && d.vessel === vessel),
      colour: (id) => liquidRgb(need(id)),
      precipitateG: (id) => {
        const v = need(id);
        let g = 0;
        for (const [k, n] of Object.entries(v.mix)) {
          const sp = speciesOf(k);
          const sub = getSubstance(sp.id);
          if (sp.phase === 's' && sub?.solubility && (sub.solubility[0]?.[1] ?? 1) < 0.1) g += n * sp.molarMass;
        }
        return g;
      },
      solidG: (id, sub) => solidMol(need(id).mix, sub) * (getSubstance(sub)?.molarMass ?? 0),
      escapedG: () => c.ledger.escaped,
      titration: () => c.titration,
    };
  }
}
