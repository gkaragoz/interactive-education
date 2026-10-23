import { CapsuleGeometry, Group, SphereGeometry, type BufferGeometry, type Float32BufferAttribute, type Sprite } from 'three';
import { COLORS } from '../palette';
import { paint } from '../geo';
import type { Kit } from '../kit';
import { buildHotObject } from './hot';
import { ELBOW, MUSCLE_CENTER, MUSCLE_RADII, SHOULDER } from './layout';
import { contractionAt, flexAt, heatAt } from './timing';

export interface Body {
  /** Group that turns about the elbow; children are in forearm-local coordinates. */
  forearm: Group;
  setPose(t: number): void;
  /** Hot spot sprite at the contact point (inside the forearm group). */
  heat: Sprite;
}

const sphere = (r: number, w = 20, h = 14): SphereGeometry => new SphereGeometry(r, w, h);

/** Fibre stripes along x on the muscle (vertex colours darken in thin lines). */
function stripes(geo: BufferGeometry, freq: number): void {
  const pos = geo.getAttribute('position');
  const col = geo.getAttribute('color') as Float32BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getZ(i), pos.getY(i));
    const k = 0.86 + 0.14 * Math.sin(a * freq + pos.getX(i) * 0.6);
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
}

/** Arm (static upper arm, forearm and flat hand that turn about the elbow), the biceps and the hot pot. */
export function buildBody(kit: Kit): Body {
  const skin = kit.clay('nv-skin');
  const seg = kit.detail === 0 ? 12 : 20;
  const hot = buildHotObject(kit);

  // upper arm + shoulder + elbow
  const um = kit.mesh(paint(new CapsuleGeometry(0.62, SHOULDER.x - ELBOW.x, 6, seg), COLORS.skin, 0.14), skin);
  um.rotation.z = Math.PI / 2;
  um.position.set((SHOULDER.x + ELBOW.x) / 2, SHOULDER.y, 0);
  kit.mesh(paint(sphere(0.78, seg, 14), COLORS.skin, 0.14), skin).position.copy(SHOULDER);
  kit.mesh(paint(sphere(0.6, seg, 14), COLORS.skin, 0.14), skin).position.copy(ELBOW);

  // biceps (swells and shortens)
  const mg = sphere(1, 28, 18);
  const mp = mg.getAttribute('position');
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i);
    const k = Math.sqrt(Math.max(0, 1 - x * x)); // spindle: radius (1 - x^2) instead of a round ellipsoid
    mp.setXYZ(i, x, mp.getY(i) * k, mp.getZ(i) * k);
  }
  mg.computeVertexNormals();
  paint(mg, COLORS.muscle, 0.2);
  stripes(mg, 7);
  const muscle = kit.mesh(mg, kit.clay('nv-muscle'));
  muscle.position.copy(MUSCLE_CENTER);

  // forearm and hand (local coordinates: x 0 at the elbow, negative toward the hand; the back of the hand faces the viewer)
  const forearm = new Group();
  forearm.position.copy(ELBOW);
  kit.root.add(forearm);
  kit.track({ dispose: () => forearm.removeFromParent() });
  const on = (geo: BufferGeometry): ReturnType<Kit['mesh']> => kit.mesh(paint(geo, COLORS.skin, 0.12), skin, forearm);
  const fa = on(new CapsuleGeometry(0.5, 4.2, 6, seg));
  fa.rotation.z = Math.PI / 2;
  fa.position.set(-2.6, 0, 0);
  const palm = on(sphere(1, 24, 16));
  palm.position.set(-6.05, 0, 0);
  palm.scale.set(1.05, 0.66, 0.34);
  // four fingers fan out toward the hot pot; thumb up
  [
    [0.4, 1.0, 0.08],
    [0.14, 1.18, 0.02],
    [-0.12, 1.04, -0.04],
    [-0.36, 0.82, -0.1],
  ].forEach(([y, len, tilt]) => {
    const f = on(new CapsuleGeometry(0.155, len!, 4, 10));
    f.rotation.z = Math.PI / 2 + tilt!;
    f.position.set(-6.9 - len! / 2 - 0.1, y!, 0);
  });
  const thumb = on(new CapsuleGeometry(0.18, 0.7, 4, 10));
  thumb.rotation.z = Math.PI / 2 - 0.9;
  thumb.position.set(-5.7, 0.62, 0);

  // contact hot spot at the fingertips (follows the hand)
  const heat = kit.sprite('#ff4a1c', 2.4, 0);
  heat.position.set(-8.0, 0.25, 0.3);
  forearm.add(heat);

  const setPose = (t: number): void => {
    forearm.rotation.z = flexAt(t);
    const c = contractionAt(t);
    muscle.scale.set(MUSCLE_RADII.x * (1 - 0.2 * c), MUSCLE_RADII.y * (1 + 0.45 * c), MUSCLE_RADII.z * (1 + 0.4 * c));
    muscle.position.y = MUSCLE_CENTER.y + 0.1 * c;
    (heat.material as { opacity: number }).opacity = 0.9 * heatAt(t) * (0.85 + 0.15 * Math.sin(t * 5));
    hot.setPose(t);
  };
  return { forearm, setPose, heat };
}
