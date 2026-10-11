import { test, expect } from "./coverage-fixtures";
import {
    byId,
    gotoApp,
    thenStep,
    navigateTo,
    tableDataRows,
    extractMyProductsCounts,
    activeHeading
} from "./helpers";

test.beforeEach(async ({ page }) => {
    await gotoApp(page);
});

test("6.1 - Show product detail", async ({ page }) => {
    await test.step("Given the user is on the Main table", async () => {
        await expect(tableDataRows(page, "pamTable").first()).toBeVisible();
    });

    await test.step("When the user clicks a row", async () => {
        await tableDataRows(page, "pamTable").first().click();
        await page.waitForTimeout(400);
    });

    await thenStep(page, "Then the product detail page opens, showing the product data and the lifecycle timeline", async () => {
        await expect(page).toHaveURL(/productdetail\/\d+/);
        await expect(page.locator(byId("productDetailPage"))).toBeVisible();
        await expect(page.locator(".pamDetailTitle:visible")).toBeVisible();
        await expect(page.locator(".pamTimelineList:visible")).toBeVisible();
    });
});

test("6.2 - Toggle own product from the product detail page", async ({ page }) => {
    await test.step("Given the user is on the Main table", async () => {
        await expect(tableDataRows(page, "pamTable").first()).toBeVisible();
    });

    await test.step("When the user clicks a row", async () => {
        await tableDataRows(page, "pamTable").first().click();
        await page.waitForTimeout(400);
    });

    const ownProductButton = () => page.locator(`${byId("productDetailPage")} button`, { hasText: /my products/i });

    await test.step('And clicks "Add own product"', async () => {
        await expect(ownProductButton()).toHaveText("Add to my products");
        await ownProductButton().click();
        await page.waitForTimeout(300);
    });

    await test.step("And navigates to the myproducts page", async () => {
        await navigateTo(page, "Manage my products");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the product is selected", async () => {
        const title = (await activeHeading(page).textContent()) ?? "";
        expect(extractMyProductsCounts(title).own).toBe(1);
    });

    await test.step("When the user navigates to the supportstatus page", async () => {
        await navigateTo(page, "Support status of my products");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the product is shown", async () => {
        await expect(tableDataRows(page, "supportStatusTable")).toHaveCount(1);
    });

    await test.step("When the user navigates back to the product detail page", async () => {
        await navigateTo(page, "Overview");
        await page.waitForTimeout(300);
        await tableDataRows(page, "pamTable").first().click();
        await page.waitForTimeout(400);
    });

    await test.step('And clicks "Remove own product"', async () => {
        await expect(ownProductButton()).toHaveText("Remove from my products");
        await ownProductButton().click();
        await page.waitForTimeout(300);
    });

    await test.step("And navigates to the myproducts page", async () => {
        await navigateTo(page, "Manage my products");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the product is no longer selected", async () => {
        const title = (await activeHeading(page).textContent()) ?? "";
        expect(extractMyProductsCounts(title).own).toBe(0);
    });
});

test("6.4 - Open support portal", async ({ page }) => {
    await test.step("Given the user is on the Main table", async () => {
        await expect(tableDataRows(page, "pamTable").first()).toBeVisible();
    });

    await test.step("When the user clicks a row", async () => {
        await tableDataRows(page, "pamTable").first().click();
        await page.waitForTimeout(400);
    });

    await thenStep(page, 'Then clicking "Open support portal" opens the entry\'s SAP Support Portal URL in a new tab', async () => {
        const [popup] = await Promise.all([
            page.waitForEvent("popup"),
            page.locator(`${byId("productDetailPage")} button`, { hasText: "Open support portal" }).click()
        ]);

        // The bundled (mock) PAM data uses a generic placeholder URL rather
        // than a real SAP Support Portal link, so just confirm a popup
        // actually opened and navigated somewhere.
        expect(popup.url()).toMatch(/^https:\/\//);
        await popup.close();
    });
});

/*
 * This test asserts on a specific product's support-end state, which
 * depends on today's date relative to its fixed eomm date (see
 * testcases.md's general test instructions, similar caveat as 1.10/1.11).
 * Verified live against the bundled (mock) PAM.json on 2026-10-11 and may
 * need re-verification if this suite starts failing.
 */
test("6.5 - Support status icon reflects approaching end of mainstream maintenance", async ({ page }) => {
    const searchFor = async (version: string): Promise<void> => {
        await page.locator(`${byId("globalSearch")} input`).fill(version);
        await page.waitForTimeout(300);
        await tableDataRows(page, "pamTable").first().click();
        await page.waitForTimeout(400);
    };

    await test.step('Given the user searches for "KI PO TEBADA 4.3" (mainstream maintenance ends within 6 months)', async () => {
        await searchFor("KI PO TEBADA 4.3");
    });

    await thenStep(page, "Then the support status is shown as critical (error)", async () => {
        await expect(page.locator(".pamSupportEndStatus.sapMObjStatusError:visible")).toBeVisible();
    });

    await test.step("When the user navigates back to the Main table", async () => {
        await navigateTo(page, "Overview");
        await page.waitForTimeout(300);
    });

    await test.step('And searches for "RA CENU FEFI TITU 2505" (mainstream maintenance ends within 12 months)', async () => {
        await searchFor("RA CENU FEFI TITU 2505");
    });

    await thenStep(page, "Then the support status is shown as a warning", async () => {
        await expect(page.locator(".pamSupportEndStatus.sapMObjStatusWarning:visible")).toBeVisible();
    });
});

// Wrapped in its own describe so test.use() only scopes the German locale
// to this one test - a bare top-level test.use() applies to every test in
// the file regardless of where it's declared, which would have switched
// 6.1/6.2 above off the project's default "en-US" locale too. The eomm/eom
// dates on the detail page are PAM's own dd.mm.yyyy strings, parsed via
// parseGermanDate() regardless of UI language, but that parsing path
// otherwise never runs under a non-English/German locale since every other
// test in this suite uses "en-US".
test.describe("German locale", () => {
    test.use({ locale: "de-DE" });

    test("6.3 - Show product detail with German locale", async ({ page }) => {
        await test.step("Given the user's browser locale is German (de-DE)", async () => {
            expect(await page.evaluate(() => navigator.language)).toBe("de-DE");
        });

        await test.step("And the user is on the Main table", async () => {
            await expect(tableDataRows(page, "pamTable").first()).toBeVisible();
        });

        await test.step("When the user clicks a row", async () => {
            await tableDataRows(page, "pamTable").first().click();
            await page.waitForTimeout(400);
        });

        await thenStep(page, "Then the product detail page opens, showing the product data and the lifecycle timeline", async () => {
            await expect(page).toHaveURL(/productdetail\/\d+/);
            await expect(page.locator(byId("productDetailPage"))).toBeVisible();
            await expect(page.locator(".pamDetailTitle:visible")).toBeVisible();
            await expect(page.locator(".pamTimelineList:visible")).toBeVisible();
        });
    });
});
