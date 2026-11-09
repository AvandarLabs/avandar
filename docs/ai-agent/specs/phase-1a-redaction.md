# Phase 1A follow-up: personal values in page SQL stay on the device

Status: built on `feat/agent-default`, then hardened after two adversarial
reviews. Evals archived under the `phase-1a-redaction`,
`phase-1a-redaction-review`, and `phase-1a-redaction-review2` labels. Approved by Pablo on 2026-11-08 (D39).
Extends [phase-1a.md](phase-1a.md); replaces its pattern-only redaction of
chart SQL. Results in [eval.md](../eval.md#phase-1a).

## Problem

The page block sends the SQL of dashboard charts and of the Data
Explorer's current query. Their literals can hold personal data, such as
`WHERE "patient_name" = 'Jane Doe'`. Before this change only literals that
looked like an email, phone number, or id were redacted, so names reached
the hosted model. Detecting names from the value alone does not work: in
Avandar's data, `'Kings'`, `'Georgia'`, and `'Washington'` are places that
look like names, and redacting them would break ordinary filters.

## Decision

Redact by the column a value goes with, and replace it with a placeholder
the browser maps back, instead of deleting it.

1. **What is redacted.** In page SQL (dashboard tiles and the explorer's
   query), every string and number literal inside an expression that reads
   a personal column: any operator (`=`, `IN`, `LIKE`, `BETWEEN`, `>=`,
   `~`, ...), any function (`lower`, `contains`, `concat`, ...), `CASE` in
   both forms, casts, and `FILTER`, on either side, anywhere in the
   statement (CTEs, subqueries, `HAVING`, `JOIN ON`, `ORDER BY`). `AND` and
   `OR` are not expressions here: each side is its own condition. Also
   redacted: every literal in a `VALUES` list, and every string whose value
   looks personal on its own (`detectPii`'s content check). Typed literals
   (`DATE '1990-05-12'`) count as strings; integers past 2^53 are found
   too, and a number the parser rounds makes the statement unparsed.
   Each hidden value records why: **compared** when it is tested directly
   against a personal column's value (the other side of a comparison, an
   `IN` or `BETWEEN` item, a simple CASE's WHEN value, where the column is
   bare or only passed through `lower`, `trim`, `concat`, `coalesce`, a
   cast, or `||`) or looks personal itself; **swept** when it is anywhere
   else in a personal expression, such as `'month'` and `2022` in
   `date_trunc('month', "dob")` and `year("dob") = 2022`.
2. **Personal columns.** A column is personal when its name, normalized
   (camelCase split, spaces and punctuation to `_`, lowercase), contains
   one of `detectPii`'s column keywords, or `surname`, `nickname`,
   `firstname`, `lastname`, `fullname`, `birthdate`, `maiden`, `name`, as
   whole `_`-separated words. So `First Name`, `firstName`, `Surname`,
   `Date of Birth`, and `patient_id` are personal, and `stage`,
   `vaccination_status`, and `Population` are not. A column that is none
   of the page's datasets' columns (a CTE, subquery, or `VALUES` alias) is
   personal too, since it may stand for one, and so is an alias of a
   personal column even when a dataset column has the same name
   (`"patient_name" AS "state"`). `Client` and `Guardian` are personal.
3. **Placeholders.** A redacted literal becomes `'<value N>'`, N without a
   leading zero. The browser keeps a per-conversation map from placeholder
   to the original literal, its kind, and why it is held, so the same
   value always gets the same placeholder in that conversation. A value
   the vault already holds is hidden wherever it appears again, even where
   no detector would flag it. A number's placeholder is quoted like a
   string's in the SQL the model reads; restoring writes the number back
   exactly as first written, so `12345678901234567891` and `007` survive.
4. **Round trip.** Before any SQL the model sends runs (`run_query` and
   value lookups), the browser swaps each known placeholder back. The
   model can keep a filter it never saw ("show this chart by week" keeps
   `<value 1>`), so answers stay correct. SQL with an unknown placeholder,
   a placeholder inside a longer string (`'%<value 1>%'`), or one written
   any other way (`'<VALUE 1>'`, `'<value 01>'`, `$$<value 1>$$`) fails
   without running, and the model is told why.
5. **Nothing comes back.** DuckDB names an unaliased expression after its
   SQL, restored values included (`count_star() FILTER (WHERE (Admin2 =
   'Kings'))`). The host masks result column names, preview cells, and
   errors before the model reads them, every held value as a quoted
   literal and as a whole word, whatever it is held for (a false match
   there costs nothing). The page block masks the explorer's result
   columns. A lookup whose value or forms name a held placeholder (any
   quotes, case, or spacing) is answered as already stored, without a
   query; an unknown placeholder is an error, not a card.
6. **Fail closed.** SQL the parser cannot read, or that uses `E''` or
   dollar-quoted strings, has every string and number replaced, except
   numbers of 99 or less when no identifier in it names a personal
   column. Query plans emit `GROUP BY ALL`, so plan SQL is always read
   this way. The parser (`node-sql-parser`, PostgreSQL dialect, as
   elsewhere in the app) reads ordinary DuckDB SQL but not DuckDB-only
   syntax such as `GROUP BY ALL`, `SELECT * EXCLUDE`, `QUALIFY`, `GLOB`,
   `COLLATE`, `IS NOT DISTINCT FROM`, or list literals.
7. **Comments.** Comments are dropped from page SQL before it is sent.
   They can hold values, and once the SQL is on one line a `--` comment
   would swallow the rest of the statement.
8. **Titles and names.** Chart titles, the dashboard, dataset, map, and
   case type names, and the explorer's result columns are masked: each
   compared value becomes its placeholder wherever it appears as a whole
   word (Unicode letters, digits, and `_` are word characters; case is
   ignored; LIKE `%` wildcards are dropped from the value), and every held
   value as a quoted literal. All SQL is redacted first, so a name one
   chart filters on is hidden in every title. Swept and unparsed values
   are never masked as words, so "Cases by month in 2022" and "Vaccinated:
   Yes or No" stay readable next to a chart on a personal column. SQL is
   never word-masked: masking would break identifiers, and held literals
   are already hidden wherever they appear. Placeholders show as
   `<value N>` in names; every other `<` is escaped as before. A title
   `detectPii`'s content check flags still becomes "Untitled chart".
9. **The model is told.** Prompt v2's current page rules say a quoted
   `'<value N>'` in page text is a value hidden for privacy: keep it
   exactly as written, never ask the user what a placeholder stands for,
   use it only as a whole quoted value (never inside another string or
   LIKE pattern, never in `lookup_values`), and alias every computed
   column. v2 had not shipped, so the rules joined it in place. An
   unscoped "never ask what it is" made Haiku skip P04's expected
   question about which chart "this" means.

## What reaches the model

| Text | Model sees |
|---|---|
| String or number in an expression that reads a personal column (`name`, `First Name`, `patient_id`, `dob`, `email`, `phone`, ...) | `'<value N>'` |
| Literal in an expression that reads an alias (a CTE, subquery, or `VALUES` column) | `'<value N>'` |
| Literal in a `VALUES` list | `'<value N>'` |
| String that looks like an email, phone, or id | `'<value N>'` |
| Any string, or number above 99, in SQL that cannot be parsed or uses `E''` or `$$` strings | `'<value N>'` |
| A value the vault already holds, anywhere in later page SQL | `'<value N>'` |
| SQL comments | Dropped |
| A compared value (as a whole word) or any held value (as a quoted literal) in a chart title, page name, or result column name | `<value N>` |
| A swept or unparsed value as a plain word in a title or name (`month`, `2022`, `Yes`) | Unchanged |
| A held value in a result column name, preview cell, or error, as a word or quoted | `<value N>` |
| Other literals (`'Texas'`, `'2022-01-01'`, `LIMIT 10`) | Unchanged |

The model never receives the map. Restored SQL runs only in the browser,
and the result card stores the restored SQL locally, as it does today.

## Components

| Unit | Where | Role |
|---|---|---|
| `SqlLiterals` | `shared/agent/pageContext/` | Finds and replaces literals (strings, numbers, `E''` and dollar-quoted strings) without parsing, skipping comments and quoted identifiers, and strips comments. Shared so the block can strip comments. Replaces the shared `redactSqlLiterals`. |
| `findSensitiveSqlLiterals` | `src/lib/agent/dataAgent/pagePrivacy/` | Parses SQL with `node-sql-parser` and returns the keys of the literals to redact, or "all". Takes `isSensitiveColumn`, `isSensitiveValue`, and the page's `knownColumnNames`. |
| `isPersonalColumnName` | same folder | The normalized, whole-word column check above. Uses `detectPii`'s exported keyword list (`PII_COLUMN_NAME_KEYWORDS`) rather than changing `detectPii`, which other privacy checks share. |
| `SqlPlaceholderVault` (`createSqlPlaceholderVault`) | same folder | Per-conversation map: `redact`, `restore` (re-escaping quotes, numbers bare), `getPlaceholderError`, `maskText`, `getPlaceholder`, and `isHeldPlaceholder`. |
| `createPlaceholderRestoringHost` | same folder | Wraps any `DataAgentHost`: refuses misused placeholders, restores in `showQuery` and `readColumnValues`, masks what comes back, and exposes `isHeldPlaceholder`. The browser and the eval both use it. |
| `lookup_values` | `createDataAgentTools/lookupValuesTool.ts` | Answers a held placeholder as stored as itself, without a query. |
| `buildAgentPageContextBlock` | `shared/agent/pageContext/` | Strips comments, redacts every piece of page SQL with `redactSql`, then masks names, titles, result columns, and SQL with `maskText`. |
| Conversation | `AgentConversationState.sqlVault` | Created with every conversation. Offline conversations send no page block, so their vault stays empty and restoring changes nothing. |
| Host | `createConversationAgentHost` | Wraps the browser host with `createPlaceholderRestoringHost`, so the explorer and the chat result card get the restored SQL. |
| Turn | `runDataAgentTurn`, `askConversationDataAgent` | The page block is built from the conversation (`buildPageBlock`), with `isPersonalColumnName`, `isPersonalDataText`, and the conversation's dataset columns. |
| Prompt v2 | `shared/agent/dataAgent/` | The placeholder rules in item 9. |

## Still open

- **Names that never appear as SQL literals.** A name used only in a
  column alias (`AS "Jane Doe visits"`), a title, or a dashboard name
  reaches the model unless some page SQL filters on it. A name that is
  stored as a column value but never filtered on is never in the block.
- **Row counts as an oracle.** A model that wanted to learn a hidden value
  could run `WHERE "name" = '<value 1>' AND "name" LIKE 'J%'` and read the
  row count, one letter at a time. The agent's model has no reason to, and
  each run is capped (D14), but the placeholder does not stop it.
- **Double-quoted values.** `"name" = "Jane"` names a column in DuckDB, so
  the query cannot run and "Jane" is not treated as a value.
- **Short values.** Bare words under two characters are not masked in
  titles. Numbers of 99 or less in unparsable SQL that names no personal
  column are sent as written.
- **Common words that are names.** A compared value is masked as a word
  everywhere on the page, so a name such as `'May'` or `'Will'` also hides
  "May" in "Cases in May". Readable but imperfect; swept values never do
  this.
- **Swept values in other charts' SQL.** A swept value such as `'month'`
  is held, so it is hidden in every chart's SQL on the page (never in
  titles). Answers stay correct through the round trip.
- **Showing the user real values in replies.** The assistant's reply can
  say "<value 1>" where the user would expect "Jane Doe". Mapping it back
  for display is a UX follow-up, and it must wait: the reply is saved in
  the thread and replayed to the model in the recap after a reload, so
  the recap path has to be redacted first or the value would reach the
  model.
- **Over-redaction.** Any column outside the page's datasets counts as
  personal, so literals compared with a SELECT alias (`HAVING "deaths" >
  100`) become placeholders. Answers stay correct through the round trip;
  the model just reads fewer filter values.

## Testing

- Unit: `SqlLiterals` (literal kinds, exact large integers, numbers
  inside names, identifiers, comments); `isPersonalColumnName` (headers
  flagged, `Client` too; `stage`, `vaccination_status`, `Population`
  not); `findSensitiveSqlLiterals` (every operator, functions, both CASE
  forms, CTE, subquery, and shadowing aliases, VALUES, `COLUMNS()`, typed
  literals, numbers including `bigint`, compared versus swept, small
  numbers in unparsable SQL); `pageSqlLeaks.test.ts`, the first review's
  52 leak attempts and 6 ordinary filters with the browser's detectors;
  the vault (re-hiding, numbers restored exactly, canonical and variant
  placeholders, page and result masking by reason, 300 holds under a
  second); the host (masked column names, preview cells, and errors for
  every hold reason, refused placeholders); `pageBlockPrivacy.test.ts`
  (titles masked from another chart's SQL; the second review's dashboard
  keeps "Cases by month in 2022" and "Vaccinated: Yes or No" readable
  while "Visits by Jane Doe" masks); the block (comments, masking after
  all redaction, SQL never masked, placeholders unescaped in names but
  page tags still escaped); `runDataAgentTurn` (spreadsheet headers,
  alias filters, titles, placeholders kept across turns).
- Executed, real DuckDB (`placeholderRoundTrip.executed.test.ts`):
  `run_query` results for `FILTER`, `CASE`, and a bare comparison carry no
  restored value; a lookup of a held placeholder (quoted, in capitals,
  spaced, or as a form) matches without a query, and an unknown one is an
  error, not a card.
- Integration: `explorerPageBlock.integration.test.tsx` goes from the real
  `DataExplorerStateManager` to the block, and checks the explorer's
  filter and a result column named after it are both masked.
- Eval: P07, a dashboard tile "Deaths in one county by month" over US
  deaths in 2022 (`"Admin2" = 'Kings' AND "Province_State" = 'New York'`),
  with the harness treating `Admin2` as personal for this question only.
  "Show this chart by week" must keep the placeholder and grade like P03:
  about 52 weekly rows adding up to Kings County's 2022 deaths (2,707).

## Result

P01 to P07 pass on `haiku-sonnet` after the review fixes, as before them
(P07 passed three runs in a row with `'<value 1>'` kept). The 45 original
questions scored 43/45 on the first run after the fixes; the two misses
(H06, N04) had no page block and missed for known reasons (rounding ties,
leaving out zero-death countries, dropping "Unassigned" rows). On reruns
N04 passed 3 of 3 and H06 2 of 3. After the second review, P01 to P07
pass and the 45 questions score 44/45 (N04, which varies). On that
round's first runs P04 skipped its question in 3 of 4 runs until the
prompt's "never ask" was scoped to placeholders, then passed 5 of 5. All
runs for this spec cost $0.083. See [eval.md](../eval.md#phase-1a).
