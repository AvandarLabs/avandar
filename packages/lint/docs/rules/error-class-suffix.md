# Error class suffix

`avandar/error-class-suffix` (avlint-ts-017) reports a class that extends `Error`, or
any class whose name ends in `Error`, when its own name does not end in
`Error`. The fix appends the suffix.

```ts
// Reported
export class WorkspaceMembershipDenied extends Error {}

// Expected
export class WorkspaceMembershipDeniedError extends Error {}
```

Detection is syntactic. The superclass counts when it is an identifier or a
non-computed member expression (`errors.ValidationError`) whose name ends in
`Error`, so built-ins such as `TypeError` count too. A class that extends a
non-`*Error` class which itself extends `Error` is not detected, because that
needs type information this plugin does not have. Anonymous class expressions
are ignored.

Only module-private class declarations are renamed, together with every
scope-resolved reference. The fix is withheld, and the class is still reported,
when the class is exported, re-exported or default-exported, when a string or
template mentions its name (such as `this.name = "Denied"`), when code reads
`.name` or `.constructor` on it or uses it as a shorthand key, when the new name
is already taken, or when the file is a script or uses `eval`. Those renames
cross files or change runtime names, so a person or agent renames them.
