## @storybook/test-archiver

Archive end-to-end tests to be replayed in Storybook and Chromatic

## Getting Started

See the [documentation](https://www.chromatic.com/docs/e2e-visual-tests/).

## Contributing

We welcome contributions!

- 📥 Pull requests and 🌟 Stars are always welcome.

### Requirements

- Node 18
- Yarn 4

If you have yarn 1 installed globally, it is recommended that you run `corepack enable` so that the version of yarn set in `packageManager` in `package.json` is used for this project.

### Testing

Run the following commands for the following types of tests:

- Unit tests: `yarn test:unit`
- Playwright: `yarn test:playwright`, then `yarn archive-storybook:playwright` to see the archived UI
- Cypress: `yarn test:cypress`, then `yarn archive-storybook:cypress` to see the archived UI

If you wish to run the site-under-tests's server separately (e.g. to debug a specific test or to use Cypress interactive mode), run `yarn test:server` and visit `http://localhost:3000`.

## License

[MIT](https://github.com/chromaui/test-archiver/blob/main/LICENSE)
