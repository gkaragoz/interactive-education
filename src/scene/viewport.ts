import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { QualitySettings } from '../core';
import type { CellScene } from './cellScene';
import { createStudioLights, type StudioLights } from './environment';
import { Pipeline } from './pipeline';

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

function blobTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(70,45,20,0.4)');
    g.addColorStop(0.55, 'rgba(70,45,20,0.12)');
    g.addColorStop(1, 'rgba(70,45,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** One rectangle of the canvas: its own scene, lights, soft floor shadow and post-processing pipeline. */
export class Pane {
  readonly scene = new Scene();
  region: Region = { x: 0, y: 0, width: 1, height: 1 };
  cells: CellScene[] = [];
  private readonly lights: StudioLights;
  private pipeline: Pipeline;
  private width = 2;
  private height = 2;
  private flat = false;
  private tone = 0;
  private readonly floor: Mesh;
  private readonly floorTexture = blobTexture();

  constructor(
    private readonly renderer: WebGLRenderer,
    readonly camera: PerspectiveCamera,
    environment: Texture,
    quality: QualitySettings,
  ) {
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.7;
    this.lights = createStudioLights(quality.shadowMapSize, quality.shadows);
    this.scene.add(this.lights.group);
    this.floor = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({ map: this.floorTexture, transparent: true, depthWrite: false, toneMapped: false }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.renderOrder = -1;
    this.scene.add(this.floor);
    this.pipeline = new Pipeline(renderer, this.scene, camera, quality, 2, 2);
  }

  mount(cell: CellScene): void {
    this.cells.push(cell);
    this.scene.add(cell.group, cell.cutaway.root);
    this.refit();
  }

  unmount(cell: CellScene): void {
    this.cells = this.cells.filter((c) => c !== cell);
    this.scene.remove(cell.group, cell.cutaway.root);
  }

  /** Re-fits the shadow camera and floor blob to the largest mounted cell. */
  refit(): void {
    const radius = Math.max(1, ...this.cells.map((c) => c.radius));
    this.lights.fit(radius);
    const he = this.cells[0]?.cell.shell.halfExtents ?? [1, 1, 1];
    const s = this.cells[0]?.scale ?? 1;
    this.floor.position.y = -Math.max(he[1] * s, radius * 0.4) * 1.12;
    this.floor.scale.set(radius * 2.3, radius * 2.3, 1);
  }

  setRegion(region: Region, pixelRatio: number): void {
    this.region = region;
    this.width = region.width;
    this.height = region.height;
    this.pipeline.setSize(region.width, region.height, pixelRatio);
  }

  /** Switches quality (the adaptive governor): rebuilds the post-processing chain and toggles shadows. */
  setQuality(quality: QualitySettings, pixelRatio: number): void {
    this.pipeline.dispose();
    this.pipeline = new Pipeline(this.renderer, this.scene, this.camera, quality, this.width, this.height);
    this.pipeline.setSize(this.width, this.height, pixelRatio);
    this.pipeline.setFlatBackdrop(this.flat);
    this.pipeline.setBackdropTone(this.tone);
    this.lights.key.castShadow = quality.shadows;
  }

  setBackdropTone(tone: number): void {
    this.tone = tone;
    this.pipeline.setBackdropTone(tone);
  }

  setInteracting(interacting: boolean): void {
    this.pipeline.setInteracting(interacting);
  }

  setFlatBackdrop(flat: boolean): void {
    this.flat = flat;
    this.pipeline.setFlatBackdrop(flat);
  }

  get cutting(): boolean {
    return this.cells.some((c) => c.cutActive);
  }

  render(): void {
    const { x, y, width, height } = this.region;
    this.renderer.setViewport(x, y, width, height);
    this.renderer.setScissor(x, y, width, height);
    // The soft floor shadow belongs to the cell: no shell (Isolate), no shadow.
    this.floor.visible = this.cells.some((c) => c.shell.anyVisible());
    this.pipeline.setCutting(this.cutting);
    this.pipeline.render();
  }

  dispose(): void {
    this.pipeline.dispose();
    this.lights.dispose();
    this.floor.geometry.dispose();
    (this.floor.material as MeshBasicMaterial).dispose();
    this.floorTexture.dispose();
  }
}

/** One pane fills the canvas; two panes (comparison) split it in half. Each pane's camera gets its own aspect. */
export function layoutPanes(panes: Pane[], width: number, height: number, pixelRatio: number): void {
  const half = Math.floor(width / 2);
  panes.forEach((pane, i) => {
    const region = panes.length > 1 ? { x: i * half, y: 0, width: i === 0 ? half : width - half, height } : { x: 0, y: 0, width, height };
    pane.setRegion(region, pixelRatio);
    pane.camera.aspect = region.width / region.height;
    pane.camera.updateProjectionMatrix();
  });
}
