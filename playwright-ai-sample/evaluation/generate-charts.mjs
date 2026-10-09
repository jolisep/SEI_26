import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const data = JSON.parse(await readFile(resolve(root, 'evaluation/results/summary.json'), 'utf8'));
const output = resolve(root, 'evaluation/charts');
await mkdir(output, { recursive: true });

for (const metric of [
  ['success-rate', 'Success rate', (item) => item.successRate],
  ['execution-time', 'Average execution time (ms)', (item) => item.averageExecutionTimeMs],
  ['fallback-rate', 'Average fallback rate', (item) => item.averageFallbackRate]
]) {
  const max = Math.max(...data.summary.map(metric[2]), 1);
  const bars = data.summary.map((item, index) => {
    const height = Math.round((metric[2](item) / max) * 220);
    const x = 120 + index * 180;
    return `<rect x="${x}" y="${270 - height}" width="90" height="${height}" fill="${index === 0 ? '#4c78a8' : '#f58518'}"/><text x="${x + 45}" y="295" text-anchor="middle">${item.version}</text><text x="${x + 45}" y="${260 - height}" text-anchor="middle">${metric[2](item).toFixed(2)}</text>`;
  }).join('');
  await writeFile(resolve(output, `${metric[0]}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="340"><text x="250" y="25" text-anchor="middle">${metric[1]}</text><line x1="80" y1="270" x2="450" y2="270" stroke="black"/>${bars}</svg>`, 'utf8');
}
