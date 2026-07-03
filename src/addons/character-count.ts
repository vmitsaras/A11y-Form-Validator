import type { A11yFormValidator, ValidatorAddon } from '../core/A11yFormValidator.js';
import type { FieldController } from '../core/FieldController.js';
import { ensureElementId, toSafeInteger } from '../core/helpers.js';

export interface CharacterCountMessages {
  remaining: string;
  over: string;
  minimum: string;
}

export interface CharacterCountAddonOptions {
  selector?: string;
  threshold?: number;
  messages?: Partial<CharacterCountMessages>;
}

interface CharacterCountEntry {
  field: FieldController;
  counter: HTMLElement;
  max: number | null;
  min: number | null;
}

export interface CharacterCountAddon extends ValidatorAddon {
  validator: A11yFormValidator | null;
  options: Required<Omit<CharacterCountAddonOptions, 'messages'>> & { messages: CharacterCountMessages };
  counters: Map<string, CharacterCountEntry>;
  onInput: EventListener | null;
  unsubscribeAfterValidate?: () => void;
  unsubscribeDestroy?: () => void;
  installCounters(): void;
  shouldShow(length: number, max: number | null): boolean;
  update(input: FieldController | string | HTMLElement): void;
  updateAll(): void;
  destroy(): void;
}

const DEFAULT_OPTIONS = Object.freeze({
  selector: 'textarea[maxlength], input[maxlength], textarea[data-character-count], input[data-character-count]',
  threshold: 0,
  messages: Object.freeze({
    remaining: '{remaining} {remainingLabel} remaining.',
    over: '{over} {overLabel} over the limit.',
    minimum: 'Enter at least {remaining} more {remainingLabel}.'
  })
});

function formatMessage(template: string, values: Record<string, string | number | null>): string {
  return String(template).replace(/\{([a-z]+)\}/gi, (_, key: string) => String(values[key] ?? ''));
}

function getLength(value: unknown): number {
  return Array.from(String(value ?? '')).length;
}

function characterLabel(count: number): string {
  return count === 1 ? 'character' : 'characters';
}

function getLimit(element: HTMLElement, attributeName: string, datasetName: string): number | null {
  const value = element.getAttribute(attributeName) || element.dataset[datasetName];
  const limit = toSafeInteger(value ?? undefined, Number.NaN, { min: 1 });
  return Number.isFinite(limit) ? limit : null;
}

export function createCharacterCountAddon(options: CharacterCountAddonOptions = {}): CharacterCountAddon {
  return {
    validator: null,
    options: {
      ...DEFAULT_OPTIONS,
      ...options,
      messages: {
        ...DEFAULT_OPTIONS.messages,
        ...(options.messages || {})
      }
    },
    counters: new Map(),
    onInput: null,

    install(validator: A11yFormValidator): void {
      this.validator = validator;
      this.options = {
        ...DEFAULT_OPTIONS,
        ...options,
        messages: {
          ...DEFAULT_OPTIONS.messages,
          ...(options.messages || {})
        }
      };
      this.counters = new Map();
      this.onInput = (event) => {
        if (!validator) {
          return;
        }

        const field = validator.findFieldByElement(event.target);
        if (field) {
          this.update(field);
        }
      };
      validator.form.addEventListener('input', this.onInput);
      this.installCounters();
      this.unsubscribeAfterValidate = validator.events.on('a11y-form-validator:after-validate', () => this.updateAll());
      this.unsubscribeDestroy = validator.events.on('a11y-form-validator:destroy', () => this.destroy());
    },

    installCounters(): void {
      if (!this.validator) {
        return;
      }

      this.validator.fields.forEach((field) => {
        const element = field.primaryElement;
        if (!element.matches(this.options.selector)) {
          return;
        }

        const max = getLimit(element, 'maxlength', 'maxLength');
        const min = getLimit(element, 'minlength', 'minLength');
        if (!max && !min) {
          return;
        }

        const counter = element.ownerDocument.createElement('div');
        counter.id = `${ensureElementId(element)}-character-count`;
        counter.className = 'a11y-form-validator__character-count';
        counter.setAttribute('aria-live', 'polite');
        counter.setAttribute('aria-atomic', 'true');
        counter.setAttribute('data-character-count-for', field.name);
        element.insertAdjacentElement('afterend', counter);
        field.connectDescription(counter.id);
        this.counters.set(field.name, { field, counter, max, min });
        this.update(field);
      });
    },

    shouldShow(length: number, max: number | null): boolean {
      if (!max || this.options.threshold <= 0) {
        return true;
      }

      return length >= Math.floor(max * this.options.threshold);
    },

    update(input: FieldController | string | HTMLElement): void {
      const field = this.validator?.resolveField(input);
      const entry = field ? this.counters.get(field.name) : null;
      if (!entry) {
        return;
      }

      const length = getLength(entry.field.getValue());
      const max = entry.max;
      const min = entry.min;
      entry.counter.classList.toggle('is-over-limit', Boolean(max && length > max));
      entry.counter.classList.toggle('is-under-minimum', Boolean(min && length > 0 && length < min));

      if (!this.shouldShow(length, max)) {
        entry.counter.textContent = '';
        entry.counter.hidden = true;
        return;
      }

      entry.counter.hidden = false;
      if (max && length > max) {
        const over = length - max;
        entry.counter.textContent = formatMessage(this.options.messages.over, {
          over,
          overLabel: characterLabel(over),
          count: length,
          max,
          min
        });
        return;
      }

      if (min && length > 0 && length < min) {
        const remaining = min - length;
        entry.counter.textContent = formatMessage(this.options.messages.minimum, {
          remaining,
          remainingLabel: characterLabel(remaining),
          count: length,
          max,
          min
        });
        return;
      }

      if (max) {
        const remaining = max - length;
        entry.counter.textContent = formatMessage(this.options.messages.remaining, {
          remaining,
          remainingLabel: characterLabel(remaining),
          count: length,
          max,
          min
        });
        return;
      }

      entry.counter.textContent = '';
      entry.counter.hidden = true;
    },

    updateAll(): void {
      this.counters.forEach(({ field }) => this.update(field));
    },

    destroy(): void {
      if (this.validator && this.onInput) {
        this.validator.form.removeEventListener('input', this.onInput);
      }
      this.unsubscribeAfterValidate?.();
      this.unsubscribeDestroy?.();
      this.counters.forEach(({ field, counter }) => {
        field.disconnectDescription(counter.id);
        counter.remove();
      });
      this.counters.clear();
      this.onInput = null;
      this.validator = null;
    }
  };
}

export default createCharacterCountAddon;
