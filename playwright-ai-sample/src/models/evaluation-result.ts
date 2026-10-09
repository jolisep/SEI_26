export interface EvaluationResult {
  version: 'vanilla' | 'adaptive';
  variant?: 'fixed' | 'learning';
  experiment?: string;
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
  actions?: Array<{
    action: string;
    actionType: string;
    initialStrategy: string;
    finalStrategy: string;
    attempts: number;
    confidenceBefore?: number;
    confidenceAfter?: number;
    s?: number;
    n?: number;
    executionTimeMs: number;
    passed: boolean;
  }>;
}
