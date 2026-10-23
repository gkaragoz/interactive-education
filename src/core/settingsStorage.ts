import { isQualityName, type QualityName } from './quality';

/** The quality choice of the settings menu: a fixed preset or the adaptive governor. */
export type QualityMode = 'auto' | QualityName;

const KEY = 'bilim.qualityMode';

export function isQualityMode(value: unknown): value is QualityMode {
  return value === 'auto' || isQualityName(value);
}

/** Saved choice, or null. Storage can be blocked or full (private windows), so every access is guarded. */
export function loadQualityMode(storage?: Pick<Storage, 'getItem'>): QualityMode | null {
  try {
    const value = (storage ?? localStorage).getItem(KEY);
    return isQualityMode(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveQualityMode(mode: QualityMode, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? localStorage).setItem(KEY, mode);
  } catch {
    // Nothing persists; the choice still applies to this page.
  }
}

const LEVEL_KEY = 'bilim.level';

/** The learner's last level choice (Temel / İleri), or null; guarded like every storage access. */
export function loadLevel(storage?: Pick<Storage, 'getItem'>): 'temel' | 'ileri' | null {
  try {
    const value = (storage ?? localStorage).getItem(LEVEL_KEY);
    return value === 'temel' || value === 'ileri' ? value : null;
  } catch {
    return null;
  }
}

export function saveLevel(level: 'temel' | 'ileri', storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? localStorage).setItem(LEVEL_KEY, level);
  } catch {
    // not persisted
  }
}

const QUESTIONS_KEY = 'bilim.questions';

/** Whether check/predict prompts may pause the timeline (default on); remembered per device, guarded like all storage. */
export function loadQuestions(storage?: Pick<Storage, 'getItem'>): boolean | null {
  try {
    const value = (storage ?? localStorage).getItem(QUESTIONS_KEY);
    return value === '1' ? true : value === '0' ? false : null;
  } catch {
    return null;
  }
}

export function saveQuestions(on: boolean, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? localStorage).setItem(QUESTIONS_KEY, on ? '1' : '0');
  } catch {
    // not persisted
  }
}
