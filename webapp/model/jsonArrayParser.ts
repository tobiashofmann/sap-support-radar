/**
 * Discriminated-union result of {@link parseJsonArrayOfObjects}. Carries the
 * failure kind instead of showing an error message itself, since the i18n
 * text differs per caller (PAM vs. own-products data, App vs. Main vs.
 * MyProducts controller).
 */
export type JsonArrayParseResult =
    | { kind: "parseError" }
    | { kind: "notArray" }
    | { kind: "invalidEntries" }
    | { kind: "ok"; data: Record<string, unknown>[] };

/**
 * Validates uploaded JSON file content against the shape expected by
 * PAM.json/OwnProducts.json: an array of plain objects.
 * @param fileContent The raw file content to parse
 * @returns The parsed data on success, or which validation step failed
 */
export function parseJsonArrayOfObjects(fileContent: string): JsonArrayParseResult {
    let parsedContent: unknown;

    try {
        parsedContent = JSON.parse(fileContent);
    } catch {
        return { kind: "parseError" };
    }

    if (!Array.isArray(parsedContent)) {
        return { kind: "notArray" };
    }

    const containsInvalidEntry = parsedContent.some((entry) => {
        return (
            typeof entry !== "object" ||
            entry === null ||
            Array.isArray(entry)
        );
    });

    if (containsInvalidEntry) {
        return { kind: "invalidEntries" };
    }

    return { kind: "ok", data: parsedContent as Record<string, unknown>[] };
}
