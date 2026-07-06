//#region src/presets/no-summary.ts
function createNoSummaryPreset() {
	return {
		validateOn: ["submit", "blur"],
		focusOnError: "first-invalid",
		errorMode: "both",
		useNativeRules: true,
		disableNativeUI: true,
		addons: []
	};
}
var no_summary_default = createNoSummaryPreset;

//#endregion
export { no_summary_default as n, createNoSummaryPreset as t };
//# sourceMappingURL=no-summary.js.map