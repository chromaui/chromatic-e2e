import { addons } from '@storybook/manager-api';

addons.setConfig({
  sidebar: {
    // this ensures we use folders at the root-level instead of categories
    showRoots: false,
  },
});
