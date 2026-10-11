/**
 * Unit tests for the CSV->JSON conversion in scripts/import-pam-csv.ts.
 *
 * Scope: only the PAM CSV import itself (parseLine, convertPamCsvToJson,
 * FIELD_MAP). The SAPUI5/OpenUI5 version merge (--ui5, mapUi5VersionToPamEntry,
 * fetchUi5Versions) is deliberately out of scope here.
 *
 * Run with: npm run test:scripts
 *
 * fixtures/sample-pam.csv contains the real PAM header line plus 3 fictional
 * mock data rows (SAP's PAM export data is customer-only and must not be
 * checked in - see CLAUDE.md's "Mock PAM data" section), shaped like real
 * PAM rows (same columns/status/date formats) so the test still exercises
 * realistic parsing edge cases (an add-on product, a non-dd.mm.yyyy-free
 * entry, an "Out of maintenance" status, etc.).
 */

import assert from "node:assert/strict";
import { test, after } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
	convertPamCsvToJson,
	parseLine,
	FIELD_MAP,
	PAM_ENTRY_KEYS,
	PamJsonEntry
} from "../import-pam-csv";

const FIXTURE_CSV_PATH = path.join(__dirname, "fixtures", "sample-pam.csv");

// The 3 fictional rows in fixtures/sample-pam.csv, transcribed through FIELD_MAP by hand
// so the test has an independent expectation to compare the script's output against.
const EXPECTED_ENTRIES: PamJsonEntry[] = [
	{
		version: "MOCK CORE SUITE 2025",
		name: "Mock Core Suite 2025",
		product: "MOCK CORE SUITE",
		line: "MOCK CORE SUITE",
		category: "Enterprise Resource Planning",
		addOn: "No",
		status: "Unrestricted available",
		ra_puna: "11.08.2025",
		ra_pua: "08.10.2025",
		ua: "08.10.2025",
		hanaStatus: "Ready",
		hanaDate: "",
		eomm: "31.12.2032",
		eom: "",
		eop1: "",
		eosk: "",
		url: "https://www.sap.com/"
	},
	{
		version: "EHP8 FOR MOCK LEGACY SUITE 6.0",
		name: "Mock enhancement package 8 for Mock Legacy Suite 6.0",
		product: "MOCK LEGACY SUITE ENHANCE PACKAGE",
		line: "MOCK LEGACY SUITE",
		category: "Enterprise Resource Planning",
		addOn: "Yes",
		status: "Unrestricted available",
		ra_puna: "",
		ra_pua: "20.01.2016",
		ua: "20.01.2016",
		hanaStatus: "Ready",
		hanaDate: "",
		eomm: "31.12.2027",
		eom: "31.12.2030",
		eop1: "",
		eosk: "",
		url: "https://www.sap.com/"
	},
	{
		version: "MOCK BI PLATFORM 4.2",
		name: "Mock Business Objects Business Intelligence platform 4.2",
		product: "MOCK BI PLATFORM (ENTERPRISE)",
		line: "MOCK BUSINESS OBJECTS BUSINESS INTELLIGENCE",
		category: "Technology Platform",
		addOn: "No",
		status: "Out of maintenance",
		ra_puna: "31.08.2015",
		ra_pua: "13.11.2015",
		ua: "08.03.2016",
		hanaStatus: "Ready",
		hanaDate: "",
		eomm: "31.12.2022",
		eom: "",
		eop1: "31.12.2024",
		eosk: "",
		url: "https://www.sap.com/"
	}
];

const tempFiles: string[] = [];

function createTempOutputPath(): string {
	const tempPath = path.join(os.tmpdir(), `pam-import-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
	tempFiles.push(tempPath);
	return tempPath;
}

function writeFixture(content: string): string {
	const tempPath = path.join(os.tmpdir(), `pam-import-fixture-${Date.now()}-${Math.random().toString(16).slice(2)}.csv`);
	fs.writeFileSync(tempPath, content, "utf8");
	tempFiles.push(tempPath);
	return tempPath;
}

after(() => {
	for (const tempFile of tempFiles) {
		fs.rmSync(tempFile, { force: true });
	}
});

// --- parseLine ------------------------------------------------------------

void test("parseLine splits a quoted, semicolon-delimited line with a trailing separator", () => {
	const fields = parseLine("\"a\";\"b\";\"c\";");

	assert.deepEqual(fields, ["a", "b", "c"]);
});

void test("parseLine unescapes doubled quotes within a field", () => {
	const fields = parseLine("\"SAP \"\"Quoted\"\" Product\";\"b\";");

	assert.deepEqual(fields, ["SAP \"Quoted\" Product", "b"]);
});

void test("parseLine preserves empty fields", () => {
	const fields = parseLine("\"a\";\"\";\"c\";");

	assert.deepEqual(fields, ["a", "", "c"]);
});

void test("parseLine handles a line without a trailing separator", () => {
	const fields = parseLine("\"a\";\"b\"");

	assert.deepEqual(fields, ["a", "b"]);
});

// --- FIELD_MAP --------------------------------------------------------------

void test("FIELD_MAP maps every documented PAM column to its short key", () => {
	assert.equal(Object.keys(FIELD_MAP).length, 17);

	assert.equal(FIELD_MAP["Product Version"], "version");
	assert.equal(FIELD_MAP["Official Name"], "name");
	assert.equal(FIELD_MAP["Product"], "product");
	assert.equal(FIELD_MAP["Product Line"], "line");
	assert.equal(FIELD_MAP["Product Category"], "category");
	assert.equal(FIELD_MAP["Add-On Product Version"], "addOn");
	assert.equal(FIELD_MAP["Current Status"], "status");
	assert.equal(FIELD_MAP["Restricted available (productive use not allowed)"], "ra_puna");
	assert.equal(FIELD_MAP["Restricted available (productive use allowed)"], "ra_pua");
	assert.equal(FIELD_MAP["Unrestricted available"], "ua");
	assert.equal(FIELD_MAP["Readiness Status for SAP HANA"], "hanaStatus");
	assert.equal(FIELD_MAP["Readiness Date for SAP HANA"], "hanaDate");
	assert.equal(FIELD_MAP["End of mainstream maintenance"], "eomm");
	assert.equal(FIELD_MAP["End of extended maintenance"], "eom");
	assert.equal(FIELD_MAP["End of Priority-One Support"], "eop1");
	assert.equal(FIELD_MAP["End of SAP S/4HANA Cloud Safekeeper Service"], "eosk");
	assert.equal(
		FIELD_MAP["URL to Product Version in SAP Support Portal. Disclaimer: Please notice that always the online information on SAP Support Portal is the recent information!"],
		"url"
	);
});

// --- convertPamCsvToJson (mock rows via fixtures/sample-pam.csv) ----------

void test("convertPamCsvToJson converts the mock fixture rows into PAM.json entries", async () => {
	const outputPath = createTempOutputPath();

	await convertPamCsvToJson(FIXTURE_CSV_PATH, outputPath);

	const written = JSON.parse(fs.readFileSync(outputPath, "utf8")) as PamJsonEntry[];

	assert.equal(written.length, 3);

	for (const expectedEntry of EXPECTED_ENTRIES) {
		const actualEntry = written.find((entry) => entry.version === expectedEntry.version);

		assert.ok(actualEntry, `expected an entry for version "${expectedEntry.version}"`);
		assert.deepEqual(actualEntry, expectedEntry);
	}
});

void test("convertPamCsvToJson only emits the 17 FIELD_MAP keys per entry - no more, no less", async () => {
	const outputPath = createTempOutputPath();

	await convertPamCsvToJson(FIXTURE_CSV_PATH, outputPath);

	const written = JSON.parse(fs.readFileSync(outputPath, "utf8")) as PamJsonEntry[];

	assert.equal(PAM_ENTRY_KEYS.length, 17);

	for (const entry of written) {
		assert.deepEqual(Object.keys(entry).sort(), [...PAM_ENTRY_KEYS].sort());
	}
});

void test("convertPamCsvToJson trims whitespace around values", async () => {
	const fixturePath = writeFixture(
		"\"Product Version\";\"Official Name\";\"Product\";\"Product Line\";\"Product Category\";\"Add-On Product Version\";\"Current Status\";\"Restricted available (productive use not allowed)\";\"Restricted available (productive use allowed)\";\"Unrestricted available\";\"Readiness Status for SAP HANA\";\"Readiness Date for SAP HANA\";\"End of mainstream maintenance\";\"End of extended maintenance\";\"End of Priority-One Support\";\"End of SAP S/4HANA Cloud Safekeeper Service\";\"URL to Product Version in SAP Support Portal. Disclaimer: Please notice that always the online information on SAP Support Portal is the recent information!\"\n"
		+ "\" Test Product 1.0 \";\"Test Product 1.0\";\"Test Product\";\"Test Line\";\"Technology Platform\";\"No\";\"Unrestricted available\";\"\";\"\";\"01.01.2020\";\"\";\"\";\"\";\"\";\"\";\"\";\"\"\n"
	);
	const outputPath = createTempOutputPath();

	await convertPamCsvToJson(fixturePath, outputPath);

	const [entry] = JSON.parse(fs.readFileSync(outputPath, "utf8")) as PamJsonEntry[];

	assert.equal(entry.version, "Test Product 1.0");
});

void test("convertPamCsvToJson produces zero entries for a header-only CSV", async () => {
	const fixturePath = writeFixture(
		"\"Product Version\";\"Official Name\";\"Product\";\"Product Line\";\"Product Category\";\"Add-On Product Version\";\"Current Status\";\"Restricted available (productive use not allowed)\";\"Restricted available (productive use allowed)\";\"Unrestricted available\";\"Readiness Status for SAP HANA\";\"Readiness Date for SAP HANA\";\"End of mainstream maintenance\";\"End of extended maintenance\";\"End of Priority-One Support\";\"End of SAP S/4HANA Cloud Safekeeper Service\";\"URL to Product Version in SAP Support Portal. Disclaimer: Please notice that always the online information on SAP Support Portal is the recent information!\"\n"
	);
	const outputPath = createTempOutputPath();

	await convertPamCsvToJson(fixturePath, outputPath);

	const written = JSON.parse(fs.readFileSync(outputPath, "utf8")) as PamJsonEntry[];

	assert.deepEqual(written, []);
});

void test("convertPamCsvToJson rejects a completely empty CSV file", async () => {
	const fixturePath = writeFixture("");
	const outputPath = createTempOutputPath();

	await assert.rejects(
		() => convertPamCsvToJson(fixturePath, outputPath),
		/No data found/
	);
});

void test("convertPamCsvToJson rejects an unknown column header", async () => {
	const fixturePath = writeFixture(
		"\"Product Version\";\"Some Unmapped Column\"\n"
		+ "\"Test\";\"x\"\n"
	);
	const outputPath = createTempOutputPath();

	await assert.rejects(
		() => convertPamCsvToJson(fixturePath, outputPath),
		/Unknown PAM column "Some Unmapped Column"/
	);
});
