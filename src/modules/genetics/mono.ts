import { gate, path, still } from './anim';
import { alleleColor, buildCross, type LabelSpec } from './cross';
import type { Kit } from './kit';
import { claim, meiosis } from './meiosis';
import { addOrganism } from './organisms';
import type { Plan } from './plan';
import { isDefaultCross, parseParent, type CrossSpec } from './punnett';
import { layoutFor } from './square';

const lab = (id: string, t0: number, t1: number, text: string, x: number, y: number, level?: 'temel' | 'ileri'): LabelSpec => ({ id, t0, t1, text, pos: [x, y, 0.4], level });

/**
 * Monohybrid track (56 s): pure parents AA x aa -> gametes -> zygote -> F1 plant -> two F1 plants -> their gametes ->
 * Punnett square -> genotype tally -> phenotype tally. The cross in the square follows the chosen option.
 */
export function buildMono(kit: Kit, cross: CrossSpec, options: Record<string, string>): Plan {
  const P = [parseParent('mono', 'AA'), parseParent('mono', 'aa')];
  const zy = -3.9;
  const f1y = -9;
  // ---- P generation, gametes, fertilisation
  const wanted = [[['A']], [['a']]];
  P.forEach((genes, i) => {
    const x = i === 0 ? -4 : 4;
    addOrganism(kit, { kind: 'pea', yellow: i === 0, round: true }, path([[-1.2, x, 0, 0], [0, x, 0, 1]]));
    const slots = meiosis(kit, { genes, cx: x, cy: -3.8, pitch: 0, appear: -1.5, T: 6.4, color: alleleColor });
    const picks = claim(slots, wanted[i] as string[][]);
    picks[0]?.build({ t0: 10.3, t1: 12.4, x: i === 0 ? -0.7 : 0.7, y: zy, s: 1.0, lift: 1.0, vanish: true }, [0, 0]);
    for (const s of slots) if (s !== picks[0]) s.build(null, [10.0, 11.0]);
  });
  // zygote with the two chromosomes it got (one from each gamete)
  kit.shape({ shape: 'bubble', size: [1.1, 1.1, 1.1], color: '#ffffff', anim: gate(still(0, zy), 12.5, 13.4) });
  [['A', -0.34], ['a', 0.34]].forEach(([a, dx]) => {
    kit.chromo({ single: true, color: (dx as number) < 0 ? '#d4186a' : '#1478b8', band: alleleColor(a as string), anim: gate(still(dx as number, zy + 0.12, 0.75), 12.5, 13.4) });
    kit.tag({ alleles: [a as string], height: 0.44, anim: gate(still((dx as number) * 1.15, zy - 0.66, 1, 0.5), 12.8, 13.6) });
  });
  addOrganism(kit, { kind: 'pea', yellow: true, round: true }, path([[14.4, 0, f1y, 0], [16.4, 0, f1y, 1]]));

  // ---- F1 x F1 (or the chosen cross) -> Punnett square
  const cy = -28.5;
  const lay = { px: 4, py: -16, sq: layoutFor(2, 0, cy), hx: 4.9, hy: cy - 2.4 };
  const times = { parents: 19.2, cell: 20.3, meiosis: 21.3, fly: [25.0, 27.4] as [number, number], fill: [28, 40] as [number, number], hist: { geno: [40, 46] as [number, number], pheno: [46, 52] as [number, number] } };
  const isDefault = isDefaultCross('monohibrit', options);
  const { sq, hist } = buildCross(kit, 'mono', cross, lay, times, isDefault ? { x: 0, y: f1y } : undefined);

  const labels: LabelSpec[] = [
    lab('p1', 0, 4, 'Sarı tohum (AA)', -4, -2.0, 'temel'),
    lab('p2', 0, 4, 'Yeşil tohum (aa)', 4, -2.0, 'temel'),
    lab('p1', 0, 4, 'AA: baskın, sarı', -4, -2.0, 'ileri'),
    lab('p2', 0, 4, 'aa: çekinik, yeşil', 4, -2.0, 'ileri'),
    lab('m1', 6.4, 10, 'Eşey hücreleri oluşuyor', -4, -5.9, 'temel'),
    lab('m1', 6.4, 10, 'Mayoz: alel çifti ayrılır', -4, -5.9, 'ileri'),
    lab('fert', 11.2, 14.3, 'Döllenme: A + a', 0, -1.7),
    lab('zyg', 13.6, 17.5, 'Zigot: Aa', 0, -6.0, 'ileri'),
    lab('f1', 16.6, 21, 'F1: hepsi sarı (Aa)', 0, -12.0),
    lab('g2', 21.6, 25, 'F1 bitkisi: A ve a gametleri', -4, -22.0, 'temel'),
    lab('g2', 21.6, 25, 'Aa: ½ A, ½ a gamet', -4, -22.0, 'ileri'),
    lab('sq', 28.5, 40, 'Her kutu ¼ olasılık', 0, -32.0),
    lab('geno', 42.0, 46, 'Genotip oranı', hist.midX, hist.genoLabelY),
    lab('feno', 48.4, 56, 'Fenotip oranı', lay.hx + 0.95, hist.phenoLabelY),
  ];
  const cam = [
    [0, 1.8, 1.0, 13.5], [5, 1.2, 0.2, 12.5], [9.5, 0, -2.6, 12.5], [10.3, 0, -3.2, 12], [12.5, 0, -4.2, 11], [14, 0, -5.8, 11.5], [17, 0, -6.6, 12.5],
    [19.5, 0, -10, 14], [20.5, 0, -12.5, 15.5], [24, 0, -20.5, 15.5], [27.5, 0, -24.5, 15], [29, 2.0, -27, 13.5], [46, 4.0, -27.3, 13], [56, 3.6, -27.3, 13.5],
  ] as Plan['cam'];
  return { duration: 56, kind: 'mono', sq, fill: times.fill, cam, labels, warnAt: 19.2 };
}
