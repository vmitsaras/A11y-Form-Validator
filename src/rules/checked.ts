import type { ValidationContext, ValidationResult } from '../core/A11yFormValidator.js';

export function checkedRule({ value }: ValidationContext): ValidationResult {
  const isValid = Array.isArray(value) ? value.length > 0 : Boolean(value);
  return {
    valid: isValid,
    messageKey: 'checked'
  };
}

export default checkedRule;
