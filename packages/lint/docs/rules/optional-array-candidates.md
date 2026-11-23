# Optional array candidates

`avandar/optional-array-candidates` (AF-17) replaces consecutive exact undefined
guards with an ordered candidate array at the final return. The original empty
array declaration remains in place and meaningfully used.

```ts
import { isDefined } from "@avandar/utils";

export function build(first: number | undefined): number[] {
  const values: number[] = [];
  return [...values, first].filter(isDefined);
}
```

The supported input has the same declaration, multiline
`if (first !== undefined) { values.push(first); }` guards, and a direct
`return values`. The actual public helper excludes only `undefined`. It keeps
`null`, false, zero, empty strings, order and repeated candidates. Spreading the
fresh empty local does not flatten candidate values. The additional allocation
is unobservable because the original array has no other references or writes.

Automatic repair is limited to TS/TSX with explicit ordinary `T[]` or `Array<T>`
annotations. Element types must be primitive keywords, primitive literal types,
or unions of those, excluding undefined, any, unknown, aliases and generics.
Parameter types use the same primitive/literal boundary and may include
undefined. Defaults, rest syntax and destructuring are unsupported. Evolving
unannotated arrays and all JavaScript candidates remain fallback. The fixer
never synthesizes an annotation or changes a declaration keyword.

An already resolved named or namespace `isDefined` binding from an original
leading runtime utils import is required. Missing helpers receive no diagnostic
or partial import mutation. Import scope, type-only and self-import boundaries
follow [property helper callbacks](property-helper-callbacks.md).

Guard bodies must start on a following line. Native brace insertion leaves its
new inline body outside that boundary. `undefined` must be unshadowed. Aliases,
member reads, unknown calls, comments, truthiness/null checks, branches,
interleaved effects and early returns receive no repair.

All custom edits follow the declaration, allowing native keyword and array-type
repairs to compose in one pass. Long return expressions wrap to fit the root
line limit. The supported capability assumes ordinary unmodified built-in
Array iterator and filter operations. Patched prototypes or custom iterators
are unsupported and require fallback review. Coverage proves
`optional-parameter-candidates` only for the typed source and original helper
context. `unsupported-shapes` always remains fallback.
