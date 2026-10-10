#!/usr/bin/env node
/**
 * MCP server for the SAP Product Availability Matrix (PAM) data used by
 * de.itsfullofstars.sap.pam (webapp/model/PAM.json).
 *
 * Exposes three read-only tools over that dataset:
 *  - pam_list_fields          - discover which fields exist and how they're matched
 *  - pam_list_field_values    - discover the distinct values of one field (e.g. valid statuses)
 *  - pam_query_products       - filter PAM entries by one or more fields
 *
 * There is no write access and no network calls - this server only reads a
 * local JSON file (see src/data.ts#resolvePamJsonPath).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerListFieldsTool } from "./tools/listFields.js";
import { registerListFieldValuesTool } from "./tools/listFieldValues.js";
import { registerQueryProductsTool } from "./tools/queryProducts.js";
import { loadPamEntries, resolvePamJsonPath } from "./data.js";

const server = new McpServer({
    name: "pam-mcp-server",
    version: "1.0.0"
});

registerListFieldsTool(server);
registerListFieldValuesTool(server);
registerQueryProductsTool(server);

async function main(): Promise<void> {
    // Fail fast with a clear message if the PAM data file is missing/invalid,
    // rather than only surfacing that on the first tool call.
    try {
        const entries = loadPamEntries();
        console.error(`pam-mcp-server: loaded ${entries.length} PAM entries from ${resolvePamJsonPath()}`);
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error: unknown) => {
    console.error("pam-mcp-server failed to start:", error);
    process.exit(1);
});
