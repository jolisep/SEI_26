import { test, expect } from '@playwright/test';
import { RecoveryManager } from '../src/recovery/recovery-manager';
import { StructuredEventLogger, type LogEvent } from '../src/logging/structured-event-logger';

test('recovery retries an action after a transient failure', async ({ page }) => {
  const events: LogEvent[] = [];
  const logger = new StructuredEventLogger((event) => events.push(event));
  const recovery = new RecoveryManager(logger, { maxRetries: 1 });
  let attempts = 0;

  await page.goto('/');
  await recovery.execute(page, { testName: 'recovery test', actionType: 'click' }, async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error('transient failure');
    }
  });

  expect(attempts).toBe(2);
  expect(events.some((event) => event.event === 'recovery_started')).toBeTruthy();
  expect(events.some((event) => event.event === 'recovery_succeeded')).toBeTruthy();
});
