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
through `M10`. The mutation catalogue is in `evaluation/mutations.json`.

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
Manual repair times should be recorded separately because they cannot be
measured reliably by the browser runner.
