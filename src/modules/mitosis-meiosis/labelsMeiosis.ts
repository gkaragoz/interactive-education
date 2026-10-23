import { between, chromatinLabel, commonLabels, poleLabel, type Lab } from './labelsCommon';
import { cid, XC2 } from './meioShared';
import type { LabelFn, LabelCtx } from './plan';
import type { Vec3 } from '../../scene';

const mid = (c: LabelCtx, a: number, b: number): Vec3 => {
  const p = c.chromPos(a, [0, 0, 0]);
  const q = c.chromPos(b, [0, 0, 0]);
  return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
};

/** Meiosis labels (I, II and the non-disjunction track). Windows are given in canonical time and mapped by `warp`. */
export const meiosisLabels =
  (mode: string, warp: (t: number) => number, np: number): LabelFn =>
  (c) => {
    const out: Lab[] = [];
    const t = c.t;
    const w = (a: number): number => warp(a);
    const ileri = c.level === 'ileri';
    const second = t >= w(50);
    if (!second) {
      commonLabels(c, out, { nuclei: [0, 1, 2] });
      poleLabel(c, out, [0, 1]);
      if (t < w(8)) chromatinLabel(c, out, 0);
      const pair = mid(c, cid(0, 0, 0), cid(0, 1, 0));
      if (between(t, w(8.5), w(11.5))) out.push({ text: ileri ? 'Homolog çift' : 'Benzer kromozom çifti', world: [pair[0], pair[1] + 1.8, pair[2]], anchorId: 'pair' });
      if (ileri && between(t, w(11), w(14.5))) {
        const tip = mid(c, cid(0, 0, 1), cid(0, 1, 0));
        out.push({ text: 'Krossing over: parça değişimi', world: [tip[0] + 0.6, tip[1] - 1.9, tip[2]], anchorId: 'cross' });
      }
      if (ileri && between(t, w(14.5), w(26.5))) {
        const tip = mid(c, cid(0, 0, 1), cid(0, 1, 0));
        out.push({ text: 'Kiyazma', world: [tip[0] + 0.7, tip[1] - 1.3, tip[2] + 0.5], anchorId: 'chiasma' });
      }
      if (between(t, w(22.5), w(26.5))) {
        const m = c.chromPos(cid(0, 0, 0), [0, 0, 0]);
        const p = c.chromPos(cid(0, 1, 0), [0, 0, 0]);
        out.push({ text: ileri ? 'Anne kökenli homolog' : 'Anneden gelen', world: [m[0] - 0.3, m[1] + 0.9, m[2]], anchorId: 'mat' });
        out.push({ text: ileri ? 'Baba kökenli homolog' : 'Babadan gelen', world: [p[0] + 0.3, p[1] - 0.9, p[2]], anchorId: 'pat' });
      }
      if (ileri && between(t, w(21.5), w(27))) {
        const k = c.kineto(cid(0, 0, 0), [0, 0, 0]);
        out.push({ text: 'Kinetokor', world: [k[0] - 0.6, k[1] + 0.4, k[2] + 0.4], anchorId: 'kin' });
        const a = c.polePos(0, [0, 0, 0]);
        out.push({ text: 'İğ ipliği', world: [(a[0] + k[0]) / 2, (a[1] + k[1]) / 2 + 0.5, (a[2] + k[2]) / 2], anchorId: 'fibre' });
        out.push({ text: 'Kardeş kromatitler', world: [mid(c, cid(1, 0, 0), cid(1, 0, 1))[0], mid(c, cid(1, 0, 0), cid(1, 0, 1))[1] - 1.7, 0.3], anchorId: 'sisters' });
      }
      if (between(t, w(28), w(34))) {
        const p = c.chromPos(cid(0, 0, 0), [0, 0, 0]);
        out.push({ text: ileri ? 'Homologlar ayrılır (sentromer bölünmez)' : 'Benzer kromozomlar ayrılır', world: [p[0], p[1] + 1.8, p[2]], anchorId: 'sep' });
      }
      if (mode === 'nd' && between(t, w(30), w(36))) {
        const p = c.chromPos(cid(np - 1, 0, 0), [0, 0, 0]);
        out.push({ text: 'Ayrılmama: iki homolog aynı kutba gider', world: [p[0] - 0.5, p[1] - 2.2, p[2]], anchorId: 'nd' });
      }
      const cell = c.cellVals(0);
      const neck = cell[6] as number;
      if (between(t, w(38.5), w(43)) && neck < 0.92 && neck > 0.1) {
        const top = c.cellPos(0, 0, (cell[5] as number) * 0.9 * neck + 0.3, [0, 0, 0]);
        out.push({ text: ileri ? 'Boğumlanma (kasılma halkası)' : 'Boğumlanma', world: [top[0], top[1] + 0.5, top[2]], anchorId: 'furrow' });
      }
      if (t >= w(45.5)) {
        out.push({ text: ileri ? 'Haploit hücre (n)' : 'Yavru hücre', world: c.cellPos(0, -4.0, 4.2, [0, 0, 0]), anchorId: 'd1' });
        out.push({ text: ileri ? 'Haploit hücre (n)' : 'Yavru hücre', world: c.cellPos(0, 4.0, 4.2, [0, 0, 0]), anchorId: 'd2' });
      }
      return out;
    }
    // meiosis II
    commonLabels(c, out, { nuclei: [1, 2], membrane: false });
    poleLabel(c, out, [0, 1, 2, 3]);
    if (between(t, w(60), w(67))) {
      const p = c.chromPos(0, [0, 0, 0]);
      out.push({ text: ileri ? 'Kardeş kromatitler' : 'Kromozom', world: [p[0] + 1.0, p[1] + 1.5, p[2]], anchorId: 'sis' });
      const a = c.polePos(0, [0, 0, 0]);
      const k = c.kineto(0, [0, 0, 0]);
      out.push({ text: 'İğ ipliği', world: [(a[0] + k[0]) / 2 + 0.5, (a[1] + k[1]) / 2, (a[2] + k[2]) / 2], anchorId: 'fibre' });
    }
    if (between(t, w(68), w(74))) {
      const p = c.chromPos(0, [0, 0, 0]);
      out.push({ text: ileri ? 'Sentromer bölünür, kromatitler ayrılır' : 'Kromozomun yarıları ayrılır', world: [p[0] + 1.4, p[1], p[2]], anchorId: 'ana2' });
    }
    if (t >= w(85.5) && mode !== 'nd') {
      for (let cc = 0; cc < 2; cc++) {
        for (const s of [-1, 1]) {
          out.push({ text: ileri ? 'Haploit hücre (n)' : 'Yavru hücre', world: c.cellPos(cc, s * XC2, cc === 0 ? 3.0 : -3.0, [0, 0, 0]), anchorId: `g${cc}${s}` });
        }
      }
    }
    if (t >= w(85.5) && mode === 'nd') {
      for (let cc = 0; cc < 2; cc++) {
        for (const s of [-1, 1]) {
          out.push({ text: cc === 1 ? 'n+1 gamet' : 'n−1 gamet', world: c.cellPos(cc, s * XC2, cc === 0 ? 3.0 : -3.0, [0, 0, 0]), anchorId: `g${cc}${s}` });
        }
      }
    }
    return out;
  };
