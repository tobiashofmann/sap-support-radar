import BaseController from "./BaseController";

import Input from "sap/m/Input";
import Select from "sap/m/Select";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import Event from "sap/ui/base/Event";

import { CURRENT_STATUS_VALUES } from "../model/currentStatus";
import { PamProduct } from "../model/productKey";

/** Maps each form control's view id to the PAM field it edits, mirroring the product detail page's fields. */
const FORM_FIELDS: Array<{ id: string; path: string }> = [
    { id: "addProductVersion", path: "version" },
    { id: "addProductName", path: "name" },
    { id: "addProductProduct", path: "product" },
    { id: "addProductLine", path: "line" },
    { id: "addProductCategory", path: "category" },
    { id: "addProductAddOn", path: "addOn" },
    { id: "addProductStatus", path: "status" },
    { id: "addProductRaPuna", path: "ra_puna" },
    { id: "addProductRaPua", path: "ra_pua" },
    { id: "addProductUa", path: "ua" },
    { id: "addProductHanaStatus", path: "hanaStatus" },
    { id: "addProductHanaDate", path: "hanaDate" },
    { id: "addProductEomm", path: "eomm" },
    { id: "addProductEom", path: "eom" },
    { id: "addProductEop1", path: "eop1" },
    { id: "addProductEosk", path: "eosk" },
    { id: "addProductUrl", path: "url" }
];

/** Form control ids that must have a value before the product can be saved. */
const REQUIRED_FIELD_IDS: string[] = [
    "addProductVersion",
    "addProductName",
    "addProductEomm"
];

/**
 * @namespace de.itsfullofstars.sap.pam.controller
 */
export default class MyProductsAdd extends BaseController {
    /** Sets up the status dropdown's options and wires the route handler that resets the form. */
    public onInit(): void {
        const statusOptionsModel = new JSONModel([
            { key: "", text: this.getText("myProducts.notSpecified") },
            ...CURRENT_STATUS_VALUES.map((value) => ({ key: value, text: value }))
        ]);

        this.setModel(statusOptionsModel, "statusOptions");

        this.getRouter()
            .getRoute("myproductsadd")
            ?.attachPatternMatched(this.onRouteMatched.bind(this));
    }

    /** Resets the (possibly still-filled) form whenever this route is (re-)entered. */
    private onRouteMatched(): void {
        this.resetForm();
    }

    /** Reads one form control's current value, trimmed. */
    private getControlValue(id: string): string {
        const control = this.byId(id);

        if (control instanceof Select) {
            return control.getSelectedKey().trim();
        }

        if (control instanceof Input) {
            return control.getValue().trim();
        }

        return "";
    }

    /** Clears a required Input's error state as soon as it has a value again. */
    public onRequiredFieldChange(event: Event): void {
        const input = event.getSource<Input>();

        if (input.getValue().trim()) {
            input.setValueState("None");
        }
    }

    /**
     * Validates the required fields (see {@link REQUIRED_FIELD_IDS}),
     * marking empty ones with an inline error.
     * @returns `true` if all required fields have a value
     */
    private validateRequiredFields(): boolean {
        let allValid = true;
        let firstInvalidInput: Input | undefined;

        REQUIRED_FIELD_IDS.forEach((id) => {
            const input = this.byId(id) as Input;
            const isEmpty = !input.getValue().trim();

            input.setValueState(isEmpty ? "Error" : "None");
            input.setValueStateText(this.getText("msg.fieldRequired"));

            if (isEmpty) {
                allValid = false;
                firstInvalidInput ??= input;
            }
        });

        firstInvalidInput?.focus();

        return allValid;
    }

    /** Resets every form field back to blank/unselected and clears error states. */
    private resetForm(): void {
        FORM_FIELDS.forEach(({ id }) => {
            const control = this.byId(id);

            if (control instanceof Select) {
                control.setSelectedKey("");
            } else if (control instanceof Input) {
                control.setValue("");
                control.setValueState("None");
            }
        });
    }

    /**
     * Validates and, on success, appends the form's values as a new entry
     * to the "ownProducts" model, then returns to the MyProducts page.
     */
    public onSave(): void {
        if (!this.validateRequiredFields()) {
            MessageToast.show(this.getText("msg.myProductsMissingRequiredFields"));
            return;
        }

        const product = FORM_FIELDS.reduce<PamProduct>((entry, field) => {
            entry[field.path] = this.getControlValue(field.id);
            return entry;
        }, {});

        /*
         * MyProducts' and SupportStatus' tables only ever render rows from
         * the "pam" model (filtered down to the user's own-products
         * selection) - a manually created product needs a row there too,
         * or it would be saved into "ownProducts" yet never show up
         * anywhere. It is appended, never inserted, so it doesn't shift the
         * index-based productdetail/{index} route of any existing entry.
         */
        const pamModel = this.getOwnerComponent().getModel("pam") as JSONModel;
        const pamData = pamModel.getData() as PamProduct[] | undefined;
        const existingPamProducts = Array.isArray(pamData) ? pamData : [];

        pamModel.setData([...existingPamProducts, product]);

        const ownProductsModel = this.getOwnerComponent().getModel("ownProducts") as JSONModel;
        const ownProducts = ownProductsModel.getData() as PamProduct[] | undefined;
        const existingOwnProducts = Array.isArray(ownProducts) ? ownProducts : [];

        ownProductsModel.setData([...existingOwnProducts, { ...product }]);

        this.resetForm();

        MessageToast.show(this.getText("msg.productAddedToOwnProducts"));

        this.navTo("myproducts");
    }

    /** Discards the form and returns to the MyProducts page. */
    public onCancel(): void {
        this.resetForm();
        this.navTo("myproducts");
    }
}
