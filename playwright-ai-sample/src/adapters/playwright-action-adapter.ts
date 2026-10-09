import { expect, type Locator, type Page } from '@playwright/test';
import type { LocatorStrategy, TestAction } from '../models/test-suite';
import { StructuredEventLogger, type LogContext } from '../logging/structured-event-logger';

export interface ActionExecutionContext extends LogContext {
  actionIndex: number;
}

export interface IPlaywrightActionAdapter {
  execute(page: Page, action: TestAction, context: ActionExecutionContext): Promise<void>;
}

export function resolveLocator(page: Page, strategy: LocatorStrategy): Locator {
  switch (strategy.kind) {
    case 'role':
      if (!strategy.role) throw new Error('Role strategy requires role.');
      return page.getByRole(strategy.role as Parameters<Page['getByRole']>[0], { name: strategy.name });
    case 'testId':
      if (!strategy.value) throw new Error('testId strategy requires value.');
      return page.getByTestId(strategy.value);
    case 'css':
    case 'xpath':
      if (!strategy.selector) throw new Error(`${strategy.kind} strategy requires selector.`);
      return page.locator(strategy.kind === 'xpath' ? `xpath=${strategy.selector}` : strategy.selector);
  }
}

export async function resolveWithFallback(
  page: Page,
  strategies: LocatorStrategy[],
  logger: StructuredEventLogger,
  context: ActionExecutionContext
): Promise<Locator> {
  const ordered = [...strategies].sort((left, right) => right.confidence - left.confidence);
  const failures: string[] = [];

  for (const [index, strategy] of ordered.entries()) {
    const locator = resolveLocator(page, strategy);
    try {
      await locator.waitFor({ state: 'visible', timeout: 750 });
      logger.info('strategy_selected', { ...context, attempt: context.attempt, strategyKind: strategy.kind }, {
        strategyIndex: index,
        confidence: strategy.confidence
      });
      return locator;
    } catch (error) {
      logger.warn('strategy_failed', { ...context, attempt: context.attempt, strategyKind: strategy.kind }, {
        strategyIndex: index,
        confidence: strategy.confidence,
        error: error instanceof Error ? error.message : String(error)
      });
      failures.push(`${strategy.kind}: ${error instanceof Error ? error.message : 'not visible'}`);
    }
  }

  throw new Error(`All locator strategies failed.\n${failures.join('\n')}`);
}

export class ClickActionAdapter implements IPlaywrightActionAdapter {
  constructor(private readonly logger = new StructuredEventLogger()) {}

  async execute(page: Page, action: TestAction, context: ActionExecutionContext): Promise<void> {
    await (await resolveWithFallback(page, action.strategies, this.logger, context)).click();
  }
}

export class FillActionAdapter implements IPlaywrightActionAdapter {
  constructor(private readonly logger = new StructuredEventLogger()) {}

  async execute(page: Page, action: TestAction, context: ActionExecutionContext): Promise<void> {
    await (await resolveWithFallback(page, action.strategies, this.logger, context)).fill(action.value ?? '');
  }
}

export class AssertTextActionAdapter implements IPlaywrightActionAdapter {
  constructor(private readonly logger = new StructuredEventLogger()) {}

  async execute(page: Page, action: TestAction, context: ActionExecutionContext): Promise<void> {
    await expect(await resolveWithFallback(page, action.strategies, this.logger, context)).toHaveText(action.value ?? '');
  }
}

export class WaitActionAdapter implements IPlaywrightActionAdapter {
  constructor(private readonly logger = new StructuredEventLogger()) {}

  async execute(page: Page, action: TestAction, context: ActionExecutionContext): Promise<void> {
    await (await resolveWithFallback(page, action.strategies, this.logger, context)).waitFor({ state: 'visible' });
  }
}
