import { chartFrom, type Ev } from '../chart';
import type { LabelRule, Plan } from '../env';
import type { Trip } from '../flock';
import { shot } from '../math';
import { go, hash01 } from '../paths';
import { BACT, VENT_TOP, WORMS, ventStation } from './stations';

export const CHEMO_STATIONS = [ventStation];
export const CHEMO_SERIES = ['organik-madde', 'isik-miktari'] as const;
export const CHEMO_VARIANTS = [{}];
const DURATION = 32;

const L = (id: string, t0: number, t1: number, text: string, at: LabelRule['at']): LabelRule => ({ id, t0, t1, text, at });

const labels: LabelRule[] = [
  L('sun', 0.3, 6.8, 'Güneş ışığı', [-9.5, 6.2, 0]),
  L('dark', 1.5, 6.8, 'Işık derinlere ulaşmaz', [-4.0, 2.2, 0]),
  L('vent', 0.8, 6.8, 'Hidrotermal baca', [2.6, -1.6, 0.5]),
  L('floor', 2.0, 6.8, 'Okyanus tabanı', [-9.0, -6.6, 0]),
  L('h2s', 8.0, 15.5, 'Hidrojen sülfür (inorganik madde)', [2.4, 4.2, 0.5]),
  L('bact', 7.6, 24.5, 'Kemosentez yapan bakteri', [BACT[0], 3.2, 0.5]),
  L('chem', 11.0, 15.8, 'Kimyasal enerji kullanılır', [BACT[0] + 0.2, -3.4, 0.5]),
  L('co2', 16.6, 22, 'Karbondioksit', [1.0, 6.0, 0.5]),
  L('org', 18.5, 24.8, 'Organik madde (besin)', [BACT[0] + 3.4, 2.0, 0.5]),
  L('worms', 25.6, 31.6, 'Tüp solucanları', [WORMS[0], -0.8, 0.5]),
  L('prod', 26.0, 31.6, 'Üreticiler: kemosentetik bakteriler', [1.0, 5.6, 0.5]),
];

export function chemoPlan(): Plan {
  const trips: Trip[] = [];
  const events: Ev[] = [];
  const S = 0;
  // light fades out long before the seafloor
  for (let i = 0; i < 14; i++) {
    const t = -1.8 + i * 0.45;
    const stop = 1.5 + hash01(i) * 2.2;
    trips.push(go('photon', S, 0.22, [[t, -9.0, 7.6, 0.4], [t + 2.4, -4.0 + hash01(i + 3) * 6, stop, 0.2]], { fade: 0.8 }));
  }
  // smoke from the vent all along
  for (let i = 0; i < 14; i++) {
    const t = -3 + i * 2.4;
    trips.push(go('bubble', S, 0.5 + hash01(i) * 0.3, [[t, VENT_TOP[0], VENT_TOP[1], 0.3], [t + 4, 0.8 + hash01(i + 2), 5.6, 0.3], [t + 8, 1.6 + hash01(i + 5) * 2, 9, 0.3]], { tint: '#555a66', fade: 1.5, wobble: 0.2 }));
  }
  // hydrogen sulphide rises from the vent into the bacterium
  for (let i = 0; i < 8; i++) {
    const t = 7.4 + i * 0.95;
    trips.push(go('h2s', S, 0.4, [[t, VENT_TOP[0], VENT_TOP[1], VENT_TOP[2]], [t + 1.5, 2.4, 2.4, 0.6], [t + 3.2, BACT[0] - 1.8, BACT[1] + 0.3, 0.5]], { wobble: 0.06 }));
  }
  // the energy gained is carried as ATP until it is used to build food
  for (let i = 0; i < 4; i++) {
    const t = 11.5 + i * 1.0;
    trips.push(go('atp', S, 0.22, [[t, BACT[0] - 0.8, BACT[1] + 0.2, 0.7], [t + 1.0, BACT[0] - 0.2 + i * 0.5, BACT[1] + 0.9 - (i % 2) * 0.5, 0.8], [18.5 + i * 1.6, BACT[0] + 0.6, BACT[1], 0.7]], { wobble: 0.05 }));
  }
  // carbon dioxide in, organic matter out, then on to the animals
  for (let i = 0; i < 6; i++) {
    const t = 16.4 + i * 1.1;
    trips.push(go('co2', S, 0.4, [[t - 2.6, -2.0, 6.6, 0.6], [t - 0.9, 2.4, 3.0, 0.6], [t + 0.4, BACT[0] - 1.6, BACT[1] + 0.9, 0.5]], { wobble: 0.06 }));
    const te = 18.8 + i * 1.1;
    events.push({ series: 'organik-madde', t: te + 0.4, amount: 100 / 6, dur: 1.2 });
    const out: [number, number, number] = [BACT[0] + 2.6 + (i % 3) * 0.7, BACT[1] + 1.4 - Math.floor(i / 3) * 1.5, 0.6];
    const go2 = 25.4 + i * 0.5;
    trips.push(go('glucose', S, 0.4, [[te - 0.5, BACT[0] + 0.6, BACT[1], 0.6], [te + 1.4, out[0], out[1], out[2]], [go2, out[0], out[1], out[2]], [go2 + 2.6, -1.5, -3.6, 0.6], [go2 + 5.0, WORMS[0] + 0.6, -3.4, 0.6]], { wobble: 0.05, fade: 0.5, hold: true }));
  }
  // shrimp that browse around the vent
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    trips.push(go('bacterium', S, 0.5, [[0, -3 + i * 1.5, -4.8, 1.2], [14, -1.5 + i * 1.2 + Math.sin(a) * 1.0, -4.2, 1.4], [DURATION, -3.5 + i * 1.8, -4.7, 1.0]], { tint: '#f1b8a8', hold: true, wobble: 0.1 }));
  }
  const shots = [
    shot([
      [0, [0, 0.5, 29], [0, 0.4, 0]],
      [6.5, [0.5, 0.5, 27], [0.5, 0.2, 0]],
      [8.5, [2.5, 1.0, 15], [3.2, 0.8, 0]],
      [16, [3.4, 0.6, 13], [4.2, 0.4, 0]],
      [24.5, [4.4, 0.4, 14], [5.0, 0.2, 0]],
      [27, [0.5, -0.5, 24], [0, -0.8, 0]],
      [DURATION, [0, -0.4, 25], [0, -0.6, 0]],
    ]),
  ];
  return { duration: DURATION, windows: [{ station: 0, t0: 0 }], swaps: [], trips, shots, labels, chart: chartFrom(CHEMO_SERIES, events) };
}
