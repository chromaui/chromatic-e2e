/**
 * playwright-core 1.58+ mcpBundle expects global.Request (and fetch API) to exist.
 * In Node 18+ they live on globalThis; ensure they're on global so the bundle finds them.
 */
if (typeof global.Request === 'undefined' && typeof globalThis.Request !== 'undefined') {
  (global as typeof globalThis).Request = globalThis.Request;
  (global as typeof globalThis).Response = globalThis.Response;
  (global as typeof globalThis).Headers = globalThis.Headers;
  (global as typeof globalThis).fetch = globalThis.fetch;
}
