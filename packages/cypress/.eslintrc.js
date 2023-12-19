const project = resolve(process.cwd(), 'tsconfig.json');
module.exports = {
  extends: ['@storybook/eslint-config-storybook'],
  overrides: [
    {
      files: ['**/*.tsx'],
      rules: {
        'react/prop-types': 'off',
        'react/require-default-props': 'off',
        'react/default-props-match-prop-types': 'off',
      },
    },
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'no-restricted-syntax': 'off',
      },
      parserOptions: {
        project: [project],
      },
    },
  ],
  parserOptions: {
    project: [project],
  },
};
