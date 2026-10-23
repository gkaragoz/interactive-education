import { Color, Group, Matrix4, Quaternion, Vector3 } from 'three';
import type { InstanceSet, ModuleContext, ModuleScene } from '../../scene';

const TINTS = ['#c05a8a', '#4f9aa8', '#d8b24a', '#8fa83c'];
const smooth = (x: number): number => x * x * (3 - 2 * x);

/** Pose of capsule i (of n) at time t: pure arithmetic, no state. */
export function demoPose(t: number, i: number, n: number): { position: Vector3; angle: number } {
  const spin = t < 8 ? t : 8 + (t - 8) * Math.max(0, 1 - (t - 8) / 8);
  const apart = smooth(Math.min(Math.max((t - 4) / 4, 0), 1)) * 3.2;
  const side = (i % 2 === 0 ? -1 : 1) * (0.7 + apart);
  const row = Math.floor(i / 2) * 2.4 - (n > 2 ? 1.2 : 0);
  return { position: new Vector3(side, row, 0), angle: spin * 1.2 + i };
}

export async function createDemoScene(ctx: ModuleContext): Promise<ModuleScene> {
  let shown = Number(ctx.options.sayi ?? 2) || 2;
  const root = new Group();
  // `mitochondrion` has no module file: the framework substitutes its capsule placeholder, which is what this needs.
  const set: InstanceSet = await ctx.assets.organelleInstances('mitochondrion', 4, '#c05a8a');
  root.add(set.group);
  const q = new Quaternion();
  const m = new Matrix4();
  const scale = new Vector3(1, 1, 1);
  const axis = new Vector3(0, 0, 1);
  const pose = (t: number): void => {
    for (let i = 0; i < 4; i++) {
      if (i >= shown) {
        set.setVisible(i, false);
        continue;
      }
      const p = demoPose(t, i, shown);
      q.setFromAxisAngle(axis, p.angle);
      set.setMatrix(i, m.compose(p.position, q, scale));
      set.setTint(i, new Color(TINTS[i % TINTS.length]));
    }
    set.commit();
  };
  return {
    root,
    duration: 12,
    seek: pose,
    cameraAt: (t) => ({ position: [0, 3 + Math.sin(t * 0.3), 14], target: [0, 0, 0] }),
    labelsAt: (t) => {
      if (t < 4) return [{ text: 'Kapsül çifti', world: [0, 1.6, 0], anchorId: 'pair' }];
      const a = demoPose(t, 0, shown).position;
      const b = demoPose(t, 1, shown).position;
      return [
        { text: 'Sol', world: [a.x, 1.5, 0], anchorId: 'a' },
        { text: 'Sağ', world: [b.x, 1.5, 0], anchorId: 'b' },
      ];
    },
    chartAt: (t) => ({ ayrilma: smooth(Math.min(Math.max((t - 4) / 4, 0), 1)), sayi: shown }),
    setOptions: (o) => {
      shown = Number(o.sayi ?? 2) || 2;
    },
    dispose: () => set.dispose(),
  };
}
