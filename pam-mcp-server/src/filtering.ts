import { FIELD_DEFINITION_BY_KEY, FieldMatchMode } from "./fields.js";
import { PamProduct } from "./data.js";

/** One field filter: match `key`'s value against any of `values` (OR), per that field's match mode. */
export interface FieldFilter {
    key: string;
    values: string[];
}

/** Reads a PAM entry's field value as a trimmed string, or `undefined` if absent/not a primitive. */
function readFieldValue(entry: PamProduct, key: string): string | undefined {
    const value = entry[key];

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value).trim();
    }

    return undefined;
}

/** Whether `fieldValue` matches `filterValue`, per `matchMode` - both compared case-insensitively. */
function valueMatches(fieldValue: string, filterValue: string, matchMode: FieldMatchMode): boolean {
    const normalizedField = fieldValue.toLowerCase();
    const normalizedFilter = filterValue.trim().toLowerCase();

    if (!normalizedFilter) {
        return true;
    }

    return matchMode === "exact"
        ? normalizedField === normalizedFilter
        : normalizedField.includes(normalizedFilter);
}

/**
 * Whether `entry` satisfies one field filter: its value for `filter.key` must
 * match at least one of `filter.values` (OR within a field).
 */
function entryMatchesFilter(entry: PamProduct, filter: FieldFilter): boolean {
    const definition = FIELD_DEFINITION_BY_KEY.get(filter.key);
    const fieldValue = readFieldValue(entry, filter.key);

    if (fieldValue === undefined) {
        return false;
    }

    const matchMode = definition?.matchMode ?? "exact";

    return filter.values.some((filterValue) => valueMatches(fieldValue, filterValue, matchMode));
}

/**
 * Filters PAM entries by a set of field filters, combined with AND (an entry
 * must satisfy every filter) - see {@link entryMatchesFilter} for how a
 * single filter (which may itself be an OR of several values) is evaluated.
 * @param entries The PAM entries to filter
 * @param filters The field filters to apply; an empty array matches every entry
 * @returns The matching entries, in their original order
 */
export function filterPamEntries(entries: PamProduct[], filters: FieldFilter[]): PamProduct[] {
    if (filters.length === 0) {
        return entries;
    }

    return entries.filter((entry) => filters.every((filter) => entryMatchesFilter(entry, filter)));
}

/** One distinct value of a field and how many (currently loaded) PAM entries have it. */
export interface FieldValueCount {
    value: string;
    count: number;
}

/**
 * Collects the distinct, non-empty values of one field across `entries`,
 * along with how many entries carry each value - mirrors the PAM app's own
 * "status distribution" chart (webapp/model/pamFilters.ts#buildFieldDistribution).
 * @param entries The PAM entries to inspect
 * @param key The field to collect values for
 * @returns The distinct values, most common first, then alphabetically
 */
export function collectFieldValueCounts(entries: PamProduct[], key: string): FieldValueCount[] {
    const counts = new Map<string, number>();

    entries.forEach((entry) => {
        const value = readFieldValue(entry, key);

        if (value) {
            counts.set(value, (counts.get(value) ?? 0) + 1);
        }
    });

    return Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
