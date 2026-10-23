import { gate, path, still, type Key } from './anim';
import type { Kit } from './kit';
import { classesOf, classInfo, countsOf, genotypeGroups, ratioText, type CrossKind, type Square } from './punnett';
import { cellX, cellY, type SquareLayout } from './square';

const LF = String.fromCharCode(10);

export interface HistTimes {
  /** Cubes leave the squares and stack by genotype (omitted: they go straight to the phenotype columns). */
  geno?: [number, number];
  pheno: [number, number];
}

/**
 * Tally: one cube per Punnett square flies out and stacks into columns, first by genotype (1 AA : 2 Aa : 1 aa), then
 * regrouped by phenotype (3 : 1). Cube colour is the phenotype class, so AA and Aa share a colour and merge visibly.
 */
export function buildHist(kit: Kit, kind: CrossKind, sq: Square, l: SquareLayout, hx: number, hy: number, times: HistTimes): { genoLabelY: number; phenoLabelY: number; midX: number } {
  const cb = l.n === 2 ? 0.7 : 0.45;
  const groups = genotypeGroups(kind, sq.cells);
  const counts = countsOf(kind, sq.cells);
  const classes = classesOf(kind).filter((c) => (counts[c.id] ?? 0) > 0);
  const wide = groups.length > 5;
  const gStep = wide ? 0.85 : cb * 1.3;
  const pStep = Math.max(cb * 1.3, l.n === 2 ? 1.9 : 1.7);
  const geno = new Map<number, [number, number]>();
  groups.forEach((g, i) => g.cells.forEach((cellIdx, j) => geno.set(cellIdx, [hx + i * gStep, hy + cb * 0.55 + j * cb * 1.08])));
  const pheno = new Map<number, [number, number]>();
  const fill = new Map<string, number>();
  sq.cells.forEach((c, k) => {
    const col = classes.findIndex((x) => x.id === c.cls);
    const j = fill.get(c.cls) ?? 0;
    fill.set(c.cls, j + 1);
    pheno.set(k, [hx + col * pStep, hy + cb * 0.55 + j * cb * 1.08]);
  });
  const tg = times.geno;
  const tp = times.pheno;
  const first = tg ? tg[0] : tp[0];
  const gEnd = tg ? tg[0] + 2.0 : tp[0];
  sq.cells.forEach((cell, k) => {
    const x = cellX(l, cell.col);
    const y = cellY(l, cell.row);
    const stag = k * 0.07;
    const keys: Key[] = [[first + stag, x, y, 0, 0.35], [first + stag + 0.35, x, y, 0.8, 0.35]];
    if (tg) {
      const [gx, gy] = geno.get(k) as [number, number];
      keys.push([tg[0] + 1.9 + stag * 0.5, gx, gy, 1, 0, 1.2], [tp[0] + stag, gx, gy, 1]);
    }
    const [px, py] = pheno.get(k) as [number, number];
    keys.push([tp[0] + 2.0 + stag * 0.5, px, py, 1, 0, 1.2]);
    kit.shape({ shape: 'cube', anim: path(keys), size: [cb, cb, cb], color: classInfo(kind, cell.cls).color });
  });
  const nGeno = groups.length;
  const nPheno = classes.length;
  // floor strips
  if (tg) kit.shape({ shape: 'tile', anim: gate(still(hx + ((nGeno - 1) * gStep) / 2, hy - 0.05, 1, -0.05), tg[0], tg[0] + 0.8, tp[0], tp[0] + 0.8), size: [nGeno * gStep + 0.5, 0.14, 0.6], color: '#cdb9a0' });
  kit.shape({ shape: 'tile', anim: gate(still(hx + ((nPheno - 1) * pStep) / 2, hy - 0.05, 1, -0.05), tp[0], tp[0] + 0.8), size: [nPheno * pStep + 0.4, 0.14, 0.6], color: '#cdb9a0' });
  let genoLabelY = hy + 4;
  if (tg) {
    groups.forEach((g, i) => {
      const x = hx + i * gStep;
      kit.tag({ alleles: g.genes.flatMap((a) => [...a]), height: 0.42, maxWidth: gStep * (wide ? 1.9 : 1.5), anim: gate(still(x, hy - 0.5 - (wide ? (i % 2) * 0.5 : 0), 1, 0.2), gEnd, gEnd + 0.7, tp[0], tp[0] + 0.7) });
      kit.tag({ text: String(g.cells.length), height: 0.4, style: { size: 56 }, anim: gate(still(x, hy + cb * 0.55 + g.cells.length * cb * 1.08 + 0.15, 1, 0.2), gEnd, gEnd + 0.7, tp[0], tp[0] + 0.7) });
    });
    const top = hy + cb * 1.1 * Math.max(...groups.map((g) => g.cells.length)) + 1.0;
    genoLabelY = top + 0.9;
    kit.tag({ text: ratioText(groups.map((g) => g.cells.length)), height: 0.6, anim: gate(still(hx + ((nGeno - 1) * gStep) / 2, top, 1, 0.2), gEnd + 0.2, gEnd + 0.9, tp[0], tp[0] + 0.7), style: { size: 64 } });
  }
  const pEnd = tp[0] + 2.2;
  classes.forEach((c, i) => {
    const x = hx + i * pStep;
    const name = c.labelTr.includes(', ') ? c.labelTr.replace(', ', LF) : c.labelTr.length > 11 ? c.labelTr.replace(' ', LF) : c.labelTr;
    kit.tag({ text: name, height: 0.42 * name.split(LF).length, maxWidth: pStep * 0.95, anim: gate(still(x, hy - 0.5, 1, 0.2), pEnd - 0.4, pEnd + 0.3), style: { size: 52 } });
    kit.tag({ text: String(counts[c.id]), height: 0.4, style: { size: 56 }, anim: gate(still(x, hy + cb * 0.55 + (counts[c.id] as number) * cb * 1.08 + 0.15, 1, 0.2), pEnd - 0.4, pEnd + 0.3) });
  });
  const ptop = hy + cb * 1.1 * Math.max(...classes.map((c) => counts[c.id] as number)) + 1.0;
  kit.tag({ text: ratioText(classes.map((c) => counts[c.id] as number)), height: 0.7, anim: gate(still(hx + ((nPheno - 1) * pStep) / 2, ptop, 1, 0.2), pEnd, pEnd + 0.8), style: { size: 64 } });
  return { genoLabelY, phenoLabelY: ptop + 0.9, midX: hx + (Math.max(nGeno - 1, 0) * gStep) / 2 };
}
