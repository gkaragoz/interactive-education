import { Vector3 } from 'three';
import type { ModuleLabel, Vec3 } from '../../../scene';
import type { Nucs } from '../kit/nucs';

export interface YapiPoints {
  slotA: Int32Array;
  slotB: Int32Array;
  nucs: Nucs;
  shrink: number;
  bracket: number;
  arrow: number;
  chromatin: number;
  chromosome: number;
}

const v = new Vector3();
const w = new Vector3();
const BASE_NAMES = ['Adenin (A)', 'Timin (T)', 'Guanin (G)', 'Sitozin (C)'];

export function yapiLabels(t: number, ileri: boolean, P: YapiPoints): ModuleLabel[] {
  const out: ModuleLabel[] = [];
  const { nucs, slotA, slotB } = P;
  const at = (slot: number, which: 'sugar' | 'phos' | 'tip', dy = 0, dx = 0): Vec3 | null => {
    if (slot < 0) return null;
    nucs.point(slot, which, v);
    return [v.x + dx, v.y + dy, v.z];
  };
  const add = (text: string, p: Vec3 | null, id: string): void => {
    if (p) out.push({ text, world: p, anchorId: id });
  };
  const hero = slotA[0] as number;

  if (t >= 1.6 && t < 4.6) {
    add(ileri ? 'Fosfat grubu' : 'Fosfat', at(hero, 'phos', 0.15), 'phos');
    add(ileri ? 'Deoksiriboz (şeker)' : 'Şeker', at(hero, 'sugar', -0.1), 'sugar');
    add(ileri ? 'Azotlu baz: adenin (A)' : 'Azotlu baz', at(hero, 'tip', 0.1), 'baz');
  }
  if (t >= 6 && t < 7.2) for (let i = 0; i < 4; i++) add(BASE_NAMES[i] as string, at(slotA[i] as number, 'tip', 0.7), `baz${i}`);
  if (t >= 10.5 && t < 14.3) {
    add('Şeker-fosfat omurgası', at(slotA[2] as number, 'phos', 0, -0.2), 'omurga');
    add('Azotlu bazlar', at(slotA[5] as number, 'tip', 0, 0), 'bazlar');
  }
  if (ileri && t >= 11.5 && t < 14.3) {
    add("5′ ucu (fosfat)", at(slotA[0] as number, 'phos', 0.5), 'u5');
    add("3′ ucu (şeker)", at(slotA[7] as number, 'sugar', -0.5), 'u3');
  }
  if (t >= 16.8 && t < 24.2 && slotB[0] !== undefined && (slotB[0] as number) >= 0) {
    const a = slotA[0] as number;
    const b = slotB[0] as number;
    nucs.point(a, 'tip', v);
    nucs.point(b, 'tip', w);
    out.push({ text: ileri ? 'A–T: 2 hidrojen bağı' : 'A – T eşleşir', world: [(v.x + w.x) / 2, v.y + 0.7, v.z + 0.2], anchorId: 'at' });
  }
  if (t >= 19.4 && t < 24.2 && (slotB[2] as number) >= 0) {
    nucs.point(slotA[2] as number, 'tip', v);
    nucs.point(slotB[2] as number, 'tip', w);
    out.push({ text: ileri ? 'G–C: 3 hidrojen bağı' : 'G – C eşleşir', world: [(v.x + w.x) / 2, v.y - 0.7, v.z + 0.2], anchorId: 'gc' });
  }
  if (t >= 28 && t < 38.4) {
    add('Çift sarmal', at(slotA[1] as number, 'sugar', 1.2, -0.4), 'sarmal');
    if (ileri && t >= 30) add('Baz çiftleri içte', at(slotA[4] as number, 'tip', -0.9), 'icte');
    if (ileri && t >= 30) add('Şeker-fosfat omurgası dışta', at(slotA[6] as number, 'phos', -0.9, -0.5), 'dista');
  }
  if (P.arrow > 0.9) {
    out.push({ text: "5′", world: [-2.3, 3.0, 0], anchorId: 'a5' });
    out.push({ text: "3′", world: [-2.3, -3.1, 0], anchorId: 'a3' });
    out.push({ text: "3′", world: [2.3, 3.0, 0], anchorId: 'b3' });
    out.push({ text: "5′", world: [2.3, -3.1, 0], anchorId: 'b5' });
  }
  if (P.bracket > 0.8 && P.shrink < 0.95) {
    nucs.point(slotA[2] as number, 'sugar', v);
    out.push({ text: 'Gen (bir özelliğin bilgisi)', world: [v.x + 0.2, v.y + 1.3, v.z], anchorId: 'gen' });
  }
  if (P.shrink > 0.9) add('DNA (gen içerir)', at(slotA[0] as number, 'sugar', 2.5, 0.8), 'dna');
  if (P.chromatin > 0.9) out.push({ text: 'Kromatin (DNA + protein)', world: [0, 2.7, 0], anchorId: 'kromatin' });
  if (P.chromosome > 0.9) out.push({ text: 'Kromozom', world: [7.2, 2.9, 0], anchorId: 'kromozom' });
  return out;
}
