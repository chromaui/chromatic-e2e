export interface Viewport {
  height: number;
  width: number;
}

export function viewportToString(viewport: Viewport) {
  return `${viewport.width}x${viewport.height}`;
}
