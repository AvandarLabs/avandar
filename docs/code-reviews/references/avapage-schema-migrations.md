# Ruleset: AvaPage schema migrations (Avandar repo-local)

Referenced as a phase from `docs/code-reviews/extra-checklist.md`. Applies
only when the gate below matches; otherwise skip this whole file.

- **Gate:** the diff touches any file under
  `src/views/DashboardApp/AvaPage/migrations/`.

The AvaPage dashboard data is versioned. Each
`AvaPageDataMigrationV<N>/` module upgrades data from `V<N-1>` to `V<N>`
(and downgrades back). Reviewing this code wrong is easy, so this ruleset
encodes both the rules and the review _method_ that a past review got wrong.

## The method: establish the version before judging a "snapshot" rule

Before flagging anything about frozen/snapshot types or "this migration
imports live app types," you MUST first do all of the following. Skipping
any step is how a correct pattern gets mis-flagged as a bug.

1. **Find the current schema version.** Read `CURRENT_SCHEMA_VERSION` in
   `shared/models/Dashboard/DashboardConfig/constants.ts`. Read the
   `SCHEMA_VERSION` constant in the migration module you are reviewing. The
   module is the **latest** migration iff those two numbers are equal.
2. **Read the migration module's own header rules in full**, including any
   rule that _scopes_ another rule. Each
   `AvaPageDataMigrationV<N>.types.ts` documents its own rules at the top.
   Do not read one rule (e.g. "do NOT import types from the rest of the
   codebase") without reading the very next rule that qualifies it (e.g.
   "ONLY import `AvaPageTypes` if this is the migration module for the most
   recent version"). Rules here come in pairs; judging one in isolation
   produces false findings.
3. **Verify version existence from the tree, never from prose.** Do not
   infer that a "V4" (or any version) exists because a comment mentions it.
   Confirm against the actual `migrations/` directory and the version
   constant. A future-tense comment is not a fact about today's code.
4. **Do not let "the fix is large/fragile" stand in for the analysis.**
   Whether a fix is hard to apply is irrelevant to whether the code is
   actually wrong. Decide correctness first; only then discuss effort.

## The rules

### Freeze older migrations; the latest may reference live types

- A migration module that is **NOT** the current version must be **frozen**:
  it hand-writes its snapshot types (e.g. `V2_VizConfig` spelled out as a
  literal union) and imports nothing from the live app/model code. This is
  the isolation rule (rule #1 in the module headers).
- The migration module that **IS** the current version (its `SCHEMA_VERSION`
  equals `CURRENT_SCHEMA_VERSION`) MAY import the live `AvaPageTypes` / model
  types (e.g. `import type { VizConfig } from "$/models/vizs/..."`), because
  for the current version the snapshot shape and the live shape are the same
  thing by definition. Aliasing live in the latest migration
  (`export type V<N>_VizConfig = VizConfig`) is **correct and intended**, not
  a violation.

### What TO flag

- An **older** (non-latest) migration module importing live app/model types,
  or otherwise not frozen. That is a real drift risk.
- A frozen snapshot in an older migration that no longer matches the shape it
  claims to snapshot.
- The `<N>` in `SCHEMA_VERSION`, `schemaVersion:` literals, `upgradedVersion`
  / `downgradedVersion`, and the folder name disagreeing with each other.

### What NOT to flag

- The **current-version** migration aliasing or importing live types
  (`V<N>_VizConfig = VizConfig`, etc.). This is the documented pattern and
  there is a built-in guardrail: the latest migration's upgrade function
  returns the live type, so the day someone reshapes those models the latest
  migration fails to compile, forcing whoever introduces `V<N+1>` to freeze
  the `V<N>` snapshot at that moment (exactly as `V2` was already frozen).

### Runtime vs. compile-time

- Migrations run on JSON at runtime; the snapshot types are compile-time
  only. Mis-aliasing the _latest_ version's snapshot is not a data-corruption
  risk today, so do not report it as one. The freeze requirement is about
  future maintainability and only becomes load-bearing when the next version
  is introduced.
