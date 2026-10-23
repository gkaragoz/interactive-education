import { chartFrom } from '../chart';
import type { LabelRule, Plan } from '../env';
import type { Trip } from '../flock';
import { shot, type Shot } from '../math';
import { cellStation, compareStation, flaskStation, muscleStation, yeastStation, F_CELL, F_COMPARE, F_FLASK, F_MUSCLE, F_YEAST } from './stations';
import { alcohol, compare, flask, glycolysis, lactic, T_ALCOHOL, T_COMPARE, T_FLASK, T_LACTIC } from './trips';

export const FERM_STATIONS = [cellStation, muscleStation, yeastStation, compareStation, flaskStation];
export const FERM_SERIES = ['atp-toplam', 'laktik-asit', 'etanol', 'co2-cikis'] as const;
export const FERM_VARIANTS = [{}];
const DURATION = 50;

const L = (id: string, t0: number, t1: number, text: string, at: LabelRule['at']): LabelRule => ({ id, t0, t1, text, at });

const labels: LabelRule[] = [
  L('nooxy', 0.4, 6.4, 'Oksijen yok', [7.4, 3.6, 1.6]),
  L('idle', 0.4, 6.4, 'Mitokondri çalışamaz', [7.4, -3.4, 1.6]),
  L('cyto', 0.4, 14.8, 'Sitoplazma', [-9.4, -3.6, 0]),
  L('glu', 4.8, 8, 'Glikoz', [-9.4, 3.2, 0]),
  L('gly', 7.6, 14.5, 'Glikoliz: 2 pirüvat', [-5.2, 4.2, 0]),
  L('atp', 12.2, 15, 'ATP (net 2)', [-9.2, 6.2, 0]),
  L('nadh', 11.6, 15, 'NADH', [-2.8, -2.8, 0]),
  L('musc', T_LACTIC + 0.5, 26.4, 'Kas hücresi', [-9.2, 5.4, 0]),
  L('lac', 19.0, 26.4, 'Laktik asit', [8.0, 4.4, 0]),
  L('nad', 16.5, 22, 'NADH, NAD⁺ olur; glikoliz sürer', [-5.6, -3.6, 0]),
  L('nocoL', 21.5, 26.4, 'CO₂ çıkmaz', [0, 4.6, 0]),
  L('yeast', T_ALCOHOL + 0.5, 38.6, 'Maya hücresi', [-8.6, 6.4, 0]),
  L('eth', 31, 38.6, 'Etanol', [8.8, 3.6, 0]),
  L('co2', 29.6, 38.6, 'CO₂ kabarcıkları', [4.4, 9.2, 0]),
  L('dough', 33, 38.6, 'Hamur CO₂ ile kabarır', [-4.4, 8.4, 0]),
  L('f2', T_COMPARE + 1.0, T_FLASK - 0.8, 'Fermantasyon: 2 ATP', [-6.2, 2.6, 0]),
  L('f30', T_COMPARE + 1.6, T_FLASK - 0.8, 'Oksijenli solunum: yaklaşık 30 ATP', [4.6, 5.0, 0]),
  L('x15', T_COMPARE + 3.6, T_FLASK - 0.8, 'Aynı glikozdan yaklaşık 15 kat fark', [0, -4.8, 0]),
  L('flask', T_FLASK + 0.8, 49.8, 'Şekerli su + maya', [0, -4.6, 0]),
  L('balloon', T_FLASK + 1.6, 49.8, 'Balon CO₂ ile şişer', [0, 6.8, 0]),
];

const shots: Shot[] = [
  shot([[0, [0, 0.5, 30], [0, 0, 0]], [6, [3, 0.5, 18], [4, 0, 0]], [7.5, [-4.5, 1.5, 15], [-4.5, 0.8, 0]], [T_LACTIC, [-4.5, 1.0, 17], [-4.5, 0.6, 0]]]),
  shot([[T_LACTIC, [0, 0.5, 25], [0, 0, 0]], [18, [-3.5, 0.6, 15], [-3.5, 0, 0]], [T_ALCOHOL, [2, 0.5, 20], [2, 0, 0]]]),
  shot([[T_ALCOHOL, [1, 1, 30], [1, 1, 0]], [29, [-1.5, 1.4, 19], [-1.5, 1.0, 0]], [34, [1, 3, 23], [1, 3, 0]], [T_COMPARE, [2, 3, 27], [2, 3, 0]]]),
  shot([[T_COMPARE, [-1, 1.5, 22], [-0.5, 0.2, 0]], [T_FLASK, [-1, 1.5, 20], [-0.5, 0.2, 0]]]),
  shot([[T_FLASK, [0, 1.6, 24], [0, 1.6, 0]], [DURATION, [0, 1.6, 22], [0, 1.8, 0]]]),
];

export function fermPlan(): Plan {
  const gl = glycolysis();
  const la = lactic();
  const al = alcohol();
  const trips: Trip[] = [...gl.trips, ...la.trips, ...al.trips, ...compare(), ...flask(T_FLASK)];
  return {
    duration: DURATION,
    windows: [
      { station: F_CELL, t0: 0 },
      { station: F_MUSCLE, t0: T_LACTIC },
      { station: F_YEAST, t0: T_ALCOHOL },
      { station: F_COMPARE, t0: T_COMPARE },
      { station: F_FLASK, t0: T_FLASK },
    ],
    swaps: [T_LACTIC, T_ALCOHOL, T_COMPARE, T_FLASK],
    trips,
    shots,
    labels,
    chart: chartFrom(FERM_SERIES, [...gl.events, ...la.events, ...al.events]),
    extras: { t0: T_FLASK + 0.6, t1: DURATION - 0.4 },
  };
}
