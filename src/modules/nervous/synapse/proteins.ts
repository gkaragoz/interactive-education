import { CapsuleGeometry, Group, SphereGeometry } from 'three';
import { makeChannel, type Channel } from '../action/channel';
import { paint } from '../geo';
import type { Kit } from '../kit';
import { COLORS } from '../palette';
import { ENZYME_Y, POST_X, PRE_X, REC_Y, CA_Y, TRANSPORTER_Y } from './model';

const Z = 0.62;

export interface SynapseProteins {
  ca: Channel[];
  receptors: Channel[];
  /** Enzyme bodies (they pulse when they break a molecule down). */
  enzymes: Group[];
}

function place(kit: Kit, kind: 'na' | 'k', x: number, y: number, rot: number, scale: number, look: { color: string; id: string }): { ch: Channel; g: Group } {
  const g = new Group();
  g.position.set(x, y, Z);
  g.rotation.z = rot;
  g.scale.setScalar(scale);
  kit.root.add(g);
  kit.track({ dispose: () => g.removeFromParent() });
  return { ch: makeChannel(kit, kind, g, look), g };
}

/** The membrane proteins of the synapse: Ca2+ channels and reuptake transporters (terminal), receptor-gated channels and enzymes (receiving cell). */
export function buildProteins(kit: Kit): SynapseProteins {
  const toCleftPre = -Math.PI / 2; // +y of a protein points at the cleft
  const toCleftPost = Math.PI / 2;
  const ca = CA_Y.map(
    (y) =>
      place(kit, 'k', PRE_X, y, toCleftPre, 0.6, {
        color: '#e8b84a',
        id: 'nv-ca-channel',
      }).ch,
  );
  for (const y of TRANSPORTER_Y)
    place(kit, 'k', PRE_X, y, toCleftPre, 0.5, {
      color: '#b58cd6',
      id: 'nv-transporter',
    });
  const receptors = REC_Y.map((y) => {
    const { ch, g } = place(kit, 'k', POST_X, y, toCleftPost, 0.78, {
      color: '#5fb8a8',
      id: 'nv-lig-channel',
    });
    // receptor cup on the cleft side: two arms that hold the transmitter
    const mat = kit.clay('nv-lig-channel');
    for (const sx of [-1, 1]) {
      const arm = kit.mesh(paint(new CapsuleGeometry(0.11, 0.55, 4, 8), '#5fb8a8', 0.15), mat, g);
      arm.position.set(sx * 0.62, 1.2, 0);
      arm.rotation.z = -sx * 0.5;
    }
    return ch;
  });
  const enzymes = ENZYME_Y.map((y) => {
    const g = new Group();
    g.position.set(POST_X - 0.95, y, Z);
    kit.root.add(g);
    kit.track({ dispose: () => g.removeFromParent() });
    const mat = kit.clay('nv-enzyme');
    kit.mesh(paint(new SphereGeometry(0.5, 18, 14), COLORS.enzyme, 0.2), mat, g);
    const mouth = kit.mesh(paint(new SphereGeometry(0.24, 12, 10), '#7a3f12', 0.1), mat, g);
    mouth.position.set(-0.36, 0, 0.22);
    return g;
  });
  return { ca, receptors, enzymes };
}
