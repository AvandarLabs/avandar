---
name: avandar-code-review
description: Use when reviewing Avandar code changes, pull requests, or local diffs for repo-specific TypeScript, React, SQL, naming, documentation, and immutability conventions.
metadata:
  author: jpsyx
  version: "2.0.0"
  tags: avandar, code-review, typescript, react, sql, conventions, style
---

# Avandar Code Review

Use this skill when reviewing Avandar code for convention violations. Run
the common-mistakes and general-checks sections on every review, then
only apply the language-specific and library-gated phases when the diff
matches their gate.

## Additional Checklist File

This skill ships with a template at
`skills/avandar-code-review/docs/code-reviews/extra-checklist.md`.

The actual repo-local checklist used during reviews lives at
`docs/code-reviews/extra-checklist.md` in the repo under review.

- Use the repo-local file as a final phase after finishing the built-in
  phases in this skill.
- Only consult the repo-local file if it exists. If it does not exist, do
  nothing.
- Treat the repo-local file as additional repo-specific rules that
  supplement this skill without replacing the main checklists.
- If the user says to add a new common mistake, says "remember this in the
  future", says "add this to common mistakes", or says "add this to my
  review checklist":
  - If the rule is **general** (applies to any TypeScript / React / CSS
    project), the rule belongs in this skill. Add it to the appropriate
    sub-checklist under
    `skills/avandar-code-review/docs/code-reviews/` and update the phase
    list in this file if it warrants a new phase.
  - If the rule is **library-specific** (tied to one of the
    `@avandar/*` packages or another installable package), add it to the
    matching file under `docs/code-reviews/libraries/` in this skill, or
    create a new library-gated phase there.
  - If the rule is **repo-specific** (mentions paths or conventions
    unique to one codebase), add it to the repo-local
    `docs/code-reviews/extra-checklist.md`.
- When creating the repo-local file for the first time, use the packaged
  template from this skill as the starting structure.

## Asking The User

When this skill says "prompt with options", use the host agent's interactive
menu tool if one is available, otherwise fall back to a plain-text question.
Never error out because a menu tool is missing — just ask in chat.

- Claude Code: call `AskUserQuestion` with the listed options.
- Codex CLI or any other host without an interactive menu tool: write the
  options as a numbered list in chat and wait for the user's reply.
- If you are unsure whether a menu tool exists in the current host, default to
  the plain-text fallback rather than guessing.

## Review Modes

If the mode is not specified in the prompt, prompt with options before any
review work:

- Question: "Which review mode?"
- Header (Claude Code only): "Review mode"
- Options:
  - `Report` — write a paste-ready review, no edits
  - `Auto` — fix violations as you find them
  - `Pair Review` — discuss each finding before editing

Do not default silently.

### Report Mode

Goal: a copy-pasteable review for GitHub, Slack, or another discussion surface.

- Do not modify code.
- Collect findings; report them ordered by severity with file and line refs.
- Keep output concise, concrete, and ready to paste externally.

### Auto Mode

Goal: agent acts as reviewer and fixer.

- Fix rule violations as you find them when the change is clear and local.
- Stay inside the requested review scope. No opportunistic cleanup or
  unrelated refactors.
- Continue reviewing after each fix until the checklist is exhausted.
- Run relevant validation (typecheck, lint, targeted tests). Report anything
  you could not verify.
- End with a summary of fixes plus any ambiguous, risky, or out-of-scope
  findings.

### Pair Review Mode

Goal: interactive review, user approves direction before edits.

- Announce the current review phase before presenting its findings.
- Review iteratively, one finding at a time.
- For each finding: explain the issue, recommend a fix, then prompt with
  options (see "Asking The User"):
  - Question: "Apply the recommended fix?"
  - Header (Claude Code only): "Apply fix?"
  - Options:
    - `Yes` — apply the recommended fix
    - `No` — skip this finding and move on
    - `Let's chat about this` — wait for the user's next message before
      proceeding. Omit this option when the host provides an interactive
      menu tool with a built-in free-text input (for example, Claude Code's
      `AskUserQuestion`, which already exposes a "Type something" field).
- Do not edit code for a finding until the user picks `Yes`.
- If the user types a free-text reply instead of picking an option (either
  via the host's built-in text input or via `Let's chat about this` when
  that option is offered), stop and wait for input. Do not move on to the
  next finding until the discussion resolves.
- Stay inside the requested review scope.
- After resolving one finding, continue to the next until the review is done.

## Review Order

1. If the mode was not specified, prompt for it at the very start (see
   "Review Modes" for the interactive menu spec).
2. Review the **Most Common Mistakes** section in this file first.
3. Review the **General Checks** section in this file second.
4. Run each **language-specific phase** in the order listed under "Phase
   Checklists" below, but only when that phase's gate matches the diff.
5. Run each **library-gated phase** under "Library-Gated Phases" below,
   gated on whether the package is present in the repo. Skip the phase
   entirely if the package is absent.
6. If `docs/code-reviews/extra-checklist.md` exists in the repo, run it
   as the final repo-local phase.
7. Follow the active review mode for how to handle each finding.
8. At the end of the review, run only the exact tests that are relevant to
   the code changes.
9. Report only concrete findings that are visible in the code under review.

In pair review mode, announce the phase explicitly as you move through the
review, for example: "Phase: comments", "Phase: TypeScript",
"Phase: functional style", "Phase: `@avandar/utils`",
"Phase: repo-local extra checklist".

**Skipping phases is the rule, not the exception.** A diff that only
touches SQL should not load the TypeScript, React, hooks, CSS, or any
library-gated phase. Loading a phase file you will not use is wasted
context.

## Testing At The End Of Review

After completing the review, run the narrowest relevant tests you can identify.

- Do not run the full suite by default.
- Do not use broad commands like `pnpm test` without specific test-file
  arguments.
- Prefer passing explicit test file names so only the changed areas are tested.
- Run typecheck and lint when relevant, but keep test execution targeted.
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
phase that covers both how to run E2E specs and how to review E2E
test code. If the extra-checklist.md does not contain E2E-specific
instructions, then follow the same guidelines applied to Vitest and Unit
tests, such as only narrowly running the relevant tests instead of the
full test suite.

## Most Common Mistakes

Check these first because they are the most frequent review findings:

- Functional style: avoid `for` and `while` loops. Prefer functional and
  declarative collection utilities such as `map`, `filter`, `reduce`, and
  `forEach`.
  - Exceptions: 1) char-by-char for loops on strings; 2) loops that implement
    exit-early break logic to improve performance
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
  logic when an internal package or installed library already provides it.
  Common examples include property mapping, bucketing, partitions, object
  reshaping, filtering helpers, and lookup builders. Before introducing a
  bespoke helper, check the repo's first-party utility packages and
  imported libraries for an existing equivalent. If the repo depends on
  `@avandar/utils`, see the library phase under
  `libraries/avandar-utils-checklist.md` for specific helpers worth
  preferring.
- Variable naming: avoid vague names like `matrix`, `count`, `next`, `prev`,
  `val`, or `n`. Use a business noun that explains what the value represents,
  such as `rolesMatrix`, `numUsers`, or `nextVizConfig`. The one acceptable
  short form is `idx` for functional-programming array indices.
- Planning comments: if comments mention future work, do not refer to internal
  "phases". Write in present/future terms that make sense to any engineer, such
  as "For now..." and "Soon..." instead.

## General Checks

- Comments should not use em dashes. Prefer a colon or a hyphen.
- Exported or public interfaces, constants, objects, functions, and classes
  should have block comments or docstrings.
- Functions should stay short, ideally 45 lines or fewer.
- If a function is getting too long or contains reusable logic, extract a
  utility function.
- Follow normal language naming conventions for the file's language.
- Variable names should be descriptive, including auxiliary verbs when useful,
  such as `isLoading` or `hasError`.
- Avoid abbreviations unless the full word would create a naming collision.
  For example, prefer `value` over `val`.
- Avoid vague placeholders like `next`, `prev`, or `n` without a business noun.
- Builder functions should use `create{Type}` naming.
- Functions that create a type from seed data should use `create{Type}From...`.
- Conversion or cast helpers should use `to...` naming.
- Prefer reusing existing internal libraries or first-party packages over
  introducing bespoke local helpers when an equivalent shared abstraction
  already exists.
- If the code touches generated `*.gen.*` files, flag manual edits unless the
  change is clearly generated.
- For UI code: keep accessibility strong with native semantics and ARIA where
  needed.
- For UI code: prefer Mantine theme tokens and shorthand props instead of ad
  hoc styling.
- For UI code: prefer CSS Modules over inline `style={}` or `styles={}` unless
  the styles are dynamically computed.
- For UI code: use `clsx` for conditional classes.
- For UI code: never introduce TailwindCSS.

## Phase Checklists

Run each phase below only when its gate matches the diff. Phase files
live under `skills/avandar-code-review/docs/code-reviews/` next to this
SKILL file.

### Phase: comments

- **Gate:** the diff includes any source file that supports both
  `/** ... */` and `//` comments (TypeScript, TSX, JavaScript, JSX, most
  C-family languages).
- **Reference:**
  [`docs/code-reviews/comments-checklist.md`](docs/code-reviews/comments-checklist.md)

### Phase: TypeScript

- **Gate:** the diff includes at least one `.ts` or `.tsx` file.
- **Reference:**
  [`docs/code-reviews/typescript-checklist.md`](docs/code-reviews/typescript-checklist.md)

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

## Library-Gated Phases

Each phase below applies only when the named package is present in the
repo under review. Check `package.json` (or each `package.json` in a
monorepo) for the dependency, OR grep for imports of the package, OR
look for calls to the package's signature APIs (named below per phase).
If the package is absent, skip the entire phase — do not even load the
sub-checklist file.

### Phase: `@avandar/utils`

- **Gate:** repo depends on `@avandar/utils`, or source files import from
  `@avandar/utils` / `@utils`, or the diff references `prop` / `propEq` /
  `matchLiteral` / `isDefined` / `isNonNullish` from this package.
- **Reference:**
  [`docs/code-reviews/libraries/avandar-utils-checklist.md`](docs/code-reviews/libraries/avandar-utils-checklist.md)
- **Covers:** preferring `prop` / `propEq` over inline lambdas;
  exhaustive union dispatch via `matchLiteral` (or `ts-pattern`'s
  `match().exhaustive()` when available); reusing helpers from the
  `@avandar/utils` README instead of hand-rolling them.

### Phase: `@avandar/models`

- **Gate:** repo depends on `@avandar/models`, or source files import
  from `@avandar/models` / `@models`, or the diff calls `Model.make` or
  imports from a `*.types.ts` file that is paired with a `*.ts`
  namespace entry.
- **Reference:**
  [`docs/code-reviews/libraries/avandar-models-checklist.md`](docs/code-reviews/libraries/avandar-models-checklist.md)
- **Covers:** using `Model.make("ModelName", { ... })` instead of bare
  object literals; importing the namespace entry rather than
  `*.types.ts` from outside the model's own folder.

### Phase: `@avandar/modules`

- **Gate:** repo depends on `@avandar/modules`, or source files import
  from `@avandar/modules` / `@modules`, or the diff calls `createModule`.
- **Reference:**
  [`docs/code-reviews/libraries/avandar-modules-checklist.md`](docs/code-reviews/libraries/avandar-modules-checklist.md)
- **Covers:** grouping related free functions into a `createModule(...)`
  module when they share a domain or storage backend.

## Repo-Local Phase

### Phase: repo-local extra checklist

- **Gate:** the file `docs/code-reviews/extra-checklist.md` exists in the
  repo under review.
- **Reference:** open the file directly; it lists its own gates and any
  further sub-checklists in `docs/code-reviews/references/` (or similar).
- This is the final phase, always run last, and may add or override
  rules for the specific repo. It is the only legitimate place for
  rules that mention repo-internal paths.

## Review Output

- In report mode, report findings first, ordered by severity, with file and
  line references, in a format that can be pasted into GitHub or Slack.
- In auto mode, summarize the fixes you applied, then list any remaining
  findings or follow-up items.
- In pair review mode, present one finding at a time with the recommended fix
  and wait for user approval before changing code.
- Skip sections that are not relevant to the diff.
- If there are no findings, say that explicitly.
