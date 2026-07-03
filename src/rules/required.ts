import type { ValidationContext, ValidationResult } from '../core/A11yFormValidator.js';
import { isEmptyValue } from '../core/helpers.js';

export function requiredRule({ value }: ValidationContext): ValidationResult {
  return {
    valid: !isEmptyValue(value),
    messageKey: 'required'
  };
}

export default requiredRule;
