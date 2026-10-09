import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import type { TestSuite } from '../models/test-suite';

export class JsonTestSuiteReader {
  readSync(filePath: string): TestSuite {
    const contents = readFileSync(filePath, 'utf8');
    const suite = JSON.parse(contents) as TestSuite;
    this.validate(suite);
    return suite;
  }

  async read(filePath: string): Promise<TestSuite> {
    const contents = await readFile(filePath, 'utf8');
    const suite = JSON.parse(contents) as TestSuite;
    this.validate(suite);
    return suite;
  }

  private validate(suite: TestSuite): void {
    if (!suite.suiteName || !Array.isArray(suite.tests)) {
      throw new Error('Invalid test suite: suiteName and tests are required.');
    }

    for (const test of suite.tests) {
      if (!test.testName || !Array.isArray(test.steps)) {
        throw new Error('Invalid test: testName and steps are required.');
      }
      for (const step of test.steps) {
        for (const action of step.actions) {
          if (!action.type || action.strategies.length < 2) {
            throw new Error(`Action '${action.type}' must define at least two strategies.`);
          }
        }
      }
    }
  }
}
