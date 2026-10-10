import { getRelativePeriodEnd } from "./supportEndThresholds";

/**
 * Shared date helpers for PAM's own dd.mm.yyyy format. Until recently these
 * were duplicated (with partially diverging behavior, see
 * {@link isDateWithinRelativePeriod}) across the Main, SupportStatus and
 * ProductDetail controllers.
 *
 * Deliberately plain, free functions rather than controller methods: this
 * lets them be passed around unbound - e.g. directly as a Sorter#comparator -
 * without the `this`-binding pitfalls of passing a class method as a
 * callback (see Main.controller.ts history: passing the bare method
 * reference `this.compareDates` to a Sorter would throw a TypeError as soon
 * as the table got sorted by a date field, since the Sorter calls the
 * comparator without a bound `this`).
 */

/**
 * Parses a PAM date value (a "dd.mm.yyyy" string) into a `Date` normalized
 * to midnight local time. Returns `null` for anything else, including
 * unparseable or calendar-invalid strings (e.g. "31.02.2026"), and for the
 * non-dd.mm.yyyy strings PAM sometimes uses for UI5 entries (e.g.
 * "Q3/2027") - every value reaching this function originates from
 * JSON-parsed PAM/OwnProducts data, which can never contain a `Date`.
 * @param value The raw value to parse
 * @returns The parsed date, or `null` if it could not be parsed
 */
export function parseGermanDate(value: unknown): Date | null {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const parts = value.trim().split(".");

    if (parts.length !== 3) {
        return null;
    }

    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    if (
        !Number.isInteger(day) ||
        !Number.isInteger(month) ||
        !Number.isInteger(year)
    ) {
        return null;
    }

    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    date.setHours(0, 0, 0, 0);

    return date;
}

/**
 * Comparator for sorting raw PAM date values (parsed via
 * {@link parseGermanDate}) in ascending order. Unparseable values sort last,
 * regardless of which side of the comparison they're on.
 * @param value1 The first raw date value
 * @param value2 The second raw date value
 * @returns A negative number if value1 is earlier, positive if later, 0 if equal or both unparseable
 */
export function compareDates(value1: unknown, value2: unknown): number {
    const date1 = parseGermanDate(value1);
    const date2 = parseGermanDate(value2);

    if (date1 === null && date2 === null) {
        return 0;
    }

    if (date1 === null) {
        return 1;
    }

    if (date2 === null) {
        return -1;
    }

    return date1.getTime() - date2.getTime();
}

/**
 * Checks whether a raw PAM date value falls within "months" months from
 * today (inclusive of today). The period ends on the last day of the target
 * month, see {@link getRelativePeriodEnd} in supportEndThresholds.ts.
 * @param value The raw date value to check
 * @param months How many months from today the period extends
 * @returns `true` if the parsed date lies within that period
 */
export function isDateWithinRelativePeriod(
    value: unknown,
    months: number
): boolean {
    const maintenanceDate = parseGermanDate(value);

    if (maintenanceDate === null) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        maintenanceDate.getTime() >= today.getTime() &&
        maintenanceDate.getTime() <= getRelativePeriodEnd(today, months).getTime()
    );
}
