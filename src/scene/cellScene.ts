import { Group, Mesh, Vector3, type Raycaster, type Texture } from 'three';
import type { QualitySettings } from '../core';
import type { CellInfo, OrganelleInfo } from '../data/types';
import type { OrganelleAsset } from './assetTypes';
import { capColorFor, CAVITY_COLORS } from './capColors';
import { Cutaway } from './cutaway';
import { solveLayout, type PlacedInstance } from './layout';
import { MaterialLibrary } from './materials';
import { OrganelleSet } from './organelleSet';
import { shellProxyGeometry } from './placeholders';
import { shadeBowl } from './bowl';
import { focusTargetOf, labelAnchorOf, pickInScene } from './sceneQueries';
import { AmbientLayer, isDecorId } from './ambient';
import { ShellParts } from './shellParts';
import type { AssetTextures } from './textureStore';

export interface CellSceneInit {
  cell: CellInfo;
  organelles: ReadonlyMap<string, OrganelleInfo>;
  assets: ReadonlyMap<string, OrganelleAsset>;
  normalMap: Texture;
  quality: QualitySettings;
  /** Uniform scale applied to the whole cell (compare mode normalises sizes). */
  scale?: number;
}

export interface VisibilityRules {
  hidden: ReadonlySet<string>;
  /** Show only this organelle (one instance) and hide the shell. */
  isolateId: string | null;
  /** Keep the shell but hide every other organelle. */
  hideOthersId: string | null;
  /** The instance of the selected organelle that was picked (tinted, isolated, focused). */
  focusIndex?: number | null;
  selectedId?: string | null;
}

export interface PickResult {
  id: string;
  index: number;
  distance: number;
  isShell: boolean;
}

export const MAX_CUT = 0.85;
const LOD_NEAR = 0.05;
const LOD_MID = 0.012;
const FIT_FILL = 0.98;

/** One assembled cell: shell parts, instanced organelles, cutaway, materials. Built from data and assets only. */
export class CellScene {
  readonly cell: CellInfo;
  readonly group = new Group();
  readonly cutaway: Cutaway;
  readonly materials: MaterialLibrary;
  readonly instances: PlacedInstance[];
  readonly sets = new Map<string, OrganelleSet>();
  readonly shell: ShellParts;
  /** Half extent of the biggest axis in world units, used to frame the camera. */
  radius: number;
  scale: number;
  private baseRadius: number;
  private quality: QualitySettings;
  private readonly baseOpacity = new Map<object, number>();
  private readonly bed: Mesh;
  private ambient: AmbientLayer | null = null;
  private assetMap: ReadonlyMap<string, OrganelleAsset>;
  private ambientAllowed = true;
  private bedAllowed = true;
  private shellFactor = 1;
  private studFade = 1;
  private lastFade = 1;
  private focusId: string | null = null;

  constructor(init: CellSceneInit) {
    this.cell = init.cell;
    this.assetMap = init.assets;
    this.quality = init.quality;
    this.scale = init.scale ?? 1;
    this.group.name = `cell-${init.cell.id}`;
    this.group.scale.setScalar(this.scale);
    const info = init.organelles;
    this.cutaway = new Cutaway((key) => capColorFor(key, init.cell.shellOrganelleIds, info), init.normalMap);
    this.materials = new MaterialLibrary(init.normalMap, this.cutaway.plane);
    this.baseRadius = Math.max(...init.cell.shell.halfExtents);
    this.radius = this.baseRadius * this.scale;

    this.shell = new ShellParts(init.cell.shellOrganelleIds, init.assets, init.cell.shell.halfExtents, this.materials, this.cutaway, this.group);
    this.baseRadius = Math.max(this.baseRadius, this.shell.reach.x, this.shell.reach.y, this.shell.reach.z);
    this.radius = this.baseRadius * this.scale;

    // The cytoplasm bed: the inside of the cell's outline, shaded like a bowl, seen through the cut. Only drawn while cutting.
    const he = init.cell.shell.halfExtents.map((v) => v * 0.97) as [number, number, number];
    this.bed = new Mesh(shadeBowl(shellProxyGeometry(init.cell.shell.shape, he)), this.materials.bed(CAVITY_COLORS[init.cell.id] ?? '#9dc0a0'));
    this.bed.renderOrder = 20;
    this.bed.visible = false;
    this.bed.receiveShadow = true;
    this.group.add(this.bed);

    this.instances = solveLayout(init.cell, (id) => init.assets.get(id)?.boundsRadius ?? 1, undefined, (id) => init.assets.get(id)?.halfExtents);
    const byId = new Map<string, PlacedInstance[]>();
    for (const inst of this.instances) byId.set(inst.organelleId, [...(byId.get(inst.organelleId) ?? []), inst]);
    for (const [id, list] of byId) {
      const asset = init.assets.get(id);
      if (asset) this.sets.set(id, new OrganelleSet(id, asset, list, this.materials, this.cutaway, this.group));
    }
    for (const mat of this.materials.all()) this.baseOpacity.set(mat, mat.opacity);
    this.shell.setStudsEnabled(this.quality.studs);
    this.cutaway.setOrganelleCaps(this.quality.organelleCaps);
    this.syncAmbient();
    this.group.traverse((o) => {
      if ((o as Mesh).isMesh) (o as Mesh).receiveShadow = true;
    });
  }

  /** Puts one asset's painted textures on this scene's materials (the textures themselves are shared). */
  applyTextures(textures: AssetTextures, fade: boolean): void {
    this.materials.applyMaps(textures.id, 'clay', textures.clay, fade);
    this.materials.applyMaps(textures.id, 'gel', textures.gel, fade);
  }

  /** Advances the brightness ramp of newly textured materials; true while it still runs. */
  tickTextures(dt: number): boolean {
    return this.materials.tickFade(dt);
  }

  setQuality(quality: QualitySettings): void {
    this.quality = quality;
    this.shell.setStudsEnabled(quality.studs);
    this.cutaway.setOrganelleCaps(quality.organelleCaps);
    this.syncAmbient();
  }

  /** Builds the ambient layer the first time a preset wants it; hides it when the preset does not. */
  private syncAmbient(): void {
    if (this.quality.ambient && !this.ambient) {
      this.ambient = new AmbientLayer(this.cell, this.instances, this.assetMap, this.materials, this.cutaway.plane);
      this.group.add(this.ambient.group);
      for (const mat of this.materials.all()) if (!this.baseOpacity.has(mat)) this.baseOpacity.set(mat, mat.opacity);
    }
    this.ambient?.setVisible(this.quality.ambient && this.ambientAllowed);
  }

  /** Moves the ambient layer (vesicles, particles, flagellum wave); returns whether anything moves. */
  updateAmbient(seconds: number, motion: boolean): boolean {
    this.materials.setWave(motion && this.quality.ambient ? 1 : 0, seconds);
    if (!motion || !this.quality.ambient || !this.ambient?.group.visible) return false;
    this.ambient.update(seconds);
    return true;
  }

  hasDecor(): boolean {
    return [...this.assetMap.keys()].some(isDecorId);
  }

  /** Adds the decor assets after the scene was built (they load in the background); builds the ambient layer if wanted. */
  addDecor(assets: ReadonlyMap<string, OrganelleAsset>): void {
    this.assetMap = new Map([...this.assetMap, ...assets]);
    this.syncAmbient();
  }

  /** Every asset id whose textures this scene uses, decor included. */
  textureIds(): string[] {
    return [...this.sets.keys(), ...this.cell.shellOrganelleIds, ...[...this.assetMap.keys()].filter(isDecorId)];
  }

  applyVisibility(rules: VisibilityRules): void {
    const { hidden, isolateId, hideOthersId, selectedId = null, focusIndex = null } = rules;
    this.focusId = selectedId;
    for (const [id, set] of this.sets) {
      set.setVisible(!hidden.has(id) && (!isolateId || id === isolateId) && (!hideOthersId || id === hideOthersId));
      set.setIsolate(isolateId === id ? (focusIndex ?? 0) : null);
      set.setFocus(selectedId === id && !isolateId ? focusIndex : null);
      set.setOutline(selectedId === id && !isolateId);
      this.materials.setDim(id, selectedId !== null && selectedId !== id && !isolateId ? 1 : 0);
    }
    // A selected organelle is easier to see through a fainter shell.
    this.ambientAllowed = !isolateId && !hideOthersId;
    this.syncAmbient();
    this.shellFactor = selectedId !== null && this.sets.has(selectedId) ? 0.35 : 1;
    this.shell.setVisible((id) => !isolateId && !hidden.has(id));
    this.bedAllowed = this.shell.anyVisible();
    this.bed.visible = this.bedAllowed && this.cutaway.isActive;
    this.applyOpacities();
    this.cutaway.syncTwins();
  }

  /** Cut position 0..1 (0 = no cut): removes the top of the cell above a horizontal plane. Returns whether a cut is active. */
  setCut(position: number, enabled: boolean): boolean {
    // The slider stops short of the very bottom: below this the cut leaves only a paper-thin floor slice.
    position = Math.min(position, MAX_CUT);
    const active = enabled && position > 0.001;
    const top = this.shell.reach.y * this.scale || this.radius * 0.5;
    const y = top * (1.08 - position * 1.9);
    this.cutaway.setCut(active, y, this.radius * 2.8);
    for (const set of this.sets.values()) set.setCut(active ? y / this.scale : null);
    this.shell.setCutMode(active);
    this.bed.visible = active && this.bedAllowed;
    this.applyOpacities();
    this.cutaway.syncTwins();
    return active;
  }

  get cutActive(): boolean {
    return this.cutaway.isActive;
  }

  /** Horizontal and vertical half sizes the camera has to fit (elongated cells such as the bacterium are wide, not tall). */
  framing(): { h: number; v: number } {
    const r = this.shell.reach;
    const rx = Math.max(r.x, this.cell.shell.halfExtents[0]);
    const ry = Math.max(r.y, this.cell.shell.halfExtents[1]);
    const rz = Math.max(r.z, this.cell.shell.halfExtents[2]);
    return { h: Math.max(rx, rz) * this.scale, v: Math.hypot(ry, Math.min(rx, rz) * 0.8) * this.scale };
  }

  /** Uniform scale of the whole cell (compare mode shows both cells at the same size). */
  setScale(scale: number): void {
    this.scale = scale;
    this.radius = this.baseRadius * scale;
    this.group.scale.setScalar(scale);
  }

  /**
   * Per-instance LOD from a triangle budget: everything starts at the coarsest mesh, then the instances that are biggest
   * on screen (the selected organelle first) are upgraded while the budget and the cap on full-detail items allow.
   */
  updateLod(cameraWorld: Vector3): void {
    const local = this.group.worldToLocal(cameraWorld.clone());
    const bias = this.quality.lodBias;
    const entries: { set: OrganelleSet; index: number; size: number }[] = [];
    const p = new Vector3();
    for (const set of this.sets.values()) {
      for (const index of set.visibleIndices()) {
        const inst = set.instances[index] as PlacedInstance;
        const d = Math.max(p.set(...inst.position).distanceTo(local), 1e-3);
        const boost = set.id === this.focusId ? 3 : 1;
        entries.push({ set, index, size: (inst.radius / d) * bias * boost });
      }
    }
    entries.sort((a, b) => b.size - a.size);
    const cull = this.quality.cullSize;
    const shellCost = this.shellTriangles();
    // Stencil twins redraw the solids while cutting, though at a coarser level.
    const budget = this.quality.triBudget - shellCost;
    const lods = new Map<OrganelleSet, number[]>();
    let cost = 0;
    for (const set of this.sets.values()) {
      lods.set(set, set.instances.map(() => 2));
    }
    for (const e of entries) {
      const list = lods.get(e.set) as number[];
      if (e.size < cull && e.set.id !== this.focusId) list[e.index] = 3;
      else cost += e.set.trisAt(2) * (this.cutActive && this.quality.organelleCaps && e.set.radius >= 1.2 ? 1.6 : 1);
    }
    const upgrade = (from: number, to: number, threshold: number, limit: number): void => {
      let used = 0;
      for (const e of entries) {
        const list = lods.get(e.set);
        if (!list || list[e.index] !== from || e.size < threshold || used >= limit) continue;
        const extra = e.set.trisAt(to) - e.set.trisAt(from); // twins stay at the coarsest level, so only the visible mesh grows
        if (cost + extra > budget) continue;
        list[e.index] = to;
        cost += extra;
        used++;
      }
    };
    upgrade(2, 1, LOD_MID, Infinity);
    upgrade(1, 0, LOD_NEAR, this.quality.lod0Max);
    for (const [set, list] of lods) set.setLods(list);

    // The cut edge of the shell is its most visible outline: finer shell while cutting, and no far-away downgrade.
    const fit = this.framing();
    // Relief fades out when the camera is within a few radii of some organelle (projected size radius / distance).
    let nearest = 0;
    for (const e of entries) nearest = Math.max(nearest, e.size / (bias * (e.set.id === this.focusId ? 3 : 1)));
    this.materials.setRelief(Math.min(1, Math.max(0.3, 1 - (nearest - 0.25) * 1.6)));
    const far = !this.cutActive && local.length() > (3.2 * Math.max(fit.h, fit.v)) / this.scale;
    this.shell.setLod(Math.min(2, this.shellLevel() + (far ? 1 : 0)));
    // Protein studs on the shell read as confetti up close; fade them out with distance and in the zoomed-out view.
    const fade = Math.min(1, Math.max(0, 1 - (local.length() / this.baseRadius - 1.5) / 1.2));
    if (Math.abs(fade - this.studFade) > 0.03) {
      this.studFade = fade;
      this.applyOpacities();
    }
    this.cutaway.syncTwins();
  }

  /** Shell triangles drawn at the current detail level (twice: depth prepass or stencil twin). */
  private shellTriangles(): number {
    return this.shell.trianglesAt(this.shellLevel()) * 2;
  }

  private shellLevel(): number {
    return this.cutActive ? Math.max(0, this.quality.shellLod - 1) : this.quality.shellLod;
  }

  setGlow(id: string, amount: number): void {
    this.materials.setGlow(id, amount);
  }

  /** Fades the whole cell (1 = opaque). Used for the cell-switch transition. */
  setFade(fade: number): void {
    this.lastFade = fade;
    this.applyOpacities();
  }

  private applyOpacities(): void {
    const shell = new Set<object>();
    for (const part of this.shell.parts) for (const m of part.meshes) shell.add(m.ghost);
    for (const mat of this.materials.all()) {
      let base = mat.userData.alphaMap ? 1 : (this.baseOpacity.get(mat) ?? 1);
      if (this.shell.studMaterials.has(mat)) base *= this.studFade;
      else if (shell.has(mat) && !this.cutActive) base *= this.shellFactor;
      const fade = this.lastFade;
      const alpha = mat.userData.alphaMap === true;
      mat.transparent = fade < 0.999 || base < 1 || alpha;
      mat.opacity = base * fade;
      mat.depthWrite = fade >= 0.999 && base >= 1 && !alpha;
    }
  }

  pick(raycaster: Raycaster): PickResult | null {
    return pickInScene(this, raycaster);
  }

  /** World-space anchor for an organelle's label: the nearest visible instance (see `sceneQueries.ts`). */
  labelAnchor(id: string, cameraWorld: Vector3, prefer: number | null = null): Vector3 | null {
    return labelAnchorOf(this, id, cameraWorld, prefer);
  }

  /** World centre, radius and instance index of an organelle: the instance nearest to `from`. */
  focusTarget(id: string, from: Vector3): { center: Vector3; radius: number; index: number } | null {
    return focusTargetOf(this, id, from);
  }

  /** Distance at which a bounding sphere fills `FIT_FILL` of the vertical field of view. */
  static fitDistance(radius: number, fovDeg: number, aspect = 1): number {
    const fov = (fovDeg * Math.PI) / 180;
    const vertical = radius / Math.sin(fov / 2);
    const horizontal = radius / Math.sin(Math.atan(Math.tan(fov / 2) * aspect));
    return Math.max(vertical, horizontal) / FIT_FILL;
  }

  dispose(): void {
    this.cutaway.dispose();
    for (const set of this.sets.values()) set.dispose();
    this.sets.clear();
    this.shell.dispose();
    this.bed.geometry.dispose();
    this.materials.dispose();
    this.ambient?.dispose();
    this.group.removeFromParent();
  }
}
