/**
 * The known "Current Status" PAM values (official SAP terminology, see
 * CLAUDE.md's "Column/field conventions") and the sap.ui.core.ValueState
 * used to highlight them. Centralized here - rather than duplicated as
 * literal strings in both the product detail page and the "create product"
 * form - because "Restricted available  (productive use allowed)" has a
 * double space that must match the raw PAM export exactly.
 */
export const CURRENT_STATUS_STATE: Record<string, string> = {
    "Unrestricted available": "Success",
    "Restricted available  (productive use allowed)": "Warning",
    "In extended maintenance": "Warning",
    "In customer-specific maintenance": "Information",
    "Not yet available": "Information",
    "SAP S/4HANA Cloud Safekeeper Service available for private Cloud cust.": "Information",
    "Out of maintenance": "Error"
};

/** The known status values, in lifecycle order (oldest/earliest phase first), for the "create product" form's dropdown. */
export const CURRENT_STATUS_VALUES: string[] = [
    "Not yet available",
    "Unrestricted available",
    "Restricted available  (productive use allowed)",
    "In extended maintenance",
    "In customer-specific maintenance",
    "SAP S/4HANA Cloud Safekeeper Service available for private Cloud cust.",
    "Out of maintenance"
];
