import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
  },

  rules: {
    "unicorn/prefer-node-protocol": "error",
  },
});
