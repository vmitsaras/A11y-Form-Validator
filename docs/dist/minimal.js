//#region src/presets/minimal.ts
function createMinimalPreset() {
	return {
		validateOn: ["submit"],
		focusOnError: "first-invalid",
		errorMode: "inline",
		useNativeRules: true,
		disableNativeUI: true
	};
}
var minimal_default = createMinimalPreset;

//#endregion
export { minimal_default as n, createMinimalPreset as t };
//# sourceMappingURL=minimal.js.map