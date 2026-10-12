---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "SAP Support Radar"
  text: "Find out your support status"
  tagline: A solution that checks your own product versions against the SAP Product Availability Matrix.
  actions:
    - theme: brand
      text: 🚀 Try it out
      link: https://tobiashofmann.github.io/sap-support-radar/app/
      target: _blank
    - theme: alt
      text: Why Support Radar?
      link: /why
    - theme: alt
      text: Architecture
      link: /architecture
    - theme: alt
      text: App workflow & pages
      link: /workflow
    - theme: alt
      text: ADRs
      link: /adr/

features:
  - title: Your own product landscape
    details: Pick which SAP products/versions belong to your own landscape and see only their support status, filtered and sorted.
  - title: Import / export as JSON
    details: Upload a PAM export or your own product list as JSON, and download your selection again at any time.
  - title: No backend required
    details: All data (the SAP PAM and your own product selection) is loaded from local JSON in the browser.
---

::: tip 🚀 Try it now — no install required
This is the documentation site. The support radar app runs separately:

### [**Open SAP Support Radar →**](https://tobiashofmann.github.io/sap-support-radar/app/)

:::

## Screencast

<video src="/video.webm" controls style="width: 100%; max-width: 900px; border-radius: 8px;"></video>

A quick walkthrough: search for a product, add it to your own landscape, then check its support status
— see [tests/screencast.md](https://github.com/tobiashofmann/sap-support-radar/blob/main/tests/screencast.md)
for the exact steps.

## What is this?

SAP Support Radar is a solution that lets you check the support/maintenance status of the
SAP products and versions you actually use against the **SAP Product Availability Matrix (PAM)**.

### Project goal

SAP publishes PAM data as a large, generic table covering SAP products. Most customers only run a handful of those products, and keeping track of "when does our installed version actually lose support" by
hand, by searching the public PAM website is tedious and easy to get wrong. This app closes that gap by letting you:

1. Load the full PAM export (or an SAP UI5/OpenUI5-enriched version of it) into the browser.
2. Mark a subset of entries as **your own product landscape** — the versions you actually run.
3. View a dedicated, filtered **"Support status of my products"** page that only shows those products, with
   visual highlighting of approaching end-of-mainstream-maintenance/end-of-maintenance dates.
4. Drill into any product's detail page to see its full lifecycle, from "restricted available" to "end of maintenance".

See [Why Support Radar?](/why) for how this compares to SAP Solution Manager/SAP for Me, [Architecture](/architecture) for how this is implemented, and [App workflow & pages](/workflow) for a tour of the individual pages with screenshots.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) (a current LTS release) and npm.
- Access to a SAP PAM csv export of the support information.

### Setup

```sh
git clone <this-repository-url>
cd sap-support-radar
npm install
```

### From zero to a running app

Assumes a fresh checkout — no `webapp/model/PAM.json` yet, just a `pv` CSV export (SAP's PAM export
format) in the repository root. See [Download the PAM export from SAP](#1-download-the-pam-export-from-sap)
below for how to obtain that file if you don't have one yet.

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

# 8. Remaining reports: SBOM (sbom-report.dev.html / sbom-report.prod.html) and Allure (allure-report/)
npm run sbom:report
npm run test:e2e:allure:generate

# 9. Start the app
npm start                  # dev server with live reload, http://localhost:8080/index.html
# or, to serve the dist/ build from step 4 instead:
npm run start:dist
```

See [Build toolchain](/build-toolchain) for what each of these commands actually does, the full list of
available scripts, and where each report ends up (`coverage/index.html`, `allure-report/index.html`,
`playwright-report/index.html`, `sbom-report.dev.html`/`sbom-report.prod.html`).

Once running, use the **"Upload PAM.json"** / **"Upload my products"** buttons in the toolbar to load a
different export at any time without re-running `pam:import` — see [App workflow & pages](/workflow) for
details. `npm run build:opt` additionally produces an optimized, self-contained build (bundles UI5 itself)
for hosting on a static web server with no CDN dependency (SAP BTP HTML5 application, nginx, GitHub Pages,
...).

#### Optional: regenerate the e2e visual-regression screenshots

Only needed after a change that affects what the app visibly renders (see
[Build toolchain → Linux baselines (for CI)](/build-toolchain#linux-baselines-for-ci) for why both
platforms are needed):

```sh
npm run test:e2e:update-snapshots          # macOS/local-OS baselines (tests/e2e/*-darwin.png)
npm run test:e2e:update-snapshots:linux     # Linux baselines via Docker/Podman (tests/e2e/*-linux.png)
```

### Regenerating the PAM data

The `webapp/model/PAM.json` the app loads is **generated**, from a raw SAP PAM CSV export via `scripts/import-pam-csv.ts` — see [ADR 0006](/adr/0006-user-supplied-pam-data) for why this data is meant to always be supplied/regenerated by you rather than bundled or fetched automatically.

#### 1. Download the PAM export from SAP

1. Open the **SAP Product Availability Matrix** tool on the [SAP Support Portal](https://support.sap.com). This requires a valid SAP S-user with Support Portal access.
2. Search for and select the product(s)/product version(s) you want in the export.
3. Use the PAM tool's **export/download** action to download the result as a **CSV file**. SAP's PAM
   export uses a semicolon (`;`)-separated, double-quoted CSV with one header line — this is exactly the
   format `scripts/import-pam-csv.ts` expects, so no manual reformatting is needed.
4. Save the downloaded file into the repository root. By convention the script's default input filename
   is `pv` (no extension) — matching the filename SAP's export historically used — but any path can be
   passed explicitly as the first argument.

#### 2. Convert the CSV into PAM.json

```sh
npm run pam:import                              # pv -> webapp/model/PAM.json
npm run pam:import -- path/to/export.csv         # explicit input path
npm run pam:import -- path/to/export.csv out.json  # explicit input + output path
```

The script (`scripts/import-pam-csv.ts`) parses the CSV, maps each column header to the short JSON keys
listed under [Architecture → PAM.json field mapping](/architecture#pam-json-field-mapping), and writes the resulting array of
entries to `webapp/model/PAM.json`.

#### 3. Add OpenUI5 version support data (optional)

SAP's PAM export does not include OpenUI5 framework version data. The import script can merge that
in separately, fetched live from `https://ui5.sap.com/versionoverview.json` — the same JSON OpenUI5's own
"Version Overview" page is built from, listing every UI5 version with its release date, maintenance
status, and LTS/cloud-provisioning info:

```sh
npm run pam:import -- --ui5                       # fetch https://ui5.sap.com/versionoverview.json
npm run pam:import -- pv out.json --ui5            # combined with an explicit CSV/output path
npm run pam:import -- --ui5=./local-ui5-versions.json  # use a local file instead (offline/tests)
```

Each UI5 version becomes one additional PAM-shaped entry (`product: "SAP UI5"`), with its `version_label`
mapped to `name` and `release_date` mapped to `ra_puna`, and four UI5-only fields appended
(`lts`, `eocp`, `sapuiversion`, `frontendserver` — see
[Architecture → PAM.json field mapping](/architecture#pam-json-field-mapping) for details on each). These
show up in their own "UI5 Details" card on the [Product detail page](/workflow#5-product-detail) for any
entry with `product === "SAP UI5"`.

Re-run `npm run pam:import -- --ui5` periodically (e.g. whenever a new UI5 version ships) to refresh the
bundled UI5 entries — the live `versionoverview.json` is always current, so no manual UI5 data entry is
needed.
