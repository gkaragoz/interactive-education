import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Env, StationRt } from '../env';
import { assetInstances } from '../assetset';
import { hash01 } from '../paths';

/** Station 5: a granum, the painted stack of thylakoid sacs cut open, with its neighbours behind it. */
export async function granumStation(env: Env): Promise<StationRt> {
  const set = await assetInstances(env, 'thylakoid-stack', 4, '#8fc46a');
  const m = new Matrix4();
  const q = new Quaternion();
  const put = (i: number, x: number, y: number, z: number, s: number): void => {
    set.setMatrix(i, m.compose(new Vector3(x, y, z), q, new Vector3(s, s, s)));
  };
  put(0, 0.6, 0, 0, 2.7);
  put(1, -7.2, -1.6 + hash01(1), -4.5, 2.4);
  put(2, 8.2, 1.2, -5, 2.6);
  put(3, -2.5, 3.4, -7, 2.0);
  set.commit();
  return {};
}
