// we use the global instead of importing from 'storybook/manager-api'
// to have as little contact with the package as possible
(globalThis as any).__STORYBOOK_ADDONS_MANAGER.setConfig({
  sidebar: {
    // this ensures we use folders at the root-level instead of categories
    showRoots: false,
  },
});

export {};
