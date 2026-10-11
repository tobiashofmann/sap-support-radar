import { test, expect, Page } from "./coverage-fixtures";
import {
    byId,
    gotoApp,
    thenStep,
    navigateTo,
    clickSegmentedButtonItem,
    tableDataRows,
    extractMyProductsCounts,
    activeHeading
} from "./helpers";

/** Selects one PAM product on the MyProducts table by searching for its exact version. */
async function selectProductByVersion(page: Page, version: string): Promise<void> {
    await page.locator(`${byId("myProductsSearch")} input`).fill(version);
    await page.waitForTimeout(300);
    await tableDataRows(page, "myProductsTable").first().click();
    await page.waitForTimeout(150);
    await page.locator(`${byId("myProductsSearch")} input`).fill("");
    await page.waitForTimeout(300);
}

async function myProductsTitle(page: Page): Promise<string> {
    return (await activeHeading(page).textContent()) ?? "";
}

test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await navigateTo(page, "Manage my products");
    await page.waitForTimeout(300);
});

test("3 - My products", async ({ page }) => {
    await test.step("Given the user navigates to the myproducts page", async () => {
        // handled by beforeEach
    });

    await thenStep(page, 'Then the table shows "PAM-Products (0/1554)"', async () => {
        const counts = extractMyProductsCounts(await myProductsTitle(page));
        expect(counts).toEqual({ own: 0, total: 1554 });
    });

    await test.step("When the user selects the 2nd entry in the table", async () => {
        await tableDataRows(page, "myProductsTable").nth(1).click();
        await page.waitForTimeout(150);
    });

    await test.step('And clicks "Add"', async () => {
        await page.locator(byId("addProductsButton")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then the table shows "PAM-Products (1/1554)"', async () => {
        const counts = extractMyProductsCounts(await myProductsTitle(page));
        expect(counts).toEqual({ own: 1, total: 1554 });
    });
});

test("3.1 - Add products", async ({ page }) => {
    await test.step(
        'When the user adds the products "RA NOGODU 7.5", "RA NOGODU 7.4", ' +
        '"RA To/4CI 2021", "RA To/4CI 2022", "RA To/4CI 2025"',
        async () => {
            for (const version of [
                "RA NOGODU 7.5",
                "RA NOGODU 7.4",
                "RA To/4CI 2021",
                "RA To/4CI 2022",
                "RA To/4CI 2025"
            ]) {
                await selectProductByVersion(page, version);
            }

            await page.locator(byId("addProductsButton")).click();
            await page.waitForTimeout(300);
        }
    );

    await thenStep(page, 'Then the table shows "PAM-Products (5/1554)"', async () => {
        const counts = extractMyProductsCounts(await myProductsTitle(page));
        expect(counts).toEqual({ own: 5, total: 1554 });
    });
});

test("3.2 - Add products and list them in the table", async ({ page }) => {
    await test.step(
        'When the user adds the products "RA NOGODU 7.5", "RA NOGODU 7.4", ' +
        '"RA To/4CI 2021", "RA To/4CI 2022", "RA To/4CI 2025"',
        async () => {
            for (const version of [
                "RA NOGODU 7.5",
                "RA NOGODU 7.4",
                "RA To/4CI 2021",
                "RA To/4CI 2022",
                "RA To/4CI 2025"
            ]) {
                await selectProductByVersion(page, version);
            }

            await page.locator(byId("addProductsButton")).click();
            await page.waitForTimeout(300);
        }
    );

    await thenStep(page, 'Then the table shows "PAM-Products (5/1554)"', async () => {
        const counts = extractMyProductsCounts(await myProductsTitle(page));
        expect(counts).toEqual({ own: 5, total: 1554 });
    });

    await test.step('When the user clicks the "My products" filter in the table', async () => {
        await clickSegmentedButtonItem(page, "productScopeFilter", "My products");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the table shows 5 entries", async () => {
        await expect(tableDataRows(page, "myProductsTable")).toHaveCount(5);
    });
});

test("3.3 - Add and remove a product", async ({ page }) => {
    await test.step("Given the user navigates to the myproducts page", async () => {
        // handled by beforeEach
    });

    await thenStep(page, 'Then the table shows "PAM-Products (0/1554)"', async () => {
        const counts = extractMyProductsCounts(await myProductsTitle(page));
        expect(counts).toEqual({ own: 0, total: 1554 });
    });

    await test.step("When the user selects the 2nd entry in the table", async () => {
        await tableDataRows(page, "myProductsTable").nth(1).click();
        await page.waitForTimeout(150);
    });

    await test.step('And clicks "Add"', async () => {
        await page.locator(byId("addProductsButton")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then the table shows "PAM-Products (1/1554)"', async () => {
        const counts = extractMyProductsCounts(await myProductsTitle(page));
        expect(counts).toEqual({ own: 1, total: 1554 });
    });

    await test.step("When the user selects the 2nd entry again", async () => {
        await tableDataRows(page, "myProductsTable").nth(1).click();
        await page.waitForTimeout(150);
    });

    await test.step('And clicks "Add"', async () => {
        await page.locator(byId("addProductsButton")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the product is removed from the list of own products", async () => {
        // verified by the count assertion below
    });

    await test.step('And the table shows "PAM-Products (0/1554)"', async () => {
        const counts = extractMyProductsCounts(await myProductsTitle(page));
        expect(counts).toEqual({ own: 0, total: 1554 });
    });
});

test("3.4 - Navigate away without saving", async ({ page }) => {
    await test.step("Given the user navigates to the myproducts page", async () => {
        // handled by beforeEach
    });

    await test.step("When the user selects the 2nd entry in the table", async () => {
        await tableDataRows(page, "myProductsTable").nth(1).click();
        await page.waitForTimeout(150);
    });

    await test.step('And navigates to the supportstatus page without clicking "Add"', async () => {
        await navigateTo(page, "Support status of my products");
        await page.waitForTimeout(300);
    });

    await test.step("And navigates back to the myproducts page", async () => {
        await navigateTo(page, "Manage my products");
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then the table shows "PAM-Products (0/1554)"', async () => {
        const counts = extractMyProductsCounts(await myProductsTitle(page));
        expect(counts).toEqual({ own: 0, total: 1554 });
    });
});

test('3.5 - "My products" scope filter with no own products', async ({ page }) => {
    await test.step("Given the user has not selected any own products", async () => {
        const counts = extractMyProductsCounts(await myProductsTitle(page));
        expect(counts.own).toBe(0);
    });

    await test.step('When the user clicks the "My products" filter in the table', async () => {
        await clickSegmentedButtonItem(page, "productScopeFilter", "My products");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the table shows no entries", async () => {
        // tableDataRows() also matches the table's own "no data" placeholder
        // row (it carries the same sapMLIB class), so exclude it explicitly.
        await expect(
            page.locator(`${byId("myProductsTable")} tr.sapMLIB:not(.sapMListTblRowNoData)`)
        ).toHaveCount(0);
        await expect(page.locator(byId("myProductsTable"))).toContainText("No PAM products available");
    });
});
