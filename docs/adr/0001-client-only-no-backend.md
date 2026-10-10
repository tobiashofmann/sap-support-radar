# 0001 – Client-only app, no backend

**Status:** Accepted

## Context

The app's purpose is to let a user compare SAP's publicly/internally available PAM data against their own
product landscape. Two ways to build this were possible: a traditional web app with a backend service
(OData/REST) persisting PAM data and user selections in a database, or a fully client-side app operating on
locally supplied data.

A backend would add deployment complexity (a service to host, a database to run and secure), raise data
governance questions (PAM exports and a customer's own product landscape can be considered sensitive, since
they reveal exactly which SAP systems and versions an organization runs), and require authentication/
multi-tenancy for anything beyond a single shared instance.

## Decision

Build the app as a **client-only OpenUI5 application**. All data (the SAP PAM export and the user's own
product selection) is loaded from local JSON — either the bundled sample files or user-uploaded files — and
held in `sap.ui.model.json.JSONModel` instances entirely in the browser. There is no OData service, no
database, and no server-side persistence. The `pam` and `ownProducts` models (declared in
`webapp/manifest.json`) are replaced wholesale via `setData()` on upload, and persisted back to disk only as
a `.json` download the user explicitly triggers (`MyProducts.onDownloadOwnProducts`).

## Consequences

- **Positive:** Nothing about a customer's product landscape ever leaves their browser unless they
  explicitly download and share the file. The app can be hosted as plain static files (see `npm run build`)
  on any static web server, with no backend to secure, patch, or scale.
- **Positive:** Drastically simpler deployment and local development — `npm start` serves the whole app
  with no auxiliary services.
- **Negative:** No persistence across sessions beyond the browser's own state — reloading the page resets
  both models to the bundled JSON files. Users must re-upload their data (or keep a local `OwnProducts.json`
  backup) each session, or rely on a build that bundles their own `PAM.json`/`OwnProducts.json`.
- **Negative:** No multi-user/shared state. Sharing a product landscape between colleagues means manually
  exchanging the downloaded `OwnProducts.json` file; there is no built-in collaboration feature.
- **Negative:** The full PAM dataset (over a thousand entries) is held in memory and filtered/sorted
  client-side on every interaction. This is a non-issue at the current data volume, but would need
  revisiting (e.g. virtualized tables, server-side filtering) if the dataset grew by an order of magnitude.
