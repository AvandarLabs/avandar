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

- Keep exported-function JSDoc focused on what the function is for and what
  callers get back. Do not use the block comment above an exported function
  to narrate implementation details, branching, sequencing, or internal
  helpers; those belong in `//` comments inside the function body when they
  are needed.

  This is bad:

  ```ts
  /**
   * First reads from IndexedDB, then registers a DuckDB view, then dispatches
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

- Document exported members directly even when the file also has a file-level
  block comment. File-level comments are fine when they add whole-file purpose
  or design context, but they are complementary context, not a substitute for
  member JSDoc. IDE intellisense surfaces member comments, so exported
  functions, constants, objects, classes, and types still need their own
  comments.

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
  /**
   * Discovery query helpers shared by client and server validators.
   */

  /** Maximum length accepted for generated discovery queries. */
  export const MAX_QUERY_CHARS = 2000;

  /**
   * Validates a generated discovery query before local execution.
   * Returns whether the query is read-only.
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
