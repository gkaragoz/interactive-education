import { CylinderGeometry, Mesh, MeshBasicMaterial, TorusGeometry, Vector3 } from 'three';
import type { Env, StationRt } from '../env';
import { addMesh, flowArrows, guideTube, wash } from '../props';
import { ramp } from '../math';
import { membraneTiles } from '../membrane';

export const RING_C: readonly [number, number, number] = [2.6, 7.0, 0];
export const RING_R = 2.0;
export const DEPOT: readonly [number, number, number] = [7.6, 7.0, 0];
export const X = { psII: -6.6, cyt: -2.7, psI: 1.1, atpase: 5.7 } as const;

/**
 * Station 3: inside the chloroplast, authored with the lumen below and the stroma above, and shown mirrored (lumen up) so the lumen faces of
 * the photosystems, the painted detail, look at the camera. Calvin ring in the stroma.
 */
export async function innerStation(env: Env): Promise<StationRt> {
  wash(env, 44, 9, 0, 6.2, -5, '#cfe3a0', 0.3);
  wash(env, 44, 6, 0, -3.6, -5, '#8fc3ea', 0.42);
  await membraneTiles(env, 13, 3, 2, 0);
  const ringGeo = new TorusGeometry(RING_R, 0.1, 8, 48);
  const ring: Mesh = addMesh(env, ringGeo, '#c9dba0');
  ring.position.set(...RING_C);
  // soft beams of light from the upper left onto the two photosystems (brightness follows the light option)
  const beams = [X.psII, X.psI].map((x) => {
    const from = new Vector3(-13, -13, -0.5);
    const to = new Vector3(x, -1.4, 0);
    const dir = to.clone().sub(from);
    const geo = new CylinderGeometry(0.08, 0.9, dir.length(), 14, 1, true);
    const mat = new MeshBasicMaterial({ color: '#fff0a0', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize().negate());
    mesh.renderOrder = 15;
    env.group.add(mesh);
    env.own.push({ dispose: () => (geo.dispose(), mat.dispose(), mesh.removeFromParent()) });
    return mat;
  });
  const pump = flowArrows(env, [
    { x: X.cyt - 0.9, y: 0, z: 1.4, dir: -1, len: 3, t0: 16.5, t1: 25 },
    { x: X.cyt + 0.9, y: 0, z: 1.4, dir: -1, len: 3, t0: 16.5, t1: 25, period: 2 },
  ]);
  const through = flowArrows(env, [{ x: X.atpase + 1.0, y: 0.2, z: 1.3, dir: 1, len: 3.2, t0: 18.6, t1: 25.8 }]);
  const wire = guideTube(env, [[X.psII, 0.9, 0.5], [-4.6, 1.2, 0.7], [X.cyt, 0.7, 0.7], [-0.8, 1.1, 0.7], [X.psI, 0.8, 0.5]], 14.4, 26);
  return {
    animate: (t, plan) => {
      pump(t);
      through(t);
      wire(t);
      const on = ramp(t, 9.2, 10.5) * (1 - ramp(t, 25, 27));
      const k = (plan?.extras?.light ?? 1) * (0.1 + 0.04 * Math.sin(t * 3));
      for (const m of beams) m.opacity = on * k;
    },
  };
}
