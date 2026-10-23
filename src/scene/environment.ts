import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  PMREMGenerator,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Procedural studio lighting for image-based light and reflections (no HDR file to download). */
export function createEnvironmentTexture(renderer: WebGLRenderer): Texture {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.035).texture;
  room.dispose();
  pmrem.dispose();
  return texture;
}

export interface StudioLights {
  group: Group;
  key: DirectionalLight;
  /** Fits the shadow camera around a cell of the given radius. */
  fit(radius: number): void;
  dispose(): void;
}

export function createStudioLights(shadowMapSize: number, shadows: boolean): StudioLights {
  const group = new Group();
  const key = new DirectionalLight(new Color('#ffe2bc'), 2.9);
  key.position.set(18, 30, 24);
  key.castShadow = shadows;
  key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.06;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 12;
  const fill = new HemisphereLight(new Color('#c9dcff'), new Color('#b8997a'), 0.6);
  group.add(key, key.target, fill);
  return {
    group,
    key,
    fit(radius: number): void {
      const cam = key.shadow.camera;
      cam.left = cam.bottom = -radius * 1.6;
      cam.right = cam.top = radius * 1.6;
      cam.near = 1;
      cam.far = radius * 12;
      key.position.set(radius * 0.7, radius * 1.2, radius * 0.9);
      cam.updateProjectionMatrix();
    },
    dispose(): void {
      key.shadow.map?.dispose();
    },
  };
}
