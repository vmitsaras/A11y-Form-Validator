import { a as getPreferredScrollBehavior, r as ensureElementId } from "./helpers.js";

//#region src/addons/error-summary.ts
function createErrorSummaryAddon(options = {}) {
	return {
		validator: null,
		options,
		container: null,
		title: null,
		list: null,
		install(validator) {
			this.validator = validator;
			this.options = options;
			const document = validator.form.ownerDocument;
			this.container = document.createElement("section");
			this.container.className = "a11y-form-validator__summary";
			this.container.hidden = true;
			this.container.tabIndex = -1;
			this.title = document.createElement("h2");
			this.title.id = options.titleId || `${ensureElementId(validator.form, "a11y-form-validator-form")}-summary-title`;
			this.title.className = "a11y-form-validator__summary-title";
			this.container.setAttribute("aria-labelledby", this.title.id);
			this.list = document.createElement("ul");
			this.list.className = "a11y-form-validator__summary-list";
			this.container.append(this.title, this.list);
			validator.form.prepend(this.container);
			validator.summaryAddon = this;
			this.unsubscribeAfterValidate = validator.events.on("a11y-form-validator:after-validate", () => this.update());
			this.unsubscribeDestroy = validator.events.on("a11y-form-validator:destroy", () => this.destroy());
		},
		getErrors() {
			if (!this.validator) return [];
			const fieldErrors = this.validator.fields.filter((field) => field.lastError).map((field) => ({
				field,
				message: field.lastError
			}));
			return [...this.validator.formErrors.map((message, index) => ({
				field: null,
				message,
				key: `form-${index}`
			})), ...fieldErrors];
		},
		hasErrors() {
			return this.getErrors().length > 0;
		},
		update() {
			if (!this.container || !this.list || !this.title || !this.validator) return;
			const errors = this.getErrors();
			this.list.replaceChildren();
			if (!errors.length) {
				this.container.hidden = true;
				return;
			}
			this.title.textContent = this.validator.messageResolver.getSummaryTitle(errors.length);
			errors.forEach((entry) => {
				const item = this.validator.form.ownerDocument.createElement("li");
				if (!entry.field) item.textContent = entry.message;
				else {
					const link = this.validator.form.ownerDocument.createElement("a");
					link.className = "a11y-form-validator__summary-link";
					link.href = `#${entry.field.primaryId}`;
					link.textContent = this.validator.messageResolver.getSummaryItem(entry.field, entry.message);
					const field = entry.field;
					link.addEventListener("click", (event) => {
						event.preventDefault();
						field.focus();
					});
					item.append(link);
				}
				this.list.append(item);
			});
			this.container.hidden = false;
		},
		focus() {
			if (this.hasErrors() && this.container) {
				this.container.focus({ preventScroll: true });
				this.container.scrollIntoView?.({
					block: "start",
					behavior: getPreferredScrollBehavior(this.container)
				});
			}
		},
		destroy() {
			this.unsubscribeAfterValidate?.();
			this.unsubscribeDestroy?.();
			this.container?.remove();
			if (this.validator) this.validator.summaryAddon = null;
			this.container = null;
			this.title = null;
			this.list = null;
			this.validator = null;
		}
	};
}
var error_summary_default = createErrorSummaryAddon;

//#endregion
export { error_summary_default as n, createErrorSummaryAddon as t };
//# sourceMappingURL=error-summary.js.map