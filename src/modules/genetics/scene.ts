import { Group } from 'three';
import type { ModuleContext, ModuleLabel, ModuleScene, Vec3 } from '../../scene';
import { path, type Anim, type Pose } from './anim';
import { buildTrack } from './tracks';
import { Kit } from './kit';
import type { Plan } from './plan';
import { chartValues, crossFor, isDefaultCross } from './punnett';

const WARN = 'Farklı çaprazlama: oranları kareden oku';
/** tan(fov / 2) for the 34 degree camera of the stage. */
/** The glass panels leave a narrow free column in the middle: frame wider than the plan so the action fits in it. */
const ZOOM_WIDE = 1.22;
const ZOOM_COMPACT = 0.9;
/** The compact layout (narrow windows) folds the panels away, so the stage is free and can be framed tighter. */
const zoom = (): number => (typeof window !== 'undefined' && window.innerWidth < 1500 ? ZOOM_COMPACT : ZOOM_WIDE);
const HALF_FOV_TAN = Math.tan((34 / 2) * (Math.PI / 180));

/** The genetics scene: a pure function of time built from a per-track plan (see tracks.ts). */
export async function createGeneticsScene(ctx: ModuleContext): Promise<ModuleScene> {
  ctx.assets.moduleTextures = true; // painted KTX2 tiers for tile, chromosomes and tokens
  const trackId = ['monohibrit', 'dihibrit', 'kan-gruplari', 'eseye-bagli'].includes(ctx.trackId) ? ctx.trackId : 'monohibrit';
  const kit = await Kit.create(ctx);
  const root = new Group();
  root.name = 'genetics';
  root.add(kit.root);
  let options = { ...ctx.options };
  let plan!: Plan;
  let cam!: Anim;
  let posed = Number.NaN;
  const pose: Pose = { x: 0, y: 0, z: 0, s: 0 };

  const clampT = (t: number): number => Math.min(Math.max(t, 0), plan.duration);
  const build = (): void => {
    kit.reset();
    plan = buildTrack(trackId, kit, crossFor(trackId, options), options);
    cam = path(plan.cam);
  };
  const seek = (t: number): void => {
    kit.update(clampT(t));
    posed = t;
  };

  build();
  const scene: ModuleScene = {
    root,
    duration: plan.duration,
    seek,
    cameraAt: (t) => {
      cam(clampT(t), pose);
      const h = pose.s * zoom();
      const d = h / (2 * HALF_FOV_TAN);
      // the stage centres this in the free area between the panels (setSafeInsets)
      return { position: [pose.x + 0.1 * h, pose.y + 0.06 * h, d], target: [pose.x, pose.y, 0] };
    },
    labelsAt: (t): ModuleLabel[] => {
      const tt = clampT(t);
      const out: ModuleLabel[] = [];
      for (const l of plan.labels) {
        if (tt < l.t0 || tt > l.t1 || (l.level && l.level !== ctx.level)) continue;
        out.push({ text: l.text, world: l.pos as Vec3, anchorId: l.id });
      }
      if (!isDefaultCross(trackId, options) && tt >= plan.warnAt) {
        // stays in the lower middle of the view wherever the camera is
        const c = scene.cameraAt!(tt);
        cam(tt, pose);
        out.push({ text: WARN, world: [c.target[0], c.target[1] - 0.27 * pose.s * zoom(), 0.4], anchorId: 'warn' });
      }
      return out;
    },
    chartAt: (t) => chartValues(plan.kind, plan.sq, plan.fill[0], plan.fill[1], clampT(t)),
    setOptions: (o) => {
      options = { ...options, ...o };
      build();
      if (Number.isFinite(posed)) seek(posed);
    },
    dispose: () => {
      kit.dispose();
      root.removeFromParent();
    },
  };
  seek(0);
  return scene;
}
