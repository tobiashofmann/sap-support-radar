import { test as base, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import crypto from "crypto";
import path from "path";

/**
 * The dev server used by this suite (`npm run start-coverage`, see
 * ui5-coverage.yaml) instruments every app module with babel-plugin-istanbul,
 * which populates `window.__coverage__` in the page as code executes. This
 * auto-fixture reads that object out after each test and writes it to its own
 * raw coverage file under `.nyc_output/` - one file per test, so parallel
 * workers never overwrite each other's data. `nyc report` (run separately,
 * once the whole suite has finished) merges all of those files and produces
 * the HTML/lcov report.
 */
export const test = base.extend<{ collectCoverage: void }>({
    collectCoverage: [async ({ page }, use, testInfo) => {
        await use();

        const coverage = await page.evaluate(
            () => (window as unknown as { __coverage__?: unknown }).__coverage__
        );

        if (!coverage) {
            return;
        }

        const outputDir = path.join(process.cwd(), ".nyc_output");
        mkdirSync(outputDir, { recursive: true });

        const safeTitle = testInfo.titlePath.join(" ").replace(/[^a-z0-9]+/gi, "_");
        const fileName = `${safeTitle}-${crypto.randomUUID()}.json`;
        writeFileSync(path.join(outputDir, fileName), JSON.stringify(coverage));
    }, { auto: true }]
});

export { expect };
export type { Page } from "@playwright/test";
