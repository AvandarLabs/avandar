# Nested arrow functions

`avandar/nested-arrow-functions` safely replaces an ordinary nested declaration
with a block arrow when the binding is unique and every use is a direct call
after the declaration in the same enclosing function activation.

Only declarations directly inside a function body are supported. Block-scoped
declarations, methods, properties, exports, overloads, recursion, indirect
before-initialization reads, constructors, identity escapes, async functions,
generators, generic signatures, and lexical `this`, `arguments`, `super`, or
`new.target` contracts remain unchanged.

Nested functions in the body or parameters, comments, control flow, local
declarations, strings, assertions, and competing repair syntax are refused.
Declaration and arrow spelling share these refusals, keeping replacement
envelopes independent across ordinary repair passes.

The real-engine `direct-nested-calls` capability can be enforced per reviewed
path. `unsupported-shapes` remains fallback for every file until an exact
classifier exists.
