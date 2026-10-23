# Sim modules (contract, draft)

A **sim module** is an interactive sandbox with a fixed-step simulation. It lives beside timeline modules (`docs/MODULES.md`) and shares the shell, stage, materials, loading, labels, quality presets and the data layer.

```ts
export interface SimParam { id: string; labelTr: string; unit?: string; min: number; max: number; step: number; default: number; lockedInChallenge?: boolean }
export interface SimMeasurement { id: string; labelTr: string; value: number | string; unit?: string }
export interface SimScene {
  readonly root: THREE.Group;
  params: SimParam[];
  step(dt: number): void;              // fixed step, deterministic (seeded RNG only)
  setParam(id: string, value: number): void;
  reset(values?: Record<string, number>): void;
  measurements(): SimMeasurement[];
  snapshot(): unknown; restore(s: unknown): void;   // scrub-back and Defter replay
  pointer?(ev: SimPointerEvent): void;  // drag and drop, picking via the host raycaster
  labels?(): { text: string; world: Vec3 }[];
  dispose(): void;
}
```
Rules: logic (state, rules, engine) is pure and unit-tested without WebGL; rendering reads state; fixed step 1/60 with accumulator; no wall-clock in logic; every scene works at `low`; reduced motion pauses decorative motion only.
