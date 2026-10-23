/**
 * Colours and per-vessel visual summary for the renderer.
 * Beer-Lambert additive absorbance (dossier section 6): transmittance T = 10^-(sum eps_i c_i L) per channel, the display
 * colour is white light x T (https://en.wikipedia.org/wiki/Beer%E2%80%93Lambert_law). Indicator colours multiply in with a
 * strength from the amount of stock (indicators.ts). Precipitates add a turbidity term.
 */
import { INDICATORS, indicatorColor, indicatorStrength } from './indicators';
import { IONS, type Rgb } from './ions';
import { amount } from './mixture';
import { phOfMix } from './ph';
import { speciesOf } from './species';
import { getSubstance } from './substances';
import { VESSEL_SPECS, volumeMl, type Vessel } from './vessel';

const PATH_CM = 3;
const WATER_TINT: Rgb = [235, 245, 255];

export function liquidRgb(v: Vessel): Rgb {
  const vMl = volumeMl(v);
  if (vMl <= 0) return WATER_TINT;
  const vL = vMl / 1000;
  const t = [1, 1, 1];
  for (const [k, n] of Object.entries(v.mix)) {
    const ion = IONS[k];
    if (!ion?.absorb) continue;
    const c = n / vL;
    for (let i = 0; i < 3; i++) t[i] = (t[i] ?? 1) * Math.pow(10, -(ion.absorb[i] ?? 0) * c * PATH_CM);
  }
  const ph = phOfMix(v.mix, vMl);
  for (const [id, ml] of Object.entries(v.indicators)) {
    if (!INDICATORS[id] || ph === null) continue;
    const s = indicatorStrength(id, ml, vMl);
    const col = indicatorColor(id, ph);
    for (let i = 0; i < 3; i++) t[i] = (t[i] ?? 1) * (1 - s + (s * (col[i] ?? 255)) / 255);
  }
  return [0, 1, 2].map((i) => Math.round((WATER_TINT[i] ?? 255) * (t[i] ?? 1))) as unknown as Rgb;
}

/** Rough Turkish colour name of an rgb value (for the Defter). */
export function colourNameTr(rgb: Rgb): string {
  const [r, g, b] = rgb.map((x) => x / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (max < 0.25) return 'koyu';
  if (d < 0.07) return max > 0.9 ? 'renksiz' : 'gri';
  let h = 0;
  if (max === r) h = ((g - b) / d + 6) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  const light = max > 0.85 && d < 0.25 ? 'açık ' : '';
  if (h < 15 || h >= 345) return r > 0.8 && g > 0.5 ? `${light}pembe` : `${light}kırmızı`;
  if (h < 40) return `${light}turuncu`;
  if (h < 70) return `${light}sarı`;
  if (h < 160) return `${light}yeşil`;
  if (h < 200) return `${light}turkuaz`;
  if (h < 260) return `${light}mavi`;
  if (h < 300) return `${light}mor`;
  return `${light}pembe`;
}

export const rgbDistance = (a: Rgb, b: Rgb): number => Math.hypot((a[0] - b[0]), (a[1] - b[1]), (a[2] - b[2]));

export interface VesselVisual {
  id: string;
  fillLevel: number;
  liquidRgb: Rgb;
  /** 0..1 how see-through-not the liquid is because of absorbance. */
  liquidAlpha: number;
  /** 0..1 cloudiness from suspended precipitate. */
  turbidity: number;
  sediment: Array<{ id: string; rgb: Rgb; massG: number; powder: boolean }>;
  /** Solid pieces such as a nail or a ribbon (grams, colour) and the copper coat share on iron. */
  pieces: Array<{ id: string; rgb: Rgb; massG: number }>;
  bubbles: number;
  foamMl: number;
  balloonFill: number;
  tempC: number;
  flameOn: boolean;
  glow: number;
  flash: number;
  closure: Vessel['closure'];
}

export function visualOf(v: Vessel): VesselVisual {
  const spec = VESSEL_SPECS[v.kind];
  const vMl = volumeMl(v);
  const rgb = liquidRgb(v);
  const sediment: VesselVisual['sediment'] = [];
  const pieces: VesselVisual['pieces'] = [];
  let suspended = 0;
  for (const [k, n] of Object.entries(v.mix)) {
    const sp = speciesOf(k);
    if (sp.phase !== 's') continue;
    const sub = getSubstance(sp.id);
    if (!sub) continue;
    const massG = n * sp.molarMass;
    const sparing = (sub.solubility?.[0]?.[1] ?? 1) < 0.1;
    if (sparing || sp.powder) {
      sediment.push({ id: sp.id, rgb: sub.rgb, massG, powder: sp.powder });
      suspended += massG * (0.25 + 0.75 * v.agitation);
    } else if (sub.solubility && sub.solubility.length > 0) sediment.push({ id: sp.id, rgb: sub.rgb, massG, powder: false });
    else pieces.push({ id: sp.id, rgb: sub.rgb, massG });
  }
  const mean = (rgb[0] + rgb[1] + rgb[2]) / (3 * 255);
  return {
    id: v.id, fillLevel: Math.min(1, vMl / spec.capacityMl), liquidRgb: rgb, liquidAlpha: Math.min(0.85, 0.25 + 0.6 * (1 - mean)),
    turbidity: vMl > 0 ? 1 - Math.exp(-(suspended / vMl) * 40) : 0, sediment, pieces,
    bubbles: Math.min(1, v.gasRate * 2000), foamMl: v.foam,
    balloonFill: v.closure === 'balloon' ? Math.min(1, (amount(v.mix, 'g:co2') + amount(v.mix, 'g:o2') + amount(v.mix, 'g:h2')) * 24.465 / 1.5) : 0,
    tempC: v.tempC, flameOn: v.heat !== null && v.heat !== 'hotplate', glow: v.tempC > 500 ? Math.min(1, (v.tempC - 500) / 700) : 0,
    flash: v.flash, closure: v.closure,
  };
}

