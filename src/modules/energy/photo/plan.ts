import type { LevelId } from '../../../data/types';
import { chartFrom, type Ev } from '../chart';
import type { LabelRule, Plan } from '../env';
import type { Trip } from '../flock';
import { shot, type Shot } from '../math';
import { chloroStation } from './chloro';
import { granumStation } from './granum';
import { cellStation, leafStation } from './leaf';
import { labStation } from './lab';
import { innerStation } from './inner';
import { innerTrips } from './inner-trips';
import { lightFactor } from './light';
import { CELL, CHLORO, GRANUM, INNER, LAB, LEAF, cellTrips, chloroArrive, chloroFlow, chloroLeave, granumTrips, labTrips, leafIntro, leafOutro } from './outer-trips';
import { photoCounts, photoRate } from './rates';
import { X } from './inner';
import { LAMP_BASE } from './lab';

export const PHOTO_STATIONS = [leafStation, cellStation, chloroStation, innerStation, labStation, granumStation];
export const PHOTO_SERIES = ['o2-miktari', 'co2-alinan', 'glikoz-miktari', 'atp-nadph'] as const;
export const PHOTO_VARIANTS = ['low', 'medium', 'high'].flatMap((l) => ['low', 'normal', 'high'].map((c) => ({ 'light-intensity': l, 'co2-level': c })));
const DURATION = 60;

const LAMP_X: Record<string, number> = { low: -9.4, medium: -6.8, high: -4.8 };

const L = (id: string, t0: number, t1: number, text: LabelRule['text'], at: LabelRule['at']): LabelRule => ({ id, t0, t1, text, at });

function labels(level: LevelId): LabelRule[] {
  const common: LabelRule[] = [
    L('sun', 0.3, 3.3, 'Güneş ışığı', [8.2, 1.9, 0]),
    L('co2-in', 0.8, 3.3, 'Karbondioksit', [-5.2, -4.3, 0.5]),
    L('h2o-in', 0.8, 3.3, 'Su', [5.9, -4.4, 0.5]),
    L('leaf', 0.3, 3.3, 'Yaprak', [3.5, 2.5, 0]),
    L('cell', 3.9, 4.9, 'Bitki hücresi', [-2.2, 3.7, 0]),
    L('chl-cell', 3.9, 4.9, 'Kloroplast', [1.4, 3.4, 0]),
    L('lab', 51.6, 59.8, { temel: 'Oksijen kabarcıkları: fotosentez hızının işareti', ileri: 'Kabarcık sayısı fotosentez hızını gösterir' }, [0, 3.4, 0]),
    L('lamp', 51.6, 59.8, 'Işık kaynağı', [LAMP_BASE + 2.6, 1.9, 0]),
  ];
  if (level === 'temel') {
    return [
      ...common,
      L('chl', 5.3, 48.5, 'Kloroplast', [0, 3.2, 0]),
      L('in-light', 7, 44, 'Işık', [-6.5, 5.0, 0]),
      L('in-co2', 7, 40, 'Karbondioksit girer', [-9.2, 3.8, 0]),
      L('in-water', 7, 40, 'Su girer', [-8.2, -4.9, 0]),
      L('out-o2', 14, 48.5, 'Oksijen çıkar', [8.8, 6.0, 0]),
      L('out-sugar', 40, 48.5, 'Besin (glikoz) çıkar', [8.8, -1.4, 0]),
      L('o2-leaf', 49.3, 51, 'Oksijen havaya karışır', [-3.8, -5.9, 0]),
      L('glu-leaf', 49.3, 51, 'Besin bitkiye dağılır', [5.9, -2.4, 0]),
    ];
  }
  return [
    ...common,
    L('chl', 5.3, 6.6, 'Kloroplast', [0, 3.2, 0]),
    L('granum', 7.2, 9.0, 'Granum: tilakoit yığını', [0.6, 3.6, 0]),
    L('thy', 9.8, 20, 'Tilakoit zarı', [-9.2, 0.1, 0]),
    L('strom', 9.8, 15, 'Stroma', [-9.6, -3.6, 0]),
    L('lumen', 9.8, 14.4, 'Tilakoit içi', [-1.6, 2.6, 0]),
    L('ps2', 9.8, 20, 'Fotosistem II (Ek bilgi)', [X.psII, -2.5, 0]),
    L('ps1', 9.8, 20, 'Fotosistem I (Ek bilgi)', [X.psI, -2.4, 0]),
    L('chlorophyll', 9.8, 13.6, 'Klorofil ışığı yakalar', [-3.6, -4.4, 0]),
    L('split', 14.6, 25.5, 'Su parçalanır', [-8.9, 4.9, 0]),
    L('o2', 17, 26, 'Oksijen (O₂)', [-9.6, 1.4, 0]),
    L('atps', 19, 26, 'ATP sentaz (Ek bilgi)', [X.atpase, -4.9, 0]),
    L('nadph', 20.5, 26, 'NADPH', [2.7, -4.0, 0]),
    L('atp', 22.5, 26, 'ATP', [6.9, -4.2, 0]),
    L('calvin', 27, 45, 'Calvin döngüsü', [2.6, -9.6, 0]),
    L('fix', 27, 40, 'CO₂ bağlanır', [-1.3, -9.3, 0]),
    L('use', 29, 43, 'ATP ve NADPH kullanılır', [4.3, -4.6, 0]),
    L('glu', 45.6, 46.7, 'Glikoz', [7.6, -9.0, 0]),
    L('chl2', 47.2, 48.8, 'Oksijen ve glikoz kloroplasttan çıkar', [0, 3.6, 0]),
    L('o2-leaf', 49.3, 51, 'Oksijen stomalardan çıkar', [-4.8, -5.4, 0]),
    L('glu-leaf', 49.3, 51, 'Glikoz bitkiye dağılır', [5.9, -2.4, 0]),
  ];
}

function shots(level: LevelId): Shot[] {
  const list: Shot[] = [
    shot([[0, [0.5, 2.5, 27], [0, -0.5, 0]], [2.2, [-0.5, 2, 20], [-0.5, -0.2, 0]], [3.6, [-1.3, 1.0, 8], [-1.2, 0.3, 0]]]),
    shot([[3.6, [0, 0.5, 24], [0, 0, 0]], [5.0, [1.4, 2.0, 5.0], [1.4, 2.05, 0]]]),
  ];
  if (level === 'temel') {
    list.push(
      shot([
        [5.0, [0, 1.5, 17.5], [0, 0, 0]],
        [8, [0, 1.8, 13.5], [0, 0.4, 0]],
        [28, [0.5, 2.2, 14.5], [0.5, 0.6, 0]],
        [46, [0, 2.0, 15.5], [1.5, 0.6, 0]],
        [49, [1.5, 2, 18], [2.5, 0.6, 0]],
      ]),
    );
  } else {
    list.push(
      shot([[5.0, [0, 1.5, 17.5], [0, 0, 0]], [6.8, [-1.5, 1, 11], [-1.5, 0, 0]]]),
      shot([[6.8, [0, 2.5, 27], [0.6, 0, 0]], [9.2, [-1.0, 1.5, 14], [-0.6, 0.2, 0]]]),
      // the membrane is shown mirrored: lumen up, stroma (Calvin ring) down; these keys are world coordinates
      shot([
        [9.2, [-4.5, 5.0, 22], [-3, 0.4, 0]],
        [11, [-6.0, 4.2, 14], [-6.2, 0.3, 0]],
        [14, [-6.0, 4.4, 14], [-6.4, 1.2, 0]],
        [19, [-1.0, 4.4, 16], [-1.0, 0.6, 0]],
        [24, [4.2, 3.8, 14], [4.6, -0.6, 0]],
        [26.3, [3.0, -2.0, 17], [3.0, -4.2, 0]],
        [30, [3.8, -3.6, 19], [4.0, -6.6, 0]],
        [44, [4.8, -3.8, 19], [5.0, -6.8, 0]],
        [46.7, [6.4, -4.0, 14], [6.8, -7.0, 0]],
      ]),
      shot([[46.8, [3, 1, 9.5], [2.0, 0, 0]], [49, [6, 1, 12], [3, 0, 0]]]),
    );
  }
  list.push(shot([[49, [0, 2, 17], [0, -0.5, 0]], [51.2, [0, 2.2, 18], [0, -0.5, 0]]]), shot([[51.2, [0, 1.8, 11.5], [-1.8, 0.2, 0]], [60, [0.5, 1.5, 10], [-1.8, 0.3, 0]]]));
  return list;
}

export function photoPlan(level: LevelId, o: Record<string, string>): Plan {
  const c = photoCounts(o);
  const light = lightFactor(o);
  const rate = photoRate(o);
  const trips: Trip[] = [...leafIntro(light, 3.6), ...cellTrips(3.7, light), ...leafOutro(49.0, c, light, 51.2)];
  let events: Ev[];
  let swaps: number[];
  let windows: Plan['windows'];
  if (level === 'temel') {
    const flow = chloroFlow(c, light, 5.0, 49.0);
    trips.push(...flow.trips);
    events = flow.events;
    swaps = [3.6, 5.0, 49.0, 51.2];
    windows = [{ station: LEAF, t0: 0 }, { station: CELL, t0: 3.6 }, { station: CHLORO, t0: 5.0 }, { station: LEAF, t0: 49.0 }, { station: LAB, t0: 51.2 }];
  } else {
    const inner = innerTrips(c, light, 46.8);
    trips.push(...chloroArrive(5.0, light), ...granumTrips(6.8, 9.2, light), ...inner.trips, ...chloroLeave(46.8, c));
    events = inner.events;
    swaps = [3.6, 5.0, 6.8, 9.2, 46.8, 49.0, 51.2];
    windows = [{ station: LEAF, t0: 0 }, { station: CELL, t0: 3.6 }, { station: CHLORO, t0: 5.0 }, { station: GRANUM, t0: 6.8 }, { station: INNER, t0: 9.2 }, { station: CHLORO, t0: 46.8 }, { station: LEAF, t0: 49.0 }, { station: LAB, t0: 51.2 }];
  }
  const lab = labTrips(51.2, DURATION, rate, o['co2-level'] ?? 'normal');
  trips.push(...lab.trips);
  return {
    duration: DURATION,
    windows,
    swaps,
    trips,
    shots: shots(level),
    mirrored: [INNER],
    legend: level === 'ileri' ? ['co2', 'h2o', 'o2', 'glucose', 'atp'] : ['co2', 'h2o', 'o2', 'glucose'],
    labels: labels(level),
    chart: chartFrom(PHOTO_SERIES, events),
    extras: { lampX: LAMP_X[o['light-intensity'] ?? 'medium'] ?? -6.8, bubbles: lab.bubbles, light },
  };
}
