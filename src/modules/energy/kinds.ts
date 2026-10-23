import { BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, SphereGeometry, TorusGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** One ball of a procedural molecule: x, y, z, radius, colour. */
type Atom = readonly [number, number, number, number, string];

export interface KindSpec {
  atoms: readonly Atom[];
  /** Custom geometry instead of balls (the ATP coin). */
  coin?: { face: string; rim: string; bumps: number };
  /** Painted GLB id in `public/models/modules` used instead of the stand-in when the file exists. */
  asset?: string;
  /** Unlit and bright (photons, electrons). */
  glow?: boolean;
  /** Default instance colour (assets with a neutral albedo are tinted). */
  tint?: string;
  /** Multiplies every trip size of this kind (molecules are drawn larger than life so they read). */
  scale?: number;
}

const C = '#5e5955';
const O = '#e0483e';
const RING = (n: number, radius: number, r: number, color: string, y = 0): Atom[] =>
  Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * radius, y, Math.sin((i / n) * Math.PI * 2) * radius, r, color] as const);

/** Procedural stand-ins in the painted-clay palette (ball models, atoms touch). */
export const KINDS = {
  co2: { atoms: [[0, 0, 0, 0.42, C], [-0.8, 0, 0, 0.5, O], [0.8, 0, 0, 0.5, O]], asset: 'co2', scale: 1.5 },
  h2o: { atoms: [[0, 0, 0, 0.55, '#4aa3df'], [-0.62, -0.42, 0, 0.3, '#e3f3fb'], [0.62, -0.42, 0, 0.3, '#e3f3fb']], asset: 'h2o', scale: 1.5 },
  o2: { atoms: [[-0.48, 0, 0, 0.5, O], [0.48, 0, 0, 0.5, O]], asset: 'o2', scale: 1.5 },
  glucose: {
    atoms: [...RING(6, 0.95, 0.42, '#e8a526'), ...RING(6, 1.5, 0.2, '#f6d27a'), [0, 0.1, 0, 0.35, '#f1c04a']],
    asset: 'glucose',
    scale: 1.5,
  },
  atp: { atoms: [[0, 0, 0, 1.1, '#f2b830']], coin: { face: '#f6c744', rim: '#d99a1e', bumps: 3 }, scale: 0.9 },
  adp: { atoms: [[0, 0, 0, 1.1, '#d6c9a8']], coin: { face: '#e4d9bc', rim: '#b9a982', bumps: 2 }, scale: 0.75 },
  atpChain: { atoms: [[0, 0, 0, 0.62, '#f08a24'], [0.95, 0.2, 0, 0.36, '#f6c27a'], [1.65, 0, 0, 0.38, '#f2d13a'], [2.35, 0.2, 0, 0.38, '#f2d13a'], [3.05, 0, 0, 0.38, '#f2d13a']], asset: 'atp', tint: '#f08a2a', scale: 0.4 },
  adpChain: { atoms: [[0, 0, 0, 0.62, '#f3a95a'], [0.95, 0.2, 0, 0.36, '#f6d4a4'], [1.65, 0, 0, 0.38, '#f2d13a'], [2.35, 0.2, 0, 0.38, '#f2d13a']], asset: 'atp', tint: '#e8c48e', scale: 0.4 },
  phosphate: { atoms: [[0, 0, 0, 1, '#f2d13a']] },
  nadph: { atoms: [[0, 0, 0, 0.6, '#8c5fb8'], [0.7, 0.35, 0.1, 0.42, '#b48ad8'], [-0.6, 0.3, -0.2, 0.4, '#b48ad8'], [0, -0.55, 0.3, 0.38, '#7448a0']] },
  nadh: { atoms: [[0, 0, 0, 0.6, '#3f9aa3'], [0.7, 0.35, 0.1, 0.42, '#6ec3c9'], [-0.6, 0.3, -0.2, 0.4, '#6ec3c9'], [0, -0.55, 0.3, 0.38, '#2f7d86']] },
  fadh2: { atoms: [[0, 0, 0, 0.6, '#d9779a'], [0.7, 0.35, 0.1, 0.42, '#ee9fba'], [-0.6, 0.3, -0.2, 0.4, '#ee9fba']] },
  carrierOff: { atoms: [[0, 0, 0, 0.6, '#b9aebb'], [0.7, 0.35, 0.1, 0.42, '#d6ccd8'], [-0.6, 0.3, -0.2, 0.4, '#d6ccd8'], [0, -0.55, 0.3, 0.38, '#a597a8']] },
  ubiquinone: { atoms: [[0, 0, 0, 0.5, '#d9a441'], [0.9, 0.2, 0, 0.3, '#e8c06a'], [1.5, 0, 0, 0.25, '#e8c06a']], asset: 'ubiquinone', scale: 0.5 },
  cytc: { atoms: [[0, 0, 0, 0.7, '#e07a8a'], [0, 0, 0.6, 0.3, '#a8324a']], asset: 'cytochrome-c', scale: 0.8 },
  hplus: { atoms: [[0, 0, 0, 1, '#ff7a59']] },
  carbon: { atoms: [[0, 0, 0, 1, '#d9d4cc']] },
  acetyl: { atoms: [[-0.5, 0, 0, 0.6, C], [0.5, 0, 0, 0.6, C]] },
  lactate: { atoms: [[-0.7, 0, 0, 0.5, '#c25a8a'], [0, 0.3, 0, 0.5, '#c25a8a'], [0.7, 0, 0, 0.5, '#c25a8a'], [0, 0.95, 0, 0.3, O]] },
  ethanol: { atoms: [[-0.5, 0, 0, 0.5, '#d9822b'], [0.2, 0.35, 0, 0.5, '#d9822b'], [0.85, 0.95, 0, 0.32, O]] },
  psII: { atoms: [[-0.55, 0.1, 0, 0.62, '#4f9a5a'], [0.55, 0.1, 0, 0.62, '#4f9a5a'], [-0.55, 0.9, 0.1, 0.45, '#6bb26b'], [0.55, 0.9, 0.1, 0.45, '#6bb26b'], [0, -0.75, 0, 0.5, '#3b7f4a'], [0, 0.35, 0.55, 0.3, '#c8e27a'], [0, 0.35, -0.55, 0.3, '#c8e27a']], asset: 'photosystem-2' },
  psI: { atoms: [[0, 0, 0, 0.8, '#3f9aa3'], [0.65, 0.5, 0, 0.45, '#5ec0c8'], [-0.65, 0.5, 0, 0.45, '#5ec0c8'], [0, 0.9, 0.5, 0.42, '#5ec0c8'], [0, -0.7, 0, 0.5, '#2f7d86'], [0, 0.2, 0.7, 0.28, '#c8e27a']], asset: 'photosystem-1' },
  cyt: { atoms: [[0, 0, 0, 0.55, '#c25a8a'], [0, 0.7, 0, 0.4, '#d9779a'], [0, -0.7, 0, 0.4, '#a8486f']] },
  atpSynthase: { atoms: [[0, 0, 0, 0.36, '#8c5fb8'], [0, 0.35, 0, 0.13, '#d6a24a'], [0, 0.6, 0, 0.13, '#d6a24a'], [0.26, 1.05, 0, 0.33, '#e2735c'], [-0.13, 1.05, 0.23, 0.33, '#e2735c'], [-0.13, 1.05, -0.23, 0.33, '#e2735c'], [0, 1.35, 0, 0.22, '#f08a6c'], [0.28, 0.5, 0, 0.1, '#ffd23f']], asset: 'atp-synthase' },
  rubisco: { atoms: [[-0.4, -0.4, -0.4, 0.5, '#c97b3a'], [0.4, -0.4, -0.4, 0.5, '#d98c46'], [-0.4, 0.4, -0.4, 0.5, '#d98c46'], [0.4, 0.4, -0.4, 0.5, '#c97b3a'], [-0.4, -0.4, 0.4, 0.5, '#d98c46'], [0.4, -0.4, 0.4, 0.5, '#c97b3a'], [-0.4, 0.4, 0.4, 0.5, '#c97b3a'], [0.4, 0.4, 0.4, 0.5, '#d98c46']], asset: 'rubisco' },
  etcA: { atoms: [[0, 0, 0, 0.7, '#4a90c2'], [0, 0.85, 0, 0.5, '#6cb0de'], [0, -0.8, 0, 0.5, '#3c7aa8'], [0.5, 1.2, 0, 0.3, '#9bd0ee']], asset: 'etc-complex-1' },
  etcB: { atoms: [[0, 0, 0, 0.65, '#d9822b'], [0, 0.8, 0, 0.45, '#eba04f'], [0, -0.75, 0, 0.45, '#b86d1f']], asset: 'etc-complex-3' },
  etcII: { atoms: [[0, 0, 0, 0.55, '#3f9aa3'], [0, 0.7, 0, 0.35, '#5ec0c8'], [0, -0.7, 0, 0.4, '#2f7d86']], asset: 'etc-complex-2' },
  etcC: { atoms: [[0, 0, 0, 0.6, '#7cae5b'], [0, 0.75, 0, 0.42, '#98c777'], [0, -0.7, 0, 0.4, '#639147']], asset: 'etc-complex-4' },
  h2s: { atoms: [[0, 0, 0, 0.62, '#e3d14a'], [-0.55, -0.45, 0, 0.3, '#f6f1d0'], [0.55, -0.45, 0, 0.3, '#f6f1d0']] },
  bubble: { atoms: [[0, 0, 0, 1, '#dff1fb']] },
  bacterium: { atoms: [[-0.55, 0, 0, 0.5, '#7cae5b'], [0, 0, 0, 0.5, '#7cae5b'], [0.55, 0, 0, 0.5, '#7cae5b']] },
  electron: { atoms: [[0, 0, 0, 1, '#fff2a0']], glow: true },
  photon: { atoms: [[0, 0, 0, 0.7, '#ffe86a']], glow: true },
} as const satisfies Record<string, KindSpec>;

export type KindId = keyof typeof KINDS;

/** Radius of the sphere around the authored origin that contains every atom. */
export function atomsRadius(atoms: readonly Atom[]): number {
  return Math.max(...atoms.map(([x, y, z, r]) => Math.hypot(x, y, z) + r));
}

/** A gold coin facing +Z with a rim and raised dots (one dot per phosphate). */
export function coinGeometry(face: string, rim: string, bumps: number, segments = 20): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const paintAll = (g: BufferGeometry, color: string): BufferGeometry => {
    const c = new Color(color);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new Float32BufferAttribute(arr, 3));
    return g;
  };
  parts.push(paintAll(new CylinderGeometry(1, 1, 0.24, segments).rotateX(Math.PI / 2), face));
  parts.push(paintAll(new TorusGeometry(1, 0.13, 8, segments), rim));
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 + Math.PI / 2;
    const g = new SphereGeometry(0.2, 8, 6);
    g.translate(Math.cos(a) * (bumps === 2 ? 0.34 : 0.4), Math.sin(a) * (bumps === 2 ? 0.0 : 0.4) + (bumps === 2 ? (i ? 0.3 : -0.3) : 0), 0.17);
    parts.push(paintAll(g, rim));
  }
  const geo = mergeGeometries(parts) ?? new SphereGeometry(1);
  parts.forEach((g) => g.dispose());
  return geo;
}

/** Merged ball geometry with vertex colours, in authored units (origin = authored pivot, no recentring). */
export function atomsGeometry(atoms: readonly Atom[], segments = 12): BufferGeometry {
  const parts = atoms.map(([x, y, z, r, color]) => {
    const g = new SphereGeometry(r, segments, Math.max(6, Math.round(segments * 0.66)));
    g.translate(x, y, z);
    const c = new Color(color);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new Float32BufferAttribute(arr, 3));
    return g;
  });
  const geo = mergeGeometries(parts) ?? new SphereGeometry(1);
  parts.forEach((g) => g.dispose());
  return geo;
}
