import { expectTypeOf, test } from "vitest";
import "@chromatic-com/cypress/support";

test("takeSnapshot", () => {
  expectTypeOf(cy.takeSnapshot).toBeFunction();

  expectTypeOf(cy.takeSnapshot).parameter(0).toEqualTypeOf<string | undefined>();
});
