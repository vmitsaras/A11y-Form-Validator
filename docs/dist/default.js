import { t as createErrorSummaryAddon } from "./error-summary.js";

//#region src/presets/default.ts
function createDefaultPreset() {
	return {
		validateOn: ["submit", "blur"],
		focusOnError: "summary",
		errorMode: "both",
		useNativeRules: true,
		disableNativeUI: true,
		addons: [createErrorSummaryAddon()]
	};
}
var default_default = createDefaultPreset;

//#endregion
export { default_default as n, createDefaultPreset as t };
//# sourceMappingURL=default.js.map