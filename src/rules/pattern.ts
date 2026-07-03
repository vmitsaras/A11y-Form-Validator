import type { ValidationContext, ValidationResult } from '../core/A11yFormValidator.js';
import { isEmptyValue } from '../core/helpers.js';

export function patternRule({ value, options }: ValidationContext): ValidationResult {
  if (isEmptyValue(value)) {
    return { valid: true, messageKey: 'pattern' };
  }

  try {
    const expression = new RegExp(String(options.pattern || ''));
    return {
      valid: expression.test(String(value)),
      messageKey: 'pattern'
    };
  } catch {
    return {
      valid: true,
      messageKey: 'pattern',
      metadata: { ignoredInvalidPattern: true }
    };
  }
}

export default patternRule;
