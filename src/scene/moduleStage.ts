import { ACESFilmicToneMapping, Box3, PerspectiveCamera, Scene, SRGBColorSpace, Sphere, Vector3, WebGLRenderer, type Texture } from 'three';
import { QUALITY_PRESETS, type QualityName } from '../core';
import { CameraRig, FOV } from './cameraRig';
import { createEnvironmentTexture, createStudioLights, type StudioLights } from './environment';
import { LabelLayer, type LabelAnchor } from './labels';
import type { ModuleScene, Vec3 } from './moduleScene';
import { applyFramingLimits, type StageFraming } from './stageFraming';
import { createMicroNormalTexture } from './normalMap';
import { Pipeline } from './pipeline';

export type CameraPresetId = 'home' | 'front' | 'top' | 'side';

export interface ModuleStageOptions {
  container: HTMLElement;
  quality: QualityName;
  reducedMotion: boolean;
}

/**
 * Renders one `ModuleScene` in its own Three scene with the same look as the cell explorer: warm key light,
 * procedural environment, post-processing, orbit camera with presets and HTML labels. It draws on demand, but every
 * frame while `playing` is set, so an idle module costs nothing. The scene is only ever posed through `setTime`.
 */
export class ModuleStage {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: WebGLRenderer;
  readonly normalMap: Texture;
  readonly rig: CameraRig;
  /** Called every animation frame while `playing`, with the elapsed real seconds (the host advances its player here). */
  onFrame: ((dt: number) => void) | null = null;
  playing = false;
  private readonly scene = new Scene();
  private readonly environment: Texture;
  private readonly lights: StudioLights;
  private readonly labels: LabelLayer;
  private readonly observer: ResizeObserver;
  private pipeline: Pipeline;
  private moduleScene: ModuleScene | null = null;
  private level: QualityName;
  private time = 0;
  private manualCamera = false;
  private presetsRadius = 10;
  private center = new Vector3();
  private dirty = true;
  private raf = 0;
  private last = performance.now();
  private width = 2;
  private height = 2;
  private disposed = false;
  private labelsOn = true;
  private lost = false;
  private framing: StageFraming | null = null;

  constructor(private readonly opts: ModuleStageOptions) {
    this.level = opts.quality;
    const settings = QUALITY_PRESETS[opts.quality];
    this.renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = settings.shadows;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.localClippingEnabled = true;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'stage-canvas';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', '3B animasyon sahnesi. Ok tuşları döndürür, artı ve eksi tuşları yakınlaştırır.');
    opts.container.prepend(this.canvas);

    this.rig = new CameraRig(this.canvas, opts.reducedMotion);
    this.rig.controls.addEventListener('start', () => (this.manualCamera = true));
    this.rig.controls.addEventListener('change', () => this.requestRender());
    this.normalMap = createMicroNormalTexture();
    this.environment = createEnvironmentTexture(this.renderer);
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.7;
    this.lights = createStudioLights(settings.shadowMapSize, settings.shadows);
    this.scene.add(this.lights.group);
    this.labels = new LabelLayer(opts.container);
    this.labels.setEnabled(true);
    this.pipeline = new Pipeline(this.renderer, this.scene, this.rig.camera, settings, 2, 2);
    this.canvas.addEventListener('keydown', this.onKey);
    this.canvas.addEventListener('webglcontextlost', this.onLost);
    this.canvas.addEventListener('webglcontextrestored', this.onRestored);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(opts.container);
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  get camera(): PerspectiveCamera {
    return this.rig.camera;
  }

  requestRender(): void {
    this.dirty = true;
  }

  /** Makes `moduleScene` the picture: frames the camera around it at time 0. The previous scene is disposed. */
  setScene(moduleScene: ModuleScene): void {
    if (this.moduleScene) {
      this.scene.remove(this.moduleScene.root);
      this.moduleScene.dispose();
    }
    this.install(moduleScene);
  }

  /**
   * Replaces the scene without disposing the old one and returns it (a sim stage swaps between the bench and a particle
   * explainer and keeps both alive). The caller owns disposal of what it gets back.
   */
  swapScene(next: ModuleScene): ModuleScene | null {
    const previous = this.moduleScene;
    if (previous) this.scene.remove(previous.root);
    this.install(next);
    return previous;
  }

  private install(next: ModuleScene): void {
    this.moduleScene = next;
    this.scene.add(next.root);
    next.seek(0);
    this.refit(true);
    this.time = 0;
    this.manualCamera = false;
    this.applyCameraPath();
    this.requestRender();
  }

  /** Re-frames the camera and lights around the scene's current bounds (a sim that added vessels calls this). */
  refit(snap = false): void {
    const scene = this.moduleScene;
    if (!scene) return;
    if (this.framing) {
      this.setFraming(this.framing, snap);
      return;
    }
    scene.root.updateMatrixWorld(true);
    const sphere = new Box3().setFromObject(scene.root).getBoundingSphere(new Sphere());
    this.center.copy(sphere.center);
    this.presetsRadius = Math.max(sphere.radius, 1);
    this.lights.fit(this.presetsRadius);
    this.fit(snap);
    if (snap) this.requestRender();
  }

  private fit(snap: boolean): void {
    const f = this.framing;
    this.rig.setHome(f?.halfWidth ?? this.presetsRadius, f?.halfHeight ?? this.presetsRadius, this.width / this.height, snap);
    if (f) applyFramingLimits(this.rig.controls, f);
    if (snap) {
      this.rig.controls.target.copy(f?.target ? new Vector3(...f.target) : this.center);
      // a framed scene may sit away from the origin: put the camera on the default view direction around the target
      if (f) this.rig.camera.position.copy(this.rig.controls.target).addScaledVector(CameraRig.HOME, this.rig.homeDistance);
      this.rig.controls.update();
    }
  }

  /** Sets (or clears, with null) explicit framing and camera limits and re-frames the camera. */
  setFraming(framing: StageFraming | null, snap = true): void {
    this.framing = framing;
    if (framing) {
      this.center.set(...framing.center);
      this.presetsRadius = Math.max(framing.radius, 1);
      this.lights.fit(this.presetsRadius);
      this.fit(snap);
    } else {
      this.refit(snap);
    }
    this.requestRender();
  }

  /** Flies the camera to look at `center` from the current direction, so that `radius` fills about 55 % of the view height. */
  focusOn(center: Vec3, radius: number): void {
    const c = new Vector3(...center);
    const dir = this.rig.camera.position.clone().sub(this.rig.controls.target).normalize();
    const distance = Math.max((radius * 1.8) / Math.sin((FOV * Math.PI) / 360), this.rig.controls.minDistance * 1.2);
    this.manualCamera = true;
    this.rig.flyToPose(c.clone().addScaledVector(dir, distance), c);
    this.requestRender();
  }

  /** Poses the scene at `t` seconds (the only way a scene moves). */
  setTime(t: number): void {
    this.time = t;
    this.moduleScene?.seek(t);
    this.applyCameraPath();
    this.requestRender();
  }

  /** The scene's cinematic path moves the camera until the learner orbits; `followCamera` hands control back. */
  followCamera(): void {
    this.manualCamera = false;
    this.applyCameraPath();
    this.requestRender();
  }

  private applyCameraPath(): void {
    const scene = this.moduleScene;
    if (!scene?.cameraAt || this.manualCamera) return;
    const { position, target } = scene.cameraAt(this.time);
    this.rig.camera.position.set(...position);
    this.rig.controls.target.set(...target);
    this.rig.controls.update();
  }

  setPreset(preset: CameraPresetId): void {
    this.manualCamera = true;
    const d = this.rig.homeDistance;
    const c = this.center;
    const offset =
      preset === 'home' ? CameraRig.HOME.clone().multiplyScalar(d) : preset === 'front' ? new Vector3(0, 0, d) : preset === 'side' ? new Vector3(d, 0, 0) : new Vector3(0.001, d, 0);
    this.rig.flyToPose(c.clone().add(offset), c.clone());
    this.requestRender();
  }

  /** Pixels of the stage that overlay panels cover on each side; the picture is centred in the free rectangle (eased). */
  setSafeInsets(left: number, right: number, top: number, bottom: number): void {
    const freeW = Math.max(this.width - left - right, 1) / Math.max(this.width, 1);
    const freeH = Math.max(this.height - top - bottom, 1) / Math.max(this.height, 1);
    // Shrink a little when the free area is much smaller than the stage, so the picture is not clipped by the panels.
    const scale = Math.min(1, Math.max(0.6, Math.min(freeW, freeH) / 0.7));
    this.rig.setShift((right - left) / 2 / Math.max(this.width, 1), (bottom - top) / 2 / Math.max(this.height, 1), scale);
    this.requestRender();
  }

  setLabelsEnabled(on: boolean): void {
    this.labelsOn = on;
    this.labels.setEnabled(on);
    this.requestRender();
  }

  setQualityLevel(level: QualityName): void {
    if (level === this.level) return;
    this.level = level;
    const settings = QUALITY_PRESETS[level];
    this.renderer.shadowMap.enabled = settings.shadows;
    this.lights.key.castShadow = settings.shadows;
    this.pipeline.dispose();
    this.pipeline = new Pipeline(this.renderer, this.scene, this.rig.camera, settings, this.width, this.height);
    this.pipeline.setSize(this.width, this.height, this.pixelRatio());
    this.requestRender();
  }

  private pixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, QUALITY_PRESETS[this.level].maxPixelRatio);
  }

  private resize(): void {
    const rect = this.opts.container.getBoundingClientRect();
    this.width = Math.max(2, Math.floor(rect.width));
    this.height = Math.max(2, Math.floor(rect.height));
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(this.width, this.height, false);
    this.pipeline.setSize(this.width, this.height, this.pixelRatio());
    this.rig.camera.aspect = this.width / this.height;
    this.rig.camera.updateProjectionMatrix();
    this.fit(false);
    this.requestRender();
  }

  private readonly onKey = (ev: KeyboardEvent): void => {
    if (this.rig.handleKey(ev.key)) {
      ev.preventDefault();
      this.manualCamera = true;
      this.requestRender();
    }
  };

  private readonly onLost = (ev: Event): void => {
    ev.preventDefault();
    this.lost = true;
  };

  private readonly onRestored = (): void => {
    this.renderer.setClearColor(0x000000, 0);
    this.scene.environment = createEnvironmentTexture(this.renderer);
    this.lost = false;
    this.requestRender();
  };

  private readonly tick = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (this.lost) return;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    if (this.playing) this.onFrame?.(dt);
    const moving = this.rig.update(dt);
    this.pipeline.setInteracting(moving || this.playing);
    if (!this.playing && !moving && !this.dirty) return;
    this.dirty = false;
    this.draw();
  };

  private draw(): void {
    this.pipeline.render();
    if (!this.labelsOn || !this.moduleScene?.labelsAt) return;
    const labels = this.moduleScene.labelsAt(this.time);
    const ids = labels.map((l, i) => l.anchorId ?? `label-${i}`);
    this.labels.setSpecsIfChanged(labels.map((l, i) => ({ id: ids[i] as string, text: l.text, color: '#7b5aa6' })));
    const anchors: LabelAnchor[] = labels.map((l, i) => ({ id: ids[i] as string, world: new Vector3(...l.world) }));
    this.labels.update(anchors, this.rig.camera, this.width, this.height);
  }

  /** How long the last `prewarm` took (ms); the perf script reports it separately from steady-state frame times. */
  prewarmMs = 0;

  /**
   * Compiles every shader the scene needs before the learner sees it: `compileAsync` for the scene graph, then one real
   * render at a few times of the timeline (materials that only appear later, the post-processing passes), so playing
   * does not hitch on first use. Meant to run behind the loading screen; the timeline is back at 0 afterwards.
   */
  async prewarm(duration: number): Promise<number> {
    const start = performance.now();
    try {
      await this.renderer.compileAsync(this.scene, this.rig.camera);
    } catch {
      // compile is an optimisation only
    }
    for (const f of [0, 0.3, 0.6, 1, 0.5]) {
      this.setTime(duration * f);
      this.pipeline.render();
    }
    this.renderer.getContext().finish();
    this.setTime(0);
    this.prewarmMs = performance.now() - start;
    return this.prewarmMs;
  }

  /** Renders now and returns a PNG (module stills, screenshots). */
  screenshot(): Promise<Blob | null> {
    this.draw();
    return new Promise((resolve) => this.canvas.toBlob(resolve, 'image/png'));
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.canvas.removeEventListener('keydown', this.onKey);
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    if (this.moduleScene) {
      this.scene.remove(this.moduleScene.root);
      this.moduleScene.dispose();
    }
    this.pipeline.dispose();
    this.lights.dispose();
    this.labels.dispose();
    this.rig.dispose();
    this.normalMap.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
