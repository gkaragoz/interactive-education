import { indicatorColor, type HeatSource, type OpResult } from '../../chemlab';
import type { Drag } from './interact';
import type { ChemLabScene } from './labScene';
import type { ToolId } from './props';
import type { VesselView } from './vesselView';

/** What the hand tools do to a vessel (stir, dip, thermometer, flame test) and the burette that drips while held. */
export class ToolUse {
  constructor(
    private readonly s: ChemLabScene,
    private readonly parked: { thermo: string | null },
    private readonly refuse: (dst: VesselView) => void,
  ) {}

  use(d: Drag, dst: VesselView, single: boolean): void {
    const lab = this.s.lab;
    const tool = this.s.tools.get(d.id as ToolId);
    if (!tool) return;
    const reportRefuse = (r: OpResult): void => {
      if (!r.ok) this.refuse(dst);
    };
    if (d.id === 'tool:rod') {
      reportRefuse(lab.stir(dst.id, true));
      if (single) window.setTimeout(() => lab.stir(dst.id, false), 2500);
    } else if (d.id === 'tool:strip') {
      const r = lab.dip('universal-strip', dst.id);
      reportRefuse(r);
      if (r.ok && r.value !== undefined) tool.setStripColor(indicatorColor('universal', r.value));
    } else if (d.id === 'tool:thermo') {
      this.parked.thermo = dst.id;
    } else if (d.id === 'tool:splint') {
      reportRefuse(lab.testGas(dst.id, 'flame'));
    }
  }

  pose(d: Drag, dst: VesselView, _dt: number): void {
    const tool = this.s.tools.get(d.id as ToolId);
    if (!tool) return;
    const swirl = this.s.reduced ? 0 : Math.sin(this.s.clock * 7);
    const r = dst.def.radius;
    tool.goal.x = dst.goal.x + (d.id === 'tool:rod' ? swirl * r * 0.3 : 0);
    tool.goal.z = dst.goal.z;
    tool.goal.y = dst.goal.y + (d.id === 'tool:rod' ? dst.def.topY * 0.35 : d.id === 'tool:splint' ? dst.def.topY * 0.9 : dst.def.topY * 0.55);
    tool.rollGoal = d.id === 'tool:rod' ? 0.5 : 0;
  }

  /** Holding the burette: a drop every few tenths of a second into the flask below. */
  holdBurette(d: Drag, dt: number): void {
    d.chunkT -= dt;
    if (d.chunkT > 0) return;
    d.chunkT = 0.45;
    const receiver = this.s.layout?.units.find((u) => u.kind === 'stand' && u.ids[0] === d.id)?.ids[1];
    const dst = receiver ? this.s.views.get(receiver) : undefined;
    const src = this.s.views.get(d.id);
    if (!dst || !src) return;
    const res = this.s.lab.dispense(d.id, dst.id, 0.5);
    if (!res.ok) {
      this.refuse(dst);
      return;
    }
    if (!this.s.pour.busy) this.s.pour.begin(src, dst, 'burette', src.target.rgb, 3, 0.6);
    else this.s.pour.begin(src, dst, 'burette', src.target.rgb, 3, 0.6);
    dst.fillRate = 2;
  }


  private lastClick = { id: '', at: 0 };

  click(d: Drag): void {
    const lab = this.s.lab;
    const now = performance.now();
    const double = this.lastClick.id === d.id && now - this.lastClick.at < 420;
    this.lastClick = { id: d.id, at: now };
    if (d.kind === 'heater') {
      lab.heat(d.id.slice('heater:'.length), null);
    } else if (d.kind === 'balance') {
      lab.tare();
    } else if (d.kind === 'toggle') {
      const v = lab.vessel(d.id);
      if (v?.kind === 'hofmann') lab.connectElectrodes(d.id, v.electrodes ? null : 9);
    } else if (d.kind === 'vessel') {
      const v = lab.vessel(d.id);
      if (!v) return;
      if (v.kind === 'crucible' && !double) lab.lid(d.id, !v.lidOpen);
      else if (double && this.s.heaters.has(d.id)) lab.heat(d.id, v.heat ? null : ('bunsen-blue' as HeatSource));
    }
  }

    hint(d: Drag, amount: number): { text: string; at: { x: number; y: number; z: number } } | null {
    if (!d.moved) return null;
    const m = d.mov;
    if (!m) return null;
    const item = this.s.items.get(d.id);
    let text = '';
    if (item) text = `${item.look.nameTr}: ${amount} ${item.look.unit}  (tekerlek: miktar)`;
    else if (d.kind === 'vessel') text = `${this.s.views.get(d.id)?.labelTr ?? ''}: ${amount} mL dök  (tekerlek: miktar)`;
    else if (d.kind === 'tool') text = d.id === 'tool:rod' ? 'Karıştır' : d.id === 'tool:strip' ? 'pH kâğıdı' : d.id === 'tool:thermo' ? 'Sıcaklık' : 'Gaz sına';
    return { text, at: { x: m.group.position.x, y: m.group.position.y + 20, z: m.group.position.z } };
  }

}
