import type { CellTypeId, LevelId } from '../data/types';
import type { Route } from './params';
import type { QualityMode } from './settingsStorage';

export type ViewMode = 'full' | 'cutaway' | 'isolate';

export interface AppState {
  route: Route;
  cellId: CellTypeId;
  level: LevelId;
  /** Selected organelle (or shell part) id. */
  selectedId: string | null;
  /** Organelle ids hidden with the legend toggles. */
  hidden: ReadonlySet<string>;
  viewMode: ViewMode;
  /** Keeps the shell but hides every organelle except the selected one. */
  hideOthers: boolean;
  /** 0 = nothing cut, 1 = cut through the whole cell. */
  cutPosition: number;
  labels: boolean;
  autoRotate: boolean;
  compareOn: boolean;
  compareCellId: CellTypeId;
  qualityMode: QualityMode;
}

type Listener = (state: AppState, prev: AppState) => void;

/** Minimal observable store: replace-on-write state with whole-state listeners. */
export class Store {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor(initial: AppState) {
    this.state = initial;
  }

  get(): AppState {
    return this.state;
  }

  patch(change: Partial<AppState>): void {
    const prev = this.state;
    const next = { ...prev, ...change };
    const keys = Object.keys(change) as (keyof AppState)[];
    if (keys.every((k) => prev[k] === next[k])) return;
    this.state = next;
    for (const listener of [...this.listeners]) listener(next, prev);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function toggleInSet(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
