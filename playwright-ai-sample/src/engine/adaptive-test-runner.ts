import type { Page } from '@playwright/test';
import { StructuredEventLogger } from '../logging/structured-event-logger';
import { RecoveryManager } from '../recovery/recovery-manager';
import type { ActionExecutionContext } from '../adapters/playwright-action-adapter';
import { ActionAdapterFactory } from '../factories/action-adapter-factory';
import type { TestCase } from '../models/test-suite';

export class AdaptiveTestRunner {
  constructor(
    private readonly logger = new StructuredEventLogger(),
    private readonly recovery = new RecoveryManager(logger),
    private readonly factory = new ActionAdapterFactory(logger)
  ) {}

  async run(page: Page, testCase: TestCase): Promise<void> {
    this.logger.info('test_started', { testName: testCase.testName });
    for (const [stepIndex, step] of testCase.steps.entries()) {
      this.logger.info('step_started', { testName: testCase.testName, stepName: step.stepName }, { stepIndex });
      for (const [actionIndex, action] of step.actions.entries()) {
        const adapter = this.factory.create(action.type);
        const context: ActionExecutionContext = {
          testName: testCase.testName,
          stepName: step.stepName,
          actionType: action.type,
          actionIndex
        };
        const startedAt = Date.now();
        await this.recovery.execute(page, context, async (attempt) => {
          this.logger.info('action_started', { ...context, attempt });
          await adapter.execute(page, action, { ...context, attempt });
          this.logger.info('action_succeeded', { ...context, attempt }, { durationMs: Date.now() - startedAt });
        });
      }
      this.logger.info('step_succeeded', { testName: testCase.testName, stepName: step.stepName });
    }
    this.logger.info('test_succeeded', { testName: testCase.testName });
  }
}
