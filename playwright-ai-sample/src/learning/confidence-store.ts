import { readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';

export interface ConfidenceState {
  s: number;
  n: number;
}

export type ConfidenceSnapshot = Record<string, ConfidenceState>;

export interface ConfidenceStoreOptions {
  alpha?: number;
  learningEnabled?: boolean;
}

export class ConfidenceStore {
  private readonly alpha: number;
  private readonly learningEnabled: boolean;
  private readonly values: ConfidenceSnapshot;

  private constructor(
    private readonly path: string,
    values: ConfidenceSnapshot,
    options: ConfidenceStoreOptions = {}
  ) {
    this.values = values;
    this.alpha = options.alpha ?? 0.2;
    this.learningEnabled = options.learningEnabled ?? true;
    if (this.alpha <= 0 || this.alpha > 1) {
      throw new Error('Confidence alpha must be greater than 0 and at most 1.');
    }
  }

  static async load(path: string, options: ConfidenceStoreOptions = {}): Promise<ConfidenceStore> {
    try {
      const parsed = JSON.parse(await readFile(path, 'utf8')) as ConfidenceSnapshot;
      return new ConfidenceStore(path, parsed, options);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return new ConfidenceStore(path, {}, options);
    }
  }

  get(key: string, prior: number): number {
    const state = this.values[key] ?? { s: prior, n: 1 };
    this.values[key] = state;
    return state.s;
  }

  update(key: string, prior: number, succeeded: boolean): { before: number; after: number; s: number; n: number } {
    const before = this.get(key, prior);
    const state = this.values[key];
    if (this.learningEnabled) {
      state.s = (1 - this.alpha) * state.s + this.alpha * (succeeded ? 1 : 0);
      state.n += 1;
    }
    return { before, after: state.s, s: state.s, n: state.n };
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(this.values, null, 2), 'utf8');
  }
}
