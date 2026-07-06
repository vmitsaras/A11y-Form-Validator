# Changesets

This folder stores release intent files used by `@changesets/cli`.

For package changes, run `npm run changeset` and commit the generated Markdown file.
When preparing a release, run `npm run version-packages` to apply pending changesets to
`package.json` and `CHANGELOG.md`, then run the release checks before publishing.
