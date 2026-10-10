import BaseController from "./BaseController";

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

import Button from "sap/m/Button";
import Dialog from "sap/m/Dialog";
import Popover from "sap/m/Popover";
import Event from "sap/ui/base/Event";

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
import { PamProduct } from "../model/productKey";

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
export default class Main extends BaseController {
    private tableBinding?: ListBinding;

    /** Sets up the filter/view/viewSettings models and loads the initial filter option values. */
    public onInit(): void {
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

        const viewSettingsModel = new JSONModel({
            heading: this.getText("main.heading", [0]),
            columns: {
                addOnProductVersion: false,
                restrictedAvailableNotAllowed: false,
                restrictedAvailableAllowed: false,
                readinessStatusForSapHana: false,
                readinessDateForSapHana: false,
                endOfPriorityOneSupport: false,
                endOfSafekeeperService: false,
                supportPortalUrl: false
            }
        });

        this.setModel(viewSettingsModel, "viewSettings");

        const pamModel = this.getOwnerComponent().getModel("pam") as JSONModel;

        if (!pamModel) {
            return;
        }

        this.updateFilterValues();
    }

    /** Reacts to the table's list binding changing (e.g. after filtering) by refreshing the heading count. */
    private onTableBindingChange(): void {
        this.updateTableTitle();
    }

    /** Attaches the table title's change listener to the current list binding, once. */
    public onAfterRendering(): void {
        const table = this.byId("pamTable") as Table;
        const binding = table.getBinding("items") as ListBinding | undefined;

        if (binding && this.tableBinding !== binding) {
            this.tableBinding = binding;

            binding.attachChange(this.onTableBindingChange.bind(this));
        }

        this.updateTableTitle();
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
        const sortButton = this.byId("sortAscending") as ToggleButton;

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
            const input = this.byId(filterDefinition.id) as Input;
            input.setValue("");
        });

        SELECT_FILTERS.forEach((filterDefinition) => {
            const select = this.byId(filterDefinition.id) as Select;
            select.setSelectedKey("");
        });

        const relativeMaintenanceSelect =
            this.byId("filterMainstreamMaintenanceRelative") as Select;

        relativeMaintenanceSelect.setSelectedKey("");
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
        const searchField = this.byId("globalSearch") as SearchField;
        searchField.setValue("");

        this.resetFilterPanelValues();

        const sortField = this.byId("sortField") as Select;
        sortField.setSelectedKey("version");

        const sortButton = this.byId("sortAscending") as ToggleButton;
        sortButton.setPressed(true);
        sortButton.setText(this.getText("table.sortAscending"));

        this.applyTableState();
    }

    /** Rebuilds the "filter" model's dropdown options from the current "pam" model data. */
    private updateFilterValues(): void {
        const pamModel = this.getOwnerComponent().getModel("pam") as JSONModel;

        if (!pamModel) {
            return;
        }

        const data = pamModel.getData() as PamProduct[];

        if (!Array.isArray(data)) {
            return;
        }

        const filterModel = this.getModel("filter") as JSONModel;
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

    /** Rebuilds the table's filters and sorter from the current search/filter/sort controls. */
    private applyTableState(): void {
        const table = this.byId("pamTable") as Table;
        const binding = table.getBinding("items") as ListBinding | undefined;

        if (!binding) {
            return;
        }

        const filters: Filter[] = [];

        const searchField = this.byId("globalSearch") as SearchField;
        const searchValue = searchField.getValue().trim();

        if (searchValue) {
            const searchFilters = SEARCH_FIELDS.map((field) => {
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

        TEXT_FILTERS.forEach((filterDefinition) => {
            const input = this.byId(filterDefinition.id) as Input;
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
            const select = this.byId(filterDefinition.id) as Select;
            const selectedValue = select.getSelectedKey().trim();

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

        const relativeMaintenanceSelect =
            this.byId("filterMainstreamMaintenanceRelative") as Select;

        const relativeMonths = Number(
            relativeMaintenanceSelect.getSelectedKey()
        );

        if (relativeMonths > 0) {
            filters.push(
                new Filter({
                    path: MAINSTREAM_MAINTENANCE_FIELD,
                    test: (value: unknown): boolean => {
                        return isDateWithinRelativePeriod(value, relativeMonths);
                    }
                })
            );
        }

        binding.filter(filters, FilterType.Application);

        const sortField = this.byId("sortField") as Select;
        const sortPath = sortField.getSelectedKey();

        const sortButton = this.byId("sortAscending") as ToggleButton;
        const descending = !sortButton.getPressed();

        const sorter = new Sorter({
            path: sortPath,
            descending,
            comparator: DATE_FIELDS.includes(sortPath)
                ? compareDates
                : undefined
        });

        binding.sort(sorter);

        this.updateTableTitle();
    }


    /** Opens the column-visibility settings popover anchored to the pressed button. */
    public onOpenColumnSettings(event: Event): void {
        const button = event.getSource<Button>();
        const popover = this.byId("columnSettingsPopover") as Popover;

        popover.openBy(button);
    }

    /** Opens the chart analysis dialog with the status distribution of the currently filtered table rows. */
    public onShowChartAnalysis(): void {
        const table = this.byId("pamTable") as Table;
        const binding = table.getBinding("items") as ListBinding | undefined;

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
    private updateTableTitle(): void {
        const table = this.byId("pamTable") as Table;
        const binding = table.getBinding("items") as ListBinding | undefined;

        if (!binding) {
            return;
        }

        const count = binding.getLength();

        // Don't overwrite with a bogus value while still loading
        if (count < 0) {
            return;
        }

        const viewSettingsModel =
            this.getModel("viewSettings") as JSONModel;

        viewSettingsModel.setProperty(
            "/heading",
            this.getText("main.heading", [count.toLocaleString("de-DE")])
        );
    }

}
