export interface EvaluationResult {
  version: 'vanilla' | 'adaptive';
  mutation: string;
  run: number;
  passed: boolean;
  passedTests: number;
  totalTests: number;
  totalActions: number;
  fallbackCount: number;
  fallbackRate: number;
  executionTimeMs: number;
  strategyUsage?: Record<string, { successes: number; attempts: number }>;
}
