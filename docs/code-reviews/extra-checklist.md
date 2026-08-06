# Extra Checklist For `avandar-code-review` (Avandar Repo-Local)

This file is used by the `avandar-code-review` skill as its final phase.
It contains only rules that are specific to **this** repo (paths,
directory conventions, monorepo layout, etc.).

General TypeScript / React / CSS / hooks / module rules live in the
skill itself, under
`~/projects/avandar-agent-skills/skills/avandar-code-review/docs/code-reviews/`.

Library-specific rules for the `@avandar/*` packages also live in the
skill, under that same directory's `libraries/` subfolder. They are
auto-gated on whether the package is present in this repo's
`package.json`. In this repo, all three of `@avandar/utils`,
`@avandar/models`, and `@avandar/modules` are present, so every
library-gated phase should run.

## How to use this file

1. Inspect the diff and classify which **gates** below match.
2. For every gate that matches, apply the rules in that phase.
3. Skip any phase whose gate does not match.
4. In Pair Review mode, announce each phase before presenting its
   findings, for example: "Phase: repo-local Deno paths".

### This file is an entry point, not a single flat file

`extra-checklist.md` is the one file `avandar-code-review` opens for the
repo-local phase, but it is an **entry point**, not the whole repo-local
ruleset. A phase here may be written inline **or** delegated to a separate
ruleset file (kept under `docs/code-reviews/references/`). When a phase
points to another file, that file is its own phase: open it, apply its gate,
and run its rules just like an inline phase. Split a phase out to a
`references/` file whenever it grows long enough to hurt this file's
readability. There is no cap on how many phases or referenced rulesets the
repo can add; add as many as the codebase needs and they all run.

Because each declared phase and each referenced ruleset counts as a real
phase, they also feed the skill's sub-agent fan-out decision and each fans
out as its own find lane. So the number of phases below (inline **and**
referenced) is part of how the review sizes its sub-agent load, not just the
skill's built-in phases.

## Adding new rules

Before adding a rule here, ask whether it is truly avandar-repo-specific.
The rule belongs in the skill instead if:

- The rule applies to any TypeScript / React / CSS / SQL project →
  add to the relevant general checklist in the skill.
- The rule is tied to an installable `@avandar/*` package → add to
  the matching library checklist in the skill.

A rule belongs **here** when it mentions:

- A path that only exists in this repo (`supabase/functions/`,
  `shared/`, `packages/shared/`, `src/views/`, etc.).
- A directory layout convention that this repo enforces but a generic
  consumer of the skill might not.
- A repo-internal helper or pattern that has not been packaged.

When you add a new rule, include a short bad/good example whenever the
rule is non-obvious.

## Barrel-file allow-list (reference)

This is not a phase. The skill's TypeScript checklist already runs the
barrel-file check ("Do not add barrel files, except in repo-approved
directories documented by the repo-local checklist") and then consults
this list to decide whether a new `index.ts` is allowed.

In this repo, barrel files are approved **only** under `packages/`.
Every directory there belongs to a `@avandar/*` workspace package that
is published as a library, so a barrel `src/index.ts` is the package's
intended public entrypoint. A new `index.ts` anywhere outside
`packages/` (under `src/`, `shared/`, `supabase/functions/`, etc.) is a
finding.

Approved packages:

- `@avandar/ui` — `packages/web/ui/`
- `@avandar/hooks` — `packages/web/hooks/`
- `@avandar/clients` — `packages/shared/clients/`
- `@avandar/logger` — `packages/shared/logger/`
- `@avandar/utils` — `packages/shared/utils/`
- `@avandar/models` — `packages/shared/models/`
- `@avandar/modules` — `packages/shared/modules/`
- `@avandar/ava-etl` — `packages/node/ava-etl/`

## Phases

Run these **in order** after the skill's built-in checklists, and only
when the gate matches.

### Phase: Deno-reachable directories

- **Gate:** the diff modifies a `.ts` file under `supabase/functions/`,
  `shared/`, or `packages/shared/`. Skip if none of those directories
  are touched.
- **Rule:** in this repo, those three directories are the
  Deno-reachable code paths. Imports inside them must include explicit
  file extensions (`./foo.ts`, not `./foo`). This is the repo-specific
  expansion of the general "Deno-reachable code needs file extensions"
  rule in the skill's TypeScript checklist.

  **Find candidates** (relative imports that omit a file extension):

  ```bash
  grep -rEn 'from "(\.|\.\.)/[^"]+"' \
    supabase/functions/ shared/ packages/shared/ \
    --include="*.ts" \
    | grep -Ev '\.(ts|tsx|js|jsx|json|css)"$'
  ```

  Misses imports under path aliases (`@something/foo`) that resolve into
  Deno-reachable code. Spot-check alias imports in the diff by eye.

### Phase: model directory layout

- **Gate:** the diff touches any file under `shared/models/` or
  `src/models/`. Skip if neither is touched.
- **Rule:** new models go under one of those two roots:
  - `shared/models/` — models used by both the app (`src/`) and edge
    functions (`supabase/functions/`).
  - `src/models/` — app-only models.
    The `@avandar/models` library-gated phase in the skill covers the
    per-file structure inside a model folder (namespace entry, `.types.ts`,
    `Model.make` usage). This phase only enforces the choice of root
    directory.

### Phase: persisted-cache schema bumps

- **Gate:** the diff modifies a file under `shared/models/` or its
  `.types.ts` counterpart. Skip otherwise.
- **Rule:** if the change alters the _serialized shape_ of any model
  that gets returned from a React Query `queryFn`, bump
  `CACHE_SCHEMA_VERSION` in
  `src/components/providers/AvandarQueryClientProvider/queryPersister/queryPersister.ts`.
  Otherwise old persisted-cache blobs (still on disk in users'
  browsers from the previous release) will rehydrate against the new
  code and may crash or render wrong.

  **Bump required:**
  - Removing or renaming a field that downstream code now assumes is
    present.
  - Adding a _required_ field with no default.
  - Narrowing a type (e.g. `string` → string-literal union) so old
    values become invalid.
  - Renaming an enum value (e.g. `"active"` → `"ACTIVE"`).
  - Restructuring nesting (flattening, un-flattening, moving fields
    between sibling models).
  - Anything where running the new code against an old blob would
    throw or produce wrong output.

  **Bump NOT required:**
  - Adding an _optional_ field.
  - Widening a type (e.g. `string` → `string | null`).
  - Adding an entirely new model (old caches just don't have it).
  - Adding new methods, parsers, or namespace helpers that don't
    change the serialized shape.
  - JSDoc / comment / formatting changes.

  **Find candidates** (any model file in the diff):

  ```bash
  git diff --name-only <base>...HEAD -- 'shared/models/**/*.ts'
  ```

  For each hit, classify the change against the lists above before
  signing off. Bumping when not strictly required is safe but
  invalidates every user's persisted cache on next boot, so prefer to
  bump only when actually needed.

### Phase: fresh reads for permission and mutation-owned lists

- **Gate:** the diff adds or changes a `use…` query call that renders a
  permission or membership list (workspace members, user groups, role
  groups, resource shares), or any list the same screen also mutates.
  Skip otherwise.
- **Rule:** that call passes `useQueryOptions: ALWAYS_REFETCH_ON_MOUNT`
  from `src/config/queryOptions.constants.ts`. The React Query cache is persisted
  to IndexedDB and restored on boot, and the persister throttles its
  writes, so a reload shortly after a mutation can restore a
  pre-mutation snapshot. That snapshot is treated as **fresh** for the
  whole default `staleTime` window configured in
  `src/config/AvaQueryClient.ts`, so `refetchOnMount: true` never
  refetches it: the screen then shows the wrong access for that entire
  window with no way for the user to force a refresh. This was a real
  bug in the workspace user-groups screens.
- A control whose options come from such a query gates on
  **`isFetching`, not `isLoading`**. A restored cache renders
  immediately with `isLoading === false` while the mount refetch is
  still in flight, so an admin could otherwise save a member's groups
  from a list that is about to change under them.
- A row label resolved from such a lookup gates its render on the
  lookup instead of falling back to a placeholder. Where a fallback is
  genuinely needed, it must not duplicate a sibling badge or status
  label in the same row (the share modal used to render the literal
  "Owner" as a display name next to its Owner badge); reuse whatever
  last resort the sibling rows already use.

  **Find candidates:**

  ```bash
  grep -rEn 'useGetUserGroups|useGetUsersForWorkspace|useGetRoleGroups' \
    src --include="*.tsx"
  ```

  For each hit, confirm the call opts into `ALWAYS_REFETCH_ON_MOUNT`
  and that any dependent control and label follow the two rules above.

### Phase: AvaPage schema migrations

- **Gate:** the diff touches any file under
  `src/views/DashboardApp/AvaPage/migrations/`. Skip otherwise.
- **Reference:** this phase's rules live in
  [`references/avapage-schema-migrations.md`](references/avapage-schema-migrations.md).
  Open it and run it as its own phase.
- **Why it is split out:** it carries a review _method_ (establish the
  current schema version and read a module's full, adjacent header rules
  before flagging a "frozen snapshot / no live imports" violation) that a
  past review got wrong, mis-flagging the current-version migration's
  intended `V<N>_VizConfig = VizConfig` alias as a bug. The detail belongs in
  its own file rather than bloating this entry point.

### Phase: utils package reference

- **Gate:** the diff would benefit from a `@avandar/utils` helper but
  uses a hand-rolled version instead. Skip if no such opportunity is
  visible.
- **Rule:** in this repo, the canonical list of available `@avandar/utils`
  helpers lives at `packages/shared/utils/README.md`. Point engineers
  to that file in review comments when recommending a helper. The
  general "utility reuse" principle is covered by the skill; this
  phase just records the in-repo README path.

### Phase: Supabase session `null` normalization

- **Gate:** the diff introduces a `null` (a `| null` type, a `= null`
  initializer, or a `return null`) on a value derived from a Supabase
  auth/session call (`refreshSession`, `getSession`, `getUser`, etc.).
  Skip if no such `null` is introduced.
- **Rule:** the skill's general `null`-vs-`undefined` rule applies (own
  signatures use `undefined`; normalize external `null` at the boundary
  with `?? undefined`). This phase records the in-repo specifics:
  - The canonical normalization pattern lives in
    `src/clients/AuthClient.ts` — `getCurrentSession` returns
    `Promise<Session | undefined>` and does `return data.session ??
undefined`. New code that wraps a Supabase session call should follow
    that shape rather than propagating `Session | null` outward.
  - The **one** place `null` is legitimate is the `onAuthStateChange`
    callback parameter (`(event, session: Session | null) => ...`), whose
    type Supabase dictates. Keep `null` there; normalize everywhere else.

  This is bad (our own module owns these signatures, so they should be
  `undefined`):

  ```ts
  let onSessionExpired: (() => void) | null = null;

  async function doRefresh(): Promise<Session | null> {
    const { data } = await AvaSupabase.db().auth.refreshSession();
    return data.session;
  }
  ```

  This is good:

  ```ts
  let onSessionExpired: (() => void) | undefined = undefined;

  async function doRefresh(): Promise<Session | undefined> {
    const { data } = await AvaSupabase.db().auth.refreshSession();
    return data.session ?? undefined;
  }
  ```

### Phase: E2E tests (Playwright)

- **Gate:** the diff includes any file under `tests/e2e/` (specs,
  fixtures, or helpers). Skip this phase if no E2E file is touched.
- **Reference:** this phase's rules live in
  [`references/e2e-tests.md`](references/e2e-tests.md). Open it and run it
  as its own phase.
- **Why it is split out:** the E2E ruleset is large (running specs, UI vs
  direct-DB writes, client-side navigation, minimal seeding, resilient
  controlled-input sets, the large-parse fresh-browser policy, cleanup, and
  timeouts) and was bloating this entry point.

### Phase: internationalization (Lingui)

- **Gate:** the diff includes a frontend `.ts` or `.tsx` file under `src/`
  (or `packages/web/`).
- This repo renders user-facing copy through Lingui. All displayable,
  user-facing text must be translated. Flag any bare user-facing string
  literal:
  - JSX text nodes.
  - String props that render to the user: `label`, `placeholder`, `title`,
    `description`, `aria-label`, `alt`, button/menu text, `Tooltip` labels,
    empty-state text, user-visible table headers.
  - Toast / notification messages (`notifySuccess`, `notifyError`,
    `notifyWarning`) and error messages rendered in the UI.
- Do NOT flag non-display strings: `console.*` / `logger.*`, `notifyDevAlert`,
  unrendered `throw new Error(...)`, test IDs, enum/key values, route paths,
  SQL, DuckDB option tokens, class/style values.
- **React components/hooks:** translate with the macros from
  `@lingui/react/macro`, `<Trans>…</Trans>` in JSX or `t` from `useLingui()`
  for strings built in code. Interpolation: `` t`Import failed: ${reason}` ``.
- **Non-component modules** (plain `.ts` clients/services, no `t` hook):
  prefer returning structured data and translating at the display component.
  When copy is emitted imperatively from background code with no component in
  the call path (e.g. a fire-and-forget toast), use the Lingui core API
  `i18n._(msg\`…\`)` (`i18n`from`@lingui/core`, `msg`from`@lingui/core/macro`). Never the deprecated `t(i18n)\`…\`` binding.

- **Never pass the translation function as a parameter (extraction bug).**
  `lingui extract` only sees a macro (`` t`…` ``, `` msg`…` ``, `<Trans>`) when
  the macro identifier is bound in the same lexical scope. A `t` (or any
  tagged-template translate fn) passed into another function and called there is
  a runtime value the extractor cannot follow, so those strings never reach the
  catalogs and stay untranslated in every non-English locale (English still
  renders, which hides it). Flag:
  - a parameter typed `ReturnType<typeof useLingui>["t"]`, a local
    `type TranslateFn = …`, or a parameter named `t` / `translate` /
    `translateFn` that is called as a tagged template inside the function;
  - a call site that threads the macro `t` into a helper: `buildX(…, t)`.

  Correct instead: call `` t`…` `` directly in the component/hook where `t` came
  from `useLingui()`, or thread `i18n` (not `t`) and resolve `` msg`…` `` with
  `i18n._(…)`. See [`docs/rules/i18n.md`](../rules/i18n.md). Confirm a suspected
  miss by running `pnpm i18n:extract` and checking the file is referenced in
  `src/i18n/locales/en/messages.po`.

  **Find candidates:**

  ```bash
  grep -rEn '(label|placeholder|title|aria-label|description)=("[A-Z]|\{"[A-Z])' \
    --include="*.tsx" src
  grep -rEn 'notify(Success|Error|Warning)\(\s*"' src
  # translation function passed as a parameter (the extraction bug):
  grep -rEn 'TranslateFn|ReturnType<typeof useLingui>\["t"\]' \
    --include="*.ts" --include="*.tsx" src
  ```
