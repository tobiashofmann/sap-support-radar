/**
 * Plain DOM utility (no UI5 dependency) for the "hidden `<input type=file>`"
 * upload dialog pattern, previously duplicated with identical boilerplate
 * across the App, Main and MyProducts controllers.
 *
 * Opens the browser's file picker restricted to `.json` files and reads the
 * selected file as text.
 * @param onContent Called with the selected file's text content once read
 * @param onError Called if reading the selected file fails
 */
export function pickJsonFile(
    onContent: (fileContent: string) => void,
    onError: () => void
): void {
    const fileInput = document.createElement("input");

    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.style.display = "none";

    fileInput.addEventListener("change", () => {
        const selectedFile = fileInput.files?.[0];

        if (document.body.contains(fileInput)) {
            document.body.removeChild(fileInput);
        }

        if (!selectedFile) {
            return;
        }

        const fileReader = new FileReader();

        fileReader.onload = () => {
            // readAsText() always yields a string (or null) result, never an ArrayBuffer
            onContent(typeof fileReader.result === "string" ? fileReader.result : "");
        };

        fileReader.onerror = () => {
            onError();
        };

        fileReader.readAsText(selectedFile);
    });

    document.body.appendChild(fileInput);
    fileInput.click();
}
