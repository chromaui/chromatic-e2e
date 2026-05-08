import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { chromaticPlugin } from '../dist/plugin';

export default defineConfig({
  plugins: [chromaticPlugin()],

  server: {
    proxy: testServerProxy(),
  },

  test: {
    root: './test',
    watch: false,
    include: ['./*.test.ts'],
    globalSetup: './utils/global-setup.ts',

    slowTestThreshold: 2_000,
    hookTimeout: 2_000,
    retry: 2,

    browser: {
      enabled: true,
      headless: true,
      traceView: true,
      screenshotFailures: false,
      viewport: { width: 1280, height: 720 },

      commands: {
        async mousedown(context, selector: string) {
          const frame = await context.frame();
          const box = await frame.locator(selector).boundingBox();

          if (!box) {
            throw new Error(`Could not find element with selector: ${selector}`);
          }

          await context.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await context.page.mouse.down();
        },
      },

      provider: playwright({
        contextOptions: {
          httpCredentials: {
            username: 'user',
            password: 'secret',
          },
        },
      }),
      instances: [{ browser: 'chromium' }],
    },

    onConsoleLog(log) {
      if (log.includes('cdn.tailwindcss.com should not be used in production.')) {
        return false;
      }
    },
  },
});

/** Proxies requests to {@link file://./../../../test-server/server.js} endpoints */
function testServerProxy() {
  const testServerEndpoints = [
    'img',
    'css.urls.css',
    'asset-paths',
    'background-img',
    'videos',
    'scripts',
    'fonts',
    'images',
    'manual-snapshots',
    'blahblah',
    'protected',
    'admin',
    'options',
    'ignore',
    'forms',
    'no-doctype',
    'viewports',
    'constructable-stylesheets',
    'createObjectUrl',
    'canvas',
    'amd',
    'css-pseudo-states',
    '@fz',
    'embeds',
  ];

  return {
    [`^/(${testServerEndpoints.join('|')})`]: {
      target: 'http://localhost:3000',
    },
    '/test-server-root': {
      target: 'http://localhost:3000',
      rewrite: (path: string) => path.replace('/test-server-root', ''),
    },
    '/embed-server-root': {
      target: 'http://localhost:3001',
      rewrite: (path: string) => path.replace('/embed-server-root', ''),
    },
  };
}
