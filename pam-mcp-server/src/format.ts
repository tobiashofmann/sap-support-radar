import { CHARACTER_LIMIT } from "./constants.js";
import { PamProduct } from "./data.js";

/** Truncates `text` to {@link CHARACTER_LIMIT}, appending `note` if truncation happened. */
export function truncateText(text: string, note: string): string {
    if (text.length <= CHARACTER_LIMIT) {
        return text;
    }

    return `${text.slice(0, CHARACTER_LIMIT)}\n\n…[truncated]\n\n${note}`;
}

const SUMMARY_FIELDS: Array<{ key: string; label: string }> = [
    { key: "version", label: "Version" },
    { key: "product", label: "Product" },
    { key: "line", label: "Line" },
    { key: "status", label: "Status" },
    { key: "eomm", label: "End of mainstream maintenance" },
    { key: "eom", label: "End of extended maintenance" }
];

/** Renders a `-` for an empty/missing cell value, matching the PAM app's own detail-page convention. */
function cellValue(entry: PamProduct, key: string): string {
    const value = entry[key];

    if (value === null || value === undefined || value === "") {
        return "–";
    }

    // PAM entries only ever hold primitive JSON values (string/number/boolean) -
    // see de.itsfullofstars.sap.pam's CLAUDE.md "Column/field conventions".
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return "–";
}

/**
 * Renders a Markdown table summarizing `entries` (a fixed, commonly-useful
 * field subset - the full record is always available via `response_format:
 * "json"` on `pam_query_products`).
 */
export function formatEntriesAsMarkdownTable(entries: PamProduct[]): string {
    if (entries.length === 0) {
        return "_No matching entries._";
    }

    const header = `| ${SUMMARY_FIELDS.map((field) => field.label).join(" | ")} |`;
    const separator = `| ${SUMMARY_FIELDS.map(() => "---").join(" | ")} |`;

    const rows = entries.map((entry) => {
        return `| ${SUMMARY_FIELDS.map((field) => cellValue(entry, field.key)).join(" | ")} |`;
    });

    return [header, separator, ...rows].join("\n");
}
