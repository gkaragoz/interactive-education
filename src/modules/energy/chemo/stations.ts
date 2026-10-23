import { CapsuleGeometry, CylinderGeometry, Euler, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { Env, StationRt } from '../env';
import { organelleInstances } from '../organelles';
import { hash01 } from '../paths';
import { addInstanced, addMesh, glowMesh, gradientWash, type Item } from '../props';

export const VENT_TOP = [0.2, 2.8, 0.3] as const;
export const BACT = [5.8, -0.6, 0.4] as const;
export const WORMS = [-6.2, -4.4, 0.4] as const;

/** The only station of the chemosynthesis track: a dark seafloor with a hydrothermal vent, a bacterium and tube worms. */
export async function ventStation(env: Env): Promise<StationRt> {
  // water that gets darker with depth
  gradientWash(env, 260, [[-40, '#0d2630'], [-8, '#133746'], [-1, '#1d4c63'], [4, '#3b7a9c'], [9, '#6fb0d2'], [40, '#9fd0e6']], -9);
  // the seafloor and the chimney
  const floor = addMesh(env, new SphereGeometry(1, 40, 16), '#3b4a52');
  floor.scale.set(30, 1.8, 7);
  floor.position.set(0, -7.0, -1.5);
  const chimney = addMesh(env, new CylinderGeometry(0.8, 2.4, 9.4, 24), '#40454c');
  chimney.position.set(0, -2.2, 0);
  addMesh(env, new CylinderGeometry(1.0, 0.85, 0.5, 24), '#c8923c').position.set(0, 2.55, 0);
  const rocks: Item[] = [];
  for (let i = 0; i < 16; i++) rocks.push({ p: [-14 + hash01(i) * 28, -5.6 - hash01(i + 3) * 0.8, -3 + hash01(i + 7) * 3], s: [0.8 + hash01(i + 9) * 1.2, 0.5 + hash01(i + 11) * 0.7, 0.8], color: i % 3 ? '#4b565c' : '#6a5a4a' });
  addInstanced(env, new SphereGeometry(1, 10, 8), rocks, 'clay');
  // bacteria on the chimney wall, tube worms at its foot
  const rods: Item[] = [];
  for (let i = 0; i < 26; i++) {
    const y = -5.5 + hash01(i) * 7.5;
    const r = 2.4 - (y + 6.9) * 0.17;
    const a = (hash01(i + 40) - 0.5) * 2.6;
    rods.push({ p: [Math.sin(a) * (r + 0.1), y, Math.cos(a) * (r + 0.1)], r: [hash01(i) * 3, hash01(i + 2) * 3, hash01(i + 4) * 3], s: 0.7, color: '#9bd06a' });
  }
  addInstanced(env, new CapsuleGeometry(0.16, 0.35, 4, 8), rods, 'clay');
  const worms: Item[] = [];
  const tips: Item[] = [];
  for (let i = 0; i < 12; i++) {
    const h = 2.4 + hash01(i + 21) * 2.2;
    const x = WORMS[0] + (hash01(i) - 0.5) * 3.4;
    const z = (hash01(i + 5) - 0.5) * 2.2;
    const tilt = (hash01(i + 12) - 0.5) * 0.5;
    worms.push({ p: [x, -6 + h / 2, z], r: [0, 0, tilt], s: [1, h / 2.5, 1], color: '#efe9dc' });
    tips.push({ p: [x - Math.sin(tilt) * h * 0.5, -6 + h + 0.05, z], s: 0.34, color: '#d8453b' });
  }
  addInstanced(env, new CapsuleGeometry(0.2, 2.5, 4, 10), worms, 'clay');
  addInstanced(env, new SphereGeometry(1, 10, 8), tips, 'clay');
  // the representative bacterium: its envelope and nucleoid
  const q = env.ctx.quality === 'low' ? 2 : 1;
  const shell = await organelleInstances(env.ctx, 'envelope-bacterium', 1, { lod: q, gelOpacity: 0.4, skin: 'glossy' }, 'energy-bact');
  const nuc = await organelleInstances(env.ctx, 'nucleoid', 1, { lod: q }, 'energy-nucleoid');
  const m = new Matrix4();
  const qt = new Quaternion().setFromEuler(new Euler(0, 0, 0.15));
  shell.setMatrix(0, m.compose(new Vector3(...BACT), qt, new Vector3(0.36, 0.36, 0.36)));
  nuc.setMatrix(0, m.compose(new Vector3(BACT[0] - 0.4, BACT[1] - 0.3, BACT[2]), qt, new Vector3(0.45, 0.45, 0.45)));
  shell.commit();
  nuc.commit();
  env.group.add(shell.group, nuc.group);
  env.own.push(shell, nuc);
  // sun near the surface
  const sun = glowMesh(env, new SphereGeometry(1.3, 24, 16), '#ffd23f');
  sun.position.set(-9.5, 8.6, 0);
  return { animate: (t) => sun.scale.setScalar(1 + Math.sin(t * 2) * 0.03) };
}
