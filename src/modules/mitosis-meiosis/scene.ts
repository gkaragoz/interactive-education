import { Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Quaternion, Vector3, type MeshPhysicalMaterial } from 'three';
import type { ModuleContext, ModuleLabel, ModuleScene, Vec3 } from '../../scene';
import { CellBody } from './membrane';
import { cellGeometry, chromatidGeometry, fibreGeometry, kinetochoreGeometry, patchGeometry, ringGeometry, unitSphere } from './geometry';
import { makeChromatidMaterial } from './chromatidMaterial';
import { ChromatidSet } from './chromatidSet';
import { KF, SpindleSet } from './spindleSet';
import { NucleusSet } from './nucleusSet';
import { CellFrames } from './cellFrames';
import { cellDims, neckRadius, type CellDims } from './cellMath';
import { buildPlan, parseAssortment, parsePairs } from './plans';
import type { LabelCtx, Plan } from './plan';

const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const dims: CellDims = { ax: 1, a: 1, c: 0 };
const qy = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
const qz = new Quaternion();
const qx = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
const qa = new Quaternion();
const zAxis = new Vector3(0, 0, 1);
const pv = new Vector3();
const sv = new Vector3();
const mm = new Matrix4();

/** Builds the module scene for one track: all poses are computed from the keyframe plan at time t (pure). */
export async function createMitosisScene(ctx: ModuleContext): Promise<ModuleScene> {
  const lib = ctx.assets.materials;
  const q = ctx.quality;
  const radial = q === 'low' ? 12 : q === 'medium' ? 16 : 20;
  const root = new Group();
  root.name = 'mitosis-meiosis';
  const uniforms = { uLoose: { value: 0 } };

  // materials: clones of the shared painted look (see src/scene/materials.ts)
  const chromMat = makeChromatidMaterial(lib.get('chromosome', 'clay'), uniforms);
  const clay = (id: string): MeshPhysicalMaterial => lib.get(id, 'clay');
  const gel = (id: string, opacity: number): MeshPhysicalMaterial => {
    const src = lib.get(id, 'gel');
    const m = src.clone();
    m.opacity = opacity;
    m.onBeforeCompile = src.onBeforeCompile;
    m.customProgramCacheKey = src.customProgramCacheKey;
    return m;
  };
  const extra: MeshPhysicalMaterial[] = [];

  const gChrom = chromatidGeometry(radial, q === 'low' ? 18 : 28);
  const gKin = kinetochoreGeometry(radial);
  const gFibre = fibreGeometry(6);
  const gPatch = patchGeometry(3);
  const gSphere = unitSphere(radial * 2);
  const gRing = ringGeometry(radial * 2);
  const gCell = cellGeometry(q === 'low' ? 28 : 40, q === 'low' ? 40 : 64);
  const geoms = [gChrom, gKin, gFibre, gPatch, gSphere, gRing, gCell];

  const cells = [0, 1].map(() => new CellBody(gCell, lib.shell('membrane-animal'), root));
  const chroms = new ChromatidSet(root, gChrom, chromMat, gKin, clay('kinetochore'));
  // inset showing the other metaphase I orientation (independent assortment), small and tucked into a corner
  const ghostGroup = new Group();
  ghostGroup.scale.setScalar(0.38);
  ghostGroup.position.set(2.6, -2.6, 0.5);
  ghostGroup.visible = false;
  root.add(ghostGroup);
  const gGhost = chromatidGeometry(radial, q === 'low' ? 18 : 28);
  const ghost = new ChromatidSet(ghostGroup, gGhost, chromMat, gKin, clay('kinetochore'));
  const ghostFrames = new CellFrames();
  let ghostPlan: Plan | null = null;
  const kfSet = await ctx.assets.instances('kinetochore-fibre', 2 * KF, '#e8b45a');
  const poleSet = await ctx.assets.instances('spindle-pole', 4, '#e8a04c');
  root.add(kfSet.group, poleSet.group);
  const spindle = new SpindleSet(root, gFibre, clay('kinetochore-fibre'), kfSet, poleSet, q);
  const nuclei = new NucleusSet(root, gPatch, gel('nuclear-envelope-fragment', 0.6), gSphere, gel('nucleoplasm', 0.08), clay('nucleolus'));
  const rings = new InstancedMesh(gRing, clay('contractile-ring'), 8);
  rings.instanceMatrix.setUsage(DynamicDrawUsage);
  rings.frustumCulled = false;
  rings.renderOrder = 35;
  for (let i = 0; i < 8; i++) {
    rings.setMatrixAt(i, HIDDEN);
    rings.setColorAt(i, new Color('#f08a3c'));
  }
  root.add(rings);
  const frames = new CellFrames();

  let options = { ...ctx.options };
  let plan: Plan = buildPlan(ctx.trackId, parsePairs(options), parseAssortment(options), ctx.rng);
  const loose = new Float32Array(1);
  const camV = new Float32Array(6);
  const posed = { t: Number.NaN };

  const updateRings = (t: number): void => {
    let slot = 0;
    for (const f of plan.furrow) {
      const v = frames.vals[f.cell] as Float32Array;
      if (t < f.t0 || t > f.t1 + 3 || (v[0] as number) < 0.5) continue;
      cellDims(v, dims);
      const r = neckRadius(dims);
      if (r < 0.06) continue;
      // the ring lies in the plane x = 0 of the cell (axis along the cell's X)
      qz.setFromAxisAngle(zAxis, v[3] as number);
      qa.copy(qz).multiply(qy);
      pv.set(v[1] as number, v[2] as number, 0);
      sv.set(r, r, r);
      rings.setMatrixAt(slot++, mm.compose(pv, qa, sv));
    }
    // chiasmata: a ring where the exchanged tips of two non-sister chromatids touch
    for (const x of plan.chiasmata) {
      if (t < x.t0 || t > x.t1 || slot >= 8) continue;
      const a = x.ids[0];
      const b = x.ids[1];
      const grow = Math.min(1, (t - x.t0) / 0.8) * Math.min(1, (x.t1 - t) / 0.8);
      pv.set(
        ((chroms.tpos[a * 3] as number) + (chroms.tpos[b * 3] as number)) / 2,
        ((chroms.tpos[a * 3 + 1] as number) + (chroms.tpos[b * 3 + 1] as number)) / 2,
        ((chroms.tpos[a * 3 + 2] as number) + (chroms.tpos[b * 3 + 2] as number)) / 2,
      );
      qa.set(chroms.qw[a * 4] as number, chroms.qw[a * 4 + 1] as number, chroms.qw[a * 4 + 2] as number, chroms.qw[a * 4 + 3] as number).multiply(qx);
      const sz = 0.5 * grow;
      sv.set(sz, sz, sz);
      rings.setMatrixAt(slot++, mm.compose(pv, qa, sv));
    }
    for (let i = slot; i < 8; i++) rings.setMatrixAt(i, HIDDEN);
    rings.instanceMatrix.needsUpdate = true;
  };

  const pose = (t: number): void => {
    const tt = Math.min(Math.max(t, 0), plan.duration);
    frames.update(plan, tt);
    plan.loose.eval(tt, loose);
    uniforms.uLoose.value = loose[0] as number;
    for (let i = 0; i < 2; i++) {
      const v = frames.vals[i] as Float32Array;
      cellDims(v, dims);
      (cells[i] as CellBody).set(v[1] as number, v[2] as number, v[3] as number, dims.ax, dims.a, dims.c, (v[0] as number) > 0.5);
    }
    chroms.update(plan, tt, frames);
    nuclei.update(plan, tt, frames);
    spindle.update(plan, tt, frames, chroms);
    updateRings(tt);
    const gw = plan.ghostWin;
    ghostGroup.visible = ghostPlan !== null && gw !== null && tt >= gw[0] && tt <= gw[1];
    if (ghostPlan && gw) {
      // always posed (clamped to its window) so the matrices stay a pure function of t while the group is hidden
      const gt = Math.min(Math.max(tt, gw[0]), gw[1]);
      ghostFrames.update(ghostPlan, gt);
      ghost.update(ghostPlan, gt, ghostFrames);
    }
    posed.t = t;
  };

  const apply = (): void => {
    plan = buildPlan(ctx.trackId, parsePairs(options), parseAssortment(options), ctx.rng);
    chroms.setMeta(plan);
    ghostPlan = plan.ghostWin && ctx.level === 'ileri' ? buildPlan(ctx.trackId, parsePairs(options), parseAssortment(options) ^ 7, ctx.rng) : null;
    if (ghostPlan) ghost.setMeta(ghostPlan);
    scene.duration = plan.duration;
  };

  const get = (arr: Float32Array, i: number, out: Vec3): Vec3 => {
    out[0] = arr[i * 3] as number;
    out[1] = arr[i * 3 + 1] as number;
    out[2] = arr[i * 3 + 2] as number;
    return out;
  };
  const lctx: LabelCtx = {
    level: ctx.level,
    t: 0,
    chromPos: (i, o) => get(chroms.cpos, i, o),
    kineto: (i, o) => get(chroms.kpos, i, o),
    polePos: (i, o) => get(spindle.ppos, i, o),
    nucPos: (i, o) => get(nuclei.world, i, o),
    cellPos: (i, lx, ly, o) => {
      pv.set(lx, ly, 0).applyMatrix4(frames.matrix(i));
      o[0] = pv.x;
      o[1] = pv.y;
      o[2] = pv.z;
      return o;
    },
    chromVals: (i) => chroms.vals[i] as Float32Array,
    cellVals: (i) => frames.vals[i] as Float32Array,
    poleVals: (i) => spindle.poleVals[i] as Float32Array,
    nucVals: (i) => nuclei.vals[i] as Float32Array,
    looseVal: 0,
  };
  const labelCtx = (t: number): LabelCtx => {
    if (posed.t !== t) pose(t);
    lctx.t = t;
    lctx.looseVal = loose[0] as number;
    return lctx;
  };

  const scene = {
    root,
    duration: plan.duration,
    seek: pose,
    cameraAt: (t: number): { position: Vec3; target: Vec3 } => {
      plan.cam.eval(Math.min(Math.max(t, 0), plan.duration), camV);
      return { position: [camV[0] as number, camV[1] as number, camV[2] as number], target: [camV[3] as number, camV[4] as number, camV[5] as number] };
    },
    labelsAt: (t: number): ModuleLabel[] => {
      const tt = Math.min(Math.max(t, 0), plan.duration);
      const all: ModuleLabel[] = [...plan.labels(labelCtx(tt))];
      if (ghostGroup.visible) all.unshift({ text: 'Diğer yönelim (bağımsız dağılım)', world: [2.6, -1.6, 0.5], anchorId: 'ghost' });
      // at most six labels, those that name the phase's subject first
      const low = new Set(['membrane', 'frag', 'nucl0', 'nucl1', 'nucl2', 'nuc0', 'nuc1', 'nuc2', 'pole0', 'pole1', 'pole2', 'pole3', 'chrom']);
      const rank = (l: ModuleLabel): number => (low.has(l.anchorId ?? '') ? 1 : 0);
      return all.map((l, i) => ({ l, i })).sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i).slice(0, 6).map((x) => x.l);
    },
    chartAt: (t: number): Record<string, number> => plan.chart(Math.min(Math.max(t, 0), plan.duration)),
    setOptions: (o: Record<string, string>): void => {
      options = { ...options, ...o };
      apply();
      if (Number.isFinite(posed.t)) pose(posed.t);
    },
    dispose: (): void => {
      chroms.dispose();
      ghost.dispose();
      gGhost.dispose();
      spindle.dispose();
      nuclei.dispose();
      rings.dispose();
      cells.forEach((c) => c.dispose());
      chromMat.dispose();
      nuclei.materials.forEach((m) => m.dispose());
      extra.length = 0;
      for (const g of geoms) g.dispose();
      root.removeFromParent();
    },
  };
  apply();
  pose(0);
  return scene as ModuleScene;
}
