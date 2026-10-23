import { BufferGeometry, SphereGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, type MeshPhysicalMaterial, Color, DoubleSide, Euler, Float32BufferAttribute, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, TubeGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Env } from './env';

/** Paint a geometry with one colour (vertex colours, as the shared clay material expects). */
export function paint<T extends BufferGeometry>(geo: T, color: string): T {
  const c = new Color(color);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return geo;
}

export type Surface = 'clay' | 'gel' | 'wall' | 'glass' | 'water';

const translucent = (k: Surface): boolean => k !== 'clay';

/** The shared library gives each look its tuned material: clay, plain gel, cell wall, clear glass, blue water. */
function material(env: Env, kind: Surface, key: string, opacity?: number): MeshPhysicalMaterial {
  const lib = env.ctx.assets.materials;
  const mat = kind === 'clay' ? lib.get(key, 'clay') : kind === 'gel' ? lib.get(key, 'gel') : kind === 'wall' ? lib.shell(`wall-${key}`) : kind === 'glass' ? lib.shell(`envelope-${key}`) : lib.get(`vacuole.${key}`, 'gel');
  if (opacity !== undefined && translucent(kind)) mat.opacity = opacity;
  return mat;
}

/** Add one static mesh to the station. `key` selects a private material (so opacity can differ per prop family). */
export function addMesh(env: Env, geo: BufferGeometry, color: string, kind: Surface = 'clay', key = 'energy-prop', opacity?: number): Mesh {
  paint(geo, color);
  const mat = material(env, kind, key, opacity);
  const mesh = new Mesh(geo, mat);
  mesh.castShadow = kind === 'clay';
  mesh.receiveShadow = true;
  mesh.renderOrder = translucent(kind) ? 12 : 5;
  env.group.add(mesh);
  env.own.push({ dispose: () => (geo.dispose(), mesh.removeFromParent()) });
  return mesh;
}

export interface Item {
  p: readonly [number, number, number];
  /** Euler angles. */
  r?: readonly [number, number, number];
  /** Uniform number or per-axis. */
  s?: number | readonly [number, number, number];
  color: string;
}

/** One instanced mesh of many static copies of a geometry, each with its own colour. */
export function addInstanced(env: Env, geo: BufferGeometry, items: readonly Item[], kind: Surface = 'clay', key = 'energy-prop', opacity?: number): InstancedMesh {
  paint(geo, '#ffffff');
  const mat = material(env, kind, key, opacity);
  const mesh = new InstancedMesh(geo, mat, Math.max(items.length, 1));
  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const pos = new Vector3();
  const sc = new Vector3();
  items.forEach((it, i) => {
    q.setFromEuler(e.set(...(it.r ?? [0, 0, 0])));
    const s = it.s ?? 1;
    if (typeof s === 'number') sc.set(s, s, s);
    else sc.set(s[0], s[1], s[2]);
    mesh.setMatrixAt(i, m.compose(pos.set(...it.p), q, sc));
    mesh.setColorAt(i, new Color(it.color));
  });
  mesh.frustumCulled = false;
  mesh.castShadow = kind === 'clay';
  mesh.receiveShadow = true;
  mesh.renderOrder = translucent(kind) ? 12 : 5;
  env.group.add(mesh);
  env.own.push({ dispose: () => (geo.dispose(), mesh.dispose(), mesh.removeFromParent()) });
  return mesh;
}

/** A rounded chamber: only the inner back wall of a sphere is drawn, matte and shaded (a cell body seen from outside, with everything inside visible). */
export function chamber(env: Env, color: string, scale: readonly [number, number, number], pos: readonly [number, number, number]): Mesh {
  const geo = paint(new SphereGeometry(1, 40, 24), '#ffffff');
  const mesh = new Mesh(geo, env.ctx.assets.materials.bed(color));
  mesh.scale.set(...scale);
  mesh.position.set(...pos);
  mesh.renderOrder = 2;
  mesh.receiveShadow = true;
  env.group.add(mesh);
  env.own.push({ dispose: () => (geo.dispose(), mesh.removeFromParent()) });
  return mesh;
}

/** A soft flat wash behind the scene (inside / outside tint). */
export function wash(env: Env, w: number, h: number, x: number, y: number, z: number, color: string, opacity: number): Mesh {
  const geo = new PlaneGeometry(w, h);
  const mat = new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: DoubleSide });
  const mesh = new Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.renderOrder = 1;
  env.group.add(mesh);
  env.own.push({ dispose: () => (geo.dispose(), mat.dispose(), mesh.removeFromParent()) });
  return mesh;
}

/** A tall vertical colour ramp behind the scene (stops from the bottom to the top: [y, colour]). */
export function gradientWash(env: Env, w: number, stops: readonly (readonly [number, string])[], z: number): Mesh {
  const ys = stops.map((s) => s[0]);
  const y0 = ys[0]!;
  const y1 = ys[ys.length - 1]!;
  const geo = new PlaneGeometry(w, y1 - y0, 1, stops.length - 1);
  const pos = geo.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = y0 + (pos.getY(i) + (y1 - y0) / 2);
    let k = 0;
    while (k < stops.length - 2 && y > stops[k + 1]![0]) k++;
    const a = new Color(stops[k]![1]);
    const b = new Color(stops[k + 1]![1]);
    const u = Math.min(1, Math.max(0, (y - stops[k]![0]) / (stops[k + 1]![0] - stops[k]![0])));
    a.lerp(b, u);
    col.set([a.r, a.g, a.b], i * 3);
  }
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  const mat = new MeshBasicMaterial({ vertexColors: true, depthWrite: false, toneMapped: false });
  const mesh = new Mesh(geo, mat);
  mesh.position.set(0, (y0 + y1) / 2, z);
  mesh.renderOrder = 1;
  env.group.add(mesh);
  env.own.push({ dispose: () => (geo.dispose(), mat.dispose(), mesh.removeFromParent()) });
  return mesh;
}

/** An unlit glowing mesh (sun, lamp, beams). */
export function glowMesh(env: Env, geo: BufferGeometry, color: string, opacity = 1): Mesh {
  const mat = new MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, toneMapped: false });
  const mesh = new Mesh(geo, mat);
  mesh.renderOrder = 20;
  env.group.add(mesh);
  env.own.push({ dispose: () => (geo.dispose(), mat.dispose(), mesh.removeFromParent()) });
  return mesh;
}

export interface ArrowSpec {
  x: number;
  y: number;
  z: number;
  /** +1 points up (+y), -1 down. */
  dir: 1 | -1;
  /** Length of the run. */
  len: number;
  t0: number;
  t1: number;
  /** Seconds between pulses of this arrow. */
  period?: number;
}

/**
 * Glowing arrows that slide along a short run and fade (proton pumping and flow cues). Each is a pure function of t;
 * with reduced motion they stand still at mid-run while their window is active.
 */
export function flowArrows(env: Env, specs: readonly ArrowSpec[], color = '#ff6a4d'): (t: number) => void {
  const shaft = new CylinderGeometry(0.07, 0.07, 0.5, 8).translate(0, -0.1, 0);
  const head = new ConeGeometry(0.2, 0.36, 10).translate(0, 0.33, 0);
  const geo = mergeGeometries([shaft, head]) ?? shaft;
  const items = specs.map((spec, i) => {
    const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const mesh = new Mesh(geo, mat);
    mesh.renderOrder = 25;
    mesh.rotation.z = spec.dir === 1 ? 0 : Math.PI;
    env.group.add(mesh);
    env.own.push({ dispose: () => (mat.dispose(), mesh.removeFromParent()) });
    return { spec, mat, mesh, off: (i * 0.37) % 1 };
  });
  env.own.push({ dispose: () => geo.dispose() });
  const calm = env.ctx.reducedMotion;
  return (t) => {
    for (const { spec, mat, mesh, off } of items) {
      const on = t >= spec.t0 && t <= spec.t1 ? Math.min(1, (t - spec.t0) / 0.6, (spec.t1 - t) / 0.6) : 0;
      const phase = calm ? 0.5 : (((t - spec.t0) / (spec.period ?? 1.6) + off) % 1 + 1) % 1;
      mesh.position.set(spec.x, spec.y + spec.dir * (phase - 0.5) * spec.len, spec.z);
      mat.opacity = on * Math.sin(Math.PI * phase) * 0.95;
    }
  };
}

/** A faint glowing tube along a path (the way the electrons run); it breathes while `[t0, t1]` is active. */
export function guideTube(env: Env, points: readonly (readonly [number, number, number])[], t0: number, t1: number, color = '#ffe86a'): (t: number) => void {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
  const geo = new TubeGeometry(curve, 48, 0.07, 6);
  const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const mesh = new Mesh(geo, mat);
  mesh.renderOrder = 22;
  env.group.add(mesh);
  env.own.push({ dispose: () => (geo.dispose(), mat.dispose(), mesh.removeFromParent()) });
  const calm = env.ctx.reducedMotion;
  return (t) => {
    const on = t >= t0 && t <= t1 ? Math.min(1, (t - t0) / 0.8, (t1 - t) / 0.8) : 0;
    mat.opacity = on * (calm ? 0.35 : 0.28 + 0.12 * Math.sin(t * 4));
  };
}
