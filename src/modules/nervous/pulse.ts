import { Color, InstancedMesh, DynamicDrawUsage, Matrix4, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3, type Sprite } from 'three';
import { noAO, type Kit } from './kit';

const TRAIL = 12;
const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const Q = new Quaternion();
const M = new Matrix4();

/**
 * A travelling impulse: a hot bead with a halo and a short tail of shrinking beads. The rig gives it a list of points
 * (head first, then tail points further back along the path); everything is placed from those, no state.
 */
export class PulseBead {
  private readonly head: Mesh;
  private readonly halo: Sprite;
  private readonly tail: InstancedMesh;
  private readonly tmp = new Vector3();

  constructor(
    kit: Kit,
    color: string,
    private readonly size = 0.24,
  ) {
    const geo = new SphereGeometry(1, 16, 12);
    const mat = new MeshBasicMaterial({ color, toneMapped: false });
    this.head = new Mesh(geo, mat);
    this.head.renderOrder = 55;
    noAO(this.head);
    kit.root.add(this.head);
    this.tail = new InstancedMesh(geo, mat, TRAIL);
    this.tail.instanceMatrix.setUsage(DynamicDrawUsage);
    this.tail.frustumCulled = false;
    this.tail.renderOrder = 54;
    noAO(this.tail);
    for (let i = 0; i < TRAIL; i++) this.tail.setMatrixAt(i, HIDDEN);
    this.tail.setColorAt(0, new Color('#ffffff'));
    kit.root.add(this.tail);
    this.halo = kit.sprite(color, size * 5.5, 0.6);
    kit.track(geo);
    kit.track(mat);
    kit.track({
      dispose: () => (this.head.removeFromParent(), this.tail.dispose(), this.tail.removeFromParent()),
    });
    this.hide();
  }

  hide(): void {
    this.head.visible = false;
    this.halo.visible = false;
    this.head.position.set(0, 0, 0);
    this.halo.position.set(0, 0, 0);
    this.head.scale.setScalar(1);
    this.halo.scale.setScalar(1);
    for (let i = 0; i < TRAIL; i++) this.tail.setMatrixAt(i, HIDDEN);
    this.tail.instanceMatrix.needsUpdate = true;
  }

  /** `points[0]` is the head; the rest trail behind it. `amount` (0..1) scales brightness and size. */
  set(points: readonly Vector3[], amount: number): void {
    if (amount <= 0.001 || points.length === 0) return this.hide();
    const s = this.size * (0.6 + 0.4 * amount);
    this.head.visible = true;
    this.head.position.copy(points[0]!);
    this.head.scale.setScalar(s * 0.6);
    this.halo.visible = true;
    this.halo.position.copy(points[0]!);
    this.halo.scale.setScalar(this.size * 5.5 * amount);
    for (let i = 0; i < TRAIL; i++) {
      const p = points[i + 1];
      if (!p) {
        this.tail.setMatrixAt(i, HIDDEN);
        continue;
      }
      const k = (1 - (i + 1) / (TRAIL + 1)) * amount;
      this.tmp.setScalar(s * 0.5 * k);
      this.tail.setMatrixAt(i, M.compose(p, Q, this.tmp));
    }
    this.tail.instanceMatrix.needsUpdate = true;
  }
}
