/** Light and CO2 options as a rate relative to the defaults (medium light, normal CO2). */
const LIGHT: Record<string, number> = { low: 0.4, medium: 0.8, high: 1 };
const CO2: Record<string, number> = { low: 0.45, normal: 0.8, high: 1 };

/** Limiting-factor model: the scarcer of the two sets the rate; 1 at the defaults, 0.5 at low, 1.25 when both are high. */
export function photoRate(o: Record<string, string>): number {
  const light = LIGHT[o['light-intensity'] ?? 'medium'] ?? 0.8;
  const co2 = CO2[o['co2-level'] ?? 'normal'] ?? 0.8;
  return Math.min(light, co2) / 0.8;
}

export interface PhotoCounts {
  /** Oxygen molecules released (also the number of Calvin turns). */
  n: number;
  /** Time scale of the event spacing (< 1 = faster). */
  k: number;
  atp: number;
  protons: number;
}

export function photoCounts(o: Record<string, string>): PhotoCounts {
  const r = photoRate(o);
  const n = Math.max(1, Math.round(6 * Math.min(1, r)));
  const atp = Math.round(1.5 * n);
  return { n, k: 1 / Math.max(1, r), atp, protons: 3 * atp };
}
