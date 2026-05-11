import { server } from 'vitest/browser';

export function isChromium(): boolean {
  return server.browser === 'chromium';
}
