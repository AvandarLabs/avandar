# Phase 1A follow-up: personal values in page SQL stay on the device

Status: built on `feat/agent-default`, eval archived under the
`phase-1a-redaction` label. Approved by Pablo on 2026-11-08 (D39). Extends
[phase-1a.md](phase-1a.md); replaces its pattern-only redaction of chart
SQL. Results in [eval.md](../eval.md#phase-1a).

## Problem

The page block sends the SQL of dashboard charts and of the Data
Explorer's current query. Their string literals can hold personal data,
such as `WHERE "patient_name" = 'Jane Doe'`. Today only literals that look
like an email, phone number, or id are redacted, so names reach the hosted
model. Detecting names from the value alone does not work: in Avandar's
data, `'Kings'`, `'Georgia'`, and `'Washington'` are places that look like
names, and redacting them would break ordinary filters.

## Decision

Redact by the column a value is compared to, and replace it with a
placeholder the browser maps back, instead of deleting it.

1. **What is redacted.** In page SQL (dashboard tiles and the explorer's
   query), a single-quoted literal is replaced when it is compared to a
   column that `detectPii` flags by name (`=`, `<>`, `IN (...)`, `LIKE`,
   `ILIKE`, either side), or when the literal itself is flagged by
   `detectPii`'s content check (today's rule). Other literals stay.
2. **Placeholders.** A redacted literal becomes `'<value N>'`. The browser
   keeps a per-conversation map from placeholder to the original literal,
   so the same value always gets the same placeholder in that conversation.
3. **Round trip.** Before any SQL the model sends runs (`run_query` and
   value lookups), the browser swaps each known placeholder back to its
   original literal. The model can keep a filter it never saw ("show this
   chart by week" keeps `<value 1>`), so answers stay correct.
4. **Fail closed.** If a statement cannot be parsed, every string literal
   in it becomes a placeholder. The parser (`node-sql-parser`, PostgreSQL
   dialect, as elsewhere in the app) reads ordinary DuckDB SQL, including
   quoted UUID table names, `::` casts, CTEs, and functions such as
   `date_trunc`, but not DuckDB-only syntax such as `GROUP BY ALL`,
   `SELECT * EXCLUDE`, `FROM t SELECT`, or list literals. Those statements
   send every literal as a placeholder, and answers stay correct through
   the round trip.
5. **Titles.** A chart title that `detectPii`'s content check flags is
   still replaced with "Untitled chart" (titles are not SQL, so they have
   no round trip). A plain name in a title (`"Visits by Jane Doe"`) is not
   caught, and it tells the model the value its placeholder hides. The
   eval's first P07 tile was titled "Deaths in Kings County by month", and
   the model wrote `'Kings'` from the title.
6. **The model is told.** Prompt v2's current page rules say a quoted
   `'<value N>'` is a value hidden for privacy, to keep it exactly as
   written, and never to ask what it is. Without that rule Haiku asked the
   user which county `'<value 1>'` meant. v2 had not shipped, so the rule
   joined it in place.
7. **Lookups.** A value lookup the model writes with a placeholder runs
   with the value restored, and any held value it finds comes back as its
   placeholder, so a lookup never tells the model what a placeholder
   stands for. Lookups without placeholders are unchanged.

## What reaches the model

| Text | Model sees |
|---|---|
| Literal compared to a column whose name looks personal (`name`, `patient`, `dob`, `email`, `phone`, ...) | `'<value N>'` |
| Literal that looks like an email, phone, or id | `'<value N>'` |
| Any literal in SQL that cannot be parsed | `'<value N>'` |
| Other literals (`'Texas'`, `'2022-01-01'`) | Unchanged |

The model never receives the map. Restored SQL runs only in the browser,
and the result card stores the restored SQL locally, as it does today.

## Components

| Unit | Where | Role |
|---|---|---|
| `findSensitiveSqlLiterals` | `src/lib/agent/dataAgent/pagePrivacy/` | Parses SQL with `node-sql-parser` and returns the literal values to redact, or "all" when parsing fails. A comparison counts when either side reads a personal column, directly or inside a function (`lower("name") LIKE '%doe%'`), anywhere in the statement (CTEs, `CASE`, `HAVING`). Numbers are never redacted. |
| `SqlStringLiterals` | same folder | Finds and replaces single-quoted literals without parsing, skipping comments and quoted identifiers. Replaces the shared `redactSqlLiterals`, which nothing else used. |
| `SqlPlaceholderVault` (`createSqlPlaceholderVault`) | same folder | Per-conversation map: `redact(sql, detectors)` returns SQL with placeholders; `restore(sql)` swaps known ones back, re-escaping quotes (`O'Brien` becomes `'O''Brien'`), and leaves unknown ones as written so the query fails visibly. A literal that is already a placeholder is never vaulted again. |
| `createPlaceholderRestoringHost` | same folder | Wraps any `DataAgentHost`: restores in `showQuery` and `readColumnValues`, and masks held values in a lookup that used placeholders. The browser and the eval both use it. Free of UI imports, so the eval can load it. |
| `buildAgentPageContextBlock` | `shared/agent/pageContext/` | Takes a `redactSql(sql)` function, applied to tile SQL and the explorer's SQL before aliasing, cutting, and escaping. Titles keep `isSensitive`. |
| Conversation | `AgentConversationState.sqlVault` | Created with every conversation. Offline conversations send no page block, so their vault stays empty and restoring changes nothing. |
| Host | `createConversationAgentHost` | Wraps the browser host with `createPlaceholderRestoringHost`, so the explorer and the chat result card get the restored SQL. |
| Turn | `runDataAgentTurn`, `askConversationDataAgent` | The page block is built from the conversation (`buildPageBlock`), so even a first turn uses its vault. The column check is `detectPii({ columnName }).hits` being non-empty; the value check is `isPersonalDataText`. |
| Prompt v2 | `shared/agent/dataAgent/` | One current page rule: keep `'<value N>'` as written. |

The model-facing results carry no restored values: `run_query` reports
only a result's shape, its error text goes through `sanitizeQueryError`
(which removes quoted literals), and `lastQuery.sql` keeps the SQL the model
wrote, with placeholders.

`detectPii`'s column-name check matches substrings, so some ordinary
columns count as personal (`stage` and `percentage` contain `age`,
`vaccine` contains `cc`, `Population` contains `lat`). Their text filters
reach the model as placeholders. Answers stay correct through the round
trip; the model just reads fewer filter values.

## Testing

- Unit: column-aware detection for `=`, `<>`, `!=`, `IN`, `LIKE`, `ILIKE`,
  and their `NOT` forms, reversed operands, quoted, unquoted, and qualified
  columns, functions of a column, CTEs, `CASE`, and `HAVING`, doubled
  quotes, numbers and other columns left alone, and a parse failure; vault
  round trip, stable numbering across calls, restore escaping, and unknown
  placeholders; the block shows placeholders in tile and explorer SQL while
  `'Texas'` stays; the host restores before `showQuery` and
  `readColumnValues`, and the model-facing tool result has no restored
  value; `runDataAgentTurn` keeps a value's placeholder across turns of one
  conversation.
- Integration: `explorerPageBlock.integration.test.tsx` goes from the real
  `DataExplorerStateManager` through `useChatPageContext` and
  `createAgentPageContext` to the block, and checks the explorer's personal
  filter becomes `'<value 1>'`.
- Eval: P07, a dashboard tile "Deaths in one county by month" over US
  deaths in 2022 (`"Admin2" = 'Kings' AND "Province_State" = 'New York'`),
  with the harness treating `Admin2` as personal for this question only.
  "Show this chart by week" must keep the placeholder and grade like P03:
  about 52 weekly rows adding up to Kings County's 2022 deaths (2,707). A
  unit test checks P07's block has `'<value 1>'` and no "Kings".

## Result

P01 to P07 pass on `haiku-sonnet`, and P07 passed on three runs in a row,
each time with `'<value 1>'` kept in the model's SQL. Two earlier runs
found the title leak and the missing prompt rule above. Cost per question
stayed at about $0.0002 to $0.0003; all five runs cost $0.0065. See
[eval.md](../eval.md#phase-1a).
