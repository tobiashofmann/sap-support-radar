# Classes & methods

A reference of the most important classes/modules and their public methods. For full signatures, see the
TSDoc comments in the source files themselves — this page focuses on *why* each piece exists and how it's
used, which is often not obvious from the code alone.

## Controllers (`webapp/controller/`)

### `BaseController`

Abstract base class every other controller extends. Provides typed convenience access plus several
handlers shared across multiple pages, so page-specific controllers don't reimplement identical logic:

| Method | Used by | Purpose |
| --- | --- | --- |
| `getRouter()` | all | Typed access to the component's router. |
| `getText(key, args?)` | all | Synchronous i18n text resolution via `ResourceModel#getProperty`. |
| `getModel(name?)` / `setModel(model, name?)` | all | Typed view-model access. |
| `navTo(name, params?, replace?)` | all | Navigation helper wrapping `Router#navTo`. |
| `onProductRowPress(event)` | `Main`, `SupportStatus` | Navigates to `productdetail/{index}` for the pressed table row. |
| `onToggleAdvancedFilters()` | `Main`, `SupportStatus` | Toggles the "view" model's `/showAdvancedFilters` flag. |
| `onSupportEndHighlightChange(event)` | `Main`, `SupportStatus` | Stores the chosen highlight horizon on `/supportEndHighlightDate`. |
| `supportEndHighlight(value, limit)` | `Main`, `SupportStatus` (view formatter) | Maps a raw support-end date + horizon to a `ValueState` name. |
| `onCloseChartAnalysis()` | `Main`, `SupportStatus` | Closes the shared `chartAnalysisDialog` control id. |
| `formatBarWidth(count, max)` | `Main`, `SupportStatus` (view formatter) | CSS width percentage for a chart bar. |

### `App`

Backs the root shell (`App.view.xml`): the global toolbar with nav tabs and upload buttons.

- `onInit()` — sets up the `navigation` model (`/activeRoute`) and wires `attachRoutePatternMatched` so the
  nav tabs can highlight the active page.
- `onNavigateToMain/SupportStatus/MyProducts()` — toolbar nav tab handlers.
- `onUploadPamJson()` / `onUploadOwnProducts()` — open the file picker and, on success, call
  `replacePamModel`/`replaceOwnProductsModel`, which validate via `parseJsonArrayOfObjects` and show a
  localized `MessageBox.error`/`MessageToast` depending on the result.

### `Main`

The full PAM product table (`""` route).

- `onInit()` — sets up the `filter`, `view` and `viewSettings` JSON models and loads initial filter
  dropdown values via `updateFilterValues()`.
- `onSearchChange()` / `onFilterChange()` / `onSortChange()` — re-run `applyTableState()` whenever
  search/filter/sort controls change.
- `applyTableState()` — the core method: reads every filter control's current value, builds an array of
  `sap.ui.model.Filter`s (full-text OR-filter + per-field filters + a custom relative-maintenance-date
  filter), applies them to the table's `ListBinding` via `FilterType.Application`, then builds and applies
  a `Sorter` (using `compareDates` as a custom comparator for date columns).
- `onShowChartAnalysis()` — builds a `chart` model from `buildFieldDistribution(entries, "status", ...)`
  over the currently filtered rows and opens the chart dialog.
- `onResetFilters()` / `onReset()` — clear filter controls only, or search+filters+sort entirely.
- `updateTableTitle()` — keeps the table heading's row count in sync with the active filter.

### `SupportStatus`

Same shape as `Main`, additionally scoped to the user's own products.

- `createOwnProductsFilter()` — builds an OR-of-ANDs `Filter` matching any of the user's own products by
  the [product identity](/architecture#product-identity) tuple (`PRODUCT_KEY_FIELDS`).
- `applyTableState()` — like `Main`'s, but always includes `createOwnProductsFilter()`; if `ownProducts` is
  empty, short-circuits to an always-false filter (`version = "__NO_OWN_PRODUCTS__"`) instead, since an
  OR-filter over zero sub-filters would otherwise behave unexpectedly.
- `updateOwnProductsState()` — keeps `/hasOwnProducts` / `/noOwnProducts` on the `supportStatus` model in
  sync, driving the "no own products maintained" message banner.
- `onRouteMatched()` — re-syncs own-products state and filters every time this route becomes active (own
  products may have changed on the MyProducts page since the last visit).

### `MyProducts`

Checkbox-based selection UI for the user's own product landscape (`myproducts` route).

- `selectedProductKeys: Set<string>` — the checked rows, tracked by product key, independent of the
  current search/scope filter so switching those never loses the in-progress selection.
- `onSelectionChange(event)` — adds/removes the pressed row's product key from `selectedProductKeys`.
- `applyFilters()` — search filter plus the "Show all / My products" scope filter (the latter via an
  OR-of-ANDs filter over `ownProducts`, same shape as `SupportStatus.createOwnProductsFilter`).
- `onAddProducts()` — the save action: maps `selectedProductKeys` back to full PAM entries, **and**
  preserves any existing `ownProducts` entries that have no matching PAM row (products created via
  MyProductsAdd), so this "declarative replace" of the model never silently deletes manually created
  products.
- `onDownloadOwnProducts()` — serializes `ownProducts` to pretty-printed JSON and triggers a
  `Blob`/`URL.createObjectURL` download of `OwnProducts.json`.
- `updateTableSelection()` — re-applies `selectedProductKeys` as the table's checkbox state whenever the
  list binding changes (e.g. after filtering), since UI5 selection state doesn't survive a rebind on its
  own.

### `MyProductsAdd`

Manual "create a product" form (`myproducts/add` route), for products absent from the PAM data.

- `FORM_FIELDS` — maps each form control's view id to the PAM field it edits.
- `REQUIRED_FIELD_IDS` — `version`, `name`, `eomm` must be filled in before saving.
- `validateRequiredFields()` — marks empty required `Input`s with an inline `ValueState.Error` and focuses
  the first invalid one.
- `onSave()` — on successful validation, appends the new entry to **both** the `pam` model (so it has a row
  to render/navigate to) and the `ownProducts` model, then navigates back to MyProducts.

### `ProductDetail`

Read-only detail page for one PAM entry (`productdetail/{index}` route).

- `onRouteMatched(event)` — binds the view's element context to `/​{index}` on the `pam` model and rebuilds
  the `detail` model via `updateDetailFields`.
- `buildMilestones(entry)` — builds the lifecycle timeline: determines the "currently active" milestone
  (the last one in chronological order whose date has already passed), colors it green (availability
  phases) or red (EOMM/EOM, since reaching those means support has ended), colors past milestones gray, and
  colors future milestones by the shared red/yellow/gray thresholds. Returned newest-first for display.
- `isOwnProduct(entry)` / `onToggleOwnProduct()` — checks/toggles this entry's membership in `ownProducts`
  by [product identity key](/architecture#product-identity), directly from the detail page.
- `supportStatusText/State/Icon(value)` — formatters for the title-area "Mainstream support until" badge.
- `ownProductButtonText/Icon/Type(isOwnProduct)` — formatters for the add/remove toggle button's label,
  icon (`sap-icon://add` / `sap-icon://less`) and type (`Emphasized` / `Reject`).

## Shared data-logic modules (`webapp/model/`)

These are deliberately plain, UI5-independent TypeScript modules — no controller/view dependency — so they
can be unit-tested and reused across controllers.

### `germanDate.ts`

- `parseGermanDate(value)` — parses a `"dd.mm.yyyy"` string into a midnight-normalized `Date`, or `null`
  for anything else (including calendar-invalid dates and PAM's occasional free-text dates like
  `"Q3/2027"`). Deliberately a free function, not a controller method, so it can be passed directly as a
  `Sorter#comparator` without `this`-binding pitfalls.
- `compareDates(value1, value2)` — ascending comparator for raw PAM date values; unparseable values always
  sort last.
- `isDateWithinRelativePeriod(value, months)` — used by the "Mainstream maintenance ends within N months"
  relative filter.

### `supportEndThresholds.ts`

- `SUPPORT_END_THRESHOLDS` — the single, central red/yellow configuration (default: red within 6 months,
  yellow within 12 months) used by table-row highlighting, the chart dialog's implicit grouping, and the
  product detail page's milestone colors.
- `getSupportEndState(date, today)` — classifies a date as `"Error"` / `"Warning"` / `"None"` against those
  thresholds; a date already in the past is always the most urgent state.
- `getRelativePeriodEnd(today, months)` — end of the target month, `months` months from today.

### `productKey.ts`

- `PamProduct` — the loose `{ [key: string]: unknown }` shape every PAM/OwnProducts entry has.
- `PRODUCT_KEY_FIELDS` — `["version", "name", "product", "line"]`, the tuple defining a
  [product identity](/architecture#product-identity). See [ADR 0013](/adr/0013-product-identity-key).
- `createProductKey(product)` — joins the four fields with a `\u001f` (unit separator) delimiter.
- `getProductFieldValue(product, field)` — trimmed-string read of one field, tolerant of
  non-primitive/missing values.

### `pamFilters.ts`

- `SEARCH_FIELDS` / `TEXT_FILTERS` / `SELECT_FILTERS` / `DATE_FIELDS` / `MAINSTREAM_MAINTENANCE_FIELD` —
  the table's filter/search/sort field configuration, shared by `Main` and `SupportStatus`.
- `createFilterOptions(data, field, allLabel)` — builds a filter `Select`'s dropdown options from the
  unique values of a PAM field, sorted chronologically for date fields and locale-aware (`"de"`) otherwise.
- `buildFieldDistribution(entries, field, unspecifiedLabel)` — groups entries by a field's value and counts
  them, descending by count, for the chart analysis dialog.

### `currentStatus.ts`

- `CURRENT_STATUS_STATE` — maps each known `"Current Status"` PAM value (exact official SAP terminology,
  including a double space in `"Restricted available  (productive use allowed)"`) to a `ValueState`.
- `CURRENT_STATUS_VALUES` — the same values in lifecycle order, used for the MyProductsAdd status dropdown.

### `jsonArrayParser.ts`

- `parseJsonArrayOfObjects(fileContent)` — validates uploaded JSON is an array of plain objects, returning
  a discriminated union (`parseError` / `notArray` / `invalidEntries` / `ok`) rather than showing an error
  itself, since the i18n message text differs per caller/model.

### `models.ts`

- `createDeviceModel()` — a one-way-bound `JSONModel` exposing `sap.ui.Device`, set up once in
  `Component#init` as the `"device"` model, for device/browser-dependent view bindings (responsive
  layout decisions).

## Utilities (`webapp/util/`)

### `JsonFileUpload.ts`

- `pickJsonFile(onContent, onError)` — plain DOM utility (no UI5 dependency) implementing the "hidden
  `<input type=file>`" upload pattern: opens the native file picker restricted to `.json`, reads the
  selection as text via `FileReader`, and calls back with the content or an error.

## `Component.ts`

- `init()` — base component init, creates the `"device"` model, and initializes the router
  (`sap.ui.core.IAsyncContentCreation` guarantees every manifest model, including `i18n`, is fully loaded
  before any view/controller is instantiated).
- `getContentDensityClass()` — picks `sapUiSizeCompact` (no touch support) or `sapUiSizeCozy` (touch), or
  defers to the Fiori Launchpad's own density class if already set on `<body>`.
