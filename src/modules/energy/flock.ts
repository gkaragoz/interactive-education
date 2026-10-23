import { Color, Euler, Quaternion, Vector3, type Group } from 'three';
import type { ModuleContext } from '../../scene';
import { KINDS, type KindId, type KindSpec } from './kinds';
import { smooth, type Path } from './math';
import { createMolSet, type MolSet } from './molset';

/** One molecule's journey: where it is at every time inside [path.t0, path.t1]; outside it is hidden. */
export interface Trip {
  kind: KindId;
  /** Index of the station (group) the molecule lives in. */
  station: number;
  path: Path;
  size: number;
  /** Seconds of grow-in and shrink-out at the ends of the path. */
  fade?: number;
  /** Stay at full size at the end (the molecule is still there when the track ends). */
  hold?: boolean;
  /** Amplitude of the Brownian-like shimmer. */
  wobble?: number;
  /** Tumbling speed (rad/s). */
  spin?: number;
  phase?: number;
  /** Rotate only about the vertical axis (proteins, rotors). */
  upright?: boolean;
  /** Fixed Euler orientation applied before the spin (e.g. flip a membrane protein over). */
  base?: readonly [number, number, number];
  /** A turning machine part (ATP synthase): keeps its spin under reduced motion, where decorative spin and shimmer stop. */
  rotor?: boolean;
  tint?: string;
  /** Change colour to `to` between `at` and `at + 0.5` s. */
  tintTo?: { to: string; at: number };
}

interface Bound {
  trip: Trip;
  set: MolSet;
  slot: number;
  ax: number;
  ay: number;
  az: number;
  c0: Color | null;
  c1: Color | null;
  mul: number;
}

const P = new Vector3();
const Q = new Quaternion();
const AX = new Vector3();
const C = new Color();
const E = new Euler();
const QB = new Quaternion();
const WHITE = new Color(1, 1, 1);

/** Drives every molecule of a track: instanced sets per (station, kind), posed purely from `t`. */
export class Flock {
  private readonly bound: Bound[] = [];
  private readonly sets: MolSet[] = [];
  private readonly byStation: Bound[][] = [];
  private readonly setsByStation: MolSet[][] = [];
  readonly own: Array<{ dispose(): void }> = [];
  private calm = false;

  private readonly pending = new Map<string, MolSet>();

  /** Creates the instanced sets, sized for the largest of the given trip lists (one per option combination). */
  async build(ctx: ModuleContext, groups: readonly Group[], variants: readonly (readonly Trip[])[]): Promise<void> {
    this.calm = ctx.reducedMotion;
    const counts = new Map<string, number>();
    for (const trips of variants) {
      const here = new Map<string, number>();
      for (const trip of trips) {
        const key = `${trip.station}:${trip.kind}`;
        here.set(key, (here.get(key) ?? 0) + 1);
      }
      for (const [key, n] of here) counts.set(key, Math.max(counts.get(key) ?? 0, n));
    }
    for (const [key, n] of counts) {
      const [station, kind] = key.split(':') as [string, KindId];
      const set = await createMolSet(ctx, kind, n, this.own);
      groups[Number(station)]?.add(set.group);
      this.sets.push(set);
      this.pending.set(key, set);
    }
  }

  /** Assigns the trips of the current options to instance slots (all other slots are hidden). */
  bind(trips: readonly Trip[]): void {
    for (const b of this.bound) b.set.hide(b.slot);
    this.bound.length = 0;
    this.byStation.length = 0;
    this.setsByStation.length = 0;
    const used = new Map<string, number>();
    for (const trip of trips) {
      const key = `${trip.station}:${trip.kind}`;
      const slot = used.get(key) ?? 0;
      used.set(key, slot + 1);
      const ph = trip.phase ?? 0.37 * slot + 0.11 * trip.station;
      AX.set(Math.sin(ph * 1.7) + 0.2, Math.cos(ph * 2.3), Math.sin(ph * 0.9 + 1)).normalize();
      const b: Bound = {
        trip,
        set: this.pending.get(key)!,
        slot,
        ax: AX.x,
        ay: AX.y,
        az: AX.z,
        c0: trip.tint ?? (KINDS[trip.kind] as KindSpec).tint ? new Color(trip.tint ?? (KINDS[trip.kind] as KindSpec).tint) : null,
        c1: trip.tintTo ? new Color(trip.tintTo.to) : null,
        mul: (KINDS[trip.kind] as KindSpec).scale ?? 1,
      };
      b.set.tint(slot, b.c0 ?? WHITE);
      this.bound.push(b);
      (this.byStation[trip.station] ??= []).push(b);
      const ss = (this.setsByStation[trip.station] ??= []);
      if (!ss.includes(b.set)) ss.push(b.set);
    }
    for (const set of this.sets) set.commit();
  }

  /** Poses the molecules of the given station. */
  seek(t: number, station: number): void {
    const list = this.byStation[station];
    if (!list) return;
    for (const b of list) {
      const { trip, set, slot } = b;
      const t0 = trip.path.t0;
      const t1 = trip.path.t1;
      if (t < t0 || t > t1) {
        set.hide(slot);
        continue;
      }
      const f = trip.fade ?? 0.4;
      const grow = smooth((t - t0) / f);
      const shrink = trip.hold ? 1 : smooth((t1 - t) / f);
      const s = trip.size * b.mul * Math.min(grow, shrink);
      if (s < 1e-3) {
        set.hide(slot);
        continue;
      }
      trip.path.at(t, P);
      const ph = trip.phase ?? 0.37 * slot + 0.11 * trip.station;
      const wob = this.calm ? 0 : (trip.wobble ?? 0);
      if (wob) P.set(P.x + wob * Math.sin(t * 1.3 + ph * 3), P.y + wob * Math.sin(t * 1.7 + ph * 5), P.z + wob * Math.sin(t * 1.1 + ph * 7));
      if (trip.upright) AX.set(0, 1, 0);
      else AX.set(b.ax, b.ay, b.az);
      const spin = this.calm && !trip.rotor ? 0 : (trip.spin ?? 0.6);
      const angle = (trip.upright ? (trip.phase ?? 0) : ph) + spin * t;
      if (trip.upright && set.poseSpin) {
        if (trip.base) Q.setFromEuler(E.set(trip.base[0], trip.base[1], trip.base[2]));
        else Q.identity();
        set.poseSpin(slot, P, Q, s, angle);
      } else {
        Q.setFromAxisAngle(AX, angle);
        if (trip.base) Q.multiply(QB.setFromEuler(E.set(trip.base[0], trip.base[1], trip.base[2])));
        set.pose(slot, P, Q, s);
      }
      if (b.c0 && b.c1 && trip.tintTo) set.tint(slot, C.copy(b.c0).lerp(b.c1, smooth((t - trip.tintTo.at) / 0.5)));
    }
    for (const set of this.setsByStation[station] ?? []) set.commit();
  }

  dispose(): void {
    for (const set of this.sets) set.dispose();
    for (const o of this.own) o.dispose();
    this.sets.length = 0;
    this.bound.length = 0;
    this.byStation.length = 0;
  }
}
