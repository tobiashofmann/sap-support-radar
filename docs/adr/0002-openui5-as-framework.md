# 0002 – OpenUI5 as the application framework

**Status:** Accepted

## Context

The app's whole purpose is to present and let a user interact with tabular, business-style SAP data
(product versions, lifecycle statuses, maintenance dates) in a way that feels familiar to the SAP-literate
audience it's built for. That could be built on a general-purpose JavaScript framework (React, Vue, Angular,
...) paired with an independent component library, or directly on SAP's own UI framework.

A general-purpose framework would mean assembling (and maintaining) a table/filter-bar/dialog component set
from scratch or from a third-party library not designed around SAP's data/interaction conventions, plus
building i18n, responsive layout, and accessibility behavior largely from zero.

## Decision

Build the app on **OpenUI5** (`sap.ui.core` + `sap.m`) — the open-source distribution of SAP's UI5
framework — rather than a general-purpose JS framework, and rather than SAPUI5 (OpenUI5's SAP-licensed
counterpart, which additionally expects an ABAP/SAP system backend and licensing). The app depends only on
the two open-source OpenUI5 libraries declared in `webapp/manifest.json`'s `sap.ui5.dependencies.libs`, and
needs no SAPUI5 distribution, no ABAP backend, and no SAP system of any kind to run — consistent with the
app being entirely [client-only](/adr/0001-client-only-no-backend).

Driven by **UI5 Tooling** (`@ui5/cli`), with TypeScript sources transpiled to UI5 modules via
`ui5-tooling-transpile` (see [Build toolchain](/build-toolchain)).

## Consequences

- **Positive:** A mature, free widget set (tables, filter bars, dialogs, forms, object pages) that already
  matches SAP's own look, feel and interaction conventions out of the box — exactly the audience and domain
  this app targets (validating SAP product support status). Responsive layout (desktop/tablet/phone),
  accessibility, and i18n/RTL support come built in rather than needing to be assembled.
- **Positive:** UI5 Tooling provides a complete, batteries-included dev/build/serve pipeline (live reload,
  self-contained builds, resource proxying to `ui5.sap.com`) without needing to hand-assemble a bundler
  configuration.
- **Negative:** Framework lock-in — the app's views, controllers, and data-binding patterns are
  OpenUI5-specific and would need a substantial rewrite to move to a different framework. TypeScript support
  depends on the community-maintained `@openui5/types` declarations rather than framework-native types.
- **Negative:** A heavier runtime footprint than a minimal framework, and a smaller pool of developers
  familiar with UI5 outside the SAP ecosystem.
