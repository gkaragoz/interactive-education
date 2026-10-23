import { Vector3 } from 'three';
import type { ModuleLabel, Vec3 } from '../../../scene';
import type { LevelId } from '../../../data/types';
import { BRAIN, CORD, ELBOW, FINGERTIP, MUSCLE_CENTER, PLATE } from './layout';
import type { BeadState } from './reflex';

export interface LabelCtx {
  flex: number;
  /** World position on a neuron at arc parameter u. */
  bead(neuron: 'sensory' | 'inter' | 'motor', u: number): Vector3;
  mainState: BeadState;
}

const at = (v: Vector3, dx = 0, dy = 0): Vec3 => [v.x + dx, v.y + dy, v.z + 0.4];

/** Names that appear while the learner needs them; Temel keeps to the programme's words, İleri adds the finer ones. */
export function beadLabels(t: number, level: LevelId, c: LabelCtx): ModuleLabel[] {
  const out: ModuleLabel[] = [];
  const adv = level === 'ileri';
  const add = (on: boolean, text: string, world: Vec3, anchorId: string): void => {
    if (on) out.push({ text, world, anchorId });
  };
  add(t > 0.4 && t < 9.5, 'Sıcak cisim', [PLATE.x, PLATE.y - 1.2, 0.6], 'hot');
  const tip = FINGERTIP.clone()
    .sub(ELBOW)
    .applyAxisAngle(new Vector3(0, 0, 1), c.flex)
    .add(ELBOW);
  add(t > 4.8 && t < 10, adv ? 'Reseptör (ısı, ağrı)' : 'Deri', at(tip, 0.4, 1.7), 'receptor');
  if (c.mainState.neuron === 'sensory' && t < 16.6) add(t > 9.4, 'Duyu nöronu', at(c.bead('sensory', c.mainState.u), 0, 1.0), 'sensory');
  add((t > 11.5 && t < 24) || t > 36.5, 'Omurilik', [CORD.x, CORD.y - 3.15, 0.6], 'cord');
  add(adv && t > 16.8 && t < 22.6, 'Ara nöron', [CORD.x + 2.9, CORD.y + 0.5, 0.6], 'inter');
  if (c.mainState.neuron === 'motor') add(t > 22.3 && t < 29.6, 'Motor nöron', at(c.bead('motor', c.mainState.u), 0, -1.0), 'motor');
  add(t > 29 && t < 36.2, adv ? 'Efektör (kol kası)' : 'Kas', [MUSCLE_CENTER.x, MUSCLE_CENTER.y + 1.5, 0.9], 'muscle');
  add(t > 19 && t < 35.5, 'Beyne giden yol (yavaş)', [CORD.x + 3.6, 3.7, 0.4], 'slow');
  add(t > 36, adv ? 'Beyin: acıyı şimdi fark eder' : 'Beyin acıyı fark eder', [BRAIN.x - 0.6, BRAIN.y + 2.5, 0.8], 'brain');
  return out;
}
