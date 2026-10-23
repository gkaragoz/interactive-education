import type { CellTypeId, LevelId } from '../data/types';
import { isQualityName, type QualityName } from './quality';

/** `home` is the module list (`#/`), `explore` the cell explorer (`#/modul/cell`), `modul` any animated module. */
export type Route = 'home' | 'explore' | 'kaynakca' | 'hakkinda' | 'modul';

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
    // Old links such as `?cell=animal` (no hash) still open the cell explorer.
    route: hash === '' && q.has('cell') ? 'explore' : parseRoute(hash),
  };
}

/** `?sorular=0|1` (also off/on, false/true): overrides the saved Sorular setting for this visit; null when absent or unknown. */
export function parseQuestionsParam(search: string): boolean | null {
  const v = new URLSearchParams(search).get('sorular')?.toLowerCase();
  if (v === '1' || v === 'on' || v === 'true' || v === 'acik') return true;
  if (v === '0' || v === 'off' || v === 'false' || v === 'kapali') return false;
  return null;
}

export function parseRoute(hash: string): Route {
  const clean = (hash.replace(/^#\/?/, '').toLowerCase().split('/')[0] ?? '');
  if (clean === 'kaynakca') return 'kaynakca';
  if (clean === 'hakkinda') return 'hakkinda';
  if (clean === 'modul') return parseModuleRoute(hash)?.id === 'cell' ? 'explore' : 'modul';
  return 'home';
}

export function routeHash(route: Route): string {
  if (route === 'home') return '#/';
  return route === 'explore' ? '#/modul/cell' : `#/${route}`;
}

/** `#/kaynakca/<sourceId>` deep-links to one bibliography entry. */
export function parseRouteAnchor(hash: string): string | null {
  const parts = hash.replace(/^#\/?/, '').split('/');
  return parts.length > 1 && parts[1] ? decodeURIComponent(parts[1]) : null;
}

export interface ModuleRoute {
  id: string;
  track: string | null;
}

const SAFE_ID = /^[a-z0-9_-]{1,40}$/;

/** `#/modul/<id>[/<track>]`; ids and tracks are kebab-case (or `__demo`), anything else is not a module route. */
export function parseModuleRoute(hash: string): ModuleRoute | null {
  const parts = hash.replace(/^#\/?/, '').split('?')[0]?.split('/') ?? [];
  if (parts[0]?.toLowerCase() !== 'modul' || !parts[1]) return null;
  const id = decodeSafe(parts[1]);
  const track = parts[2] ? decodeSafe(parts[2]) : null;
  if (!id || !SAFE_ID.test(id) || (track !== null && !SAFE_ID.test(track))) return null;
  return { id, track };
}

function decodeSafe(part: string): string | null {
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

export function moduleHash(id: string, track?: string | null): string {
  return `#/modul/${encodeURIComponent(id)}${track ? `/${encodeURIComponent(track)}` : ''}`;
}
