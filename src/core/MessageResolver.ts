import enMessages from '../locales/en.json' with { type: 'json' };
import type {
  A11yFormValidator,
  LocaleMessages,
  MessageResolverContext,
  MessageValue,
  ValidationResult
} from './A11yFormValidator.js';
import type { FieldController } from './FieldController.js';
import { applyPlaceholders } from './helpers.js';

export class MessageResolver {
  readonly validator: A11yFormValidator;
  readonly defaultMessages: LocaleMessages;

  constructor(validator: A11yFormValidator) {
    this.validator = validator;
    this.defaultMessages = enMessages;
  }

  detectLocale(): string {
    const explicit = this.validator.options.locale;
    const formLang = this.validator.form.getAttribute('lang');
    const documentLang = this.validator.form.ownerDocument.documentElement.getAttribute('lang');
    return explicit || formLang || documentLang || 'en';
  }

  getLocaleCandidates(locale = this.detectLocale()): string[] {
    const candidates: string[] = [];
    if (locale) {
      candidates.push(locale);
      const [base] = locale.split('-');
      if (base && base !== locale) {
        candidates.push(base);
      }
    }

    candidates.push('en');
    return [...new Set(candidates.filter(Boolean))];
  }

  getLocaleMessage(key: string): MessageValue | undefined {
    const candidates = this.getLocaleCandidates();
    const configuredLocales = this.validator.options.locales || {};

    for (const locale of candidates) {
      const localeMessages = configuredLocales[locale];
      if (localeMessages && localeMessages[key] != null) {
        return localeMessages[key];
      }
    }

    if (this.validator.options.messages?.[key] != null) {
      return this.validator.options.messages[key] as MessageValue;
    }

    return this.defaultMessages[key];
  }

  resolveValue(message: unknown, context: MessageResolverContext): string {
    if (typeof message === 'function') {
      return message(context);
    }

    if (typeof message === 'string') {
      return applyPlaceholders(message, context.params);
    }

    return '';
  }

  getSummaryTitle(count: number): string {
    const key = count === 1 ? 'summaryTitleOne' : 'summaryTitleOther';
    const message = this.getLocaleMessage(key) || this.getLocaleMessage('summaryTitle');
    return this.resolveValue(message, {
      field: null,
      fieldName: '',
      fieldLabel: '',
      form: this.validator.form,
      rule: key,
      value: count,
      params: { count },
      locale: this.detectLocale()
    }) || `There ${count === 1 ? 'is' : 'are'} ${count} problem${count === 1 ? '' : 's'} with your form.`;
  }

  getSummaryItem(field: FieldController, message: string): string {
    const fieldLabel = field.getLabel();
    const params = {
      label: fieldLabel,
      fieldLabel,
      fieldName: field.name,
      message
    };
    const configuredMessage = this.validator.options.messages?.summaryItem;
    const summaryMessage = configuredMessage ?? this.getLocaleMessage('summaryItem');
    const context: MessageResolverContext = {
      field,
      fieldName: field.name,
      fieldLabel,
      form: this.validator.form,
      rule: 'summaryItem',
      value: message,
      params,
      locale: this.detectLocale()
    };

    return this.resolveValue(summaryMessage, context) || `${fieldLabel}: ${message}`;
  }

  resolve(field: FieldController, ruleName: string, result: ValidationResult): string {
    const target = field.primaryElement;
    const fieldLabel = field.getLabel();
    const params = {
      ...result.params,
      label: fieldLabel,
      fieldLabel,
      targetLabel: result.params?.targetLabel || '',
      value: field.getValue()
    };
    const context: MessageResolverContext = {
      field,
      fieldName: field.name,
      fieldLabel,
      form: this.validator.form,
      rule: ruleName,
      value: field.getValue(),
      params,
      locale: this.detectLocale()
    };

    const fieldMessages = this.validator.options.messages?.fields;
    const shouldUseNativeMessage =
      this.validator.options.errorMode === 'native' || Boolean(result.nativeMessage);
    const candidates = [
      field.serverMessage,
      field.getDataMessage(ruleName),
      fieldMessages?.[field.name]?.[ruleName],
      this.validator.options.messages?.[ruleName],
      result.message,
      shouldUseNativeMessage ? result.nativeMessage : '',
      shouldUseNativeMessage && target.validity?.valid === false ? field.getNativeValidationMessage() : '',
      this.getLocaleMessage(result.messageKey || ruleName),
      this.defaultMessages[result.messageKey || ruleName],
      this.defaultMessages.genericFallback,
      'Check this field.'
    ];

    for (const candidate of candidates) {
      const value = this.resolveValue(candidate, context);
      if (value) {
        return value;
      }
    }

    return 'Check this field.';
  }
}
