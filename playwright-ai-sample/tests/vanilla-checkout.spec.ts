import { expect, test } from '@playwright/test';
import { runVanillaAction, writeEvaluationResult } from './shared/evaluation-metrics';

test('customer can complete a checkout with vanilla locators', async ({ page }, testInfo) => {
  const startedAt = Date.now();
  const mutation = process.env.MUTATION ?? 'base';
  const actions = [];
  let passed = false;

  try {
    await page.goto(`/?mutation=${mutation}`);
    await runVanillaAction(actions, 'find and add a product:01', 'fill',
      () => page.getByRole('searchbox', { name: 'Search products' }).fill('Notebook'));
    await runVanillaAction(actions, 'find and add a product:02', 'click',
      () => page.getByRole('button', { name: 'Add to cart' }).click());
    await runVanillaAction(actions, 'enter customer details:01', 'fill',
      () => page.getByRole('textbox', { name: 'Name' }).fill('Ada Lovelace'));
    await runVanillaAction(actions, 'enter customer details:02', 'fill',
      () => page.getByRole('textbox', { name: 'Email' }).fill('ada@example.com'));
    await runVanillaAction(actions, 'enter customer details:03', 'fill',
      () => page.getByRole('textbox', { name: 'Address' }).fill('1 Example Street'));
    await runVanillaAction(actions, 'apply a coupon and place the order:01', 'fill',
      () => page.getByRole('textbox', { name: 'Coupon code' }).fill('SAVE10'));
    await runVanillaAction(actions, 'apply a coupon and place the order:02', 'click',
      () => page.getByRole('button', { name: 'Apply coupon' }).click());
    await runVanillaAction(actions, 'apply a coupon and place the order:03', 'assertText',
      () => expect(page.getByRole('status', { name: 'Coupon message' })).toHaveText('Coupon applied'));
    await runVanillaAction(actions, 'apply a coupon and place the order:04', 'click',
      () => page.getByRole('button', { name: 'Place order' }).click());
    await runVanillaAction(actions, 'apply a coupon and place the order:05', 'assertText',
      () => expect(page.getByRole('status', { name: 'Order message' })).toHaveText('Order placed successfully'));
    await runVanillaAction(actions, 'apply a coupon and place the order:06', 'assertText',
      () => expect(page.getByRole('status', { name: 'Cart count' })).toHaveText('1'));
    passed = true;
  } finally {
    await writeEvaluationResult(process.env.EVALUATION_OUTPUT_PATH ?? testInfo.outputPath('metrics.json'), {
      version: 'vanilla',
      variant: 'baseline',
      experiment: process.env.EXPERIMENT ?? 'E1',
      mutation,
      run: Number(process.env.EVALUATION_RUN ?? 1),
      passed,
      passedTests: passed ? 1 : 0,
      totalTests: 1,
      totalActions: 11,
      fallbackCount: 0,
      executionTimeMs: Date.now() - startedAt,
      actions
    });
  }
});
