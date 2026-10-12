# Build toolchain

An overview of the quality-gate tooling around the app:

- static analysis
- test execution
- code coverage
- various reports each of these produces.

See [ADR 0010](/adr/0010-quality-toolchain) for why this is a set of independent, purpose-built tools
rather than one consolidated tool.

## Linting

Two separate linters cover different concerns:

```sh
npm run lint       # eslint ./
npm run ui5lint     # ui5lint
```

- **ESLint** (`eslint.config.mjs`) — general TypeScript/JavaScript correctness and style, covering both
  `webapp/` and `scripts/` (see [ADR 0008](/adr/0008-typescript-everywhere)).
- **`@ui5/linter`** (`ui5lint`) — UI5-specific checks beyond what a generic TS/JS linter can catch.

Type checking runs separately via `npm run ts-typecheck` (the app, `webapp/`) and
`npm run ts-typecheck:scripts` (`scripts/`), each against its own `tsconfig.json`.

`npm test` currently runs `npm run lint && npm run test:e2e`

## UI tests (Playwright)

See [ADR 0009](/adr/0009-ui-tests-as-primary-strategy) for why this is the app's primary (and only) test
layer. End-to-end UI tests live under `tests/e2e/` and are driven by [Playwright](https://playwright.dev)
(`playwright.config.ts`), one spec file per app page (`main.spec.ts`, `my-products.spec.ts`,
`my-products-add.spec.ts`, `support-status.spec.ts`, `product-detail.spec.ts`, `upload-download.spec.ts`).
The app has no backend, so every test starts from a fresh page load (bundled `PAM.json` + empty
`OwnProducts.json`) and interacts purely through the UI — see `tests/testcases.md` for the suite's general
test instructions, and the screenshots in [App workflow & pages](/workflow) (pulled directly from this
suite's own visual-regression snapshots).

```sh
npm run test:e2e                     # run the full suite headless
npm run test:e2e:ui                   # Playwright's interactive UI runner, for debugging
npm run test:e2e:typecheck            # tsc --noEmit over the e2e suite's own tsconfig
npm run test:e2e:update-snapshots      # regenerate every baseline screenshot (see below)
```

`test:e2e:update-snapshots` runs with `--update-snapshots=all`, not the bare `--update-snapshots` flag —
Playwright's default mode (`changed`) only rewrites a baseline if the new screenshot falls *outside* the
tolerance configured below, so an intentional but visually minor change (e.g. the app's title text) can
silently fail to update most snapshots even though the run "passes". `=all` forces every baseline to be
rewritten regardless of whether it would already pass. Run this after any change that affects what the app
visibly renders, then review the resulting diff in `tests/e2e/*.spec.ts-snapshots/` before committing.

### Linux baselines (for CI)

Playwright keys each baseline's filename by OS platform (`...-chromium-darwin.png` on macOS,
`...-chromium-linux.png` on Linux). The [GitHub Pages workflow](/adr/0011-github-pages-deployment) runs on
`ubuntu-latest`, so without a `-linux.png` baseline committed alongside the `-darwin.png` ones generated on
a Mac, every `toHaveScreenshot()` assertion fails in CI with "no baseline found." Generate the missing
`-linux.png` baselines locally with Docker or Podman — no GitHub Actions run required:

```sh
npm run test:e2e:update-snapshots:linux
```

This runs `scripts/update-linux-snapshots.sh`, which executes the suite inside the official
`mcr.microsoft.com/playwright:v<installed-version>-noble` container image (matching the exact
`@playwright/test` version from `node_modules`, read dynamically) — the dev server, browser, and test run
all happen inside the container, and `node_modules` there lives in its own container-local volume, so the
host's own (macOS-built) `node_modules` is never touched. Set `CONTAINER_ENGINE=docker` to force Docker
over Podman if both are installed. Both the `-darwin.png` and `-linux.png` baselines are committed side by
side — local dev (on a Mac) matches against the former, CI against the latter.

A `globalSetup` step (`tests/e2e/global-setup.ts`) visits every app route once, sequentially, before the
parallel test run starts — the dev server transpiles each TypeScript module lazily on first request, so
without this warm-up, parallel workers hitting a cold server at once can produce flaky early page loads.

Every assertion step also takes a full-page visual-regression screenshot (`toHaveScreenshot`), compared
against the committed baselines under `tests/e2e/*.spec.ts-snapshots/` with a tuned tolerance
(`threshold: 0.3`, `maxDiffPixelRatio: 0.08`) — chosen specifically to absorb sub-pixel anti-aliasing
differences between separate Chromium process launches on the same machine, not to mask genuine layout
regressions (see the detailed comment in `playwright.config.ts`).

## Code coverage

Code coverage for the UI test suite is produced via `babel-plugin-istanbul` + `nyc`, not Playwright's own
coverage API, since UI5's transpile pipeline runs through Babel already:

```sh
npm run start-coverage         # serves the app via ui5-coverage.yaml (istanbul-instrumented)
npm run test:e2e:coverage       # runs the e2e suite against it, then produces the report
npm run test:e2e:coverage:report  # just the report step (nyc report), if raw data already exists
```

`ui5-coverage.yaml` is a dedicated UI5 Tooling config that adds the `istanbul` Babel plugin to the same
`ui5-tooling-transpile-middleware` used for normal serving, so every app module gets instrumented and
populates `window.__coverage__` as it executes in the browser. `playwright.config.ts`'s `webServer` is
configured to start via `npm run start-coverage` (not plain `npm start`) for exactly this reason.

An auto-fixture (`tests/e2e/coverage-fixtures.ts`) reads `window.__coverage__` out of the page after every
test and writes it to its own file under `.nyc_output/` (one file per test, so parallel workers never
clash). Once the full suite has run, `nyc report` merges every one of those raw files and renders:

- an **HTML** report under `coverage/` (open `coverage/index.html`),
- an **lcov** report (`coverage/lcov.info`, consumable by most CI coverage integrations/badges),
- a **text summary** printed to the console.

## Software Bill of Materials (SBOM)

```sh
npm run sbom           # sbom:dev + sbom:prod -> sbom.dev.json, sbom.prod.json
npm run sbom:dev        # cyclonedx-npm (full tree, incl. devDependencies) -> sbom.dev.json
npm run sbom:prod       # cyclonedx-npm --omit dev (runtime only) -> sbom.prod.json
npm run sbom:report     # generates both SBOMs + both HTML reports
npm run sbom:report:dev  # sbom.dev.json + sbom-report.dev.html (human-readable)
npm run sbom:report:prod # sbom.prod.json + sbom-report.prod.html (human-readable)
```

`npm run sbom:dev`/`sbom:prod` each generate a [CycloneDX](https://cyclonedx.org) SBOM via
`@cyclonedx/cyclonedx-npm` — a standard, tool-agnostic format consumable by vulnerability scanners and
license-compliance tooling. Two separate SBOMs are produced because they answer different questions:
`sbom.dev.json` covers the project's full npm dependency tree (including devDependencies - lint/test/build
tooling, never shipped to the browser), while `sbom.prod.json` (`--omit dev`) covers only runtime
dependencies, i.e. what's actually shipped. This app has no npm `dependencies` at all (see "No backend —
everything is client-side JSON" in the project's `CLAUDE.md`; the UI5 framework itself is loaded from the
CDN or `node_modules` devDependencies, never declared as a runtime npm dependency), so `sbom.prod.json`
is expected to list zero third-party components — that's the correct, meaningful answer for this app, not
a tooling gap.

`npm run sbom:report:dev`/`sbom:report:prod` additionally render `sbom-report.dev.html`/
`sbom-report.prod.html`, self-contained local HTML reports generated in-house by `scripts/sbom-report.ts`
(same script, run twice with different input/output paths and a report label). It was written in-house
(rather than adopting a third-party SBOM viewer) specifically because the evaluated alternatives didn't
produce a license summary table and weren't easily extensible. The script normalizes each component's
CycloneDX `licenses[]` entries (which can appear as an SPDX id, a free-text name, or an SPDX expression)
into a single readable label via the `spdx-license-list` package, and de-duplicates repeated license
entries per component.

## Test reports

The Playwright suite is configured (`playwright.config.ts`, `reporter: [...]`) to emit **four** report
formats from the same run, each serving a different audience:

| Reporter | Output | Purpose |
| --- | --- | --- |
| `list` | console | Live progress while the suite runs. |
| `html` | `playwright-report/` | Playwright's own interactive report — view with `npm run test:e2e:report`. |
| `allure-playwright` | `allure-results/` (raw) | Rich step-by-step results, trend graphs, categorization — see below. |
| `junit` | `test-results/junit.xml` | Generic JUnit XML, for CI systems with built-in "Tests" tabs (GitLab, Jenkins, ...). |
| `@bdellegrazie/playwright-sonar-reporter` | `test-results/sonar-report.xml` | SonarQube's own "Generic Test Execution" format — SonarQube does **not** natively ingest JUnit XML for JS/TS projects, so this format is produced separately and fed in via `sonar.testExecutionReportPaths`. |

### Allure report

Allure's raw results (`allure-results/`) need a separate `allure generate` step to become a browsable HTML
report, plus a small amount of bookkeeping to keep trend graphs (History, Retries, Duration, Categories)
working across multiple local runs — `allure generate` on its own only ever sees the *most recent* run's
results, and trend graphs only render if `allure-results/history/` is present at generate time (itself
produced as part of the *previous* report's `allure-report/history/`). `scripts/allure-generate.ts`
automates carrying that `history/` folder forward before each generate:

```sh
npm run test:e2e:allure            # generate the report and open it
npm run test:e2e:allure:generate    # just generate, don't open
```

### Cleaning up generated output

```sh
npm run clean
```

Removes every generated artifact described on this page in one step: `dist/`, `coverage/`,
`.nyc_output/`, `test-results/`, `playwright-report/`, `allure-results/`, `allure-report/`,
`sbom.dev.json`, `sbom.prod.json`, `sbom-report.dev.html`, `sbom-report.prod.html`.
