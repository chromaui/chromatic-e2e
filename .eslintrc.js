module.exports = {
  extends: ['@storybook/eslint-config-storybook', 'plugin:storybook/recommended'],
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
