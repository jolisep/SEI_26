# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vanilla-checkout.spec.ts >> customer can complete a checkout with vanilla locators
- Location: tests\vanilla-checkout.spec.ts:4:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByRole('status', { name: 'Order message' })
Expected: "Order placed successfully"
Received: "Order submission failed"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" getByRole('status', { name: 'Order message' }) with timeout 5000ms
  - waiting for getByRole('status', { name: 'Order message' })
    14 × locator resolved to <p role="status" aria-label="Order message" data-testid="order-message">Order submission failed</p>
       - unexpected value "Order submission failed"

```

```yaml
- status "Order message": Order submission failed
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { runVanillaAction, writeEvaluationResult } from './shared/evaluation-metrics';
  3  | 
  4  | test('customer can complete a checkout with vanilla locators', async ({ page }, testInfo) => {
  5  |   const startedAt = Date.now();
  6  |   const mutation = process.env.MUTATION ?? 'base';
  7  |   const actions = [];
  8  |   let passed = false;
  9  | 
  10 |   try {
  11 |     await page.goto(`/?mutation=${mutation}`);
  12 |     await runVanillaAction(actions, 'find and add a product:01', 'fill',
  13 |       () => page.getByRole('searchbox', { name: 'Search products' }).fill('Notebook'));
  14 |     await runVanillaAction(actions, 'find and add a product:02', 'click',
  15 |       () => page.getByRole('button', { name: 'Add to cart' }).click());
  16 |     await runVanillaAction(actions, 'enter customer details:01', 'fill',
  17 |       () => page.getByRole('textbox', { name: 'Name' }).fill('Ada Lovelace'));
  18 |     await runVanillaAction(actions, 'enter customer details:02', 'fill',
  19 |       () => page.getByRole('textbox', { name: 'Email' }).fill('ada@example.com'));
  20 |     await runVanillaAction(actions, 'enter customer details:03', 'fill',
  21 |       () => page.getByRole('textbox', { name: 'Address' }).fill('1 Example Street'));
  22 |     await runVanillaAction(actions, 'apply a coupon and place the order:01', 'fill',
  23 |       () => page.getByRole('textbox', { name: 'Coupon code' }).fill('SAVE10'));
  24 |     await runVanillaAction(actions, 'apply a coupon and place the order:02', 'click',
  25 |       () => page.getByRole('button', { name: 'Apply coupon' }).click());
  26 |     await runVanillaAction(actions, 'apply a coupon and place the order:03', 'assertText',
  27 |       () => expect(page.getByRole('status', { name: 'Coupon message' })).toHaveText('Coupon applied'));
  28 |     await runVanillaAction(actions, 'apply a coupon and place the order:04', 'click',
  29 |       () => page.getByRole('button', { name: 'Place order' }).click());
  30 |     await runVanillaAction(actions, 'apply a coupon and place the order:05', 'assertText',
> 31 |       () => expect(page.getByRole('status', { name: 'Order message' })).toHaveText('Order placed successfully'));
     |                                                                         ^ Error: expect(locator).toHaveText(expected) failed
  32 |     await runVanillaAction(actions, 'apply a coupon and place the order:06', 'assertText',
  33 |       () => expect(page.getByRole('status', { name: 'Cart count' })).toHaveText('1'));
  34 |     passed = true;
  35 |   } finally {
  36 |     await writeEvaluationResult(process.env.EVALUATION_OUTPUT_PATH ?? testInfo.outputPath('metrics.json'), {
  37 |       version: 'vanilla',
  38 |       variant: 'baseline',
  39 |       experiment: process.env.EXPERIMENT ?? 'E1',
  40 |       mutation,
  41 |       run: Number(process.env.EVALUATION_RUN ?? 1),
  42 |       passed,
  43 |       passedTests: passed ? 1 : 0,
  44 |       totalTests: 1,
  45 |       totalActions: 11,
  46 |       fallbackCount: 0,
  47 |       executionTimeMs: Date.now() - startedAt,
  48 |       actions
  49 |     });
  50 |   }
  51 | });
  52 | 
```