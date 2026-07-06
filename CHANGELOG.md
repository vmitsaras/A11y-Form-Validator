# Changelog

## 1.0.18

### Patch Changes

- Added conditional fields

## 1.0.0 - 2026-07-03

### Added

- Initial MIT-licensed release of A11y Form Validator.
- Core TypeScript form validator with native constraint support, custom rules, async validation, server errors, lifecycle events, and cleanup.
- Optional error summary and character count addons, default/no-summary/minimal presets, CSS, and opt-in locale JSON files.
- Static demo gallery and GitHub Pages workflow that builds and uploads `pages-dist`.

### Changed

- Normalized the package/import name to `a11y-form-validator`.
- Updated repository, issue, npm, and demo links for `https://github.com/vmitsaras/A11y-Form-Validator`.

### Verification

- Release checks should run `npm ci`, `npm run typecheck`, `npm test`, `npm run pages:build`, and `npm run pack:check` before publishing.
