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
