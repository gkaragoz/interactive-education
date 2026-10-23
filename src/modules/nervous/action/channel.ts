import {
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  ShapeGeometry,
  Shape,
  SphereGeometry,
  Vector2,
  type BufferGeometry,
  type Mesh,
  type MeshPhysicalMaterial,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { paint } from '../geo';
import type { Kit } from '../kit';
import { COLORS } from '../palette';

/** A voltage-gated channel stand-in: a cut-away barrel (the pore faces the viewer) with a gate you can see move. y is the pore axis (+ outside). */
export interface Channel {
  group: Group;
  /** Na+: `a` activation flap 0..1 open, `b` inactivation ball 0..1 plugging. K+: `a` the gate; `b` is ignored. */
  set(a: number, b: number): void;
}

const R_OUT = (y: number): number => 0.5 + 0.2 * Math.abs(y) ** 1.6 + 0.04 * y;
const R_IN = (y: number): number => 0.27 + 0.1 * Math.abs(y) ** 2;
const YS = Array.from({ length: 13 }, (_, i) => -1 + i / 6);

function barrel(kit: Kit, color: string): { body: BufferGeometry; cap: BufferGeometry } {
  const prof: Vector2[] = [...YS.map((y) => new Vector2(R_OUT(y), y)), ...[...YS].reverse().map((y) => new Vector2(R_IN(y), y))];
  const seg = kit.detail === 0 ? 10 : 18;
  const body = paint(new LatheGeometry(prof, seg, Math.PI / 2, Math.PI), color, 0.2);
  // the pore lining is darker, so the cut-away reads as a tunnel
  const bp = body.getAttribute('position');
  const bc = body.getAttribute('color');
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i);
    if (Math.hypot(bp.getX(i), bp.getZ(i)) < R_IN(y) + 0.02) bc.setXYZ(i, bc.getX(i) * 0.55, bc.getY(i) * 0.5, bc.getZ(i) * 0.58);
  }
  // flat cut faces of the two wall strips (z = 0)
  const caps: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const shape = new Shape();
    YS.forEach((y, i) => (i === 0 ? shape.moveTo(side * R_OUT(y), y) : shape.lineTo(side * R_OUT(y), y)));
    [...YS].reverse().forEach((y) => shape.lineTo(side * R_IN(y), y));
    caps.push(new ShapeGeometry(shape));
  }
  const cap = paint(mergeGeometries(caps, false)!, color, 0.12);
  caps.forEach((c) => c.dispose());
  return { body, cap };
}

export function makeChannel(kit: Kit, kind: 'na' | 'k', parent: Group, look?: { color: string; id: string }): Channel {
  const color = look?.color ?? (kind === 'na' ? COLORS.naChannel : COLORS.kChannel);
  const mat: MeshPhysicalMaterial = kit.clay(look?.id ?? (kind === 'na' ? 'nv-na-channel' : 'nv-k-channel'));
  mat.side = DoubleSide;
  const gateMat = kit.clay('nv-gate');
  const group = new Group();
  parent.add(group);
  const { body, cap } = barrel(kit, color);
  kit.mesh(body, mat, group);
  kit.mesh(cap, mat, group);

  // flap: a thin disc hinged at the pore wall; closed it lies across the pore, open it stands against the wall
  const hingeX = kind === 'na' ? -0.3 : 0.3;
  const flapY = kind === 'na' ? 0.55 : -0.55;
  const hinge = new Group();
  hinge.position.set(hingeX, flapY, 0);
  group.add(hinge);
  const flap = kit.mesh(paint(new CylinderGeometry(0.3, 0.3, 0.1, 16), COLORS.gate, 0.1), gateMat, hinge);
  flap.position.x = -hingeX; // the disc centre sits on the pore axis; the hinge is at the wall

  // inactivation ball and chain (Na+ only)
  let ball: Mesh | null = null;
  let chain: Mesh | null = null;
  const anchor = { x: 0.9, y: -1.35 };
  if (kind === 'na') {
    ball = kit.mesh(paint(new SphereGeometry(0.27, 14, 10), '#ffd25a', 0.1), gateMat, group);
    chain = kit.mesh(paint(new CylinderGeometry(0.035, 0.035, 1, 6), COLORS.gate, 0.1), gateMat, group);
  }

  return {
    group,
    set(a, b) {
      // hinge turns about z: closed 0 (disc across the pore), open -> 85 degrees away from the pore
      hinge.rotation.z = (kind === 'na' ? 1 : -1) * a * 1.45;
      if (ball && chain) {
        const x = anchor.x * (1 - b);
        const y = anchor.y + (-0.6 - anchor.y) * b;
        ball.position.set(x, y, 0);
        const dx = x - anchor.x;
        const dy = y - anchor.y;
        const len = Math.max(0.01, Math.hypot(dx, dy));
        chain.position.set(anchor.x + dx / 2, anchor.y + dy / 2, 0);
        chain.scale.set(1, len, 1);
        chain.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
      }
    },
  };
}

/** The painted channel assets (`na-channel`, `k-channel`, closed and open variants, pore axis Y, outside +Y): swaps the variant with the gate state. */
export async function makeAssetChannel(kit: Kit, kind: 'na' | 'k', parent: Group, scale = 1.4): Promise<Channel> {
  const [closedId, openId] = kind === 'na' ? ['na-channel', 'na-channel-open'] : ['k-channel', 'k-channel-open'];
  const closed = await kit.ctx.assets.loadGlb(closedId);
  const open = await kit.ctx.assets.loadGlb(openId);
  const group = new Group();
  group.scale.setScalar(scale);
  group.add(closed, open);
  parent.add(group);
  kit.track({ dispose: () => group.removeFromParent() });
  open.visible = false;
  return {
    group,
    set(a, b) {
      const isOpen = kind === 'na' ? a > 0.5 && b < 0.5 : a > 0.5;
      closed.visible = !isOpen;
      open.visible = isOpen;
    },
  };
}
