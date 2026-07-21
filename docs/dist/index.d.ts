import { $ as FormValidationState, A as ValidatorEventBase, B as ValidatorMessages, C as ValidationContext, D as ValidatorDestroyEventDetail, E as ValidatorCustomEvent, F as ValidatorFieldPendingEventDetail, G as ValidatorRuleResult, H as ValidatorRenderer, I as ValidatorFieldValidEventDetail, J as ValidatorValidationCompleteEventDetail, K as ValidatorSubmitBlockedEventDetail, L as ValidatorFormInvalidEventDetail, M as ValidatorFieldEventDetail, N as ValidatorFieldIgnoredEventDetail, O as ValidatorErrors, P as ValidatorFieldInvalidEventDetail, Q as FieldValidationState, R as ValidatorFormValidEventDetail, S as ValidateTrigger, T as ValidatorAddon, U as ValidatorResetEventDetail, V as ValidatorRefreshEventDetail, W as ValidatorRule, X as createFormValidator, Y as ValidatorValidationStartEventDetail, Z as initFormValidators, _ as MessageValue, a as ATTRIBUTES, at as FieldType, b as SubmitBlockCause, c as DEFAULT_OPTIONS, ct as EventEmitter, d as ErrorMode, et as ValidationState, f as FieldInput, g as MessageResolverContext, h as LocaleMessages, i as A11yFormValidatorOptionsInput, it as FieldController, j as ValidatorEventMap, k as ValidatorErrorsChangedEventDetail, l as EVENTS, lt as EventHandler, m as FocusOnError, n as A11yFormValidatorInstance, nt as RuleRegistry, o as AddonInput, ot as FormControl, p as FieldValue, q as ValidatorSubmitReadyEventDetail, r as A11yFormValidatorOptions, rt as MessageResolver, s as CLASSES, st as IgnoredFieldReason, t as A11yFormValidator, tt as ValidationStateSnapshot, u as ErrorChangeSource, v as SELECTORS, w as ValidationResult, x as ValidateOptions, y as ServerErrors, z as ValidatorInitEventDetail } from "./A11yFormValidator.js";
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
export { A11yFormValidator, type A11yFormValidatorInstance, type A11yFormValidatorOptions, type A11yFormValidatorOptionsInput, ATTRIBUTES, type AddonInput, CLASSES, DEFAULT_OPTIONS, EVENTS, type ErrorChangeSource, type ErrorMode, ErrorRenderer, EventEmitter, type EventHandler, FieldController, type FieldInput, type FieldType, type FieldValidationState, type FieldValue, type FocusOnError, type FormControl, type FormValidationState, type IgnoredFieldReason, type LocaleMessages, MessageResolver, type MessageResolverContext, type MessageValue, RuleRegistry, SELECTORS, type ServerErrors, type SubmitBlockCause, type ValidateOptions, type ValidateTrigger, type ValidationContext, type ValidationResult, ValidationState, type ValidationStateSnapshot, type ValidatorAddon, type ValidatorCustomEvent, type ValidatorDestroyEventDetail, type ValidatorErrors, type ValidatorErrorsChangedEventDetail, type ValidatorEventBase, type ValidatorEventMap, type ValidatorFieldEventDetail, type ValidatorFieldIgnoredEventDetail, type ValidatorFieldInvalidEventDetail, type ValidatorFieldPendingEventDetail, type ValidatorFieldValidEventDetail, type ValidatorFormInvalidEventDetail, type ValidatorFormValidEventDetail, type ValidatorInitEventDetail, type ValidatorMessages, type ValidatorRefreshEventDetail, type ValidatorRenderer, type ValidatorResetEventDetail, type ValidatorRule, type ValidatorRuleResult, type ValidatorSubmitBlockedEventDetail, type ValidatorSubmitReadyEventDetail, type ValidatorValidationCompleteEventDetail, type ValidatorValidationStartEventDetail, createDefaultPreset, createFormValidator, createMinimalPreset, createNoSummaryPreset, __json_default_export as enMessages, initFormValidators };
//# sourceMappingURL=index.d.ts.map