# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`de.itsfullofstars.sap.pam` is a client-only SAPUI5/OpenUI5 (TypeScript) application that lets a user
validate the SAP Product Availability Matrix (PAM) support status for their own product landscape. There
is no backend/OData service: all data is loaded from local JSON uploaded by the user at runtime (or the
bundled sample files) and held in `sap.ui.model.json.JSONModel` instances in the browser.

## Commands

```sh
npm install          # install dependencies

npm start            # serve the app locally with live reload (http://localhost:8080/index.html)
npm run start-cdn     # same, but loads UI5 from the CDN instead of local resources (index-cdn.html)

npm run build         # unoptimized build -> dist/ (fast)
npm run build:opt     # optimized self-contained build -> dist/ (slower, bundles UI5 itself)
npm run start:dist    # serve the dist/ build (use --config ui5-dist.yaml variants for CDN dist)

npm run ts-typecheck  # tsc --noEmit type check (also runs automatically as part of start/build)
npm run lint          # eslint ./
npm run ui5lint       # UI5-specific linter (API usage, manifest, etc.)
npm test              # npm run lint && npm run test:e2e (CI entry point)

npm run docs:dev      # vitepress dev server for docs/
npm run docs:build    # build the vitepress docs site

npm run pam:import    # regenerate webapp/model/PAM.json from pv (see "Mock PAM data" below); npm
                      # start/start-local/start-cdn/start-coverage/build/build:opt/build_old already
                      # run this first, so it rarely needs to be run by hand
npm run pam:import -- --ui5  # also merge in SAPUI5/OpenUI5 version support data (see below)
```

Tests are Playwright end-to-end specs:

- `npm run test:e2e` runs the suite headless, auto-starting the dev server via `npm run start-coverage`
  (see `playwright.config.ts`'s `webServer`); `npm run test:e2e:ui` opens Playwright's interactive UI mode.
- `npm run test:e2e:coverage` runs the suite (also against `start-coverage`'s istanbul instrumentation,
  see `ui5-coverage.yaml`) and additionally writes an lcov/HTML coverage report.
- Specs live in `tests/e2e/*.spec.ts`; `tests/testcases.md` is the human-readable Given/When/Then
  description each spec implements. Visual-regression baselines live alongside each spec in
  `tests/e2e/*.spec.ts-snapshots/`, keyed by OS (`-darwin.png`/`-linux.png`) — regenerate with
  `npm run test:e2e:update-snapshots` (current OS) or `npm run test:e2e:update-snapshots:linux`
  (via Docker/Podman, matching the `ubuntu-latest` CI runner) after an intentional UI or data change.
- `npm run test:scripts` runs the Node-native unit tests for `scripts/import-pam-csv.ts` (CSV→JSON
  conversion), separate from `npm test`/`test:e2e`.

## Architecture

### No backend — everything is client-side JSON

The app ships two bundled JSON "models" declared in [webapp/manifest.json](webapp/manifest.json):

- `pam` → [webapp/model/PAM.json](webapp/model/PAM.json): the Product Availability Matrix data (array of
  product/version records with short-named fields like `version`, `status`, `eomm`/`eom` — end of
  mainstream/extended maintenance in `dd.mm.yyyy` German date format — etc.; see "Column/field conventions"
  below for the full key mapping and how this file is generated). `PAM.json` is gitignored and generated at
  `npm start`/`npm run build` time from [pv](pv) — see "Mock PAM data" below for why the checked-in `pv` is
  fictional mock data rather than a real SAP export.
- `ownProducts` → [webapp/model/OwnProducts.json](webapp/model/OwnProducts.json): the subset of PAM
  entries the user has selected as "their" product landscape (empty by default).

Both models are plain `JSONModel`s with no OData/backend binding. Controllers replace their contents
wholesale via `setData()` after the user uploads a `.json` file (drag-and-drop file input pattern
implemented independently in `App`, `Main`, and `MyProducts` controllers) or persist them back to disk
via `Blob`/`URL.createObjectURL` downloads (see `MyProducts.onDownloadOwnProducts`). There is no
server-side persistence; reloading the page resets to the bundled JSON files.

### Routing / views

Hash-based routing is configured in `sap.ui5.routing` in [webapp/manifest.json](webapp/manifest.json)
with four routes/targets, each backed by a `BaseController` subclass in `webapp/controller/` and an XML
view in `webapp/view/`:

- `""` (main) → `Main` — the full PAM product table with search/filter/sort/column-visibility UI.
- `myproducts` → `MyProducts` — lets the user select which PAM entries belong to their own landscape
  (checkbox-style table selection), import/export that selection as JSON.
- `supportstatus` → `SupportStatus` — shows support/maintenance status filtered to only the user's own
  selected products.
- `productdetail/{index}` → `ProductDetail` — read-only detail page for a single PAM entry, addressed by
  its index in the `pam` model's underlying array (stable across sorting/filtering, since `Filter`/
  `Sorter` only reorder the `ListBinding`'s view, never the underlying data array). Reached by tapping a
  row (`type="Navigation"` + `press=".onProductRowPress"`) in the `Main` or `SupportStatus` tables;
  `onProductRowPress` lives on `BaseController` since both callers need identical logic. `MyProducts`'
  table intentionally does *not* get this — its rows already use tap-to-toggle checkbox selection
  (`mode="MultiSelect"` + `includeItemInSelection`), and adding row navigation there would conflict with
  that interaction.

[webapp/controller/App.controller.ts](webapp/controller/App.controller.ts) backs the root
`App.view.xml` shell (global toolbar: logo/title, nav tabs for Main/SupportStatus/MyProducts, upload
buttons) and also owns the top-level PAM/own-products upload handlers. The nav tabs highlight the active
page via a `navigation` JSONModel (`/activeRoute`), kept in sync by `attachRoutePatternMatched` in
`onInit`. They're implemented as `sap.m.ToggleButton` (not `Button`) with `pressed` bound to an expression
comparing `activeRoute` to the tab's route name, styled via `.pamNavTab`/`.sapMToggleBtnPressed` in
`css/style.css` — deliberately *not* a dynamic `class="{...}"` binding, which doesn't update reactively in
XMLViews (see the `class`-binding caveat below).

[webapp/controller/BaseController.ts](webapp/controller/BaseController.ts) is the shared base providing
typed access to the router, i18n resource bundle, view models, and `navTo`/`onProductRowPress` helpers —
every other controller extends it.

### Known duplication

`Main.controller.ts` and `SupportStatus.controller.ts` independently implement nearly identical logic for
filtering, sorting, German-date parsing (`parseGermanDate`), relative-period maintenance-date filtering,
and status highlighting (`formatMainstreamMaintenanceHighlight`/`compareDates`). When fixing a bug or
changing behavior in one of these (filters, date parsing, highlight thresholds), check whether the
equivalent code in the sibling controller needs the same change.

### Column/field conventions

`webapp/model/PAM.json` is generated from a semicolon-separated PAM CSV export, checked in as
[pv](pv), via [scripts/import-pam-csv.ts](scripts/import-pam-csv.ts)
(`npm run pam:import [inputCsvPath] [outputJsonPath]`), which `npm start`/`npm run build` (and friends)
already run as a prerequisite step, so `webapp/model/PAM.json` (itself gitignored - see "Mock PAM data"
below) never needs generating by hand. That script maps the CSV's verbose column headers
(e.g. `"Restricted available (productive use allowed)"`, `"Readiness Date for SAP HANA"`) to short,
stable JSON keys defined in its `FIELD_MAP`:

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
| `url` | URL to Product Version in SAP Support Portal... |

Values stay raw strings (dates remain `dd.mm.yyyy`, `addOn` stays `"Yes"`/`"No"`) — only keys are
shortened. These keys are referenced directly throughout the controllers (`SEARCH_FIELDS`, `TEXT_FILTERS`,
`SELECT_FILTERS`, `SORT_DATE_FIELDS`/`DATE_FIELDS`, `PRODUCT_KEY_FIELDS` constants) and in XML view
bindings (`{pam>version}` etc. — plus `key="version"` on `sortField` `<core:Item>`s, which double as sort
paths) — there are no enums/typed interfaces for these beyond a loose `[key: string]: unknown` index
signature, so if the CSV schema or `FIELD_MAP` ever changes, update `scripts/import-pam-csv.js` and all of
these call sites together. Static UI labels (`<Label text="...">`, column header `<Text text="...">`) are
independent human-readable strings and don't need to match the JSON keys.

`import-pam-csv.js` can also merge in SAPUI5/OpenUI5 version support data via `npm run pam:import -- --ui5`
(or `--ui5=<url-or-file>` to point at a different source, e.g. a local copy for offline use/tests). This
fetches [https://ui5.sap.com/versionoverview.json](https://ui5.sap.com/versionoverview.json) and appends
its `versions` array as extra PAM-shaped entries (`mapUi5VersionToPamEntry`), introducing four fields that
don't exist in the SAP PAM export itself and are added to *every* entry once `--ui5` is used (CSV-derived
entries default to `lts: false, eocp: "", sapuiversion: "", frontendserver: ""`):

| JSON key | Source |
| --- | --- |
| `lts` | UI5 `lts` (boolean) |
| `eocp` | UI5 `eocp` — end of cloud provisioning |
| `sapuiversion` | UI5 `sapuiversion` — SAPUI5 distribution/ABAP compatibility, or `"Cloud only"` |
| `frontendserver` | UI5 `frontendserver` — SAP Fiori front-end server compatibility |

For the UI5-derived entries specifically: `version` stays `version`, UI5's `version_label` becomes `name`,
and `release_date` becomes `ra_puna` (closest PAM equivalent — date the version became available). `eomm`/
`eom` are passed through as-is from UI5's own `eomm`/`eom` fields, which (like some real PAM date fields,
e.g. `"Estimated for Q4/2026"`) are sometimes quarter/text strings rather than `dd.mm.yyyy` —
`parseGermanDate` already tolerates unparseable date strings, so these just don't sort/highlight as dates.
`product`/`line`/`category`/`addOn`/`url` have no UI5 equivalent and are filled with fixed values
(`"SAP UI5"`/`"SAP UI5"`/`"Technology Platform"`/`"No"`/`""`); `status` is derived from UI5's `support`
field (`"Maintenance"` → `"Unrestricted available"`, `"Out of maintenance"` passes through unchanged, to
reuse the existing PAM status values filters/highlighting already understand).

`ProductDetail` shows `lts`/`eocp`/`sapuiversion`/`frontendserver` in a dedicated "UI5 Details" card,
visible only when `product === "SAP UI5"` (see `ProductDetail.controller.ts`'s `isUi5Entry`/`ui5Fields`).

A "product identity" for matching PAM entries against the user's own selection is the tuple
`(version, name, product, line)`, joined with a `\u001f` separator (`createProductKey` in both
`MyProducts` and `SupportStatus` controllers).

### Mock PAM data

The real SAP PAM export is customer-only data and must never be checked into this (public) repository or
shipped in a build. [pv](pv) is therefore **fictional mock data**, not a real SAP export: every identity
field (`Product Version`, `Official Name`, `Product`, `Product Line`, `Product Category`) has had its
alphabetic words replaced with deterministically-generated fictional syllables (same real-world row
count/structure, dates, and `Current Status` values — those aren't SAP-proprietary and were left as-is),
and the support-portal `URL` column was replaced with a generic `https://www.sap.com/` link. If you need to
regenerate it from scratch or extend it, there is no dedicated script for the substitution itself — it was
a one-off transform; just hand-edit `pv` directly (same CSV shape as a real PAM export, see the field table
above) or regenerate a fresh fictional dataset the same way. Never replace `pv` with a real customer PAM
export and commit it.

This also means `tests/testcases.md` and `tests/e2e/*.spec.ts` assert on this fictional data's specific
product names/counts (e.g. "RA To/4CI 2025", "search for Nanemo") rather than real SAP product names — if
`pv` ever changes, re-verify (or regenerate, see `npm run test:e2e:update-snapshots[:linux]`) the affected
assertions and Playwright screenshot baselines the same way.

`scripts/__tests__/fixtures/sample-pam.csv` (used only by `npm run test:scripts`) is a separate, smaller
set of hand-written fictional rows, unrelated to the main `pv` file.

### i18n

Resource bundles live in `webapp/i18n/` (`i18n.properties` default, `i18n_de.properties`,
`i18n_en.properties`), configured for `en`/`de` with `en` fallback. All user-facing strings in the views
go through the `i18n` ResourceModel (`{i18n>key}` bindings); key groups are `field.*` (shared PAM column/
field labels, reused across Main, SupportStatus, MyProducts, ProductDetail), `filter.*`, `table.*`,
`detail.*`, `app.*`, `myProducts.*`/`supportStatus.*`, and `msg.*` (upload/validation alerts and toasts).
`field.*` labels are kept identical in `en`/`de` since they're fixed SAP PAM terminology, not translated
chrome text.

Controller code that needs a resolved text synchronously (JSONModel properties built in `onInit`, toast/
alert messages, formatter-computed labels like the `ProductDetail` milestone list) must use
`BaseController#getText(key, args?)`, not `getResourceBundle()`. With `async: true` (manifest.json),
`ResourceModel#getResourceBundle()` always returns a `Promise`, even once the bundle has finished loading.
`getText()` instead goes through `ResourceModel#getProperty(key)` — the same synchronous path XML
`{i18n>key}` bindings use internally — which is safe to call from anywhere after view creation because the
Component declares `sap.ui.core.IAsyncContentCreation` (every manifest model, including this one, is
loaded before any view/controller is instantiated). Note `getProperty` takes the bare key with **no**
leading `/` (unlike `JSONModel`); placeholder substitution (`{0}`, `{1}`, ...) is done manually in
`getText()` since `getProperty` doesn't accept format args.

### Build tooling

UI5 Tooling (`@ui5/cli`) drives everything; TypeScript sources are transpiled to UI5 modules via
`ui5-tooling-transpile`. Relevant config files:

- [ui5.yaml](ui5.yaml) — default dev config (proxies `/resources` and `/test-resources` to
  `https://ui5.sap.com`, Fiori tools preview/reload middleware, transpile middleware).
- [ui5-local.yaml](ui5-local.yaml) — framework resources served from local `node_modules`
  (`@sapui5` libraries incl. `sap.ushell`, `sap.ui.table`, `sap.ui.comp`, etc.).
- [ui5-dist.yaml](ui5-dist.yaml) — serves the built `dist/` output.
- [ui5-coverage.yaml](ui5-coverage.yaml) — adds istanbul instrumentation for coverage runs.

`manifest.json` requires `minUI5Version: 1.152.0`, depending only on `sap.ui.core` and `sap.m` at
runtime (the extra libraries in `ui5-local.yaml` are available for local dev/testing but not declared
app dependencies).

### Docs site

`docs/` is a separate VitePress site (unrelated to the UI5 app itself) for project documentation,
configured in [docs/.vitepress/config.mts](docs/.vitepress/config.mts). Run via `npm run docs:dev`.

### Miscellaneous

- [SAD_sample.md](SAD_sample.md) is an unrelated sample Solution Architecture Document (for a different,
  fictional "Demo Report" app) checked in purely as test fixture content — it does not describe this
  app's architecture.
- `.agents/skills/vitepress/` contains a vendored Claude skill reference for VitePress; not part of the
  app itself.
- **XMLView `class` attribute gotcha**: `class="{path: ..., formatter: ...}"` or `class="{= expression }"`
  does not update reactively when the underlying model changes — confirmed by DOM inspection, it only
  resolves once at initial render. For dynamic per-instance styling, bind a real, reactively-bound control
  property instead (e.g. `ObjectStatus` `state`/`inverted`, `ToggleButton` `pressed`) and target the
  CSS class the framework itself adds/removes for that property (e.g. `.sapMToggleBtnPressed`) from
  `css/style.css`, rather than trying to bind `class` directly.
