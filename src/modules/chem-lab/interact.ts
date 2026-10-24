import { type OpResult } from '../../chemlab';
import type { SimPointerEvent } from '../../scene';
import { clamp, pourSeconds } from './helpers';
import type { ChemLabScene } from './labScene';
import type { PourKind } from './pour';
import { BottleView, PieceProp, ToolProp, type Movable, type ToolId } from './props';
import { ToolUse } from './toolUse';
import type { VesselView } from './vesselView';

type Kind = 'bottle' | 'piece' | 'vessel' | 'tool' | 'burette' | 'balance' | 'heater' | 'toggle';
const FIXED = new Set(['funnel', 'gas-tube']);
/** Solids that behave like fine powder in the jar (the rest are crystals that dissolve slowly). */
const POWDERS = new Set(['nahco3', 'soap', 'yeast', 'mno2', 'citric-acid', 'mg-powder']);
const HOLD_S = 0.35;
const REPEAT_S = 0.9;

export interface Drag {
  id: string;
  kind: Kind;
  mov: Movable | null;
  dx: number;
  dz: number;
  t: number;
  moved: boolean;
  start: { x: number; z: number };
  target: string | null;
  lastTarget: string | null;
  hoverT: number;
  session: string | null;
  chunkT: number;
  amountIx: number;
}

/**
 * Drag and drop on the bench. Pick up a bottle, a vessel or a tool; a valid target lights up green; hold over it to keep
 * pouring (mouse wheel changes the chunk), release to stop; a quick drop does one step. Click the burette to drip, a
 * heater to switch it off, the balance to tare, the crucible for its lid, double-click a vessel to heat it.
 * Every effect on the chemistry goes through `lab.*` operations (never state), the animation follows.
 */
export class Interactor {
  private drag: Drag | null = null;
  private hoverId: string | null = null;
  private focusId: string | null = null;
  private readonly onWheel = (e: WheelEvent): void => {
    const d = this.drag;
    if (!d) return;
    e.preventDefault();
    const n = this.amounts(d).length;
    d.amountIx = clamp(d.amountIx + (e.deltaY < 0 ? 1 : -1), 0, n - 1);
  };
  /** Strip colours and parked tools survive between drags. */
  private parked: { thermo: string | null } = { thermo: null };

  private readonly tools: ToolUse;

  /** Text hint shown next to the carried item (via the label layer). */
  hint(): { text: string; at: { x: number; y: number; z: number } } | null {
    const d = this.drag;
    return d ? this.tools.hint(d, this.amountOf(d)) : null;
  }

  constructor(private readonly s: ChemLabScene) {
    this.tools = new ToolUse(s, this.parked, (dst) => this.refuse(dst));
  }

  // ---- helpers ----------------------------------------------------------------------------------------------

  private amounts(d: Drag): number[] {
    const item = this.s.items.get(d.id);
    if (item) return item.look.amounts;
    return d.kind === 'vessel' ? [5, 10, 20, 50] : [1];
  }
  private amountOf(d: Drag): number {
    return this.amounts(d)[d.amountIx] ?? 1;
  }

  private kindOf(id: string): Kind | null {
    if (id.startsWith('heater:')) return 'heater';
    if (id === 'balance') return 'balance';
    if (id.startsWith('tool:')) return 'tool';
    const v = this.s.views.get(id);
    if (v) {
      if (v.kind === 'burette25') return 'burette';
      if (v.kind === 'hofmann' || FIXED.has(v.kind)) return 'toggle';
      return 'vessel';
    }
    const item = this.s.items.get(id);
    if (item) return item instanceof PieceProp ? 'piece' : 'bottle';
    return null;
  }

  private movable(d: Drag): Movable | null {
    if (d.kind === 'vessel') return this.s.views.get(d.id) ?? null;
    if (d.kind === 'tool') return this.s.tools.get(d.id as ToolId) ?? null;
    if (d.kind === 'bottle' || d.kind === 'piece') return this.s.items.get(d.id) ?? null;
    return null;
  }

  /** Is `targetId` something the dragged item can act on? */
  private valid(d: Drag, targetId: string | null): boolean {
    if (!targetId || targetId === d.id) return false;
    const tv = this.s.views.get(targetId);
    if (d.kind === 'vessel') return tv !== undefined && tv.kind !== 'hofmann' && tv.kind !== 'gas-tube' || targetId === 'balance';
    if (!tv) return false;
    if (d.kind === 'tool') return tv.kind !== 'hofmann' || d.id === 'tool:thermo';
    return d.kind === 'bottle' || d.kind === 'piece' ? tv.kind !== 'gas-tube' : false;
  }

  /** Hovered, keyboard-focused or carried: tools and loose solids only get a label then. */
  isHot(id: string): boolean {
    return this.hoverId === id || this.focusId === id || this.drag?.id === id;
  }

  holding(id: string): boolean {
    return this.drag?.id === id && this.drag.kind !== 'burette';
  }

  // ---- host events ------------------------------------------------------------------------------------------

  setHover(id: string | null): void {
    this.hoverId = id;
  }
  setFocus(id: string | null): void {
    this.focusId = id;
  }

  pointer(ev: SimPointerEvent): void {
    if (ev.type === 'hover') return;
    if (ev.type === 'down') return this.down(ev);
    const d = this.drag;
    if (!d) return;
    if (ev.type === 'move') return this.move(d, ev);
    this.up(d, ev, ev.type === 'cancel');
  }

  private down(ev: SimPointerEvent): void {
    const id = ev.hit?.id;
    if (!id) return;
    const kind = this.kindOf(id);
    if (!kind) return;
    const d: Drag = { id, kind, mov: null, dx: 0, dz: 0, t: 0, moved: false, start: { x: ev.world[0], z: ev.world[2] }, target: null, lastTarget: null, hoverT: 0, session: null, chunkT: 0, amountIx: 1 };
    d.mov = this.movable(d);
    if (d.mov) {
      d.dx = d.mov.group.position.x - ev.world[0];
      d.dz = d.mov.group.position.z - ev.world[2];
      const item = this.s.items.get(id);
      if (item) d.amountIx = Math.max(0, item.look.amounts.indexOf(item.look.amount));
      if (d.kind === 'tool' && id === 'tool:thermo') this.parked.thermo = null;
    }
    this.drag = d;
    if (typeof window !== 'undefined') window.addEventListener('wheel', this.onWheel, { passive: false });
    if (d.kind === 'burette') d.chunkT = 0;
  }

  private move(d: Drag, ev: SimPointerEvent): void {
    if (Math.hypot(ev.world[0] - d.start.x, ev.world[2] - d.start.z) > 0.9) d.moved = true;
    if (d.mov && d.moved) {
      const lift = d.kind === 'vessel' ? 5 : d.kind === 'tool' ? 6 : 4.5;
      d.mov.goal.x = ev.world[0] + d.dx;
      d.mov.goal.z = ev.world[2] + d.dz;
      d.mov.goal.y = d.mov.home.y + lift;
    }
    const hit = ev.hit?.id ?? null;
    d.target = d.moved && this.valid(d, hit) ? hit : null;
  }

  private up(d: Drag, ev: SimPointerEvent, cancelled: boolean): void {
    if (typeof window !== 'undefined') window.removeEventListener('wheel', this.onWheel);
    this.drag = null;
    const target = cancelled ? null : (ev.hit?.id ?? null);
    const wasSession = d.session !== null;
    if (d.session) this.endSession(d);
    if (!cancelled && !d.moved && d.t < 0.6) this.tools.click(d);
    else if (!cancelled && d.moved && !wasSession && this.valid(d, target)) this.drop(d, target as string);
    if (d.kind === 'vessel' && d.moved && !cancelled && target === 'balance') this.s.lab.place(d.id);
    else if (d.kind === 'vessel' && d.moved && !cancelled && this.s.balanceVessel === d.id && target !== 'balance') this.s.lab.place(null);
    // everything goes home (the scene's pose goals do it for vessels)
    if (d.mov && d.kind !== 'vessel') this.sendHome(d);
    this.s.highlights.hide('target');
  }

  private sendHome(d: Drag): void {
    const m = d.mov;
    if (!m) return;
    if (d.id === 'tool:thermo' && this.parked.thermo) return;
    m.goal.x = m.home.x;
    m.goal.y = m.home.y;
    m.goal.z = m.home.z;
    if (m instanceof ToolProp) m.rollGoal = 0;
  }

  // ---- actions ----------------------------------------------------------------------------------------------

  /** Quick drop: one chunk, with a short pour animation. */
  private drop(d: Drag, targetId: string): void {
    const dst = this.s.views.get(targetId);
    if (!dst) return;
    if (d.kind === 'tool') {
      this.tools.use(d, dst, true);
      return;
    }
    const res = this.chunk(d, dst, pourSeconds(this.amountOf(d)));
    if (!res.ok) this.refuse(dst);
  }

  private startSession(d: Drag, dst: VesselView): void {
    d.session = dst.id;
    d.chunkT = REPEAT_S;
    if (d.kind === 'tool') {
      this.tools.use(d, dst, false);
      return;
    }
    const res = this.chunk(d, dst, 0);
    if (!res.ok) {
      this.refuse(dst);
      d.session = null;
    }
  }

  private endSession(d: Drag): void {
    const dst = d.session ? this.s.views.get(d.session) : null;
    d.session = null;
    if (d.kind === 'tool') {
      if (d.id === 'tool:rod' && dst) this.s.lab.stir(dst.id, false);
      const tool = this.s.tools.get(d.id as ToolId);
      if (tool && d.id === 'tool:thermo' && dst) this.parked.thermo = dst.id;
      return;
    }
    this.s.pour.end();
  }

  private refuse(dst: VesselView): void {
    this.s.highlights.show('refuse', dst.group.position.x, dst.group.position.z, dst.def.radius + 1.6);
  }

  /** One pour/drop/add chunk of the dragged item into `dst`; starts or keeps the animation. */
  private chunk(d: Drag, dst: VesselView, autoEnd: number): OpResult {
    const lab = this.s.lab;
    const amount = this.amountOf(d);
    const item = this.s.items.get(d.id);
    let res: OpResult;
    let kind: PourKind = 'liquid';
    let rgb = item?.look.rgb ?? this.s.views.get(d.id)?.color.toArray().map((c) => Math.round(255 * c)) ?? [220, 235, 250];
    if (d.kind === 'vessel') {
      res = lab.pour(d.id, dst.id, amount);
      const src = this.s.views.get(d.id);
      rgb = src?.target.rgb ?? [220, 235, 250];
    } else if (item?.look.container === 'dropper') {
      res = lab.drop(d.id, dst.id, amount);
      kind = 'drops';
    } else if (item?.look.container === 'jar') {
      res = lab.add(d.id, dst.id, amount, POWDERS.has(d.id));
      kind = 'powder';
      if (item instanceof BottleView) item.setLid(true);
    } else if (item instanceof PieceProp) {
      res = lab.add(d.id, dst.id, amount, d.id === 'mg-powder');
      kind = 'powder';
    } else res = lab.pour(d.id, dst.id, amount);
    if (!res.ok) return res;
    if (rgb.length === 3) dst.mixIn(rgb as [number, number, number], amount);
    if (!(item instanceof PieceProp)) {
      const srcView = d.kind === 'vessel' ? (this.s.views.get(d.id) ?? null) : item instanceof BottleView ? item : null;
      if (!this.s.pour.busy || this.s.pour.target !== dst) this.s.pour.begin(srcView, dst, kind, rgb as [number, number, number], 40, autoEnd);
      else if (autoEnd > 0) this.s.pour.begin(srcView, dst, kind, rgb as [number, number, number], 40, autoEnd);
    } else {
      const m = d.mov;
      if (m) {
        m.goal.x = dst.goal.x;
        m.goal.z = dst.goal.z;
        m.goal.y = dst.goal.y + dst.def.topY * 0.8;
      }
    }
    dst.fillRate = Math.max(1.4, 4 / Math.max(0.5, autoEnd || 1.2));
    return res;
  }

  // ---- per frame --------------------------------------------------------------------------------------------

  update(dt: number): void {
    const d = this.drag;
    const s = this.s;
    s.highlights.hide('hover');
    s.highlights.hide('focus');
    const ring = (id: string | null, kind: 'hover' | 'focus'): void => {
      if (!id) return;
      const v = s.views.get(id);
      const o = v ?? s.items.get(id);
      const tool = s.tools.get(id as ToolId);
      const g = (o?.group ?? tool?.group)?.position;
      if (g) s.highlights.show(kind, g.x, g.z, (v?.def.radius ?? 3) + 1.2);
    };
    if (!d || d.id !== this.hoverId) ring(this.hoverId, 'hover');
    ring(this.focusId, 'focus');
    // thermometer and strips track their vessel
    const thermo = s.tools.get('tool:thermo');
    if (thermo) {
      const host = this.parked.thermo ? s.views.get(this.parked.thermo) : null;
      thermo.setTemperature(host?.vis?.tempC ?? s.lab.vessel(s.views.keys().next().value ?? '')?.tempC ?? 22);
      if (host && !(d && d.id === 'tool:thermo')) {
        thermo.goal.x = host.goal.x + host.def.radius * 0.45;
        thermo.goal.z = host.goal.z + 0.4;
        thermo.goal.y = host.goal.y + 1;
        thermo.rollGoal = -0.12;
      }
    }
    if (!d) return;
    d.t += dt;
    if (d.kind === 'burette') return this.tools.holdBurette(d, dt);
    if (d.target === d.lastTarget && d.target) d.hoverT += dt;
    else d.hoverT = 0;
    d.lastTarget = d.target;
    const dst = d.target ? s.views.get(d.target) : null;
    if (dst) s.highlights.show('target', dst.group.position.x, dst.group.position.z, dst.def.radius + 1.6);
    else s.highlights.hide('target');
    if (d.session && d.target !== d.session) this.endSession(d);
    if (!d.session && dst && d.hoverT >= HOLD_S && d.kind !== 'vessel') this.startSession(d, dst);
    else if (!d.session && dst && d.hoverT >= HOLD_S && d.kind === 'vessel') this.startSession(d, dst);
    if (d.session && dst) {
      d.chunkT -= dt;
      if (d.chunkT <= 0 && d.kind !== 'tool') {
        d.chunkT = REPEAT_S;
        const res = this.chunk(d, dst, 0);
        if (!res.ok) {
          this.refuse(dst);
          this.endSession(d);
        }
      }
      if (d.kind === 'tool') this.tools.pose(d, dst, dt);
    }
    if (d.kind === 'tool' && d.id === 'tool:splint') this.s.tools.get('tool:splint')?.setFlame(true, dt, this.s.reduced);
    // tools hover at an angle while carried
    if (d.kind === 'tool' && !d.session) {
      const tool = this.s.tools.get(d.id as ToolId);
      if (tool) tool.rollGoal = d.id === 'tool:rod' ? 1.1 : 0.15;
    }
  }

  dispose(): void {
    if (typeof window !== 'undefined') window.removeEventListener('wheel', this.onWheel);
    this.drag = null;
  }
}
