module.exports = {
  extends: ['@storybook/eslint-config-storybook'],
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'import/no-unresolved': ['warn'],
      },
    },
    {
      files: ['**/*.test.ts', '**/*.spec.ts', 'vitest.config.ts'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
            packageDir: [__dirname, require('path').join(__dirname, '../../')],
          },
        ],
        'no-restricted-syntax': 'off',
      },
      parserOptions: {
        project: ['tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
  ],
  parserOptions: {
    project: ['tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
};
