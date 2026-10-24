import { Color, CylinderGeometry, DoubleSide, DynamicDrawUsage, Euler, Group, IcosahedronGeometry, InstancedMesh, Matrix4, MeshPhysicalMaterial, MeshBasicMaterial, Quaternion, RingGeometry, SphereGeometry, Vector3, type Object3D } from 'three';
import type { ParticleScript } from '../../../chemlab';
import { setLinear } from '../liquid';
import { ELEMENTS, SPECIES_TINT, shapeOf, type Molecule } from './molecules';
import { pose, type Plan } from './plan';

const ATOM = 0.55;
const BOND = 0.1;
/** Molecules are drawn this much larger than their template (the box is big). */
const GROW = 1.75;
const noPick = (o: Object3D): void => {
  o.raycast = (): void => undefined;
};
const E_COLORS: Record<string, { r: number; color: string }> = { ...ELEMENTS, e: { r: 0.5, color: '#ffd23f' }, cat: { r: 1.5, color: '#b99ad8' }, p: { r: 0.6, color: '#fff2f0' } };

/** The renderer of a particle plan: instanced atoms (one mesh per element), bond sticks, charge halos, transfer tokens, reaction rings. */
export class ParticleLayer {
  readonly group = new Group();
  private readonly atomMeshes = new Map<string, { mesh: InstancedMesh; n: number }>();
  private readonly bonds: InstancedMesh;
  private readonly halos: InstancedMesh;
  private readonly tokens: InstancedMesh;
  private readonly rings: InstancedMesh;
  private readonly sphere: IcosahedronGeometry;
  private readonly shapes = new Map<string, Molecule>();
  private readonly species = new Map<string, ParticleScript['species'][number]>();
  private readonly mats: (MeshPhysicalMaterial | MeshBasicMaterial)[] = [];
  private readonly rot = new Matrix4();
  private readonly euler = new Euler();
  private readonly q = new Quaternion();
  private readonly m4 = new Matrix4();
  private readonly v1 = new Vector3();
  private readonly v2 = new Vector3();
  private readonly v3 = new Vector3();
  private readonly v4 = new Vector3();
  private readonly v5 = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  private readonly col = new Color();
  private readonly o = { x: 0, y: 0, z: 0, alive: true, scale: 1, rx: 0, ry: 0, rz: 0 };

  constructor(private readonly plan: Plan, low: boolean) {
    this.group.name = 'particles';
    for (const sp of plan.script.species) {
      this.species.set(sp.id, sp);
      this.shapes.set(sp.id, sp.kind === 'electron' ? { atoms: [{ el: 'e', x: 0, y: 0, z: 0 }], bonds: [], radius: 0.4 } : sp.kind === 'catalyst' ? catalyst() : shapeOf(sp));
    }
    const seg = low ? 1 : 2;
    const sphere = new IcosahedronGeometry(1, seg);
    this.sphere = sphere;
    const counts = new Map<string, number>();
    let bondCount = 0;
    let haloCount = 0;
    for (const p of plan.particles) {
      const shape = this.shapes.get(p.sid);
      if (!shape) continue;
      for (const a of shape.atoms) counts.set(a.el, (counts.get(a.el) ?? 0) + 1);
      bondCount += shape.bonds.length * 2;
      if ((this.species.get(p.sid)?.charge ?? 0) !== 0 && this.species.get(p.sid)?.kind !== 'electron') haloCount++;
    }
    for (const [el, n] of counts) {
      const mat = new MeshPhysicalMaterial({ roughness: 0.42, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4 });
      if (el === 'e') {
        mat.emissive = new Color('#ffb81c');
        mat.emissiveIntensity = 0.9;
      }
      this.mats.push(mat);
      const mesh = new InstancedMesh(sphere, mat, n);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.count = 0;
      noPick(mesh);
      this.atomMeshes.set(el, { mesh, n: 0 });
      this.group.add(mesh);
    }
    const bondMat = new MeshPhysicalMaterial({ color: '#d7cdbd', roughness: 0.5, clearcoat: 0.2 });
    this.mats.push(bondMat);
    this.bonds = new InstancedMesh(new CylinderGeometry(1, 1, 1, 8, 1), bondMat, Math.max(1, bondCount));
    const haloMat = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false });
    this.mats.push(haloMat);
    this.halos = new InstancedMesh(new SphereGeometry(1, 16, 10), haloMat, Math.max(1, haloCount));
    const tokenMat = new MeshPhysicalMaterial({ color: '#ffffff', emissive: new Color('#ffd23f'), emissiveIntensity: 0.9, roughness: 0.3 });
    this.mats.push(tokenMat);
    this.tokens = new InstancedMesh(new SphereGeometry(1, 12, 8), tokenMat, Math.max(1, plan.transfers.length));
    const ringMat = new MeshBasicMaterial({ color: '#ffe9b0', transparent: true, opacity: 0.7, depthWrite: false, side: DoubleSide });
    this.mats.push(ringMat);
    this.rings = new InstancedMesh(new RingGeometry(0.85, 1, 32), ringMat, Math.max(1, plan.events.length));
    for (const m of [this.bonds, this.halos, this.tokens, this.rings]) {
      m.instanceMatrix.setUsage(DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      noPick(m);
      this.group.add(m);
    }
    this.halos.renderOrder = 6;
    this.rings.renderOrder = 7;
  }

  /** Poses everything for time `t` (pure function of t). `fade` 0..1 scales every particle (the zoom-in from the macro view). */
  update(t: number, fade: number): void {
    for (const a of this.atomMeshes.values()) a.n = 0;
    let nb = 0;
    let nh = 0;
    const bondArr = this.bonds.instanceMatrix.array as Float32Array;
    const haloArr = this.halos.instanceMatrix.array as Float32Array;
    const o = this.o;
    for (const p of this.plan.particles) {
      pose(this.plan, p, t, o);
      if (!o.alive || o.scale < 0.02) continue;
      const sp = this.species.get(p.sid);
      const shape = this.shapes.get(p.sid);
      if (!sp || !shape) continue;
      const s = o.scale * fade * GROW;
      if (s < 0.02) continue;
      this.euler.set(o.rx, o.ry, o.rz);
      this.rot.makeRotationFromEuler(this.euler);
      const e = this.rot.elements;
      const tint = SPECIES_TINT[p.sid];
      const world = (i: number, out: Vector3): Vector3 => {
        const a = shape.atoms[i];
        if (!a) return out.set(o.x, o.y, o.z);
        return out.set(o.x + (e[0]! * a.x + e[4]! * a.y + e[8]! * a.z) * s, o.y + (e[1]! * a.x + e[5]! * a.y + e[9]! * a.z) * s, o.z + (e[2]! * a.x + e[6]! * a.y + e[10]! * a.z) * s);
      };
      shape.atoms.forEach((a, i) => {
        const rec = this.atomMeshes.get(a.el);
        if (!rec) return;
        world(i, this.v1);
        const r = (E_COLORS[a.el]?.r ?? 0.6) * ATOM * s * (sp.kind === 'ion' && shape.atoms.length === 1 ? 1.25 : 1);
        this.m4.makeScale(r, r, r).setPosition(this.v1);
        rec.mesh.setMatrixAt(rec.n, this.m4);
        this.col.set(tint && a.el !== 'H' && a.el !== 'O' ? tint : (E_COLORS[a.el]?.color ?? '#cccccc'));
        rec.mesh.setColorAt(rec.n, this.col);
        rec.n++;
      });
      for (const [i, j, order] of shape.bonds) {
        world(i, this.v1);
        world(j, this.v2);
        this.v3.subVectors(this.v2, this.v1);
        const len = this.v3.length();
        if (len < 1e-4) continue;
        this.q.setFromUnitVectors(this.up, this.v3.divideScalar(len));
        const side = order === 2 ? 0.1 * s : 0;
        const radius = BOND * s * (order === 2 ? 0.7 : 1);
        for (let k = 0; k < (order === 2 ? 2 : 1); k++) {
          this.v4.copy(this.v1).add(this.v2).multiplyScalar(0.5);
          this.v4.x += k === 0 ? side : -side;
          this.m4.compose(this.v4, this.q, this.v5.set(radius, len, radius));
          if (nb < bondArr.length / 16) {
            this.m4.toArray(bondArr, nb * 16);
            nb++;
          }
        }
      }
      if (sp.charge !== 0 && sp.kind !== 'electron' && nh < haloArr.length / 16) {
        const hr = Math.max(0.55, shape.radius * ATOM * 1.0 + 0.45) * s;
        this.m4.makeScale(hr, hr, hr).setPosition(o.x, o.y, o.z);
        this.m4.toArray(haloArr, nh * 16);
        setLinear(this.col, sp.charge > 0 ? [255, 110, 90] : [80, 150, 255]);
        this.halos.setColorAt(nh, this.col);
        nh++;
      }
    }
    for (const rec of this.atomMeshes.values()) {
      rec.mesh.count = rec.n;
      rec.mesh.instanceMatrix.needsUpdate = true;
      if (rec.mesh.instanceColor) rec.mesh.instanceColor.needsUpdate = true;
    }
    this.bonds.count = nb;
    this.bonds.instanceMatrix.needsUpdate = true;
    this.halos.count = nh;
    this.halos.instanceMatrix.needsUpdate = true;
    if (this.halos.instanceColor) this.halos.instanceColor.needsUpdate = true;
    this.updateTokens(t, fade);
    this.updateRings(t, fade);
    this.group.visible = fade > 0.01;
  }

  private updateTokens(t: number, fade: number): void {
    const arr = this.tokens.instanceMatrix.array as Float32Array;
    const o = { x: 0, y: 0, z: 0, alive: true, scale: 1 };
    const b = { x: 0, y: 0, z: 0, alive: true, scale: 1 };
    let n = 0;
    for (const tr of this.plan.transfers) {
      if (t < tr.t0 || t > tr.t1 + 0.25) continue;
      const pf = this.plan.particles[tr.from];
      const pt = this.plan.particles[tr.to];
      if (!pf || !pt) continue;
      pose(this.plan, pf, Math.min(t, tr.t1), o, true);
      pose(this.plan, pt, Math.min(t, tr.t1) + 0.02, b, true);
      const k = Math.min(1, Math.max(0, (t - tr.t0) / Math.max(0.1, tr.t1 - tr.t0)));
      const r = (tr.kind === 'electron' ? 0.26 : 0.32) * fade * (1 - Math.max(0, (t - tr.t1) / 0.25));
      this.m4.makeScale(r, r, r).setPosition(o.x + (b.x - o.x) * k, o.y + (b.y - o.y) * k + Math.sin(k * Math.PI) * 1.4, o.z + (b.z - o.z) * k);
      this.m4.toArray(arr, n * 16);
      n++;
    }
    this.tokens.count = n;
    this.tokens.instanceMatrix.needsUpdate = true;
  }

  private updateRings(t: number, fade: number): void {
    const arr = this.rings.instanceMatrix.array as Float32Array;
    let n = 0;
    for (const ev of this.plan.events) {
      const age = t - ev.t;
      if (age < 0 || age > 0.7) continue;
      const r = (0.6 + age * 4) * fade;
      this.m4.makeScale(r, r, r).setPosition(ev.point[0], ev.point[1], ev.point[2]);
      this.m4.toArray(arr, n * 16);
      n++;
    }
    this.rings.count = n;
    this.rings.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const { mesh } of this.atomMeshes.values()) mesh.dispose();
    this.sphere.dispose();
    for (const m of [this.bonds, this.halos, this.tokens, this.rings]) {
      m.geometry.dispose();
      m.dispose();
    }
    for (const m of this.mats) m.dispose();
    this.group.removeFromParent();
  }
}

function catalyst(): Molecule {
  const atoms = [0, 1, 2, 3, 4].map((i) => ({ el: 'cat', x: Math.cos(i * 1.7) * 0.9, y: Math.sin(i * 1.1) * 0.7, z: Math.sin(i * 2.3) * 0.8 }));
  return { atoms, bonds: [], radius: 1.8 };
}
