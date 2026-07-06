import { a as getPreferredScrollBehavior, c as normalizeToArray, d as toRuleOptions, f as toSafeInteger, i as escapeSelectorIdentifier, l as parseRuleList, n as camelToKebabCase, o as isEmptyValue, p as unique, r as ensureElementId, s as mergeOptions, t as applyPlaceholders, u as sanitizeId } from "./helpers.js";
import "./error-summary.js";
import { t as createDefaultPreset } from "./default.js";
import { t as createNoSummaryPreset } from "./no-summary.js";
import { t as createMinimalPreset } from "./minimal.js";

//#region src/rules/checked.ts
function checkedRule({ value }) {
	return {
		valid: Array.isArray(value) ? value.length > 0 : Boolean(value),
		messageKey: "checked"
	};
}
var checked_default = checkedRule;

//#endregion
//#region src/rules/email.ts
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
function emailRule({ value }) {
	if (isEmptyValue(value)) return {
		valid: true,
		messageKey: "email"
	};
	return {
		valid: EMAIL_PATTERN.test(String(value).trim()),
		messageKey: "email"
	};
}
var email_default = emailRule;

//#endregion
//#region src/rules/maxLength.ts
function maxLengthRule({ value, options }) {
	const max = toSafeInteger(options.max, Number.POSITIVE_INFINITY, { min: 0 });
	if (isEmptyValue(value)) return {
		valid: true,
		messageKey: "maxLength",
		params: { max }
	};
	return {
		valid: (Array.isArray(value) ? value.length : String(value).length) <= max,
		messageKey: "maxLength",
		params: { max }
	};
}
var maxLength_default = maxLengthRule;

//#endregion
//#region src/rules/minLength.ts
function minLengthRule({ value, options }) {
	const min = toSafeInteger(options.min, 0, { min: 0 });
	if (isEmptyValue(value)) return {
		valid: true,
		messageKey: "minLength",
		params: { min }
	};
	return {
		valid: (Array.isArray(value) ? value.length : String(value).length) >= min,
		messageKey: "minLength",
		params: { min }
	};
}
var minLength_default = minLengthRule;

//#endregion
//#region src/rules/pattern.ts
function patternRule({ value, options }) {
	if (isEmptyValue(value)) return {
		valid: true,
		messageKey: "pattern"
	};
	try {
		return {
			valid: new RegExp(String(options.pattern || "")).test(String(value)),
			messageKey: "pattern"
		};
	} catch {
		return {
			valid: true,
			messageKey: "pattern",
			metadata: { ignoredInvalidPattern: true }
		};
	}
}
var pattern_default = patternRule;

//#endregion
//#region src/rules/required.ts
function requiredRule({ value }) {
	return {
		valid: !isEmptyValue(value),
		messageKey: "required"
	};
}
var required_default = requiredRule;

//#endregion
//#region src/rules/same-as.ts
function sameAsRule({ field, form, value, options }) {
	if (isEmptyValue(value)) return {
		valid: true,
		messageKey: "sameAs",
		params: { targetLabel: "" }
	};
	const selector = String(options.selector || `[name="${options.field || ""}"]`);
	let target = null;
	try {
		target = selector ? form.querySelector(selector) : null;
	} catch {
		target = null;
	}
	const targetValue = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement ? target.value : "";
	return {
		valid: target ? String(value) === String(targetValue) : false,
		messageKey: "sameAs",
		params: { targetLabel: field.getTargetLabel(target) }
	};
}
var same_as_default = sameAsRule;

//#endregion
//#region src/core/ErrorRenderer.ts
var ErrorRenderer = class {
	validator;
	constructor(validator) {
		this.validator = validator;
	}
	getNode(field) {
		return this.validator.form.querySelector(`#${field.errorId}`);
	}
	shouldRenderInline() {
		return this.validator.options.errorMode !== "native";
	}
	syncAnnouncementAttributes(errorNode) {
		if (this.validator.shouldAnnounceInlineErrors()) {
			errorNode.setAttribute("role", "status");
			errorNode.setAttribute("aria-live", "polite");
			errorNode.setAttribute("aria-atomic", "true");
			return;
		}
		errorNode.removeAttribute("role");
		errorNode.removeAttribute("aria-live");
		errorNode.removeAttribute("aria-atomic");
	}
	setNativeMessage(field, message) {
		field.elements.forEach((element) => {
			element.setCustomValidity?.(message || "");
		});
	}
	getInsertionTarget(field) {
		if (field.isGroupedChoice) {
			const fieldset = field.primaryElement.closest("fieldset");
			if (fieldset && this.validator.form.contains(fieldset)) return fieldset;
		}
		const label = field.primaryElement.closest("label");
		if (label && this.validator.form.contains(label)) return label;
		return field.primaryElement;
	}
	render(field, message) {
		this.setNativeMessage(field, message);
		const renderInline = this.shouldRenderInline();
		if (renderInline) field.connectDescription(field.errorId);
		else field.disconnectDescription(field.errorId);
		field.setAriaInvalid(true, renderInline ? field.errorId : "");
		field.setVisualState("invalid");
		if (!renderInline) return;
		let errorNode = this.getNode(field);
		if (!errorNode) {
			errorNode = this.validator.form.ownerDocument.createElement("div");
			errorNode.id = field.errorId;
			errorNode.className = "a11y-form-validator__error";
			this.getInsertionTarget(field).insertAdjacentElement("afterend", errorNode);
		}
		this.syncAnnouncementAttributes(errorNode);
		errorNode.textContent = message;
	}
	clear(field) {
		const errorNode = this.getNode(field);
		if (errorNode) errorNode.remove();
		this.setNativeMessage(field, "");
		field.disconnectDescription(field.errorId);
		field.setAriaInvalid(false);
		field.setVisualState("valid");
	}
	destroy() {
		this.validator.fields.forEach((field) => this.clear(field));
	}
};

//#endregion
//#region src/core/EventEmitter.ts
var EventEmitter = class {
	target;
	constructor(target) {
		this.target = target;
	}
	emit(name, detail = {}) {
		this.target.dispatchEvent(new CustomEvent(name, {
			bubbles: true,
			detail
		}));
	}
	on(name, handler) {
		this.target.addEventListener(name, handler);
		return () => this.off(name, handler);
	}
	off(name, handler) {
		this.target.removeEventListener(name, handler);
	}
};

//#endregion
//#region src/core/FieldController.ts
function getControlLabels(element) {
	if ("labels" in element && element.labels) return element.labels;
	return [];
}
var FieldController = class {
	validator;
	name;
	elements;
	primaryElement;
	type;
	isGroupedChoice;
	errorId;
	primaryId;
	initialDescribedBy;
	generatedPrimaryId;
	serverMessage;
	lastError;
	touched;
	dirty;
	constructor(validator, name, elements) {
		this.validator = validator;
		this.name = name;
		this.elements = [...elements];
		this.primaryElement = this.elements[0];
		this.type = this.detectType();
		this.isGroupedChoice = this.elements.length > 1 && ["radio", "checkbox"].includes(this.type);
		this.errorId = `a11y-form-validator-error-${sanitizeId(this.validator.form.id || "form")}-${sanitizeId(this.name)}`;
		this.generatedPrimaryId = !this.primaryElement.id;
		this.primaryId = ensureElementId(this.primaryElement);
		this.initialDescribedBy = new Map(this.elements.map((element) => [element, element.getAttribute("aria-describedby") || ""]));
		this.serverMessage = "";
		this.lastError = "";
		this.touched = false;
		this.dirty = false;
	}
	detectType() {
		const tagName = this.primaryElement.tagName.toLowerCase();
		if (tagName === "textarea") return "textarea";
		if (tagName === "select") return this.primaryElement.multiple ? "select-multiple" : "select";
		return (this.primaryElement.getAttribute("type") || "text").toLowerCase();
	}
	getActiveElements() {
		return this.elements.filter((element) => !element.disabled);
	}
	isDisabled() {
		return this.getActiveElements().length === 0;
	}
	isHidden() {
		return this.elements.every((element) => {
			if (element instanceof HTMLInputElement && element.type === "hidden" || element.hidden) return true;
			return Boolean(element.closest("[hidden]"));
		});
	}
	shouldIgnore() {
		const { ignore, validateHidden } = this.validator.options;
		if (ignore.disabled !== false && this.isDisabled()) return "disabled";
		if (!validateHidden && ignore.hidden !== false && this.isHidden()) return "hidden";
		if (ignore.selector && this.elements.some((element) => element.matches(ignore.selector))) return "selector";
		return false;
	}
	getValue() {
		const activeElements = this.getActiveElements();
		if (this.type === "radio") {
			const selected = activeElements.find((element) => element instanceof HTMLInputElement && element.checked);
			return selected ? selected.value : "";
		}
		if (this.type === "checkbox" && this.elements.length > 1) return activeElements.filter((element) => element instanceof HTMLInputElement && element.checked).map((element) => element.value);
		if (this.type === "checkbox") return this.primaryElement instanceof HTMLInputElement ? Boolean(this.primaryElement.checked) : false;
		if (this.type === "file") return this.primaryElement instanceof HTMLInputElement ? Array.from(this.primaryElement.files || []) : [];
		if (this.type === "select-multiple" && this.primaryElement instanceof HTMLSelectElement) return Array.from(this.primaryElement.selectedOptions).map((option) => option.value);
		return this.primaryElement.value;
	}
	getFieldConfig() {
		return this.validator.options.rules?.[this.name] || {};
	}
	getDataMessage(ruleName) {
		return this.primaryElement.dataset[`message${ruleName.charAt(0).toUpperCase()}${ruleName.slice(1)}`] || this.primaryElement.getAttribute(`data-message-${camelToKebabCase(ruleName)}`) || "";
	}
	getLabel() {
		const fieldset = this.primaryElement.closest("fieldset");
		if (this.isGroupedChoice && fieldset) {
			const legend = fieldset.querySelector("legend");
			if (legend) return legend.textContent?.trim() || this.name;
		}
		const id = this.primaryElement.id;
		if (id) {
			const labelSelector = `label[for="${escapeSelectorIdentifier(id)}"]`;
			const label = this.validator.form.querySelector(labelSelector) || this.validator.form.ownerDocument.querySelector(labelSelector);
			if (label) return label.textContent?.trim() || this.name;
		}
		const wrapperLabel = this.primaryElement.closest("label");
		if (wrapperLabel) return wrapperLabel.textContent?.trim() || this.name;
		return this.name;
	}
	getTargetLabel(target) {
		if (!target) return "";
		const labels = getControlLabels(target);
		if (labels.length) return labels[0].textContent?.trim() || "";
		if (target.id) {
			const label = this.validator.form.querySelector(`label[for="${escapeSelectorIdentifier(target.id)}"]`);
			if (label) return label.textContent?.trim() || "";
		}
		if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return target.name || target.id || "";
		return target.id || "";
	}
	getDescribedBy() {
		return unique(this.elements.flatMap((element) => String(element.getAttribute("aria-describedby") || "").split(/\s+/)));
	}
	connectDescription(id) {
		this.elements.forEach((element) => {
			const base = String(this.initialDescribedBy.get(element) || "").split(/\s+/);
			const current = String(element.getAttribute("aria-describedby") || "").split(/\s+/);
			const next = unique([
				...base,
				...current,
				id
			]);
			if (next.length) element.setAttribute("aria-describedby", next.join(" "));
		});
	}
	disconnectDescription(id) {
		this.elements.forEach((element) => {
			const base = String(this.initialDescribedBy.get(element) || "").split(/\s+/);
			const current = String(element.getAttribute("aria-describedby") || "").split(/\s+/);
			const next = unique([...base, ...current].filter((token) => token && token !== id));
			if (next.length) element.setAttribute("aria-describedby", next.join(" "));
			else element.removeAttribute("aria-describedby");
		});
	}
	setAriaInvalid(isInvalid, errorId = this.errorId) {
		this.elements.forEach((element) => {
			if (isInvalid) {
				element.setAttribute("aria-invalid", "true");
				if (errorId) element.setAttribute("aria-errormessage", errorId);
				else element.removeAttribute("aria-errormessage");
			} else {
				element.removeAttribute("aria-invalid");
				element.removeAttribute("aria-errormessage");
			}
		});
	}
	setVisualState(state) {
		this.elements.forEach((element) => {
			element.dataset.validationState = state;
			element.classList.toggle("is-valid", state === "valid");
			element.classList.toggle("is-invalid", state === "invalid");
			element.classList.toggle("is-pending", state === "pending");
			element.classList.toggle("is-touched", this.touched);
			element.classList.toggle("is-dirty", this.dirty);
			element.classList.toggle("is-disabled", this.isDisabled());
		});
	}
	clearVisualState() {
		this.elements.forEach((element) => {
			delete element.dataset.validationState;
			element.classList.remove("is-valid", "is-invalid", "is-pending", "is-touched", "is-dirty", "is-disabled");
		});
	}
	focus() {
		this.primaryElement.focus({ preventScroll: true });
		this.primaryElement.scrollIntoView?.({
			block: "center",
			behavior: getPreferredScrollBehavior(this.primaryElement)
		});
	}
	markTouched() {
		this.touched = true;
	}
	markDirty() {
		this.dirty = true;
	}
	clearServerMessage() {
		this.serverMessage = "";
	}
	setServerMessage(message) {
		this.serverMessage = message;
		this.lastError = message;
	}
	getRules() {
		const nativeRules = this.getNativeRules();
		const dataRules = this.getDataRules();
		const configuredRules = parseRuleList(this.getFieldConfig());
		return {
			...nativeRules,
			...dataRules,
			...configuredRules
		};
	}
	getNativeRules() {
		if (!this.validator.options.useNativeRules) return {};
		const rules = {};
		const requiredRuleName = ["checkbox", "radio"].includes(this.type) ? "checked" : "required";
		if (this.elements.some((element) => element.hasAttribute("required"))) rules[requiredRuleName] = true;
		if (this.type === "email") rules.email = true;
		const minLength$1 = toSafeInteger(this.primaryElement.getAttribute("minlength") ?? void 0, NaN, { min: 0 });
		if (Number.isFinite(minLength$1)) rules.minLength = { min: minLength$1 };
		const maxLength$1 = toSafeInteger(this.primaryElement.getAttribute("maxlength") ?? void 0, NaN, { min: 0 });
		if (Number.isFinite(maxLength$1)) rules.maxLength = { max: maxLength$1 };
		const pattern$1 = this.primaryElement.getAttribute("pattern");
		if (pattern$1) rules.pattern = { pattern: pattern$1 };
		return rules;
	}
	getDataRules() {
		const rules = parseRuleList(this.primaryElement.dataset.validate);
		if (this.primaryElement.dataset.required === "true") rules.required = true;
		if (this.primaryElement.dataset.checked === "true") rules.checked = true;
		const dataMinLength = toSafeInteger(this.primaryElement.dataset.minLength, NaN, { min: 0 });
		if (Number.isFinite(dataMinLength)) rules.minLength = { min: dataMinLength };
		const dataMaxLength = toSafeInteger(this.primaryElement.dataset.maxLength, NaN, { min: 0 });
		if (Number.isFinite(dataMaxLength)) rules.maxLength = { max: dataMaxLength };
		if (this.primaryElement.dataset.pattern) rules.pattern = { pattern: this.primaryElement.dataset.pattern };
		if (this.primaryElement.dataset.sameAs) rules.sameAs = { selector: this.primaryElement.dataset.sameAs };
		return Object.fromEntries(Object.entries(rules).map(([key, value]) => [key, toRuleOptions(value, key)]));
	}
	getValidationContext(ruleName, ruleOptions, allValues) {
		return {
			field: this,
			form: this.validator.form,
			value: this.getValue(),
			options: toRuleOptions(ruleOptions, ruleName),
			allValues,
			validator: this.validator
		};
	}
	getNativeValidationMessage() {
		if (typeof this.primaryElement.validationMessage === "string") return this.primaryElement.validationMessage;
		return "";
	}
	destroy() {
		this.clearServerMessage();
		this.lastError = "";
		this.setAriaInvalid(false);
		this.clearVisualState();
		this.elements.forEach((element) => {
			const initial = this.initialDescribedBy.get(element);
			if (initial) element.setAttribute("aria-describedby", initial);
			else element.removeAttribute("aria-describedby");
		});
		if (this.generatedPrimaryId && this.primaryElement.id === this.primaryId) this.primaryElement.removeAttribute("id");
	}
};

//#endregion
//#region src/locales/en.json
var en_default = {
	required: "This field is required.",
	email: "Enter a valid email address.",
	minLength: "Enter at least {min} characters.",
	maxLength: "Enter no more than {max} characters.",
	pattern: "Enter a value in the correct format.",
	checked: "Select this option to continue.",
	sameAs: "This value must match {targetLabel}.",
	summaryTitleOne: "There is 1 problem with your form.",
	summaryTitleOther: "There are {count} problems with your form.",
	summaryItem: "{fieldLabel}: {message}",
	genericFallback: "Check this field."
};

//#endregion
//#region src/core/MessageResolver.ts
var MessageResolver = class {
	validator;
	defaultMessages;
	constructor(validator) {
		this.validator = validator;
		this.defaultMessages = en_default;
	}
	detectLocale() {
		const explicit = this.validator.options.locale;
		const formLang = this.validator.form.getAttribute("lang");
		const documentLang = this.validator.form.ownerDocument.documentElement.getAttribute("lang");
		return explicit || formLang || documentLang || "en";
	}
	getLocaleCandidates(locale = this.detectLocale()) {
		const candidates = [];
		if (locale) {
			candidates.push(locale);
			const [base] = locale.split("-");
			if (base && base !== locale) candidates.push(base);
		}
		candidates.push("en");
		return [...new Set(candidates.filter(Boolean))];
	}
	getLocaleMessage(key) {
		const candidates = this.getLocaleCandidates();
		const configuredLocales = this.validator.options.locales || {};
		for (const locale of candidates) {
			const localeMessages = configuredLocales[locale];
			if (localeMessages && localeMessages[key] != null) return localeMessages[key];
		}
		if (this.validator.options.messages?.[key] != null) return this.validator.options.messages[key];
		return this.defaultMessages[key];
	}
	resolveValue(message, context) {
		if (typeof message === "function") return message(context);
		if (typeof message === "string") return applyPlaceholders(message, context.params);
		return "";
	}
	getSummaryTitle(count) {
		const key = count === 1 ? "summaryTitleOne" : "summaryTitleOther";
		const message = this.getLocaleMessage(key) || this.getLocaleMessage("summaryTitle");
		return this.resolveValue(message, {
			field: null,
			fieldName: "",
			fieldLabel: "",
			form: this.validator.form,
			rule: key,
			value: count,
			params: { count },
			locale: this.detectLocale()
		}) || `There ${count === 1 ? "is" : "are"} ${count} problem${count === 1 ? "" : "s"} with your form.`;
	}
	getSummaryItem(field, message) {
		const fieldLabel = field.getLabel();
		const params = {
			label: fieldLabel,
			fieldLabel,
			fieldName: field.name,
			message
		};
		const summaryMessage = this.validator.options.messages?.summaryItem ?? this.getLocaleMessage("summaryItem");
		const context = {
			field,
			fieldName: field.name,
			fieldLabel,
			form: this.validator.form,
			rule: "summaryItem",
			value: message,
			params,
			locale: this.detectLocale()
		};
		return this.resolveValue(summaryMessage, context) || `${fieldLabel}: ${message}`;
	}
	resolve(field, ruleName, result) {
		const target = field.primaryElement;
		const fieldLabel = field.getLabel();
		const params = {
			...result.params,
			label: fieldLabel,
			fieldLabel,
			targetLabel: result.params?.targetLabel || "",
			value: field.getValue()
		};
		const context = {
			field,
			fieldName: field.name,
			fieldLabel,
			form: this.validator.form,
			rule: ruleName,
			value: field.getValue(),
			params,
			locale: this.detectLocale()
		};
		const fieldMessages = this.validator.options.messages?.fields;
		const shouldUseNativeMessage = this.validator.options.errorMode === "native" || Boolean(result.nativeMessage);
		const candidates = [
			field.serverMessage,
			field.getDataMessage(ruleName),
			fieldMessages?.[field.name]?.[ruleName],
			this.validator.options.messages?.[ruleName],
			result.message,
			shouldUseNativeMessage ? result.nativeMessage : "",
			shouldUseNativeMessage && target.validity?.valid === false ? field.getNativeValidationMessage() : "",
			this.getLocaleMessage(result.messageKey || ruleName),
			this.defaultMessages[result.messageKey || ruleName],
			this.defaultMessages.genericFallback,
			"Check this field."
		];
		for (const candidate of candidates) {
			const value = this.resolveValue(candidate, context);
			if (value) return value;
		}
		return "Check this field.";
	}
};

//#endregion
//#region src/core/RuleRegistry.ts
var RuleRegistry = class {
	rules;
	constructor() {
		this.rules = /* @__PURE__ */ new Map();
	}
	register(name, rule) {
		this.rules.set(name, rule);
		return this;
	}
	unregister(name) {
		this.rules.delete(name);
		return this;
	}
	has(name) {
		return this.rules.has(name);
	}
	async run(name, context) {
		const rule = this.rules.get(name);
		if (!rule) return {
			valid: true,
			messageKey: name,
			params: {}
		};
		const rawResult = await rule(context);
		return this.normalize(name, rawResult);
	}
	normalize(name, result) {
		if (result == null || result === true) return {
			valid: true,
			messageKey: name,
			params: {}
		};
		if (result === false) return {
			valid: false,
			messageKey: name,
			params: {}
		};
		if (typeof result === "string") return {
			valid: false,
			messageKey: name,
			message: result,
			params: {}
		};
		return {
			valid: Boolean(result.valid),
			messageKey: result.messageKey || name,
			message: result.message,
			params: result.params || {},
			metadata: result.metadata || {},
			nativeMessage: result.nativeMessage
		};
	}
};

//#endregion
//#region src/core/ValidationState.ts
var ValidationState = class {
	formState;
	fieldStates;
	constructor() {
		this.formState = "idle";
		this.fieldStates = /* @__PURE__ */ new Map();
	}
	ensure(name) {
		if (!this.fieldStates.has(name)) this.fieldStates.set(name, {
			pristine: true,
			dirty: false,
			touched: false,
			pending: false,
			valid: false,
			invalid: false,
			disabled: false,
			ignored: false
		});
		return this.fieldStates.get(name);
	}
	updateField(name, patch) {
		const current = this.ensure(name);
		this.fieldStates.set(name, {
			...current,
			...patch
		});
		return this.fieldStates.get(name);
	}
	setFormState(state) {
		this.formState = state;
	}
	snapshot() {
		return {
			form: this.formState,
			fields: Object.fromEntries(this.fieldStates.entries())
		};
	}
};

//#endregion
//#region src/core/A11yFormValidator.ts
const COMPONENT_NAME = "a11y-form-validator";
const EVENTS = Object.freeze({
	init: `${COMPONENT_NAME}:init`,
	beforeValidate: `${COMPONENT_NAME}:before-validate`,
	afterValidate: `${COMPONENT_NAME}:after-validate`,
	fieldValid: `${COMPONENT_NAME}:field-valid`,
	fieldInvalid: `${COMPONENT_NAME}:field-invalid`,
	formValid: `${COMPONENT_NAME}:form-valid`,
	formInvalid: `${COMPONENT_NAME}:form-invalid`,
	submitBlocked: `${COMPONENT_NAME}:submit-blocked`,
	destroy: `${COMPONENT_NAME}:destroy`
});
const SELECTORS = Object.freeze({
	fields: "input, select, textarea",
	initAll: "[data-a11y-form-validator]"
});
const CLASSES = Object.freeze({
	root: COMPONENT_NAME,
	initialized: "is-initialized"
});
const ATTRIBUTES = Object.freeze({
	describedBy: "aria-describedby",
	errorMessage: "aria-errormessage",
	hidden: "hidden",
	invalid: "aria-invalid",
	noValidate: "novalidate",
	validationState: "data-validation-state"
});
const DEFAULT_OPTIONS = Object.freeze({
	validateOn: ["submit"],
	focusOnError: "summary",
	errorMode: "inline",
	useNativeRules: true,
	disableNativeUI: true,
	validateHidden: false,
	ignore: Object.freeze({
		disabled: true,
		hidden: true,
		selector: ""
	}),
	debounce: 150,
	messages: Object.freeze({}),
	locales: Object.freeze({}),
	locale: "",
	selectors: Object.freeze({ fields: SELECTORS.fields }),
	addons: [],
	renderer: null,
	rules: Object.freeze({})
});
var A11yFormValidator = class A11yFormValidator {
	static instances = /* @__PURE__ */ new WeakMap();
	form;
	options;
	events;
	state;
	ruleRegistry;
	messageResolver;
	renderer;
	fields;
	fieldMap;
	enabled;
	hasSubmitted;
	formErrors;
	summaryAddon;
	addons;
	timers;
	addedRootClass;
	addedNoValidate;
	abortController;
	validationRuns;
	destroyed;
	inlineErrorAnnouncementsMuted;
	onSubmit;
	onFocusOut;
	onInput;
	onChange;
	constructor(form, options = {}) {
		if (!(form instanceof HTMLFormElement)) throw new TypeError("A11yFormValidator expects an HTMLFormElement.");
		const existingInstance = A11yFormValidator.instances.get(form);
		if (existingInstance) return existingInstance;
		A11yFormValidator.instances.set(form, this);
		this.form = form;
		this.options = this.normalizeOptions(options);
		this.events = new EventEmitter(this.form);
		this.state = new ValidationState();
		this.ruleRegistry = new RuleRegistry();
		this.messageResolver = new MessageResolver(this);
		this.renderer = this.options.renderer || new ErrorRenderer(this);
		this.fields = [];
		this.fieldMap = /* @__PURE__ */ new Map();
		this.enabled = true;
		this.hasSubmitted = false;
		this.formErrors = [];
		this.summaryAddon = null;
		this.addons = [];
		this.timers = /* @__PURE__ */ new Map();
		this.addedRootClass = !this.form.classList.contains(CLASSES.root);
		this.addedNoValidate = this.options.disableNativeUI && this.options.errorMode !== "native" && !this.form.hasAttribute("novalidate");
		const AbortControllerConstructor = this.form.ownerDocument.defaultView?.AbortController || globalThis.AbortController;
		this.abortController = AbortControllerConstructor ? new AbortControllerConstructor() : null;
		this.validationRuns = /* @__PURE__ */ new Map();
		this.destroyed = false;
		this.inlineErrorAnnouncementsMuted = false;
		this.onSubmit = this.handleSubmit.bind(this);
		this.onFocusOut = this.handleFocusOut.bind(this);
		this.onInput = this.handleInput.bind(this);
		this.onChange = this.handleChange.bind(this);
		this.registerDefaultRules();
		this.form.classList.add(CLASSES.root, CLASSES.initialized);
		if (this.addedNoValidate) this.form.setAttribute("novalidate", "novalidate");
		this.refresh();
		this.bindEvents();
		this.installAddons();
		this.emit(EVENTS.init);
	}
	static getInstance(form) {
		return A11yFormValidator.instances.get(form);
	}
	normalizeOptions(options) {
		const merged = mergeOptions(DEFAULT_OPTIONS, options);
		return {
			...merged,
			validateOn: normalizeToArray(merged.validateOn),
			addons: normalizeToArray(merged.addons),
			debounce: toSafeInteger(merged.debounce, DEFAULT_OPTIONS.debounce, { min: 0 }),
			ignore: {
				...DEFAULT_OPTIONS.ignore,
				...options.ignore || {}
			},
			selectors: {
				...DEFAULT_OPTIONS.selectors,
				...options.selectors || {}
			},
			messages: options.messages || DEFAULT_OPTIONS.messages,
			locales: options.locales || DEFAULT_OPTIONS.locales,
			rules: options.rules || DEFAULT_OPTIONS.rules
		};
	}
	emit(name, detail = {}) {
		this.events.emit(name, {
			instance: this,
			validator: this,
			...detail
		});
	}
	shouldAnnounceInlineErrors() {
		return !this.inlineErrorAnnouncementsMuted;
	}
	shouldMuteInlineErrorsForBatch(reason) {
		return reason === "submit" && this.options.focusOnError === "summary" && Boolean(this.summaryAddon);
	}
	registerDefaultRules() {
		this.registerRule("required", required_default);
		this.registerRule("email", email_default);
		this.registerRule("minLength", minLength_default);
		this.registerRule("maxLength", maxLength_default);
		this.registerRule("pattern", pattern_default);
		this.registerRule("checked", checked_default);
		this.registerRule("sameAs", same_as_default);
	}
	registerRule(name, rule) {
		this.ruleRegistry.register(name, rule);
		return this;
	}
	unregisterRule(name) {
		this.ruleRegistry.unregister(name);
		return this;
	}
	installAddons() {
		this.addons = normalizeToArray(this.options.addons).filter((addon) => {
			return Boolean(addon) && typeof addon === "object" && typeof addon.install === "function";
		});
		this.addons.forEach((addon) => addon.install(this));
	}
	collectFields() {
		const nodes = Array.from(this.form.querySelectorAll(this.options.selectors.fields)).filter((element) => {
			return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
		}).filter((element) => element.name || element.id);
		const nameCounts = nodes.reduce((counts, element) => {
			const name = element.name || element.id;
			counts.set(name, (counts.get(name) || 0) + 1);
			return counts;
		}, /* @__PURE__ */ new Map());
		const grouped = /* @__PURE__ */ new Map();
		nodes.forEach((element) => {
			const name = element.name || element.id;
			const type = (element.type || element.tagName).toLowerCase();
			const shouldGroup = type === "radio" || type === "checkbox" && (nameCounts.get(name) || 0) > 1;
			if (!grouped.has(name)) grouped.set(name, []);
			const group = grouped.get(name);
			if (shouldGroup) {
				group.push(element);
				return;
			}
			if (group.length === 0) group.push(element);
		});
		return [...grouped.entries()].map(([name, elements]) => new FieldController(this, name, elements));
	}
	refresh() {
		this.fields = this.collectFields();
		this.fieldMap = new Map(this.fields.map((field) => [field.name, field]));
		this.fields.forEach((field) => this.state.ensure(field.name));
		return this;
	}
	bindEvents() {
		const listenerOptions = this.abortController ? { signal: this.abortController.signal } : void 0;
		this.form.addEventListener("submit", this.onSubmit, listenerOptions);
		this.form.addEventListener("focusout", this.onFocusOut, listenerOptions);
		this.form.addEventListener("input", this.onInput, listenerOptions);
		this.form.addEventListener("change", this.onChange, listenerOptions);
	}
	async handleSubmit(event) {
		if (!this.enabled || !this.options.validateOn.includes("submit")) return;
		this.hasSubmitted = true;
		if (!await this.validate({ reason: "submit" })) {
			event.preventDefault();
			this.emit(EVENTS.submitBlocked, { errors: this.getErrors() });
			this.focusOnError();
		}
	}
	handleFocusOut(event) {
		const field = this.findFieldByElement(event.target);
		if (!field) return;
		field.markTouched();
		if (this.options.validateOn.includes("blur") || this.hasSubmitted) this.validateField(field, { reason: "blur" });
	}
	handleInput(event) {
		const field = this.findFieldByElement(event.target);
		if (!field) return;
		field.markDirty();
		field.clearServerMessage();
		this.formErrors = [];
		if (this.options.validateOn.includes("input")) this.queueValidation(field, "input");
		else if (field.lastError && !field.serverMessage) {
			this.renderer.clear(field);
			field.lastError = "";
		}
	}
	handleChange(event) {
		const field = this.findFieldByElement(event.target);
		if (!field) return;
		field.markDirty();
		field.clearServerMessage();
		if (this.options.validateOn.includes("change")) this.validateField(field, { reason: "change" });
	}
	queueValidation(field, reason) {
		clearTimeout(this.timers.get(field.name));
		const timer = setTimeout(() => {
			this.validateField(field, { reason });
			this.timers.delete(field.name);
		}, this.options.debounce);
		this.timers.set(field.name, timer);
	}
	findFieldByElement(element) {
		if (!(element instanceof HTMLElement)) return;
		return this.fields.find((field) => field.elements.some((fieldElement) => fieldElement === element));
	}
	resolveField(input) {
		if (input instanceof FieldController) return input;
		if (typeof input === "string") return this.fieldMap.get(input) || null;
		if (input instanceof HTMLElement) return this.findFieldByElement(input) || null;
		return null;
	}
	getAllValues() {
		return Object.fromEntries(this.fields.map((field) => [field.name, field.getValue()]));
	}
	async validate(options = {}) {
		const reason = options.reason || "manual";
		const previousInlineErrorAnnouncementsMuted = this.inlineErrorAnnouncementsMuted;
		this.inlineErrorAnnouncementsMuted = previousInlineErrorAnnouncementsMuted || this.shouldMuteInlineErrorsForBatch(reason);
		try {
			this.emit(EVENTS.beforeValidate, { reason });
			this.state.setFormState("validating");
			const valid = (await Promise.all(this.fields.map((field) => this.validateField(field, options)))).every(Boolean) && this.formErrors.length === 0;
			this.state.setFormState(valid ? "valid" : "invalid");
			this.emit(EVENTS.afterValidate, {
				valid,
				errors: this.getErrors()
			});
			this.emit(valid ? EVENTS.formValid : EVENTS.formInvalid, { errors: this.getErrors() });
			return valid;
		} finally {
			this.inlineErrorAnnouncementsMuted = previousInlineErrorAnnouncementsMuted;
		}
	}
	async validateField(input, options = {}) {
		const field = this.resolveField(input);
		if (!field) return true;
		const ignoredReason = field.shouldIgnore();
		if (ignoredReason) {
			field.lastError = "";
			this.renderer.clear(field);
			this.state.updateField(field.name, {
				ignored: ignoredReason !== "disabled",
				disabled: ignoredReason === "disabled",
				valid: true,
				invalid: false,
				pending: false,
				touched: field.touched,
				dirty: field.dirty,
				pristine: !field.dirty
			});
			return true;
		}
		if (field.serverMessage) {
			this.renderer.render(field, field.serverMessage);
			this.state.updateField(field.name, {
				valid: false,
				invalid: true,
				pending: false,
				touched: field.touched,
				dirty: field.dirty,
				pristine: !field.dirty
			});
			this.emit(EVENTS.fieldInvalid, {
				field,
				message: field.serverMessage,
				reason: options.reason || "manual"
			});
			return false;
		}
		const runId = (this.validationRuns.get(field.name) || 0) + 1;
		this.validationRuns.set(field.name, runId);
		field.setVisualState("pending");
		this.state.updateField(field.name, {
			pending: true,
			touched: field.touched,
			dirty: field.dirty,
			pristine: !field.dirty
		});
		const rules = field.getRules();
		const allValues = this.getAllValues();
		for (const [ruleName, ruleOptions] of Object.entries(rules)) {
			const result = await this.ruleRegistry.run(ruleName, field.getValidationContext(ruleName, ruleOptions, allValues));
			if (this.validationRuns.get(field.name) !== runId) return !field.lastError;
			if (!result.valid) {
				const message = this.messageResolver.resolve(field, ruleName, result);
				field.lastError = message;
				this.renderer.render(field, message);
				this.state.updateField(field.name, {
					valid: false,
					invalid: true,
					pending: false,
					touched: field.touched,
					dirty: field.dirty,
					pristine: !field.dirty,
					ignored: false,
					disabled: false
				});
				this.emit(EVENTS.fieldInvalid, {
					field,
					message,
					reason: options.reason || "manual"
				});
				return false;
			}
		}
		field.lastError = "";
		this.renderer.clear(field);
		this.state.updateField(field.name, {
			valid: true,
			invalid: false,
			pending: false,
			touched: field.touched,
			dirty: field.dirty,
			pristine: !field.dirty,
			ignored: false,
			disabled: false
		});
		this.emit(EVENTS.fieldValid, {
			field,
			reason: options.reason || "manual"
		});
		return true;
	}
	reset() {
		this.form.reset();
		this.hasSubmitted = false;
		this.clearErrors();
		this.fields.forEach((field) => {
			field.dirty = false;
			field.touched = false;
			field.setVisualState("valid");
			this.state.updateField(field.name, {
				pristine: true,
				dirty: false,
				touched: false,
				pending: false,
				valid: false,
				invalid: false,
				disabled: false,
				ignored: false
			});
		});
		this.state.setFormState("idle");
		return this;
	}
	clearErrors() {
		this.formErrors = [];
		this.fields.forEach((field) => {
			field.clearServerMessage();
			field.lastError = "";
			this.renderer.clear(field);
		});
		this.emit(EVENTS.afterValidate, {
			valid: true,
			errors: this.getErrors()
		});
		return this;
	}
	setErrors(errors = {}) {
		this.clearErrors();
		const fieldErrors = errors.fields || Object.fromEntries(Object.entries(errors).filter(([key]) => ![
			"form",
			"_form",
			"fields"
		].includes(key)));
		const formErrors = errors.form || errors._form || [];
		const previousInlineErrorAnnouncementsMuted = this.inlineErrorAnnouncementsMuted;
		this.inlineErrorAnnouncementsMuted = previousInlineErrorAnnouncementsMuted || this.options.focusOnError === "summary" && Boolean(this.summaryAddon);
		try {
			this.formErrors = Array.isArray(formErrors) ? formErrors.map(String) : [formErrors].filter(Boolean).map(String);
			Object.entries(fieldErrors).forEach(([name, message]) => {
				const field = this.fieldMap.get(name);
				if (!field || !message) return;
				const text = Array.isArray(message) ? String(message[0]) : String(message);
				field.setServerMessage(text);
				this.renderer.render(field, text);
				this.state.updateField(field.name, {
					valid: false,
					invalid: true,
					pending: false,
					touched: field.touched,
					dirty: field.dirty,
					pristine: !field.dirty,
					ignored: false,
					disabled: false
				});
			});
		} finally {
			this.inlineErrorAnnouncementsMuted = previousInlineErrorAnnouncementsMuted;
		}
		this.state.setFormState("invalid");
		this.emit(EVENTS.afterValidate, {
			valid: false,
			errors: this.getErrors()
		});
		this.emit(EVENTS.formInvalid, { errors: this.getErrors() });
		return this;
	}
	getErrors() {
		return {
			fields: Object.fromEntries(this.fields.filter((field) => field.lastError).map((field) => [field.name, field.lastError])),
			form: [...this.formErrors]
		};
	}
	getState() {
		return this.state.snapshot();
	}
	enable() {
		this.enabled = true;
		return this;
	}
	disable() {
		this.enabled = false;
		return this;
	}
	focusOnError() {
		if (this.options.focusOnError === false) return;
		if (this.options.focusOnError === "summary" && this.summaryAddon?.hasErrors()) {
			this.summaryAddon.focus();
			return;
		}
		this.fields.find((field) => field.lastError)?.focus();
	}
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		if (this.abortController) this.abortController.abort();
		else {
			this.form.removeEventListener("submit", this.onSubmit);
			this.form.removeEventListener("focusout", this.onFocusOut);
			this.form.removeEventListener("input", this.onInput);
			this.form.removeEventListener("change", this.onChange);
		}
		this.timers.forEach((timer) => clearTimeout(timer));
		this.timers.clear();
		this.renderer.destroy?.();
		this.addons.forEach((addon) => addon.destroy?.());
		this.fields.forEach((field) => field.destroy());
		this.form.classList.remove(CLASSES.initialized);
		if (this.addedRootClass) this.form.classList.remove(CLASSES.root);
		if (this.addedNoValidate) this.form.removeAttribute("novalidate");
		this.emit(EVENTS.destroy);
		A11yFormValidator.instances.delete(this.form);
	}
};
function createFormValidator(form, options = {}) {
	return new A11yFormValidator(form, options);
}
function initFormValidators(options = {}, root) {
	const scope = root || globalThis.document;
	if (!scope) return [];
	return Array.from(scope.querySelectorAll(SELECTORS.initAll)).filter((element) => element instanceof HTMLFormElement).map((form) => createFormValidator(form, options));
}

//#endregion
export { A11yFormValidator, ATTRIBUTES, CLASSES, DEFAULT_OPTIONS, EVENTS, ErrorRenderer, EventEmitter, FieldController, MessageResolver, RuleRegistry, SELECTORS, ValidationState, createDefaultPreset, createFormValidator, createMinimalPreset, createNoSummaryPreset, en_default as enMessages, initFormValidators };
//# sourceMappingURL=index.js.map