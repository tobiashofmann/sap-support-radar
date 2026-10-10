import { parseGermanDate } from "./germanDate";
import { PamProduct } from "./productKey";

/** One entry of a filter `Select`'s dropdown, as bound to `key`/`filter>text`. */
export interface FilterOption {
    key: string;
    text: string;
}

/** Maps a filter control's view id to the PAM field path it filters on. */
export interface FilterFieldDefinition {
    id: string;
    path: string;
}

/**
 * Search/filter configuration of the PAM product table, previously
 * duplicated identically across the Main and SupportStatus controllers.
 * Fields matched by the global full-text search (`globalSearch`).
 */
export const SEARCH_FIELDS: string[] = [
    "version",
    "name",
    "product",
    "line",
    "category"
];

/** Free-text filter inputs, keyed by their view control id. */
export const TEXT_FILTERS: FilterFieldDefinition[] = [
    {
        id: "filterProductVersion",
        path: "version"
    },
    {
        id: "filterProduct",
        path: "product"
    },
    {
        id: "filterProductLine",
        path: "line"
    }
];

/** Dropdown (exact-match) filters, keyed by their view control id. */
export const SELECT_FILTERS: FilterFieldDefinition[] = [
    {
        id: "filterCurrentStatus",
        path: "status"
    },
    {
        id: "filterUnrestrictedAvailable",
        path: "ua"
    },
    {
        id: "filterRestrictedAvailableNotAllowed",
        path: "ra_puna"
    },
    {
        id: "filterMainstreamMaintenance",
        path: "eomm"
    },
    {
        id: "filterExtendedMaintenance",
        path: "eom"
    }
];

/**
 * PAM fields holding dd.mm.yyyy dates (or occasionally unparseable
 * free-text dates, see {@link parseGermanDate}). Used to pick chronological
 * instead of alphabetical sorting/filter-option ordering.
 */
export const DATE_FIELDS: string[] = [
    "ra_puna",
    "ra_pua",
    "ua",
    "hanaDate",
    "eomm",
    "eom",
    "eop1",
    "eosk"
];

/** PAM field used by the "mainstream maintenance ends within X months" relative filter. */
export const MAINSTREAM_MAINTENANCE_FIELD = "eomm";

/**
 * Builds the unique, sorted values of a PAM field as `Select` options,
 * including a leading "all" option. Date fields (see {@link DATE_FIELDS})
 * are sorted chronologically instead of alphabetically.
 * @param data The PAM entries to collect values from
 * @param field The PAM field to build options for
 * @param allLabel The label for the leading "all" option
 * @returns The filter options, "all" first
 */
export function createFilterOptions(
    data: PamProduct[],
    field: string,
    allLabel: string
): FilterOption[] {
    const values = data
        .map((entry) => entry[field])
        .filter((value): value is string => {
            return typeof value === "string" && value.trim().length > 0;
        })
        .map((value) => value.trim());

    const uniqueValues = Array.from(new Set(values));

    uniqueValues.sort((value1, value2) => {
        if (DATE_FIELDS.includes(field)) {
            const date1 = parseGermanDate(value1);
            const date2 = parseGermanDate(value2);

            if (date1 !== null && date2 !== null) {
                return date1.getTime() - date2.getTime();
            }
        }

        return value1.localeCompare(value2, "de", {
            numeric: true,
            sensitivity: "base"
        });
    });

    return [
        {
            key: "",
            text: allLabel
        },
        ...uniqueValues.map((value) => ({
            key: value,
            text: value
        }))
    ];
}

/** One bar of a {@link buildFieldDistribution} chart: a field value and its entry count. */
export interface FieldDistributionEntry {
    value: string;
    count: number;
}

/**
 * Groups PAM entries by a field's value and counts them, for the "chart
 * analysis" bar chart on the Main and SupportStatus tables. Entries without
 * a value for the field are grouped under `unspecifiedLabel`. Sorted by
 * count, descending, so the most common values appear first.
 * @param entries The (already filtered) PAM entries to group
 * @param field The PAM field to group by
 * @param unspecifiedLabel The label to use for entries with no value for the field
 * @returns The distribution, most common value first
 */
export function buildFieldDistribution(
    entries: PamProduct[],
    field: string,
    unspecifiedLabel: string
): FieldDistributionEntry[] {
    const counts = new Map<string, number>();

    entries.forEach((entry) => {
        const rawValue = entry[field];

        const value = typeof rawValue === "string" && rawValue.trim().length > 0
            ? rawValue.trim()
            : unspecifiedLabel;

        counts.set(value, (counts.get(value) ?? 0) + 1);
    });

    return Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((entry1, entry2) => entry2.count - entry1.count);
}
