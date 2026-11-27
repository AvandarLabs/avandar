# Straight-line object construction

`avandar/straight-line-object-construction` (avlint-ts-013) folds consecutive
primitive writes to a fresh local object into one returned literal, and removes
the declaration.

```ts
// Before
export function build(): { count: number; ready: boolean } {
  const result = { count: 0, ready: false };
  result.count = 2;
  return result;
}

// After
export function build(): { count: number; ready: boolean } {
  return { count: 2, ready: false };
}
```

Each write replaces its key's value in place, so the original key order is
kept. Writes may target existing own data properties, or add identifier keys
to a literal with `__proto__: null`. New keys follow the original ones in write
order, and the null prototype stays: `{ __proto__: null, count: 2 }`.
An empty ordinary object is unsupported because assignment might invoke an
inherited setter. Annotated bindings are unsupported because removing the
annotation can change an inferred public return contract.

Only synchronous ordinary function declarations with exactly the declaration,
assignments and return qualify. Initial data and assigned values are primitive
constants. Scope proves no other references or binding writes. Property order,
ordinary data descriptors and the null prototype are preserved.

The fix removes the declaration, so a native fix on that declaration (such as
`prefer-const`) overlaps it and is dropped in the same pass. That diagnostic is
reported once and disappears on the next run, because the declaration no longer
exists. Comments, aliases, computed keys, getters, methods, duplicate writes,
branches, unknown calls, interleaved statements and early returns receive no
repair. Long returns wrap within the root line limit. Coverage proves
`fresh-data-object`; `unsupported-shapes` remains fallback.
