/** One "support end approaching" threshold: within `months`, highlight as `state`. */
export interface SupportEndThreshold {
    months: number;
    state: "Error" | "Warning";
}

/**
 * Central, configurable color coding for "support end approaching"
 * highlighting. Used by the product detail page (lifecycle milestones), the
 * row highlighting in the product table (Main view) and the support status
 * view. Order matters: the first matching (smallest) threshold wins. A
 * date that has already passed automatically gets the most urgent (first)
 * state.
 */
export const SUPPORT_END_THRESHOLDS: SupportEndThreshold[] = [
    { months: 6, state: "Error" },
    { months: 12, state: "Warning" }
];

/** Display color per `sap.ui.core.ValueState` name used for the thresholds above. */
export const SUPPORT_END_STATE_COLOR: Record<string, string> = {
    Error: "#dc2626",
    Warning: "#f59e0b",
    None: "#9ca3af"
};

/**
 * Returns the end of the period that is `months` months from `today`: the
 * last day of the target month, at 23:59:59.999.
 * @param today The reference date
 * @param months How many months from today the period extends
 * @returns The end of that period
 */
export function getRelativePeriodEnd(today: Date, months: number): Date {
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + months + 1, 0);
    periodEnd.setHours(23, 59, 59, 999);
    return periodEnd;
}

/**
 * Returns the ValueState ("Error"/"Warning"/"None") for a date relative to
 * "today", according to {@link SUPPORT_END_THRESHOLDS}. A date that has
 * already passed is automatically treated as the most urgent case (first
 * threshold).
 * @param date The date to classify, or `null` if none is set
 * @param today The reference date
 * @returns The matching ValueState name, or "None" if no threshold matches
 */
export function getSupportEndState(date: Date | null, today: Date): string {
    if (date === null) {
        return "None";
    }

    if (date.getTime() < today.getTime()) {
        return SUPPORT_END_THRESHOLDS[0]?.state ?? "Error";
    }

    const match = SUPPORT_END_THRESHOLDS.find((threshold) => {
        return date.getTime() <= getRelativePeriodEnd(today, threshold.months).getTime();
    });

    return match?.state ?? "None";
}
