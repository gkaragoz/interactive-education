import { BoxGeometry, CapsuleGeometry, CylinderGeometry, Euler, Group, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Env, StationRt } from '../env';
import { organelleInstances } from '../organelles';
import { hash01 } from '../paths';
import { addInstanced, addMesh, glowMesh, type Item } from '../props';

export const SUN: readonly [number, number, number] = [8.2, 4.3, 0];
export const STOMA: readonly [number, number, number] = [-1.8, -1.65, 0];
export const VEIN_X = 4.8;

/** Station 0: a leaf in cross-section with the sun; CO2 enters at the stoma, water climbs the vein. */
export async function leafStation(env: Env): Promise<StationRt> {
  // upper and lower epidermis (the lower one has a gap for the stoma)
  addMesh(env, new BoxGeometry(14, 0.28, 3.2).translate(0, 1.7, 0), '#a8d584');
  addMesh(env, new BoxGeometry(5.2, 0.28, 3.2).translate(-4.4, -1.7, 0), '#a8d584');
  addMesh(env, new BoxGeometry(8.6, 0.28, 3.2).translate(2.7, -1.7, 0), '#a8d584');
  // two guard cells around the stoma
  const guard = (x: number): void => {
    addMesh(env, new CapsuleGeometry(0.3, 0.9, 6, 10).rotateX(Math.PI / 2).translate(x, -1.66, 0), '#5fa83f');
  };
  guard(STOMA[0] - 0.45);
  guard(STOMA[0] + 0.45);
  // palisade cells (see-through, with chloroplast specks) and spongy cells
  const palisade: Item[] = [];
  const specks: Item[] = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 14; i++) {
      const x = -6.5 + i + (row ? 0.3 : 0);
      const z = row ? 0.8 : -0.7;
      palisade.push({ p: [x, 0.78, z], s: [1, 1.05, 1], color: '#6cb24a' });
      for (let k = 0; k < 3; k++) specks.push({ p: [x + (hash01(i * 7 + k + row * 50) - 0.5) * 0.4, 0.5 + hash01(i * 3 + k * 5 + row) * 0.7, z + (hash01(i + k * 9) - 0.5) * 0.4], s: 0.15, color: '#2f8f3a' });
    }
  }
  addInstanced(env, new CapsuleGeometry(0.46, 0.55, 6, 12), palisade, 'wall', 'energy-cell', 0.45);
  addInstanced(env, new SphereGeometry(1, 8, 6), specks, 'clay');
  const spongy: Item[] = [];
  for (let i = 0; i < 24; i++) {
    const x = -6.4 + (i % 12) * 1.18 + (i >= 12 ? 0.55 : 0);
    const y = i >= 12 ? -1.05 : -0.35;
    spongy.push({ p: [x + (hash01(i) - 0.5) * 0.2, y + (hash01(i + 40) - 0.5) * 0.15, (hash01(i + 9) - 0.5) * 1.8], s: 0.48 + hash01(i + 3) * 0.12, color: i % 3 === 0 ? '#9fcf72' : '#88c15f' });
  }
  addInstanced(env, new SphereGeometry(1, 12, 8), spongy, 'clay');
  // the vein and stem carrying water
  addMesh(env, new CylinderGeometry(0.5, 0.5, 14, 14, 1, true).rotateX(Math.PI / 2).scale(1, 1, 0.22).translate(VEIN_X, -0.1, 0), '#e8d9a8');
  addMesh(env, new CylinderGeometry(0.5, 0.5, 7, 14, 1, true).translate(VEIN_X, -5.2, 0), '#e8d9a8', 'glass', 'energy-stem', 0.5);
  addMesh(env, new CylinderGeometry(0.3, 0.3, 7, 12).translate(VEIN_X, -5.2, 0), '#78bde8', 'water', 'energy-water', 0.55);
  // sun with rays
  const sun = glowMesh(env, new SphereGeometry(1.35, 24, 16), '#ffd23f');
  sun.position.set(...SUN);
  const rays = new Group();
  const rayGeo = new CylinderGeometry(0.06, 0.2, 1.6, 6);
  const rayMat = glowMesh(env, rayGeo, '#ffe27a', 0.9);
  rayMat.removeFromParent();
  for (let i = 0; i < 12; i++) {
    const ray = rayMat.clone();
    const a = (i / 12) * Math.PI * 2;
    ray.position.set(Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0);
    ray.rotation.z = a - Math.PI / 2;
    rays.add(ray);
  }
  rays.position.set(...SUN);
  env.group.add(rays);
  env.own.push({ dispose: () => rays.removeFromParent() });
  return {
    animate: (t) => {
      rays.rotation.z = t * 0.15;
      sun.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
    },
  };
}

export const CELL_POS: readonly (readonly [number, number, number])[] = [
  [-3.3, 2.05, 0.5],
  [-1.0, 2.25, -0.4],
  [1.4, 2.05, 0.4],
  [3.4, 1.3, -0.3],
  [3.5, -1.3, 0.4],
  [1.2, -2.1, -0.2],
  [-1.8, -2.05, 0.3],
];

/** Station 1: one plant cell with a wall, a vacuole, a nucleus and chloroplasts. */
export async function cellStation(env: Env): Promise<StationRt> {
  addMesh(env, new RoundedBoxGeometry(10, 5.9, 3.8, 5, 0.8), '#b6d98f', 'wall', 'energy-wall', 0.3);
  const vac = addMesh(env, new SphereGeometry(1, 28, 18), '#7fc0e6', 'water', 'energy-vac', 0.75);
  vac.scale.set(3.0, 1.7, 1.2);
  vac.position.set(-0.6, -0.5, -0.3);
  const q = env.ctx.quality === 'low' ? 2 : 1;
  const chlor = await organelleInstances(env.ctx, 'chloroplast', CELL_POS.length, { lod: q, gelOpacity: 0.45 }, 'energy-chloro-small');
  const nuc = await organelleInstances(env.ctx, 'nucleus', 1, { lod: 1, gelOpacity: 0.3 }, 'energy-nucleus');
  const m = new Matrix4();
  CELL_POS.forEach((p, i) => {
    m.compose(new Vector3(...p), new Quaternion().setFromEuler(new Euler(0, 0, (hash01(i) - 0.5) * 0.6)), new Vector3(0.42, 0.42, 0.42));
    chlor.setMatrix(i, m);
  });
  chlor.commit();
  nuc.setMatrix(0, m.compose(new Vector3(-3.4, -1.3, 0.2), new Quaternion(), new Vector3(0.3, 0.3, 0.3)));
  nuc.commit();
  env.group.add(chlor.group, nuc.group);
  env.own.push(chlor, nuc);
  return {};
}
