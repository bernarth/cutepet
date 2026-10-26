// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * Architecture boundaries (see docs/ARCHITECTURE.md):
 *   shared   -> nothing app-specific (no core, no features)
 *   core     -> shared
 *   features -> core, shared, and only its own files (never another feature)
 */
const featureNames = [
  'home',
  'catalog',
  'cart',
  'checkout',
  'size-guide',
  'custom-request',
  'sold',
  'account',
  'admin',
];

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'cp', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'cp', style: 'kebab-case' },
      ],

      // Signal-based Angular
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-signal-model': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/no-uncalled-signals': 'error',
      '@angular-eslint/computed-must-return': 'error',

      // Keep code simple (limits that stop unnecessary complexity)
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],

      // Type safety
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@core/*', '@features/*'], message: 'shared must stay generic.' }] },
      ],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@features/*'], message: 'core must not depend on features.' }] },
      ],
    },
  },
  ...featureNames.map((name) => /** @type {import('eslint').Linter.Config} */ ({
    files: [`src/app/features/${name}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@features/*', `!@features/${name}`, `!@features/${name}/**`],
              message: 'A feature cannot import another feature. Move shared code to core or shared.',
            },
          ],
        },
      ],
    },
  })),
  {
    files: ['**/*.spec.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    files: ['src/server.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/cyclomatic-complexity': ['error', { maxComplexity: 6 }],
      '@angular-eslint/template/no-any': 'error',
    },
  },
]);
