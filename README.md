# SAP Support Radar

[![Release](https://img.shields.io/github/v/release/tobiashofmann/sap-support-radar)](https://github.com/tobiashofmann/sap-support-radar/releases)
[![Deploy GitHub Pages](https://github.com/tobiashofmann/sap-support-radar/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/tobiashofmann/sap-support-radar/actions/workflows/deploy-pages.yml)
[![License](https://img.shields.io/github/license/tobiashofmann/sap-support-radar)](LICENSE)
[![Top language](https://img.shields.io/github/languages/top/tobiashofmann/sap-support-radar)](https://github.com/tobiashofmann/sap-support-radar)
[![App languages](https://img.shields.io/badge/app%20languages-en%20%7C%20de-blue)](webapp/i18n)

## 🚀 [**Try it out: open the app**](https://tobiashofmann.github.io/sap-support-radar/app/)

Check the support/maintenance status of the SAP products and versions you actually use against the
official **SAP Product Availability Matrix (PAM)** — no backend, nothing uploaded leaves your browser.

Built with [OpenUI5](https://openui5.org) and TypeScript. Full documentation, architecture, and
Architecture Decision Records live in the [docs site](docs/) (built with VitePress — run `npm run
docs:dev` locally, or see the deployed site once published, per
[ADR 0011](docs/adr/0011-github-pages-deployment.md)).

## Why not just use SAP Solution Manager or SAP for Me?

SAP already offers this for your own products via SAP Solution Manager or [SAP for Me](https://me.sap.com). The SAP Support Radar fills a narrower gap instead.

<details>
<summary>What's different here</summary>

- **A simple, user-friendly, global overview** — one filterable table, not Solution Manager's landscape
  management or SAP for Me's broader system/contract-centric UI.
- **Easy upkeep of products not tracked there** — custom-built components or anything missing from your
  Solution Manager/SAP for Me data, added manually in minutes
  (see [Manage my products](docs/workflow.md#2-manage-my-products-myproducts--build-your-own-landscape)).
- **The same data, queryable by an AI** — via the bundled [MCP server](docs/mcp-server.md), while reviewing
  an architecture document or a tech/functional spec that names concrete product versions.
- **No SAP system access or authorization required** — a static, client-only app (see
  [ADR 0001](docs/adr/0001-client-only-no-backend.md)), not a live SAP system connection.
- **Easy access for everyone who needs it** — end users, consultants, and developers alike.

See [docs/why.md](docs/why.md) for the full comparison, including what this deliberately doesn't try to
replace.

</details>

## What it does

- Load the full SAP PAM export (your own CSV, converted locally — see below) into the browser.
- Mark a subset of entries as **your own product landscape**.
- View a dedicated **"Support status of my products"** page, filtered to just those, with visual
  highlighting of approaching end-of-mainstream-maintenance/end-of-maintenance dates.
- Drill into any product's full lifecycle, from "restricted available" to "end of maintenance".
- Query the same data from an LLM client via the bundled [`pam-mcp-server`](pam-mcp-server/README.md) MCP
  server.

See [docs/index.md](docs/index.md) for the full project goal, and [docs/workflow.md](docs/workflow.md) for
a page-by-page tour with screenshots.

## From zero to a running app

Assumes a fresh checkout — no `webapp/model/PAM.json` yet, just a `pv` CSV export (SAP's PAM export
format) in the repository root. See [docs/index.md § Download the PAM export from
SAP](docs/index.md#1-download-the-pam-export-from-sap) for how to obtain that file from the SAP Support
Portal if you don't have one yet.

```sh
# 1. Install dependencies
npm install

# 2. Convert the CSV export into the JSON the app reads (pv -> webapp/model/PAM.json)
npm run pam:import

# 3. Static checks: eslint, ui5lint, and type-checking (app + scripts/)
npm run lint

# 4. Build the app -> dist/
npm run build

# 5. Unit tests for scripts/ (type-checks scripts/ again first)
npm run test:scripts

# 6. One-time: install the Playwright browser used by the e2e suite
npx playwright install --with-deps chromium

# 7. End-to-end tests + code coverage report (coverage/)
npm run test:e2e:coverage

# 8. Remaining reports: SBOM (sbom-report.html) and Allure (allure-report/)
npm run sbom:report
npm run test:e2e:allure:generate

# 9. Start the app
npm start                  # dev server with live reload, http://localhost:8080/index.html
# or, to serve the dist/ build from step 4 instead:
npm run start:dist
```

### Optional: regenerate the e2e visual-regression screenshots

Only needed after a change that affects what the app visibly renders (see [Build toolchain → Linux
baselines (for CI)](docs/build-toolchain.md#linux-baselines-for-ci) for why both platforms are needed):

```sh
npm run test:e2e:update-snapshots          # macOS/local-OS baselines (tests/e2e/*-darwin.png)
npm run test:e2e:update-snapshots:linux     # Linux baselines via Docker/Podman (tests/e2e/*-linux.png)
```

See [docs/build-toolchain.md](docs/build-toolchain.md) for what each of these commands actually does and
the full list of available scripts.

## Project layout

| Path | What |
| --- | --- |
| `webapp/` | The OpenUI5 app (TypeScript) |
| `pam-mcp-server/` | MCP server exposing the same PAM data as tools for LLM clients |
| `scripts/` | CSV→JSON import, Allure report, SBOM report tooling (TypeScript) |
| `tests/e2e/` | Playwright end-to-end test suite |
| `docs/` | VitePress documentation site — architecture, ADRs, build toolchain, MCP server |

## License

Apache License 2.0 — see [LICENSE](LICENSE).
