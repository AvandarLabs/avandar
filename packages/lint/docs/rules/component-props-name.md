# Component props name

`avandar/component-props-name` (avlint-ts-010) safely renames a private TSX object
alias after an import/export module marker to `Props`. The alias must immediately precede the sole declaration-based
component and have exactly one scope-resolved reference, in its only parameter. All JSX must belong to that component function.

Script globals, later module markers, other JSX owners, exports, shared references, existing or captured `Props` bindings, interfaces,
generics, arrays, comments in the rename span and nonadjacent declarations are
unsupported. They receive no repair. This keeps ordinary native and comment
fixes disjoint from the rename envelope. Coverage proves only
`single-component-props`; `unsupported-shapes` remains fallback.
