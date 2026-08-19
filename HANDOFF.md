# Chat concept aliases

**Branch:** `feat/chat-concept-aliases`
**Worktree:** `/Users/juanpablosarmiento/src/worktrees/avandar/feat/chat-concept-aliases`
**Merge back into:** `feat/qetl-impl`
**Base:** copied dirty QETL tree from `feat/qetl-impl` at `6427d8a4e` plus uncommitted chat-alias work. Dataset aliases (`t0`, `t1`, …) already rewrite to dataset UUIDs.

Demo is today. Do not touch Case Manager UI. Do not invent a second alias scheme that fights `SqlTableAlias`.

## Why this lane exists

Chat today can only name **datasets** in the schema block. Concepts are queryable as `concept_<uuid>` via `RelationRef.toTableName`, but the model never sees them, so it cannot join a case type without pasting a UUID.

Dataset aliases already work in:

- `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`
- `supabase/functions/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts`
- offline WebLLM prompt builder
- leftover `queries/:workspaceId/generate`

## What to build

Extend `SqlTableAlias` so the schema block and rewrite cover **concepts** as well as datasets.

Suggested shape (adapt if a cleaner one is obvious):

- Keep `t0`, `t1`, … for datasets (sorted by dataset id, current behavior).
- Add `c0`, `c1`, … for concepts (sorted by concept id), rewriting to `"concept_<uuid>"`.
- `formatSchemaBlock` lists both, with concept **attribute names** (not raw rows) next to each concept alias.
- `applyToSql` rewrites both quoted and unquoted aliases, longest-first, same as today.

The chat schema fetch (`supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts`) must load workspace concepts and their attribute names. Do **not** send raw data values.

Wire the same alias list through:

1. cloud `PostChatMessages` / `parseOpenRouterResponse`
2. offline `buildOfflinePrompts`
3. leftover generate-SQL route if it still exists

## Constraints

- Import models from `MyModel.ts`, not `*.types.ts`, outside model folders.
- TDD. Existing rewrite tests in `parseOpenRouterResponse.test.ts` and `SqlTableAlias` tests are the pattern.
- A concept alias must not collide with a dataset alias. `t*` vs `c*` is the cheap way.
- Do not look at raw rows when building the prompt.
- No destructive git. Stay in this worktree. No production DB writes.
- Do not commit switched `supabase/config.toml`.

## Done when

A cloud chat turn whose schema includes one concept rewrites `FROM "c0"` to `FROM "concept_<uuid>"` before the SQL reaches the explorer, and the system prompt schema block names that concept.

Write `STATUS.md` when you stop.
