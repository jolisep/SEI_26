import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = resolve(root, 'evaluation/results/runs');
const files = (await readdir(directory)).filter((file) => file.endsWith('.json'));
const results = await Promise.all(files.map(async (file) => JSON.parse(await readFile(resolve(directory, file), 'utf8'))));
const summary = [];

for (const version of ['vanilla', 'adaptive']) {
  const group = results.filter((result) => result.version === version);
  summary.push({
    version,
    executions: group.length,
    successRate: group.length === 0 ? 0 : group.filter((result) => result.passed).length / group.length,
    averageExecutionTimeMs: average(group.map((result) => result.executionTimeMs)),
    averageFallbackRate: average(group.map((result) => result.fallbackRate)),
    averageFallbackCount: average(group.map((result) => result.fallbackCount))
  });
}

await writeFile(resolve(root, 'evaluation/results/summary.json'), JSON.stringify({ results, summary }, null, 2), 'utf8');
console.log(JSON.stringify({ results, summary }, null, 2));

function average(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}
