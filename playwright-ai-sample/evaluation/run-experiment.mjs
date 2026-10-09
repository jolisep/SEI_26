import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execSync, spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const mutations = JSON.parse(await readFile(resolve(root, 'evaluation/mutations.json'), 'utf8'));
const versions = ['vanilla', 'adaptive'];
const server = spawn(process.execPath, ['demo/server.mjs'], { cwd: root, stdio: 'ignore' });

await waitForServer();

for (const version of versions) {
  for (const mutation of mutations) {
    const destination = resolve(root, 'evaluation/results/runs', `${version}-${mutation.id}.json`);
    const env = {
      ...process.env,
      MUTATION: mutation.id,
      EVALUATION_RUN: '1',
      EVALUATION_OUTPUT_PATH: destination,
      PLAYWRIGHT_REPORT_DIR: `playwright-report/${version}/${mutation.id}`
    };
    try {
      const playwright = resolve(root, 'node_modules', '.bin',
        process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
      execSync(`"${playwright}" test --project ${version}`, { cwd: root, env, stdio: 'inherit' });
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      if (error.stdout) console.error(error.stdout.toString());
      if (error.stderr) console.error(error.stderr.toString());
      console.log(`Expected test failure recorded for ${version}/${mutation.id}`);
    }

    await mkdir(dirname(destination), { recursive: true });
  }
}

server.kill();
await writeFile(resolve(root, 'evaluation/results/.last-run'), new Date().toISOString(), 'utf8');

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
