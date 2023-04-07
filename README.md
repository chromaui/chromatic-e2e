# Storybook Library Kit

Simplify the creation of Storybook libraries

- 📝 Live-editing in development
- ⚛️ React/JSX support
- 📦 Transpiling and bundling with Babel
- 🚢 Release management with [Auto](https://github.com/intuit/auto)
- 🧺 Boilerplate and sample code + Jest tests
- 📕 Storybook example
- 👷 Github workflows (test, release, linear)
- 🖼 Github templates (issues, pull request)
- 🛠 Husky + Lint-staged + Prettier + ESLint
- 🛄 ESM support
- 🛂 TypeScript

> ⚠️ This template is intended to help bootstrap libraries and not addons. Please check [Storybook's addon kit](https://github.com/storybookjs/addon-kit) for addons instead!

## Getting Started

Click the **Use this template** button to get started.

![](https://user-images.githubusercontent.com/1671563/154354190-e145b3d1-7ca9-4243-afac-96e3c39cb895.gif)

Clone your repository and install dependencies.

```sh
yarn
```

After installing the dependencies, you will be onboarded with some questions to help setup the project. After answering them, the project will fill in the necessary info, delete the unnecessary code and create an initial commit with everything ready for you to succeed!

### Development scripts

- `yarn start` runs babel in watch mode and starts Storybook
- `yarn build` build and package your library code

## Release Management

### Setup

This project is configured to use [auto](https://github.com/intuit/auto) for release management. It generates a changelog and pushes it to both GitHub and npm. Therefore, you need to configure access to both:

- [`NPM_TOKEN`](https://docs.npmjs.com/creating-and-viewing-access-tokens#creating-access-tokens) Create a token with both _Read and Publish_ permissions.
- [`GH_TOKEN`](https://github.com/settings/tokens) Create a token with the `repo` scope.

#### Local

To use `auto` locally create a `.env` file at the root of your project and add your tokens to it:

```bash
GH_TOKEN=<value you just got from GitHub>
NPM_TOKEN=<value you just got from npm>
```

Lastly, **create labels on GitHub**. You’ll use these labels in the future when making changes to the package.

```bash
npx auto create-labels
```

If you check on GitHub, you’ll now see a set of labels that `auto` would like you to use. Use these to tag future pull requests.

#### GitHub Actions

This template comes with GitHub actions already set up to publish your library anytime someone pushes to your repository.

Go to `Settings > Secrets`, click `New repository secret`, and add your `NPM_TOKEN`.

### Creating a release

To create a release locally you can run the following command, otherwise the GitHub action will make the release for you.

```sh
yarn release
```

That will:

- Build and package the addon code
- Bump the version
- Push a release to GitHub and npm
- Push a changelog to GitHub

### Credits

This project is highly inspired by [Storybook's addon kit](https://github.com/storybookjs/addon-kit).
