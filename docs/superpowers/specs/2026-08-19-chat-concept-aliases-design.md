# Chat concept aliases

**Status:** Ready to implement
**Date:** 2026-08-19
**Branch:** `feat/chat-concept-aliases`
**Source:** `HANDOFF.md`

## Problem

Chat can already name workspace **datasets** as `t0`, `t1`, … in the schema
block. `SqlTableAlias.applyToSql` rewrites those aliases to dataset UUIDs
before SQL reaches the explorer.

Concepts are already queryable as `concept_<uuid>` via
`RelationRef.toTableName`, but the model never sees them. Joining a case type
requires pasting a UUID. Dataset aliases must keep working; a second alias
scheme must not fight `SqlTableAlias`.

## Goal

One alias list covers datasets and concepts. A cloud chat turn whose schema
includes one concept:

1. Shows that concept in the system-prompt schema block as `c0` (or `cN`)
   plus its **attribute names**.
2. Rewrites `FROM "c0"` to `FROM "concept_<uuid>"` before SQL leaves the
   edge function.

## Non-goals

- Case Manager UI.
- A parallel `ConceptTableAlias` module.
- Sending attribute values, individuals, mappings, or raw rows in the prompt.
- Replicating DuckDB collision renaming of duplicate attribute names.
- Changing how DuckDB addresses concept tables.

## Decisions

| Topic                   | Choice                                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alias prefixes          | Datasets stay `t0`, `t1`, … sorted by dataset id. Concepts get `c0`, `c1`, … sorted by concept id. Prefixes cannot collide.                                                  |
| Rewrite target          | `RelationRef.toTableName`. Datasets remain a bare UUID. Concepts become `concept_<uuid>`. Do not hard-code the `concept_` prefix in `SqlTableAlias`.                         |
| Alias entries           | Discriminated union: `{ kind: "dataset", alias, datasetId, name }` or `{ kind: "concept", alias, conceptId, name }`.                                                         |
| Builder                 | `fromDatasets` and `fromConcepts` stay. Call sites that have both use `fromSchema({ datasets, concepts })`, which concatenates dataset aliases then concept aliases.         |
| Schema block            | One line per alias, same shape as today: `- alias: Label (name, name)`. Concept lines list `concept_attributes.name` only. No UUIDs.                                         |
| Schema fetch            | `fetchWorkspaceSchema` loads `concepts` (`id, name`) and `concept_attributes` (`concept_id, name`) independently of datasets. A concept-only workspace still lists concepts. |
| Cloud parse             | `parseOpenRouterResponse` rewrites when **either** datasets or concepts are present. Skip only when both are empty.                                                          |
| Leftover generate route | `queries/:workspaceId/generate` uses the same fetch + `fromSchema` + `applyToSql`.                                                                                           |
| Offline prompts         | `OfflineChatSchema` carries `concepts` and `conceptAttributes`. `buildOfflinePrompts` formats and repairs through `fromSchema`.                                              |
| Offline repair          | After rewrite, `concept_<uuid>` is an allowed table name. Repair must not remap a concept alias or concept table name onto a dataset.                                        |

## Approaches considered

1. **Extend `SqlTableAlias` (chosen).** One rewrite pass, longest-alias-first,
   quoted and unquoted, already proven for `t0`/`t10`. `c*` cannot collide
   with `t*`.
2. **New concept-alias module.** Two lists, two rewrite passes, easy to
   apply in the wrong order. Rejected by the handoff.
3. **Generic `{ alias, tableName, name }` without `kind`.** `applyToSql`
   would work, but `getDatasetIdFromAlias` and column lookup lose the
   relation kind. Rejected.

## Design

### `SqlTableAlias`

`fromDatasets` assigns `tN` by sorted dataset id, unchanged except each
entry gains `kind: "dataset"`.

`fromConcepts` assigns `cN` by sorted concept id.

`fromSchema` returns `[...fromDatasets(datasets), ...fromConcepts(concepts)]`.

`formatSchemaBlock({ aliases, columns, conceptAttributes })` looks up
dataset column names by `dataset_id` and concept attribute names by
`concept_id`. Missing names still print `- alias: Label`.

`applyToSql` still rewrites longest alias first, quoted then unquoted, to
`"tableName"` where `tableName` is `RelationRef.toTableName` for that entry.

`getDatasetIdFromAlias` remains dataset-only. A `cN` alias returns
undefined.

### Schema fetch

`fetchWorkspaceSchema` returns:

```ts
{
  datasets: {
    id: string;
    name: string;
  }
  [];
  columns: {
    dataset_id: string;
    name: string;
    data_type: string;
  }
  [];
  concepts: {
    id: string;
    name: string;
  }
  [];
  conceptAttributes: {
    concept_id: string;
    name: string;
  }
  [];
}
```

Fetch datasets and concepts in parallel. Fetch columns only when there is
at least one dataset. Fetch attribute names only when there is at least one
concept. Never select from `individuals`, mappings, or assertion tables.

### Cloud prompt and rewrite

`buildSqlSystemPrompt` takes optional `concepts` and `conceptAttributes`,
builds aliases with `fromSchema`, and tells the model that datasets use
`tN` and concepts use `cN`. The schema block must not contain UUIDs.

`PostChatMessages` passes both lists into the prompt and into
`runChatAttemptsWithEscalation` → `parseOpenRouterResponse`. Generated SQL
and discovery-clarify queries both rewrite.

### Offline

`fetchOfflineChatSchema` loads concepts and attribute names with
`ConceptClient` / `ConceptAttributeClient` using `workspace_id`. Cached
schema blobs that lack the new arrays treat them as empty.

`truncateSchemaForOffline` and `narrowOfflineSchema` keep concepts when
present. Narrowing to one dataset must not drop concepts: the SQL pass can
still join a case type.

`repairOfflineGeneratedSql` applies `fromSchema` then treats
`RelationRef.toTableName({ kind: "concept", id })` as an allowed table.
`matchOfflineDatasetTable` must not map `cN` or `concept_<uuid>` onto a
dataset.

### Error handling

Schema fetch uses the existing `throwOnError` path. Empty concepts is
success, not an error. Alias rewrite is pure string replacement; unknown
aliases are left unchanged.

## Testing

TDD against existing patterns:

- `SqlTableAlias.test.ts`: stable `cN` assignment, mixed schema block,
  `FROM "c0"` → `"concept_<uuid>"`, `t*` still rewrites to a bare UUID,
  longest-first (`c10` before `c1`).
- `parseOpenRouterResponse.test.ts`: concept-only generateSql rewrite.
- `buildSqlSystemPrompt.test.ts`: concept line present, UUID absent.
- `fetchWorkspaceSchema.test.ts`: concept-only workspace still returns
  the concept and its attribute names; no row values.
- Offline prompt tests: `c0` in the block, concept id absent.

No Case Manager or e2e coverage in this lane.
