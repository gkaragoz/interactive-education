import { CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, LatheGeometry, Vector2, Vector3, type BufferGeometry, type Object3D } from 'three';
import type { Vessel, VesselKind, VesselVisual } from '../../chemlab';
import { approach, clamp, lerp, levelY as levelAt, mixRgb, layerHeightCm, wobbleAmplitude, type Rgb } from './helpers';
import { partGeometry, type LabAsset, type LabAssets } from './labAssets';
import { LiquidMesh, setLinear, type LiquidState } from './liquid';
import { areaAt, profileOf, radiusAt, type Profile } from './profile';
import { VESSEL_DEFS, type VesselDef } from './vesselDefs';

let blobTexture: CanvasTexture | null = null;
/** Soft round contact shadow texture (one for all vessels). */
function blob(): CanvasTexture | null {
  if (blobTexture || typeof document === 'undefined') return blobTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g) return null;
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, 'rgba(20,14,10,0.75)');
  grd.addColorStop(0.55, 'rgba(20,14,10,0.35)');
  grd.addColorStop(1, 'rgba(20,14,10,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  blobTexture = new CanvasTexture(c);
  return blobTexture;
}

export interface ViewDeps {
  assets: LabAssets;
  low: boolean;
  reduced: boolean;
}

const SED_DENSITY = 2.2;
const WATER: Rgb = [215, 233, 247];
/** Thick water is a little cooler and darker than the engine's near-white transmitted light. */
export const coolWater = (c: Rgb): Rgb => {
  // only near-white liquids are cooled; indicator and salt colours keep (and gain) their saturation
  const mx = Math.max(c[0], c[1], c[2]);
  const mn = Math.min(c[0], c[1], c[2]);
  const k = clamp(1 - ((mx - mn) / 255) * 3.5);
  const cool: Rgb = [c[0] * 0.72, c[1] * 0.88, Math.min(255, c[2])];
  const lum = (c[0] + c[1] + c[2]) / 3;
  return [0, 1, 2].map((i) => Math.round(clamp(lerp(lum + ((c[i] ?? 0) - lum) * 1.3, cool[i] ?? 0, k), 0, 255))) as unknown as Rgb;
};

/** Cavity geometry when the asset has no `inner` mesh (placeholder, funnel): a lathe of the given profile. */
export function fallbackInner(kind: VesselKind): BufferGeometry {
  const f = VESSEL_DEFS[kind].fallback;
  if (kind === 'funnel') {
    const pts = [new Vector2(0.01, f.yMin), new Vector2(0.4, f.yMin + 0.2), new Vector2(f.r, f.yMax), new Vector2(0.01, f.yMax)];
    return new LatheGeometry(pts, 24);
  }
  const g = new CylinderGeometry(f.r, f.r, f.yMax - f.yMin, 24, 1, false);
  g.translate(0, (f.yMax + f.yMin) / 2, 0);
  return g;
}

/**
 * One vessel on the bench: glass from the asset, the liquid volume shader on its `inner` cavity, smoothed display state.
 * The engine (10 Hz samples) sets targets; `update` eases the displayed values every frame so fills rise and colours
 * fade instead of jumping.
 */
export class VesselView {
  /** Moves across the bench (home, balance, stand, held by the pointer). */
  readonly group = new Group();
  /** Tilts about the pouring lip. */
  readonly pivot = new Group();
  /** Everything the vessel carries, offset so the lip is the pivot origin. */
  readonly body = new Group();
  readonly liquids: LiquidMesh[] = [];
  private shadow: Mesh | null = null;
  /** Resting pose (the slot on the bench or shelf). */
  readonly home = { x: 0, y: 0, z: 0 };
  readonly def: VesselDef;
  asset: LabAsset | null = null;
  profile: Profile;
  /** Smoothed displayed values (read by effects). */
  fill = 0;
  color = new Color(0.92, 0.96, 1);
  alpha = 0.3;
  turbidity = 0;
  sedimentH = 0;
  topAmount = 0;
  topColor = new Color(1, 1, 1);
  wobble = 0;
  wobbleBase = 0;
  /** Target set by the sampler. */
  target = { fill: 0, rgb: WATER as Rgb, alpha: 0.3, turb: 0, sedH: 0, sedRgb: [230, 230, 230] as Rgb };
  readonly sedColor = new Color(0.9, 0.9, 0.9);
  readonly turbColor = new Color(1, 1, 1);
  /** Eased pose the scene drives. */
  pos = new Vector3();
  goal = new Vector3();
  tilt = 0;
  tiltGoal = 0;
  facing = 1;
  /** Rate (1/s) at which the displayed fill follows the engine; pouring jobs slow it down. */
  fillRate = 5;
  /** The latest engine sample (read by the effects). */
  vis: VesselVisual | null = null;
  raw: Readonly<Vessel> | null = null;

  constructor(readonly id: string, readonly kind: VesselKind, readonly labelTr: string, protected readonly deps: ViewDeps, defOverride?: VesselDef) {
    this.def = defOverride ?? VESSEL_DEFS[kind];
    const f = this.def.fallback;
    this.profile = { r: new Float32Array(16).fill(f.r), yMin: f.yMin, yMax: f.yMax, cx: 0, cz: 0 };
    this.group.name = `vessel:${id}`;
    this.group.userData['simId'] = id;
    this.group.add(this.pivot);
    this.pivot.add(this.body);
    this.pivot.position.set(this.def.lipX, this.def.topY, 0);
    this.body.position.set(-this.def.lipX, -this.def.topY, 0);
  }

  get lip(): Vector3 {
    return this.group.localToWorld(new Vector3(this.def.lipX, this.def.topY, 0));
  }

  /** Builds the glass and the liquid from preloaded assets; call once. */
  build(): void {
    if (this.def.asset) {
      const { group, asset } = this.deps.assets.objectNow(this.def.asset);
      this.asset = asset;
      this.attachGlass(group, asset);
    }
    this.buildLiquids();
    this.addShadow();
  }

  protected addShadow(): void {
    const tex = blob();
    if (!tex || this.def.radius > 12 || this.kind === 'burette25' || this.kind === 'funnel' || this.kind === 'gas-tube') return;
    const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.55 });
    const r = Math.max(1.6, this.def.radius) * 2.7;
    this.shadow = new Mesh(new PlaneGeometry(r, r), mat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 1;
    this.shadow.raycast = (): void => undefined;
    this.group.add(this.shadow);
  }

  protected attachGlass(group: Group, asset: LabAsset): void {
    // the original `inner` mesh is replaced by our liquid shader
    const inner = group.getObjectByName('inner');
    inner?.removeFromParent();
    group.traverse((o: Object3D) => {
      o.userData['simId'] = this.id;
    });
    this.body.add(group);
    const liq = asset.meta.liquid;
    if (liq) this.profile = this.makeProfile(asset, liq.yMin, liq.yMax);
  }

  protected makeProfile(asset: LabAsset, yMin: number, yMax: number, partName = 'inner'): Profile {
    const geo = partGeometry(asset, partName);
    if (!geo) return { ...this.profile, yMin, yMax };
    return profileOf(geo.getAttribute('position').array, yMin, yMax);
  }

  protected buildLiquids(): void {
    const geo = (this.asset ? partGeometry(this.asset, 'inner') : null) ?? fallbackInner(this.kind);
    const lm = new LiquidMesh(geo, this.profile, this.deps.low);
    this.body.add(lm.mesh);
    this.liquids.push(lm);
  }

  /** Engine state to targets. `v` is read-only; `vis` the visual summary (sampled at about 10 Hz). */
  sample(vis: VesselVisual, v: Readonly<Vessel>): void {
    const t = this.target;
    t.fill = vis.fillLevel;
    t.rgb = coolWater(vis.liquidRgb);
    t.alpha = 0.42 + 0.5 * vis.liquidAlpha + 0.12 * clamp((Math.max(...vis.liquidRgb) - Math.min(...vis.liquidRgb)) / 120);
    t.turb = vis.turbidity;
    let massG = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    for (const s of vis.sediment) {
      massG += s.massG;
      r += s.rgb[0] * s.massG;
      g += s.rgb[1] * s.massG;
      b += s.rgb[2] * s.massG;
    }
    if (massG > 0) t.sedRgb = [r / massG, g / massG, b / massG];
    const area = areaAt(this.profile, this.profile.yMin + 0.3);
    t.sedH = massG > 0.001 ? Math.min((this.profile.yMax - this.profile.yMin) * 0.45, Math.max(0.12, layerHeightCm(massG, SED_DENSITY, area))) : 0;
    this.vis = vis;
    this.raw = v;
    this.wobbleBase = wobbleAmplitude(v.stirring, 0, vis.tempC >= 98.5 && v.heat ? 1 : 0, this.deps.reduced);
  }

  /** Jump the displayed values to the targets (after loading a bench or restoring a snapshot). */
  snap(): void {
    const t = this.target;
    this.fill = t.fill;
    this.rgbCache = [...t.rgb];
    setLinear(this.color, t.rgb);
    this.alpha = t.alpha;
    this.turbidity = t.turb;
    this.sedimentH = t.sedH;
    this.topAmount = 0;
    this.pos.copy(this.goal);
  }

  /** The liquid height (on the vessel axis, object space) for the displayed fill. */
  get levelY(): number {
    return levelAt(this.fill, this.profile.yMin, this.profile.yMax);
  }

  radiusAtLevel(): number {
    return radiusAt(this.profile, this.levelY);
  }

  /** Mixes an incoming liquid into the top layer (called at the start of a pour); fades down over a couple of seconds. */
  mixIn(rgb: Rgb, ml: number): void {
    setLinear(this.topColor, rgb);
    this.topAmount = clamp(0.45 + ml / 60, 0, 1);
  }

  update(dt: number): void {
    const t = this.target;
    this.fill = approach(this.fill, t.fill, this.fillRate, dt);
    if (Math.abs(this.fill - t.fill) < 0.0004) this.fill = t.fill;
    // colour eases in display space (a gentle fade for indicator changes and reactions)
    const cur: Rgb = [this.rgbCache[0], this.rgbCache[1], this.rgbCache[2]];
    const next = mixRgb(cur, t.rgb, 1 - Math.exp(-dt * 2.6));
    this.rgbCache = next;
    setLinear(this.color, next);
    this.alpha = approach(this.alpha, t.alpha, 3, dt);
    this.turbidity = approach(this.turbidity, t.turb, 2.2, dt);
    this.sedimentH = approach(this.sedimentH, t.sedH, 1.5, dt);
    setLinear(this.sedColor, t.sedRgb);
    setLinear(this.turbColor, mixRgb(t.sedRgb, [255, 255, 255], 0.2));
    this.topAmount = Math.max(0, this.topAmount - dt * 0.42);
    // eased pose
    this.pos.x = approach(this.pos.x, this.goal.x, 9, dt);
    this.pos.y = approach(this.pos.y, this.goal.y, 9, dt);
    this.pos.z = approach(this.pos.z, this.goal.z, 9, dt);
    this.group.position.copy(this.pos);
    if (this.shadow) {
      // the shadow stays on the bench while the vessel is lifted or carried, fading with height
      const lift = Math.max(0, this.pos.y - this.home.y);
      this.shadow.position.set(0, -this.pos.y + this.home.y + 0.04, 0);
      (this.shadow.material as MeshBasicMaterial).opacity = 0.55 / (1 + lift * 0.12);
    }
    this.tilt = approach(this.tilt, this.tiltGoal, 8, dt);
    this.pivot.rotation.set(0, this.facing < 0 ? Math.PI : 0, -this.tilt);
    this.wobble = this.deps.reduced ? 0 : approach(this.wobble, this.wobbleBase, 2.5, dt);
    this.updateLiquids(dt);
  }

  private rgbCache: [number, number, number] = [235, 245, 255];

  protected updateLiquids(dt: number): void {
    const lm = this.liquids[0];
    if (!lm) return;
    lm.set(this.liquidState(this.levelY), dt);
  }

  protected liquidState(levelY: number): LiquidState {
    return {
      levelY,
      color: this.color,
      alpha: this.alpha,
      turbidity: this.turbidity,
      turbColor: this.turbColor,
      sedimentTopY: this.sedimentH > 0.02 ? this.profile.yMin + this.sedimentH : -100,
      sedimentColor: this.sedColor,
      topColor: this.topColor,
      topAmount: this.topAmount,
      topDepth: 0.5 + 0.8 * (1 - this.topAmount),
      wobble: this.wobble,
    };
  }

  /** Meshes that carry the vessel's own pickable surfaces. */
  pickables(): Mesh[] {
    const out: Mesh[] = [];
    this.group.traverse((o) => {
      if ((o as Mesh).isMesh) out.push(o as Mesh);
    });
    return out;
  }

  dispose(): void {
    if (this.shadow) {
      this.shadow.geometry.dispose();
      (this.shadow.material as MeshBasicMaterial).dispose();
    }
    for (const l of this.liquids) l.dispose();
    this.group.removeFromParent();
  }
}
