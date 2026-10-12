# AI-driven Playwright sample

This sample implements the architecture in `../playwright-ai-architecture.puml`:

- `JsonTestSuiteReader` loads and validates external test behavior.
- `ActionAdapterFactory` selects an adapter for each action type.
- Adapters delegate to Playwright methods such as `click`, `fill`, and `expect(...).toHaveText`.
- Locator strategies are ranked by confidence and tried with fallback behavior.
- The spec file registers every JSON test with a `for...of` loop, including its `testName`.
- Structured JSON logs record test, step, action, strategy, confidence, attempt, and outcome data.
- `RecoveryManager` performs bounded retries, reloads the page between attempts, and captures a screenshot for terminal failures.
- `demo/` provides a local application under test, so the example is self-contained.

## Explain it to me like I'm five

Imagine you have a little robot that checks whether a website works:

1. The JSON file is the robot's to-do list. It says things like “click the
   Add to cart button.”
2. The Playwright adapters are the robot's hands. They click buttons, type into
   boxes, and check that the right words appear.
3. A locator is the robot's way of finding something on the screen. It tries
   the most trustworthy description first, then tries backup descriptions if
   the page has changed.
4. If the robot makes a mistake, the recovery manager lets it try again,
   reloads the page, and takes a screenshot if the problem cannot be fixed.
5. The test spec is the robot's schedule. It reads every item in the JSON
   to-do list, so adding another test usually only means adding another JSON
   object.

In short: **JSON says what to do, the adapters do it, and the recovery code
helps when the website is a little different than expected.**

## Run

Requires Node.js 20 or newer.

```powershell
npm install
npx playwright install chromium
npm test
```

The add-to-cart action deliberately starts with a missing test id. The test passes by falling back to its CSS strategy. Add more objects to `tests/data/test-suite.json`; no new `test(...)` block is needed.

Useful commands:

```powershell
npm run test:headed
npm run test:ui
```

Recovery behavior is covered by `tests/recovery.spec.ts`. Log events are emitted to the console by default; pass a custom sink to `StructuredEventLogger` to write them to a file or CI collector.

To adapt the suite, edit `tests/data/test-suite.json`. An LLM or UI analyzer can update the strategy list when the application markup changes while leaving the runner unchanged.

## Controlled evaluation

The project includes a shared checkout flow executed by two Playwright projects:

- `vanilla`: direct Playwright locators in `tests/vanilla-checkout.spec.ts`;
- `adaptive`: the existing JSON-driven adapter and fallback runner.

The demo server applies reproducible UI mutations selected with `?mutation=M01`
through `M12`. The mutation catalogue is in `evaluation/mutations.json`.

Run one version or the complete experiment:

```powershell
npm test -- --project=vanilla
npm test -- --project=adaptive
npm run evaluation:run
npm run evaluation:aggregate
npm run evaluation:charts
```

Raw execution metrics are written to `evaluation/results/runs`, summaries to
`evaluation/results/summary.json`, and SVG charts to `evaluation/charts`.

To repeat the complete experiment 10 times, clean old run files and set the
number of repetitions in PowerShell:

```powershell
$env:EXPERIMENT_REPETITIONS = '10'
$env:EVALUATION_CLEAN = 'true'
npm run evaluation:run
Remove-Item Env:\EXPERIMENT_REPETITIONS
Remove-Item Env:\EVALUATION_CLEAN
npm run evaluation:aggregate
npm run evaluation:charts
```

Each result is saved with its repetition number (for example,
`adaptive-M03-R07.json`), so the 10 repetitions produce 200 mutation-result
files without overwriting one another. Any separately retained baseline files
remain available. `EVALUATION_CLEAN=true` only removes result files generated
by the experiment before starting.

## Experimental protocol

The controlled evaluation has three executable modes:

```powershell
$env:EXPERIMENT_REPETITIONS = '10'
$env:EVALUATION_CLEAN = 'true'
npm run evaluation:e1       # vanilla vs adaptive, M01-M12, confidence reset
npm run evaluation:e2       # fixed vs learning, persistent M02
npm run evaluation:e3       # learning over 10 persistent M02 runs
Remove-Item Env:\EXPERIMENT_REPETITIONS
Remove-Item Env:\EVALUATION_CLEAN
npm run evaluation:aggregate
npm run evaluation:charts
```

E1 resets the confidence store before each adaptive mutation. E2 runs the
adaptive suite with learning disabled and enabled, both on M02. E3 keeps the
learning-enabled store between runs so `s`, `n`, and confidence evolve.
The update is `s' = (1 - alpha) * s + alpha * observation`, with
`alpha = 0.2` by default; priors are the confidence values in
`tests/data/test-suite.json` (`role=0.9`, `testId=0.85`, `css=0.6`,
`xpath=0.4`).

The aggregator writes `evaluation/results/raw.csv` (one row per action and
run), `evaluation/results/summary.csv` (aggregates by mutation, version, and
variant), and `summary.json`. The raw rows include the selected and final
strategy, attempts, confidence `s`/`n` before and after, action duration, and
pass/fail. The summary separates distinct affected locator actions from failed
runs and manual recovery changes. For adaptive runs it also reports actions
resolved by a non-primary strategy and their rate; this is different from the
fallback rate because a learned non-primary strategy can be selected directly.
Paired timing fields include only runs where both vanilla and adaptive pass.
The charts are monochrome SVGs without an image title:
`success-rate.svg`, `strategy-usage.svg`, and the optional
`confidence-evolution.svg`.

The mutation categories are fixed in `evaluation/mutations.json` before the
experiment: M01, M09, M11, and M12 are semantic; M02-M08 and M10 are cosmetic.
M11 changes the cart count from one to two, while M12 prevents the order
success message from being produced; both should be caught by the existing
assertions in vanilla and adaptive runs. The
vanilla baseline uses only Playwright role locators and no project adapters.
The checkout contains 11 actions: two product actions, three customer-detail
actions, and six coupon/order actions. E4 is covered by
`tests/confidence-store.spec.ts`, which checks the formula with hand-calculated
values.
Manual repair times should be recorded separately because they cannot be
measured reliably by the browser runner.
