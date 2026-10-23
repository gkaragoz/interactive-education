import { CylinderGeometry, Group, type Object3D } from 'three';
import type { ModuleLabel } from '../../../scene';
import { paint } from '../geo';
import type { Kit, TrackRig } from '../kit';
import { cameraPath, ramp } from '../math';
import { makeAssetChannel, type Channel } from './channel';
import { buildIons } from './ions';
import { buildCharges, buildLipids, buildWaveGlow, WALL } from './membrane';
import { AP_DURATION, LAG, WAVE_X0, K_DX, NA_DX, PUMP_DX, SITES, kGate, kState, localTime, naActivation, naInactivation, naState, vmAt, type ChannelState } from './model';

const PIPETTE_X = -8.6;
const STATE_TR: Record<ChannelState, string> = {
  closed: 'kapalı',
  open: 'açık',
  inactivated: 'kapanmış (etkisiz)',
};
const minus = (v: number): string => (v < 0 ? '−' : '') + Math.abs(Math.round(v));

const cp = (x: number, y: number, d: number): { pos: [number, number, number]; target: [number, number, number] } => {
  const tx = x;
  const ty = y;
  return { pos: [tx + 0.05 * d, ty + 0.04 * d, d * 1.1], target: [tx, ty, 0] };
};

/** Action potential: a cut-away axon with two membranes, Na+/K+ channels with visible gates, pumps, ions and charge markers. */
export async function createAxon(kit: Kit): Promise<TrackRig> {
  // backdrop: warm cytoplasm between the walls, cool outside above and below
  kit.band(-24, 24, -WALL + 0.5, WALL - 0.5, -4.3, [
    [0, 'rgba(250,214,130,0.95)'],
    [0.5, 'rgba(250,228,160,0.95)'],
    [1, 'rgba(250,214,130,0.95)'],
  ]);
  kit.band(-24, 24, WALL + 0.5, 9, -4.3, [
    [0, 'rgba(140,196,206,0.9)'],
    [1, 'rgba(74,150,176,0.92)'],
  ]);
  kit.band(-24, 24, -9, -WALL - 0.5, -4.3, [
    [0, 'rgba(74,150,176,0.92)'],
    [1, 'rgba(140,196,206,0.9)'],
  ]);

  const holes = [{ x: PIPETTE_X, r: 0.45 }];
  const channels: { ch: Channel; kind: 'na' | 'k'; x: number }[] = [];
  const pumps: { model: Object3D; x: number }[] = [];
  for (const sx of SITES) {
    holes.push({ x: sx + NA_DX, r: 0.95 }, { x: sx + K_DX, r: 0.95 }, { x: sx + PUMP_DX, r: 1.1 });
  }
  buildLipids(kit, holes);
  for (const sx of SITES) {
    for (const w of [1, -1]) {
      for (const [kind, dx] of [
        ['na', NA_DX],
        ['k', K_DX],
      ] as const) {
        const g = new Group();
        g.position.set(sx + dx, w * WALL, 0);
        g.rotation.z = w === 1 ? 0 : Math.PI;
        kit.root.add(g);
        kit.track({ dispose: () => g.removeFromParent() });
        channels.push({
          ch: await makeAssetChannel(kit, kind, g),
          kind,
          x: sx,
        });
      }
      const pg = new Group();
      pg.position.set(sx + PUMP_DX, w * WALL, 0);
      pg.rotation.z = w === 1 ? 0 : Math.PI;
      kit.root.add(pg);
      kit.track({ dispose: () => pg.removeFromParent() });
      const model = await kit.ctx.assets.loadGlb('pump-protein');
      pg.add(model);
      pumps.push({ model, x: sx });
    }
  }

  // the electrode: stimulates and records at the left end (no delay there)
  const pip = kit.mesh(paint(new CylinderGeometry(0.1, 0.03, 7.2, 8), '#8ea6bd', 0.2), kit.clay('nv-pipette'));
  pip.position.set(PIPETTE_X, 0.6 + 3.6, 0.3);
  const tipGlow = kit.sprite('#ff9a30', 2.4, 0, false);
  tipGlow.position.set(PIPETTE_X, 0.7, 0.4);

  const charges = buildCharges(kit);
  const glow = buildWaveGlow(kit);
  const ions = buildIons(kit);

  const seek = (t: number): void => {
    for (const c of channels) {
      const tau = localTime(c.x, t);
      if (c.kind === 'na') c.ch.set(naActivation(tau), naInactivation(tau));
      else c.ch.set(kGate(tau), 0);
    }
    for (const p of pumps) {
      const tau = localTime(p.x, t);
      const c = ramp(tau, 28.8, 29.8) - ramp(tau, 33.6, 34.6);
      p.model.rotation.z = 0.07 * Math.sin((tau - 29) * 2.4) * c;
      p.model.scale.y = 1 - 0.03 * c;
    }
    (tipGlow.material as { opacity: number }).opacity = 0.9 * (ramp(t, 5.8, 7) - ramp(t, 9, 9.8));
    charges.set(t);
    glow.set(t);
    ions.at(t);
  };

  const sx0 = SITES[0];
  const cam = cameraPath([
    { t: 0, ...cp(-3, 1.0, 17.5) },
    { t: 8, ...cp(-5.2, 1.0, 15.5) },
    { t: 14, ...cp(-3, 1.0, 16.5) },
    { t: 20, ...cp(0.5, 1.0, 17.5) },
    { t: 26, ...cp(3.8, 1.0, 17.5) },
    { t: 30.5, ...cp(1.5, 1.0, 15.5) },
    { t: 36, ...cp(0, 1.0, 21) },
  ]);

  const labels = (t: number): ModuleLabel[] => {
    const out: ModuleLabel[] = [];
    const add = (on: boolean, text: string, world: [number, number, number], id: string): void => {
      if (on) out.push({ text, world, anchorId: id });
    };
    const tau = localTime(sx0, t);
    add(true, `${minus(vmAt(t))} mV`, [PIPETTE_X, 8.1, 0.5], 'volt');
    add(t < 7, 'Hücre dışı', [-1.5, 4.3, 0.4], 'outside');
    add(t < 7, 'Hücre içi (akson)', [-1.5, 0.0, 0.9], 'inside');
    add(true, 'Na⁺', ions.ref('na', t), 'ion-na');
    add(true, 'K⁺', ions.ref('k', t), 'ion-k');
    add(t >= 5.8 && t < 9.6, 'Uyaran', [PIPETTE_X + 1.4, 1.4, 0.5], 'stim');
    add(t >= 8 && t < 29.5, `Na⁺ kanalı: ${STATE_TR[naState(tau)]}`, [sx0 + NA_DX + 0.2, 0.55, 0.9], 'na');
    add(t >= 14.5 && t < 29.5, `K⁺ kanalı: ${STATE_TR[kState(tau)]}`, [sx0 + K_DX + 1.0, -0.55, 0.9], 'k');
    const front = Math.min(9.6, WAVE_X0 + (t - 9) / LAG);
    add(t >= 10 && t < 27, 'Dalga bu yönde ilerler →', [front, 0.3, 1.0], 'wave');
    add(t >= 28.5 && t < 35, 'Na⁺/K⁺ pompası', [sx0 + PUMP_DX, 4.4, 0.5], 'pump');
    return out;
  };

  return {
    duration: AP_DURATION,
    seek,
    cameraAt: (t) => cam(t),
    labelsAt: labels,
    chartAt: (t) => ({ 'membran-potansiyeli': vmAt(t) }),
    dispose: () => undefined,
  };
}
