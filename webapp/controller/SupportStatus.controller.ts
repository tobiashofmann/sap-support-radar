import BaseController from "./BaseController";
import Dialog from "sap/m/Dialog";
import Input from "sap/m/Input";
import JSONModel from "sap/ui/model/json/JSONModel";
import SearchField from "sap/m/SearchField";
import Select from "sap/m/Select";
import Table from "sap/m/Table";
import ToggleButton from "sap/m/ToggleButton";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import FilterType from "sap/ui/model/FilterType";
import ListBinding from "sap/ui/model/ListBinding";
import Sorter from "sap/ui/model/Sorter";

import { compareDates, isDateWithinRelativePeriod } from "../model/germanDate";
import {
    FilterOption,
    SEARCH_FIELDS,
    TEXT_FILTERS,
    SELECT_FILTERS,
    DATE_FIELDS,
    MAINSTREAM_MAINTENANCE_FIELD,
    createFilterOptions,
    buildFieldDistribution
} from "../model/pamFilters";
import { PamProduct, PRODUCT_KEY_FIELDS, getProductFieldValue } from "../model/productKey";

interface FilterModelData {
    currentStatus: FilterOption[];
    unrestrictedAvailable: FilterOption[];
    restrictedAvailableNotAllowed: FilterOption[];
    mainstreamMaintenance: FilterOption[];
    extendedMaintenance: FilterOption[];
}

/**
 * @namespace de.itsfullofstars.sap.pam.controller
 */
export default class SupportStatus extends BaseController {
    /** Sets up the supportStatus/filter/view models and loads the initial filter/own-products state. */
    public onInit(): void {
        const supportStatusModel = new JSONModel({
            hasOwnProducts: false,
            noOwnProducts: true,
            heading: this.getText("supportStatus.heading", [0])
        });

        this.setModel(
            supportStatusModel,
            "supportStatus"
        );

        const filterModel = new JSONModel({
            currentStatus: [],
            unrestrictedAvailable: [],
            restrictedAvailableNotAllowed: [],
            mainstreamMaintenance: [],
            extendedMaintenance: []
        });

        this.setModel(filterModel, "filter");

        this.setModel(new JSONModel({
            supportEndHighlightDate: null,  // null = no highlighting
            showAdvancedFilters: false
        }), "view");

        const pamModel = this.getOwnerComponent()
            .getModel("pam") as JSONModel;

        this.updateOwnProductsState();

        this.getRouter()
            .getRoute("supportstatus")
            ?.attachPatternMatched(this.onRouteMatched.bind(this));

        if (pamModel) {
            this.updateFilterValues();
        }
    }

    /** Updates the "supportStatus" model's hasOwnProducts/noOwnProducts flags from the current own-products data. */
    private updateOwnProductsState(): void {
        const ownProductsModel = this.getOwnerComponent()
            .getModel("ownProducts") as JSONModel;

        const supportStatusModel = this.getView()
            .getModel("supportStatus") as JSONModel;

        if (!supportStatusModel) {
            return;
        }

        const ownProducts = ownProductsModel?.getData() as PamProduct[] | undefined;

        const hasOwnProducts =
            Array.isArray(ownProducts) &&
            ownProducts.length > 0;

        supportStatusModel.setProperty(
            "/hasOwnProducts",
            hasOwnProducts
        );

        supportStatusModel.setProperty(
            "/noOwnProducts",
            !hasOwnProducts
        );
    }

    /** Refreshes own-products state and table filters once the view has rendered. */
    public onAfterRendering(): void {
        this.updateOwnProductsState();
        this.applyTableState();
    }

    /** Refreshes own-products state and table filters whenever this route is (re-)matched. */
    public onRouteMatched(): void {
        this.updateOwnProductsState();
        this.applyTableState();
    }

    /** Re-applies filters/sorting after the global search field's value changes. */
    public onSearchChange(): void {
        this.applyTableState();
    }

    /** Re-applies filters/sorting after a filter panel value changes. */
    public onFilterChange(): void {
        this.applyTableState();
    }

    /** Updates the sort direction button label and re-applies filters/sorting. */
    public onSortChange(): void {
        const sortButton = this.byId(
            "sortAscending"
        ) as ToggleButton;

        sortButton.setText(
            sortButton.getPressed()
                ? this.getText("table.sortAscending")
                : this.getText("table.sortDescending")
        );

        this.applyTableState();
    }

    /** Clears all filter panel input/select values, without touching search or sorting. */
    private resetFilterPanelValues(): void {
        TEXT_FILTERS.forEach((filterDefinition) => {
            const input = this.byId(
                filterDefinition.id
            ) as Input;

            input.setValue("");
        });

        SELECT_FILTERS.forEach((filterDefinition) => {
            const select = this.byId(
                filterDefinition.id
            ) as Select;

            select.setSelectedKey("");
        });

        const relativeFilter = this.byId(
            "filterMainstreamMaintenanceRelative"
        ) as Select;

        relativeFilter.setSelectedKey("");
    }

    /**
     * Resets only the filter panel's values. Unlike {@link onReset}, the
     * table's full-text search and sorting are left untouched.
     */
    public onResetFilters(): void {
        this.resetFilterPanelValues();
        this.applyTableState();
    }

    /** Resets search, filters and sorting back to their defaults. */
    public onReset(): void {
        const searchField = this.byId(
            "globalSearch"
        ) as SearchField;

        searchField.setValue("");

        this.resetFilterPanelValues();

        const sortField = this.byId(
            "sortField"
        ) as Select;

        sortField.setSelectedKey("version");

        const sortButton = this.byId(
            "sortAscending"
        ) as ToggleButton;

        sortButton.setPressed(true);
        sortButton.setText(this.getText("table.sortAscending"));

        this.applyTableState();
    }

    /**
     * Rebuilds the table's filters and sorter from the own-products
     * selection and the current search/filter/sort controls.
     */
    private applyTableState(): void {
        const table = this.byId("supportStatusTable") as Table;
        const binding = table?.getBinding("items") as ListBinding | undefined;

        if (!binding) {
            return;
        }

        const ownProductsModel = this.getOwnerComponent().getModel("ownProducts") as JSONModel;
        const ownProducts = ownProductsModel?.getData() as PamProduct[] | undefined;

        if (!Array.isArray(ownProducts) || ownProducts.length === 0) {
            /*
            * Additionally filter the table to empty. It is also hidden
            * via the supportStatus model.
            */
            binding.filter(
                [
                    new Filter(
                        "version",
                        FilterOperator.EQ,
                        "__NO_OWN_PRODUCTS__"
                    )
                ],
                FilterType.Application
            );

            this.updateHeading();
            return;
        }

        const filters: Filter[] = [this.createOwnProductsFilter()];

        const searchField = this.byId(
            "globalSearch"
        ) as SearchField;

        const searchValue = searchField
            .getValue()
            .trim();

        if (searchValue) {
            const searchFilters = SEARCH_FIELDS.map(
                (field) => {
                    return new Filter(
                        field,
                        FilterOperator.Contains,
                        searchValue
                    );
                }
            );

            filters.push(
                new Filter({
                    filters: searchFilters,
                    and: false
                })
            );
        }

        TEXT_FILTERS.forEach((filterDefinition) => {
            const input = this.byId(
                filterDefinition.id
            ) as Input;

            const value = input.getValue().trim();

            if (value) {
                filters.push(
                    new Filter(
                        filterDefinition.path,
                        FilterOperator.Contains,
                        value
                    )
                );
            }
        });

        SELECT_FILTERS.forEach((filterDefinition) => {
            const select = this.byId(
                filterDefinition.id
            ) as Select;

            const selectedValue = select
                .getSelectedKey()
                .trim();

            if (selectedValue) {
                filters.push(
                    new Filter(
                        filterDefinition.path,
                        FilterOperator.EQ,
                        selectedValue
                    )
                );
            }
        });

        const relativeFilter = this.byId(
            "filterMainstreamMaintenanceRelative"
        ) as Select;

        const relativeMonths = Number(
            relativeFilter.getSelectedKey()
        );

        if (relativeMonths > 0) {
            filters.push(
                new Filter({
                    path: MAINSTREAM_MAINTENANCE_FIELD,
                    test: (value: unknown): boolean => {
                        return isDateWithinRelativePeriod(
                            value,
                            relativeMonths
                        );
                    }
                })
            );
        }

        binding.filter(
            filters,
            FilterType.Application
        );

        const sortField = this.byId(
            "sortField"
        ) as Select;

        const sortPath = sortField.getSelectedKey();

        const sortButton = this.byId(
            "sortAscending"
        ) as ToggleButton;

        const sorter = new Sorter({
            path: sortPath,
            descending: !sortButton.getPressed(),
            comparator: DATE_FIELDS.includes(sortPath)
                ? compareDates
                : undefined
        });

        binding.sort(sorter);

        this.updateHeading();
    }

    /** Opens the chart analysis dialog with the status distribution of the currently filtered table rows. */
    public onShowChartAnalysis(): void {
        const table = this.byId("supportStatusTable") as Table;
        const binding = table?.getBinding("items") as ListBinding | undefined;

        if (!binding) {
            return;
        }

        const entries = binding
            .getContexts(0, binding.getLength())
            .map((context) => context.getObject() as PamProduct);

        const distribution = buildFieldDistribution(
            entries,
            "status",
            this.getText("chart.unspecifiedValue")
        );

        const maxCount = distribution.reduce(
            (max, entry) => Math.max(max, entry.count),
            1
        );

        this.setModel(
            new JSONModel({
                totalText: this.getText("chart.entriesShown", [entries.length]),
                maxCount,
                distribution
            }),
            "chart"
        );

        const dialog = this.byId("chartAnalysisDialog") as Dialog;
        dialog.open();
    }

    /** Updates the table heading with the current (filtered) row count. */
    private updateHeading(): void {
        const table = this.byId("supportStatusTable") as Table;
        const binding = table?.getBinding("items") as ListBinding | undefined;

        if (!binding) {
            return;
        }

        const count = binding.getLength();

        // Don't overwrite with a bogus value while still loading
        if (count < 0) {
            return;
        }

        const supportStatusModel =
            this.getModel("supportStatus") as JSONModel;

        supportStatusModel.setProperty(
            "/heading",
            this.getText("supportStatus.heading", [count.toLocaleString("de-DE")])
        );
    }

    /**
     * Builds an OR-of-ANDs filter matching any of the user's own products
     * (by the {@link PRODUCT_KEY_FIELDS} tuple). Only ever called from
     * {@link applyTableState} once it has already confirmed `ownProducts`
     * is a non-empty array, so that case isn't re-checked here.
     */
    private createOwnProductsFilter(): Filter {
        const ownProductsModel = this.getOwnerComponent()
            .getModel("ownProducts") as JSONModel;

        const ownProducts = ownProductsModel.getData() as PamProduct[];

        const ownProductFilters = ownProducts.map(
            (product: PamProduct) => {
                const productFieldFilters =
                    PRODUCT_KEY_FIELDS.map((field) => {
                        return new Filter(
                            field,
                            FilterOperator.EQ,
                            getProductFieldValue(
                                product,
                                field
                            )
                        );
                    });

                return new Filter({
                    filters: productFieldFilters,
                    and: true
                });
            }
        );

        return new Filter({
            filters: ownProductFilters,
            and: false
        });
    }

    /** Rebuilds the "filter" model's dropdown options from the current "pam" model data. */
    private updateFilterValues(): void {
        const pamModel = this.getOwnerComponent()
            .getModel("pam") as JSONModel;

        const filterModel = this.getView()
            .getModel("filter") as JSONModel;

        if (!pamModel || !filterModel) {
            return;
        }

        const data = pamModel.getData() as PamProduct[];

        if (!Array.isArray(data)) {
            return;
        }

        const allLabel = this.getText("filter.relativeAll");

        const filterData: FilterModelData = {
            currentStatus: createFilterOptions(data, "status", allLabel),
            unrestrictedAvailable: createFilterOptions(data, "ua", allLabel),
            restrictedAvailableNotAllowed: createFilterOptions(data, "ra_puna", allLabel),
            mainstreamMaintenance: createFilterOptions(data, "eomm", allLabel),
            extendedMaintenance: createFilterOptions(data, "eom", allLabel)
        };

        filterModel.setData(filterData);
    }
}
