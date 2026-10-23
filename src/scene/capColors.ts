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

/** Colour of a cut face: the shell's own colour made richer, organelles lighter than their legend colour. */
export function capColorFor(key: string, shellColor: Color, organelles: ReadonlyMap<string, OrganelleInfo>): string {
  if (key === SHELL_KEY) return saturate(shellColor, 1.9, 0.82);
  const base = new Color(organelles.get(key)?.color ?? '#d8c9a0');
  // Cut faces keep the organelle's own hue (a little lighter than the legend dot); the vacuole stays a strong blue.
  return key === 'vacuole' ? saturate(base, 1.35, 0.95) : saturate(base.lerp(new Color('#ffffff'), 0.16), 1.15, 1);
}
