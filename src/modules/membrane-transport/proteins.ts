import { Color, Float32BufferAttribute, Group, type BufferGeometry, type Object3D } from 'three';
import type { ModuleContext } from '../../scene';

/** Vertex-colours a geometry with a soft top-light gradient (the "painted" look); also keeps the uv set. */
export function paint(geo: BufferGeometry, hex: string, spread = 0.18): BufferGeometry {
  const pos = geo.getAttribute('position');
  geo.computeBoundingBox();
  const y0 = geo.boundingBox?.min.y ?? 0;
  const h = Math.max((geo.boundingBox?.max.y ?? 1) - y0, 1e-6);
  const base = new Color(hex);
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = 1 - spread + spread * 1.6 * ((pos.getY(i) - y0) / h);
    col[i * 3] = Math.min(1, base.r * k);
    col[i * 3 + 1] = Math.min(1, base.g * k);
    col[i * 3 + 2] = Math.min(1, base.b * k);
  }
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  return geo;
}

export interface Protein {
  group: Group;
  x: number;
  z: number;
  /** Radius around the protein where no lipid is drawn. */
  clear: number;
  dispose(): void;
}

async function place(ctx: ModuleContext, id: string, x: number, z: number, clear: number): Promise<{ protein: Protein; model: Object3D }> {
  const group = new Group();
  const model = await ctx.assets.loadGlb(id);
  group.add(model);
  group.position.set(x, 0, z);
  return { model, protein: { group, x, z, clear, dispose: () => group.removeFromParent() } };
}

/** Channel protein (public/models/modules/channel-protein.glb, pivot on the pore axis, 1.2 tall). */
export async function makeChannel(ctx: ModuleContext, x: number, z: number): Promise<Protein> {
  return (await place(ctx, 'channel-protein', x, z, 0.8)).protein;
}

export interface Carrier extends Protein {
  /** +1 open to the outside, -1 open to the inside (swaps carrier-protein and carrier-protein-b). */
  setTheta(theta: number): void;
}

export async function makeCarrier(ctx: ModuleContext, x: number, z: number): Promise<Carrier> {
  const { protein, model } = await place(ctx, 'carrier-protein', x, z, 0.95);
  const other = await ctx.assets.loadGlb('carrier-protein-b');
  protein.group.add(other);
  return {
    ...protein,
    setTheta: (theta) => {
      model.visible = theta >= 0;
      other.visible = theta < 0;
    },
  };
}

export interface Pump extends Protein {
  /** flip: 0 open to the inside .. 1 open to the outside; domain: 0 open .. 1 closed on ATP. */
  setState(flip: number, domain: number): void;
  /** Height of the ATP docking spot on the cytoplasmic lobes. */
  atpY(domain: number): number;
}

export async function makePump(ctx: ModuleContext, x: number, z: number): Promise<Pump> {
  const { protein, model } = await place(ctx, 'pump-protein', x, z, 1.0);
  return {
    ...protein,
    atpY: (d) => -1.0 + 0.12 * d,
    setState: (flip, d) => {
      model.rotation.z = 0.15 * (2 * flip - 1);
      model.scale.set(1.1 - 0.2 * flip, 0.94 + 0.12 * flip - 0.04 * d, 1.05 - 0.1 * flip);
    },
  };
}
