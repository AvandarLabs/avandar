# Private helper prefixes

`avandar/private-helper-prefix` prefixes a lowercase top-level helper when its
unique, module-local binding is used exclusively by direct calls in the
immediately adjacent exported function declaration. The declaration and all
scope-resolved calls change together.

Declared and unresolved destination-name collisions are rejected. Exported
symbols, components, recursion, assignments, aliases, constructor calls, property
and computed references, string contracts, dynamic evaluation, and reflected
function identity remain unchanged. Escaped string and template tokens anywhere
in the module also refuse repair because their contracts are not decoded.

The helper and caller must contain no nested function syntax or competing
comment, control-flow, declaration, assertion, string, or type repairs. Concise
arrows and single-return arrow blocks are refused. Comments between the helper
and caller also block repair. Each accepted pair owns a disjoint edit envelope,
so multiple pairs compose with enabled and independently disabled function
rules in one ordinary native fix invocation.

The real-engine `private-direct-calls` capability can be enforced per reviewed
path. Every file retains `unsupported-shapes` fallback because other private
helper forms still require review.
