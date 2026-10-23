import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, SphereGeometry, TorusGeometry } from 'three';

/** Adds the white vertex colour (rgb or rgba) the shared painted materials expect. */
function withColor(g: BufferGeometry, comps: 3 | 4 = 3, rgba: number[] = [1, 1, 1, 1]): BufferGeometry {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * comps);
  for (let i = 0; i < n; i++) for (let k = 0; k < comps; k++) c[i * comps + k] = rgba[k] as number;
  g.setAttribute('color', new Float32BufferAttribute(c, comps));
  return g;
}

/**
 * One chromatid: a lathe around +Y from the long-arm tip (y = -0.65) to the short-arm tip (y = +0.35), unit radius,
 * rounded ends and a waist at the centromere (y = 0). `aSeg` runs 0 (long-arm tip) .. 1 (short-arm tip).
 */
export function chromatidGeometry(radial: number, along: number): BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const seg: number[] = [];
  const idx: number[] = [];
  const rows = along + 1;
  const profile = (s: number): number => {
    const e = Math.abs(2 * s - 1);
    const body = Math.pow(Math.max(0, 1 - Math.pow(e, 5)), 1 / 2.2);
    const waist = 1 - 0.38 * Math.exp(-Math.pow((s - 0.65) / 0.045, 2));
    return body * waist;
  };
  for (let j = 0; j < rows; j++) {
    // denser near the ends
    const u = j / (rows - 1);
    const s = 0.5 - 0.5 * Math.cos(u * Math.PI);
    const y = -0.65 + s;
    const r = profile(s);
    const dr = (profile(Math.min(1, s + 1e-3)) - profile(Math.max(0, s - 1e-3))) / (s + 1e-3 - Math.max(0, s - 1e-3)); // dr/dy (unit)
    for (let i = 0; i <= radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      pos.push(r * ca, y, r * sa);
      // normal of a surface of revolution (radius scaled ~ 0.2 vs length 1 on screen): use slope in a 6:1 aspect
      const nx = ca;
      const nz = sa;
      const ny = -dr * 0.16;
      const l = Math.hypot(nx, ny, nz);
      nor.push(nx / l, ny / l, nz / l);
      uv.push(i / radial, s * 3);
      seg.push(s);
    }
  }
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < radial; i++) {
      const a = j * (radial + 1) + i;
      const b = a + radial + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setAttribute('aSeg', new Float32BufferAttribute(seg, 1));
  g.setIndex(idx);
  withColor(g);
  g.computeBoundingSphere();
  return g;
}

/** Tapered fibre along +X from 0 to 1 (radius 0.05 at the start, 0.032 at the end). */
export function fibreGeometry(radial: number): BufferGeometry {
  const g = new CylinderGeometry(0.035, 0.05, 1, radial, 1, false);
  g.rotateZ(-Math.PI / 2); // axis along +X, wide end at x=0
  g.translate(0.5, 0, 0);
  return withColor(g);
}

/** Flat disc facing -X: the kinetochore plate. */
export function kinetochoreGeometry(seg: number): BufferGeometry {
  const g = new SphereGeometry(1, seg, Math.max(4, seg / 2));
  g.scale(0.35, 1, 1);
  return withColor(g);
}

export function ringGeometry(seg: number): BufferGeometry {
  return withColor(new TorusGeometry(1, 0.06, 8, seg * 2));
}

export function unitSphere(seg: number): BufferGeometry {
  return withColor(new SphereGeometry(1, seg, Math.max(6, seg / 2)));
}

/** Curved square patch of the unit sphere around +Z (half angle `half` in both directions); instanced to tile an envelope. */
export function patchGeometry(n = 4, half = 0.5): BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const u = (i / n - 0.5) * 2 * Math.tan(half);
      const v = (j / n - 0.5) * 2 * Math.tan(half);
      const l = Math.hypot(u, v, 1);
      pos.push(u / l, v / l, 1 / l);
      nor.push(u / l, v / l, 1 / l);
      uv.push(i / n, j / n);
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      idx.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return withColor(g, 4, [0.6, 0.42, 0.85, 0.9]);
}

/** Cell body: two half grids (side -1/+1) with (u, theta, side) parameters; positions are computed in the vertex shader. */
export function cellGeometry(rings: number, around: number): BufferGeometry {
  const params: number[] = [];
  const idx: number[] = [];
  const pos: number[] = [];
  const uv: number[] = [];
  for (let side = -1; side <= 1; side += 2) {
    const base = params.length / 3;
    for (let j = 0; j <= rings; j++) {
      for (let i = 0; i <= around; i++) {
        params.push(j / rings, (i / around) * Math.PI * 2, side);
        pos.push(0, 0, 0);
        uv.push((i / around) * 6, (j / rings) * 2 * side);
      }
    }
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < around; i++) {
        const a = base + j * (around + 1) + i;
        const b = a + around + 1;
        if (side < 0) idx.push(a, a + 1, b, a + 1, b + 1, b);
        else idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(pos.slice(), 3));
  g.setAttribute('aParam', new Float32BufferAttribute(params, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  withColor(g, 4, [0.34, 0.26, 0.3, 1]);
  g.boundingSphere = null;
  g.computeBoundingSphere();
  g.boundingSphere!.radius = 20;
  return g;
}
