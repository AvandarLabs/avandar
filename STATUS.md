# Chat concept aliases

**Branch:** `feat/chat-concept-aliases`
**Spec:** `docs/superpowers/specs/2026-08-19-chat-concept-aliases-design.md`
**Plan:** `docs/superpowers/plans/2026-08-19-chat-concept-aliases.md`

## Shipped

`SqlTableAlias` now covers concepts as well as datasets:

- Datasets stay `t0`, `t1`, … sorted by dataset id.
- Concepts are `c0`, `c1`, … sorted by concept id.
- `applyToSql` rewrites through `RelationRef.toTableName`, so `FROM "c0"`
  becomes `FROM "concept_<uuid>"` before SQL reaches the explorer.
- The schema block lists concept **attribute names** only. No row values.

Wired through:

1. Cloud `PostChatMessages` / `parseOpenRouterResponse`
2. Offline `buildOfflinePrompts` (and repair, so `c0` is not remapped onto a dataset)
3. Leftover `queries/:workspaceId/generate`

`fetchWorkspaceSchema` loads `concepts` and `concept_attributes` even when
the workspace has no datasets.

## Demo

Ask chat a question about a workspace concept. The system prompt should show
`- c0: <Concept name> (<attribute>, …)`. Generated SQL that uses `"c0"` should
arrive at the explorer as `"concept_<uuid>"`.

## Out of scope

Case Manager UI. No second alias scheme.
