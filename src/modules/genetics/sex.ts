import { gate, still } from './anim';
import { buildCross, type LabelSpec } from './cross';
import type { Kit } from './kit';
import type { Plan } from './plan';
import type { CrossSpec, Square } from './punnett';
import { layoutFor } from './square';

const lab = (id: string, t0: number, t1: number, text: string, x: number, y: number, level?: 'temel' | 'ileri'): LabelSpec => ({ id, t0, t1, text, pos: [x, y, 0.4], level });
const INK = '#6b5a7a';

/** Pedigree symbols (circle = girl, square = boy; filled = colour blind, dot = carrier) of the four children. */
function pedigree(kit: Kit, sq: Square, t0: number, cx: number, cy: number): void {
  const symbol = (x: number, y: number, male: boolean, state: 'normal' | 'carrier' | 'blind', at: number): void => {
    const a = (z: number) => gate(still(x, y, 1, z), at, at + 0.9);
    const shape = male ? 'tile' : 'cyl';
    const rot = male ? undefined : ([Math.PI / 2, 0, 0] as const);
    const ring = male ? [1.05, 1.05, 1] : [0.58, 0.2, 0.58];
    const inner = male ? [0.86, 0.86, 1] : [0.46, 0.22, 0.46];
    kit.shape({ shape, anim: a(0), size: ring as [number, number, number], color: INK, rot });
    kit.shape({ shape, anim: a(0.05), size: inner as [number, number, number], color: state === 'blind' ? INK : '#fff6e6', rot });
    if (state === 'carrier') kit.shape({ shape: 'sphere', anim: a(0.2), size: [0.2, 0.2, 0.1], color: '#d9822b' });
  };
  const line = (x: number, y: number, w: number, h: number, at: number): void =>
    kit.shape({ shape: 'tile', anim: gate(still(x, y, 1, -0.05), at, at + 0.9), size: [w, h, 0.3], color: INK });
  symbol(cx - 2.6, cy + 1.7, false, 'carrier', t0);
  symbol(cx + 2.6, cy + 1.7, true, 'normal', t0);
  line(cx, cy + 1.7, 3.6, 0.07, t0 + 0.3);
  line(cx, cy + 0.85, 0.07, 1.7, t0 + 0.5);
  line(cx, cy + 0.05, 7.4, 0.07, t0 + 0.7);
  sq.cells.forEach((c, k) => {
    const x = cx + (k - 1.5) * 2.5;
    const male = (c.genes[0] as readonly string[]).includes('Y');
    line(x, cy - 0.45, 0.07, 0.9, t0 + 0.8);
    symbol(x, cy - 1.3, male, c.cls === 'renk-koru' ? 'blind' : c.cls === 'tasiyici' ? 'carrier' : 'normal', t0 + 1.0 + k * 0.15);
  });
}

/** Sex-linked track (52 s): XX / XY parents, the colour-vision gene on X, 4 squares, outcome and pedigree. */
export function buildSex(kit: Kit, cross: CrossSpec): Plan {
  const sqLayout = layoutFor(2, 0, -12.5);
  const lay = { px: 4, py: 0, sq: sqLayout, hx: 5.4, hy: -14.9 };
  const times = { parents: 0, cell: -1.5, meiosis: 22.3, fly: [26.0, 28.4] as [number, number], fill: [30, 40] as [number, number], hist: { pheno: [41, 48] as [number, number] } };
  const { sq } = buildCross(kit, 'sex', cross, lay, times);
  pedigree(kit, sq, 47, 0, -22.5);
  const labels: LabelSpec[] = [
    lab('p1', 0, 8, 'Anne: XX (dişi)', -4, -2.0),
    lab('p2', 0, 8, 'Baba: XY (erkek)', 4, -2.0),
    lab('x1', 8.2, 16, 'Renk görme geni X kromozomunda', -4, -5.9),
    lab('x2', 12, 16.5, 'Y kromozomunda bu genin karşılığı yok', 4, -5.9, 'ileri'),
    lab('m', 22.5, 26, 'Alel çifti ayrılır: her gamette tek X (ya da Y)', -4, -5.9, 'ileri'),
    lab('sq', 31, 40, 'Kutular cinsiyeti ve görmeyi birlikte belirler', 0, -17.0),
    lab('ped', 48, 52, 'Soyağacı: ● renk körü, ◐ taşıyıcı', 0, -19.6, 'ileri'),
  ];
  const cam = [
    [0, 1.5, 0.8, 13], [14, 0, -2.2, 12], [20, 0, -3.4, 11], [24, 0, -3.8, 11], [26, 0, -6, 15], [30, 1.5, -11.5, 14.5], [41, 3.2, -11.8, 14.5], [46, 3.2, -11.8, 14.5], [48.5, 0, -20.5, 15], [52, 0, -20.5, 15],
  ] as Plan['cam'];
  return { duration: 52, kind: 'sex', sq, fill: times.fill, cam, labels, warnAt: 16.2 };
}
