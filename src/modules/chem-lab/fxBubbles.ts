import { DoubleSide, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedMesh, PlaneGeometry, ShaderMaterial, type Object3D } from 'three';
import { bubbleRate, bubbleRise, clamp, GLSL_SS } from './helpers';

const noRaycast = (o: Object3D): void => {
  o.raycast = (): void => undefined;
};

const BUBBLE_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BUBBLE_FRAG = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() {
  float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.2);
  float hi = pow(max(dot(normalize(vN), normalize(vec3(0.5, 0.8, 0.5))), 0.0), 18.0);
  vec3 c = mix(vec3(0.85, 0.95, 1.0), vec3(1.0), f) + vec3(hi);
  gl_FragColor = vec4(c, clamp(0.1 + f * 0.75 + hi * 0.6, 0.0, 0.95));
}`;

let bubbleMaterial: ShaderMaterial | null = null;
function bubbleMat(): ShaderMaterial {
  bubbleMaterial ??= new ShaderMaterial({ vertexShader: BUBBLE_VERT, fragmentShader: BUBBLE_FRAG, transparent: true, depthWrite: false });
  return bubbleMaterial;
}

export interface BubbleField {
  /** Local y of the bottom of the liquid and of its surface. */
  y0: number;
  ySurf: number;
  /** Cavity radius at a height. */
  radius(y: number): number;
  /** Axis (x, z). */
  cx: number;
  cz: number;
  /** Extra spawn points (a piece of metal releasing gas), flat xyz triples; empty means the bottom. */
  sources?: readonly number[];
}

/** Rising gas bubbles of one vessel: a fixed pool of instanced spheres, spawned from the gas intensity, popped at the surface. */
export class Bubbles {
  readonly mesh: InstancedMesh;
  private readonly n: number;
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly z: Float32Array;
  private readonly s: Float32Array;
  private readonly v: Float32Array;
  private readonly ph: Float32Array;
  private readonly on: Uint8Array;
  private acc = 0;

  constructor(n: number, private readonly rng: () => number) {
    this.n = n;
    this.mesh = new InstancedMesh(new IcosahedronGeometry(1, 1), bubbleMat(), n);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 12;
    this.mesh.count = 0;
    noRaycast(this.mesh);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.z = new Float32Array(n);
    this.s = new Float32Array(n);
    this.v = new Float32Array(n);
    this.ph = new Float32Array(n);
    this.on = new Uint8Array(n);
  }

  get active(): number {
    let c = 0;
    for (let i = 0; i < this.n; i++) c += this.on[i] ?? 0;
    return c;
  }

  update(dt: number, intensity: number, quality: 'low' | 'medium' | 'high', reduced: boolean, f: BubbleField): void {
    const rate = bubbleRate(intensity, quality, reduced) * (f.ySurf > f.y0 + 0.1 ? 1 : 0);
    this.acc += rate * dt;
    const arr = this.mesh.instanceMatrix.array as Float32Array;
    let last = 0;
    for (let i = 0; i < this.n; i++) {
      if (!this.on[i]) {
        if (this.acc >= 1) {
          this.acc -= 1;
          this.spawn(i, intensity, f);
        } else continue;
      }
      const y = (this.y[i] ?? 0) + (this.v[i] ?? 1) * dt;
      const ph = (this.ph[i] ?? 0) + dt * 5;
      this.ph[i] = ph;
      const s = this.s[i] ?? 0.1;
      if (y >= f.ySurf - s * 0.5 || y > f.ySurf) {
        this.on[i] = 0;
        arr.fill(0, i * 16, i * 16 + 16);
        continue;
      }
      this.y[i] = y;
      const r = f.radius(y);
      const wob = reduced ? 0 : 0.06 * r;
      const px = clamp((this.x[i] ?? 0) + Math.sin(ph) * wob * dt * 8, -r * 0.92 + f.cx, r * 0.92 + f.cx);
      this.x[i] = px;
      const pz = (this.z[i] ?? 0) + Math.cos(ph * 0.8) * wob * dt * 8;
      this.z[i] = pz;
      // bubbles grow a little as they rise
      const sz = s * (1 + 0.5 * (y - f.y0) / Math.max(0.5, f.ySurf - f.y0));
      const o = i * 16;
      arr[o] = sz; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0;
      arr[o + 4] = 0; arr[o + 5] = sz; arr[o + 6] = 0; arr[o + 7] = 0;
      arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = sz; arr[o + 11] = 0;
      arr[o + 12] = px; arr[o + 13] = y; arr[o + 14] = pz; arr[o + 15] = 1;
      last = i + 1;
    }
    this.mesh.count = last;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = last > 0;
  }

  private spawn(i: number, intensity: number, f: BubbleField): void {
    const rr = f.radius(f.y0 + 0.3);
    let px: number;
    let py = f.y0 + 0.25;
    let pz: number;
    const src = f.sources;
    if (src && src.length >= 3 && this.rng() < 0.75) {
      const k = Math.floor(this.rng() * (src.length / 3)) * 3;
      px = (src[k] ?? 0) + (this.rng() - 0.5) * 0.3;
      py = (src[k + 1] ?? py) + this.rng() * 0.8;
      pz = (src[k + 2] ?? 0) + (this.rng() - 0.5) * 0.3;
    } else {
      const a = this.rng() * Math.PI * 2;
      const d = Math.sqrt(this.rng()) * rr * 0.8;
      px = f.cx + Math.cos(a) * d;
      pz = f.cz + Math.sin(a) * d;
    }
    const size = (0.09 + this.rng() * 0.17) * clamp(rr / 2.5, 0.5, 1.4);
    this.on[i] = 1;
    this.x[i] = px;
    this.y[i] = py;
    this.z[i] = pz;
    this.s[i] = size;
    this.v[i] = bubbleRise(intensity, size) * (0.8 + this.rng() * 0.5);
    this.ph[i] = this.rng() * 6.28;
  }

  clear(): void {
    this.on.fill(0);
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.dispose();
  }
}

const STEAM_VERT = /* glsl */ `
varying vec2 vUv; varying float vA;
void main() {
  vUv = uv;
  vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float sc = length(instanceMatrix[0].xyz);
  c.xy += position.xy * sc;
  vA = instanceMatrix[0].w;
  gl_Position = projectionMatrix * c;
}`;
const STEAM_FRAG = /* glsl */ `
${GLSL_SS}
varying vec2 vUv; varying float vA;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = ss(1.0, 0.0, d);
  a *= a;
  gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a * 0.32 * clamp(vA, 0.0, 1.0));
}`;

/** Wisps of steam above hot water: billboarded soft sprites rising and fading (not drawn at `low`). */
export class Steam {
  readonly mesh: InstancedMesh;
  private readonly n: number;
  private readonly t: Float32Array;
  private readonly px: Float32Array;
  private readonly pz: Float32Array;
  private readonly sp: Float32Array;
  private acc = 0;

  constructor(n: number, private readonly rng: () => number) {
    this.n = n;
    const mat = new ShaderMaterial({ vertexShader: STEAM_VERT, fragmentShader: STEAM_FRAG, transparent: true, depthWrite: false, side: DoubleSide });
    const geo = new PlaneGeometry(1, 1);
    this.mesh = new InstancedMesh(geo, mat, n);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 14;
    this.mesh.count = 0;
    noRaycast(this.mesh);
    this.t = new Float32Array(n).fill(-1);
    this.px = new Float32Array(n);
    this.pz = new Float32Array(n);
    this.sp = new Float32Array(n);
  }

  update(dt: number, density: number, f: { ySurf: number; radius: number; cx: number; cz: number }, reduced: boolean): void {
    this.acc += density * 9 * dt;
    const arr = this.mesh.instanceMatrix.array as Float32Array;
    let last = 0;
    for (let i = 0; i < this.n; i++) {
      let t = this.t[i] ?? -1;
      if (t < 0) {
        if (this.acc >= 1) {
          this.acc -= 1;
          t = 0;
          const a = this.rng() * 6.28;
          const d = Math.sqrt(this.rng()) * f.radius * 0.8;
          this.px[i] = f.cx + Math.cos(a) * d;
          this.pz[i] = f.cz + Math.sin(a) * d;
          this.sp[i] = 2.2 + this.rng() * 1.6;
        } else continue;
      }
      t += dt * (reduced ? 0.35 : 0.5);
      if (t >= 1) {
        this.t[i] = -1;
        arr.fill(0, i * 16, i * 16 + 16);
        continue;
      }
      this.t[i] = t;
      const size = 1.2 + 3.2 * t;
      const y = f.ySurf + 0.6 + t * (this.sp[i] ?? 3) * 3;
      const alpha = Math.sin(Math.PI * t) * density;
      const o = i * 16;
      arr[o] = size; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = alpha;
      arr[o + 4] = 0; arr[o + 5] = size; arr[o + 6] = 0; arr[o + 7] = 0;
      arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = size; arr[o + 11] = 0;
      arr[o + 12] = (this.px[i] ?? 0) + Math.sin(t * 5 + i) * 0.5; arr[o + 13] = y; arr[o + 14] = this.pz[i] ?? 0; arr[o + 15] = 1;
      last = i + 1;
    }
    this.mesh.count = last;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = last > 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
    this.mesh.dispose();
  }
}

export const fxGroup = (name: string): Group => {
  const g = new Group();
  g.name = name;
  return g;
};
