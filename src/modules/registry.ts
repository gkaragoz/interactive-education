import type { LevelId } from '../data/types';
import type { ModuleDefinition, SimDefinition } from '../scene';
import { demoDefinition, DEMO_ID } from './demo';
import { ALL_ENTRIES } from './entries';
import { RELEASED_IDS } from './releases';

/** What the home page needs to draw a module card without loading the module's code. */
export interface RegistryEntry {
  id: string;
  nameTr: string;
  tagline: string;
  /** Levels the module offers. */
  levels: LevelId[];
  /** `null` for the cell explorer, which has its own screen; animated modules are lazy definitions. */
  definition: ModuleDefinition | null;
  /** Interactive sim modules (docs/SIMS.md) have a `sim` definition instead of a timeline `definition`. */
  sim?: SimDefinition;
}

export interface UpcomingModule {
  id: string;
  nameTr: string;
  tagline: string;
  version: string;
}

/**
 * Released modules, in home page order. A module appears in production only when it is listed here; the module agents
 * add their entry (with a lazy `definition`) when they ship.
 */
export const RELEASED: readonly RegistryEntry[] = [
  { id: 'cell', nameTr: 'Hücre', tagline: 'Hayvan, bitki ve bakteri hücresini 3B keşfet', levels: ['temel', 'ileri'], definition: null },
  ...ALL_ENTRIES.filter((e) => RELEASED_IDS.includes(e.id)),
];

/** Announced but unreleased: shown as disabled "Yakında" cards, without routes. */
const ALL_UPCOMING: readonly UpcomingModule[] = [
  { id: 'mitosis-meiosis', nameTr: 'Mitoz ve mayoz', tagline: 'Hücre bölünmesini adım adım izle', version: 'v0.2' },
  { id: 'membrane-transport', nameTr: 'Zardan madde geçişi', tagline: 'Difüzyon, osmoz ve aktif taşıma', version: 'v0.3' },
  { id: 'dna-protein', nameTr: 'DNA ve protein sentezi', tagline: 'Eşleme, sentez ve çeviri', version: 'v0.4' },
  { id: 'energy', nameTr: 'Enerji dönüşümleri', tagline: 'Fotosentez ve solunum', version: 'v0.5' },
  { id: 'muscle', nameTr: 'Kas kasılması', tagline: 'Kayan iplikler', version: 'v0.6' },
  { id: 'nervous', nameTr: 'Sinir sistemi', tagline: 'Aksiyon potansiyeli ve refleks', version: 'v0.6' },
  { id: 'genetics', nameTr: 'Kalıtım', tagline: 'Mendel ve Punnett kareleri', version: 'v0.6' },
];

export const UPCOMING: readonly UpcomingModule[] = ALL_UPCOMING.filter((u) => !RELEASED_IDS.includes(u.id));

export interface RegistryOptions {
  /** Include the framework test module (dev builds and `?demo`). */
  demo: boolean;
}

/** Modules that can be opened now. */
export function openableModules(options: RegistryOptions): RegistryEntry[] {
  const list = [...RELEASED];
  if (options.demo) {
    // preview: every registered module, released or not
    for (const e of ALL_ENTRIES) if (!list.some((l) => l.id === e.id)) list.push(e);
    list.push({ id: DEMO_ID, nameTr: 'Deneme modülü', tagline: 'Çerçeve denemesi', levels: ['temel', 'ileri'], definition: demoDefinition });
  }
  return list;
}

export function findModule(id: string, options: RegistryOptions): RegistryEntry | null {
  return openableModules(options).find((m) => m.id === id) ?? null;
}

/** Cards for the home page: released modules only (the demo never appears there), and unreleased ones are only "upcoming". */
export function homeModules(): readonly RegistryEntry[] {
  return RELEASED;
}
