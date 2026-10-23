/**
 * Gas handling per step: gas lines, escape from open vessels, stopper pressure, balloon, foam.
 * Ideal gas law P = nRT/V (https://en.wikipedia.org/wiki/Ideal_gas_law), molar volume 24.465 L/mol at 25 degC;
 * a sealed bottle of a gas-producing reaction is the classic overpressure accident (dossier E1 safety note,
 * https://teachchemistry.org/classroom-resources/kitchen-reaction). Foam: gas trapped by soap film
 * (https://en.wikipedia.org/wiki/Elephant%27s_toothpaste). Escape rate 2 per second and stopper limit 2 atm are our values.
 */
import { addTo, amount } from './mixture';
import { MOLAR_VOLUME_L, speciesOf, type Mix } from './species';
import { VESSEL_SPECS, volumeMl, type Vessel } from './vessel';

export const GAS_CONSTANT = 0.082057; // L atm / (mol K)
export const STOPPER_LIMIT_ATM = 2;

export const gasKeys = (mix: Mix): string[] => Object.keys(mix).filter((k) => k.startsWith('g:'));

export function totalGasMol(mix: Mix): number {
  let n = 0;
  for (const k of gasKeys(mix)) n += amount(mix, k);
  return n;
}

/** True when gas can leave the vessel by itself. */
export function isVented(v: Vessel): boolean {
  const spec = VESSEL_SPECS[v.kind];
  if (spec.gasTight || v.closure !== 'none') return false;
  return v.kind !== 'crucible' || v.lidOpen;
}

export interface GasStepResult {
  escapedG: number;
  popped: boolean;
}

export function stepGas(v: Vessel, dt: number, vessels: ReadonlyMap<string, Vessel>): GasStepResult {
  const out: GasStepResult = { escapedG: 0, popped: false };
  if (v.gasTo) {
    const target = vessels.get(v.gasTo);
    if (target && target.id !== v.id) {
      for (const k of gasKeys(v.mix)) {
        const n = amount(v.mix, k);
        addTo(target.mix, k, n);
        addTo(v.mix, k, -n);
      }
    }
  }
  if (isVented(v)) {
    const f = 1 - Math.exp(-2 * dt);
    for (const k of gasKeys(v.mix)) {
      const n = amount(v.mix, k) * f;
      addTo(v.mix, k, -n);
      out.escapedG += n * speciesOf(k).molarMass;
    }
  } else if (v.closure === 'stopper' && !VESSEL_SPECS[v.kind].gasTight) {
    const headL = Math.max(0.005, (VESSEL_SPECS[v.kind].capacityMl - volumeMl(v)) / 1000);
    const p = (totalGasMol(v.mix) * GAS_CONSTANT * (v.tempC + 273.15)) / headL;
    if (p > STOPPER_LIMIT_ATM) {
      v.closure = 'none';
      out.popped = true;
    }
  }
  return out;
}

/** Foam from gas bubbles held by soap. Returns the new foam volume (mL). */
export function updateFoam(v: Vessel, gasMolThisStep: number, dt: number): number {
  const soap = amount(v.mix, 'laurate-');
  const vMl = volumeMl(v);
  const conc = vMl > 0 ? soap / (vMl / 1000) : 0;
  const hold = conc >= 0.001 ? 0.8 : 0;
  const foam = (v.foam + gasMolThisStep * MOLAR_VOLUME_L * 1000 * hold) * Math.exp(-dt / 120);
  return Number.isFinite(foam) ? Math.min(foam, 2000) : 0;
}

/** Balloon volume in mL for the gas currently in a ballooned vessel. */
export const balloonMl = (v: Vessel): number => (v.closure === 'balloon' ? (totalGasMol(v.mix) * MOLAR_VOLUME_L * 1000 * (v.tempC + 273.15)) / 298.15 : 0);
