import type { ValidationContext, ValidationResult } from '../core/A11yFormValidator.js';
import { isEmptyValue } from '../core/helpers.js';

export function sameAsRule({ field, form, value, options }: ValidationContext): ValidationResult {
  if (isEmptyValue(value)) {
    return {
      valid: true,
      messageKey: 'sameAs',
      params: { targetLabel: '' }
    };
  }

  const selector = String(options.selector || `[name="${options.field || ''}"]`);
  let target: Element | null = null;
  try {
    target = selector ? form.querySelector(selector) : null;
  } catch {
    target = null;
  }
  const targetValue =
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
      ? target.value
      : '';

  return {
    valid: target ? String(value) === String(targetValue) : false,
    messageKey: 'sameAs',
    params: {
      targetLabel: field.getTargetLabel(target)
    }
  };
}

export default sameAsRule;
