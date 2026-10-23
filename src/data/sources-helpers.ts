import type { Source } from './types';

// Shared builders for the Source records in sources.ts and sources-modules.ts.
export const ACCESSED = '2026-10-23';

export const wpTr = (id: string, title: string, page: string): Source => ({
  id: `wp-tr-${id}`,
  kind: 'wikipedia',
  title: `${title} (Vikipedi)`,
  url: `https://tr.wikipedia.org/wiki/${page}`,
  publisher: 'Vikipedi',
  license: 'CC BY-SA 4.0',
  lang: 'tr',
  accessed: ACCESSED,
});

export const wpEn = (id: string, title: string, page: string): Source => ({
  id: `wp-en-${id}`,
  kind: 'wikipedia',
  title: `${title} (Wikipedia)`,
  url: `https://en.wikipedia.org/wiki/${page}`,
  publisher: 'Wikipedia',
  license: 'CC BY-SA 4.0',
  lang: 'en',
  accessed: ACCESSED,
});

export const openstax = (id: string, title: string, page: string): Source => ({
  id: `os-${id}`,
  kind: 'openstax',
  title: `Biology 2e, ${title}`,
  url: `https://openstax.org/books/biology-2e/pages/${page}`,
  publisher: 'OpenStax (Clark, Douglas, Choi)',
  license: 'CC BY-NC-SA 4.0',
  lang: 'en',
  accessed: ACCESSED,
});

export const openstaxAp = (id: string, title: string, page: string): Source => ({
  id: `os-ap-${id}`,
  kind: 'openstax',
  title: `Anatomy and Physiology 2e, ${title}`,
  url: `https://openstax.org/books/anatomy-and-physiology-2e/pages/${page}`,
  publisher: 'OpenStax (Betts, Desaix, Johnson et al.)',
  license: 'CC BY-NC-SA 4.0',
  lang: 'en',
  accessed: ACCESSED,
});

export const commons = (id: string, title: string, file: string, author: string, license: string): Source => ({
  id: `commons-${id}`,
  kind: 'commons',
  title: `${title} (Wikimedia Commons)`,
  url: `https://commons.wikimedia.org/wiki/File:${file}`,
  publisher: author,
  license,
  lang: 'en',
  accessed: ACCESSED,
});
