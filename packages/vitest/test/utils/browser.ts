import { test as base, vi } from 'vitest';

export const test = base
  .extend('url', (): string | undefined => undefined)
  .extend('goTo', () => goTo)
  .extend('defaultDOM', document.documentElement)

  // Cleanup DOM before any test
  .extend('beforeEach', { auto: true }, ({ defaultDOM }) => {
    document.documentElement.replaceWith(defaultDOM.cloneNode(true));
  })

  // Automatically mount the DOM if url fixture is set
  .extend('setupDOM', { auto: true }, async ({ url, beforeEach: _beforeEach }) => {
    if (url) {
      await goTo(url);
    }
  });

/**
 * Fetch DOM from {@link file://./../../../../test-server/server.js} and mount it
 */
async function goTo(url: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch "${url}": ${response.statusText}`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  document.documentElement.replaceWith(doc.documentElement);

  // DOMParser cannot execute scripts, so we need to manually load them
  document.querySelectorAll('script').forEach((before) => {
    const after = document.createElement('script');

    if (before.src) {
      after.src = before.src;
    } else {
      after.textContent = before.textContent;
    }

    before.replaceWith(after);
  });

  if (document.head.querySelector('script[src*="tailwind"]')) {
    await vi.waitUntil(() => {
      // Tailwind uses MutationObserver, we need to trigger it so that it mounts the style tag
      document.body.appendChild(document.createElement('div'));

      return document.head.querySelector('style');
    });
  }
}
