# AI harness audit: bug log

Failures found while running the [question plan](README.md#2-question-plan):
an error, an empty result, or wrong data where the question had a real
answer. Each bug is fixed on its own branch, merged into `demo/measles`, and
listed here with what a reviewer needs to rebuild it as a PR to `develop`.

| ID | Summary | Status | Fix commit |
|---|---|---|---|
| BUG-001 | `EXTRACT(year FROM "date")` refused as `uninspectable-source` | fixed | `2193d0ef4` |
| BUG-002 | Query errors shown to users in developer wording | fixed | `00c168ad7` |
| BUG-003 | Dates and month buckets shown one day or one month early west of UTC | fixed | `f35ddf949` |
| BUG-004 | A discovery lookup on a dataset the explorer had not opened failed with `Catalog Error` | fixed | `b21698925` |
| BUG-005 | Valid SQL with a CTE or `QUALIFY` failed while building the column projection | fixed | `bb3a66132` |
| BUG-006 | A new chat that repeats the last question was sent to the model as "Try again" | fixed | `75435c18e` |
| BUG-007 | Years shown as `2,020.00` and counts as `63,437.00` in the data grid | fixed | `ca509aae7` |
| BUG-008 | SQL a model wrote as plain text was shown in the chat bubble, with internal `t0` aliases | fixed | `d6e67b293` |
| BUG-009 | A discovery lookup missed the user's value when it sorted past the first 100 values | fixed | `18ae7b452` |
| BUG-010 | ChatGPT asked the same lookup again after every answer | fixed | `4d796bff5` |
| BUG-011 | "Last year" ran for a guessed year with no data, and a blank total was called "results" | fixed | `81506f673`, `c0c08b571` |
| BUG-012 | A chart request in the Data Explorer was claimed as "added to your dashboard" and showed nothing | fixed | `39264bcfb` |
| BUG-013 | Chart blocks added to dashboards kept the model's `t0` aliases and could not run | fixed | `394bec76d` |

---

## BUG-001: `EXTRACT(... FROM ...)` refused as an uninspectable source

- **Question:** B01, "Show me monthly covid deaths in the US in 2022"
- **Model:** Claude (`anthropic/claude-sonnet-5`). Any model that writes
  `EXTRACT` hits it.
- **Generated SQL (correct):**

  ```sql
  SELECT date_trunc('month', "date") AS month, SUM("daily_new_deaths") AS monthly_deaths
  FROM "86440223-249d-4b3d-9be4-159a4e615e0a"
  WHERE EXTRACT(year FROM "date") = 2022
  GROUP BY 1
  ORDER BY 1
  ```

- **What the user saw:** "This query could not run. Cannot safely analyze
  DuckDB SQL: uninspectable-source" in the explorer, and "I ran the query,
  but it failed." in the chat.
- **Root cause:** `src/lib/sql/DuckDbSqlAnalyzer/duckDbSqlSources.ts` treated
  every `FROM` keyword as the start of a relation. The `FROM` inside
  `EXTRACT(year FROM "date")` made it read `"date"` as a table, which is not
  a dataset, so the fail-closed analyzer refused the query. `TRIM(... FROM
  ...)`, `SUBSTRING(... FROM ...)` and `OVERLAY(... FROM ...)` failed the same
  way. `year("date")` and `date_part('year', "date")` passed.
- **Fix:** a `FROM` whose innermost enclosing parenthesis belongs to
  `EXTRACT`, `TRIM`, `SUBSTRING` or `OVERLAY` is no longer a source. A
  subquery nested in those arguments keeps its own `FROM`, so what it reads is
  still analyzed and still fails closed (covered by a test).
- **Tests:** `src/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.test.ts`, two new
  cases.
- **Branch:** `fix/analyzer-function-from`, merged as `473e133c1`.
- **PR title for develop:** `fix(sql-analyzer): stop reading EXTRACT's FROM as a table source`

## BUG-002: query errors shown to users in developer wording

- **Question:** B01 (same run as BUG-001)
- **What the user saw:** the raw internal message "Cannot safely analyze
  DuckDB SQL: uninspectable-source", both in the explorer's red alert and in
  the chat's "That query failed" banner. A user cannot act on it.
- **Root cause:** `DataExplorerApp` stores `dataQuery.error.message` as
  `lastQueryError`, and both `QueryResultsError` and `RegenerateErrorBanner`
  rendered it verbatim. That string is DuckDB's (or the safety analyzer's)
  internal message, sometimes with a caret diagram and dataset UUIDs.
- **Fix:** `src/lib/sql/QueryErrorKind/QueryErrorKind.ts` classifies the raw
  message (missing column, missing dataset, missing function, mismatched
  values, grouping, syntax, blocked, out of memory, cancelled, unknown), and
  `useQueryErrorExplanation` turns that into one translated sentence. The
  explorer alert shows that sentence, with the technical message behind
  "Show details" (UUIDs replaced with `<dataset>`, caret diagram dropped) next
  to "Show SQL". The chat banner shows the same sentence. `lastQueryError`
  itself is unchanged, so the model still receives the raw error through the
  chat page context and can repair the SQL.
- **Tests:** `QueryErrorKind.test.ts` (10 cases built from real DuckDB
  messages), `QueryResultsError.test.tsx` (updated), and a new
  `RegenerateErrorBanner.test.tsx`.
- **Translations:** new strings translated into every locale with
  `pnpm translations useQueryErrorExplanation`.
- **Branch:** `fix/readable-query-errors`, merged as `07135f860`.
- **PR title for develop:** `fix(data-explorer): explain failed queries in plain language`

## BUG-003: dates shown one day early, month buckets one month early

- **Question:** B01, after BUG-001 was fixed
- **What the user saw:** correct totals labeled with the wrong month. The
  January 2022 bucket read `2021-12-31 19:00:00 -05:00`, so the table read as
  "December 2021: 63,437". The import preview showed the first date of every
  file as `2020-01-21` when the file starts on `2020-01-22`.
- **Root cause:** DuckDB `DATE` and `TIMESTAMP` values carry no time zone.
  DuckDB-Wasm returns them as epoch milliseconds in UTC. `DataGrid` and the
  bar, line and area charts passed `zone: undefined` to `formatDate`, whose
  default is the browser's zone, so every user west of UTC saw values moved
  back (and every user east of UTC saw times moved forward).
- **Fix:** query-result dates render in UTC through a new
  `formatQueryResultDate` helper, used by the grid and the three charts.
  Zone-less date-time text (for example `2022-01-01 10:00:00` in a text
  column) stays in the browser's zone, since that is where JavaScript parses
  it. Grid columns whose values all fall on midnight (a `DATE`, or a
  `date_trunc` bucket) now show the date alone instead of `00:00:00 +00:00`.
- **Tests:** `src/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs.test.ts`,
  run with `TZ=America/New_York`. The extracted pre-fix behavior failed with
  exactly the bug (`2021-12-31 19:00:00`).
- **Verified in the app:** B01 now shows `2022-01-01 ... 2022-12-01` with the
  ground-truth totals.
- **Branch:** `fix/naive-date-display`, merged as `9529a4ade`.
- **PR title for develop:** `fix(viz): show stored dates on their own day in every time zone`

## BUG-004: discovery lookup failed on a dataset the explorer had not opened

- **Question:** B02, "Show me monthly covid cases in California in 2022"
- **Model:** ChatGPT (`openai/gpt-5.6-terra`). Claude did not run a lookup.
- **What happened:** the model asked to look up how California is stored:

  ```sql
  SELECT DISTINCT "Province_State" FROM "8fc84d6a-f864-46fe-bd1c-7d7cb897a173"
  ORDER BY "Province_State" LIMIT 100
  ```

  The clarification card showed `Catalog Error: Table with name
  8fc84d6a-f864-46fe-bd1c-7d7cb897a173 does not exist! Did you mean
  "86440223-..."?` with the raw SQL, and asked the user to type the value.
- **Root cause:** `useDiscoveryResolver` ran the lookup with
  `DuckDbClient.runRawQuery`, straight against DuckDB. Only the Data
  Explorer's query path (`WorkspaceQuerySession.runQuery`) loads a dataset's
  Parquet into DuckDB before running. The cases dataset had never been
  queried in that browser session, so its table did not exist.
- **Fix:** the lookup runs through `WorkspaceQuerySession.runQuery` with the
  current workspace id, which loads the datasets the SQL reads and limits it
  to the workspace (`assertWorkspaceRelations`). A lookup that still fails is
  explained in plain language on the card (`useQueryErrorExplanation`), with
  the technical message and the lookup SQL behind "Show details".
- **Tests:** new `useDiscoveryResolver.test.tsx`; a new case in
  `DiscoveryBody.test.tsx` for the error display.
- **Verified in the app:** B02 on ChatGPT now resolves `California`
  automatically and returns the 12 ground-truth months.
- **Branch:** `fix/discovery-loads-datasets`, merged as `7310699b5`.
- **PR title for develop:** `fix(chat): load the dataset before a discovery lookup runs`

## BUG-005: valid SQL with a CTE or `QUALIFY` failed while building the projection

- **Question:** B03, "Which state had the most covid deaths?"
- **Models:** both.
- **Generated SQL (valid, returns California 101,159 in plain DuckDB):**

  ```sql
  WITH "state_deaths" AS (
    SELECT "t0"."Province_State" AS "state",
           SUM(COALESCE("t0"."daily_new_deaths", 0)) AS "total_covid_deaths"
    FROM "t0" WHERE "t0"."Province_State" IS NOT NULL
    GROUP BY "t0"."Province_State"
  )
  SELECT "state", "total_covid_deaths" FROM "state_deaths"
  QUALIFY RANK() OVER (ORDER BY "total_covid_deaths" DESC) = 1
  ```

- **What the user saw:** "This query could not run" (ChatGPT: `Referenced
  column "QUALIFY" not found`; Claude, with `ORDER BY ... LIMIT 1`:
  `Referenced column "state" not found`).
- **Root cause:** before a query runs, `RelationLoading` cuts the dataset's
  Parquet down to the columns the query needs.
  `getNeededColumnsFromQuery` reads those names from the SQL's tokens, and
  also collects CTE names (`state_deaths`), CTE aliases used in the outer
  query (`state`, `total_covid_deaths`), and keywords it does not list
  (`QUALIFY`). `projectParquetBlob` then ran `SELECT "QUALIFY", "state", ...
  FROM read_parquet(...)`, which fails. The user's SQL never ran.
- **Fix:** `projectParquetBlob` reads the file's schema (`DESCRIBE`) and keeps
  only requested names that are real columns, matched without regard to
  case the way DuckDB matches identifiers. If none match, the file is used
  unprojected. Fixing it where the real schema is known covers every name
  the token reader can misread, not only the ones seen here.
- **Tests:** two new cases in `projectParquetBlob.test.ts`.
- **Verified in the app:** B03 on Claude returns California, 101,159.
- **Branch:** `fix/projection-real-columns`, merged as `61cb367cb`.
- **PR title for develop:** `fix(qetl): project only real columns when loading a dataset for a query`

## BUG-006: a new chat that repeats the last question was treated as "Try again"

- **Question:** B03, asked on ChatGPT, then on Claude in a new chat.
- **What happened:** the Claude request carried `retryContext` from ChatGPT's
  turn in the previous chat, so the edge function told the model "The user
  explicitly asked you to TRY AGAIN ... Do not repeat the same output". Claude
  replied "Since this was already asked and left ambiguous, I'll go with the
  standard interpretation..." in an empty chat.
- **Root cause:** `createChatModelAdapter` recognizes Try again by comparing
  the outgoing messages with the last turn's (`lastTurnRef`). A new chat that
  asks the same question sends identical messages. `startNewChat` never
  cleared `lastTurnRef`. Any user who starts over and re-asks a question (or
  switches models to compare) hit this.
- **Fix:** `startNewChat` clears `lastTurnRef`.
- **Tests:** new `useAvandarChatRuntime.retryContext.test.tsx`: a new chat
  sends no retry context (red before the fix), and a real Try again still
  does. The harness now exposes `startNewChat`.
- **Branch:** `fix/new-chat-retry-context`, merged as `989c2f10a`.
- **PR title for develop:** `fix(chat): stop treating a new chat's repeated question as Try again`

## BUG-007: years shown as `2,020.00`, counts as `63,437.00`

- **Question:** B10, "How many covid deaths were there in each year in the
  US?" Both models wrote `EXTRACT(YEAR FROM "date") AS "year"`.
- **What the user saw:** a `year` column reading `2,020.00`, `2,021.00`,
  `2,022.00`, `2,023.00`. Every count in every answer so far also carried
  `.00`, and one column could mix `2,922,730` with `541,406.00` (B02).
- **Root cause:** `DataGrid` formatted every number with `formatChartNumber`,
  a chart-axis formatter that shows two decimals for any value between 1 and
  1,000,000 and none above.
- **Fix:** `makeDataGridColumnDefs` formats whole numbers without decimals.
  Whole numbers in a column named like a year, id, or code (`year`, `UID`,
  `FIPS`, `code3`, `country_code`) show plain digits. Fractions keep two
  decimals. This also closes NI-002.
- **Tests:** two new cases in `makeDataGridColumnDefs.test.ts`.
- **Verified in the app:** B10 shows `2020 | 350,604`.
- **Branch:** `fix/grid-number-display`, merged as `5b79ba82b`.
- **PR title for develop:** `fix(viz): show whole numbers and years plainly in the data grid`

## BUG-008: inline SQL shown in the chat bubble

- **Question:** I02, after answering the state lookup. **Model:** ChatGPT.
- **What happened:** ChatGPT wrote its query as plain text instead of calling
  `generateSql`. The edge function extracted and ran it correctly, but also
  returned the whole text as the reply, so the chat bubble showed raw SQL
  reading `FROM "t0"`, an internal alias the user never sees anywhere else.
- **Root cause:** `parseOpenRouterResponse` kept `attemptText` as the reply
  even after `extractSqlFromAssistantText` took the SQL out of it.
- **Fix:** `extractSqlFromAssistantText` returns `{ sql, textWithoutSql }`, and
  the parser replies with the text minus the SQL (prose around a fenced block
  is kept). An empty remainder falls back to the client's "results are
  ready" line.
- **Tests:** two new cases in `parseOpenRouterResponse.test.ts`; the extractor's
  own tests updated for the new return shape.
- **Branch:** `fix/chat-sql-text-leak`, merged as `eee640c83`.
- **PR title for develop:** `fix(chat): keep inline SQL out of the reply the user reads`

## BUG-009: a discovery lookup missed values past the first 100

- **Question:** I07, "Weekly covid deaths in the US vs the UK in 2021".
  **Model:** ChatGPT.
- **What happened:** the model looked up how the UK is stored with
  `SELECT DISTINCT "Country/Region" ... ORDER BY "Country/Region" LIMIT 100`
  and candidates `["UK", "United Kingdom", "U.K.", "Great Britain"]`. The
  global file has 201 countries. "United Kingdom" sorts past the 100th
  ("Latvia"), so no candidate matched, the chat did not continue, and the card
  asked the user to pick from a list that did not contain the answer.
- **Root cause:** discovery relies on the model's lookup query, which the
  system prompt tells it to cap at 100 values, and the client caps at 100 as
  well. Columns with more values than that (2,000 US counties, 201 countries)
  can drop the value the user named.
- **Fix:** `useDiscoveryResolver` also runs
  `buildCandidateLookupSqlFromDiscovery`: a local
  `SELECT DISTINCT col FROM <dataset> WHERE lower(trim(col)) IN (<candidates>)`
  on the lookup's single dataset and column. Matches go first in the options,
  so a single match continues automatically wherever it sorts. Nothing new
  leaves the browser.
- **Tests:** `buildCandidateLookupSqlFromDiscovery.test.ts` (new), a new case in
  `useDiscoveryResolver.test.tsx`, and a pass-through case in
  `DiscoveryBody.test.tsx`.
- **Verified in the app:** I07 on ChatGPT resolves `United Kingdom` on its own
  and returns ground-truth weekly totals.
- **Branch:** `fix/discovery-candidate-lookup`, merged as `b02679c3f`.
- **PR title for develop:** `fix(chat): find the named value even past a discovery's first 100 rows`

## BUG-010: the same lookup asked again after every answer

- **Question:** I09, "Covid deaths by year for Brazil, India and Mexico".
  **Model:** ChatGPT.
- **What happened:** a multi-value lookup for the three countries. After the
  user picked Brazil, India and Mexico, ChatGPT asked the identical lookup
  again, and again after the second answer. The user never got an answer
  short of the three-question cap.
- **Root cause:** the thread records the answer as
  `[Clarification answer: Brazil, India, Mexico]`. The model never sees the
  lookup's results (they stay in the browser by design), so it had no sign
  that these were checked against the column, and its rule "look up any
  filter value you do not know" fired again.
- **Fix:** `annotateClarificationAnswersForModel` adds a note to each picked
  answer in the copy of the thread sent to OpenRouter: it came from the
  options the model offered, and for a column lookup these are the stored
  values exactly, so filter on them and do not look them up again. Consent
  verification and the clarification count still read the thread as the
  client sent it.
- **Tests:** `annotateClarificationAnswersForModel.test.ts`.
- **Verified in the app:** one answer now produces the SQL, with ground-truth
  yearly totals.
- **Branch:** `fix/clarification-answer-loop`, merged as `97356315b`.
- **PR title for develop:** `fix(chat): stop re-asking a lookup the user already answered`

## BUG-011: relative periods guessed, and a blank total called "results"

- **Question:** N05, "covid deaths last year". **Model:** ChatGPT.
- **What happened:** the SQL filtered 2024 (a guessed year; today is
  2026-11-06 and the data ends 2023-03-09). `SUM` over no rows returned one
  blank cell, and the chat said "I ran the query. Your results are ready."
  Before that, both models also asked the user which year "last year" meant.
- **Root cause:** the model is never told today's date or where the data
  ends, and the system prompt told it to clarify "this year" when the data
  spans several years. On the client, `waitForAppliedSqlOutcome` counted any
  row as "rows", including a row of nulls.
- **Fix:** the turn context carries today's date. The system prompt's new
  RELATIVE DATES section tells the model to count relative periods from the
  dataset's own latest date with a subquery (for "last year",
  `year("date") = (SELECT year(max("date")) - 1 FROM "t0")`), not to ask
  which year, and to say which period it used. On the client a result whose
  every value is blank is `empty`, and the empty reply reads "I ran the
  query, but no data matched it." A follow-up commit (`c0c08b571`) keeps
  count columns named like `total_deaths_last_year` grouped ("267,296"),
  which BUG-007's year rule had shown as "267296".
- **Tests:** `waitForAppliedSqlOutcome.test.ts` (blank row is empty; a row with
  one value is rows), `makeChatTurnSuffixFromOptions.test.ts` (today's date),
  `makeDataGridColumnDefs.test.ts` (count named like a year).
- **Verified in the app:** both models now ask only "US or global?" and then
  answer 2022 (267,296 US deaths), the last full year in the data.
- **Branches:** `fix/relative-dates-empty-results` (`19cb6e978`) and
  `fix/grid-year-heuristic` (`946e7aa5d`).
- **PR titles for develop:** `fix(chat): answer relative periods from the data, and call blank totals empty`;
  `fix(viz): group the digits of counts in columns named like a year`

## BUG-012: a chart request in the Data Explorer claimed a dashboard block

- **Question:** N10, "make me a chart of us deaths over time". **Model:**
  Claude.
- **What happened:** the reply read 'Added "US daily new deaths over time" to
  your dashboard as a line.' No dashboard was open, nothing was added, no
  query ran, and the explorer stayed empty.
- **Root cause:** the dashboard tool is offered on every page by design (one
  stable tool list), and the client only queues a dashboard block when a
  dashboard is open. Nothing handled a chart block in the explorer, and the
  edge function's fallback text described a dashboard add.
- **Fix:** `dashboardBlockToExplorerResponse` adapts a response in the Data
  Explorer: a DataViz block becomes generated SQL that the explorer runs,
  and the explorer switches to the block's chart type (`setActiveVizType`).
  Any other block kind gets "I can only add that to a dashboard. Open a
  dashboard and ask me again there."
- **Tests:** `dashboardBlockToExplorerResponse.test.ts` and
  `useAvandarChatRuntime.explorerChart.test.tsx` (both red without the
  wiring).
- **Verified in the app:** N10 on Claude draws a line chart of US daily
  deaths in the explorer.
- **Branch:** `fix/explorer-chart-blocks`, merged as `26f31b195`.
- **PR title for develop:** `fix(chat): show a chart request in the Data Explorer instead of a dashboard claim`

## BUG-013: chart blocks kept the model's table aliases

- **Found while fixing:** BUG-012. The block's SQL read `FROM "t0"`.
- **Root cause:** `parseOpenRouterResponse` rewrites aliases to dataset ids
  for generated SQL and discovery queries, but not for a DataViz block's SQL,
  so a chart the chat added to a real dashboard queried a relation that does
  not exist.
- **Fix:** DataViz block SQL gets the same rewrite.
- **Tests:** a new case in `parseOpenRouterResponse.test.ts`.
- **Branch:** `fix/dashboard-block-aliases`, merged as `94ae480cc`.
- **PR title for develop:** `fix(chat): resolve table aliases in charts the chat adds to dashboards`
