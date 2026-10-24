import { DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';

export type RingKind = 'hover' | 'focus' | 'target' | 'refuse';
const COLORS: Record<RingKind, number> = { hover: 0xffb347, focus: 0xffe08a, target: 0x6fe39a, refuse: 0xff6b5e };

/** Glowing rings on the bench under an object: hover (orange), keyboard focus (yellow), valid drop target (green), refusal (red, fades). */
export class Highlights {
  readonly group = new Group();
  private readonly rings = new Map<RingKind, { mesh: Mesh; mat: MeshBasicMaterial; amount: number; goal: number }>();
  private readonly geo = new RingGeometry(0.86, 1, 48);

  constructor() {
    this.group.name = 'highlights';
    for (const kind of Object.keys(COLORS) as RingKind[]) {
      const mat = new MeshBasicMaterial({ color: COLORS[kind], transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: DoubleSide, toneMapped: false });
      const mesh = new Mesh(this.geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 8;
      mesh.raycast = (): void => undefined;
      this.group.add(mesh);
      this.rings.set(kind, { mesh, mat, amount: 0, goal: 0 });
    }
  }

  show(kind: RingKind, x: number, z: number, radius: number, y = 0.06): void {
    const r = this.rings.get(kind);
    if (!r) return;
    r.mesh.position.set(x, y, z);
    r.mesh.scale.setScalar(radius);
    r.goal = 1;
    if (kind === 'refuse') r.amount = 1;
  }

  hide(kind: RingKind): void {
    const r = this.rings.get(kind);
    if (r) r.goal = 0;
  }

  update(dt: number): void {
    for (const [kind, r] of this.rings) {
      const rate = kind === 'refuse' ? 2.5 : 12;
      if (kind === 'refuse') r.goal = 0;
      r.amount += (r.goal - r.amount) * (1 - Math.exp(-dt * rate));
      r.mat.opacity = 0.85 * r.amount;
      r.mesh.visible = r.amount > 0.02;
    }
  }

  dispose(): void {
    this.geo.dispose();
    for (const r of this.rings.values()) r.mat.dispose();
    this.group.removeFromParent();
  }
}
