## Development

This repository is a pnpm monorepo containing the following packages:

- [cypress](https://github.com/chromaui/chromatic-e2e/tree/main/packages/cypress)
  - Chromatic E2E Visual Test integration for Cypress
- [playwright](https://github.com/chromaui/chromatic-e2e/tree/main/packages/playwright)
  - Chromatic E2E Visual Test integration for Playwright
- [vitest](https://github.com/chromaui/chromatic-e2e/tree/main/packages/vitest)
  - Chromatic Visual Test integration for Vitest
- [shared](https://github.com/chromaui/chromatic-e2e/tree/main/packages/shared)
  - Internal workspace package shared by the integrations above (does not get published individually)

### Requirements

- Node 22
- pnpm 11

### Getting Started

- It is recommended that you run `corepack enable` so that the version of pnpm set in `packageManager` in `package.json` is used for this project
- Run `pnpm install`
- Run `pnpm build`
- Run `pnpm playwright install`

### Testing

Unit tests reside with the code being tested in the `src` directories.

Each E2E integration also has its own suite of E2E tests using the framework it is targeting. These tests import directly from the integration in question and the results are sent to Chromatic to visually test that all is well with archiving and all the various pieces.

These test suites use a basic Express server that's defined in `test-server` and can be run on its own using `pnpm dev:server`, but that is not necessary to run the tests.

The E2E test cases for each integration should match each other as much as possible. Changes or additions made to one should be matched in the others.

#### Running the Tests

First, make sure your changes are built: `pnpm build`

Then, the test commands are as follows:

- Unit tests: `pnpm test:unit`
- Playwright: `pnpm test:playwright`, then `pnpm archive-storybook:playwright` to see the archived UI
- Cypress: `pnpm test:cypress`, then `pnpm archive-storybook:cypress` to see the archived UI
- Vitest: `pnpm test:vitest`, then `pnpm archive-storybook:vitest` to see the archived UI

If you wish to run the site-under-tests's server separately (e.g. to debug a specific test or to use Cypress interactive mode), run `pnpm dev:server` and visit `http://localhost:3000`.

### Linting & formatting

We use `eslint` and `prettier` to ensure code consistency.

To have all formatting and linting auto-fixed (so much as possible) run this at the project root:

```
pnpm lint --fix

pnpm prettier . --write
```

### PR Workflow with Changesets

Versioning and releasing is done using [changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md).

If a change made in a PR requires any of the integration packages to be published, you must add a changeset to your branch specifying which packages should be published, what version they should be bumped to (we use [Semantic Versioning](https://semver.org/)), and the reason for the change.

This is done by running `pnpm changeset`, which will guide you through all of the above.

Commit the resulting changeset file with your other changes and push it up. This can happen at any time in the lifecycle of the branch.

After your PR is merged, if you included a changeset, the repo will auto-create a "Version Packages" PR that, when merged, will publish the new package versions to NPM. You can self-review and self-merge this PR.

#### Which packages do I publish?

2 guidelines for code changes that warrant publishing to NPM:

1. Publish every package where code changes occur. Example: if you touch code in the `shared` directory, you'll want to include `@chromatic-com/shared-e2e` in the list of packages to be published, even though that package is private.
1. Publish every package that the changed code affects. If you are only changing code in the `@chromatic-com/shared-e2e` package, you will also need to explicitly include the `@chromatic-com/playwright`, `@chromatic-com/cypress` and `@chromatic-com/vitest` packages as packages to publish.

### Canary Releases

When a PR is opened, [`pkg.pr.new`](https://github.com/stackblitz-labs/pkg.pr.new) will automatically create a canary release for the changes. It will post a comment on the PR with published package versions. Whenever new changes are pushed to the PR, it updates the comment automatically with new versions.

As `pkg.pr.new` publishes packages outside the official npm registry there is no need to worry about releasing too many canary releases. All packages in this registry are temporary and are automatically removed after 6 months, or after being inactive for a month.

### Final Releases

When a branch with a changeset is merged to main, a new PR will be opened with the relevant `package.json` version bumps and changelog updates.

This new PR needs to be merged to main before anything is published. Once merged, the main release job will kick off and publishe the changed packages to npm.
