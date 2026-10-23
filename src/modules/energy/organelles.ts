import { Color, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, SphereGeometry, type BufferGeometry, type MeshPhysicalMaterial, type Object3D, type Plane } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { ModuleContext } from '../../scene';

export interface Part {
  name: string;
  geometry: BufferGeometry;
  kind: 'clay' | 'gel';
}

const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const WHITE = new Color(1, 1, 1);

/** Gel look of the organelle's translucent membrane parts (see `materials.get`): nearly clear with a rim. */
export interface OrganelleOptions {
  /** 0 = most detailed LOD. */
  lod: number;
  /** Cut away everything on the positive side of this plane (cutaway view). */
  clip?: Plane;
  gelOpacity?: number;
  /** Look of the outer membrane: clear glass (default) or a glossy, fairly solid skin. */
  skin?: 'glass' | 'glossy';
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

/** Loads an explorer organelle (`public/models/organelles/<id>.glb`); a plain ball stands in when it is missing. */
export async function loadParts(id: string, lod: number): Promise<Part[]> {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
  try {
    const res = await fetch(`${base}models/organelles/${id}.glb`);
    if (!res.ok) throw new Error(`missing ${id}`);
    const gltf = await loader.parseAsync(await res.arrayBuffer(), `${base}models/organelles/`);
    gltf.scene.updateMatrixWorld(true);
    const found: Part[][] = [[], [], []];
    gltf.scene.traverse((node: Object3D) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      if (!geometry.getAttribute('color')) {
        const n = geometry.getAttribute('position').count;
        geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      let level = 0;
      for (let o: Object3D | null = mesh; o; o = o.parent) {
        const m = /^LOD([0-2])$/.exec(o.name);
        if (m) level = Number(m[1]);
      }
      found[level]?.push({ name: mesh.name, geometry, kind: mats.some((m) => /_gel$/.test(m.name)) ? 'gel' : 'clay' });
    });
    const parts = found[Math.min(lod, 2)]?.length ? found[Math.min(lod, 2)]! : found[0]!;
    if (parts.length) return parts;
  } catch {
    /* fall through to the stand-in */
  }
  return [{ name: `${id}-stand-in`, geometry: new SphereGeometry(2, 24, 16), kind: 'clay' }];
}

export interface OrganelleSet {
  group: Group;
  setMatrix(i: number, m: Matrix4): void;
  hide(i: number): void;
  commit(): void;
  materials: MeshPhysicalMaterial[];
  dispose(): void;
}

/** `count` instanced copies of an organelle; materials are private to `materialId`, so they can be tweaked (cutaway, opacity). */
export async function organelleInstances(ctx: ModuleContext, id: string, count: number, o: OrganelleOptions, materialId = `energy-${id}`): Promise<OrganelleSet> {
  const parts = await loadParts(id, o.lod);
  const group = new Group();
  group.name = `${id}-organelle`;
  const meshes: InstancedMesh[] = [];
  const materials: MeshPhysicalMaterial[] = [];
  for (const part of parts) {
    const outer = part.kind === 'gel' && /envelope|outer|tonoplast/.test(part.name);
    const mat = outer ? (o.skin === 'glossy' ? ctx.assets.materials.glossy(materialId) : ctx.assets.materials.shell(`envelope-${materialId}`)) : ctx.assets.materials.get(materialId, part.kind);
    if (o.clip) mat.clippingPlanes = [o.clip];
    if (part.kind === 'gel' && o.gelOpacity !== undefined) mat.opacity = o.gelOpacity;
    if (!materials.includes(mat)) materials.push(mat);
    const mesh = new InstancedMesh(part.geometry, mat, count);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.renderOrder = part.kind === 'gel' ? 10 : 5;
    mesh.castShadow = part.kind === 'clay';
    mesh.receiveShadow = true;
    for (let i = 0; i < count; i++) {
      mesh.setMatrixAt(i, HIDDEN);
      mesh.setColorAt(i, WHITE);
    }
    group.add(mesh);
    meshes.push(mesh);
  }
  return {
    group,
    materials,
    setMatrix: (i, m) => meshes.forEach((mesh) => mesh.setMatrixAt(i, m)),
    hide: (i) => meshes.forEach((mesh) => mesh.setMatrixAt(i, HIDDEN)),
    commit: () => meshes.forEach((mesh) => (mesh.instanceMatrix.needsUpdate = true)),
    dispose: () => {
      meshes.forEach((mesh) => mesh.dispose());
      parts.forEach((p) => p.geometry.dispose());
      group.removeFromParent();
    },
  };
}
