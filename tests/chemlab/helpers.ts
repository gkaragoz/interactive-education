import { LabSim } from '../../src/chemlab';
import type { VesselKind } from '../../src/chemlab';

/** A bench with the given vessels, all empty. */
export function bench(...vessels: Array<[string, VesselKind]>): LabSim {
  return new LabSim({ bench: { vessels: vessels.map(([id, kind]) => ({ id, kind })) } });
}

export const beaker = (): LabSim => bench(['a', 'beaker250']);
export const near = (x: number, y: number, tol: number): boolean => Math.abs(x - y) <= tol;
