import { homedir } from 'node:os';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { sanitizeError } from './sanitize';

const MOCK_HOMEDIR = '/fake/user';
const MOCK_CWD = `${MOCK_HOMEDIR}/projects/example-project`;

vi.mock('node:os', { spy: true });

beforeEach(() => {
  vi.spyOn(process, 'cwd').mockReturnValue(MOCK_CWD);
  vi.mocked(homedir).mockReturnValue(MOCK_HOMEDIR);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('replaces process cwd', () => {
  expect(sanitizeError(`Cannot find ${MOCK_CWD}/src/index.ts`)).toBe(
    'Cannot find <process-cwd>/src/index.ts'
  );
});

test('replaces homedir outside process cwd', () => {
  expect(sanitizeError(`Cannot read ${MOCK_HOMEDIR}/.npmrc`)).toBe('Cannot read <homedir>/.npmrc');
});

test('replaces process cwd before homedir', () => {
  expect(sanitizeError(`${MOCK_CWD}/vite.config.ts imports ${MOCK_HOMEDIR}/.env`)).toBe(
    '<process-cwd>/vite.config.ts imports <homedir>/.env'
  );
});

test('replaces all occurrences', () => {
  expect(sanitizeError(`Cannot find ${MOCK_CWD}/foo.ts imported from ${MOCK_CWD}/bar.ts`)).toBe(
    'Cannot find <process-cwd>/foo.ts imported from <process-cwd>/bar.ts'
  );
});

test('matches paths case-insensitively', () => {
  expect(sanitizeError(`Cannot find ${MOCK_CWD.toUpperCase()}/src/index.ts`)).toBe(
    'Cannot find <process-cwd>/src/index.ts'
  );
});

test('escapes RegExp characters in paths', () => {
  const cwd = `${MOCK_HOMEDIR}/projects/example (1).project+test`;
  vi.spyOn(process, 'cwd').mockReturnValue(cwd);

  expect(sanitizeError(`Cannot find ${cwd}/src/index.ts`)).toBe(
    'Cannot find <process-cwd>/src/index.ts'
  );
});

test('non-error values are stringified', () => {
  expect.soft(sanitizeError('plain string')).toBe('plain string');
  expect.soft(sanitizeError(42)).toBe('42');
  expect.soft(sanitizeError(undefined)).toBe('undefined');
  expect.soft(sanitizeError({ some: 'object' })).toBe('[object Object]');
});

test('stack containing the message is not duplicated', () => {
  const error = new Error(`Boom in ${MOCK_CWD}/foo.ts`);
  error.stack = `Error: ${error.message}\n    at foo (${MOCK_CWD}/foo.ts:1:1)`;

  expect(sanitizeError(error)).toBe(
    'Error: Boom in <process-cwd>/foo.ts\n    at foo (<process-cwd>/foo.ts:1:1)'
  );
});

test('stack not containing the message is appended after the message', () => {
  const error = new Error('Boom');
  error.stack = `    at foo (${MOCK_CWD}/foo.ts:1:1)`;

  expect(sanitizeError(error)).toBe('Boom\nStack:     at foo (<process-cwd>/foo.ts:1:1)');
});

test('error without stack falls back to message', () => {
  const error = new Error(`Boom in ${MOCK_HOMEDIR}/.npmrc`);
  error.stack = undefined;

  expect(sanitizeError(error)).toBe('Boom in <homedir>/.npmrc');
});

test('messages are truncated to 1000 characters', () => {
  expect(sanitizeError('x'.repeat(1500))).toHaveLength(1000);
});

test('errors with stacks are truncated to 2000 characters', () => {
  const error = new Error('Boom');
  error.stack = `Error: Boom\n${'y'.repeat(3000)}`;

  expect(sanitizeError(error)).toHaveLength(2000);
});

describe('Windows paths', () => {
  const WINDOWS_MOCK_HOMEDIR = 'C:\\Users\\fake';
  const WINDOWS_MOCK_CWD = `${WINDOWS_MOCK_HOMEDIR}\\project`;

  beforeEach(() => {
    vi.resetModules();

    vi.spyOn(process, 'cwd').mockReturnValue(WINDOWS_MOCK_CWD);
    vi.doMock('node:os', () => ({ homedir: () => WINDOWS_MOCK_HOMEDIR }));
    vi.doMock('node:path', async (importOriginal) => ({
      ...(await importOriginal<typeof import('node:path')>()),
      sep: '\\',
    }));

    return function afterEach() {
      vi.doUnmock('node:path');
      vi.doUnmock('node:os');
      vi.resetModules();
    };
  });

  test('normalizes separators and replaces paths', async () => {
    const { sanitizeError: windowsSanitizeError } = await import('./sanitize');

    expect(
      windowsSanitizeError(
        `Cannot find ${WINDOWS_MOCK_CWD}\\src\\index.ts or ${WINDOWS_MOCK_HOMEDIR}\\.npmrc`
      )
    ).toBe('Cannot find <process-cwd>/src/index.ts or <homedir>/.npmrc');
  });

  test('matches drive letter and path casing case-insensitively', async () => {
    const { sanitizeError: windowsSanitizeError } = await import('./sanitize');

    expect(
      windowsSanitizeError(`Cannot find ${WINDOWS_MOCK_CWD.toLowerCase()}\\src\\index.ts`)
    ).toBe('Cannot find <process-cwd>/src/index.ts');
  });
});
