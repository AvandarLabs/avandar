# Phase 1A follow-up: personal values in page SQL stay on the device

Status: approved by Pablo on 2026-11-08 (D39). Extends
[phase-1a.md](phase-1a.md); replaces its pattern-only redaction of chart
SQL.

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
   in it becomes a placeholder.
5. **Titles.** A chart title that `detectPii`'s content check flags is
   still replaced with "Untitled chart" (titles are not SQL, so they have
   no round trip).

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
| `findSensitiveSqlLiterals` | `src/lib/agent/dataAgent/pagePrivacy/` | Parses SQL with `node-sql-parser`, returns the literals to redact (column-aware plus content check), or "all" when parsing fails. |
| `SqlPlaceholderVault` | same folder | Per-conversation map: `redact(sql)` returns SQL with placeholders; `restore(sql)` swaps them back, re-escaping quotes. |
| `buildAgentPageContextBlock` | `shared/agent/pageContext/` | Takes a `redactSql(sql)` function instead of the `isSensitive` literal predicate; titles keep `isSensitive`. |
| Conversation | `DataAgentConversation` | Holds the vault, created with the conversation. |
| Host | `createConversationAgentHost` | Restores placeholders in `showQuery` and `readColumnValues` before running. |

## Testing

- Unit: column-aware detection for `=`, `IN`, `LIKE`, reversed operands,
  quoted and unquoted columns, aliased tables, doubled quotes, and a parse
  failure; vault round trip and stable numbering; the block shows
  placeholders; the host restores before running.
- Eval: P07, a dashboard tile filtering US deaths by county
  (`"Admin2" = 'Kings' AND "Province_State" = 'New York'`), with the harness
  treating `Admin2` as personal for this question only. "Show this chart by
  week" must keep the placeholder and grade against Kings County's weekly
  deaths. The 45 questions and P01 to P06 must score as before.
