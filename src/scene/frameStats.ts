import type { WebGLRenderer } from 'three';
import type { QualityName } from '../core';
import type { StageStats } from './stageTypes';

/** Mean CPU time of the draw call and FPS over a 500 ms window; read only by the ?perf overlay. */
export class FrameStats {
  private frames = 0;
  private windowStart = performance.now();
  private costSum = 0;

  /** Records one rendered frame; returns stats once per half second, else null. */
  record(now: number, cost: number, renderer: WebGLRenderer, quality: QualityName): StageStats | null {
    this.costSum += cost;
    this.frames++;
    if (now - this.windowStart < 500) return null;
    const info = renderer.info;
    const stats: StageStats = {
      fps: (this.frames * 1000) / (now - this.windowStart),
      frameMs: this.costSum / this.frames,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      quality,
    };
    this.frames = 0;
    this.costSum = 0;
    this.windowStart = now;
    return stats;
  }
}
