# 0004 – Standard `sap.m` controls only, no custom or third-party controls

**Status:** Accepted

## Context

Some parts of the UI don't have an obvious, purpose-built `sap.m` control: a bar-chart breakdown of status
values (the "chart analysis" dialog on Main/SupportStatus) and a chronological lifecycle timeline (the
"Lifecycle & Milestones" card on the product detail page) are exactly the kind of visualization usually
built with a dedicated charting/timeline control. OpenUI5 and its ecosystem offer several options for this:
writing a custom `sap.ui.core.Control` subclass, or pulling in a richer library — e.g. `sap.ui.table` for
virtualized tables, or a charting library. `ui5-local.yaml` (used for local dev/testing) already makes
`sap.f` and `sap.ui.table` available alongside `sap.m`, and the npm dependency tooling could add further
UI5 or third-party control libraries without much friction.

## Decision

Use **only the controls shipped in `sap.ui.core` and `sap.m`** — the only two libraries declared in
`webapp/manifest.json`'s `sap.ui5.dependencies.libs`, and therefore the only ones guaranteed present at
runtime. No custom `sap.ui.core.Control` subclasses, and no additional UI5 or third-party control
libraries, even where a purpose-built control would be a more natural fit. The extra libraries available in
`ui5-local.yaml` (`sap.f`, `sap.ui.table`) exist for local dev/testing convenience only and are deliberately
*not* added to the app's own runtime dependencies.

Where `sap.m` has no dedicated control, the need is met by composing existing `sap.m` controls with CSS
instead:

- The chart analysis dialog's bar chart is a `List`/`VBox` of rows, each bar's width computed as a CSS
  percentage (`BaseController#formatBarWidth`) against the largest value in the data — not a real charting
  control.
- The product detail page's lifecycle timeline is a styled list of colored "dot" elements with labels
  (`ProductDetail#buildMilestones`), not a dedicated timeline control.
- Every page's table (`Main`, `SupportStatus`, `MyProducts`) uses the plain `sap.m.Table`, not
  `sap.ui.table.Table`'s virtualized rendering, even though the full PAM dataset (over 1,500 rows) is
  exactly the kind of dataset virtualization is meant for.

## Consequences

- **Positive:** Minimal runtime footprint — only two libraries to resolve/load, matching the app's own
  `minUI5Version` dependency declaration and keeping cold-start fast. No dependency on the API stability,
  maintenance status, or licensing of a third, less universally supported library.
- **Positive:** `sap.m`'s API stability guarantees and long-term support commitments apply uniformly to the
  whole UI — there's no separate compatibility story to track for a second control library.
- **Positive:** Consistent "SAP look & feel" across every part of the app, since nothing deviates from
  `sap.m`'s own rendering and theming (light/dark/high-contrast themes apply uniformly).
- **Negative:** Hand-rolled visuals (the bar chart, the milestone timeline) are less capable than a
  dedicated control would be — no interactive tooltips, no animations, no accessibility semantics beyond
  what's manually added, and they don't automatically pick up future control-library improvements.
- **Negative:** `sap.m.Table` renders every row's DOM upfront; the full ~1,554-entry PAM dataset is filtered
  via `sap.ui.model.Filter`/`FilterType.Application` (see [Architecture](/architecture)) rather than relying
  on `sap.ui.table.Table`'s virtualized scrolling, which `ui5-local.yaml` makes available but the app
  deliberately doesn't depend on. This is a non-issue at the current data volume (see
  [ADR 0001](/adr/0001-client-only-no-backend)'s noted trade-off) but would need revisiting — either
  virtualization or a scope change to this decision — if the dataset grew by an order of magnitude.
