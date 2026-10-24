import { CylinderGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry, RingGeometry, ShaderMaterial, type Object3D } from 'three';
import type { HeatSource } from '../../chemlab';
import { approach, flameSize, GLSL_SS } from './helpers';
import type { LabAssets } from './labAssets';

const noRaycastTree = (o: Object3D, keep: string): void => {
  o.traverse((n) => {
    if (n.userData['simId'] === undefined) n.userData['simId'] = keep;
  });
};

const FLAME_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLAME_FRAG = /* glsl */ `
${GLSL_SS}
uniform float uTime; uniform float uBlue; uniform float uSeed;
varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  float y = vUv.y;
  float flick = vn(vec2(y * 3.0 - uTime * 4.5 + uSeed, uTime * 0.7 + uSeed));
  float x = (vUv.x - 0.5) + (flick - 0.5) * 0.35 * y;
  float hw = mix(0.34, 0.03, pow(y, 0.85)) * (1.0 - 0.18 * flick);
  float body = ss(hw, hw * 0.25, abs(x)) * ss(0.0, 0.07, y) * ss(1.0, 0.82, y + (flick - 0.5) * 0.12);
  float core = ss(hw * 0.45, 0.0, abs(x)) * ss(0.55, 0.0, y);
  vec3 yellow = mix(vec3(1.0, 0.42, 0.04), vec3(1.0, 0.86, 0.35), 1.0 - y);
  vec3 blue = mix(vec3(0.16, 0.38, 1.0), vec3(0.62, 0.84, 1.0), core + 0.2);
  vec3 c = mix(yellow, blue, uBlue);
  c += vec3(0.35, 0.3, 0.15) * core * (1.0 - uBlue);
  gl_FragColor = vec4(c * 1.6, body * 0.9);
}`;

/** A flame card: two crossed quads with a procedural flame shape (additive, drawn above the bloom threshold). */
export class Flame {
  readonly group = new Group();
  private readonly mat: ShaderMaterial;
  private size = 0;
  private time = Math.random() * 10;

  constructor(width = 3.4, height = 9) {
    this.mat = new ShaderMaterial({
      vertexShader: FLAME_VERT,
      fragmentShader: FLAME_FRAG,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
     
      toneMapped: false,
      uniforms: { uTime: { value: 0 }, uBlue: { value: 1 }, uSeed: { value: Math.random() * 5 } },
    });
    const geo = new PlaneGeometry(width, height);
    geo.translate(0, height / 2, 0);
    const a = new Mesh(geo, this.mat);
    const b = new Mesh(geo, this.mat);
    b.rotation.y = Math.PI / 2;
    for (const m of [a, b]) {
      m.renderOrder = 15;
      m.raycast = (): void => undefined;
      this.group.add(m);
    }
    this.group.visible = false;
  }

  update(dt: number, target: number, blue: number, reduced: boolean): void {
    this.size = approach(this.size, target, 7, dt);
    this.time += reduced ? dt * 0.25 : dt;
    this.group.visible = this.size > 0.02;
    this.group.scale.set(this.size * (0.8 + 0.2 * blue), this.size, this.size * (0.8 + 0.2 * blue));
    this.mat.uniforms.uTime!.value = this.time;
    this.mat.uniforms.uBlue!.value = blue;
  }

  dispose(): void {
    (this.group.children[0] as Mesh | undefined)?.geometry.dispose();
    this.mat.dispose();
  }
}

/** Heights (cm) the heated vessel is lifted by: onto the gauze above a flame, onto the plate of a hot plate. */
export const LIFT = { flame: 20.4, hotplate: 6.9, none: 0 } as const;

/**
 * The heating station under one vessel: tripod + gauze + burner for flames, the hot plate for `hotplate`. It stands
 * at the vessel's home slot, grows in when the engine says the vessel is heated and the vessel rises onto it.
 */
export class HeaterRig {
  readonly group = new Group();
  /** Lift of the vessel above the bench (eased). */
  lift = 0;
  liftGoal = 0;
  private appear = 0;
  private source: HeatSource | null = null;
  private shownSource: HeatSource | null = null;
  private readonly flame = new Flame();
  private readonly parts = {
    tripod: new Group(),
    alcohol: new Group(),
    bunsen: new Group(),
    plate: new Group(),
    holder: new Group(),
  };
  private readonly plateGlow: Mesh;
  private readonly bunsenMat = new MeshStandardMaterial({ color: '#7d8791', metalness: 0.75, roughness: 0.35 });
  private readonly bunsenGeos: CylinderGeometry[] = [];
  private flameY = 0;

  constructor(assets: LabAssets, readonly simId: string, readonly forTube = false) {
    this.group.name = `heater:${simId}`;
    const tri = assets.objectNow('tripod').group;
    const gauze = assets.objectNow('wire-gauze').group;
    gauze.position.y = assets.metaOf('tripod').ringY ?? 19.85;
    this.parts.tripod.add(tri, gauze);
    this.parts.alcohol.add(assets.objectNow('alcohol-burner').group);
    this.buildBunsen();
    // a heated test tube hangs in tongs above the flame
    const tongs = assets.objectNow('tongs').group;
    tongs.position.set(9.6, 20.5, 0);
    this.parts.holder.add(tongs);
    const plate = assets.objectNow('hot-plate-stirrer').group;
    const pt = assets.metaOf('hot-plate-stirrer').plateTop ?? [0, 6.9, -2];
    plate.position.set(-pt[0], 0, -pt[2]);
    this.parts.plate.add(plate);
    this.plateGlow = new Mesh(new RingGeometry(0.4, 4.6, 40), new MeshStandardMaterial({ color: '#000', emissive: '#ff4a10', emissiveIntensity: 0, transparent: true, opacity: 0.85, side: DoubleSide }));
    this.plateGlow.rotation.x = -Math.PI / 2;
    this.plateGlow.position.y = pt[1] + 0.06;
    this.plateGlow.raycast = (): void => undefined;
    this.parts.plate.add(this.plateGlow);
    for (const p of Object.values(this.parts)) {
      noRaycastTree(p, `heater:${simId}`);
      this.group.add(p);
    }
    this.group.add(this.flame.group);
    // the host raycast ignores a hidden parent: a hidden rig must not catch the pointer
    this.group.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh || m.raycast !== Mesh.prototype.raycast) return;
      m.raycast = (rc, hits): void => {
        if (this.group.visible) Mesh.prototype.raycast.call(m, rc, hits);
      };
    });
    this.group.visible = false;
    this.parts.tripod.visible = this.parts.alcohol.visible = this.parts.bunsen.visible = this.parts.plate.visible = this.parts.holder.visible = false;
  }

  private buildBunsen(): void {
    const base = new CylinderGeometry(3, 3.4, 1.2, 28);
    const stem = new CylinderGeometry(0.75, 0.85, 12.5, 20);
    const collar = new CylinderGeometry(1.3, 1.3, 1.6, 20);
    this.bunsenGeos.push(base, stem, collar);
    const mk = (g: CylinderGeometry, y: number): Mesh => {
      const m = new Mesh(g, this.bunsenMat);
      m.position.y = y;
      m.castShadow = true;
      return m;
    };
    this.parts.bunsen.add(mk(base, 0.6), mk(stem, 7.4), mk(collar, 3.4));
  }

  setSource(src: HeatSource | null): void {
    this.source = src;
    if (src) {
      this.shownSource = src;
      this.liftGoal = this.forTube ? 12.5 : src === 'hotplate' ? LIFT.hotplate : LIFT.flame;
    } else this.liftGoal = LIFT.none;
  }

  get active(): boolean {
    return this.source !== null;
  }

  update(dt: number, reduced: boolean, tempFrac = 0): void {
    this.appear = approach(this.appear, this.source ? 1 : 0, 6, dt);
    this.lift = approach(this.lift, this.liftGoal, 6, dt);
    const on = this.appear > 0.01;
    this.group.visible = on;
    if (!on) return;
    const src = this.shownSource;
    const isHot = src === 'hotplate';
    const isAlc = src === 'alcohol';
    const isBun = src === 'bunsen-blue' || src === 'bunsen-yellow';
    this.parts.tripod.visible = !isHot && !this.forTube;
    this.parts.holder.visible = this.forTube;
    this.parts.alcohol.visible = isAlc;
    this.parts.bunsen.visible = isBun;
    this.parts.plate.visible = isHot;
    this.group.scale.set(1, 0.4 + 0.6 * this.appear, 1);
    this.flameY = isAlc ? 10.9 : isBun ? 12.9 : 0;
    this.flame.group.position.y = this.flameY;
    const fs = this.source ? flameSize(this.source) : 0;
    this.flame.update(dt, isBun || isAlc ? fs : 0, src === 'bunsen-blue' ? 1 : 0, reduced);
    const glow = this.plateGlow.material as MeshStandardMaterial;
    glow.emissiveIntensity = this.source === 'hotplate' ? 0.4 + 2.2 * tempFrac : 0;
  }

  dispose(): void {
    this.flame.dispose();
    for (const g of this.bunsenGeos) g.dispose();
    this.bunsenMat.dispose();
    this.plateGlow.geometry.dispose();
    (this.plateGlow.material as MeshStandardMaterial).dispose();
    this.group.removeFromParent();
  }
}
