/**
 * A PAM entry as loaded from PAM.json/OwnProducts.json. Field values are raw
 * strings (dates stay dd.mm.yyyy) - see "Column/field conventions" in
 * CLAUDE.md for the full key list.
 */
export interface PamProduct {
    [key: string]: unknown;
}

/**
 * A "product identity" for matching PAM entries against the user's own
 * selection is the tuple (version, name, product, line), see CLAUDE.md.
 * Previously duplicated independently across the MyProducts, SupportStatus
 * and ProductDetail controllers.
 */
export const PRODUCT_KEY_FIELDS: string[] = [
    "version",
    "name",
    "product",
    "line"
];

/**
 * Reads one field of a PAM entry as a trimmed string, for building a
 * product key or an equality filter. Returns `""` for `null`/`undefined`/
 * non-primitive values.
 * @param product The PAM entry to read from
 * @param field The field name to read
 * @returns The trimmed string value, or `""` if absent/not a primitive
 */
export function getProductFieldValue(
    product: PamProduct,
    field: string
): string {
    const value = product[field];

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value).trim();
    }

    return "";
}

/**
 * Builds the product identity key for a PAM entry by joining
 * {@link PRODUCT_KEY_FIELDS} with a `\u001f` (unit separator) delimiter,
 * chosen because it cannot appear in any PAM field value.
 * @param product The PAM entry to key
 * @returns The joined product key
 */
export function createProductKey(product: PamProduct): string {
    return PRODUCT_KEY_FIELDS
        .map((field) => getProductFieldValue(product, field))
        .join("\u001f");
}
