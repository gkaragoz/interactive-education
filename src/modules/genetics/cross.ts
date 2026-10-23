import { path, type Anim, type Key } from './anim';
import { buildHist, type HistTimes } from './hist';
import type { Kit } from './kit';
import { claim, meiosis } from './meiosis';
import { addOrganism } from './organisms';
import { lookOf, squareOf, type CrossKind, type CrossSpec, type Square } from './punnett';
import { buildSquare, colHeader, rowHeader, type SquareLayout } from './square';
import type { Vec3 } from '../../scene';

/** Colour of a chromosome by allele (also the colour of the gamete orbs that fly into the Punnett square). */
const ALLELE_COLOR: Record<string, string> = {
  A: '#e8b030', a: '#6fae4a', B: '#d46a9b', b: '#4f9aa8',
  IA: '#e07a6d', IB: '#4a90c2', i: '#a8895c',
  XC: '#6fae4a', Xc: '#e0803a', Y: '#3f8fa8',
};
export const alleleColor = (allele: string): string => ALLELE_COLOR[allele] ?? '#c9b48a';

export interface LabelSpec {
  id: string;
  t0: number;
  t1: number;
  text: string;
  pos: Vec3;
  /** Shown only at this level (both when omitted). */
  level?: 'temel' | 'ileri';
}

export interface CrossLayout {
  /** Parents stand at -px and +px; their plant/person at height `py`, the dividing cells below them. */
  px: number;
  py: number;
  sq: SquareLayout;
  /** Left edge and floor of the tally columns. */
  hx: number;
  hy: number;
}

export interface CrossTimes {
  /** The parents (organism) grow in. */
  parents: number;
  /** The cell above each parent grows in. */
  cell: number;
  /** Meiosis I starts (3.1 s long). */
  meiosis: number;
  /** Gametes fly to the headers of the square. */
  fly: [number, number];
  fill: [number, number];
  hist: HistTimes;
}

/** Where the parents come from: grow in place, or slide out of a point (the F1 plant that "splits" into two). */
export interface Origin {
  x: number;
  y: number;
}

export interface CrossResult {
  sq: Square;
  /** Anim of the two parents' organisms (for labels). */
  parentAnim: [Anim, Anim];
  /** Where the tally captions go (world y) and the tally's centre x. */
  hist: { genoLabelY: number; phenoLabelY: number; midX: number };
}

/** Two parents -> meiosis -> gametes in the headers -> the square fills -> tally columns. */
export function buildCross(kit: Kit, kind: CrossKind, cross: CrossSpec, lay: CrossLayout, times: CrossTimes, origin?: Origin): CrossResult {
  const sq = squareOf(cross);
  const xs = [-lay.px, lay.px];
  const parentAnim: Anim[] = [];
  const cellY0 = lay.py - 3.8;
  cross.parents.forEach((genes, i) => {
    const x = xs[i] as number;
    const keys: Key[] = origin
      ? [[times.parents - 0.5, origin.x, origin.y, 0], [times.parents, origin.x, origin.y, 1], [times.parents + 1.4, x, lay.py, 1]]
      : [[times.parents - 1.2, x, lay.py, 0], [times.parents, x, lay.py, 1]];
    const anim = path(keys);
    parentAnim.push(anim);
    addOrganism(kit, lookOf(kind, genes), anim);
    const slots = meiosis(kit, { genes, cx: x, cy: cellY0, pitch: -3.3, appear: times.cell, T: times.meiosis, color: alleleColor });
    const wanted = i === 0 ? sq.rows : sq.cols;
    const picks = claim(slots, wanted);
    const used = new Set(picks);
    const flightS = sq.n === 2 ? 1.2 : 0.7;
    const hOff = lay.sq.cs * 0.14;
    picks.forEach((slot, k) => {
      const [hx, hy] = i === 0 ? rowHeader(lay.sq, k) : colHeader(lay.sq, k);
      slot?.build({ t0: times.fly[0] + k * 0.12, t1: times.fly[1] + k * 0.12, x: hx, y: hy + hOff, s: flightS, lift: 1.6 }, [0, 0]);
    });
    for (const slot of slots) if (!used.has(slot)) slot.build(null, [times.fly[0] - 0.2, times.fly[0] + 0.9]);
  });
  buildSquare(kit, kind, sq, lay.sq, times.fill[0], times.fill[1], times.fly[0] - 1.5, alleleColor);
  const hist = buildHist(kit, kind, sq, lay.sq, lay.hx, lay.hy, times.hist);
  return { sq, parentAnim: parentAnim as [Anim, Anim], hist };
}
