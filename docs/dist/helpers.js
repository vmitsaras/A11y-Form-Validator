//#region src/core/helpers.ts
const RULE_NAME_PATTERN = /([a-z0-9])([A-Z])/g;
function sanitizeId(value) {
	const input = String(value || "field");
	let output = "";
	let previousWasDash = false;
	for (const character of input) {
		if (character >= "a" && character <= "z" || character >= "A" && character <= "Z" || character >= "0" && character <= "9" || character === "_" || character === "-") {
			output += character;
			previousWasDash = false;
			continue;
		}
		if (!previousWasDash) {
			output += "-";
			previousWasDash = true;
		}
	}
	while (output.startsWith("-")) output = output.slice(1);
	while (output.endsWith("-")) output = output.slice(0, -1);
	return output || "field";
}
function escapeSelectorIdentifier(value) {
	const input = String(value || "");
	if (globalThis.CSS?.escape) return globalThis.CSS.escape(input);
	return input.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}
function ensureElementId(element, prefix = "a11y-form-validator-field") {
	if (element.id) return element.id;
	const rawBase = element.name || element.getAttribute("name") || "";
	const base = rawBase ? sanitizeId(rawBase) : "";
	const root = element.ownerDocument;
	let id = base ? `${prefix}-${base}` : prefix;
	let index = 2;
	while (root.getElementById(id)) {
		id = `${prefix}-${base}-${index}`;
		index += 1;
	}
	element.id = id;
	return id;
}
function getPreferredScrollBehavior(element) {
	return (element?.ownerDocument?.defaultView || globalThis).matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
function kebabToCamelCase(value = "") {
	return String(value).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
function camelToKebabCase(value = "") {
	return String(value).replace(RULE_NAME_PATTERN, "$1-$2").toLowerCase();
}
function normalizeToArray(value) {
	if (Array.isArray(value)) return value;
	if (value == null || value === false) return [];
	return [value];
}
function toSafeInteger(value, fallback, options = {}) {
	const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
	if (!Number.isFinite(parsed)) return fallback;
	if (options.min !== void 0 && parsed < options.min) return fallback;
	if (options.max !== void 0 && parsed > options.max) return fallback;
	return parsed;
}
function mergeOptions(defaults, overrides = {}) {
	const output = {
		...defaults,
		...overrides
	};
	output.ignore = {
		...defaults.ignore || {},
		...overrides.ignore || {}
	};
	output.selectors = {
		...defaults.selectors || {},
		...overrides.selectors || {}
	};
	output.messages = overrides?.messages || defaults.messages;
	output.locales = overrides?.locales || defaults.locales;
	output.rules = overrides?.rules || defaults.rules;
	output.addons = normalizeToArray(overrides.addons ?? defaults.addons);
	output.validateOn = normalizeToArray(overrides.validateOn ?? defaults.validateOn);
	output.debounce = Number(overrides.debounce ?? defaults.debounce);
	return output;
}
function parseRuleList(value) {
	if (!value) return {};
	if (Array.isArray(value)) return value.reduce((rules, rule) => ({
		...rules,
		...parseRuleList(rule)
	}), {});
	if (typeof value === "object") return { ...value };
	return String(value).split(/\s+/).filter(Boolean).reduce((rules, ruleToken) => {
		const [rawName, rawParam] = ruleToken.split(":");
		const ruleName = kebabToCamelCase(rawName);
		if (!ruleName) return rules;
		if (rawParam == null || rawParam === "") {
			rules[ruleName] = true;
			return rules;
		}
		const numericValue = Number(rawParam);
		rules[ruleName] = Number.isNaN(numericValue) ? rawParam : numericValue;
		return rules;
	}, {});
}
function unique(values) {
	return [...new Set(values.filter(Boolean))];
}
function isEmptyValue(value) {
	if (Array.isArray(value)) return value.length === 0;
	if (typeof FileList !== "undefined" && value instanceof FileList) return value.length === 0;
	if (value && typeof value === "object" && "length" in value && typeof value.length === "number") return value.length === 0;
	if (typeof value === "boolean") return value === false;
	return String(value ?? "").trim() === "";
}
function applyPlaceholders(template, params = {}) {
	const input = String(template);
	let output = "";
	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];
		if (character !== "{") {
			output += character;
			continue;
		}
		const closingIndex = input.indexOf("}", index + 1);
		if (closingIndex === -1) {
			output += character;
			continue;
		}
		const replacement = params[input.slice(index + 1, closingIndex).trim()];
		output += replacement == null ? "" : String(replacement);
		index = closingIndex;
	}
	return output;
}
function toRuleOptions(value, key) {
	if (value === true) return {};
	if (value == null || value === false) return {};
	if (typeof value === "object" && !Array.isArray(value)) return value;
	if (typeof value === "number") {
		if (key === "minLength" || key === "min") return { min: value };
		if (key === "maxLength" || key === "max") return { max: value };
	}
	if (typeof value === "string") {
		if (key === "sameAs") return { selector: value };
		if (key === "pattern") return { pattern: value };
	}
	return { value };
}

//#endregion
export { getPreferredScrollBehavior as a, normalizeToArray as c, toRuleOptions as d, toSafeInteger as f, escapeSelectorIdentifier as i, parseRuleList as l, camelToKebabCase as n, isEmptyValue as o, unique as p, ensureElementId as r, mergeOptions as s, applyPlaceholders as t, sanitizeId as u };
//# sourceMappingURL=helpers.js.map