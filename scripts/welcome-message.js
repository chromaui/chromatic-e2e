/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable no-console */
const prompts = require('prompts');
const dedent = require('ts-dedent').default;
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const projectName = `@storybook/${path.basename(path.resolve())}`;

// CLI questions
const questions = [
  {
    type: 'text',
    name: 'authorName',
    initial: '',
    message: 'What is the package author name?*',
    validate: (name) => (name === '' ? "Name can't be empty" : true),
  },
  {
    type: 'text',
    name: 'authorEmail',
    initial: '',
    message: 'What is the package author email?',
  },
  {
    type: 'text',
    name: 'packageName',
    initial: projectName,
    message: 'What is the package name?*',
    validate: (pkgName) => (pkgName === '' ? "Package name can't be empty" : true),
  },
  {
    type: 'text',
    name: 'packageDescription',
    initial: '',
    message: 'Write a short description of the package',
  },
  {
    type: 'confirm',
    name: 'addStorybook',
    message: `Would you like a Storybook example in this repository?`,
    initial: false,
  },
  {
    type: 'confirm',
    name: 'useLinearExport',
    message: `Would you like to have Linear workflow in this repository? If you don't know what this is, press N:`,
    initial: true,
  },
  {
    type: (prev) => (prev === true ? 'text' : null),
    name: 'linearPrefix',
    message: 'What is the linear prefix for this project?',
  },
];

const REPLACE_TEMPLATES = {
  linear: 'linear-issue-prefix',
  packageName: 'package-name',
  packageDescription: 'package-description',
  packageBaseName: 'package-base-name',
  packageAuthor: 'package-author',
};

const bold = (message) => `\u001b[1m${message}\u001b[22m`;
const magenta = (message) => `\u001b[35m${message}\u001b[39m`;
const blue = (message) => `\u001b[34m${message}\u001b[39m`;

const main = async () => {
  console.log(
    bold(
      magenta(
        dedent`
        Welcome to library-kit!
        Please answer the following questions while we prepare this project for you:\n
      `
      )
    )
  );

  const { authorName, authorEmail, packageName, packageDescription, linearPrefix, addStorybook } =
    await prompts(questions);

  if (!authorName || !packageName) {
    console.log(
      `\nProcess canceled by the user. Feel free to run ${bold(
        'yarn postinstall'
      )} to execute the installation steps again!`
    );
    process.exit(0);
  }

  const authorField = authorName + (authorEmail ? ` <${authorEmail}>` : '');

  const packageJson = path.resolve(__dirname, `../package.json`);
  const packageBaseName = packageName.replace('@storybook/', '');

  const projectUrl = `https://github.com/storybookjs/${packageBaseName}`;

  let extraMessages = dedent`
    - Check ${bold(
      blue(`${projectUrl}#release-management`)
    )} for more info about setting up the auto release for this package.
  `;

  console.log(`\n👷 Updating package.json...`);
  let packageJsonContents = fs.readFileSync(packageJson, 'utf-8');

  packageJsonContents = packageJsonContents
    .replace(REPLACE_TEMPLATES.packageName, packageName)
    .replace(REPLACE_TEMPLATES.packageAuthor, authorField)
    .replace(REPLACE_TEMPLATES.packageDescription, packageDescription)
    .replace(REPLACE_TEMPLATES.packageBaseName, packageBaseName)
    .replace('    "prerelease": "node scripts/prepublish-checks.js",\n', '')
    .replace('    "postinstall": "node scripts/welcome-message.js",\n', '');

  if (addStorybook) {
    packageJsonContents = packageJsonContents.replace(
      '"start": "yarn build:watch"',
      '"start": "yarn \\"build:watch\\" \\"yarn storybook -- --no-manager-cache --quiet\\""'
    );
  }

  fs.writeFileSync(packageJson, packageJsonContents);

  const linearWorkflow = path.resolve(__dirname, `../.github/workflows/linear-export.yml`);

  if (linearPrefix) {
    console.log(`👷 Updating linear workflow...`);
    let linearWorkflowContents = fs.readFileSync(linearWorkflow, 'utf-8');
    linearWorkflowContents = linearWorkflowContents.replace(REPLACE_TEMPLATES.linear, linearPrefix);
    fs.writeFileSync(linearWorkflow, linearWorkflowContents);

    extraMessages += dedent`\n\n
      - Don't forget to add ${bold('LINEAR_API_KEY')} and ${bold(
      'LINEAR_GH_TOKEN'
    )} to this repository's secrets at ${bold(blue(`${projectUrl}/settings/secrets/actions`))}
    `;
  } else {
    console.log('🗑  Removing linear workflow...');
    fs.rmSync(linearWorkflow);
  }

  console.log('✍️  Updating the README...');
  const readme = path.resolve(__dirname, `../README.md`);
  fs.writeFileSync(
    readme,
    dedent`
  ## ${projectName}

  FIXME: Add description of the project

  ## Getting Started

  FIXME: Add getting started steps

  ## Contributing

  We welcome contributions to Storybook!

  - 📥 Pull requests and 🌟 Stars are always welcome.
  - Read our [contributing guide](CONTRIBUTING.md) to get started,
    or find us on [Discord](https://discord.gg/storybook), we will take the time to guide you

  ## License

  [MIT](${projectUrl}/blob/main/LICENSE)
  `
  );

  const scriptsFolder = path.resolve(__dirname, `../scripts`);

  console.log(`🚮 Removing unnecessary scripts...`);
  fs.rmSync(scriptsFolder, { recursive: true, force: true });

  if (addStorybook) {
    try {
      console.log(`📕 Installing Storybook. This might take a hot minute...`);
      execSync('CI=true npx sb@latest init --yes --force', { stdio: 'pipe' });
    } catch (err) {
      console.error(`There was an error when installing Storybook: ${err.stderr}`);
    }
  }

  console.log(`📦 Creating a commit...`);
  execSync('git add . && git commit -m "project setup" --no-verify');

  console.log(
    dedent`\n
      🚀 All done! Run yarn build, start, storybook or test to get started.

      ${extraMessages}

      Thanks for using this template, ${authorName.split(' ')[0]}! ❤️

      Feel free to open issues in case there are bugs/feature requests at:

      ${bold(blue('https://github.com/storybookjs/library-kit'))}\n
    `
  );
};

main().catch((e) => console.log(`Something went wrong: ${e}`));
