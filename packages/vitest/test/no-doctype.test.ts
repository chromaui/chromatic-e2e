import { test } from './utils/browser';

test.override({ url: '/no-doctype' });

test('pages without a doctype are archived', async () => {});
