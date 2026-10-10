import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite for the PAM app, driven against the istanbul-instrumented UI5
 * dev server (`npm run start-coverage`, see ui5-coverage.yaml) rather than
 * the plain `npm start`, so that `window.__coverage__` is populated as the
 * app runs - tests/e2e/coverage-fixtures.ts dumps that object to its own
 * file under .nyc_output/ after every test. Run `npm run test:e2e:coverage`
 * to run the suite and merge those files into an lcov/HTML report via nyc.
 *
 * The app has no backend: every test starts from a fresh page load (bundled
 * PAM.json + empty OwnProducts.json) and navigates purely via the UI from
 * there, per tests/testcases.md's general test instructions.
 */
export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [
        ["allure-playwright", { resultsDir: "allure-results" }],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["list"],
        // JUnit XML - generic CI integration (e.g. GitLab/Jenkins "Tests" tabs).
        ["junit", { outputFile: "test-results/junit.xml" }],
        /*
         * SonarQube does not natively ingest JUnit XML for JS/TS projects -
         * it needs its own "Generic Test Execution" format instead, fed via
         * sonar.testExecutionReportPaths in the sonar-scanner config. This
         * writes that format directly.
         */
        ["@bdellegrazie/playwright-sonar-reporter", { outputFile: "test-results/sonar-report.xml" }]
    ],

    // Visits every route once, sequentially, before the parallel test run
    // starts - see tests/e2e/global-setup.ts for why.
    globalSetup: "./tests/e2e/global-setup.ts",

    /*
     * Tolerance for the visual-regression screenshots taken after every
     * "Then" step (see tests/e2e/helpers.ts#thenStep). Confirmed by
     * investigation (not a guess): separate Chromium process launches on
     * this machine render the exact same DOM/data with a sub-pixel
     * text-layout difference that compounds down a tall table (each
     * multi-line cell, e.g. "In customer-specific maintenance", can be ~1px
     * taller/shorter per row) - not a timing race, since it reproduces
     * identically fully serial (workers=1) with verified-deterministic row
     * data/order on both sides. `threshold` (per-pixel RGB tolerance) absorbs
     * the anti-aliased-edge cause directly; `maxDiffPixelRatio` is the
     * remaining backstop for whatever that doesn't catch. Both are still far
     * short of "ignore everything" - a genuinely broken layout (wrong
     * colors, missing sections, wrong content) still fails.
     */
    expect: {
        toHaveScreenshot: { threshold: 0.3, maxDiffPixelRatio: 0.08 }
    },

    use: {
        baseURL: "http://localhost:8080",
        viewport: { width: 1600, height: 1000 },
        locale: "en-US",
        screenshot: "on",
        trace: "retain-on-failure"
    },

    webServer: {
        command: "npm run start-coverage",
        url: "http://localhost:8080/index.html",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        }
    ]
});
