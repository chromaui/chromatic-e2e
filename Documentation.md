# Test Archiver for Standalone Snapshots

Chromatic **Standalone Snapshots** is a feature that allows you to use the full Chromatic [**UI Tests**](https://www.chromatic.com/docs/test) and [**UI Review**](https://www.chromatic.com/docs/review) features with pages visited during end-to-end tests in [Playwright](https://playwright.dev/). This allows you to use Chromatic _without_ setting up [Storybook](https://js.storybook.org).

You can use use Standalone Snapshots to capture live “archives” of pages at the end of a test and, optionally, at any point during a test. An **archive** is a self-contained, re-renderable HTML “snapshot” of your page at a certain point in time extracted from the Playwright driven browser’s DOM.

Those archives are then passed to Chromatic’s normal build process, which screenshots those archives in parallel in whichever [cloud browsers](https://www.chromatic.com/docs/browsers) you like, compares the output, and presents you with the changes to review.

Additionally, the archives you create during each test run can be viewed in a Storybook UI, which means you can inspect them on [chromatic.com](http://chromatic.com) (or [locally](#running-the-storybook-locally)) after each build to more closely debug changes and errors.

## Installation

Get started by installing the archiver package and the archive Storybook (a specially-configured Storybook instance that can display your archives):

### As a new installation of Storybook

If you aren't yet using Storybook in your project, install with:

```bash
yarn add --dev @chromaui/test-archiver @chromaui/archive-storybook @storybook/cli @storybook/addon-essentials @storybook/server-webpack5 react react-dom
```

If you are already using Storybook, install as a second Storybook with:

```bash
# <version> here should be the version you are using for your other Storybook packages
yarn add --dev @chromaui/test-archiver @chromaui/archive-storybook @storybook/server-webpack5@<version>
```

## Configuration

To create archives during Playwright tests, import `test` and `expect` from `@chromaui/test-archiver` instead of `@playwright/test`:

```diff
- import { test, expect } from '@playwright/test';
+ import { test, expect } from '@chromaui/test-archiver';

// and use as normal
test('...', async ({ page }) => {
  expect(/* things */);
});
```

Once the above is configured, Test Archiver will run in addition to your Playwright tests, archiving the final state each one, irrespective of whether it passes or fails.

### Manual snapshots

To take manual snapshots at specific points of your tests, you can use the `takeArchive` function inside your test runs:

```ts
import { test, expect, takeArchive } from '@chromaui/test-archiver';

//                               👇 Add testInfo parameter
test('my test', async ({ page }, testInfo) => {
  await page.goto('https://playwright.dev/');

  // Call takeArchive to take an archive "snapshot" of the page at this point
  //                      👇 Pass testInfo to takeArchive
  await takeArchive(page, testInfo);

  await page.getByRole('link', { name: 'Get started' }).click();

  // You can call it several times, as necessary
  // To help disambiguate, you can give the archive "snapshot" a name
  await takeArchive(page, 'After clicking link', testInfo);
});
```

💡 Note that an archive is always taken at the end of every test, in addition to the ones you manually specify.

## Setting up a Chromatic project

Whenever you run your Playwright test suite, archives will be created and stored in `./test-archives/latest` (you can change that location with [settings](#settings)). Those archives will automatically be integrated in the Archive Storybook installed above (which can be [run locally](#running-the-storybook-locally)).

To test the Archive Storybook alongside your regular Storybook, you can set up a second Chromatic project using our [monorepo support](https://www.chromatic.com/docs/monorepos#run-chromatic-for-each-subproject).

> **Warning**
> If your project is already using Storybook, that Storybook will need to be on version 7+ to work alongside the Archive Storybook. If you’re using an older version of Storybook, you can follow this [migration guide](https://storybook.js.org/docs/react/migration-guide) to upgrade.

### Create a second project

First, head to [chromatic.com](http://chromatic.com), browse to your account, and choose “Add Project”. From there, choose your repository a second time:

<img width="417" alt="Chromatic Project Chooser" src="https://user-images.githubusercontent.com/132554/231355192-78a041d2-a552-4e88-b53f-20cafbb76f5f.png">

Choose a name for your second project, like “End to End Test Archives”:

<img width="625" alt="Creating a second Project" src="https://user-images.githubusercontent.com/132554/231355208-1ee68dfc-f585-421c-833d-c33a6f84ca52.png">

Take note of the token for the new project, you’ll need it in the next step.

### Run Chromatic on the archives manually

Add the scripts for running and building the archive storybook to your `package.json`:

```json
"scripts": {
  "archive-storybook": "archive-storybook",
  "build-archive-storybook": "build-archive-storybook"
}
```

Now you can try running Chromatic against the archives with the project you just created manually:

```bash
npx chromatic --build-script-name=build-archive-storybook -t=<TOKEN>
```

### Run Chromatic on the archives in CI

Next, set up your CI service to run Chromatic a second time on each run. The second `chromatic` step should use the project token from the new project you created above, and should use the `--build-script-name=build-archive-storybook` flag:

```yaml
// For instance in our github action:
steps:
  - uses: actions/checkout@v1
  - name: Install dependencies
    run: yarn

  # 👇 Run Chromatic as normal for your Storybook
  - name: Publish to Chromatic
    uses: chromaui/action@v1
    with:
      projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}

  # 👇 Run your E2E tests *before* running Chromatic for your E2E test archives
  - name: E2E tests
    run: yarn playwright test

  # 👇 Run Chromatic for your E2E test archives
  - name: Publish E2E Archives to Chromatic
    uses: chromaui/action@v1
    with:
      # 👇 This is the token for the archive project
      projectToken: ${{ secrets.CHROMATIC_ARCHIVE_PROJECT_TOKEN }}
      # 👇 Tell Chromatic to build the archive Storybook
      buildScriptName: build-archive-storybook
```

Once you’ve set up the above (or similar for your CI provider) and pushed a commit, you should see a build with your archive’s screenshots appear on the new project.

## Running the Storybook locally

If you want to debug your test archives locally, you can run the archive storybook as well.

First run the E2E tests to generate the latest results

```bash
yarn playwright test # or similar
```

> The `--headed` flag displays your tests in the browser as they run, which can be another helpful tool for debugging.

Then you can run the archive storybook with the `archive-storybook` command, and visit it like any other Storybook:

```bash
yarn archive-storybook
```

## Sharded Playwright Runs

When running your Playwright tests over multiple shared CI jobs, you’ll need to wait for all jobs to complete, ensure you save the results in `./test-archives` to be accessible by the next job (for instance using an [artifact in GitHub Actions](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)), and run Chromatic for the archive storybook in a job that depends on all of the shards.

For GitHub actions, that might look like:

```yaml
test:
  name: Run Playwright
  needs: install
  strategy:
    matrix:
      shard: [1, 2]
  steps:
    - name: Run Playwright tests
      run: npx playwright test --shard=${{ matrix.shard }}/${{ strategy.job-total }}

    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report-${{ matrix.shard }}_${{ strategy.job-total }}
        path: ./test-archives/latest
        retention-days: 30

chromatic:
  name: Run Chromatic
  needs: test
  steps:
    - name: Download all workflow run artifacts
      uses: actions/download-artifact@v3

    - name: Publish E2E Archives to Chromatic
      uses: chromaui/action@v1
      with:
        projectToken: ${{ secrets.CHROMATIC_ARCHIVE_PROJECT_TOKEN }}
        buildScriptName: build-archive-storybook
```

## Settings

You can further configure things in the following way:

- To specify a custom archive location, set the `CHROMATIC_ARCHIVE_LOCATION` environment variable, when starting the Storybook (or publishing it in on CI).
