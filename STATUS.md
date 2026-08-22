# feat/qetl-impl status

## Column projection

**Branch:** `feat/qetl-column-projection` (merged)  
**Spec:** `docs/superpowers/specs/2026-08-19-qetl-column-projection-design.md`  
**Plan:** `docs/superpowers/plans/2026-08-19-qetl-column-projection.md`

The mediator now probes, acquires, and caches the columns a query needs
instead of always `"all"`:

- SQL select lists and concept attribute mappings feed `getNeededColumnsFromQuery`.
- `"all"` still serves a subset. A finite entry does not serve a wider request.
- A partial miss acquires the union (`growFrom`) and the mediator projects the
  held blob before write. Wrappers may ignore `AcquireRequest.columns`.
- Projected files keep source row order (no `DISTINCT`). `file_row_number`
  still comes from `ava_rows_` at load, not from the cached blob.
- `SELECT *`, unreadable SQL, and `CREATE TABLE AS SELECT` fail wide to `"all"`.
- `LocalPublicDatasetRelationCache` stays `"all"`.

## Chat concept aliases

**Branch:** `feat/chat-concept-aliases` (merged)  
**Spec:** `docs/superpowers/specs/2026-08-19-chat-concept-aliases-design.md`  
**Plan:** `docs/superpowers/plans/2026-08-19-chat-concept-aliases.md`

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

Ask chat a question about a workspace concept. The system prompt should show
`- c0: <Concept name> (<attribute>, …)`. Generated SQL that uses `"c0"` should
arrive at the explorer as `"concept_<uuid>"`.

## S3·9 rehearsal

Mapped concept **County** (not seed `State`):

|             |                                                               |
| ----------- | ------------------------------------------------------------- |
| Concept     | `County` (`a11c0001-c0a7-4000-8000-00000000c0a7`)             |
| Dataset     | `long-us-deaths.csv` (`a4fd4718-1bd5-43e2-b4ae-7ec600d1845f`) |
| Identifier  | `UID` (`dataset_column`, `most_frequent`)                     |
| Label       | `Combined_Key` (`most_frequent`)                              |
| Other attrs | `Province_State`, `Population` (`most_frequent`)              |
| Spine       | 3342 individuals (distinct `UID`s from the parquet)           |

```sql
SELECT * FROM "concept_a11c0001-c0a7-4000-8000-00000000c0a7" LIMIT 5;
```

Join concept to dataset:

```sql
SELECT c."Province_State", SUM(d.daily_new_deaths) AS deaths
FROM "concept_a11c0001-c0a7-4000-8000-00000000c0a7" c
JOIN "a4fd4718-1bd5-43e2-b4ae-7ec600d1845f" d
  ON CAST(c.external_id AS VARCHAR) = CAST(d.UID AS VARCHAR)
WHERE c."Province_State" IN ('California', 'Texas', 'New York')
GROUP BY c."Province_State"
ORDER BY deaths DESC;
```

Seed `State` is still empty `manual_entry`. Ignore it. Public-share concept queries still punted.
