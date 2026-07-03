# Manual QA Script

Use this script before making the repository public, enabling GitHub Pages, or publishing the package to npm. It does not replace automated checks.

## Scope

- In scope: package build output, npm tarball contents, local demo gallery, validation flows, keyboard/focus behavior, screen reader spot checks, responsive layout, privacy checks, and release sign-off.
- Out of scope: `npm publish`, git tags, pushes, merges, GitHub Pages deployment, and repository visibility changes.

## Setup

1. Run `npm ci`.
2. Run `npm run typecheck`.
3. Run `npm test`.
4. Run `npm run pages:build`.
5. Run `npm run pack:check`.
6. Serve `pages-dist` locally or open the generated files through a static server.

## Package Smoke Test

1. Inspect the `npm pack --dry-run` file list.
2. Confirm the package includes `dist`, `README.md`, `CHANGELOG.md`, `LICENSE`, and `package.json`.
3. Confirm generated demo artifacts, `node_modules`, local caches, and source-only test files are not included.
4. In a scratch consumer project, install the packed tarball.
5. Import the main entry, `/min`, `/docs`, `/styles.css`, `/addons/error-summary`, `/addons/character-count`, `/presets/default`, `/presets/no-summary`, `/presets/minimal`, and at least one `/locales/*.json` file.

## Demo Gallery

1. Open `pages-dist/index.html`.
2. Confirm the page loads without missing CSS or JavaScript.
3. Follow every demo link from the gallery.
4. Confirm README, GitHub repository, npm package, and documentation footer links use `A11y-Form-Validator`, `a11y-form-validator`, and MIT license text.
5. Confirm `pages-dist/404.html` and `pages-dist/.nojekyll` exist.

## Validation Flows

1. Basic demo: submit an empty form, confirm inline errors render, the summary receives focus, and summary links focus the matching controls.
2. Contact demo: confirm required, email, and minlength messages appear and clear after valid input.
3. CMS Markup demo: confirm data-attribute rules and field-specific messages override defaults.
4. Error Summary demo: confirm repeated messages remain meaningful because summary links include field labels.
5. Registration demo: enter different passwords and confirm the same-as rule message.
6. Login / Register demo: switch modes and confirm hidden forms are not validated.
7. Checkout demo: enable billing address and confirm conditional validation; confirm payment radio errors appear after the fieldset.
8. Remote Validation demo: test a taken username and an available username; confirm pending and final states do not conflict.
9. Server Errors demo: trigger server errors and confirm field and form-level errors appear in the summary.
10. Localization and Dynamic Locale demos: confirm Spanish messages load, English fallback still works, and runtime locale changes use destroy/reinitialize behavior.

## Accessibility Checks

1. Keyboard only: move through each demo with Tab and Shift+Tab.
2. Submit invalid forms with Enter where appropriate.
3. Confirm focus indicators are visible on links, buttons, inputs, summary regions, and summary links.
4. Confirm summary links are real links and move focus to the invalid control.
5. Confirm generated inline errors are connected with `aria-describedby` and `aria-errormessage` when inline rendering is active.
6. With a screen reader, spot check invalid submit, summary focus, summary link text, character count updates, server error rendering, and locale changes.
7. Confirm reduced motion mode does not use smooth scrolling or distracting transitions.
8. Confirm forced-colors mode keeps borders, focus, and error states perceivable.

## Responsive And Visual Checks

1. Check widths around 320px, 375px, 768px, 1024px, and desktop.
2. Check 200% browser zoom.
3. Confirm no form controls, summary links, footer links, or code samples overlap or clip important text.
4. Confirm error, success, pending, and focus states remain readable.
5. Confirm long labels, translated messages, and repeated errors wrap cleanly.

## Privacy And Security Checks

1. Confirm demos do not send real network requests.
2. Confirm the remote validation demo uses simulated local async behavior only.
3. Confirm demos do not write form data to `localStorage`, `sessionStorage`, cookies, analytics, or external services.
4. Search for secret-like values before release.
5. Confirm example passwords, tokens, and user details are sample content only.

## Human Release Sign-Off

1. Confirm all release-critical files are tracked and reviewed.
2. Confirm `dist`, `pages-dist`, `node_modules`, local caches, and tarballs are not staged.
3. Confirm package name, version, license, repository URLs, npm links, and Pages URL are correct.
4. Confirm CI passes on GitHub after pushing in a separate approved release step.
5. Confirm GitHub Pages source is set to GitHub Actions.
6. Confirm npm ownership, provenance, access, and trusted publishing decisions.
7. Stop if any build, test, package, accessibility, privacy, or manual QA blocker remains.
