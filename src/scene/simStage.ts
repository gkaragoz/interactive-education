import { Box3, Plane, Raycaster, Sphere, Vector2, Vector3, type Ray, type Group, type Object3D } from 'three';
import { SimClock, SimHistory } from '../core';
import { ModuleStage, type ModuleStageOptions } from './moduleStage';
import type { StageFraming } from './stageFraming';
import type { ModuleLabel, ModuleScene } from './moduleScene';
import type { SimHit, SimPointerEvent, SimScene } from './simScene';

/** Wraps a SimScene as the ModuleScene the stage draws; the sim is stepped by `SimStage`, never by `seek`. */
class SimAdapter implements ModuleScene {
  readonly duration = 1;
  constructor(
    readonly sim: SimScene,
    /** Ids whose labels show in 'focus' mode (hovered, keyboard-focused, selected); null shows every label. */
    private readonly visibleIds: () => ReadonlySet<string> | null,
  ) {}
  get root(): Group {
    return this.sim.root;
  }
  seek(): void {
    // state is advanced by steps, not by time
  }
  labelsAt(): ModuleLabel[] {
    const all = this.sim.labels?.() ?? [];
    const ids = this.visibleIds();
    return ids ? all.filter((l) => l.anchorId !== undefined && ids.has(l.anchorId)) : all;
  }
  dispose(): void {
    // the SimStage owns the sim
  }
}

/**
 * Renders and drives one `SimScene` with the module stage's pipeline (camera presets, labels, quality, pre-warm, safe
 * area). It owns the fixed-step clock (time-lapse, pause), the snapshot history for the Defter replay and the pointer
 * pipeline (raycast, world-plane drag, hover). A timeline `ModuleScene` (the particle explainer) can be shown instead of
 * the bench and swapped back without losing the sim.
 */
export class SimStage {
  readonly stage: ModuleStage;
  readonly clock = new SimClock();
  readonly history = new SimHistory<unknown>(600);
  sim: SimScene | null = null;
  /** Called after every frame in which the sim stepped (the UI refreshes measurements, steps and the journal). */
  onStep: (() => void) | null = null;
  /** Called every frame with the real frame time, stepped or not (explainer player, UI animation). */
  onTick: ((dt: number) => void) | null = null;
  private adapter: SimAdapter | null = null;
  private explainer: ModuleScene | null = null;
  private lastRecorded = -1;
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly plane = new Plane(new Vector3(0, 1, 0), 0);
  private dragId: string | null = null;
  private dragPointer = -1;
  private hoverId: string | null = null;
  private focusId: string | null = null;
  private labelMode: 'off' | 'focus' | 'all' = 'focus';
  private readonly cleanup: (() => void)[] = [];

  constructor(opts: ModuleStageOptions) {
    this.stage = new ModuleStage(opts);
    this.stage.onFrame = (dt) => this.frame(dt);
    this.stage.playing = true;
    // Capture phase on the container: a grab on a pickable object must stop the orbit camera before its own listener runs.
    const target = opts.container;
    const down = (e: PointerEvent): void => this.onPointer('down', e);
    const move = (e: PointerEvent): void => this.onPointer('move', e);
    const up = (e: PointerEvent): void => this.onPointer(e.type === 'pointercancel' ? 'cancel' : 'up', e);
    target.addEventListener('pointerdown', down, true);
    target.addEventListener('pointermove', move, true);
    target.addEventListener('pointerup', up, true);
    target.addEventListener('pointercancel', up, true);
    this.cleanup.push(() => {
      target.removeEventListener('pointerdown', down, true);
      target.removeEventListener('pointermove', move, true);
      target.removeEventListener('pointerup', up, true);
      target.removeEventListener('pointercancel', up, true);
    });
  }

  /** Shows the sim (replacing a previous one, which is disposed). */
  setSim(sim: SimScene): void {
    this.sim?.dispose();
    this.sim = sim;
    this.adapter = new SimAdapter(sim, () => {
      if (this.labelMode === 'all') return null;
      return new Set([this.hoverId, this.focusId].filter((x): x is string => x !== null));
    });
    if (this.explainer) this.explainer.dispose();
    this.explainer = null;
    this.stage.setScene(this.adapter);
    this.applyCamera();
    this.history.clear();
    this.clock.resync(0);
    this.checkpoint();
  }

  /** The sim loaded another experiment: frame the new bench and restart the clock and history. */
  restarted(): void {
    this.history.clear();
    this.clock.resync(0);
    this.lastRecorded = -1;
    this.checkpoint();
    this.applyCamera();
    this.stage.refit(true);
  }

  /** The sim's own framing box and orbit limits (`SimScene.camera`), or the bounding sphere when it has none. */
  private applyCamera(): void {
    this.stage.setFraming(this.sim?.camera ?? null, true);
  }

  /** Explicit framing and orbit limits from the host side (see `StageFraming`). */
  setFraming(framing: StageFraming | null): void {
    this.stage.setFraming(framing, true);
  }

  /**
   * Labels on the stage: 'off', 'focus' (only the hovered, keyboard-focused or selected item, the default: a bench full of
   * labels is noise) or 'all'.
   */
  setLabelMode(mode: 'off' | 'focus' | 'all'): void {
    this.labelMode = mode;
    this.stage.setLabelsEnabled(mode !== 'off');
  }

  /** The item the keyboard (or the list) points at: its label shows in 'focus' mode and the scene highlights it. */
  setFocusId(id: string | null): void {
    this.focusId = id;
    this.sim?.setFocus?.(id);
    this.stage.requestRender();
  }

  /** Flies the camera to the item tagged `id` (null: back to the overview). */
  focusItem(id: string | null): boolean {
    if (!id) {
      this.stage.setPreset('home');
      return true;
    }
    let found: Object3D | null = null;
    this.sim?.root.traverse((o) => {
      if (!found && o.userData?.['simId'] === id) found = o;
    });
    if (!found) return false;
    const sphere = new Box3().setFromObject(found).getBoundingSphere(new Sphere());
    this.stage.focusOn([sphere.center.x, sphere.center.y, sphere.center.z], Math.max(sphere.radius, 0.01));
    return true;
  }

  private frame(dt: number): void {
    this.onTick?.(dt);
    const sim = this.sim;
    if (!sim) return;
    if (!this.explainer) {
      const n = this.clock.advance(dt, (d) => sim.step(d));
      if (n > 0) {
        if (this.clock.simTime - this.lastRecorded >= 1) this.checkpoint();
        this.onStep?.();
      }
      sim.sync?.(dt);
    }
    this.stage.requestRender();
  }

  /** Snapshot for the Defter replay; called every simulated second and after every learner action. */
  checkpoint(): void {
    if (!this.sim) return;
    this.history.record(this.clock.simTime, this.sim.snapshot());
    this.lastRecorded = this.clock.simTime;
  }

  /** Restores the newest snapshot at or before `t` simulated seconds (Defter replay) and pauses there. */
  replayTo(t: number): number | null {
    const hit = this.history.nearest(t);
    if (!this.sim || !hit) return null;
    this.sim.restore(hit.state);
    this.clock.resync(hit.t);
    this.clock.paused = true;
    this.stage.requestRender();
    this.onStep?.();
    return hit.t;
  }

  setSpeed(factor: number): void {
    this.clock.setSpeed(factor);
  }

  setPaused(paused: boolean): void {
    this.clock.paused = paused;
    this.stage.requestRender();
  }

  /** Swaps the bench for a timeline scene (the particle explainer); `null` brings the bench back. */
  showExplainer(scene: ModuleScene | null): void {
    if (!this.adapter) return;
    if (scene) {
      this.stage.swapScene(scene);
      this.explainer?.dispose();
      this.explainer = scene;
    } else if (this.explainer) {
      this.stage.swapScene(this.adapter);
      this.explainer.dispose();
      this.explainer = null;
    }
  }

  get showingExplainer(): boolean {
    return this.explainer !== null;
  }

  // ---- pointer ----------------------------------------------------------------------------------------------

  private pick(e: PointerEvent, exclude: string | null): { hit: SimHit | null; ray: Ray } {
    const rect = this.stage.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.stage.camera);
    const roots: Object3D[] = this.sim?.pickRoots?.() ?? (this.sim ? [this.sim.root] : []);
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const h of hits) {
      // a mesh under a hidden parent is hidden too (three.js raycasts it anyway)
      let shown = true;
      for (let o: Object3D | null = h.object; o; o = o.parent) if (!o.visible) shown = false;
      if (!shown) continue;
      for (let o: Object3D | null = h.object; o; o = o.parent) {
        const id = o.userData?.['simId'];
        if (typeof id === 'string' && id === exclude) break;
        if (typeof id === 'string') return { hit: { id, point: [h.point.x, h.point.y, h.point.z], distance: h.distance }, ray: this.raycaster.ray };
      }
    }
    return { hit: null, ray: this.raycaster.ray };
  }

  private onPointer(type: 'down' | 'move' | 'up' | 'cancel', e: PointerEvent): void {
    const sim = this.sim;
    if (!sim?.pointer || this.explainer) return;
    if (e.target instanceof HTMLElement && e.target !== this.stage.canvas) return;
    const { hit, ray } = this.pick(e, e.pointerId === this.dragPointer ? this.dragId : null);
    const point = new Vector3();
    let kind: SimPointerEvent['type'] = type;
    if (type === 'down') {
      if (!hit || e.button !== 0) return;
      this.dragId = hit.id;
      this.dragPointer = e.pointerId;
      this.stage.rig.controls.enabled = false;
      this.plane.set(new Vector3(0, 1, 0), -(hit.point[1] + (sim.dragLift ?? 0)));
      this.stage.canvas.setPointerCapture?.(e.pointerId);
      this.stage.canvas.style.cursor = 'grabbing';
      e.stopPropagation();
    } else if (this.dragId === null || e.pointerId !== this.dragPointer) {
      if (type !== 'move') return;
      // no drag: hover only, and only when the hit changes
      kind = 'hover';
      const id = hit?.id ?? null;
      if (id === this.hoverId) return;
      this.hoverId = id;
      this.stage.requestRender();
      this.stage.canvas.style.cursor = id ? 'grab' : '';
      sim.setHover?.(id);
      this.plane.set(new Vector3(0, 1, 0), -(sim.benchY ?? 0));
    }
    if (!ray.intersectPlane(this.plane, point)) point.copy(ray.origin).addScaledVector(ray.direction, 5);
    const ev: SimPointerEvent = {
      type: kind,
      pointerId: e.pointerId,
      hit,
      dragId: this.dragId,
      world: [point.x, point.y, point.z],
      ray: { origin: [ray.origin.x, ray.origin.y, ray.origin.z], direction: [ray.direction.x, ray.direction.y, ray.direction.z] },
      button: e.button,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
    };
    sim.pointer(ev);
    if (type === 'up' || type === 'cancel') {
      this.dragId = null;
      this.dragPointer = -1;
      this.stage.rig.controls.enabled = true;
      this.stage.canvas.releasePointerCapture?.(e.pointerId);
      this.stage.canvas.style.cursor = this.hoverId ? 'grab' : '';
      this.checkpoint();
    }
    this.stage.requestRender();
  }

  dispose(): void {
    for (const fn of this.cleanup) fn();
    this.cleanup.length = 0;
    this.explainer?.dispose();
    this.explainer = null;
    this.sim?.dispose();
    this.sim = null;
    this.stage.dispose();
  }
}
