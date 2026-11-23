# JSX conditional ternaries

`avandar/jsx-conditional-ternary` (AF-14) spells a proved boolean JSX child as a
ternary. `!ready && <Node />` becomes `(!ready) ? <Node /> : false`.

The exact `false` arm preserves the child value custom components observe.
The condition is evaluated once and the element is created only when true.
Comparisons retain their original coercion and order. Replacing an unknown
scalar condition with a null-arm ternary could discard `0` or an empty string,
so unknown conditions are unsupported.

The supported subset uses literal or identifier operands in a boolean negation
or comparison, within a top-level function declaration. Its right side must be
an attribute-free self-closing element. Calls, member reads, nested conditionals,
comments, fragments and arrow owners receive no repair. An edit also defers
when it would newly exceed the root 80-column line limit. Coverage proves only
`boolean-jsx-children` for JSX/TSX; `unsupported-shapes` remains fallback.
