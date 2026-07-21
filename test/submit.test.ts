import { afterEach, expect, test, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { A11yFormValidator, EVENTS } from '../src/index.js';

function setupDom(html: string): JSDOM {
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLFormElement: dom.window.HTMLFormElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLButtonElement: dom.window.HTMLButtonElement,
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  vi.restoreAllMocks();
  window?.close();
});

test('invalid synchronous submit is canceled immediately and blocked once', async () => {
  setupDom(`
    <form id="form">
      <input name="email" required />
      <button id="send" type="submit">Send</button>
    </form>
  `);
  const form = document.getElementById('form') as HTMLFormElement;
  const button = document.getElementById('send') as HTMLButtonElement;
  new A11yFormValidator(form);
  const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => undefined);
  const blocked = vi.fn();
  form.addEventListener(EVENTS.submitBlocked, blocked);

  const event = new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: button });
  const dispatched = form.dispatchEvent(event);

  expect(dispatched).toBe(false);
  expect(event.defaultPrevented).toBe(true);
  await flush();
  expect(blocked).toHaveBeenCalledTimes(1);
  expect(requestSubmit).not.toHaveBeenCalled();
});

test('invalid asynchronous submit is canceled before the rule settles', async () => {
  setupDom('<form id="form"><input name="code" data-validate="remote" /><button type="submit">Send</button></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const button = form.querySelector('button')!;
  const validator = new A11yFormValidator(form);
  const result = deferred<boolean>();
  validator.registerRule('remote', () => result.promise);
  const blocked = vi.fn();
  form.addEventListener(EVENTS.submitBlocked, blocked);

  const event = new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: button });
  form.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(blocked).not.toHaveBeenCalled();

  result.resolve(false);
  await flush();
  expect(blocked).toHaveBeenCalledTimes(1);
});

test('valid async submit emits ready, preserves submitter, and bypasses validation once', async () => {
  setupDom(`
    <form id="form">
      <input name="email" value="person@example.com" required />
      <button id="publish" type="submit" name="action" value="publish">Publish</button>
    </form>
  `);
  const form = document.getElementById('form') as HTMLFormElement;
  const button = document.getElementById('publish') as HTMLButtonElement;
  const validator = new A11yFormValidator(form);
  const validate = vi.spyOn(validator, 'validate');
  const externalStates: boolean[] = [];
  const readySubmitters: Array<HTMLElement | null> = [];
  const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation((submitter) => {
    form.dispatchEvent(new window.SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
      submitter: submitter || null
    }));
  });
  form.addEventListener('submit', (event) => externalStates.push(event.defaultPrevented));
  form.addEventListener(EVENTS.submitReady, (event) => {
    readySubmitters.push((event as CustomEvent).detail.submitter);
  });

  form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: button }));
  await flush();

  expect(validate).toHaveBeenCalledTimes(1);
  expect(requestSubmit).toHaveBeenCalledTimes(1);
  expect(requestSubmit).toHaveBeenCalledWith(button);
  expect(readySubmitters).toEqual([button]);
  expect(externalStates).toEqual([true, false]);
});

test('rapid submits coalesce and the latest submitter wins', async () => {
  setupDom(`
    <form id="form">
      <input name="code" data-validate="remote" />
      <button id="draft" type="submit" name="action" value="draft">Save draft</button>
      <button id="publish" type="submit" name="action" value="publish">Publish</button>
    </form>
  `);
  const form = document.getElementById('form') as HTMLFormElement;
  const draft = document.getElementById('draft') as HTMLButtonElement;
  const publish = document.getElementById('publish') as HTMLButtonElement;
  const validator = new A11yFormValidator(form);
  const validation = deferred<boolean>();
  let ruleRuns = 0;
  validator.registerRule('remote', () => {
    ruleRuns += 1;
    return validation.promise;
  });
  const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation((submitter) => {
    form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: submitter || null }));
  });

  form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: draft }));
  form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: publish }));
  validation.resolve(true);
  await flush();

  expect(ruleRuns).toBe(1);
  expect(requestSubmit).toHaveBeenCalledTimes(1);
  expect(requestSubmit).toHaveBeenCalledWith(publish);
});

test('input during pending submit invalidates the stale batch and validates current values again', async () => {
  setupDom('<form id="form"><input id="code" name="code" data-validate="remote" /><button type="submit">Send</button></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const input = document.getElementById('code') as HTMLInputElement;
  const button = form.querySelector('button')!;
  const validator = new A11yFormValidator(form);
  const runs: Array<ReturnType<typeof deferred<boolean>>> = [];
  validator.registerRule('remote', () => {
    const run = deferred<boolean>();
    runs.push(run);
    return run.promise;
  });
  const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation((submitter) => {
    form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: submitter || null }));
  });

  form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: button }));
  input.value = 'new-value';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  runs[0]!.resolve(true);
  await flush();
  expect(runs).toHaveLength(2);
  runs[1]!.resolve(true);
  await flush();

  expect(requestSubmit).toHaveBeenCalledTimes(1);
});

test('submit without submitter uses requestSubmit with no argument', async () => {
  setupDom('<form id="form"><input name="email" value="person@example.com" required /></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  new A11yFormValidator(form);
  const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {
    form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true }));
  });

  form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true }));
  await flush();

  expect(requestSubmit).toHaveBeenCalledWith();
});

test('disabled or non-submit validation leaves native submit untouched', () => {
  setupDom('<form id="form"><input name="email" required /></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const validator = new A11yFormValidator(form);
  validator.disable();
  const disabledEvent = new window.SubmitEvent('submit', { bubbles: true, cancelable: true });
  expect(form.dispatchEvent(disabledEvent)).toBe(true);
  expect(disabledEvent.defaultPrevented).toBe(false);

  validator.destroy();
  new A11yFormValidator(form, { validateOn: ['blur'] });
  const blurOnlyEvent = new window.SubmitEvent('submit', { bubbles: true, cancelable: true });
  expect(form.dispatchEvent(blurOnlyEvent)).toBe(true);
  expect(blurOnlyEvent.defaultPrevented).toBe(false);
});

test('thrown submit validation is blocked and exposes validation-error without leaving pending state', async () => {
  setupDom('<form id="form"><input name="code" data-validate="remote" /><input name="slow" data-validate="slow" /><button type="submit">Send</button></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const validator = new A11yFormValidator(form);
  const slowValidation = deferred<boolean>();
  validator.registerRule('remote', async () => {
    throw new Error('Remote failure');
  });
  validator.registerRule('slow', () => slowValidation.promise);
  const causes: string[] = [];
  const slowTerminalEvents: string[] = [];
  form.addEventListener(EVENTS.submitBlocked, (event) => causes.push((event as CustomEvent).detail.cause));
  form.addEventListener(EVENTS.fieldValid, (event) => {
    if ((event as CustomEvent).detail.fieldName === 'slow') slowTerminalEvents.push(EVENTS.fieldValid);
  });
  form.addEventListener(EVENTS.fieldInvalid, (event) => {
    if ((event as CustomEvent).detail.fieldName === 'slow') slowTerminalEvents.push(EVENTS.fieldInvalid);
  });

  form.dispatchEvent(new window.SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter: form.querySelector('button')
  }));
  await flush();

  expect(causes).toEqual(['validation-error']);
  expect(validator.getState().fields.code?.pending).toBe(false);
  expect(validator.getState().fields.slow?.pending).toBe(false);
  expect(validator.getState().form).toBe('idle');

  slowValidation.resolve(false);
  await flush();
  expect(slowTerminalEvents).toEqual([]);
});

test('resubmit errors are observed and form.submit is never used', async () => {
  setupDom('<form id="form"><input name="email" value="person@example.com" required /><button type="submit">Send</button></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const button = form.querySelector('button')!;
  new A11yFormValidator(form);
  const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {
    throw new DOMException('Submitter is no longer owned by this form.', 'NotFoundError');
  });
  const submit = vi.spyOn(form, 'submit').mockImplementation(() => undefined);
  const causes: string[] = [];
  form.addEventListener(EVENTS.submitBlocked, (event) => causes.push((event as CustomEvent).detail.cause));

  form.dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: button }));
  await flush();

  expect(requestSubmit).toHaveBeenCalledWith(button);
  expect(causes).toEqual(['resubmit-error']);
  expect(submit).not.toHaveBeenCalled();
});

test('destroy during pending validation prevents late resubmission', async () => {
  setupDom('<form id="form"><input name="code" data-validate="remote" /><button type="submit">Send</button></form>');
  const form = document.getElementById('form') as HTMLFormElement;
  const validator = new A11yFormValidator(form);
  const validation = deferred<boolean>();
  validator.registerRule('remote', () => validation.promise);
  const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => undefined);

  form.dispatchEvent(new window.SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter: form.querySelector('button')
  }));
  validator.destroy();
  validation.resolve(true);
  await flush();

  expect(requestSubmit).not.toHaveBeenCalled();
});
