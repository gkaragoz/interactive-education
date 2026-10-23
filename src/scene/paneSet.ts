import { PerspectiveCamera, Raycaster, Vector2, type Texture, type WebGLRenderer } from 'three';
import type { QualitySettings } from '../core';
import type { CameraRig } from './cameraRig';
import type { CellScene } from './cellScene';
import { layoutPanes, Pane } from './viewport';

/** The canvas is one pane, or two side by side in the comparison view (shared canvas, viewport + scissor, linked camera). */
export class PaneSet {
  readonly panes: Pane[];
  private readonly secondCamera = new PerspectiveCamera();
  private readonly raycaster = new Raycaster();

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly rig: CameraRig,
    private environment: Texture,
    quality: QualitySettings,
  ) {
    this.panes = [new Pane(renderer, rig.camera, environment, quality)];
  }

  get primary(): Pane {
    return this.panes[0] as Pane;
  }

  get isCompare(): boolean {
    return this.panes.length > 1;
  }

  addSecond(scene: CellScene, quality: QualitySettings): void {
    const pane = new Pane(this.renderer, this.secondCamera, this.environment, quality);
    this.panes.push(pane);
    pane.mount(scene);
    for (const p of this.panes) {
      p.refit();
      p.setFlatBackdrop(true);
    }
  }

  removeSecond(scene: CellScene | null): void {
    const pane = this.panes[1];
    if (!pane) return;
    if (scene) pane.unmount(scene);
    pane.dispose();
    this.panes.splice(1, 1);
    this.primary.refit();
    this.primary.setFlatBackdrop(false);
  }

  layout(width: number, height: number, pixelRatio: number): void {
    layoutPanes(this.panes, width, height, pixelRatio);
  }

  setQuality(quality: QualitySettings, pixelRatio: number): void {
    for (const pane of this.panes) pane.setQuality(quality, pixelRatio);
  }

  /** After a lost context the environment map is regenerated; every scene must point at the new one. */
  setEnvironment(environment: Texture): void {
    this.environment = environment;
    for (const pane of this.panes) pane.scene.environment = environment;
  }

  setBackdropTone(tone: number): void {
    for (const pane of this.panes) pane.setBackdropTone(tone);
  }

  setInteracting(interacting: boolean): void {
    for (const pane of this.panes) pane.setInteracting(interacting);
  }

  /** Ray through a canvas-relative pixel in the pane under it; returns the pane index and the picked id. */
  pick(px: number, py: number, height: number, scenes: (CellScene | null)[]): { id: string; index: number } | null {
    const i = Math.max(0, this.panes.findIndex((p) => px >= p.region.x && px < p.region.x + p.region.width));
    const pane = this.panes[i];
    const scene = scenes[i];
    if (!pane || !scene) return null;
    const ndc = new Vector2(((px - pane.region.x) / pane.region.width) * 2 - 1, -(py / height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, pane.camera);
    const hit = scene.pick(this.raycaster);
    return hit ? { id: hit.id, index: hit.index } : null;
  }

  render(): void {
    this.rig.syncTo(this.secondCamera);
    const gl = this.renderer;
    gl.setScissorTest(this.panes.length > 1);
    for (const pane of this.panes) pane.render();
    gl.setScissorTest(false);
  }

  dispose(): void {
    for (const pane of this.panes) pane.dispose();
  }
}
