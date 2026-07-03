export type FormValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export interface FieldValidationState {
  pristine: boolean;
  dirty: boolean;
  touched: boolean;
  pending: boolean;
  valid: boolean;
  invalid: boolean;
  disabled: boolean;
  ignored: boolean;
}

export interface ValidationStateSnapshot {
  form: FormValidationState;
  fields: Record<string, FieldValidationState>;
}

export class ValidationState {
  private formState: FormValidationState;
  private readonly fieldStates: Map<string, FieldValidationState>;

  constructor() {
    this.formState = 'idle';
    this.fieldStates = new Map();
  }

  ensure(name: string): FieldValidationState {
    if (!this.fieldStates.has(name)) {
      this.fieldStates.set(name, {
        pristine: true,
        dirty: false,
        touched: false,
        pending: false,
        valid: false,
        invalid: false,
        disabled: false,
        ignored: false
      });
    }

    return this.fieldStates.get(name)!;
  }

  updateField(name: string, patch: Partial<FieldValidationState>): FieldValidationState {
    const current = this.ensure(name);
    this.fieldStates.set(name, { ...current, ...patch });
    return this.fieldStates.get(name)!;
  }

  setFormState(state: FormValidationState): void {
    this.formState = state;
  }

  snapshot(): ValidationStateSnapshot {
    return {
      form: this.formState,
      fields: Object.fromEntries(this.fieldStates.entries())
    };
  }
}
