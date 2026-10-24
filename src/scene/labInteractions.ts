import { EXPERIMENTS, getExperiment, getReagent, HEAT_SOURCES, REAGENTS, VESSEL_SPECS, type BenchSetup, type Closure, type HeatSource, type LabSim, type OpResult } from '../chemlab';
import type { SimActionResult, SimCommand, SimInteractions, SimItem } from './simScene';

/** The free bench ("Serbest tezgâh"): a handful of vessels and every reagent on the shelf. */
export const FREE_BENCH: BenchSetup = {
  vessels: [
    { id: 'beaker1', kind: 'beaker250', labelTr: 'Beher 1' },
    { id: 'beaker2', kind: 'beaker100', labelTr: 'Beher 2' },
    { id: 'flask', kind: 'erlenmeyer250', labelTr: 'Erlenmeyer' },
    { id: 'tube1', kind: 'testtube', labelTr: 'Deney tüpü 1' },
    { id: 'tube2', kind: 'testtube', labelTr: 'Deney tüpü 2' },
    { id: 'cylinder', kind: 'cylinder100', labelTr: 'Dereceli silindir' },
  ],
};

/** Reagent ids offered for an experiment (its shelf) or for the free bench (everything; virtual-only ones carry a 'Sanal' badge). */
export function shelfOf(experimentId: string | null): string[] {
  const exp = experimentId ? getExperiment(experimentId) : undefined;
  return exp ? [...exp.shelf] : REAGENTS.map((r) => r.id);
}

export const benchOf = (experimentId: string | null): BenchSetup => getExperiment(experimentId ?? '')?.bench ?? FREE_BENCH;
export const experimentList = (): { id: string; no: number; titleTr: string }[] => EXPERIMENTS.map((e) => ({ id: e.id, no: e.no, titleTr: e.titleTr }));

const result = (r: OpResult): SimActionResult => ({ ok: r.ok, messageTr: r.messageTr ?? r.blocked?.messageTr, blockedTitleTr: r.blocked?.titleTr });

/**
 * The keyboard and menu path for the lab (docs/research/kimya-lab.md section 9): every drag and drop action as
 * "pick an item, pick a command, pick a target, confirm". It is derived from the engine, so it works with any renderer.
 * `shelf` returns the reagent ids currently on offer.
 */
export function createLabInteractions(lab: LabSim, shelf: () => string[]): SimInteractions {
  const vessels = (except?: string): SimItem[] =>
    lab.vesselIds().filter((id) => id !== except).map((id) => ({ id, labelTr: lab.vessel(id)?.labelTr ?? id, group: 'Kaplar' }));
  const reagentItem = (id: string): SimItem | null => {
    const r = getReagent(id);
    return r ? { id, labelTr: `${r.nameTr} (${r.labelTr})`, group: 'Reaktifler', hintTr: r.unit === 'mL' ? 'Sıvı: mL ile dök veya damlat' : 'Katı: gram ile ekle' } : null;
  };
  const isVessel = (id: string): boolean => lab.vessel(id) !== undefined;
  const heatChoices = [...(Object.keys(HEAT_SOURCES) as HeatSource[]).map((k) => ({ id: k, labelTr: HEAT_SOURCES[k].nameTr })), { id: 'off', labelTr: 'Isıtmayı kapat' }];

  return {
    items: () => [...vessels(), ...shelf().flatMap((id) => reagentItem(id) ?? [])],
    commands(itemId): SimCommand[] {
      const reagent = getReagent(itemId);
      if (reagent) {
        const targets = vessels();
        return reagent.unit === 'mL'
          ? [
              { id: 'pour', labelTr: 'Dök', targets, amount: { min: 1, max: 250, step: 1, default: 20, unit: 'mL' } },
              { id: 'drop', labelTr: 'Damlat', targets, amount: { min: 1, max: 40, step: 1, default: 3, unit: 'damla' } },
            ]
          : [{ id: 'add', labelTr: 'Ekle', targets, amount: { min: 0.1, max: 50, step: 0.1, default: 2, unit: 'g' }, choices: [{ id: 'lump', labelTr: 'Parça' }, { id: 'powder', labelTr: 'Toz' }] }];
      }
      const v = lab.vessel(itemId);
      if (!v) return [];
      const spec = VESSEL_SPECS[v.kind];
      const others = vessels(itemId);
      const out: SimCommand[] = [];
      if (v.kind === 'burette25') out.push({ id: 'dispense', labelTr: 'Büretten damlat', targets: others, amount: { min: 0.05, max: 25, step: 0.05, default: 1, unit: 'mL' } });
      else if (v.kind !== 'funnel') out.push({ id: 'pourTo', labelTr: 'Başka kaba dök', targets: others, amount: { min: 1, max: 250, step: 1, default: 20, unit: 'mL' } });
      if (v.kind === 'funnel') out.push({ id: 'filter', labelTr: 'Süz', targets: others });
      if (spec.heatable) out.push({ id: 'heat', labelTr: 'Isıt', choices: heatChoices }, { id: 'cool', labelTr: 'Buz banyosu', choices: [{ id: 'on', labelTr: 'Koy' }, { id: 'off', labelTr: 'Al' }] });
      out.push({ id: 'stir', labelTr: 'Karıştır', choices: [{ id: 'on', labelTr: 'Başlat' }, { id: 'off', labelTr: 'Durdur' }] });
      out.push({ id: 'place', labelTr: 'Teraziye koy' }, { id: 'unplace', labelTr: 'Teraziden al' }, { id: 'tare', labelTr: 'Dara al' }, { id: 'weigh', labelTr: 'Tart' }, { id: 'readvol', labelTr: 'Hacmi oku' });
      out.push({ id: 'dip', labelTr: 'pH kâğıdı daldır', choices: [{ id: 'universal-strip', labelTr: 'Evrensel pH kâğıdı' }, { id: 'litmus-paper', labelTr: 'Turnusol kâğıdı' }] });
      out.push({ id: 'close', labelTr: 'Kapat / aç', choices: [{ id: 'none', labelTr: 'Açık' }, { id: 'balloon', labelTr: 'Balon' }, { id: 'stopper', labelTr: 'Tıpa' }] });
      if (v.kind === 'crucible') out.push({ id: 'lid', labelTr: 'Kapak', choices: [{ id: 'open', labelTr: 'Kaldır' }, { id: 'closed', labelTr: 'Kapat' }] });
      out.push({ id: 'gasline', labelTr: 'Gaz hattı', targets: [...others.filter((o) => lab.vessel(o.id)?.kind === 'gas-tube'), { id: '', labelTr: 'Hattı kaldır', group: 'Kaplar' }] });
      out.push({ id: 'ignite', labelTr: 'Alevle tutuştur' });
      out.push({ id: 'testgas', labelTr: 'Gaz testi', choices: [{ id: 'flame', labelTr: 'Yanan çıra' }, { id: 'glowing-splint', labelTr: 'Közlü çıra' }, { id: 'limewater', labelTr: 'Kireç suyu' }] });
      if (spec.electrodes) out.push({ id: 'electrodes', labelTr: 'Elektrot', amount: { min: 0, max: 12, step: 0.5, default: 6, unit: 'V' } });
      return out;
    },
    run(itemId, commandId, args): SimActionResult {
      const target = args.targetId ?? '';
      const amount = args.amount ?? 0;
      const choice = args.choice ?? '';
      if (!getReagent(itemId) && !isVessel(itemId)) return { ok: false, messageTr: 'Böyle bir öğe yok.' };
      switch (commandId) {
        case 'pour': return result(lab.pour(itemId, target, amount));
        case 'drop': return result(lab.drop(itemId, target, amount));
        case 'add': return result(lab.add(itemId, target, amount, choice === 'powder'));
        case 'pourTo': return result(lab.pour(itemId, target, amount));
        case 'dispense': return result(lab.dispense(itemId, target, amount));
        case 'filter': return result(lab.filter(itemId, target));
        case 'heat': return result(lab.heat(itemId, choice === 'off' || choice === '' ? null : (choice as HeatSource)));
        case 'cool': return result(lab.cool(itemId, choice !== 'off'));
        case 'stir': return result(lab.stir(itemId, choice !== 'off'));
        case 'place': return result(lab.place(itemId));
        case 'unplace': return result(lab.place(null));
        case 'tare': return result(lab.tare());
        case 'weigh': return result(lab.weigh(itemId));
        case 'readvol': return result(lab.readVolume(itemId));
        case 'dip': return result(lab.dip(choice === 'litmus-paper' ? 'litmus-paper' : 'universal-strip', itemId));
        case 'close': return result(lab.close(itemId, (choice || 'none') as Closure));
        case 'lid': return result(lab.lid(itemId, choice !== 'closed'));
        case 'gasline': return result(lab.gasline(itemId, target === '' ? null : target));
        case 'ignite': return result(lab.ignite(itemId));
        case 'testgas': return result(lab.testGas(itemId, (choice || 'flame') as 'flame' | 'glowing-splint' | 'limewater'));
        case 'electrodes': return result(lab.connectElectrodes(itemId, amount > 0 ? amount : null));
        default: return { ok: false, messageTr: 'Bu eylem tanınmıyor.' };
      }
    },
  };
}
