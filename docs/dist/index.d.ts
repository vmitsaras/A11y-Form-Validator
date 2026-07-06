import { A as initFormValidators, B as EventEmitter, C as ValidatorAddon, D as ValidatorRule, E as ValidatorRenderer, F as RuleRegistry, I as MessageResolver, L as FieldController, M as FormValidationState, N as ValidationState, O as ValidatorRuleResult, P as ValidationStateSnapshot, R as FieldType, S as ValidationResult, T as ValidatorMessages, _ as SELECTORS, a as ATTRIBUTES, b as ValidateTrigger, c as DEFAULT_OPTIONS, d as FieldInput, f as FieldValue, g as MessageValue, h as MessageResolverContext, i as A11yFormValidatorOptionsInput, j as FieldValidationState, k as createFormValidator, l as EVENTS, m as LocaleMessages, n as A11yFormValidatorInstance, o as AddonInput, p as FocusOnError, r as A11yFormValidatorOptions, s as CLASSES, t as A11yFormValidator, u as ErrorMode, v as ServerErrors, w as ValidatorErrors, x as ValidationContext, y as ValidateOptions, z as FormControl } from "./A11yFormValidator.js";
import { t as createDefaultPreset } from "./default.js";
import { t as createNoSummaryPreset } from "./no-summary.js";
import { t as createMinimalPreset } from "./minimal.js";

//#region src/core/ErrorRenderer.d.ts
declare class ErrorRenderer implements ValidatorRenderer {
  readonly validator: A11yFormValidator;
  constructor(validator: A11yFormValidator);
  getNode(field: FieldController): HTMLElement | null;
  shouldRenderInline(): boolean;
  syncAnnouncementAttributes(errorNode: HTMLElement): void;
  setNativeMessage(field: FieldController, message: string): void;
  getInsertionTarget(field: FieldController): Element;
  render(field: FieldController, message: string): void;
  clear(field: FieldController): void;
  destroy(): void;
}
//#endregion
//#region src/locales/en.d.ts
declare let required: string;
declare let email: string;
declare let minLength: string;
declare let maxLength: string;
declare let pattern: string;
declare let checked: string;
declare let sameAs: string;
declare let summaryTitleOne: string;
declare let summaryTitleOther: string;
declare let summaryItem: string;
declare let genericFallback: string;
declare namespace __json_default_export {
  export { required, email, minLength, maxLength, pattern, checked, sameAs, summaryTitleOne, summaryTitleOther, summaryItem, genericFallback };
}
//#endregion
export { A11yFormValidator, type A11yFormValidatorInstance, type A11yFormValidatorOptions, type A11yFormValidatorOptionsInput, ATTRIBUTES, type AddonInput, CLASSES, DEFAULT_OPTIONS, EVENTS, type ErrorMode, ErrorRenderer, EventEmitter, FieldController, type FieldInput, type FieldType, type FieldValidationState, type FieldValue, type FocusOnError, type FormControl, type FormValidationState, type LocaleMessages, MessageResolver, type MessageResolverContext, type MessageValue, RuleRegistry, SELECTORS, type ServerErrors, type ValidateOptions, type ValidateTrigger, type ValidationContext, type ValidationResult, ValidationState, type ValidationStateSnapshot, type ValidatorAddon, type ValidatorErrors, type ValidatorMessages, type ValidatorRenderer, type ValidatorRule, type ValidatorRuleResult, createDefaultPreset, createFormValidator, createMinimalPreset, createNoSummaryPreset, __json_default_export as enMessages, initFormValidators };
//# sourceMappingURL=index.d.ts.map