import { Color, ConeGeometry, DodecahedronGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, type BufferGeometry, type Material, type Object3D } from 'three';
import type { VesselVisual } from '../../chemlab';
import { glowColor, lumpScale } from './helpers';
import type { LabAssets } from './labAssets';
import { setLinear } from './liquid';

const noRaycast = (o: Object3D): void => {
  o.traverse((n) => {
    n.raycast = (): void => undefined;
  });
};

type PieceInfo = VesselVisual['pieces'][number];

interface Node {
  group: Group;
  start: number;
  overlay: Mesh | null;
  glowMesh: Mesh | null;
  material: MeshStandardMaterial | null;
}

const COPPER = new Color().setRGB(184 / 255, 115 / 255, 51 / 255, 'srgb');

/** Where a piece rests, relative to the vessel's axis: index-based so pieces never overlap. */
const slotOffsets = [
  [0.35, 0.0],
  [-0.35, 0.15],
  [0.0, -0.4],
  [0.1, 0.45],
];

/**
 * Solid pieces in a vessel (nail, ribbon, granules, wire, foil, ash). The engine reports them as `{ id, rgb, massG }`;
 * a copper piece next to an iron one is drawn as the copper coat on the nail (an overlay whose opacity follows the share).
 */
export class Pieces {
  readonly group = new Group();
  private readonly nodes = new Map<string, Node>();
  private readonly owned: Material[] = [];
  private readonly geo: { lump: BufferGeometry; ash: BufferGeometry };

  constructor(private readonly assets: LabAssets) {
    this.group.name = 'pieces';
    this.geo = { lump: new DodecahedronGeometry(0.28, 0), ash: new ConeGeometry(1, 0.5, 18, 1) };
    noRaycast(this.group);
  }

  private make(p: PieceInfo): Node {
    const group = new Group();
    let overlay: Mesh | null = null;
    let glowMesh: Mesh | null = null;
    let material: MeshStandardMaterial | null = null;
    const asset = p.id === 'fe' ? 'iron-nail' : p.id === 'mg' ? 'magnesium-ribbon-coil' : p.id === 'cu' ? 'copper-strip' : null;
    if (asset) {
      const { group: g } = this.assets.objectNow(asset);
      group.add(g);
      const m = g.children.find((c) => (c as Mesh).isMesh) as Mesh | undefined;
      if (m && p.id === 'fe') {
        const om = new MeshStandardMaterial({ color: COPPER, roughness: 0.35, metalness: 0.7, transparent: true, opacity: 0 });
        this.owned.push(om);
        overlay = new Mesh(m.geometry, om);
        overlay.scale.setScalar(1.12);
        group.add(overlay);
      }
      if (m) {
        const gm = new MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
        this.owned.push(gm);
        glowMesh = new Mesh(m.geometry, gm);
        glowMesh.scale.setScalar(1.08);
        group.add(glowMesh);
      }
    } else {
      const geometry = p.id === 'mgo' ? this.geo.ash : this.geo.lump;
      material = new MeshStandardMaterial({ roughness: 0.55, metalness: p.id === 'mgo' ? 0 : 0.6, flatShading: true });
      this.owned.push(material);
      setLinear(material.color, p.rgb);
      const count = p.id === 'zn' ? 3 : p.id === 'al' ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const mesh = new Mesh(geometry, material);
        mesh.position.set(i * 0.5 - 0.4, 0.14, (i % 2) * 0.3);
        mesh.rotation.set(i, i * 2, 0);
        if (p.id === 'al') mesh.scale.set(1.4, 0.35, 1.2);
        if (p.id === 'mgo') mesh.scale.set(0.9, 0.7, 0.9);
        group.add(mesh);
      }
    }
    noRaycast(group);
    this.group.add(group);
    return { group, start: 0, overlay, glowMesh, material };
  }

  /** `bottomY` local y of the vessel floor, `radius` cavity radius there; returns the world-free spawn points for bubbles. */
  update(pieces: readonly PieceInfo[], glow: number, bottomY: number, radius: number, cx: number, cz: number, sources: number[]): void {
    sources.length = 0;
    const fe = pieces.find((p) => p.id === 'fe');
    const cu = pieces.find((p) => p.id === 'cu');
    let slot = 0;
    const seen = new Set<string>();
    for (const p of pieces) {
      if (p.id === 'cu' && fe) continue; // drawn as the coat on the nail
      seen.add(p.id);
      let node = this.nodes.get(p.id);
      if (!node) {
        node = this.make(p);
        this.nodes.set(p.id, node);
      }
      node.start = Math.max(node.start, p.massG);
      const [ox = 0, oz = 0] = slotOffsets[slot % slotOffsets.length] ?? [0, 0];
      slot++;
      const s = lumpScale(p.massG, node.start) * (p.id === 'mgo' ? 0.6 + Math.min(2.2, p.massG * 6) : 1);
      node.group.visible = p.massG > 0.0002;
      node.group.scale.setScalar(Math.max(0.05, s));
      const x = cx + ox * radius * 0.7;
      const z = cz + oz * radius * 0.7;
      node.group.position.set(x, bottomY + 0.05, z);
      if (p.id === 'fe') node.group.rotation.set(0.05, 0, -0.22);
      else if (p.id === 'cu') node.group.rotation.set(0, 0.6, -0.25);
      else if (p.id === 'mg') node.group.rotation.set(0, slot, 0);
      if (node.overlay && fe) {
        const share = cu ? cu.massG / Math.max(1e-6, cu.massG + fe.massG * 0.2) : 0;
        (node.overlay.material as MeshStandardMaterial).opacity = Math.min(0.95, share * 1.6);
      }
      if (node.glowMesh) {
        const m = node.glowMesh.material as MeshBasicMaterial;
        const [r, g, b] = glowColor(glow);
        m.color.setRGB(r, g, b);
        m.opacity = glow > 0.02 ? Math.min(0.85, 0.2 + glow * 0.7) : 0;
      }
      // gas leaves from reactive metals
      if (p.id === 'mg' || p.id === 'zn' || p.id === 'al' || p.id === 'fe') sources.push(x, bottomY + 0.3, z);
    }
    for (const [id, node] of this.nodes) if (!seen.has(id)) node.group.visible = false;
  }

  dispose(): void {
    this.geo.lump.dispose();
    this.geo.ash.dispose();
    for (const m of this.owned) m.dispose();
    this.group.removeFromParent();
  }
}
