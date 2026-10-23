import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const HOME_DIRECTION = new Vector3(0.52, 0.72, 0.86).normalize();
export const FOV = 34;

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Tween {
  fromTarget: Vector3;
  toTarget: Vector3;
  fromPos: Vector3;
  toPos: Vector3;
  elapsed: number;
  duration: number;
}

/** OrbitControls with damping and limits, plus smooth focus / reset tweens. */
export class CameraRig {
  readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 2000);
  readonly controls: OrbitControls;
  private tween: Tween | null = null;
  private shift = { x: 0, y: 0, s: 1 };
  private shiftTarget = { x: 0, y: 0, s: 1 };
  private home = 60;
  private radius = 30;

  constructor(dom: HTMLElement, private readonly reducedMotion: boolean) {
    this.controls = new OrbitControls(this.camera, dom);
    this.controls.enableDamping = !reducedMotion;
    this.controls.dampingFactor = 0.09;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.8;
    this.controls.screenSpacePanning = true;
    this.controls.autoRotateSpeed = 0.9;
    this.controls.maxPolarAngle = Math.PI * 0.97;
    this.controls.minPolarAngle = Math.PI * 0.03;
    this.setHome(this.radius, this.radius, 1, true);
  }

  /** Re-frames for a cell with these half sizes (horizontal, vertical); keeps the viewing direction unless `snap`. */
  setHome(radiusH: number, radiusV: number, aspect: number, snap: boolean): void {
    const radius = Math.max(radiusH, radiusV);
    this.radius = radius;
    const fov = (FOV * Math.PI) / 180;
    const vertical = radiusV / Math.sin(fov / 2);
    const horizontal = radiusH / Math.sin(Math.atan(Math.tan(fov / 2) * aspect));
    this.home = Math.max(vertical, horizontal) * 1.16;
    this.controls.minDistance = radius * 0.12;
    this.controls.maxDistance = radius * 6;
    this.camera.near = Math.max(radius * 0.01, 0.05);
    this.camera.far = radius * 40;
    this.camera.updateProjectionMatrix();
    if (snap) {
      this.camera.position.copy(HOME_DIRECTION).multiplyScalar(this.home);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  get autoRotate(): boolean {
    return this.controls.autoRotate;
  }

  setAutoRotate(on: boolean): void {
    this.controls.autoRotate = on && !this.reducedMotion;
  }

  resetView(): void {
    this.flyTo(new Vector3(), HOME_DIRECTION.clone().multiplyScalar(this.home));
  }

  /** Looks at `center` from the current direction at the distance where `radius` fills about 40 % of the view. */
  focusOn(center: Vector3, radius: number, closeUp = false): void {
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const fov = (FOV * Math.PI) / 180;
    const distance = Math.max((radius * (closeUp ? 2.9 : 8.5)) / Math.sin(fov / 2) / 2, this.controls.minDistance * 1.2);
    this.flyTo(center, center.clone().addScaledVector(dir, distance));
  }

  /**
   * Slides the picture sideways (fractions of the view) so the subject sits in the clear part of the stage, away from
   * the floating panels. It eases in and out; (0, 0) restores the centred view.
   */
  setShift(x: number, y: number, scale = 1): void {
    this.shiftTarget = { x, y, s: scale };
    if (this.reducedMotion) this.shift = { x, y, s: scale };
  }

  private applyShift(dt: number): boolean {
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 7);
    const dx = this.shiftTarget.x - this.shift.x;
    const dy = this.shiftTarget.y - this.shift.y;
    const ds = this.shiftTarget.s - this.shift.s;
    const settled = Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4 && Math.abs(ds) < 1e-3;
    if (settled) {
      this.shift = { ...this.shiftTarget };
      if (this.shift.x === 0 && this.shift.y === 0 && this.shift.s === 1) {
        if (this.camera.view?.enabled) this.camera.clearViewOffset();
        return false;
      }
    } else {
      this.shift = { x: this.shift.x + dx * k, y: this.shift.y + dy * k, s: this.shift.s + ds * k };
    }
    const w = 1000 * this.camera.aspect;
    const s = this.shift.s;
    // s < 1 shows a larger part of the scene (the picture shrinks about the centre) so it fits the free area.
    this.camera.setViewOffset(w * s, 1000 * s, this.shift.x * w - (w * (1 - s)) / 2, this.shift.y * 1000 - (1000 * (1 - s)) / 2, w, 1000);
    return !settled;
  }

  /** Arrow keys orbit, +/- zoom: keyboard access to the 3D view. */
  nudge(yaw: number, pitch: number, zoom: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = { r: offset.length(), theta: Math.atan2(offset.x, offset.z), phi: Math.acos(offset.y / offset.length()) };
    spherical.theta += yaw;
    spherical.phi = Math.min(Math.max(spherical.phi + pitch, 0.1), Math.PI - 0.1);
    spherical.r = Math.min(Math.max(spherical.r * zoom, this.controls.minDistance), this.controls.maxDistance);
    offset.set(
      spherical.r * Math.sin(spherical.phi) * Math.sin(spherical.theta),
      spherical.r * Math.cos(spherical.phi),
      spherical.r * Math.sin(spherical.phi) * Math.cos(spherical.theta),
    );
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  /** Keyboard navigation: returns true when the key was a camera key. */
  handleKey(key: string): boolean {
    const step = 0.12;
    switch (key) {
      case 'ArrowLeft': this.nudge(-step, 0, 1); return true;
      case 'ArrowRight': this.nudge(step, 0, 1); return true;
      case 'ArrowUp': this.nudge(0, -step, 1); return true;
      case 'ArrowDown': this.nudge(0, step, 1); return true;
      case '+': case '=': this.nudge(0, 0, 0.88); return true;
      case '-': case '_': this.nudge(0, 0, 1.14); return true;
      case 'r': case 'R': this.resetView(); return true;
      default: return false;
    }
  }

  /** Copies pose and lens to another camera (the right pane of the comparison view). */
  syncTo(other: PerspectiveCamera): void {
    this.camera.updateMatrixWorld();
    other.position.copy(this.camera.position);
    other.quaternion.copy(this.camera.quaternion);
    other.fov = this.camera.fov;
    other.near = this.camera.near;
    other.far = this.camera.far;
    other.updateProjectionMatrix();
    other.updateMatrixWorld();
  }

  /** Flies to an explicit pose (module camera presets). */
  flyToPose(position: Vector3, target: Vector3): void {
    this.flyTo(target, position);
  }

  /** Direction of the default view, so presets look related to it. */
  static readonly HOME = HOME_DIRECTION;

  get homeDistance(): number {
    return this.home;
  }

  private flyTo(target: Vector3, position: Vector3): void {
    this.tween = {
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      fromPos: this.camera.position.clone(),
      toPos: position,
      elapsed: 0,
      duration: this.reducedMotion ? 0.0001 : 0.8,
    };
  }

  /** Advances tweens and damping; returns true while the camera is still moving (keep rendering). */
  update(dt: number): boolean {
    let moving = false;
    if (this.tween) {
      const t = this.tween;
      t.elapsed += dt;
      const k = easeInOut(Math.min(t.elapsed / t.duration, 1));
      this.controls.target.lerpVectors(t.fromTarget, t.toTarget, k);
      this.camera.position.lerpVectors(t.fromPos, t.toPos, k);
      if (t.elapsed >= t.duration) this.tween = null;
      moving = true;
    }
    moving = this.applyShift(dt) || moving;
    const before = this.camera.position.clone();
    const changed = this.controls.update(dt);
    return moving || changed || before.distanceToSquared(this.camera.position) > 1e-10 || this.controls.autoRotate;
  }

  dispose(): void {
    this.controls.dispose();
  }
}
