# Comments Checklist

Use this checklist when the diff includes any source file that supports
both block (`/** ... */`) and line (`//`) comments. This applies to
TypeScript, TSX, JavaScript, JSX, and most C-family languages.

- Use block comments (`/** ... */`) only as documentation attached to an
  identifier (functions, types, exports, etc.). Do not use file-level header
  comments (see the file-level-comment rule below). Any comment inside a
  function body must use `//` line comments, even when it spans multiple lines.

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

- Keep function JSDoc focused on what the function is: its purpose and the
  output callers get back. Do not use the block comment above a function to
  narrate implementation details, branching, sequencing, or internal helpers;
  those belong in `//` comments inside the function body when they are needed.
  Exception: function JSDoc may mention complex or unconventional
  architectural/design decisions only when understanding those decisions is
  crucial to developers using the function.

  This is bad:

  ```ts
  /**
   * Reads from IndexedDB before registering a DuckDB view, then dispatches
   * status updates. Falls back to running SQL when no blob exists.
   */
  export async function rehydratePlan(options: Options): Promise<void> {}
  ```

  This is good:

  ```ts
  /**
   * Restores a persisted analytic plan into the plan canvas.
   * Resolves after the plan state reflects the available step results.
   */
  export async function rehydratePlan(options: Options): Promise<void> {}
  ```

- Do not use file-level comments. A file-level comment is a block comment at
  the very top of the file that describes the file as a whole rather than a
  specific member. Document members directly instead: every exported member
  gets its own JSDoc, and the main export (the member the file is named after)
  must always be documented. Fold any whole-file purpose or design context into
  the main export's JSDoc. IDE intellisense surfaces member comments, not file
  headers, so a file-level block leaves the real API undocumented in the editor.

  This is bad:

  ```ts
  /**
   * Discovery query helpers shared by client and server validators.
   */

  export const MAX_QUERY_CHARS = 2000;

  export function isReadOnlyDiscoveryQuery(query: string): boolean {}
  ```

  This is good:

  ```ts
  /** Maximum length accepted for generated discovery queries. */
  export const MAX_QUERY_CHARS = 2000;

  /**
   * Validates a generated discovery query before local execution, so the
   * client and server share one read-only check. Returns whether the query is
   * read-only.
   */
  export function isReadOnlyDiscoveryQuery(query: string): boolean {}
  ```

- Comments must describe the code as it exists today, not the external plan
  that produced it. Flag any comment that references planning artifacts a
  reader cannot resolve from the codebase: roadmap phase numbers ("Phase 3"),
  plan or migration step labels tied to a doc ("Phase A" / "Phase B"), ticket
  or milestone labels, or any sequencing that lives outside the code. Rewrite
  to describe the actual behavior (e.g. "the background parquet transcode"
  instead of "Phase B").

  Exception: when the code itself implements a real multi-phase process (a
  data migration, an import/transform pipeline, a render pass), naming those
  phases is fine and helps greppability, as long as the name is descriptive
  and refers to the code, not an external plan. "CSV Import Phase" or "CSV
  Transform Phase" is allowed; a bare "Phase A" / "Phase 2" is not. Test: can
  a new engineer grep the name and understand it from the code alone? If yes,
  it is a code phase and allowed; if it only makes sense against a roadmap or
  spec, flag it.

  **Find candidates:**

  ```bash
  grep -rEn '(//|\*).*\b[Pp]hase\b' <files-under-review>
  ```

  (also scan for "step N", "milestone", and ticket-ID references in comments.)
