import { CircleGeometry, Group, InstancedMesh, Matrix4, Mesh, TorusGeometry, Vector3 } from 'three';
import type { ModuleContext, ModuleLabel, Vec3 } from '../../scene';
import { angleForBicepsRatio, bicepsLine } from './armModel';
import { createArmView } from './armView';
import { Fader, paint, rodMatrix, surfaces, unitRod } from './kit';
import { REST_L, sarcAt } from './sarcModel';
import { createSimpleSarcomere } from './sarcSimple';
import type { TrackRig } from './scene';

const ARM_AT: Vec3 = [-4.4, -0.5, 0];
const LENS_AT: Vec3 = [4.5, 2.9, 0];
const LENS_R = 3.35;
const SARC_SCALE = 2.1;

/** Wording of what the muscle is doing, from the phase times of the data. */
export function muscleState(t: number): string {
  if (t < 10) return 'gevşek';
  if (t < 24) return 'kısalıyor';
  if (t < 28) return 'kısa kaldı';
  if (t < 38) return 'gevşiyor';
  return 'gevşek';
}

/** `kasilma` at temel level: the muscle as a whole pulls the bone, with a magnified two-layer sarcomere beside it. */
export function createKasilmaTemel(ctx: ModuleContext, root: Group): TrackRig {
  const arm = createArmView(ctx);
  arm.group.position.set(...ARM_AT);
  arm.fader.set(1);
  arm.showArc(false);
  root.add(arm.group);

  const lensFader = new Fader();
  const lens = new Group();
  lens.position.set(...LENS_AT);
  root.add(lens);
  const sf = surfaces(ctx);
  const sarc = createSimpleSarcomere(ctx);
  sarc.fader.set(1);
  sarc.group.scale.setScalar(SARC_SCALE);
  lens.add(sarc.group);
  const disc = new Mesh(paint(new CircleGeometry(LENS_R, 56), '#fff1d6'), sf.glass(lensFader, 0.34, 0.5));
  disc.position.z = -0.5;
  disc.renderOrder = 5;
  lens.add(disc);
  const ringGeo = paint(new TorusGeometry(LENS_R, 0.07, 10, 64), '#d9822b');
  const ring = new Mesh(ringGeo, sf.solid(lensFader));
  lens.add(ring);
  lensFader.set(1);

  // two light lines from the biceps to the lens: "this is what the muscle is made of"
  const leaderMat = sf.solid(lensFader);
  const leaderGeo = paint(unitRod(6), '#d9822b');
  const leaders = new InstancedMesh(leaderGeo, leaderMat, 2);
  leaders.frustumCulled = false;
  root.add(leaders);
  const m4 = new Matrix4();
  const from = new Vector3();
  const to = new Vector3();
  const bicepsMid = (angle: number): Vec3 => {
    const l = bicepsLine(angle);
    return [(l.origin[0] + l.insertion[0]) / 2 + ARM_AT[0], (l.origin[1] + l.insertion[1]) / 2 + ARM_AT[1], 0.3];
  };

  const angleAt = (t: number): number => angleForBicepsRatio(sarcAt(t).L / REST_L);
  return {
    duration: 40,
    seek: (t) => {
      const s = sarcAt(t);
      const angle = angleAt(t);
      arm.pose({ angle, biceps: 72 * s.engage, triceps: 0 });
      sarc.pose(s);
      const b = bicepsMid(angle);
      from.set(b[0] + 0.5, b[1] + 0.2, b[2]);
      for (const k of [0, 1]) {
        const a = k === 0 ? 0.9 : -0.9;
        to.set(LENS_AT[0] - Math.cos(a) * LENS_R * 0.98, LENS_AT[1] + Math.sin(a) * LENS_R * 0.98, 0);
        leaders.setMatrixAt(k, rodMatrix(m4, from, to, 0.03));
      }
      leaders.instanceMatrix.needsUpdate = true;
    },
    cameraAt: (t) => ({ position: [0.4 + (ctx.reducedMotion ? 0 : Math.sin(t * 0.11) * 1.2), 2.4, 33], target: [0.2, 0.4, 0] }),
    labelsAt: (t) => {
      const angle = angleAt(t);
      const off = (p: [number, number, number]): Vec3 => [p[0] + ARM_AT[0], p[1] + ARM_AT[1], p[2]];
      const b = bicepsMid(angle);
      const out: ModuleLabel[] = [
        { text: `Kas (biseps) · ${muscleState(t)}`, anchorId: 'kas', world: [b[0] + 0.4, b[1], 0.6] },
        { text: 'Kemik', anchorId: 'kemik', world: off(arm.landmark('humerus', angle)) },
        { text: 'Kiriş', anchorId: 'kiris', world: off(arm.landmark('bicepsTendon', angle)) },
        { text: 'Kalın iplik (miyozin)', anchorId: 'kalin', world: [LENS_AT[0] + 0.2, LENS_AT[1] + 0.32 * SARC_SCALE, 0.4] },
        { text: 'İnce iplik (aktin)', anchorId: 'ince', world: [LENS_AT[0] + 0.5, LENS_AT[1], 0.4] },
      ];
      if (t >= 10 && t < 28) out.push({ text: 'Kısalan kas kemiği çeker', anchorId: 'ceker', world: off(arm.landmark('forearm', angle)) });
      return out;
    },
    chartAt: (t) => {
      const s = sarcAt(t);
      return { 'sarkomer-boyu': s.L, 'a-bandi': s.A, 'i-bandi': s.I, 'h-bandi': s.H };
    },
    dispose: () => {
      arm.dispose();
      sarc.dispose();
      ringGeo.dispose();
      disc.geometry.dispose();
      leaderGeo.dispose();
      leaders.dispose();
      lensFader.dispose();
      lens.removeFromParent();
      leaders.removeFromParent();
    },
  };
}
