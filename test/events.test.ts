import { afterEach, expect, expectTypeOf, test } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  A11yFormValidator,
  EVENTS,
  type ValidatorCustomEvent,
  type ValidatorFieldPendingEventDetail
} from '../src/index.js';

function setupDom(html: string): JSDOM {
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLFormElement: dom.window.HTMLFormElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    CustomEvent: dom.window.CustomEvent,
    Event: dom.window.Event,
    FocusEvent: dom.window.FocusEvent,
    SubmitEvent: dom.window.SubmitEvent,
    FileList: dom.window.FileList
  });
  return dom;
}

afterEach(() => {
  globalThis.window?.close();
});

test('exports the complete lifecycle event constants', () => {
  expect(EVENTS).toEqual({
    init: 'a11y-form-validator:init',
    beforeValidate: 'a11y-form-validator:before-validate',
    afterValidate: 'a11y-form-validator:after-validate',
    fieldPending: 'a11y-form-validator:field-pending',
    fieldValid: 'a11y-form-validator:field-valid',
    fieldInvalid: 'a11y-form-validator:field-invalid',
    fieldIgnored: 'a11y-form-validator:field-ignored',
    formValid: 'a11y-form-validator:form-valid',
    formInvalid: 'a11y-form-validator:form-invalid',
    errorsChanged: 'a11y-form-validator:errors-changed',
    submitBlocked: 'a11y-form-validator:submit-blocked',
    submitReady: 'a11y-form-validator:submit-ready',
    refresh: 'a11y-form-validator:refresh',
    reset: 'a11y-form-validator:reset',
    destroy: 'a11y-form-validator:destroy'
  });
});

test('events bubble from the form with typed base detail and deterministic batch boundaries', async () => {
  setupDom(`
    <div id="root">
      <form id="form">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required />
      </form>
    </div>
  `);
  const root = document.getElementById('root')!;
  const form = document.getElementById('form') as HTMLFormElement;
  const sequence: string[] = [];
  let initEvent: CustomEvent | null = null;

  for (const name of Object.values(EVENTS)) {
    root.addEventListener(name, (event) => {
      sequence.push(name);
      expect(event.target).toBe(form);
      expect(event.currentTarget).toBe(root);
      expect(event.bubbles).toBe(true);
      expect(event.cancelable).toBe(false);
      expect(event.composed).toBe(false);
      const detail = (event as CustomEvent).detail;
      expect(detail.form).toBe(form);
      expect(detail.instance).toBe(detail.validator);
      if (name === EVENTS.init) {
        initEvent = event as CustomEvent;
      }
    });
  }

  const validator = new A11yFormValidator(form);
  expect(initEvent).not.toBeNull();
  expect((initEvent as unknown as CustomEvent).detail.validator).toBe(validator);

  sequence.length = 0;
  await validator.validate({ reason: 'draft-restored' });

  expect(sequence).toEqual([
    EVENTS.beforeValidate,
    EVENTS.fieldPending,
    EVENTS.fieldInvalid,
    EVENTS.errorsChanged,
    EVENTS.afterValidate,
    EVENTS.formInvalid
  ]);
});

test('typed subscriptions infer event detail and unsubscribe safely', async () => {
  setupDom('<form id="form"><input name="email" required /></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const validator = new A11yFormValidator(form);
  const names: string[] = [];
  const handler = (event: CustomEvent<ValidatorFieldPendingEventDetail>) => {
    names.push(event.detail.fieldName);
    expect(event.detail.element).toBe(event.detail.field.primaryElement);
    expect(event.detail.state.pending).toBe(true);
  };

  const unsubscribe = validator.events.on(EVENTS.fieldPending, handler);
  validator.events.on(EVENTS.fieldPending, (event) => {
    expectTypeOf(event.detail).toEqualTypeOf<ValidatorFieldPendingEventDetail>();
  });
  form.addEventListener(EVENTS.fieldPending, (event) => {
    const typedEvent = event as ValidatorCustomEvent<typeof EVENTS.fieldPending>;
    expectTypeOf(typedEvent.detail).toEqualTypeOf<ValidatorFieldPendingEventDetail>();
  });
  await validator.validateField('email', { reason: 'blur' });
  unsubscribe();
  unsubscribe();
  await validator.validateField('email', { reason: 'blur' });

  expect(names).toEqual(['email']);

  validator.events.on(EVENTS.fieldPending, handler);
  validator.events.off(EVENTS.fieldPending, handler);
  await validator.validateField('email');
  expect(names).toEqual(['email']);
});

test('clearErrors and setErrors emit snapshot changes without false validation completion', () => {
  setupDom('<form id="form"><input name="email" /></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const validator = new A11yFormValidator(form);
  const afterEvents: Event[] = [];
  const changes: Array<{ source: string; fields: Record<string, string> }> = [];

  form.addEventListener(EVENTS.afterValidate, (event) => afterEvents.push(event));
  form.addEventListener(EVENTS.errorsChanged, (event) => {
    const detail = (event as CustomEvent).detail;
    changes.push({ source: detail.source, fields: detail.errors.fields });
  });

  validator.setErrors({ email: 'Server error.' });
  validator.setErrors({ email: 'Server error.' });
  validator.clearErrors();
  validator.clearErrors();

  expect(afterEvents).toHaveLength(0);
  expect(changes).toEqual([
    { source: 'server', fields: { email: 'Server error.' } },
    { source: 'manual-clear', fields: {} }
  ]);
});

test('field pending, invalid, ignored, reset, and refresh events expose normalized reasons and state', async () => {
  setupDom(`
    <form id="form">
      <input id="active" name="active" required />
      <input id="disabled" name="disabled" disabled required />
    </form>
  `);
  const form = document.getElementById('form') as HTMLFormElement;
  const validator = new A11yFormValidator(form);
  const records: Array<{ name: string; detail: Record<string, unknown> }> = [];

  for (const name of [EVENTS.fieldPending, EVENTS.fieldInvalid, EVENTS.fieldIgnored, EVENTS.reset, EVENTS.refresh]) {
    form.addEventListener(name, (event) => {
      records.push({ name, detail: (event as CustomEvent).detail });
    });
  }

  await validator.validateField('active', { reason: '' });
  await validator.validateField('disabled', { reason: 'conditional-change' });
  validator.reset();
  validator.refresh();

  expect(records.map(({ name }) => name)).toEqual([
    EVENTS.fieldPending,
    EVENTS.fieldInvalid,
    EVENTS.fieldIgnored,
    EVENTS.reset,
    EVENTS.refresh
  ]);
  expect(records[0]?.detail.reason).toBe('manual');
  expect(records[2]?.detail.ignoredReason).toBe('disabled');
  expect(records[3]?.detail.reason).toBe('reset');
  expect(records[4]?.detail.reason).toBe('refresh');
});

test('refresh removes stale errors and state for removed controls', () => {
  setupDom('<form id="form"><input id="email" name="email" /></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const input = document.getElementById('email') as HTMLInputElement;
  const validator = new A11yFormValidator(form);
  const changes: Array<{ reason: string; fields: Record<string, string> }> = [];

  validator.setErrors({ email: 'No longer applicable.' });
  form.addEventListener(EVENTS.errorsChanged, (event) => {
    const detail = (event as CustomEvent).detail;
    changes.push({ reason: detail.reason, fields: detail.errors.fields });
  });
  input.remove();
  validator.refresh();

  expect(validator.getErrors().fields).toEqual({});
  expect(validator.getState().fields.email).toBeUndefined();
  expect(changes).toEqual([{ reason: 'refresh', fields: {} }]);
});

test('rejected field rules clear pending state while direct validation still rejects', async () => {
  setupDom('<form id="form"><input name="code" data-validate="remote" /></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const validator = new A11yFormValidator(form);
  validator.registerRule('remote', async () => {
    throw new Error('Network unavailable');
  });

  await expect(validator.validateField('code')).rejects.toThrow('Network unavailable');
  expect(validator.getState().fields.code?.pending).toBe(false);
  expect((form.elements.namedItem('code') as HTMLInputElement).classList.contains('is-pending')).toBe(false);
});

test('reset invalidates pending field work so late results cannot restore errors', async () => {
  setupDom('<form id="form"><input name="code" data-validate="remote" /></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const validator = new A11yFormValidator(form);
  let resolveRule!: (result: string) => void;
  validator.registerRule('remote', () => new Promise<string>((resolve) => {
    resolveRule = resolve;
  }));
  const terminalEvents: string[] = [];
  form.addEventListener(EVENTS.fieldInvalid, () => terminalEvents.push(EVENTS.fieldInvalid));
  form.addEventListener(EVENTS.fieldValid, () => terminalEvents.push(EVENTS.fieldValid));

  const validation = validator.validateField('code');
  await Promise.resolve();
  validator.reset();
  resolveRule('Late error.');
  await validation;

  expect(terminalEvents).toEqual([]);
  expect(validator.getErrors()).toEqual({ fields: {}, form: [] });
  expect(validator.getState().fields.code?.pending).toBe(false);
});
