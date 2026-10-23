import { Vector3 } from 'three';
import type { ModuleLabel, Vec3 } from '../../../scene';
import type { Nucs } from '../kit/nucs';
import type { GenePlan } from '../sequence';
import { TRANS_N, addTime, polPos } from './transTiming';

export interface TransPoints {
  nucs: Nucs;
  slotA: Int32Array;
  slotB: Int32Array;
  slotR: Int32Array;
  pol: Vector3;
  pore: Vector3;
  polOn: boolean;
  free: number;
  shift: number;
  codonPos: Vector3[];
  plan: GenePlan;
}

const v = new Vector3();
const N = TRANS_N;

export function transLabels(t: number, ileri: boolean, P: TransPoints): ModuleLabel[] {
  const out: ModuleLabel[] = [];
  const pt = (slot: number, dx = 0, dy = 0, which: 'sugar' | 'phos' | 'tip' = 'sugar'): Vec3 | null => {
    if (slot < 0) return null;
    P.nucs.point(slot, which, v);
    return [v.x + dx, v.y + dy, v.z];
  };
  const add = (text: string, p: Vec3 | null, id: string): void => {
    if (p) out.push({ text, world: p, anchorId: id });
  };
  const p = polPos(t);
  if (t >= 0.8 && t < 9) {
    add('Gen: DNA\'nın bir bölümü', pt(P.slotA[7] as number, 0, 1.0), 'gen');
    if (ileri && t > 2.5) add('Kodlayan zincir', pt(P.slotA[12] as number, 0, 0.9), 'cod');
    add(ileri ? 'Kalıp zincir' : 'DNA zinciri', pt(P.slotB[12] as number, 0, -1.0), 'kalip');
  }
  if (t >= 9 && t < 31) add('Kalıp zincir', pt(P.slotB[Math.min(N - 1, 12)] as number, 0, -1.0), 'kalip');
  if (P.polOn && t >= 6.8 && t < 31.5) out.push({ text: ileri ? 'RNA polimeraz' : 'Kopyalayan enzim', world: [P.pol.x, P.pol.y + 1.9, P.pol.z], anchorId: 'pol' });
  if (t >= 9.2 && t < 14) add(ileri ? 'Başlama: DNA açılır' : 'DNA açılıyor', pt(P.slotA[1] as number, 0, 1.6), 'baslama');
  if (ileri && t >= 14.5 && t < 28 && p < N - 2) add('Açılan bölge (kabarcık)', pt(P.slotA[Math.min(N - 1, Math.round(p))] as number, 0, 2.1), 'bubble');
  if (ileri && t >= 16 && t < 28 && p > 4) add('DNA yeniden kapanır', pt(P.slotB[Math.max(0, Math.round(p) - 4)] as number, 0, -1.0), 'close');
  if (t >= 12 && t < 31) {
    const j = Math.max(0, Math.min(N - 1, Math.floor(p - 0.5) - 0));
    const r = P.slotR[Math.max(0, j - 2)] as number;
    add('mRNA (büyüyor)', pt(r, 0, -1.1), 'mrna');
  }
  // the first U of the mRNA: RNA has uracil where DNA has thymine
  let firstU = -1;
  for (let j = 0; j < N; j++) if (P.plan.mrna[j] === 'U') { firstU = j; break; }
  if (firstU >= 0 && t >= addTime(firstU) + 1.2 && t < 30) add('U: urasil (RNA\'da T yok)', pt(P.slotR[firstU] as number, 0.2, -1.2, 'tip'), 'u');
  if (ileri && t >= 28 && t < 32) out.push({ text: 'Sonlanma: mRNA ve polimeraz ayrılır', world: [P.pol.x, P.pol.y + 2.4, P.pol.z], anchorId: 'son' });
  if (t >= 31) {
    const c = P.codonPos;
    const at = (k: number, dy: number): Vec3 => [(c[k] as Vector3).x, (c[k] as Vector3).y + dy, (c[k] as Vector3).z];
    if (P.shift > -9) out.push({ text: 'mRNA', world: at(2, -2.1), anchorId: 'mrna2' });
    if (P.shift > -7) {
      out.push({ text: ileri ? `${P.plan.codons[0]} (başlangıç kodonu)` : 'Kodon (üç harf)', world: at(0, 0.7), anchorId: 'c0' });
      if (ileri && P.plan.translation.stopped) out.push({ text: `${P.plan.codons[P.plan.codons.length - 1]} (dur kodonu)`, world: at(4, 0.7), anchorId: 'c4' });
    }
  }
  if (t >= 33 && t < 39) out.push({ text: 'DNA çekirdekte kalır', world: [2, 3, 0], anchorId: 'dnakal' });
  if (t >= 33) {
    out.push({ text: 'Çekirdek zarı', world: [P.pore.x + 3.2, P.pore.y + 3.2, P.pore.z + 0.5], anchorId: 'zar' });
    out.push({ text: ileri ? 'Çekirdek gözeneği' : 'Zardaki delik (gözenek)', world: [P.pore.x - 1.4, P.pore.y - 2.0, P.pore.z + 0.8], anchorId: 'pore' });
  }
  if (t >= 40) out.push({ text: 'Sitoplazmaya (ribozoma doğru)', world: [P.pore.x - 0.4, P.pore.y + 0.4, P.pore.z - 4], anchorId: 'sito' });
  return out;
}
