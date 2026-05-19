import { beforeAll } from 'vitest';
import { getCurrentTest, type Test } from '../getCurrentTest';
import { isChromium } from '../isChromium';
import type { ChromaticConfig } from '@chromatic-com/shared-e2e';

interface Options {
  disableAutoSnapshot?: ChromaticConfig['disableAutoSnapshot'];
}

/**
 * Configure options for the current scope.
 *
 * When called within `test()`, the configuration applies only to that test:
 * ```jsx
 * import { configure } from "@chromatic-com/vitest";
 *
 * test("accordion", async () => { // ❌ Not snapshotted
 *   configure({ disableAutoSnapshot: true }); // Scopes to this test only
 *   await render(<Accordion />);
 * });
 *
 * test("button", async () => { // ✅ Snapshotted automatically
 *   await render(<Button />);
 * });
 * ```
 *
 * When called within `describe()`, the configuration applies to all tests and suites within that describe block.
 * ```
 * import { configure } from "@chromatic-com/vitest";
 *
 * test("accordion", async () => { // ✅ Snapshotted automatically
 *   await render(<Accordion />);
 * });
 *
 * describe("button", () => {
 *   configure({ disableAutoSnapshot: true }); // Scopes to all tests (and nested suites) in this suite
 *
 *   test("default", async () => { // ❌ Not snapshotted
 *     await render(<Button />);
 *   });
 *
 *   describe("as link", () => {
 *     test("default", async () => { // ❌ Not snapshotted
 *       await render(<Button as={Link} />);
 *     });
 *   });
 * });
 * ```
 *
 * When called at the top level, the configuration applies to all tests in the file:
 * ```jsx
 * import { describe, test } from "vitest";
 * import { configure } from "@chromatic-com/vitest";
 *
 * // Scoped to whole test module (file), affects all tests and suites in this file
 * configure({ disableAutoSnapshot: true });
 *
 * test("accordion", async () => { // ❌ Not snapshotted
 *   await render(<Accordion />);
 * });
 *
 * describe("button", () => {
 *   test("default", async () => { // ❌ Not snapshotted
 *     await render(<Button />);
 *   });
 * });
 * ```
 */
export function configure(options: Options) {
  if (!isChromium()) {
    return;
  }

  const test = getCurrentTest();

  // Called within test()
  if (test) {
    test.meta.__chromatic_options = {
      ...test.meta.__chromatic_options,
      ...options,

      autoSnapshot:
        options.disableAutoSnapshot != null
          ? !options.disableAutoSnapshot
          : test.meta.__chromatic_options.autoSnapshot,
    };
    return;
  }

  // Called at top level or within describe().
  // Wrap suite traversal in beforeAll to make sure it runs after test collection.
  // eslint-disable-next-line no-empty-pattern
  beforeAll(({}, suite) => {
    traverseTests(suite);

    function traverseTests(task: (typeof suite.tasks)[0]) {
      if (task.type === 'test') {
        const test = task as Test;

        test.meta.__chromatic_options = {
          ...test.meta.__chromatic_options,
          ...options,
          autoSnapshot:
            options.disableAutoSnapshot != null
              ? !options.disableAutoSnapshot
              : test.meta.__chromatic_options.autoSnapshot,
        };

        return;
      }

      task.tasks.forEach(traverseTests);
    }
  });
}
