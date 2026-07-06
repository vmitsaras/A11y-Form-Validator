//#region src/core/EventEmitter.d.ts
declare class EventEmitter {
  readonly target: EventTarget;
  constructor(target: EventTarget);
  emit(name: string, detail?: Record<string, unknown>): void;
  on(name: string, handler: EventListener): () => void;
  off(name: string, handler: EventListener): void;
}
//#endregion
//#region src/core/helpers.d.ts
type RuleOptions = Record<string, unknown>;
type RuleList = Record<string, true | string | number | RuleOptions>;
//#endregion
//#region src/core/FieldController.d.ts
type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FieldType = 'textarea' | 'select' | 'select-multiple' | 'radio' | 'checkbox' | 'file' | string;
declare class FieldController {
  readonly validator: A11yFormValidator;
  readonly name: string;
  readonly elements: FormControl[];
  readonly primaryElement: FormControl;
  readonly type: FieldType;
  readonly isGroupedChoice: boolean;
  readonly errorId: string;
  readonly primaryId: string;
  readonly initialDescribedBy: Map<FormControl, string>;
  private readonly generatedPrimaryId;
  serverMessage: string;
  lastError: string;
  touched: boolean;
  dirty: boolean;
  constructor(validator: A11yFormValidator, name: string, elements: FormControl[]);
  detectType(): FieldType;
  getActiveElements(): FormControl[];
  isDisabled(): boolean;
  isHidden(): boolean;
  shouldIgnore(): false | 'disabled' | 'hidden' | 'selector';
  getValue(): FieldValue;
  getFieldConfig(): unknown;
  getDataMessage(ruleName: string): string;
  getLabel(): string;
  getTargetLabel(target: Element | null): string;
  getDescribedBy(): string[];
  connectDescription(id: string): void;
  disconnectDescription(id: string): void;
  setAriaInvalid(isInvalid: boolean, errorId?: string): void;
  setVisualState(state: 'valid' | 'invalid' | 'pending'): void;
  clearVisualState(): void;
  focus(): void;
  markTouched(): void;
  markDirty(): void;
  clearServerMessage(): void;
  setServerMessage(message: string): void;
  getRules(): RuleList;
  getNativeRules(): RuleList;
  getDataRules(): RuleList;
  getValidationContext(ruleName: string, ruleOptions: unknown, allValues: Record<string, FieldValue>): ValidationContext;
  getNativeValidationMessage(): string;
  destroy(): void;
}
//#endregion
//#region src/core/MessageResolver.d.ts
declare class MessageResolver {
  readonly validator: A11yFormValidator;
  readonly defaultMessages: LocaleMessages;
  constructor(validator: A11yFormValidator);
  detectLocale(): string;
  getLocaleCandidates(locale?: string): string[];
  getLocaleMessage(key: string): MessageValue | undefined;
  resolveValue(message: unknown, context: MessageResolverContext): string;
  getSummaryTitle(count: number): string;
  getSummaryItem(field: FieldController, message: string): string;
  resolve(field: FieldController, ruleName: string, result: ValidationResult): string;
}
//#endregion
//#region src/core/RuleRegistry.d.ts
declare class RuleRegistry {
  private readonly rules;
  constructor();
  register(name: string, rule: ValidatorRule): this;
  unregister(name: string): this;
  has(name: string): boolean;
  run(name: string, context: ValidationContext): Promise<ValidationResult>;
  normalize(name: string, result: Awaited<ReturnType<ValidatorRule>>): ValidationResult;
}
//#endregion
//#region src/core/ValidationState.d.ts
type FormValidationState = 'idle' | 'validating' | 'valid' | 'invalid';
interface FieldValidationState {
  pristine: boolean;
  dirty: boolean;
  touched: boolean;
  pending: boolean;
  valid: boolean;
  invalid: boolean;
  disabled: boolean;
  ignored: boolean;
}
interface ValidationStateSnapshot {
  form: FormValidationState;
  fields: Record<string, FieldValidationState>;
}
declare class ValidationState {
  private formState;
  private readonly fieldStates;
  constructor();
  ensure(name: string): FieldValidationState;
  updateField(name: string, patch: Partial<FieldValidationState>): FieldValidationState;
  setFormState(state: FormValidationState): void;
  snapshot(): ValidationStateSnapshot;
}
//#endregion
//#region src/core/A11yFormValidator.d.ts
type ValidateTrigger = 'submit' | 'blur' | 'input' | 'change';
type ErrorMode = 'inline' | 'native' | 'both';
type FocusOnError = 'summary' | 'first-invalid' | false;
type FieldValue = string | boolean | string[] | File[];
interface ValidationResult {
  valid: boolean;
  messageKey?: string;
  message?: string;
  params?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  nativeMessage?: string;
}
type ValidatorRuleResult = boolean | string | Partial<ValidationResult> | null | undefined;
interface ValidationContext {
  field: FieldController;
  form: HTMLFormElement;
  value: FieldValue;
  options: RuleOptions;
  allValues: Record<string, FieldValue>;
  validator: A11yFormValidator;
}
type ValidatorRule = (context: ValidationContext) => ValidatorRuleResult | Promise<ValidatorRuleResult>;
type MessageResolverContext = {
  field: FieldController | null;
  fieldName: string;
  fieldLabel: string;
  form: HTMLFormElement;
  rule: string;
  value: unknown;
  params: Record<string, unknown>;
  locale: string;
};
type MessageValue = string | ((context: MessageResolverContext) => string);
interface ValidatorMessages {
  fields?: Record<string, Record<string, MessageValue>>;
  [key: string]: MessageValue | Record<string, Record<string, MessageValue>> | undefined;
}
type LocaleMessages = Record<string, MessageValue>;
interface ValidatorRenderer {
  render(field: FieldController, message: string): void;
  clear(field: FieldController): void;
  destroy?(): void;
}
interface ValidatorAddon {
  install(validator: A11yFormValidator): void;
  destroy?(): void;
}
type AddonInput = ValidatorAddon;
interface A11yFormValidatorOptions {
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
type A11yFormValidatorOptionsInput = Partial<Omit<A11yFormValidatorOptions, 'validateOn' | 'addons' | 'ignore' | 'selectors'>> & {
  validateOn?: ValidateTrigger | ValidateTrigger[];
  addons?: AddonInput | AddonInput[];
  ignore?: Partial<A11yFormValidatorOptions['ignore']>;
  selectors?: Partial<A11yFormValidatorOptions['selectors']>;
};
interface A11yFormValidatorInstance {
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
interface ValidateOptions {
  reason?: string;
}
type FieldInput = FieldController | string | HTMLElement | null | undefined;
interface ValidatorErrors {
  fields: Record<string, string>;
  form: string[];
}
type ServerErrors = Record<string, string | string[] | undefined> & {
  fields?: Record<string, string | string[] | undefined>;
  form?: string | string[];
  _form?: string | string[];
};
declare const EVENTS: Readonly<{
  init: "a11y-form-validator:init";
  beforeValidate: "a11y-form-validator:before-validate";
  afterValidate: "a11y-form-validator:after-validate";
  fieldValid: "a11y-form-validator:field-valid";
  fieldInvalid: "a11y-form-validator:field-invalid";
  formValid: "a11y-form-validator:form-valid";
  formInvalid: "a11y-form-validator:form-invalid";
  submitBlocked: "a11y-form-validator:submit-blocked";
  destroy: "a11y-form-validator:destroy";
}>;
declare const SELECTORS: Readonly<{
  fields: "input, select, textarea";
  initAll: "[data-a11y-form-validator]";
}>;
declare const CLASSES: Readonly<{
  root: "a11y-form-validator";
  initialized: "is-initialized";
}>;
declare const ATTRIBUTES: Readonly<{
  describedBy: "aria-describedby";
  errorMessage: "aria-errormessage";
  hidden: "hidden";
  invalid: "aria-invalid";
  noValidate: "novalidate";
  validationState: "data-validation-state";
}>;
declare const DEFAULT_OPTIONS: Readonly<{
  validateOn: ValidateTrigger[];
  focusOnError: FocusOnError;
  errorMode: ErrorMode;
  useNativeRules: true;
  disableNativeUI: true;
  validateHidden: false;
  ignore: Readonly<{
    disabled: true;
    hidden: true;
    selector: "";
  }>;
  debounce: 150;
  messages: ValidatorMessages;
  locales: Record<string, LocaleMessages>;
  locale: "";
  selectors: Readonly<{
    fields: "input, select, textarea";
  }>;
  addons: AddonInput[];
  renderer: ValidatorRenderer | null;
  rules: Record<string, unknown>;
}>;
declare class A11yFormValidator implements A11yFormValidatorInstance {
  private static readonly instances;
  readonly form: HTMLFormElement;
  readonly options: A11yFormValidatorOptions;
  readonly events: EventEmitter;
  readonly state: ValidationState;
  readonly ruleRegistry: RuleRegistry;
  readonly messageResolver: MessageResolver;
  readonly renderer: ValidatorRenderer;
  fields: FieldController[];
  fieldMap: Map<string, FieldController>;
  enabled: boolean;
  hasSubmitted: boolean;
  formErrors: string[];
  summaryAddon: (ValidatorAddon & {
    hasErrors(): boolean;
    focus(): void;
  }) | null;
  private addons;
  private readonly timers;
  private readonly addedRootClass;
  private readonly addedNoValidate;
  private readonly abortController;
  private readonly validationRuns;
  private destroyed;
  private inlineErrorAnnouncementsMuted;
  private readonly onSubmit;
  private readonly onFocusOut;
  private readonly onInput;
  private readonly onChange;
  constructor(form: HTMLFormElement, options?: A11yFormValidatorOptionsInput);
  static getInstance(form: HTMLFormElement): A11yFormValidator | undefined;
  private normalizeOptions;
  private emit;
  shouldAnnounceInlineErrors(): boolean;
  private shouldMuteInlineErrorsForBatch;
  registerDefaultRules(): void;
  registerRule(name: string, rule: ValidatorRule): this;
  unregisterRule(name: string): this;
  installAddons(): void;
  collectFields(): FieldController[];
  refresh(): this;
  private bindEvents;
  private handleSubmit;
  private handleFocusOut;
  private handleInput;
  private handleChange;
  queueValidation(field: FieldController, reason: string): void;
  findFieldByElement(element: EventTarget | null): FieldController | undefined;
  resolveField(input: FieldInput): FieldController | null;
  getAllValues(): Record<string, FieldValue>;
  validate(options?: ValidateOptions): Promise<boolean>;
  validateField(input: FieldInput, options?: ValidateOptions): Promise<boolean>;
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
declare function createFormValidator(form: HTMLFormElement, options?: A11yFormValidatorOptionsInput): A11yFormValidatorInstance;
declare function initFormValidators(options?: A11yFormValidatorOptionsInput, root?: ParentNode): A11yFormValidatorInstance[];
//#endregion
export { initFormValidators as A, EventEmitter as B, ValidatorAddon as C, ValidatorRule as D, ValidatorRenderer as E, RuleRegistry as F, MessageResolver as I, FieldController as L, FormValidationState as M, ValidationState as N, ValidatorRuleResult as O, ValidationStateSnapshot as P, FieldType as R, ValidationResult as S, ValidatorMessages as T, SELECTORS as _, ATTRIBUTES as a, ValidateTrigger as b, DEFAULT_OPTIONS as c, FieldInput as d, FieldValue as f, MessageValue as g, MessageResolverContext as h, A11yFormValidatorOptionsInput as i, FieldValidationState as j, createFormValidator as k, EVENTS as l, LocaleMessages as m, A11yFormValidatorInstance as n, AddonInput as o, FocusOnError as p, A11yFormValidatorOptions as r, CLASSES as s, A11yFormValidator as t, ErrorMode as u, ServerErrors as v, ValidatorErrors as w, ValidationContext as x, ValidateOptions as y, FormControl as z };
//# sourceMappingURL=A11yFormValidator.d.ts.map