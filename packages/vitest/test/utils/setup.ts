import { type serializedNodeWithId } from '@rrweb/types';
import { expect } from 'vitest';

// Playwright provider leaking https://github.com/vitest-dev/vitest/blob/141e72aa1e4b22573e1f7b1ab871e2c88420630c/packages/browser-playwright/src/playwright.ts#L138-L151
globalThis.process?.setMaxListeners(20);

expect.addSnapshotSerializer({
  test: (val: serializedNodeWithId) => {
    return (
      val &&
      typeof val.id === 'number' &&
      'childNodes' in val &&
      val.childNodes &&
      Array.isArray(val.childNodes)
    );
  },

  serialize: (val: serializedNodeWithId, config, indentation, depth, refs, printer) => {
    const body = traverseToBody(val);
    const sanitized = sanizeSnapshot(body);

    if ('childNodes' in sanitized && sanitized.childNodes) {
      if (sanitized.childNodes.length === 1) {
        return print(sanitized.childNodes[0]);
      } else {
        return print(sanitized.childNodes);
      }
    }

    return print(sanitized);

    function print(node: unknown) {
      return printer(node, config, indentation, depth, refs);
    }
  },
});

function traverseToBody(node: serializedNodeWithId): serializedNodeWithId | null {
  if ('tagName' in node && node.tagName === 'body') {
    return node;
  }

  if ('childNodes' in node) {
    for (const child of node.childNodes) {
      const result = traverseToBody(child);

      if (result) {
        return result;
      }
    }
  }

  return null;
}

function sanizeSnapshot(snapshot: serializedNodeWithId | null) {
  const sanitized = { ...snapshot, id: typeof snapshot?.id };

  if ('childNodes' in sanitized && sanitized.childNodes) {
    sanitized.childNodes = sanitized.childNodes.map(
      (child) => sanizeSnapshot(child as serializedNodeWithId) as any
    );
  }

  if ('textContent' in sanitized && sanitized.textContent) {
    sanitized.textContent = sanitized.textContent.trim();
  }

  return sanitized;
}
