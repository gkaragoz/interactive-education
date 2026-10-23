/**
 * Electrolysis with inert electrodes.
 * Water: cathode 2 H2O + 2 e- -> H2 + 2 OH-, anode 2 H2O -> O2 + 4 H+ + 4 e-, so H2 : O2 = 2 : 1 by amount and by volume
 * (Faraday: n(e-) = Q / F, https://en.wikipedia.org/wiki/Faraday_constant ; https://en.wikipedia.org/wiki/Electrolysis_of_water ;
 * https://en.wikipedia.org/wiki/Hofmann_voltameter). A little electrolyte is needed because pure water barely conducts.
 * Metal ions that are reduced more easily than water (Ag+, then Cu2+) deposit first at the cathode
 * (https://en.wikipedia.org/wiki/Standard_electrode_potential_(data_page)); the anode always makes O2 here because
 * chloride is blocked (see hazards.ts). Practical decomposition voltage 1.8 V (theoretical minimum 1.23 V, the
 * difference is overpotential and resistance); cell constant, lead resistance and equivalent conductivity
 * (about 50 S cm2/eq, https://en.wikipedia.org/wiki/Molar_conductivity) are our teaching values.
 */
import { addTo, amount } from './mixture';
import { FARADAY, MOLAR_VOLUME_L, speciesOf } from './species';
import { volumeMl, type Vessel } from './vessel';

export const DECOMPOSITION_VOLTS = 1.8;
export const THEORETICAL_MIN_VOLTS = 1.23;
const CELL_CONSTANT_PER_CM = 0.5;
const LEAD_OHMS = 5;
const LIMB_ML = 50;

export function conductivity(v: Vessel): number {
  const vL = volumeMl(v) / 1000;
  if (vL <= 0) return 0;
  let eq = 0;
  for (const [k, n] of Object.entries(v.mix)) {
    const sp = speciesOf(k);
    if (sp.phase === 'aq' && sp.charge !== 0) eq += (Math.abs(sp.charge) * n) / vL;
  }
  return (eq * 50) / 1000 + 5.5e-8;
}

export const gasVolumeMl = (v: Vessel, id: string): number => (amount(v.mix, `g:${id}`) * MOLAR_VOLUME_L * 1000 * (v.tempC + 273.15)) / 298.15;

export interface ElectroResult {
  currentA: number;
  heatJ: number;
  limbFull: boolean;
}

export function stepElectrolysis(v: Vessel, dt: number): ElectroResult {
  const out: ElectroResult = { currentA: 0, heatJ: 0, limbFull: false };
  if (!v.electrodes) return out;
  const vMl = volumeMl(v);
  if (vMl < 5 || v.electrodes.volts <= DECOMPOSITION_VOLTS) return out;
  if (v.kind === 'hofmann' && gasVolumeMl(v, 'h2') >= LIMB_ML) {
    out.limbFull = true;
    return out;
  }
  const r = CELL_CONSTANT_PER_CM / conductivity(v) + LEAD_OHMS;
  const i = (v.electrodes.volts - DECOMPOSITION_VOLTS) / r;
  const q = i * dt;
  const nE = q / FARADAY;
  let left = nE;
  const nAg = Math.min(left, amount(v.mix, 'Ag+'));
  addTo(v.mix, 'Ag+', -nAg);
  addTo(v.mix, 's:ag', nAg);
  left -= nAg;
  const nCu = Math.min(left / 2, amount(v.mix, 'Cu(2+)'));
  addTo(v.mix, 'Cu(2+)', -nCu);
  addTo(v.mix, 's:cu', nCu);
  left -= 2 * nCu;
  // Net effect of the anode (all routes) and the water-reduction part of the cathode, after H+ + OH- -> H2O.
  addTo(v.mix, 'water', -nE / 2);
  addTo(v.mix, 'g:o2', nE / 4);
  addTo(v.mix, 'g:h2', left / 2);
  addTo(v.mix, 'H+', nE - left);
  v.charge += q;
  out.currentA = i;
  out.heatJ = q * Math.max(0, v.electrodes.volts - THEORETICAL_MIN_VOLTS);
  return out;
}
