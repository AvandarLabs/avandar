# Local E2e casing

`avandar/local-e2e-casing` (AF-13) follows the canonical checklist's PascalCase
`E2e` spelling within a private binding, such as `myE2eCount`. Lowercase `e2e`,
uppercase constants, environment keys and external strings stay unchanged.

Only module-private `const` primitives after an import/export marker with
immediate plain reads are repaired. Later markers cannot establish this boundary.
A declaration is followed by its sole expression statement consumer, or owns
the first statement of a two-statement exported function whose return contains
all reads. Both declarations and references come from the engine scope graph.
Only primitive keyword annotations are supported.

Exports, scripts, function or object names, writes, aliases, computed or
shorthand keys, reflective or string contracts, collisions and interleaved
repairs receive no fix. Coverage proves `local-primitive-bindings`, while
`unsupported-shapes` remains fallback.
