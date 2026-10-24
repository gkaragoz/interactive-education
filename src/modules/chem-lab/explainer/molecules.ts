import { parseFormula, type ParticleScript } from '../../../chemlab';

/** Ball-and-stick shapes of the species in the particle scripts (pure data, unit-tested). Units: 1 = about one bond length. */
export interface MolAtom {
  el: string;
  x: number;
  y: number;
  z: number;
}
export interface Molecule {
  atoms: MolAtom[];
  bonds: [number, number, 1 | 2][];
  /** Rough radius of the whole shape (for spacing and halos). */
  radius: number;
}

export const ELEMENTS: Record<string, { r: number; color: string }> = {
  H: { r: 0.36, color: '#f3ece2' },
  C: { r: 0.55, color: '#3b3942' },
  N: { r: 0.56, color: '#2f56c9' },
  O: { r: 0.6, color: '#d8342b' },
  Na: { r: 0.85, color: '#8a55d6' },
  K: { r: 0.95, color: '#8b5bc4' },
  Mg: { r: 0.75, color: '#9bd04a' },
  Ca: { r: 0.9, color: '#46b9a8' },
  Cl: { r: 0.8, color: '#2fb04f' },
  S: { r: 0.72, color: '#e6c63a' },
  Fe: { r: 0.72, color: '#a8694a' },
  Cu: { r: 0.72, color: '#dc8236' },
  Zn: { r: 0.72, color: '#7f93b8' },
  I: { r: 0.95, color: '#7a3fa8' },
  Pb: { r: 0.85, color: '#7b7b86' },
  Ag: { r: 0.8, color: '#c8ccd4' },
  Al: { r: 0.75, color: '#b9bfc9' },
  Mn: { r: 0.75, color: '#a05e8c' },
  Ba: { r: 0.95, color: '#6fb08a' },
};

const A = (el: string, x: number, y: number, z: number): MolAtom => ({ el, x, y, z });
const rad = (deg: number): number => (deg * Math.PI) / 180;
const radiusOf = (atoms: MolAtom[]): number => Math.max(0.6, ...atoms.map((a) => Math.hypot(a.x, a.y, a.z) + (ELEMENTS[a.el]?.r ?? 0.6)));

function mol(atoms: MolAtom[], bonds: [number, number, 1 | 2][]): Molecule {
  return { atoms, bonds, radius: radiusOf(atoms) };
}

/** Atoms around a centre in a trigonal-planar (n = 3), tetrahedral (4) or generic ring (other) arrangement. */
function around(centre: string, ligands: string[], bond = 1.15): Molecule {
  const atoms: MolAtom[] = [A(centre, 0, 0, 0)];
  const n = ligands.length;
  ligands.forEach((el, i) => {
    if (n === 4) {
      const t = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]][i] ?? [1, 0, 0];
      const k = bond / Math.sqrt(3);
      atoms.push(A(el, t[0]! * k, t[1]! * k, t[2]! * k));
    } else {
      const a = (i / n) * Math.PI * 2;
      atoms.push(A(el, Math.cos(a) * bond, 0, Math.sin(a) * bond));
    }
  });
  return mol(atoms, ligands.map((_, i) => [0, i + 1, 1] as [number, number, 1 | 2]));
}

const water = (): Molecule => {
  const b = 1;
  const a = rad(52.25);
  return mol([A('O', 0, 0, 0), A('H', -Math.sin(a) * b, Math.cos(a) * b * -0.9, 0), A('H', Math.sin(a) * b, Math.cos(a) * b * -0.9, 0)], [[0, 1, 1], [0, 2, 1]]);
};

/** The 3D shape of a species (formula without charge). Unknown formulas become a tidy cluster around the first heavy atom. */
export function moleculeOf(formula: string): Molecule {
  switch (formula) {
    case 'H2O': return water();
    case 'CO2': return mol([A('C', 0, 0, 0), A('O', -1.25, 0, 0), A('O', 1.25, 0, 0)], [[0, 1, 2], [0, 2, 2]]);
    case 'H2': return mol([A('H', -0.4, 0, 0), A('H', 0.4, 0, 0)], [[0, 1, 1]]);
    case 'O2': return mol([A('O', -0.62, 0, 0), A('O', 0.62, 0, 0)], [[0, 1, 2]]);
    case 'H2O2': return mol([A('O', -0.75, 0, 0), A('O', 0.75, 0, 0), A('H', -1.15, 0.8, 0.35), A('H', 1.15, -0.8, 0.35)], [[0, 1, 1], [0, 2, 1], [1, 3, 1]]);
    case 'H3O': return around('O', ['H', 'H', 'H'], 0.95);
    case 'OH': return mol([A('O', 0, 0, 0), A('H', 0.95, 0, 0)], [[0, 1, 1]]);
    case 'HCO3': return mol([A('C', 0, 0, 0), A('O', 1.2, 0, 0), A('O', -0.6, 1.05, 0), A('O', -0.6, -1.05, 0), A('H', -1.1, -1.75, 0.3)], [[0, 1, 2], [0, 2, 1], [0, 3, 1], [3, 4, 1]]);
    case 'H2CO3': return mol([A('C', 0, 0, 0), A('O', 1.2, 0, 0), A('O', -0.6, 1.05, 0), A('O', -0.6, -1.05, 0), A('H', -1.1, 1.75, 0.3), A('H', -1.1, -1.75, 0.3)], [[0, 1, 2], [0, 2, 1], [0, 3, 1], [2, 4, 1], [3, 5, 1]]);
    case 'CO3': return around('C', ['O', 'O', 'O'], 1.2);
    case 'SO4': return around('S', ['O', 'O', 'O', 'O'], 1.5);
    case 'NO3': return around('N', ['O', 'O', 'O'], 1.2);
    case 'CH3COOH':
    case 'CH3COO': {
      const atoms = [A('C', -0.8, 0, 0), A('C', 0.7, 0, 0), A('O', 1.4, 1.05, 0), A('O', 1.4, -1.05, 0), A('H', -1.2, 0.95, 0.4), A('H', -1.2, -0.5, 0.85), A('H', -1.2, -0.5, -0.85)];
      const bonds: [number, number, 1 | 2][] = [[0, 1, 1], [1, 2, 2], [1, 3, 1], [0, 4, 1], [0, 5, 1], [0, 6, 1]];
      if (formula === 'CH3COOH') {
        atoms.push(A('H', 2.3, -1.2, 0));
        bonds.push([3, 7, 1]);
      }
      return mol(atoms, bonds);
    }
    default: {
      return clusterOf(formula);
    }
  }
}

/** Fallback: the first non-hydrogen element in the middle, everything else on a ring or sphere around it. */
export function clusterOf(formula: string): Molecule {
  let counts: Record<string, number> = {};
  try {
    counts = parseFormula(formula);
  } catch {
    counts = {};
  }
  const els = Object.entries(counts).flatMap(([el, n]) => Array.from({ length: Math.min(n, 12) }, () => el));
  if (els.length <= 1) return mol([A(els[0] ?? 'C', 0, 0, 0)], []);
  const centreIx = Math.max(0, els.findIndex((e) => e !== 'H'));
  const centre = els[centreIx] ?? 'C';
  const rest = els.filter((_, i) => i !== centreIx);
  const atoms: MolAtom[] = [A(centre, 0, 0, 0)];
  rest.forEach((el, i) => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const y = 1 - ((i + 0.5) / rest.length) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const k = 1.2 + Math.min(1.2, rest.length * 0.08);
    atoms.push(A(el, Math.cos(golden * i) * r * k, y * k, Math.sin(golden * i) * r * k));
  });
  return mol(atoms, rest.map((_, i) => [0, i + 1, 1] as [number, number, 1 | 2]));
}

/** The pigment of the red cabbage experiment: two fused rings with a hydrogen count that follows the formula. */
export function pigmentOf(formula: string): Molecule {
  const m = /H(\d+)/.exec(formula);
  const h = m ? Number(m[1]) : 10;
  const ring = (cx: number): MolAtom[] => Array.from({ length: 6 }, (_, i) => A('C', cx + Math.cos(rad(60 * i + 30)) * 1.15, Math.sin(rad(60 * i + 30)) * 1.15, 0));
  const atoms = [...ring(-1.0), ...ring(1.0), A('O', 0, 1.9, 0)];
  const bonds: [number, number, 1 | 2][] = [];
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) bonds.push([r * 6 + i, r * 6 + ((i + 1) % 6), i % 2 === 0 ? 2 : 1]);
  const hs = Math.max(2, Math.min(9, h - 4));
  for (let i = 0; i < hs; i++) {
    const a = (i / hs) * Math.PI * 2;
    atoms.push(A('H', Math.cos(a) * 2.9, Math.sin(a) * 1.8, 0.2));
    bonds.push([i % 12, atoms.length - 1, 1]);
  }
  return mol(atoms, bonds);
}

/** Display tint of species that are not coloured by element (the cabbage pigment in its three forms, the catalyst). */
export const SPECIES_TINT: Record<string, string> = {
  flav: '#e0425a',
  quin: '#8b5bc4',
  anion: '#3f9fbf',
  cat: '#b99ad8',
};

/** The shape of one script species. Atoms and ions are single balls; 'molecule'/'ion' use templates; lattices are a pair of balls. */
export function shapeOf(sp: ParticleScript['species'][number]): Molecule {
  if (sp.kind === 'electron' || sp.kind === 'catalyst') return mol([A('C', 0, 0, 0)], []);
  if (sp.id === 'flav' || sp.id === 'quin' || sp.id === 'anion') return pigmentOf(sp.formula);
  if (sp.kind === 'atom') return mol([A(firstElement(sp.formula), 0, 0, 0)], []);
  if (sp.kind === 'lattice') {
    const cation = firstElement(sp.formula);
    return mol([A(cation, -0.55, 0, 0), A(cation === 'Ca' || cation === 'K' || cation === 'Mg' ? 'O' : 'Cl', 0.65, 0, 0)], [[0, 1, 1]]);
  }
  const base = moleculeOf(sp.formula);
  return base;
}

export function firstElement(formula: string): string {
  const m = /^[A-Z][a-z]?/.exec(formula);
  return m ? m[0] : 'C';
}
