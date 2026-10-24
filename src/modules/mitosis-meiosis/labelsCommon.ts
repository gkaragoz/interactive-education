import type { Vec3 } from '../../scene';
import type { LabelCtx } from './plan';

export interface Lab {
  text: string;
  world: Vec3;
  anchorId: string;
}

const tmp: Vec3 = [0, 0, 0];
const tmp2: Vec3 = [0, 0, 0];

export const up = (v: Vec3, dy: number, dx = 0): Vec3 => [v[0] + dx, v[1] + dy, v[2]];

/** Labels every track shows: cell membrane, nuclei (with envelope state), nucleoli, centrosomes. Temel uses plain words. */
export function commonLabels(c: LabelCtx, out: Lab[], opts: { nuclei: number[]; membrane?: boolean } = { nuclei: [0] }): void {
  const ileri = c.level === 'ileri';
  const cell0 = c.cellVals(0);
  if (opts.membrane !== false && (cell0[6] as number) > 0.75 && (cell0[0] as number) > 0.5) {
    const r = (cell0[5] as number) * 1.16;
    const rim = c.cellPos(0, r * 0.62, -r * 0.74, [0, 0, 0]);
    out.push({ text: 'Hücre zarı', world: rim, anchorId: 'membrane' });
  }
  for (const s of opts.nuclei) {
    const v = c.nucVals(s);
    if ((v[0] as number) < 0.5 || (v[6] as number) < 0.85) continue;
    const p = c.nucPos(s, [0, 0, 0]);
    out.push({ text: ileri ? 'Çekirdek zarı' : 'Çekirdek', world: [p[0] + (v[5] as number) * 0.55, p[1] - (v[5] as number) * 0.85, p[2]], anchorId: `nuc${s}` });
    if (ileri && (v[8] as number) > 0.7) out.push({ text: 'Çekirdekçik', world: [p[0] + 0.3 * (v[5] as number), p[1] - 0.1, p[2] + (v[5] as number) * 0.4], anchorId: `nucl${s}` });
  }
  // envelope fragments while it is broken
  const n0 = c.nucVals(0);
  if (ileri && (n0[6] as number) < 0.2 && (n0[0] as number) > 0.9) {
    const p = c.nucPos(0, [0, 0, 0]);
    out.push({ text: 'Çekirdek zarı parçaları', world: [p[0] + 2.4, p[1] - 2.6, p[2]], anchorId: 'frag' });
  }
}

export function poleLabel(c: LabelCtx, out: Lab[], idx: number[]): void {
  if (c.level !== 'ileri') return;
  for (const i of idx) {
    const v = c.poleVals(i);
    if ((v[0] as number) < 0.9) continue;
    const p = c.polePos(i, tmp);
    out.push({ text: 'Sentrozom', world: [p[0], p[1] - 0.7, p[2]], anchorId: `pole${i}` });
    return;
  }
}

/** Label for decondensed chromatin or condensed chromosomes, whichever is shown. */
export function chromatinLabel(c: LabelCtx, out: Lab[], id: number): void {
  const p = c.chromPos(id, tmp2);
  const v = c.chromVals(id);
  if ((v[0] as number) < 0.5) return;
  out.push({ text: c.looseVal > 0.6 ? (c.level === 'ileri' ? 'Kromatin' : 'Kromozom (ince iplik)') : 'Kromozom', world: [p[0], p[1] - 0.9, p[2]], anchorId: 'chrom' });
}

export const between = (t: number, a: number, b: number): boolean => t >= a && t <= b;
