import { follow, type Anim } from './anim';
import type { Kit } from './kit';
import { classInfo, type Look } from './punnett';

export const PEA_YELLOW = '#f5c800';
export const PEA_GREEN = '#2f9a2a';

/** Colour of the blood drop (and the shirt) for a blood group; same as the chart series. */
const DROP: Record<string, string> = { A: classInfo('blood', 'grup-a').color, B: classInfo('blood', 'grup-b').color, AB: classInfo('blood', 'grup-ab').color, O: classInfo('blood', 'grup-o').color };
const SKIN = '#f7c9a0';

/** A pea seed (round or wrinkled) at a pose. */
export function addPea(kit: Kit, anim: Anim, look: { yellow: boolean; round: boolean }, radius: number): void {
  kit.shape({ shape: look.round ? 'sphere' : 'wrinkle', anim, size: [radius, radius, radius], color: look.yellow ? PEA_YELLOW : PEA_GREEN });
}

/**
 * A painted pea plant in a pot: curved stem, leaves, a pea flower and an open pod whose seeds show the phenotype
 * (yellow/green, round/wrinkled). About 2.8 units tall; the pivot is the middle of the stem.
 */
function plant(kit: Kit, anim: Anim, look: Extract<Look, { kind: 'pea' }>): void {
  const at = (dx: number, dy: number, dz = 0): Anim => follow(anim, dx, dy, dz);
  // pot with a cream band
  kit.shape({ shape: 'cyl', anim: at(0, -1.15), size: [0.6, 0.62, 0.6], color: '#e0703c' });
  kit.shape({ shape: 'cyl', anim: at(0, -1.2), size: [0.615, 0.1, 0.615], color: '#fbe3a8' });
  kit.shape({ shape: 'cyl', anim: at(0, -0.82), size: [0.7, 0.16, 0.7], color: '#c8552a' });
  kit.shape({ shape: 'cyl', anim: at(0, -0.74), size: [0.54, 0.05, 0.54], color: '#5b3d28' });
  // stem in two segments, leaning a little
  kit.shape({ shape: 'cyl', anim: at(0, -0.2), size: [0.06, 1.0, 0.06], color: '#3f9a32' });
  kit.shape({ shape: 'cyl', anim: at(0.04, 0.62), size: [0.055, 0.8, 0.055], color: '#4fae3c', rot: [0, 0, -0.1] });
  // leaves: darker lower pair, lighter upper pair, a leaf tip
  kit.shape({ shape: 'sphere', anim: at(-0.55, -0.32), size: [0.58, 0.12, 0.34], color: '#2f8f2c', rot: [0, 0, 0.42] });
  kit.shape({ shape: 'sphere', anim: at(0.55, -0.42), size: [0.58, 0.12, 0.34], color: '#3aa535', rot: [0, 0, -0.42] });
  kit.shape({ shape: 'sphere', anim: at(-0.46, 0.34), size: [0.46, 0.1, 0.28], color: '#58bd45', rot: [0, 0, 0.5] });
  kit.shape({ shape: 'sphere', anim: at(-0.04, 1.16), size: [0.2, 0.34, 0.1], color: '#5fc24a', rot: [0, 0, 0.1] });
  // the flower: two wing petals, a standard petal, a pink heart
  kit.shape({ shape: 'sphere', anim: at(0.17, 1.12, 0.05), size: [0.17, 0.2, 0.07], color: '#ffd3e4', rot: [0, 0, -0.5] });
  kit.shape({ shape: 'sphere', anim: at(0.34, 1.0, 0.05), size: [0.15, 0.18, 0.07], color: '#fff4f8', rot: [0, 0, 0.5] });
  kit.shape({ shape: 'sphere', anim: at(0.24, 1.04, 0.12), size: [0.06, 0.06, 0.06], color: '#ee5f9a' });
  // pod: darker back, paler front, four seeds
  kit.shape({ shape: 'cyl', anim: at(0.3, 0.74), size: [0.025, 0.5, 0.025], color: '#3f9a32', rot: [0, 0, -1.0] });
  kit.shape({ shape: 'sphere', anim: at(0.88, 0.36, -0.03), size: [0.86, 0.27, 0.2], color: '#7fc23a', rot: [0, 0, -0.18] });
  kit.shape({ shape: 'sphere', anim: at(0.88, 0.37, 0.05), size: [0.8, 0.2, 0.16], color: '#c8ea84', rot: [0, 0, -0.18] });
  for (let i = 0; i < 4; i++) addPea(kit, at(0.44 + i * 0.29, 0.41 - i * 0.052, 0.14), look, 0.17);
}

/** A friendly stylised person: big head, rosy cheeks, simple clothes (the shirt takes the blood-group colour). */
function person(kit: Kit, anim: Anim, look: Extract<Look, { kind: 'person' }>): void {
  const at = (dx: number, dy: number, dz = 0): Anim => follow(anim, dx, dy, dz);
  const group = look.blood !== undefined;
  const clothes = group ? (DROP[look.blood as string] as string) : look.male ? '#3f86d0' : '#e8639c';
  const hair = look.male ? '#4a2f1f' : '#8a4a24';
  if (look.male) {
    kit.shape({ shape: 'sphere', anim: at(0, -0.5), size: [0.46, 0.62, 0.34], color: clothes });
    kit.shape({ shape: 'cyl', anim: at(-0.18, -1.12), size: [0.15, 0.62, 0.15], color: '#3b4f8a' });
    kit.shape({ shape: 'cyl', anim: at(0.18, -1.12), size: [0.15, 0.62, 0.15], color: '#3b4f8a' });
  } else {
    kit.shape({ shape: 'cone', anim: at(0, -0.55), size: [0.78, 1.5, 0.58], color: clothes });
    kit.shape({ shape: 'sphere', anim: at(0, -0.3), size: [0.4, 0.5, 0.3], color: clothes });
  }
  // arms and head
  kit.shape({ shape: 'sphere', anim: at(-0.52, -0.42), size: [0.12, 0.34, 0.12], color: clothes, rot: [0, 0, 0.3] });
  kit.shape({ shape: 'sphere', anim: at(0.52, -0.42), size: [0.12, 0.34, 0.12], color: clothes, rot: [0, 0, -0.3] });
  kit.shape({ shape: 'sphere', anim: at(0, 0.62), size: [0.44, 0.44, 0.42], color: SKIN });
  kit.shape({ shape: 'sphere', anim: at(0, 0.84, -0.04), size: [0.47, 0.3, 0.44], color: hair });
  if (!look.male) {
    kit.shape({ shape: 'sphere', anim: at(-0.42, 0.72), size: [0.15, 0.15, 0.15], color: hair });
    kit.shape({ shape: 'sphere', anim: at(0.42, 0.72), size: [0.15, 0.15, 0.15], color: hair });
  }
  // face
  kit.shape({ shape: 'sphere', anim: at(-0.15, 0.66, 0.39), size: [0.055, 0.065, 0.05], color: '#33263d' });
  kit.shape({ shape: 'sphere', anim: at(0.15, 0.66, 0.39), size: [0.055, 0.065, 0.05], color: '#33263d' });
  kit.shape({ shape: 'sphere', anim: at(-0.27, 0.5, 0.33), size: [0.08, 0.06, 0.04], color: '#f58a96' });
  kit.shape({ shape: 'sphere', anim: at(0.27, 0.5, 0.33), size: [0.08, 0.06, 0.04], color: '#f58a96' });
  kit.shape({ shape: 'sphere', anim: at(0, 0.46, 0.4), size: [0.1, 0.035, 0.04], color: '#c0434f' });
  if (look.blood) {
    const c = DROP[look.blood] as string;
    kit.shape({ shape: 'sphere', anim: at(1.1, 0.0, 0.1), size: [0.42, 0.42, 0.42], color: c });
    kit.shape({ shape: 'cone', anim: at(1.1, 0.42, 0.1), size: [0.32, 0.6, 0.32], color: c });
    kit.tag({ anim: at(1.1, -0.02, 0.55), height: 0.5, alleles: [look.blood], style: { color: '#fffaf0', bg: null } });
  }
  if (look.vision) kit.tag({ anim: at(1.0, 0.7, 0.3), height: 0.62, badge: look.vision });
}

/** Adds the picture of an individual. `mini` leaves out the pot/pod and draws only the seeds (for Punnett squares). */
export function addOrganism(kit: Kit, look: Look, anim: Anim, mini = false): void {
  if (look.kind === 'person') return person(kit, anim, look);
  if (!mini) return plant(kit, anim, look);
  addPea(kit, follow(anim, -0.34, 0, 0.1), look, 0.3);
  addPea(kit, follow(anim, 0.34, 0.04, 0.1), look, 0.3);
}
