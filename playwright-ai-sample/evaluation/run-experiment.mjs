import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { execSync, spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const experiment = process.argv[2] ?? process.env.EXPERIMENT ?? 'E1';
const allMutations = JSON.parse(await readFile(resolve(root, 'evaluation/mutations.json'), 'utf8'));
const mutations = ['E2', 'E3'].includes(experiment)
  ? allMutations.filter((mutation) => mutation.id === 'M01')
  : allMutations;
const variants = experiment === 'E2' ? ['fixed', 'learning'] : ['learning'];
const requestedVersions = process.env.EVALUATION_VERSIONS?.split(',').filter(Boolean);
const versions = requestedVersions?.length
  ? requestedVersions
  : experiment === 'E3' ? ['adaptive'] : experiment === 'E2' ? ['adaptive'] : ['vanilla', 'adaptive'];
const repetitions = parseRepetitions(process.env.EXPERIMENT_REPETITIONS ?? '10');

if (process.env.EVALUATION_CLEAN === 'true') {
  await cleanPreviousResults();
}

const server = spawn(process.execPath, ['demo/server.mjs'], { cwd: root, stdio: 'ignore' });

await waitForServer();

try {
  for (let run = 1; run <= repetitions; run += 1) {
    for (const version of versions) {
      for (const mutation of mutations) {
        for (const variant of variants) {
          const resultVariant = version === 'vanilla' ? 'baseline' : variant;
          const runId = String(run).padStart(2, '0');
          const storeName = experiment === 'E3'
            ? 'confidence-store-e3.json'
            : experiment === 'E2'
              ? `confidence-store-e2-${variant}.json`
              : `confidence-store-e1-${mutation.id}.json`;
          const confidenceStorePath = resolve(root, 'evaluation/results', storeName);
          const destination = resolve(
            root,
            'evaluation/results/runs',
            `${experiment}-${version}-${resultVariant}-${mutation.id}-R${runId}.json`
          );
          const env = {
            ...process.env,
            MUTATION: mutation.id,
            EVALUATION_RUN: String(run),
            EXPERIMENT: experiment,
            LEARNING_ENABLED: variant !== 'fixed' ? 'true' : 'false',
            CONFIDENCE_STORE_PATH: confidenceStorePath,
            EVALUATION_OUTPUT_PATH: destination,
            PLAYWRIGHT_REPORT_DIR: `playwright-report/${version}/${resultVariant}/${mutation.id}/R${runId}`
          };
          try {
            const playwright = resolve(root, 'node_modules', '.bin',
              process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
            execSync(`"${playwright}" test --project ${version}`, { cwd: root, env, stdio: 'inherit' });
          } catch (error) {
            console.error(error instanceof Error ? error.message : String(error));
            if (error.stdout) console.error(error.stdout.toString());
            if (error.stderr) console.error(error.stderr.toString());
            console.log(`Expected test failure recorded for ${version}/${mutation.id}/${variant}/R${runId}`);
          }

          await mkdir(dirname(destination), { recursive: true });
        }
      }
    }
  }
} finally {
  server.kill();
}

await writeFile(resolve(root, 'evaluation/results/.last-run'), new Date().toISOString(), 'utf8');

function parseRepetitions(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('EXPERIMENT_REPETITIONS must be a positive integer.');
  }
  return parsed;
}

async function cleanPreviousResults() {
  const directory = resolve(root, 'evaluation/results/runs');
  const files = await readdir(directory).catch(() => []);
  const generatedResult = /^E\d-.*\.json$/;
  await Promise.all(
    files
      .filter((file) => generatedResult.test(file))
      .map((file) => unlink(resolve(directory, file)))
  );
  const resultFiles = await readdir(resolve(root, 'evaluation/results')).catch(() => []);
  await Promise.all(
    resultFiles
      .filter((file) => /^confidence-store-(?:e1|e2|e3)/i.test(file))
      .map((file) => unlink(resolve(root, 'evaluation/results', file)))
  );
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await fetch('http://127.0.0.1:4173/');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('Demo server did not start on port 4173.');
}
