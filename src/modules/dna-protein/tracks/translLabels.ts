import { Vector3 } from 'three';
import type { ModuleLabel, Vec3 } from '../../../scene';
import type { Nucs } from '../kit/nucs';
import { CODON_PITCH, T_INIT, bondTime, dockTime, exitTime, moveTime, stopTimes, MOVE_LEN } from './translTiming';
import type { TranslationPlan } from './translasyonPlan';

export interface TranslPoints {
  plan: TranslationPlan;
  nucs: Nucs;
  slotM: Int32Array;
  anti: Vector3[];
  antiOn: boolean[];
  bead: Vector3[];
  beadOn: boolean[];
  small: Vector3;
  large: Vector3;
  stop: Vector3;
  stopOn: boolean;
  shift: number;
}

const v = new Vector3();

export function translLabels(t: number, ileri: boolean, P: TranslPoints): ModuleLabel[] {
  const out: ModuleLabel[] = [];
  const n = P.plan.peptide.length;
  const st = stopTimes(n);
  const add = (text: string, x: number, y: number, z: number, id: string): void => void out.push({ text, world: [x, y, z], anchorId: id });
  const pt = (vec: Vector3, dy = 0, dx = 0): Vec3 => [vec.x + dx, vec.y + dy, vec.z];
  const nt = (i: number, dy: number): Vec3 | null => {
    const slot = P.slotM[i] as number;
    if (slot < 0) return null;
    P.nucs.point(slot, 'tip', v);
    return [v.x, v.y + dy, v.z];
  };
  const addP = (text: string, p: Vec3 | null, id: string): void => {
    if (p) out.push({ text, world: p, anchorId: id });
  };

  if (t >= 0.5 && t < 6.5) addP('mRNA', nt(7, -1.4), 'mrna');
  if (t >= 3 && t < 8.6) add(ileri ? 'Ribozomun küçük alt birimi' : 'Ribozom (küçük parça)', P.small.x - 2.2, P.small.y - 1.8, 0.5, 'small');
  if (t >= 9.2 && t < 15) add(ileri ? 'Ribozomun büyük alt birimi' : 'Ribozom (büyük parça)', P.large.x + 2.5, P.large.y + 3.2, 0.5, 'large');
  if (t >= 7.5 && t < 11.5) addP(ileri ? 'Başlangıç kodonu: AUG' : 'Başlama işareti: AUG', nt(1, -1.5), 'start');
  if (t >= 15.5 && t < st.separate) add('Ribozom', P.large.x + 3.2, P.large.y + 4.5, 0.5, 'ribo');
  if (t >= 12 && t < 16.5 && P.antiOn[0]) addP(ileri ? 'Başlatıcı tRNA (metiyonin)' : 'tRNA (amino asidi getirir)', pt(P.anti[0] as Vector3, 4.3, -1.5), 'trna0');

  if (ileri && t >= 14.6 && t < st.separate) {
    add('E bölgesi', -CODON_PITCH, -2.4, 0.6, 'siteE');
    add('P bölgesi', 0, -3.0, 0.6, 'siteP');
    add('A bölgesi', CODON_PITCH, -2.4, 0.6, 'siteA');
  }
  for (let k = 1; k < n; k++) {
    const arrive = dockTime(k) - 2.2;
    const step = P.plan.steps[k];
    if (!step) continue;
    if (t >= arrive && t < dockTime(k) + 1.8 && P.antiOn[k]) {
      addP(`tRNA${ileri ? `: antikodon ${step.anticodon}` : ''}`, pt(P.anti[k] as Vector3, 4.3, -1.6), `trna${k}`);
      addP(`Kodon: ${step.codon}`, nt(3 * k + 1, -1.4), 'codon');
    }
    if (t >= dockTime(k) - 0.6 && t < bondTime(k) + 0.2 && P.beadOn[k]) addP(`${step.nameTr}${ileri ? ` (${step.aa})` : ''}`, pt(P.bead[k] as Vector3, 0.7), `aa${k}`);
    if (ileri && t >= bondTime(k) - 0.2 && t < bondTime(k) + 1.8 && P.beadOn[k] && P.beadOn[k - 1]) out.push({ text: 'Peptit bağı', world: [((P.bead[k] as Vector3).x + (P.bead[k - 1] as Vector3).x) / 2, (P.bead[k] as Vector3).y + 1.0, 0.4], anchorId: 'peptit' });
    if (t >= moveTime(k) && t < moveTime(k) + MOVE_LEN + 0.4) add(ileri ? 'Ribozom bir kodon ilerler (translokasyon)' : 'Ribozom bir kodon ilerler', 0, 5.6, 0.5, 'move');
    if (t >= exitTime(k - 1, n) && t < exitTime(k - 1, n) + 1.6 && P.antiOn[k - 1]) addP('Boş tRNA ayrılır', pt(P.anti[k - 1] as Vector3, 4.3), 'leave');
  }
  if (t >= T_INIT[1] + 4 && t < st.separate && P.beadOn[n - 1]) addP(ileri ? 'Polipeptit zinciri' : 'Amino asit zinciri', pt(P.bead[Math.min(n - 1, 1)] as Vector3, 1.0, -0.4), 'chain');
  const stop = P.plan.steps[n];
  if (stop && P.stopOn) addP(`Dur kodonu: ${stop.codon}`, pt(P.stop, 1.4), 'stop');
  if (t >= st.release && t < st.release + 3) add(ileri ? 'Zincir tRNA\'dan ayrılır' : 'Zincir serbest kalır', -1.5, 6.4, 0.5, 'release');
  if (t >= st.separate && t < st.separate + 2.6) add('Alt birimler ayrılır', 0, 5.8, 0.5, 'subs');
  if (ileri && t >= 53) addP('α-sarmal benzeri kıvrım (Ek bilgi)', pt(P.bead[Math.min(2, n - 1)] as Vector3, -1.6, 1.2), 'helix');
  if (t >= 50) addP(ileri ? 'Polipeptit katlanarak protein olur' : 'Katlanarak protein olur', pt(P.bead[Math.min(1, n - 1)] as Vector3, 1.8), 'fold');
  return out;
}
