import { BoxGeometry, CapsuleGeometry, CylinderGeometry, LatheGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3 } from 'three';
import type { Env, Plan, StationRt } from '../env';
import { ramp } from '../math';
import { organelleInstances } from '../organelles';
import { hash01 } from '../paths';
import { addInstanced, addMesh, chamber, wash, type Item } from '../props';

export const F_CELL = 0;
export const F_MUSCLE = 1;
export const F_YEAST = 2;
export const F_COMPARE = 3;
export const F_FLASK = 4;

/** F0: a cell without oxygen: the mitochondrion on the right is idle (crossed out). */
export async function cellStation(env: Env): Promise<StationRt> {
  const body = addMesh(env, new SphereGeometry(1, 40, 24), '#f6d9b0', 'glass', 'energy-fcell', 0.3);
  body.scale.set(14, 7.2, 3.2);
  const mito = await organelleInstances(env.ctx, 'mitochondrion', 1, { lod: env.ctx.quality === 'low' ? 2 : 1, gelOpacity: 0.42, skin: 'glossy' }, 'energy-fmito');
  mito.setMatrix(0, new Matrix4().compose(new Vector3(3.8, -0.4, 0), new Quaternion(), new Vector3(1.4, 1.4, 1.4)));
  mito.commit();
  env.group.add(mito.group);
  env.own.push(mito);
  const bar = (rot: number): void => {
    const m = addMesh(env, new BoxGeometry(5.2, 0.5, 0.5), '#d8453b');
    m.position.set(3.8, 0, 1.6);
    m.rotation.z = rot;
  };
  bar(Math.PI / 4);
  bar(-Math.PI / 4);
  const ringMesh = addMesh(env, new TorusGeometry(2.6, 0.2, 8, 40), '#d8453b');
  ringMesh.position.set(3.8, 0, 1.6);
  return {};
}

/** F1: a muscle cell: parallel fibres behind the cytoplasm. */
export async function muscleStation(env: Env): Promise<StationRt> {
  wash(env, 140, 80, 0, 0, -6, '#f6d6c0', 0.55);
  const fibres: Item[] = [];
  for (let i = 0; i < 9; i++) fibres.push({ p: [0, -7.2 + i * 1.8, -4.2], r: [0, 0, Math.PI / 2], s: [1, 1, 1], color: i % 2 ? '#f0bdb0' : '#e9a99f' });
  addInstanced(env, new CapsuleGeometry(0.55, 24, 6, 14), fibres, 'clay');
  return {};
}

/** F2: a yeast cell with a bud. */
export async function yeastStation(env: Env): Promise<StationRt> {
  wash(env, 140, 80, 0, 0, -6, '#f7efdc', 0.6);
  chamber(env, '#ecd49a', [11, 6.6, 3.6], [0, 0, 0]);
  chamber(env, '#ecd49a', [3.4, 3.0, 2.4], [11.2, 4.6, 0]);
  const nuc = await organelleInstances(env.ctx, 'nucleus', 1, { lod: env.ctx.quality === 'low' ? 2 : 1 }, 'energy-ynucleus');
  nuc.setMatrix(0, new Matrix4().compose(new Vector3(-6.6, 3.4, -1.2), new Quaternion(), new Vector3(0.45, 0.45, 0.45)));
  nuc.commit();
  env.group.add(nuc.group);
  env.own.push(nuc);
  return {};
}

/** F3: two platforms for the comparison of ATP yields. */
export async function compareStation(env: Env): Promise<StationRt> {
  wash(env, 140, 80, 0, 0, -6, '#f2e6c8', 0.5);
  addMesh(env, new CylinderGeometry(3.2, 3.4, 0.5, 32).translate(-6, -3.4, 0), '#e6d7b4');
  addMesh(env, new CylinderGeometry(5.4, 5.6, 0.5, 40).translate(4.6, -3.4, 0), '#e6d7b4');
  return {};
}

/** F4: yeast in sugar water in a flask, a balloon on top that fills with CO2. */
export async function flaskStation(env: Env): Promise<StationRt> {
  wash(env, 140, 80, 0, 0, -6, '#eadfc4', 0.5);
  const profile = [new Vector2(0.01, -3.2), new Vector2(3.4, -3.2), new Vector2(3.3, -2.4), new Vector2(1.0, 1.6), new Vector2(0.9, 3.4), new Vector2(1.1, 3.6)];
  addMesh(env, new LatheGeometry(profile, 40), '#cfe6ee', 'wall', 'energy-flask', 0.38);
  const liquid = [new Vector2(0.01, -3.1), new Vector2(3.25, -3.1), new Vector2(3.15, -2.4), new Vector2(2.1, -1.0), new Vector2(0.01, -1.0)];
  addMesh(env, new LatheGeometry(liquid, 40), '#e9d6a0', 'water', 'energy-sugar', 0.5);
  const specks: Item[] = [];
  for (let i = 0; i < 40; i++) specks.push({ p: [(hash01(i) - 0.5) * 4.6, -2.9 + hash01(i + 5) * 1.7, (hash01(i + 9) - 0.5) * 3.0], s: 0.09, color: '#c9a45c' });
  addInstanced(env, new SphereGeometry(1, 8, 6), specks, 'clay');
  addMesh(env, new CylinderGeometry(0.75, 0.9, 0.5, 20).translate(0, 3.8, 0), '#d9b08c');
  const balloon = addMesh(env, new SphereGeometry(1, 28, 20), '#e0557a');
  return {
    animate: (t: number, plan?: Plan) => {
      const k = ramp(t, plan?.extras?.t0 ?? 46.8, plan?.extras?.t1 ?? 49.8);
      const r = 0.4 + 1.9 * k;
      balloon.scale.set(r, r * 1.15, r);
      balloon.position.set(0, 4.0 + r * 1.1, 0);
    },
  };
}

