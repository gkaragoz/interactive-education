import { Box3, Group, type Mesh, type Object3D } from 'three';
import type { ModuleLabel, Vec3 } from '../../scene';
import type { Kit, TrackRig } from './kit';
import { lerp, ramp, smooth } from './math';

/** The opening shot of a track: a painted hero asset on a soft veil, then the camera flies into the working scene as the veil fades. */
export interface OverviewSpec {
  asset: string;
  origin: Vec3;
  /** Euler rotation (x, y, z) of the hero. */
  rot: Vec3;
  scale: number;
  /** Camera at t = 0: where it looks and from how far. */
  focus: Vec3;
  dist: number;
  labels(t: number): ModuleLabel[];
  /** Extra things around the hero (e.g. drifting transmitter molecules), posed from t. */
  extra?(kit: Kit, parent: Group): Promise<(t: number) => void>;
}

/** Overview lasts until FLY_END; the veil and the hero are gone a little earlier (no pops: both fade by scale and opacity). */
export const FADE: readonly [number, number] = [1.8, 3.2];
export const FLY_END = 3.4;
const VEIL_Z = 4;
const HERO_Z = 6;

/** Wraps a track rig with an opening overview. Everything stays a pure function of t. */
export async function withOverview(kit: Kit, rig: TrackRig, spec: OverviewSpec): Promise<TrackRig> {
  const veil = kit.band(
    -30,
    30,
    -18,
    18,
    VEIL_Z,
    [
      [0, '#f6e7c6'],
      [1, '#f3e1bd'],
    ],
    1,
  );
  // the veil is huge: it must not stretch the stage's framing box (which is measured once, at t = 0)
  veil.geometry.boundingBox = new Box3().setFromCenterAndSize(veil.position, veil.position.clone().multiplyScalar(0));
  veil.frustumCulled = false;
  // unlike the glow quads the veil stays in the AO depth pass: it hides the scene behind it, so no ghost occlusion shows through
  Object.assign(veil, { isPoints: false });
  veil.renderOrder = 65; // after every scene object (sprites go up to 60), before the hero
  const hero = new Group();
  hero.position.set(spec.origin[0], spec.origin[1], HERO_Z + spec.origin[2]);
  hero.rotation.set(...spec.rot);
  const model = await kit.ctx.assets.loadGlb(spec.asset);
  hero.add(model);
  kit.root.add(hero);
  kit.track({ dispose: () => hero.removeFromParent() });
  const extra = spec.extra ? await spec.extra(kit, hero) : null;
  // the hero is in front of the veil: depth test hides the veil behind it
  hero.traverse((o: Object3D) => {
    if ((o as Mesh).isMesh) o.renderOrder = 70;
  });

  const seek = (t: number): void => {
    const fade = 1 - ramp(t, FADE[0], FADE[1]);
    hero.visible = fade > 0.001;
    hero.scale.setScalar(Math.max(spec.scale * fade, 1e-4));
    (veil.material as { opacity: number }).opacity = fade;
    veil.visible = fade > 0.001;
    extra?.(t);
    rig.seek(t);
  };

  return {
    ...rig,
    seek,
    cameraAt(t) {
      const main = rig.cameraAt(t);
      if (t >= FLY_END) return main;
      const s = smooth((t - 1.2) / (FLY_END - 1.2));
      const from = { position: [spec.focus[0], spec.focus[1], spec.focus[2] + spec.dist] as Vec3, target: spec.focus };
      const mix = (a: Vec3, b: Vec3): Vec3 => [lerp(a[0], b[0], s), lerp(a[1], b[1], s), lerp(a[2], b[2], s)];
      return { position: mix(from.position, main.position), target: mix(from.target, main.target) };
    },
    labelsAt: (t) => (t < FADE[1] - 0.3 ? spec.labels(t) : rig.labelsAt(t)),
  };
}
