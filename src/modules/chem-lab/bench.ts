import { Color, Group, type MeshPhysicalMaterial, type Object3D } from 'three';
import { Balance } from './balance';
import type { LabAssets } from './labAssets';
import { ANCHORS, type BenchLayout } from './layout';
import { LiquidMesh, setLinear } from './liquid';
import { partGeometry } from './labAssets';
import { profileOf } from './profile';

export const BENCH = { depth: 30, tileW: ANCHORS.tile, wallZ: -15, shelfY: 22.8, shelfZ: -9 } as const;

/** Prop that ignores picking (decoration): the host raycast then goes straight through to the vessels behind it. */
export function inert(o: Object3D): void {
  o.traverse((n) => {
    n.raycast = (): void => undefined;
  });
}

/** Places a preloaded asset; `decor` props are not pickable. */
export function place(assets: LabAssets, id: string, x: number, y: number, z: number, opts: { rotY?: number; scale?: number; decor?: boolean } = {}): Group {
  const { group } = assets.objectNow(id);
  group.position.set(x, y, z);
  group.rotation.y = opts.rotY ?? 0;
  if (opts.scale) group.scale.setScalar(opts.scale);
  if (opts.decor !== false) inert(group);
  return group;
}

/** A filled cavity that never changes (pneumatic trough): the glass plus a liquid mesh at a fixed fill. */
export function staticLiquidVessel(assets: LabAssets, id: string, fill: number, rgb: [number, number, number], low: boolean): Group {
  const { group, asset } = assets.objectNow(id);
  const liq = asset.meta.liquid;
  const inner = partGeometry(asset, 'inner');
  group.getObjectByName('inner')?.removeFromParent();
  if (liq && inner) {
    const lm = new LiquidMesh(inner, profileOf(inner.getAttribute('position').array, liq.yMin, liq.yMax), low);
    const c = setLinear(new Color(), rgb);
    lm.set(
      { levelY: liq.yMin + fill * (liq.yMax - liq.yMin), color: c, alpha: 0.45, turbidity: 0, turbColor: c, sedimentTopY: -100, sedimentColor: c, topColor: c, topAmount: 0, topDepth: 1, wobble: 0.01 },
      0,
    );
    group.add(lm.mesh);
  }
  return group;
}

/** The static bench: tiles, backdrop, racks, burette stands, troughs, the balance and some dressing. */
export class BenchStatic {
  readonly group = new Group();
  readonly balance: Balance;
  private readonly wall: MeshPhysicalMaterial[] = [];
  private top: MeshPhysicalMaterial | null = null;
  private readonly assets: LabAssets;

  constructor(assets: LabAssets, layout: BenchLayout, low: boolean) {
    this.assets = assets;
    this.group.name = 'bench';
    const n = layout.tiles;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * BENCH.tileW;
      // a second tile sits a hair higher and behind, so overlapping faces never z-fight
      this.group.add(place(assets, 'bench-top', x, i * 0.03, i * -0.05), place(assets, 'lab-backdrop', x, 0, BENCH.wallZ - i * 0.15));
    }
    for (const u of layout.units) {
      if (u.kind === 'rack') this.group.add(place(assets, 'test-tube-rack', u.x, 0, u.z));
      else if (u.kind === 'stand') this.group.add(place(assets, 'burette-stand', u.x, 0, u.z));
      else if (u.kind === 'trough') this.group.add(staticLiquidVessel(assets, 'beaker-400ml', 0.55, [210, 232, 245], low).translateX(u.x).translateZ(u.z));
    }
    this.balance = new Balance(assets);
    this.balance.group.position.set(layout.balance.x, 0, layout.balance.z);
    this.balance.group.visible = layout.hasBalance;
    this.group.add(this.balance.group);
    // dressing at the edges of the bench
    const half = (n * BENCH.tileW) / 2;
    if (n > 1) this.group.add(place(assets, 'waste-container', half - 6.5, 0, -9, { scale: 0.5 }));
  }

  /** Keeps the white tiles a soft teal grey so clear glass and bubbles show against them (textures reset the colour as they stream in). */
  tintWall(): void {
    if (this.wall.length === 0) {
      const lib = this.assets.libraryMaterial('lab-backdrop', 'clay');
      if (lib) this.wall.push(lib);
    }
    this.top ??= this.assets.libraryMaterial('bench-top', 'clay');
    if (this.top) {
      // a glossy lab bench: soft clearcoat reflections of the studio
      this.top.clearcoat = 0.7;
      this.top.clearcoatRoughness = 0.22;
      this.top.envMapIntensity = 1.1;
    }
    for (const m of this.wall) {
      m.color.setRGB(0.44, 0.56, 0.62);
      (m.userData as { baseColor?: Color }).baseColor = m.color.clone();
    }
  }

  dispose(): void {
    this.balance.dispose();
    this.group.removeFromParent();
  }
}
