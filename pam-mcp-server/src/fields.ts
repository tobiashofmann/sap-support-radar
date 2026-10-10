/**
 * Metadata for every PAM entry field this server knows how to filter/list by.
 *
 * Mirrors the key mapping produced by `scripts/import-pam-csv.js` (see
 * de.itsfullofstars.sap.pam's CLAUDE.md "Column/field conventions"): PAM.json
 * keys are short, stable identifiers derived from SAP's verbose CSV column
 * headers. The four `lts`/`eocp`/`sapuiversion`/`frontendserver` fields only
 * exist on entries produced by `npm run pam:import -- --ui5` (OpenUI5 version
 * data merged into the PAM export) - they are always declared here so the
 * server's tool schema doesn't need to change depending on which PAM.json
 * variant is currently loaded, but filtering by them simply yields no
 * matches against a PAM.json that doesn't have them.
 *
 * `matchMode` drives how a filter value is compared against an entry's raw
 * field value (see src/filtering.ts):
 *  - "exact"    - case-insensitive, whole-value match. Used for fields whose
 *                 values are drawn from a small, well-known vocabulary
 *                 (status/date/flag fields) or that identify a specific
 *                 record (version), where a partial match would be
 *                 surprising.
 *  - "contains" - case-insensitive substring match. Used for free-text
 *                 identity fields (official name, product, product line,
 *                 category) where a caller is more likely to know a
 *                 recognizable fragment than the exact SAP-registered string.
 */
export type FieldMatchMode = "exact" | "contains";

export interface FieldDefinition {
    /** The PAM.json property name. */
    key: string;
    /** Human-readable label (matches SAP's own PAM column naming). */
    label: string;
    /** How a filter value for this field is matched against entry values. */
    matchMode: FieldMatchMode;
    /** Short explanation of what the field represents. */
    description: string;
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
    { key: "version", label: "Product Version", matchMode: "exact", description: "The specific product version, e.g. \"SAP S/4HANA 2025\"." },
    { key: "name", label: "Official Name", matchMode: "contains", description: "The product version's official SAP name." },
    { key: "product", label: "Product", matchMode: "contains", description: "The product this version belongs to, e.g. \"SAP S/4HANA\"." },
    { key: "line", label: "Product Line", matchMode: "contains", description: "The product line/family this version belongs to." },
    { key: "category", label: "Product Category", matchMode: "contains", description: "The product category, e.g. \"Enterprise Resource Planning\"." },
    { key: "addOn", label: "Add-On Product Version", matchMode: "exact", description: "Whether this entry is an add-on product version (\"Yes\"/\"No\")." },
    { key: "status", label: "Current Status", matchMode: "exact", description: "The lifecycle status, e.g. \"Unrestricted available\", \"Out of maintenance\"." },
    { key: "ra_puna", label: "Restricted available (productive use not allowed)", matchMode: "exact", description: "Date (dd.mm.yyyy) the version became restricted-available, productive use not allowed." },
    { key: "ra_pua", label: "Restricted available (productive use allowed)", matchMode: "exact", description: "Date (dd.mm.yyyy) the version became restricted-available, productive use allowed." },
    { key: "ua", label: "Unrestricted available", matchMode: "exact", description: "Date (dd.mm.yyyy) the version became unrestricted-available." },
    { key: "hanaStatus", label: "Readiness Status for SAP HANA", matchMode: "exact", description: "SAP HANA readiness status, e.g. \"Ready\"." },
    { key: "hanaDate", label: "Readiness Date for SAP HANA", matchMode: "exact", description: "Date (dd.mm.yyyy) the SAP HANA readiness status was reached." },
    { key: "eomm", label: "End of mainstream maintenance", matchMode: "exact", description: "Date (dd.mm.yyyy) mainstream maintenance ends." },
    { key: "eom", label: "End of extended maintenance", matchMode: "exact", description: "Date (dd.mm.yyyy) extended maintenance ends." },
    { key: "eop1", label: "End of Priority-One Support", matchMode: "exact", description: "Date (dd.mm.yyyy) Priority-One support ends." },
    { key: "eosk", label: "End of SAP S/4HANA Cloud Safekeeper Service", matchMode: "exact", description: "Date (dd.mm.yyyy) the SAP S/4HANA Cloud Safekeeper Service ends." },
    { key: "url", label: "SAP Support Portal URL", matchMode: "exact", description: "URL to this product version in the SAP Support Portal." },
    { key: "lts", label: "Long-Term Support (OpenUI5)", matchMode: "exact", description: "OpenUI5-only: whether the version is a Long-Term Support release (\"true\"/\"false\"). Only present when PAM.json was generated with --ui5." },
    { key: "eocp", label: "End of Cloud Provisioning (OpenUI5)", matchMode: "exact", description: "OpenUI5-only: date/period cloud provisioning ends. Only present when PAM.json was generated with --ui5." },
    { key: "sapuiversion", label: "SAPUI5 distribution / ABAP compatibility (OpenUI5)", matchMode: "exact", description: "OpenUI5-only: the corresponding SAPUI5 distribution or ABAP compatibility info, or \"Cloud only\". Only present when PAM.json was generated with --ui5." },
    { key: "frontendserver", label: "SAP Fiori front-end server compatibility (OpenUI5)", matchMode: "exact", description: "OpenUI5-only: compatible SAP Fiori front-end server versions. Only present when PAM.json was generated with --ui5." }
];

export const FIELD_KEYS = FIELD_DEFINITIONS.map((field) => field.key) as [string, ...string[]];

export const FIELD_DEFINITION_BY_KEY: ReadonlyMap<string, FieldDefinition> = new Map(
    FIELD_DEFINITIONS.map((field) => [field.key, field])
);
