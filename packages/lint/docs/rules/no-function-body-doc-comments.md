# avlint-common-001: Ordinary function-body comments

Engine rule: `avandar/function-body-line-comments`.

Converts standalone whole-line prose blocks inside JavaScript-family function bodies into ordinary line comments. Nested declaration documentation, inline blocks, tagged comments, and directives remain unchanged.

Ordinary `oxlint --fix .` performs only safe repairs. Unsupported shapes have
explicit fallback coverage; a supported seed never proves the whole AF rule.
See [the umbrella reference](../../README.md#comment-and-documentation-safe-fixes)
for interactions and coverage limits.
