import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { FIELD_DEFINITIONS } from "../fields.js";

const OutputSchema = {
    fields: z.array(z.object({
        key: z.string(),
        label: z.string(),
        matchMode: z.enum(["exact", "contains"]),
        description: z.string()
    }))
};

export function registerListFieldsTool(server: McpServer): void {
    server.registerTool(
        "pam_list_fields",
        {
            title: "List PAM fields",
            description: `Lists every field of a PAM entry that can be used to filter with \`pam_query_products\` or to look up distinct values with \`pam_list_field_values\`.

Call this first if you're unsure which field name to use (e.g. is the product family called "line" or "product"?) or how matching behaves for a field (exact value vs. substring).

Args: none.

Returns: a JSON array of field descriptors:
{
  "fields": [
    {
      "key": string,          // the field name to pass to other tools, e.g. "status"
      "label": string,        // human-readable SAP PAM column name
      "matchMode": "exact" | "contains",  // how a filter value is compared against this field
      "description": string   // what the field represents
    }
  ]
}`,
            inputSchema: {},
            outputSchema: OutputSchema,
            annotations: {
                title: "List PAM fields",
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        () => {
            const output = { fields: FIELD_DEFINITIONS };

            return {
                content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
                structuredContent: output
            };
        }
    );
}
