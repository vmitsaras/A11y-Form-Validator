import checkedRule from '../rules/checked.js';
import emailRule from '../rules/email.js';
import maxLengthRule from '../rules/maxLength.js';
import minLengthRule from '../rules/minLength.js';
import patternRule from '../rules/pattern.js';
import requiredRule from '../rules/required.js';
import sameAsRule from '../rules/same-as.js';
import { ErrorRenderer } from './ErrorRenderer.js';
import { EventEmitter } from './EventEmitter.js';
import { FieldController } from './FieldController.js';
import { MessageResolver } from './MessageResolver.js';
import { RuleRegistry } from './RuleRegistry.js';
import { ValidationState, type ValidationStateSnapshot } from './ValidationState.js';
import { mergeOptions, normalizeToArray, toSafeInteger, type RuleOptions } from './helpers.js';

export type ValidateTrigger = 'submit' | 'blur' | 'input' | 'change';
export type ErrorMode = 'inline' | 'native' | 'both';
export type FocusOnError = 'summary' | 'first-invalid' | false;
export type FieldValue = string | boolean | string[] | File[];

export interface ValidationResult {
  valid: boolean;
  messageKey?: string;
  message?: string;
  params?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  nativeMessage?: string;
}

export type ValidatorRuleResult = boolean | string | Partial<ValidationResult> | null | undefined;

export interface ValidationContext {
  field: FieldController;
  form: HTMLFormElement;
  value: FieldValue;
  options: RuleOptions;
  allValues: Record<string, FieldValue>;
  validator: A11yFormValidator;
}

export type ValidatorRule = (context: ValidationContext) => ValidatorRuleResult | Promise<ValidatorRuleResult>;

export type MessageResolverContext = {
  field: FieldController | null;
  fieldName: string;
  fieldLabel: string;
  form: HTMLFormElement;
  rule: string;
  value: unknown;
  params: Record<string, unknown>;
  locale: string;
};

export type MessageValue = string | ((context: MessageResolverContext) => string);

export interface ValidatorMessages {
  fields?: Record<string, Record<string, MessageValue>>;
  [key: string]: MessageValue | Record<string, Record<string, MessageValue>> | undefined;
}

export type LocaleMessages = Record<string, MessageValue>;

export interface ValidatorRenderer {
  render(field: FieldController, message: string): void;
  clear(field: FieldController): void;
  destroy?(): void;
}

export interface ValidatorAddon {
  install(validator: A11yFormValidator): void;
  destroy?(): void;
}

export type AddonInput = ValidatorAddon;

export interface A11yFormValidatorOptions {
  validateOn: ValidateTrigger | ValidateTrigger[];
  focusOnError: FocusOnError;
  errorMode: ErrorMode;
  useNativeRules: boolean;
  disableNativeUI: boolean;
  validateHidden: boolean;
  ignore: {
    disabled: boolean;
    hidden: boolean;
    selector: string;
  };
  debounce: number;
  messages: ValidatorMessages;
  locales: Record<string, LocaleMessages>;
  locale: string;
  selectors: {
    fields: string;
  };
  addons: AddonInput[];
  renderer: ValidatorRenderer | null;
  rules: Record<string, unknown>;
}

export type A11yFormValidatorOptionsInput = Partial<
  Omit<A11yFormValidatorOptions, 'validateOn' | 'addons' | 'ignore' | 'selectors'>
> & {
  validateOn?: ValidateTrigger | ValidateTrigger[];
  addons?: AddonInput | AddonInput[];
  ignore?: Partial<A11yFormValidatorOptions['ignore']>;
  selectors?: Partial<A11yFormValidatorOptions['selectors']>;
};

export interface A11yFormValidatorInstance {
  validate(options?: ValidateOptions): Promise<boolean>;
  validateField(input: FieldInput, options?: ValidateOptions): Promise<boolean>;
  refresh(): this;
  reset(): this;
  clearErrors(): this;
  setErrors(errors?: ServerErrors): this;
  getErrors(): ValidatorErrors;
  getState(): ValidationStateSnapshot;
  enable(): this;
  disable(): this;
  focusOnError(): void;
  destroy(): void;
}

export interface ValidateOptions {
  reason?: string;
}

export type FieldInput = FieldController | string | HTMLElement | null | undefined;

export interface ValidatorErrors {
  fields: Record<string, string>;
  form: string[];
}

export type ServerErrors = Record<string, string | string[] | undefined> & {
  fields?: Record<string, string | string[] | undefined>;
  form?: string | string[];
  _form?: string | string[];
};

const COMPONENT_NAME = 'a11y-form-validator';

export const EVENTS = Object.freeze({
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

export const SELECTORS = Object.freeze({
  fields: 'input, select, textarea',
  initAll: '[data-a11y-form-validator]'
});

export const CLASSES = Object.freeze({
  root: COMPONENT_NAME,
  initialized: 'is-initialized'
});

export const ATTRIBUTES = Object.freeze({
  describedBy: 'aria-describedby',
  errorMessage: 'aria-errormessage',
  hidden: 'hidden',
  invalid: 'aria-invalid',
  noValidate: 'novalidate',
  validationState: 'data-validation-state'
});

export const DEFAULT_OPTIONS = Object.freeze({
  validateOn: ['submit'] as ValidateTrigger[],
  focusOnError: 'summary' as FocusOnError,
  errorMode: 'inline' as ErrorMode,
  useNativeRules: true,
  disableNativeUI: true,
  validateHidden: false,
  ignore: Object.freeze({
    disabled: true,
    hidden: true,
    selector: ''
  }),
  debounce: 150,
  messages: Object.freeze({}) as ValidatorMessages,
  locales: Object.freeze({}) as Record<string, LocaleMessages>,
  locale: '',
  selectors: Object.freeze({
    fields: SELECTORS.fields
  }),
  addons: [] as AddonInput[],
  renderer: null as ValidatorRenderer | null,
  rules: Object.freeze({}) as Record<string, unknown>
}) satisfies A11yFormValidatorOptions;

export class A11yFormValidator implements A11yFormValidatorInstance {
  private static readonly instances = new WeakMap<HTMLFormElement, A11yFormValidator>();

  readonly form!: HTMLFormElement;
  readonly options!: A11yFormValidatorOptions;
  readonly events!: EventEmitter;
  readonly state!: ValidationState;
  readonly ruleRegistry!: RuleRegistry;
  readonly messageResolver!: MessageResolver;
  readonly renderer!: ValidatorRenderer;

  fields!: FieldController[];
  fieldMap!: Map<string, FieldController>;
  enabled!: boolean;
  hasSubmitted!: boolean;
  formErrors!: string[];
  summaryAddon!: (ValidatorAddon & { hasErrors(): boolean; focus(): void }) | null;

  private addons!: ValidatorAddon[];
  private readonly timers!: Map<string, ReturnType<typeof setTimeout>>;
  private readonly addedRootClass!: boolean;
  private readonly addedNoValidate!: boolean;
  private readonly abortController!: AbortController | null;
  private readonly validationRuns!: Map<string, number>;
  private destroyed!: boolean;
  private inlineErrorAnnouncementsMuted!: boolean;
  private readonly onSubmit!: EventListener;
  private readonly onFocusOut!: EventListener;
  private readonly onInput!: EventListener;
  private readonly onChange!: EventListener;

  constructor(form: HTMLFormElement, options: A11yFormValidatorOptionsInput = {}) {
    if (!(form instanceof HTMLFormElement)) {
      throw new TypeError('A11yFormValidator expects an HTMLFormElement.');
    }

    const existingInstance = A11yFormValidator.instances.get(form);
    if (existingInstance) {
      return existingInstance;
    }

    A11yFormValidator.instances.set(form, this);

    this.form = form;
    this.options = this.normalizeOptions(options);
    this.events = new EventEmitter(this.form);
    this.state = new ValidationState();
    this.ruleRegistry = new RuleRegistry();
    this.messageResolver = new MessageResolver(this);
    this.renderer = this.options.renderer || new ErrorRenderer(this);
    this.fields = [];
    this.fieldMap = new Map();
    this.enabled = true;
    this.hasSubmitted = false;
    this.formErrors = [];
    this.summaryAddon = null;
    this.addons = [];
    this.timers = new Map();
    this.addedRootClass = !this.form.classList.contains(CLASSES.root);
    this.addedNoValidate =
      this.options.disableNativeUI &&
      this.options.errorMode !== 'native' &&
      !this.form.hasAttribute('novalidate');
    const AbortControllerConstructor = this.form.ownerDocument.defaultView?.AbortController || globalThis.AbortController;
    this.abortController = AbortControllerConstructor ? new AbortControllerConstructor() : null;
    this.validationRuns = new Map();
    this.destroyed = false;
    this.inlineErrorAnnouncementsMuted = false;
    this.onSubmit = this.handleSubmit.bind(this);
    this.onFocusOut = this.handleFocusOut.bind(this);
    this.onInput = this.handleInput.bind(this);
    this.onChange = this.handleChange.bind(this);

    this.registerDefaultRules();
    this.form.classList.add(CLASSES.root, CLASSES.initialized);

    if (this.addedNoValidate) {
      this.form.setAttribute('novalidate', 'novalidate');
    }

    this.refresh();
    this.bindEvents();
    this.installAddons();
    this.emit(EVENTS.init);
  }

  static getInstance(form: HTMLFormElement): A11yFormValidator | undefined {
    return A11yFormValidator.instances.get(form);
  }

  private normalizeOptions(options: A11yFormValidatorOptionsInput): A11yFormValidatorOptions {
    const merged = mergeOptions(DEFAULT_OPTIONS, options as Record<string, unknown>) as unknown as A11yFormValidatorOptions;
    return {
      ...merged,
      validateOn: normalizeToArray(merged.validateOn) as ValidateTrigger[],
      addons: normalizeToArray(merged.addons) as AddonInput[],
      debounce: toSafeInteger(merged.debounce, DEFAULT_OPTIONS.debounce, { min: 0 }),
      ignore: {
        ...DEFAULT_OPTIONS.ignore,
        ...(options.ignore || {})
      },
      selectors: {
        ...DEFAULT_OPTIONS.selectors,
        ...(options.selectors || {})
      },
      messages: options.messages || DEFAULT_OPTIONS.messages,
      locales: options.locales || DEFAULT_OPTIONS.locales,
      rules: options.rules || DEFAULT_OPTIONS.rules
    };
  }

  private emit(name: string, detail: Record<string, unknown> = {}): void {
    this.events.emit(name, {
      instance: this,
      validator: this,
      ...detail
    });
  }

  shouldAnnounceInlineErrors(): boolean {
    return !this.inlineErrorAnnouncementsMuted;
  }

  private shouldMuteInlineErrorsForBatch(reason: string): boolean {
    return reason === 'submit' && this.options.focusOnError === 'summary' && Boolean(this.summaryAddon);
  }

  registerDefaultRules(): void {
    this.registerRule('required', requiredRule);
    this.registerRule('email', emailRule);
    this.registerRule('minLength', minLengthRule);
    this.registerRule('maxLength', maxLengthRule);
    this.registerRule('pattern', patternRule);
    this.registerRule('checked', checkedRule);
    this.registerRule('sameAs', sameAsRule);
  }

  registerRule(name: string, rule: ValidatorRule): this {
    this.ruleRegistry.register(name, rule);
    return this;
  }

  unregisterRule(name: string): this {
    this.ruleRegistry.unregister(name);
    return this;
  }

  installAddons(): void {
    this.addons = normalizeToArray(this.options.addons)
      .filter((addon): addon is ValidatorAddon => {
        return Boolean(addon) && typeof addon === 'object' && typeof addon.install === 'function';
      });
    this.addons.forEach((addon) => addon.install(this));
  }

  collectFields(): FieldController[] {
    const nodes = Array.from(this.form.querySelectorAll(this.options.selectors.fields))
      .filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => {
        return element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement;
      })
      .filter((element) => element.name || element.id);
    const nameCounts = nodes.reduce<Map<string, number>>((counts, element) => {
      const name = element.name || element.id;
      counts.set(name, (counts.get(name) || 0) + 1);
      return counts;
    }, new Map());
    const grouped = new Map<string, Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>>();

    nodes.forEach((element) => {
      const name = element.name || element.id;
      const type = (element.type || element.tagName).toLowerCase();
      const shouldGroup = type === 'radio' || (type === 'checkbox' && (nameCounts.get(name) || 0) > 1);
      if (!grouped.has(name)) {
        grouped.set(name, []);
      }

      const group = grouped.get(name)!;
      if (shouldGroup) {
        group.push(element);
        return;
      }

      if (group.length === 0) {
        group.push(element);
      }
    });

    return [...grouped.entries()].map(([name, elements]) => new FieldController(this, name, elements));
  }

  refresh(): this {
    this.fields = this.collectFields();
    this.fieldMap = new Map(this.fields.map((field) => [field.name, field]));
    this.fields.forEach((field) => this.state.ensure(field.name));
    return this;
  }

  private bindEvents(): void {
    const listenerOptions = this.abortController ? { signal: this.abortController.signal } : undefined;
    this.form.addEventListener('submit', this.onSubmit, listenerOptions);
    this.form.addEventListener('focusout', this.onFocusOut, listenerOptions);
    this.form.addEventListener('input', this.onInput, listenerOptions);
    this.form.addEventListener('change', this.onChange, listenerOptions);
  }

  private async handleSubmit(event: Event): Promise<void> {
    if (!this.enabled || !this.options.validateOn.includes('submit')) {
      return;
    }

    this.hasSubmitted = true;
    const valid = await this.validate({ reason: 'submit' });
    if (!valid) {
      event.preventDefault();
      this.emit(EVENTS.submitBlocked, { errors: this.getErrors() });
      this.focusOnError();
    }
  }

  private handleFocusOut(event: Event): void {
    const field = this.findFieldByElement(event.target);
    if (!field) {
      return;
    }

    field.markTouched();
    if (this.options.validateOn.includes('blur') || this.hasSubmitted) {
      void this.validateField(field, { reason: 'blur' });
    }
  }

  private handleInput(event: Event): void {
    const field = this.findFieldByElement(event.target);
    if (!field) {
      return;
    }

    field.markDirty();
    field.clearServerMessage();
    this.formErrors = [];
    if (this.options.validateOn.includes('input')) {
      this.queueValidation(field, 'input');
    } else if (field.lastError && !field.serverMessage) {
      this.renderer.clear(field);
      field.lastError = '';
    }
  }

  private handleChange(event: Event): void {
    const field = this.findFieldByElement(event.target);
    if (!field) {
      return;
    }

    field.markDirty();
    field.clearServerMessage();
    if (this.options.validateOn.includes('change')) {
      void this.validateField(field, { reason: 'change' });
    }
  }

  queueValidation(field: FieldController, reason: string): void {
    clearTimeout(this.timers.get(field.name));
    const timer = setTimeout(() => {
      void this.validateField(field, { reason });
      this.timers.delete(field.name);
    }, this.options.debounce);
    this.timers.set(field.name, timer);
  }

  findFieldByElement(element: EventTarget | null): FieldController | undefined {
    if (!(element instanceof HTMLElement)) {
      return undefined;
    }

    return this.fields.find((field) => field.elements.some((fieldElement) => fieldElement === element));
  }

  resolveField(input: FieldInput): FieldController | null {
    if (input instanceof FieldController) {
      return input;
    }

    if (typeof input === 'string') {
      return this.fieldMap.get(input) || null;
    }

    if (input instanceof HTMLElement) {
      return this.findFieldByElement(input) || null;
    }

    return null;
  }

  getAllValues(): Record<string, FieldValue> {
    return Object.fromEntries(this.fields.map((field) => [field.name, field.getValue()]));
  }

  async validate(options: ValidateOptions = {}): Promise<boolean> {
    const reason = options.reason || 'manual';
    const previousInlineErrorAnnouncementsMuted = this.inlineErrorAnnouncementsMuted;
    this.inlineErrorAnnouncementsMuted =
      previousInlineErrorAnnouncementsMuted || this.shouldMuteInlineErrorsForBatch(reason);

    try {
      this.emit(EVENTS.beforeValidate, { reason });
      this.state.setFormState('validating');

      const results = await Promise.all(this.fields.map((field) => this.validateField(field, options)));
      const valid = results.every(Boolean) && this.formErrors.length === 0;

      this.state.setFormState(valid ? 'valid' : 'invalid');
      this.emit(EVENTS.afterValidate, { valid, errors: this.getErrors() });
      this.emit(valid ? EVENTS.formValid : EVENTS.formInvalid, { errors: this.getErrors() });
      return valid;
    } finally {
      this.inlineErrorAnnouncementsMuted = previousInlineErrorAnnouncementsMuted;
    }
  }

  async validateField(input: FieldInput, options: ValidateOptions = {}): Promise<boolean> {
    const field = this.resolveField(input);
    if (!field) {
      return true;
    }

    const ignoredReason = field.shouldIgnore();
    if (ignoredReason) {
      field.lastError = '';
      this.renderer.clear(field);
      this.state.updateField(field.name, {
        ignored: ignoredReason !== 'disabled',
        disabled: ignoredReason === 'disabled',
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
      this.emit(EVENTS.fieldInvalid, { field, message: field.serverMessage, reason: options.reason || 'manual' });
      return false;
    }

    const runId = (this.validationRuns.get(field.name) || 0) + 1;
    this.validationRuns.set(field.name, runId);
    field.setVisualState('pending');
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
      if (this.validationRuns.get(field.name) !== runId) {
        return !field.lastError;
      }

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
        this.emit(EVENTS.fieldInvalid, { field, message, reason: options.reason || 'manual' });
        return false;
      }
    }

    field.lastError = '';
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
    this.emit(EVENTS.fieldValid, { field, reason: options.reason || 'manual' });
    return true;
  }

  reset(): this {
    this.form.reset();
    this.hasSubmitted = false;
    this.clearErrors();
    this.fields.forEach((field) => {
      field.dirty = false;
      field.touched = false;
      field.setVisualState('valid');
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
    this.state.setFormState('idle');
    return this;
  }

  clearErrors(): this {
    this.formErrors = [];
    this.fields.forEach((field) => {
      field.clearServerMessage();
      field.lastError = '';
      this.renderer.clear(field);
    });
    this.emit(EVENTS.afterValidate, { valid: true, errors: this.getErrors() });
    return this;
  }

  setErrors(errors: ServerErrors = {}): this {
    this.clearErrors();
    const fieldErrors = errors.fields || Object.fromEntries(
      Object.entries(errors).filter(([key]) => !['form', '_form', 'fields'].includes(key))
    );
    const formErrors = errors.form || errors._form || [];

    const previousInlineErrorAnnouncementsMuted = this.inlineErrorAnnouncementsMuted;
    this.inlineErrorAnnouncementsMuted =
      previousInlineErrorAnnouncementsMuted ||
      (this.options.focusOnError === 'summary' && Boolean(this.summaryAddon));

    try {
      this.formErrors = Array.isArray(formErrors) ? formErrors.map(String) : [formErrors].filter(Boolean).map(String);
      Object.entries(fieldErrors).forEach(([name, message]) => {
        const field = this.fieldMap.get(name);
        if (!field || !message) {
          return;
        }

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

    this.state.setFormState('invalid');
    this.emit(EVENTS.afterValidate, { valid: false, errors: this.getErrors() });
    this.emit(EVENTS.formInvalid, { errors: this.getErrors() });
    return this;
  }

  getErrors(): ValidatorErrors {
    const fields = Object.fromEntries(
      this.fields
        .filter((field) => field.lastError)
        .map((field) => [field.name, field.lastError])
    );

    return {
      fields,
      form: [...this.formErrors]
    };
  }

  getState(): ValidationStateSnapshot {
    return this.state.snapshot();
  }

  enable(): this {
    this.enabled = true;
    return this;
  }

  disable(): this {
    this.enabled = false;
    return this;
  }

  focusOnError(): void {
    if (this.options.focusOnError === false) {
      return;
    }

    if (this.options.focusOnError === 'summary' && this.summaryAddon?.hasErrors()) {
      this.summaryAddon.focus();
      return;
    }

    const firstInvalidField = this.fields.find((field) => field.lastError);
    firstInvalidField?.focus();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    if (this.abortController) {
      this.abortController.abort();
    } else {
      this.form.removeEventListener('submit', this.onSubmit);
      this.form.removeEventListener('focusout', this.onFocusOut);
      this.form.removeEventListener('input', this.onInput);
      this.form.removeEventListener('change', this.onChange);
    }

    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.renderer.destroy?.();
    this.addons.forEach((addon) => addon.destroy?.());
    this.fields.forEach((field) => field.destroy());
    this.form.classList.remove(CLASSES.initialized);
    if (this.addedRootClass) {
      this.form.classList.remove(CLASSES.root);
    }
    if (this.addedNoValidate) {
      this.form.removeAttribute('novalidate');
    }

    this.emit(EVENTS.destroy);
    A11yFormValidator.instances.delete(this.form);
  }
}

export function createFormValidator(
  form: HTMLFormElement,
  options: A11yFormValidatorOptionsInput = {}
): A11yFormValidatorInstance {
  return new A11yFormValidator(form, options);
}

export function initFormValidators(
  options: A11yFormValidatorOptionsInput = {},
  root?: ParentNode
): A11yFormValidatorInstance[] {
  const scope = root || globalThis.document;
  if (!scope) {
    return [];
  }

  return Array.from(scope.querySelectorAll(SELECTORS.initAll))
    .filter((element): element is HTMLFormElement => element instanceof HTMLFormElement)
    .map((form) => createFormValidator(form, options));
}

export default A11yFormValidator;
