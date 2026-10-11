# Screencast walkthrough

A narrated product walkthrough, recorded as a short video for demos/documentation. Implemented as
`tests/e2e/screencast.spec.ts`.

**This is not part of the regular automated test suite** (it isn't listed in [testcases.md](testcases.md)
and `npm test`/`npm run test:e2e` never run it) — it searches for real SAP product names
(`SAP S/4HANA 2025`, `EHP8 FOR SAP ERP 6.0`, `SBOP BI PLATFORM 4.3`), which don't exist in this repo's
fictional mock data (see [CLAUDE.md](../CLAUDE.md) → "Mock PAM data"). It only works against a real PAM
export placed locally at `webapp/model/PAM.json`, see "Recording it" below.

## Steps

- Given the app starts, showing the full PAM table.
- When the user searches for "S/4HANA 2025" in the table search field.
- And opens the "SAP S/4HANA 2025" entry's product detail page.
- And adds it to "My products".
- When the user navigates to "Manage my products".
- And searches for "EHP8".
- And selects the "EHP8 FOR SAP ERP 6.0" entry.
- And clears the search field.
- And searches for "BI".
- And selects the "SBOP BI PLATFORM 4.3" entry.
- And clears the search field.
- And saves the selection by clicking "Add".
- Then the "My products" table filter shows the 3 selected products.
- When the user navigates to "Support status of my products".
- And highlights entries whose support ends within "3 months" (the "Mark entries" control, not a filter).

## Recording it

The spec depends on real PAM data that must never be committed or used by the regular suite, so it needs
a bit of manual setup instead of a plain `npm run test:e2e`:

1. Place a real PAM export (converted via `npm run pam:import <path-to-csv>`, or an existing real
   `webapp/model/PAM.json`) at `webapp/model/PAM.json`. It's gitignored, so this never risks being
   committed — but double-check `git status` shows it as untracked, not staged, before doing anything else
   in the repo.
2. Start the dev server **without** regenerating PAM.json — every `npm start`/`npm run start-coverage`
   script runs `npm run pam:import` first (see [CLAUDE.md](../CLAUDE.md) → Commands), which would
   immediately overwrite the real data with the fictional `pv` data. Bypass that by invoking UI5 Tooling
   directly instead:

   ```sh
   npx ui5 serve --port 8080 --config ui5-local.yaml -o index.html
   ```

3. In a second terminal, run just the screencast spec, with the `SCREENCAST=1` guard that unskips it
   (`playwright.config.ts`'s `webServer.reuseExistingServer` picks up the already-running server from step
   2 and won't invoke `pam:import` itself, since it's not already using port 8080):

   ```sh
   SCREENCAST=1 npx playwright test tests/e2e/screencast.spec.ts --project=chromium
   ```

4. The recorded video is written to `test-results/.../video.webm` (path printed by Playwright on
   completion, also linked from the HTML report — `npm run test:e2e:report`).

Afterwards, delete the local `webapp/model/PAM.json` (or re-run `npm run pam:import` to restore the
fictional one) before doing anything else in the repo, so the real data never lingers on disk longer than
needed for the recording.
