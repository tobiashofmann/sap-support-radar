import { test, expect, Page, Locator } from "@playwright/test";

/**
 * UI5 prefixes every control id with the component/view path
 * (e.g. "container-de.itsfullofstars.sap.pam---main--pamTable"), and the
 * app's NavContainer keeps previously visited pages mounted (hidden) in the
 * DOM for back-navigation - several views also reuse the same control id
 * (e.g. "globalSearch" exists on both Main and SupportStatus). Matching the
 * id suffix plus ":visible" is what reliably resolves to the control on the
 * currently active page.
 * @param id The plain view-local control id (as given in the XML view)
 * @returns A CSS selector matching that control, wherever it is mounted
 */
export function byId(id: string): string {
    return `[id$="--${id}"]:visible`;
}

/**
 * Waits until two consecutive full-page screenshots, `intervalMs` apart, are
 * byte-identical (or `maxAttempts` is reached) - i.e. the page has actually
 * stopped changing. Under heavy parallel CPU load, UI5's manifest-declared
 * custom CSS (css/style.css) and its own bound-text re-renders can lag
 * noticeably behind `document.fonts.ready`/an animation frame, which is
 * otherwise enough to intermittently catch a control (e.g. the page
 * heading) mid-restyle or mid-rerender - this is a generic, root-cause-
 * agnostic settle check rather than waiting out one specific async step.
 * @param page The page to wait for
 */
async function waitForStableScreenshot(
    page: Page,
    maxAttempts = 15,
    intervalMs = 150
): Promise<void> {
    let previous = await page.screenshot();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await page.waitForTimeout(intervalMs);
        const current = await page.screenshot();

        if (Buffer.compare(previous, current) === 0) {
            return;
        }

        previous = current;
    }
}

/**
 * Runs one "Then ..." (outcome/assertion) step, and afterwards takes a
 * screenshot that Playwright compares against a stored baseline via
 * `expect(page).toHaveScreenshot()` - a pixel diff beyond the configured
 * threshold fails the test, not just a captured-for-reference image. Use
 * `npx playwright test --update-snapshots` to (re-)generate the baselines,
 * e.g. after an intentional UI change (that command writes whatever it
 * captures with no stability check of its own, so {@link waitForStableScreenshot}
 * matters for a *clean* baseline just as much as for a normal comparison run).
 *
 * Only "Then" steps get this treatment (not every Given/When/And step),
 * since those are the ones asserting a concrete, screenshot-able outcome.
 * @param page The page to verify
 * @param title The step description (shown in the report), must start with "Then"
 * @param action The step's assertions
 */
export async function thenStep(
    page: Page,
    title: string,
    action: () => Promise<void>
): Promise<void> {
    await test.step(title, async () => {
        await action();
        await page.evaluate(() => document.fonts.ready);
        await waitForStableScreenshot(page);
        await expect(page).toHaveScreenshot();
    });
}

/** Loads the app fresh (bundled PAM.json, empty OwnProducts.json) and waits for the Main table. */
export async function gotoApp(page: Page): Promise<void> {
    await page.goto("/index.html");

    /*
     * Under parallel-test CPU load, the UI5 theme's CSS can still be
     * applying when `pamTable` first becomes visible (DOM present doesn't
     * mean fully styled) - e.g. sap.m.Title/Label briefly render at
     * collapsed line-height before their real font-size/line-height rule
     * lands, which visibly shifts everything below them up the page.
     * Waiting for the network to go idle gives that CSS time to settle
     * before any test interacts with the page.
     */
    await page.waitForLoadState("networkidle");

    await expect(page.locator(byId("pamTable"))).toBeVisible();
}

/**
 * Clicks one of the app shell's top-level nav tabs by its visible label, and
 * waits out the page-transition animation - while it runs, the NavContainer
 * briefly keeps both the old and the new page's ":visible" elements on
 * screen, which is enough to make strict-mode locators (e.g. by a class
 * shared across views, like ".pamMainHeading") resolve to more than one.
 */
export async function navigateTo(page: Page, tabText: string): Promise<void> {
    await page.locator("button", { hasText: tabText }).click();
    await page.waitForTimeout(400);
}

/** Escapes a string for safe interpolation into a `RegExp`. */
function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Opens a sap.m.Select by id and picks the option with the given visible
 * text. Matches the full option text exactly (anchored regex) rather than
 * via substring, since several of this app's dropdowns have one option's
 * text contained in another's (e.g. "No" is a substring of "Not specified").
 */
export async function selectOption(
    page: Page,
    selectId: string,
    optionText: string
): Promise<void> {
    await page.locator(byId(selectId)).click();
    await page.locator(".sapMSelectList li:visible", {
        hasText: new RegExp(`^${escapeRegExp(optionText)}$`)
    })
        .first()
        .click();
}

/**
 * The sap.m.Select's visibly rendered label text, as a single-match locator.
 * (The control's id also resolves a hidden accessibility "combobox" div
 * carrying the same text, so reading .textContent()/.innerText() off the id
 * selector directly returns the text duplicated.)
 */
export function selectLabel(selectId: string): string {
    return `${byId(selectId)} .sapMSltLabel`;
}

/**
 * The currently active page's heading - scoped with .last() because a class
 * shared across views (like ".pamMainHeading") can briefly resolve to more
 * than one element while the NavContainer's page transition is still
 * settling (see {@link navigateTo}).
 */
export function activeHeading(page: Page): Locator {
    return page.locator(".pamMainHeading:visible").last();
}

/** Clicks one item (by its visible text) of a sap.m.SegmentedButton. */
export async function clickSegmentedButtonItem(
    page: Page,
    segmentedButtonId: string,
    itemText: string
): Promise<void> {
    await page.locator(`${byId(segmentedButtonId)} .sapMSegBBtn`, { hasText: itemText })
        .click();
}

/** The data rows (excluding the header row) of a sap.m.Table, by its id. */
export function tableDataRows(page: Page, tableId: string): Locator {
    return page.locator(`${byId(tableId)} tr.sapMLIB`);
}

/** Splits one row's rendered cell text into its individual, non-empty cell values. */
export async function rowCellTexts(row: Locator): Promise<string[]> {
    const text = await row.innerText();
    return text.split("\t").map((cell) => cell.trim()).filter(Boolean);
}

/**
 * The first data row's cell values, as an `expect.poll()` matcher - a plain
 * `await rowCellTexts(...)` reads the DOM exactly once, which can race a
 * table re-render still in flight right after a sort/filter action
 * (particularly under parallel load); polling retries until the table
 * settles or the assertion's timeout elapses.
 */
export function pollFirstRowCells(page: Page, tableId: string): ReturnType<typeof expect.poll> {
    return expect.poll(() => rowCellTexts(tableDataRows(page, tableId).first()));
}

/** Like {@link pollFirstRowCells}, but polling just the first row's first cell value. */
export function pollFirstCell(page: Page, tableId: string): ReturnType<typeof expect.poll> {
    return expect.poll(async () => (await rowCellTexts(tableDataRows(page, tableId).first()))[0]);
}

/**
 * Extracts the entry count from a "<...> ({0} entries)" heading, undoing the
 * app's deliberate de-DE thousands separator (e.g. "1.554" -> 1554).
 * @param headingText The rendered heading text
 */
export function extractEntryCount(headingText: string): number {
    const match = headingText.match(/\(([\d.,]+)\s+entries?\)/);

    if (!match) {
        throw new Error(`Could not find an entry count in heading: "${headingText}"`);
    }

    return Number(match[1].replace(/[.,]/g, ""));
}

/** Extracts both counts from MyProducts' "PAM products ({own}/{total})" title. */
export function extractMyProductsCounts(
    titleText: string
): { own: number; total: number } {
    const match = titleText.match(/\((\d+)\/([\d.,]+)\)/);

    if (!match) {
        throw new Error(`Could not find own/total counts in title: "${titleText}"`);
    }

    return {
        own: Number(match[1]),
        total: Number(match[2].replace(/[.,]/g, ""))
    };
}

/** Selects one PAM product on the MyProducts table by searching for its exact version. */
export async function addOwnProductByVersion(page: Page, version: string): Promise<void> {
    await page.locator(`${byId("myProductsSearch")} input`).fill(version);
    await page.waitForTimeout(300);
    await tableDataRows(page, "myProductsTable").first().click();
    await page.waitForTimeout(150);
    await page.locator(`${byId("myProductsSearch")} input`).fill("");
    await page.waitForTimeout(300);
}

/**
 * Adds the fixed set of 5 own products used by the SupportStatus tests (2.1
 * onward) via the MyProducts page, then navigates to the SupportStatus page
 * with them selected.
 */
export async function addFiveOwnProducts(page: Page): Promise<void> {
    await navigateTo(page, "Manage my products");
    await page.waitForTimeout(300);

    for (const version of [
        "SAP NETWEAVER 7.5",
        "SAP NETWEAVER 7.4",
        "SAP S/4HANA 2021",
        "SAP S/4HANA 2022",
        "SAP S/4HANA 2025"
    ]) {
        await addOwnProductByVersion(page, version);
    }

    await page.locator(byId("addProductsButton")).click();
    await page.waitForTimeout(300);

    await navigateTo(page, "Support status of my products");
    await page.waitForTimeout(300);
}
