import { afterEach, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import { A11yFormValidator } from '../src/index.js';
import { createDefaultPreset } from '../src/presets/default.js';

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

afterEach(() => {
  window?.close();
});

test('registration demo same-as validation shows configured message', async () => {
  setupDom(`
    <form id="registration-form">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" required minlength="8" />

      <label for="confirm-password">Confirm password</label>
      <input id="confirm-password" name="confirmPassword" type="password" required data-validate="same-as" data-same-as="#password" />
    </form>
  `);

  const form = document.getElementById('registration-form') as HTMLFormElement;
  const validator = new A11yFormValidator(form, {
    ...createDefaultPreset(),
    messages: {
      sameAs: 'Use the same password in both fields.'
    }
  });

  (document.getElementById('password') as HTMLInputElement).value = 'long-enough';
  (document.getElementById('confirm-password') as HTMLInputElement).value = 'different-password';

  const valid = await validator.validate({ reason: 'submit' });
  expect(valid).toBe(false);
  const error = document.getElementById('a11y-form-validator-error-registration-form-confirmPassword');
  expect(error).toBeTruthy();
  expect(error?.textContent).toBe('Use the same password in both fields.');
});

test('checkout demo conditional billingAddress rule triggers required message', async () => {
  setupDom(`
    <form id="checkout-form">
      <label for="shipping-address">Shipping address</label>
      <input id="shipping-address" name="shippingAddress" required />

      <label>
        <input id="billing-toggle" name="useBilling" type="checkbox" />
        Billing address is different
      </label>

      <label for="billing-address">Billing address</label>
      <input id="billing-address" name="billingAddress" data-validate="billing-address" />

      <fieldset>
        <legend>Payment method</legend>
        <label><input name="paymentMethod" type="radio" value="card" required /> Card</label>
        <label><input name="paymentMethod" type="radio" value="invoice" required /> Invoice</label>
      </fieldset>
    </form>
  `);

  const form = document.getElementById('checkout-form') as HTMLFormElement;
  const validator = new A11yFormValidator(form, createDefaultPreset());

  validator.registerRule('billingAddress', ({ form, value }) => {
    const enabled = (form.querySelector('#billing-toggle') as HTMLInputElement).checked;
    return { valid: !enabled || String(value).trim() !== '', messageKey: 'required' };
  });

  (document.getElementById('billing-toggle') as HTMLInputElement).checked = true;
  const valid = await validator.validate({ reason: 'submit' });
  expect(valid).toBe(false);

  const billingInput = document.getElementById('billing-address') as HTMLInputElement;
  const error = document.getElementById('a11y-form-validator-error-checkout-form-billingAddress');
  expect(error).toBeTruthy();
  expect(billingInput.getAttribute('aria-invalid')).toBe('true');
  expect(error?.textContent).toMatch(/required/i);
});

test('remote validation demo async username availability rule', async () => {
  setupDom(`
    <form id="remote-form">
      <label for="username">Username</label>
      <input id="username" name="username" data-validate="available-username" />
    </form>
  `);

  const form = document.getElementById('remote-form') as HTMLFormElement;
  const validator = new A11yFormValidator(form, createDefaultPreset());

  const taken = new Set(['admin', 'editor']);
  validator.registerRule('availableUsername', async ({ value }) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { valid: !taken.has(String(value).trim().toLowerCase()), message: 'That username is already taken.' };
  });

  const input = document.getElementById('username') as HTMLInputElement;
  input.value = 'admin';

  const valid = await validator.validate({ reason: 'submit' });
  expect(valid).toBe(false);
  const error = document.getElementById('a11y-form-validator-error-remote-form-username');
  expect(error).toBeTruthy();
  expect(error?.textContent).toBe('That username is already taken.');
});
