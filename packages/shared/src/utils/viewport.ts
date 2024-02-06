export interface Viewport {
  height: number;
  width: number;
}

export function viewportToString(viewport: Viewport) {
  return `w${viewport.width}h${viewport.height}`;
}
