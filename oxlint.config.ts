import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
  },

  plugins: [
    "import",

    // Defaults:
    "eslint",
    "typescript",
    "unicorn",
    "oxc",
  ],

  rules: {
    "unicorn/prefer-node-protocol": "error",
    "typescript/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    "import/no-duplicates": "error",
  },

  overrides: [
    // Tests
    {
      files: ["**/**.{test,test-d}.ts", "**/{test,tests,test-server}/**"],
      rules: {
        "typescript/unbound-method": "off",
        "typescript/no-floating-promises": "off",
        "typescript/require-array-sort-compare": "off",
        "no-empty-pattern": "off",
        "no-unused-expressions": "off",
        "unicorn/no-empty-file": "off",
      },
    },
  ],
});
