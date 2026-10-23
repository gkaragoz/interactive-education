/**
 * Ions and dissolved species with charge and colour, used by the mixture, pH and colour code.
 *
 * Sources: common ions and charges https://en.wikipedia.org/wiki/Ion ; polyatomic ions
 * https://en.wikipedia.org/wiki/Polyatomic_ion ; aqueous colours of Cu2+ (blue), Fe2+ (pale green),
 * Fe3+ (yellow-brown): https://en.wikipedia.org/wiki/Transition_metal#Coloured_compounds and
 * https://en.wikipedia.org/wiki/Copper(II)_sulfate . The absorbance coefficients are our own effective
 * teaching values chosen to give the right hue at 0.1 M and a 3 cm path (not spectroscopic constants).
 */
import { molarMassOf } from './formula';

export type Rgb = readonly [number, number, number];

export interface Ion {
  id: string;
  formula: string;
  charge: number;
  nameTr: string;
  /** Effective absorbance per (mol/L x cm) for R,G,B; absent = colourless. */
  absorb?: Rgb;
  molarMass: number;
}

const raw: Array<[string, string, number, string, Rgb?]> = [
  ['H+', 'H', 1, 'hidrojen iyonu'],
  ['OH-', 'OH', -1, 'hidroksit iyonu'],
  ['Na+', 'Na', 1, 'sodyum iyonu'],
  ['K+', 'K', 1, 'potasyum iyonu'],
  ['Ag+', 'Ag', 1, 'gümüş iyonu'],
  ['NH4+', 'NH4', 1, 'amonyum iyonu'],
  ['Mg(2+)', 'Mg', 2, 'magnezyum iyonu'],
  ['Ca(2+)', 'Ca', 2, 'kalsiyum iyonu'],
  ['Zn(2+)', 'Zn', 2, 'çinko iyonu'],
  ['Ba(2+)', 'Ba', 2, 'baryum iyonu'],
  ['Fe(2+)', 'Fe', 2, 'demir(II) iyonu', [0.1, 0.05, 0.25]],
  ['Cu(2+)', 'Cu', 2, 'bakır(II) iyonu', [3.0, 0.6, 0.15]],
  ['Fe(3+)', 'Fe', 3, 'demir(III) iyonu', [0.4, 1.2, 4.0]],
  ['Al(3+)', 'Al', 3, 'alüminyum iyonu'],
  ['Cl-', 'Cl', -1, 'klorür iyonu'],
  ['NO3-', 'NO3', -1, 'nitrat iyonu'],
  ['I-', 'I', -1, 'iyodür iyonu'],
  ['HCO3-', 'HCO3', -1, 'hidrojenkarbonat iyonu'],
  ['CO3(2-)', 'CO3', -2, 'karbonat iyonu'],
  ['SO4(2-)', 'SO4', -2, 'sülfat iyonu'],
  ['CH3COO-', 'CH3COO', -1, 'asetat iyonu'],
  ['citrate-', 'C6H7O7', -1, 'sitrat iyonu'],
  ['laurate-', 'C12H23O2', -1, 'sabun (laurat) iyonu'],
  ['ClO-', 'ClO', -1, 'hipoklorit iyonu'],
];

export const IONS: Readonly<Record<string, Ion>> = Object.fromEntries(
  raw.map(([id, formula, charge, nameTr, absorb]) => [id, { id, formula, charge, nameTr, absorb, molarMass: molarMassOf(formula) }]),
);

export function isIon(id: string): boolean {
  return IONS[id] !== undefined;
}
