import type { Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { StructuredEventLogger, type LogContext } from '../logging/structured-event-logger';

export interface RecoveryOptions {
  maxRetries?: number;
  artifactDirectory?: string;
}

export class RecoveryManager {
  private readonly maxRetries: number;
  private readonly artifactDirectory: string;

  constructor(
    private readonly logger = new StructuredEventLogger(),
    options: RecoveryOptions = {}
  ) {
    this.maxRetries = options.maxRetries ?? 1;
    this.artifactDirectory = options.artifactDirectory ?? 'test-results/recovery';
  }

  async execute(
    page: Page,
    context: LogContext,
    operation: (attempt: number) => Promise<void>
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt += 1) {
      try {
        await operation(attempt);
        if (attempt > 1) {
          this.logger.info('recovery_succeeded', { ...context, attempt });
        }
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn('action_failed', { ...context, attempt }, { error: message });

        if (attempt > this.maxRetries) {
          await this.captureFailure(page, context, attempt, message);
          throw error;
        }

        await this.recover(page, context, attempt);
      }
    }

    throw lastError;
  }

  private async recover(page: Page, context: LogContext, attempt: number): Promise<void> {
    this.logger.info('recovery_started', { ...context, attempt });
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      this.logger.info('page_reloaded', { ...context, attempt });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('page_reload_failed', { ...context, attempt }, { error: message });
    }
  }

  private async captureFailure(page: Page, context: LogContext, attempt: number, error: string): Promise<void> {
    const safeName = `${context.testName}-${context.stepName ?? 'step'}-${context.actionType ?? 'action'}-${attempt}`
      .replace(/[^a-z0-9-_]+/gi, '-');
    const screenshotPath = resolve(this.artifactDirectory, `${safeName}.png`);

    try {
      await mkdir(dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      this.logger.error('failure_artifact_captured', { ...context, attempt }, { error, screenshotPath });
    } catch (captureError) {
      const message = captureError instanceof Error ? captureError.message : String(captureError);
      this.logger.error('failure_artifact_capture_failed', { ...context, attempt }, { error, captureError: message });
    }
  }
}
