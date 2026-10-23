import type { Env } from './env';
import type { InstanceSet } from '../../scene';

/** `count` instances of a painted module asset added to the station (static props such as the cut-open mitochondrion). */
export async function assetInstances(env: Env, id: string, count: number, color?: string): Promise<InstanceSet> {
  const set = await env.ctx.assets.instances(id, count, color);
  env.group.add(set.group);
  env.own.push(set);
  return set;
}

export const asset = assetInstances;
