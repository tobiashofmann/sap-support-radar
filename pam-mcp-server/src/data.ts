import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A single PAM entry, as loaded from PAM.json. Field values are raw strings
 * (dates stay dd.mm.yyyy) - see src/fields.ts for the known keys and what
 * each one represents.
 */
export interface PamProduct {
    [key: string]: unknown;
}

const moduleDir = dirname(fileURLToPath(import.meta.url));

/**
 * Default location of the PAM data file: de.itsfullofstars.sap.pam's
 * webapp/model/PAM.json, resolved relative to this module rather than the
 * process's current working directory, so the server works regardless of
 * where it's launched from. Both `src/data.ts` (via `tsx`) and the compiled
 * `dist/data.js` sit exactly one directory level inside pam-mcp-server/,
 * which itself sits at the repository root next to webapp/ - so the same
 * relative path resolves correctly in both dev and built execution.
 */
const DEFAULT_PAM_JSON_PATH = resolve(moduleDir, "../../webapp/model/PAM.json");

/**
 * Resolves the PAM data file path to load: the `PAM_JSON_PATH` environment
 * variable if set (useful to point the server at an uploaded/custom PAM
 * export instead of the bundled one), otherwise the default location.
 */
export function resolvePamJsonPath(): string {
    return process.env.PAM_JSON_PATH
        ? resolve(process.cwd(), process.env.PAM_JSON_PATH)
        : DEFAULT_PAM_JSON_PATH;
}

let cachedEntries: PamProduct[] | undefined;
let cachedPath: string | undefined;

/**
 * Loads and caches the PAM entries array from disk. Re-reads the file if the
 * resolved path has changed since the last call (e.g. `PAM_JSON_PATH` set
 * between calls in a test), but otherwise serves the in-memory cache - the
 * app itself only ever replaces this file by re-running `npm run pam:import`
 * or re-uploading in the browser, neither of which affects a running server
 * process.
 */
export function loadPamEntries(): PamProduct[] {
    const pamJsonPath = resolvePamJsonPath();

    if (cachedEntries && cachedPath === pamJsonPath) {
        return cachedEntries;
    }

    let raw: string;

    try {
        raw = readFileSync(pamJsonPath, "utf8");
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Could not read PAM data file at "${pamJsonPath}": ${reason}. ` +
            `Generate it via "npm run pam:import" in the main project, or set ` +
            `the PAM_JSON_PATH environment variable to point at a PAM.json file.`,
            { cause: error }
        );
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`PAM data file at "${pamJsonPath}" is not valid JSON: ${reason}`, { cause: error });
    }

    if (!Array.isArray(parsed)) {
        throw new Error(`PAM data file at "${pamJsonPath}" must contain a JSON array of entries.`);
    }

    cachedEntries = parsed as PamProduct[];
    cachedPath = pamJsonPath;

    return cachedEntries;
}
