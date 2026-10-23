/**
 * E3 Nötralleşme ve pH eğrisi: titration of 20.0 mL 0.100 M HCl with 0.100 M NaOH, phenolphthalein endpoint.
 * Sources: https://en.wikipedia.org/wiki/Titration , https://en.wikipedia.org/wiki/Phenolphthalein (colourless below
 * pH 8.3, pink above), https://en.wikipedia.org/wiki/Enthalpy_of_neutralization (-57.62 kJ/mol),
 * https://en.wikipedia.org/wiki/Equivalence_point ; programme: MEB FEN 8.5.5, MEB KIM 10.1.3, 11.2.10, 11.2.11
 * (docs/research/kimya-lab.md section 2/E3). Equivalence at 20.00 mL (2.00 mmol each).
 */
import type { LabView, Op } from '../labTypes';
import { stage, type ExperimentDef } from './types';

const endpoint = (v: LabView): number => v.titration().find((p) => p.ph >= 8.3)?.ml ?? NaN;

const solution: Op[] = [
  { op: 'pour', from: 'hcl-0.1M', to: 'flask', ml: 20 },
  { op: 'drop', reagent: 'phenolphthalein', to: 'flask', n: 2 },
  { op: 'pour', from: 'naoh-0.1M', to: 'burette', ml: 25 },
  { op: 'dispense', burette: 'burette', to: 'flask', ml: 10 },
  { op: 'dispense', burette: 'burette', to: 'flask', ml: 5 },
  { op: 'dispense', burette: 'burette', to: 'flask', ml: 4.9 },
  { op: 'dispense', burette: 'burette', to: 'flask', ml: 0.05 },
  { op: 'dispense', burette: 'burette', to: 'flask', ml: 0.05 },
  { op: 'dispense', burette: 'burette', to: 'flask', ml: 0.05 },
];

export const E03: ExperimentDef = {
  id: 'notrallesme',
  no: 3,
  titleTr: 'Asit + baz: nötralleşme ve pH eğrisi',
  summaryTr: 'Hidroklorik asidi büretten damlatılan sodyum hidroksitle nötrleştir. Rengin ilk kalıcı pembeye döndüğü anı ve pH eğrisindeki sıçramayı bul.',
  levels: ['temel', 'ileri'],
  virtualOnly: false,
  safetyTr: ['Gözlük ve eldiven tak.', 'Gerçek asit ve bazlar yakıcıdır; ellerine ve gözüne değmesin.'],
  homeTr: 'Evde denenmez: asit ve baz çözeltileri aşındırıcıdır.',
  kazanim: ['FB.8.5.5', 'KİM.10.1.3', 'KİM.11.2.10', 'KİM.11.2.11'],
  sources: [
    { label: 'Titration (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Titration' },
    { label: 'Phenolphthalein (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Phenolphthalein' },
    { label: 'Enthalpy of neutralization (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Enthalpy_of_neutralization' },
  ],
  bench: { vessels: [{ id: 'flask', kind: 'erlenmeyer250', labelTr: 'Erlenmeyer' }, { id: 'burette', kind: 'burette25', labelTr: 'Büret' }] },
  shelf: ['hcl-0.1M', 'naoh-0.1M', 'phenolphthalein', 'universal-indicator', 'water'],
  equations: [
    { id: 'e3-full', titleTr: 'Tam iyonik denklem', reactants: { 'H+': 1, 'Cl-': 1, 'Na+': 1, 'OH-': 1 }, products: { 'Na+': 1, 'Cl-': 1, water: 1 }, wordTr: 'asit + baz -> tuz + su' },
    { id: 'e3-net', titleTr: 'Net iyon denklemi', reactants: { 'H+': 1, 'OH-': 1 }, products: { water: 1 } },
  ],
  steps: [
    { id: 'asit', textTr: 'Erlenmeyer içine 20 mL 0,1 M hidroklorik asit koy.', hintTr: 'Asit bu aşamada renksizdir.', done: (v) => v.volumeMl('flask') >= 19.5 },
    { id: 'ayirac', textTr: '2 damla fenolftalein damlat.', hintTr: 'Asitte renksiz kalır.', done: (v) => v.indicatorMl('flask', 'phenolphthalein') >= 0.08 },
    { id: 'buret', textTr: 'Büreti 0,1 M sodyum hidroksitle doldur.', hintTr: 'Büret 25 mL alır.', done: (v) => v.volumeMl('burette') >= 20 || v.titration().length > 0 },
    { id: 'tahmin', textTr: 'Tahmin et: 10 mL baz eklenince renk ne olur?', hintTr: 'Henüz yeterli baz yok.', done: (v) => v.titration().length >= 1 },
    { id: 'damlat', textTr: 'Bazı yavaş yavaş ekle; sona yaklaşırken damla damla.', hintTr: 'pH eğrisi sona doğru çok dik yükselir.', done: (v) => v.titration().length >= 4 },
    { id: 'pembe', textTr: 'İlk kalıcı pembe renkte dur.', hintTr: 'Bu, uç noktadır (yaklaşık 20 mL).', done: (v) => (v.ph('flask') ?? 0) >= 8.3 },
  ],
  expectations: [
    { id: 'endpoint', textTr: 'Uç nokta yaklaşık 20,0 mL baz eklenince görüldü.', check: (v) => endpoint(v) >= 19.95 && endpoint(v) <= 20.2 },
    { id: 'colourless-before', textTr: 'Dönüm noktasından önce çözelti renksizdi.', check: (v) => v.titration().filter((p) => p.ml < 19.99).every((p) => p.ph < 8.3) },
    { id: 'pink', textTr: 'Sonunda çözelti pembe.', check: (v) => v.colour('flask')[0] > v.colour('flask')[1] + 30 },
    { id: 'jump', textTr: 'pH, son yarım mL içinde 3,5 den 10 a sıçradı.', check: (v) => v.titration().some((p) => p.ph < 4) && v.titration().some((p) => p.ph > 10) },
  ],
  measurables: [
    { id: 'endpoint-ml', labelTr: 'Uç nokta hacmi', unit: 'mL', read: endpoint, expected: 20.0, tolerance: 0.01 },
    { id: 'ph', labelTr: 'pH', unit: '', read: (v) => v.ph('flask') ?? 7 },
    { id: 'temp', labelTr: 'Sıcaklık', unit: '°C', read: (v) => v.tempC('flask') },
  ],
  solution,
  particles: [
    {
      id: 'e3-particles', equationId: 'e3-net', titleTr: 'H3O+ ve OH- birleşip su olur; Na+ ve Cl- izleyici kalır', durationS: 14,
      species: [
        { id: 'h3o', labelTr: 'Hidronyum iyonu', formula: 'H3O', charge: 1, kind: 'ion' },
        { id: 'cl', labelTr: 'Klorür iyonu', formula: 'Cl', charge: -1, kind: 'ion' },
        { id: 'na', labelTr: 'Sodyum iyonu', formula: 'Na', charge: 1, kind: 'ion' },
        { id: 'oh', labelTr: 'Hidroksit iyonu', formula: 'OH', charge: -1, kind: 'ion' },
        { id: 'water', labelTr: 'Su', formula: 'H2O', charge: 0, kind: 'molecule' },
      ],
      stages: [
        stage('asit', 0, 4, 'Asitte çok H3O+ ve Cl- var. Büretteki baz henüz kapta değil.', { h3o: 6, cl: 6, na: 6, oh: 6, water: 0 }, 'random'),
        stage('baz', 4, 9, 'Her damla Na+ ve OH- getirir. OH-, H3O+ ile karşılaşıp iki su molekülü yapar.', { h3o: 3, cl: 6, na: 6, oh: 3, water: 6 }, 'approach', { transfers: [{ kind: 'proton', from: 'h3o', to: 'oh', count: 3 }], breaks: [{ species: 'h3o', bond: 'O-H' }], forms: [{ species: 'water', bond: 'O-H' }] }),
        stage('denk', 9, 12, 'Eşdeğerlik noktasında H3O+ ve OH- sayısı eşit olup neredeyse bitti; Na+ ve Cl- çözeltide kalır.', { h3o: 0, cl: 6, na: 6, oh: 0, water: 12 }, 'random', { transfers: [{ kind: 'proton', from: 'h3o', to: 'oh', count: 3 }] }),
        stage('fazla', 12, 14, 'Biraz daha baz eklenirse OH- artar ve fenolftalein pembeye döner.', { h3o: 0, cl: 6, na: 6, oh: 0, water: 12 }, 'static', { focus: ['oh'] }),
      ],
    },
  ],
};
