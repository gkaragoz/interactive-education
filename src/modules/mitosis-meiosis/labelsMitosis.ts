import { between, chromatinLabel, commonLabels, poleLabel, type Lab } from './labelsCommon';
import type { LabelFn } from './plan';

/** Mitosis labels follow the phases (see the track data for the times); Temel keeps to plain words. */
export const mitosisLabels: LabelFn = (c) => {
  const out: Lab[] = [];
  const t = c.t;
  const ileri = c.level === 'ileri';
  commonLabels(c, out, { nuclei: [0, 1, 2] });
  poleLabel(c, out, [0, 1]);
  if (between(t, 0, 26) && t < 17) chromatinLabel(c, out, 0);
  if (between(t, 7, 17) && ileri) {
    const p = c.chromPos(1, [0, 0, 0]);
    out.push({ text: 'Kardeş kromatitler', world: [p[0] + 0.3, p[1] - 1.0, p[2]], anchorId: 'sisters' });
  }
  if (between(t, 12, 17)) chromatinLabel(c, out, 2);
  if (between(t, 21.5, 26)) {
    const k = c.kineto(0, [0, 0, 0]);
    const p = c.chromPos(2, [0, 0, 0]);
    if (ileri) {
      out.push({ text: 'Kinetokor', world: [k[0] - 0.5, k[1] + 0.9, k[2]], anchorId: 'kin' });
      out.push({ text: 'Sentromer', world: [p[0] + 0.9, p[1] - 0.2, p[2]], anchorId: 'cen' });
      const a = c.polePos(0, [0, 0, 0]);
      const b = c.kineto(2, [0, 0, 0]);
      out.push({ text: 'İğ ipliği', world: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.4, (a[2] + b[2]) / 2], anchorId: 'fibre' });
    } else {
      out.push({ text: 'Kromozom', world: [p[0] + 0.9, p[1] + 0.9, p[2]], anchorId: 'chrom' });
      const a = c.polePos(0, [0, 0, 0]);
      const b = c.kineto(2, [0, 0, 0]);
      out.push({ text: 'İğ ipliği', world: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.4, (a[2] + b[2]) / 2], anchorId: 'fibre' });
    }
  }
  if (between(t, 27, 33)) {
    const p = c.chromPos(0, [0, 0, 0]);
    out.push({ text: ileri ? 'Ayrılan kardeş kromatit' : 'Kromozomun yarısı', world: [p[0], p[1] + 1.2, p[2]], anchorId: 'sis' });
  }
  const cell = c.cellVals(0);
  const neck = cell[6] as number;
  if (between(t, 38, 42) && neck < 0.92 && neck > 0.1) {
    const top = c.cellPos(0, 0, -((cell[5] as number) * 0.9 * neck + 0.3), [0, 0, 0]);
    out.push({ text: ileri ? 'Boğumlanma (kasılma halkası)' : 'Boğumlanma', world: [top[0], top[1] - 0.5, top[2]], anchorId: 'furrow' });
  }
  if (t >= 43) {
    const a = c.cellPos(0, -4.0, 4.2, [0, 0, 0]);
    const b = c.cellPos(0, 4.0, 4.2, [0, 0, 0]);
    out.push({ text: 'Yavru hücre', world: a, anchorId: 'd1' }, { text: 'Yavru hücre', world: b, anchorId: 'd2' });
  }
  return out;
};
