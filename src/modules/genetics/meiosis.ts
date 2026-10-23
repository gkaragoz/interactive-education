import { follow, gate, path, type Anim, type Key } from './anim';
import type { Kit } from './kit';
import type { Gamete, Parent } from './punnett';

export interface MeioSpec {
  genes: Parent;
  /** Centre of the (first) meiocyte; a dihybrid parent has a second one `pitch` away (negative: below). */
  cx: number;
  cy: number;
  pitch: number;
  /** The cell grows in at `appear`; meiosis I starts at `T` (the whole division takes 3.1 s). */
  appear: number;
  T: number;
  /** Allele colour (the band across a chromosome, the flying orbs). */
  color: (allele: string) => string;
}


/** Where a finished gamete goes: it rests, then flies (with an arc) to `x, y` at scale `s`, arriving at `t1`. */
export interface Flight {
  t0: number;
  t1: number;
  x: number;
  y: number;
  s: number;
  lift: number;
  /** Fuses into a zygote: shrinks away after arrival. */
  vanish?: boolean;
}

export interface GameteSlot {
  type: Gamete;
  /** Builds the gamete's bubble, chromosomes and tag; flying to a place, or fading out when nobody claims it. */
  build(flight: Flight | null, fade: [number, number]): void;
}

const MATERNAL = '#d4186a';
const PATERNAL = '#1478b8';
const join = (a: Anim, b: Anim, at: number): Anim => (t, o) => (t < at ? a(t, o) : b(t, o));

/**
 * Meiosis in the simplest honest form: a cell with the homologous pairs (X-shaped replicated chromosomes), meiosis I
 * pulls the homologs apart into two lobes (alleles segregate), meiosis II splits each lobe into two gametes with one
 * single chromosome per gene. A dihybrid parent shows two cells with different orientations (independent assortment).
 */
export function meiosis(kit: Kit, s: MeioSpec): GameteSlot[] {
  const G = s.genes.length;
  const cells = G === 2 ? 2 : 1;
  const r0 = G === 1 ? 1.3 : 1.45;
  const rLobe = G === 1 ? 0.95 : 1.05;
  const dx = 1.0;
  const rg = G === 1 ? 0.55 : 0.64;
  const dyG = G === 1 ? 0.75 : 0.85;
  const cs = G === 1 ? 0.95 : 0.8;
  const sg = G === 1 ? 0.7 : 0.5;
  const T1 = s.T;
  const T2 = T1 + 1.5;
  const T3 = T1 + 2.0;
  const T4 = T1 + 3.1;
  const slots: GameteSlot[] = [];
  const sign = (side: number): number => (side === 0 ? -1 : 1);
  const origin = (c: number, g: number, side: number): string => ((g >= 1 && c === 1 ? 1 - side : side) === 0 ? MATERNAL : PATERNAL);
  const allele = (c: number, g: number, side: number): string => (s.genes[g] as readonly string[])[g >= 1 && c === 1 ? 1 - side : side] as string;

  for (let c = 0; c < cells; c++) {
    const cyc = s.cy + c * s.pitch;
    kit.shape({ shape: 'bubble', size: [r0, r0, r0], color: '#ffffff', anim: path([[s.appear, s.cx, cyc, 0], [s.appear + 1, s.cx, cyc, 1], [T1, s.cx, cyc, 1], [T1 + 1, s.cx, cyc, 0]]) });
    for (let side = 0; side < 2; side++) {
      const lx = s.cx + sign(side) * dx;
      kit.shape({ shape: 'bubble', size: [rLobe, rLobe, rLobe], color: '#ffffff', anim: path([[T1, lx, cyc, 0], [T2, lx, cyc, 1], [T3, lx, cyc, 1], [T3 + 1, lx, cyc, 0]]) });
    }
    // replicated chromosomes with their allele letters
    for (let g = 0; g < G; g++) {
      const gy = G === 1 ? 0 : g === 0 ? 0.55 : -0.55;
      for (let side = 0; side < 2; side++) {
        const a = allele(c, g, side);
        const k = a === 'Y' ? cs * 0.64 : cs;
        const y = cyc + gy + 0.13 * k;
        const x0 = s.cx + sign(side) * 0.36;
        const x1 = s.cx + sign(side) * dx;
        const anim = path([[s.appear, x0, y, 0], [s.appear + 1, x0, y, k], [T1, x0, y, k], [T2, x1, y, k], [T3, x1, y, k], [T3 + 0.5, x1, y, 0]]);
        kit.chromo({ single: false, anim, color: origin(c, g, side), band: s.color(a) });
        kit.tag({ alleles: [a], height: G === 1 ? 0.5 : 0.42, anim: follow(anim, sign(side) * 0.55, -0.05, 0.5, 1 / k) });
      }
    }
    // gametes: (side, j) = which lobe, upper or lower half
    for (let side = 0; side < 2; side++) {
      for (let j = 0; j < 2; j++) {
        const type = s.genes.map((_, g) => allele(c, g, side));
        const lx = s.cx + sign(side) * dx;
        const rest: [number, number] = [lx, cyc + (j === 0 ? dyG : -dyG)];
        slots.push({
          type,
          build(flight, fade) {
            const keys: Key[] = [[T3, lx, cyc, 0], [T4, rest[0], rest[1], 1]];
            if (flight) {
              keys.push([flight.t0, rest[0], rest[1], 1], [flight.t1, flight.x, flight.y, flight.s, 0, flight.lift]);
              if (flight.vanish) keys.push([flight.t1 + 0.1, flight.x, flight.y, flight.s], [flight.t1 + 0.7, flight.x, flight.y, 0]);
            } else keys.push([fade[0], rest[0], rest[1], 1], [fade[1], rest[0], rest[1], 0]);
            const frame = path(keys);
            kit.shape({ shape: 'bubble', size: [rg, rg, rg], color: '#ffffff', anim: frame });
            const tokenColor = type.length === 1 ? s.color(type[0] as string) : '#e8d9b0';
            // resting: the letter token sits beside the gamete; once it flies to a header it moves below the bubble
            const aside = follow(frame, sign(side) * (rg + 0.62), 0, 0.45);
            const below = follow(frame, 0, -rg - 0.45, 0.45);
            if (flight) {
              kit.token({ alleles: type, color: tokenColor, scale: 1.5, anim: gate(aside, -2, -1, flight.t0, flight.t0 + 0.6) });
              kit.token({ alleles: type, color: tokenColor, scale: 1.5, anim: gate(below, flight.t1 - 0.9, flight.t1) });
            } else kit.token({ alleles: type, color: tokenColor, scale: 1.5, anim: aside });
            s.genes.forEach((_, g) => {
              const a = type[g] as string;
              const k = (a === 'Y' ? 0.64 : 1) * sg;
              const gyc = cyc + (G === 1 ? 0 : g === 0 ? 0.55 : -0.55);
              const x1 = lx;
              const inX = G === 1 ? 0 : g === 0 ? -0.2 : 0.2;
              const start = path([[T3, x1, gyc, 0], [T3 + 0.4, x1, gyc + (j === 0 ? 0.12 : -0.12), cs * 0.6], [T4, rest[0] + inX, rest[1] + 0.12 * k * 2, k]]);
              const inside = follow(frame, inX, 0.12 * k * 2, 0.08, k);
              kit.chromo({ single: true, anim: join(start, inside, T4), color: origin(c, g, side), band: s.color(a) });
            });
          },
        });
      }
    }
  }
  return slots;
}

/** Picks, for each wanted gamete type, one unused slot of that type (undefined if the cell cannot make it). */
export function claim(slots: readonly GameteSlot[], wanted: readonly Gamete[]): Array<GameteSlot | undefined> {
  const used = new Set<GameteSlot>();
  return wanted.map((w) => {
    const hit = slots.find((sl) => !used.has(sl) && sl.type.join('') === w.join(''));
    if (hit) used.add(hit);
    return hit;
  });
}
