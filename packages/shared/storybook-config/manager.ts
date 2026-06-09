import { addons } from 'storybook/manager-api';

addons.setConfig({
  sidebar: {
    // Ensures we use folders at the root-level instead of categories
    showRoots: false,
  },

  layoutCustomisations: {
    // Hide toolbar options that don't make sense in e2e setup
    showToolbar: () => false,

    // Hide bottom panel that's empty in e2e setup
    showPanel: () => false,
  },
});
