# 0012 – Address product detail by array index, not a synthetic ID

**Status:** Accepted

## Context

The product detail page (`productdetail/{index}`) needs a stable way to address one specific entry of the
`pam` model from a route parameter. Having chosen [plain JSON data over an OData
model](/adr/0005-json-models-no-odata), there is no entity-key concept to lean on here — PAM entries have no
natural unique ID in the source data at all. The closest
thing is the [product identity tuple](/adr/0013-product-identity-key)
(`version`/`name`/`product`/`line`), which is verbose and not URL-friendly, and generating a synthetic
UUID per entry would require stamping one onto every row on load (and on every upload/manual creation),
adding bookkeeping for no clear benefit given the app's single-session, client-only nature
(see [ADR 0001](/adr/0001-client-only-no-backend)).

## Decision

Address a PAM entry by its **position in the `pam` model's underlying array** (`/​{index}`). This works
reliably because UI5's `Filter`/`Sorter` on a `JSONModel`'s `ListBinding` only reorder the *binding's view*
of the data — they never mutate the underlying array itself. So regardless of what the Main/SupportStatus
table currently has filtered or sorted to, `pam>/42` always refers to the same entry for as long as the
session's `pam` model isn't replaced wholesale.

`BaseController#onProductRowPress` reads the pressed row's binding context path and extracts the trailing
index, which is navigated to as the `index` route argument; `ProductDetail.onRouteMatched` binds the view
element to that same path. New entries created via `MyProductsAdd` are **appended** to the `pam` array
(never inserted), specifically so they don't shift the index of any existing entry's route.

## Consequences

- **Positive:** No extra ID field, no ID generation/bookkeeping logic, and the mechanism is essentially
  free — it falls out of how UI5 list bindings already work.
- **Positive:** Deep links like `#/productdetail/42` are stable within a session, including across
  filtering/sorting/navigating away and back.
- **Negative:** The index is **not stable across a `pam` model replacement.** Uploading a new PAM.json, or
  re-running the app from a fresh page load with different bundled data, invalidates any previously
  bookmarked/shared `productdetail/{index}` links — there is no cross-session identity for a PAM entry.
- **Negative:** If any future change ever inserts (rather than appends) into the `pam` array, or removes
  entries, every PAM entry after the insertion/removal point in the array silently points to the wrong
  product. Any new code path for restructuring the `pam` array must preserve index stability or explicitly
  re-derive affected routes/bookmarks.
