import type { OrganelleInfo } from './types';
import { eukaryoteOrganelles } from './organelles-eukaryote';
import { prokaryoteOrganelles } from './organelles-prokaryote';
import { shellOrganelles } from './organelles-shells';

/** One entry for every asset id in docs/ASSETS.md (organelles and shells). */
export const organelles: OrganelleInfo[] = [...eukaryoteOrganelles, ...prokaryoteOrganelles, ...shellOrganelles];
