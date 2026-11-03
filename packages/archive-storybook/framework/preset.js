/** @type {import("storybook/internal/types").PresetProperty<"core">} */
export const core = {
  builder: import.meta.resolve("@storybook/builder-vite"),
  renderer: import.meta.resolve("@storybook/server/preset"),
};
