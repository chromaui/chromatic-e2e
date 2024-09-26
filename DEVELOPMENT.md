## Development

This repository is a Yarn 4 monorepo containing the following packages:

- [cypress](https://github.com/chromaui/chromatic-e2e/tree/main/packages/cypress)
  - Chromatic E2E Visual Test integration for Cypress
- [playwright](https://github.com/chromaui/chromatic-e2e/tree/main/packages/playwright)
  - Chromatic E2E Visual Test integration for Playwright
- [shared](https://github.com/chromaui/chromatic-e2e/tree/main/packages/shared)
  - Internal workspace package shared by the integrations above (does not get published individually)

### Requirements

- Node 18
- Yarn 4

### Getting Started

- If you have `yarn 1` installed globally, it is recommended that you run `corepack enable` so that the version of yarn set in `packageManager` in `package.json` is used for this project
- Run `yarn install`
- Run `yarn build`
- Run `yarn playwright install`

### Testing

Unit tests reside with the code being tested in the `src` directories.

Each E2E integration also has its own suite of E2E tests using the framework it is targeting. These tests import directly from the integration in question and the results are sent to Chromatic to visually test that all is well with archiving and all the various pieces.

These test suites use a basic Express server that's defined in `test-server` and can be run on its own using `yarn dev:server`, but that is not necessary to run the tests.

The E2E test cases for each integration should match each other as much as possible. Changes or additions made to one should be matched in the others.

#### Running the Tests

First, make sure your changes are built: `yarn build`

Then, the test commands are as follows:

- Unit tests: `yarn test:unit`
- Playwright: `yarn test:playwright`, then `yarn archive-storybook:playwright` to see the archived UI
- Cypress: `yarn test:cypress`, then `yarn archive-storybook:cypress` to see the archived UI

If you wish to run the site-under-tests's server separately (e.g. to debug a specific test or to use Cypress interactive mode), run `yarn dev:server` and visit `http://localhost:3000`.

### PR Workflow with Changesets

Versioning and releasing is done using [changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md).

If a change made in a PR requires any of the integration packages to be published, you must add a changeset to your branch specifying which packages should be published, what version they should be bumped to (we use [Semantic Versioning](https://semver.org/)), and the reason for the change.

This is done by running `yarn changeset`, which will guide you through all of the above.

Commit the resulting changeset file with your other changes and push it up. This can happen at any time in the lifecycle of the branch.

After your PR is merged, if you included a changeset, the repo will auto-create a "Version Packages" PR that, when merged, will publish the new package versions to NPM. You can self-review and self-merge this PR.

#### Which packages do I publish?

2 guidelines for code changes that warrant publishing to NPM:

1. Publish every package where code changes occur. Example: if you touch code in the `shared` directory, you'll want to include `@chromatic-com/shared-e2e` in the list of packages to be published, even though that package is private.
1. Publish every package that the changed code affects. If you are only changing code in the `@chromatic-com/shared-e2e` package, you will also need to explicitly include the `chromatic-com/playwright` and `chromatic-com/cypress` packages as packages to publish.

### Canary Releases

The changeset file on a branch will be used to cut canary releases of the changed packages in the PR.

At this time you'll need to look at the output of the `Canary Release` job to find the versioned name it was published under.

### Final Releases

When a branch with a changeset is merged to main, a new PR will be opened with the relevant `package.json` version bumps and changelog updates.

This new PR needs to be merged to main before anything is published. Once merged, the main release job will kick off and publishe the changed packages to npm.
