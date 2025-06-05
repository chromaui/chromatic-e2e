// ------------------------------------------------------------
// Copied from @storybook/preset-server-webpack/loader.ts
// https://github.com/storybookjs/storybook/blob/a0d1b3e62533fbf531b79ddfd1f5856fa5bf7384/code/presets/server-webpack/src/loader.ts
// ------------------------------------------------------------

import { compileCsfModule } from './compiler';

export default (content: string) => {
  try {
    const after = compileCsfModule(JSON.parse(content));
    return after;
  } catch (e) {
    // for debugging
    console.log(content, e);
  }
  return content;
};
