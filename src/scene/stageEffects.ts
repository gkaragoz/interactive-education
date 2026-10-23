import type { CellScene } from './cellScene';

const FADE_OUT_S = 0.22;
const FADE_IN_S = 0.45;

interface Fade {
  scene: CellScene;
  direction: 'in' | 'out';
  elapsed: number;
}

/** Cross-fade between cell scenes: the old one fades and shrinks away, the new one grows in. */
export class SceneFades {
  private fades: Fade[] = [];

  add(scene: CellScene, direction: 'in' | 'out'): void {
    this.fades.push({ scene, direction, elapsed: 0 });
  }

  /** Advances all fades; `finished` runs for a scene whose fade is complete. Returns true while any is running. */
  step(dt: number, finished: (scene: CellScene, direction: 'in' | 'out') => void): boolean {
    if (this.fades.length === 0) return false;
    this.fades = this.fades.filter((f) => {
      f.elapsed += dt;
      const k = Math.min(f.elapsed / (f.direction === 'in' ? FADE_IN_S : FADE_OUT_S), 1);
      const eased = k * k * (3 - 2 * k);
      const fade = f.direction === 'in' ? eased : 1 - eased;
      f.scene.setFade(fade);
      f.scene.group.scale.setScalar(f.scene.scale * (0.9 + 0.1 * fade));
      if (k < 1) return true;
      f.scene.setFade(1);
      f.scene.group.scale.setScalar(f.scene.scale);
      finished(f.scene, f.direction);
      return false;
    });
    return true;
  }

  /** Scenes still fading out; the stage disposes them on shutdown. */
  get leaving(): CellScene[] {
    return this.fades.filter((f) => f.direction === 'out').map((f) => f.scene);
  }
}

export interface GlowInput {
  selectedId: string | null;
  hoverId: string | null;
  /** 0..1 pulse for the hovered organelle. */
  pulse: number;
  compare: boolean;
}

/**
 * Emissive glow per organelle id: steady for the selection, pulsing for hover, and in comparison a steady accent on
 * organelles the other cell does not have.
 */
export function applyGlow(scene: CellScene, otherIds: ReadonlySet<string>, input: GlowInput): void {
  const own = new Set(scene.sets.keys());
  for (const id of [...own, ...scene.cell.shellOrganelleIds]) {
    let glow = 0;
    if (id === input.selectedId) glow = 0.22; // the outline carries the selection; this only warms the surface
    if (id === input.hoverId) glow = Math.max(glow, 0.35 + 0.35 * input.pulse);
    if (input.compare && own.has(id) && !otherIds.has(id)) glow = Math.max(glow, 0.38);
    scene.setGlow(id, glow);
  }
}
