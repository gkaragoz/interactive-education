import { CanvasTexture, Color, CylinderGeometry, DodecahedronGeometry, DoubleSide, Group, LatheGeometry, Mesh, MeshStandardMaterial, SRGBColorSpace, Vector2, type Object3D } from 'three';
import { Flame } from './heater';
import { approach, thermometerTopY } from './helpers';
import type { LabAssets, Tints } from './labAssets';
import { setLinear } from './liquid';
import { lookOf, type Container, type ReagentLook } from './reagentLook';
import { VESSEL_DEFS, type VesselDef } from './vesselDefs';
import { VesselView, coolWater, type ViewDeps } from './vesselView';

const BOTTLE_DEFS: Record<'bottle' | 'jar' | 'dropper', VesselDef> = {
  bottle: { asset: 'reagent-bottle-250ml', topY: 13.35, radius: 3.27, width: 7, fallback: { yMin: 0.26, yMax: 9.3, r: 2.8 }, lipX: 0 },
  jar: { asset: 'powder-jar', topY: 8.2, radius: 3.27, width: 7, fallback: { yMin: 0.26, yMax: 4.6, r: 2.8 }, lipX: 0 },
  dropper: { asset: 'indicator-dropper-bottle', topY: 13.1, radius: 1.85, width: 4.2, fallback: { yMin: 0.17, yMax: 3.9, r: 1.5 }, lipX: 0 },
};

const noPick = (o: Object3D): void => {
  o.traverse((n) => {
    n.raycast = (): void => undefined;
  });
};

/** Anything on the bench that the learner can pick up and put back: a home pose and an eased goal. */
export interface Movable {
  readonly id: string;
  readonly group: Group;
  readonly home: { x: number; y: number; z: number };
  goal: { x: number; y: number; z: number };
  update(dt: number): void;
}

/** A reagent container on the shelf: it is a vessel with a fixed fill (the engine does not track the bottle). */
export class BottleView extends VesselView implements Movable {
  readonly look: ReagentLook;
  private readonly tint: string;

  constructor(look: ReagentLook, deps: ViewDeps) {
    const def = BOTTLE_DEFS[look.container === 'piece' ? 'bottle' : look.container];
    super(look.id, 'beaker100', look.nameTr, deps, def);
    this.look = look;
    this.tint = look.cap;
  }

  override build(): void {
    const { group, asset } = this.deps.assets.objectNow(this.def.asset ?? 'reagent-bottle-250ml', { cap: this.tint, lid: this.tint, label: '#f4eedd' });
    this.asset = asset;
    this.attachGlass(group, asset);
    this.buildLiquids();
    this.addShadow();
    const powder = this.look.container === 'jar';
    this.target.fill = powder ? 0.72 : 0.68;
    this.target.rgb = coolWater(this.look.rgb);
    this.target.alpha = 0.42 + 0.5 * (1 - (this.look.rgb[0] + this.look.rgb[1] + this.look.rgb[2]) / 765);
    this.snap();
    // the stock label is a painted decal (name, strength) instead of the asset's flat sleeve
    const sleeve = this.body.getObjectByName('label');
    if (sleeve) sleeve.visible = false;
    this.addDecal();
    if (powder) {
      // powders are matte mounds, not a liquid volume
      const lm = this.liquids[0];
      if (lm) lm.mesh.visible = false;
      this.addMound();
    }
  }

  private extras: { dispose(): void }[] = [];

  private addDecal(): void {
    if (typeof document === 'undefined') return;
    const dropper = this.look.container === 'dropper';
    const w = 256;
    const h = 160;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (!g) return;
    g.fillStyle = '#f6efdf';
    g.fillRect(0, 0, w, h);
    g.fillStyle = this.look.cap;
    g.fillRect(0, 0, w, 26);
    g.fillStyle = '#3a2f26';
    g.textAlign = 'center';
    const words = this.look.nameTr.split(' ');
    const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 ? words : [this.look.nameTr];
    const size = Math.max(22, Math.min(40, 330 / Math.max(...lines.map((l) => l.length), 6)));
    g.font = `700 ${size}px "Cormorant Garamond", Georgia, serif`;
    lines.forEach((l, i) => g.fillText(l, w / 2, 68 + i * (size + 4)));
    g.font = '600 24px Georgia, serif';
    g.fillStyle = '#6b5a4a';
    g.fillText(this.look.labelTr, w / 2, h - 18);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    const r = this.def.radius + 0.07;
    const height = dropper ? 3.2 : 4.6;
    const geo = new CylinderGeometry(r, r, height, 28, 1, true, -(dropper ? 2.2 : 1.7) / 2, dropper ? 2.2 : 1.7);
    const mat = new MeshStandardMaterial({ map: tex, roughness: 0.75, side: DoubleSide });
    const decal = new Mesh(geo, mat);
    decal.position.set(0, dropper ? 4.6 : this.look.container === 'jar' ? 3.9 : 5.2, 0);
    decal.raycast = (): void => undefined;
    decal.userData['simId'] = this.id;
    this.body.add(decal);
    this.extras.push({ dispose: () => { tex.dispose(); geo.dispose(); mat.dispose(); } });
  }

  private addMound(): void {
    const r = this.def.radius * 0.84;
    const pts = [new Vector2(0.001, 2.9), new Vector2(r * 0.3, 2.75), new Vector2(r * 0.7, 2.1), new Vector2(r, 1.0), new Vector2(r, 0.3), new Vector2(0.001, 0.3)];
    const geo = new LatheGeometry(pts, 28);
    const mat = new MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
    setLinear(mat.color, [Math.min(255, this.look.rgb[0] * 0.95), Math.min(255, this.look.rgb[1] * 0.95), Math.min(255, this.look.rgb[2] * 0.95)]);
    const m = new Mesh(geo, mat);
    m.raycast = (): void => undefined;
    this.body.add(m);
    this.extras.push({ dispose: () => { geo.dispose(); mat.dispose(); } });
  }

  protected override updateLiquids(dt: number): void {
    if (this.look.container !== 'jar') super.updateLiquids(dt);
  }

  override dispose(): void {
    for (const e of this.extras) e.dispose();
    super.dispose();
  }

  /** Hides the lid while a powder is poured. */
  setLid(open: boolean): void {
    this.body.traverse((o) => {
      if (o.name === 'lid') o.visible = !open;
    });
  }

  override sample(): void {
    // fixed content
  }
}

/** A small solid shown on the bench (nail, ribbon coil, wire, granules, foil): picked up whole and dropped into a vessel. */
export class PieceProp implements Movable {
  readonly group = new Group();
  readonly home = { x: 0, y: 0, z: 0 };
  goal = { x: 0, y: 0, z: 0 };
  private readonly mat: MeshStandardMaterial | null = null;
  private readonly geo: DodecahedronGeometry | null = null;

  constructor(readonly look: ReagentLook, assets: LabAssets) {
    this.group.name = `piece:${look.id}`;
    this.group.userData['simId'] = look.id;
    const asset = look.id === 'fe-nail' ? 'iron-nail' : look.id === 'mg-ribbon' ? 'magnesium-ribbon-coil' : look.id === 'cu-wire' ? 'copper-strip' : null;
    if (asset) {
      const o = assets.objectNow(asset).group;
      this.group.add(o);
    } else {
      this.geo = new DodecahedronGeometry(0.5, 0);
      this.mat = new MeshStandardMaterial({ roughness: 0.5, metalness: 0.6, flatShading: true });
      setLinear(this.mat.color, look.rgb);
      for (let i = 0; i < 3; i++) {
        const m = new Mesh(this.geo, this.mat);
        m.position.set(i * 1.1 - 1.1, 0.4, (i % 2) * 0.6);
        m.rotation.set(i, i * 1.7, 0);
        if (look.id === 'al-foil') m.scale.set(1.5, 0.35, 1.3);
        m.castShadow = true;
        this.group.add(m);
      }
    }
    this.group.traverse((o) => {
      o.userData['simId'] = look.id;
    });
  }

  get id(): string {
    return this.look.id;
  }

  update(dt: number): void {
    const p = this.group.position;
    p.x = approach(p.x, this.goal.x, 10, dt);
    p.y = approach(p.y, this.goal.y, 10, dt);
    p.z = approach(p.z, this.goal.z, 10, dt);
  }

  dispose(): void {
    this.mat?.dispose();
    this.geo?.dispose();
    this.group.removeFromParent();
  }
}

export type ToolId = 'tool:rod' | 'tool:strip' | 'tool:thermo' | 'tool:splint';
export const TOOL_NAMES: Record<ToolId, string> = { 'tool:rod': 'Cam çubuk', 'tool:strip': 'pH kâğıdı', 'tool:thermo': 'Termometre', 'tool:splint': 'Yanan çıra' };

/** A hand tool (rod, pH strip, thermometer, splint): picked up, used on a vessel, returned. */
export class ToolProp implements Movable {
  readonly group = new Group();
  readonly home = { x: 0, y: 0, z: 0 };
  goal = { x: 0, y: 0, z: 0 };
  /** Tilt about z (radians) of the whole tool, eased. */
  roll = 0;
  rollGoal = 0;
  /** Spin of a stirring rod (radians, animated by the interactor). */
  readonly inner = new Group();
  private readonly column: Mesh | null = null;
  private readonly stripMat: MeshStandardMaterial | null = null;
  private readonly flame: Flame | null = null;
  private columnTop = -1;

  constructor(readonly id: ToolId, assets: LabAssets, flameOn = false) {
    this.group.name = id;
    this.group.userData['simId'] = id;
    this.group.add(this.inner);
    const asset = id === 'tool:rod' ? 'glass-rod' : id === 'tool:strip' ? 'ph-paper-strip' : id === 'tool:thermo' ? 'thermometer' : 'splint';
    const tints: Tints | undefined = id === 'tool:strip' ? { strip: '#ecdcae' } : id === 'tool:thermo' ? { column: '#d8312e' } : undefined;
    const o = assets.objectNow(asset, tints).group;
    this.inner.add(o);
    this.column = (o.getObjectByName('column') as Mesh | undefined) ?? null;
    this.stripMat = id === 'tool:strip' ? (((o.getObjectByName('strip') as Mesh | undefined)?.material as MeshStandardMaterial | undefined) ?? null) : null;
    if (id === 'tool:splint' && flameOn) {
      this.flame = new Flame(1.6, 3.4);
      this.flame.group.position.set(0, 15, 0);
      this.inner.add(this.flame.group);
    }
    this.group.traverse((n) => {
      n.userData['simId'] = id;
    });
  }

  /** Thermometer reading (clips the red column). */
  setTemperature(tempC: number): void {
    if (!this.column) return;
    const top = thermometerTopY(tempC);
    if (Math.abs(top - this.columnTop) < 0.02) return;
    this.columnTop = top;
    const s = Math.max(0.05, (top - 0.5) / 19.4);
    this.column.scale.y = s;
    this.column.position.y = 0.5 * (1 - s);
  }

  /** Colour of a dipped pH strip. */
  setStripColor(rgb: readonly [number, number, number] | null): void {
    if (!this.stripMat) return;
    if (rgb) setLinear(this.stripMat.color, rgb);
    else this.stripMat.color.set(new Color('#ecdcae'));
  }

  setFlame(on: boolean, dt: number, reduced: boolean): void {
    this.flame?.update(dt, on ? 0.5 : 0, 0, reduced);
  }

  update(dt: number): void {
    const p = this.group.position;
    p.x = approach(p.x, this.goal.x, 12, dt);
    p.y = approach(p.y, this.goal.y, 12, dt);
    p.z = approach(p.z, this.goal.z, 12, dt);
    this.roll = approach(this.roll, this.rollGoal, 9, dt);
    this.group.rotation.z = this.roll;
  }

  dispose(): void {
    this.flame?.dispose();
    this.group.removeFromParent();
  }
}

export const containerOf = (id: string): Container | null => lookOf(id)?.container ?? null;
export const noPickTree = noPick;
export { VESSEL_DEFS };
