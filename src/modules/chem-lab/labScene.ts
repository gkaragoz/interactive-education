import { DirectionalLight, Group } from 'three';
import { FIXED_DT, LabSim, getExperiment, type SimEvent, type VesselKind } from '../../chemlab';
import { benchOf, createLabInteractions, shelfOf, type LabSimScene, type SimActionResult, type SimContext, type SimInteractions, type SimMeasurement, type SimPointerEvent, type StageFraming } from '../../scene';
import { BenchStatic } from './bench';
import { benchFraming } from './framing';
import { Closure } from './closure';
import { Highlights } from './highlights';
import { Interactor } from './interact';
import { PourFx } from './pour';
import { BottleView, PieceProp, ToolProp, TOOL_NAMES, type ToolId } from './props';
import { animateAction, buildShelf } from './shelf';
import { GasLines } from './gasLines';
import { HeaterRig } from './heater';
import { LabAssets } from './labAssets';
import { layoutBench, type BenchLayout } from './layout';
import { CrucibleView, FunnelView, GasTubeView, HofmannView } from './kinds';
import { VesselFx } from './vesselFx';
import { VESSEL_DEFS, PROP_ASSETS } from './vesselDefs';
import { VesselView, type ViewDeps } from './vesselView';

/** Every GLB the lab can show, preloaded behind the loading screen so that switching experiments is instant. */
export const ALL_ASSETS: string[] = [...new Set([...Object.values(VESSEL_DEFS).flatMap((d) => (d.asset ? [d.asset] : [])), ...PROP_ASSETS])];

const SAMPLE_S = 0.1;
const HEATABLE: ReadonlySet<VesselKind> = new Set(['beaker100', 'beaker250', 'erlenmeyer250', 'testtube', 'crucible']);
const CLOSABLE: ReadonlySet<VesselKind> = new Set(['beaker100', 'beaker250', 'erlenmeyer250', 'testtube']);

export class ChemLabScene implements LabSimScene {
  readonly root = new Group();
  readonly lab: LabSim;
  readonly params;
  benchY = 0;
  dragLift = 6;
  interactions: SimInteractions;
  readonly items = new Map<string, BottleView | PieceProp>();
  readonly tools = new Map<ToolId, ToolProp>();
  readonly pour: PourFx;
  readonly highlights = new Highlights();
  readonly interact: Interactor;
  readonly reduced: boolean;
  clock = 0;
  /** Framing and orbit limits for the host (set per bench in `rebuild`). */
  camera: StageFraming | undefined;
  readonly views = new Map<string, VesselView>();
  layout: BenchLayout | null = null;
  protected readonly fxs = new Map<string, VesselFx>();
  readonly heaters = new Map<string, HeaterRig>();
  protected readonly closures = new Map<string, Closure>();
  protected gasLines: GasLines | null = null;
  protected bench: BenchStatic | null = null;
  experimentId: string | null = null;
  protected sampleClock = 1;
  protected soft = false;
  readonly deps: ViewDeps;
  readonly dynamic = new Group();
  protected balanceId: string | null = null;
  protected time = 0;

  constructor(protected readonly ctx: SimContext, readonly assets: LabAssets) {
    this.lab = new LabSim({ seed: 1 });
    this.params = this.lab.params;
    this.deps = { assets, low: ctx.quality === 'low', reduced: ctx.reducedMotion };
    const base = createLabInteractions(this.lab, () => shelfOf(this.experimentId));
    this.interactions = {
      items: () => base.items(),
      commands: (id) => base.commands(id),
      run: (item, cmd, args): SimActionResult => {
        const r = base.run(item, cmd, args);
        if (r.ok) animateAction(this, item, cmd, args);
        return r;
      },
    };
    this.reduced = ctx.reducedMotion;
    this.pour = new PourFx(ctx.reducedMotion);
    this.interact = new Interactor(this);
    this.soft = ctx.softFlash;
    this.root.name = 'chem-lab';
    // a cool fill from the left and a faint warm kicker from behind: the stage's key light is warm, so shadows stay blue-ish
    const fill = new DirectionalLight('#bcd6ff', 0.7);
    fill.position.set(-40, 26, 30);
    const kicker = new DirectionalLight('#ffd9a8', 0.35);
    kicker.position.set(20, 18, -40);
    this.root.add(this.dynamic, this.pour.group, this.highlights.group, fill, kicker);
  }

  get balanceVessel(): string | null {
    return this.balanceId;
  }

  pickRoots = (): Group[] => (this.bench && this.layout?.hasBalance ? [this.dynamic, this.bench.balance.group] : [this.dynamic]);

  loadExperiment(id: string | null): void {
    this.experimentId = id;
    this.lab.loadBench(benchOf(id));
    this.rebuild();
  }

  protected makeView(id: string, kind: VesselKind, label: string): VesselView {
    switch (kind) {
      case 'crucible': return new CrucibleView(id, kind, label, this.deps);
      case 'funnel': return new FunnelView(id, kind, label, this.deps);
      case 'gas-tube': return new GasTubeView(id, kind, label, this.deps);
      case 'hofmann': return new HofmannView(id, kind, label, this.deps, this.ctx.rng);
      default: return new VesselView(id, kind, label, this.deps);
    }
  }

  protected rebuild(): void {
    this.clearViews();
    const ids = this.lab.vesselIds();
    const items = ids.map((id) => ({ id, kind: this.lab.vessel(id)?.kind ?? ('beaker100' as VesselKind) }));
    const exp = this.experimentId ? getExperiment(this.experimentId) : undefined;
    // only experiments that weigh (E1, E7) and the free bench get the balance: the bench stays one tile wide
    this.layout = layoutBench(items, !exp || exp.solution.some((op) => op.op === 'place' || op.op === 'weigh' || op.op === 'tare'));
    this.bench = new BenchStatic(this.assets, this.layout, this.deps.low);
    this.root.add(this.bench.group);
    const fxDeps = { quality: this.ctx.quality, reduced: this.ctx.reducedMotion, rng: this.ctx.rng, assets: this.assets, soft: () => this.soft };
    for (const it of items) {
      const view = this.makeView(it.id, it.kind, this.lab.vessel(it.id)?.labelTr ?? it.id);
      view.build();
      const p = this.layout.placed[it.id];
      if (p) {
        view.pos.set(p.x, p.y, p.z);
        view.home.x = p.x;
        view.home.y = p.y;
        view.home.z = p.z;
      }
      view.goal.copy(view.pos);
      this.views.set(it.id, view);
      this.dynamic.add(view.group);
      if (it.kind !== 'hofmann' && it.kind !== 'gas-tube') this.fxs.set(it.id, new VesselFx(view, fxDeps, 1000 + this.fxs.size * 17));
      if (CLOSABLE.has(it.kind)) this.closures.set(it.id, new Closure(view, this.assets));
      if (HEATABLE.has(it.kind) && p) {
        const rig = new HeaterRig(this.assets, it.id, it.kind === 'testtube');
        rig.group.position.set(p.x, 0, p.z + (it.kind === 'testtube' ? 6.5 : 0));
        this.heaters.set(it.id, rig);
        this.dynamic.add(rig.group);
      }
    }
    buildShelf(this);
    this.camera = benchFraming(this.layout, items.map((i) => i.kind));
    this.gasLines = new GasLines(this.root, this.views);
    this.sampleAll(true);
  }

  protected clearViews(): void {
    for (const c of this.closures.values()) c.dispose();
    this.closures.clear();
    for (const f of this.fxs.values()) f.dispose();
    this.fxs.clear();
    this.pour.release();
    for (const b of this.items.values()) b.dispose();
    this.items.clear();
    for (const t of this.tools.values()) t.dispose();
    this.tools.clear();
    for (const h of this.heaters.values()) h.dispose();
    this.heaters.clear();
    this.gasLines?.dispose();
    this.gasLines = null;
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
    this.bench?.dispose();
    this.bench = null;
  }

  /** Reads the engine into the views' targets (10 Hz). `snap` jumps the displayed values (after a load or restore). */
  protected sampleAll(snap = false): void {
    this.balanceId = this.lab.view().onBalance();
    for (const [id, view] of this.views) {
      const vis = this.lab.visuals(id);
      const v = this.lab.vessel(id);
      if (!vis || !v) continue;
      view.sample(vis, v);
      this.heaters.get(id)?.setSource(v.heat);
      if (snap) view.snap();
    }
    const bal = this.lab.measurements().find((m) => m.id === 'balance');
    this.bench?.balance.setReading(bal ? Number(bal.value) : null);
    this.gasLines?.sync(this.lab);
  }

  /** Where a vessel wants to be this frame: its slot, the balance pan, lifted onto a heater. */
  protected poseGoal(id: string, view: VesselView): void {
    const p = this.layout?.placed[id];
    if (!p || !this.layout) return;
    if (this.interact.holding(id) || (this.pour.busy && this.pour.source === view)) return;
    const rig = this.heaters.get(id);
    if (this.balanceId === id && this.layout.hasBalance && !(rig && rig.active)) {
      const b = this.layout.balance;
      const pan = this.bench?.balance.panCentre ?? [0, 5, -3.5];
      view.goal.set(b.x + pan[0], b.y + pan[1], b.z + pan[2]);
      return;
    }
    const tube = view.kind === 'testtube';
    view.goal.set(p.x, p.y + (rig?.lift ?? 0), p.z + (tube && rig && rig.lift > 0.5 ? 6.5 : 0));
  }

  step(dt: number): void {
    this.lab.step(dt || FIXED_DT);
  }

  protected handleEvents(events: readonly SimEvent[]): void {
    for (const e of events) {
      if (e.kind === 'pop') this.closures.get(e.vessel)?.pop();
      else if (e.kind === 'flash') this.fxs.get(e.vessel)?.kick(e.value ?? 0.8);
    }
  }

  sync(frameSeconds: number): void {
    const dt = Math.min(frameSeconds, 0.1);
    this.time += dt;
    this.sampleClock += dt;
    if (this.sampleClock >= SAMPLE_S) {
      this.sampleClock = 0;
      this.sampleAll();
      this.handleEvents(this.lab.drainEvents());
    }
    for (const [id, view] of this.views) {
      const rig = this.heaters.get(id);
      rig?.update(dt, this.ctx.reducedMotion, view.vis ? Math.min(1, (view.vis.tempC - 20) / 200) : 0);
      this.poseGoal(id, view);
      view.update(dt);
      this.fxs.get(id)?.update(dt);
      this.closures.get(id)?.update(dt);
    }
    for (const b of this.items.values()) {
      if (b instanceof BottleView) {
        if (!this.interact.holding(b.id) && !(this.pour.busy && this.pour.source === b)) {
          b.goal.set(b.home.x, b.home.y, b.home.z);
          b.tiltGoal = 0;
          b.setLid(false);
        }
        b.update(dt);
      } else b.update(dt);
    }
    for (const t of this.tools.values()) t.update(dt);
    this.clock += dt;
    this.bench?.tintWall();
    this.interact.update(dt);
    this.pour.update(dt, this.clock);
    this.highlights.update(dt);
    this.gasLines?.update(dt);
  }

  setParam(id: string, value: number): void {
    this.lab.setParam(id, value);
  }
  reset(values?: Record<string, number>): void {
    this.lab.reset(values);
    this.rebuild();
  }
  measurements(): SimMeasurement[] {
    return this.lab.measurements();
  }
  snapshot(): unknown {
    return this.lab.snapshot();
  }
  restore(s: unknown): void {
    this.lab.restore(s);
    this.sampleAll(true);
  }
  setSoftFlash(on: boolean): void {
    this.soft = on;
  }
  pointer(ev: SimPointerEvent): void {
    this.interact.pointer(ev);
  }
  setHover(id: string | null): void {
    this.interact.setHover(id);
  }
  setFocus(id: string | null): void {
    this.interact.setFocus(id);
  }
  labels(): { text: string; world: [number, number, number]; anchorId?: string }[] {
    const out = [...this.views].map(([id, v]) => ({ text: v.labelTr, world: [v.group.position.x, v.group.position.y + v.def.topY + 3, v.group.position.z] as [number, number, number], anchorId: id }));
    for (const [id, b] of this.items) out.push({ text: b.look.labelTr ? `${b.look.nameTr} ${b.look.labelTr}` : b.look.nameTr, world: [b.group.position.x, b.group.position.y + (b instanceof BottleView ? b.def.topY + 2.5 : 3), b.group.position.z], anchorId: id });
    for (const [id, t] of this.tools) out.push({ text: TOOL_NAMES[id], world: [t.group.position.x, t.group.position.y + 4, t.group.position.z], anchorId: id });
    const hint = this.interact.hint();
    if (hint) out.push({ text: hint.text, world: [hint.at.x, hint.at.y, hint.at.z], anchorId: 'hint' });
    return out;
  }
  dispose(): void {
    this.interact.dispose();
    this.clearViews();
    this.pour.dispose();
    this.highlights.dispose();
    this.assets.dispose();
    this.root.clear();
  }
}
