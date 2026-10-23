/**
 * One fixed simulation step for a vessel: heating/cooling, boiling, electrolysis, dissolution and precipitation,
 * reactions, gas handling, foam, agitation and observation notes. Order is fixed so the result is deterministic.
 * Energy balance lite: dT = Q / C with C from heatCapacity() (water 4.18 J/(g K)); Newton cooling towards the room
 * (time constant 15 min in air, 90 s in an ice bath, our values: https://en.wikipedia.org/wiki/Newton%27s_law_of_cooling);
 * boiling holds the temperature at 100 degC and turns the extra energy into steam with the heat of vaporisation
 * 40.66 kJ/mol (https://en.wikipedia.org/wiki/Enthalpy_of_vaporization). Sparingly soluble precipitates settle unless stirred.
 */
import type { LabCore } from './core';
import { colourNameTr, liquidRgb, rgbDistance } from './colors';
import { stepElectrolysis } from './electrolysis';
import { stepGas, updateFoam } from './gas';
import { addTo, amount, isSane, solidMol } from './mixture';
import { stepReactions } from './reactions';
import { ACID_BASE_RULES } from './rulesAcidBase';
import { MISC_RULES } from './rulesMisc';
import { REDOX_RULES } from './rulesRedox';
import { equilibrate, saturation } from './solubility';
import { getSubstance } from './substances';
import { HEAT_SOURCES, VESSEL_SPECS, vesselHeatCapacity, volumeMl, type Vessel } from './vessel';
import type { ReactionRule } from './reactions';

export const ALL_RULES: readonly ReactionRule[] = [...ACID_BASE_RULES, ...REDOX_RULES, ...MISC_RULES];
export const MAX_TEMP_C = 3200;
const L_VAP = 40660; // J/mol

function applyHeat(v: Vessel, joules: number): void {
  if (joules === 0 || !Number.isFinite(joules)) return;
  const c = vesselHeatCapacity(v);
  v.tempC = Math.min(MAX_TEMP_C, Math.max(-50, v.tempC + joules / c));
}

function thermal(core: LabCore, v: Vessel, dt: number): void {
  if (v.heat) {
    const h = HEAT_SOURCES[v.heat];
    const room = Math.max(0, (h.maxC - v.tempC) / (h.maxC - core.ambientC));
    applyHeat(v, h.watts * room * dt);
  }
  const target = v.iceBath ? 0.5 : core.ambientC;
  const tau = v.iceBath ? 90 : 900;
  v.tempC = target + (v.tempC - target) * Math.exp(-dt / tau);
  const water = amount(v.mix, 'water');
  if (v.tempC > 100 && water > 0) {
    const nEvap = Math.min(water, ((v.tempC - 100) * vesselHeatCapacity(v)) / L_VAP);
    addTo(v.mix, 'water', -nEvap);
    core.ledger.escaped += nEvap * 18.015;
    v.tempC = water - nEvap > 1e-9 ? 100 : Math.min(MAX_TEMP_C, v.tempC);
    if (!v.seen.includes('boil')) core.event('boil', v.id);
    core.observe(v, 'boil', 'temperature', 'Su kaynıyor: buhar çıkıyor, sıcaklık 100 °C civarında sabit kalıyor.');
  }
}

function observeEquilibrium(core: LabCore, v: Vessel, res: ReturnType<typeof equilibrate>): void {
  for (const id of res.precipitated) {
    const sub = getSubstance(id);
    if (!sub) continue;
    v.seen = v.seen.filter((s) => s !== `dissolved:${id}`);
    core.observe(v, `precip:${id}`, 'precipitate', `Çökelek oluştu (${colourNameTr(sub.rgb)} katı): ${sub.nameTr}. Karışımdan yeni bir katı madde ayrıldı.`);
  }
  for (const id of res.crystallised) {
    const sub = getSubstance(id);
    if (!sub) continue;
    v.seen = v.seen.filter((s) => s !== `dissolved:${id}`);
    core.observe(v, `cryst:${id}`, 'precipitate', `Kristaller oluştu: ${sub.nameTr}. Çözelti, çözebileceğinden fazlasını tutamıyor.`);
  }
  for (const id of res.dissolved) {
    const sub = getSubstance(id);
    if (!sub) continue;
    v.seen = v.seen.filter((s) => s !== `precip:${id}` && s !== `cryst:${id}`);
    if (solidMol(v.mix, id) < 1e-9) core.observe(v, `dissolved:${id}`, 'dissolve', `${sub.nameTr} tamamen çözündü.`);
    else if (saturation(v, id) > 0.985) core.observe(v, `saturated:${id}`, 'dissolve', `Çözelti doygun: dipte çözünmeyen ${sub.nameTr.toLowerCase()} kaldı.`);
  }
}

/** An empty vessel at room temperature with nothing attached does not need simulating. */
function isIdle(v: Vessel, ambientC: number): boolean {
  if (Object.keys(v.mix).length > 0) return false;
  return v.heat === null && !v.iceBath && v.electrodes === null && v.gasTo === null && Math.abs(v.tempC - ambientC) < 0.01 && v.foam === 0;
}

export function stepVessel(core: LabCore, v: Vessel, dt: number, vessels: ReadonlyMap<string, Vessel>): void {
  if (isIdle(v, core.ambientC)) {
    v.agitation = 0;
    v.flash = Math.max(0, v.flash - dt * 2);
    v.ignition = Math.max(0, v.ignition - dt);
    return;
  }
  const ctx = core.ctx();
  thermal(core, v, dt);
  const el = stepElectrolysis(v, dt);
  if (el.limbFull) core.observe(v, 'limb-full', 'gas', 'Katot tüpü gazla doldu; elektroliz durdu.');
  if (el.currentA > 0) {
    applyHeat(v, el.heatJ);
    core.observe(v, 'electro', 'gas', 'Elektrotlarda kabarcıklar çıkıyor: su ayrışıyor.');
  }
  const eq1 = equilibrate(v, dt);
  applyHeat(v, eq1.heatJ);
  observeEquilibrium(core, v, eq1);
  const rx = stepReactions(ALL_RULES, v, dt, ctx);
  applyHeat(v, rx.heatJ);
  if (rx.fired) {
    const eq2 = equilibrate(v, dt);
    applyHeat(v, eq2.heatJ);
    observeEquilibrium(core, v, eq2);
  }
  const produced = rx.gasMol + (el.currentA > 0 ? ((el.currentA * dt) / 96485) * 0.75 : 0);
  v.gasRate = v.gasRate * Math.exp(-dt / 2) + (produced / dt) * (1 - Math.exp(-dt / 2));
  v.foam = updateFoam(v, produced, dt);
  if (v.foam > 0 && v.foam + volumeMl(v) > VESSEL_SPECS[v.kind].capacityMl) core.observe(v, 'foam-over', 'foam', 'Köpük kabın ağzına ulaştı ve taşıyor.');
  else if (v.foam > 5) core.observe(v, 'foam', 'foam', 'Sabunlu karışımda gaz kabarcıkları köpük oluşturuyor.');
  const g = stepGas(v, dt, vessels);
  core.ledger.escaped += g.escapedG;
  if (g.popped) {
    core.event('pop', v.id);
    core.observe(v, 'stopper-pop', 'safety', 'Kapak fırladı! Kapalı kapta gaz birikince basınç arttı. Gaz çıkaran tepkimeler kapalı şişede yapılmaz.');
  }
  v.agitation = v.stirring ? 1 : v.agitation * Math.exp(-dt / 8);
  v.ignition = Math.max(0, v.ignition - dt);
  v.flash = Math.max(0, v.flash - dt * 2);
  // notes
  if (Math.abs(v.tempC - v.tNote) >= 2 && volumeMl(v) > 0 && core.t - v.tNoteAt >= 5) {
    core.note(v, 'temperature', v.tempC > v.tNote ? `Sıcaklık yükseldi (şimdi ${v.tempC.toFixed(1)} °C).` : `Sıcaklık düştü (şimdi ${v.tempC.toFixed(1)} °C).`);
    v.tNote = v.tempC;
    v.tNoteAt = core.t;
  } else if (volumeMl(v) <= 0) v.tNote = v.tempC;
  if (volumeMl(v) > 0.5 && core.t >= v.colourAt) {
    v.colourAt = core.t + 0.25;
    const rgb = liquidRgb(v);
    if (rgbDistance(rgb, v.lastRgb) > 45) {
      core.note(v, 'colour', `Çözeltinin rengi değişti: ${colourNameTr(v.lastRgb)} -> ${colourNameTr(rgb)}.`);
      v.lastRgb = [rgb[0], rgb[1], rgb[2]];
    }
  }
  if (!isSane(v.mix) || !Number.isFinite(v.tempC)) throw new Error(`Vessel ${v.id} reached an invalid state`);
}

export function stepLab(core: LabCore, dt: number): void {
  for (const v of core.vessels.values()) stepVessel(core, v, dt, core.vessels);
  core.t += dt;
}
