import BaseController from "./BaseController";

import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import { Router$RoutePatternMatchedEvent } from "sap/ui/core/routing/Router";

import { parseJsonArrayOfObjects } from "../model/jsonArrayParser";
import { pickJsonFile } from "../util/JsonFileUpload";

/**
 * @namespace de.itsfullofstars.sap.pam.controller
 */
export default class App extends BaseController {
    /** Sets up the "navigation" model used to highlight the active nav tab, and wires route tracking. */
    public onInit(): void {
        this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

        this.setModel(new JSONModel({
            activeRoute: ""
        }), "navigation");

        this.getRouter().attachRoutePatternMatched(this.onAnyRouteMatched.bind(this));
    }

    /**
     * Tracks which route is currently active, so the navigation tabs in the
     * app toolbar can highlight the current page via color/underline (see
     * pamNavTab/pamNavTabActive in css/style.css).
     * @param oEvent The routePatternMatched event of the router
     */
    private onAnyRouteMatched(oEvent: Router$RoutePatternMatchedEvent): void {
        const routeName = oEvent.getParameter("name");
        const navigationModel = this.getModel("navigation") as JSONModel;

        navigationModel.setProperty("/activeRoute", routeName ?? "");
    }

    /** Navigates to the Main (product table) route. */
    public onNavigateToMain(): void {
        this.getRouter().navTo("main");
    }

    /** Navigates to the SupportStatus route. */
    public onNavigateToSupportStatus(): void {
        this.getRouter().navTo("supportstatus");
    }

    /** Navigates to the MyProducts route. */
    public onNavigateToMyProducts(): void {
        this.getRouter().navTo("myproducts");
    }

    /** Opens a file picker and replaces the global "pam" model with the uploaded JSON. */
    public onUploadPamJson(): void {
        pickJsonFile(
            (fileContent) => this.replacePamModel(fileContent),
            () => MessageBox.error(this.getText("msg.pamFileReadError"))
        );
    }

    /** Opens a file picker and replaces the global "ownProducts" model with the uploaded JSON. */
    public onUploadOwnProducts(): void {
        pickJsonFile(
            (fileContent) => this.replaceOwnProductsModel(fileContent),
            () => MessageBox.error(this.getText("msg.ownProductsFileReadError"))
        );
    }

    /**
     * Validates the uploaded file content and, on success, replaces the
     * "pam" model's data wholesale.
     * @param fileContent The raw text content of the uploaded file
     */
    private replacePamModel(
        fileContent: string
    ): void {
        const result = parseJsonArrayOfObjects(fileContent);

        switch (result.kind) {
            case "parseError":
                MessageBox.error(this.getText("msg.invalidJson"));
                return;
            case "notArray":
                MessageBox.error(this.getText("msg.pamFileMustBeArray"));
                return;
            case "invalidEntries":
                MessageBox.error(this.getText("msg.pamFileInvalidEntries"));
                return;
        }

        const pamModel = this.getOwnerComponent()
            .getModel("pam") as JSONModel;

        if (!pamModel) {
            MessageBox.error(
                this.getText("msg.pamModelUnavailable")
            );
            return;
        }

        pamModel.setData(result.data);

        MessageToast.show(
            this.getText("msg.pamEntriesLoaded", [result.data.length])
        );
    }

    /**
     * Validates the uploaded file content and, on success, replaces the
     * "ownProducts" model's data wholesale.
     * @param fileContent The raw text content of the uploaded file
     */
    private replaceOwnProductsModel(
        fileContent: string
    ): void {
        const result = parseJsonArrayOfObjects(fileContent);

        switch (result.kind) {
            case "parseError":
                MessageBox.error(this.getText("msg.invalidJson"));
                return;
            case "notArray":
                MessageBox.error(this.getText("msg.ownProductsFileMustBeArray"));
                return;
            case "invalidEntries":
                MessageBox.error(this.getText("msg.ownProductsFileInvalidEntries"));
                return;
        }

        const ownProductsModel = this.getOwnerComponent()
            .getModel("ownProducts") as JSONModel;

        if (!ownProductsModel) {
            MessageBox.error(
                this.getText("msg.ownProductsModelUnavailable")
            );
            return;
        }

        ownProductsModel.setData(result.data);

        MessageToast.show(
            this.getText("msg.ownProductsLoaded", [result.data.length])
        );
    }
}
