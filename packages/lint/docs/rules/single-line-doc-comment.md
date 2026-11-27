# avlint-common-002: Short JSDoc

Engine rule: `avandar/single-line-short-jsdoc`.

Collapses plain tag-free starred JSDoc only when its complete line fits 80 columns, including indentation with a two-column tab width. Paragraphs, lists, code blocks, hard breaks, tags, and nonstandard shapes remain unchanged.

Ordinary `oxlint --fix .` performs only safe repairs. Unsupported shapes have
explicit fallback coverage; a supported seed never proves the whole AF rule.
See [the umbrella reference](../../README.md#comment-and-documentation-safe-fixes)
for interactions and coverage limits.
