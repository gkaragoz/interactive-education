import { gate, still } from './anim';
import { alleleColor, buildCross, type LabelSpec } from './cross';
import type { Kit } from './kit';
import { addOrganism } from './organisms';
import type { Plan } from './plan';
import type { CrossSpec } from './punnett';
import { layoutFor } from './square';

const lab = (id: string, t0: number, t1: number, text: string, x: number, y: number, level?: 'temel' | 'ileri'): LabelSpec => ({ id, t0, t1, text, pos: [x, y, 0.4], level });

/** Intro of the blood track: the three alleles (0-8 s), then which genotypes give which group (8-18 s). */
function intro(kit: Kit): void {
  ['IA', 'IB', 'i'].forEach((a, k) => {
    const x = (k - 1) * 4;
    const anim = gate(still(x, 12.6, 1.5), -1.2, -0.1, 17.6, 18.6);
    kit.chromo({ single: true, color: alleleColor(a), anim });
    kit.tag({ alleles: [a], height: 0.9, anim: gate(still(x, 11.1, 1, 0.3), -1, 0, 17.6, 18.6) });
  });
  const groups: Array<[string, string[][], number]> = [
    ['A', [['IA', 'IA'], ['IA', 'i']], -7.5],
    ['B', [['IB', 'IB'], ['IB', 'i']], -2.5],
    ['AB', [['IA', 'IB']], 2.5],
    ['O', [['i', 'i']], 7.5],
  ];
  groups.forEach(([blood, genos, x], k) => {
    const t0 = 8.4 + k * 1.3;
    const anim = gate(still(x, 8.6, 0.85), t0, t0 + 1.2, 17.6, 18.6);
    addOrganism(kit, { kind: 'person', male: false, blood: blood as 'A' }, anim);
    genos.forEach((g, j) => kit.tag({ alleles: g, height: 0.7, anim: gate(still(x, 6.4 - j * 0.9, 1, 0.3), t0 + 0.5, t0 + 1.4, 17.6, 18.6) }));
  });
}

/** Blood-group track (48 s): alleles IA, IB, i, group table, two parents, gametes, 4 squares, groups. */
export function buildKan(kit: Kit, cross: CrossSpec): Plan {
  intro(kit);
  const sqLayout = layoutFor(2, 0, -12.5);
  const lay = { px: 4, py: 0, sq: sqLayout, hx: 5.4, hy: -14.9 };
  const times = { parents: 18.2, cell: 19.2, meiosis: 24.2, fly: [27.2, 29.6] as [number, number], fill: [30, 40] as [number, number], hist: { pheno: [41, 48] as [number, number] } };
  const { sq, hist } = buildCross(kit, 'blood', cross, lay, times);
  const labels: LabelSpec[] = [
    lab('al', 0, 8, 'Üç alel: IA, IB ve i', 0, 9.9),
    lab('co', 4.5, 8.2, 'IA ve IB eş baskın, i çekinik', 0, 14.6, 'ileri'),
    lab('gt', 8.4, 17.6, 'Genotip belirler, fenotip kan grubudur', 0, 2.2, 'ileri'),
    lab('p1', 19, 24, 'Ebeveyn 1', -4, -2.0),
    lab('p2', 19, 24, 'Ebeveyn 2', 4, -2.0),
    lab('m', 24.4, 29, 'Her gamette tek alel', -4, -5.9, 'ileri'),
    lab('sq', 31, 40, 'Dört kutu, dört olası çocuk', 0, -17.0),
    lab('res', 43, 48, 'Kan grubu oranı', lay.hx + 2.0, hist.phenoLabelY),
  ];
  const cam = [
    [0, 0, 11.5, 12], [8, 0, 9.5, 14], [16, 0, 9, 14], [18.5, 0, -2, 13], [26, 0, -5, 16], [30, 1.5, -11.5, 14.5], [41, 3.2, -11.8, 14.5], [48, 3.2, -11.8, 14.5],
  ] as Plan['cam'];
  return { duration: 48, kind: 'blood', sq, fill: times.fill, cam, labels, warnAt: 18 };
}
