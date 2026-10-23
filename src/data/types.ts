// Shared data contract. Owned by the lead; the content, scene and UI work all import these types.
// Learner-facing strings are Turkish; ids are English kebab-case and equal the asset file names.

export type LevelId = 'temel' | 'ileri';
export type CellTypeId = 'animal' | 'plant' | 'bacterium';
export type SourceKind = 'meb' | 'wikipedia' | 'openstax' | 'commons';

/** Placement zones resolved by the scene layout solver (`src/scene/layout.ts`). */
export type PlacementZone = 'nucleus-near' | 'periphery' | 'cytoplasm' | 'wall-adjacent' | 'center';

export interface Source {
  id: string; // e.g. 'wp-tr-mitokondri'
  kind: SourceKind;
  title: string;
  url: string;
  publisher: string; // MEB, Vikipedi, Wikipedia, OpenStax, or the Commons author
  license: string; // e.g. 'CC BY-SA 4.0', 'CC BY 4.0', 'PD', 'MEB (resmi program)'
  lang: 'tr' | 'en';
  accessed: string; // ISO date the page was verified
}

export interface Kazanim {
  id: string; // official code, e.g. 'FB.5.3.1'
  grade: number;
  subject: 'fen-bilimleri' | 'biyoloji';
  theme: string;
  summaryTr: string; // our paraphrase, not the official text
  sourceId: string;
}

export interface LevelText {
  summary: string; // 1-2 sentences
  function: string; // what it does, at this level
  details: string[]; // short bullet facts; empty for 'temel' where the program limits detail
}

export interface OrganelleInfo {
  id: string; // asset id, matches public/models/organelles/<id>.glb
  nameTr: string;
  nameEn: string;
  tagline: string; // short Turkish phrase, e.g. 'Hücrenin yönetim merkezi'
  sizeUm: string; // Turkish display text, e.g. '5–10 µm'
  location: string; // Turkish display text
  visibleInLightMicroscope: boolean;
  /** Levels this organelle appears in; bacterial structures are 'ileri' only. */
  levels: LevelId[];
  text: Partial<Record<LevelId, LevelText>>;
  funFact?: string;
  kazanimIds: string[]; // every id must exist in kazanimlar
  sourceIds: string[]; // at least one; every id must exist in sources
  /** Hex colour of the legend dot in the organelle list. */
  color: string;
}

export interface PlacementRule {
  organelleId: string;
  count: number;
  zone: PlacementZone;
  scale?: [number, number, number]; // non-uniform scale on the authored size; default [1,1,1]
}

export interface CellInfo {
  id: CellTypeId;
  nameTr: string;
  kind: 'ökaryot' | 'prokaryot';
  tagline: string;
  levels: LevelId[];
  text: Partial<Record<LevelId, { summary: string; details: string[] }>>;
  /** Half-extents of the shell in scene units (micrometres). */
  shell: { shape: 'ellipsoid' | 'rounded-box' | 'capsule'; halfExtents: [number, number, number] };
  placements: PlacementRule[];
  /** Organelle ids that make up the shell parts that are themselves selectable (membrane, wall). */
  shellOrganelleIds: string[];
  kazanimIds: string[];
  sourceIds: string[];
  micrographIds: string[];
}

export interface Micrograph {
  id: string;
  cellId?: CellTypeId;
  organelleId?: string;
  kind: 'light' | 'stained' | 'em';
  titleTr: string;
  file: string; // path under public/micrographs/
  pageUrl: string; // Commons file page
  author: string;
  license: string;
  sourceId: string;
}
