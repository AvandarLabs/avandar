# Property helper callbacks

`avandar/property-helper-callbacks` (avlint-ts-012) replaces exact callbacks on literal
arrays of plain data objects with the public `prop` and `propEq` helpers.

| Input | Repair |
| --- | --- |
| `[{ id: 1 }].map(function(row) { return row.id; })` | `[{ id: 1 }].map(prop("id"))` |
| `[{ id: 1 }].filter(function(row) { return row.id === 1; })` | `[{ id: 1 }].filter(propEq("id", 1))` |

The receiver must be a nonempty literal array whose rows contain only unique
identifier keys and primitive constant values. Each row must own the selected
key. The anonymous ordinary function must have one untyped parameter and one
return statement. Strict equality accepts only a non-null primitive constant
on its right. This preserves equality semantics and prevents moving a mutable
capture from callback execution into helper creation. Null and undefined
comparisons remain fallback because replacing an inferred type predicate with
the boolean helper can broaden the result type. Computed keys, dotted paths,
getters, spreads, optional access, arrows, callback parameter/return annotations,
generics, extra statements and unknown array receivers receive no repair.

Helper bindings require a leading original runtime `@avandar/utils` import.
Existing named aliases and namespace bindings are reused only when scope proves
they remain visible. New names must not capture any existing token or unresolved
reference. A missing name can merge into a named import or replace an existing
side-effect import at its original position. The utility refuses default-only
imports, comments in edited imports, type-only uses, scripts, and self-imports
inside the utility package. A file with multiple collection sites needs existing
helper bindings, preventing conflicting import fixes. Already repaired `map`
and `filter` calls remain part of this stable boundary.

The native proof records `literal-property-map` and
`literal-property-equality` independently, using distinct diagnostic seed spans.
Seeds add no imports or module markers. Combined seeds can leave a missing
helper in fallback even where one isolated source site could safely insert it.
`unsupported-shapes` always remains fallback.
