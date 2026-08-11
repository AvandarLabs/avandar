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

- Do not use file-level comments in a file that has a main export. A file-level
  comment is a detached block comment describing the file as a whole rather than
  a specific member; it counts whether it sits at the very top of the file or
  just below the import block (a common miss: a header that moved down after
  imports were added). Document members directly instead: every exported member
  gets its own JSDoc, and the main export (the member the file is named after)
  must always carry its own block comment. Fold any whole-file purpose or design
  context into the main export's JSDoc. IDE intellisense surfaces member
  comments, not detached headers, so a file-level block leaves the real API
  undocumented in the editor.

  Detecting it: a detached block comment is one whose closing `*/` is followed
  by a blank line (a member docstring sits directly above its declaration with
  no blank line). In a file with a main export, flag any such block above the
  code.

- Exception: a file with no main export may keep a file-level comment describing
  the whole file. "Main export" means the export whose name matches the file
  name. Test files have none, so a header describing the suite is expected and
  correct; the same applies to same-kind collections with no single primary
  export (`*.types.ts`, `*.constants.ts`, a group of sibling helpers). Do not
  flag file-level comments in those files.

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

- Put a method's docstring on the module's exported key, not on the underlying
  function, when a non-exported function is defined in the same file as the
  module that exports it. TypeScript intellisense does not carry a function's
  docstring across the assignment into a module object: hovering
  `MyModule.myFunc` shows the type but not the docstring that sits on `_myFunc`.
  Flag a docstring that sits on the `_impl` function while its exported object
  key has none.

  This is bad (the docstring is invisible when a caller hovers `MyModule.myFunc`):

  ```ts
  /** What myFunc does. */
  function _myFunc() {}

  export const MyModule = { myFunc: _myFunc };
  ```

  This is good:

  ```ts
  function _myFunc() {}

  export const MyModule = {
    /** What myFunc does. */
    myFunc: _myFunc,
  };
  ```

  Exception: when the object is annotated by an interface or type that already
  documents its members (`const Store: BlobStore = { ... }`), that interface is
  the intellisense source; the docstrings belong there, not on the object keys
  or the functions. Do not flag missing key docstrings in that case.

- Comments must describe the present, never the past. Flag any comment that
  narrates what the code *used to* do: a former implementation, a rename, a
  previous location, or the reason it changed. Git history already records that,
  and the comment forces every future reader to work out which half still
  applies. Rewrite it to describe only the code as it exists today.

  This is bad:

  ```ts
  /**
   * Formats a row for display.
   *
   * This used to take the whole table and format every row, but that was slow
   * on large datasets, so now it only takes one row.
   */
  export function formatRow(row: Row): string {}
  ```

  This is good:

  ```ts
  /** Formats a single row for display. */
  export function formatRow(row: Row): string {}
  ```

  Exception: a superseded approach may be documented when it is the more
  intuitive one and a future developer is likely to reach for it again. It must
  be written as a warning about the present, not as history: not to do X because
  it fails in way Y. Do not accept "we used to do X" phrasing even when the
  underlying warning is legitimate; ask for the warning form instead. Test: does
  the sentence still read correctly to someone who has never seen the old code?
  If it only makes sense to someone who remembers the change, flag it.

  This is bad (history, and useless to a reader who never saw the old code):

  ```ts
  /**
   * Reads the workspace id from the route.
   *
   * We used to read it from the session, but that broke on hard refresh.
   */
  export function useWorkspaceId(): string {}
  ```

  This is good (a warning that stands on its own):

  ```ts
  /**
   * Reads the workspace id from the route.
   *
   * Do not read it from the session instead: the session is not yet populated
   * on a hard refresh, so the first render would get `undefined`.
   */
  export function useWorkspaceId(): string {}
  ```

  **Find candidates:**

  ```bash
  grep -rEin '(//|\*).*(used to|use to|previously|formerly|originally|no longer|used to be|instead of what|before this|in the past|we changed|was renamed|has been (moved|renamed|replaced))' <files-under-review>
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
