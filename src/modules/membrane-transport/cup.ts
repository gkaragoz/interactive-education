/**
 * Membrane invagination as an area-preserving map. A flat disc of lipids around a site is wrapped onto a profile that
 * goes from flat (p = 0) through a cup and an omega shape to a closed sphere (p = 1): the curve is built from its
 * turning angle (a bulb of radius `rb`, then a fillet back to the flat sheet). A lipid at flat distance rho is moved to
 * the point of the curve where the enclosed area equals pi*rho^2, so lipid density stays uniform and the hole left by a
 * pinched-off vesicle closes by itself. The profile is a pure function of (rb, p).
 */
const NB = 40;
const NF = 24;
const N = NB + NF + 1;

export interface CupHit {
  r: number;
  z: number;
  psi: number;
  inCup: boolean;
}

export class CupTable {
  readonly r = new Float64Array(N);
  readonly z = new Float64Array(N);
  readonly psi = new Float64Array(N);
  readonly a = new Float64Array(N);
  n = 0;
  aEnd = 0;
  rEnd = 0;
  zFlat = 0;
  /** Depth of the tip below the flat sheet (mid surface). */
  depth = 0;

  /** `off` is the signed distance of the lipid layer from the mid surface along the normal (+ toward the lumen). */
  fill(rb: number, p: number, off: number): this {
    const psiB = Math.PI * p;
    const ln = Math.max(0, 1.6 * rb * (1 - p));
    const mr: number[] = [];
    const mz: number[] = [];
    const mp: number[] = [];
    for (let i = 0; i <= NB; i++) {
      const ps = (psiB * i) / NB;
      mr.push(rb * Math.sin(ps));
      mz.push(rb * (1 - Math.cos(ps)));
      mp.push(ps);
    }
    const rB = rb * Math.sin(psiB);
    const zB = rb * (1 - Math.cos(psiB));
    if (ln > 1e-4 && psiB > 1e-6) {
      const k = psiB / ln;
      for (let i = 1; i <= NF; i++) {
        const u = (ln * i) / NF;
        const ps = psiB - k * u;
        mr.push(rB + (Math.sin(psiB) - Math.sin(ps)) / k);
        mz.push(zB + (Math.cos(ps) - Math.cos(psiB)) / k);
        mp.push(ps);
      }
    }
    this.n = mr.length;
    const zMidEnd = mz[this.n - 1] ?? 0;
    this.depth = zMidEnd;
    let acc = 0;
    for (let i = 0; i < this.n; i++) {
      const ps = mp[i] ?? 0;
      this.r[i] = (mr[i] ?? 0) - off * Math.sin(ps);
      this.z[i] = (mz[i] ?? 0) + off * Math.cos(ps) - zMidEnd;
      this.psi[i] = ps;
      if (i > 0) acc += Math.PI * (this.r[i]! + this.r[i - 1]!) * Math.hypot(this.r[i]! - this.r[i - 1]!, this.z[i]! - this.z[i - 1]!);
      this.a[i] = acc;
    }
    this.aEnd = acc;
    this.rEnd = this.r[this.n - 1]!;
    this.zFlat = this.z[this.n - 1]!;
    return this;
  }

  /** Map the flat distance `rho` to a point of the profile. `inCup` is true while the lipid is part of the bulb or fillet. */
  map(rho: number, out: CupHit): void {
    const area = Math.PI * rho * rho;
    if (area >= this.aEnd) {
      out.r = Math.sqrt(this.rEnd * this.rEnd + (area - this.aEnd) / Math.PI);
      out.z = this.zFlat;
      out.psi = 0;
      out.inCup = false;
      return;
    }
    let lo = 0;
    let hi = this.n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.a[mid]! <= area) lo = mid;
      else hi = mid;
    }
    const span = this.a[hi]! - this.a[lo]!;
    const u = span <= 1e-12 ? 0 : (area - this.a[lo]!) / span;
    out.r = this.r[lo]! + (this.r[hi]! - this.r[lo]!) * u;
    out.z = this.z[lo]! + (this.z[hi]! - this.z[lo]!) * u;
    out.psi = this.psi[lo]! + (this.psi[hi]! - this.psi[lo]!) * u;
    out.inCup = true;
  }
}
