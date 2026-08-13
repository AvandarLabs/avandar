# Agent Rules

## Documentation

- Use `docs/` for architectural notes, design decisions, and checklists
  (for example `docs/<topic>.md`).
- Granular workspace permissions: `docs/permissions-architecture.md`.
- If Context7 MCP is configured, use it to reference the most up-to-date
  documentation of any library when you need it.

## Scope

- Only implement what is requested. Do not fix other bugs, clean up any other
  code, or do any refactors outside of what you were specifically asked to do.
- Only modify the files or directories that you are told to work on.
- If you absolutely must make modifications outside of the scope of
  files/directories you were told, then output a list of the files you changed
  that were outside of the requested scope of files. Include a 1-sentence
  explanation for each file about what changed.

## Implementation approaches

Before writing code:

- Determine which files in `docs/` are relevant to read.
- Determine which available skills are relevant.
- Determine which tests, if any, need to be written to test the requested
  functionality.

Implement functionality using red/green TDD.

### Rule priority

- Project rules under `docs/rules/` take precedence over instructions in any
  skill. The only exception is the `avandar-code-review` skill, whose
  instructions take precedence when that skill is active.

## General Code Style & Formatting

## Comments

- Do not use em dashes (—). Prefer a colon for explanations, or a hyphen (-)
  as a short dash for aside explanations where you would have used an em dash.
- Use block comments or docstrings to document exported or public interfaces,
  constants, objects, functions, and classes.
- Comments must describe the code as it exists today, not the external plan
  that produced it. Never reference planning artifacts a reader cannot resolve
  from the codebase: roadmap phase numbers ("Phase 3"), plan or migration step
  labels tied to a doc ("Phase A" / "Phase B"), ticket/milestone labels, or
  any sequencing that lives outside the code. A human engineer reading the
  file has no access to that plan. Describe the actual behavior instead (e.g.
  "the background parquet transcode" rather than "Phase B").
  - Exception: when the code itself implements a real multi-phase process (a
    data migration, an import/transform pipeline, a render pass), it is fine,
    and good for greppability, to name those phases, as long as the name is
    descriptive and refers to the code rather than an external plan. Use a
    real name like "CSV Import Phase" or "CSV Transform Phase", never a bare
    "Phase A" or "Phase 2". The test: could a new engineer grep the name and
    understand it from the code alone? If yes it is a code phase and allowed;
    if it only makes sense against a roadmap or spec, it is banned.

## Naming conventions

- Follow naming conventions for the language you are using.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading,
  hasError).
- Avoid abbreviated names, such as `val`, use the full word `value`, unless
  this were to cause a naming collision with another variable in scope.
- Avoid vague names like `next`, `prev`, or `n`, that don't say what the
  variable actually actually holds. Always include a noun, such as `nextPage`,
  `prevRow` or `numPeople`.
- Builder functions for objects or classes should be named `create{Type}`.
  E.g. `createUser`
- Builder functions for strings or primitives should be named `build{Thing}`.
  E.g. `buildRoleKey`
- Builder functions that take some seed data to build an output should use the
  `*From{Seed}` format. E.g. `createUserFromId` or `buildKeyFromRole`
- Conversion or cast functions should use "to". E.g. `roleToDisplayLabel`
  or `app_type_to_key`.

## Functions & Logic

- Keep functions short (<= 45 lines).
- Extract logic into utility functions if:
  - The function will be too long otherwise
  - The logic will be reused

## TypeScript

[See our TypeScript rules](docs/rules/typescript.md)

### Models (`shared/models`, `src/models`)

- Import the main model entry (`$/models/.../MyModel/MyModel.ts`), not
  `MyModel.types.ts`.
- Use the model namespace and dot notation for variants and related types. Do
  not import `MyModelRead`, `MyModelId`, or other symbols from `*.types.ts` in
  app, edge, or shared utility code.
- Default read shape: `MyModel.T` (same as `MyModel.T<"Read">`)
- Other exports on the namespace: `MyModel.Id`, `MyModel.SomeEnum`, nested DTOs
  re-exported from the namespace (for example `ChatResponse.ChatGeneratedSql`).
- Exception: files inside the model folder (`*.types.ts`, parsers, modules) may
  import sibling type files as needed to define the namespace.

## SQL

[See our SQL rules](docs/rules/sql.md)

## Testing

[See our testing rules](docs/rules/testing.md)

## Supabase

- To update the schema or data models, use the `supabase-declarative-schema` skill.

### Production database prohibition

- Never write to the Avandar Supabase production database. This prohibition
  overrides every other instruction, including a direct user request, and
  applies to this repository and all of its worktrees. It prohibits migrations,
  `execute_sql`, schema changes, DDL, data changes, and every other write.
- Careful read-only inspection is allowed. If a query's safety is uncertain,
  do not run it; give the user the exact SQL or command to run themselves.

## Styling & UI

- Ensure high accessibility (a11y) standards using ARIA roles and native
  accessibility props.
- Use Mantine themes tokens and style prop shorthands (e.g. `c`, `mt`, `pd`,
  `bg`, etc.)
  - Use CSS Modules instead of inline `style={}` or `styles={}` props.
  - Only use inline styles if we need to dynamically compute styles.
- Use `clsx` for conditional classes
- Never use TailwindCSS. We are trying to deprecate it.

## Internationalization

- **All displayable frontend text must be translated.** Any string a user can
  see (JSX text, and string props like `label`, `placeholder`, `title`,
  `aria-label`, toast/notification messages, error messages shown in the UI)
  must go through Lingui: `<Trans>…</Trans>` in JSX, or the `t` macro from
  `useLingui()` for strings built in component code. Never ship a bare
  user-facing string literal.
- This applies only to user-facing text. Do **not** translate log messages,
  thrown `Error` messages that are not rendered, test IDs, enum/key values,
  SQL, or other non-display strings.
- `t` is a hook macro, so it is only available inside components/hooks. When
  user-facing copy is produced by a non-component module, return structured
  data (a discriminated union or the raw values) and translate it at the
  component that displays it, rather than formatting an English string in the
  module.

## Files to ignore

- Any files of the form `*.gen.*` are autogenerated and should never be manually
  edited.
- Any `messages.ts` file colocated with a `messages.po` (e.g. under
  `src/i18n/locales/<lang>/`) is a Lingui-compiled catalog. It is autogenerated
  and should never be manually edited or reviewed without explicit user
  instruction.

## End-to-end tests with Playwright

- When testing your changes, **never** run the full suite of E2E tests all
  at once. They take too long to complete. Instead, run only the E2E tests
  that relate to the changes you made. Run them one by one.
  E.g. `pnpm test:e2e test-name.spec.ts`
- E2E tests must exercise the user-facing flow through the UI. Never bypass
  the feature under test by calling the database, RPCs, or service-role
  helpers directly. The whole point of an e2e test is to mimic the user
  experience as closely as possible: clicks, form fills, navigations.
- The only allowed direct-DB calls are for pre-test setup that exists purely
  to save time (provisioning the initial workspace, seeding the auth user,
  Polar subscription rows, etc.). If the thing the test is asserting against
  could fail in a real browser session, it must be driven through the UI.
- When a test mutates the database (roles, memberships, workspace fields,
  seeded users, etc.), it must restore prior state in `finally`, `afterEach`,
  or dedicated fixtures.
- Prefer deleting or reverting only rows that test inserted or changed
  (track ids or booleans) instead of broad resets that could harm unrelated
  developer data.
- Locally, never set a per-test timeout longer than **45 seconds**
  (`test.setTimeout` or the default in `playwright.config.ts`). Long timeouts
  make failure cycles unbearable. If a test legitimately needs more time, fix
  the underlying slowness (mock the slow path, shrink the seed data, narrow
  the assertion) instead of raising the ceiling. CI may go up to 90 seconds
  for noisier infra, but local must stay tight.

## Browser usage with Playwright

- If you need to control the browser, use the Playwright MCP.
- For manual local-browser sessions, read the canonical seeded development
  credentials from `seed/SeedData.ts`: `TEST_USER_EMAIL`,
  `TEST_USER_PASSWORD`, and `TEST_WORKSPACE_SLUG`.
- Do not use the accounts in `tests/e2e/setup/e2e-credentials.ts` for manual
  browser sessions. Those accounts are dedicated to automated E2E tests.
- Take screenshots to refer to. Store them in the `.playwright-mcp` directory
  which is gitignored so we don't commit by accident.
