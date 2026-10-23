import type { Key } from './anim';
import type { LabelSpec } from './cross';
import type { CrossKind, Square } from './punnett';

/** Everything the scene needs from a track builder besides the actors it added to the kit. */
export interface Plan {
  /** Equals `TrackInfo.duration` (a test compares). */
  duration: number;
  kind: CrossKind;
  sq: Square;
  /** Punnett fill phase (the chart counts the squares filled in it). */
  fill: [number, number];
  /** Camera path: [time, centre x, centre y, visible height]. */
  cam: Key[];
  labels: LabelSpec[];
  /** From this time on a gentle note says the chosen cross differs from the text. */
  warnAt: number;
}
