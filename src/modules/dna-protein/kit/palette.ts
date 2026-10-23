import { Color } from 'three';

// Base colours (warm for A-T, cool for G-C; U is the RNA magenta). Letters are always shown next to the colour, so the
// code never relies on colour alone.
export const BASE_HEX: Record<string, string> = { A: '#ec8a4e', T: '#f2c94a', G: '#4a97dc', C: '#52b88c', U: '#cf5c97' };
const BASE_CACHE = new Map<string, Color>();
/** Base length factor by shared colour: purines (A, G) are larger than pyrimidines (T, C, U). */
export const BASE_LEN = new WeakMap<Color, number>();
/** Shared colour of a base letter (do not mutate: copy it first). */
export const baseColor = (b: string): Color => {
  let c = BASE_CACHE.get(b);
  if (!c) {
    c = new Color(BASE_HEX[b] ?? '#cccccc');
    BASE_LEN.set(c, b === 'A' || b === 'G' ? 1.2 : 0.74);
    BASE_CACHE.set(b, c);
  }
  return c;
};

export const OLD_HEX = '#6b62c9'; // original (template) strand backbone
export const NEW_HEX = '#58ad46'; // newly made strand backbone
export const PRIMER_HEX = '#e0638c';
export const RNA_HEX = '#cf5c97';
export const WHITE = new Color('#ffffff');
export const SUGAR_COLOR = new Color('#c9b3ec');
export const PHOS_COLOR = new Color('#9b7fd0');

/** Residue colour by amino acid property class (hydrophobic, polar, positive, negative, special). */
const AA_HEX: Record<string, string> = {
  Ala: '#e0b95a', Val: '#e0b95a', Leu: '#e0b95a', Ile: '#e0b95a', Met: '#f0a542', Phe: '#d98a3d', Trp: '#c97a3a', Pro: '#c9a46a',
  Ser: '#6fb7c9', Thr: '#6fb7c9', Asn: '#5aa6b8', Gln: '#5aa6b8', Tyr: '#7cc0a8', Cys: '#e8d35a', Gly: '#b8c76a',
  Lys: '#5a7fd6', Arg: '#4a68c6', His: '#7a8fd0',
  Asp: '#d6586a', Glu: '#c94a5c',
};
const AA_CACHE = new Map<string, Color>();
/** Shared residue colour of an amino acid (do not mutate: copy it first). */
export const aaColor = (three: string): Color => {
  let c = AA_CACHE.get(three);
  if (!c) {
    c = new Color(AA_HEX[three] ?? '#c9b48a');
    AA_CACHE.set(three, c);
  }
  return c;
};
