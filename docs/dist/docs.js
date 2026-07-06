//#region src/docs.ts
const docs = {
	slug: "a11y-form-validator",
	name: "A11y Form Validator",
	packageName: "a11y-form-validator",
	description: "Accessible, dependency-light progressive enhancement for semantic HTML forms.",
	repo: "https://github.com/vmitsaras/A11y-Form-Validator",
	npm: "https://www.npmjs.com/package/a11y-form-validator",
	install: {
		npm: "npm install a11y-form-validator",
		pnpm: "pnpm add a11y-form-validator",
		yarn: "yarn add a11y-form-validator"
	},
	usage: `import {
  createDefaultPreset,
  createFormValidator
} from "a11y-form-validator";
import "a11y-form-validator/styles.css";

const form = document.querySelector("[data-a11y-form-validator]");
if (form instanceof HTMLFormElement) {
  createFormValidator(form, createDefaultPreset());
}`,
	selectors: [
		"[data-a11y-form-validator]",
		"input, select, textarea",
		"[data-validate]",
		"[data-message-*]",
		"[data-character-count]"
	],
	keyboard: [
		{
			key: "Tab / Shift+Tab",
			description: "Moves through the form controls, generated error summary links, and submit button in document order."
		},
		{
			key: "Enter",
			description: "Submits the form from text fields or activates error summary links."
		},
		{
			key: "Space",
			description: "Toggles native checkboxes and radio buttons; the validator preserves native control behavior."
		}
	],
	accessibility: [
		"Enhances native form controls and keeps existing labels, groups, and fieldsets in place.",
		"Inline errors are associated with fields through aria-describedby and aria-errormessage.",
		"Field-level validation uses polite inline error announcements; blocked submits that focus the summary suppress duplicate inline live-region announcements.",
		"The error summary is focusable and labelled; field errors are field-labelled links that focus invalid controls, while form-level errors render as text.",
		"Focus moves to the summary or first invalid field after blocked submits, depending on focusOnError.",
		"Applications applying server errors with setErrors() should call focusOnError() when the summary or first invalid field should be announced immediately.",
		"Keyboard behavior remains native: Tab moves through controls and summary links; Enter submits forms or activates links; Space toggles native checkboxes and radio buttons."
	],
	limitations: [
		"The plugin validates controls collected by selectors.fields; custom widgets need custom rules, a custom renderer, or extra integration code.",
		"Remote validation is supported through async custom rules, but request cancellation is the application’s responsibility.",
		"Async pending state is exposed through validator state, events, and .is-pending; add an application live status when progress announcements are needed.",
		"The default CSS is intentionally minimal and may need product-specific layout styles.",
		"Native browser validation messages vary by browser and locale when errorMode includes native behavior."
	],
	api: [
		{
			name: "createFormValidator(form, options)",
			type: "(form: HTMLFormElement, options?: A11yFormValidatorOptionsInput) => A11yFormValidatorInstance",
			description: "Initializes accessible validation behavior on a form and reuses an existing instance for duplicate calls."
		},
		{
			name: "initFormValidators(options, root)",
			type: "(options?: A11yFormValidatorOptionsInput, root?: ParentNode) => A11yFormValidatorInstance[]",
			description: "Initializes every form matching [data-a11y-form-validator] under the provided root."
		},
		{
			name: "A11yFormValidator",
			type: "class",
			description: "Plugin class for advanced usage; exposes validation, state, rule registration, server errors, and cleanup methods."
		},
		{
			name: "a11y-form-validator/min",
			type: "package subpath",
			description: "Optional minified ESM entry for direct browser or CDN-style imports. It reuses dist/index.d.ts and does not replace the default package entry."
		},
		{
			name: "createDefaultPreset()",
			type: "() => A11yFormValidatorOptionsInput",
			description: "Available from the main entry and a11y-form-validator/presets/default. Includes the error summary addon: submit and blur validation, inline and native messages, summary focus after blocked submits, and generated summary UI."
		},
		{
			name: "createNoSummaryPreset()",
			type: "() => A11yFormValidatorOptionsInput",
			description: "Available from the main entry and a11y-form-validator/presets/no-summary. Matches the default submit and blur validation pattern without importing or installing the error summary addon."
		},
		{
			name: "createMinimalPreset()",
			type: "() => A11yFormValidatorOptionsInput",
			description: "Available from the main entry and a11y-form-validator/presets/minimal. Returns submit validation, inline errors, native rules, and focus on the first invalid field."
		},
		{
			name: "createErrorSummaryAddon(options)",
			type: "(options?: ErrorSummaryAddonOptions) => ErrorSummaryAddon",
			description: "Import from a11y-form-validator/addons/error-summary. Creates a labelled, focusable error summary that lists form errors and links field errors back to invalid controls."
		},
		{
			name: "createCharacterCountAddon(options)",
			type: "(options?: CharacterCountAddonOptions) => CharacterCountAddon",
			description: "Import from a11y-form-validator/addons/character-count. Creates polite character count guidance for controls with maxlength, minlength, or data-character-count."
		},
		{
			name: "validate(), validateField(), refresh()",
			type: "instance methods",
			description: "Validate the full form, validate one field by name or element, or rescan fields after dynamic markup changes."
		},
		{
			name: "getErrors(), getState(), clearErrors()",
			type: "instance methods",
			description: "Read current field/form errors and validation state, or remove rendered validation messages."
		},
		{
			name: "setErrors(errors)",
			type: "(errors?: ServerErrors) => A11yFormValidatorInstance",
			description: "Renders server-provided field and form errors without replacing semantic form markup; call focusOnError() afterward when users should be moved to the summary or first invalid field."
		},
		{
			name: "focusOnError()",
			type: "() => void",
			description: "Moves focus according to focusOnError, usually to the error summary or first invalid field."
		},
		{
			name: "registerRule(name, rule), unregisterRule(name)",
			type: "instance methods",
			description: "Adds or removes custom validation rules for product-specific, conditional, cross-field, or async validation."
		},
		{
			name: "reset(), enable(), disable(), destroy()",
			type: "instance methods",
			description: "Reset state, toggle validation, or remove listeners, generated errors, addons, timers, plugin classes, and generated ARIA state."
		}
	],
	examples: [
		{
			name: "Direct browser minified build",
			description: "Direct browser demo that imports the optional minified ESM build without making it the default bundler entry.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/minified.html"
		},
		{
			name: "Basic",
			description: "Semantic contact form with inline errors, an error summary, and character count guidance.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/basic.html"
		},
		{
			name: "Contact Form",
			description: "Small form using the minimal preset with native required, email, and minlength checks.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/contact.html"
		},
		{
			name: "CMS Markup",
			description: "Data-attribute rules and field-specific messages for markup produced by content systems or templates.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/cms-markup.html"
		},
		{
			name: "Error Summary",
			description: "Focusable summary region with links that send users back to invalid fields.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/error-summary.html"
		},
		{
			name: "Registration",
			description: "Password confirmation with a custom same-as rule and custom error copy.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/registration.html"
		},
		{
			name: "Login / Register",
			description: "Switch between login and registration forms while only the visible form is active and validated.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/login-register.html"
		},
		{
			name: "Checkout",
			description: "Conditional billing validation plus required shipping and payment method choices.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/checkout.html"
		},
		{
			name: "Conditional Fields Integration",
			description: "Integration pattern for a11y-conditional-fields, visible-only required fields, validator refresh, and summary updates.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/conditional-fields.html"
		},
		{
			name: "Remote Validation",
			description: "Username availability checked with an async custom rule and debounced input validation.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/remote-validation.html"
		},
		{
			name: "Server Errors",
			description: "Server-provided field and form messages rendered after a failed request.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/server-errors.html"
		},
		{
			name: "Localization",
			description: "English fallback, imported locale JSON, and inline locale messages.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/localization.html"
		},
		{
			name: "Dynamic Locale",
			description: "Destroy and reinitialize the validator to swap runtime locale packs and regenerate errors.",
			path: "https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/dynamic-locale.html"
		}
	]
};

//#endregion
export { docs };
//# sourceMappingURL=docs.js.map