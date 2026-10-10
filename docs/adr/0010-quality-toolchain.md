# 0010 – A dedicated, multi-tool toolchain for code quality

**Status:** Accepted

## Context

"Code quality" for this project spans several genuinely independent concerns: static correctness (types,
general lint rules), UI5-specific API/manifest correctness (things a generic linter has no concept of),
runtime behavior (does the app actually work — see [ADR 0009](/adr/0009-ui-tests-as-primary-strategy)), how
much of that behavior is actually exercised by tests, and the licensing/supply-chain risk carried by
third-party dependencies. No single tool covers all of these, and relying on manual code review alone to
catch them doesn't scale and isn't reproducible/automatable in CI.

## Decision

Assemble a dedicated toolchain of independent, purpose-built tools, each responsible for exactly one
quality dimension, wired into its own npm script and documented centrally in
[Build toolchain](/build-toolchain):

- **ESLint** + `typescript-eslint` — general TypeScript/JavaScript correctness and style, type-aware via
  `recommendedTypeChecked`.
- **`@ui5/linter`** (`ui5lint`) — UI5-specific checks (API usage against the declared `minUI5Version`,
  deprecated APIs, `manifest.json` structure) a generic linter can't express.
- **`tsc --noEmit`** (`ts-typecheck` / `ts-typecheck:scripts`) — pure type checking, run automatically before
  `npm start`/`npm run build` via `pre*` npm hooks, so a type error can never silently reach a running dev
  server or a build. Applies uniformly across the app and `scripts/` (see
  [ADR 0008](/adr/0008-typescript-everywhere)).
- **Playwright end-to-end tests** (see [ADR 0009](/adr/0009-ui-tests-as-primary-strategy)) with *four*
  parallel reporters (HTML, JUnit, SonarQube's generic test format, Allure), each serving a different
  consumer — see [Build toolchain → Test reports](/build-toolchain#test-reports).
- **istanbul/nyc code coverage** over that same e2e run, instrumenting the actually-served app.
- **CycloneDX SBOM generation** (`cyclonedx-npm`) plus an in-house HTML report for dependency/license
  visibility — see [Build toolchain → Software Bill of Materials](/build-toolchain#software-bill-of-materials-sbom).

Each tool is invoked independently (its own npm script), rather than being folded into one opaque
"check everything" command, and the full picture is documented in one place rather than left to be
reverse-engineered from `package.json`.

## Consequences

- **Positive:** Each tool is purpose-built for its one job rather than one generalist tool attempting all of
  them poorly. A failure pinpoints exactly which quality dimension regressed — a lint error, a type error, a
  flagged copyleft license — rather than a vague "something's wrong."
- **Positive:** Reports compose for different audiences without extra tooling: JUnit for generic CI "Tests"
  tabs, the Sonar format for SonarQube (which doesn't natively ingest JUnit for JS/TS), Allure for trend
  history across runs, plain HTML for local interactive review.
- **Positive:** Documented centrally ([Build toolchain](/build-toolchain)), so understanding "what's
  enforced and how do I run it myself" doesn't require reading every npm script by hand.
- **Negative:** Several independent devDependencies to keep updated and mutually compatible (ESLint +
  `typescript-eslint` + TypeScript, `@ui5/linter`, `nyc` + `babel-plugin-istanbul`, Playwright + its
  reporters, `cyclonedx-npm`) rather than one consolidated tool's single version to track.
- **Negative:** There is no single "is this change good?" command. `npm test` currently only runs lint and
  the e2e suite — coverage, SBOM generation/reporting, and `ui5lint` are separate, manually invoked steps,
  not wired into one default gate (see [Build toolchain](/build-toolchain) for the full list of what runs
  automatically vs. on demand).
- **Negative:** The toolchain only catches what each individual tool is designed to catch. A genuine logic
  bug with no lint signal and no e2e-reachable symptom (see [ADR 0009](/adr/0009-ui-tests-as-primary-strategy)'s
  accepted testing gap) can still slip through undetected.
