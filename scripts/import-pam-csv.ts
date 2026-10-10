#!/usr/bin/env node

/**
 * Converts the SAP Product Availability Matrix (PAM) export (semicolon-separated,
 * double-quoted CSV, no header line changes expected) into the JSON file consumed
 * by the UI5 app as the "pam" model.
 *
 * Optionally merges in SAPUI5/OpenUI5 version support data (https://ui5.sap.com/versionoverview.json)
 * as additional PAM-shaped entries, via the --ui5 flag.
 *
 * Usage:
 *   node scripts/import-pam-csv.ts [inputCsvPath] [outputJsonPath] [--ui5[=<url-or-file>]]
 *
 * Defaults: inputCsvPath = "pv", outputJsonPath = "webapp/model/PAM.json"
 *   --ui5           fetch https://ui5.sap.com/versionoverview.json and merge its "versions"
 *                    into the output as extra entries
 *   --ui5=<source>   use <source> instead (an http(s) URL or a local JSON file path with the
 *                    same shape - useful for tests or offline runs)
 */

import fs from "node:fs";
import path from "node:path";

/** A single entry as written to PAM.json. CSV-derived entries are all strings; once a
 * --ui5 merge has run, every entry (CSV- and UI5-derived) additionally carries a boolean
 * "lts" flag - see convertPamCsvToJson. */
export type PamJsonEntry = Record<string, string | boolean>;

/** The subset of https://ui5.sap.com/versionoverview.json's "versions" entries this script reads. */
interface Ui5VersionOverviewEntry {
	version?: string;
	version_label?: string;
	support?: string;
	release_date?: string;
	eomm?: string;
	eom?: string;
	lts?: boolean;
	eocp?: string;
	sapuiversion?: string;
	frontendserver?: string;
}

interface Ui5VersionOverviewDocument {
	versions?: Ui5VersionOverviewEntry[];
}

// Maps the verbose PAM export column headers to short, stable JSON property
// names. Keep "eomm"/"eom" as-is - they are already short and the app code
// (date filters, sorters, highlight logic) relies on exactly these two keys.
export const FIELD_MAP: Record<string, string> = {
	"Product Version": "version",
	"Official Name": "name",
	"Product": "product",
	"Product Line": "line",
	"Product Category": "category",
	"Add-On Product Version": "addOn",
	"Current Status": "status",
	"Restricted available (productive use not allowed)": "ra_puna",
	"Restricted available (productive use allowed)": "ra_pua",
	"Unrestricted available": "ua",
	"Readiness Status for SAP HANA": "hanaStatus",
	"Readiness Date for SAP HANA": "hanaDate",
	"End of mainstream maintenance": "eomm",
	"End of extended maintenance": "eom",
	"End of Priority-One Support": "eop1",
	"End of SAP S/4HANA Cloud Safekeeper Service": "eosk",
	"URL to Product Version in SAP Support Portal. Disclaimer: Please notice that always the online information on SAP Support Portal is the recent information!": "url"
};

export const PAM_ENTRY_KEYS: string[] = Object.values(FIELD_MAP);

export const UI5_VERSION_OVERVIEW_URL = "https://ui5.sap.com/versionoverview.json";

// UI5's "support" values map onto a subset of the real PAM "Current Status" values,
// so UI5 entries highlight/filter the same way CSV-derived ones do.
const UI5_SUPPORT_TO_STATUS: Record<string, string> = {
	"Maintenance": "Unrestricted available",
	"Out of maintenance": "Out of maintenance"
};

/**
 * Maps one entry of https://ui5.sap.com/versionoverview.json's "versions" array to a
 * PAM-shaped entry. "version" stays "version", "version_label" becomes "name", and
 * "release_date" becomes "ra_puna" (closest PAM equivalent: the date the version
 * became available). "lts", "eocp" (end of cloud provisioning), "sapuiversion" (SAPUI5
 * distribution/ABAP compatibility, or "Cloud only") and "frontendserver" (SAP Fiori
 * front-end server compatibility) are PAM fields that don't exist in the SAP PAM export
 * itself - this is where they get introduced.
 *
 * UI5 doesn't have PAM's product/line/category/addOn/url concepts, so those are filled with
 * fixed values. "eomm"/"eom" are passed through as-is (e.g. "Q3/2027", "Long-term Maintenance,
 * Q4/2032"); like the real PAM export, these aren't always dd.mm.yyyy dates - parseGermanDate
 * in Main/SupportStatus controllers already tolerates unparseable date strings.
 *
 * Returns null for entries without a "version_label" (e.g. the catch-all "*" entry), since
 * there is nothing meaningful to show as the product name.
 */
export function mapUi5VersionToPamEntry(ui5Version: Ui5VersionOverviewEntry): PamJsonEntry | null {
	if (!ui5Version || !ui5Version.version_label) {
		return null;
	}

	const entry: PamJsonEntry = {};

	PAM_ENTRY_KEYS.forEach((key) => {
		entry[key] = "";
	});

	entry.version = ui5Version.version ?? "";
	entry.name = ui5Version.version_label;
	entry.product = "SAP UI5";
	entry.line = "SAP UI5";
	entry.category = "Technology Platform";
	entry.addOn = "No";
	entry.status = (ui5Version.support && UI5_SUPPORT_TO_STATUS[ui5Version.support]) ?? (ui5Version.support ?? "");
	entry.ra_puna = ui5Version.release_date ?? "";
	entry.eomm = ui5Version.eomm ?? "";
	entry.eom = ui5Version.eom ?? "";
	entry.lts = Boolean(ui5Version.lts);
	entry.eocp = ui5Version.eocp ?? "";
	entry.sapuiversion = ui5Version.sapuiversion ?? "";
	entry.frontendserver = ui5Version.frontendserver ?? "";

	return entry;
}

/**
 * Loads the UI5 version overview document from an http(s) URL or a local file path and
 * returns its "versions" array.
 */
export async function fetchUi5Versions(source: string): Promise<Ui5VersionOverviewEntry[]> {
	let raw: string;

	if (/^https?:\/\//.test(source)) {
		const response = await fetch(source);

		if (!response.ok) {
			throw new Error(`Failed to fetch UI5 version data from ${source}: ${response.status} ${response.statusText}`);
		}

		raw = await response.text();
	} else {
		raw = fs.readFileSync(path.resolve(process.cwd(), source), "utf8");
	}

	const data = JSON.parse(raw) as Ui5VersionOverviewDocument;

	if (!data || !Array.isArray(data.versions)) {
		throw new Error(`Unexpected UI5 version overview format - no "versions" array found in ${source}`);
	}

	return data.versions;
}

/**
 * Splits one semicolon-delimited, double-quoted CSV line into raw field values.
 * The PAM export quotes every field and doubles embedded quotes ("") but never
 * embeds a literal delimiter inside a field, so a simple split is sufficient.
 */
export function parseLine(line: string): string[] {
	let content = line;

	if (content.endsWith(";")) {
		content = content.slice(0, -1);
	}

	if (content.startsWith("\"") && content.endsWith("\"")) {
		content = content.slice(1, -1);
	}

	return content.split("\";\"").map((field) => field.replace(/""/g, "\""));
}

export interface ConvertPamCsvToJsonOptions {
	ui5Source?: string;
}

export async function convertPamCsvToJson(
	inputPath: string,
	outputPath: string,
	{ ui5Source }: ConvertPamCsvToJsonOptions = {}
): Promise<void> {
	const csvContent = fs.readFileSync(inputPath, "utf8");
	const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

	if (lines.length === 0) {
		throw new Error(`No data found in ${inputPath}`);
	}

	const [headerLine, ...dataLines] = lines;
	const headers = parseLine(headerLine);

	const keys = headers.map((header) => {
		const key = FIELD_MAP[header];

		if (!key) {
			throw new Error(`Unknown PAM column "${header}" - add it to FIELD_MAP in ${__filename}`);
		}

		return key;
	});

	const entries: PamJsonEntry[] = dataLines.map((line) => {
		const values = parseLine(line);
		const entry: PamJsonEntry = {};

		keys.forEach((key, index) => {
			entry[key] = (values[index] ?? "").trim();
		});

		return entry;
	});

	if (ui5Source) {
		const ui5Versions = await fetchUi5Versions(ui5Source);
		const ui5Entries = ui5Versions
			.map(mapUi5VersionToPamEntry)
			.filter((entry): entry is PamJsonEntry => entry !== null);

		// Give the CSV-derived entries the same UI5-only keys so the merged file has a
		// uniform schema across all entries.
		entries.forEach((entry) => {
			entry.lts = false;
			entry.eocp = "";
			entry.sapuiversion = "";
			entry.frontendserver = "";
		});

		entries.push(...ui5Entries);

		console.log(`Merged ${ui5Entries.length} UI5 version entries from ${ui5Source}`);
	}

	fs.writeFileSync(outputPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

	console.log(`Wrote ${entries.length} PAM entries to ${outputPath}`);
}

if (require.main === module) {
	const args = process.argv.slice(2);
	const ui5Arg = args.find((arg) => arg === "--ui5" || arg.startsWith("--ui5="));
	const positionalArgs = args.filter((arg) => arg !== ui5Arg);

	const ui5Source = ui5Arg
		? (ui5Arg.includes("=") ? ui5Arg.slice(ui5Arg.indexOf("=") + 1) : UI5_VERSION_OVERVIEW_URL)
		: undefined;

	const inputPath = path.resolve(process.cwd(), positionalArgs[0] ?? "pv");
	const outputPath = path.resolve(process.cwd(), positionalArgs[1] ?? "webapp/model/PAM.json");

	convertPamCsvToJson(inputPath, outputPath, { ui5Source }).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
