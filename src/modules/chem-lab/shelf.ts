import { BENCH } from './bench';
import { pourSeconds } from './helpers';
import type { ChemLabScene } from './labScene';
import { shelfSlots } from './layout';
import { BottleView, PieceProp, ToolProp, type ToolId } from './props';
import { FREE_SHELF, lookOf } from './reagentLook';
import { shelfOf } from '../../scene';

/** Reagent containers on the shelf, solids on the bench, hand tools at the back left. */
export function buildShelf(s: ChemLabScene): void {
  const layout = s.layout;
  if (!layout) return;
  const ids = s.experimentId ? shelfOf(s.experimentId) : FREE_SHELF;
  const looks = ids.flatMap((id) => lookOf(id) ?? []);
  const store = looks.filter((l) => l.container !== 'piece');
  const pieces = looks.filter((l) => l.container === 'piece');
  const half = (layout.tiles * BENCH.tileW) / 2;
  const xs = shelfSlots(store.length, half * 2 - 12, 7.4);
  store.forEach((look, i) => {
    const b = new BottleView(look, s.deps);
    b.build();
    b.home.x = xs[i] ?? 0;
    b.home.y = BENCH.shelfY;
    b.home.z = BENCH.shelfZ;
    b.pos.set(b.home.x, b.home.y, b.home.z);
    b.goal.copy(b.pos);
    b.group.position.copy(b.pos);
    s.items.set(look.id, b);
    s.dynamic.add(b.group);
  });
  const x0 = -layout.width / 2 + 4;
  pieces.forEach((look, i) => {
    const p = new PieceProp(look, s.assets);
    p.home.x = half - 6 - i * 6;
    p.home.y = 0.3;
    p.home.z = -11;
    p.goal = { ...p.home };
    p.group.position.set(p.home.x, p.home.y, p.home.z);
    s.items.set(look.id, p);
    s.dynamic.add(p.group);
  });
  const toolDefs: [ToolId, number, number][] = [['tool:thermo', x0, 0], ['tool:splint', x0 + 5, 0], ['tool:strip', x0 + 10, Math.PI / 2], ['tool:rod', x0 + 22, Math.PI / 2]];
  for (const [id, x, lie] of toolDefs) {
    const t = new ToolProp(id, s.assets, id === 'tool:splint');
    t.home.x = x;
    t.home.y = lie ? 0.4 : 0.2;
    t.home.z = -11;
    t.goal = { ...t.home };
    t.group.position.set(t.home.x, t.home.y, t.home.z);
    if (lie) {
      t.inner.rotation.z = lie;
      if (id === 'tool:rod') t.inner.scale.setScalar(0.6);
    }
    s.tools.set(id, t);
    s.dynamic.add(t.group);
  }
}

/** Visual twin of a panel action (the engine already did it): a pour, drops or a powder stream, or the source swinging over. */
export function animateAction(s: ChemLabScene, item: string, cmd: string, args: { targetId?: string; amount?: number }): void {
  const dst = args.targetId ? s.views.get(args.targetId) : undefined;
  if (!dst) return;
  const amount = args.amount ?? 10;
  if (cmd === 'pourTo' || cmd === 'dispense') {
    const src = s.views.get(item);
    if (src) s.pour.begin(src, dst, cmd === 'dispense' ? 'burette' : 'liquid', src.target.rgb, 40, pourSeconds(amount));
    return;
  }
  const look = lookOf(item);
  if (!look) return;
  const bottle = s.items.get(item);
  const src = bottle instanceof BottleView ? bottle : null;
  if (cmd === 'pour' || cmd === 'drop' || cmd === 'add') {
    const kind = cmd === 'drop' ? 'drops' : cmd === 'add' ? 'powder' : 'liquid';
    dst.mixIn(look.rgb, amount);
    s.pour.begin(src, dst, kind, look.rgb, 40, cmd === 'drop' ? 1.4 : pourSeconds(amount));
  }
}
