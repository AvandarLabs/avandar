# AF-11: Exported module key documentation

Engine rule: `avandar/export-key-jsdoc`.

Moves plain existing JSDoc from a non-exported top-level function or single const binding to its one statically named key in a directly exported untyped TypeScript object. Exactly one reference is required. Annotations, assertions, spreads, computed or duplicate keys, intervening comments, and ambiguous ownership remain unchanged.

Ordinary `oxlint --fix .` performs only safe repairs. Unsupported shapes have
explicit fallback coverage; a supported seed never proves the whole AF rule.
See [the umbrella reference](../../README.md#comment-and-documentation-safe-fixes)
for interactions and coverage limits.
