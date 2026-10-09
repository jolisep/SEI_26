import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { LogEvent } from '../../src/logging/structured-event-logger';
import type { EvaluationResult } from '../../src/models/evaluation-result';

export async function writeEvaluationResult(
  path: string,
  result: Omit<EvaluationResult, 'fallbackRate'>
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({
    ...result,
    fallbackRate: result.totalActions === 0 ? 0 : result.fallbackCount / result.totalActions
  }, null, 2), 'utf8');
}

export function summarizeAdaptiveEvents(events: LogEvent[]): {
  fallbackCount: number;
  strategyUsage: Record<string, { successes: number; attempts: number }>;
} {
  const selected = events.filter((event) => event.event === 'strategy_selected');
  const failed = events.filter((event) => event.event === 'strategy_failed');
  const strategyUsage: Record<string, { successes: number; attempts: number }> = {};

  for (const event of selected) {
    const kind = String(event.strategyKind);
    const current = strategyUsage[kind] ?? { successes: 0, attempts: 0 };
    current.successes += 1;
    current.attempts += Number(event.strategyIndex ?? 0) + 1;
    strategyUsage[kind] = current;
  }

  return { fallbackCount: failed.length, strategyUsage };
}
