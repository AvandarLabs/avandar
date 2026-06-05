# Extra Checklist For `avandar-code-review`

This document is intended to be used with the `avandar-code-review` skill.

It contains additional review checks that are not included in the original
skill. After finishing the skill's built-in checklist, the agent should also
review code against the items in this file when it exists.

Whenever a user says to add a new common mistake, or says to "remember this in
the future", append the new mistake to this document.

## Additional Mistakes

- Dispatch on a string-literal or enum union with `match().exhaustive()` (from
  `ts-pattern`) or `matchLiteral` (from `@utils`). These fail to compile when a
  union case is unhandled. Plain `switch` (with or without `default`) and
  `if`/`else if` chains do not check exhaustiveness, so don't use them for
  union dispatch.

- Use block comments (`/** ... */`) only as documentation attached to an
  identifier (functions, types, exports, etc.) or as a file-level header.
  Any comment inside a function body must use `//` line comments, even when
  it spans multiple lines.

  This is bad:

  ```ts
  function load(id: string): Result {
    /**
     * We bail early on empty ids because the upstream cache treats them
     * as wildcards and would return stale rows.
     */
    if (id === "") {
      return emptyResult();
    }
    // ...
  }
  ```

  This is good:

  ```ts
  function load(id: string): Result {
    // We bail early on empty ids because the upstream cache treats them
    // as wildcards and would return stale rows.
    if (id === "") {
      return emptyResult();
    }
    // ...
  }
  ```
