# Top-level function declarations

`avandar/top-level-function-declarations` safely replaces a private top-level
`const` function with a declaration when scope analysis proves that all uses
are direct calls after initialization in the same module activation.

Supported initializers are anonymous ordinary function expressions and block
arrows other than single-return blocks. Parameters and return annotations are
preserved. Named expressions, async functions, generators, generic signatures,
typed bindings, multi-binding declarations, exports, recursion, indirect calls,
constructors, identity escapes, and lexical bindings remain unchanged.

Concise arrows and single-return arrow blocks are left to the existing
arrow-body rule. Functions containing nested functions, comments, control flow,
local declarations, string literals, assertions, or other competing repair
syntax are refused. This stable boundary prevents a native repair from exposing
a new conversion on the next ordinary fix pass.

The `direct-top-level-calls` coverage capability is proved by a canonical
error from the real engine using the reviewed file's configuration. Every file
also retains `unsupported-shapes` fallback because no complete syntax
classifier proves the unsupported subset absent.
