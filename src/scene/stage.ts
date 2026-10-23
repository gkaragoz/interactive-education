import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer, type Texture } from 'three';
import type { QualityMode, QualityName } from '../core';
import type { CellTypeId } from '../data/types';
import { AssetLibrary } from './assets';
import { CameraRig } from './cameraRig';
import type { CellScene } from './cellScene';
import { guardContext } from './contextGuard';
import { createEnvironmentTexture } from './environment';
import { FrameStats } from './frameStats';
import { StageQuality } from './stageQuality';
import { LabelLayer } from './labels';
import { chooseFocusIndex, focusCamera } from './stageFocus';
import { createDebug, type StageDebug } from './stageDebug';
import { createMicroNormalTexture } from './normalMap';
import { PaneSet } from './paneSet';
import { buildCellScene, labelSpecs } from './sceneBuilder';
import { applyGlow, SceneFades } from './stageEffects';
import { StageInput } from './stageInput';
import type { StageEvents, StageOptions, ViewState } from './stageTypes';

export type { StageData, StageEvents, StageOptions, StageStats, ViewState } from './stageTypes';

/** Both cells are scaled to this radius in the comparison view so their sizes read the same. */
const COMPARE_RADIUS = 30;

const INITIAL_VIEW: ViewState = { selectedId: null, hidden: new Set(), viewMode: 'cutaway', hideOthers: false, cutPosition: 0.4, labels: false, autoRotate: false };

/** Owns the renderer, camera, panes and cell scenes; renders on demand and never touches the DOM outside its container. */
export class Stage {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly rig: CameraRig;
  private readonly assets: AssetLibrary;
  private readonly normalMap: Texture;
  private environment: Texture;
  private contextLost = false;
  private readonly releaseContext: () => void;
  private readonly labels: LabelLayer;
  private readonly paneSet: PaneSet;
  private readonly observer: ResizeObserver;
  private readonly input: StageInput;
  private readonly fades = new SceneFades();
  private readonly stats = new FrameStats();
  private readonly q: StageQuality;
  private events: Partial<StageEvents> = {};
  private primary: CellScene | null = null;
  private secondary: CellScene | null = null;
  private view: ViewState = INITIAL_VIEW;
  private focusIndex: number | null = null;
  private clickPick: { id: string; index: number } | null = null;
  private loadToken = 0;
  private dirty = true;
  private moving = false;
  private raf = 0;
  private last = performance.now();
  private lastDraw = 0;
  private disposed = false;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  /** Camera, picking and benchmark helpers for tests and the console. */
  readonly debug: StageDebug;

  constructor(private readonly opts: StageOptions) {
    this.q = new StageQuality(opts.quality, opts.autoQuality);
    this.renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.q.settings.shadows;
    // Transparent clear: the pipeline composites the scene over the parchment backdrop at the very end.
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.localClippingEnabled = true;
    this.renderer.info.autoReset = false;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'stage-canvas';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', '3B hücre modeli. Ok tuşları döndürür, artı ve eksi tuşları yakınlaştırır, R sıfırlar, Esc seçimi kaldırır.');
    opts.container.prepend(this.canvas);

    this.rig = new CameraRig(this.canvas, opts.reducedMotion);
    this.rig.controls.addEventListener('change', () => this.requestRender());
    this.assets = new AssetLibrary(opts.baseUrl, (id) => this.events.fallback?.(id));
    this.normalMap = createMicroNormalTexture();
    this.environment = createEnvironmentTexture(this.renderer);
    this.labels = new LabelLayer(opts.container);
    this.paneSet = new PaneSet(this.renderer, this.rig, this.environment, this.q.settings);
    this.input = new StageInput(this.canvas, {
      pick: (x, y) => this.pickAt(x, y)?.id ?? null,
      hover: (id) => this.events.hover?.(id),
      click: (id, x, y) => {
        this.clickPick = this.pickAt(x, y);
        this.events.select?.(id === this.view.selectedId ? null : id);
      },
      key: (ev) => this.onKey(ev),
      invalidate: () => this.requestRender(),
    });
    this.debug = createDebug({ renderer: this.renderer, rig: this.rig, canvas: this.canvas, primary: () => this.primary, draw: (t) => this.renderFrame(t), requestRender: () => this.requestRender() });
    this.releaseContext = guardContext(this.canvas, () => this.onContext(true), () => this.onContext(false));
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(opts.container);
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  on(events: Partial<StageEvents>): void { this.events = { ...this.events, ...events }; }

  get qualityLevel(): QualityName { return this.q.level; }

  get isCompare(): boolean { return this.secondary !== null; }

  requestRender(): void { this.dirty = true; }

  /** Switches the quality preset now (the adaptive governor calls this; so can the console). */
  setQualityLevel(level: QualityName): void {
    if (level === this.q.level) return;
    this.q.set(level);
    const settings = this.q.settings;
    this.renderer.shadowMap.enabled = settings.shadows;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.paneSet.setQuality(settings, this.pixelRatio);
    for (const scene of [this.primary, this.secondary]) scene?.setQuality(settings);
    this.resize();
    this.events.quality?.(level);
  }

  /** Menu choice: the adaptive governor (never above medium) or a fixed preset. */
  setQualityMode(mode: QualityMode): void {
    this.setQualityLevel(this.q.setMode(mode));
  }

  /** Three.js re-uploads geometry and textures on its own; the PMREM environment is render output and is rebuilt here. */
  private onContext(lost: boolean): void {
    if (!lost) {
      this.renderer.setClearColor(0x000000, 0); // three.js resets the clear colour with the new context
      this.environment = createEnvironmentTexture(this.renderer);
      this.paneSet.setEnvironment(this.environment);
      this.requestRender();
    }
    this.contextLost = lost;
    this.events.connection?.(lost);
  }

  // ---- loading ------------------------------------------------------------------------------------------------

  private buildScene(cellId: CellTypeId, report: (f: number) => void): Promise<CellScene> {
    return buildCellScene(cellId, { data: this.opts.data, assets: this.assets, normalMap: this.normalMap, quality: this.q.settings }, report);
  }

  /** Loads (or switches to) a cell type with a short cross-fade. Stale calls are ignored. */
  async setCell(cellId: CellTypeId): Promise<void> {
    if (this.primary?.cell.id === cellId) return;
    const token = ++this.loadToken;
    this.events.loading?.(0);
    const next = await this.buildScene(cellId, (f) => this.events.loading?.(f));
    if (this.disposed || token !== this.loadToken) {
      next.dispose();
      return;
    }
    const previous = this.primary;
    this.primary = next;
    this.paneSet.primary.mount(next);
    if (previous) this.fades.add(previous, 'out');
    next.setFade(this.opts.reducedMotion ? 1 : 0);
    if (!this.opts.reducedMotion) this.fades.add(next, 'in');
    if (this.isCompare) next.setScale(COMPARE_RADIUS / Math.max(...next.cell.shell.halfExtents));
    this.fitCamera(!previous);
    if (previous) this.rig.resetView();
    this.labels.setSpecs(labelSpecs(next, this.opts.data.organelles));
    this.applyView();
    this.events.loading?.(null);
  }

  /** Switches comparison on (second cell type) or off (null). */
  async setCompare(cellId: CellTypeId | null): Promise<void> {
    const token = ++this.loadToken;
    if (cellId === null) {
      this.paneSet.removeSecond(this.secondary);
      this.secondary?.dispose();
      this.secondary = null;
      this.primary?.setScale(1);
      this.paneSet.primary.refit();
    } else {
      if (this.secondary?.cell.id === cellId) return;
      this.events.loading?.(0);
      const next = await this.buildScene(cellId, (f) => this.events.loading?.(f));
      if (this.disposed || token !== this.loadToken) {
        next.dispose();
        return;
      }
      this.paneSet.removeSecond(this.secondary);
      this.secondary?.dispose();
      this.secondary = next;
      for (const scene of [this.primary, next]) scene?.setScale(COMPARE_RADIUS / Math.max(...scene.cell.shell.halfExtents));
      this.paneSet.addSecond(next, this.q.settings);
    }
    this.paneSet.layout(this.width, this.height, this.pixelRatio);
    this.fitCamera(false);
    this.rig.resetView();
    this.applyView();
    this.events.loading?.(null);
  }

  // ---- view state ---------------------------------------------------------------------------------------------

  apply(view: ViewState): void {
    const selectionChanged = view.selectedId !== this.view.selectedId;
    const refocus = selectionChanged || (view.viewMode === 'isolate') !== (this.view.viewMode === 'isolate');
    this.view = view;
    if (selectionChanged) {
      this.focusIndex = chooseFocusIndex(this.primary, this.rig.camera.position, view.selectedId, this.clickPick);
      this.clickPick = null;
    }
    this.applyView();
    this.rig.setAutoRotate(view.autoRotate);
    // With a selection the picture slides left and up a little, out from under the view-mode panel and the toolbars.
    const framed = view.selectedId !== null && !this.isCompare;
    this.rig.setShift(framed ? 0.1 : 0, framed ? 0.025 : 0);
    if (refocus) this.focusSelection();
  }

  private applyView(): void {
    const v = this.view;
    this.labels.setEnabled(v.labels && !this.isCompare);
    this.paneSet.setBackdropTone(v.viewMode === 'isolate' ? 1 : 0);
    for (const scene of [this.primary, this.secondary]) {
      if (!scene) continue;
      scene.applyVisibility({
        hidden: v.hidden,
        isolateId: v.viewMode === 'isolate' ? v.selectedId : null,
        hideOthersId: v.hideOthers ? v.selectedId : null,
        selectedId: v.selectedId,
        focusIndex: scene === this.primary ? this.focusIndex : null,
      });
      scene.setCut(v.cutPosition, v.viewMode === 'cutaway');
    }
    this.requestRender();
  }

  private focusSelection(): void {
    focusCamera(this.primary, this.rig, this.view.selectedId, this.focusIndex, this.view.viewMode === 'isolate');
  }

  resetView(): void {
    this.rig.resetView();
    this.requestRender();
  }

  private fitCamera(snap: boolean): void {
    const r = this.isCompare ? COMPARE_RADIUS * 1.15 : 0;
    const fit = this.primary?.framing() ?? { h: 30, v: 30 };
    this.rig.setHome(r || fit.h, r || fit.v, this.isCompare ? this.width / 2 / this.height : this.width / this.height, snap);
  }

  /** Renders now and resolves with a PNG (the canvas buffer is only valid in the same task as the draw). */
  screenshot(): Promise<Blob | null> {
    this.renderFrame(0);
    return new Promise((resolve) => this.canvas.toBlob(resolve, 'image/png'));
  }

  private onKey(ev: KeyboardEvent): boolean {
    if (ev.key === 'Escape') {
      this.events.select?.(null);
      return true;
    }
    return this.rig.handleKey(ev.key);
  }

  // ---- layout and picking -------------------------------------------------------------------------------------

  private resize(): void {
    const rect = this.opts.container.getBoundingClientRect();
    this.width = Math.max(2, Math.floor(rect.width));
    this.height = Math.max(2, Math.floor(rect.height));
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.q.settings.maxPixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.paneSet.layout(this.width, this.height, this.pixelRatio);
    this.fitCamera(false);
    this.requestRender();
  }

  private pickAt(clientX: number, clientY: number): { id: string; index: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    return this.paneSet.pick(clientX - rect.left, clientY - rect.top, rect.height, [this.primary, this.secondary]);
  }

  // ---- frame loop ---------------------------------------------------------------------------------------------

  private readonly tick = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (this.contextLost) return;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const moving = this.rig.update(dt);
    let animating = this.fades.step(dt, this.onFadeDone) || moving;
    if (this.input.hoverId !== null && !this.opts.reducedMotion) animating = true;
    // Ambient occlusion pauses while the camera moves and comes back (one extra frame) when it settles.
    this.paneSet.setInteracting(moving);
    if (this.moving && !moving) this.dirty = true;
    this.moving = moving;
    if (!animating && !this.dirty) return;
    this.dirty = false;
    const t0 = performance.now();
    this.renderFrame(now / 1000);
    const stats = this.stats.record(now, performance.now() - t0, this.renderer, this.q.level);
    if (stats) this.events.stats?.(stats);
    // The governor only judges consecutive drawn frames (a page that idles says nothing about speed).
    const next = this.lastDraw > 0 && now - this.lastDraw < 60 ? this.q.frame(now - this.lastDraw, now / 1000) : null;
    if (next) this.setQualityLevel(next);
    this.lastDraw = now;
  };

  private readonly onFadeDone = (scene: CellScene, direction: 'in' | 'out'): void => {
    if (direction !== 'out') return;
    this.paneSet.primary.unmount(scene);
    scene.dispose();
  };

  private renderFrame(seconds: number): void {
    this.renderer.info.reset();
    const pulse = this.opts.reducedMotion ? 0.7 : 0.55 + 0.45 * Math.sin(seconds * 6);
    const glow = { selectedId: this.view.selectedId, hoverId: this.input.hoverId, pulse, compare: this.isCompare };
    const ids = (s: CellScene | null): ReadonlySet<string> => new Set(s?.sets.keys() ?? []);
    if (this.primary) applyGlow(this.primary, ids(this.secondary), glow);
    if (this.secondary) applyGlow(this.secondary, ids(this.primary), glow);
    const cam = this.rig.camera.position;
    for (const scene of [this.primary, this.secondary]) scene?.updateLod(cam);
    this.paneSet.render();
    if (this.primary) this.labels.updateFor(this.primary, this.rig.camera, this.width, this.height, this.view.selectedId ? { id: this.view.selectedId, index: this.focusIndex } : undefined);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.releaseContext();
    this.input.dispose();
    this.paneSet.removeSecond(this.secondary);
    for (const scene of [this.secondary, ...this.fades.leaving, this.primary]) scene?.dispose();
    this.paneSet.dispose();
    for (const owned of [this.assets, this.normalMap, this.environment, this.labels, this.rig, this.renderer]) owned.dispose();
    this.canvas.remove();
  }
}
