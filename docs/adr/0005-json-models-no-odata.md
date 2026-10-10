# 0005 – JSON data binding instead of OData

**Status:** Accepted

## Context

This is a distinct decision from [ADR 0001](/adr/0001-client-only-no-backend) ("no backend at all"): even a
client-only OpenUI5 app commonly still uses `sap.ui.model.odata.v2.ODataModel`/v4 for its list/filter/sort
bindings — for example against a local mock server fed by a static CSDL/EDMX service metadata document and
JSON data payload (a common pattern for UI5 app prototypes and tests, and one the `sap.ux-ui5-tooling`
Fiori generator this app started from readily supports). Choosing `JSONModel` vs. an `ODataModel` is a
question of data-binding technology, independent of whether a real backend exists.

The app's two datasets — the full PAM export and the user's own product selection — are both simple,
already-flat arrays of plain records with no relationships, navigation properties, or server-side
operations to model.

## Decision

Bind all app data through plain **`sap.ui.model.json.JSONModel`** instances — the `pam` and `ownProducts`
models declared via static `uri` entries in `webapp/manifest.json`'s `sap.ui5.models` — rather than an
`ODataModel` (v2 or v4), with or without a mock server. There is no OData service, no `$metadata` document,
no entity sets, and no mock-server tooling anywhere in the project.

## Consequences

- **Positive:** Trivial to set up — a model declaration in `manifest.json` plus `setData()` is the entire
  "data layer." No CSDL/EDMX metadata document to author or keep in sync with the data shape.
- **Positive:** `setData()`'s wholesale-replace semantics map directly onto the app's actual data lifecycle
  — loading a newly uploaded `.json` file replaces the model's contents outright (see
  [Architecture → Data model & PAM.json](/architecture#data-model--pam-json)), with no OData entity
  create/update/delete protocol to go through.
- **Positive:** `sap.ui.model.Filter`/`Sorter` with `FilterType.Application` work the same way against a
  `JSONModel`'s `ListBinding` as they would against an OData one, so the table/filter-bar views and their
  bindings don't need to know or care which model type backs them.
- **Negative:** No server-side filtering, sorting, or paging — the entire PAM dataset is held in memory and
  filtered client-side on every interaction (see [ADR 0001](/adr/0001-client-only-no-backend)'s noted
  trade-off at larger data volumes).
- **Negative:** No built-in entity-key concept. An OData model would give each record a natural key (and
  free deep-link/create/update semantics built on it) via its entity type's declared key properties; here,
  "what identifies a product" had to be hand-rolled as a plain field-tuple match
  (see [ADR 0013](/adr/0013-product-identity-key)) and the product detail route had to be addressed by raw
  array index instead (see [ADR 0012](/adr/0012-index-based-product-detail-route)).
- **Negative:** No `$batch` grouping or ETag-based concurrency control — irrelevant here since there is no
  concurrent server-side writer to conflict with, but it means this pattern wouldn't transfer cleanly if the
  app ever did grow a real backend.
