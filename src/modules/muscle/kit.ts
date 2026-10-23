import { BufferGeometry, Color, CylinderGeometry, FrontSide, Float32BufferAttribute, LatheGeometry, Matrix4, Quaternion, SphereGeometry, Vector2, Vector3, MeshPhysicalMaterial, type Material } from 'three';
import type { ModuleContext } from '../../scene';

/** Painted-clay palette of the muscle module (warm, saturated, matching the cell explorer). */
export const COLORS = {
  thick: '#cf4f7c', // myosin
  head: '#f08a4b',
  thin: '#2f9fb8', // actin
  bead: '#4cb8cc',
  zline: '#7c4dbd',
  mline: '#d9822b',
  bandA: '#c25a8a',
  bandI: '#3f8fa8',
  bandH: '#d9822b',
  bone: '#f3e4c2',
  boneDark: '#d9c08e',
  tendon: '#f6ead0',
  biceps: '#d9593d',
  triceps: '#3d7fc4',
  muscleRest: '#e49a86',
  tricepsRest: '#8fb4dc',
  fascicle: '#e07a62',
  fibre: '#f0a58f',
  nerve: '#f2c744',
  nucleus: '#7c5aa8',
  skin: '#f6cfae',
} as const;

const tmp = new Color();

/** Adds a flat vertex colour (the shared clay material is vertex-coloured, so every geometry needs the attribute). */
export function paint<T extends BufferGeometry>(geo: T, color: string | number | Color = '#ffffff'): T {
  const n = geo.getAttribute('position').count;
  const c = tmp.set(color as Color);
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return geo;
}

/** Paints with a function of the vertex position (streaks, gradients). */
export function paintBy<T extends BufferGeometry>(geo: T, fn: (x: number, y: number, z: number) => string | Color): T {
  const pos = geo.getAttribute('position');
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = tmp.set(fn(pos.getX(i), pos.getY(i), pos.getZ(i)) as Color);
    arr.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return geo;
}

/** Surface of revolution around +Y from `profile` points (radius, y). */
export function lathe(profile: ReadonlyArray<readonly [number, number]>, segments: number): LatheGeometry {
  return new LatheGeometry(
    profile.map(([r, y]) => new Vector2(Math.max(r, 1e-4), y)),
    segments,
  );
}

/** Sphere / cylinder with unit radius (and unit height along +Y, base at the origin) for instancing. */
export const unitSphere = (seg = 12): SphereGeometry => new SphereGeometry(1, seg, Math.max(5, Math.round(seg * 0.7)));
export function unitRod(seg = 8): CylinderGeometry {
  const g = new CylinderGeometry(1, 1, 1, seg, 1, false);
  g.translate(0, 0.5, 0);
  return g;
}

/** Cylinder along X whose uv.x runs 0..1 along its length (for the stripe shader). */
export function axisTube(radius: number, length: number, radial: number, open = true): CylinderGeometry {
  const g = new CylinderGeometry(radius, radius, length, radial, 1, open);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getY(i) / length + 0.5, uv.getY(i));
  g.rotateZ(Math.PI / 2);
  return g;
}

const UP = new Vector3(0, 1, 0);
const q = new Quaternion();
const dir = new Vector3();
const one = new Vector3();
/** Matrix of a unit rod (from `unitRod`) running from `a` to `b` with the given radii. */
export function rodMatrix(out: Matrix4, a: Vector3, b: Vector3, radius: number): Matrix4 {
  dir.subVectors(b, a);
  const len = dir.length();
  if (len < 1e-6) return out.makeScale(0, 0, 0);
  q.setFromUnitVectors(UP, dir.multiplyScalar(1 / len));
  return out.compose(a, q, one.set(radius, len, radius));
}

/** Clones a library material so a level can fade it (the clone keeps any shader hook of the source). */
export function fadeable(source: MeshPhysicalMaterial): MeshPhysicalMaterial {
  const m = source.clone();
  m.onBeforeCompile = source.onBeforeCompile;
  m.customProgramCacheKey = source.customProgramCacheKey;
  return m;
}

/** Fades a set of materials together (a zoom level); each keeps its own base opacity. */
export class Fader {
  private readonly items: { m: Material; base: number; glass: boolean }[] = [];
  readonly owned: Material[] = [];

  add<T extends Material>(m: T, base = m.opacity, glass = false): T {
    this.items.push({ m, base, glass });
    this.owned.push(m);
    return m;
  }

  /** Returns true while anything is visible. */
  set(w: number): boolean {
    for (const { m, base, glass } of this.items) {
      m.opacity = base * w;
      m.transparent = glass || base < 1 || w < 0.999;
      m.depthWrite = !glass && base >= 1 && w > 0.55;
    }
    return w > 0.004;
  }

  dispose(): void {
    this.owned.forEach((m) => m.dispose());
    this.owned.length = 0;
    this.items.length = 0;
  }
}

/**
 * Soft glass for membranes and sheaths: nearly clear face-on, a lit rim at grazing angles (a flat veil would only
 * whiten what is behind it). Vertex colours tint it; `rim` is the opacity at the silhouette, `floor` face-on.
 */
export function glassMaterial(floor = 0.07, rim = 0.85, power = 2.2): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({ vertexColors: true, transparent: true, depthWrite: false, roughness: 1, metalness: 0, envMapIntensity: 0.05, specularIntensity: 0, side: FrontSide });
  // the stage lights are strong: a lit pale surface would go white-hot, so the glass is dimmed to a soft tint
  m.color.setScalar(0.5);
  m.onBeforeCompile = (shader): void => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float rimF = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), ${power.toFixed(2)});
  diffuseColor.a *= mix(${floor.toFixed(3)}, ${rim.toFixed(3)}, rimF);
  outgoingLight = mix(outgoingLight, diffuseColor.rgb, rimF * 0.5);
  #include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = (): string => `mu-glass-${floor}-${rim}-${power}`;
  return m;
}

/** The two surfaces every muscle part uses: opaque painted clay and rim-lit glass. */
export interface Surfaces {
  solid(fader: Fader): MeshPhysicalMaterial;
  glass(fader: Fader, floor?: number, rim?: number): MeshPhysicalMaterial;
}
export function surfaces(ctx: ModuleContext): Surfaces {
  const lib = ctx.assets.materials;
  return {
    solid: (fader) => {
      const m = fader.add(fadeable(lib.get('mu-clay', 'clay')), 1);
      m.roughness = 0.58;
      return m;
    },
    glass: (fader, floor, rim) => fader.add(glassMaterial(floor, rim), 1, true),
  };
}
