# 0003 – XML views for UI declaration

**Status:** Accepted

## Context

Having chosen [OpenUI5 as the application framework](/adr/0002-openui5-as-framework), a view type still
has to be picked: OpenUI5 supports declaring a view as XML, as a JavaScript/TypeScript view (building the
control tree imperatively in code), as an HTML view, or as a JSON view. Each page in this app (Main,
SupportStatus, MyProducts, MyProductsAdd, ProductDetail, plus the App shell) needs a reasonably complex,
mostly-static control tree (tables, filter bars, forms, dialogs) with data-bound properties — exactly the
case UI5's own tooling, samples, and app generator (`generator-ui5-ts-app`, this project's own
`sourceTemplate`) are built around.

## Decision

Declare every page's UI as an **XML view** (`webapp/view/*.view.xml`), paired with a TypeScript controller
(`webapp/controller/*.controller.ts`) referenced via the view's `controllerName`, rather than building the
control tree imperatively in a JS/TS view.

## Consequences

- **Positive:** The control tree and its data bindings (`{pam>version}`, `{i18n>key}`, filter/formatter
  expressions) are declared where they're used, readable without stepping through imperative construction
  code. XML views are what UI5's own tooling is built around: the UI5 language server/IDE plugins, schema
  validation against each control's XSD, and the project's own `generator-ui5-ts-app` scaffolding all assume
  XML views — adopting the framework's idiomatic default rather than fighting it.
- **Positive:** View markup and controller logic are cleanly separated into two files per page, so a
  reviewer can tell at a glance whether a change is "what's shown" or "how it behaves."
- **Negative:** XML bindings are necessarily declarative and have real expressiveness limits — most notably
  the `class` attribute binding gotcha (`class="{...}"` not updating reactively), which had to be worked
  around by binding a genuinely reactive control property instead (see
  [ADR 0014](/adr/0014-reactive-properties-over-class-binding)). A JS/TS view would not have hit this
  specific limitation, at the cost of losing XML's declarative clarity everywhere else.
- **Negative:** Conditionally restructuring the control tree (not just toggling visibility/properties) is
  harder in XML than in imperative code — this app avoids that need by relying on `visible` bindings and
  formatter-driven properties instead of ever needing to add/remove controls conditionally at runtime.
- **Negative:** Changing a page's behavior often means editing two files (the `.view.xml` and its
  `.controller.ts`) and keeping `id`s referenced via `byId()` in the controller in sync with the view.
