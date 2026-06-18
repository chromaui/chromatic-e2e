// cycle-a.ts and cycle-b.ts intentionally form a circular import
import { decorateLabel } from './cycle-b';

export default function Cycle({ label }: { label: string }) {
  const div = document.createElement('div');
  div.textContent = decorateLabel(label);
  return div;
}

export function formatLabel(label: string) {
  return label.toUpperCase();
}
