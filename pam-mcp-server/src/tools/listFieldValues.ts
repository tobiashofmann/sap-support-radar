import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { FIELD_DEFINITION_BY_KEY, FIELD_KEYS } from "../fields.js";
import { loadPamEntries } from "../data.js";
import { collectFieldValueCounts } from "../filtering.js";
import { DEFAULT_FIELD_VALUES_LIMIT, MAX_FIELD_VALUES_LIMIT } from "../constants.js";

const InputSchema = {
    field: z.enum(FIELD_KEYS)
        .describe("The PAM field to list distinct values for, e.g. \"status\", \"line\", \"eomm\". See pam_list_fields for the full list."),
    limit: z.number().int().min(1).max(MAX_FIELD_VALUES_LIMIT).default(DEFAULT_FIELD_VALUES_LIMIT)
        .describe(`Maximum number of distinct values to return, most common first (default ${DEFAULT_FIELD_VALUES_LIMIT}, max ${MAX_FIELD_VALUES_LIMIT}).`)
};

const OutputSchema = {
    field: z.string(),
    total_distinct_values: z.number(),
    values: z.array(z.object({
        value: z.string(),
        count: z.number()
    }))
};

export function registerListFieldValuesTool(server: McpServer): void {
    server.registerTool(
        "pam_list_field_values",
        {
            title: "List distinct PAM field values",
            description: `Lists the distinct values a given PAM field currently has across the loaded dataset, with how many entries carry each value. Most common value first.

Use this to discover the exact spelling of a status/category/line value before filtering with \`pam_query_products\` - PAM status values can be unexpectedly specific (e.g. "Restricted available  (productive use allowed)", with a double space, is a real, distinct SAP PAM status string).

Args:
  - field (string, required): the PAM field to inspect, e.g. "status", "category", "line". See pam_list_fields for all valid field names.
  - limit (number, optional): maximum number of distinct values to return (default ${DEFAULT_FIELD_VALUES_LIMIT}, max ${MAX_FIELD_VALUES_LIMIT}).

Returns:
{
  "field": string,
  "total_distinct_values": number,      // total distinct values found, even if truncated by "limit"
  "values": [
    { "value": string, "count": number }  // most common first
  ]
}

Examples:
  - Use when: "What status values exist?" -> field="status"
  - Use when: "What product lines are there?" -> field="line"
  - Don't use when: you already know the exact value and just want the matching products (use pam_query_products instead).`,
            inputSchema: InputSchema,
            outputSchema: OutputSchema,
            annotations: {
                title: "List distinct PAM field values",
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        (params) => {
            const definition = FIELD_DEFINITION_BY_KEY.get(params.field);

            if (!definition) {
                return {
                    isError: true,
                    content: [{
                        type: "text" as const,
                        text: `Unknown field "${params.field}". Call pam_list_fields to see the valid field names.`
                    }]
                };
            }

            const entries = loadPamEntries();
            const allValues = collectFieldValueCounts(entries, params.field);
            const limitedValues = allValues.slice(0, params.limit);

            const output = {
                field: params.field,
                total_distinct_values: allValues.length,
                values: limitedValues
            };

            const lines = [
                `# Distinct values for "${definition.label}" (${params.field})`,
                "",
                `${allValues.length} distinct value(s) found` +
                (allValues.length > limitedValues.length ? `, showing top ${limitedValues.length}` : "") + ".",
                ""
            ];

            limitedValues.forEach(({ value, count }) => {
                lines.push(`- **${value}** — ${count} entr${count === 1 ? "y" : "ies"}`);
            });

            return {
                content: [{ type: "text" as const, text: lines.join("\n") }],
                structuredContent: output
            };
        }
    );
}
