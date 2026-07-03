import type { ValidationContext, ValidationResult } from '../core/A11yFormValidator.js';
import { isEmptyValue, toSafeInteger } from '../core/helpers.js';

export function minLengthRule({ value, options }: ValidationContext): ValidationResult {
  const min = toSafeInteger(options.min as number | string | undefined, 0, { min: 0 });
  if (isEmptyValue(value)) {
    return { valid: true, messageKey: 'minLength', params: { min } };
  }

  const length = Array.isArray(value) ? value.length : String(value).length;
  return {
    valid: length >= min,
    messageKey: 'minLength',
    params: { min }
  };
}

export default minLengthRule;
