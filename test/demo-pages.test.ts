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

test('conditional fields demo ignores hidden required fields and validates them when visible', async () => {
  setupDom(`
    <form id="conditional-fields-form">
      <label for="requester-email">Requester email</label>
      <input id="requester-email" name="requesterEmail" type="email" required />

      <label for="workspace-slug">Workspace URL slug</label>
      <input id="workspace-slug" name="workspaceSlug" required />

      <label for="plan-type">Plan type</label>
      <select id="plan-type" name="planType" required>
        <option value="">Choose a plan</option>
        <option value="pilot">Pilot</option>
        <option value="enterprise">Enterprise</option>
      </select>

      <section id="enterprise-billing" hidden>
        <label for="billing-contact">Billing contact email</label>
        <input id="billing-contact" name="billingContact" type="email" data-required-when-visible disabled />

        <label for="purchase-order">Purchase order</label>
        <input id="purchase-order" name="purchaseOrder" data-required-when-visible disabled />
      </section>
    </form>
  `);

  const form = document.getElementById('conditional-fields-form') as HTMLFormElement;
  const validator = new A11yFormValidator(form, createDefaultPreset());
  const section = document.getElementById('enterprise-billing') as HTMLElement;
  const billingContact = document.getElementById('billing-contact') as HTMLInputElement;
  const purchaseOrder = document.getElementById('purchase-order') as HTMLInputElement;

  function setEnterpriseVisible(visible: boolean): void {
    section.hidden = !visible;
    for (const control of [billingContact, purchaseOrder]) {
      control.disabled = !visible;
      control.required = visible;
    }
    validator.refresh();
  }

  (document.getElementById('requester-email') as HTMLInputElement).value = 'access@example.com';
  (document.getElementById('workspace-slug') as HTMLInputElement).value = 'customer-success';
  (document.getElementById('plan-type') as HTMLSelectElement).value = 'pilot';

  setEnterpriseVisible(false);
  expect(await validator.validate({ reason: 'submit' })).toBe(true);

  (document.getElementById('plan-type') as HTMLSelectElement).value = 'enterprise';
  setEnterpriseVisible(true);
  expect(await validator.validate({ reason: 'submit' })).toBe(false);
  expect(document.getElementById('a11y-form-validator-error-conditional-fields-form-billingContact')).toBeTruthy();

  billingContact.value = 'billing@example.com';
  purchaseOrder.value = 'PO-4821';
  expect(await validator.validate({ reason: 'submit' })).toBe(true);

  billingContact.value = '';
  purchaseOrder.value = '';
  setEnterpriseVisible(false);
  expect(await validator.validate({ reason: 'submit' })).toBe(true);
  expect(document.getElementById('a11y-form-validator-error-conditional-fields-form-billingContact')).toBeNull();
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
