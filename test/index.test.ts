import { afterEach, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  A11yFormValidator,
  createFormValidator,
  initFormValidators
} from '../src/index.js';
import { createCharacterCountAddon } from '../src/addons/character-count.js';
import { createErrorSummaryAddon } from '../src/addons/error-summary.js';
import { createDefaultPreset } from '../src/presets/default.js';
import { createNoSummaryPreset } from '../src/presets/no-summary.js';
import esMessages from '../src/locales/es.json' with { type: 'json' };

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
    FileList: dom.window.FileList
  });
  return dom;
}

function getForm(id = 'test-form'): HTMLFormElement {
  const form = document.getElementById(id);
  expect(form).toBeInstanceOf(HTMLFormElement);
  return form as HTMLFormElement;
}

afterEach(() => {
  window?.close();
});

test('public API initializes forms through class, factory, and init-all helper', () => {
  setupDom(`
    <form id="test-form" data-a11y-form-validator>
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const instance = createFormValidator(form);
  const duplicate = new A11yFormValidator(form);
  const initialized = initFormValidators();

  expect(instance).toBe(duplicate);
  expect(initialized).toHaveLength(1);
  expect(initialized[0]).toBe(instance);
  expect(form.classList.contains('a11y-form-validator')).toBe(true);
  expect(form.classList.contains('is-initialized')).toBe(true);
  expect(typeof instance.destroy).toBe('function');
});

test('core initializes without addon UI by default', () => {
  setupDom(`
    <form id="test-form">
      <label for="message">Message</label>
      <textarea id="message" name="message" required maxlength="10" data-character-count></textarea>
    </form>
  `);

  const form = getForm();
  new A11yFormValidator(form);

  expect(form.querySelector('.a11y-form-validator__summary')).toBeNull();
  expect(form.querySelector('.a11y-form-validator__character-count')).toBeNull();
});

test('no-summary preset keeps default validation cadence without summary addon UI', async () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, createNoSummaryPreset());

  await validator.validate({ reason: 'submit' });

  const input = document.getElementById('email') as HTMLInputElement;
  expect(validator.options.validateOn).toEqual(['submit', 'blur']);
  expect(validator.options.errorMode).toBe('both');
  expect(validator.options.focusOnError).toBe('first-invalid');
  expect(form.querySelector('.a11y-form-validator__summary')).toBeNull();
  expect(input.getAttribute('aria-invalid')).toBe('true');
});

test('submit validation renders inline errors and preserves describedby', async () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required aria-describedby="hint" />
      <p id="hint">Helpful hint</p>
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form);
  const valid = await validator.validate({ reason: 'submit' });
  const input = document.getElementById('email') as HTMLInputElement;
  const error = document.getElementById('a11y-form-validator-error-test-form-email');

  expect(valid).toBe(false);
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(error).toBeTruthy();
  expect(error?.textContent).toMatch(/required/i);
  expect(error?.getAttribute('role')).toBe('status');
  expect(error?.getAttribute('aria-live')).toBe('polite');
  expect(error?.getAttribute('aria-atomic')).toBe('true');
  expect(input.getAttribute('aria-describedby')).toBe('hint a11y-form-validator-error-test-form-email');
});

test('native error mode sets validity without rendering inline nodes', async () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, { errorMode: 'native' });

  await validator.validate({ reason: 'submit' });

  const input = document.getElementById('email') as HTMLInputElement;
  expect(form.querySelector('.a11y-form-validator__error')).toBeNull();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.hasAttribute('aria-errormessage')).toBe(false);
  expect(input.validationMessage.length).toBeGreaterThan(0);
});

test('unconfigured locales fall back to bundled English messages', async () => {
  setupDom(`
    <html lang="es">
      <body>
        <form id="test-form">
          <label for="email">Correo electrónico</label>
          <input id="email" name="email" type="email" required />
        </form>
      </body>
    </html>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, { locale: 'es' });

  await validator.validate({ reason: 'submit' });
  expect(document.getElementById('a11y-form-validator-error-test-form-email')?.textContent)
    .toBe('This field is required.');
});

test('imported locale JSON messages are used when configured by locale code', async () => {
  setupDom(`
    <form id="test-form" lang="es-ES">
      <label for="email">Correo electrónico</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, {
    locale: 'es-ES',
    locales: { es: esMessages }
  });

  await validator.validate({ reason: 'submit' });
  expect(document.getElementById('a11y-form-validator-error-test-form-email')?.textContent)
    .toBe('Este campo es obligatorio.');
});

test('inline locale messages can be supplied during initialization', async () => {
  setupDom(`
    <form id="test-form" lang="product">
      <label for="email">Work email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, {
    locale: 'product',
    locales: {
      product: {
        required: '{fieldLabel} is needed before the account can continue.'
      }
    }
  });

  await validator.validate({ reason: 'submit' });
  expect(document.getElementById('a11y-form-validator-error-test-form-email')?.textContent)
    .toBe('Work email is needed before the account can continue.');
});

test('field-level data messages override locale messages', async () => {
  setupDom(`
    <form id="test-form" lang="es-ES">
      <label for="email">Correo electrónico</label>
      <input id="email" name="email" type="email" required data-message-required="Escribe el correo de tu cuenta." />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, {
    locale: 'es-ES',
    locales: { es: esMessages }
  });

  await validator.validate({ reason: 'submit' });
  expect(document.getElementById('a11y-form-validator-error-test-form-email')?.textContent)
    .toBe('Escribe el correo de tu cuenta.');
});

test('setErrors uses server messages and error summary focus', () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, createDefaultPreset());
  validator.setErrors({
    email: 'This email is already registered.',
    form: 'Your session expired. Reload the page.'
  });
  validator.focusOnError();

  const summary = form.querySelector<HTMLElement>('.a11y-form-validator__summary');
  const summaryLinks = form.querySelectorAll('.a11y-form-validator__summary-link');
  expect(summary?.hidden).toBe(false);
  expect(summary?.textContent).toMatch(/session expired/i);
  expect(summaryLinks).toHaveLength(1);
  expect(summaryLinks[0]?.textContent).toBe('Email: This email is already registered.');
  expect(document.activeElement).toBe(summary);
});

test('summary links include field labels so repeated messages stay meaningful', async () => {
  setupDom(`
    <form id="test-form">
      <label for="full-name">Full name</label>
      <input id="full-name" name="fullName" required />

      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />

      <label for="postcode">Postcode</label>
      <input id="postcode" name="postcode" required minlength="4" />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, createDefaultPreset());

  await validator.validate({ reason: 'submit' });

  const summaryLinks = Array.from(form.querySelectorAll<HTMLAnchorElement>('.a11y-form-validator__summary-link'));
  const inlineErrors = Array.from(form.querySelectorAll<HTMLElement>('.a11y-form-validator__error'));

  expect(summaryLinks.map((link) => link.textContent)).toEqual([
    'Full name: This field is required.',
    'Email: This field is required.',
    'Postcode: This field is required.'
  ]);
  expect(inlineErrors.map((error) => error.textContent)).toEqual([
    'This field is required.',
    'This field is required.',
    'This field is required.'
  ]);
});

test('summary item text can be customized through messages', () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, {
    ...createDefaultPreset(),
    messages: {
      summaryItem: 'Fix {fieldLabel} - {message}'
    }
  });
  validator.setErrors({ email: 'This email is already registered.' });

  const link = form.querySelector<HTMLAnchorElement>('.a11y-form-validator__summary-link');
  expect(link?.textContent).toBe('Fix Email - This email is already registered.');
});

test('summary links focus invalid fields and preserve keyboard-friendly link semantics', () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, createDefaultPreset());
  validator.setErrors({ email: 'This email is already registered.' });

  const input = document.getElementById('email') as HTMLInputElement;
  const link = form.querySelector<HTMLAnchorElement>('.a11y-form-validator__summary-link');
  expect(link?.tagName).toBe('A');
  expect(link?.getAttribute('href')).toBe('#email');
  expect(link?.textContent).toBe('Email: This email is already registered.');

  link?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  expect(document.activeElement).toBe(input);
});

test('blur validation after submit attempt clears once field becomes valid', async () => {
  setupDom(`
    <form id="test-form">
      <label for="password">Password</label>
      <input id="password" name="password" required minlength="4" />
    </form>
  `);

  const form = getForm();
  const input = document.getElementById('password') as HTMLInputElement;
  new A11yFormValidator(form);

  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  input.value = 'long-enough';
  input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(form.querySelector('.a11y-form-validator__error')).toBeNull();
  expect(input.hasAttribute('aria-invalid')).toBe(false);
});

test('error summary is labelled, focusable, and links to generated field ids', () => {
  setupDom(`
    <form>
      <label>Email <input name="email" type="email" required /></label>
    </form>
  `);

  const form = document.querySelector('form') as HTMLFormElement;
  const validator = new A11yFormValidator(form, createDefaultPreset());
  validator.setErrors({
    email: 'This email is already registered.'
  });

  const input = form.elements.namedItem('email') as HTMLInputElement;
  const summary = form.querySelector<HTMLElement>('.a11y-form-validator__summary');
  const title = summary?.querySelector('.a11y-form-validator__summary-title');
  const link = summary?.querySelector('.a11y-form-validator__summary-link');

  expect(input.id).toBeTruthy();
  expect(summary?.tabIndex).toBe(-1);
  expect(summary?.hasAttribute('role')).toBe(false);
  expect(summary?.hasAttribute('aria-live')).toBe(false);
  expect(summary?.hasAttribute('aria-atomic')).toBe(false);
  expect(summary?.getAttribute('aria-labelledby')).toBe(title?.id);
  expect(link?.getAttribute('href')).toBe(`#${input.id}`);
});

test('default preset submit focuses summary and keeps inline errors out of live regions', async () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
      <label for="password">Password</label>
      <input id="password" name="password" required minlength="8" />
      <button type="submit">Create account</button>
    </form>
  `);

  const form = getForm();
  new A11yFormValidator(form, createDefaultPreset());

  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const summary = form.querySelector<HTMLElement>('.a11y-form-validator__summary');
  const errors = form.querySelectorAll<HTMLElement>('.a11y-form-validator__error');

  expect(summary?.hidden).toBe(false);
  expect(document.activeElement).toBe(summary);
  expect(errors).toHaveLength(2);
  errors.forEach((error) => {
    expect(error.hasAttribute('role')).toBe(false);
    expect(error.hasAttribute('aria-live')).toBe(false);
    expect(error.hasAttribute('aria-atomic')).toBe(false);
  });
});

test('field-level validation without a summary route keeps polite inline error announcements', async () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form);

  await validator.validateField('email', { reason: 'blur' });

  const error = form.querySelector<HTMLElement>('.a11y-form-validator__error');
  expect(error?.getAttribute('role')).toBe('status');
  expect(error?.getAttribute('aria-live')).toBe('polite');
  expect(error?.getAttribute('aria-atomic')).toBe('true');
});

test('summary updates once for an invalid validation result', async () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const summaryAddon = createErrorSummaryAddon();
  const originalUpdate = summaryAddon.update.bind(summaryAddon);
  let updateCount = 0;
  summaryAddon.update = () => {
    updateCount += 1;
    originalUpdate();
  };
  const validator = new A11yFormValidator(form, {
    ...createDefaultPreset(),
    addons: [summaryAddon]
  });

  await validator.validate({ reason: 'submit' });

  expect(updateCount).toBe(1);
});

test('form-level summary errors render as text while field errors remain links', () => {
  setupDom(`
    <form id="test-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form, createDefaultPreset());

  validator.setErrors({
    email: 'This email is already registered.',
    form: 'Your session expired. Reload the page.'
  });

  const items = form.querySelectorAll<HTMLLIElement>('.a11y-form-validator__summary-list li');
  const links = form.querySelectorAll<HTMLAnchorElement>('.a11y-form-validator__summary-link');

  expect(items).toHaveLength(2);
  expect(items[0]?.textContent).toBe('Your session expired. Reload the page.');
  expect(items[0]?.querySelector('a')).toBeNull();
  expect(links).toHaveLength(1);
  expect(links[0]?.textContent).toBe('Email: This email is already registered.');
  expect(links[0]?.getAttribute('href')).toBe('#email');
});

test('checkbox wrapper labels keep error messages outside the clickable label text', async () => {
  setupDom(`
    <form id="test-form">
      <label>
        <input name="terms" type="checkbox" required />
        Accept the terms
      </label>
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form);

  await validator.validate({ reason: 'submit' });

  const label = form.querySelector('label');
  const error = form.querySelector('.a11y-form-validator__error');
  expect(error).toBeTruthy();
  expect(label?.nextElementSibling).toBe(error);
  expect(label?.contains(error)).toBe(false);
});

test('grouped choice errors render after the fieldset instead of inside an option label', async () => {
  setupDom(`
    <form id="test-form">
      <fieldset>
        <legend>Payment method</legend>
        <label><input name="paymentMethod" type="radio" value="card" required /> Card</label>
        <label><input name="paymentMethod" type="radio" value="invoice" required /> Invoice</label>
      </fieldset>
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form);

  await validator.validate({ reason: 'submit' });

  const fieldset = form.querySelector('fieldset');
  const error = form.querySelector('.a11y-form-validator__error');
  expect(error).toBeTruthy();
  expect(fieldset?.nextElementSibling).toBe(error);
  expect(fieldset?.contains(error)).toBe(false);
});

test('character count addon announces remaining characters and links as a description', () => {
  setupDom(`
    <form id="test-form">
      <label for="message">Message</label>
      <textarea id="message" name="message" maxlength="10" data-character-count></textarea>
    </form>
  `);

  const form = getForm();
  new A11yFormValidator(form, { addons: [createCharacterCountAddon()] });
  const textarea = document.getElementById('message') as HTMLTextAreaElement;
  const counter = document.getElementById('message-character-count');

  expect(counter).toBeTruthy();
  expect(counter?.getAttribute('aria-live')).toBe('polite');
  expect(counter?.getAttribute('aria-atomic')).toBe('true');
  expect(counter?.textContent).toBe('10 characters remaining.');
  expect(textarea.getAttribute('aria-describedby')).toBe('message-character-count');

  textarea.value = 'hello';
  textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
  expect(counter?.textContent).toBe('5 characters remaining.');
});

test('duplicate initialization does not duplicate summaries, counters, or submit listeners', async () => {
  setupDom(`
    <form id="test-form">
      <label for="message">Message</label>
      <textarea id="message" name="message" required maxlength="20" data-character-count></textarea>
      <button type="submit">Send</button>
    </form>
  `);

  const form = getForm();
  const first = new A11yFormValidator(form, {
    ...createDefaultPreset(),
    addons: [createErrorSummaryAddon(), createCharacterCountAddon()]
  });
  const second = new A11yFormValidator(form, {
    ...createDefaultPreset(),
    addons: [createErrorSummaryAddon(), createCharacterCountAddon()]
  });

  expect(second).toBe(first);
  expect(form.querySelectorAll('.a11y-form-validator__summary')).toHaveLength(1);
  expect(form.querySelectorAll('.a11y-form-validator__character-count')).toHaveLength(1);

  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(form.querySelectorAll('.a11y-form-validator__error')).toHaveLength(1);
  expect(form.querySelectorAll('.a11y-form-validator__summary-link')).toHaveLength(1);
});

test('destroy cleans generated DOM, validation state, generated ids, classes, and novalidate', async () => {
  setupDom(`
    <form id="test-form">
      <label>Message <textarea name="message" required maxlength="20" data-character-count></textarea></label>
    </form>
  `);

  const form = getForm();
  const textarea = form.elements.namedItem('message') as HTMLTextAreaElement;
  const validator = new A11yFormValidator(form, { addons: [createCharacterCountAddon()] });

  await validator.validate({ reason: 'submit' });
  expect(textarea.id).toBeTruthy();
  expect(form.querySelector('.a11y-form-validator__error')).toBeTruthy();
  expect(form.querySelector('.a11y-form-validator__character-count')).toBeTruthy();

  validator.destroy();

  expect(form.classList.contains('a11y-form-validator')).toBe(false);
  expect(form.classList.contains('is-initialized')).toBe(false);
  expect(form.hasAttribute('novalidate')).toBe(false);
  expect(textarea.id).toBe('');
  expect(textarea.hasAttribute('aria-describedby')).toBe(false);
  expect(textarea.hasAttribute('aria-invalid')).toBe(false);
  expect(textarea.dataset.validationState).toBeUndefined();
  expect(form.querySelector('.a11y-form-validator__error')).toBeNull();
  expect(form.querySelector('.a11y-form-validator__character-count')).toBeNull();
});

test('destroy dispatches a bubbling lifecycle event with instance and validator detail', () => {
  setupDom(`
    <div id="root">
      <form id="test-form">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required />
      </form>
    </div>
  `);

  const form = getForm();
  const root = document.getElementById('root');
  const validator = new A11yFormValidator(form);
  let eventDetail: { instance?: unknown; validator?: unknown } | undefined;

  root?.addEventListener('a11y-form-validator:destroy', (event) => {
    eventDetail = (event as CustomEvent<{ instance?: unknown; validator?: unknown }>).detail;
  });

  validator.destroy();

  expect(eventDetail?.instance).toBe(validator);
  expect(eventDetail?.validator).toBe(validator);
});

test('invalid dataset numbers, patterns, and same-as selectors fail safely', async () => {
  setupDom(`
    <form id="test-form">
      <label for="code">Code</label>
      <input id="code" name="code" value="abc" data-min-length="not-a-number" data-pattern="[" />

      <label for="confirm">Confirm</label>
      <input id="confirm" name="confirm" value="abc" data-validate="same-as" data-same-as="[bad" />
    </form>
  `);

  const form = getForm();
  const validator = new A11yFormValidator(form);

  await expect(validator.validateField('code')).resolves.toBe(true);
  await expect(validator.validateField('confirm')).resolves.toBe(false);
  expect(document.getElementById('a11y-form-validator-error-test-form-confirm')).toBeTruthy();
});

test('async validation races do not allow stale invalid results to overwrite newer valid state', async () => {
  setupDom(`
    <form id="test-form">
      <label for="username">Username</label>
      <input id="username" name="username" data-validate="available-username" />
    </form>
  `);

  const form = getForm();
  const input = document.getElementById('username') as HTMLInputElement;
  const validator = new A11yFormValidator(form);

  validator.registerRule('availableUsername', async ({ value }) => {
    const text = String(value);
    await new Promise((resolve) => setTimeout(resolve, text === 'taken' ? 20 : 0));
    return { valid: text !== 'taken', message: 'That username is already taken.' };
  });

  input.value = 'taken';
  const staleRun = validator.validateField('username');
  input.value = 'available';
  const freshRun = validator.validateField('username');

  await expect(freshRun).resolves.toBe(true);
  await expect(staleRun).resolves.toBe(true);
  expect(form.querySelector('.a11y-form-validator__error')).toBeNull();
  expect(input.hasAttribute('aria-invalid')).toBe(false);
});
