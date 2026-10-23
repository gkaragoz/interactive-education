import type { CellTypeId, LevelId } from '../data/types';
import { isQualityName, type QualityName } from './quality';

export type Route = 'explore' | 'kaynakca' | 'hakkinda';

export interface AppParams {
  cell: CellTypeId;
  level: LevelId;
  perf: boolean;
  quality: QualityName;
  /** The URL named a quality, so the adaptive governor stays off. */
  qualityFixed: boolean;
  route: Route;
}

export const DEFAULT_CELL: CellTypeId = 'plant';
export const DEFAULT_LEVEL: LevelId = 'temel';

const CELLS: CellTypeId[] = ['animal', 'plant', 'bacterium'];
const LEVELS: LevelId[] = ['temel', 'ileri'];

/** URL parameters are untrusted: unknown values fall back to defaults, never throw. */
export function parseParams(search: string, hash = ''): AppParams {
  const q = new URLSearchParams(search);
  const cell = q.get('cell');
  const level = q.get('level');
  const quality = q.get('quality');
  return {
    cell: CELLS.includes(cell as CellTypeId) ? (cell as CellTypeId) : DEFAULT_CELL,
    level: LEVELS.includes(level as LevelId) ? (level as LevelId) : DEFAULT_LEVEL,
    perf: q.has('perf') && q.get('perf') !== '0' && q.get('perf') !== 'false',
    quality: isQualityName(quality) ? quality : 'medium',
    qualityFixed: isQualityName(quality),
    route: parseRoute(hash),
  };
}

export function parseRoute(hash: string): Route {
  const clean = (hash.replace(/^#\/?/, '').toLowerCase().split('/')[0] ?? '');
  if (clean === 'kaynakca') return 'kaynakca';
  if (clean === 'hakkinda') return 'hakkinda';
  return 'explore';
}

export function routeHash(route: Route): string {
  return route === 'explore' ? '#/' : `#/${route}`;
}

/** `#/kaynakca/<sourceId>` deep-links to one bibliography entry. */
export function parseRouteAnchor(hash: string): string | null {
  const parts = hash.replace(/^#\/?/, '').split('/');
  return parts.length > 1 && parts[1] ? decodeURIComponent(parts[1]) : null;
}
