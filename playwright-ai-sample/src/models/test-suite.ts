export type ActionType = 'click' | 'fill' | 'assertText' | 'wait';
export type StrategyKind = 'role' | 'testId' | 'css' | 'xpath';

export interface LocatorStrategy {
  kind: StrategyKind;
  confidence: number;
  role?: string;
  name?: string;
  value?: string;
  selector?: string;
}

export interface TestAction {
  type: ActionType;
  value?: string;
  strategies: LocatorStrategy[];
}

export interface TestStep {
  stepName: string;
  actions: TestAction[];
}

export interface TestCase {
  testName: string;
  steps: TestStep[];
}

export interface TestSuite {
  suiteName: string;
  tests: TestCase[];
}
