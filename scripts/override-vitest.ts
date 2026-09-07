import fs from "node:fs";
import path from "node:path";
import { styleText } from "node:util";

const PACKAGES = ["vitest", "@vitest/browser-playwright", "@vitest/coverage-v8"];

const range = process.argv[2] ?? "^4";
const workspaceFile = path.resolve(process.cwd(), "pnpm-workspace.yaml");

const existing = fs.readFileSync(workspaceFile, "utf8");

if (existing.includes("overrides:")) {
  throw new Error(`Workspace file already contains overrides: ${workspaceFile}`);
}

const overrides = ["overrides:", ...PACKAGES.map((name) => `  '${name}': ${range}`)].join("\n");

fs.writeFileSync(workspaceFile, `${existing.trimEnd()}\n${overrides}\n`);

console.log("Overriding Vitest packages to", styleText("bgGreen", range), "in", workspaceFile);
console.log(overrides);
console.log("\nRun", styleText("bgGreen", "pnpm install --no-frozen-lockfile"), "to apply.");
