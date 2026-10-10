import BaseController from "./BaseController";

import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";

import { getSupportEndState, SUPPORT_END_STATE_COLOR } from "../model/supportEndThresholds";
import { parseGermanDate } from "../model/germanDate";
import { PamProduct, createProductKey } from "../model/productKey";
import { CURRENT_STATUS_STATE } from "../model/currentStatus";

type PamEntry = PamProduct;

interface DetailField {
    label: string;
    value: string;
}

interface Milestone {
    label: string;
    date: string;
    color: string;
    size: string;
}

const DETAIL_FIELD_PATHS: Array<{ labelKey: string; path: string }> = [
    { labelKey: "field.addOn", path: "addOn" },
    { labelKey: "field.hanaStatus", path: "hanaStatus" },
    { labelKey: "field.hanaDate", path: "hanaDate" },
    { labelKey: "field.eop1", path: "eop1" },
    { labelKey: "field.eosk", path: "eosk" }
];

/*
* Fields that only exist on UI5 entries (product === "SAP UI5", see
* scripts/import-pam-csv.js --ui5) - shown in their own card, see
* isUi5Entry/ui5Fields.
*/
const UI5_PRODUCT_NAME = "SAP UI5";

const UI5_DETAIL_FIELD_PATHS: Array<{ labelKey: string; path: string }> = [
    { labelKey: "field.lts", path: "lts" },
    { labelKey: "field.eocp", path: "eocp" },
    { labelKey: "field.sapuiversion", path: "sapuiversion" },
    { labelKey: "field.frontendserver", path: "frontendserver" }
];

/*
* Chronological order of the lifecycle phases (old -> new -> future). Used
* both to determine the "currently active" milestone (the last entry in
* this list whose date has already been reached) and - reversed - as the
* display order (EOM at the top, oldest phase at the bottom).
*
* "activeColor" is the color used when this milestone is the currently
* active one: the availability phases (ra_puna/ra_pua/ua) are then a
* positive, ongoing state (green). EOMM/EOM instead mark reaching or
* passing a support-end date - if one of them is the currently active
* milestone, mainstream/overall support has already ended, which is
* critical (red), not positive.
*/
const MILESTONE_ORDER: Array<{ labelKey: string; path: string; activeColor: string }> = [
    { labelKey: "field.ra_puna", path: "ra_puna", activeColor: "#16a34a" },
    { labelKey: "field.ra_pua", path: "ra_pua", activeColor: "#16a34a" },
    { labelKey: "field.ua", path: "ua", activeColor: "#16a34a" },
    { labelKey: "field.eomm", path: "eomm", activeColor: SUPPORT_END_STATE_COLOR.Error },
    { labelKey: "field.eom", path: "eom", activeColor: SUPPORT_END_STATE_COLOR.Error }
];

const MILESTONE_COLOR_NEUTRAL = SUPPORT_END_STATE_COLOR.None;

const MILESTONE_DOT_SIZE = "0.85rem";
const MILESTONE_DOT_SIZE_ACTIVE = "1.7rem";

/**
 * @namespace de.itsfullofstars.sap.pam.controller
 */
export default class ProductDetail extends BaseController {
    /** Wires up the "productdetail/{index}" route handler. */
    public onInit(): void {
        this.getRouter()
            .getRoute("productdetail")
            ?.attachPatternMatched(this.onRouteMatched.bind(this));
    }

    /**
     * Binds the view to the PAM entry addressed by the route's `index`
     * argument and rebuilds the "detail" model.
     * @param oEvent The patternMatched event of the "productdetail" route
     */
    private onRouteMatched(oEvent: Route$PatternMatchedEvent): void {
        const oArgs = oEvent.getParameter("arguments") as { index?: string } | undefined;
        const sIndex = oArgs?.index;

        if (sIndex === undefined) {
            return;
        }

        this.getView().bindElement({
            path: `/${sIndex}`,
            model: "pam"
        });

        this.updateDetailFields(sIndex);
    }

    /**
     * Builds the "detail" model (fields, milestones, own-product flag, UI5
     * fields) for the PAM entry at the given index.
     * @param sIndex The entry's index into the "pam" model's underlying array
     */
    private updateDetailFields(sIndex: string): void {
        const pamModel = this.getOwnerComponent().getModel("pam") as JSONModel;
        const entry = pamModel.getProperty(`/${sIndex}`) as PamEntry | undefined;

        const fields: DetailField[] = DETAIL_FIELD_PATHS.map((definition) => {
            const value = entry ? entry[definition.path] : undefined;

            return {
                label: this.getText(definition.labelKey),
                value: this.formatFieldValue(value)
            };
        });

        const isUi5Entry = entry?.product === UI5_PRODUCT_NAME;
        const ui5Fields: DetailField[] = isUi5Entry
            ? UI5_DETAIL_FIELD_PATHS.map((definition) => ({
                label: this.getText(definition.labelKey),
                value: this.formatUi5FieldValue(definition.path, entry ? entry[definition.path] : undefined)
            }))
            : [];

        const milestones = this.buildMilestones(entry);
        const isOwnProduct = this.isOwnProduct(entry);

        this.setModel(new JSONModel({ fields, milestones, isOwnProduct, isUi5Entry, ui5Fields }), "detail");
    }

    /**
     * Formats one UI5-only field's value. "lts" is a boolean (true/false),
     * all other UI5 fields are strings like in DETAIL_FIELD_PATHS - hence
     * this own, small formatting instead of the generic fields map above.
     * @param path The UI5 field's PAM key (see UI5_DETAIL_FIELD_PATHS)
     * @param value The raw field value
     * @returns The display string
     */
    private formatUi5FieldValue(path: string, value: unknown): string {
        if (path === "lts") {
            return value === true ? this.getText("detail.yes") : this.getText("detail.no");
        }

        return this.formatFieldValue(value);
    }

    /**
     * Formats a generic PAM field value for display, falling back to "–"
     * for empty/missing values. PAM fields are always primitive JSON values
     * (string/number/boolean), never nested objects - see
     * scripts/import-pam-csv.js. The explicit typeof check proves that to
     * TypeScript too, instead of blindly calling String(value) on an
     * unknown value.
     * @param value The raw field value
     * @returns The display string, or "–" if empty/missing
     */
    private formatFieldValue(value: unknown): string {
        if (value === null || value === undefined || value === "") {
            return "–";
        }

        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }

        return "–";
    }

    /**
     * Checks whether the given PAM entry is part of the user's own product
     * selection, by product key (see {@link createProductKey}).
     * @param entry The PAM entry to check, or `undefined` if none is bound
     * @returns `true` if the entry is part of "ownProducts"
     */
    private isOwnProduct(entry: PamEntry | undefined): boolean {
        if (!entry) {
            return false;
        }

        const ownProductsModel = this.getOwnerComponent().getModel("ownProducts") as JSONModel;
        const ownProducts = ownProductsModel?.getData() as PamEntry[] | undefined;

        if (!Array.isArray(ownProducts)) {
            return false;
        }

        const key = createProductKey(entry);

        return ownProducts.some((product) => createProductKey(product) === key);
    }

    /** Adds or removes the currently viewed PAM entry from the user's own product selection. */
    public onToggleOwnProduct(): void {
        const context = this.getView().getBindingContext("pam");
        const entry = context?.getObject() as PamEntry | undefined;

        if (!entry) {
            return;
        }

        const ownProductsModel = this.getOwnerComponent().getModel("ownProducts") as JSONModel;

        if (!ownProductsModel) {
            return;
        }

        const ownProducts = ownProductsModel.getData() as PamEntry[] | undefined;
        const products = Array.isArray(ownProducts) ? ownProducts : [];
        const key = createProductKey(entry);
        const wasOwnProduct = products.some((product) => createProductKey(product) === key);

        const updatedProducts = wasOwnProduct
            ? products.filter((product) => createProductKey(product) !== key)
            : [...products, { ...entry }];

        ownProductsModel.setData(updatedProducts);

        const detailModel = this.getModel("detail") as JSONModel;
        detailModel.setProperty("/isOwnProduct", !wasOwnProduct);

        MessageToast.show(
            wasOwnProduct
                ? this.getText("msg.productRemovedFromOwnProducts")
                : this.getText("msg.productAddedToOwnProducts")
        );
    }

    /** Formatter for the "add/remove own product" button's text. */
    public ownProductButtonText(isOwnProduct: boolean): string {
        return isOwnProduct
            ? this.getText("detail.removeFromOwnProducts")
            : this.getText("detail.addToOwnProducts");
    }

    /** Formatter for the "add/remove own product" button's icon. */
    public ownProductButtonIcon(isOwnProduct: boolean): string {
        return isOwnProduct ? "sap-icon://less" : "sap-icon://add";
    }

    /** Formatter for the "add/remove own product" button's type. */
    public ownProductButtonType(isOwnProduct: boolean): string {
        return isOwnProduct ? "Reject" : "Emphasized";
    }

    /**
     * Determines a color per milestone:
     * - the most recently reached milestone (current state) is colored
     *   according to its milestone type (see MILESTONE_ORDER.activeColor):
     *   green for the availability phases, red for EOMM/EOM, since
     *   reaching those means the end of (mainstream) support,
     * - all earlier (past) milestones are shown in gray,
     * - future milestones follow the central, configurable red/yellow
     *   threshold from model/supportEndThresholds.ts (default: red within
     *   6 months, yellow within 12 months, gray otherwise).
     * Display order is the reverse of the chronological order (EOM at the
     * top, oldest phase at the bottom).
     * @param entry The PAM entry to build milestones for, or `undefined` if none is bound
     * @returns The milestones to render, newest first
     */
    private buildMilestones(entry: PamEntry | undefined): Milestone[] {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parsed = MILESTONE_ORDER.map((definition) => {
            const value = entry ? entry[definition.path] : undefined;
            const dateText = typeof value === "string" ? value.trim() : "";

            return {
                label: this.getText(definition.labelKey),
                dateText,
                date: dateText ? parseGermanDate(dateText) : null,
                activeColor: definition.activeColor
            };
        });

        let activeIndex = -1;

        parsed.forEach((milestone, index) => {
            if (milestone.date !== null && milestone.date.getTime() <= today.getTime()) {
                activeIndex = index;
            }
        });

        const milestones = parsed.map((milestone, index) => {
            if (milestone.date === null) {
                return null;
            }

            let color: string;

            if (index === activeIndex) {
                color = milestone.activeColor;
            } else if (milestone.date.getTime() < today.getTime()) {
                color = MILESTONE_COLOR_NEUTRAL;
            } else {
                color = SUPPORT_END_STATE_COLOR[getSupportEndState(milestone.date, today)]
                    ?? MILESTONE_COLOR_NEUTRAL;
            }

            return {
                label: milestone.label,
                date: milestone.dateText,
                color,
                size: index === activeIndex ? MILESTONE_DOT_SIZE_ACTIVE : MILESTONE_DOT_SIZE
            };
        }).filter((milestone): milestone is Milestone => milestone !== null);

        return milestones.reverse();
    }

    /**
     * Formatter for the support-end date shown in the title area.
     * @param value The raw (dd.mm.yyyy) support end date value
     * @returns The date string, or a "no end date" placeholder text if unparseable
     */
    public supportStatusText(value: unknown): string {
        if (typeof value !== "string" || parseGermanDate(value) === null) {
            return this.getText("detail.noEndDate");
        }

        return value;
    }

    /**
     * ValueState formatter for the support-end date shown in the title area.
     * @param value The raw (dd.mm.yyyy) support end date value
     * @returns A sap.ui.core.ValueState name ("Error"/"Warning"/"Success"/"None")
     */
    public supportStatusState(value: unknown): string {
        const date = parseGermanDate(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const state = getSupportEndState(date, today);

        /*
        * Outside the red/yellow thresholds and with a maintained date,
        * support is still considered non-critical (green), not neutral.
        */
        return date !== null && state === "None" ? "Success" : state;
    }

    /** Icon formatter matching {@link supportStatusState}'s ValueState. */
    public supportStatusIcon(value: unknown): string {
        switch (this.supportStatusState(value)) {
            case "Error":
                return "sap-icon://error";
            case "Warning":
                return "sap-icon://alert";
            case "Success":
                return "sap-icon://accept";
            default:
                return "sap-icon://question-mark";
        }
    }

    /**
     * ValueState formatter for the "Current Status" field.
     * @param value The raw "status" field value
     * @returns A sap.ui.core.ValueState name, or "None" if unmapped
     */
    public currentStatusState(value: unknown): string {
        return typeof value === "string"
            ? CURRENT_STATUS_STATE[value] ?? "None"
            : "None";
    }

    /** Opens the entry's SAP Support Portal URL in a new tab, if set. */
    public onOpenSupportPortal(): void {
        const context = this.getView().getBindingContext("pam");
        const url = context?.getProperty("url") as string | undefined;

        if (url) {
            window.open(url, "_blank", "noopener");
        }
    }
}
