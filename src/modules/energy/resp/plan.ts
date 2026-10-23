import type { LevelId } from '../../../data/types';
import { chartFrom, type Ev } from '../chart';
import type { LabelRule, Plan } from '../env';
import type { Trip } from '../flock';
import { shot, type Shot } from '../math';
import { etcTrips, R3_END, R3_START } from './etc';
import { glycoTrips, R1_END, yieldTokens } from './glyco';
import { krebsTrips, R2_END } from './krebs';
import { KREBS, MX, R_CELL, R_MATRIX, R_MEMB, R_MITO } from './layout';
import { cellIntro, cellOutro, coarseFlow } from './outer';
import { cellStation, matrixStation, membraneStation, overviewStation } from './stations';

export const RESP_STATIONS = [cellStation, overviewStation, matrixStation, membraneStation];
export const RESP_SERIES = ['glikoz-kalan', 'atp-toplam', 'co2-cikis', 'o2-kullanimi'] as const;
export const RESP_VARIANTS = [{}];
const DURATION = 66;

const L = (id: string, t0: number, t1: number, text: LabelRule['text'], at: LabelRule['at']): LabelRule => ({ id, t0, t1, text, at });

function labels(level: LevelId): LabelRule[] {
  const common: LabelRule[] = [
    L('cell', 0.3, 5, 'Hücre', [-6.8, 4.6, 0]),
    L('mito', 0.5, 5, 'Mitokondri', [3.0, 1.4, 1.6]),
    L('glu-in', 0.6, 3.6, 'Glikoz (besin)', [-9.5, 4.2, 0.8]),
    L('o2-in', 0.8, 3.6, 'Oksijen', [-9.5, -4.6, 0.8]),
    L('co2-out', 58.6, 62, 'Karbondioksit çıkar', [9.0, 3.2, 0]),
    L('h2o-out', 58.8, 62, 'Su çıkar', [8.0, -4.8, 0]),
    L('atp-use', 59.4, 64, 'ATP hücrenin işlerinde kullanılır', [-5.0, 5.0, 0]),
  ];
  if (level === 'temel') {
    return [
      ...common,
      L('mito2', 6.5, 57.5, 'Mitokondri', [3.0, 2.4, 1.6]),
      L('cyt', 6.5, 57.5, 'Sitoplazma', [-8.5, -2.2, 0]),
      L('glu', 7.0, 12, 'Glikoz (besin)', [-9.8, 5.0, 0]),
      L('o2', 14, 40, 'Oksijen girer', [-9.8, -4.6, 0]),
      L('co2', 18, 50, 'Karbondioksit çıkar', [-8.0, 7.6, 0]),
      L('h2o', 32, 52, 'Su çıkar', [9.5, -4.8, 0]),
      L('atp', 22, 57.5, 'ATP (enerji)', [5.0, 5.6, 0]),
    ];
  }
  return [
    ...common,
    L('cyto', 6.5, 17, 'Sitoplazma', [-8.8, -2.4, 0]),
    L('glyc', 7.2, 17.5, 'Glikoliz', [-5.5, 3.8, 0]),
    L('glu', 7.5, 10.5, 'Glikoz (6 karbon)', [-8.8, 3.0, 0]),
    L('pyr', 13.2, 17, '2 pirüvat (3 karbon)', [-6.6, 3.6, 0]),
    L('atpa', 14.6, 18, 'ATP', [-8.6, 5.6, 0]),
    L('mat', 20, 26, 'Mitokondri matriksi', [1.0, -2.2, 0]),
    L('pyrox', 21.5, 26, 'Pirüvatın oksidasyonu: CO₂ çıkar', [1.2, 3.6, 0]),
    L('krebs', 26.5, 37, 'Krebs döngüsü', [KREBS[0], 2.4, 0]),
    L('co2k', 28, 37, 'CO₂', [-1.0, 3.6, 0]),
    L('nadh', 28, 37, 'NADH ve FADH₂ elektron taşır', [1.0, -2.8, 0]),
    L('inner', 38, 44, 'Mitokondri iç zarı', [-9.8, -0.2, 0]),
    L('ims', 38, 42, 'Zarlar arası boşluk', [-9.4, 3.8, 0]),
    L('matx', 38, 42.5, 'Matriks', [-9.6, -3.2, 0]),
    L('ets', 39, 52.5, 'Elektron taşıma sistemi', [MX.c3, 5.0, 0]),
    L('o2', 42, 52, 'Oksijen son elektron alıcısı', [MX.c4 + 2.6, -3.4, 0]),
    L('h2o', 43, 52, 'Su oluşur', [-4.6, -4.8, 0]),
    L('hp', 41, 52.5, 'H⁺ birikir (Ek bilgi)', [-1.0, 4.4, 0]),
    L('syn', 44, 52.5, 'ATP sentaz (Ek bilgi)', [MX.synth, 2.8, 0]),
    L('atpb', 45, 52.5, 'ATP', [8.6, -2.6, 0]),
    L('sum', 53.4, 57.8, 'Toplam: yaklaşık 30 ATP', [6.0, 5.6, 0]),
    L('heat', 54.4, 57.8, 'Enerjinin kalanı ısı olur', [-5.0, 4.6, 0]),
  ];
}

function shots(level: LevelId): Shot[] {
  const list: Shot[] = [shot([[0, [0, 1, 27], [0, 0, 0]], [3, [1, 0.5, 19], [1, -0.5, 0.5]], [5.4, [3.0, -0.2, 7], [3.0, -0.4, 0.8]]])];
  if (level === 'temel') {
    list.push(shot([[5.4, [-1.5, 1.2, 24], [-1.5, 0.4, 0]], [20, [0.5, 1.8, 18], [0.5, 1.2, 0]], [40, [0.5, 1.8, 18], [0.5, 1.2, 0]], [58, [-1.0, 1.4, 24], [-1.0, 0.6, 0]]]));
  } else {
    list.push(
      shot([
        [5.4, [-2, 1, 24], [-2, 0.3, 0]],
        [9, [-5.5, 1.5, 15], [-5.5, 0.8, 0]],
        [16, [-5, 1.5, 14], [-5, 0.9, 0]],
        [R1_END, [-2.5, 1.0, 11], [-2.5, 0.4, 0]],
      ]),
      shot([
        [R1_END, [-2, 1.0, 17], [-2, 0, 0]],
        [24, [0, 0.8, 15], [0, 0, 0]],
        [27, [1.4, 0.8, 12], [1.4, 0, 0]],
        [R2_END, [1.4, 0.8, 12], [1.4, 0, 0]],
      ]),
      shot([
        [R3_START, [-2, 5, 28], [-2, 0, 0]],
        [39.5, [-7.6, 4.6, 16], [-7.4, 0.2, 0]],
        [43, [-2.6, 4.8, 16], [-2.6, 0.6, 0]],
        [46.5, [1.8, 4.4, 16], [2.0, 0.2, 0]],
        [49.5, [7.4, 3.6, 16], [7.6, -1.2, 0]],
        [R3_END, [0, 1.5, 25], [0, 0, 0]],
      ]),
      shot([[R3_END, [4, 2.5, 17], [4, 2.0, 0]], [58, [4, 2.5, 18], [4, 2.0, 0]]]),
    );
  }
  list.push(shot([[58, [0, 1, 25], [0, 0, 0]], [66, [0, 1, 25], [0, 0, 0]]]));
  return list;
}

export function respPlan(level: LevelId): Plan {
  const trips: Trip[] = [...cellIntro(), ...cellOutro(58, DURATION)];
  let events: Ev[];
  let windows: Plan['windows'];
  let swaps: number[];
  if (level === 'temel') {
    const flow = coarseFlow(5.4, 58);
    trips.push(...flow.trips);
    events = flow.events;
    windows = [{ station: R_CELL, t0: 0 }, { station: R_MITO, t0: 5.4 }, { station: R_CELL, t0: 58 }];
    swaps = [5.4, 58];
  } else {
    const gl = glycoTrips();
    const kr = krebsTrips();
    const e = etcTrips(kr.carriers);
    trips.push(...gl.trips, ...kr.trips, ...e.trips, ...yieldTokens(53.2, 58));
    events = [...gl.events, ...kr.events, ...e.events];
    windows = [{ station: R_CELL, t0: 0 }, { station: R_MITO, t0: 5.4 }, { station: R_MATRIX, t0: R1_END }, { station: R_MEMB, t0: R3_START }, { station: R_MITO, t0: R3_END }, { station: R_CELL, t0: 58 }];
    swaps = [5.4, R1_END, R3_START, R3_END, 58];
  }
  return { duration: DURATION, windows, swaps, trips, shots: shots(level), labels: labels(level), chart: chartFrom(RESP_SERIES, events, { 'glikoz-kalan': 100 }) };
}
