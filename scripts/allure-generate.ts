#!/usr/bin/env node

/**
 * Generates the Allure HTML report with trend graphs (History, Retries,
 * Duration, Categories) across multiple local test runs.
 *
 * `allure generate` on its own only ever "sees" the most recent run's
 * results (allure-results/) - it has no memory of earlier runs. The trend
 * graphs only appear if allure-results/history/ is present at generate time,
 * and that folder is itself produced as part of the *previous* generated
 * report (allure-report/history/). So each run must carry the previous
 * report's history/ folder forward into the new results before generating,
 * or every report starts its trend history over from zero.
 *
 * Usage: node scripts/allure-generate.ts [--open]
 *   --open   also opens the generated report (same as `allure open`)
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RESULTS_DIR = path.resolve(__dirname, "..", "allure-results");
const REPORT_DIR = path.resolve(__dirname, "..", "allure-report");
const PREVIOUS_HISTORY_DIR = path.join(REPORT_DIR, "history");
const CARRIED_HISTORY_DIR = path.join(RESULTS_DIR, "history");

function runAllure(args: string[]): void {
	const result = spawnSync("npx", ["allure", ...args], {
		stdio: "inherit",
		shell: process.platform === "win32"
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

if (!fs.existsSync(RESULTS_DIR)) {
	console.error(`No allure-results/ found at ${RESULTS_DIR} - run the tests first (npm run test:e2e).`);
	process.exit(1);
}

if (fs.existsSync(PREVIOUS_HISTORY_DIR)) {
	fs.cpSync(PREVIOUS_HISTORY_DIR, CARRIED_HISTORY_DIR, { recursive: true });
	console.log("Carried forward history/ from the previous report for trend graphs.");
} else {
	console.log("No previous report history/ found - this run starts a fresh trend history.");
}

runAllure(["generate", RESULTS_DIR, "--clean", "-o", REPORT_DIR]);

if (process.argv.includes("--open")) {
	runAllure(["open", REPORT_DIR]);
}
