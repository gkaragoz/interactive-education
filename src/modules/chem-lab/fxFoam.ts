import { Color, DodecahedronGeometry, DoubleSide, DynamicDrawUsage, InstancedMesh, LatheGeometry, Mesh, MeshStandardMaterial, ShaderMaterial, Vector2, type Object3D } from 'three';
import { clamp, crystalCount, GLSL_SS, lumpScale } from './helpers';
import { setLinear } from './liquid';

const WHITE = new Color(1, 1, 1);
const noRaycast = (o: Object3D): void => {
  o.raycast = (): void => undefined;
};

const FOAM_VERT = /* glsl */ `
${GLSL_SS}
uniform float uTime; uniform float uRim; uniform float uHeight; uniform float uRadius;
varying vec3 vP; varying vec3 vN; varying vec3 vV;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec3 p = position;
  vP = p;
  float y = p.y * uHeight;
  float over = ss(uRim, uRim + 3.0, y);       // foam above the rim spills outwards
  float b = vn(p.xz * 4.0 + p.y * 3.0 + uTime * 0.25);
  p.xz *= (1.0 + 0.35 * over) * (1.0 + 0.07 * (b - 0.5));
  p.y *= 1.0 + 0.03 * (b - 0.5);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normalize(vec3(p.x, 0.25, p.z)));
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FOAM_FRAG = /* glsl */ `
${GLSL_SS}
uniform vec3 uBase; uniform float uTime; uniform float uCells;
varying vec3 vP; varying vec3 vN; varying vec3 vV;
vec2 hh(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
void main() {
  vec2 uv = vec2(atan(vP.z, vP.x) * 2.2, vP.y * 3.2) * uCells;
  vec2 i = floor(uv), f = fract(uv);
  float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = hh(i + g);
    o = 0.5 + 0.45 * sin(uTime * 0.6 + 6.28 * o);
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  float rim = ss(0.0, 0.16, d2 - d1);          // dark film lines between bubbles
  float dome = ss(0.55, 0.0, d1);              // bright centre of each bubble
  vec3 n = normalize(vN);
  float lit = clamp(dot(n, normalize(vec3(0.45, 0.8, 0.4))) * 0.5 + 0.55, 0.0, 1.0);
  float fres = pow(1.0 - clamp(dot(n, normalize(vV)), 0.0, 1.0), 2.0);
  vec3 c = uBase * (0.78 + 0.3 * lit) * (0.86 + 0.14 * rim) + vec3(0.14) * dome + vec3(0.2) * fres;
  gl_FragColor = vec4(c, 0.94);
}`;

/** Foam column above the liquid (soap film holding gas): bumpy, bubbly, spilling over the rim when it gets tall. */
export class Foam {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private height = 0;

  constructor() {
    const pts = [new Vector2(0.001, 0), new Vector2(1, 0), new Vector2(1, 0.8), new Vector2(0.95, 0.9), new Vector2(0.78, 0.97), new Vector2(0.5, 1.02), new Vector2(0.2, 1.05), new Vector2(0.001, 1.06)];
    this.material = new ShaderMaterial({
      vertexShader: FOAM_VERT,
      fragmentShader: FOAM_FRAG,
      transparent: true,
      side: DoubleSide,
      uniforms: { uTime: { value: 0 }, uRim: { value: 1000 }, uHeight: { value: 1 }, uRadius: { value: 1 }, uBase: { value: new Color(1, 1, 1) }, uCells: { value: 2.6 } },
    });
    this.mesh = new Mesh(new LatheGeometry(pts, 28), this.material);
    this.mesh.renderOrder = 13;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    noRaycast(this.mesh);
  }

  /** `surfaceY` local y of the liquid, `radius` of the cavity there, `target` foam height (cm), `rimY` local y of the vessel rim. */
  update(dt: number, surfaceY: number, radius: number, target: number, rimY: number, base: Color, time: number): void {
    this.height += (target - this.height) * (1 - Math.exp(-dt * (target > this.height ? 4 : 1.2)));
    const h = this.height;
    this.mesh.visible = h > 0.05;
    if (!this.mesh.visible) return;
    this.mesh.position.set(0, surfaceY, 0);
    this.mesh.scale.set(radius * 0.97, h, radius * 0.97);
    const u = this.material.uniforms;
    u.uTime!.value = time;
    u.uRim!.value = Math.max(0, rimY - surfaceY);
    u.uHeight!.value = h;
    (u.uBase!.value as Color).copy(base).lerp(WHITE, 0.7);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/** Crystals and powder grains resting on the bottom: instanced facets, count and size follow the solid's mass. */
export class Crystals {
  readonly mesh: InstancedMesh;
  private readonly n: number;
  private readonly rx: Float32Array;
  private readonly rz: Float32Array;
  private readonly rs: Float32Array;
  private readonly rr: Float32Array;
  private start = 0;
  private shown = -1;
  private lastScale = -1;
  private readonly color = new Color();

  constructor(n: number, rng: () => number) {
    this.n = n;
    const geo = new DodecahedronGeometry(1, 0);
    geo.scale(1, 0.8, 1);
    this.mesh = new InstancedMesh(geo, new MeshStandardMaterial({ roughness: 0.35, metalness: 0.05, flatShading: true }), n);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.count = 0;
    noRaycast(this.mesh);
    this.rx = new Float32Array(n);
    this.rz = new Float32Array(n);
    this.rs = new Float32Array(n);
    this.rr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      this.rx[i] = Math.cos(a) * Math.sqrt(rng());
      this.rz[i] = Math.sin(a) * Math.sqrt(rng());
      this.rs[i] = 0.6 + rng() * 0.8;
      this.rr[i] = rng() * 6.28;
    }
  }

  /** `massG` of the solid, `powder` fine grains vs lumps; `y` top of the sediment layer; `radius` available at the bottom. */
  update(massG: number, powder: boolean, rgb: readonly [number, number, number], y: number, radius: number, cx: number, cz: number): void {
    this.start = Math.max(this.start, massG);
    const count = crystalCount(massG, this.n, powder);
    const scale = (powder ? 0.07 : 0.22) * (0.4 + 0.6 * lumpScale(massG, this.start)) * (0.85 + 0.2 * clamp(massG, 0, 3));
    if (count === this.shown && Math.abs(scale - this.lastScale) < 0.002) return;
    this.shown = count;
    this.lastScale = scale;
    const arr = this.mesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const s = scale * (this.rs[i] ?? 1);
      const c = Math.cos(this.rr[i] ?? 0);
      const sn = Math.sin(this.rr[i] ?? 0);
      const o = i * 16;
      arr[o] = s * c; arr[o + 1] = 0; arr[o + 2] = -s * sn; arr[o + 3] = 0;
      arr[o + 4] = 0; arr[o + 5] = s; arr[o + 6] = 0; arr[o + 7] = 0;
      arr[o + 8] = s * sn; arr[o + 9] = 0; arr[o + 10] = s * c; arr[o + 11] = 0;
      arr[o + 12] = cx + (this.rx[i] ?? 0) * radius * 0.82;
      arr[o + 13] = y + s * 0.5;
      arr[o + 14] = cz + (this.rz[i] ?? 0) * radius * 0.82;
      arr[o + 15] = 1;
    }
    this.mesh.count = count;
    this.mesh.visible = count > 0;
    setLinear(this.color, [Math.min(255, rgb[0] * 1.02), Math.min(255, rgb[1] * 1.02), Math.min(255, rgb[2] * 1.02)]);
    for (let i = 0; i < count; i++) this.mesh.setColorAt(i, this.color);
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshStandardMaterial).dispose();
    this.mesh.dispose();
  }
}
