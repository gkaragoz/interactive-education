import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Env } from './env';

/** A patch of lipid bilayer from the painted `bilayer-tile` asset (2 x 2 tiles that join seamlessly), centred on (0, y, 0). */
export async function membraneTiles(env: Env, nx: number, nz: number, step: number, y: number): Promise<void> {
  const quality = env.ctx.quality;
  const cols = quality === 'low' ? Math.min(nx, 9) : nx;
  const set = await env.ctx.assets.instances('bilayer-tile', cols * nz, '#f1dcb0');
  const m = new Matrix4();
  const q = new Quaternion();
  const s = new Vector3(1, 1, 1);
  const p = new Vector3();
  for (let i = 0; i < cols; i++) {
    for (let k = 0; k < nz; k++) {
      p.set((i - (cols - 1) / 2) * step, y, (k - (nz - 1) / 2) * step);
      set.setMatrix(i * nz + k, m.compose(p, q, s));
    }
  }
  set.commit();
  env.group.add(set.group);
  env.own.push(set);
}
