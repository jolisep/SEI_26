import { expect, test } from '@playwright/test';
import { ConfidenceStore } from '../src/learning/confidence-store';

test('updates confidence with the configured alpha', async ({}, testInfo) => {
  const store = await ConfidenceStore.load(testInfo.outputPath('confidence.json'), { alpha: 0.2 });

  expect(store.get('M02:0:0:role', 0.9)).toBeCloseTo(0.9);
  const successfulUpdate = store.update('M02:0:0:role', 0.9, true);
  expect(successfulUpdate.before).toBeCloseTo(0.9);
  expect(successfulUpdate.after).toBeCloseTo(0.92);
  expect(successfulUpdate.s).toBeCloseTo(0.92);
  expect(successfulUpdate.n).toBe(2);

  const failedUpdate = store.update('M02:0:0:role', 0.9, false);
  expect(failedUpdate.before).toBeCloseTo(0.92);
  expect(failedUpdate.after).toBeCloseTo(0.736);
  expect(failedUpdate.s).toBeCloseTo(0.736);
  expect(failedUpdate.n).toBe(3);
});

test('does not learn when learning is disabled', async ({}, testInfo) => {
  const store = await ConfidenceStore.load(testInfo.outputPath('fixed.json'), {
    alpha: 0.2,
    learningEnabled: false
  });

  expect(store.update('M02:0:0:role', 0.9, true)).toMatchObject({
    before: 0.9,
    after: 0.9,
    s: 0.9,
    n: 1
  });
});
