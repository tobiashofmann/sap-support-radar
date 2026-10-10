import { chromium, FullConfig } from "@playwright/test";

/**
 * The dev server (ui5-tooling-transpile-middleware) transpiles each
 * TypeScript module on its *first* request and caches the result; later
 * requests for that module are fast. Playwright's workers all start in
 * parallel though, so on a cold server the first real test run can hit a
 * burst of concurrent "not yet transpiled" requests across every
 * controller/view the app uses - slow enough to make early page loads flaky
 * (stale paints, timed-out assertions) under full parallel load, even though
 * the exact same test passes reliably in isolation.
 *
 * Visiting every route once, sequentially, before the real test run starts
 * forces that compilation (and the resulting cache) to happen up front.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
    const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:8080";

    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(`${baseURL}/index.html`);
    await page.waitForSelector('[id$="--pamTable"]', { timeout: 30_000 });

    for (const hash of ["#/myproducts", "#/myproducts/add", "#/supportstatus", "#/productdetail/0", "#/"]) {
        await page.goto(`${baseURL}/index.html${hash}`);
        await page.waitForTimeout(300);
    }

    await browser.close();
}
