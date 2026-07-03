import type { A11yFormValidatorOptionsInput } from '../core/A11yFormValidator.js';

export function createMinimalPreset(): A11yFormValidatorOptionsInput {
  return {
    validateOn: ['submit'],
    focusOnError: 'first-invalid',
    errorMode: 'inline',
    useNativeRules: true,
    disableNativeUI: true
  };
}

export default createMinimalPreset;
