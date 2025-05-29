## @chromatic-com/cypress

Chromatic E2E Visual Tests for Cypress

## Getting Started

See the [documentation](https://www.chromatic.com/docs/cypress/).

## Which version should I use?

Chromatic E2E uses [Storybook](https://storybook.js.org) under the hood. If you plan to use this alongside another Storybook in your project, consider the following guidelines to choose the correct version:

### 0.x

Use version `0.x` if:

- The repo this will be installed into has a separate dependency on Storybook
- And that version of Storybook is `8.x` or below

```
npm install --save-dev @chromatic-com/cypress@^0.11.4
```

### 1.x

Otherwise, use version `1.x` of this package.

There are a couple of peer dependencies included with `1.x` which you may also need to install, depending on your current setup.

#### If the repo this will be installed into does _not_ have a separate dependency on Storybook (this includes any project in a monorepo setup)

```
npm install --save-dev @chromatic-com/cypress storybook @storybook/server-webpack5
```

#### If the repo this will be installed into has a separate dependency on Storybook 9.x

You'll need to ensure that `@storybook/server-webpack5` is installed at the same version as your Storybook dependency.

```
mpm install --save-dev @chromatic-com/cypress @storybook/server-webpack5@YOUR.STORYBOOK.VERSION
```
