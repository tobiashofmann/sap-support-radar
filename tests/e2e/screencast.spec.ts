import { test, expect, Page } from "./coverage-fixtures";
import {
    byId,
    gotoApp,
    navigateTo,
    tableDataRows,
    rowCellTexts,
    clickSegmentedButtonItem,
    activeHeading,
    extractMyProductsCounts
} from "./helpers";

/**
 * Records a product-walkthrough screencast (see tests/screencast.md for the
 * narrated steps this implements) - it is deliberately kept out of the
 * regular suite:
 *
 * - It searches for real SAP product names (e.g. "SAP S/4HANA 2025"), which
 *   don't exist in this repo's fictional `pv`/PAM.json (see CLAUDE.md
 *   "Mock PAM data") - it only works against a real PAM export placed
 *   locally and manually at webapp/model/PAM.json (gitignored, never
 *   committed - see tests/screencast.md for how to set that up).
 * - Every normal way of starting the dev server (`npm start`,
 *   `npm run start-coverage`, ...) runs `npm run pam:import` first, which
 *   would immediately overwrite that real data with the fictional `pv` -
 *   see tests/screencast.md for how to start the server without doing that.
 *
 * Guarded behind SCREENCAST=1 so a plain `npm run test:e2e`/`npm test`
 * never picks this spec up against the regular fictional PAM.json.
 */
test.use({ video: "on" });

/** Clicks the table row whose first (version) cell matches exactly - unlike `.first()`, this tolerates more than one search match. */
async function clickRowByVersion(page: Page, tableId: string, version: string): Promise<void> {
    const rows = tableDataRows(page, tableId);
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
        const cells = await rowCellTexts(rows.nth(i));

        if (cells[0] === version) {
            await rows.nth(i).click();
            return;
        }
    }

    throw new Error(`Row with version "${version}" not found in table "${tableId}"`);
}

test("Screencast - from search to support status", async ({ page }) => {
    test.skip(process.env.SCREENCAST !== "1", "Only runs on demand (SCREENCAST=1) - see tests/screencast.md");
    test.slow();

    await test.step("Given the app starts", async () => {
        await gotoApp(page);
        await page.waitForTimeout(1000);
    });

    await test.step('When the user searches for "S/4HANA 2025"', async () => {
        await page.locator(`${byId("globalSearch")} input`).fill("S/4HANA 2025");
        await page.waitForTimeout(1000);
    });

    await test.step('And opens the "SAP S/4HANA 2025" entry', async () => {
        await clickRowByVersion(page, "pamTable", "SAP S/4HANA 2025");
        await page.waitForTimeout(1000);
    });

    const ownProductButton = () => page.locator(`${byId("productDetailPage")} button`, { hasText: /my products/i });

    await test.step('And adds it to "My products"', async () => {
        await expect(ownProductButton()).toHaveText("Add to my products");
        await ownProductButton().click();
        await page.waitForTimeout(1000);
    });

    await test.step('When the user navigates to "Manage my products"', async () => {
        await navigateTo(page, "Manage my products");
        await page.waitForTimeout(1000);
    });

    await test.step('And searches for "EHP8"', async () => {
        await page.locator(`${byId("myProductsSearch")} input`).fill("EHP8");
        await page.waitForTimeout(1000);
    });

    await test.step('And selects the "EHP8 FOR SAP ERP 6.0" entry', async () => {
        await clickRowByVersion(page, "myProductsTable", "EHP8 FOR SAP ERP 6.0");
        await page.waitForTimeout(1000);
    });

    await test.step("And clears the search field", async () => {
        await page.locator(`${byId("myProductsSearch")} input`).fill("");
        await page.waitForTimeout(500);
    });

    await test.step('And searches for "BI"', async () => {
        await page.locator(`${byId("myProductsSearch")} input`).fill("BI");
        await page.waitForTimeout(1000);
    });

    await test.step('And selects the "SBOP BI PLATFORM 4.3" entry', async () => {
        await clickRowByVersion(page, "myProductsTable", "SBOP BI PLATFORM 4.3");
        await page.waitForTimeout(1000);
    });

    await test.step("And clears the search field", async () => {
        await page.locator(`${byId("myProductsSearch")} input`).fill("");
        await page.waitForTimeout(500);
    });

    await test.step('And saves by clicking "Add"', async () => {
        await page.locator(byId("addProductsButton")).click();
        await page.waitForTimeout(1000);
    });

    await test.step('Then the "My products" filter shows the 3 selected products in the table', async () => {
        const counts = extractMyProductsCounts((await activeHeading(page).textContent()) ?? "");
        expect(counts.own).toBe(3);

        await clickSegmentedButtonItem(page, "productScopeFilter", "My products");
        await page.waitForTimeout(1000);
        await expect(tableDataRows(page, "myProductsTable")).toHaveCount(3);
        await page.waitForTimeout(1000);
    });

    await test.step('When the user navigates to "Support status of my products"', async () => {
        await navigateTo(page, "Support status of my products");
        await page.waitForTimeout(1000);
    });

    await test.step('And highlights entries whose support ends within "3 months"', async () => {
        await clickSegmentedButtonItem(page, "supportStatusSegSupportEndHighlight", "3 months");
        await page.waitForTimeout(1500);
    });
});
