import { CapsuleGeometry, Euler, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import type { Env, StationRt } from '../env';
import { membraneTiles } from '../membrane';
import { organelleInstances } from '../organelles';
import { hash01 } from '../paths';
import { addInstanced, addMesh, flowArrows, guideTube, wash, type Item } from '../props';
import { assetInstances } from '../assetset';
import { KREBS, KREBS_R, MX } from './layout';

/** Mitochondria of the cell station (position, scale, tilt). */
export const CELL_MITO: readonly (readonly [number, number, number, number, number])[] = [
  [3.0, -0.4, 0.8, 0.95, 0.4],
  [-2.2, -2.6, 0.4, 0.8, -0.5],
  [0.8, 2.3, -0.4, 0.85, 0.15],
  [-5.4, -0.8, 0.6, 0.75, 0.9],
  [4.2, -3.1, -0.2, 0.7, -0.2],
];
export const OVERVIEW = { mito: [3.2, 0, 0] as const, scale: 1.5 };

/** R0: an animal cell with a nucleus and several mitochondria; the cell outline is see-through. */
export async function cellStation(env: Env): Promise<StationRt> {
  const body = addMesh(env, new SphereGeometry(1, 40, 24), '#f6d9b0', 'glass', 'energy-rcell', 0.35);
  body.scale.set(8.4, 5.4, 3.2);
  const q = env.ctx.quality === 'low' ? 2 : 1;
  const mito = await organelleInstances(env.ctx, 'mitochondrion', CELL_MITO.length, { lod: q, gelOpacity: 0.42, skin: 'glossy' }, 'energy-rmito');
  const nuc = await organelleInstances(env.ctx, 'nucleus', 1, { lod: 1 }, 'energy-rnucleus');
  const m = new Matrix4();
  CELL_MITO.forEach((c, i) => {
    m.compose(new Vector3(c[0], c[1], c[2]), new Quaternion().setFromEuler(new Euler(0, 0, c[4])), new Vector3(c[3], c[3], c[3]));
    mito.setMatrix(i, m);
  });
  mito.commit();
  nuc.setMatrix(0, m.compose(new Vector3(-2.6, 2.7, -0.8), new Quaternion(), new Vector3(0.4, 0.4, 0.4)));
  nuc.commit();
  env.group.add(mito.group, nuc.group);
  env.own.push(mito, nuc);
  return {};
}

/** R1: cytoplasm on the left, the cut-open mitochondrion (cristae, matrix, synthases) on the right. */
export async function overviewStation(env: Env): Promise<StationRt> {
  wash(env, 140, 80, 0, 0, -6, '#f5d6a6', 0.55);
  const set = await assetInstances(env, 'mitochondrion-crista-detail', 1);
  const [x, y, z] = OVERVIEW.mito;
  set.setMatrix(0, new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(OVERVIEW.scale, OVERVIEW.scale, OVERVIEW.scale)));
  set.commit();
  return {};
}

/** R3: the inner membrane seen from the side: intermembrane space above, matrix below. */
export async function membraneStation(env: Env): Promise<StationRt> {
  wash(env, 80, 8, 0, 6, -5, '#f3c28a', 0.35);
  wash(env, 80, 8, 0, -6, -5, '#e8a56a', 0.4);
  await membraneTiles(env, 13, 3, 2, 0);
  const pumps = flowArrows(env, [MX.c1, MX.c3, MX.c4].map((x, i) => ({ x: x + 1.3, y: 0.2, z: 1.9, dir: 1 as const, len: 3.6, t0: 39.2, t1: 48.5, period: 1.8 + i * 0.1 })));
  const through = flowArrows(env, [{ x: MX.synth + 1.2, y: -0.4, z: 1.9, dir: -1, len: 3.8, t0: 41.5, t1: 51.5 }]);
  const wire = guideTube(env, [[MX.c1, -0.6, 0.9], [(MX.c1 + MX.c3) / 2, 0.5, 1.1], [MX.c3, 0.6, 1.1], [(MX.c3 + MX.c4) / 2, 2.9, 1.1], [MX.c4, 2.4, 1.1], [MX.c4, -0.7, 0.9]], 39, 51.5);
  return {
    animate: (t) => {
      pumps(t);
      through(t);
      wire(t);
    },
  };
}

/** R2: the matrix close-up. Cristae fold in from the edges; the ring in the middle is where the Krebs cycle turns. */
export async function matrixStation(env: Env): Promise<StationRt> {
  wash(env, 140, 80, 0, 0, -6, '#f9dcae', 0.6);
  const plates: Item[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -10 + i * 2.5;
    plates.push({ p: [x, 8.3, -1.2], r: [0, 0, (hash01(i) - 0.5) * 0.3], s: [0.55, 2.8, 2.2], color: '#ee8f3c' });
    plates.push({ p: [x + 1.2, -8.6, -1.2], r: [0, 0, (hash01(i + 9) - 0.5) * 0.3], s: [0.55, 2.8, 2.2], color: '#e8842f' });
  }
  addInstanced(env, new CapsuleGeometry(1, 1.6, 6, 12), plates, 'clay');
  const granules: Item[] = [];
  for (let i = 0; i < 22; i++) granules.push({ p: [-11 + hash01(i * 3) * 22, -6 + hash01(i * 5 + 1) * 12, -2.5 - hash01(i) * 1.5], s: 0.22 + hash01(i + 4) * 0.2, color: '#f2c27c' });
  addInstanced(env, new SphereGeometry(1, 10, 8), granules, 'clay');
  const ring = addMesh(env, new TorusGeometry(KREBS_R, 0.1, 8, 48), '#e0b04a');
  ring.position.set(KREBS[0], KREBS[1], KREBS[2]);
  const dna = addMesh(env, new TorusGeometry(1.0, 0.07, 8, 32), '#b79ad0');
  dna.position.set(-8, -3.2, -1.5);
  dna.rotation.set(0.6, 0.4, 0);
  return {};
}
