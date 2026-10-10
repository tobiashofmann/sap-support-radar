import { test, expect } from "./coverage-fixtures";
import path from "path";
import {
    byId,
    gotoApp,
    thenStep,
    navigateTo,
    tableDataRows,
    extractEntryCount,
    activeHeading
} from "./helpers";

const fixture = (name: string): string => path.join(__dirname, "fixtures", name);

test.beforeEach(async ({ page }) => {
    await gotoApp(page);
});

test("5.1 - Upload PAM.json (valid)", async ({ page }) => {
    await test.step('Given the user clicks the "Upload PAM.json" button', async () => {
        // the click itself opens the native file picker, see the next step
    });

    await test.step("When the user selects a valid PAM.json file", async () => {
        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            page.locator(byId("uploadPamButton")).click()
        ]);
        await chooser.setFiles(fixture("pam-valid.json"));
        await page.waitForTimeout(400);
    });

    await thenStep(page, "Then the table is replaced entirely with the new data", async () => {
        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(2);
        await expect(tableDataRows(page, "pamTable")).toHaveCount(2);
    });

    await test.step("And a toast shows the number of loaded entries", async () => {
        await expect(page.locator(".sapMMessageToast")).toContainText("2 PAM entries were loaded");
    });
});

test("5.2 - Upload PAM.json (invalid)", async ({ page }) => {
    await test.step('Given the user clicks the "Upload PAM.json" button', async () => {
        // the click itself opens the native file picker, see the next step
    });

    await test.step("When the user selects a file with malformed JSON", async () => {
        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            page.locator(byId("uploadPamButton")).click()
        ]);
        await chooser.setFiles(fixture("pam-malformed.json"));
        await page.waitForTimeout(400);
    });

    await thenStep(page, "Then an error message is shown and the table stays unchanged", async () => {
        await expect(page.locator(".sapMMessageBox")).toContainText(
            "The uploaded file does not contain valid JSON."
        );
        await page.locator(".sapMMessageBox button", { hasText: "Close" }).click();
        await page.waitForTimeout(300);

        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });

    await test.step("When the user uploads a file with valid JSON that is not an array", async () => {
        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            page.locator(byId("uploadPamButton")).click()
        ]);
        await chooser.setFiles(fixture("pam-not-array.json"));
        await page.waitForTimeout(400);
    });

    await thenStep(page, "Then an error message is shown and the table stays unchanged", async () => {
        await expect(page.locator(".sapMMessageBox")).toContainText(
            "The PAM file must contain a JSON array."
        );
        await page.locator(".sapMMessageBox button", { hasText: "Close" }).click();
        await page.waitForTimeout(300);

        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });

    await test.step("When the user uploads an array that contains invalid entries", async () => {
        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            page.locator(byId("uploadPamButton")).click()
        ]);
        await chooser.setFiles(fixture("pam-invalid-entries.json"));
        await page.waitForTimeout(400);
    });

    await thenStep(page, "Then an error message is shown and the table stays unchanged", async () => {
        await expect(page.locator(".sapMMessageBox")).toContainText(
            "The PAM file contains invalid entries."
        );
        await page.locator(".sapMMessageBox button", { hasText: "Close" }).click();
        await page.waitForTimeout(300);

        const heading = await activeHeading(page).textContent();
        expect(extractEntryCount(heading ?? "")).toBe(1554);
    });
});

test("5.3 - Upload OwnProducts.json (app toolbar)", async ({ page }) => {
    await test.step('Given the user clicks the "Upload OwnProducts.json" button', async () => {
        // the click itself opens the native file picker, see the next step
    });

    await test.step("When the user selects a valid OwnProducts.json file", async () => {
        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            page.locator(byId("uploadOwnProductsButton")).click()
        ]);
        await chooser.setFiles(fixture("own-products-valid.json"));
        await page.waitForTimeout(400);
    });

    await test.step("And a toast shows the number of loaded entries", async () => {
        await expect(page.locator(".sapMMessageToast")).toContainText("1 own products were loaded");
    });

    await thenStep(page, "Then the list of own products is replaced entirely", async () => {
        await navigateTo(page, "Manage my products");
        await page.waitForTimeout(300);
        await expect(activeHeading(page)).toContainText("(1/1554)");
    });
});

test("5.4 - Upload OwnProducts.json (invalid)", async ({ page }) => {
    await test.step('Given the user clicks the "Upload OwnProducts.json" button', async () => {
        // the click itself opens the native file picker, see the next step
    });

    await test.step("When the user selects a file with malformed JSON", async () => {
        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            page.locator(byId("uploadOwnProductsButton")).click()
        ]);
        await chooser.setFiles(fixture("pam-malformed.json"));
        await page.waitForTimeout(400);
    });

    await thenStep(page, "Then an error message is shown and the own products stay unchanged", async () => {
        await expect(page.locator(".sapMMessageBox")).toContainText(
            "The uploaded file does not contain valid JSON."
        );
        await page.locator(".sapMMessageBox button", { hasText: "Close" }).click();
        await page.waitForTimeout(300);

        await navigateTo(page, "Manage my products");
        await page.waitForTimeout(300);
        await expect(activeHeading(page)).toContainText("(0/1554)");
    });

    await test.step("When the user uploads a file with valid JSON that is not an array", async () => {
        await navigateTo(page, "Overview");
        await page.waitForTimeout(300);

        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            page.locator(byId("uploadOwnProductsButton")).click()
        ]);
        await chooser.setFiles(fixture("pam-not-array.json"));
        await page.waitForTimeout(400);
    });

    await thenStep(page, "Then an error message is shown and the own products stay unchanged", async () => {
        await expect(page.locator(".sapMMessageBox")).toContainText(
            "The file of own products must contain a JSON array."
        );
        await page.locator(".sapMMessageBox button", { hasText: "Close" }).click();
        await page.waitForTimeout(300);

        await navigateTo(page, "Manage my products");
        await page.waitForTimeout(300);
        await expect(activeHeading(page)).toContainText("(0/1554)");
    });

    await test.step("When the user uploads an array that contains invalid entries", async () => {
        await navigateTo(page, "Overview");
        await page.waitForTimeout(300);

        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            page.locator(byId("uploadOwnProductsButton")).click()
        ]);
        await chooser.setFiles(fixture("pam-invalid-entries.json"));
        await page.waitForTimeout(400);
    });

    await thenStep(page, "Then an error message is shown and the own products stay unchanged", async () => {
        await expect(page.locator(".sapMMessageBox")).toContainText(
            "The file contains invalid product entries."
        );
        await page.locator(".sapMMessageBox button", { hasText: "Close" }).click();
        await page.waitForTimeout(300);

        await navigateTo(page, "Manage my products");
        await page.waitForTimeout(300);
        await expect(activeHeading(page)).toContainText("(0/1554)");
    });
});

test("5.5 - Download own products", async ({ page }) => {
    await test.step("Given the user navigates to the myproducts page", async () => {
        await navigateTo(page, "Manage my products");
        await page.waitForTimeout(300);
    });

    await test.step("When the user adds at least 1 product", async () => {
        await tableDataRows(page, "myProductsTable").nth(1).click();
        await page.waitForTimeout(150);
        await page.locator(byId("addProductsButton")).click();
        await page.waitForTimeout(300);
    });

    let downloadedFilename = "";

    await test.step('And clicks the "Download" button', async () => {
        const [download] = await Promise.all([
            page.waitForEvent("download"),
            page.locator(byId("downloadOwnProductsButton")).click()
        ]);
        downloadedFilename = download.suggestedFilename();
    });

    await thenStep(page, "Then OwnProducts.json is downloaded", async () => {
        expect(downloadedFilename).toBe("OwnProducts.json");
    });

    await test.step("When the user removes all products", async () => {
        await tableDataRows(page, "myProductsTable").nth(1).click();
        await page.waitForTimeout(150);
        await page.locator(byId("addProductsButton")).click();
        await page.waitForTimeout(300);
    });

    await thenStep(page, 'Then the download button is hidden, or a "no own products" message is shown', async () => {
        await expect(page.locator(byId("downloadOwnProductsButton"))).toHaveCount(0);
    });
});
