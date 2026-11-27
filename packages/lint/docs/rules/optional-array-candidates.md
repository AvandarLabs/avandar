# Optional array candidates

`avandar/optional-array-candidates` (AF-17) replaces an empty array that is
filled through consecutive exact undefined guards with the shortest equivalent
return, and removes the declaration.

One candidate becomes a ternary, so no helper is needed:

```ts
export function build(first: number | undefined): number[] {
  return first !== undefined ? [first] : [];
}
```

Several candidates become one literal filtered by the public `isDefined`
helper:

```ts
import { isDefined } from "@avandar/utils";

export function build(
  first: number | undefined,
  second: number | undefined,
): number[] {
  return [first, second].filter(isDefined);
}
```

The supported input has the empty array declaration, multiline
`if (first !== undefined) { values.push(first); }` guards, and a direct
`return values`. Both forms exclude only `undefined`. They keep `null`, false,
zero, empty strings, order and repeated candidates.

Automatic repair is limited to TS/TSX with explicit ordinary `T[]` or `Array<T>`
annotations. Element types must be primitive keywords, primitive literal types,
or unions of those, excluding undefined, any, unknown, aliases and generics.
Because the fix removes the annotation, the function must either declare its
return type, or its candidate types without `undefined` must exactly match the
element type. Otherwise a narrower candidate type would narrow the inferred
return type, so the shape stays in fallback. Any resolved source binding named
`Array` leaves both annotation forms in fallback. Parameter types use the same
primitive/literal boundary and may include undefined. Defaults, rest syntax and
destructuring are unsupported. Evolving unannotated arrays and all JavaScript
candidates remain fallback.

Several candidates require an already resolved named or namespace `isDefined`
binding from an original leading runtime utils import. Missing helpers receive
no diagnostic or partial import mutation. Import scope, type-only and
self-import boundaries follow
[property helper callbacks](property-helper-callbacks.md).

Guard bodies must start on a following line. `undefined` must be unshadowed.
Aliases, member reads, unknown calls, comments, truthiness/null checks,
branches, interleaved effects and early returns receive no repair. As with
AF-16, removing the declaration drops an overlapping native fix on it for one
pass. Long return expressions wrap to fit the root line limit. Coverage proves
`optional-parameter-candidates` with a several-candidate seed, so the proof
still requires the helper context. `unsupported-shapes` always remains
fallback.
