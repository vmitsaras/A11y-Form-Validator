import type { A11yFormValidatorOptionsInput } from '../core/A11yFormValidator.js';

export function createNoSummaryPreset(): A11yFormValidatorOptionsInput {
  return {
    validateOn: ['submit', 'blur'],
    focusOnError: 'first-invalid',
    errorMode: 'both',
    useNativeRules: true,
    disableNativeUI: true,
    addons: []
  };
}

export default createNoSummaryPreset;
