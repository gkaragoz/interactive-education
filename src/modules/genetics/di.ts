import { buildCross, type LabelSpec } from './cross';
import type { Kit } from './kit';
import type { Plan } from './plan';
import type { CrossSpec } from './punnett';
import { layoutFor } from './square';
import { buildTestCross } from './testcross';

const lab = (id: string, t0: number, t1: number, text: string, x: number, y: number, level?: 'temel' | 'ileri'): LabelSpec => ({ id, t0, t1, text, pos: [x, y, 0.4], level });

/** Dihybrid track (60 s): AaBb parents, two meiocytes each (two orientations), four gamete types, 16 squares, 9:3:3:1. */
export function buildDi(kit: Kit, cross: CrossSpec): Plan {
  const sqLayout = layoutFor(4, -0.5, -16.5);
  const lay = { px: 4, py: 0, sq: sqLayout, hx: 5.2, hy: -19.6 };
  const times = { parents: 0.2, cell: 1.4, meiosis: 6.8, fly: [13.0, 16.4] as [number, number], fill: [18, 36] as [number, number], hist: { geno: [36, 44] as [number, number], pheno: [44, 52] as [number, number] } };
  const { sq, hist } = buildCross(kit, 'di', cross, lay, times);
  const testCross = buildTestCross(kit, 52);
  const labels: LabelSpec[] = [
    ...testCross,
    lab('p1', 0.6, 4, 'Sarı ve yuvarlak tohum', -4, -2.0),
    lab('p2', 0.6, 4, 'Sarı ve yuvarlak tohum', 4, -2.0),
    lab('m1', 6.8, 12.8, 'Bir hücre yalnız iki tip gamet verir (örn. AB ve ab)', -4, -10.0, 'ileri'),
    lab('m2', 9.9, 12.8, 'Farklı yönelimli ikinci hücre: Ab ve aB', 4, -10.0, 'ileri'),
    lab('g', 13.2, 18, 'İki hücre birlikte dört tip gamet verir (sadeleştirme)', 0, -5.5, 'ileri'),
    lab('sq', 19, 36, '4 × 4 = 16 kutu, her biri 1/16', 0, -21.6),
    lab('geno', 38.5, 44, 'Genotip sınıfları', hist.midX, hist.genoLabelY),
    lab('feno', 46.5, 60, 'Fenotip oranı', lay.hx + 2.6, hist.phenoLabelY),
  ];
  const cam = [
    [0, 0, -3, 14], [8, 0, -4.5, 14], [12, 0, -7, 18], [16, 0, -10, 18], [19, 1.8, -15.5, 15], [36, 3.8, -15.6, 15], [51.5, 3.6, -15.6, 15.5], [53.5, 0.5, -31.2, 18], [60, 0.5, -31.6, 18],
  ] as Plan['cam'];
  return { duration: 60, kind: 'di', sq, fill: times.fill, cam, labels, warnAt: 0.5 };
}
