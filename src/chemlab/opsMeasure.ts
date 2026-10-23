/**
 * Measuring operations: balance (0.01 g, tare), graduated reading and pH paper.
 * Balance: https://en.wikipedia.org/wiki/Laboratory_balance ; graduated cylinder reading to its smallest division:
 * https://en.wikipedia.org/wiki/Graduated_cylinder ; pH paper gives a whole number from a colour chart:
 * https://en.wikipedia.org/wiki/PH_indicator and https://en.wikipedia.org/wiki/Universal_indicator
 */
import { colourNameTr } from './colors';
import type { LabCore } from './core';
import { indicatorColor } from './indicators';
import type { OpResult } from './labTypes';
import { totalMass, volumeMl, vesselPh, VESSEL_SPECS } from './vessel';

const fail = (messageTr: string): OpResult => ({ ok: false, messageTr });
const done = (core: LabCore, op: string, vessel?: string): void => {
  core.done.push({ op, vessel });
};
const round = (x: number, step: number): number => Math.round(x / step) * step;

export function place(core: LabCore, vessel: string | null): OpResult {
  if (vessel !== null && !core.vessel(vessel)) return fail(`Bilinmeyen kap: ${vessel}`);
  core.balance = { vesselId: vessel, tare: 0 };
  if (vessel) {
    core.journal('action', `${core.vessel(vessel)?.labelTr ?? vessel} teraziye konuldu.`, vessel);
    done(core, 'place', vessel);
  }
  return { ok: true };
}

export function tare(core: LabCore): OpResult {
  const id = core.balance.vesselId;
  const v = id ? core.vessel(id) : undefined;
  if (!v) return fail('Terazide kap yok.');
  core.balance.tare = totalMass(v);
  core.journal('action', 'Terazi sıfırlandı (dara).', v.id);
  done(core, 'tare', v.id);
  return { ok: true, value: 0 };
}

/** Balance reading in grams, 0.01 g resolution. A vessel that is not on the balance is weighed absolutely. */
export function weigh(core: LabCore, vessel: string): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  const tareG = core.balance.vesselId === vessel ? core.balance.tare : 0;
  const reading = round(totalMass(v) - tareG, 0.01);
  core.journal('measurement', `${v.labelTr} tartıldı: ${reading.toFixed(2)} g.`, v.id);
  done(core, 'weigh', v.id);
  return { ok: true, value: Number(reading.toFixed(2)) };
}

export function readVolume(core: LabCore, vessel: string): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  const res = VESSEL_SPECS[v.kind].resolutionMl;
  const reading = round(volumeMl(v), res);
  core.journal('measurement', `${v.labelTr} içindeki sıvı: yaklaşık ${reading} mL.`, v.id);
  return { ok: true, value: reading };
}

export function dip(core: LabCore, strip: 'universal-strip' | 'litmus-paper', vessel: string): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  const ph = vesselPh(v);
  if (ph === null) return fail(`${v.labelTr} içinde sıvı yok.`);
  if (strip === 'litmus-paper') {
    const colour = ph < 5 ? 'kırmızı (asidik)' : ph > 8 ? 'mavi (bazik)' : 'mor-mavi arası (nötre yakın)';
    core.journal('measurement', `Turnusol kâğıdı ${colour} oldu.`, v.id);
    done(core, 'dip', v.id);
    return { ok: true, value: ph };
  }
  const reading = Math.min(13, Math.max(1, Math.round(ph)));
  const rgb = indicatorColor('universal', reading);
  core.journal('measurement', `pH kâğıdı ${colourNameTr(rgb)} renk aldı: pH yaklaşık ${reading} (kâğıt tam sayı verir).`, v.id);
  done(core, 'dip', v.id);
  return { ok: true, value: reading };
}

