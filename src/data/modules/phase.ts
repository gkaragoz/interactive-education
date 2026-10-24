import type { CheckQuestion, LevelId, PhaseInfo, PredictPrompt } from '../moduleTypes';

interface PhaseSpec {
  id: string;
  name: string;
  start: number;
  end: number;
  /** Temel summary (no details at 'temel'); omit for İleri-only phases. */
  t?: string;
  /** İleri summary and detail bullets; omit for Temel-only phases. */
  i?: [string, string[]];
  chart?: Record<string, number>;
}

/** Build a PhaseInfo; levels follow from which texts are given. */
export function ph(spec: PhaseSpec): PhaseInfo {
  const levels: LevelId[] = [];
  const text: PhaseInfo['text'] = {};
  if (spec.t) {
    levels.push('temel');
    text.temel = { summary: spec.t, details: [] };
  }
  if (spec.i) {
    levels.push('ileri');
    text.ileri = { summary: spec.i[0], details: spec.i[1] };
  }
  return { id: spec.id, nameTr: spec.name, start: spec.start, end: spec.end, levels, text, chartPoints: spec.chart };
}

const BOTH: LevelId[] = ['temel', 'ileri'];
const ILERI: LevelId[] = ['ileri'];

type Kind = CheckQuestion['kind'];

/**
 * Moves the correct answer to a position derived from the question id so answers are not always first.
 * Short option sets (numbers, "Yarısı/Aynısı...", step names) keep their natural order.
 */
function spreadAnswer(id: string, options: string[], correctIndex: number): { options: string[]; correctIndex: number } {
  if (options.every((o) => o.length <= 14)) return { options, correctIndex };
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const n = options.length;
  const target = hash % n;
  const shift = (correctIndex - target + n) % n;
  const rotated = options.map((_, i) => options[(i + shift) % n] as string);
  return { options: rotated, correctIndex: target };
}


/** Build a check question; `temel` true shows it at both levels, false at İleri only. */
export function chk(
  trackId: string,
  id: string,
  atTime: number,
  temel: boolean,
  kind: Kind,
  promptTr: string,
  options: string[],
  correctIndex: number,
  explanationTr: string,
): CheckQuestion {
  const fullId = `${trackId}-${id}`;
  const spread = spreadAnswer(fullId, options, correctIndex);
  return { id: fullId, trackId, atTime, levels: temel ? BOTH : ILERI, kind, promptTr, options: spread.options, correctIndex: spread.correctIndex, explanationTr };
}

export function pred(trackId: string, atTime: number, temel: boolean, promptTr: string, answerTr: string): PredictPrompt {
  return { trackId, atTime, levels: temel ? BOTH : ILERI, promptTr, answerTr };
}

/** Restricts a check or predict to Temel (for tracks that exist at Temel only). */
export function onlyTemel<T extends { levels: LevelId[] }>(item: T): T {
  return { ...item, levels: ['temel'] };
}
