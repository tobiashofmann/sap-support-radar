# 0007 – A separate MCP server as a second, LLM-facing access surface

**Status:** Accepted

## Context

The app's PAM data is only reachable through its own web UI — a human has to open the app, navigate to a
page, and apply filters to look up a single product's support status. There is recurring value in letting
an AI assistant answer "what's the support status of X" directly — e.g. while reviewing an architecture
document, a dependency list, or a support ticket that names concrete SAP product versions — without a human
first opening the app and manually filtering a 1,500+ row table.

Adding this *inside* the UI5 app itself (e.g. an HTTP endpoint the app exposes) was not an option without
contradicting [ADR 0001](/adr/0001-client-only-no-backend) — the app has no backend/server component at all.

## Decision

Add `pam-mcp-server/` as a **separate, independent [MCP](https://modelcontextprotocol.io) server package** —
not a feature of the UI5 app itself — that reads the exact same `webapp/model/PAM.json` file the app's `pam`
model loads (see [Architecture → Data model & PAM.json](/architecture#data-model--pam-json)) and exposes it
as read-only query tools (`pam_list_fields`, `pam_list_field_values`, `pam_query_products` — see
[MCP server](/mcp-server) for the full tool reference and a worked example). It runs locally over stdio
(no network, no server process the browser app talks to), with its own `package.json`, TypeScript build,
and `.mcp.json` registration, entirely decoupled from the app's own UI5 Tooling build pipeline.

## Consequences

- **Positive:** LLM clients (Claude Code, Claude Desktop, or any other MCP client) can answer PAM lookups
  directly from the same source-of-truth data the app uses, without a browser or manual table filtering.
- **Positive:** Doesn't compromise [ADR 0001](/adr/0001-client-only-no-backend) — the app itself still ships
  no backend; the MCP server is an opt-in, separately-run local tool that a user chooses to start, not
  something the app depends on, serves, or bundles into its own `dist/` build.
- **Positive:** Both the app and the MCP server read the identical `PAM.json`, so there's exactly one copy
  of the data and nothing to keep in sync between the two.
- **Negative:** A second codebase and toolchain to maintain alongside the main UI5 app — its own
  dependencies, TypeScript config, and build step (`pam-mcp-server/` is not part of `npm run build` or
  `npm test` at the repository root).
- **Negative:** Some query/filter concepts are necessarily re-expressed in the MCP server's own
  `pam-mcp-server/src/fields.ts` (field names, labels, match modes) rather than reused from the app's
  `webapp/model/pamFilters.ts`, since the two projects have independent build pipelines (UI5 Tooling vs.
  plain `tsc`) and no shared package boundary was set up between them — a schema change to PAM.json's field
  mapping (`scripts/import-pam-csv.js`'s `FIELD_MAP`) must be applied to both places by hand.
- **Negative:** Requires a manual build step (`npm run build` inside `pam-mcp-server/`) before first use,
  since `pam-mcp-server/dist/` is a gitignored build artifact — see [MCP server → Setup](/mcp-server#setup).
