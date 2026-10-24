import { Color, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial } from 'three';
import { clamp, streamRadius, type Rgb } from './helpers';
import { setLinear } from './liquid';
import type { VesselView } from './vesselView';

export type PourKind = 'liquid' | 'powder' | 'drops' | 'burette';

const N = 34;

/**
 * The pouring animation between a source (a vessel or a shelf bottle) and a target vessel: the source swings over the
 * target's mouth and tilts about its lip, and a stream of droplets runs from the lip to the liquid surface. It only
 * draws; the engine op is done by the caller. `begin` starts a session, `end` lets it finish and return.
 */
export class PourFx {
  readonly mesh: InstancedMesh;
  private readonly mat = new MeshStandardMaterial({ roughness: 0.12, metalness: 0, transparent: true, opacity: 0.82 });
  private src: VesselView | null = null;
  private autoEnd = 0;
  private dst: VesselView | null = null;
  private kind: PourKind = 'liquid';
  private tilt = 1.35;
  private t = 0;
  private flowing = 0;
  private dir = 1;
  private active = false;
  private ending = 0;
  /** Seconds the session stays after `end` (the stream thins out, the source tilts back). */
  private readonly tail = 0.35;
  private readonly arr: Float32Array;
  flow = 30;
  private readonly color = new Color();
  readonly group = new Group();

  constructor(private readonly reduced: boolean) {
    this.mesh = new InstancedMesh(new IcosahedronGeometry(1, 1), this.mat, N);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.raycast = (): void => undefined;
    this.mesh.renderOrder = 16;
    this.arr = this.mesh.instanceMatrix.array as Float32Array;
    this.group.add(this.mesh);
    this.group.name = 'pour';
  }

  get busy(): boolean {
    return this.active || this.ending > 0;
  }
  get source(): VesselView | null {
    return this.src;
  }
  get target(): VesselView | null {
    return this.dst;
  }

  /** `src` null = the stream simply falls from above the target (panel actions without a bottle on the shelf). */
  begin(src: VesselView | null, dst: VesselView, kind: PourKind, rgb: Rgb, flow = 30, autoEndS = 0): void {
    this.release();
    this.autoEnd = autoEndS;
    this.src = src;
    this.dst = dst;
    this.kind = kind;
    this.active = true;
    this.ending = 0;
    this.t = 0;
    this.dir = !src || src.pos.x <= dst.goal.x ? 1 : -1;
    this.flow = flow;
    this.tilt = !src ? 0 : kind === 'drops' ? Math.PI * 0.97 : kind === 'powder' ? 2.0 : src.kind === 'testtube' ? 1.9 : src.def.asset?.startsWith('reagent') ? 1.9 : 1.35;
    setLinear(this.color, kind === 'powder' ? [Math.min(255, rgb[0] * 1.05), Math.min(255, rgb[1] * 1.05), Math.min(255, rgb[2] * 1.05)] : rgb);
    this.mat.color.copy(this.color);
    this.mat.opacity = kind === 'powder' ? 0.95 : 0.8;
  }

  /** The learner let go (or the amount is reached): the stream stops, the source tilts back and returns. */
  end(): void {
    if (!this.active) return;
    this.active = false;
    this.ending = this.tail;
  }

  /** Immediately forget the session (the source is told to stand upright). */
  release(): void {
    if (this.src && this.src.kind !== 'burette25') {
      this.src.tiltGoal = 0;
      this.src.facing = 1;
    }
    this.src = null;
    this.dst = null;
    this.active = false;
    this.ending = 0;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  update(dt: number, time: number): void {
    const src = this.src;
    const dst = this.dst;
    if (!dst) {
      this.mesh.visible = false;
      return;
    }
    if (this.active && this.autoEnd > 0 && this.t >= this.autoEnd) this.end();
    if (!this.active) {
      this.ending -= dt;
      if (this.ending <= 0) {
        this.release();
        return;
      }
    }
    this.t += dt;
    const dir = this.dir;
    const hoverX = dst.goal.x - dir * dst.def.radius * (this.kind === 'liquid' ? 0.5 : 0.1);
    const hoverY = dst.goal.y + dst.def.topY + (this.kind === 'liquid' ? 1.6 : this.kind === 'drops' ? 4.2 : 2.4);
    const hoverZ = dst.goal.z;
    if (src && this.kind !== 'burette') {
      src.facing = dir;
      src.goal.set(hoverX - src.def.lipX, hoverY - src.def.topY, hoverZ);
      // the source first arrives, then tips
      const arrive = clamp((this.t - 0.25) / 0.35);
      src.tiltGoal = this.active ? this.tilt * arrive : 0;
    }
    const streaming = this.active ? clamp((this.t - (this.kind === 'burette' ? 0.05 : this.src ? 0.5 : 0.1)) / 0.15) : clamp(this.ending / this.tail);
    this.flowing += (streaming - this.flowing) * (1 - Math.exp(-dt * 12));
    this.draw(src, dst, hoverX, hoverY + (src ? 0 : 8), hoverZ, time);
  }

  private draw(src: VesselView | null, dst: VesselView, hx: number, hy: number, hz: number, time: number): void {
    const f = this.flowing;
    if (f < 0.03) {
      this.mesh.visible = false;
      this.mesh.count = 0;
      return;
    }
    // start: the lip (or the burette tip), end: the surface of the target
    const burette = src !== null && this.kind === 'burette';
    const sx = burette ? src.group.position.x : hx;
    const sy = burette ? src.group.position.y + 0.2 : hy;
    const sz = burette ? src.group.position.z : hz;
    const ex = dst.group.position.x + (burette ? 0 : -0.2 * this.dir);
    const ey = dst.group.position.y + Math.max(dst.levelY, dst.profile.yMin + 0.2);
    const ez = dst.group.position.z;
    const r = (this.kind === 'drops' || this.kind === 'burette' ? 0.17 : this.kind === 'powder' ? 0.1 : streamRadius(this.flow) * 0.9) * (0.5 + 0.5 * f);
    const gap = this.kind === 'drops' || this.kind === 'burette' ? 3.4 : this.kind === 'powder' ? 1.7 : 1;
    const speed = this.reduced ? 0.4 : 1.3;
    let n = 0;
    for (let i = 0; i < N; i++) {
      const u0 = (i / N) * gap + time * speed;
      const u = u0 - Math.floor(u0 / gap) * gap;
      if (u > 1) continue;
      const x = sx + (ex - sx) * u;
      const z = sz + (ez - sz) * u;
      const y = sy + (ey - sy) * u * u;
      const s = r * (this.kind === 'liquid' ? 1 - 0.25 * u : 1);
      const o = n * 16;
      this.arr[o] = s; this.arr[o + 1] = 0; this.arr[o + 2] = 0; this.arr[o + 3] = 0;
      this.arr[o + 4] = 0; this.arr[o + 5] = s * (this.kind === 'liquid' ? 1.5 : 1.2); this.arr[o + 6] = 0; this.arr[o + 7] = 0;
      this.arr[o + 8] = 0; this.arr[o + 9] = 0; this.arr[o + 10] = s; this.arr[o + 11] = 0;
      this.arr[o + 12] = x; this.arr[o + 13] = y; this.arr[o + 14] = z; this.arr[o + 15] = 1;
      n++;
    }
    this.mesh.count = n;
    this.mesh.visible = n > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    // ripples on the receiving surface
    dst.wobble = Math.max(dst.wobble, 0.1 * f);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.group.removeFromParent();
  }
}
