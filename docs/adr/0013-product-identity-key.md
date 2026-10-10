# 0013 – Product identity as a field tuple, not an explicit ID

**Status:** Accepted

## Context

Several pages need to determine whether a given PAM entry "is" the user's own product: `MyProducts`
(checkbox state), `SupportStatus` (filtering the table down to own products), and `ProductDetail`
(add/remove toggle). Because of [ADR 0005](/adr/0005-json-models-no-odata) (plain JSON, no OData entity
model), there is no framework-provided entity key to use here — a PAM entry's identity has to be decided
from its data alone. The raw PAM data has no unique identifier field either — a CSV export of the public
SAP PAM, mapped nearly 1:1 into JSON (see `scripts/import-pam-csv.js`'s `FIELD_MAP` and
[Architecture → PAM.json field mapping](/architecture#pam-json-field-mapping)) — and manually created
entries (via `MyProductsAdd`) don't come from that pipeline at all.

This matching logic was originally duplicated, independently, across `MyProducts`, `SupportStatus` and
`ProductDetail`.

## Decision

Treat a PAM entry's **identity** as the tuple `(version, name, product, line)` — the four fields that, in
practice, uniquely distinguish one PAM row from another — and centralize this in
`webapp/model/productKey.ts`:

- `PRODUCT_KEY_FIELDS` declares the four field names.
- `createProductKey(product)` joins their trimmed string values with a `\u001f` (ASCII unit separator)
  delimiter, chosen specifically because it cannot appear in any real PAM field value, ruling out
  accidental key collisions from a delimiter character appearing in product names.
- `getProductFieldValue(product, field)` is the shared, tolerant field reader behind both `createProductKey`
  and the `Filter`-based matching used by `SupportStatus.createOwnProductsFilter`/
  `MyProducts.applyFilters`.

All three consuming controllers now call these shared functions instead of recomputing an ad hoc key
locally.

## Consequences

- **Positive:** A single definition of "what makes two PAM entries the same product" — changing it (e.g.
  adding `category` to the tuple) only requires touching one file, and all three pages stay consistent with
  each other automatically.
- **Positive:** Works uniformly for both PAM-sourced and manually created (`MyProductsAdd`) entries, since
  it only depends on field values being present, not on a provenance-tracking ID.
- **Negative:** If two genuinely different PAM rows ever happened to share identical values for all four
  fields (not observed in the current PAM export, but not structurally prevented either), they would be
  treated as the same product — selecting one as "own" would implicitly also match the other everywhere
  this key is used for filtering.
- **Negative:** The key is a plain string join with a control-character delimiter, not a typed value object
  — callers must remember to go through `createProductKey`/`getProductFieldValue` rather than reconstructing
  the join manually, or risk re-introducing the original duplication this consolidation removed.
