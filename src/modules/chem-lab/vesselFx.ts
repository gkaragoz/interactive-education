import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { Bubbles, Steam, type BubbleField } from './fxBubbles';
import { Crystals, Foam } from './fxFoam';
import { foamHeightCm, limitFlash, mixRgb, steamDensity, type Rgb, GLSL_SS } from './helpers';
import type { LabAssets } from './labAssets';
import { Pieces } from './pieces';
import { areaAt, radiusAt } from './profile';
import type { VesselView } from './vesselView';

export interface FxDeps {
  quality: 'low' | 'medium' | 'high';
  reduced: boolean;
  rng: (seed: number) => () => number;
  assets: LabAssets;
  /** Soft flash option (reads the scene's current value each frame). */
  soft(): boolean;
}

const FLASH_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * length(modelMatrix[0].xyz);
  gl_Position = projectionMatrix * c;
}`;
const FLASH_FRAG = /* glsl */ `
${GLSL_SS}
uniform float uA;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float core = ss(0.45, 0.0, d);
  float halo = ss(1.0, 0.0, d);
  gl_FragColor = vec4(mix(vec3(1.0, 0.9, 0.7), vec3(1.0), core) * (1.0 + core * 3.0), clamp(halo * halo * uA * 1.5 + core * uA, 0.0, 1.0));
}`;

/** The magnesium flash: a bright billboard whose strength is rate-limited (photosensitivity) and capped when soft. */
class FlashSprite {
  readonly mesh: Mesh;
  value = 0;
  private readonly mat: ShaderMaterial;
  constructor() {
    this.mat = new ShaderMaterial({ vertexShader: FLASH_VERT, fragmentShader: FLASH_FRAG, transparent: true, depthWrite: false, depthTest: false, side: DoubleSide, toneMapped: false, uniforms: { uA: { value: 0 } } });
    this.mesh = new Mesh(new PlaneGeometry(1, 1), this.mat);
    this.mesh.renderOrder = 30;
    this.mesh.raycast = (): void => undefined;
    this.mesh.visible = false;
  }
  update(dt: number, target: number, soft: boolean): void {
    this.value = limitFlash(this.value, target, dt, soft);
    this.mesh.visible = this.value > 0.01;
    this.mat.uniforms.uA!.value = this.value;
    this.mesh.scale.setScalar(8 + 14 * this.value);
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

const poolSizes = { low: { b: 70, c: 40 }, medium: { b: 220, c: 110 }, high: { b: 420, c: 200 } } as const;

/** Everything that moves or sparkles inside and above one vessel: bubbles, foam, steam, crystals, pieces, the flash. */
export class VesselFx {
  readonly group = new Group();
  private readonly bubbles: Bubbles;
  private readonly foam: Foam;
  private readonly steam: Steam | null;
  private readonly crystals: Crystals;
  private readonly pieces: Pieces;
  private readonly flash = new FlashSprite();
  private readonly sources: number[] = [];
  private time = 0;
  private kickV = 0;
  private readonly field: BubbleField = { y0: 0, ySurf: 0, radius: (y) => radiusAt(this.view.profile, y), cx: 0, cz: 0, sources: this.sources };
  private readonly steamField = { ySurf: 0, radius: 0, cx: 0, cz: 0 };

  constructor(private readonly view: VesselView, private readonly d: FxDeps, seed: number) {
    this.group.name = 'fx';
    const sizes = poolSizes[d.quality];
    const small = view.def.radius < 1.5;
    this.bubbles = new Bubbles(small ? Math.round(sizes.b * 0.4) : sizes.b, d.rng(seed));
    this.foam = new Foam();
    this.steam = d.quality === 'low' ? null : new Steam(d.quality === 'high' ? 70 : 40, d.rng(seed + 1));
    this.crystals = new Crystals(small ? Math.round(sizes.c * 0.4) : sizes.c, d.rng(seed + 2));
    this.pieces = new Pieces(d.assets);
    this.group.add(this.pieces.group, this.crystals.mesh, this.bubbles.mesh, this.foam.mesh, this.flash.mesh);
    if (this.steam) this.group.add(this.steam.mesh);
    view.body.add(this.group);
  }

  /** An engine flash event: the burst is drawn with its own envelope (the engine value is a short pulse sampled at 10 Hz). */
  kick(value: number): void {
    this.kickV = Math.max(this.kickV, Math.min(1, value * 1.3));
  }

  update(dt: number): void {
    const view = this.view;
    const vis = view.vis;
    const v = view.raw;
    if (!vis || !v) return;
    this.time += dt;
    const p = view.profile;
    const surface = view.levelY;
    const rs = radiusAt(p, surface);
    const hasLiquid = view.fill > 0.01;
    // bubbles: reaction gas or boiling
    const boiling = vis.tempC >= 98.5 && v.heat !== null && hasLiquid ? 0.55 : 0;
    const f = this.field;
    f.y0 = p.yMin;
    f.ySurf = surface;
    f.cx = p.cx;
    f.cz = p.cz;
    this.bubbles.update(dt, Math.max(vis.bubbles, boiling), this.d.quality, this.d.reduced, f);
    // sediment crystals
    let mass = 0;
    let powder = true;
    let rgb: Rgb = [230, 230, 230];
    for (const s of vis.sediment) {
      if (mass === 0) rgb = s.rgb;
      else rgb = mixRgb(rgb, s.rgb, s.massG / (mass + s.massG));
      mass += s.massG;
      powder = powder && s.powder;
    }
    this.crystals.update(mass, powder, rgb, p.yMin + view.sedimentH * 0.9, radiusAt(p, p.yMin + 0.4), p.cx, p.cz);
    // foam
    const area = areaAt(p, surface);
    this.foam.update(dt, surface, rs, Math.min(foamHeightCm(vis.foamMl, area), Math.max(4, view.def.topY - surface + 9)), view.def.topY, view.color, this.time);
    // steam
    if (this.steam) {
      const sf = this.steamField;
      sf.ySurf = Math.max(surface, p.yMin + 1);
      sf.radius = rs;
      sf.cx = p.cx;
      sf.cz = p.cz;
      this.steam.update(dt, this.d.reduced ? 0 : steamDensity(vis.tempC, hasLiquid ? 10 : 0), sf, this.d.reduced);
    }
    // solid pieces (also gas sources)
    this.pieces.update(vis.pieces, Math.max(vis.glow, this.kickV * 0.9), p.yMin, radiusAt(p, p.yMin + 0.5), p.cx, p.cz, this.sources);
    // flash at the mouth
    this.flash.mesh.position.set(p.cx, view.def.topY * 0.55, p.cz);
    this.kickV *= Math.exp(-dt * 1.3);
    const burst = Math.max(vis.flash, this.kickV);
    this.flash.update(dt, burst, this.d.soft());
  }

  dispose(): void {
    this.bubbles.dispose();
    this.foam.dispose();
    this.steam?.dispose();
    this.crystals.dispose();
    this.pieces.dispose();
    this.flash.dispose();
    this.group.removeFromParent();
  }
}
