module.exports = {
  extends: ['@storybook/eslint-config-storybook', 'plugin:storybook/recommended'],
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      },
    },
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'no-restricted-syntax': 'off',
      },
      parserOptions: {
        project: ['tsconfig.json'],
      },
    },
  ],
  parserOptions: {
    project: ['tsconfig.json'],
  },
};
