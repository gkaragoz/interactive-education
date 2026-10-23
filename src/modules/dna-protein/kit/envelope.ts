import { Color, CylinderGeometry, DoubleSide, MeshStandardMaterial, Float32BufferAttribute, Group, Mesh, RingGeometry, TorusGeometry, type BufferGeometry, type Material } from 'three';

function tinted<T extends BufferGeometry>(g: T, hex: number): T {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  const col = new Color(hex); // sRGB hex converted to the linear working space
  for (let i = 0; i < n; i++) col.toArray(c, i * 3);
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
  return g;
}

/**
 * A patch of nuclear envelope seen face-on with one pore: two flat membrane sheets with a round opening, a pore tube and
 * two pore rings (outer / inner). The group origin is the pore centre and its axis is Z, so scaling the group grows it
 * out of the pore. Same purple and pink as the explorer's nucleus.
 */
export class Envelope {
  readonly group = new Group();
  private readonly geoms: BufferGeometry[] = [];
  private readonly sheet: MeshStandardMaterial;

  constructor(clay: Material, quality: string) {
    // flat sheets would blow out under the shared gel's clearcoat, so they get a matte translucent material of their own
    this.sheet = new MeshStandardMaterial({ color: new Color('#6d47b5'), transparent: true, opacity: 0.45, roughness: 1, metalness: 0, envMapIntensity: 0.25, side: DoubleSide, depthWrite: false });
    const shell = this.sheet;
    const seg = quality === 'low' ? 32 : 64;
    const hole = 1.9;
    const add = (g: BufferGeometry, mat: Material, z: number, order: number): void => {
      const m = new Mesh(g, mat);
      m.position.z = z;
      m.renderOrder = order;
      this.group.add(m);
      this.geoms.push(g);
    };
    add(tinted(new RingGeometry(hole, 7, seg, 1), 0xffffff), shell, 0.5, 41);
    add(tinted(new RingGeometry(hole + 0.15, 7, seg, 1), 0xffffff), shell, -0.5, 41);
    const tube = new CylinderGeometry(hole, hole, 1.4, seg / 2, 1, true);
    tube.rotateX(Math.PI / 2);
    add(tinted(tube, 0xd9669f), clay, 0, 33);
    add(tinted(new TorusGeometry(hole + 0.1, 0.3, 12, seg), 0xe0709f), clay, 0.7, 33);
    add(tinted(new TorusGeometry(hole + 0.1, 0.3, 12, seg), 0xe0709f), clay, -0.7, 33);
  }

  dispose(): void {
    this.sheet.dispose();
    for (const g of this.geoms) g.dispose();
    this.group.removeFromParent();
  }
}
