import type { ValidationContext, ValidationResult, ValidatorRule } from './A11yFormValidator.js';

export class RuleRegistry {
  private readonly rules: Map<string, ValidatorRule>;

  constructor() {
    this.rules = new Map();
  }

  register(name: string, rule: ValidatorRule): this {
    this.rules.set(name, rule);
    return this;
  }

  unregister(name: string): this {
    this.rules.delete(name);
    return this;
  }

  has(name: string): boolean {
    return this.rules.has(name);
  }

  async run(name: string, context: ValidationContext): Promise<ValidationResult> {
    const rule = this.rules.get(name);
    if (!rule) {
      return {
        valid: true,
        messageKey: name,
        params: {}
      };
    }

    const rawResult = await rule(context);
    return this.normalize(name, rawResult);
  }

  normalize(name: string, result: Awaited<ReturnType<ValidatorRule>>): ValidationResult {
    if (result == null || result === true) {
      return {
        valid: true,
        messageKey: name,
        params: {}
      };
    }

    if (result === false) {
      return {
        valid: false,
        messageKey: name,
        params: {}
      };
    }

    if (typeof result === 'string') {
      return {
        valid: false,
        messageKey: name,
        message: result,
        params: {}
      };
    }

    return {
      valid: Boolean(result.valid),
      messageKey: result.messageKey || name,
      message: result.message,
      params: result.params || {},
      metadata: result.metadata || {},
      nativeMessage: result.nativeMessage
    };
  }
}
