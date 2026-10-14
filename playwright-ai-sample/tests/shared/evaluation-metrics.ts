import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { LogEvent } from '../../src/logging/structured-event-logger';
import type { EvaluationResult } from '../../src/models/evaluation-result';

export interface ActionEvaluation {
  action: string;
  actionType: string;
  initialStrategy: string;
  finalStrategy: string | 'failed';
  attempts: number;
  confidenceBefore?: number;
  confidenceAfter?: number;
  s?: number;
  n?: number;
  confidenceByStrategy?: Record<string, number>;
  executionTimeMs: number;
  passed: boolean;
}

export async function runVanillaAction(
  actions: ActionEvaluation[],
  action: string,
  actionType: string,
  operation: () => Promise<void>
): Promise<void> {
  const startedAt = Date.now();
  let passed = false;
  try {
    await operation();
    passed = true;
  } finally {
    actions.push({
      action,
      actionType,
      initialStrategy: 'role',
      finalStrategy: passed ? 'role' : 'failed',
      attempts: 1,
      executionTimeMs: Date.now() - startedAt,
      passed
    });
  }
}

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
  actions: ActionEvaluation[];
} {
  const selected = events.filter((event) => event.event === 'strategy_selected');
  const failed = events.filter((event) => event.event === 'strategy_failed');
  const strategyUsage: Record<string, { successes: number; attempts: number }> = {};
  const actionEvents = new Map<string, LogEvent[]>();

  for (const event of events) {
    if (typeof event.actionIndex !== 'number') continue;
    const key = `${event.stepName ?? 'step'}:${event.actionIndex}`;
    const current = actionEvents.get(key) ?? [];
    current.push(event);
    actionEvents.set(key, current);
  }

  for (const event of selected) {
    const kind = String(event.strategyKind);
    const current = strategyUsage[kind] ?? { successes: 0, attempts: 0 };
    current.successes += 1;
    current.attempts += Number(event.strategyIndex ?? 0) + 1;
    strategyUsage[kind] = current;
  }

  const actions = [...actionEvents.entries()].map(([actionKey, actionEventsForIndex]) => {
    const failedStrategies = actionEventsForIndex.filter((event) => event.event === 'strategy_failed');
    const selected = actionEventsForIndex.find((event) => event.event === 'strategy_selected');
    const completed = actionEventsForIndex.find((event) => event.event === 'action_succeeded');
    const firstStrategy = [...failedStrategies, selected][0];
    return {
      action: actionKey,
      actionType: String(actionEventsForIndex.find((event) => event.actionType)?.actionType ?? 'unknown'),
      initialStrategy: String(firstStrategy?.strategyKind ?? 'unknown'),
      finalStrategy: selected ? String(selected.strategyKind) : 'failed',
      attempts: failedStrategies.length + (selected ? 1 : 0),
      confidenceBefore: selected?.confidenceBefore as number | undefined ?? failedStrategies[0]?.confidenceBefore as number | undefined,
      confidenceAfter: selected?.confidenceAfter as number | undefined ?? failedStrategies.at(-1)?.confidenceAfter as number | undefined,
      s: selected?.s as number | undefined ?? failedStrategies.at(-1)?.s as number | undefined,
      n: selected?.n as number | undefined ?? failedStrategies.at(-1)?.n as number | undefined,
      confidenceByStrategy: [...actionEventsForIndex]
        .reverse()
        .find((event) => event.event === 'strategy_selected')
        ?.confidenceByStrategy as Record<string, number> | undefined ?? {},
      executionTimeMs: Number(completed?.durationMs ?? 0),
      passed: Boolean(selected)
    };
  });

  return { fallbackCount: failed.length, strategyUsage, actions };
}
