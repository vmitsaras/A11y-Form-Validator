import type { ValidationContext, ValidationResult } from '../core/A11yFormValidator.js';
import { isEmptyValue } from '../core/helpers.js';

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function emailRule({ value }: ValidationContext): ValidationResult {
  if (isEmptyValue(value)) {
    return { valid: true, messageKey: 'email' };
  }

  return {
    valid: EMAIL_PATTERN.test(String(value).trim()),
    messageKey: 'email'
  };
}

export default emailRule;
