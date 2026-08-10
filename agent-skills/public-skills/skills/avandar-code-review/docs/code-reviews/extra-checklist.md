# Extra Checklist For `avandar-code-review`

This document is intended to be used with the `avandar-code-review` skill.

It is the place for repo-specific or business-specific review checks that
do not belong in the public skill. After finishing the skill's built-in
checklist, the agent should also review code against the items in this file
when it exists.

Whenever a user says to add a new common mistake, or says to "remember this in
the future", append the new mistake to this document only when the rule is
specific to the current repo. General rules belong in the public skill.

## Deno-reachable directories

These are the directories `deno check` covers (see `scripts/tsc-watch.sh`):

- `shared/`
- `supabase/functions/`
- `packages/shared/`

Use this list for the TypeScript checklist's file-extension rule.

## Import conventions

Three specifier styles coexist on purpose. Flag a mismatch, not the mere
presence of any one of them.

- **Outside `packages/`** (`src/`, `shared/`, `apps/`, `supabase/functions/`,
  `tests/`, `scripts/`, `seed/`): import our libraries by their published
  package name, `@avandar/utils`, `@avandar/models`, and so on. No file
  extension. Flag any new `@utils/...`-style alias import here.
- **Inside a package**: a package imports its own files through its short
  alias with an extension (`@utils/objects/prop/prop.ts` inside
  `packages/shared/utils`), and imports a sibling package by package name
  (`@avandar/logger`). Flag a package that reaches into another package's
  internals, e.g. `@logger/createWebLogger/createWebLogger.ts`.
- **Deep imports into a package from outside it are always wrong.** Each
  package publishes only its barrel plus a few declared subpaths
  (`@avandar/utils/encoding`, `@avandar/utils/sql`, `@avandar/utils/zod`,
  `@avandar/models/zod`, `@avandar/ui/hooks`). Anything else does not
  resolve for a published consumer. If a needed symbol is missing from the
  barrel, the fix is to export it from the barrel, not to deep-import.

`@/` (app `src/`) and `$/` (repo `shared/`) are unrelated to the above and
keep their `.ts` extensions in Deno-reachable code.

Only these five packages are mapped in the `deno.json` import maps and may
be imported from Deno-reachable code: `@avandar/clients`, `@avandar/logger`,
`@avandar/models`, `@avandar/modules`, `@avandar/utils`. The others
(`etl`, `query-hooks`, `browser-utils`, `hooks`, `ui`) are Node- or
browser-only; ESLint's `no-restricted-imports` already blocks them there.

Adding a new declared subpath to a package means updating every
`deno.json` (root, each `supabase/functions/*/`, and the
`newEdgeFunction` template): Deno needs an exact entry per subpath,
because a trailing-slash prefix map resolves to a directory it cannot load.

## Additional Mistakes

- Add new items here as they come up.
