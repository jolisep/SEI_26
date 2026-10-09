import { test } from '@playwright/test';
import { resolve } from 'node:path';
import { JsonTestSuiteReader } from '../src/readers/json-test-suite-reader';
import { AdaptiveTestRunner } from '../src/engine/adaptive-test-runner';
import { StructuredEventLogger, type LogEvent } from '../src/logging/structured-event-logger';
import { summarizeAdaptiveEvents, writeEvaluationResult } from './shared/evaluation-metrics';
import { ConfidenceStore } from '../src/learning/confidence-store';

const suite = new JsonTestSuiteReader().readSync(resolve(__dirname, 'data/test-suite.json'));

test.describe('adaptive checkout evaluation', () => {
  test('customer can complete a checkout', async ({ page }, testInfo) => {
    const events: LogEvent[] = [];
    const logger = new StructuredEventLogger((event) => events.push(event));
    const mutation = process.env.MUTATION ?? 'base';
    const storePath = process.env.CONFIDENCE_STORE_PATH;
    const confidenceStore = storePath
      ? await ConfidenceStore.load(storePath, {
          alpha: Number(process.env.CONFIDENCE_ALPHA ?? 0.2),
          learningEnabled: process.env.LEARNING_ENABLED !== 'false'
        })
      : undefined;
    const runner = new AdaptiveTestRunner(logger, undefined, undefined, {
      confidenceStore,
      mutation
    });
    const startedAt = Date.now();
    let passed = false;

    try {
      await page.goto(`/?mutation=${mutation}`);
      await runner.run(page, suite.tests[0]);
      passed = true;
    } finally {
      const metrics = summarizeAdaptiveEvents(events);
      const totalActions = suite.tests[0].steps.reduce((sum, step) => sum + step.actions.length, 0);
      await writeEvaluationResult(process.env.EVALUATION_OUTPUT_PATH ?? testInfo.outputPath('metrics.json'), {
        version: 'adaptive',
        variant: process.env.LEARNING_ENABLED === 'false' ? 'fixed' : 'learning',
        experiment: process.env.EXPERIMENT ?? 'E1',
        mutation,
        run: Number(process.env.EVALUATION_RUN ?? 1),
        passed,
        passedTests: passed ? 1 : 0,
        totalTests: 1,
        totalActions,
        fallbackCount: metrics.fallbackCount,
        executionTimeMs: Date.now() - startedAt,
        strategyUsage: metrics.strategyUsage,
        actions: metrics.actions
      });
      await confidenceStore?.save();
    }
  });
});
