import { GLSL_SS } from './helpers';
import { Color, DoubleSide, Matrix4, Mesh, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, type BufferGeometry, type Camera } from 'three';
import { PROFILE_N, type Profile } from './profile';

/**
 * Liquid in a vessel: the closed `inner` mesh of the glass asset drawn with a volume shader.
 * - The visible part is everything below a plane (normal `uN`, offset `uD`) in the vessel's object space, so the surface
 *   stays level when the vessel is tilted for pouring.
 * - Far-wall fragments whose view ray crosses the surface inside the cavity are drawn as the surface (a real cap, with
 *   ripples, meniscus, fresnel and sparkle); the same test finds the top of a settled sediment layer.
 * - Layers: incoming liquid near the surface that fades downward (pouring), turbidity, sediment at the bottom.
 * `low` quality drops the ripples and the specular term (flat tint).
 */
const VERT = /* glsl */ `
varying vec3 vP;
void main() {
  vP = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
${GLSL_SS}
uniform vec3 uCam; uniform vec3 uN; uniform float uD; uniform vec3 uKey;
uniform float uProf[${PROFILE_N}]; uniform float uYMin; uniform float uYMax; uniform vec2 uCen;
uniform vec3 uColor; uniform float uAlpha;
uniform vec3 uTurbCol; uniform float uTurb;
uniform vec3 uSedCol; uniform float uSedH;
uniform vec3 uTopCol; uniform float uTopAmt; uniform float uTopDepth;
uniform float uTime; uniform float uWobble; uniform float uLow; uniform float uDim;
varying vec3 vP;

float prof(float y) {
  float t = clamp((y - uYMin) / (uYMax - uYMin), 0.0, 1.0) * ${(PROFILE_N - 1).toFixed(1)};
  int i = int(min(floor(t), ${(PROFILE_N - 2).toFixed(1)}));
  float f = t - float(i);
  return mix(uProf[i], uProf[i + 1], f);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
vec3 skyLight(vec3 n) { return mix(vec3(0.62, 0.55, 0.46), vec3(1.0, 0.99, 0.95), clamp(dot(n, uN) * 0.5 + 0.5, 0.0, 1.0)); }

void main() {
  float s = dot(vP, uN) - uD;
  if (s > 0.0) discard;
  float depth = -s;
  vec3 rayD = vP - uCam;
  vec3 V = normalize(-rayD);
  vec3 base = uColor;
  float topW = uTopAmt * exp(-depth / max(uTopDepth, 0.001));
  base = mix(base, uTopCol, topW);
  base = mix(base, uTurbCol, uTurb * 0.85);
  float a = clamp(uAlpha + uTurb * 0.55, 0.0, 0.96);
  // saturated liquids get a lift: the shader is unlit, so pink or blue would otherwise sink into the dark bench
  float sat = max(base.r, max(base.g, base.b)) - min(base.r, min(base.g, base.b));
  // Beer-Lambert-like absorption: the deeper the volume, the deeper and more saturated the colour
  float deep = clamp(depth * 0.09, 0.0, 0.75);
  base = mix(base, base * base * 0.95, deep * clamp(0.35 + sat * 2.0, 0.0, 1.0));
  base *= uDim * (1.0 + 0.5 * clamp(sat * 2.0, 0.0, 1.0)) * mix(0.9, 1.0, exp(-depth * 0.14));
  // soft subsurface glow near the top, where light enters
  base += uColor * 0.14 * exp(-depth * 0.5);
  bool hasSed = uSedH > uYMin + 0.02;
  vec3 col; float alpha;
  if (gl_FrontFacing) {
    // near wall, seen from outside: thin tint with a soft rim
    float rim = pow(1.0 - clamp(dot(V, normalize(vec3(vP.x - uCen.x, 0.0, vP.z - uCen.y))), 0.0, 1.0), 2.0);
    col = base * mix(1.0, 0.9, rim) + vec3(0.06) * rim;
    alpha = a * 0.55 + rim * 0.12;
    if (hasSed && vP.y < uSedH) { col = uSedCol * 0.92; alpha = 0.92; }
  } else {
    col = base * 0.96;
    alpha = a;
    // does the ray end on the top of the sediment before reaching this far wall point?
    if (hasSed && vP.y < uSedH) {
      float ts = (uSedH - uCam.y) / (vP.y - uCam.y);
      vec3 Qs = uCam + rayD * ts;
      if (ts > 0.0 && ts < 1.0 && length(Qs.xz - uCen) < prof(uSedH) * 0.995) {
        float g = vnoise(Qs.xz * 6.0 + 3.0);
        col = mix(uSedCol * (0.8 + 0.25 * g), base, 0.22);
        alpha = 0.96;
      } else { col = uSedCol * 0.9; alpha = 0.9; }
    }
    // does the ray cross the liquid surface inside the cavity? then this pixel is the surface
    float ts2 = (uD - dot(uCam, uN)) / dot(rayD, uN);
    vec3 Q = uCam + rayD * ts2;
    if (ts2 > 0.0 && ts2 < 1.0 && length(Q.xz - uCen) < prof(Q.y) * 0.995) {
      vec3 Nw = uN;
      if (uLow < 0.5) {
        float k = uTime;
        vec2 g = vec2(sin(Q.x * 5.0 + k * 2.1) + sin(Q.z * 7.0 - k * 1.7), sin(Q.z * 4.0 + k * 1.4) + sin(Q.x * 6.5 - k * 2.3));
        Nw = normalize(uN + vec3(g.x, 0.0, g.y) * uWobble * 0.9);
      }
      float fres = pow(1.0 - clamp(dot(V, Nw), 0.0, 1.0), 3.0);
      float dw = prof(Q.y) - length(Q.xz - uCen);
      float men = ss(0.38, 0.0, dw);
      vec3 surf = base * 1.04 + vec3(0.05) + vec3(0.55, 0.62, 0.7) * fres * 0.55;
      surf += vec3(0.16) * men * (0.6 + 0.4 * fres);
      if (uLow < 0.5) {
        vec3 R = reflect(-V, Nw);
        surf += vec3(1.0, 0.95, 0.85) * pow(max(dot(R, uKey), 0.0), 90.0) * 0.55;
      }
      col = mix(col, surf, 0.8);
      alpha = max(alpha, mix(a, 0.92, 0.35)) + men * 0.2 + fres * 0.2;
    }
  }
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.97));
}`;

/** sRGB 0..255 triple to the linear working colour space of the renderer. */
const tmp = new Color();
export function setLinear(target: Color, rgb: readonly [number, number, number]): Color {
  return target.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, SRGBColorSpace);
}
export function linearVec(rgb: readonly [number, number, number], out: Vector3): Vector3 {
  setLinear(tmp, rgb);
  return out.set(tmp.r, tmp.g, tmp.b);
}

export interface LiquidState {
  /** Level on the vessel axis, object-space y. */
  levelY: number;
  color: Color;
  alpha: number;
  turbidity: number;
  turbColor: Color;
  sedimentTopY: number;
  sedimentColor: Color;
  topColor: Color;
  topAmount: number;
  topDepth: number;
  wobble: number;
  dim?: number;
}

const inv = new Matrix4();
const camW = new Vector3();
const up = new Vector3(0, 1, 0);
const keyW = new Vector3(0.45, 0.8, 0.4).normalize();

export class LiquidMesh {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  private levelY = 0;
  private time = 0;

  constructor(geometry: BufferGeometry, readonly profile: Profile, low: boolean) {
    this.material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uCam: { value: new Vector3() }, uN: { value: new Vector3(0, 1, 0) }, uD: { value: 0 }, uKey: { value: new Vector3(0.45, 0.8, 0.4).normalize() },
        uProf: { value: Array.from(profile.r) }, uYMin: { value: profile.yMin }, uYMax: { value: profile.yMax }, uCen: { value: new Vector2(profile.cx, profile.cz) },
        uColor: { value: new Color(0.9, 0.95, 1) }, uAlpha: { value: 0.3 },
        uTurbCol: { value: new Color(1, 1, 1) }, uTurb: { value: 0 },
        uSedCol: { value: new Color(0.9, 0.9, 0.9) }, uSedH: { value: -100 },
        uTopCol: { value: new Color(1, 1, 1) }, uTopAmt: { value: 0 }, uTopDepth: { value: 0.5 },
        uTime: { value: 0 }, uWobble: { value: 0 }, uLow: { value: low ? 1 : 0 }, uDim: { value: 1 },
      },
    });
    this.material.customProgramCacheKey = (): string => 'chemlab-liquid';
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.name = 'liquid';
    this.mesh.renderOrder = 10;
    this.mesh.frustumCulled = false;
    this.mesh.onBeforeRender = (_r, _s, camera: Camera): void => this.onBefore(camera);
  }

  private onBefore(camera: Camera): void {
    const u = this.material.uniforms;
    this.mesh.updateWorldMatrix(true, false);
    inv.copy(this.mesh.matrixWorld).invert();
    camW.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inv);
    (u.uCam!.value as Vector3).copy(camW);
    const n = u.uN!.value as Vector3;
    n.copy(up).transformDirection(inv);
    (u.uKey!.value as Vector3).copy(keyW).transformDirection(inv);
    // the plane passes through the point of the axis at the level
    u.uD!.value = n.x * this.profile.cx + n.y * this.levelY + n.z * this.profile.cz;
  }

  set(state: LiquidState, dt: number): void {
    const u = this.material.uniforms;
    this.levelY = state.levelY;
    this.time += dt;
    (u.uColor!.value as Color).copy(state.color);
    u.uAlpha!.value = state.alpha;
    u.uTurb!.value = state.turbidity;
    (u.uTurbCol!.value as Color).copy(state.turbColor);
    u.uSedH!.value = state.sedimentTopY;
    (u.uSedCol!.value as Color).copy(state.sedimentColor);
    (u.uTopCol!.value as Color).copy(state.topColor);
    u.uTopAmt!.value = state.topAmount;
    u.uTopDepth!.value = state.topDepth;
    u.uWobble!.value = state.wobble;
    u.uTime!.value = this.time;
    u.uDim!.value = state.dim ?? 1;
    this.mesh.visible = state.levelY > this.profile.yMin + 0.02;
  }

  dispose(): void {
    this.material.dispose();
  }
}
