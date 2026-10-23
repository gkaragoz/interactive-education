import { Group, Mesh } from 'three';
import type { ModuleContext } from '../../scene';
import { angleForBicepsRatio, bicepsLine } from './armModel';
import { createArmView } from './armView';
import { labelsFor } from './kasilmaLabels';
import { axisTube, paint, surfaces } from './kit';
import { YAW, createFascicleLevel, createMuscleLevel, type Level } from './levels';
import { createFibreLevel, createMyofibrilLevel } from './levelsB';
import { lerp, smooth } from './math';
import { REST_L, sarcAt } from './sarcModel';
import { SLAB } from './sarcLattice';
import { createSarcomereView } from './sarcView';
import { stripeUniforms } from './stripes';
import { ARM_SCALE, cameraDistance, F3, K, LEVELS, PITCH, levelScale, levelWeight, zoomAt } from './zoom';
import type { TrackRig } from './scene';

/** `kasilma` at ileri level: a flythrough from the arm to one sarcomere, then the sliding-filament cycle, then back out. */
export function createKasilma(ctx: ModuleContext, root: Group): TrackRig {
  const u = stripeUniforms();
  const per3 = { value: 1 };
  const per4 = { value: 1 };
  const arm = createArmView(ctx);
  const mid = bicepsLine(160);
  arm.group.position.set(-(mid.origin[0] + mid.insertion[0]) / 2, -(mid.origin[1] + mid.insertion[1]) / 2, 0);
  const muscle = createMuscleLevel(ctx);
  const fascicle = createFascicleLevel(ctx);
  const fibre = createFibreLevel(ctx, u, per3);
  const myofibril = createMyofibrilLevel(ctx, u, per4);
  const sarc = createSarcomereView(ctx);
  // the myofibril membrane around the filament slab, and the slab centred on the zoom axis
  const sarcGroup = new Group();
  sarcGroup.add(sarc.group);
  sarc.group.position.set(0, -SLAB.cy, -SLAB.cz);
  const shellFader = sarc.fader;
  const glass = surfaces(ctx).glass(shellFader, 0.02, 0.2);
  const shellGeo = paint(axisTube(1.0, 7, 36, true), '#f3c7b8');
  const shell = new Mesh(shellGeo, glass);
  shell.renderOrder = 50;
  sarc.group.add(shell);
  shell.position.set(0, SLAB.cy, SLAB.cz);
  const armLevel: Level = { group: arm.group, fader: arm.fader, contract: () => undefined, dispose: () => arm.dispose() };
  const levels: Level[] = [armLevel, muscle, fascicle, fibre, myofibril, { group: sarcGroup, fader: sarc.fader, contract: () => undefined, dispose: () => { sarc.dispose(); shellGeo.dispose(); } }];
  const holders = levels.map((l) => {
    const g = new Group();
    g.add(l.group);
    root.add(g);
    return g;
  });

  holders.forEach((g, k) => {
    if (k >= 1 && k <= 4) g.rotation.y = YAW;
  });

  function seek(t: number): void {
    const s = sarcAt(t);
    const z = zoomAt(t);
    u.uA.value = s.A / s.L;
    u.uH.value = s.H / s.L;
    per4.value = 1 / (PITCH * s.L);
    per3.value = F3 / (PITCH * s.L);
    // whole-muscle shortening: the forearm follows the biceps (belly ratio = sarcomere ratio)
    arm.pose({ angle: angleForBicepsRatio(s.L / REST_L), biceps: s.c * 72 * s.engage, triceps: 0 });
    muscle.contract(s.L / REST_L);
    fascicle.contract(s.L / REST_L);
    const impulse = t < 5.7 ? 0 : t < 6.6 ? (t - 5.7) / 0.9 : t < 7.2 ? 1.2 : 0;
    fibre.impulse(impulse);
    levels.forEach((lv, k) => {
      const w = levelWeight(k, z);
      const sc = levelScale(k, z) * (k === LEVELS - 1 ? K : k === 0 ? ARM_SCALE : 1);
      const visible = lv.fader.set(w);
      holders[k]!.visible = visible && sc < 400;
      holders[k]!.scale.setScalar(sc);
    });
    sarc.pose(s);
  }

  return {
    duration: 40,
    seek,
    cameraAt: (t) => {
      const z = zoomAt(t);
      const e = smooth(z / 5);
      // the shell keeps the scene centred in the free area; only a slow sway (off with reduced motion)
      const sway = ctx.reducedMotion ? 0 : Math.sin(t * 0.11) * 1.6;
      return { position: [sway, lerp(6, 4.4, e), cameraDistance(z)], target: [0, 0, 0] };
    },
    labelsAt: (t) => labelsFor(t, ctx.level, arm, angleForBicepsRatio(sarcAt(t).L / REST_L)),
    chartAt: (t) => {
      const s = sarcAt(t);
      return { 'sarkomer-boyu': s.L, 'a-bandi': s.A, 'i-bandi': s.I, 'h-bandi': s.H };
    },
    dispose: () => levels.forEach((l) => l.dispose()),
  };
}
