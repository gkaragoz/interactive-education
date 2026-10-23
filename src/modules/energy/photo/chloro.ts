import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Env, StationRt } from '../env';
import { organelleInstances } from '../organelles';

/** Station 2: the chloroplast on its own, envelope see-through so the grana show. */
export async function chloroStation(env: Env): Promise<StationRt> {
  const set = await organelleInstances(env.ctx, 'chloroplast', 1, { lod: env.ctx.quality === 'low' ? 1 : 0, gelOpacity: 0.4 }, 'energy-chloro');
  set.setMatrix(0, new Matrix4().compose(new Vector3(0, 0, 0), new Quaternion(), new Vector3(1.6, 1.6, 1.6)));
  set.commit();
  env.group.add(set.group);
  env.own.push(set);
  return {};
}
