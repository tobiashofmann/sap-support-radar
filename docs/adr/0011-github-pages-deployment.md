# 0011 – GitHub Pages hosts VitePress at the root, the app and quality reports under subpaths

**Status:** Accepted

## Context

The project is deployed to GitHub Pages via `.github/workflows/deploy-pages.yml`, triggered on every push
to `main`. GitHub Pages serves exactly one static site per repository (for a project page); everything that
should be reachable has to live under that one root. Three genuinely different artifacts compete for that
root:

1. **The app itself** — a build of the OpenUI5 app (`npm run build`), previously deployed directly to the
   Pages root with its CDN bootstrap page (`index-cdn.html`) as the entry point, since Pages can't run the
   UI5 Tooling dev-server proxy a local build normally relies on for framework resources.
2. **The VitePress documentation site** (this site) — architecture, workflow, ADRs, and now also this
   record.
3. **CI-generated quality reports** — Allure, Istanbul/nyc code coverage, the Playwright HTML report, and
   the SBOM report (see [Build toolchain](/build-toolchain)) — each its own independent static output with
   no built-in way to compose with the others or with VitePress.

## Decision

Lay out the deployed site as:

- **`/`** — the VitePress documentation site (this content), built via `npm run docs:build`.
- **`/app/`** — the OpenUI5 app build, with `index-cdn.html` copied to `index.html` as the entry point
  (unchanged from before, just relocated). It runs against the bundled sample `PAM.json`, since per
  [ADR 0006](/adr/0006-user-supplied-pam-data) real PAM data is never bundled or published.
- **`/reports/coverage/`, `/reports/allure/`, `/reports/playwright/`, `/reports/sbom.html`** — the CI
  quality reports, linked from [Reports](/reports).

The workflow builds each piece in its own job (`build-app`, `build-docs`, `test-and-reports`), uploads each
as a plain CI artifact, and a final `pages` job downloads all three into one `_site/` directory tree before
handing it to `actions/upload-pages-artifact` — there is no step where VitePress itself "contains" the
reports or the app; they are independent static outputs merged at deploy time, each linked to from VitePress
pages by plain absolute paths (e.g. `[Code coverage](/reports/coverage/)`).

Allure's trend graphs (History, Retries, Duration, Categories) need `allure-results/history/` seeded before
`allure generate` runs. Locally, `scripts/allure-generate.ts` carries that folder forward from the
*previous local report*; in a stateless CI runner there is no previous local report to carry forward from,
so the `test-and-reports` job instead fetches the four known history JSON files directly from the
**currently live** Pages site (`https://<owner>.github.io/<repo>/reports/allure/history/*.json`) before
generating — best-effort, since a first deployment (or a renamed repository) simply has none yet.

## Consequences

- **Positive:** Each artifact keeps its own simple, independent build step — VitePress doesn't need to know
  anything about Allure/coverage/SBOM report internals, and vice versa. Swapping out a report tool later
  only touches that one job.
- **Positive:** The [Build toolchain](/build-toolchain) documentation and the deployed reports describe the
  exact same tools, so the reports are a browsable, up-to-date complement to that page rather than a
  separate concern to keep in sync by hand.
- **Positive:** A broken `lint`/type-check (the `quality` job) or a broken app/docs build blocks the `pages`
  job via `needs:`, so a failing commit never silently overwrites a working deployment with a half-built
  site.
- **Negative:** The app's public URL changed from the Pages root to `/app/` — any previously shared link to
  the root as "the app" now points at the documentation instead. This was a deliberate, one-time breaking
  change (see the alternatives considered: app stays at root with docs under `/docs/`, or dropping the
  public app deployment entirely).
- **Negative:** Reports only reflect the most recently pushed `main` commit, not a specific PR or release —
  there's no per-PR preview of coverage/Allure results, only the one, continuously overwritten live site.
- **Negative:** The Allure history fetch is a best-effort `curl` against four fixed, undocumented-by-Allure
  filenames (`history-trend.json`, `duration-trend.json`, `retry-trend.json`, `categories-trend.json`) read
  from the *live* site rather than passed between CI runs through a proper artifact/cache mechanism — a
  future Allure version changing that file set would silently stop carrying history forward (trend graphs
  would simply restart from empty, not fail the build).
- **Negative:** Four parallel build jobs (`quality`, `build-app`, `build-docs`, `test-and-reports`) each run
  their own `npm ci`, increasing total CI compute compared to one sequential job — chosen for wall-clock
  speed (they run concurrently) over minimizing total compute time.
- **Negative:** `test-and-reports` runs on `ubuntu-latest`, but the visual-regression baselines under
  `tests/e2e/*.spec.ts-snapshots/` were originally only generated on macOS — Playwright keys each baseline's
  filename by OS platform (`-darwin.png` vs. `-linux.png`), so without a `-linux.png` baseline committed
  alongside, every `toHaveScreenshot()` assertion in this job fails in CI with "no baseline found," even
  though the exact same test passes locally. See
  [Build toolchain → Linux baselines (for CI)](/build-toolchain#linux-baselines-for-ci) for
  `npm run test:e2e:update-snapshots:linux`, which generates them locally via Docker/Podman.
