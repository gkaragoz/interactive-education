import { Color } from 'three';
import { translateMrna } from '../../../data';
import { aaColor } from '../kit/palette';
import { COMPLEMENT_RNA, aaInfo, type AminoCode } from '../sequence';

// The translation plan the scene animates: derived with the data's translateMrna() from the mRNA, so the tRNAs,
// amino acids and colours are right for every example gene.

export interface CodonStep {
  /** Position of the codon in the reading order (0 = start codon). */
  index: number;
  codon: string;
  /** Amino acid, or null for the stop codon. */
  aa: AminoCode | null;
  /** Anticodon written in the same left-to-right order as the codon (3'->5'). */
  anticodon: string;
  color: Color;
  one: string;
  nameTr: string;
}

export interface TranslationPlan {
  mrna: string;
  /** Index of the first nucleotide of the start codon in `mrna`. */
  start: number;
  steps: CodonStep[];
  peptide: AminoCode[];
  stopped: boolean;
}

const STOP_COLOR = '#b94a4a';

export function buildTranslationPlan(mrna: string): TranslationPlan {
  const tr = translateMrna(mrna);
  const start = mrna.indexOf('AUG');
  const steps: CodonStep[] = tr.codons.map((codon, index) => {
    const aa = index < tr.peptide.length ? (tr.peptide[index] as AminoCode) : null;
    const info = aa ? aaInfo(aa) : { one: '', nameTr: 'Dur' };
    return {
      index,
      codon,
      aa,
      anticodon: [...codon].map((b) => COMPLEMENT_RNA[b] ?? '?').join(''),
      color: aa ? aaColor(aa) : new Color(STOP_COLOR),
      one: info.one,
      nameTr: info.nameTr,
    };
  });
  return { mrna, start, steps, peptide: tr.peptide, stopped: tr.stopped };
}
