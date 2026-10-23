import { Color } from 'three';

const rgb = (hex: string): [number, number, number] => {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
};

/** Painted-clay palette of the transport module (warm, matching the cell explorer). */
export const COLORS = {
  head: rgb('#ee7f5c'),
  tail: rgb('#d49a44'),
  solute: '#e9a73c',
  big: '#c4577f',
  sodium: '#e0645c',
  potassium: '#6f6fd6',
  ion: '#d9779a',
  water: '#4aa3df',
  atp: '#f08a24',
  adp: '#f6c27a',
  phosphate: '#f2d13a',
  cargo: '#8fae6a',
  droplet: '#6bb7a5',
  channel: '#6fae5c',
  carrier: '#3f9aa3',
  pump: '#8c5fb8',
  outside: '#78acd0',
  inside: '#e6a96c',
  nucleus: '#9a6fb0',
  cytoplasm: '#f4d7a8',
  wall: '#8fb86a',
  vacuole: '#7fc0e6',
  chloroplast: '#5f9a48',
} as const;
