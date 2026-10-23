import { Color } from 'three';
import type { OrganelleInfo } from '../data/types';
import { SHELL_KEY } from './cutaway';

/** Cytoplasm bed colour per cell type (teal, peach-pink, pale amber); the cut shows it as the floor. */
export const CAVITY_COLORS: Record<string, string> = { plant: '#52b0a2', animal: '#e9a999', bacterium: '#ead08a' };

const saturate = (color: Color, s: number, l: number): string => {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return new Color().setHSL(hsl.h, Math.min(1, hsl.s * s), Math.min(0.85, hsl.l * l)).getStyle();
};

/**
 * Mean painted albedo of every asset (clay, low tier, empty atlas gutters ignored; measured from the texture sources
 * with tools/blender/out/tex). Cut faces use it so a section has the same colour as the surface next to it.
 */
export const ALBEDO_MEAN: Record<string, string> = {
  centrosome: '#5ea0ac', chloroplast: '#568f2c', 'envelope-bacterium': '#567b2c', flagellum: '#748174', golgi: '#924ba5',
  lysosome: '#5a347a', 'membrane-animal': '#c473a4', 'membrane-plant': '#6ea9b7', mitochondrion: '#c8571e', nucleoid: '#c66f6e',
  nucleus: '#8b5fc3', pilus: '#7c9379', plasmid: '#86767e', ribosome: '#c88594', 'rough-er': '#c3676e', 'smooth-er': '#d1794f',
  vacuole: '#4f9fe0', 'wall-plant': '#547424',
};

/** Colour of a cut face: the asset's mean albedo, a little brighter (a section is lit flat). The shell cap follows the wall if there is one. */
export function capColorFor(key: string, shellIds: readonly string[], organelles: ReadonlyMap<string, OrganelleInfo>): string {
  if (key === SHELL_KEY) {
    const id = shellIds.find((s) => s.startsWith('wall')) ?? shellIds[shellIds.length - 1] ?? '';
    return saturate(new Color(ALBEDO_MEAN[id] ?? '#6f9a3a'), 1.05, 1.2);
  }
  const mean = ALBEDO_MEAN[key];
  if (mean) return saturate(new Color(mean), 1.05, 1.0);
  return saturate(new Color(organelles.get(key)?.color ?? '#d8c9a0').lerp(new Color('#ffffff'), 0.16), 1.15, 1);
}
