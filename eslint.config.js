import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const MODULES = ['data', 'core', 'scene', 'ui', 'app'];

/** Allowed imports per module; mirrors docs/ARCHITECTURE.md (data/core -> scene -> ui -> app). */
const ALLOWED = {
  data: [],
  core: ['data'],
  scene: ['data', 'core'],
  ui: ['data', 'core', 'scene'],
  app: ['data', 'core', 'scene', 'ui'],
};

const forbiddenFor = (mod) =>
  MODULES.filter((m) => m !== mod && !ALLOWED[mod].includes(m)).map((m) => ({
    group: [`**/${m}`, `**/${m}/**`],
    message: `${mod} must not import ${m} (see docs/ARCHITECTURE.md).`,
  }));

const moduleRules = MODULES.map((mod) => ({
  files: [`src/${mod}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...forbiddenFor(mod),
          {
            // data/types.ts is the shared contract and may be imported directly.
            group: [...MODULES.filter((m) => m !== mod).map((m) => `**/${m}/*`), '!**/data/types'],
            message: 'Import other modules only via their index.ts.',
          },
        ],
      },
    ],
  },
}));

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report', '.claude'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...moduleRules,
  {
    files: ['src/**/*.ts'],
    rules: { 'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }] },
  },
);
