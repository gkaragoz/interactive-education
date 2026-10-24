import { LabSim, getReagent, type Reagent, type ReagentCategory } from '../../chemlab';
import type { Rgb } from './helpers';

/** How a reagent looks on the shelf and in the stream (colour read from the engine itself, so a bottle matches what it pours). */
export type Container = 'bottle' | 'jar' | 'dropper' | 'piece';
export interface ReagentLook {
  id: string;
  nameTr: string;
  labelTr: string;
  container: Container;
  rgb: Rgb;
  cap: string;
  /** Default amount of one pour chunk and the choices the mouse wheel steps through. */
  amount: number;
  amounts: number[];
  unit: 'mL' | 'g' | 'damla';
  category: ReagentCategory;
}

const CAP: Record<ReagentCategory, string> = {
  acid: '#d9534f',
  base: '#3f7fd6',
  indicator: '#3fa86b',
  salt: '#8d93a0',
  household: '#e0a030',
  metal: '#a8a8b0',
  other: '#a07bd0',
};

const cache = new Map<string, ReagentLook>();

/** Colour of `id` as the engine would show it (10 mL for liquids, 1 g for solids), or a neutral default if the engine refuses. */
function probeColour(r: Reagent): Rgb {
  try {
    const sim = new LabSim({ seed: 1 });
    sim.addVessel('p', 'beaker250');
    const res = r.unit === 'mL' ? sim.pour(r.id, 'p', 10) : sim.add(r.id, 'p', 1);
    if (!res.ok) return [225, 232, 240];
    const v = sim.visuals('p');
    if (!v) return [225, 232, 240];
    if (r.unit === 'mL') return v.liquidRgb;
    return v.sediment[0]?.rgb ?? v.pieces[0]?.rgb ?? [225, 225, 225];
  } catch {
    return [225, 232, 240];
  }
}

export function lookOf(id: string): ReagentLook | null {
  const hit = cache.get(id);
  if (hit) return hit;
  const r = getReagent(id);
  if (!r) return null;
  const container: Container = r.unit === 'mL' ? (r.category === 'indicator' ? 'dropper' : 'bottle') : r.category === 'metal' ? 'piece' : 'jar';
  const look: ReagentLook = {
    id,
    nameTr: r.nameTr,
    labelTr: r.labelTr,
    container,
    rgb: probeColour(r),
    cap: CAP[r.category],
    category: r.category,
    unit: container === 'dropper' ? 'damla' : r.unit,
    amount: container === 'dropper' ? 3 : r.unit === 'mL' ? 20 : container === 'piece' ? 0.5 : 1,
    amounts: container === 'dropper' ? [1, 3, 5, 10] : r.unit === 'mL' ? [5, 10, 20, 50] : container === 'piece' ? [0.1, 0.5, 1, 5] : [0.5, 1, 2, 5],
  };
  cache.set(id, look);
  return look;
}

/** Reagents shown in 3D on the free bench (all others stay in the menu); an experiment shows its whole shelf. */
export const FREE_SHELF = ['water', 'vinegar', 'hcl-0.1M', 'naoh-0.1M', 'baking-soda-solution', 'cabbage-extract', 'phenolphthalein', 'universal-indicator', 'cuso4-0.1M', 'nacl', 'nahco3', 'sucrose', 'mg-ribbon', 'fe-nail'];

export function clearLookCache(): void {
  cache.clear();
}
