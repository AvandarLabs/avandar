# Comments Checklist

Use this checklist when the diff includes any source file that supports
both block (`/** ... */`) and line (`//`) comments. This applies to
TypeScript, TSX, JavaScript, JSX, and most C-family languages.

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
