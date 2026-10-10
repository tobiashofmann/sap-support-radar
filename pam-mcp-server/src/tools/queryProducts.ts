import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { FIELD_DEFINITIONS } from "../fields.js";
import { loadPamEntries, PamProduct } from "../data.js";
import { FieldFilter, filterPamEntries } from "../filtering.js";
import { formatEntriesAsMarkdownTable, truncateText } from "../format.js";
import { DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT } from "../constants.js";

/** A filter value: either one value, or several (matched as OR) for the same field. */
const FilterValueSchema = z.union([
    z.string().min(1),
    z.array(z.string().min(1)).min(1)
]);

const filterShape = Object.fromEntries(
    FIELD_DEFINITIONS.map((field) => [
        field.key,
        FilterValueSchema
            .optional()
            .describe(
                `Filter by "${field.label}" (${field.matchMode === "exact" ? "exact match" : "substring match"}, case-insensitive). ${field.description} Pass an array to match any of several values (OR).`
            )
    ])
);

const InputSchema = {
    ...filterShape,
    limit: z.number().int().min(1).max(MAX_QUERY_LIMIT).default(DEFAULT_QUERY_LIMIT)
        .describe(`Maximum number of entries to return (default ${DEFAULT_QUERY_LIMIT}, max ${MAX_QUERY_LIMIT}).`),
    offset: z.number().int().min(0).default(0)
        .describe("Number of matching entries to skip, for pagination (default 0)."),
    response_format: z.enum(["markdown", "json"]).default("markdown")
        .describe("\"markdown\" (default) returns a readable summary table; \"json\" returns the full raw entries.")
};

type QueryInput = {
    [K in keyof typeof InputSchema]: z.infer<(typeof InputSchema)[K]>;
};

const OutputSchema = {
    total: z.number(),
    count: z.number(),
    offset: z.number(),
    has_more: z.boolean(),
    entries: z.array(z.record(z.string(), z.unknown()))
};

function buildFilters(params: QueryInput): FieldFilter[] {
    const filters: FieldFilter[] = [];

    FIELD_DEFINITIONS.forEach((field) => {
        const rawValue = (params as Record<string, unknown>)[field.key];

        if (rawValue === undefined) {
            return;
        }

        const values: string[] = Array.isArray(rawValue) ? rawValue as string[] : [rawValue as string];

        filters.push({ key: field.key, values });
    });

    return filters;
}

export function registerQueryProductsTool(server: McpServer): void {
    server.registerTool(
        "pam_query_products",
        {
            title: "Query PAM products",
            description: `Searches the SAP Product Availability Matrix (PAM) data for entries matching one or more field filters, combined with AND across fields (and OR across multiple values for the same field).

How specific a filter is determines how many entries come back - this is intentional, not a limitation:
  - Filter by "version" (a specific product version, e.g. "SAP S/4HANA 2025") -> typically a single matching entry.
  - Filter by "product" or "line" (e.g. product="SAP S/4HANA") -> every version/entry belonging to that product/line.
  - Filter by "status" (e.g. status="Unrestricted available") -> every product currently in that lifecycle status.
  - The same applies to every other status/date field (ra_puna, ra_pua, ua, hanaStatus, hanaDate, eomm, eom, eop1, eosk, addOn) and the OpenUI5-only fields (lts, eocp, sapuiversion, frontendserver).
Call pam_list_fields first if unsure which field name/match mode to use, or pam_list_field_values to discover the exact spelling of a status/category/line value.

Args:
  - One optional parameter per PAM field (see pam_list_fields for the full list and match mode of each, e.g. "version", "product", "line", "category", "status", "eomm", "eom", ...). Each accepts a single string or an array of strings (OR). Omitted fields are not filtered on.
  - limit (number, optional): max entries to return (default ${DEFAULT_QUERY_LIMIT}, max ${MAX_QUERY_LIMIT}).
  - offset (number, optional): entries to skip, for pagination (default 0).
  - response_format ("markdown" | "json", optional): "markdown" (default) for a readable summary table, "json" for the full raw entries including every field.

Returns:
  For JSON format: { "total": number, "count": number, "offset": number, "has_more": boolean, "entries": [ <full PAM entry objects> ] }
  For Markdown format: a summary table (version/product/line/status/eomm/eom) plus the same counts.

Examples:
  - Use when: "What's the support status of SAP S/4HANA 2025?" -> version="SAP S/4HANA 2025"
  - Use when: "List all SAP S/4HANA versions" -> product="SAP S/4HANA"
  - Use when: "Which products are still unrestricted available?" -> status="Unrestricted available"
  - Use when: "Which products' mainstream maintenance ends on 31.12.2027?" -> eomm="31.12.2027"
  - Don't use when: you don't know the exact field name or value spelling yet (use pam_list_fields / pam_list_field_values first).

Error Handling:
  - Returns an empty "entries" array (not an error) if no entries match - this is a valid, common result.`,
            inputSchema: InputSchema,
            outputSchema: OutputSchema,
            annotations: {
                title: "Query PAM products",
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        (params: QueryInput) => {
            const entries = loadPamEntries();
            const filters = buildFilters(params);
            const matched = filterPamEntries(entries, filters);

            const page: PamProduct[] = matched.slice(params.offset, params.offset + params.limit);
            const hasMore = params.offset + page.length < matched.length;

            const output = {
                total: matched.length,
                count: page.length,
                offset: params.offset,
                has_more: hasMore,
                entries: page
            };

            let textContent: string;

            if (params.response_format === "json") {
                textContent = JSON.stringify(output, null, 2);
            } else {
                const lines = [
                    `# PAM query results`,
                    "",
                    filters.length === 0
                        ? "No filters applied - showing entries from the full dataset."
                        : `Filters: ${filters.map((filter) => `${filter.key}=${filter.values.join(" OR ")}`).join(", ")}`,
                    "",
                    `${matched.length} matching entr${matched.length === 1 ? "y" : "ies"}` +
                    (hasMore || params.offset > 0
                        ? ` (showing ${page.length}, offset ${params.offset})`
                        : "") + ".",
                    ""
                ];

                if (hasMore) {
                    lines.push(`More results available - call again with offset=${params.offset + page.length} to continue.`, "");
                }

                lines.push(formatEntriesAsMarkdownTable(page));
                lines.push("", "_(Use response_format: \"json\" to get every field of each entry.)_");

                textContent = lines.join("\n");
            }

            textContent = truncateText(
                textContent,
                `Reduce "limit" or narrow the filters to see fewer entries at once (${matched.length} entries matched in total).`
            );

            return {
                content: [{ type: "text" as const, text: textContent }],
                structuredContent: output
            };
        }
    );
}
