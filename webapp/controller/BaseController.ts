import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import AppComponent from "../Component";
import Model from "sap/ui/model/Model";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import Router from "sap/ui/core/routing/Router";
import Event from "sap/ui/base/Event";
import ColumnListItem from "sap/m/ColumnListItem";
import Dialog from "sap/m/Dialog";
import { SegmentedButton$SelectionChangeEvent } from "sap/m/SegmentedButton";

import { parseGermanDate } from "../model/germanDate";
import { getSupportEndState } from "../model/supportEndThresholds";

/**
 * @namespace de.itsfullofstars.sap.pam.controller
 */
export default abstract class BaseController extends Controller {
	/**
	 * Convenience method for accessing the component of the controller's view.
	 * @returns The component of the controller's view
	 */
	public getOwnerComponent(): AppComponent {
		return super.getOwnerComponent() as AppComponent;
	}

	/**
	 * Convenience method to get the components' router instance.
	 * @returns The router instance
	 */
	public getRouter(): Router {
		return UIComponent.getRouterFor(this);
	}

	/**
	 * Convenience method for synchronously resolving an i18n text from controller
	 * code (formatters, alerts, JSONModel properties, ...).
	 *
	 * Deliberately goes through `ResourceModel#getProperty` rather than
	 * `ResourceModel#getResourceBundle()`: with `async: true` (see manifest.json),
	 * the latter always returns a Promise, even long after the bundle has finished loading.
	 * `getProperty` is the same synchronous path XML property bindings
	 * (`{i18n>key}`) use internally, and is safe to call from anywhere after view
	 * creation because the Component declares `sap.ui.core.IAsyncContentCreation`,
	 * which guarantees the i18n ResourceModel is already loaded before any
	 * view/controller is instantiated.
	 * @param sKey The i18n resource bundle key
	 * @param aArgs Optional placeholder values ({0}, {1}, ...) for the text
	 * @returns The resolved, localized text
	 */
	public getText(sKey: string, aArgs?: Array<string | number>): string {
		const oModel = this.getOwnerComponent().getModel("i18n") as ResourceModel;
		const sText = oModel.getProperty(sKey) ?? sKey;

		if (!aArgs || aArgs.length === 0) {
			return sText;
		}

		return sText.replace(/\{(\d+)\}/g, (sMatch, sIndex: string) => {
			const vValue = aArgs[Number(sIndex)];
			return vValue === undefined ? sMatch : String(vValue);
		});
	}

	/**
	 * Convenience method for getting the view model by name in every controller of the application.
	 * @param [sName] The model name
	 * @returns The model instance
	 */
	public getModel(sName?: string): Model {
		return this.getView().getModel(sName);
	}

	/**
	 * Convenience method for setting the view model in every controller of the application.
	 * @param oModel The model instance
	 * @param [sName] The model name
	 * @returns The current base controller instance
	 */
	public setModel(oModel: Model, sName?: string): BaseController {
		this.getView().setModel(oModel, sName);
		return this;
	}

	/**
	 * Convenience method for triggering the navigation to a specific target.
	 * @public
	 * @param sName Target name
	 * @param [oParameters] Navigation parameters
	 * @param [bReplace] Defines if the hash should be replaced (no browser history entry) or set (browser history entry)
	 */
	public navTo(sName: string, oParameters?: object, bReplace?: boolean): void {
		this.getRouter().navTo(sName, oParameters, undefined, bReplace);
	}

	/**
	 * Convenience event handler for a pressed table row that is bound to the
	 * "pam" model. Navigates to the product detail page for that row's entry.
	 * @param oEvent The press event of the pressed ColumnListItem
	 */
	public onProductRowPress(oEvent: Event): void {
		const oItem = oEvent.getSource<ColumnListItem>();
		const oContext = oItem.getBindingContext("pam");

		if (!oContext) {
			return;
		}

		const sIndex = oContext.getPath().split("/").pop();

		if (!sIndex) {
			return;
		}

		this.navTo("productdetail", { index: sIndex });
	}

	/**
	 * Shared handler for the "show/hide advanced filters" toggle on the Main
	 * and SupportStatus views. Both views set up an identical "view"
	 * JSONModel (showAdvancedFilters, supportEndHighlightDate) in onInit.
	 */
	public onToggleAdvancedFilters(): void {
		const oViewModel = this.getModel("view") as JSONModel;
		const bShowAdvancedFilters = oViewModel.getProperty("/showAdvancedFilters") as boolean;

		oViewModel.setProperty("/showAdvancedFilters", !bShowAdvancedFilters);
	}

	/**
	 * Shared handler for the "support end approaching" SegmentedButton on the
	 * Main and SupportStatus views, storing the chosen highlight horizon (or
	 * `null` for "off") on the "view" model's /supportEndHighlightDate.
	 * @param oEvent The selectionChange event of the SegmentedButton
	 */
	protected onSupportEndHighlightChange(oEvent: SegmentedButton$SelectionChangeEvent): void {
		const sKey = oEvent.getParameter("selectedKey");
		const oViewModel = this.getModel("view") as JSONModel;

		if (!sKey || sKey === "none") {
			oViewModel.setProperty("/supportEndHighlightDate", null);
			return;
		}

		const iMonths = parseInt(sKey, 10);   // "3M" -> 3, "24M" -> 24
		const oLimit = new Date();
		oLimit.setHours(23, 59, 59, 999);
		oLimit.setMonth(oLimit.getMonth() + iMonths);

		oViewModel.setProperty("/supportEndHighlightDate", oLimit);
	}

	/**
	 * Shared formatter for the "support end approaching" row highlighting on
	 * the Main and SupportStatus tables.
	 * @param vSupportEnd The raw (dd.mm.yyyy) support end date value
	 * @param oLimit The highlight horizon chosen via the SegmentedButton, or null if off
	 * @returns A sap.ui.core.ValueState name ("Error"/"Warning"/"None")
	 */
	public supportEndHighlight(
		vSupportEnd: unknown,
		oLimit: Date | null
	): string {
		if (!oLimit) {
			return "None";
		}

		const oEnd = parseGermanDate(vSupportEnd);

		/*
		* The period chosen via the SegmentedButton determines up to when
		* highlighting happens at all; the color itself then follows the
		* central, configurable red/yellow threshold from
		* model/supportEndThresholds.ts (default: red within 6 months,
		* yellow within 12 months). A date that has already passed is
		* always the most urgent case.
		*/
		if (oEnd === null || oEnd.getTime() > oLimit.getTime()) {
			return "None";
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return getSupportEndState(oEnd, today);
	}

	/**
	 * Shared handler for the "chart analysis" dialog opened from the Main
	 * and SupportStatus tables (both views use the same control id,
	 * `chartAnalysisDialog`, so this works regardless of which view it is
	 * called from).
	 */
	public onCloseChartAnalysis(): void {
		const oDialog = this.byId("chartAnalysisDialog") as Dialog;
		oDialog.close();
	}

	/**
	 * Formatter for a bar's width in the "chart analysis" dialog's bar
	 * chart, scaled against the chart's largest value so the longest bar
	 * fills the full track.
	 * @param iCount The bar's own value
	 * @param iMaxCount The largest value among the chart's bars
	 * @returns A CSS percentage width (e.g. "42%")
	 */
	public formatBarWidth(iCount: number, iMaxCount: number): string {
		if (!iMaxCount) {
			return "0%";
		}

		return `${(iCount / iMaxCount) * 100}%`;
	}
}
