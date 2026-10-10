# 0008 – TypeScript for every component

**Status:** Accepted

## Context

The repository contains three genuinely separate codebases with different runtimes and build tools: the
OpenUI5 app itself (`webapp/`, built via UI5 Tooling), the MCP server (`pam-mcp-server/`, a plain Node
package built via `tsc`), and a handful of standalone Node tooling scripts (`scripts/`: the PAM CSV
importer, the Allure report generator, the SBOM report renderer) that aren't part of either build. Each of
these could reasonably have picked its own language independently — plain JavaScript is a perfectly normal
choice for small, one-off Node scripts in particular, and `scripts/` originally *was* plain CommonJS
JavaScript.

## Decision

Use **TypeScript** as the implementation language for all three: the UI5 app (see
[ADR 0002](/adr/0002-openui5-as-framework)), the MCP server (see [ADR 0007](/adr/0007-mcp-server)), and the
`scripts/` tooling. Each has its own, independently scoped `tsconfig.json` (root `tsconfig.json` for
`webapp/`, `pam-mcp-server/tsconfig.json`, `scripts/tsconfig.json`) and its own way of running TypeScript —
UI5 Tooling's `ui5-tooling-transpile` for the app, plain `tsc` + `node` for the MCP server, and `ts-node` for
the `scripts/` tooling (run directly, with no separate compile step) — but the *language* choice is uniform.
`scripts/` was migrated from plain `.js` to `.ts` specifically to close this gap; its own `tsconfig.json`
and npm scripts (`ts-typecheck:scripts`, `pam:import`, `test:scripts`, ...) are new as part of this decision.

## Consequences

- **Positive:** Every piece of first-party code in the repository benefits from static typing — the same
  class of bug (wrong argument order, a typo'd property name, an unhandled `null`/`undefined`) is caught at
  edit/build time everywhere, not just in the app.
- **Positive:** Contributors don't have to mentally switch conventions (type annotations, module syntax,
  tooling expectations) when moving between the app, the MCP server, and the import/report scripts.
- **Positive:** `scripts/*.ts` can now be type-checked as part of the overall quality toolchain (see
  [ADR 0010](/adr/0010-quality-toolchain)) the same way the app and MCP server already were — previously,
  a change to e.g. `scripts/import-pam-csv.js`'s `FIELD_MAP` had no compiler or linter backing it at all.
- **Negative:** Three independent `tsconfig.json`s (and, for `scripts/`, an added `ts-node` runtime
  dependency) to keep in sync in spirit, even though they deliberately don't share one physical project —
  see [ADR 0007](/adr/0007-mcp-server)'s equivalent trade-off for why the MCP server isn't folded into the
  app's own build.
- **Negative:** Small, single-purpose scripts now carry more ceremony (explicit types for CLI argument
  parsing, CycloneDX SBOM shapes, etc.) than the equivalent plain JavaScript would have needed — a deliberate
  trade of some upfront verbosity for compile-time safety on code that reads/writes data file formats by
  hand (CSV parsing, JSON schema assumptions) where a silent type mistake would otherwise only surface at
  runtime, if at all.
