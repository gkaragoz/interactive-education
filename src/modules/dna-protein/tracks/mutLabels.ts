import { Vector3 } from 'three';
import type { ModuleLabel, Vec3 } from '../../../scene';
import type { Nucs } from '../kit/nucs';
import type { MutationPlan } from '../sequence';
import type { TranslationPlan } from './translasyonPlan';

export interface MutPoints {
  nucs: Nucs;
  slotB: Int32Array;
  slotR: Int32Array;
  mp: MutationPlan;
  site: Vector3;
  pepNew: Vector3;
  pepOld: Vector3;
  dimer: boolean;
}

const v = new Vector3();
const DNA_Y = 4.6;
const RNA_Y = 1.2;
const PEP_Y = -2.3;

const TYPE_NOTE: Record<string, string> = {
  sessiz: 'Ek bilgi: amino asit değişmediği için "sessiz" denir',
  'yanlis-anlamli': 'Ek bilgi: bu değişim "yanlış anlamlı"dır',
  anlamsiz: 'Ek bilgi: erken dur kodonu, "anlamsız" denir',
};

export function mutLabels(t: number, _ileri: boolean, P: MutPoints, planOld: TranslationPlan, planNew: TranslationPlan): ModuleLabel[] {
  const out: ModuleLabel[] = [];
  const mp = P.mp;
  const ci = mp.example.codonIndex;
  const add = (text: string, x: number, y: number, z: number, id: string): void => void out.push({ text, world: [x, y, z], anchorId: id });
  const s = P.site;
  const xOf = (j: number): number => (j - 7) * 0.7;
  const slotPt = (slot: number, dy: number): Vec3 | null => {
    if (slot < 0) return null;
    P.nucs.point(slot, 'tip', v);
    return [v.x, v.y + dy, v.z];
  };
  if (t >= 0.5 && t < 6.5) {
    add('DNA (gen)', xOf(13), DNA_Y + 1.5, 0, 'dna');
    add('mRNA', xOf(13), RNA_Y - 1.3, 0, 'mrna');
    add('Protein (amino asit dizisi)', xOf(11), PEP_Y - 1.1, 0, 'prot');
  }
  if (t >= 2.5 && t < 6.4) {
    add('Transkripsiyon', xOf(15), (DNA_Y + RNA_Y) / 2 + 0.3, 0, 'tx');
    add('Translasyon', xOf(15), (RNA_Y + PEP_Y) / 2, 0, 'tl');
  }
  if (t >= 6.8 && t < 13.4) add('Morötesi (UV) ışık', s.x + 3.6, s.y + 5.4, 0.6, 'uv');
  if (t >= 9.6 && t < 24) add(P.dimer ? 'Hasarlı baz (timin dimeri)' : 'Hasarlı baz', s.x - 2.2, s.y - 1.0, 0.4, 'hasar');
  if (t >= 14.6 && t < 19.6) add('Hücrenin onarım sistemi', s.x + 2.4, s.y + 1.6, 0.9, 'onarim');
  if (t >= 19.9 && t < 23) add('Onarılamayan hasar kalır', s.x + 2.4, s.y + 1.6, 0.9, 'kalir');
  if (t >= 23 && t < 28.6) add('DNA eşlenirken değişim yeni zincire geçer', s.x + 0.5, s.y + 2.3, 0.6, 'eslenme');
  if (t >= 27.4 && t < 33) add(`Kalıcı mutasyon: ${mp.templateFrom} → ${mp.templateTo}`, s.x, s.y + 2.3, 0.6, 'kalici');
  if (t >= 31 && t < 36.5) addMrna(out, P, mp, ci, slotPt);
  if (t >= 33.4) {
    const pn = P.pepNew;
    const changed = mp.after.peptide[ci] !== mp.before.aminoAcids[ci];
    const aOld = mp.before.aminoAcids[ci] as string;
    if (mp.after.stopped && mp.after.peptide.length <= ci) add(`${aOld} yerine dur kodonu: protein kısa kalır`, pn.x, pn.y + 1.3, 0.5, 'degisen');
    else if (changed) add(`${aOld} yerine ${mp.after.peptide[ci]}`, pn.x, pn.y + 1.3, 0.5, 'degisen');
    else add(`${aOld} aynı kaldı`, pn.x, pn.y + 1.3, 0.5, 'degisen');
  }
  if (t >= 33.6) add('Mutant protein', xOf(15.5), PEP_Y, 0, 'mutant');
  if (t >= 35.4) add('Normal protein', xOf(15.5), -4.7, 0, 'normal');
  if (t >= 36.4) {
    add(TYPE_NOTE[mp.example.id] ?? '', xOf(7), -6.1, 0, 'tip');
  }
  void planOld;
  void planNew;
  return out;
}

function addMrna(out: ModuleLabel[], P: MutPoints, mp: MutationPlan, ci: number, slotPt: (slot: number, dy: number) => Vec3 | null): void {
  const p = slotPt(P.slotR[mp.position] as number, -1.5);
  if (p) out.push({ text: `mRNA'da kodon değişti: ${mp.example.from} → ${mp.example.to}`, world: p, anchorId: 'kodon' });
  void ci;
}
