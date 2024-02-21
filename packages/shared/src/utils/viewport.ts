export interface Viewport {
  height: number;
  width: number;
}

// NOTE: This is duplicated in the shared storybook preview.ts
export function viewportToString(viewport: Viewport) {
  return `w${viewport.width}h${viewport.height}`;
}

export function parseViewport(viewportString: string): Viewport {
  const matcher = viewportString.match(/w(\d+)h(\d+)/);
  return {
    width: Number(matcher[1]),
    height: Number(matcher[2]),
  };
}
