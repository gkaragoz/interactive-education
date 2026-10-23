import { BackSide, Color, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import type { ModuleContext, ModuleLabel, ModuleScene } from '../../scene';
import type { Plan, StationBuilder, StationRt } from './env';
import { Flock } from './flock';
import { cameraFrom, smooth } from './math';

export interface RigSpec {
  stations: readonly StationBuilder[];
  /** Every option combination (they decide how many molecules there are, so the sets are sized for the largest). */
  variants: readonly Record<string, string>[];
  plan(options: Record<string, string>): Plan;
}

const VEIL_HALF = 0.55;
/** Colour of the stage card behind the canvas; the cut between stations fades through it. */
const VEIL_COLOR = '#f6ebd2';

/** Assembles a ModuleScene from a plan factory: stations overlaid at the origin (one active at a time), molecules, cuts. */
export async function buildRig(ctx: ModuleContext, spec: RigSpec): Promise<ModuleScene> {
  const root = new Group();
  root.name = `energy-${ctx.trackId}`;
  const groups = spec.stations.map((_, i) => {
    const g = new Group();
    g.name = `station-${i}`;
    root.add(g);
    return g;
  });
  const own: Array<{ dispose(): void }> = [];
  const runtimes: Array<StationRt | void> = [];
  for (let i = 0; i < spec.stations.length; i++) runtimes.push(await spec.stations[i]!({ ctx, group: groups[i]!, own, level: ctx.level }));

  const variantPlans = spec.variants.map((v) => spec.plan({ ...ctx.options, ...v }));
  const flock = new Flock();
  await flock.build(ctx, groups, variantPlans.map((p) => p.trips));
  let options = ctx.options;
  let plan = spec.plan(options);
  flock.bind(plan.trips);

  const veilMat = new MeshBasicMaterial({ color: new Color(VEIL_COLOR), side: BackSide, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
  const veilGeo = new SphereGeometry(40, 16, 10);
  const veil = new Mesh(veilGeo, veilMat);
  veil.renderOrder = 999;
  veil.frustumCulled = false;
  veil.visible = false;
  root.add(veil);

  let active = -1;
  const activeAt = (t: number): number => {
    let s = plan.windows[0]!.station;
    for (const w of plan.windows) if (t >= w.t0) s = w.station;
    return s;
  };

  const seek = (t: number): void => {
    const time = Math.min(Math.max(t, 0), plan.duration);
    active = activeAt(time);
    groups.forEach((g, i) => {
      const on = i === active;
      g.visible = on;
      if (on) g.scale.set(1, plan.mirrored?.includes(i) ? -1 : 1, 1);
      else g.scale.setScalar(0);
    });
    flock.seek(time, active);
    runtimes[active]?.animate?.(time, plan);
    let o = 0;
    for (const s of plan.swaps) o = Math.max(o, 1 - smooth(Math.abs(time - s) / VEIL_HALF));
    veil.visible = o > 0.004;
    veilMat.opacity = o;
    veil.scale.setScalar(o > 0.004 ? 1 : 0);
    if (veil.visible) {
      const c = cameraFrom(plan.shots, time).position;
      veil.position.set(c[0], c[1], c[2]);
    }
  };

  return {
    root,
    duration: plan.duration,
    seek,
    cameraAt: (t) => cameraFrom(plan.shots, Math.min(Math.max(t, 0), plan.duration)),
    labelsAt: (t): ModuleLabel[] => {
      const out: ModuleLabel[] = [];
      // keep labels out of the strip under the top panels: pull anchors that sit far above the view centre down to the edge of the safe band
      const cam = cameraFrom(plan.shots, Math.min(Math.max(t, 0), plan.duration));
      const d = Math.hypot(cam.position[0] - cam.target[0], cam.position[1] - cam.target[1], cam.position[2] - cam.target[2]);
      const top = cam.target[1] + 0.1 * d;
      const bottom = cam.target[1] - 0.17 * d;
      for (const l of plan.labels) {
        if (t < l.t0 || t > l.t1) continue;
        const text = typeof l.text === 'string' ? l.text : l.text[ctx.level];
        if (text) out.push({ text, world: [l.at[0], Math.min(top, Math.max(bottom, l.at[1])), l.at[2]], anchorId: l.id });
      }
      return out;
    },
    chartAt: (t) => plan.chart(Math.min(Math.max(t, 0), plan.duration)),
    setOptions: (o) => {
      options = { ...options, ...o };
      plan = spec.plan(options);
      flock.bind(plan.trips);
    },
    dispose: () => {
      flock.dispose();
      own.forEach((d) => d.dispose());
      veilGeo.dispose();
      veilMat.dispose();
    },
  };
}
