const RULE_NAME_PATTERN = /([a-z0-9])([A-Z])/g;

export type RuleOptions = Record<string, unknown>;
export type RuleList = Record<string, true | string | number | RuleOptions>;

export function sanitizeId(value: unknown): string {
  const input = String(value || 'field');
  let output = '';
  let previousWasDash = false;

  for (const character of input) {
    const isSafeCharacter =
      (character >= 'a' && character <= 'z') ||
      (character >= 'A' && character <= 'Z') ||
      (character >= '0' && character <= '9') ||
      character === '_' ||
      character === '-';

    if (isSafeCharacter) {
      output += character;
      previousWasDash = false;
      continue;
    }

    if (!previousWasDash) {
      output += '-';
      previousWasDash = true;
    }
  }

  while (output.startsWith('-')) {
    output = output.slice(1);
  }

  while (output.endsWith('-')) {
    output = output.slice(0, -1);
  }

  return output || 'field';
}


export function escapeSelectorIdentifier(value: unknown): string {
  const input = String(value || '');
  if (globalThis.CSS?.escape) {
    return globalThis.CSS.escape(input);
  }

  return input.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

export function ensureElementId(element: HTMLElement, prefix = 'a11y-form-validator-field'): string {
  if (element.id) {
    return element.id;
  }

  const namedElement = element as HTMLElement & { name?: string };
  const rawBase = namedElement.name || element.getAttribute('name') || '';
  const base = rawBase ? sanitizeId(rawBase) : '';
  const root = element.ownerDocument;
  let id = base ? `${prefix}-${base}` : prefix;
  let index = 2;

  while (root.getElementById(id)) {
    id = `${prefix}-${base}-${index}`;
    index += 1;
  }

  element.id = id;
  return id;
}


export function getPreferredScrollBehavior(element: Element): ScrollBehavior {
  const view = element?.ownerDocument?.defaultView || globalThis;
  return view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export function kebabToCamelCase(value = ''): string {
  return String(value).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function camelToKebabCase(value = ''): string {
  return String(value).replace(RULE_NAME_PATTERN, '$1-$2').toLowerCase();
}

export function normalizeToArray<T>(value: T | T[] | null | undefined | false): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null || value === false) {
    return [];
  }

  return [value];
}

export function toSafeBoolean(value: boolean | string | undefined, fallback: boolean): boolean {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return fallback;
}

export function toSafeInteger(
  value: number | string | undefined,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (options.min !== undefined && parsed < options.min) {
    return fallback;
  }

  if (options.max !== undefined && parsed > options.max) {
    return fallback;
  }

  return parsed;
}

export function toSafeString(value: string | undefined, fallback: string): string {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function mergeOptions(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...defaults, ...overrides };

  output.ignore = {
    ...((defaults.ignore as Record<string, unknown>) || {}),
    ...((overrides.ignore as Record<string, unknown>) || {})
  };

  output.selectors = {
    ...((defaults.selectors as Record<string, unknown>) || {}),
    ...((overrides.selectors as Record<string, unknown>) || {})
  };

  output.messages = overrides?.messages || defaults.messages;
  output.locales = overrides?.locales || defaults.locales;
  output.rules = overrides?.rules || defaults.rules;
  output.addons = normalizeToArray(overrides.addons ?? defaults.addons);
  output.validateOn = normalizeToArray(overrides.validateOn ?? defaults.validateOn);
  output.debounce = Number(overrides.debounce ?? defaults.debounce);

  return output;
}

export function parseRuleList(value: unknown): RuleList {
  if (!value) {
    return {};
  }

  if (Array.isArray(value)) {
    return value.reduce<RuleList>((rules, rule) => ({ ...rules, ...parseRuleList(rule) }), {});
  }

  if (typeof value === 'object') {
    return { ...(value as RuleList) };
  }

  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .reduce<RuleList>((rules, ruleToken) => {
      const [rawName, rawParam] = ruleToken.split(':');
      const ruleName = kebabToCamelCase(rawName);
      if (!ruleName) {
        return rules;
      }

      if (rawParam == null || rawParam === '') {
        rules[ruleName] = true;
        return rules;
      }

      const numericValue = Number(rawParam);
      rules[ruleName] = Number.isNaN(numericValue) ? rawParam : numericValue;
      return rules;
    }, {});
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function isEmptyValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof FileList !== 'undefined' && value instanceof FileList) {
    return value.length === 0;
  }

  if (value && typeof value === 'object' && 'length' in value && typeof value.length === 'number') {
    return value.length === 0;
  }

  if (typeof value === 'boolean') {
    return value === false;
  }

  return String(value ?? '').trim() === '';
}

export function applyPlaceholders(template: string, params: Record<string, unknown> = {}): string {
  const input = String(template);
  let output = '';

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character !== '{') {
      output += character;
      continue;
    }

    const closingIndex = input.indexOf('}', index + 1);
    if (closingIndex === -1) {
      output += character;
      continue;
    }

    const key = input.slice(index + 1, closingIndex).trim();
    const replacement = params[key];
    output += replacement == null ? '' : String(replacement);
    index = closingIndex;
  }

  return output;
}

export function toRuleOptions(value: unknown, key: string): RuleOptions {
  if (value === true) {
    return {};
  }

  if (value == null || value === false) {
    return {};
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as RuleOptions;
  }

  if (typeof value === 'number') {
    if (key === 'minLength' || key === 'min') {
      return { min: value };
    }

    if (key === 'maxLength' || key === 'max') {
      return { max: value };
    }
  }

  if (typeof value === 'string') {
    if (key === 'sameAs') {
      return { selector: value };
    }

    if (key === 'pattern') {
      return { pattern: value };
    }
  }

  return { value };
}
