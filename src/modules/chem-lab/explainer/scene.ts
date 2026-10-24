import { BackSide, BoxGeometry, Color, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { EXPERIMENTS, formatEquation, type ExperimentDef, type ParticleScript } from '../../../chemlab';
import type { ModuleLabel, ModuleScene, SimContext, Vec3 } from '../../../scene';
import { lerp, smoothstep } from '../helpers';
import { LabAssets, partGeometry } from '../labAssets';
import { LiquidMesh, setLinear } from '../liquid';
import { profileOf } from '../profile';
import { ParticleLayer } from './particles';
import { BOX, aliveCount, buildPlan, pose, stageAt, type Plan } from './plan';

const LIQUID_COLOR: Record<string, [number, number, number]> = { e2: [150, 110, 200], e5: [90, 150, 235], e3: [225, 235, 245] };
const ZOOM_S = 1.5;

/** The experiment and script behind a script id (`'e1-particles'`), or null. */
export function findScript(scriptId: string): { exp: ExperimentDef; script: ParticleScript } | null {
  for (const exp of EXPERIMENTS) {
    const script = exp.particles.find((p) => p.id === scriptId);
    if (script) return { exp, script };
  }
  return null;
}

/** Equation text for the symbolic layer: formulas with state symbols (İleri) or the word equation (Temel). */
export function equationText(eq: ExperimentDef['equations'][number] | undefined, level: 'temel' | 'ileri'): string {
  if (!eq) return '';
  if (level === 'temel' && eq.wordTr) return eq.wordTr.replace('->', '→');
  return formatEquation(eq.reactants, eq.products).replace('->', '→');
}

/**
 * "Nedenini göster": a timeline scene (pure function of t) for one particle script. The picture starts at the bench
 * (the beaker of the experiment), zooms into the liquid, shows the particles colliding, bonds breaking and forming and
 * protons and electrons moving, and writes the equation in sync (macro, particle, symbolic layers).
 */
export async function createChemLabExplainer(ctx: SimContext, scriptId: string): Promise<ModuleScene> {
  const found = findScript(scriptId);
  if (!found) throw new Error(`Unknown particle script ${scriptId}`);
  const { exp, script } = found;
  const assets = new LabAssets(ctx);
  await assets.preload(['beaker-250ml']);
  const plan: Plan = buildPlan(script, ctx.rng(7000 + script.id.length * 31 + exp.no), ctx.reducedMotion);
  const root = new Group();
  root.name = 'chem-explainer';
  const world = new Group();
  const macro = new Group();
  const volume = new Group();
  root.add(world);
  world.add(macro, volume);

  // macro: the beaker and its liquid
  const { group: beaker, asset } = assets.objectNow('beaker-250ml');
  const inner = partGeometry(asset, 'inner');
  beaker.getObjectByName('inner')?.removeFromParent();
  macro.add(beaker);
  let liquid: LiquidMesh | null = null;
  if (inner && asset.meta.liquid) {
    const lm = asset.meta.liquid;
    liquid = new LiquidMesh(inner, profileOf(inner.getAttribute('position').array, lm.yMin, lm.yMax), ctx.quality === 'low');
    const c = setLinear(new Color(), LIQUID_COLOR[`e${exp.no}`] ?? [205, 228, 245]);
    liquid.set({ levelY: lm.yMin + 0.62 * (lm.yMax - lm.yMin), color: c, alpha: 0.6, turbidity: 0, turbColor: c, sedimentTopY: -100, sedimentColor: c, topColor: c, topAmount: 0, topDepth: 1, wobble: 0.01 }, 0);
    macro.add(liquid.mesh);
  }
  macro.position.set(0, -3, 0);

  // particle volume: a faint glass box with a floor
  const boxGeo = new BoxGeometry(BOX.hx * 2, BOX.hy * 2, BOX.hz * 2);
  const boxMat = new MeshBasicMaterial({ color: '#a9cde0', transparent: true, opacity: 0.1, depthWrite: false, side: BackSide });
  const edges = new EdgesGeometry(boxGeo);
  const edgeMat = new LineBasicMaterial({ color: '#7a98ad', transparent: true, opacity: 0.55 });
  const floorGeo = new PlaneGeometry(BOX.hx * 2, BOX.hz * 2);
  const floorMat = new MeshBasicMaterial({ color: '#8fb6cc', transparent: true, opacity: 0.35, depthWrite: false });
  const floor = new Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -BOX.hy + 0.01;
  floor.raycast = (): void => undefined;
  const boxMesh = new Mesh(boxGeo, boxMat);
  boxMesh.raycast = (): void => undefined;
  const lines = new LineSegments(edges, edgeMat);
  lines.raycast = (): void => undefined;
  volume.add(boxMesh, lines, floor);
  const layer = new ParticleLayer(plan, ctx.quality === 'low');
  volume.add(layer.group);

  const eq = exp.equations.find((e) => e.id === script.equationId);
  const eqText = equationText(eq, ctx.level);
  const duration = script.durationS;
  let zoom = 0;

  const seek = (t: number): void => {
    const zs = Math.min(ZOOM_S, duration * 0.3);
    zoom = ctx.reducedMotion ? (t > 0.2 ? 1 : 0) : smoothstep(0, zs, t);
    macro.visible = zoom < 0.6;
    macro.scale.setScalar(1);
    volume.scale.setScalar(lerp(0.14, 1, zoom));
    volume.visible = zoom > 0.02;
    volume.position.set(0, lerp(-1, 0, zoom), 0);
    layer.update(t, zoom);
  };
  seek(0);

  const o = { x: 0, y: 0, z: 0, alive: true, scale: 1 };
  return {
    root,
    duration,
    seek,
    cameraAt(t: number): { position: Vec3; target: Vec3 } {
      const k = smoothstep(0, Math.min(ZOOM_S, duration * 0.3), t);
      const az = ctx.reducedMotion ? 0.25 : 0.25 + 0.12 * Math.sin(t * 0.25);
      // push in on the beaker, then pull back as the glass volume opens around the particles
      const d = k < 0.5 ? lerp(34, 14, k * 2) : lerp(14, 41, (k - 0.5) * 2);
      return { position: [Math.sin(az) * d, lerp(8, 9, k), Math.cos(az) * d], target: [0, lerp(0, 0, k), 0] };
    },
    labelsAt(t: number): ModuleLabel[] {
      const out: ModuleLabel[] = [];
      if (zoom > 0.9 && eqText) out.push({ text: eqText, world: [0, BOX.hy + 3.5, 0], anchorId: 'equation' });
      if (zoom < 0.5) out.push({ text: exp.titleTr, world: [0, 12, 0], anchorId: 'macro-title' });
      if (zoom > 0.9) {
        const st = script.stages[stageAt(plan, t)];
        const wanted = st?.focus?.length ? st.focus : script.species.filter((s) => s.kind !== 'electron').slice(0, 3).map((s) => s.id);
        for (const sid of wanted.slice(0, 4)) {
          const sp = script.species.find((s) => s.id === sid);
          const p = plan.particles.find((q) => q.sid === sid && t >= q.born && t <= q.died);
          if (!sp || !p || aliveCount(plan, sid, t) === 0) continue;
          pose(plan, p, t, o, true);
          out.push({ text: sp.labelTr, world: [o.x, o.y + 2.2, o.z], anchorId: `sp:${sid}` });
        }
      }
      return out;
    },
    dispose(): void {
      layer.dispose();
      liquid?.dispose();
      for (const g of [boxGeo, edges, floorGeo]) g.dispose();
      for (const m of [boxMat, edgeMat, floorMat]) m.dispose();
      assets.dispose();
      root.removeFromParent();
    },
  };
}
