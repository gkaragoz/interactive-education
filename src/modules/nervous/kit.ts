import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  type BufferGeometry,
  type Material,
  type MeshPhysicalMaterial,
  type Object3D,
  type Texture,
} from 'three';
import type { ModuleContext, ModuleLabel, Vec3 } from '../../scene';

/** What every track gets: the shared clay materials, the quality-dependent detail and a tidy way to dispose things. */
export interface Kit {
  ctx: ModuleContext;
  root: Group;
  /** 0 low, 1 medium, 2 high. */
  detail: number;
  /** Amplitude of the Brownian jitter (smaller with reduced motion). */
  wander: number;
  /** The painted clay material for `id` (vertex colours); one material per id. */
  clay(id: string): MeshPhysicalMaterial;
  /** Adds a mesh to the root; its geometry is disposed with the kit. */
  mesh(geometry: BufferGeometry, material: Material, parent?: Object3D): Mesh;
  track<T extends { dispose(): void }>(d: T): T;
  /** Soft round glow sprite (always faces the camera), additive. */
  sprite(color: string, size: number, opacity: number, additive?: boolean): Sprite;
  /** A vertical gradient plane (stops from bottom to top, css colours with alpha). */
  band(x0: number, x1: number, y0: number, y1: number, z: number, stops: [number, string][], opacity?: number): Mesh;
  dispose(): void;
}

/**
 * Keeps an overlay object (glow sprite, backdrop plane, steam) out of the ambient-occlusion pass at high quality. The
 * stage's GTAO pass draws everything except `Points` and `Line`s into its depth and normal buffers, so a glow quad
 * would cast a dark box; objects flagged like points are skipped there, and are drawn normally everywhere else.
 */
export function noAO<T extends Object3D>(obj: T): T {
  return Object.assign(obj, { isPoints: true });
}

/** Canvas texture, or null where there is no DOM (unit tests). */
export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  draw(g, w, h);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

let haloTexture: Texture | null | undefined;

export function createKit(ctx: ModuleContext, root: Group): Kit {
  const detail = ctx.quality === 'low' ? 0 : ctx.quality === 'medium' ? 1 : 2;
  const disposables: Array<{ dispose(): void }> = [];
  const own = <T extends { dispose(): void }>(d: T): T => {
    disposables.push(d);
    return d;
  };
  const halo = (): Texture | null => {
    if (haloTexture === undefined) {
      haloTexture = canvasTexture(128, 128, (g, w, h) => {
        const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      });
    }
    return haloTexture;
  };
  return {
    ctx,
    root,
    detail,
    wander: ctx.reducedMotion ? 0.28 : 0.42,
    clay: (id) => ctx.assets.materials.get(id, 'clay'),
    mesh(geometry, material, parent = root) {
      const m = new Mesh(geometry, material);
      parent.add(m);
      own(geometry);
      own({ dispose: () => m.removeFromParent() });
      return m;
    },
    track: own,
    sprite(color, size, opacity, additive = false) {
      const mat = new SpriteMaterial({
        color,
        map: halo(),
        transparent: true,
        opacity,
        depthWrite: false,
        blending: additive ? AdditiveBlending : NormalBlending,
        toneMapped: false,
      });
      const s = new Sprite(mat);
      s.scale.set(size, size, 1);
      s.renderOrder = 60;
      noAO(s);
      root.add(s);
      own(mat);
      own({ dispose: () => s.removeFromParent() });
      return s;
    },
    band(x0, x1, y0, y1, z, stops, opacity = 0.92) {
      const geo = new PlaneGeometry(x1 - x0, y1 - y0);
      const map = canvasTexture(4, 256, (g, w, h) => {
        const grad = g.createLinearGradient(0, h, 0, 0);
        for (const [at, col] of stops) grad.addColorStop(at, col);
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      });
      const mat = new MeshBasicMaterial({
        color: map ? '#ffffff' : stops[0]![1],
        map,
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
      });
      const m = new Mesh(geo, mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
      m.renderOrder = 1;
      noAO(m);
      root.add(m);
      own(geo);
      own(mat);
      own({ dispose: () => (map?.dispose(), m.removeFromParent()) });
      return m;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
    },
  };
}

/** What a track hands back to the scene shell. */
export interface TrackRig {
  duration: number;
  seek(t: number): void;
  cameraAt(t: number): { position: Vec3; target: Vec3 };
  labelsAt(t: number): ModuleLabel[];
  chartAt(t: number): Record<string, number>;
  dispose(): void;
}
