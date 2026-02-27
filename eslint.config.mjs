import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/test-results/**',
      '**/dist/**',
      '**/*.d.ts',
      '**/storybook-static/**',
      '**/tsup.config.ts',
      '**/playwright.config.ts',
      '**/tests/**',
      '**/__playwright-tests__/**',
      'test-server/fixtures/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['test-server/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['**/.babelrc.js', '**/jest.config.js', '**/*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
      parserOptions: { ecmaVersion: 'latest' },
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
      parserOptions: { ecmaVersion: 'latest' },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  eslintConfigPrettier
);
