import { Vector3 } from 'three';
import type { CameraRig } from './cameraRig';
import type { CellScene } from './cellScene';

/** The picked instance when the click selected this id, otherwise the instance nearest to the camera. */
export function chooseFocusIndex(scene: CellScene | null, camera: Vector3, id: string | null, click: { id: string; index: number } | null): number | null {
  if (!id || !scene) return null;
  if (click && click.id === id) return click.index;
  return scene.focusTarget(id, camera)?.index ?? null;
}

/** Flies the camera to the selected instance (or home when the selection is a shell part or Isolate is on). */
export function focusCamera(scene: CellScene | null, rig: CameraRig, id: string | null, index: number | null, closeUp: boolean): void {
  const target = id && scene ? scene.focusTarget(id, rig.camera.position) : null;
  const set = id ? scene?.sets.get(id) : undefined;
  if (scene && target && set) {
    const inst = index !== null ? set.instances[index] : undefined;
    const centre = inst ? scene.group.localToWorld(new Vector3(...inst.position)) : target.center;
    rig.focusOn(centre, inst ? inst.radius * scene.scale : target.radius, closeUp);
  } else if (closeUp || id) rig.resetView();
}
