// @ts-nocheck

import { writeTestResult } from '../write-archive';
import { SourceMapper } from '../utils/source-mapper';

const doArchive = async ({
  testTitle,
  domSnapshots,
  resourceArchive,
  chromaticStorybookParams,
}) => {
  let sourceMap: Map<string, string> | null = null;

  if (domSnapshots.length > 0) {
    // shortens file names in the last snapshot (which is the automatic one)
    const sourceMapper: SourceMapper = new SourceMapper(domSnapshots[domSnapshots.length - 1]);
    sourceMap = sourceMapper.shortenFileNamesLongerThan(250).build();
  }

  const bufferedArchiveList = Object.entries(resourceArchive).map(([key, value]) => {
    return [
      key,
      {
        ...value,
        // we can't use Buffer in the browser (when we collect the responses)
        // so we go through one by one here and bufferize them
        body: Buffer.from(value.body, 'utf8'),
      },
    ];
  });

  const allSnapshots = Object.fromEntries(
    domSnapshots.map((item, index) => [`Snapshot #${index + 1}`, Buffer.from(JSON.stringify(item))])
  ) as Record<string, Buffer>;

  await writeTestResult(
    {
      title: testTitle,
      // doesn't matter what value we put here, as long as it's a subdirectory of where we want this to actually go
      outputDir: './some',
    },
    allSnapshots,
    Object.fromEntries(bufferedArchiveList),
    { ...chromaticStorybookParams, viewport: { width: 500, height: 500 } },
    sourceMap
  );
};

export const setupNetworkListener = () => {
  let pageUrl: URL | null = null;
  cy.wrap({}).as('archive');
  cy.wrap([]).as('manualSnapshots');

  // since we don't know where the user will navigate, we'll archive whatever domain they're on first.
  cy.intercept(`**/*`, (req) => {
    // don't archive the page itself -- we'll do that with rrweb
    // TODO: See if this will work for both slash and not slash endings or if we have to do same "first URL visited" stuff
    if (!pageUrl) {
      pageUrl = new URL(req.url);
      return;
    }

    const url = new URL(req.url);
    if (url.origin !== pageUrl.origin) {
      return;
    }

    // cached (304) responses don't provide a body, so we need to make sure cache is blown away
    // (https://glebbahmutov.com/blog/cypress-intercept-problems/#cached-response)
    // https://github.com/cypress-io/cypress/issues/15680
    delete req.headers['if-none-match'];
    // I added this since some css files still are cached... not sure if this is great
    // (https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/304)
    delete req.headers['if-modified-since'];
    req.continue((response) => {
      cy.get('@archive').then((archive) => {
        // eslint-disable-next-line no-param-reassign
        archive[response.url] = {
          statusCode: response.statusCode,
          statusText: response.statusMessage,
          body: response.body,
        };
      });
    });
  });
};

export const completeArchive = () => {
  cy.get('@archive').then((archive) => {
    // can we be sure this always fires after all the requests are back?
    cy.document().then((doc) => {
      // here, handle the source map
      const snap = snapshot(doc, { noAbsolute: true });
      cy.get('@manualSnapshots').then((manualSnapshots = []) => {
        // pass the snapshot to the server to write to disk
        cy.task('archiveCypress', {
          testTitle: Cypress.currentTest.title,
          domSnapshots: [...manualSnapshots, snap],
          resourceArchive: archive,
          chromaticStorybookParams: {
            diffThreshold: Cypress.env('diffThreshold'),
          },
        });
      });
    });
  });
};

export const archiveCypress = (stuff) => {
  doArchive(stuff);

  // Cypress tasks must return a value or null: https://docs.cypress.io/api/commands/task#Usage
  return null;
};
