# 0009 – End-to-end UI tests as the primary testing strategy

**Status:** Accepted

## Context

The project originally had, via its `generator-ui5-ts-app` scaffolding, the standard UI5 unit-test layer:
QUnit unit tests and OPA (One Page Acceptance) integration tests under `webapp/test/`, running
controller/formatter logic and page interactions against a mocked/harnessed view. These were deliberately
removed (`git log` — "remove default ui5 tests"). Testing now happens through
[Playwright](https://playwright.dev) end-to-end tests (`tests/e2e/`) that drive the real, served app in an
actual browser — clicking buttons, typing into filters, reading rendered table rows — the same way a human
user would, with no white-box access to controller internals or mocked bindings.

## Decision

Treat end-to-end UI tests as the **primary — effectively the only — layer of automated testing for the
app**, deliberately over component/unit-level tests of individual controller methods or model helpers. Each
spec file in `tests/e2e/` corresponds to one app page (`main.spec.ts`, `my-products.spec.ts`, etc.) and
walks through its real, user-facing workflows end to end — see
[Build toolchain → UI tests (Playwright)](/build-toolchain#ui-tests-playwright). A small, separate unit-test
layer exists only for non-UI code that genuinely has no "user" to stay close to —
`scripts/__tests__/import-pam-csv.test.ts` tests pure CSV-parsing logic in isolation via `node:test`,
precisely because that code has no UI to click through at all.

## Consequences

- **Positive:** Tests fail only when something a real user would actually notice breaks. Refactoring
  internal implementation details — extracting a helper, renaming an internal model property, restructuring
  a controller method — doesn't require touching the test suite as long as rendered behavior is unchanged,
  unlike unit tests that assert against internal structure and routinely need updating alongside it.
- **Positive:** Code coverage (see [Build toolchain → Code coverage](/build-toolchain#code-coverage)) is
  measured on the actually-shipped, actually-transpiled app running in a real browser, not on logic exercised
  only through a test harness or mocked bindings — the coverage numbers reflect genuinely user-reachable
  code paths.
- **Positive:** One test suite to reason about and maintain, rather than two parallel layers (unit + e2e)
  that can drift out of sync or duplicate the same assertions from different angles.
- **Negative, explicitly accepted: not all code is tested.** Branches and edge cases that are awkward or
  impossible to reach purely through UI interaction — a defensive `null`/`undefined` guard in a formatter,
  an error path that only occurs for malformed data the UI itself never produces, a specific obscure
  combination of filter/sort state — are exercised only incidentally, if at all, rather than deliberately
  enumerated the way a dedicated unit test would. This project does not aim for unit-test-level
  exhaustiveness, and that's a conscious trade-off, not an oversight.
- **Negative:** Slower feedback loop. A Playwright run spins up a real dev server and browser and takes
  meaningfully longer than an equivalent unit test would — `tests/e2e/global-setup.ts`'s warm-up step exists
  specifically to offset this. There is no fast "run just this one function's tests in milliseconds" option
  for app code, since no unit-test layer exists for it.
- **Negative:** A bug localized to one small function is often harder to pinpoint from a failing e2e test
  than from a failing unit test — the failure surfaces as "a page didn't behave as expected" rather than
  "this specific function returned the wrong value for this input."
