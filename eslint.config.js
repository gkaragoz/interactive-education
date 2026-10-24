import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const MODULES = ['data', 'core', 'chemlab', 'scene', 'modules', 'ui', 'app'];

/** Allowed imports per module; mirrors docs/ARCHITECTURE.md (data/core -> scene -> ui -> app). */
const ALLOWED = {
  data: [],
  core: ['data'],
  // chemlab is the pure chemistry engine: no three.js, no DOM; scene, modules, ui and app read it.
  chemlab: ['data', 'core'],
  scene: ['data', 'core', 'chemlab'],
  modules: ['data', 'core', 'scene', 'chemlab'],
  ui: ['data', 'core', 'scene', 'chemlab'],
  app: ['data', 'core', 'chemlab', 'scene', 'modules', 'ui'],
};

const forbiddenFor = (mod) =>
  MODULES.filter((m) => m !== mod && !ALLOWED[mod].includes(m)).map((m) => ({
    group: [`**/${m}`, `**/${m}/**`],
    message: `${mod} must not import ${m} (see docs/ARCHITECTURE.md).`,
  }));

// src/data/modules is learner content that lives inside `data`; it is not the shell's src/modules. For data files the
// "modules" layer therefore only means a relative path that climbs out of data (../modules from src/data/*.ts,
// ../../modules from src/data/modules/**).
const dataRule = (files, up) => ({
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...forbiddenFor('data').filter((p) => !p.group[0].includes('/modules')),
          { group: [`${up}modules`, `${up}modules/**`], message: 'data must not import modules (see docs/ARCHITECTURE.md).' },
          {
            group: [...MODULES.filter((m) => m !== 'data' && m !== 'modules').map((m) => `**/${m}/*`)],
            message: 'Import other modules only via their index.ts.',
          },
        ],
      },
    ],
  },
});

const moduleRules = MODULES.filter((m) => m !== 'data').map((mod) => ({
  files: [`src/${mod}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...forbiddenFor(mod),
          ...(mod === 'chemlab' ? [{ group: ['three', 'three/**'], message: 'chemlab is pure: no three.js (render code lives in scene/modules).' }] : []),
          {
            // data/types.ts is the shared contract and may be imported directly.
            group: [...MODULES.filter((m) => m !== mod).map((m) => `**/${m}/*`), '!**/data/types', '!**/data/moduleTypes'],
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
  dataRule(['src/data/*.ts'], '../'),
  dataRule(['src/data/modules/**/*.ts'], '../../'),
  ...moduleRules,
  {
    files: ['src/**/*.ts'],
    rules: {
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      // `_name` marks an intentionally unused parameter (interface methods a scene does not need).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
);
