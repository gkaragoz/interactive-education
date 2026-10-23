import { CatmullRomCurve3, CylinderGeometry, Group, SphereGeometry, TubeGeometry, Vector3 } from 'three';
import type { Env, Plan, StationRt } from '../env';
import { addInstanced, addMesh, glowMesh, wash, type Item } from '../props';

export const LAMP_BASE = -9.5;

/** Station 4: a pond plant in a beaker with a lamp; the lamp distance and the bubbles follow the options. */
export async function labStation(env: Env): Promise<StationRt> {
  wash(env, 40, 20, 0, 0, -5, '#eadfc4', 0.5);
  addMesh(env, new CylinderGeometry(2.4, 2.4, 0.3, 32).translate(0, -2.55, 0), '#e4dccb');
  addMesh(env, new CylinderGeometry(2.4, 2.25, 5, 40, 1, true).translate(0, 0, 0), '#e8f2f7', 'glass', 'energy-glass', 0.5);
  addMesh(env, new CylinderGeometry(2.3, 2.15, 4.1, 40).translate(0, -0.45, 0), '#8cc8e8', 'water', 'energy-lab', 0.45);
  const curve = new CatmullRomCurve3([new Vector3(0, -2.3, 0), new Vector3(0.35, -1.2, 0.1), new Vector3(-0.25, -0.4, 0), new Vector3(0.1, 0.3, 0.1)]);
  addMesh(env, new TubeGeometry(curve, 24, 0.07, 6), '#4f9a3c');
  const leaves: Item[] = [];
  for (let i = 0; i < 26; i++) {
    const u = 0.05 + (i / 26) * 0.95;
    const c = curve.getPoint(u);
    const a = i * 2.4;
    leaves.push({ p: [c.x + Math.cos(a) * 0.35, c.y, c.z + Math.sin(a) * 0.25], r: [0.3, a, 0.5], s: [0.55, 0.1, 0.2], color: i % 2 ? '#58a845' : '#6bb855' });
  }
  addInstanced(env, new SphereGeometry(1, 10, 8), leaves, 'clay');
  // lamp
  const lamp = new Group();
  const bulb = glowMesh(env, new SphereGeometry(0.8, 20, 14), '#fff1a8');
  bulb.removeFromParent();
  lamp.add(bulb);
  const cap = addMesh(env, new CylinderGeometry(0.5, 0.7, 1.4, 16).rotateZ(Math.PI / 2).translate(-1.1, 0, 0), '#8c7a64');
  cap.removeFromParent();
  lamp.add(cap);
  const beam = glowMesh(env, new CylinderGeometry(2.6, 0.3, 1, 24, 1, true).rotateZ(-Math.PI / 2), '#fff3b0', 0.22);
  beam.removeFromParent();
  lamp.add(beam);
  lamp.position.set(LAMP_BASE, 0.4, 0);
  env.group.add(lamp);
  env.own.push({ dispose: () => lamp.removeFromParent() });
  return {
    animate: (t, plan?: Plan) => {
      const x = plan?.extras?.lampX ?? -7;
      lamp.position.x = x;
      const dist = 0 - 2.4 - x;
      beam.scale.set(dist, 1, 1);
      beam.position.x = dist / 2;
      bulb.scale.setScalar(1 + Math.sin(t * 6) * 0.02);
    },
  };
}
