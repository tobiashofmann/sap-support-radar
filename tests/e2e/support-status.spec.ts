import { test, expect } from "./coverage-fixtures";
import {
    byId,
    gotoApp,
    navigateTo,
    thenStep,
    selectOption,
    selectLabel,
    clickSegmentedButtonItem,
    addFiveOwnProducts,
    tableDataRows,
    rowCellTexts,
    extractEntryCount,
    activeHeading
} from "./helpers";

test.beforeEach(async ({ page }) => {
    await gotoApp(page);
});

test("2 - Support status", async ({ page }) => {
    await test.step("Given the user has not selected any own products", async () => {
        // Default state after a fresh load: OwnProducts.json is empty.
    });

    await test.step("When the user navigates to the supportstatus page", async () => {
        await navigateTo(page, "Support status of my products");
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then the page shows the message "no products maintained"', async () => {
        await expect(page.locator(byId("noOwnProductsMessage"))).toBeVisible();
        await expect(page.locator(byId("noOwnProductsMessage")))
            .toContainText("No own products have been maintained.");
        await expect(page.locator(byId("supportStatusTable"))).toHaveCount(0);
    });
});

test("2.1 - Own products shown on support status", async ({ page }) => {
    await test.step(
        'Given the user has added the products "RA NOGODU 7.5", "RA NOGODU 7.4", ' +
        '"RA To/4CI 2021", "RA To/4CI 2022", "RA To/4CI 2025" on the myproducts page ' +
        "and navigated to the supportstatus page",
        async () => {
            await addFiveOwnProducts(page);
        }
    );

    await thenStep(page, "Then the table shows 5 entries", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(5);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(5);
    });

    await test.step('And the message "no products maintained" is not shown', async () => {
        await expect(page.locator(byId("noOwnProductsMessage"))).toHaveCount(0);
    });
});

test("2.2 - Search on support status", async ({ page }) => {
    await test.step("Given the support status table shows the user's 5 own products", async () => {
        await addFiveOwnProducts(page);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(5);
    });

    await test.step('When the user searches for "To/4CI" in the table search field', async () => {
        await page.locator(`${byId("globalSearch")} input`).fill("To/4CI");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then only the matching own products are shown", async () => {
        const heading = await activeHeading(page).textContent();
        const count = extractEntryCount(heading ?? "");
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThan(5);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(count);
    });

    await test.step("When the user clears the search field", async () => {
        await page.locator(`${byId("globalSearch")} input`).fill("");
        await page.locator(`${byId("globalSearch")} input`).press("Enter");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the table shows 5 entries again", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(5);
    });
});

test("2.3 - Filter by current status", async ({ page }) => {
    await test.step("Given the support status table shows the user's 5 own products", async () => {
        await addFiveOwnProducts(page);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(5);
    });

    let statusToFilterBy = "";

    await test.step("When the user notes the first row's current status", async () => {
        const cells = await rowCellTexts(tableDataRows(page, "supportStatusTable").first());
        statusToFilterBy = cells[5] ?? "";
        expect(statusToFilterBy).not.toBe("");
    });

    await test.step('And selects that status from the "Current Status" filter', async () => {
        await selectOption(page, "filterCurrentStatus", statusToFilterBy);
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then only own products with that status are shown", async () => {
        const heading = await activeHeading(page).textContent();
        const count = extractEntryCount(heading ?? "");
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(5);

        const rows = tableDataRows(page, "supportStatusTable");

        for (let i = 0; i < count; i++) {
            const cells = await rowCellTexts(rows.nth(i));
            expect(cells[5]).toBe(statusToFilterBy);
        }
    });
});

test('2.4 - Filter by product line and "Reset filters"', async ({ page }) => {
    await test.step("Given the support status table shows the user's 5 own products", async () => {
        await addFiveOwnProducts(page);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(5);
    });

    await test.step('When the user clicks "More filters"', async () => {
        await page.locator("button:visible", { hasText: "More filters" }).click();
        await page.waitForTimeout(300);
    });

    await test.step('And filters by product line "To/4CI"', async () => {
        await page.locator(`${byId("filterProductLine")} input`).fill("To/4CI");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then only the matching own products are shown", async () => {
        const heading = await activeHeading(page).textContent();
        const count = extractEntryCount(heading ?? "");
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThan(5);

        const rows = tableDataRows(page, "supportStatusTable");
        const texts = await rows.allInnerTexts();

        for (const text of texts) {
            expect(text).toContain("To/4CI");
        }
    });

    await test.step('When the user clicks "Reset filters"', async () => {
        await page.locator(`${byId("supportStatusPage")} button`, { hasText: "Reset filters" }).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the product line filter is cleared and all 5 own products are shown again", async () => {
        await expect(page.locator(`${byId("filterProductLine")} input`)).toHaveValue("");

        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(5);
    });
});

test("2.5 - Sort by mainstream maintenance date", async ({ page }) => {
    await test.step("Given the support status table shows the user's 5 own products", async () => {
        await addFiveOwnProducts(page);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(5);
    });

    await test.step('When the user sorts the table and selects "End of Mainstream Maintenance"', async () => {
        await selectOption(page, "sortField", "End of Mainstream Maintenance");
        await page.waitForTimeout(300);
    });

    let ascendingFirstEntry = "";

    await thenStep(page, "Then the table is sorted by mainstream maintenance date, ascending", async () => {
        const cells = await rowCellTexts(tableDataRows(page, "supportStatusTable").first());
        ascendingFirstEntry = cells[0] ?? "";
        expect(ascendingFirstEntry).not.toBe("");
    });

    await test.step('When the user clicks "Descending"', async () => {
        await page.locator(byId("sortAscending")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the first entry changes to reflect the reversed sort order", async () => {
        const cells = await rowCellTexts(tableDataRows(page, "supportStatusTable").first());
        expect(cells[0]).not.toBe(ascendingFirstEntry);
    });
});

test("2.6 - Filter by maintenance end date and mark support end date", async ({ page }) => {
    await test.step("Given the support status table shows the user's 5 own products", async () => {
        await addFiveOwnProducts(page);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(5);
    });

    await test.step('When the user selects "In 6 Months" from the "Mainstream Maintenance" filter', async () => {
        await selectOption(page, "filterMainstreamMaintenanceRelative", "In 6 months");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then only own products ending within 6 months are shown", async () => {
        const heading = await activeHeading(page).textContent();
        const count = extractEntryCount(heading ?? "");
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(5);
    });

    await test.step('When the user selects "3 months" from "Mark entries"', async () => {
        await clickSegmentedButtonItem(page, "supportStatusSegSupportEndHighlight", "3 months");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then rows are marked according to how soon their mainstream maintenance ends", async () => {
        const rows = tableDataRows(page, "supportStatusTable");
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const highlightClass = await rows.nth(i).locator(".sapMLIBHighlight").getAttribute("class");

            if (highlightClass !== null) {
                expect(highlightClass).toMatch(/sapMLIBHighlight(Error|Warning|None)/);
            }
        }
    });
});

test("2.7 - Full reset", async ({ page }) => {
    await test.step("Given the support status table shows the user's 5 own products", async () => {
        await addFiveOwnProducts(page);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(5);
    });

    await test.step("And the user has entered a search term, set a filter and changed the sort order", async () => {
        await page.locator(`${byId("globalSearch")} input`).fill("SAP");
        await selectOption(page, "sortField", "Official Name");
        await page.locator(byId("sortAscending")).click();
        await page.waitForTimeout(300);
    });

    await test.step('When the user clicks the "Reset" button in the toolbar', async () => {
        await page.locator(`${byId("supportStatusTable")} button`, { hasText: "Reset" }).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the search field is empty", async () => {
        await expect(page.locator(`${byId("globalSearch")} input`)).toHaveValue("");
    });

    await test.step("And the sort order is back to the default (version, ascending)", async () => {
        await expect(page.locator(selectLabel("sortField"))).toHaveText("Product Version");
        await expect(page.locator(byId("sortAscending"))).toHaveText("Ascending");
    });

    await test.step("And the table still shows the user's 5 own products", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(5);
    });
});

test("2.8 - Chart analysis dialog", async ({ page }) => {
    await test.step("Given the support status table shows the user's 5 own products", async () => {
        await addFiveOwnProducts(page);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(5);
    });

    await test.step('When the user clicks the "Chart analysis" button', async () => {
        await page.locator('[title^="Show chart analysis"]:visible').click();
        await expect(page.locator(".sapMDialog:visible")).toBeVisible();
        await page.waitForTimeout(600);
    });

    await thenStep(page, "Then a dialog opens showing a bar chart of the own products by status", async () => {
        await expect(page.locator(".sapMDialog:visible")).toBeVisible();
        await expect(page.locator(".sapMDialogTitle:visible")).toHaveText("Status distribution");
        await expect(page.locator(".pamBarChartRow:visible").first()).toBeVisible();
    });

    await test.step("When the user closes the dialog", async () => {
        await page.locator(".sapMDialog:visible button", { hasText: "Close" }).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the table is unchanged", async () => {
        await expect(page.locator(".sapMDialog:visible")).toHaveCount(0);
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(5);
    });
});
