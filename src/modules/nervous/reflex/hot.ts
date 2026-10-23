import { Color, Group, LatheGeometry, MeshBasicMaterial, SphereGeometry, TorusGeometry, Vector2, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { paint } from '../geo';
import { noAO, type Kit } from '../kit';
import { InstancePool } from '../pool';
import { PLATE } from './layout';

export interface HotObject {
  setPose(t: number): void;
}

/** A glowing hot pot on a burner, with steam: the "hot object". The fingertips of the hand rest on its right wall. */
export function buildHotObject(kit: Kit): HotObject {
  const g = new Group();
  g.position.copy(PLATE);
  kit.root.add(g);
  kit.track({ dispose: () => g.removeFromParent() });
  const seg = kit.detail === 0 ? 20 : 36;

  // pot body: a lathe profile (radius, height), slightly bulging, with a rim
  const prof = [
    [0.0, -1.5],
    [1.35, -1.5],
    [1.75, -1.2],
    [1.95, -0.4],
    [1.95, 0.8],
    [1.85, 1.3],
    [1.95, 1.4],
    [0.0, 1.4],
  ].map(([r, y]) => new Vector2(r, y));
  const potMat = kit.clay('nv-pot');
  kit.mesh(paint(new LatheGeometry(prof, seg), '#e2552e', 0.1), potMat, g);
  const lid = kit.mesh(paint(new SphereGeometry(1.9, seg, 10, 0, Math.PI * 2, 0, 0.9), '#cf4426', 0.1), potMat, g);
  lid.position.y = 1.3;
  lid.scale.y = 0.4;
  kit.mesh(paint(new SphereGeometry(0.28, 14, 10), '#7b4a3a', 0.1), potMat, g).position.y = 1.78;
  for (const sx of [-1, 1]) {
    const ear = kit.mesh(paint(new TorusGeometry(0.34, 0.12, 8, 16), '#7b4a3a', 0.1), potMat, g);
    ear.position.set(sx * 2.05, 0.5, 0);
    ear.rotation.y = Math.PI / 2 - 0.15;
  }
  // burner under it
  const base = kit.clay('nv-burner');
  kit.mesh(paint(new RoundedBoxGeometry(5.4, 0.6, 2.8, 4, 0.2), '#5e5470', 0.2), base, g).position.y = -1.95;
  const flameMat = new MeshBasicMaterial({
    color: new Color(1.7, 0.6, 0.15),
    toneMapped: false,
  });
  kit.track(flameMat);
  const ring = kit.mesh(new TorusGeometry(1.5, 0.09, 8, 36), flameMat, g);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.6;

  const glow = kit.sprite('#ff7a30', 8, 0.55);
  glow.position.set(PLATE.x, PLATE.y, -0.4);

  // steam wisps: rise, swell and vanish by scaling away
  const steamMat = new MeshBasicMaterial({
    color: '#fff0dc',
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    toneMapped: false,
  });
  kit.track(steamMat);
  const steam = new InstancePool(null, steamMat, 10, 12);
  steam.mesh.renderOrder = 50;
  noAO(steam.mesh);
  kit.root.add(steam.mesh);
  kit.track(steam);
  const tmp = new Vector3();
  const mat = potMat;
  mat.emissive.set('#ff4a14');
  return {
    setPose(t) {
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.2 + i / 10) % 1;
        const wob = Math.sin(t * 1.3 + i * 2.1) * 0.35;
        tmp.set(PLATE.x + ((i % 5) - 2) * 0.5 + wob, PLATE.y + 2.0 + ph * 3.6, 0.2 + (i % 3) * 0.3);
        steam.set(i, tmp, 0.42 * Math.sin(ph * Math.PI) ** 0.8 * (0.7 + (0.3 * (i % 3)) / 2));
      }
      steam.commit();
      const pulse = 0.5 + 0.06 * Math.sin(t * 3);
      mat.emissiveIntensity = pulse;
      flameMat.color.setRGB(1.7 * (0.94 + 0.06 * Math.sin(t * 7)), 0.6, 0.15);
      glow.scale.setScalar(7.6 + 0.4 * Math.sin(t * 2.4));
    },
  };
}
