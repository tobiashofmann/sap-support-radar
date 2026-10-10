import BaseController from "./BaseController";

import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import SearchField from "sap/m/SearchField";
import Table from "sap/m/Table";
import ColumnListItem from "sap/m/ColumnListItem";
import SegmentedButton from "sap/m/SegmentedButton";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import FilterType from "sap/ui/model/FilterType";
import ListBinding from "sap/ui/model/ListBinding";
import { ListBase$SelectionChangeEvent } from "sap/m/ListBase";
import MessageBox from "sap/m/MessageBox";

import {
    PamProduct,
    PRODUCT_KEY_FIELDS,
    getProductFieldValue,
    createProductKey
} from "../model/productKey";
/**
 * @namespace de.itsfullofstars.sap.pam.controller
 */
export default class MyProducts extends BaseController {
    /** Product keys (see {@link createProductKey}) of the currently checked table rows. */
    private selectedProductKeys: Set<string> = new Set();

    private tableBinding?: ListBinding;

    /** Sets up the "myProducts" title model and loads the initial selection/count state. */
    public onInit(): void {

        const titleModel = new JSONModel({
            tableTitle: this.getText("myProducts.tableTitle", [0, 0])
        });

        this.setModel(
            titleModel,
            "myProducts"
        );

        this.loadSelectedProductsFromModel();
        this.updateProductCount();

        this.getRouter()
            .getRoute("myproducts")
            ?.attachPatternMatched(this.onRouteMatched.bind(this));
    }

    /** Updates the table title with the current "N of M products selected" count. */
    private updateProductCount(): void {
        const pamModel = this.getOwnerComponent()
            .getModel("pam") as JSONModel;

        const ownProductsModel = this.getOwnerComponent()
            .getModel("ownProducts") as JSONModel;

        const pamData = pamModel?.getData() as PamProduct[] | undefined;
        const ownProducts = ownProductsModel?.getData() as PamProduct[] | undefined;

        const totalCount = Array.isArray(pamData)
            ? pamData.length
            : 0;

        const ownProductsCount = Array.isArray(ownProducts)
            ? ownProducts.length
            : 0;

        const titleModel = this.getView()
            .getModel("myProducts") as JSONModel;

        if (!titleModel) {
            return;
        }

        titleModel.setProperty(
            "/tableTitle",
            this.getText("myProducts.tableTitle", [ownProductsCount, totalCount])
        );
    }

    /** Attaches the table binding listener and refreshes count/filters/selection. */
    public onAfterRendering(): void {
        this.attachTableBinding();
        this.updateProductCount();
        this.applyFilters();
        this.updateTableSelection();
    }

    /** Re-applies filters after the search field's value changes. */
    public onSearch(): void {
        this.applyFilters();
    }

    /** Re-applies filters after the "all"/"own" scope toggle changes. */
    public onProductScopeFilterChange(): void {
        this.applyFilters();
    }

    /** Rebuilds the table's filters from the search field and the "own products" scope toggle. */
    private applyFilters(): void {
        const table = this.byId("myProductsTable") as Table;
        const binding = table.getBinding("items") as ListBinding | undefined;

        if (!binding) {
            return;
        }

        const filters: Filter[] = [];

        const searchField = this.byId("myProductsSearch") as SearchField;
        const searchValue = searchField.getValue().trim();

        if (searchValue) {
            const searchFilters = PRODUCT_KEY_FIELDS.map((field) => {
                return new Filter(
                    field,
                    FilterOperator.Contains,
                    searchValue
                );
            });

            filters.push(
                new Filter({
                    filters: searchFilters,
                    and: false
                })
            );
        }

        const scopeFilter = this.byId(
            "productScopeFilter"
        ) as SegmentedButton;

        if (scopeFilter.getSelectedKey() === "own") {
            const ownProductsModel =
                this.getOwnerComponent().getModel(
                    "ownProducts"
                ) as JSONModel;

            const ownProducts = ownProductsModel?.getData() as PamProduct[] | undefined;

            if (!Array.isArray(ownProducts) || ownProducts.length === 0) {
                /*
                * No product can have this value, so this results in an
                * empty table being shown.
                */
                filters.push(
                    new Filter(
                        "version",
                        FilterOperator.EQ,
                        "__NO_OWN_PRODUCT__"
                    )
                );
            } else {
                const ownProductFilters = ownProducts.map(
                    (product: PamProduct) => {
                        const productFields = PRODUCT_KEY_FIELDS.map(
                            (field) => {
                                return new Filter(
                                    field,
                                    FilterOperator.EQ,
                                    getProductFieldValue(
                                        product,
                                        field
                                    )
                                );
                            }
                        );

                        /*
                        * All four values must belong to one product.
                        */
                        return new Filter({
                            filters: productFields,
                            and: true
                        });
                    }
                );

                /*
                * One of the stored products must match.
                */
                filters.push(
                    new Filter({
                        filters: ownProductFilters,
                        and: false
                    })
                );
            }
        }

        binding.filter(filters, FilterType.Application);
    }

    /** Tracks which products are checked in the table, independent of the current filter/scope. */
    public onSelectionChange(event: ListBase$SelectionChangeEvent): void {
        const item = event.getParameter("listItem") as ColumnListItem | undefined;

        if (!item) {
            return;
        }

        const context = item.getBindingContext("pam");

        if (!context) {
            return;
        }

        const product = context.getObject() as PamProduct;
        const productKey = createProductKey(product);
        const selected = event.getParameter("selected");

        if (selected) {
            this.selectedProductKeys.add(productKey);
        } else {
            this.selectedProductKeys.delete(productKey);
        }
    }

    /** Persists the current table selection as the new "ownProducts" model content. */
    public onAddProducts(): void {
        const pamModel = this.getOwnerComponent().getModel("pam") as JSONModel;
        const ownProductsModel =
            this.getOwnerComponent().getModel("ownProducts") as JSONModel;

        if (!pamModel || !ownProductsModel) {
            return;
        }

        const pamData = pamModel.getData() as PamProduct[];

        if (!Array.isArray(pamData)) {
            return;
        }

        const selectedProducts = pamData
            .filter((product: PamProduct) => {
                return this.selectedProductKeys.has(
                    createProductKey(product)
                );
            })
            .map((product: PamProduct) => {
                return {
                    ...product
                };
            });

        /*
         * Own products created directly via "myproducts/add" (see
         * MyProductsAdd controller) have no matching row in the PAM table,
         * so they can never be part of selectedProductKeys/selectedProducts
         * above - carry them over unchanged, or this "declarative replace"
         * would silently delete them.
         */
        const pamProductKeys = new Set(
            pamData.map((product: PamProduct) => createProductKey(product))
        );

        const existingOwnProducts =
            (ownProductsModel.getData() as PamProduct[] | undefined) ?? [];

        const customOwnProducts = existingOwnProducts.filter(
            (product: PamProduct) => {
                return !pamProductKeys.has(createProductKey(product));
            }
        );

        const updatedOwnProducts = [...selectedProducts, ...customOwnProducts];

        ownProductsModel.setData(updatedOwnProducts);

        this.loadSelectedProductsFromModel();
        this.updateProductCount();
        this.updateTableSelection();
        this.applyFilters();

        MessageToast.show(
            this.getText("msg.myProductsSaved", [updatedOwnProducts.length])
        );
    }

    /** Navigates to the "create product" sub-page. */
    public onNavigateToAddProduct(): void {
        this.navTo("myproductsadd");
    }

    /** Re-syncs the selection/filters/count whenever this route is (re-)matched. */
    private onRouteMatched(): void {
        /*
         * Unsaved checkbox changes are discarded when the page is
         * revisited. The "ownProducts" model is authoritative.
         */
        this.loadSelectedProductsFromModel();
        this.updateProductCount();
        this.applyFilters();
        this.updateTableSelection();
    }

    /** Attaches the selection-sync listener to the table's current list binding, once. */
    private attachTableBinding(): void {
        const table = this.byId("myProductsTable") as Table;

        if (!table) {
            return;
        }

        const binding = table.getBinding("items") as ListBinding | undefined;

        if (!binding || this.tableBinding === binding) {
            return;
        }

        this.tableBinding = binding;

        binding.attachChange(this.onTableBindingChange.bind(this));
    }

    /** Reacts to the table's list binding changing (e.g. after filtering) by re-applying the checkbox selection. */
    private onTableBindingChange(): void {
        this.updateTableSelection();
    }

    /** Re-applies {@link selectedProductKeys} as the table's checkbox selection state. */
    private updateTableSelection(): void {
        const table = this.byId("myProductsTable") as Table;

        if (!table) {
            return;
        }

        table.getItems().forEach((item) => {
            const context = item.getBindingContext("pam");

            if (!context) {
                return;
            }

            const product = context.getObject() as PamProduct;
            const productKey = createProductKey(product);

            item.setSelected(
                this.selectedProductKeys.has(productKey)
            );
        });
    }

    /** Rebuilds {@link selectedProductKeys} from the current "ownProducts" model content. */
    private loadSelectedProductsFromModel(): void {
        const ownProductsModel =
            this.getOwnerComponent().getModel("ownProducts") as JSONModel;

        if (!ownProductsModel) {
            this.selectedProductKeys.clear();
            return;
        }

        const ownProducts = ownProductsModel.getData() as PamProduct[];

        if (!Array.isArray(ownProducts)) {
            this.selectedProductKeys.clear();
            return;
        }

        this.selectedProductKeys = new Set(
            ownProducts.map((product: PamProduct) => {
                return createProductKey(product);
            })
        );
    }

    /** Downloads the current "ownProducts" model content as an OwnProducts.json file. */
    public onDownloadOwnProducts(): void {
        const ownProductsModel =
            this.getOwnerComponent().getModel("ownProducts") as JSONModel;

        if (!ownProductsModel) {
            MessageBox.error(
                this.getText("msg.ownProductsModelUnavailable")
            );
            return;
        }

        const ownProducts = ownProductsModel.getData() as PamProduct[];

        if (!Array.isArray(ownProducts) || ownProducts.length === 0) {
            MessageToast.show(this.getText("msg.myProductsNoOwnProducts"));
            return;
        }

        const jsonContent = JSON.stringify(ownProducts, null, 2);

        const blob = new Blob(
            [jsonContent],
            {
                type: "application/json;charset=utf-8"
            }
        );

        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");

        downloadLink.href = downloadUrl;
        downloadLink.download = "OwnProducts.json";
        downloadLink.style.display = "none";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        window.setTimeout(() => {
            URL.revokeObjectURL(downloadUrl);
        }, 100);
    }
}