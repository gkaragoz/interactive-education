import { Color, CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry, type MeshPhysicalMaterial } from 'three';
import type { ModuleContext } from '../../scene';
import { armAt, BICEPS, bicepsBelly, forearmPoint, bicepsLine, FORE, girth, flexion, TRICEPS, tricepsBelly, tricepsLine, UPPER, type ArmState, type MuscleLine } from './armModel';
import { COLORS, Fader, lathe, paint, paintBy, rodMatrix, surfaces, unitSphere } from './kit';
import { hash01 } from './math';

export interface ArmView {
  group: Group;
  fader: Fader;
  /** Poses the arm for an elbow angle and the two activities (percent). */
  pose(s: ArmState): void;
  /** Shows or hides the dotted angle arc at the elbow. */
  showArc(on: boolean): void;
  /** Arm-frame position of named landmarks for labels (z in front of the arm). */
  landmark(name: 'shoulder' | 'humerus' | 'forearm' | 'elbow' | 'biceps' | 'triceps' | 'bicepsTendon' | 'tricepsTendon' | 'hand', angle: number): [number, number, number];
  dispose(): void;
}

const UP = new Vector3(0, 1, 0);
const SHAFT = new Color('#f8ecd0');
const KNOB = new Color('#e3c58a');
/** Bone tint: pale ivory shaft, warmer knobs at the joint ends (painted along the bone). */
const boneTone = (g: BufferGeometry, y0: number, y1: number): BufferGeometry =>
  paintBy(g, (_x, y) => {
    const u = Math.abs((y - (y0 + y1) / 2) / ((y1 - y0) / 2));
    return SHAFT.clone().lerp(KNOB, Math.pow(Math.min(1, u), 3));
  });

/** Spindle (unit length along +Y, base at the origin, max radius 1) with fibre streaks painted along it. */
function spindle(seg: number, tint: string): BufferGeometry {
  const profile: Array<[number, number]> = [];
  for (let i = 0; i <= 18; i++) {
    const s = i / 18;
    profile.push([Math.pow(Math.sin(Math.PI * s), 0.62) * (1 - 0.18 * Math.abs(s - 0.45)), s]);
  }
  const g = lathe(profile, seg);
  const base = new Color(tint);
  return paintBy(g, (x, _y, z) => {
    const a = Math.atan2(z, x);
    const streak = 0.9 + 0.1 * Math.sin(a * 7) * Math.cos(a * 3);
    return base.clone().multiplyScalar(streak);
  });
}

const cone = (): BufferGeometry => {
  const g = new CylinderGeometry(1, 0.5, 1, 10, 1, false).translate(0, 0.5, 0);
  return paint(g.rotateX(0), COLORS.tendon);
};

/** Stylised arm (side view): bones, elbow joint, biceps and triceps (two heads each) with tapered tendons. */
export function createArmView(ctx: ModuleContext): ArmView {
  const fader = new Fader();
  const sf = surfaces(ctx);
  const solid = sf.solid(fader);
  const group = new Group();
  group.name = 'arm';
  const forearm = new Group();
  group.add(forearm);
  const owned: Array<{ dispose(): void }> = [];
  const seg = ctx.quality === 'low' ? 12 : 20;
  const meshOf = (geo: BufferGeometry, mat: MeshPhysicalMaterial, parent: Group = group): Mesh => {
    const m = new Mesh(geo, mat);
    m.castShadow = false;
    parent.add(m);
    owned.push(geo);
    return m;
  };

  // bones
  meshOf(
    boneTone(lathe([[0.01, -0.1], [0.34, 0.0], [0.4, 0.25], [0.26, 0.9], [0.21, 2.5], [0.23, 4.6], [0.3, 5.6], [0.34, 6.0], [0.1, 6.3]], seg), -0.1, 6.3),
    solid,
  );
  const head = meshOf(paint(unitSphere(16), COLORS.bone), solid);
  head.position.set(0.12, UPPER + 0.15, 0);
  head.scale.setScalar(0.62);
  const hub = meshOf(paint(unitSphere(16), '#ecd8a4'), solid);
  hub.scale.set(0.46, 0.46, 0.5);
  const ulna = meshOf(boneTone(lathe([[0.01, 0.5], [0.27, 0.44], [0.32, 0.2], [0.21, -0.3], [0.14, -1.2], [0.12, -FORE + 0.6], [0.2, -FORE + 0.15], [0.01, -FORE]], seg), -FORE, 0.5), solid, forearm);
  ulna.position.set(-0.15, 0, -0.12);
  const radius = meshOf(boneTone(lathe([[0.01, 0.0], [0.22, -0.08], [0.15, -0.45], [0.14, -1.5], [0.17, -FORE + 0.7], [0.27, -FORE + 0.2], [0.01, -FORE - 0.05]], seg), -FORE, 0), solid, forearm);
  radius.position.set(0.15, 0, 0.12);
  const hand = meshOf(paint(unitSphere(16), COLORS.skin), solid, forearm);
  hand.position.set(0, -FORE - 0.5, 0);
  hand.scale.set(0.58, 0.78, 0.34);

  // soft skin silhouette (glass) so the bones and muscles read as an arm; the shoulder blade anchors the muscle origins
  const glass = sf.glass(fader, 0.05, 0.7);
  const skinUpper = meshOf(paint(lathe([[0.01, -0.62], [0.64, -0.45], [0.88, 0.0], [1.0, 1.2], [1.12, 3.2], [1.2, 4.6], [1.12, 5.7], [0.8, 6.5], [0.01, 6.9]], seg), COLORS.skin), glass);
  const skinFore = meshOf(paint(lathe([[0.01, 0.6], [0.72, 0.45], [0.85, 0.0], [0.86, -0.8], [0.74, -2.6], [0.56, -4.4], [0.5, -FORE + 0.1], [0.01, -FORE - 0.2]], seg), COLORS.skin), glass, forearm);
  skinUpper.renderOrder = 55;
  skinFore.renderOrder = 55;
  const scapula = meshOf(paint(unitSphere(16), COLORS.boneDark), solid);
  scapula.position.set(-0.35, UPPER + 0.1, -0.62);
  scapula.scale.set(1.0, 0.75, 0.16);
  scapula.rotation.z = -0.4;

  // muscles: [heads], each head = belly + proximal tendon; one shared distal tendon
  interface Head {
    belly: Mesh;
    tendon: Mesh;
    z: number;
    k: number;
    shift: number;
  }
  const makeMuscle = (restTint: string, heads: Array<{ z: number; k: number; shift: number }>) => {
    const mat = solid.clone();
    mat.onBeforeCompile = solid.onBeforeCompile;
    fader.add(mat, 1);
    const spin = spindle(seg, '#ffffff');
    const hs: Head[] = heads.map((h) => ({ ...h, belly: meshOf(spin, mat), tendon: meshOf(cone(), solid) }));
    return { mat, hs, dist: meshOf(cone(), solid), rest: new Color(restTint) };
  };
  const bic = makeMuscle(COLORS.muscleRest, [{ z: 0.18, k: 1, shift: 0.07 }, { z: -0.2, k: 0.82, shift: -0.1 }]);
  const tri = makeMuscle(COLORS.tricepsRest, [{ z: -0.15, k: 1, shift: -0.05 }, { z: 0.25, k: 0.78, shift: 0.1 }]);
  const bicActive = new Color(COLORS.biceps);
  const triActive = new Color(COLORS.triceps);

  // angle marker: a dotted arc at the elbow
  const arcCount = 22;
  const arcGeo = paint(unitSphere(8), COLORS.nerve);
  const arc = new InstancedMesh(arcGeo, solid, arcCount);
  arc.instanceMatrix.setUsage(DynamicDrawUsage);
  arc.frustumCulled = false;
  group.add(arc);
  owned.push(arcGeo, arc);

  const m4 = new Matrix4();
  const q = new Quaternion();
  const a = new Vector3();
  const b = new Vector3();
  const p0 = new Vector3();
  const p1 = new Vector3();
  const dir = new Vector3();
  const sc = new Vector3();
  const rest = { biceps: bicepsBelly(160), triceps: tricepsBelly(160) };

  const place = (mesh: Mesh, m: Matrix4): void => {
    m.decompose(mesh.position, mesh.quaternion, mesh.scale);
  };

  function poseMuscle(rig: ReturnType<typeof makeMuscle>, l: MuscleLine, cfg: { prox: number; dist: number; r0: number }, belly: number, restLen: number, act: number): void {
    dir.set(l.insertion[0] - l.origin[0], l.insertion[1] - l.origin[1], 0).normalize();
    const g = girth(restLen, belly, act);
    for (const h of rig.hs) {
      a.set(l.origin[0] + h.shift, l.origin[1], h.z);
      b.set(l.insertion[0] + h.shift * 0.3, l.insertion[1], h.z * 0.4);
      p0.copy(a).addScaledVector(dir, cfg.prox);
      p1.copy(b).addScaledVector(dir, -cfg.dist);
      q.setFromUnitVectors(UP, dir.clone().setZ(0).normalize());
      const len = p0.distanceTo(p1);
      m4.compose(p0, q, sc.set(cfg.r0 * g * h.k, len, cfg.r0 * g * h.k * 0.9));
      place(h.belly, m4);
      rodMatrix(m4, a, p0, 0.17 * h.k + 0.05);
      place(h.tendon, m4);
    }
    a.set(l.insertion[0] - dir.x * cfg.dist, l.insertion[1] - dir.y * cfg.dist, 0);
    b.set(l.insertion[0], l.insertion[1], 0);
    place(rig.dist, rodMatrix(m4, b, a, 0.17));
  }

  function pose(s: ArmState): void {
    forearm.rotation.z = flexion(s.angle);
    const bl = bicepsLine(s.angle);
    const tl = tricepsLine(s.angle);
    poseMuscle(bic, bl, BICEPS, bicepsBelly(s.angle), rest.biceps, s.biceps);
    poseMuscle(tri, tl, TRICEPS, tricepsBelly(s.angle), rest.triceps, s.triceps);
    bic.mat.color.copy(bic.rest).lerp(bicActive, Math.min(1, s.biceps / 80));
    tri.mat.color.copy(tri.rest).lerp(triActive, Math.min(1, s.triceps / 80));
    // dotted arc between the upper arm (up) and the forearm
    const theta = s.angle * (Math.PI / 180);
    for (let i = 0; i < arcCount; i++) {
      const psi = (theta * i) / (arcCount - 1);
      const r = 1.55;
      m4.compose(a.set(Math.sin(psi) * r, Math.cos(psi) * r, 0.75), q.identity(), sc.setScalar(0.045 + 0.02 * hash01(i)));
      arc.setMatrixAt(i, m4);
    }
    arc.instanceMatrix.needsUpdate = true;
  }

  function landmark(name: Parameters<ArmView['landmark']>[0], angle: number): [number, number, number] {
    const fp = (along: number, ant: number): [number, number, number] => {
      const p = forearmPoint(angle, along, ant);
      return [p[0], p[1], 0.6];
    };
    switch (name) {
      case 'shoulder':
        return [-0.2, UPPER + 0.4, 0.7];
      case 'humerus':
        return [-0.2, 0.9, 0.4];
      case 'elbow':
        return [-0.2, 0.0, 0.7];
      case 'forearm': {
        const p = fp(FORE * 0.5, -0.45);
        return [p[0], p[1], 0.5];
      }
      case 'hand': {
        const p = fp(FORE + 1.2, 0);
        return [p[0], p[1], 0.5];
      }
      case 'biceps': {
        const l = bicepsLine(angle);
        return [l.origin[0] * 0.62 + l.insertion[0] * 0.38 + 0.25, l.origin[1] * 0.62 + l.insertion[1] * 0.38, 0.6];
      }
      case 'triceps': {
        const l = tricepsLine(angle);
        return [l.origin[0] * 0.3 + l.insertion[0] * 0.7 - 0.2, l.origin[1] * 0.3 + l.insertion[1] * 0.7, -0.3];
      }
      case 'bicepsTendon': {
        const l = bicepsLine(angle);
        return [l.insertion[0] + 0.1, l.insertion[1] + 0.2, 0.4];
      }
      default: {
        const l = tricepsLine(angle);
        return [l.insertion[0] - 0.1, l.insertion[1] + 0.3, -0.2];
      }
    }
  }

  pose(armAt(0));
  return {
    group,
    fader,
    pose,
    showArc: (on) => {
      arc.visible = on;
    },
    landmark,
    dispose: () => {
      owned.forEach((o) => o.dispose());
      fader.dispose();
      group.removeFromParent();
    },
  };
}
