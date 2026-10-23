import { describe, expect, it } from 'vitest';
import { parseParams, parseRoute, parseRouteAnchor, routeHash } from '../src/core';

describe('parseParams', () => {
  it('returns defaults for an empty query', () => {
    expect(parseParams('')).toEqual({ cell: 'plant', level: 'temel', perf: false, quality: 'medium', qualityFixed: false, route: 'explore' });
  });

  it('reads cell, level, quality and perf', () => {
    const p = parseParams('?cell=bacterium&level=ileri&quality=low&perf');
    expect(p).toMatchObject({ cell: 'bacterium', level: 'ileri', quality: 'low', qualityFixed: true, perf: true });
  });

  it('treats perf=0 and perf=false as off', () => {
    expect(parseParams('?perf=0').perf).toBe(false);
    expect(parseParams('?perf=false').perf).toBe(false);
    expect(parseParams('?perf=1').perf).toBe(true);
  });

  it('falls back to defaults on unknown or hostile values', () => {
    const p = parseParams('?cell=<script>&level=expert&quality=ultra');
    expect(p).toMatchObject({ cell: 'plant', level: 'temel', quality: 'medium' });
    expect(parseParams('?cell=__proto__').cell).toBe('plant');
    expect(parseParams('?cell=animal&cell=plant').cell).toBe('animal');
  });

  it('parses routes from the hash', () => {
    expect(parseParams('', '#/kaynakca').route).toBe('kaynakca');
    expect(parseParams('', '#/hakkinda').route).toBe('hakkinda');
    expect(parseParams('', '#/nonsense').route).toBe('explore');
    expect(parseRoute('')).toBe('explore');
  });

  it('round-trips routes and deep links to a source', () => {
    expect(routeHash('kaynakca')).toBe('#/kaynakca');
    expect(parseRoute('#/kaynakca/wp-tr-hucre')).toBe('kaynakca');
    expect(parseRouteAnchor('#/kaynakca/wp-tr-hucre')).toBe('wp-tr-hucre');
    expect(parseRouteAnchor('#/kaynakca')).toBeNull();
  });
});
