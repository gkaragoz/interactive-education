import { buildDi } from './di';
import { buildKan } from './kan';
import type { Kit } from './kit';
import { buildMono } from './mono';
import type { Plan } from './plan';
import type { CrossSpec } from './punnett';
import { buildSex } from './sex';

/** Adds the actors of one track to the kit and returns its camera path, labels and Punnett timing. */
export function buildTrack(trackId: string, kit: Kit, cross: CrossSpec, options: Record<string, string>): Plan {
  if (trackId === 'dihibrit') return buildDi(kit, cross);
  if (trackId === 'kan-gruplari') return buildKan(kit, cross);
  if (trackId === 'eseye-bagli') return buildSex(kit, cross);
  return buildMono(kit, cross, options);
}
