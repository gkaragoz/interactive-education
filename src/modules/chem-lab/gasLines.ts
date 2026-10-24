import { CatmullRomCurve3, Group, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three';
import type { LabSim } from '../../chemlab';
import type { VesselView } from './vesselView';

/** Rubber hoses between vessels (the engine's `gasTo`): rebuilt only when the connection changes. */
export class GasLines {
  private readonly group = new Group();
  private readonly meshes = new Map<string, { key: string; mesh: Mesh }>();
  private readonly mat = new MeshStandardMaterial({ color: '#d8cdb6', roughness: 0.55, transparent: true, opacity: 0.92 });
  private readonly wanted = new Map<string, string>();

  constructor(parent: Group, private readonly views: ReadonlyMap<string, VesselView>) {
    this.group.name = 'gas-lines';
    parent.add(this.group);
  }

  /** Reads the connections (10 Hz). */
  sync(lab: LabSim): void {
    this.wanted.clear();
    for (const id of this.views.keys()) {
      const to = lab.vessel(id)?.gasTo;
      if (to && this.views.has(to)) this.wanted.set(id, to);
    }
  }

  update(_dt: number): void {
    for (const [from, to] of this.wanted) {
      const a = this.views.get(from);
      const b = this.views.get(to);
      if (!a || !b) continue;
      const key = `${a.goal.x.toFixed(1)},${a.goal.y.toFixed(1)},${b.goal.x.toFixed(1)}`;
      const have = this.meshes.get(from);
      if (have?.key === key) continue;
      have?.mesh.geometry.dispose();
      have?.mesh.removeFromParent();
      const start = new Vector3(a.goal.x + a.def.lipX * 0.2, a.goal.y + a.def.topY - 0.5, a.goal.z);
      const end = new Vector3(b.goal.x, b.goal.y + 1.2, b.goal.z);
      const top = Math.max(start.y, b.goal.y + b.def.topY) + 7;
      const mid1 = new Vector3(start.x + 1.5, top, start.z + 1);
      const mid2 = new Vector3(end.x, top - 1, end.z + 3.5);
      const below = new Vector3(end.x, end.y - 0.5, end.z + 1.5);
      const curve = new CatmullRomCurve3([start, new Vector3(start.x, start.y + 2.5, start.z), mid1, mid2, below, end]);
      const mesh = new Mesh(new TubeGeometry(curve, 36, 0.32, 8, false), this.mat);
      mesh.castShadow = true;
      mesh.raycast = (): void => undefined;
      this.group.add(mesh);
      this.meshes.set(from, { key, mesh });
    }
    for (const [from, rec] of this.meshes) {
      if (!this.wanted.has(from)) {
        rec.mesh.geometry.dispose();
        rec.mesh.removeFromParent();
        this.meshes.delete(from);
      }
    }
  }

  dispose(): void {
    for (const rec of this.meshes.values()) rec.mesh.geometry.dispose();
    this.meshes.clear();
    this.mat.dispose();
    this.group.removeFromParent();
  }
}
