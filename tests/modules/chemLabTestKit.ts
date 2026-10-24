import { EXPERIMENTS } from '../../src/chemlab';

export { EXPERIMENTS };

/** Small seeded generator for tests (Mulberry32), same family as the app's `seededRng`. */
export function mulberry32Compat(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
