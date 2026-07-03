import type { ValidationContext, ValidationResult } from '../core/A11yFormValidator.js';
import { isEmptyValue, toSafeInteger } from '../core/helpers.js';

export function maxLengthRule({ value, options }: ValidationContext): ValidationResult {
  const max = toSafeInteger(options.max as number | string | undefined, Number.POSITIVE_INFINITY, { min: 0 });
  if (isEmptyValue(value)) {
    return { valid: true, messageKey: 'maxLength', params: { max } };
  }

  const length = Array.isArray(value) ? value.length : String(value).length;
  return {
    valid: length <= max,
    messageKey: 'maxLength',
    params: { max }
  };
}

export default maxLengthRule;
