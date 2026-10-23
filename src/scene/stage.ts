import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer, type Texture } from 'three';
import type { QualityMode, QualityName } from '../core';
import type { CellTypeId } from '../data/types';
import { CameraRig } from './cameraRig';
import type { CellScene } from './cellScene';
import { QUALITY_PRESETS } from '../core';
import { guardContext } from './contextGuard';
import { createEnvironmentTexture } from './environment';
import { FrameStats } from './frameStats';
import { StageQuality } from './stageQuality';
import { LabelLayer } from './labels';
import { StageView } from './stageView';
import { createDebug, type StageDebug } from './stageDebug';
import { createMicroNormalTexture } from './normalMap';
import { PaneSet } from './paneSet';
import { labelSpecs } from './sceneBuilder';
import { SceneLoader, type LoadProgress } from './sceneLoader';
import { applyGlow, MotionClock, SceneFades } from './stageEffects';
import { StageInput } from './stageInput';
import type { StageEvents, StageOptions, ViewState } from './stageTypes';

const settingsAmbient = (level: QualityName): boolean => QUALITY_PRESETS[level].ambient;

export type { StageData, StageEvents, StageOptions, StageStats, ViewState } from './stageTypes';

/** Both cells are scaled to this radius in the comparison view so their sizes read the same. */
const COMPARE_RADIUS = 30;

/** Owns the renderer, camera, panes and cell scenes; renders on demand and never touches the DOM outside its container. */
export class Stage {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly rig: CameraRig;
  private readonly loader: SceneLoader;
  private readonly normalMap: Texture;
  private environment: Texture;
  private contextLost = false;
  private retainPending = false;
  private readonly releaseContext: () => void;
  private readonly labels: LabelLayer;
  private readonly paneSet: PaneSet;
  private readonly observer: ResizeObserver;
  private readonly input: StageInput;
  private readonly fades = new SceneFades();
  private readonly motion = new MotionClock();
  private readonly stats = new FrameStats();
  private readonly q: StageQuality;
  private events: Partial<StageEvents> = {};
  private primary: CellScene | null = null;
  private secondary: CellScene | null = null;
  private readonly sv: StageView;
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
  private insets: [number, number] = [0, 0];
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
    this.normalMap = createMicroNormalTexture();
    this.environment = createEnvironmentTexture(this.renderer);
    this.loader = new SceneLoader({
      data: opts.data, baseUrl: opts.baseUrl, renderer: this.renderer, normalMap: this.normalMap, reducedMotion: opts.reducedMotion,
      settings: () => this.q.settings,
      // Scenes that are still fading out are alive too: their textures must not be freed under them, or three.js
      // uploads a fresh copy of a disposed texture for the last frames and nothing ever deletes it.
      scenes: () => [this.primary, this.secondary, ...this.fades.leaving].filter((s): s is CellScene => s !== null),
      targetTier: () => this.q.level, selectedId: () => this.sv.view.selectedId, invalidate: () => this.requestRender(),
      onFallback: (id) => this.events.fallback?.(id), backend: opts.textureBackend,
    });
    this.labels = new LabelLayer(opts.container);
    this.paneSet = new PaneSet(this.renderer, this.rig, this.environment, this.q.settings);
    this.sv = new StageView({ labels: this.labels, paneSet: this.paneSet, rig: this.rig, scenes: () => ({ primary: this.primary, secondary: this.secondary }), requestRender: () => this.requestRender() });
    this.input = new StageInput(this.canvas, {
      pick: (x, y) => this.pickAt(x, y)?.id ?? null,
      hover: (id) => this.events.hover?.(id),
      click: (id, x, y) => {
        this.sv.clickPick = this.pickAt(x, y);
        this.events.select?.(id === this.sv.view.selectedId ? null : id);
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

  /** Pixels covered by floating panels on the left and right: the picture is centred in the free space between them. */
  setOverlayInsets(left: number, right: number): void {
    this.insets = [left, right];
    this.labels.setInsets(left, right);
    this.applyInsets();
  }

  private applyInsets(): void { this.rig.setShift(this.isCompare ? 0 : (this.insets[1] - this.insets[0]) / 2 / Math.max(this.width, 1), 0); }

  get isCompare(): boolean { return this.secondary !== null; }

  requestRender(): void {
    this.dirty = true;
    this.motion.touch(performance.now());
  }

  /** Switches the quality preset now (the adaptive governor calls this; so can the console). */
  setQualityLevel(level: QualityName): void {
    if (level === this.q.level) return;
    this.q.set(level);
    if (settingsAmbient(level)) for (const scene of [this.primary, this.secondary]) if (scene) void this.loader.ensureDecor(scene);
    void this.loader.streamer.stream();
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
      void this.loader.reloadTextures();
      this.requestRender();
    }
    this.contextLost = lost;
    this.events.connection?.(lost);
  }

  // ---- loading ------------------------------------------------------------------------------------------------

  /** Loads (or switches to) a cell type with a short cross-fade. Stale calls are ignored. */
  async setCell(cellId: CellTypeId): Promise<void> {
    if (this.primary?.cell.id === cellId) return;
    const token = ++this.loadToken;
    const next = await this.loader.load(cellId, this.progress);
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
    this.afterSceneChange();
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
      const next = await this.loader.load(cellId, this.progress);
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
    this.afterSceneChange();
  }

  private readonly progress = (p: LoadProgress): void => this.events.loading?.(p);

  /** Frees textures nobody uses and streams the target tier into what is on screen. */
  private afterSceneChange(): void {
    this.loader.streamer.retain();
    void this.loader.streamer.stream();
  }

  // ---- view state ---------------------------------------------------------------------------------------------

  apply(view: ViewState): void { this.sv.apply(view); }

  private applyView(): void { this.sv.applyToScenes(); }

  resetView(): void { this.rig.resetView(); this.requestRender(); }

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

  private pickAt(x: number, y: number): { id: string; index: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    return this.paneSet.pick(x - rect.left, y - rect.top, rect.height, [this.primary, this.secondary]);
  }

  // ---- frame loop ---------------------------------------------------------------------------------------------

  private readonly tick = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (this.contextLost) return;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const moving = this.rig.update(dt);
    if (this.retainPending) {
      this.retainPending = false;
      this.loader.streamer.retain();
    }
    const scenes = [this.primary, this.secondary].filter((s): s is CellScene => s !== null);
    const texturesFading = scenes.map((s) => s.tickTextures(dt)).some(Boolean);
    let animating = this.fades.step(dt, this.onFadeDone) || moving || texturesFading;
    if (this.input.hoverId !== null && !this.opts.reducedMotion) animating = true;
    // Ambient occlusion pauses while the camera moves and comes back (one extra frame) when it settles.
    this.paneSet.setInteracting(moving);
    if (this.moving && !moving) this.dirty = true;
    this.moving = moving;
    // Ambient motion frames (about 30 a second, only after recent activity) are not user-driven: the governor ignores them.
    const ambient = this.motion.due(dt, now, this.q.settings.ambient && !this.opts.reducedMotion);
    const interactive = animating || this.dirty;
    if (!interactive && !ambient) return;
    this.dirty = false;
    const t0 = performance.now();
    this.renderFrame(now / 1000);
    const stats = this.stats.record(now, performance.now() - t0, this.renderer, this.q.level);
    if (stats) this.events.stats?.(stats);
    // The governor only judges consecutive drawn frames (a page that idles says nothing about speed).
    const next = interactive && this.lastDraw > 0 && now - this.lastDraw < 60 ? this.q.frame(now - this.lastDraw, now / 1000) : null;
    if (next) this.setQualityLevel(next);
    this.lastDraw = now;
  };

  private readonly onFadeDone = (scene: CellScene, direction: 'in' | 'out'): void => {
    if (direction !== 'out') return;
    this.paneSet.primary.unmount(scene);
    scene.dispose();
    this.retainPending = true; // its textures can go once the fade list no longer holds it (next tick)
  };

  private renderFrame(seconds: number): void {
    this.renderer.info.reset();
    const pulse = this.opts.reducedMotion ? 0.7 : 0.55 + 0.45 * Math.sin(seconds * 6);
    const glow = { selectedId: this.sv.view.selectedId, hoverId: this.input.hoverId, pulse, compare: this.isCompare };
    const ids = (s: CellScene | null): ReadonlySet<string> => new Set(s?.sets.keys() ?? []);
    if (this.primary) applyGlow(this.primary, ids(this.secondary), glow);
    if (this.secondary) applyGlow(this.secondary, ids(this.primary), glow);
    const cam = this.rig.camera.position;
    const motion = !this.opts.reducedMotion;
    for (const scene of [this.primary, this.secondary]) {
      scene?.updateLod(cam);
      scene?.updateAmbient(seconds, motion);
    }
    this.paneSet.render();
    if (this.primary) this.labels.updateFor(this.primary, this.rig.camera, this.width, this.height, this.sv.view.selectedId ? { id: this.sv.view.selectedId, index: this.sv.focusIndex } : undefined);
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
    for (const owned of [this.loader, this.normalMap, this.environment, this.labels, this.rig, this.renderer]) owned.dispose();
    this.canvas.remove();
  }
}
