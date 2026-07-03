# A11y Form Validator

Accessible, dependency-light progressive enhancement for semantic HTML forms.

A11y Form Validator is a progressive enhancement plugin for forms that already use real labels, inputs, selects, textareas, checkboxes, radios, and fieldsets. It reads native validation attributes, supports custom and async rules, applies server errors, renders accessible inline messages, can add a focusable error summary and character counts, supports opt-in locale packs, and cleans up generated DOM when destroyed.

## Installation

```bash
npm install a11y-form-validator
pnpm add a11y-form-validator
yarn add a11y-form-validator
```

## Usage

```ts
import {
  createDefaultPreset,
  createFormValidator
} from "a11y-form-validator";
import "a11y-form-validator/styles.css";

const form = document.querySelector("[data-a11y-form-validator]");

if (form instanceof HTMLFormElement) {
  createFormValidator(form, createDefaultPreset());
}
```

`createDefaultPreset()` includes the error summary addon. Use `createNoSummaryPreset()` when you want the same submit-and-blur validation pattern without summary UI.

`new A11yFormValidator(form, options)` is also supported for existing integrations. Duplicate initialization of the same form returns the existing instance.

## Which build should I use?

### Bundler usage

Use the normal package entry when using a bundler such as Vite, Astro, Rollup, Webpack, or similar.

```js
import {
  createDefaultPreset,
  createFormValidator
} from "a11y-form-validator";
import "a11y-form-validator/styles.css";
```

This gives your bundler the readable ESM build. Your app build process can tree-shake and minify it for production.

### Direct browser usage

Use the minified build when importing directly in a browser from a built file or CDN-style setup.

```html
<script type="module">
  import {
    createDefaultPreset,
    createFormValidator
  } from "./dist/index.min.js";

  const form = document.querySelector("[data-a11y-form-validator]");

  if (form instanceof HTMLFormElement) {
    createFormValidator(form, createDefaultPreset());
  }
</script>
```

For npm subpath usage:

```js
import {
  createDefaultPreset,
  createFormValidator
} from "a11y-form-validator/min";
```

Rule of thumb:

```txt
Using a bundler? Use the normal import.
Using the file directly on a site? Use the minified file.
```

### Build output

`npm run build:dist` writes both browser-ready ESM files:

- `dist/index.js` and `dist/index.js.map` - readable, source-mapped default package entry.
- `dist/index.min.js` and `dist/index.min.js.map` - optional minified entry for direct browser or CDN-style imports.

Both entries use `dist/index.d.ts` for types. The package `"."` export stays on `dist/index.js`; only the `./min` subpath points to `dist/index.min.js`.

## CSS

Import the default styles when you want the provided error, summary, focus, and character count presentation:

```ts
import "a11y-form-validator/styles.css";
```

The main block class is `.a11y-form-validator`. Public custom properties include:

- `--a11y-form-validator-error-color`
- `--a11y-form-validator-border-color`
- `--a11y-form-validator-focus-color`
- `--a11y-form-validator-success-color`
- `--a11y-form-validator-pending-color`
- `--a11y-form-validator-error-shadow`
- `--a11y-form-validator-gap`
- `--a11y-form-validator-radius`
- `--a11y-form-validator-font-size`
- `--a11y-form-validator-summary-background`
- `--a11y-form-validator-character-count-color`

State classes such as `.is-valid`, `.is-invalid`, `.is-pending`, `.is-touched`, `.is-dirty`, and `.is-disabled` are applied to controls. Reduced motion is respected for plugin scroll behavior.

## HTML Structure

Use normal form markup with labels. Each field needs a `name` or `id`.

```html
<form data-a11y-form-validator>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required />

  <label for="message">Message</label>
  <textarea id="message" name="message" required minlength="10" maxlength="180" data-character-count></textarea>

  <fieldset>
    <legend>Preferred reply method</legend>
    <label><input name="replyMethod" type="radio" value="email" required /> Email</label>
    <label><input name="replyMethod" type="radio" value="phone" required /> Phone</label>
  </fieldset>

  <button type="submit">Send</button>
</form>
```

Supported native rules include `required`, `type="email"`, `minlength`, `maxlength`, `pattern`, required checkbox, radio groups, and checkbox groups.

Data attributes can add rules and messages:

```html
<input
  name="username"
  required
  data-validate="min-length:3 pattern:^[a-z0-9_]+$"
  data-message-required="Choose a username."
/>
```

## API

### `createFormValidator(form, options)`

Initializes a form and returns an `A11yFormValidatorInstance`.

```ts
import { createErrorSummaryAddon } from "a11y-form-validator/addons/error-summary";
import { createCharacterCountAddon } from "a11y-form-validator/addons/character-count";

const validator = createFormValidator(form, {
  validateOn: ["submit", "blur", "input"],
  focusOnError: "summary",
  errorMode: "both",
  addons: [createErrorSummaryAddon(), createCharacterCountAddon()]
});
```

### `initFormValidators(options, root)`

Initializes every form matching `[data-a11y-form-validator]` under `root`.

```ts
import { createDefaultPreset } from "a11y-form-validator/presets/default";

const validators = initFormValidators(createDefaultPreset());
```

### Options

| Option | Default | Description |
| --- | --- | --- |
| `validateOn` | `["submit"]` | Events that trigger validation: `submit`, `blur`, `input`, `change`. |
| `focusOnError` | `"summary"` | Use `"summary"`, `"first-invalid"`, or `false`. |
| `errorMode` | `"inline"` | Use `"inline"`, `"native"`, or `"both"`. |
| `useNativeRules` | `true` | Reads native HTML validation attributes. |
| `disableNativeUI` | `true` | Adds `novalidate` unless native-only mode is used. |
| `validateHidden` | `false` | Validates hidden fields when true. |
| `ignore.disabled` | `true` | Skips disabled fields. |
| `ignore.hidden` | `true` | Skips hidden fields unless `validateHidden` is true. |
| `ignore.selector` | `""` | Skips matching controls. |
| `debounce` | `150` | Debounce delay for input validation. |
| `messages` | `{}` | Global, field-specific, or function messages. |
| `locales` | `{}` | Locale message packs keyed by locale code. |
| `locale` | `""` | Explicit locale; falls back to form/document language and English. |
| `selectors.fields` | `"input, select, textarea"` | Field selector used by `refresh()`. |
| `addons` | `[]` | Addon objects imported from addon or preset subpaths. |
| `renderer` | `null` | Custom renderer implementing `render()`, `clear()`, and optional `destroy()`. |
| `rules` | `{}` | Field-specific rule configuration keyed by field `name` or `id`. |

### Instance Methods

- `validate(options?)`
- `validateField(fieldOrNameOrElement, options?)`
- `refresh()`
- `reset()`
- `clearErrors()`
- `setErrors(errors)`
- `getErrors()`
- `getState()`
- `enable()`
- `disable()`
- `focusOnError()`
- `destroy()`
- `registerRule(name, rule)`
- `unregisterRule(name)`

Server errors can be applied with either a field map or explicit `fields`/`form` keys:

```ts
validator.setErrors({
  fields: {
    email: "This email is already registered."
  },
  form: "Your session expired. Reload the page and try again."
});
```

### Presets And Addons

Preset helpers are available from the main entry and from explicit subpaths. Use explicit subpaths when you want narrower imports:

```ts
import { createDefaultPreset } from "a11y-form-validator/presets/default";
import { createNoSummaryPreset } from "a11y-form-validator/presets/no-summary";
import { createMinimalPreset } from "a11y-form-validator/presets/minimal";
```

`createDefaultPreset()` validates on submit and blur, uses inline and native messages, imports and installs the error summary addon, and focuses the summary after blocked submits. Because it imports the summary addon, choose it only when you want summary UI.

`createNoSummaryPreset()` keeps the same submit and blur validation cadence, inline and native messages, native rule reading, and native UI suppression as the default preset, but it installs no addons and focuses the first invalid field.

`createMinimalPreset()` validates on submit and focuses the first invalid field.

The error summary addon prepends a focusable, labelled summary with field-labelled links to invalid fields and plain-text form-level errors. The character count addon adds a polite live region for controls with `maxlength`, `minlength`, or `data-character-count`.

```ts
import { createNoSummaryPreset } from "a11y-form-validator/presets/no-summary";
import { createErrorSummaryAddon } from "a11y-form-validator/addons/error-summary";
import { createCharacterCountAddon } from "a11y-form-validator/addons/character-count";

const preset = createNoSummaryPreset();
createFormValidator(form, {
  ...preset,
  focusOnError: "summary",
  addons: [createErrorSummaryAddon(), createCharacterCountAddon()]
});
```

### Localization

English messages are bundled as the default fallback. Other locale packs are published as opt-in JSON files so they do not increase the main bundle.

```ts
import { createDefaultPreset } from "a11y-form-validator/presets/default";
import esMessages from "a11y-form-validator/locales/es.json" with { type: "json" };

createFormValidator(form, {
  ...createDefaultPreset(),
  locale: "es",
  locales: {
    es: esMessages
  }
});
```

You can also provide inline locale messages during initialization:

```ts
createFormValidator(form, {
  locale: "product",
  locales: {
    product: {
      required: "{fieldLabel} is required before you continue."
    }
  }
});
```

Configured locale lookup uses the explicit `locale`, then the form or document language, then English fallback. Field-level `data-message-*` and `messages.fields` entries still override locale packs. Use `summaryItem` to customize how summary links combine field labels and messages; the default is `{fieldLabel}: {message}`.

## Events

Events bubble from the form. Event detail includes both `instance` and `validator` for compatibility.

| Event | Notes |
| --- | --- |
| `a11y-form-validator:init` | Fired after fields, listeners, and addons are installed. |
| `a11y-form-validator:before-validate` | Fired before form validation. |
| `a11y-form-validator:after-validate` | Fired after validation with `valid` and `errors`. |
| `a11y-form-validator:field-valid` | Fired when a field validates successfully. |
| `a11y-form-validator:field-invalid` | Fired with `field`, `message`, and `reason`. |
| `a11y-form-validator:form-valid` | Fired when the form is valid. |
| `a11y-form-validator:form-invalid` | Fired when the form is invalid. |
| `a11y-form-validator:submit-blocked` | Fired after a submit is prevented. |
| `a11y-form-validator:destroy` | Fired after cleanup. |

## Accessibility Notes

- The plugin keeps native form controls and labels in place.
- Inline errors are connected with `aria-describedby` and `aria-errormessage`.
- Generated inline errors use a polite live region for field-level validation.
- During blocked submits that focus the error summary, generated inline errors stay associated with fields but do not create competing live-region announcements.
- The summary addon creates a focusable, labelled error summary with field-labelled links to invalid fields and plain-text form-level errors.
- Focus moves to the summary or first invalid field after a blocked submit, depending on `focusOnError`.
- When applying server errors with `setErrors()`, call `focusOnError()` if the error summary or first invalid field should be announced immediately.
- Existing `aria-describedby` values are preserved and restored when errors clear or the plugin is destroyed.
- Radio groups and checkbox groups are treated as grouped fields when they share a `name`.
- Keyboard behavior remains native: Tab moves through controls and summary links; Enter submits forms or activates links; Space toggles checkboxes and radio buttons.

Still test customized forms with your target browsers and assistive technologies.

## Limitations

- The plugin validates controls collected by `selectors.fields`; custom widgets need custom rules or a custom renderer.
- Remote validation is supported through async custom rules, but request cancellation is the application’s responsibility. Pending state is exposed through state, events, and `.is-pending`; add an application live status such as "Checking..." when users need progress announcements.
- The default CSS is intentionally minimal and may need product-specific layout styles.
- Native browser validation messages vary by browser and locale when `errorMode` includes native behavior.

## Examples

Interactive demos are published on GitHub Pages:

- [Demo gallery](https://vmitsaras.github.io/A11y-Form-Validator/)

Repository demo source is also available on GitHub:

- [Basic demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/basic.html) - default preset, inline errors, summary links, grouped choices, and character count guidance.
- [Direct browser minified build demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/minified.html) - imports the optional `dist/index.min.js` entry directly.
- [Contact Form demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/contact.html) - minimal preset with native required, email, and minlength checks.
- [CMS Markup demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/cms-markup.html) - data-attribute rules and field-specific messages.
- [Error Summary demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/error-summary.html) - focusable summary region with links back to invalid fields.
- [Registration demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/registration.html) - password confirmation with a custom `same-as` rule.
- [Login / Register demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/login-register.html) - switch between auth forms while only the visible form is active and validated.
- [Checkout demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/checkout.html) - conditional billing validation and grouped payment choices.
- [Remote Validation demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/remote-validation.html) - async username availability checks and pending state review.
- [Server Errors demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/server-errors.html) - backend field and form errors rendered with `setErrors()`.
- [Localization demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/localization.html) - English fallback, imported locale JSON, and inline locale messages.
- [Dynamic Locale demo](https://github.com/vmitsaras/A11y-Form-Validator/blob/main/demo/dynamic-locale.html) - destroy and reinitialize the validator to change runtime error language.
- [Demo gallery](https://github.com/vmitsaras/A11y-Form-Validator/tree/main/demo)

Build the package with `npm run build` before opening local example or demo pages, because they import from `dist`. Most demos use the readable `dist/index.js`; the direct browser minified build demo uses `dist/index.min.js`.

Build the GitHub Pages artifact with `npm run pages:build`. The generated static site is written to `pages-dist/` for the Pages workflow.

## Docs Metadata

```ts
import { docs } from "a11y-form-validator/docs";
```

This `docs` subpath is a package export, not a source folder. The metadata lives in `src/docs.ts` and is built to `dist/docs.js` and `dist/docs.d.ts`.

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run pages:build
npm run pack:check
```

The repository also includes `MANUAL_QA.md` for final browser, accessibility, privacy, package, and human sign-off checks.

Do not run publish, push, tag, or release commands unless you intend to perform a release.
