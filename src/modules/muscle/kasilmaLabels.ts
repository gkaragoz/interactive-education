import type { ModuleLabel, Vec3 } from '../../scene';
import type { LevelId } from '../../data/types';
import type { ArmView } from './armView';
import { fmt1 } from './math';
import { sarcAt } from './sarcModel';
import { SLAB } from './sarcLattice';
import { YAW } from './levels';
import { ARM_SCALE, PITCH, K, levelScale, levelWeight, zoomAt } from './zoom';

type L = ModuleLabel;
const scaled = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
/** Level positions for the turned levels (1 to 4): the same yaw as the scene applies. */
const turned = (p: Vec3, s: number): Vec3 => {
  const c = Math.cos(YAW);
  const n = Math.sin(YAW);
  return [(p[0] * c + p[2] * n) * s, p[1] * s, (-p[0] * n + p[2] * c) * s];
};

/** Labels of the `kasilma` track (ileri level): each zoom level names its own parts while it is in view. */
export function labelsFor(t: number, level: LevelId, arm: ArmView, angle: number): L[] {
  const z = zoomAt(t);
  const out: L[] = [];
  const on = (k: number): number | null => (levelWeight(k, z) > 0.6 ? levelScale(k, z) : null);
  const s0 = on(0);
  if (s0 !== null) {
    const off = arm.group.position;
    const at = (name: Parameters<ArmView['landmark']>[0]): Vec3 => {
      const p = arm.landmark(name, angle);
      return scaled([p[0] + off.x, p[1] + off.y, p[2]], s0 * ARM_SCALE);
    };
    out.push({ text: 'Biseps (iskelet kası)', anchorId: 'a-biceps', world: at('biceps') }, { text: 'Kemik', anchorId: 'a-bone', world: at('humerus') }, { text: 'Kiriş (tendon)', anchorId: 'a-tendon', world: at('bicepsTendon') });
  }
  const s1 = on(1);
  if (s1 !== null) {
    out.push({ text: 'Kas (biseps)', anchorId: 'm-muscle', world: turned([-5, 3.2, 0.5], s1) }, { text: 'Kas demeti (fasikül)', anchorId: 'm-fascicle', world: turned([0, 0, 0.8], s1) });
  }
  const s2 = on(2);
  if (s2 !== null) {
    out.push({ text: 'Kas demeti (fasikül)', anchorId: 'f-fascicle', world: turned([-5, 3.3, 0.4], s2) }, { text: 'Kas lifi (hücre)', anchorId: 'f-fibre', world: turned([0, 0, 0.8], s2) });
  }
  const s3 = on(3);
  if (s3 !== null) {
    out.push({ text: 'Kas lifi (hücre)', anchorId: 'l-fibre', world: turned([7, 3.2, 0.4], s3) }, { text: 'Miyofibril', anchorId: 'l-myo', world: turned([0, 0.4, 0.4], s3) });
    if (t > 5.4 && t < 8.2) out.push({ text: 'Motor nöronun ucu', anchorId: 'l-nerve', world: turned([-1.2, 3.75, 0.2], s3) });
  }
  const s4 = on(4);
  if (s4 !== null) {
    const half = (PITCH * sarcAt(t).L) / 2;
    out.push({ text: 'Miyofibril', anchorId: 'y-myo', world: turned([7, 1.9, 0], s4) }, { text: 'Sarkomer', anchorId: 'y-sarc', world: turned([0, -1.9, 0.6], s4) }, { text: 'Z çizgisi', anchorId: 'y-z', world: turned([-half, 1.9, 0.4], s4) });
  }
  const s5 = on(5);
  if (s5 !== null) out.push(...sarcomereLabels(t, level, s5 * K));
  return out;
}

function sarcomereLabels(t: number, level: LevelId, k: number): L[] {
  const s = sarcAt(t);
  const ileri = level === 'ileri';
  const half = s.L / 2;
  const a = s.A / 2;
  const top = SLAB.cy + SLAB.hy + 0.1;
  const w = (x: number, y: number, zz: number): Vec3 => [x * k, (y - SLAB.cy) * k, (zz - SLAB.cz) * k];
  const yBar = -SLAB.hy - 0.12 - 0.12;
  const zBar = SLAB.cz + SLAB.hz + 0.12;
  const num = (v: number): string => (ileri ? ` · ${fmt1(v)}` : '');
  // at most six labels: the four band labels (anchored on the right so their boxes stay clear of the left panel) plus a rotating pair
  const out: L[] = [
    { text: `A bandı${num(s.A)}`, anchorId: 's-a', world: w(a * 0.9, yBar, zBar) },
    { text: `I bandı${num(s.I)}`, anchorId: 's-i', world: w((a + half) / 2, yBar, zBar) },
    { text: `H bandı${num(s.H)}`, anchorId: 's-h', world: w(0.12, yBar - 0.12, zBar) },
    { text: `Sarkomer${num(s.L)}`, anchorId: 's-l', world: w(half * 0.92, yBar - 0.24, zBar) },
  ];
  const slot = t < 14.5 || t >= 26.5 ? 0 : t < 19.5 ? 1 : 2;
  if (slot === 0) out.push({ text: 'İnce filament (aktin)', anchorId: 's-thin', world: w(half - 0.3, -0.23, 0) }, { text: 'Kalın filament (miyozin)', anchorId: 's-thick', world: w(0.45, 0.46, 0) });
  else if (slot === 1) out.push({ text: 'Z çizgisi', anchorId: 's-z', world: w(half, top, SLAB.cz) }, ...(ileri ? [{ text: 'M çizgisi', anchorId: 's-m', world: w(0, top, SLAB.cz) }] : []));
  else if (ileri) out.push({ text: 'Miyozin başı', anchorId: 's-head', world: w(0.45, 0.25, 0.2) }, { text: 'Ek bilgi: Ca²⁺ ve ATP gerekir', anchorId: 's-ek', world: w(0.6, -0.3, 0.25) });
  else out.push({ text: 'Z çizgisi', anchorId: 's-z', world: w(half, top, SLAB.cz) });
  return out;
}
