import type { Trip } from '../flock';
import { go } from '../paths';
import { SUN } from './leaf';

/** Light density factor of the light-intensity option. */
export const lightFactor = (o: Record<string, string>): number => ({ low: 0.5, medium: 1, high: 1.6 })[o['light-intensity'] ?? 'medium'] ?? 1;

/** Photons falling from the sun onto the leaf top (station 0) between t0 and t1. */
export function sunPhotons(t0: number, t1: number, density: number): Trip[] {
  const out: Trip[] = [];
  const step = 0.2 / density;
  for (let i = 0, t = t0; t < t1 - 0.2; i++, t += step) {
    const x = -5.5 + ((i * 37) % 11) * 0.85;
    out.push(go('photon', 0, 0.2, [[t, SUN[0] - 1.4, SUN[1] - 0.8 - (i % 3) * 0.3, 0.4], [t + 1.6, x, 1.95, 0.3 * ((i % 5) - 2)]], { fade: 0.15 }));
  }
  return out;
}
