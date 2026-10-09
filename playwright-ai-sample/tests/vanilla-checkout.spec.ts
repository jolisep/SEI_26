import { expect, test } from '@playwright/test';
import { writeEvaluationResult } from './shared/evaluation-metrics';

test('customer can complete a checkout with vanilla locators', async ({ page }, testInfo) => {
  const startedAt = Date.now();
  const mutation = process.env.MUTATION ?? 'base';
  let passed = false;

  try {
    await page.goto(`/?mutation=${mutation}`);
    await page.getByRole('searchbox', { name: 'Search products' }).fill('Notebook');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Ada Lovelace');
    await page.getByRole('textbox', { name: 'Email' }).fill('ada@example.com');
    await page.getByRole('textbox', { name: 'Address' }).fill('1 Example Street');
    await page.getByRole('textbox', { name: 'Coupon code' }).fill('SAVE10');
    await page.getByRole('button', { name: 'Apply coupon' }).click();
    await expect(page.getByRole('status', { name: 'Coupon message' })).toHaveText('Coupon applied');
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByRole('status', { name: 'Order message' })).toHaveText('Order placed successfully');
    await expect(page.getByRole('status', { name: 'Cart count' })).toHaveText('1');
    passed = true;
  } finally {
    await writeEvaluationResult(process.env.EVALUATION_OUTPUT_PATH ?? testInfo.outputPath('metrics.json'), {
      version: 'vanilla',
      mutation,
      run: Number(process.env.EVALUATION_RUN ?? 1),
      passed,
      passedTests: passed ? 1 : 0,
      totalTests: 1,
      totalActions: 10,
      fallbackCount: 0,
      executionTimeMs: Date.now() - startedAt
    });
  }
});
