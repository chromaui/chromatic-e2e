import { test } from '../src';

test.describe('this is a very long story name it just keeps going and going and it cannot stop and it will not stop ba bada da da dum dum dum', () => {
  test('and this is also an incredibly long test name because there are just a bunch of random chars at the end like this ldlk elke lekj felk felkf lkf lsf lkef lse flskef ls fls eflsj flksef', async ({
    page,
  }) => {
    await page.goto('/');
  });

  test('and this is also an incredibly long test name because there are just a bunch of random chars at the end like this ldlk elke lekj felk felkf lkf lsf lkef lse flskef ls fls eflsj flksef 2', async ({
    page,
  }) => {
    await page.goto('/');
  });

  test('multi-byte characters test case: ああだこうだ、ああだこうだ、ああだこうだ、ああだこうだ、ああだこうだ、ああだこうだ、ああだこうだ、ああだこうだ、ああだこうだ、ああだこうだ', async ({
    page,
  }) => {
    await page.goto('/');
  });
});
