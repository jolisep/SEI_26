import type { ActionType } from '../models/test-suite';
import { StructuredEventLogger } from '../logging/structured-event-logger';
import {
  AssertTextActionAdapter,
  ClickActionAdapter,
  FillActionAdapter,
  type IPlaywrightActionAdapter,
  WaitActionAdapter
} from '../adapters/playwright-action-adapter';

export class ActionAdapterFactory {
  constructor(private readonly logger = new StructuredEventLogger()) {}

  create(actionType: ActionType): IPlaywrightActionAdapter {
    switch (actionType) {
      case 'click': return new ClickActionAdapter(this.logger);
      case 'fill': return new FillActionAdapter(this.logger);
      case 'assertText': return new AssertTextActionAdapter(this.logger);
      case 'wait': return new WaitActionAdapter(this.logger);
      default: throw new Error(`Unsupported action type: ${actionType satisfies never}`);
    }
  }
}
