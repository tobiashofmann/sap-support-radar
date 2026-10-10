# Architecture

## Technology stack

- **OpenUI5** (`sap.ui.core`, `sap.m` only — see [ADR 0002](/adr/0002-openui5-as-framework) and
  [ADR 0004](/adr/0004-standard-controls-only)) as the UI framework, driven by **UI5 Tooling** (`@ui5/cli`).
  The app depends only on the open-source OpenUI5 libraries at runtime — it is not an SAPUI5 application and
  needs no SAPUI5 distribution or ABAP backend.
- **XML views** (`webapp/view/*.view.xml`) paired with TypeScript controllers — see
  [ADR 0003](/adr/0003-xml-views).
- **TypeScript**, transpiled to UI5 modules via `ui5-tooling-transpile`.
- **No backend, no OData service.** All data lives in two `sap.ui.model.json.JSONModel` instances inside
  the browser — see [ADR 0001](/adr/0001-client-only-no-backend),
  [ADR 0005](/adr/0005-json-models-no-odata), and [Data model & PAM.json](#data-model--pam-json) below.
- **Hash-based client-side routing** via `sap.m.routing.Router`, configured declaratively in
  `webapp/manifest.json` (`sap.ui5.routing`).

```
┌─────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│                                                                │
│  ┌──────────────┐        ┌───────────────────────────────┐  │
│  │ PAM.json      │──────▶│  "pam" JSONModel                │  │
│  │ (bundled or    │       │  (full product availability     │  │
│  │ uploaded)      │       │   matrix, array of entries)     │  │
│  └──────────────┘        └───────────────────────────────┘  │
│                                      │  filtered by           │
│                                      ▼  product identity key  │
│  ┌──────────────┐        ┌───────────────────────────────┐  │
│  │ OwnProducts   │◀─────▶│  "ownProducts" JSONModel        │  │
│  │ .json          │       │  (the user's own product        │  │
│  │ (download/      │       │   landscape, subset of "pam")   │  │
│  │  upload)        │       └───────────────────────────────┘  │
│  └──────────────┘                                            │
│                                                                │
│  Views/Controllers: Main · SupportStatus · MyProducts ·       │
│                      MyProductsAdd · ProductDetail             │
└─────────────────────────────────────────────────────────────┘
```

## Data model & PAM.json

`webapp/manifest.json` declares two plain `JSONModel`s with no OData/backend binding:

| Model name | Source file | Purpose |
| --- | --- | --- |
| `pam` | `webapp/model/PAM.json` | The full SAP PAM export: an array of product/version records. |
| `ownProducts` | `webapp/model/OwnProducts.json` | The subset of PAM entries the user selected as "their" landscape. Empty by default. |

Controllers replace a model's contents wholesale via `setData()` — either after the user uploads a `.json`
file (`App`, `Main`, `MyProducts` controllers all implement the same "hidden `<input type=file>`" picker
pattern, now centralized in [`webapp/util/JsonFileUpload.ts`](#jsonfileuploadts)), or by persisting the
current `ownProducts` content back to disk via `Blob`/`URL.createObjectURL` downloads
(`MyProducts.onDownloadOwnProducts`). **There is no server-side persistence** — reloading the page resets
both models to the bundled JSON files.

The same `PAM.json` file is also what the [MCP server](/mcp-server) reads, letting an LLM client query it
directly outside the app's UI.

### PAM.json field mapping

`webapp/model/PAM.json` is generated from a raw semicolon-separated PAM CSV export via
`scripts/import-pam-csv.ts` (`npm run pam:import`). The script maps the CSV's verbose column headers to
short, stable JSON keys:

| JSON key | Source column |
| --- | --- |
| `version` | Product Version |
| `name` | Official Name |
| `product` | Product |
| `line` | Product Line |
| `category` | Product Category |
| `addOn` | Add-On Product Version |
| `status` | Current Status |
| `ra_puna` | Restricted available (productive use not allowed) |
| `ra_pua` | Restricted available (productive use allowed) |
| `ua` | Unrestricted available |
| `hanaStatus` | Readiness Status for SAP HANA |
| `hanaDate` | Readiness Date for SAP HANA |
| `eomm` | End of mainstream maintenance |
| `eom` | End of extended maintenance |
| `eop1` | End of Priority-One Support |
| `eosk` | End of SAP S/4HANA Cloud Safekeeper Service |
| `url` | URL to Product Version in SAP Support Portal |

Values stay raw strings — dates remain `dd.mm.yyyy`, `addOn` stays `"Yes"`/`"No"`. Only the *keys* are
shortened. These keys are referenced directly throughout the controllers and view bindings (there is no
typed interface beyond a loose index signature — see [`PamProduct`](#productkeyts)), so changes to the CSV
schema require updating `scripts/import-pam-csv.ts` and every call site together.

Running `npm run pam:import -- --ui5` additionally merges in OpenUI5 version support data fetched
from `ui5.sap.com/versionoverview.json`, mapped into PAM-shaped entries with four extra fields
(`lts`, `eocp`, `sapuiversion`, `frontendserver`) that only exist for `product === "SAP UI5"` entries — see
`ProductDetail`'s dedicated "UI5 Details" card.

### Product identity

A PAM entry has no stable numeric ID. Instead, a **"product identity"** is the tuple
`(version, name, product, line)`, joined with a `\u001f` separator — see
[ADR 0013](/adr/0013-product-identity-key). This is how the app matches a PAM row against the user's own
selection (`MyProducts`, `SupportStatus`, `ProductDetail`).

## Routing & pages

Hash-based routing is configured in `sap.ui5.routing` in `webapp/manifest.json`, with one `BaseController`
subclass per route in `webapp/controller/` and an XML view in `webapp/view/`:

| Route | Pattern | Controller | Purpose |
| --- | --- | --- | --- |
| `main` | `""` | `Main` | Full PAM product table with search/filter/sort/column-visibility. |
| `myproducts` | `myproducts` | `MyProducts` | Select which PAM entries belong to the user's own landscape. |
| `myproductsadd` | `myproducts/add` | `MyProductsAdd` | Form to manually create a product not present in the PAM export. |
| `supportstatus` | `supportstatus` | `SupportStatus` | Support/maintenance status filtered to the user's own products. |
| `productdetail` | `productdetail/{index}` | `ProductDetail` | Read-only detail page for one PAM entry, addressed by array index. |

`webapp/controller/App.controller.ts` backs the root `App.view.xml` shell — the global toolbar (logo/title,
nav tabs, upload buttons) — and owns the top-level PAM/own-products upload handlers.
`webapp/controller/BaseController.ts` is the shared base every other controller extends, providing typed
router/model access and several handlers reused across pages (see
[Classes & methods](/reference#basecontroller)).

See [App workflow & pages](/workflow) for a guided tour of each page with screenshots.

## Known architectural trade-offs

- **Duplication between `Main` and `SupportStatus`.** Both controllers implement nearly identical table
  filtering/sorting/highlighting logic. Shared *pure data* helpers (date parsing, filter definitions,
  support-end thresholds, product-key matching) have been extracted into `webapp/model/*.ts`, but the
  *view wiring* itself (which UI5 controls read which filter model, table binding handling, ...) is still
  duplicated. When changing filter/sort/highlight behavior in one controller, check whether the sibling
  controller needs the same change.
- **No backend, no multi-user support.** Everything is scoped to a single browser session; there is no
  concept of "the organization's product landscape" shared between users beyond manually exchanging the
  downloaded `OwnProducts.json` file.
- **XMLView `class` binding gotcha.** `class="{path: ...}"` or `class="{= expression }"` does not update
  reactively in UI5 XMLViews — confirmed by DOM inspection, it only resolves once at initial render. See
  [ADR 0014](/adr/0014-reactive-properties-over-class-binding).
