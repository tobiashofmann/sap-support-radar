import { devices } from "@playwright/test";
import { test, expect } from "./coverage-fixtures";
import {
    byId,
    gotoApp,
    thenStep,
    selectOption,
    selectLabel,
    clickSegmentedButtonItem,
    tableDataRows,
    rowCellTexts,
    pollFirstRowCells,
    pollFirstCell,
    extractEntryCount,
    activeHeading
} from "./helpers";

test.beforeEach(async ({ page }) => {
    await gotoApp(page);
});

test("1 - Homepage", async ({ page }) => {
    await test.step("Given the user navigates to index.html in the browser", async () => {
        await expect(page).toHaveURL(/index\.html/);
    });

    await thenStep(page, "Then the page title is the app's title", async () => {
        await expect(page).toHaveTitle("SAP Support Validation App");
    });
});

test("1.1 - Start app", async ({ page }) => {
    await test.step("Given the user starts the app", async () => {
        await expect(page.locator(byId("pamTable"))).toBeVisible();
    });

    await test.step("When the table of entries has loaded", async () => {
        await expect(tableDataRows(page, "pamTable").first()).toBeVisible();
    });

    await thenStep(page, "Then the table shows 1554 entries", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });
});

test("1.2 - Load table data", async ({ page }) => {
    await test.step("Given the table of entries has loaded", async () => {
        await expect(tableDataRows(page, "pamTable")).toHaveCount(50);
    });

    await test.step("When the user scrolls down", async () => {
        await tableDataRows(page, "pamTable").last().scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the table loads more entries", async () => {
        await expect
            .poll(async () => tableDataRows(page, "pamTable").count())
            .toBeGreaterThan(50);
    });
});

test("1.3 - Search", async ({ page }) => {
    await test.step("Given the table shows 1554 entries", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });

    await test.step('When the user searches for "Nanemo" in the table search field', async () => {
        await page.locator(`${byId("globalSearch")} input`).fill("Nanemo");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then 24 entries are shown", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(24);
    });

    await test.step('And the first entry is product version "DU DA FEDURU 1210"', async () => {
        await pollFirstCell(page, "pamTable").toBe("DU DA FEDURU 1210");
    });

    await test.step("When the user clears the search field", async () => {
        await page.locator(`${byId("globalSearch")} input`).fill("");
        await page.locator(`${byId("globalSearch")} input`).press("Enter");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the table shows 1554 entries again", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });
});

test("1.4 - Sort table rows", async ({ page }) => {
    await test.step("Given the table has loaded", async () => {
        await expect(tableDataRows(page, "pamTable").first()).toBeVisible();
    });

    await test.step("When the user sorts the table and selects \"Current Status\"", async () => {
        await selectOption(page, "sortField", "Current Status");
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then the first entries shown have current status "In customer-specific maintenance"', async () => {
        await pollFirstRowCells(page, "pamTable").toContain("In customer-specific maintenance");
    });

    await test.step('And the first entry is "RA NOGODU 7.4"', async () => {
        await pollFirstCell(page, "pamTable").toBe("RA NOGODU 7.4");
    });
});

test("1.5 - Sort table rows ascending", async ({ page }) => {
    await test.step("Given the table has loaded", async () => {
        await expect(tableDataRows(page, "pamTable").first()).toBeVisible();
    });

    await test.step('When the user sorts the table, selects "Current Status" and clicks "Descending"', async () => {
        await selectOption(page, "sortField", "Current Status");
        await page.locator(byId("sortAscending")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then the first entries shown have current status "Unrestricted available"', async () => {
        await pollFirstRowCells(page, "pamTable").toContain("Unrestricted available");
    });

    await test.step('And the first entry is "RA To/4CI 2025"', async () => {
        await pollFirstCell(page, "pamTable").toBe("RA To/4CI 2025");
    });
});

test("1.6 - Sort table, reset", async ({ page }) => {
    await test.step("Given the table has loaded", async () => {
        await expect(tableDataRows(page, "pamTable").first()).toBeVisible();
    });

    await test.step('When the user sorts the table and selects "Official Name"', async () => {
        await selectOption(page, "sortField", "Official Name");
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then the first entry in the table is "RA RE SODICU 2027"', async () => {
        await pollFirstCell(page, "pamTable").toBe("RA RE SODICU 2027");
    });

    await test.step("When the user clicks the reset icon in the sort dialog", async () => {
        await page.locator(`${byId("pamTable")} [title="Reset"]`).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then the first entry in the table is "BA CO ROVEFI DIME MI 1.0"', async () => {
        await pollFirstCell(page, "pamTable").toBe("BA CO ROVEFI DIME MI 1.0");
    });
});

test("1.7 - Add column", async ({ page }) => {
    const visibleColumnHeaders = page.locator(
        `${byId("pamTable")} [role="columnheader"]:not(.sapMListTblNavCol)`
    );

    await test.step("Given the table has 9 columns", async () => {
        await expect(visibleColumnHeaders).toHaveCount(9);
    });

    await test.step("When the user clicks the column settings button", async () => {
        await page.locator(`${byId("pamTable")} [title="Show or hide columns"]`).click();
        await page.waitForTimeout(300);
    });

    await test.step('And selects "URL to SAP Support portal"', async () => {
        await page.locator(".sapMPopover:visible .sapMCb", { hasText: "SAP Support Portal URL" })
            .click();
    });

    await test.step("And closes the dialog", async () => {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then a new column "SAP Support portal" is shown', async () => {
        await expect(
            page.locator(`${byId("pamTable")} [role="columnheader"]`, { hasText: "SAP Support Portal URL" })
        ).toBeVisible();
    });

    await test.step("And the table has 10 columns", async () => {
        await expect(visibleColumnHeaders).toHaveCount(10);
    });
});

test("1.8 - Show additional filters", async ({ page }) => {
    await test.step("Given the filter bar shows 4 filters", async () => {
        await expect(page.locator(byId("filterProductVersion"))).toHaveCount(0);
    });

    await test.step('When the user clicks "More filters"', async () => {
        await page.locator("button", { hasText: "More filters" }).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then 9 filters are shown", async () => {
        await expect(page.locator(byId("filterProductVersion"))).toBeVisible();
        await expect(page.locator(byId("filterProduct"))).toBeVisible();
        await expect(page.locator(byId("filterProductLine"))).toBeVisible();
        await expect(page.locator(byId("filterUnrestrictedAvailable"))).toBeVisible();
        await expect(page.locator(byId("filterRestrictedAvailableNotAllowed"))).toBeVisible();
    });
});

test("1.9 - Hide additional filters", async ({ page }) => {
    await test.step("Given the filter bar shows 4 filters", async () => {
        await expect(page.locator(byId("filterProductVersion"))).toHaveCount(0);
    });

    await test.step('When the user clicks "More filters"', async () => {
        await page.locator("button", { hasText: "More filters" }).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then 9 filters are shown", async () => {
        await expect(page.locator(byId("filterProductVersion"))).toBeVisible();
    });

    await test.step('When the user clicks "Fewer filters"', async () => {
        await page.locator("button", { hasText: "Fewer filters" }).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then 4 filters are shown", async () => {
        await expect(page.locator(byId("filterProductVersion"))).toHaveCount(0);
    });
});

/*
 * These two tests assert on live counts that depend on today's date (see
 * testcases.md's general instructions). The values below were verified live
 * against the bundled (mock) PAM.json on 2026-10-11 and may need
 * re-verification if this suite starts failing.
 */
test("1.10 - Filter by maintenance end date", async ({ page }) => {
    await test.step("Given the table shows 1554 entries", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });

    await test.step('When the user selects "In 3 Months" from the "Mainstream Maintenance" filter', async () => {
        await selectOption(page, "filterMainstreamMaintenanceRelative", "In 3 months");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the table shows 143 entries", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(143);
    });

    await test.step('And the first entry is "BI KI NA 6.0.0"', async () => {
        await pollFirstCell(page, "pamTable").toBe("BI KI NA 6.0.0");
    });
});

test("1.11 - Filter and mark support end date", async ({ page }) => {
    await test.step("Given the table shows 1554 entries", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });

    await test.step('When the user selects "In 6 Months" from the "Mainstream Maintenance" filter', async () => {
        await selectOption(page, "filterMainstreamMaintenanceRelative", "In 6 months");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the table shows 154 entries", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(154);
    });

    await test.step('And the first entry is "BI KI NA 6.0.0"', async () => {
        await pollFirstCell(page, "pamTable").toBe("BI KI NA 6.0.0");
    });

    await test.step('When the user selects "3 months" from "Mark entries"', async () => {
        await clickSegmentedButtonItem(page, "segSupportEndHighlight", "3 months");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the first 10 entries are marked in red", async () => {
        const rows = tableDataRows(page, "pamTable");

        for (let i = 0; i < 10; i++) {
            await expect(rows.nth(i).locator(".sapMLIBHighlight")).toHaveClass(/sapMLIBHighlightError/);
        }
    });

    await test.step('And entry "PUCO GE 1.0" is not marked red', async () => {
        const rows = tableDataRows(page, "pamTable");
        const texts = await rows.allInnerTexts();
        const index = texts.findIndex((text) => text.includes("PUCO GE 1.0"));

        expect(index).toBeGreaterThanOrEqual(0);
        await expect(rows.nth(index).locator(".sapMLIBHighlight")).toHaveCount(0);
    });
});

test("1.12 - Full reset", async ({ page }) => {
    await test.step("Given the user has entered a search term, set at least one filter and changed the sort order", async () => {
        await page.locator(`${byId("globalSearch")} input`).fill("Nanemo");
        await selectOption(page, "filterCurrentStatus", "Unrestricted available");
        await selectOption(page, "sortField", "Official Name");
        await page.locator(byId("sortAscending")).click();
        await page.waitForTimeout(300);
    });

    await test.step('When the user clicks the "Reset" button in the toolbar', async () => {
        await page.locator(`${byId("pamTable")} [title="Reset"]`).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the search field is empty", async () => {
        await expect(page.locator(`${byId("globalSearch")} input`)).toHaveValue("");
    });

    await test.step("And all filters are reset", async () => {
        await expect(page.locator(selectLabel("filterCurrentStatus"))).toHaveText("All");
    });

    await test.step("And the sort order is back to the default (version, ascending)", async () => {
        await expect(page.locator(selectLabel("sortField"))).toHaveText("Product Version");
        await expect(page.locator(byId("sortAscending"))).toHaveText("Ascending");
    });
});

test("1.13 - Chart analysis dialog", async ({ page }) => {
    await test.step("Given the table has loaded", async () => {
        await expect(tableDataRows(page, "pamTable").first()).toBeVisible();
    });

    await test.step('When the user clicks the "Chart analysis" button', async () => {
        await page.locator('[title^="Show chart analysis"]:visible').click();
        await expect(page.locator(".sapMDialog:visible")).toBeVisible();
        // Let the dialog's open animation (and the resulting body-scrollbar
        // reflow) fully settle before any screenshot is taken of it -
        // otherwise two screenshots taken mid-animation/mid-reflow can show
        // the whole page shifted by a few pixels relative to each other.
        await page.waitForTimeout(600);
    });

    await thenStep(page, "Then a dialog opens showing a bar chart of the currently filtered entries by status", async () => {
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
        await expect(tableDataRows(page, "pamTable")).toHaveCount(50);
    });
});

test('1.14 - Filter by product line and "Reset filters"', async ({ page }) => {
    await test.step("Given the table shows 1554 entries", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });

    await test.step('When the user clicks "More filters"', async () => {
        await page.locator("button:visible", { hasText: "More filters" }).click();
        await page.waitForTimeout(300);
    });

    await test.step('And filters by product line "To/4CI"', async () => {
        await page.locator(`${byId("filterProductLine")} input`).fill("To/4CI");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then only matching entries are shown", async () => {
        const heading = await activeHeading(page).textContent();
        const count = extractEntryCount(heading ?? "");
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThan(1554);

        const rows = tableDataRows(page, "pamTable");
        const visibleCount = await rows.count();

        for (let i = 0; i < visibleCount; i++) {
            const text = await rows.nth(i).innerText();
            expect(text).toContain("To/4CI");
        }
    });

    await test.step('When the user clicks "Reset filters"', async () => {
        await page.locator(`${byId("page")} button`, { hasText: "Reset filters" }).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the product line filter is cleared and the table shows 1554 entries again", async () => {
        await expect(page.locator(`${byId("filterProductLine")} input`)).toHaveValue("");

        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });
});

test("1.15 - Sort by mainstream maintenance date", async ({ page }) => {
    await test.step("Given the table shows 1554 entries", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });

    await test.step('When the user sorts the table and selects "End of Mainstream Maintenance"', async () => {
        await selectOption(page, "sortField", "End of Mainstream Maintenance");
        await page.waitForTimeout(300);
    });

    let ascendingFirstEntry = "";

    await thenStep(page, "Then the table is sorted by mainstream maintenance date, ascending", async () => {
        const cells = await rowCellTexts(tableDataRows(page, "pamTable").first());
        ascendingFirstEntry = cells[0] ?? "";
        expect(ascendingFirstEntry).not.toBe("");
    });

    await test.step('When the user clicks "Descending"', async () => {
        await page.locator(byId("sortAscending")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the first entry changes to reflect the reversed sort order", async () => {
        const cells = await rowCellTexts(tableDataRows(page, "pamTable").first());
        expect(cells[0]).not.toBe(ascendingFirstEntry);
    });
});

// Component.ts#getContentDensityClass() is otherwise only ever exercised on
// the suite's default desktop viewport/project. Wrapped in their own
// describe blocks (each with one test) so test.use() only overrides the
// device for that one test, not every test in the file - see the German
// locale test in product-detail.spec.ts for the same pitfall.
test.describe("Tablet viewport", () => {
    // defaultBrowserType is a worker-level option and can't be set inside a
    // describe block, even though every "devices[...]" preset includes it.
    const { defaultBrowserType: _defaultBrowserType, ...tabletDevice } = devices["iPad (gen 7)"];
    test.use(tabletDevice);

    test("1.16 - Start app on tablet", async ({ page }) => {
        await test.step("Given the user starts the app on a tablet", async () => {
            await expect(page.locator(byId("pamTable"))).toBeVisible();
        });

        await thenStep(page, "Then the table of entries has loaded", async () => {
            await expect(tableDataRows(page, "pamTable").first()).toBeVisible();

            const heading = await activeHeading(page).textContent();
            expect(extractEntryCount(heading ?? "")).toBe(1554);
        });
    });
});

test.describe("Phone viewport", () => {
    const { defaultBrowserType: _defaultBrowserType, ...phoneDevice } = devices["iPhone 13"];
    test.use(phoneDevice);

    test("1.17 - Start app on phone", async ({ page }) => {
        await test.step("Given the user starts the app on a phone", async () => {
            await expect(page.locator(byId("pamTable"))).toBeVisible();
        });

        await thenStep(page, "Then the table of entries has loaded", async () => {
            await expect(tableDataRows(page, "pamTable").first()).toBeVisible();

            const heading = await activeHeading(page).textContent();
            expect(extractEntryCount(heading ?? "")).toBe(1554);
        });
    });
});
