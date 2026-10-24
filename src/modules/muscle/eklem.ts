import type { Group } from 'three';
import type { ModuleContext, ModuleLabel } from '../../scene';
import { armAt, BICEPS_KEYS, TRICEPS_KEYS } from './armModel';
import { createArmView } from './armView';
import { evalKeys } from './math';
import type { TrackRig } from './scene';

/** Arm frame -> stage: the arm is shifted so the swing of the forearm stays centred. */
const OFFSET: [number, number, number] = [-1.4, -0.2, 0];

/** Wording of a muscle's state from its activity now and half a second later. */
function stateWord(act: number, next: number, prev: number): string {
  if (act > 55) return next < act - 3 ? 'gevşemeye başlıyor' : 'kasılı';
  if (act > 12) return next > prev ? 'kasılıyor' : 'gevşiyor';
  return 'gevşek';
}

/** `eklem-hareketi`: a stylised arm; the elbow angle, the biceps and the triceps follow the data curves. */
export function createEklem(ctx: ModuleContext, root: Group): TrackRig {
  const arm = createArmView(ctx);
  arm.group.position.set(...OFFSET);
  arm.fader.set(1);
  const ileri = ctx.level === 'ileri';
  arm.showArc(ileri);
  root.add(arm.group);
  const at = (p: [number, number, number]): [number, number, number] => [p[0] + OFFSET[0], p[1] + OFFSET[1], p[2] + OFFSET[2]];

  return {
    duration: 36,
    seek: (t) => arm.pose(armAt(t)),
    cameraAt: (t) => ({ position: [1.5 + (ctx.reducedMotion ? 0 : Math.sin(t * 0.12) * 0.6), 2.0, 29], target: [1.2, 0.2, 0] }),
    labelsAt: (t) => {
      const s = armAt(t);
      const word = (keys: typeof BICEPS_KEYS): string => stateWord(s.biceps, evalKeys(keys, t + 0.5), evalKeys(keys, t - 0.5));
      const L = (text: string, id: string, p: [number, number, number]): ModuleLabel => ({ text, anchorId: id, world: at(p) });
      const out: ModuleLabel[] = [
        L(ileri ? 'Üst kol kemiği (humerus)' : 'Üst kol kemiği', 'humerus', arm.landmark('humerus', s.angle)),
        L(ileri ? 'Ön kol kemikleri (radius, ulna)' : 'Ön kol kemikleri', 'forearm', arm.landmark('forearm', s.angle)),
        L('Dirsek eklemi', 'elbow', arm.landmark('elbow', s.angle)),
        L(`Biseps · ${word(BICEPS_KEYS)}`, 'biceps', arm.landmark('biceps', s.angle)),
        L(`Triseps · ${stateWord(s.triceps, evalKeys(TRICEPS_KEYS, t + 0.5), evalKeys(TRICEPS_KEYS, t - 0.5))}`, 'triceps', arm.landmark('triceps', s.angle)),
      ];
      out.push(ileri ? L(`Dirsek açısı ${Math.round(s.angle)}°`, 'angle', [1.1, 1.9, 0.9]) : L('Kiriş', 'tendon', arm.landmark('bicepsTendon', s.angle)));
      return out;
    },
    chartAt: (t) => {
      const s = armAt(t);
      return { 'dirsek-acisi': s.angle, biseps: s.biceps, triseps: s.triceps };
    },
    dispose: () => arm.dispose(),
  };
}
