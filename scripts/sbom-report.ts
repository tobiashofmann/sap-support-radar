#!/usr/bin/env node

/**
 * Renders a self-contained local HTML report from a CycloneDX SBOM (see the
 * "sbom:dev"/"sbom:prod" npm scripts). Written in-house rather than using a
 * third-party SBOM-to-HTML viewer because none of the ones evaluated show
 * a license summary table, and their bundled templates aren't extensible.
 *
 * Usage: node scripts/sbom-report.ts [inputSbomPath] [outputHtmlPath] [reportLabel]
 * Defaults: inputSbomPath = "sbom.json", outputHtmlPath = "sbom-report.html",
 * reportLabel = "" (shown in the page heading/title to distinguish the "dev"
 * report, which includes devDependencies, from the "prod" one, which only
 * covers what's actually shipped - see the "sbom:report:dev"/"sbom:report:prod"
 * npm scripts).
 */

import fs from "node:fs";
import path from "node:path";
import spdxLicenses from "spdx-license-list";

/** One CycloneDX `licenses[]` entry - either an SPDX id/name pair, or a bare SPDX expression. */
interface CycloneDxLicenseEntry {
	license?: {
		id?: string;
		name?: string;
	};
	expression?: string;
}

interface CycloneDxExternalReference {
	type?: string;
	url?: string;
}

interface CycloneDxComponent {
	name: string;
	version?: string;
	licenses?: CycloneDxLicenseEntry[];
	externalReferences?: CycloneDxExternalReference[];
}

interface CycloneDxSbom {
	metadata?: {
		component?: {
			name?: string;
			version?: string;
		};
	};
	components?: CycloneDxComponent[];
}

const inputPath = path.resolve(process.argv[2] || "sbom.json");
const outputPath = path.resolve(process.argv[3] || "sbom-report.html");
const reportLabel = process.argv[4] || "";

if (!fs.existsSync(inputPath)) {
	console.error(`No SBOM found at ${inputPath} - run "npm run sbom" first.`);
	process.exit(1);
}

const sbom = JSON.parse(fs.readFileSync(inputPath, "utf8")) as CycloneDxSbom;
const components: CycloneDxComponent[] = sbom.components || [];

/**
 * Normalizes one CycloneDX `licenses[]` entry into a single display label.
 * Entries come as either `{ license: { id } }` (SPDX id), `{ license: { name } }`
 * (free-text, for non-SPDX licenses), or `{ expression }` (an SPDX expression
 * string such as "(MIT OR Apache-2.0)").
 */
function licenseLabel(entry: CycloneDxLicenseEntry): string {
	if (entry.expression) {
		return entry.expression;
	}

	if (entry.license) {
		return entry.license.id || entry.license.name || "Unknown";
	}

	return "Unknown";
}

/**
 * The de-duplicated set of license labels declared for one component
 * (cyclonedx-npm sometimes lists the same license twice, e.g. once with and
 * once without a URL, when it finds the same info in two places).
 */
function componentLicenses(component: CycloneDxComponent): string[] {
	const licenses = component.licenses || [];

	if (licenses.length === 0) {
		return ["Unknown"];
	}

	return [...new Set(licenses.map(licenseLabel))];
}

/*
 * Permissive vs. copyleft, by SPDX id. There is no single authoritative
 * machine-readable source for this the way there is for OSI approval (see
 * below), so this is a hand-curated list based on the well-established,
 * widely cited distinction (e.g. GitHub's own license picker, choosealicense.com):
 * copyleft licenses require derivative/combined works to be redistributed
 * under the same (or a compatible) license; permissive licenses impose no
 * such requirement. "Weak"/file-level copyleft (LGPL, MPL, EPL, CDDL) only
 * extends that obligation to the covered files themselves, not anything
 * merely linked against/combined with them - project policy here is to
 * allow it (doesn't trigger the forbidden-license banner below), unlike
 * "strong" copyleft (GPL/AGPL). Extend this if a license shows up that
 * isn't listed.
 */
const COPYLEFT_SPDX_IDS = new Set([
	"GPL-1.0", "GPL-1.0-only", "GPL-1.0-or-later",
	"GPL-2.0", "GPL-2.0-only", "GPL-2.0-or-later",
	"GPL-3.0", "GPL-3.0-only", "GPL-3.0-or-later",
	"AGPL-1.0", "AGPL-1.0-only", "AGPL-1.0-or-later",
	"AGPL-3.0", "AGPL-3.0-only", "AGPL-3.0-or-later"
]);

const WEAK_COPYLEFT_SPDX_IDS = new Set([
	"LGPL-2.0", "LGPL-2.0-only", "LGPL-2.0-or-later",
	"LGPL-2.1", "LGPL-2.1-only", "LGPL-2.1-or-later",
	"LGPL-3.0", "LGPL-3.0-only", "LGPL-3.0-or-later",
	"MPL-1.0", "MPL-1.1", "MPL-2.0",
	"EPL-1.0", "EPL-2.0",
	"CDDL-1.0", "CDDL-1.1"
]);

const PERMISSIVE_SPDX_IDS = new Set([
	"MIT", "ISC", "0BSD", "BSD", "BSD-2-Clause", "BSD-3-Clause", "BSD-4-Clause",
	"Apache-1.1", "Apache-2.0",
	"Zlib", "X11", "Unlicense", "BlueOak-1.0.0", "Python-2.0", "WTFPL",
	"Boost-1.0", "Artistic-2.0"
]);

type LicenseCategory = "Permissive" | "Weak Copyleft" | "Copyleft" | "Unknown";

interface LicenseClassification {
	osiApproved: boolean | null;
	category: LicenseCategory;
	policyApproved: boolean;
}

/**
 * Project policy: every Creative Commons license (CC0, CC-BY, CC-BY-SA, ...)
 * is treated as green/"Permissive" and never trips the forbidden-license
 * banner, regardless of its actual OSI-approval status or share-alike terms.
 * This is a deliberate business decision, not a claim that e.g. CC-BY-SA has
 * no copyleft-like obligations - see the id-specific sets above for how
 * everything else is classified.
 */
function isCreativeCommons(id: string): boolean {
	return /^CC(0|-BY)/.test(id);
}

/**
 * Classifies one *single* SPDX license id (not a compound "A OR B" expression,
 * see {@link classifyLabel} for that).
 */
function classifySingleLicense(id: string): LicenseClassification {
	const osiApproved = Object.prototype.hasOwnProperty.call(spdxLicenses, id)
		? spdxLicenses[id].osiApproved
		: null;

	const policyApproved = isCreativeCommons(id);

	const category: LicenseCategory = policyApproved
		? "Permissive"
		: COPYLEFT_SPDX_IDS.has(id)
			? "Copyleft"
			: WEAK_COPYLEFT_SPDX_IDS.has(id)
				? "Weak Copyleft"
				: PERMISSIVE_SPDX_IDS.has(id)
					? "Permissive"
					: "Unknown";

	return { osiApproved, category, policyApproved };
}

/** Best-case-wins rank for combining an SPDX "OR" expression's alternatives - lower is better. */
const CATEGORY_RANK: Record<LicenseCategory, number> = { Permissive: 0, "Weak Copyleft": 1, Copyleft: 2, Unknown: 3 };

/**
 * Classifies a license label, which may be a compound SPDX "OR" expression
 * such as "(MIT OR WTFPL)" (a dual-license choice). For an OR expression, the
 * best available alternative wins for every field - under an OR license the
 * recipient may comply via *either* branch, so the combination is OSI-approved
 * if any branch is, "policy approved" if any branch is, and takes the least
 * restrictive category found (Permissive > Weak Copyleft > Copyleft > Unknown).
 * Plain labels (a single id, or free text like "Unknown"/"SEE LICENSE IN
 * LICENSE") are classified directly.
 */
function classifyLabel(label: string): LicenseClassification {
	const alternatives = label.includes(" OR ")
		? label.replace(/[()]/g, "").split(" OR ").map((part) => part.trim())
		: [label];

	const classifications = alternatives.map(classifySingleLicense);

	return {
		osiApproved: classifications.some((c) => c.osiApproved === true)
			? true
			: classifications.every((c) => c.osiApproved === false) ? false : null,
		category: classifications.reduce<LicenseCategory>(
			(best, c) => (CATEGORY_RANK[c.category] < CATEGORY_RANK[best] ? c.category : best),
			"Unknown"
		),
		policyApproved: classifications.some((c) => c.policyApproved)
	};
}

/** Counts, for each license label, how many distinct components declare it. */
function buildLicenseSummary(allComponents: CycloneDxComponent[]): Array<[string, number]> {
	const counts = new Map<string, number>();

	allComponents.forEach((component) => {
		componentLicenses(component).forEach((label) => {
			counts.set(label, (counts.get(label) || 0) + 1);
		});
	});

	return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function escapeHtml(value: unknown): string {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

interface LicenseSummaryEntry {
	label: string;
	count: number;
	osiApproved: boolean | null;
	category: LicenseCategory;
	policyApproved: boolean;
	forbidden: boolean;
}

const licenseSummary: LicenseSummaryEntry[] = buildLicenseSummary(components).map(([label, count]) => {
	const { osiApproved, category, policyApproved } = classifyLabel(label);
	/*
	 * Conservative by default: an unresolved OSI status ("Unknown") is
	 * treated as "not approved" - if we can't confirm it's approved, it
	 * doesn't get a free pass. Strong copyleft always flags; weak copyleft
	 * (MPL/LGPL/EPL/CDDL) is allowed and never does. `policyApproved`
	 * (Creative Commons) overrides both checks - it's an explicit allow-list.
	 */
	const forbidden = !policyApproved && (osiApproved !== true || category === "Copyleft");

	return { label, count, osiApproved, category, policyApproved, forbidden };
});

const forbiddenLicenses = licenseSummary.filter((entry) => entry.forbidden);

function osiBadge(osiApproved: boolean | null): string {
	if (osiApproved === true) return '<span class="badge badge-ok">Yes</span>';
	if (osiApproved === false) return '<span class="badge badge-bad">No</span>';
	return '<span class="badge badge-unknown">Unknown</span>';
}

function categoryBadge(category: LicenseCategory): string {
	if (category === "Permissive") return '<span class="badge badge-ok">Permissive</span>';
	if (category === "Weak Copyleft") return '<span class="badge badge-warn">Weak Copyleft</span>';
	if (category === "Copyleft") return '<span class="badge badge-bad">Copyleft</span>';
	return '<span class="badge badge-unknown">Unknown</span>';
}

const licenseSummaryRows = licenseSummary
	.map(({ label, count, osiApproved, category, forbidden }) => {
		const percent = components.length > 0 ? (count / components.length) * 100 : 0;

		return `
        <tr class="${forbidden ? "row-forbidden" : ""}">
            <td>${escapeHtml(label)}</td>
            <td class="num">${count}</td>
            <td class="bar-cell">
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percent.toFixed(2)}%"></div>
                </div>
                <span class="bar-percent">${percent.toFixed(1)}%</span>
            </td>
            <td>${osiBadge(osiApproved)}</td>
            <td>${categoryBadge(category)}</td>
        </tr>`;
	})
	.join("");

/** Renders a component's name as a link to its repo/homepage, if the SBOM lists one. */
function componentNameCell(component: CycloneDxComponent): string {
	const repoUrl = (component.externalReferences || [])
		.find((ref) => ref.type === "vcs" || ref.type === "website")?.url;

	return repoUrl
		? `<a href="${escapeHtml(repoUrl)}">${escapeHtml(component.name)}</a>`
		: escapeHtml(component.name);
}

/**
 * For each flagged license, the components that declare it - rendered directly
 * under the warning banner so the violation is immediately actionable, not just
 * a label the reader has to go search for in the full component list below.
 */
const forbiddenLicenseDetails = forbiddenLicenses
	.map((entry) => {
		const affectedComponents = components
			.filter((component) => componentLicenses(component).includes(entry.label))
			.sort((a, b) => a.name.localeCompare(b.name));

		const rows = affectedComponents
			.map((component) => `
        <tr>
            <td>${componentNameCell(component)}</td>
            <td>${escapeHtml(component.version || "")}</td>
        </tr>`)
			.join("");

		return `
<table class="forbidden-license-detail">
    <thead><tr><th colspan="2">${escapeHtml(entry.label)} &mdash; ${affectedComponents.length} package${affectedComponents.length === 1 ? "" : "s"}</th></tr>
    <tr><th>Package</th><th>Version</th></tr></thead>
    <tbody>${rows}
    </tbody>
</table>`;
	})
	.join("");

const licenseWarningBanner = forbiddenLicenses.length > 0
	? `
<div class="banner banner-bad">
    <strong>${forbiddenLicenses.length} license${forbiddenLicenses.length === 1 ? "" : "s"} flagged</strong>
    - not OSI-approved and/or copyleft:
    ${forbiddenLicenses.map((entry) => escapeHtml(entry.label)).join(", ")}
</div>
${forbiddenLicenseDetails}`
	: `
<div class="banner banner-ok">
    <strong>All ${licenseSummary.length} licenses are OSI-approved and permissive.</strong>
</div>`;

const componentRows = components
	.slice()
	.sort((a, b) => a.name.localeCompare(b.name))
	.map((component) => {
		const licenses = componentLicenses(component).join(", ");

		return `
        <tr data-name="${escapeHtml(component.name.toLowerCase())}" data-license="${escapeHtml(licenses.toLowerCase())}">
            <td>${componentNameCell(component)}</td>
            <td>${escapeHtml(component.version || "")}</td>
            <td>${escapeHtml(licenses)}</td>
        </tr>`;
	})
	.join("");

const projectName = sbom.metadata?.component?.name || "project";
const projectVersion = sbom.metadata?.component?.version || "";
const generatedAt = new Date().toISOString();
const titleSuffix = reportLabel ? ` (${reportLabel})` : "";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>SBOM report - ${escapeHtml(projectName)}${escapeHtml(titleSuffix)}</title>
<style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; color: #1a1a1a; }
    h1 { margin-bottom: 0.25rem; }
    .meta { color: #666; margin-bottom: 2rem; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 2.5rem; }
    th, td { text-align: left; padding: 0.4rem 0.75rem; border-bottom: 1px solid #e0e0e0; }
    th { background: #f5f5f5; position: sticky; top: 0; }
    .num { text-align: right; }
    #license-summary { max-width: 56rem; }
    .bar-cell { display: flex; align-items: center; gap: 0.5rem; }
    .bar-track { flex: 1; background: #eee; border-radius: 3px; height: 0.9rem; overflow: hidden; }
    .bar-fill { height: 100%; background: #0a6ed1; min-width: 2px; }
    .bar-percent { color: #666; font-size: 0.85rem; width: 3.5rem; text-align: right; }
    #filter { padding: 0.4rem 0.6rem; width: 20rem; margin-bottom: 0.75rem; }
    #component-count { color: #666; margin-bottom: 0.75rem; }
    .banner { max-width: 56rem; padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1.25rem; }
    .banner-bad { background: #fdecea; border: 1px solid #f3b4ad; color: #8e1e13; }
    .banner-ok { background: #e9f6ec; border: 1px solid #a9ddb3; color: #205c2c; }
    .badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 3px; font-size: 0.8rem; font-weight: 600; }
    .badge-ok { background: #e9f6ec; color: #205c2c; }
    .badge-warn { background: #fff4e0; color: #8a5a00; }
    .badge-bad { background: #fdecea; color: #8e1e13; }
    .badge-unknown { background: #f0f0f0; color: #555; }
    .row-forbidden { background: #fff8f7; }
    .forbidden-license-detail { max-width: 56rem; margin-top: -0.5rem; }
    .forbidden-license-detail th[colspan] { background: #fdecea; color: #8e1e13; }
</style>
</head>
<body>
<h1>Software Bill of Materials${reportLabel ? ` &mdash; ${escapeHtml(reportLabel)}` : ""}</h1>
<p class="meta">${escapeHtml(projectName)}${projectVersion ? ` @ ${escapeHtml(projectVersion)}` : ""} &middot; ${components.length} components &middot; generated ${generatedAt}</p>

<h2>Licenses in use</h2>
${licenseWarningBanner}
<table id="license-summary">
    <thead><tr><th>License</th><th class="num">Components</th><th>Share</th><th>OSI approved</th><th>Permissive / Copyleft</th></tr></thead>
    <tbody>${licenseSummaryRows}
    </tbody>
</table>

<h2>Components</h2>
<input id="filter" type="text" placeholder="Filter by name or license...">
<p id="component-count"></p>
<table id="components">
    <thead><tr><th>Name</th><th>Version</th><th>License(s)</th></tr></thead>
    <tbody>${componentRows}
    </tbody>
</table>

<script>
    const filterInput = document.getElementById("filter");
    const rows = [...document.querySelectorAll("#components tbody tr")];
    const countLabel = document.getElementById("component-count");

    function applyFilter() {
        const term = filterInput.value.trim().toLowerCase();
        let visible = 0;

        rows.forEach((row) => {
            const matches = !term
                || row.dataset.name.includes(term)
                || row.dataset.license.includes(term);
            row.style.display = matches ? "" : "none";
            if (matches) visible++;
        });

        countLabel.textContent = visible + " of " + rows.length + " components shown";
    }

    filterInput.addEventListener("input", applyFilter);
    applyFilter();
</script>
</body>
</html>
`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(`SBOM report written to ${outputPath} (${components.length} components, ${licenseSummary.length} distinct licenses)`);
