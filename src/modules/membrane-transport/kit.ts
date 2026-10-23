import { CanvasTexture, Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, SphereGeometry, type MeshPhysicalMaterial } from 'three';
import { mulberry32 } from '../../core';
import type { ModuleContext, ModuleLabel } from '../../scene';
import { BilayerPatch, type PatchOptions } from './bilayer';
import { MoleculePool } from './pool';

/** What every track gets: the shared material, the quality-dependent detail and a tidy way to dispose things. */
export interface Kit {
  ctx: ModuleContext;
  root: Group;
  clay: MeshPhysicalMaterial;
  /** 0 low, 1 medium, 2 high. */
  detail: number;
  /** Amplitude of the Brownian jitter (smaller with reduced motion). */
  wander: number;
  pool(capacity: number): MoleculePool;
  patch(o: Omit<PatchOptions, 'detail'>): BilayerPatch;
  /** Soft tinted back walls that mark the outside (above) and the inside (below) of the cell. */
  backdrop(xHalf: number, zBack: number, top: number, bottom: number): void;
  /** Soft out-of-focus molecules far behind the scene (depth cue). */
  bokeh(xHalf: number, top: number, bottom: number, zBack: number): void;
  /** A soft-edged coloured glow plane (or a plain tinted plane without a canvas, e.g. in tests). */
  glow(color: string, w: number, h: number, opacity: number): Mesh;
  /** Called by the scene with every `seek` before the track poses itself. */
  tick(t: number): void;
  dispose(): void;
}

/** Canvas gradient texture, or null where there is no DOM (unit tests). */
export function gradientTexture(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w = 4, h = 256): CanvasTexture | null {
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

export function createKit(ctx: ModuleContext, root: Group): Kit {
  const clay = ctx.assets.materials.get('mt-clay', 'clay');
  const detail = ctx.quality === 'low' ? 0 : ctx.quality === 'medium' ? 1 : 2;
  const disposables: Array<{ dispose(): void }> = [];
  const hooks: Array<(t: number) => void> = [];
  return {
    ctx,
    root,
    clay,
    detail,
    wander: ctx.reducedMotion ? 0.28 : 0.42,
    pool(capacity) {
      const p = new MoleculePool(clay, capacity, 10 + detail * 4);
      root.add(p.mesh);
      disposables.push(p);
      return p;
    },
    patch(o) {
      const p = new BilayerPatch(clay, { ...o, detail });
      root.add(p.mesh);
      disposables.push(p);
      return p;
    },
    backdrop(xHalf, zBack, top, bottom) {
      const make = (stops: [number, string][], y0: number, y1: number): void => {
        const geo = new PlaneGeometry(xHalf * 3, y1 - y0);
        const map = gradientTexture((g, w, h) => {
          const grad = g.createLinearGradient(0, 0, 0, h);
          for (const [at, col] of stops) grad.addColorStop(at, col);
          g.fillStyle = grad;
          g.fillRect(0, 0, w, h);
        });
        const mat = new MeshBasicMaterial({ color: map ? '#ffffff' : stops[0]![1], map, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
        const mesh = new Mesh(geo, mat);
        mesh.position.set(0, (y0 + y1) / 2, zBack - 0.3);
        mesh.renderOrder = 1;
        root.add(mesh);
        disposables.push({
          dispose: () => {
            geo.dispose();
            map?.dispose();
            mat.dispose();
            mesh.removeFromParent();
          },
        });
      };
      // outside: cool blue-teal, lighter toward the horizon; inside: warm yellow, deeper away from it (soft fade at y = 0)
      make([[0, 'rgba(78,150,170,0.85)'], [0.7, 'rgba(120,185,196,0.6)'], [1, 'rgba(190,222,214,0.18)']], 0, top);
      make([[0, 'rgba(246,226,160,0.2)'], [0.3, 'rgba(240,205,120,0.55)'], [1, 'rgba(214,150,70,0.85)']], bottom, 0);
    },
    bokeh(xHalf, top, bottom, zBack) {
      const n = ctx.quality === 'low' ? 10 : 26;
      const rng = mulberry32(555);
      const geo = new SphereGeometry(1, 10, 8);
      const mat = new MeshBasicMaterial({ transparent: true, opacity: 0.07, depthWrite: false, toneMapped: false });
      const mesh = new InstancedMesh(geo, mat, n);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      const items = Array.from({ length: n }, () => {
        const above = rng() < 0.5;
        return { x: (rng() * 2 - 1) * xHalf * 1.3, y: above ? rng() * top : -rng() * -bottom, z: zBack - 1.2 - rng() * 4, r: 0.35 + rng() * 0.55, ph: rng() * 6.28, sp: 0.1 + rng() * 0.2 };
      });
      const col = new Color();
      items.forEach((it, i) => mesh.setColorAt(i, col.set(it.y > 0 ? '#6fa9c4' : '#d9a24a')));
      const m = new Matrix4();
      const pose = (t: number): void => {
        items.forEach((it, i) => {
          m.makeScale(it.r, it.r, it.r);
          m.setPosition(it.x + Math.sin(t * it.sp + it.ph) * 0.8, it.y + Math.cos(t * it.sp * 0.8 + it.ph) * 0.5, it.z);
          mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
      };
      pose(0);
      root.add(mesh);
      hooks.push(pose);
      disposables.push({
        dispose: () => {
          geo.dispose();
          mat.dispose();
          mesh.dispose();
          mesh.removeFromParent();
        },
      });
    },
    glow(color, w, h, opacity) {
      const geo = new PlaneGeometry(w, h);
      const map = gradientTexture((g, cw, ch) => {
        const grad = g.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.65, 'rgba(255,255,255,0.7)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, cw, ch);
      }, 128, 128);
      const mat = new MeshBasicMaterial({ color, map, transparent: true, opacity, depthWrite: false, toneMapped: false });
      const mesh = new Mesh(geo, mat);
      mesh.renderOrder = 1;
      root.add(mesh);
      disposables.push({
        dispose: () => {
          geo.dispose();
          map?.dispose();
          mat.dispose();
          mesh.removeFromParent();
        },
      });
      return mesh;
    },
    tick(t) {
      hooks.forEach((h) => h(t));
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
  cameraAt(t: number): { position: [number, number, number]; target: [number, number, number] };
  labelsAt(t: number): ModuleLabel[];
  chartAt(t: number): Record<string, number>;
  setOptions(o: Record<string, string>): void;
  dispose(): void;
}
