---
name: avandar-code-review
description: Use when reviewing Avandar code changes, pull requests, or local diffs for repo-specific TypeScript, SQL, naming, documentation, and immutability conventions.
metadata:
  author: jpsyx
  version: "1.4.0"
  tags: avandar, code-review, typescript, sql, conventions, style
---

# Avandar Code Review

Use this skill when reviewing Avandar code for convention violations. Apply the
general section to every review, then only apply the TypeScript and SQL
sections when those languages are present in the diff.

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

## Review Modes

Before doing any review work, explicitly ask which review mode the user wants
to use unless they already specified one in the prompt. Do not default
silently.

### Report Mode

Use this when the goal is a copy-pasteable review for GitHub, Slack, or another
discussion surface.

- Do not modify code.
- Review the diff, collect findings, and report them in a clean written review.
- Keep the output ready to paste externally: concise, concrete, and organized
  by severity with file and line references.

### Auto Mode

Use this when the agent should act as reviewer and fixer.

- As soon as you find a rule violation, fix it yourself when the correct change
  is clear and local.
- Only fix issues inside the requested review scope. Do not do opportunistic
  cleanup, unrelated refactors, or out-of-scope improvements.
- Continue reviewing after each fix until you exhaust the checklist.
- Run the relevant validation for the changes you made, especially typecheck,
  lint, and targeted tests, and report anything you could not verify.
- At the end, summarize what you changed and call out any remaining findings
  that were ambiguous, risky, or outside the requested scope.

### Pair Review Mode

Use this when the user wants to review interactively and approve each change
direction before edits happen.

- Review iteratively, one finding at a time.
- For each finding, explain the issue, recommend a fix, and ask the user
  whether to apply that fix or do something else.
- Do not edit code for a finding until the user approves the direction.
- Keep the discussion inside the requested review scope rather than expanding
  into unrelated cleanup.
- After resolving one finding, continue to the next until the review is done.

## Review Order

1. If the mode was not specified, ask the user at the very start whether they
   want report mode, auto mode, or pair review mode.
2. Start with the common mistakes checklist below.
3. Apply the general checklist.
4. Apply the TypeScript checklist when the diff includes TS or TSX.
5. Apply the SQL checklist when the diff includes SQL.
6. If `docs/code-reviews/extra-checklist.md` exists, review the diff against
   those additional mistakes too.
7. Follow the active review mode for how to handle each finding.
8. At the end of the review, run only the exact tests that are relevant to the
   code changes.
9. Report only concrete findings that are visible in the code under review.

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

## Most Common Mistakes

Check these first because they are the most frequent review findings:

- Functional style: avoid `for` and `while` loops. Prefer functional and
  declarative collection utilities such as `map`, `filter`, `reduce`, and
  `forEach`.
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
- Functions should stay short, ideally 40 lines or fewer.
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

## TypeScript Checks

- In Deno-reachable code, imports must include file extensions. This especially
  applies to `supabase/functions/`, `shared/`, and `packages/shared/`.
- Use JSDoc for public classes and methods.
- Prefer functional and declarative programming.
- Avoid classes and imperative patterns unless a real constraint requires them.
- Prefer higher-order functions over manual loops.
- Use named exports instead of default exports.
- Keep comment and docstring lines at 80 characters or fewer.
- If a docstring fits on one line within 80 characters, keep it single-line.
- Never use single-line `if` statements: always keep braces.
- Prefer string interpolation over string concatenation.
- Use PascalCase for React components, classes, singleton instances, and module
  objects.
- Use camelCase for variables, functions, and methods.
- Use UPPERCASE for environment variables and hard-coded constants.
- Event handlers should be named `on...`, not `handle...`.
- Non-exported top-level helper functions should be prefixed with `_`.
- React component prop types should always be named `Props`.
- Preserve `e2e` or `E2E` casing exactly; do not invent mixed variants.
- Never use `any`.
- Use `as const` for literals that never change.
- Prefer `type` over `interface`, except for class-style OOP interfaces.
- Prefer `undefined` over `null` unless an API or framework requires `null`.
- Prefer string literal unions over enums.
- Reuse composite types when they are genuinely shared.
- Avoid extracting one-off type aliases unless the type is reused. `Props` is
  the explicit exception.
- If an object shape has 4 or more properties, extract it to a named type for
  readability.
- Add explicit types at module boundaries, top-level declarations, and function
  parameters. Avoid unnecessary annotations for local variables and inline
  callbacks.
- Prefer default parameter values over nullish guard logic.
- Use RO-RO for multiple parameters and multiple return values.
- If a function takes only one parameter, do not wrap it in an object.
- When using an object parameter, prefer the name `options` unless `params` or
  `config` is more accurate.
- Keep small object parameter types inline. Only extract them when reused.
- Top-level functions should use the `function` keyword.
- Nested functions and object methods should use arrow functions.
- Type imports and type exports should always use the `type` keyword.
- If a module grows beyond one file, prefer a directory module layout instead
  of cramming everything into a single file.
- Do not add barrel files, except approved `index.ts` files in `packages/`.
- Do not use namespace exports such as `export * from`.
- All exported classes, objects, and functions need docstrings.
- If an exported object defines top-level methods inline, those methods need
  docstrings too.
- Follow input contravariance and output covariance: readonly at module
  boundaries for inputs, mutable outputs for callers.
- Apply readonly wrappers to function parameters, not to local variables,
  internal helpers, or return types.
- Prefer mutable local variables and intermediate values.
- If a function intentionally mutates its input, the name should make the
  mutation obvious, and returning `void` is usually the clearest contract.

## SQL Checks

- Use `snake_case` consistently.
- Table names should be plural.
- SQL function names should be namespace-prefixed.
- Use `util__*` for shared utility functions.
- Use `table_name__*` for table-specific functions.
- Trigger names should follow `tr__table_name__*`.

## Review Output

- In report mode, report findings first, ordered by severity, with file and
  line references, in a format that can be pasted into GitHub or Slack.
- In auto mode, summarize the fixes you applied, then list any remaining
  findings or follow-up items.
- In pair review mode, present one finding at a time with the recommended fix
  and wait for user approval before changing code.
- Skip sections that are not relevant to the diff.
- If there are no findings, say that explicitly.
