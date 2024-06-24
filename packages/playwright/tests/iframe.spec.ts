import { test } from '../src';

// Required for the skipped cross-origin test below
// test.use({
//   launchOptions: {
//     args: ['--disable-web-security'],
//   }
// });

test('DOES NOT snapshot iframe contents when same-origin', async ({ page }) => {
  await page.goto('/iframe-same-origin');
  await page
    .frameLocator('iframe[title="the-iframe"]')
    .getByRole('button', { name: 'The Button' })
    .click();
});

test.skip('DOES NOT snapshot iframe contents when cross-origin', async ({ page }) => {
  await page.goto('/iframe-cross-origin');
  await page.evaluate(() => {
    // trigger cross-origin security error (unless `disable-web-security` is set):
    // Failed to read a named property 'document' from 'Window': Blocked a frame with origin "http://localhost:3000" from accessing a cross-origin frame
    return document?.querySelector('iframe')?.contentWindow?.document.getElementsByTagName('span');
  });
});
