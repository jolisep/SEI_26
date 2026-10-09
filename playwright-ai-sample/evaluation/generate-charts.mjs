import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const data = JSON.parse(await readFile(resolve(root, 'evaluation/results/summary.json'), 'utf8'));
const output = resolve(root, 'evaluation/charts');
const mutations = JSON.parse(await readFile(resolve(root, 'evaluation/mutations.json'), 'utf8'));
await mkdir(output, { recursive: true });

const mutationLabels = mutations.map((mutation) => mutation.id);
const e1 = mutationLabels.map((mutation) => ({
  mutation,
  category: mutation.category,
  vanilla: averageFor('vanilla', mutation, 'successRate'),
  adaptive: averageFor('adaptive', mutation, 'successRate')
}));
await writeFile(resolve(output, 'success-rate.svg'), groupedBars(
  e1,
  ['vanilla', 'adaptive'],
  'successRate',
  ['#222', '#999'],
  (item) => item.mutation,
  { xLabel: 'Mutation', yLabel: 'Tests passed (%)', groupLabel: 'Mutation category' }
), 'utf8');

const strategyRows = mutationLabels.map((mutation) => {
  const results = data.results.filter((result) =>
    (!result.experiment || result.experiment === 'E1') &&
    result.version === 'adaptive' &&
    (!result.variant || result.variant === 'learning') &&
    result.mutation === mutation
  );
  return {
    mutation,
    category: mutation === 'base' ? 'baseline' : mutations.find((item) => item.id === mutation)?.category,
    ...mergeStrategyUsage(results)
  };
});
await writeFile(resolve(output, 'strategy-usage.svg'), groupedStrategyBars(strategyRows), 'utf8');

const confidence = data.results
  .filter((result) => result.version === 'adaptive' && result.experiment === 'E3' && result.mutation === 'M01')
  .flatMap((result) => (result.actions ?? []).map((action) => ({
    run: result.run,
    strategy: action.finalStrategy,
    confidence: action.confidenceAfter
  })))
  .filter((item) => typeof item.confidence === 'number');
await writeFile(resolve(output, 'confidence-evolution.svg'), lineChart(confidence), 'utf8');

function averageFor(version, mutation, field) {
  const rows = data.results.filter((item) =>
    (!item.experiment || item.experiment === 'E1') &&
    item.version === version &&
    item.mutation === mutation
  );
  if (rows.length === 0) return 0;
  if (field === 'successRate') return rows.filter((row) => row.passed).length / rows.length;
  return rows.reduce((sum, row) => sum + row[field], 0) / rows.length;
}

function mergeStrategyUsage(results) {
  return results.reduce((all, result) => {
    for (const [strategy, usage] of Object.entries(result.strategyUsage ?? {})) {
      const current = all[strategy] ?? { successes: 0, attempts: 0 };
      current.successes += usage.successes;
      current.attempts += usage.attempts;
      all[strategy] = current;
    }
    return all;
  }, {});
}

function groupedBars(rows, series, field, colors, label, labels) {
  const groupWidth = 78;
  const width = Math.max(820, rows.length * groupWidth + 70);
  const axisX = 58;
  const chartBottom = 280;
  const chartTop = 70;
  const groupLabels = categoryBands(rows, groupWidth, 24, axisX);
  const bars = rows.flatMap((row, index) => series.map((name, seriesIndex) => {
    const value = Number(row[name] ?? 0);
    const x = axisX + 15 + index * groupWidth + seriesIndex * 24;
    const height = Math.round(value * (chartBottom - chartTop));
    return `<rect x="${x}" y="${chartBottom - height}" width="18" height="${height}" fill="${colors[seriesIndex]}"/>`;
  })).join('');
  const xLabels = rows.map((row, index) => `<text x="${axisX + 15 + index * groupWidth + ((series.length - 1) * 24) / 2 + 9}" y="305" text-anchor="middle">${label(row)}</text>`).join('');
  const legend = series.map((name, index) => `<rect x="${width - 205 + index * 95}" y="42" width="12" height="12" fill="${colors[index]}"/><text x="${width - 188 + index * 95}" y="52">${name}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="355"><text x="${width / 2}" y="345" text-anchor="middle">${labels.xLabel}</text><text x="12" y="${(chartTop + chartBottom) / 2}" text-anchor="middle" transform="rotate(-90 12 ${(chartTop + chartBottom) / 2})">${labels.yLabel}</text>${yTicks(chartTop, chartBottom, 0.2, 0, 1, true, axisX, width - 20)}<line x1="${axisX}" y1="${chartBottom}" x2="${width - 20}" y2="${chartBottom}" stroke="#000"/>${groupLabels}${legend}${bars}${xLabels}</svg>`;
}

function groupedStrategyBars(rows) {
  const strategies = ['role', 'testId', 'css', 'xpath'];
  const colors = ['#1b5e20', '#388e3c', '#66bb6a', '#a5d6a7'];
  const groupWidth = 78;
  const axisX = 58;
  const chartBottom = 270;
  const chartTop = 70;
  const maxValue = Math.max(...rows.flatMap((row) => strategies.map((strategy) => Number(row[strategy]?.successes ?? 0))), 1);
  const width = Math.max(820, rows.length * groupWidth + 70);
  const bars = rows.map((row, index) => strategies.map((strategy, strategyIndex) => {
    const usage = row[strategy] ?? { successes: 0 };
    const height = Math.round((Number(usage.successes ?? 0) / maxValue) * (chartBottom - chartTop));
    const x = axisX + 15 + index * groupWidth + strategyIndex * 16;
    return `<rect x="${x}" y="${chartBottom - height}" width="12" height="${height}" fill="${colors[strategyIndex]}"/>`;
  }).join('')).join('');
  const legend = strategies.map((strategy, index) => `<rect x="${45 + index * 90}" y="30" width="12" height="12" fill="${colors[index]}"/><text x="${62 + index * 90}" y="40">${strategy}</text>`).join('');
  const xLabels = rows.map((row, index) => `<text x="${axisX + 15 + index * groupWidth + 24}" y="295" text-anchor="middle">${index === 0 ? 'Base' : row.mutation}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="340"><text x="${width / 2}" y="330" text-anchor="middle">Mutation</text><text x="12" y="${(chartTop + chartBottom) / 2}" text-anchor="middle" transform="rotate(-90 12 ${(chartTop + chartBottom) / 2})">Strategy selections</text>${yTicks(chartTop, chartBottom, Math.ceil(maxValue / 5), 0, maxValue, false, axisX, width - 20)}<line x1="${axisX}" y1="${chartBottom}" x2="${width - 20}" y2="${chartBottom}" stroke="#000"/>${legend}${bars}${xLabels}</svg>`;
}

function categoryBands(rows, groupWidth, y, axisX) {
  return rows.map((row, index) => {
    if (index > 0 && row.category === rows[index - 1].category) return '';
    const last = rows.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate.category !== row.category);
    const end = last === -1 ? rows.length : last;
    const x = axisX + 15 + ((index + end - 1) / 2) * groupWidth + 30;
    const label = row.category === 'cosmetic' ? 'Cosmetic mutations' : row.category === 'semantic' ? 'Semantic mutations' : 'Baseline';
    return `<text x="${x}" y="${y}" text-anchor="middle">${label}</text>`;
  }).join('');
}

function yTicks(top, bottom, step, min, max, percentage, axisX, rightX) {
  const ticks = [];
  const count = Math.round((max - min) / step);
  for (let index = 0; index <= count; index += 1) {
    const value = index === count ? max : min + index * step;
    const y = bottom - ((value - min) / (max - min || 1)) * (bottom - top);
    const label = percentage
      ? `${Math.round(value * 100)}%`
      : Number.isInteger(value) ? String(value) : value.toFixed(1);
    ticks.push(`<line x1="${axisX - 5}" y1="${y}" x2="${axisX}" y2="${y}" stroke="#000"/><line x1="${axisX}" y1="${y}" x2="${rightX}" y2="${y}" stroke="#ddd"/><text x="${axisX - 8}" y="${y + 4}" text-anchor="end">${label}</text>`);
  }
  return ticks.join('');
}

function lineChart(rows) {
  const byRunAndStrategy = new Map();
  for (const row of rows) {
    const key = `${row.run}|${row.strategy}`;
    const values = byRunAndStrategy.get(key) ?? [];
    values.push(row.confidence);
    byRunAndStrategy.set(key, values);
  }
  const aggregated = [...byRunAndStrategy.entries()].map(([key, values]) => {
    const [run, strategy] = key.split('|');
    return { run: Number(run), strategy, confidence: values.reduce((sum, value) => sum + value, 0) / values.length };
  });
  const maxRun = Math.max(...aggregated.map((row) => row.run), 1);
  const width = Math.max(640, 80 + maxRun * 55);
  const chartLeft = 58;
  const chartRight = width - 20;
  const chartTop = 60;
  const chartBottom = 280;
  const series = [...new Set(aggregated.map((row) => row.strategy))];
  const paths = series.map((strategy, seriesIndex) => {
    const points = aggregated.filter((row) => row.strategy === strategy)
      .sort((left, right) => left.run - right.run)
      .map((row) => `${chartLeft + row.run * 55},${chartBottom - row.confidence * (chartBottom - chartTop)}`)
      .join(' ');
    return `<polyline points="${points}" fill="none" stroke="${seriesIndex ? '#888' : '#222'}" stroke-width="2"/>`;
  }).join('');
  const legend = series.map((strategy, index) => `<line x1="${width - 180 + index * 90}" y1="18" x2="${width - 160 + index * 90}" y2="18" stroke="${index ? '#888' : '#222'}" stroke-width="2"/><text x="${width - 155 + index * 90}" y="22">${strategy}</text>`).join('');
  const xTicks = Array.from({ length: maxRun }, (_, index) => {
    const run = index + 1;
    const x = chartLeft + run * 55;
    return `<line x1="${x}" y1="${chartBottom}" x2="${x}" y2="${chartBottom + 5}" stroke="#000"/><text x="${x}" y="302" text-anchor="middle">${run}</text>`;
  }).join('');
  const roleByRun = new Map(aggregated.filter((row) => row.strategy === 'role').map((row) => [row.run, row.confidence]));
  const testIdByRun = new Map(aggregated.filter((row) => row.strategy === 'testId').map((row) => [row.run, row.confidence]));
  const crossingRun = [...roleByRun.keys()]
    .sort((left, right) => left - right)
    .find((run) => (testIdByRun.get(run) ?? -Infinity) >= (roleByRun.get(run) ?? Infinity));
  const crossing = crossingRun
    ? `<line x1="${chartLeft + crossingRun * 55}" y1="${chartTop}" x2="${chartLeft + crossingRun * 55}" y2="${chartBottom}" stroke="#555" stroke-dasharray="4 4"/><text x="${chartLeft + crossingRun * 55 + 5}" y="${chartTop + 14}" font-size="11">crossing: run ${crossingRun}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="340"><text x="${width / 2}" y="330" text-anchor="middle">Run</text><text x="12" y="175" text-anchor="middle" transform="rotate(-90 12 175)">Confidence</text>${yTicks(chartTop, chartBottom, 0.2, 0, 1, false, chartLeft, chartRight)}<line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#000"/>${xTicks}<line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${chartBottom}" stroke="#000"/>${legend}${crossing}${paths}</svg>`;
}
