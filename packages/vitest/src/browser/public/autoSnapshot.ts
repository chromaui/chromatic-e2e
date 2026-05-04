import { beforeAll } from 'vitest';
import { getCurrentTest, type Test } from '../getCurrentTest';
import { isChromium } from '../isChromium';

/**
 * Disable automatic test snapshotting for specific scope.
 *
 * When called within `test()`, it disables snapshotting for that test:
 * ```jsx
 * import { disableAutoSnapshot } from "@chromatic-com/vitest";
 *
 * test("accordion", async () => { // ❌ Not snapshotted
 *   disableAutoSnapshot(); // Scopes to this test only
 *   await render(<Accordion />);
 * });
 *
 * test("button", async () => { // ✅ Snapshotted automatically
 *   await render(<Button />);
 * });
 * ```
 *
 * When called within `describe()`, it disables snapshotting for all tests and suites within that describe block.
 * ```
 * import { disableAutoSnapshot } from "@chromatic-com/vitest";
 *
 * test("accordion", async () => { // ✅ Snapshotted automatically
 *   await render(<Accordion />);
 * });
 *
 * describe("button", () => {
 *   disableAutoSnapshot(); // Scopes to all tests (and nested suites) in this suite
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
 * When called at the top level, it disables snapshotting for all tests in the file:
 * ```jsx
 * import { describe, test } from "vitest";
 * import { disableAutoSnapshot } from "@chromatic-com/vitest";
 *
 * // Scoped to whole test module (file), affects all tests and suites in this file
 * disableAutoSnapshot();
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
 *
 */
export function disableAutoSnapshot() {
  if (!isChromium()) {
    return;
  }

  const test = getCurrentTest();

  // Called within test()
  if (test) {
    test.meta.__chromatic_autoSnapshot = false;
    return;
  }

  // Called at top level or within describe().
  // Wrap suite traversal in beforeAll to make sure it runs after test collection.
  // eslint-disable-next-line no-empty-pattern
  beforeAll(({}, suite) => {
    traverseTests(suite);

    function traverseTests(task: (typeof suite.tasks)[0]) {
      if (task.type === 'test') {
        (task as Test).meta.__chromatic_autoSnapshot = false;
        return;
      }

      task.tasks.forEach(traverseTests);
    }
  });
}
