import { test, expect } from "./coverage-fixtures";
import { byId, gotoApp, thenStep, navigateTo, selectOption, tableDataRows } from "./helpers";

test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await navigateTo(page, "Manage my products");
    await page.waitForTimeout(300);
});

test("4 - Create own product", async ({ page }) => {
    await test.step("Given the user navigates to the myproducts page", async () => {
        // handled by beforeEach
    });

    await test.step('When the user clicks "Create product"', async () => {
        await page.locator(byId("createProductButton")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the form is shown", async () => {
        await expect(page.locator(byId("myProductsAddPage"))).toBeVisible();
        await expect(page).toHaveURL(/myproducts\/add/);
    });

    await test.step('When the user clicks "Cancel"', async () => {
        await page.locator("button:visible", { hasText: "Cancel" }).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the myproducts page is shown", async () => {
        await expect(page.locator(byId("myProductsPage"))).toBeVisible();
        await expect(page).toHaveURL(/myproducts$/);
    });
});

test("4.1 - Add a new product", async ({ page }) => {
    await test.step('When the user clicks "Create product"', async () => {
        await page.locator(byId("createProductButton")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the form is shown", async () => {
        await expect(page.locator(byId("myProductsAddPage"))).toBeVisible();
    });

    await test.step("When the user fills in the required fields", async () => {
        await page.locator(`${byId("addProductVersion")} input`).fill("TEST PRODUCT 4.1");
        await page.locator(`${byId("addProductName")} input`).fill("Test Product 4.1");
        await page.locator(`${byId("addProductEomm")} input`).fill("31.12.2030");
    });

    await test.step('And clicks "Add"', async () => {
        await page.locator("button:visible", { hasText: "Save" }).click();
        await page.waitForTimeout(300);
    });

    await test.step("And navigates to the supportstatus page", async () => {
        await navigateTo(page, "Support status of my products");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the newly added product is shown", async () => {
        const rows = tableDataRows(page, "supportStatusTable");
        const texts = await rows.allInnerTexts();
        expect(texts.some((text) => text.includes("TEST PRODUCT 4.1"))).toBe(true);
    });
});

test("4.2 - Required fields missing", async ({ page }) => {
    await test.step('When the user clicks "Create product"', async () => {
        await page.locator(byId("createProductButton")).click();
        await page.waitForTimeout(300);
    });

    await test.step("And does not fill in the required fields", async () => {
        // intentionally left blank
    });

    await test.step('And clicks "Add"', async () => {
        await page.locator("button:visible", { hasText: "Save" }).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the product is not created", async () => {
        // Validation blocks the save: the form stays open on the add route.
        await expect(page).toHaveURL(/myproducts\/add/);
        await expect(page.locator(byId("myProductsAddPage"))).toBeVisible();
    });
});

test("4.3 - Add a new product with all fields filled in", async ({ page }) => {
    await test.step('When the user clicks "Create product"', async () => {
        await page.locator(byId("createProductButton")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the form is shown", async () => {
        await expect(page.locator(byId("myProductsAddPage"))).toBeVisible();
    });

    await test.step("When the user fills in all fields", async () => {
        await page.locator(`${byId("addProductVersion")} input`).fill("TEST PRODUCT 4.3");
        await page.locator(`${byId("addProductName")} input`).fill("Test Product 4.3");
        await page.locator(`${byId("addProductProduct")} input`).fill("TEST PRODUCT");
        await page.locator(`${byId("addProductLine")} input`).fill("Test Product Line");
        await page.locator(`${byId("addProductCategory")} input`).fill("Technology Platform");

        await selectOption(page, "addProductStatus", "Unrestricted available");
        await selectOption(page, "addProductAddOn", "No");

        await page.locator(`${byId("addProductRaPuna")} input`).fill("01.01.2020");
        await page.locator(`${byId("addProductRaPua")} input`).fill("01.06.2020");
        await page.locator(`${byId("addProductUa")} input`).fill("01.01.2021");
        await page.locator(`${byId("addProductHanaStatus")} input`).fill("Ready");
        await page.locator(`${byId("addProductHanaDate")} input`).fill("01.01.2021");
        await page.locator(`${byId("addProductEomm")} input`).fill("31.12.2030");
        await page.locator(`${byId("addProductEom")} input`).fill("31.12.2033");
        await page.locator(`${byId("addProductEop1")} input`).fill("31.12.2034");
        await page.locator(`${byId("addProductEosk")} input`).fill("31.12.2035");
        await page.locator(`${byId("addProductUrl")} input`).fill("https://support.sap.com/test");
    });

    await test.step('And clicks "Add"', async () => {
        await page.locator("button:visible", { hasText: "Save" }).click();
        await page.waitForTimeout(300);
    });

    await test.step("And navigates to the supportstatus page", async () => {
        await navigateTo(page, "Support status of my products");
        await page.waitForTimeout(300);
    });

    await thenStep(page, "Then the newly added product is shown", async () => {
        const rows = tableDataRows(page, "supportStatusTable");
        const texts = await rows.allInnerTexts();
        expect(texts.some((text) => text.includes("TEST PRODUCT 4.3"))).toBe(true);
    });
});
