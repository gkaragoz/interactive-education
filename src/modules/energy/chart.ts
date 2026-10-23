import { ramp } from './math';

/** A discrete event that adds `amount` to a chart series, ramping in over [t - dur, t] (complete at `t`). */
export interface Ev {
  series: string;
  t: number;
  amount: number;
  dur?: number;
}

/**
 * Chart values from events: the same events schedule the molecules, so the numbers and the picture agree.
 * `base` gives each series its starting value; `ids` lists every series the plan reports.
 */
export function chartFrom(ids: readonly string[], events: readonly Ev[], base: Record<string, number> = {}): (t: number) => Record<string, number> {
  const bySeries = new Map<string, Ev[]>();
  for (const id of ids) bySeries.set(id, []);
  for (const e of events) bySeries.get(e.series)?.push(e);
  return (t) => {
    const out: Record<string, number> = {};
    for (const id of ids) {
      let v = base[id] ?? 0;
      for (const e of bySeries.get(id)!) v += e.amount * ramp(t, e.t - (e.dur ?? 1), e.t);
      out[id] = v;
    }
    return out;
  };
}

/** Value of a series after every event has finished (the number the animation ends on). */
export function finalValue(events: readonly Ev[], series: string, base = 0): number {
  return events.filter((e) => e.series === series).reduce((a, e) => a + e.amount, base);
}
