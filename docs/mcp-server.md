# MCP server

Alongside the UI5 app itself, the repository includes `pam-mcp-server/` — a small
[MCP](https://modelcontextprotocol.io) (Model Context Protocol) server that exposes the same PAM data
(`webapp/model/PAM.json`) as tools an LLM client (Claude Code, Claude Desktop, or any other MCP client) can
call directly, without going through the app's UI at all.

It's useful whenever you want an AI assistant to answer "what's the support status of X" questions against
your own PAM data — e.g. while reviewing an architecture document, a dependency list, or a support ticket
that mentions specific SAP product versions. See [ADR 0007](/adr/0007-mcp-server) for why this is a
separate server rather than a feature of the UI5 app itself.

## What it is

- **Read-only.** It only reads `webapp/model/PAM.json` from disk — no writes, no network calls.
- **Local, stdio-based — deliberately not a hosted service.** It runs as a local subprocess (`node
  pam-mcp-server/dist/index.js`) communicating over stdio. This isn't just a transport choice: real PAM
  data is SAP customer-licensed information (see [ADR 0006](/adr/0006-user-supplied-pam-data) and
  [CLAUDE.md](https://github.com/tobiashofmann/sap-support-radar/blob/main/CLAUDE.md) → "Mock PAM data"),
  so it can never be bundled with this app or served from anywhere public — each user must generate their
  own `PAM.json` locally (`npm run pam:import`, from their own SAP PAM CSV export) and run the MCP server
  against it on their own machine. There is no remote/hosted endpoint to point an MCP client at instead.
- **A thin, generic query layer over the same data the app uses.** It does not duplicate PAM.json — both
  the UI5 app's `pam` model and the MCP server read the identical file (see
  [Architecture → Data model & PAM.json](/architecture#data-model--pam-json)), so they are always in sync
  with whatever `npm run pam:import` last produced.

See `pam-mcp-server/README.md` in the repository for the full project layout; the summary below focuses on
*how to use it*.

## Tools

| Tool | Purpose |
| --- | --- |
| `pam_list_fields` | Lists every filterable PAM field (`version`, `product`, `line`, `status`, `eomm`, ...), its label, and whether it's matched exactly or by substring. Call this first if you're unsure which field name to use. |
| `pam_list_field_values` | Lists the distinct values a field actually has in the loaded data, most common first (e.g. every real status string, with counts) — useful to discover an exact spelling before filtering. |
| `pam_query_products` | The main query tool: filters PAM entries by one or more fields (AND across fields, OR across multiple values for the same field), with pagination and a markdown/JSON output format. |

How specific a filter is determines how many entries come back, by design — this directly implements the
same "if it's the version, only that version; if it's the line, all entries of that line; if it's a status,
every product with that status" behavior the app's own filters have:

| You filter by... | You get... |
| --- | --- |
| `version` (e.g. `"SAP S/4HANA 2025"`) | Typically a single matching entry. |
| `product` or `line` (e.g. `"SAP S/4HANA"`) | Every entry belonging to that product/line. |
| `status` (e.g. `"Unrestricted available"`) | Every product currently in that status. |
| Any other status/date field (`ra_puna`, `ra_pua`, `ua`, `hanaStatus`, `hanaDate`, `eomm`, `eom`, `eop1`, `eosk`, `addOn`) | Every entry with that exact value. |

## Setup

```sh
cd pam-mcp-server
npm install
npm run build
```

The repository's `.mcp.json` (at the repository root) already registers it as a project-level MCP server
for Claude Code:

```json
{
  "mcpServers": {
    "pam-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["pam-mcp-server/dist/index.js"]
    }
  }
}
```

Since `pam-mcp-server/dist/` is a build artifact (not checked into git), it must be built once (`npm run
build`, above) before the server can start — Claude Code loads `.mcp.json` when a session starts, so a
fresh checkout needs that build step before the tools show up (reload/restart the session afterwards if
it was already running). See `pam-mcp-server/README.md` for configuring it in other MCP clients, and for
pointing it at a different PAM.json via the `PAM_JSON_PATH` environment variable.

## Worked example

This is an actual exchange from a Claude Code session with `pam-mcp-server` connected, included verbatim to
show the full round trip: what the model asked the server, and what came back.

### Prompt

> lies die datei sad_sample.md. verwende den pam mcp sever um den supportstatus der darin erwähnten
> produkte herauszufinden.
> gib eine ganz kurze übersicht über den support status

(`SAD_sample.md`, at the repository root, is an unrelated sample Solution Architecture Document used as
test fixture content elsewhere in this repo — it's not about PAM or this app at all. That's precisely what
makes it a convenient real-world example here: it just happens to name concrete SAP product versions, the
way a real architecture document, dependency list, or support ticket might.)

### What the model did

Reading `SAD_sample.md` surfaces two concrete SAP product versions: the **Target Platform** (`SAP S/4HANA
2022 On-Premise`) and the backend technology stack's **SAP NetWeaver 7.5** (hosting Adobe Document Services
and the SAPUI5-based Fiori front end). The model called `pam_query_products` once per version, filtering by
the exact `version` field:

```
pam_query_products({ version: "SAP S/4HANA 2022" })
```

```json
{
  "total": 1,
  "count": 1,
  "offset": 0,
  "has_more": false,
  "entries": [
    {
      "version": "SAP S/4HANA 2022",
      "name": "SAP S/4HANA 2022",
      "product": "SAP S/4HANA",
      "line": "SAP S/4HANA",
      "category": "Enterprise Resource Planning",
      "addOn": "No",
      "status": "Unrestricted available",
      "ra_puna": "18.08.2022",
      "ra_pua": "12.10.2022",
      "ua": "12.10.2022",
      "hanaStatus": "Ready",
      "hanaDate": "",
      "eomm": "31.12.2027",
      "eom": "",
      "eop1": "",
      "eosk": "31.03.2030",
      "url": "https://userapps.support.sap.com/sap/support/pam?hash=pvnr%3D73554900100900005331"
    }
  ]
}
```

```
pam_query_products({ version: "SAP NETWEAVER 7.5" })
```

```json
{
  "total": 1,
  "count": 1,
  "offset": 0,
  "has_more": false,
  "entries": [
    {
      "version": "SAP NETWEAVER 7.5",
      "name": "SAP NetWeaver 7.5",
      "product": "SAP NETWEAVER",
      "line": "SAP NetWeaver",
      "category": "Technology Platform",
      "addOn": "No",
      "status": "Unrestricted available",
      "ra_puna": "",
      "ra_pua": "12.10.2015",
      "ua": "20.10.2015",
      "hanaStatus": "Ready",
      "hanaDate": "",
      "eomm": "31.12.2027",
      "eom": "31.12.2030",
      "eop1": "",
      "eosk": "",
      "url": "https://userapps.support.sap.com/sap/support/pam?hash=pvnr%3D73554900100900000414"
    }
  ]
}
```

### Final answer

> **Support-Status (via `pam-mcp-server`)**
>
> Die SAD referenziert **SAP S/4HANA 2022** (Zielplattform) und **SAP NetWeaver 7.5** (Basis von ADS/
> NetWeaver Java, SAP_UI).
>
> | Produkt | Status | Ende Mainstream Maintenance | Ende Extended Maintenance |
> |---|---|---|---|
> | **SAP S/4HANA 2022** | ✅ Unrestricted available | 31.12.2027 | – (Safekeeper-Service bis 31.03.2030) |
> | **SAP NetWeaver 7.5** | ✅ Unrestricted available | 31.12.2027 | 31.12.2030 |
>
> Beide aktuell unterstützt, Mainstream-Support endet in beiden Fällen Ende 2027.

What this demonstrates:

- The model used `version` (exact match) rather than `product`/`line`, since the document named specific
  product *versions*, not product families — exactly the "specificity drives result scope" design from
  [Tools](#tools) above.
- Both queries returned exactly one entry each (`total: 1`), letting the model read off `status`, `eomm`,
  and `eom` directly without any additional filtering or pagination.
- The raw JSON responses carry every PAM field (including ones the final answer didn't need, like `url` or
  `hanaStatus`); the model condensed that into just the fields the user's question actually called for — a
  markdown table of status and the two maintenance end dates.
- No PAM CSV re-import, no browser, no manual lookup on the SAP Support Portal was needed — the whole
  lookup happened through two tool calls against the locally generated `PAM.json`.
