# 0006 – User-supplied PAM data, never bundled or auto-fetched

**Status:** Accepted

## Context

The app's core dataset — the SAP Product Availability Matrix — is created and maintained by SAP and
published on the SAP Support Portal behind an SAP S-user login; it is not public, freely redistributable
content. Three ways of getting this data into the app were possible: (a) check a full, real PAM export into
the repository and ship it as the bundled default data, (b) build a fetcher that logs into or scrapes the
SAP Support Portal automatically, or (c) require each user to obtain their own export and convert it
locally.

This is a distinct decision from [ADR 0001](/adr/0001-client-only-no-backend) ("no backend") and
[ADR 0005](/adr/0005-json-models-no-odata) ("plain JSON data") — those are about *how* data is consumed at
runtime; this one is about *where the data is allowed to come from* in the first place.

## Decision

Never check a real, complete PAM export into the repository, and never fetch or scrape it automatically.
`webapp/model/PAM.json` is listed in `.gitignore` — the file the app actually loads at runtime is not part
of the committed source at all. Instead, each user downloads their own CSV export from the SAP PAM tool on
the SAP Support Portal (using their own S-user access) and converts it locally via
`npm run pam:import` / `scripts/import-pam-csv.js` — see
[Installation → Regenerating the PAM data](/#regenerating-the-pam-data) for the exact steps.

This is deliberately narrower than the optional `--ui5` merge (see
[Architecture → PAM.json field mapping](/architecture#pam-json-field-mapping)): OpenUI5's own version
overview data at `ui5.sap.com/versionoverview.json` is public, requires no login, and the import script *is*
allowed to fetch it automatically — only the SAP-proprietary PAM export itself is subject to this decision.

## Consequences

- **Positive:** Avoids redistributing SAP's own licensed/access-controlled PAM content — checking a full
  export into a shared or public repository could exceed the terms under which it was obtained via an
  S-user login.
- **Positive:** Each user's data reflects exactly the product landscape visibility their own SAP contract
  grants them, and is as fresh as their last export — not a bundled snapshot that silently goes stale
  between releases.
- **Positive:** The app imposes no assumption about which subset of PAM entries a given organization can
  even see.
- **Negative:** First-time setup requires a manual, out-of-band step — log into the SAP Support Portal,
  export CSV, run the import script — before the app has real data to show. There is no "just clone and
  run" path to a fully populated app.
- **Negative:** Keeping the data current is a manual, user-triggered action (re-running the import); nothing
  in the app reminds a user their data has gone stale.
