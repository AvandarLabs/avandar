---
name: avandar-code-review
description: Use when reviewing code changes, pull requests, or local diffs against Avandar's TypeScript, React, SQL, naming, documentation, and immutability conventions. Reviews and fixes every violation autonomously. Also use for focused reviews when the user says avandar-code-review followed by comments, files, naming, and/or tests (any subset, concatenatable).
metadata:
  author: jpsyx
  version: "3.0.0"
  tags: avandar, code-review, typescript, react, sql, conventions, style, comments, files, naming, tests, architecture, code-smells
---

# Avandar Code Review

Use this skill when reviewing any repo that wants Avandar's review rules
and style conventions. The core skill must make sense outside the
Avandar product repo. On a **full review**, run the common-mistakes and
general-checks sections, then only apply the language-specific and
library-gated phases when the diff matches their gate. On a **focused
review** (`comments`, `files`, `naming`, and/or `tests`), skip every
phase and bullet outside the selected packs; see **Focused Reviews**.
Every review fixes what it finds without stopping to ask; see **How The
Review Runs**.

## Public Core And Repo-Local Rules

- The built-in checklists may encode Avandar style, but they must not
  rely on private business logic, private product concepts, private
  repo paths, or files that only exist in one checkout.
- Rules that mention repo-internal paths, private business concepts,
  local architecture boundaries, or product-specific test commands
  belong in the repo-local `docs/code-reviews/extra-checklist.md`
  file, not in this skill.
- References to installable libraries are allowed, including
  `@avandar/models`, `@avandar/utils`, and `@avandar/modules`, but every
  library-specific rule must be behind a package-presence gate. If the
  repo does not use the library, skip that phase entirely.

## Additional Checklist File

On full reviews, read [Repo-local routing](docs/code-reviews/repo-local-routing.md)
and follow every gated phase declared by the repository's extra checklist.
Focused reviews skip those phases. The reference also governs placement when
adding a rule and creating a repo-local checklist from the packaged template.

## Focused Reviews

When pack tokens are present, read
[Focused review packs](docs/code-reviews/focused-reviews.md) completely before
selecting phases. It preserves `comments`/`docstrings`, `files`, `naming`,
`tests`, concatenation, exclusive gates and focused find lanes. Full reviews
skip that reference. Both modes run **Automation coverage handoff** first.

## How The Review Runs

Every review, full or focused, runs the same way. The agent acts as
reviewer and fixer, fully autonomously: fix every violation you find, and
never stop to ask.

- **Fix every rule violation you find, without exception.** Apply a fix for
  every finding that survives verification, including the low-value,
  cosmetic, and high-churn ones (comment cleanups, naming, file moves,
  component splits, helper reuse, functional-style rewrites, etc.). "Low
  value," "high churn," or "large refactor" is never a reason to skip a fix.
- **Never ask the user anything.** Do not ask whether to apply a fix, do not
  ask the user to confirm your approach or how aggressive to be, and do not
  defer anything as an optional "follow-up" for the user to approve. There
  are no follow-ups: if it breaks a rule, you fix it now. Resolve the base
  branch without prompting too (see **Base Branch Detection**).
- Correctness is the top priority: when a fix is behavior-sensitive, make the
  change and prove it with the finish protocol below. Never trade correctness
  for coverage, but never skip a fix merely because it is risky: do it and
  verify it.
- Stay inside the requested review scope (the files/diff under review). Do not
  hunt for issues in unrelated, untouched code. Within that scope there is no
  "out of scope" finding: fix it. **Exception:** completion validation under
  **Lint And Typecheck After Review** is repository-wide, so fix every lint
  and typecheck error it reports, including errors in untouched files.
- Continue reviewing and fixing until every checklist phase is exhausted and
  no reviewed line still breaks a rule.
- The only findings you may leave unfixed are **verified false positives**: a
  documented exception, a linter rule this repo disables, or a rule that does
  not actually apply once checked. These are not "skipped" work; record each
  with a one-line reason. Everything else gets fixed.

**Finish protocol (every review runs this, in order, without asking):**

1. Apply every fix.
2. **Format.** If the repo defines a format script (e.g. a `format` entry in
   `package.json` such as `pnpm format`, or a documented formatter), run it
   once over the changed files.
3. **Run completion validation.** Follow **Lint And Typecheck After Review**.
   Fix every lint and typecheck error in the repository,
   including errors outside the reviewed diff, then rerun both commands until
   they report zero errors.
4. **Run the relevant tests** (see "Testing At The End Of Review") and get
   them green.
5. **Re-verify.** Re-run the review's own checks (including any repo linters
   the React phase uses, such as `react-doctor`, **unless this is a focused
   review**) and confirm nothing reviewed still breaks a rule. In a focused
   review, re-verify only the selected packs; do not run `react-doctor` or
   any other phase that was not selected. Loop back to step 1 if anything
   remains.

**Exit bar:** by the time you report, the repository must have
zero lint errors and zero typecheck errors, and no code-review rule may still
be broken on the reviewed lines. End with a summary of what you fixed plus a
short list of any verified false positives (with the reason each is not a real
violation). The summary must NOT contain a
"recommended follow-up" section that punts real rule violations back to the
user; there are none.

## Base Branch Detection

Before computing any diff, determine the base branch:

1. Run `git branch --show-current` to get the current (head) branch.
2. If the user specified a base branch in their prompt, use it directly.
3. If no base branch was specified, pick `develop` if it exists, else
   `main`, else the repo's obvious trunk, and proceed without prompting.
4. Compute the diff with:
   ```
   git diff <base>...<head>
   ```
   The three-dot form diffs from the common ancestor, which is the correct
   scope for a feature or fix branch review.

## Files To Skip

Before any review work begins, filter the diff and skip these files
entirely. Do not load their contents, do not run any phase against them,
and do not report findings for them:

- Files matched by the repo's `.gitignore` (check with `git
  check-ignore -v <path>` when in doubt).
- Auto-generated files, typically identified by `*.gen.*` in the
  filename (e.g. `schema.gen.ts`, `routes.gen.tsx`).
- `messages.ts` files when a sibling `messages.po` file exists in the
  same directory. The paired `.po` file indicates the TypeScript file is
  translation output and should be treated as review-skipped translation
  content.
- Markdown files (`*.md`, `*.mdx`).
- Gettext translation files (`*.po`).

If the entire diff consists only of skipped files, say so explicitly and
stop; there is nothing to review.

## Review Scope

Only flag findings on lines that appear as `+` lines in the diff (added or
modified by the author under review). Do not flag issues on context lines
(unchanged lines shown for surrounding context) or `-` lines.

- Read context lines to understand intent, call sites, and surrounding logic.
- If a violation exists only on an unchanged line, do not report it, even if
  it is in the same file as a changed line.
- When a finding spans both changed and unchanged lines (e.g. a function
  signature is unchanged but its body was modified), only flag it if the
  violation is locatable on one or more `+` lines.

## Automation coverage handoff

Run this before selecting deterministic detectors for full **and** focused
reviews. Keep a required routing record: lint command/status, coverage
command/status, exact reviewed paths, and retained/omitted
`ruleId | language | path | capability | state | reason` rows.

1. Read the repo's configured lint scripts and run available configured lint.
   Record failures and repair operational errors under the finish protocol.
2. If the repository provides `avandar-lint`, run its local command for the
   exact filtered reviewed paths, for example:
   `pnpm exec avandar-lint coverage src/view.tsx src/theme.css --format json --no-prompt`.
   Read `operational` and every exact `outcomes` row. Supplied current command
   evidence may be reused in a routing-only exercise; state which evidence
   was supplied. A real review reruns after source/config changes.
3. Partition each relevant AF capability using the table below. When no usable
   exact outcome exists, retain the applicable detector. Installed packages,
   green lint and language summaries alone leave every capability unresolved.
4. Load only retained AF IDs from
   [Deterministic fallback](docs/code-reviews/deterministic-fallback-checklist.md).
   Match the ID's language, path and capability inside that file. Preserve
   partial families: an enforced safe capability omits only itself, while an
   explicit `unsupported-shapes` fallback still runs for the same path.
5. Continue every normal JR/semantic, guided, contextual, avlint-ts-015, avlint-sql-001 and selected
   pack obligation. Coverage subtraction applies only to proven deterministic
   capabilities. Recompute this record after changing source or lint config.

| Observable evidence for the exact tuple | Next detector action |
| --- | --- |
| Successful operational report, exact operational `enforced` outcome | Omit only that capability on that path/language. |
| Successful operational report, exact operational `not-applicable` outcome | Omit only that inapplicable capability. |
| Exact `fallback`, partial or unsupported capability | Retain that capability and load its AF ID. |
| Missing command/package/plugin/rule, disabled/excluded path, config/operational error, absent row or summary-only report | Retain applicable detector obligations. |
| Unknown extension/language | Retain fallback; assess actual language applicability before choosing native syntax. |

Full reviews select all relevant shipped AF IDs. Focused reviews select only
IDs assigned to their packs in the focused reference. avlint-ts-002, avlint-ts-005, avlint-ts-016, unsupported
avlint-ts-014 JS shapes, and any missing proof remain fallback. Generic avlint-common-001, avlint-common-002
fallback assesses the actual language; it does not impose JS syntax on an
unknown language. avlint-css-001 applies to **plain CSS and CSS Modules** independently
of the CSS-module gate, including in a focused `comments` review.

Example: for one TSX path, avlint-common-001 `standalone-body-prose: enforced` omits that
capability; avlint-common-001 `unsupported-shapes: fallback` retains only the unsupported
shapes. An avlint-ts-001 `if-body: enforced` row omits that exact detector. An avlint-css-001
fallback on plain CSS loads avlint-css-001; an unknown-language avlint-common-001 fallback first
checks that language's comment forms. Summary-only evidence omits none.

## Review Order

1. Determine the base branch and compute the diff (see **Base Branch
   Detection** above). Extract the exact `+` line ranges per file; these
   are the only lines eligible for findings in every subsequent phase.
2. Apply the **Files To Skip** filter above and narrow the diff to only
   reviewable files before doing anything else.
3. Complete **Automation coverage handoff**, then determine which phases
   fire for this diff and execute the review
   using the **Execution Model With Sub-Agents** section below. Fan out
   to read-only find sub-agents when 3 or more phases fire; otherwise run
   the phases inline in this agent.

   **Focused review:** the only phases that fire are the selected packs,
   in this order (omit any pack the user did not name): `comments`,
   `files`, `naming`, `tests`. Do not gate on extra-checklist or library
   presence. Skip the rest of this step.

   **Full review:** gate each phase by file type, package presence, and
   whether `extra-checklist.md` exists. The phase order is:
   1. **Most Common Mistakes** (common/general reference, always runs).
   2. **General Checks** (same reference, always runs).
   3. **Deterministic fallback** for retained AF capabilities.
   4. Each **language-specific phase** under "Phase Checklists", in the
      order listed, gated on the diff.
   5. Each **library-gated phase** under "Library-Gated Phases", gated on
      package presence.
   6. The repo-local `docs/code-reviews/extra-checklist.md` phases, if the
      file exists (always last). Treat `extra-checklist.md` as an entry
      point: run every phase it declares and every further ruleset it
      references (for example under `docs/code-reviews/references/`) as its
      own phase, in the order the file lists them.
4. Fix every surviving finding (see the Execution Model's Apply stage).
5. After all review findings have been fixed, follow **Lint And Typecheck
   After Review**, then run only the exact tests that are relevant to the
   code changes.
6. Flag only concrete findings that are visible in the code under review.

**Skipping phases is the rule, not the exception.** A diff that only
touches SQL should not load the TypeScript, React, hooks, CSS, or any
library-gated phase. Loading a phase file you will not use is wasted
context.

## Execution Model With Sub-Agents

Before deciding whether to fan out, read
[Review execution](docs/code-reviews/review-execution.md) completely. It defines
phase counting, focused/full find lanes, read-only Find/Verify and serial
Merge/Apply, plus the inline fallback. Supply every lane its exact coverage
partition; only the deterministic-fallback lane loads selected AF detectors.

## Testing At The End Of Review

After completing the review, run the narrowest relevant tests you can identify.

- Do not run the full suite by default.
- Do not use broad commands like `pnpm test` without specific test-file
  arguments.
- Prefer passing explicit test file names so only the changed areas are tested.
- Run only the test commands relevant to the changed areas. Lint and typecheck
  are governed by **Lint And Typecheck After Review**, not this targeted-test
  rule.
- If you cannot determine the right tests, say so explicitly instead of running
  an expensive catch-all suite.

### Vitest And Unit Tests

- If the relevant tests are Vitest or similar unit/integration tests, it is
  fine to run one command that names all relevant test files explicitly.
- Prefer a command shape like `pnpm test -- path/to/test-a path/to/test-b`
  rather than a top-level suite invocation with no file targeting.

### E2E Tests

E2E test handling is repo-specific (test runner, script names, and
fixture conventions vary). When the repo under review has an E2E
suite, see its `docs/code-reviews/extra-checklist.md` for the local
phase that covers both how to run E2E tests and how to review E2E
test code. If the extra-checklist.md does not contain E2E-specific
instructions, then follow the same guidelines applied to Vitest and Unit
tests, such as only narrowly running the relevant tests instead of the
full test suite.

## Lint And Typecheck After Review

After every review phase is complete, validate the repository before running
the targeted tests. Inspect the repo's `package.json` `scripts` object first:

1. If it contains a `lint` script, run `pnpm lint`. Do not substitute a
   guessed lint command when that script is absent.
2. Find the repo's typecheck script, using its declared script name. Prefer a
   script named `typecheck`; otherwise use the script whose name clearly
   denotes type checking (for example `type-check` or `check-types`). Run it
   as `pnpm <script-name>`. Do not invent a typecheck command or run a
   compiler directly when no typecheck script exists.
3. Fix **all** lint and typecheck errors reported, whether or not they are
   in the reviewed changeset, then rerun every command that was run so the
   final result is current. Continue until every command run reports zero
   errors. There are no pre-existing-error exceptions.

If `pnpm lint` runs, its final result must contain zero lint errors. If a
typecheck script runs, its final result must contain zero typecheck errors.

## Most Common Mistakes And General Checks

On full reviews, read and apply
[Common and general checks](docs/code-reviews/common-and-general-checklist.md)
completely. Focused reviews apply only their pack's named subsets. All JR,
semantic, guided and repo-local obligations retain their original gates.

## Phase Checklists

Run each phase below only when its gate matches the diff. Phase files
live under `skills/avandar-code-review/docs/code-reviews/` next to this
SKILL file.

### Phase: deterministic fallback

- **Gate:** the handoff retains at least one AF capability for a reviewed path.
- **Reference:** load only selected IDs from
  [deterministic-fallback-checklist.md](docs/code-reviews/deterministic-fallback-checklist.md).
- **Find lane:** one selected-capability lane on full reviews; selected pack
  lanes carry their own partition on focused reviews. Count it only when used.
- **Applicability:** all reviewed source languages, including unknown-language
  assessment and plain CSS. CSS Modules are not the avlint-css-001 applicability gate.

### Phase: comments

- **Gate:** the diff includes any source file that supports both a block
  comment and a line comment (TypeScript, TSX, JavaScript, JSX, most
  C-family languages, and `.sql`).
- **Reference:**
  [`docs/code-reviews/comments-checklist.md`](docs/code-reviews/comments-checklist.md).
  For `.sql`, read `/** ... */` for "block comment" and `--` for "line
  comment", and apply the **Comments** section of
  [`docs/code-reviews/sql-checklist.md`](docs/code-reviews/sql-checklist.md)
  alongside it.
- **Focused review:** this phase is the core of the `comments` pack.
  See **Focused Reviews** for the extra comment bullets pulled from
  Most Common Mistakes, General Checks, and the TypeScript checklist.

### Phase: TypeScript

- **Gate:** the diff includes at least one `.ts` or `.tsx` file.
- **Reference:**
  [`docs/code-reviews/typescript-checklist.md`](docs/code-reviews/typescript-checklist.md)
- **Covers:** naming, module and file structure, function shape, and
  import/export form. The type system itself is the `types` phase. A
  focused `naming` or `files` review applies only the subset listed
  under **Focused Reviews**, not this whole file.

### Phase: types

- **Gate:** the diff includes at least one `.ts` or `.tsx` file.
- **Reference:**
  [`docs/code-reviews/types-checklist.md`](docs/code-reviews/types-checklist.md)
- **Covers:** type declarations, assertions and escape hatches (`any`,
  `as unknown as T`, and any `as T` cast the type checker does not need),
  absence (`undefined` vs. `null`), literal unions, and readonly/variance
  contracts.

### Phase: functional style

- **Gate:** the diff includes at least one `.ts` or `.tsx` file.
- **Reference:**
  [`docs/code-reviews/functional-style-checklist.md`](docs/code-reviews/functional-style-checklist.md)
- **Covers:** nested positive returns vs. early-exit chains, ternaries
  vs. `if`/`else` for value selection, building variable-length arrays
  with `.filter(isDefined)`, using IIFEs for self-contained value
  computations, and not gating `.message` access on `instanceof Error`
  for already-typed errors.

### Phase: module hierarchy

- **Gate:** the diff includes at least one `.ts` or `.tsx` file.
- **Reference:**
  [`docs/code-reviews/module-checklist.md`](docs/code-reviews/module-checklist.md)
- **Focused review:** this phase is the core of the `files` pack. See
  **Focused Reviews** for the extra file-layout bullets pulled from
  General Checks and the TypeScript checklist.

### Phase: code smells

- **Gate:** the diff includes at least one `.ts` or `.tsx` file.
- **Reference:**
  [`docs/code-reviews/code-smells-checklist.md`](docs/code-reviews/code-smells-checklist.md)
- **Covers:** logical and architectural antipatterns, such as a one-off
  integration between two modules routed through a bridge/adapter
  mounted on a shared, global, or app-root component instead of a
  direct dependency between the two modules that actually need each
  other. This phase judges *where logic lives and why*, never naming,
  file layout, or syntax shape.

### Phase: React components

- **Gate:** the diff includes at least one `.tsx` file with a React
  component.
- **Reference:**
  [`docs/code-reviews/react-checklist.md`](docs/code-reviews/react-checklist.md)
- **Additional tool:** always run every rule in the reference file.
  When the `react-doctor` skill is also available in the current
  host, run it in addition (not instead) during this phase. See the
  reference file's "Also run `react-doctor` when available" section
  for the combine workflow. When the skill is not available, just
  run the rules as the full phase.

### Phase: React hooks

- **Gate:** the diff includes a `.tsx` file that uses React hooks
  (`useEffect`, `useMemo`, `useState`, etc.) or a `.ts` file that exports
  a custom hook. Skip this phase entirely for purely presentational
  components with no hooks.
- **Reference:**
  [`docs/code-reviews/react-hooks-checklist.md`](docs/code-reviews/react-hooks-checklist.md)

### Phase: CSS modules

- **Gate:** the diff adds, modifies, or deletes a `*.module.css` file,
  **or** a TSX/JSX file in the diff changes its `import ... from
"*.module.css"` line.
- **Reference:**
  [`docs/code-reviews/css-modules-checklist.md`](docs/code-reviews/css-modules-checklist.md)

### Phase: SQL

- **Gate:** the diff includes at least one `.sql` file.
- **Reference:**
  [`docs/code-reviews/sql-checklist.md`](docs/code-reviews/sql-checklist.md)
- **Covers:** naming, plus the SQL comment forms. A docstring on a
  `create type` / `table` / `view` / `function` / `schema` uses a
  `/** ... */` block; every other comment uses `--`, however many lines
  it spans.

### Phase: tests

- **Gate:** the diff adds or modifies a test file (`*.test.ts`, `*.test.tsx`,
  `*.spec.ts`, `*.spec.tsx`, or the repo's equivalent unit/integration test
  naming). This phase reviews the **quality of the test code**, which is
  separate from **running** the tests (see "Testing At The End Of Review").
- **Reference:**
  [`docs/code-reviews/tests-checklist.md`](docs/code-reviews/tests-checklist.md)
- **Focused review:** this phase is the core of the `tests` pack. See
  **Focused Reviews**. That pack applies this checklist only; it does
  not pull extra bullets from other phases.
- **Covers:** test names that state activity rather than what the test
  asserts (a name built on "parses", "handles" or "works" survives the
  deletion of the assertion itself, and a name promising more than the body
  checks reports coverage that does not exist), tautological and
  assertion-free tests (for example
  `expect(typeof x).toBe("function")`, which only fails if a symbol is deleted
  or renamed and stays green through any behavioral break), tests that assert
  implementation structure instead of observable behavior, placeholder tests,
  runtime assertions that only restate what the type system already
  guarantees, and — for **e2e tests only** — direct database writes that
  perform the behavior under test instead of driving it through the UI (direct
  writes are for seeding preconditions before page load, teardown, bypassing
  slow/external systems, or read-only oracles), and test file names and
  `__tests__/` placement.

## Library-Gated Phases

Each phase below applies only when the named package is present in the
repo under review. Check `package.json` (or each `package.json` in a
monorepo) for the dependency, OR grep for imports of the package.
Documented aliases count only when the repo config shows that they resolve
to the named package.
If the package is absent, skip the entire phase; do not even load the
sub-checklist file.

### Phase: `@avandar/utils`

- **Gate:** repo depends on `@avandar/utils`, or source files import from
  `@avandar/utils`, or the repo defines a documented alias such as
  `@utils` that resolves to `@avandar/utils`. If the package is absent,
  skip this phase even if the diff contains helper names such as `prop`,
  `propEq`, `matchLiteral`, `isDefined`, or `isNonNullish`.
- **Reference:**
  [`docs/code-reviews/libraries/avandar-utils-checklist.md`](docs/code-reviews/libraries/avandar-utils-checklist.md)
- **Covers:** exhaustive union dispatch via `matchLiteral` (or `ts-pattern`'s
  `match().exhaustive()` when available); reusing helpers from the
  `@avandar/utils` README instead of hand-rolling them.

### Phase: `@avandar/models`

- **Gate:** repo depends on `@avandar/models`, or source files import
  from `@avandar/models`, or the repo defines a documented alias such as
  `@models` that resolves to `@avandar/models`. If the package is absent,
  skip this phase even if the diff calls `Model.make` or imports from a
  `*.types.ts` file.
- **Reference:**
  [`docs/code-reviews/libraries/avandar-models-checklist.md`](docs/code-reviews/libraries/avandar-models-checklist.md)
- **Covers:** using `Model.make("ModelName", { ... })` instead of bare
  object literals; importing the namespace entry rather than
  `*.types.ts` from outside the model's own folder.

### Phase: `@avandar/modules`

- **Gate:** repo depends on `@avandar/modules`, or source files import
  from `@avandar/modules`, or the repo defines a documented alias such as
  `@modules` that resolves to `@avandar/modules`. If the package is
  absent, skip this phase even if the diff calls `createModule`.
- **Reference:**
  [`docs/code-reviews/libraries/avandar-modules-checklist.md`](docs/code-reviews/libraries/avandar-modules-checklist.md)
- **Covers:** grouping related helpers that share a domain, storage, or
  purpose into a single named module (a plain object by default; only use
  `createModule(...)` when the module needs state or mixins, and flag a
  stateless `createModule(...)` as something that should be a plain object).

### Phase: Supabase

- **Gate:** the repo under review has a `supabase/migrations/` or a
  `supabase/schemas/` directory, **and** the diff touches one of them or
  introduces a `null` from a Supabase auth call. If neither directory
  exists, skip this phase even when the diff contains other `.sql` files.
  This gate is the repo's use of Supabase, not a package dependency.
- **Reference:**
  [`docs/code-reviews/libraries/supabase-checklist.md`](docs/code-reviews/libraries/supabase-checklist.md).
  That file declares four sub-gates; run only the ones the diff matches.
- **Also load the `supabase-declarative-schema` skill when it is
  available.** It is the authority on this workflow, and the checklist is
  the review-time subset of it. If the two disagree, the skill wins.
- **Covers:** new migrations sorting last; folding a run of successive new
  migrations into one file; the five correctness rules for storage
  migrations (storage-only, `_STORAGE` naming, idempotent, listed in
  `[db.seed] sql_paths`, mirrored into `supabase/schemas/99.storage.sql`);
  schema file numbering, where tens are broad layers, units are
  sub-layers, and independent files share an index; normalizing a Supabase
  auth `null` to `undefined` at the boundary.
- **Note:** the first three sub-gates judge the set of files the diff
  touches, so give its find agent the names of every migration and schema
  file the diff adds or renames, not only the diff slice of one file.

## Repo-Local Phase

### Phase: repo-local extra checklist (extensible entry point)

- **Gate:** the file `docs/code-reviews/extra-checklist.md` exists in the
  repo under review.
- **Reference:** open the file directly and treat it as an ENTRY POINT, not a
  single flat file to scan. It declares its own gated phases and may delegate
  any phase to a further ruleset file (for example under
  `docs/code-reviews/references/`). Follow every reference and run each
  referenced ruleset as its own phase, in the order listed.
- These repo-local phases are always run last on a **full review** and may
  add or override rules for the specific repo. This is the only legitimate
  place for rules that mention repo-internal paths. **Skip every
  repo-local phase on a focused review.**
- **Fan-out:** count each repo-local phase (and each referenced ruleset) as a
  phase when deciding whether to fan out, and spawn one find lane per phase
  when you do (see "When To Fan Out" and the Find lanes table). A repo can
  extend its review indefinitely through this entry point, so never treat the
  repo-local contribution as a single phase by default; size the sub-agent
  load from the built-in phases AND the repo-local phases together.

## Review Output

- Summarize the fixes you applied and confirm the exit bar was met (zero
  lint and typecheck errors; no reviewed line still breaks a rule). The only
  list you may include is **verified false positives**, each with a one-line
  reason. Do NOT list "remaining findings" or "recommended follow-ups" that
  are real rule violations or validation errors left unfixed: every review
  fixes them all.
- Skip sections that are not relevant to the diff.
- If there are no findings, say that explicitly.
