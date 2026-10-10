# pam-mcp-server

An [MCP](https://modelcontextprotocol.io) server exposing the SAP Product Availability Matrix (PAM) data
from [`de.itsfullofstars.sap.pam`](../README.md) (`webapp/model/PAM.json`) as queryable tools, so an LLM
client can look up product/version support status without needing the PAM app's UI.

It is **read-only** and makes **no network calls** — it only reads the local `PAM.json` file.

## Tools

- **`pam_list_fields`** — lists every filterable PAM field (e.g. `version`, `product`, `line`, `status`,
  `eomm`, ...), its human-readable label, and whether it's matched exactly or by substring. Call this
  first if you're unsure which field name to use.
- **`pam_list_field_values`** — lists the distinct values a given field currently has, most common first
  (e.g. every status value that actually occurs, with counts). Useful to discover the exact spelling of a
  status/category/line value before filtering.
- **`pam_query_products`** — the main query tool. Accepts one optional filter per PAM field (a string or
  array of strings, OR'd within a field, AND'd across fields), plus `limit`/`offset` pagination and a
  `response_format` (`"markdown"` summary table or `"json"` full records).

How specific a filter is determines how many entries come back, by design:

| You filter by... | You get... |
| --- | --- |
| `version` (e.g. `"SAP S/4HANA 2025"`) | Typically a single matching entry. |
| `product` or `line` (e.g. `"SAP S/4HANA"`) | Every entry belonging to that product/line. |
| `status` (e.g. `"Unrestricted available"`) | Every product currently in that status. |
| Any other status/date field (`ra_puna`, `ra_pua`, `ua`, `hanaStatus`, `hanaDate`, `eomm`, `eom`, `eop1`, `eosk`, `addOn`) | Every entry with that exact value. |

## Setup

```sh
npm install
npm run build
```

## Running

```sh
npm start                 # runs dist/index.js over stdio
npm run dev                 # tsx watch mode, runs src/index.ts directly
npm run inspector            # opens the MCP Inspector against the built server
```

By default, the server reads `../webapp/model/PAM.json` (relative to this package, i.e. the main app's
bundled PAM data). Point it at a different file — e.g. a freshly re-imported or uploaded export — via the
`PAM_JSON_PATH` environment variable:

```sh
PAM_JSON_PATH=/path/to/other/PAM.json npm start
```

See [`../docs/architecture.md`](../docs/architecture.md#data-model--pam-json) for the full PAM.json field
mapping, and [`../docs/index.md`](../docs/index.md#regenerating-the-pam-data) for how `PAM.json` itself is
generated from an SAP PAM CSV export.

## Using with Claude Code / another MCP client

Add it as a local stdio server, e.g. via the Claude Code CLI:

```sh
claude mcp add pam -- node /absolute/path/to/pam-mcp-server/dist/index.js
```

or in an MCP client's JSON config:

```json
{
  "mcpServers": {
    "pam": {
      "command": "node",
      "args": ["/absolute/path/to/pam-mcp-server/dist/index.js"]
    }
  }
}
```

## Project structure

```
pam-mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        # entry point: creates the McpServer, registers tools, connects stdio transport
│   ├── data.ts          # loads/caches PAM.json
│   ├── fields.ts         # field metadata (names, labels, match mode) shared by all tools
│   ├── filtering.ts       # filter matching + distinct-value counting logic
│   ├── format.ts          # markdown table rendering + response truncation
│   ├── constants.ts        # CHARACTER_LIMIT, pagination defaults
│   └── tools/
│       ├── listFields.ts
│       ├── listFieldValues.ts
│       └── queryProducts.ts
└── dist/                 # built output (entry point: dist/index.js)
```
