import type { A11yFormValidator, FieldValue, ValidationContext } from './A11yFormValidator.js';
import {
  camelToKebabCase,
  ensureElementId,
  escapeSelectorIdentifier,
  getPreferredScrollBehavior,
  parseRuleList,
  sanitizeId,
  toRuleOptions,
  toSafeInteger,
  unique,
  type RuleList,
  type RuleOptions
} from './helpers.js';

export type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export type FieldType =
  | 'textarea'
  | 'select'
  | 'select-multiple'
  | 'radio'
  | 'checkbox'
  | 'file'
  | string;

function getControlLabels(element: Element): NodeListOf<HTMLLabelElement> | [] {
  if ('labels' in element && element.labels) {
    return element.labels as NodeListOf<HTMLLabelElement>;
  }

  return [];
}

export class FieldController {
  readonly validator: A11yFormValidator;
  readonly name: string;
  readonly elements: FormControl[];
  readonly primaryElement: FormControl;
  readonly type: FieldType;
  readonly isGroupedChoice: boolean;
  readonly errorId: string;
  readonly primaryId: string;
  readonly initialDescribedBy: Map<FormControl, string>;
  private readonly generatedPrimaryId: boolean;

  serverMessage: string;
  lastError: string;
  touched: boolean;
  dirty: boolean;

  constructor(validator: A11yFormValidator, name: string, elements: FormControl[]) {
    this.validator = validator;
    this.name = name;
    this.elements = [...elements];
    this.primaryElement = this.elements[0];
    this.type = this.detectType();
    this.isGroupedChoice = this.elements.length > 1 && ['radio', 'checkbox'].includes(this.type);
    this.errorId = `a11y-form-validator-error-${sanitizeId(this.validator.form.id || 'form')}-${sanitizeId(this.name)}`;
    this.generatedPrimaryId = !this.primaryElement.id;
    this.primaryId = ensureElementId(this.primaryElement);
    this.initialDescribedBy = new Map(
      this.elements.map((element) => [element, element.getAttribute('aria-describedby') || ''])
    );
    this.serverMessage = '';
    this.lastError = '';
    this.touched = false;
    this.dirty = false;
  }

  detectType(): FieldType {
    const tagName = this.primaryElement.tagName.toLowerCase();
    if (tagName === 'textarea') {
      return 'textarea';
    }

    if (tagName === 'select') {
      return (this.primaryElement as HTMLSelectElement).multiple ? 'select-multiple' : 'select';
    }

    return (this.primaryElement.getAttribute('type') || 'text').toLowerCase();
  }

  getActiveElements(): FormControl[] {
    return this.elements.filter((element) => !element.disabled);
  }

  isDisabled(): boolean {
    return this.getActiveElements().length === 0;
  }

  isHidden(): boolean {
    return this.elements.every((element) => {
      if ((element instanceof HTMLInputElement && element.type === 'hidden') || element.hidden) {
        return true;
      }

      return Boolean(element.closest('[hidden]'));
    });
  }

  shouldIgnore(): false | 'disabled' | 'hidden' | 'selector' {
    const { ignore, validateHidden } = this.validator.options;
    if (ignore.disabled !== false && this.isDisabled()) {
      return 'disabled';
    }

    if (!validateHidden && ignore.hidden !== false && this.isHidden()) {
      return 'hidden';
    }

    if (ignore.selector && this.elements.some((element) => element.matches(ignore.selector))) {
      return 'selector';
    }

    return false;
  }

  getValue(): FieldValue {
    const activeElements = this.getActiveElements();
    if (this.type === 'radio') {
      const selected = activeElements.find((element) => element instanceof HTMLInputElement && element.checked);
      return selected ? selected.value : '';
    }

    if (this.type === 'checkbox' && this.elements.length > 1) {
      return activeElements
        .filter((element): element is HTMLInputElement => element instanceof HTMLInputElement && element.checked)
        .map((element) => element.value);
    }

    if (this.type === 'checkbox') {
      return this.primaryElement instanceof HTMLInputElement ? Boolean(this.primaryElement.checked) : false;
    }

    if (this.type === 'file') {
      return this.primaryElement instanceof HTMLInputElement ? Array.from(this.primaryElement.files || []) : [];
    }

    if (this.type === 'select-multiple' && this.primaryElement instanceof HTMLSelectElement) {
      return Array.from(this.primaryElement.selectedOptions).map((option) => option.value);
    }

    return this.primaryElement.value;
  }

  getFieldConfig(): unknown {
    return this.validator.options.rules?.[this.name] || {};
  }

  getDataMessage(ruleName: string): string {
    return this.primaryElement.dataset[`message${ruleName.charAt(0).toUpperCase()}${ruleName.slice(1)}`] ||
      this.primaryElement.getAttribute(`data-message-${camelToKebabCase(ruleName)}`) ||
      '';
  }

  getLabel(): string {
    const fieldset = this.primaryElement.closest('fieldset');
    if (this.isGroupedChoice && fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) {
        return legend.textContent?.trim() || this.name;
      }
    }

    const id = this.primaryElement.id;
    if (id) {
      const labelSelector = `label[for="${escapeSelectorIdentifier(id)}"]`;
      const label =
        this.validator.form.querySelector(labelSelector) ||
        this.validator.form.ownerDocument.querySelector(labelSelector);
      if (label) {
        return label.textContent?.trim() || this.name;
      }
    }

    const wrapperLabel = this.primaryElement.closest('label');
    if (wrapperLabel) {
      return wrapperLabel.textContent?.trim() || this.name;
    }

    return this.name;
  }

  getTargetLabel(target: Element | null): string {
    if (!target) {
      return '';
    }

    const labels = getControlLabels(target);
    if (labels.length) {
      return labels[0].textContent?.trim() || '';
    }

    if (target.id) {
      const label = this.validator.form.querySelector(`label[for="${escapeSelectorIdentifier(target.id)}"]`);
      if (label) {
        return label.textContent?.trim() || '';
      }
    }

    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
      return target.name || target.id || '';
    }

    return target.id || '';
  }

  getDescribedBy(): string[] {
    return unique(
      this.elements.flatMap((element) => String(element.getAttribute('aria-describedby') || '').split(/\s+/))
    );
  }

  connectDescription(id: string): void {
    this.elements.forEach((element) => {
      const base = String(this.initialDescribedBy.get(element) || '').split(/\s+/);
      const current = String(element.getAttribute('aria-describedby') || '').split(/\s+/);
      const next = unique([...base, ...current, id]);
      if (next.length) {
        element.setAttribute('aria-describedby', next.join(' '));
      }
    });
  }

  disconnectDescription(id: string): void {
    this.elements.forEach((element) => {
      const base = String(this.initialDescribedBy.get(element) || '').split(/\s+/);
      const current = String(element.getAttribute('aria-describedby') || '').split(/\s+/);
      const next = unique([...base, ...current].filter((token) => token && token !== id));
      if (next.length) {
        element.setAttribute('aria-describedby', next.join(' '));
      } else {
        element.removeAttribute('aria-describedby');
      }
    });
  }

  setAriaInvalid(isInvalid: boolean, errorId = this.errorId): void {
    this.elements.forEach((element) => {
      if (isInvalid) {
        element.setAttribute('aria-invalid', 'true');
        if (errorId) {
          element.setAttribute('aria-errormessage', errorId);
        } else {
          element.removeAttribute('aria-errormessage');
        }
      } else {
        element.removeAttribute('aria-invalid');
        element.removeAttribute('aria-errormessage');
      }
    });
  }

  setVisualState(state: 'valid' | 'invalid' | 'pending'): void {
    this.elements.forEach((element) => {
      element.dataset.validationState = state;
      element.classList.toggle('is-valid', state === 'valid');
      element.classList.toggle('is-invalid', state === 'invalid');
      element.classList.toggle('is-pending', state === 'pending');
      element.classList.toggle('is-touched', this.touched);
      element.classList.toggle('is-dirty', this.dirty);
      element.classList.toggle('is-disabled', this.isDisabled());
    });
  }

  clearVisualState(): void {
    this.elements.forEach((element) => {
      delete element.dataset.validationState;
      element.classList.remove('is-valid', 'is-invalid', 'is-pending', 'is-touched', 'is-dirty', 'is-disabled');
    });
  }

  focus(): void {
    this.primaryElement.focus({ preventScroll: true });
    this.primaryElement.scrollIntoView?.({
      block: 'center',
      behavior: getPreferredScrollBehavior(this.primaryElement)
    });
  }

  markTouched(): void {
    this.touched = true;
  }

  markDirty(): void {
    this.dirty = true;
  }

  clearServerMessage(): void {
    this.serverMessage = '';
  }

  setServerMessage(message: string): void {
    this.serverMessage = message;
    this.lastError = message;
  }

  getRules(): RuleList {
    const nativeRules = this.getNativeRules();
    const dataRules = this.getDataRules();
    const configuredRules = parseRuleList(this.getFieldConfig());

    return {
      ...nativeRules,
      ...dataRules,
      ...configuredRules
    };
  }

  getNativeRules(): RuleList {
    if (!this.validator.options.useNativeRules) {
      return {};
    }

    const rules: RuleList = {};
    const requiredRuleName = ['checkbox', 'radio'].includes(this.type) ? 'checked' : 'required';
    if (this.elements.some((element) => element.hasAttribute('required'))) {
      rules[requiredRuleName] = true;
    }

    if (this.type === 'email') {
      rules.email = true;
    }

    const minLength = toSafeInteger(this.primaryElement.getAttribute('minlength') ?? undefined, Number.NaN, { min: 0 });
    if (Number.isFinite(minLength)) {
      rules.minLength = { min: minLength };
    }

    const maxLength = toSafeInteger(this.primaryElement.getAttribute('maxlength') ?? undefined, Number.NaN, { min: 0 });
    if (Number.isFinite(maxLength)) {
      rules.maxLength = { max: maxLength };
    }

    const pattern = this.primaryElement.getAttribute('pattern');
    if (pattern) {
      rules.pattern = { pattern };
    }

    return rules;
  }

  getDataRules(): RuleList {
    const rules = parseRuleList(this.primaryElement.dataset.validate);
    if (this.primaryElement.dataset.required === 'true') {
      rules.required = true;
    }

    if (this.primaryElement.dataset.checked === 'true') {
      rules.checked = true;
    }

    const dataMinLength = toSafeInteger(this.primaryElement.dataset.minLength, Number.NaN, { min: 0 });
    if (Number.isFinite(dataMinLength)) {
      rules.minLength = { min: dataMinLength };
    }

    const dataMaxLength = toSafeInteger(this.primaryElement.dataset.maxLength, Number.NaN, { min: 0 });
    if (Number.isFinite(dataMaxLength)) {
      rules.maxLength = { max: dataMaxLength };
    }

    if (this.primaryElement.dataset.pattern) {
      rules.pattern = { pattern: this.primaryElement.dataset.pattern };
    }

    if (this.primaryElement.dataset.sameAs) {
      rules.sameAs = { selector: this.primaryElement.dataset.sameAs };
    }

    return Object.fromEntries(
      Object.entries(rules).map(([key, value]) => [key, toRuleOptions(value, key)])
    );
  }

  getValidationContext(ruleName: string, ruleOptions: unknown, allValues: Record<string, FieldValue>): ValidationContext {
    return {
      field: this,
      form: this.validator.form,
      value: this.getValue(),
      options: toRuleOptions(ruleOptions, ruleName) as RuleOptions,
      allValues,
      validator: this.validator
    };
  }

  getNativeValidationMessage(): string {
    if (typeof this.primaryElement.validationMessage === 'string') {
      return this.primaryElement.validationMessage;
    }

    return '';
  }

  destroy(): void {
    this.clearServerMessage();
    this.lastError = '';
    this.setAriaInvalid(false);
    this.clearVisualState();
    this.elements.forEach((element) => {
      const initial = this.initialDescribedBy.get(element);
      if (initial) {
        element.setAttribute('aria-describedby', initial);
      } else {
        element.removeAttribute('aria-describedby');
      }
    });
    if (this.generatedPrimaryId && this.primaryElement.id === this.primaryId) {
      this.primaryElement.removeAttribute('id');
    }
  }
}
