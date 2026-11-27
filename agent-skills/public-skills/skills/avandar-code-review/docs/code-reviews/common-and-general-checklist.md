# Common and general checks

## Most Common Mistakes

Check these first because they are the most frequent review findings:

- Functional style: for iterating a **collection** (array/iterable of data),
  avoid `for` and `while` loops. Prefer functional, declarative utilities such
  as `map`, `filter`, `reduce`, `forEach`, and `flatMap`. This is a strong
  default: a second pass over an array (e.g. `.map().filter()`) is a negligible
  cost until N gets very large, so clarity wins. The **only** exceptions where
  an imperative loop is acceptable:
  1. **Async sequencing**: you must `await` each iteration in order. `for...of`
     with `await` is correct; `.map(async …)` + `Promise.all` runs in parallel
     (different semantics) and an awaiting `reduce` is unreadable.
  2. **Early exit for performance**: you can stop before the end and the input
     is large enough that scanning it fully matters. Prefer `.find` / `.some` /
     `.every` (they already short-circuit) when they express the intent; reach
     for a raw `for` + `break` only when those cannot.
  3. **Large N in a hot path**: when N can realistically reach **~100,000+**
     AND the code runs in a latency-sensitive path (event handler, render,
     keystroke), collapse a multi-pass chain (`.map().filter().map()`) into a
     single `for...of` / `reduce`. Below ~100k the extra pass is well under
     ~50ms even on a mid-range mobile CPU; the doubled-pass cost only
     approaches the ~200ms "user notices lag in a click" threshold around
     N ≈ 0.5–1M. Default to functional clarity below the threshold, and only
     invoke this exception when a comment or the surrounding code makes it
     plausible that N is actually that large.
  - Not an exception, just out of scope: scanning the **characters of a raw
    string** by index is not collection iteration (array utilities do not
    apply), so a `for` over string indices there is fine and needs no
    justification.
  - Note: some linters (e.g. react-doctor's `js-combine-iterations`) flag
    `.map().filter()` as "two passes, use a loop." That advice inverts this
    rule; this repo prefers the functional form and disables that lint (see the
    repo's `doctor.config.ts`). Do not raise a two-pass finding on those
    grounds.
- Readonly wrappers: do not use per-property `readonly` keys when the real
  contract is "this input object is readonly". Prefer wrapping the function
  parameter in `Readonly<...>` or `readonly T[]`.
- Readonly placement: apply `Readonly<...>` to the function input parameter,
  not to the shared type alias itself, unless the alias is intentionally meant
  to be globally immutable. Keep the alias mutable so input contravariance
  still works.
- Validation: type checking must pass.
- Validation: linting must pass.
- Utility reuse: avoid hand-writing common utility or data-transformation
  logic when a first-party package or installed library already provides it.
  Common examples include property mapping, bucketing, partitions, object
  reshaping, filtering helpers, and lookup builders. Before introducing a
  bespoke helper, check only packages and imported libraries that are
  actually present in the repo for an existing equivalent. If the repo
  depends on `@avandar/utils`, see the library phase under
  `libraries/avandar-utils-checklist.md` for specific helpers worth
  preferring. If it does not, skip every `@avandar/utils`-specific rule.
- Variable naming: avoid vague names like `matrix`, `count`, `next`, `prev`,
  `val`, or `n`. Use a business noun that explains what the value represents,
  such as `rolesMatrix`, `numUsers`, or `nextVizConfig`. The one acceptable
  short form is `idx` for functional-programming array indices.
- Planning comments: if comments mention future work, do not refer to internal
  "phases". Write in present/future terms that make sense to any engineer, such
  as "For now..." and "Soon..." instead.

## General Checks

- Comments should not use em dashes. Prefer a colon or a hyphen.
- In SQL, a docstring on a `create type` / `table` / `view` / `function` /
  `schema` uses a `/** ... */` block, never a run of `--` lines; every
  other comment uses `--`. See the **Comments** section of
  `sql-checklist.md`.
- Exported or public interfaces, constants, objects, functions, and classes
  should have block comments or docstrings.
- Function docstrings should explain the function's purpose and output, not
  its interior implementation details.
- Functions should stay short, ideally 45 lines or fewer.
- If a function is getting too long or contains reusable logic, extract a
  utility function.
- Avoid unnecessary indirection: when a member or helper is small, used once,
  or consists of a single statement, inline it into the containing object or
  use site instead of extracting a separate constant or top-level function.
  Extract it when reuse, meaningful naming, independent testing, or complex
  logic makes the separate abstraction clearer.
- **Treat a source file over 400 lines as monolithic and split it.** A file
  that long stops being one unit a reader can hold at once: unrelated
  concerns share a scroll buffer, every edit touches the same file, and the
  seams between responsibilities stop being visible in the directory
  listing. Thresholds:
  - **400 lines or fewer:** fine, no finding.
  - **401 to 500 lines:** flag it and ask for a split attempt. Accept the
    file as-is only when the author shows there is no clean seam, for
    example one exhaustive generated union or a single algorithm whose
    steps cannot be named independently.
  - **Over 500 lines:** always a finding. "No clean seam" is not an
    accepted answer at this size.

  **Exception: database migration files are never a finding, at any
  length.** A migration is one unit by construction: it is applied as a
  single step, its statements are ordered by dependency, and splitting it
  changes what runs. This covers `supabase/migrations/`, and the
  equivalent directory for any other migration runner.

  **Exception: nothing outside reviewed source counts.** Dependency trees,
  build output, and caches are never findings at any length:
  `node_modules/`, `dist/`, `build/`, `out/`, `coverage/`, `.next/`,
  Cargo's `target/` and `vendor/`, Python's `__pycache__/`, `.venv/`,
  `venv/`, and `site-packages/`.

  **The fix is always a directory module, never a sibling file.** The file
  becomes a directory of the same name, the original file becomes the
  entry point inside it, and each extracted unit becomes its own file
  nested in that directory. Then apply the directory rules recursively: an
  extracted unit that has its own child dependencies, or its own co-named
  siblings such as a `.test` or `.module.css` file, becomes a directory in
  turn.

  This is bad:

  ```text
  SupabaseLocalEnvironment.ts        (1479 lines)
  ```

  This is good:

  ```text
  SupabaseLocalEnvironment/
    SupabaseLocalEnvironment.ts      entry point
    SupabaseLocalEnvironment.test.ts
    SupabaseBackupManifest/
      SupabaseBackupManifest.ts
      SupabaseBackupManifest.test.ts
  ```

  **Find candidates** (every file the diff adds or modifies, longest
  first, with anything at or under the threshold dropped):

  ```bash
  git diff --name-only --diff-filter=ACM <base>...HEAD \
    | grep -E '\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|rb|java|kt|swift)$' \
    | grep -Ev '(^|/)(migrations|node_modules|dist|build|out|coverage|target|vendor|__pycache__|\.venv|venv|site-packages|\.next)/' \
    | while read -r f; do
        [ -f "$f" ] || continue
        n=$(wc -l < "$f" | tr -d ' ')
        [ "$n" -gt 400 ] && printf '%s\t%s\n' "$n" "$f"
      done \
    | sort -rn
  ```

  The extension whitelist keeps lock files, data, and markup out; the
  second filter drops migrations, dependency trees, build output, and
  caches. Add the repo's own equivalents if it uses different directory
  names. Every printed file is a candidate. Report those over 500 lines as
  findings outright, and those between 401 and 500 as a split attempt to
  justify or make. Drop generated files (see "Files To Skip") before
  flagging: a checked-in
  type-generation output or a database migration is one unit by
  construction and is never a monolith finding.
- Follow normal language naming conventions for the file's language.
- Variable names should be descriptive, including auxiliary verbs when useful,
  such as `isLoading` or `hasError`.
- Avoid abbreviations unless the full word would create a naming collision.
  For example, prefer `value` over `val`.
- Avoid vague placeholders like `next`, `prev`, or `n` without a business noun.
- A function that turns one value into another must name both sides, counting
  the receiver as part of the name. A receiver that is itself the source or the
  target supplies that half, so the method drops it: `[Source].to{Target}`,
  `[Source].get{Target}`, or `[Target].from{Source}`. Use `to` for a
  conversion and `get` for a fetch, filter, or lookup. A receiver that names
  neither side supplies nothing, so the method spells out both halves just as a
  free function does: `make{Target}From{Source}` or `get{Target}From{Source}`.
  See the naming rule in `typescript-checklist.md` for the
  full rule, including why `resolve...` is never one of them.
- Prefer reusing existing repo-local helpers, first-party packages, or
  installed libraries over introducing bespoke local helpers when an
  equivalent shared abstraction already exists.
- For UI code: keep accessibility strong with native semantics and ARIA where
  needed.
- For UI code in repos that use Mantine: prefer theme tokens and shorthand
  props instead of ad hoc styling. Skip this rule when Mantine is absent.
- For UI code: prefer CSS Modules over inline `style={}` or `styles={}` unless
  the styles are dynamically computed.
- For UI code in repos that use `clsx`: use it for conditional classes.
  Skip this rule when `clsx` is absent.
- For UI code: never introduce TailwindCSS.
