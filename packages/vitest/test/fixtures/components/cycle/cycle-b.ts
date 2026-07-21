// cycle-a.ts and cycle-b.ts intentionally form a circular import
import { formatLabel } from './cycle-a';

export function decorateLabel(label: string) {
  return `< ${formatLabel(label)} >`;
}
