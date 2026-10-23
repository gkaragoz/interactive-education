import type { WebGLRenderer } from 'three';
import type { CameraRig } from './cameraRig';
import type { CellScene } from './cellScene';

export interface DebugHost {
  renderer: WebGLRenderer;
  rig: CameraRig;
  canvas: HTMLCanvasElement;
  primary(): CellScene | null;
  draw(seconds: number): void;
  requestRender(): void;
}

export interface StageDebug {
  setCameraPose(position: [number, number, number], target?: [number, number, number]): void;
  cameraPosition(): [number, number, number];
  /** Client-space pixel where an organelle currently shows (tests click there to exercise picking). */
  screenPointOf(id: string): { x: number; y: number } | null;
  /** Draws `frames` frames of a slow orbit back to back, waiting for the GPU each time: the honest cost of one frame. */
  benchmark(frames: number): { avgMs: number; p95Ms: number; calls: number; triangles: number };
}

export function createDebug(host: DebugHost): StageDebug {
  const { rig } = host;
  const position = (): [number, number, number] => [rig.camera.position.x, rig.camera.position.y, rig.camera.position.z];
  return {
    setCameraPose(pos, target = [0, 0, 0]): void {
      rig.camera.position.set(...pos);
      rig.controls.target.set(...target);
      rig.controls.update();
      host.requestRender();
    },
    cameraPosition: position,
    screenPointOf(id): { x: number; y: number } | null {
      const world = host.primary()?.labelAnchor(id, rig.camera.position);
      if (!world) return null;
      const ndc = world.clone().project(rig.camera);
      const rect = host.canvas.getBoundingClientRect();
      return { x: rect.left + (ndc.x * 0.5 + 0.5) * rect.width, y: rect.top + (-ndc.y * 0.5 + 0.5) * rect.height };
    },
    benchmark(frames): { avgMs: number; p95Ms: number; calls: number; triangles: number } {
      const gl = host.renderer.getContext();
      const [x0, y0, z0] = position();
      const target = rig.controls.target.clone();
      const radius = Math.hypot(x0, z0);
      const start = Math.atan2(x0, z0);
      const times: number[] = [];
      const probe = new Uint8Array(4);
      for (let i = 0; i < frames; i++) {
        const angle = start + (i / frames) * Math.PI * 0.5;
        rig.camera.position.set(radius * Math.sin(angle), y0, radius * Math.cos(angle));
        rig.camera.lookAt(target);
        const t0 = performance.now();
        host.draw(i * 0.016);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe); // reading a pixel forces the GPU to finish
        times.push(performance.now() - t0);
      }
      rig.camera.position.set(x0, y0, z0);
      rig.controls.target.copy(target);
      rig.controls.update();
      host.requestRender();
      times.sort((a, b) => a - b);
      const info = host.renderer.info.render;
      return { avgMs: times.reduce((a, b) => a + b, 0) / frames, p95Ms: times[Math.floor(frames * 0.95)] ?? 0, calls: info.calls, triangles: info.triangles };
    },
  };
}
