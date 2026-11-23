# Straight-line object construction

`avandar/straight-line-object-construction` (AF-16) replaces consecutive
primitive writes with a final spread-based return, retaining the original
fresh local declaration.

```ts
export function build(): { count: number } {
  const result = { count: 0 };
  return { ...result, count: 2 };
}
```

The supported input has the same declaration, `result.count = 2`, and a direct
`return result`. Writes may target existing own data properties, or add
identifier keys to a literal with `__proto__: null`. Its return explicitly
retains the null prototype: `{ __proto__: null, ...result, count: 2 }`.
An empty ordinary object is unsupported because assignment might invoke an
inherited setter. Annotated collection bindings are unsupported because a
spread override can change an inferred public return contract.

Only synchronous ordinary function declarations with exactly the declaration,
assignments and return qualify. Initial data and assigned values are primitive
constants. Scope proves no other references or binding writes. Property order,
ordinary data descriptors and the null prototype are preserved. The extra
allocation is unobservable because the original object cannot escape.

`const`, `let` and `var` share the same proof and output. All custom fix ranges
are strictly after the declaration, so native whole-declaration normalization
can compose in one pass. Comments, aliases, computed keys, getters, methods,
duplicate writes, branches, unknown calls, interleaved statements and early
returns receive no repair. Long returns wrap within the root line limit.
Coverage proves `fresh-data-object`; `unsupported-shapes` remains fallback.
