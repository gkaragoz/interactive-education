import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Plain file reads: Vitest's CSS handling would hand back empty strings for .css imports.
const read = (family: string, weight: string): string => readFileSync(join(process.cwd(), 'node_modules/@fontsource', family, `${weight}.css`), 'utf8');

const TURKISH = ['ğ', 'ş', 'ı', 'İ', 'ç', 'ö', 'ü', 'Ğ', 'Ş', 'Ç', 'Ö', 'Ü'];

/** All unicode-range blocks declared in a fontsource weight file (one block per subset). */
function rangesOf(text: string): { subset: string; from: number; to: number }[] {
  const out: { subset: string; from: number; to: number }[] = [];
  for (const m of text.matchAll(/\/\*\s*([\w-]+)\s*\*\/[^}]*?unicode-range:\s*([^;]+);/g)) {
    for (const part of (m[2] ?? '').split(',')) {
      const [a, b] = part.trim().replace('U+', '').split('-');
      const from = parseInt(a ?? '0', 16);
      out.push({ subset: /latin-ext-/.test(m[1] ?? '') ? 'latin-ext' : /-latin-/.test(m[1] ?? '') ? 'latin' : (m[1] ?? ''), from, to: b ? parseInt(b, 16) : from });
    }
  }
  return out;
}

describe('self-hosted fonts', () => {
  it('main.ts imports latin and latin-ext for both families', async () => {
    const main = (await import('../src/main?raw')).default as string;
    for (const family of ['cormorant-garamond', 'caveat']) {
      expect(main).toContain(`@fontsource/${family}/latin-`);
      expect(main).toContain(`@fontsource/${family}/latin-ext-`);
    }
  });

  it('the weights we use declare latin and latin-ext ranges that cover every Turkish letter', () => {
    for (const family of ['cormorant-garamond', 'caveat']) {
      const ranges = rangesOf(read(family, '500'));
      expect(new Set(ranges.map((r) => r.subset))).toContain('latin-ext');
      expect(new Set(ranges.map((r) => r.subset))).toContain('latin');
      for (const ch of TURKISH) {
        const cp = ch.codePointAt(0)!;
        expect(ranges.some((r) => cp >= r.from && cp <= r.to), `${family} covers ${ch} (U+${cp.toString(16)})`).toBe(true);
      }
    }
  });

  it('Cormorant Garamond ships regular, italic, semibold and bold', () => {
    for (const n of ['latin-400', 'latin-600', 'latin-700', 'latin-400-italic']) expect(read('cormorant-garamond', n)).toContain("font-family: 'Cormorant Garamond'");
  });
});
