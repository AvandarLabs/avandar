---
name: avandar-code-review
description: Use when reviewing Avandar code changes, pull requests, or local diffs for repo-specific TypeScript, SQL, naming, documentation, and immutability conventions.
metadata:
  author: jpsyx
  version: "1.7.0"
  tags: avandar, code-review, typescript, sql, conventions, style
---

# Avandar Code Review

Use this skill when reviewing Avandar code for convention violations. Apply the
general section to every review, then only apply the language-specific
checklists when those languages are present in the diff.

## Additional Checklist File

This skill ships with a template at
`skills/avandar-code-review/docs/code-reviews/extra-checklist.md`.

The actual repo-local checklist used during reviews lives at
`docs/code-reviews/extra-checklist.md`.

- Use the repo-local file as a second-pass checklist after finishing the
  built-in review rules in this skill.
- Only consult the repo-local file if it exists. If it does not exist, do
  nothing.
- Treat the repo-local file as a list of additional common mistakes that
  supplement this skill without replacing the main checklist.
- If the user says to add a new common mistake, says "remember this in the
  future", says "add this to common mistakes", or says "add this to my review
  checklist", create the repo-local file if needed and append the described
  issue there.
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
2. Review the common mistakes checklist below first.
3. Review the general checks in this file second.
4. Review the language-specific checklists next by referencing the supporting
   files in `skills/avandar-code-review/docs/code-reviews/`:
   `typescript-checklist.md` for TS or TSX diffs and `sql-checklist.md` for
   SQL diffs.
5. If `docs/code-reviews/extra-checklist.md` exists, review the diff against
   those additional repo-local mistakes after finishing the built-in
   checklists.
6. Follow the active review mode for how to handle each finding.
7. At the end of the review, run only the exact tests that are relevant to the
   code changes.
8. Report only concrete findings that are visible in the code under review.

In pair review mode, announce the phase explicitly as you move through the
review, for example: "Phase: common mistakes", "Phase: general checks",
"Phase: TypeScript checklist", "Phase: SQL checklist", or
"Phase: repo-local extra checklist".

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

- Never run the whole E2E suite for a code review.
- Run only the exact E2E specs related to the changed behavior.
- Run E2E specs one by one, sequentially, so each result is visible without
  waiting for the full set first.
- Prefer command shapes like `pnpm test:e2e spec-a.spec.ts` followed by
  `pnpm test:e2e spec-b.spec.ts` rather than batching many E2E specs together.

### Reviewing E2E Test Code

- When reviewing an E2E test itself, make sure the test does not bypass the
  end-to-end path by calling the database directly for behavior that should be
  exercised through the real product boundary.
- Direct database insertions are allowed only for test setup and seed data that
  must exist before the user flow starts, such as workspaces, users,
  memberships, and similar prerequisites.
- Do not use direct database writes for steps that are part of the user flow
  under test when that flow could fail at the application boundary, including
  auth, permissions, validation, and other request-handling behavior.
- Treat direct database writes in the middle of an E2E flow as a review
  finding, even when the test is not explicitly about permissions, because they
  can hide incorrect allow or deny behavior that the real flow should surface.

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
- Utility reuse: avoid hand-writing common utility or data-transformation logic
  when an internal package already provides it, especially in `@utils`. Common
  examples include property mapping, bucketing, partitions, object reshaping,
  filtering helpers, and lookup builders. For example, prefer
  `users.map(prop("id"))` over a custom mapper that only returns `user.id`.
  Reviewers should check `packages/shared/utils/README.md` for the available
  shared utilities.
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
- Prefer reusing internal packages under `packages/` over introducing bespoke
  local helpers when an equivalent shared abstraction already exists.
- When review comments suggest utility reuse, point engineers at
  `packages/shared/utils/README.md` to confirm whether `@utils` already has the
  needed helper.
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

## Language-Specific Checklists

Use these supporting files when the corresponding language appears in the diff:

- TypeScript or TSX: `skills/avandar-code-review/docs/code-reviews/typescript-checklist.md`
- SQL: `skills/avandar-code-review/docs/code-reviews/sql-checklist.md`

## Review Output

- In report mode, report findings first, ordered by severity, with file and
  line references, in a format that can be pasted into GitHub or Slack.
- In auto mode, summarize the fixes you applied, then list any remaining
  findings or follow-up items.
- In pair review mode, present one finding at a time with the recommended fix
  and wait for user approval before changing code.
- Skip sections that are not relevant to the diff.
- If there are no findings, say that explicitly.
