# Architecture Decision Records

This section documents significant architectural decisions made in this project, why they were made, and
their consequences. Each ADR reflects a decision actually visible in the codebase today — see the linked
source files and comments for the evidence behind each one.

The records are grouped in two tiers:

- **Foundational decisions** (0001–0011) are the strategic technology/architecture/process choices that
  shape everything else in the project — e.g. "no backend," "OpenUI5," "XML views," "no custom controls,"
  "JSON over OData," "the user supplies their own PAM data," "a separate MCP server," "TypeScript
  everywhere," "UI tests as the primary test strategy," "a multi-tool quality toolchain," "how the site is
  laid out on GitHub Pages." They're largely independent of each other and could each have gone a different
  way without requiring the others to change.
- **Implementation decisions** (0012–0014) are narrower choices made *within* that foundation — direct,
  almost unavoidable consequences of a foundational decision (e.g. 0014's `class`-binding workaround only
  exists *because of* 0003's choice of XML views). Each one cross-links back to the foundational decision(s)
  that triggered it.

## Foundational decisions

| # | Title | Status |
| --- | --- | --- |
| [0001](/adr/0001-client-only-no-backend) | Client-only app, no backend | Accepted |
| [0002](/adr/0002-openui5-as-framework) | OpenUI5 as the application framework | Accepted |
| [0003](/adr/0003-xml-views) | XML views for UI declaration | Accepted |
| [0004](/adr/0004-standard-controls-only) | Standard `sap.m` controls only, no custom or third-party controls | Accepted |
| [0005](/adr/0005-json-models-no-odata) | JSON data binding instead of OData | Accepted |
| [0006](/adr/0006-user-supplied-pam-data) | User-supplied PAM data, never bundled or auto-fetched | Accepted |
| [0007](/adr/0007-mcp-server) | A separate MCP server as a second, LLM-facing access surface | Accepted |
| [0008](/adr/0008-typescript-everywhere) | TypeScript for every component | Accepted |
| [0009](/adr/0009-ui-tests-as-primary-strategy) | End-to-end UI tests as the primary testing strategy | Accepted |
| [0010](/adr/0010-quality-toolchain) | A dedicated, multi-tool toolchain for code quality | Accepted |
| [0011](/adr/0011-github-pages-deployment) | GitHub Pages hosts VitePress at the root, the app and quality reports under subpaths | Accepted |

## Implementation decisions

| # | Title | Triggered by | Status |
| --- | --- | --- | --- |
| [0012](/adr/0012-index-based-product-detail-route) | Address product detail by array index, not a synthetic ID | [0005](/adr/0005-json-models-no-odata) | Accepted |
| [0013](/adr/0013-product-identity-key) | Product identity as a field tuple, not an explicit ID | [0005](/adr/0005-json-models-no-odata) | Accepted |
| [0014](/adr/0014-reactive-properties-over-class-binding) | Use reactive control properties instead of dynamic `class` bindings | [0003](/adr/0003-xml-views) | Accepted |

## Format

Each ADR follows a short form: **Context** (the problem/forces), **Decision** (what was chosen),
**Consequences** (what this buys you and what it costs).
