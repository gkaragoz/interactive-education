import { aminoAcids, codonTable, geneExamples, mutationExamples, transcribeTemplate, translateMrna } from '../../data';

export type AminoCode = (typeof aminoAcids)[number]['three'];
export type TranslationResult = ReturnType<typeof translateMrna>;
type GeneExample = (typeof geneExamples)[number];
export type MutationExample = (typeof mutationExamples)[number];

// Sequences used by the scene. Everything is derived from the data files with their own helpers
// (transcribeTemplate / translateMrna), so the animation can never disagree with the codon table.

export const COMPLEMENT_DNA: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
export const COMPLEMENT_RNA: Record<string, string> = { A: 'U', U: 'A', G: 'C', C: 'G' };

export interface GenePlan {
  id: string;
  /** DNA template strand written 3'->5' left to right (as in the data). */
  template: string;
  /** DNA coding strand, 5'->3' left to right: the complement of the template. */
  coding: string;
  /** mRNA 5'->3' (derived with transcribeTemplate). */
  mrna: string;
  codons: string[];
  aminoAcids: AminoCode[];
  translation: TranslationResult;
}

const example = (id: string): GeneExample => geneExamples.find((g) => g.id === id) ?? (geneExamples[0] as GeneExample);

export function genePlan(id: string): GenePlan {
  const g = example(id);
  const mrna = transcribeTemplate(g.template);
  const translation = translateMrna(mrna);
  return {
    id: g.id,
    template: g.template,
    coding: [...g.template].map((b) => COMPLEMENT_DNA[b] ?? '?').join(''),
    mrna,
    codons: translation.codons,
    aminoAcids: translation.peptide,
    translation,
  };
}

export interface MutationPlan {
  example: MutationExample;
  before: GenePlan;
  /** Index (0-based, in the 15-nucleotide gene) of the changed base. */
  position: number;
  mrnaFrom: string;
  mrnaTo: string;
  templateFrom: string;
  templateTo: string;
  mutatedMrna: string;
  mutatedTemplate: string;
  after: TranslationResult;
  /** Amino acids of the original that stay identical in the mutated peptide (same index, same acid). */
  unchanged: number;
}

/** The mutation track always works on gene 'melh'; the option picks which single base changes. */
export function mutationPlan(typeId: string): MutationPlan {
  const ex = mutationExamples.find((m) => m.id === typeId) ?? (mutationExamples[1] as MutationExample);
  const before = genePlan('melh');
  const start = ex.codonIndex * 3;
  let k = 0;
  while (k < 3 && ex.from[k] === ex.to[k]) k++;
  const position = start + k;
  const mrnaTo = ex.to[k] as string;
  const mutatedMrna = before.mrna.slice(0, position) + mrnaTo + before.mrna.slice(position + 1);
  const templateTo = COMPLEMENT_RNA_TO_TEMPLATE[mrnaTo] as string;
  const mutatedTemplate = before.template.slice(0, position) + templateTo + before.template.slice(position + 1);
  const after = translateMrna(mutatedMrna);
  let unchanged = 0;
  before.aminoAcids.forEach((a, i) => {
    if (after.peptide[i] === a) unchanged++;
  });
  return { example: ex, before, position, mrnaFrom: before.mrna[position] as string, mrnaTo, templateFrom: before.template[position] as string, templateTo, mutatedMrna, mutatedTemplate, after, unchanged };
}

/** The template base that produces an mRNA base. */
const COMPLEMENT_RNA_TO_TEMPLATE: Record<string, string> = { A: 'T', U: 'A', G: 'C', C: 'G' };

export const aaInfo = (three: string): { one: string; nameTr: string } => {
  const a = aminoAcids.find((x) => x.three === three);
  return a ? { one: a.one, nameTr: a.nameTr } : { one: '?', nameTr: three };
};
export const meaningOf = (codon: string): string => codonTable[codon] ?? '?';
/** Anticodon read in the same left-to-right order as its codon (3'->5' when the codon is 5'->3'). */
export const anticodonOf = (codon: string): string => [...codon].map((b) => COMPLEMENT_RNA[b] ?? '?').join('');
