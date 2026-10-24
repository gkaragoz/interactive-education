import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { approach, clamp } from './helpers';
import type { LabAssets } from './labAssets';
import type { VesselView } from './vesselView';

const BALLOON_COLOR = '#e86a5e';

/** Balloon and stopper on a vessel mouth: the balloon inflates with the gas, the stopper flies off when the engine says it popped. */
export class Closure {
  readonly group = new Group();
  private readonly balloon: Group;
  private readonly stopper: Mesh;
  private readonly stopperMat = new MeshStandardMaterial({ color: '#b25a30', roughness: 0.7 });
  private readonly stopperGeo = new CylinderGeometry(1.7, 1.3, 2.2, 20);
  private fill = 0;
  private flight = -1;
  private balloonOn = 0;

  constructor(private readonly view: VesselView, assets: LabAssets) {
    this.group.name = 'closure';
    this.balloon = assets.objectNow('balloon', { rubber: BALLOON_COLOR }).group;
    this.stopper = new Mesh(this.stopperGeo, this.stopperMat);
    this.stopper.castShadow = true;
    this.stopper.raycast = (): void => undefined;
    this.balloon.traverse((o) => {
      o.raycast = (): void => undefined;
    });
    this.group.add(this.balloon, this.stopper);
    const top = view.def.topY;
    const s = view.kind === 'testtube' ? 0.5 : view.kind === 'erlenmeyer250' ? 1 : 0.85;
    this.group.position.set(view.profile.cx, top, view.profile.cz);
    this.group.scale.setScalar(s);
    this.balloon.visible = false;
    this.stopper.visible = false;
    view.body.add(this.group);
  }

  /** The engine popped the stopper (event 'pop'). */
  pop(): void {
    this.flight = 0;
  }

  update(dt: number): void {
    const vis = this.view.vis;
    const closure = vis?.closure ?? 'none';
    const target = closure === 'balloon' ? clamp(vis?.balloonFill ?? 0) : 0;
    this.balloonOn = approach(this.balloonOn, closure === 'balloon' ? 1 : 0, 8, dt);
    this.fill = approach(this.fill, target, 2.5, dt);
    this.balloon.visible = this.balloonOn > 0.02;
    if (this.balloon.visible) {
      const s = (0.3 + 0.75 * this.fill) * this.balloonOn;
      this.balloon.scale.set(s, s * (0.9 + 0.1 * this.fill), s);
      this.balloon.rotation.z = (1 - this.fill) * 1.1;
      this.balloon.position.set(0, -0.2, 0);
    }
    if (this.flight >= 0) {
      this.flight += dt;
      const t = this.flight;
      this.stopper.visible = t < 1.4;
      this.stopper.position.set(3 * t, 1.1 + 9 * t - 14 * t * t, 0.5 * t);
      this.stopper.rotation.z = -4 * t;
      if (t >= 1.4) this.flight = -1;
    } else {
      this.stopper.visible = closure === 'stopper';
      this.stopper.position.set(0, -0.6, 0);
      this.stopper.rotation.set(0, 0, 0);
    }
  }

  dispose(): void {
    this.stopperGeo.dispose();
    this.stopperMat.dispose();
    this.group.removeFromParent();
  }
}
