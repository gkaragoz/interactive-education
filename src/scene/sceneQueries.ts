import { Matrix4, Ray, Sphere, Vector3, type Raycaster } from 'three';
import type { CellScene, PickResult } from './cellScene';
import { shellSdf, type PlacedInstance } from './layout';

const tmp = new Vector3();

function worldPosition(scene: CellScene, inst: PlacedInstance): Vector3 {
  return scene.group.localToWorld(new Vector3(...inst.position));
}

/** Nearest organelle (sphere test, skipping clipped and hidden ones) or shell part under the ray (world space). */
export function pickInScene(scene: CellScene, raycaster: Raycaster): PickResult | null {
  scene.group.updateMatrixWorld();
  const inverse = new Matrix4().copy(scene.group.matrixWorld).invert();
  const ray = new Ray().copy(raycaster.ray).applyMatrix4(inverse);
  const clipY = scene.cutaway.isActive ? scene.cutaway.plane.constant : null;
  let best: PickResult | null = null;
  const sphere = new Sphere();
  const hit = new Vector3();
  for (const set of scene.sets.values()) {
    if (!set.isVisible) continue;
    for (const index of set.visibleIndices()) {
      const inst = set.instances[index] as PlacedInstance;
      sphere.set(new Vector3(...inst.position), inst.radius * 0.95);
      if (clipY !== null && (inst.position[1] - inst.radius * 0.4) * scene.scale > clipY) continue;
      if (!ray.intersectSphere(sphere, hit)) continue;
      const distance = hit.distanceTo(ray.origin) * scene.scale;
      if (!best || distance < best.distance) best = { id: set.id, index, distance, isShell: false };
    }
  }
  if (best) return best;
  for (const id of scene.shell.ids()) {
    const proxy = scene.shell.pickProxy(id);
    if (!proxy || !proxy.parent?.visible) continue;
    const first = raycaster.intersectObject(proxy, false)[0];
    if (first && clipY !== null && first.point.y > clipY) continue;
    if (first && (!best || first.distance < best.distance)) best = { id, index: 0, distance: first.distance, isShell: true };
  }
  return best;
}

/**
 * Is the straight line from the camera to a point blocked by another organelle, or (in the cut view) does it pass
 * through the side or the floor of the shell instead of the open top? Used so labels only mark what can be seen.
 */
export function isOccluded(scene: CellScene, from: Vector3, to: Vector3, ownId: string, ownIndex: number): boolean {
  const dir = to.clone().sub(from);
  const length = dir.length();
  dir.divideScalar(length || 1);
  for (const set of scene.sets.values()) {
    if (!set.isVisible) continue;
    for (const index of set.visibleIndices()) {
      if (set.id === ownId && index === ownIndex) continue;
      const inst = set.instances[index] as PlacedInstance;
      const centre = worldPosition(scene, inst);
      const t = tmp.copy(centre).sub(from).dot(dir);
      if (t <= 0 || t >= length) continue;
      const miss = tmp.copy(dir).multiplyScalar(t).add(from).distanceTo(centre);
      if (miss < inst.radius * scene.scale * 0.7) return true;
    }
  }
  if (!scene.cutActive) return false;
  // Cut view: walk the line and find where it first enters the outline; it must enter above the cut plane.
  const clipY = scene.cutaway.plane.constant;
  for (let i = 1; i <= 24; i++) {
    const world = from.clone().addScaledVector(dir, (length * i) / 24);
    const p = scene.group.worldToLocal(world.clone());
    if (shellSdf(scene.cell.shell, [p.x, p.y, p.z]) < 0) return world.y < clipY - 0.05;
  }
  return false;
}

/** World anchor for an organelle's label: the nearest unclipped, unoccluded instance (the picked one is preferred). */
export function labelAnchorOf(scene: CellScene, id: string, cameraWorld: Vector3, prefer: number | null): Vector3 | null {
  const set = scene.sets.get(id);
  const clipY = scene.cutaway.isActive ? scene.cutaway.plane.constant : null;
  if (set) {
    if (!set.isVisible) return null;
    const candidates = set
      .visibleIndices()
      .map((index) => ({ index, p: worldPosition(scene, set.instances[index] as PlacedInstance) }))
      .filter((c) => clipY === null || c.p.y <= clipY)
      .sort((a, b) => (a.index === prefer ? -1 : b.index === prefer ? 1 : a.p.distanceTo(cameraWorld) - b.p.distanceTo(cameraWorld)));
    return candidates.find((c) => !isOccluded(scene, cameraWorld, c.p, id, c.index))?.p ?? null;
  }
  const part = scene.shell.parts.find((s) => s.id === id);
  if (!part || !part.holder.visible) return null;
  const he = scene.cell.shell.halfExtents;
  const dir = new Vector3(0.62, 0.3, 0.7).normalize();
  const world = scene.group.localToWorld(new Vector3(he[0] * dir.x, he[1] * dir.y, he[2] * dir.z));
  return clipY !== null && world.y > clipY ? null : world;
}

/** World centre, radius and instance index of an organelle: the instance nearest to `from`. */
export function focusTargetOf(scene: CellScene, id: string, from: Vector3): { center: Vector3; radius: number; index: number } | null {
  const set = scene.sets.get(id);
  if (set) {
    let best = -1;
    let bestD = Infinity;
    for (const index of set.visibleIndices()) {
      const d = worldPosition(scene, set.instances[index] as PlacedInstance).distanceTo(from);
      if (d < bestD) {
        bestD = d;
        best = index;
      }
    }
    const inst = set.instances[best];
    return inst ? { center: worldPosition(scene, inst), radius: inst.radius * scene.scale, index: best } : null;
  }
  return scene.shell.ids().includes(id) ? { center: scene.group.position.clone(), radius: scene.radius, index: 0 } : null;
}
