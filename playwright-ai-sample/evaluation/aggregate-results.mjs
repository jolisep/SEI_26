import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = resolve(root, 'evaluation/results/runs');
const files = (await readdir(directory)).filter((file) => file.endsWith('.json'));
const results = await Promise.all(files.map(async (file) => JSON.parse(await readFile(resolve(directory, file), 'utf8'))));
const mutations = JSON.parse(await readFile(resolve(root, 'evaluation/mutations.json'), 'utf8'));
const categories = new Map(mutations.map((mutation) => [mutation.id, mutation.category ?? 'unknown']));
const primaryStrategy = 'role';
const actionRows = results.flatMap((result) => (result.actions ?? []).map((action) => ({
  experiment: result.experiment ?? '',
  version: result.version,
  variant: result.variant ?? '',
  mutation: result.mutation,
  run: result.run,
  action: action.action,
  actionType: action.actionType,
  initialStrategy: action.initialStrategy,
  finalStrategy: action.finalStrategy,
  attempts: action.attempts,
  confidenceBefore: action.confidenceBefore ?? '',
  confidenceAfter: action.confidenceAfter ?? '',
  s: action.s ?? '',
  n: action.n ?? '',
  executionTimeMs: action.executionTimeMs,
  passed: action.passed
})));

const groups = new Map();
for (const result of results) {
  const key = `${result.experiment ?? ''}|${result.version}|${result.variant ?? ''}|${result.mutation}`;
  const group = groups.get(key) ?? [];
  group.push(result);
  groups.set(key, group);
}

const summary = [...groups.entries()].map(([key, group]) => {
  const [experiment, version, variant, mutation] = key.split('|');
  const times = group.map((item) => item.executionTimeMs);
  const brokenActions = group.flatMap((item) => (item.actions ?? [])
    .filter((action) => version === 'vanilla'
      ? !action.passed
      : action.finalStrategy !== action.initialStrategy)
    .map((action) => action.action));
  const nonPrimaryActions = group.flatMap((item) => (item.actions ?? [])
    .filter((action) => version === 'adaptive' && action.finalStrategy !== primaryStrategy)
    .map((action) => action.action));
  const counterpartVersion = version === 'vanilla' ? 'adaptive' : 'vanilla';
  const pairedGroup = results.filter((item) =>
    item.experiment === experiment &&
    item.version === counterpartVersion &&
    item.mutation === mutation &&
    group.some((current) => current.run === item.run)
  );
  const pairedRuns = group
    .filter((item) => item.passed && pairedGroup.some((counterpart) => counterpart.run === item.run && counterpart.passed));
  const pairedTimes = pairedRuns.map((item) => item.executionTimeMs);
  return {
    experiment,
    version,
    variant,
    mutation,
    category: categories.get(mutation) ?? 'unknown',
    executions: group.length,
    passedTests: group.filter((item) => item.passed).length,
    successRate: average(group.map((item) => item.passed ? 1 : 0)),
    distinctLocatorsBroken: new Set(brokenActions).size,
    failedRuns: group.filter((item) => !item.passed).length,
    recoveryChanges: version === 'vanilla' ? new Set(brokenActions).size : 0,
    fallbackRate: version === 'adaptive'
      ? average(group.map((item) => item.fallbackRate))
      : '',
    nonPrimaryResolvedActions: version === 'adaptive' ? nonPrimaryActions.length : 0,
    nonPrimaryResolutionRate: version === 'adaptive'
      ? (group.reduce((sum, item) => sum + item.totalActions, 0) === 0
          ? 0
          : nonPrimaryActions.length / group.reduce((sum, item) => sum + item.totalActions, 0))
      : '',
    averageExecutionTimeMs: average(times),
    executionTimeStdDevMs: standardDeviation(times),
    pairedRuns: pairedTimes.length,
    pairedAverageExecutionTimeMs: pairedTimes.length > 0 ? average(pairedTimes) : '',
    pairedExecutionTimeStdDevMs: pairedTimes.length > 0 ? standardDeviation(pairedTimes) : '',
    averageFallbackCount: average(group.map((item) => item.fallbackCount)),
    failedAttemptsPerRun: average(group.map((item) => Math.max(0, item.fallbackCount))),
    strategyUsage: mergeStrategyUsage(group)
  };
});

await writeFile(resolve(root, 'evaluation/results/summary.json'), JSON.stringify({ results, summary }, null, 2), 'utf8');
await writeCsv(resolve(root, 'evaluation/results/raw.csv'), actionRows);
await writeCsv(resolve(root, 'evaluation/results/summary.csv'), summary.map(({ strategyUsage, ...row }) => row));
console.log(JSON.stringify({ results, summary }, null, 2));

function average(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function mergeStrategyUsage(group) {
  return group.reduce((all, result) => {
    for (const [strategy, usage] of Object.entries(result.strategyUsage ?? {})) {
      const current = all[strategy] ?? { successes: 0, attempts: 0 };
      current.successes += usage.successes;
      current.attempts += usage.attempts;
      all[strategy] = current;
    }
    return all;
  }, {});
}

async function writeCsv(path, rows) {
  if (rows.length === 0) {
    await writeFile(path, '', 'utf8');
    return;
  }
  const columns = Object.keys(rows[0]);
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => csvValue(row[column])).join(','));
  }
  await writeFile(path, `${lines.join('\n')}\n`, 'utf8');
}

function csvValue(value) {
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
