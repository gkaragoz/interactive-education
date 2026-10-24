import { Vector3 } from 'three';
import { smooth, win } from '../kit/math';
import { CODON_PITCH, bondTime, dockTime, moveProgress, stopTimes } from './translTiming';

// Geometry of the growing polypeptide, in the ribosome's frame. Bead j sits on its tRNA's amino-acid spot while it is the
// newest bead (A site, then P site as the mRNA slides), and older beads are pushed up the exit tunnel one step per
// translocation. After the stop codon the finished chain leaves and curls into a compact fold.

export const S_T = 1.6; // tRNA scale
export const ANTI_Y = 0.57; // height of the anticodon above the mRNA
const BALL = { x: -0.88 * S_T, y: 0.18 * S_T + 1.27 * S_T }; // amino-acid spot relative to the anticodon centre
export const BP = new Vector3(BALL.x, ANTI_Y + BALL.y, 0); // newest bead at the P site
export const BA = new Vector3(BALL.x + CODON_PITCH, ANTI_Y + BALL.y, 0); // newest bead at the A site
const U = new Vector3(-0.35, 0.937, 0).normalize();
export const STEP = 0.86;
export const FOLD_CENTER = new Vector3(-2.2, 6.4, 0.3);

const tmp = new Vector3();

/** Position of bead `j` (0 = first amino acid) at time t for a peptide of `n` amino acids; null if it does not exist yet. */
export function beadPos(j: number, t: number, n: number, out: Vector3): Vector3 | null {
  const exists = j === 0 ? t >= 11.6 : t >= dockTime(j) - 2.0;
  if (!exists) return null;
  // current cycle: the newest bead k whose tRNA has started to arrive
  let k = 0;
  for (let c = 1; c < n; c++) if (t >= dockTime(c) - 2.0) k = c;
  const tau = k >= 1 ? moveProgress(t, k) : 0;
  // (while the newest bead's tRNA is still flying in, the caller places the bead on the tRNA instead)
  if (j === k) out.copy(BA).lerp(BP, k === 0 ? 1 : tau);
  else out.copy(BP).addScaledVector(U, (k - 1 - j + tau) * STEP);
  // termination: the chain leaves the ribosome and folds
  const st = stopTimes(n);
  const leave = smooth((t - st.leave) / 3.2);
  if (leave > 0) {
    out.x += -1.2 * leave;
    out.y += 3.0 * leave;
    const fold = win(t, 48.6, 54);
    if (fold > 0) {
      // a compact coil (alpha-helix like): turn per residue and a small rise
      const a = j * 1.9;
      tmp.set(FOLD_CENTER.x + 0.8 * Math.cos(a), FOLD_CENTER.y + (j - (n - 1) / 2) * 0.62, FOLD_CENTER.z + 0.8 * Math.sin(a));
      out.lerp(tmp, fold);
    }
  }
  return out;
}

/** Peptide bond grow (0..1) between bead k-1 and k. */
export const bondGrow = (t: number, k: number): number => win(t, bondTime(k) - 0.2, bondTime(k) + 0.8);
