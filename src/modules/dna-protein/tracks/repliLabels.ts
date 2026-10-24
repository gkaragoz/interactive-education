import { Vector3 } from 'three';
import type { ModuleLabel, Vec3 } from '../../../scene';
import type { Nucs } from '../kit/nucs';
import { REPLI_N, sealTime } from './repliTiming';

export interface RepliPoints {
  nucs: Nucs;
  oldA: Int32Array;
  oldB: Int32Array;
  newA: Int32Array;
  newB: Int32Array;
  fork: Vector3;
  helicase: Vector3;
  lead: Vector3;
  lag: Vector3[];
  lagOn: boolean[];
  leadOn: boolean;
  forkOn: boolean;
  dmax: number;
}

const v = new Vector3();
const N = REPLI_N;

export function repliLabels(t: number, ileri: boolean, P: RepliPoints): ModuleLabel[] {
  const out: ModuleLabel[] = [];
  const pt = (slot: number, dy = 0, dx = 0, which: 'sugar' | 'phos' | 'tip' = 'sugar'): Vec3 | null => {
    if (slot < 0) return null;
    P.nucs.point(slot, which, v);
    return [v.x + dx, v.y + dy, v.z];
  };
  const add = (text: string, p: Vec3 | null, id: string): void => {
    if (p) out.push({ text, world: p, anchorId: id });
  };
  const vec = (text: string, p: Vector3, id: string, dy = 0): void => void out.push({ text, world: [p.x, p.y + dy, p.z], anchorId: id });

  if (t >= 0.6 && t < 6.5) add('Çift sarmal DNA (eşlenecek)', pt(P.oldB[10] as number, 1.1), 'parent');
  if (t >= 7.5 && t < 14.8) vec(ileri ? 'Replikasyon çatalı' : 'Sarmal açılıyor', P.fork, 'fork', 1.5);
  if (P.forkOn && t >= 5.5 && t < 28.5) vec(ileri ? 'Helikaz (Ek bilgi)' : 'Sarmalı açan enzim', P.helicase, 'helicase', 0.6);
  if (t >= 9 && t < 38) {
    add('Eski zincir (kalıp)', pt(P.oldB[3] as number, 0.9, 0.3), 'oldB');
    add('Eski zincir (kalıp)', pt(P.oldA[3] as number, -0.9, 0.3), 'oldA');
  }
  if (P.leadOn && t >= 15) vec(ileri ? 'DNA polimeraz' : 'Yeni zinciri yapan enzim', P.lead, 'pol-lead', 0.9);
  if (t >= 18 && t < 38) add(ileri && t < 26.5 ? 'Kesintisiz zincir (yeni)' : 'Yeni zincir', pt(P.newB[9] as number, 0.8, 0.2), 'newB');
  if (ileri && t >= 26 && t < 38.5) {
    add('Kesikli zincir (yeni)', pt(P.newA[9] as number, -0.8, 0.2), 'newA');
    add('Okazaki parçası', pt(P.newA[6] as number, -0.9, 0.2), 'okazaki');
  } else if (!ileri && t >= 20 && t < 38) add('Yeni zincir', pt(P.newA[9] as number, -0.8, 0.2), 'newA');
  for (let f = 0; f < P.lag.length; f++) if (P.lagOn[f] && t < 38) vec(ileri ? 'DNA polimeraz' : 'Yeni zinciri yapan enzim', P.lag[f] as Vector3, `pol-lag${f}`, -0.6);
  if (ileri && t >= 16.2 && t < 21) add('RNA primeri (Ek bilgi)', pt(P.newA[3] as number, -1.1, 0.6), 'primer');
  if (ileri && t >= sealTime(1) - 1 && t < sealTime(1) + 2.5) add('Parçalar eklenir (ligaz, Ek bilgi)', pt(P.newA[4] as number, -1.1, 0.6), 'ligaz');
  if (t >= 39 && t < 48.5) {
    const i = N - 4;
    add('Eski zincir', pt(P.oldB[i] as number, 0.8, 0.3), 'o1');
    add('Yeni zincir', pt(P.newB[i] as number, 0.8, 0.3), 'n1');
    add('Eski zincir', pt(P.oldA[i] as number, -0.8, 0.3), 'o2');
    add('Yeni zincir', pt(P.newA[i] as number, -0.8, 0.3), 'n2');
  }
  if (t >= 49) {
    add('DNA 1: bir eski, bir yeni zincir', pt(P.oldB[3] as number, 1.5), 'd1');
    add('DNA 2: bir eski, bir yeni zincir', pt(P.oldA[3] as number, -1.5), 'd2');
  }
  return out.slice(0, 6);
}
