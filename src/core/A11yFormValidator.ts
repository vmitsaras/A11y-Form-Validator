import checkedRule from '../rules/checked.js';
import emailRule from '../rules/email.js';
import maxLengthRule from '../rules/maxLength.js';
import minLengthRule from '../rules/minLength.js';
import patternRule from '../rules/pattern.js';
import requiredRule from '../rules/required.js';
import sameAsRule from '../rules/same-as.js';
import { ErrorRenderer } from './ErrorRenderer.js';
import { EventEmitter } from './EventEmitter.js';
import { FieldController, type IgnoredFieldReason } from './FieldController.js';
import { MessageResolver } from './MessageResolver.js';
import { RuleRegistry } from './RuleRegistry.js';
import {
  ValidationState,
  type FieldValidationState,
  type ValidationStateSnapshot
} from './ValidationState.js';
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
  readonly events: EventEmitter<ValidatorEventMap>;
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
  fieldPending: `${COMPONENT_NAME}:field-pending`,
  fieldValid: `${COMPONENT_NAME}:field-valid`,
  fieldInvalid: `${COMPONENT_NAME}:field-invalid`,
  fieldIgnored: `${COMPONENT_NAME}:field-ignored`,
  formValid: `${COMPONENT_NAME}:form-valid`,
  formInvalid: `${COMPONENT_NAME}:form-invalid`,
  errorsChanged: `${COMPONENT_NAME}:errors-changed`,
  submitBlocked: `${COMPONENT_NAME}:submit-blocked`,
  submitReady: `${COMPONENT_NAME}:submit-ready`,
  refresh: `${COMPONENT_NAME}:refresh`,
  reset: `${COMPONENT_NAME}:reset`,
  destroy: `${COMPONENT_NAME}:destroy`
} as const);

export type ErrorChangeSource = 'client-validation' | 'server' | 'manual-clear' | 'reset';
export type SubmitBlockCause = 'invalid' | 'validation-error' | 'resubmit-error';

export interface ValidatorEventBase {
  instance: A11yFormValidator;
  validator: A11yFormValidator;
  form: HTMLFormElement;
}

export interface ValidatorInitEventDetail extends ValidatorEventBase {
  state: ValidationStateSnapshot;
}

export interface ValidatorValidationStartEventDetail extends ValidatorEventBase {
  reason: string;
  state: ValidationStateSnapshot;
}

export interface ValidatorValidationCompleteEventDetail extends ValidatorValidationStartEventDetail {
  valid: boolean;
  errors: ValidatorErrors;
}

export interface ValidatorFieldEventDetail extends ValidatorEventBase {
  field: FieldController;
  fieldName: string;
  element: FieldController['primaryElement'];
  reason: string;
  state: FieldValidationState;
}

export interface ValidatorFieldPendingEventDetail extends ValidatorFieldEventDetail {}

export interface ValidatorFieldValidEventDetail extends ValidatorFieldEventDetail {
  valid: true;
}

export interface ValidatorFieldInvalidEventDetail extends ValidatorFieldEventDetail {
  valid: false;
  message: string;
}

export interface ValidatorFieldIgnoredEventDetail extends ValidatorFieldEventDetail {
  ignoredReason: IgnoredFieldReason;
}

export interface ValidatorFormValidEventDetail extends ValidatorValidationCompleteEventDetail {
  valid: true;
}

export interface ValidatorFormInvalidEventDetail extends ValidatorValidationCompleteEventDetail {
  valid: false;
}

export interface ValidatorErrorsChangedEventDetail extends ValidatorEventBase {
  errors: ValidatorErrors;
  previousErrors: ValidatorErrors;
  source: ErrorChangeSource;
  reason: string;
  state: ValidationStateSnapshot;
}

export interface ValidatorSubmitBlockedEventDetail extends ValidatorEventBase {
  valid: boolean;
  reason: string;
  errors: ValidatorErrors;
  state: ValidationStateSnapshot;
  submitter: HTMLElement | null;
  cause: SubmitBlockCause;
  error?: unknown;
}

export interface ValidatorSubmitReadyEventDetail extends ValidatorEventBase {
  valid: true;
  reason: string;
  errors: ValidatorErrors;
  state: ValidationStateSnapshot;
  submitter: HTMLElement | null;
}

export interface ValidatorRefreshEventDetail extends ValidatorEventBase {
  reason: 'refresh';
  state: ValidationStateSnapshot;
}

export interface ValidatorResetEventDetail extends ValidatorEventBase {
  reason: 'reset';
  state: ValidationStateSnapshot;
}

export interface ValidatorDestroyEventDetail extends ValidatorEventBase {
  state: ValidationStateSnapshot;
}

export type ValidatorEventMap = {
  [EVENTS.init]: ValidatorInitEventDetail;
  [EVENTS.beforeValidate]: ValidatorValidationStartEventDetail;
  [EVENTS.afterValidate]: ValidatorValidationCompleteEventDetail;
  [EVENTS.fieldPending]: ValidatorFieldPendingEventDetail;
  [EVENTS.fieldValid]: ValidatorFieldValidEventDetail;
  [EVENTS.fieldInvalid]: ValidatorFieldInvalidEventDetail;
  [EVENTS.fieldIgnored]: ValidatorFieldIgnoredEventDetail;
  [EVENTS.formValid]: ValidatorFormValidEventDetail;
  [EVENTS.formInvalid]: ValidatorFormInvalidEventDetail;
  [EVENTS.errorsChanged]: ValidatorErrorsChangedEventDetail;
  [EVENTS.submitBlocked]: ValidatorSubmitBlockedEventDetail;
  [EVENTS.submitReady]: ValidatorSubmitReadyEventDetail;
  [EVENTS.refresh]: ValidatorRefreshEventDetail;
  [EVENTS.reset]: ValidatorResetEventDetail;
  [EVENTS.destroy]: ValidatorDestroyEventDetail;
};

export type ValidatorCustomEvent<Name extends keyof ValidatorEventMap> = CustomEvent<ValidatorEventMap[Name]>;

type ValidatorEventInput<Name extends keyof ValidatorEventMap> = Omit<
  ValidatorEventMap[Name],
  keyof ValidatorEventBase
>;

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
  readonly events!: EventEmitter<ValidatorEventMap>;
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
  private formValidationRunId!: number;
  private submissionRunId!: number;
  private interactionRevision!: number;
  private submissionPhase!: 'idle' | 'validating' | 'resubmitting';
  private pendingSubmitter!: HTMLElement | null;
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
    this.formValidationRunId = 0;
    this.submissionRunId = 0;
    this.interactionRevision = 0;
    this.submissionPhase = 'idle';
    this.pendingSubmitter = null;
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

    this.refreshFields();
    this.bindEvents();
    this.installAddons();
    this.emit(EVENTS.init, { state: this.getState() });
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

  private emit<Name extends keyof ValidatorEventMap>(name: Name, detail: ValidatorEventInput<Name>): void {
    this.events.emit(name, {
      instance: this,
      validator: this,
      form: this.form,
      ...detail
    } as unknown as ValidatorEventMap[Name]);
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

    return [...grouped.entries()].map(([name, elements]) => {
      const existing = this.fieldMap.get(name);
      const unchanged = existing &&
        existing.elements.length === elements.length &&
        existing.elements.every((element, index) => element === elements[index]);
      return unchanged ? existing : new FieldController(this, name, elements);
    });
  }

  private refreshFields(): void {
    const previousFields = [...this.fields];
    const nextFields = this.collectFields();
    const retained = new Set(nextFields);

    previousFields.forEach((field) => {
      if (retained.has(field)) {
        return;
      }

      this.renderer.clear(field);
      field.destroy();
      this.state.remove(field.name);
      this.validationRuns.delete(field.name);
      const timer = this.timers.get(field.name);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(field.name);
      }
    });

    this.fields = nextFields;
    this.fieldMap = new Map(this.fields.map((field) => [field.name, field]));
    const currentNames = new Set(this.fieldMap.keys());
    Object.keys(this.state.snapshot().fields).forEach((name) => {
      if (!currentNames.has(name)) {
        this.state.remove(name);
      }
    });
    this.fields.forEach((field) => this.state.ensure(field.name));
  }

  refresh(): this {
    const previousErrors = this.getErrors();
    this.refreshFields();
    this.emitErrorsChanged(previousErrors, 'client-validation', 'refresh');
    this.emit(EVENTS.refresh, { reason: 'refresh', state: this.getState() });
    return this;
  }

  private bindEvents(): void {
    const listenerOptions = this.abortController ? { signal: this.abortController.signal } : undefined;
    this.form.addEventListener('submit', this.onSubmit, listenerOptions);
    this.form.addEventListener('focusout', this.onFocusOut, listenerOptions);
    this.form.addEventListener('input', this.onInput, listenerOptions);
    this.form.addEventListener('change', this.onChange, listenerOptions);
  }

  private handleSubmit(event: Event): void {
    if (this.submissionPhase === 'resubmitting') {
      this.submissionPhase = 'idle';
      return;
    }

    if (!this.enabled || !this.options.validateOn.includes('submit')) {
      return;
    }

    event.preventDefault();
    this.hasSubmitted = true;
    const candidate = 'submitter' in event ? (event as SubmitEvent).submitter : null;
    this.pendingSubmitter = candidate instanceof HTMLElement ? candidate : null;

    if (this.submissionPhase === 'validating') {
      return;
    }

    this.submissionPhase = 'validating';
    const runId = ++this.submissionRunId;
    void this.processSubmission(runId);
  }

  private async processSubmission(runId: number): Promise<void> {
    while (
      runId === this.submissionRunId &&
      this.submissionPhase === 'validating' &&
      this.enabled &&
      !this.destroyed
    ) {
      const revision = this.interactionRevision;
      let valid: boolean;

      try {
        valid = await this.validate({ reason: 'submit' });
      } catch (error) {
        if (runId !== this.submissionRunId || this.destroyed) {
          return;
        }

        this.submissionPhase = 'idle';
        this.emit(EVENTS.submitBlocked, {
          valid: false,
          reason: 'submit',
          errors: this.getErrors(),
          state: this.getState(),
          submitter: this.pendingSubmitter,
          cause: 'validation-error',
          error
        });
        return;
      }

      if (runId !== this.submissionRunId || this.destroyed || !this.enabled) {
        return;
      }

      if (revision !== this.interactionRevision) {
        continue;
      }

      const submitter = this.pendingSubmitter;
      if (!valid) {
        this.submissionPhase = 'idle';
        this.emit(EVENTS.submitBlocked, {
          valid: false,
          reason: 'submit',
          errors: this.getErrors(),
          state: this.getState(),
          submitter,
          cause: 'invalid'
        });
        this.focusOnError();
        return;
      }

      this.emit(EVENTS.submitReady, {
        valid: true,
        reason: 'submit',
        errors: this.getErrors(),
        state: this.getState(),
        submitter
      });
      this.submissionPhase = 'resubmitting';

      try {
        if (typeof this.form.requestSubmit !== 'function') {
          throw new TypeError('HTMLFormElement.requestSubmit() is required for validated submission.');
        }
        if (submitter) {
          this.form.requestSubmit(submitter);
        } else {
          this.form.requestSubmit();
        }
      } catch (error) {
        this.submissionPhase = 'idle';
        this.emit(EVENTS.submitBlocked, {
          valid: true,
          reason: 'submit',
          errors: this.getErrors(),
          state: this.getState(),
          submitter,
          cause: 'resubmit-error',
          error
        });
      } finally {
        if (this.submissionPhase === 'resubmitting') {
          this.submissionPhase = 'idle';
        }
      }
      return;
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

    this.interactionRevision += 1;
    this.invalidateFormValidation();
    const previousErrors = this.getErrors();
    field.markDirty();
    this.invalidateFieldValidation(field);
    field.clearServerMessage();
    this.formErrors = [];
    if (this.options.validateOn.includes('input')) {
      this.queueValidation(field, 'input');
    } else if (field.lastError && !field.serverMessage) {
      this.renderer.clear(field);
      field.lastError = '';
      field.clearVisualState();
      this.state.updateField(field.name, {
        pending: false,
        valid: false,
        invalid: false,
        touched: field.touched,
        dirty: field.dirty,
        pristine: !field.dirty
      });
    }
    this.emitErrorsChanged(previousErrors, 'client-validation', 'input');
  }

  private handleChange(event: Event): void {
    const field = this.findFieldByElement(event.target);
    if (!field) {
      return;
    }

    this.interactionRevision += 1;
    this.invalidateFormValidation();
    field.markDirty();
    this.invalidateFieldValidation(field);
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

  private invalidateFieldValidation(field: FieldController): void {
    this.validationRuns.set(field.name, (this.validationRuns.get(field.name) || 0) + 1);
    const state = this.getState().fields[field.name];
    if (!state?.pending) {
      return;
    }

    this.restoreFieldState(field, { ...state, pending: false });
  }

  private restoreFieldState(field: FieldController, state: FieldValidationState): void {
    this.state.updateField(field.name, state);
    if (state.invalid) {
      field.setVisualState('invalid');
    } else if (state.valid) {
      field.setVisualState('valid');
    } else {
      field.clearVisualState();
    }
  }

  private invalidateFormValidation(): void {
    this.formValidationRunId += 1;
    if (this.getState().form === 'validating') {
      this.state.setFormState('idle');
    }
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

  private normalizeReason(reason: string | undefined, fallback = 'manual'): string {
    return reason || fallback;
  }

  private errorsEqual(first: ValidatorErrors, second: ValidatorErrors): boolean {
    const firstFields = Object.entries(first.fields);
    const secondFields = Object.entries(second.fields);
    return first.form.length === second.form.length &&
      first.form.every((message, index) => message === second.form[index]) &&
      firstFields.length === secondFields.length &&
      firstFields.every(([name, message]) => second.fields[name] === message);
  }

  private emitErrorsChanged(previousErrors: ValidatorErrors, source: ErrorChangeSource, reason: string): boolean {
    const errors = this.getErrors();
    if (this.errorsEqual(previousErrors, errors)) {
      return false;
    }

    this.emit(EVENTS.errorsChanged, {
      errors,
      previousErrors,
      source,
      reason,
      state: this.getState()
    });
    return true;
  }

  private fieldEventDetail(field: FieldController, reason: string, state: FieldValidationState): ValidatorFieldEventDetail {
    return {
      instance: this,
      validator: this,
      form: this.form,
      field,
      fieldName: field.name,
      element: field.primaryElement,
      reason,
      state: { ...state }
    };
  }

  async validate(options: ValidateOptions = {}): Promise<boolean> {
    const reason = this.normalizeReason(options.reason);
    const previousErrors = this.getErrors();
    const previousState = this.getState();
    const runId = ++this.formValidationRunId;
    const previousInlineErrorAnnouncementsMuted = this.inlineErrorAnnouncementsMuted;
    this.inlineErrorAnnouncementsMuted =
      previousInlineErrorAnnouncementsMuted || this.shouldMuteInlineErrorsForBatch(reason);

    try {
      this.state.setFormState('validating');
      this.emit(EVENTS.beforeValidate, { reason, state: this.getState() });

      const results = await Promise.all(this.fields.map((field) => this.validateFieldInternal(field, reason)));
      const valid = results.every((result) => result.valid) && this.formErrors.length === 0;

      if (runId !== this.formValidationRunId) {
        return valid;
      }

      this.state.setFormState(valid ? 'valid' : 'invalid');
      this.emitErrorsChanged(previousErrors, 'client-validation', reason);
      const detail = {
        valid,
        reason,
        errors: this.getErrors(),
        state: this.getState()
      };
      this.emit(EVENTS.afterValidate, detail);
      if (valid) {
        this.emit(EVENTS.formValid, { ...detail, valid: true });
      } else {
        this.emit(EVENTS.formInvalid, { ...detail, valid: false });
      }
      return valid;
    } catch (error) {
      if (runId === this.formValidationRunId) {
        this.state.setFormState(previousState.form);
        this.fields.forEach((field) => {
          const current = this.getState().fields[field.name];
          if (!current?.pending) {
            return;
          }

          this.validationRuns.set(field.name, (this.validationRuns.get(field.name) || 0) + 1);
          this.restoreFieldState(field, {
            ...(previousState.fields[field.name] || this.state.ensure(field.name)),
            pending: false
          });
        });
      }
      throw error;
    } finally {
      this.inlineErrorAnnouncementsMuted = previousInlineErrorAnnouncementsMuted;
    }
  }

  async validateField(input: FieldInput, options: ValidateOptions = {}): Promise<boolean> {
    const reason = this.normalizeReason(options.reason);
    const previousErrors = this.getErrors();
    const result = await this.validateFieldInternal(input, reason);
    if (result.committed) {
      this.emitErrorsChanged(previousErrors, 'client-validation', reason);
    }
    return result.valid;
  }

  private async validateFieldInternal(
    input: FieldInput,
    reason: string
  ): Promise<{ valid: boolean; committed: boolean }> {
    const field = this.resolveField(input);
    if (!field) {
      return { valid: true, committed: false };
    }

    const ignoredReason = field.shouldIgnore();
    if (ignoredReason) {
      field.lastError = '';
      this.renderer.clear(field);
      const state = this.state.updateField(field.name, {
        ignored: ignoredReason !== 'disabled',
        disabled: ignoredReason === 'disabled',
        valid: true,
        invalid: false,
        pending: false,
        touched: field.touched,
        dirty: field.dirty,
        pristine: !field.dirty
      });
      const detail = this.fieldEventDetail(field, reason, state);
      this.emit(EVENTS.fieldIgnored, { ...detail, ignoredReason });
      return { valid: true, committed: true };
    }

    if (field.serverMessage) {
      this.renderer.render(field, field.serverMessage);
      const state = this.state.updateField(field.name, {
        valid: false,
        invalid: true,
        pending: false,
        touched: field.touched,
        dirty: field.dirty,
        pristine: !field.dirty
      });
      const detail = this.fieldEventDetail(field, reason, state);
      this.emit(EVENTS.fieldInvalid, { ...detail, valid: false, message: field.serverMessage });
      return { valid: false, committed: true };
    }

    const previousState = this.getState().fields[field.name];
    const runId = (this.validationRuns.get(field.name) || 0) + 1;
    this.validationRuns.set(field.name, runId);
    field.setVisualState('pending');
    const pendingState = this.state.updateField(field.name, {
      pending: true,
      touched: field.touched,
      dirty: field.dirty,
      pristine: !field.dirty
    });
    const pendingDetail = this.fieldEventDetail(field, reason, pendingState);
    this.emit(EVENTS.fieldPending, pendingDetail);

    const rules = field.getRules();
    const allValues = this.getAllValues();
    try {
      for (const [ruleName, ruleOptions] of Object.entries(rules)) {
        const result = await this.ruleRegistry.run(ruleName, field.getValidationContext(ruleName, ruleOptions, allValues));
        if (this.validationRuns.get(field.name) !== runId) {
          return { valid: !field.lastError, committed: false };
        }

        if (!result.valid) {
          const message = this.messageResolver.resolve(field, ruleName, result);
          field.lastError = message;
          this.renderer.render(field, message);
          const state = this.state.updateField(field.name, {
            valid: false,
            invalid: true,
            pending: false,
            touched: field.touched,
            dirty: field.dirty,
            pristine: !field.dirty,
            ignored: false,
            disabled: false
          });
          const detail = this.fieldEventDetail(field, reason, state);
          this.emit(EVENTS.fieldInvalid, { ...detail, valid: false, message });
          return { valid: false, committed: true };
        }
      }
    } catch (error) {
      if (this.validationRuns.get(field.name) === runId) {
        const restoredState = previousState || this.state.ensure(field.name);
        this.state.updateField(field.name, { ...restoredState, pending: false });
        if (restoredState.invalid) {
          field.setVisualState('invalid');
        } else if (restoredState.valid) {
          field.setVisualState('valid');
        } else {
          field.clearVisualState();
        }
      }
      throw error;
    }

    field.lastError = '';
    this.renderer.clear(field);
    const state = this.state.updateField(field.name, {
      valid: true,
      invalid: false,
      pending: false,
      touched: field.touched,
      dirty: field.dirty,
      pristine: !field.dirty,
      ignored: false,
      disabled: false
    });
    const detail = this.fieldEventDetail(field, reason, state);
    this.emit(EVENTS.fieldValid, { ...detail, valid: true });
    return { valid: true, committed: true };
  }

  reset(): this {
    const previousErrors = this.getErrors();
    this.submissionRunId += 1;
    this.formValidationRunId += 1;
    this.validationRuns.clear();
    this.submissionPhase = 'idle';
    this.pendingSubmitter = null;
    this.form.reset();
    this.hasSubmitted = false;
    this.clearErrorState();
    this.fields.forEach((field) => {
      field.dirty = false;
      field.touched = false;
      field.clearVisualState();
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
    this.emitErrorsChanged(previousErrors, 'reset', 'reset');
    this.emit(EVENTS.reset, { reason: 'reset', state: this.getState() });
    return this;
  }

  private clearErrorState(): void {
    this.formErrors = [];
    this.fields.forEach((field) => {
      field.clearServerMessage();
      field.lastError = '';
      this.renderer.clear(field);
      field.clearVisualState();
      this.state.updateField(field.name, {
        pending: false,
        valid: false,
        invalid: false,
        touched: field.touched,
        dirty: field.dirty,
        pristine: !field.dirty
      });
    });
  }

  clearErrors(): this {
    const previousErrors = this.getErrors();
    this.clearErrorState();
    this.emitErrorsChanged(previousErrors, 'manual-clear', 'manual');
    return this;
  }

  setErrors(errors: ServerErrors = {}): this {
    const previousErrors = this.getErrors();
    this.clearErrorState();
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

    const nextErrors = this.getErrors();
    if (Object.keys(nextErrors.fields).length || nextErrors.form.length) {
      this.state.setFormState('invalid');
    }
    this.emitErrorsChanged(previousErrors, 'server', 'server');
    if (Object.keys(nextErrors.fields).length || nextErrors.form.length) {
      this.emit(EVENTS.formInvalid, {
        valid: false,
        reason: 'server',
        errors: nextErrors,
        state: this.getState()
      });
    }
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
    this.submissionRunId += 1;
    this.submissionPhase = 'idle';
    this.pendingSubmitter = null;
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

    const finalState = this.getState();
    this.destroyed = true;
    this.submissionRunId += 1;
    this.formValidationRunId += 1;
    this.validationRuns.clear();
    this.submissionPhase = 'idle';
    this.pendingSubmitter = null;
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

    this.emit(EVENTS.destroy, { state: finalState });
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
