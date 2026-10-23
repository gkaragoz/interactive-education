// Pure genetics for the `genetics` module: parse the chosen parent genotypes, build gametes, fill the Punnett square,
// classify phenotypes and count them. No three.js, no DOM: everything the scene shows (and the chart) comes from here.

export type CrossKind = 'mono' | 'di' | 'blood' | 'sex';

/** One gene = its two alleles; a parent is a list of genes (one for mono/blood/sex, two for dihybrid). */
export type Gene = readonly [string, string];
export type Parent = readonly Gene[];
/** One allele per gene. */
export type Gamete = readonly string[];

export interface CrossSpec {
  kind: CrossKind;
  parents: readonly [Parent, Parent];
}

export interface ClassInfo {
  /** Same id as the chart series that counts this class. */
  id: string;
  labelTr: string;
  /** Series colour (chart and Punnett tile). */
  color: string;
}

export interface Cell {
  row: number;
  col: number;
  genes: Parent;
  genotype: string;
  cls: string;
}

export interface Square {
  /** Gametes of the left parent (side headers) and of the right parent (top headers); homozygotes repeat their gamete. */
  rows: Gamete[];
  cols: Gamete[];
  cells: Cell[]; // row-major
  n: number; // gametes per parent = squares per side
}

export const TRACK_KIND: Record<string, CrossKind> = { monohibrit: 'mono', dihibrit: 'di', 'kan-gruplari': 'blood', 'eseye-bagli': 'sex' };
export const TRACK_OPTION: Record<string, string> = { monohibrit: 'cross-mono', dihibrit: 'cross-di', 'kan-gruplari': 'cross-blood', 'eseye-bagli': 'cross-sex' };
export const TRACK_DEFAULT: Record<string, string> = { monohibrit: 'Aa-Aa', dihibrit: 'AaBb-AaBb', 'kan-gruplari': 'IAi-IBi', 'eseye-bagli': 'XCXc-XCY' };

const CLASSES: Record<CrossKind, ClassInfo[]> = {
  mono: [
    { id: 'baskin-fenotip', labelTr: 'Sarı tohum', color: '#d9a017' },
    { id: 'cekinik-fenotip', labelTr: 'Yeşil tohum', color: '#5a9e3b' },
  ],
  di: [
    { id: 'cift-baskin', labelTr: 'Sarı, yuvarlak', color: '#d9a017' },
    { id: 'baskin-cekinik', labelTr: 'Sarı, buruşuk', color: '#d9822b' },
    { id: 'cekinik-baskin', labelTr: 'Yeşil, yuvarlak', color: '#5a9e3b' },
    { id: 'cift-cekinik', labelTr: 'Yeşil, buruşuk', color: '#3f8fa8' },
  ],
  blood: [
    { id: 'grup-a', labelTr: 'A grubu', color: '#e07a6d' },
    { id: 'grup-b', labelTr: 'B grubu', color: '#4a90c2' },
    { id: 'grup-ab', labelTr: 'AB grubu', color: '#c25a8a' },
    { id: 'grup-o', labelTr: 'O grubu', color: '#8c6d46' },
  ],
  sex: [
    { id: 'saglikli', labelTr: 'Normal görüşlü', color: '#5a9e3b' },
    { id: 'tasiyici', labelTr: 'Taşıyıcı kız', color: '#d9822b' },
    { id: 'renk-koru', labelTr: 'Renk körü', color: '#c25a8a' },
  ],
};

export const classesOf = (kind: CrossKind): readonly ClassInfo[] => CLASSES[kind];
export const classInfo = (kind: CrossKind, id: string): ClassInfo => CLASSES[kind].find((c) => c.id === id) ?? (CLASSES[kind][0] as ClassInfo);

/** Series the chart shows for a kind (the Punnett fill counter first). */
export const seriesOf = (kind: CrossKind): string[] => ['dolu-kare', ...CLASSES[kind].map((c) => c.id)];

const TOKEN: Record<CrossKind, RegExp> = { mono: /[Aa]/g, di: /[AaBb]/g, blood: /I[AB]|i/g, sex: /X[Cc]|Y/g };

/** Dominance order inside a gene (dominant first), so Aa is never written aA. */
export function alleleRank(kind: CrossKind, allele: string): number {
  if (kind === 'blood') return allele === 'IA' ? 0 : allele === 'IB' ? 1 : 2;
  if (kind === 'sex') return allele === 'XC' ? 0 : allele === 'Xc' ? 1 : 2;
  return allele === allele.toUpperCase() ? 0 : 1;
}

function normalise(kind: CrossKind, gene: readonly string[]): Gene {
  const [a, b] = gene as [string, string];
  return alleleRank(kind, a) <= alleleRank(kind, b) ? [a, b] : [b, a];
}

/** 'AaBb' -> [[A,a],[B,b]]; 'IAi' -> [[IA,i]]; 'XCY' -> [[XC,Y]]. */
export function parseParent(kind: CrossKind, text: string): Parent {
  const tokens = text.match(TOKEN[kind]) ?? [];
  const genes: Gene[] = [];
  for (let i = 0; i + 1 < tokens.length; i += 2) genes.push(normalise(kind, [tokens[i] as string, tokens[i + 1] as string]));
  return genes;
}

/** 'Aa-aa' -> two parents. The first is the left parent (side headers), the second the right one (top headers). */
export function parseCross(kind: CrossKind, optionId: string): CrossSpec {
  const [a, b] = optionId.split('-');
  return { kind, parents: [parseParent(kind, a ?? ''), parseParent(kind, b ?? '')] };
}

export function crossFor(trackId: string, options: Record<string, string>): CrossSpec {
  const kind = TRACK_KIND[trackId] ?? 'mono';
  return parseCross(kind, options[TRACK_OPTION[trackId] ?? ''] ?? TRACK_DEFAULT[trackId] ?? 'Aa-Aa');
}

export const isDefaultCross = (trackId: string, options: Record<string, string>): boolean =>
  (options[TRACK_OPTION[trackId] ?? ''] ?? TRACK_DEFAULT[trackId]) === TRACK_DEFAULT[trackId];

/** All 2^genes gametes of a parent in textbook order (AB, Ab, aB, ab); homozygous parents repeat the same gamete. */
export function gametesOf(parent: Parent): Gamete[] {
  const g = parent.length;
  const out: Gamete[] = [];
  for (let i = 0; i < 1 << g; i++) out.push(parent.map((gene, k) => gene[(i >> (g - 1 - k)) & 1] as string));
  return out;
}

export const gameteId = (g: Gamete): string => g.join('');
export const genotypeId = (genes: Parent): string => genes.map((x) => x[0] + x[1]).join('');

/** Phenotype class of a genotype (class ids are chart series ids). */
export function classify(kind: CrossKind, genes: Parent): string {
  const [g0, g1] = genes as [Gene, Gene | undefined];
  if (kind === 'mono') return g0.includes('A') ? 'baskin-fenotip' : 'cekinik-fenotip';
  if (kind === 'di') {
    const a = g0.includes('A');
    const b = (g1 ?? ['b', 'b']).includes('B');
    return a ? (b ? 'cift-baskin' : 'baskin-cekinik') : b ? 'cekinik-baskin' : 'cift-cekinik';
  }
  if (kind === 'blood') {
    const a = g0.includes('IA');
    const b = g0.includes('IB');
    return a && b ? 'grup-ab' : a ? 'grup-a' : b ? 'grup-b' : 'grup-o';
  }
  if (g0.includes('Y')) return g0.includes('Xc') ? 'renk-koru' : 'saglikli';
  return g0[0] === 'Xc' ? 'renk-koru' : g0[1] === 'Xc' ? 'tasiyici' : 'saglikli';
}

export function squareOf(spec: CrossSpec): Square {
  const { kind, parents } = spec;
  const rows = gametesOf(parents[0]);
  const cols = gametesOf(parents[1]);
  const cells: Cell[] = [];
  rows.forEach((r, row) =>
    cols.forEach((c, col) => {
      const genes = r.map((a, k) => normalise(kind, [a, c[k] as string])) as Parent;
      cells.push({ row, col, genes, genotype: genotypeId(genes), cls: classify(kind, genes) });
    }),
  );
  return { rows, cols, cells, n: rows.length };
}

/** Squares per phenotype class (every class of the kind appears, possibly 0). */
export function countsOf(kind: CrossKind, cells: readonly Cell[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CLASSES[kind]) out[c.id] = 0;
  for (const cell of cells) out[cell.cls] = (out[cell.cls] ?? 0) + 1;
  return out;
}

export interface GenotypeGroup {
  genotype: string;
  genes: Parent;
  cls: string;
  cells: number[]; // cell indices
}

/** Distinct genotypes in canonical order (homozygous dominant first). */
export function genotypeGroups(kind: CrossKind, cells: readonly Cell[]): GenotypeGroup[] {
  const map = new Map<string, GenotypeGroup>();
  cells.forEach((cell, i) => {
    const g = map.get(cell.genotype) ?? { genotype: cell.genotype, genes: cell.genes, cls: cell.cls, cells: [] };
    g.cells.push(i);
    map.set(cell.genotype, g);
  });
  const key = (g: GenotypeGroup): number[] => g.genes.flatMap((x) => [alleleRank(kind, x[0]), alleleRank(kind, x[1])]);
  return [...map.values()].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return (ka[i] as number) - (kb[i] as number);
    return 0;
  });
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** '3 : 1', '1 : 2 : 1', '9 : 3 : 3 : 1' from counts (zeros dropped, common factor removed). */
export function ratioText(counts: readonly number[]): string {
  const nz = counts.filter((c) => c > 0);
  const d = nz.reduce((a, b) => gcd(a, b), 0) || 1;
  return nz.map((c) => c / d).join(' : ');
}

/** What an individual looks like (drives the pictures). */
export type Look =
  | { kind: 'pea'; yellow: boolean; round: boolean }
  | { kind: 'person'; male: boolean; blood?: 'A' | 'B' | 'AB' | 'O'; vision?: 'normal' | 'carrier' | 'blind' };

export function lookOf(kind: CrossKind, genes: Parent): Look {
  const cls = classify(kind, genes);
  if (kind === 'mono') return { kind: 'pea', yellow: cls === 'baskin-fenotip', round: true };
  if (kind === 'di') return { kind: 'pea', yellow: cls === 'cift-baskin' || cls === 'baskin-cekinik', round: cls === 'cift-baskin' || cls === 'cekinik-baskin' };
  if (kind === 'blood') return { kind: 'person', male: false, blood: ({ 'grup-a': 'A', 'grup-b': 'B', 'grup-ab': 'AB', 'grup-o': 'O' } as const)[cls as 'grup-a'] };
  const male = (genes[0] as Gene).includes('Y');
  return { kind: 'person', male, vision: cls === 'renk-koru' ? 'blind' : cls === 'tasiyici' ? 'carrier' : 'normal' };
}

/** Fill window of cell k in a Punnett phase [t0, t1]: the square is complete by t1. */
export function fillWindow(k: number, n: number, t0: number, t1: number): { start: number; win: number } {
  const total = n * n;
  const step = (t1 - t0 - 1) / total;
  return { start: t0 + 0.4 + k * step, win: Math.min(1.4, 0.6 + step) };
}

const smooth = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const fillAt = (k: number, n: number, t0: number, t1: number, t: number): number => {
  const w = fillWindow(k, n, t0, t1);
  return smooth((t - w.start) / w.win);
};

/** Chart values (series id -> filled squares per class) at time t for a Punnett phase [t0, t1]. */
export function chartValues(kind: CrossKind, sq: Square, t0: number, t1: number, t: number): Record<string, number> {
  const out: Record<string, number> = { 'dolu-kare': 0 };
  for (const c of CLASSES[kind]) out[c.id] = 0;
  sq.cells.forEach((cell, k) => {
    const f = fillAt(k, sq.n, t0, t1, t);
    out['dolu-kare'] = (out['dolu-kare'] as number) + f;
    out[cell.cls] = (out[cell.cls] as number) + f;
  });
  return out;
}
