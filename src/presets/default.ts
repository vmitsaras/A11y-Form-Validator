import { createErrorSummaryAddon } from '../addons/error-summary.js';
import type { A11yFormValidatorOptionsInput } from '../core/A11yFormValidator.js';

export function createDefaultPreset(): A11yFormValidatorOptionsInput {
  return {
    validateOn: ['submit', 'blur'],
    focusOnError: 'summary',
    errorMode: 'both',
    useNativeRules: true,
    disableNativeUI: true,
    addons: [createErrorSummaryAddon()]
  };
}

export default createDefaultPreset;
