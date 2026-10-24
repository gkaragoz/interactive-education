import { Group, Matrix4, Vector3 } from 'three';
import type { LevelId } from '../../data/types';
import { mulberry32 } from '../../core';
import type { Kit } from './kit';
import { clamp01 } from './math';
import type { OverviewSpec } from './overview';

const HERO_Z = 6;
const L = (text: string, x: number, y: number, id: string): { text: string; world: [number, number, number]; anchorId: string } => ({
  text,
  world: [x, y, HERO_Z + 1.2],
  anchorId: id,
});

/** Opening shots: the whole neuron, the synapse terminal with drifting transmitter, the three painted pieces of the reflex arc. */
export function overviewFor(trackId: string, level: LevelId): OverviewSpec | null {
  if (trackId === 'aksiyon-potansiyeli') {
    return {
      asset: 'neuron',
      origin: [-9, 1, 0],
      rot: [0, 0, 0],
      scale: 1.1,
      focus: [-4.6, 1.2, HERO_Z],
      dist: 16,
      labels: () => [L('Nöron (sinir hücresi)', -4.4, 3.9, 'ov-neuron'), L('Hücre gövdesi', -10, 3.6, 'ov-soma'), L('Akson', -1.5, 2.6, 'ov-axon')],
    };
  }
  if (trackId === 'sinaps') {
    return {
      asset: 'synapse-terminal',
      origin: [0, 0.2, 0],
      rot: [0, 0, Math.PI / 2],
      scale: 2.7,
      focus: [-1.2, 0.8, HERO_Z],
      dist: 16,
      labels: () => [L('Presinaptik uç', -4.6, 3.4, 'ov-pre'), L('Sinaptik aralık', 0.2, 3.9, 'ov-cleft'), L('Postsinaptik hücre', 5.0, 2.6, 'ov-post')],
      extra: transmitterDrift,
    };
  }
  if (trackId === 'refleks-yayi') {
    return {
      asset: 'reflex-arc-parts',
      origin: [-0.6, 0, 0],
      rot: [Math.PI / 2, 0, 0],
      scale: 1.8,
      focus: [-2.6, 0.6, HERO_Z],
      dist: 16,
      labels: () => [
        L(level === 'ileri' ? 'Deri ve reseptör' : 'Deri', -6.6, 2.6, 'ov-skin'),
        L('Omurilik', -0.6, 2.9, 'ov-cord'),
        L(level === 'ileri' ? 'Efektör (kas)' : 'Kas', 5.6, 2.2, 'ov-muscle'),
      ],
    };
  }
  return null;
}

/** Nine neurotransmitter molecules (the painted asset) that cross the hero's cleft again and again: a quiet loop under the overview. */
async function transmitterDrift(kit: Kit, parent: Group): Promise<(t: number) => void> {
  const set = await kit.ctx.assets.instances('neurotransmitter', 9);
  parent.add(set.group);
  kit.track(set);
  const rng = mulberry32(12);
  const lanes = Array.from({ length: 9 }, () => ({ x: (rng() - 0.5) * 0.9, z: (rng() - 0.5) * 0.9, ph: rng(), sp: 0.08 + rng() * 0.05 }));
  const m = new Matrix4();
  const p = new Vector3();
  return (t) => {
    lanes.forEach((ln, i) => {
      const u = (t * ln.sp + ln.ph) % 1;
      const env = Math.sin(clamp01(u) * Math.PI) ** 0.6;
      p.set(ln.x + 0.05 * Math.sin(t * 2 + i), 0.75 - u * 1.5, ln.z);
      m.makeScale(0.45 * env, 0.45 * env, 0.45 * env).setPosition(p);
      set.setMatrix(i, m);
    });
    set.commit();
  };
}
