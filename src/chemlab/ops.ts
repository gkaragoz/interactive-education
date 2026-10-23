/**
 * Learner operations on the bench: pour, add, drop, heat, filter, close, weigh, dip... Each returns an OpResult and writes
 * a Turkish Defter line. Volume limits: pouring beyond the capacity spills the excess onto the bench (and says so).
 * Measuring: balance 0.01 g (https://en.wikipedia.org/wiki/Laboratory_balance), cylinder reading to its smallest division
 * (https://en.wikipedia.org/wiki/Graduated_cylinder), burette 0.05 mL steps (https://en.wikipedia.org/wiki/Burette),
 * drops of 0.05 mL (https://en.wikipedia.org/wiki/Drop_(unit)). Buoyancy of balloons on the balance is ignored.
 */
import type { LabCore } from './core';
import { checkCombination, checkElectrolysis, checkHeating, type HazardBlock } from './hazards';
import type { OpResult } from './labTypes';
import { addTo, heatCapacity, liquidVolumeMl, mixMass } from './mixture';
import { DROP_ML, getReagent, type Portion } from './reagents';
import type { Mix } from './species';
import { speciesOf } from './species';
import {
  catalystMass, volumeMl, vesselPh, VESSEL_SPECS, type Closure, type HeatSource, type Vessel,
} from './vessel';

const fail = (messageTr: string): OpResult => ({ ok: false, messageTr });
const refuse = (core: LabCore, v: Vessel | undefined, b: HazardBlock): OpResult => {
  core.journal('blocked', `${b.titleTr}. ${b.messageTr}`, v?.id);
  core.event('blocked', v?.id ?? '');
  return { ok: false, blocked: b, messageTr: b.messageTr };
};
const done = (core: LabCore, op: string, vessel?: string): void => {
  core.done.push({ op, vessel });
};
const round = (x: number, step: number): number => Math.round(x / step) * step;

function mergePortion(v: Vessel, p: Portion, tempC: number): void {
  const cNew = heatCapacity(p.mix, 0, 0) + 1e-9;
  const cOld = heatCapacity(v.mix, catalystMass(v), 0) + VESSEL_SPECS[v.kind].glassG * VESSEL_SPECS[v.kind].glassCp;
  v.tempC = (cOld * v.tempC + cNew * tempC) / (cOld + cNew);
  for (const [k, n] of Object.entries(p.mix)) addTo(v.mix, k, n);
  for (const [k, ml] of Object.entries(p.indicators)) v.indicators[k] = (v.indicators[k] ?? 0) + ml;
  for (const [k, g] of Object.entries(p.catalysts)) v.catalysts[k] = (v.catalysts[k] ?? 0) + g;
  v.agitation = Math.max(v.agitation, 0.6);
}

/** Scales a portion down to the room left in `to`; the rest spills. Returns the kept fraction. */
function fitToCapacity(core: LabCore, to: Vessel, p: Portion): number {
  const pv = liquidVolumeMl(p.mix);
  const room = Math.max(0, VESSEL_SPECS[to.kind].capacityMl - volumeMl(to));
  if (pv <= room + 1e-9 || pv <= 0) return 1;
  const keep = room / pv;
  const lost: Mix = {};
  for (const [k, n] of Object.entries(p.mix)) {
    lost[k] = n * (1 - keep);
    p.mix[k] = n * keep;
  }
  for (const k of Object.keys(p.indicators)) p.indicators[k] = (p.indicators[k] ?? 0) * keep;
  core.ledger.spilled += mixMass(lost);
  core.event('spill', to.id, pv - room);
  core.journal('warning', `${to.labelTr} doldu, ${(pv - room).toFixed(1)} mL sıvı masaya taştı.`, to.id);
  return keep;
}

function ensureOpen(v: Vessel): string | null {
  if (VESSEL_SPECS[v.kind].gasTight) return null;
  if (v.closure !== 'none') return `${v.labelTr} kapalı; önce kapağı veya balonu çıkar.`;
  return null;
}

export function pour(core: LabCore, from: string, to: string, mL: number, resolution = 0): OpResult {
  const target = core.vessel(to);
  if (!target) return fail(`Bilinmeyen kap: ${to}`);
  if (!(mL > 0) || !Number.isFinite(mL)) return fail('Miktar sıfırdan büyük olmalı.');
  const closed = ensureOpen(target);
  if (closed) return fail(closed);
  const src = core.vessel(from);
  const amountMl = resolution > 0 ? round(mL, resolution) : mL;
  let portion: Portion;
  let tFrom = core.ambientC;
  let label: string;
  let takeFraction = 0;
  if (src) {
    if (src.id === target.id) return fail('Bir kabı kendi içine dökemezsin.');
    const vol = volumeMl(src);
    if (vol <= 0) return fail(`${src.labelTr} boş.`);
    const ml = Math.min(amountMl, vol);
    takeFraction = ml / vol;
    portion = { mix: {}, indicators: {}, catalysts: {} };
    for (const [k, n] of Object.entries(src.mix)) {
      const sp = speciesOf(k);
      if (sp.phase === 'aq') portion.mix[k] = n * takeFraction;
      else if (sp.phase === 's' && sp.powder) portion.mix[k] = n * takeFraction * (0.1 + 0.9 * src.agitation);
    }
    for (const [k, ml2] of Object.entries(src.indicators)) portion.indicators[k] = ml2 * takeFraction;
    for (const [k, g] of Object.entries(src.catalysts)) portion.catalysts[k] = g * takeFraction;
    tFrom = src.tempC;
    label = src.labelTr;
  } else {
    const r = getReagent(from);
    if (!r || r.unit !== 'mL') return fail(`Bilinmeyen sıvı veya kap: ${from}`);
    portion = r.build(amountMl);
    label = r.nameTr;
  }
  const block = checkCombination(target.mix, portion.mix);
  if (block) return refuse(core, target, block);
  if (src) {
    for (const [k, n] of Object.entries(portion.mix)) addTo(src.mix, k, -n);
    for (const [k, ml2] of Object.entries(portion.indicators)) src.indicators[k] = Math.max(0, (src.indicators[k] ?? 0) - ml2);
    for (const [k, g] of Object.entries(portion.catalysts)) src.catalysts[k] = Math.max(0, (src.catalysts[k] ?? 0) - g);
  } else {
    core.ledger.supplied += mixMass(portion.mix) + Object.values(portion.catalysts).reduce((a, b) => a + b, 0);
  }
  fitToCapacity(core, target, portion);
  mergePortion(target, portion, tFrom);
  const shown = liquidVolumeMl(portion.mix);
  core.event('pour', target.id, shown);
  core.journal('action', `${shown.toFixed(resolution > 0 && resolution < 1 ? 2 : 1)} mL ${label} ${target.labelTr} içine eklendi.`, target.id);
  done(core, 'pour', target.id);
  return { ok: true, value: shown };
}

export function dispense(core: LabCore, burette: string, to: string, mL: number): OpResult {
  const b = core.vessel(burette);
  if (!b || b.kind !== 'burette25') return fail('Damlatma için büret gerekir.');
  const r = pour(core, burette, to, mL, 0.05);
  if (r.ok) {
    const flask = core.vessel(to);
    const prev = core.titration.length > 0 ? (core.titration[core.titration.length - 1]?.ml ?? 0) : 0;
    const ph = flask ? vesselPh(flask) : null;
    if (ph !== null) core.titration.push({ ml: prev + (r.value ?? 0), ph });
    done(core, 'dispense', to);
  }
  return r;
}

export function add(core: LabCore, reagent: string, to: string, grams: number, powder = false): OpResult {
  const v = core.vessel(to);
  const r = getReagent(reagent);
  if (!v) return fail(`Bilinmeyen kap: ${to}`);
  if (!r || r.unit !== 'g') return fail(`${reagent} katı olarak eklenemez.`);
  if (!(grams > 0) || !Number.isFinite(grams)) return fail('Miktar sıfırdan büyük olmalı.');
  const closed = ensureOpen(v);
  if (closed) return fail(closed);
  const g = round(grams, 0.001);
  const p = r.build(g, powder);
  const block = checkCombination(v.mix, p.mix);
  if (block) return refuse(core, v, block);
  core.ledger.supplied += mixMass(p.mix) + Object.values(p.catalysts).reduce((a, b) => a + b, 0);
  mergePortion(v, p, core.ambientC);
  v.agitation = Math.max(v.agitation, 0.3);
  core.journal('action', `${g.toFixed(2)} g ${r.nameTr}${powder ? ' (toz)' : ''} ${v.labelTr} içine eklendi.`, v.id);
  done(core, 'add', v.id);
  return { ok: true, value: g };
}

export function drop(core: LabCore, reagent: string, to: string, n: number): OpResult {
  const r = getReagent(reagent);
  if (!r || r.unit !== 'mL') return fail(`${reagent} damlatılamaz.`);
  if (!(n >= 1) || !Number.isFinite(n)) return fail('Damla sayısı en az 1 olmalı.');
  const ml = n * DROP_ML * (1 + 0.04 * (core.random() - 0.5));
  const res = pour(core, reagent, to, ml);
  if (res.ok) done(core, 'drop', to);
  return res;
}

export function heat(core: LabCore, vessel: string, source: HeatSource | null): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  if (source === null) {
    v.heat = null;
    core.journal('action', `${v.labelTr} ısıtması kapatıldı.`, v.id);
    return { ok: true };
  }
  const block = checkHeating(v, source);
  if (block) return refuse(core, v, block);
  v.heat = source;
  v.iceBath = false;
  core.journal('action', `${v.labelTr} ısıtılmaya başlandı.`, v.id);
  done(core, 'heat', v.id);
  return { ok: true };
}

export function cool(core: LabCore, vessel: string, on: boolean): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  v.iceBath = on;
  if (on) v.heat = null;
  core.journal('action', on ? `${v.labelTr} buzlu su banyosuna konuldu.` : `${v.labelTr} buz banyosundan alındı.`, v.id);
  if (on) done(core, 'cool', v.id);
  return { ok: true };
}

export function stir(core: LabCore, vessel: string, on: boolean): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  v.stirring = on;
  if (on) v.agitation = 1;
  core.journal('action', on ? `${v.labelTr} karıştırılıyor.` : `${v.labelTr} karıştırması durdu.`, v.id);
  if (on) done(core, 'stir', v.id);
  return { ok: true };
}

export function filter(core: LabCore, from: string, to: string): OpResult {
  const f = core.vessel(from);
  const t = core.vessel(to);
  if (!f || !t) return fail('Bilinmeyen kap.');
  if (f.kind !== 'funnel') return fail('Süzmek için süzgeç kâğıtlı huni gerekir.');
  if (f.id === t.id) return fail('Huni ile alıcı kap farklı olmalı.');
  const vol = volumeMl(f);
  if (vol <= 0) return fail('Hunide süzülecek sıvı yok.');
  const p: Portion = { mix: {}, indicators: { ...f.indicators }, catalysts: {} };
  for (const [k, n] of Object.entries(f.mix)) if (speciesOf(k).phase === 'aq') p.mix[k] = n;
  for (const k of Object.keys(p.mix)) delete f.mix[k];
  f.indicators = {};
  fitToCapacity(core, t, p);
  mergePortion(t, p, f.tempC);
  core.journal('action', `${f.labelTr} süzüldü: sıvı (süzüntü) ${t.labelTr} içine aktı, katı süzgeç kâğıdında kaldı.`, t.id);
  done(core, 'filter', t.id);
  return { ok: true, value: liquidVolumeMl(p.mix) };
}

export function close(core: LabCore, vessel: string, closure: Closure): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  if (VESSEL_SPECS[v.kind].gasTight) return fail('Bu kap zaten gaz geçirmez.');
  if (closure !== 'none' && v.heat) return refuse(core, v, { id: 'heat-closed', titleTr: 'Kapalı kap ısıtılmaz', messageTr: 'Isıtılan kabı kapatma; önce ısıtmayı kapat.' });
  v.closure = closure;
  const text = closure === 'balloon' ? 'ağzına balon takıldı' : closure === 'stopper' ? 'tıpayla kapatıldı' : 'açıldı';
  core.journal('action', `${v.labelTr} ${text}.`, v.id);
  done(core, closure === 'none' ? 'open' : 'close', v.id);
  return { ok: true };
}

export function lid(core: LabCore, vessel: string, open: boolean): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  v.lidOpen = open;
  core.journal('action', `${v.labelTr} kapağı ${open ? 'aralandı' : 'kapatıldı'}.`, v.id);
  done(core, 'lid', v.id);
  return { ok: true };
}

export function gasline(core: LabCore, from: string, to: string | null): OpResult {
  const f = core.vessel(from);
  if (!f) return fail(`Bilinmeyen kap: ${from}`);
  if (to !== null && !core.vessel(to)) return fail(`Bilinmeyen kap: ${to}`);
  f.gasTo = to;
  core.journal('action', to ? `${f.labelTr} gaz hortumu ${core.vessel(to)?.labelTr ?? to} kabına bağlandı.` : `${f.labelTr} gaz hortumu söküldü.`, f.id);
  if (to) done(core, 'gasline', f.id);
  return { ok: true };
}

export function ignite(core: LabCore, vessel: string): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  v.ignition = 0.3;
  core.journal('action', `${v.labelTr} ağzına yanan çıra tutuldu.`, v.id);
  done(core, 'ignite', v.id);
  return { ok: true };
}

export function electrodes(core: LabCore, vessel: string, volts: number | null): OpResult {
  const v = core.vessel(vessel);
  if (!v) return fail(`Bilinmeyen kap: ${vessel}`);
  if (volts === null) {
    v.electrodes = null;
    core.journal('action', `${v.labelTr} elektrotlarının bağlantısı kesildi.`, v.id);
    return { ok: true };
  }
  if (!VESSEL_SPECS[v.kind].electrodes) return fail('Bu kapta elektrot yok.');
  if (!(volts > 0) || volts > 24) return fail('Gerilim 0 ile 24 V arasında olmalı.');
  const block = checkElectrolysis(v.mix);
  if (block) return refuse(core, v, block);
  v.electrodes = { volts };
  core.journal('action', `${v.labelTr} elektrotları ${volts} V doğru akım kaynağına bağlandı.`, v.id);
  done(core, 'electrodes', v.id);
  return { ok: true };
}

export { place, tare, weigh, readVolume, dip } from './opsMeasure';
