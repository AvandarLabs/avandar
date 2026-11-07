# AI harness audit: harness improvements

What changed for each category of [non-ideal responses](non-ideal-responses.md#categories),
after every bug in the [bug log](bug-log.md) was fixed. Each change was made on
its own branch and merged into `demo/measles`, then checked by re-asking the
questions that showed the problem, on both models, against DuckDB ground
truth.

| Category | Branch | Merge | PR title for develop |
|---|---|---|---|
| C1. Needless clarification | `feat/chat-clarification-policy` | `7cbd2f8cd` | `feat(chat): ask fewer, better clarifying questions` |
| C2. Silent answers | `feat/chat-sql-summary` (+ `fix/summary-test-types`) | `1ff399408`, `80919de27` | `feat(chat): explain each answer in a sentence the user can read` |
| C3. Lookup friction | `feat/chat-grouped-lookups` | `d0e1cc608` | `feat(chat): answer multi-value lookups on their own, and skip needless ones` |
| C4. Analytic rigor | `feat/chat-analyst-rules`, `feat/chat-analyst-rules-followup`, `feat/chat-analyst-rules-precision` | `99718c133`, `ac4bcd6cf`, `636222c88` | `feat(chat): teach the model the traps of long time-series data` |
| C4. Charts of long series | `feat/chart-sample-long-series` | `04b7f2629` | `feat(viz): sample long line and area charts across their whole range` |
| C5. Option hygiene | `feat/chat-clarify-option-hygiene` | `d580b39a9` | `feat(chat): keep clarification options to real, answerable choices` |
| C6. Old explorer state in a new chat | `feat/chat-explorer-context-label` | `b3a3798b2` | `feat(chat): tell the model the explorer's SQL may predate the conversation` |
| C7. First-run suggestions | `feat/chat-starter-suggestions` | `6df60e093` | `feat(chat): suggest questions about what a dataset measures over time` |
| C8. Number display | (BUG-007) | | |

---

## C1. Needless clarification

**Change.** `buildSystemPrompts.ts`. The rule that called even "top" and
"highest" ambiguous is gone. Questions are kept for loaded terms that decide
who or what is ranked ("which country did best"). Defaults replace the rest:

- "most", "top", "highest" on a count mean the total; "peak" means the single
  highest value.
- Overview questions ("how bad was X", "when was X the worst") get a monthly
  overview of every measure they could mean, each dataset aggregated before
  joining.
- Datasets at different scopes are chosen by the place the user named.
- Facts every candidate dataset shares (one date range) are answered across
  all of them.
- A world dataset is not assumed to lack a country.

**Before and after.**

| Question | Before | After |
|---|---|---|
| B03 "Which state had the most covid deaths?" | ChatGPT: "cumulative or single-day?" | Both: California, 101,159 |
| B07 "What date range does the data cover?" | ChatGPT: "which dataset?" | Both: 2020-01-22 to 2023-03-09 (Claude per dataset) |
| I10 "Which countries had the most covid deaths in 2020?" | ChatGPT: "include the US from the separate dataset?" | Both: US 350,604, Brazil 195,072 ... |
| N01 "how bad was covid in florida" | Both: "cases or deaths?" | Both: monthly cases and deaths for Florida |
| N02 "when was covid the worst?" | Both: measure question | Claude: monthly overview; ChatGPT: "US or global?" (allowed: no place named) |

Still asked, correctly: B04 (cases or deaths), N03 (US or world), N04 ("best"),
N06 (Georgia), N09 (US or world).

## C2. Silent answers and unstated choices

**Change.** `generateSql` takes an optional `summary`: one or two plain
sentences on what the result shows, which dataset, and every choice made. The
system prompt asks for it on every query; the edge function uses it as the
reply when the model wrote no other text. The model never sees results, so
the summary describes the query, not findings. On the client, a reply for a
query that came back empty or failed leads with that outcome.

**After (examples).**

- B01 (ChatGPT): "This shows total reported COVID-19 deaths by month in 2022
  from the US deaths dataset. It sums daily new deaths across all US
  locations."
- I07 (Claude): "...the UK (from the global deaths dataset, using only the
  main UK entry and excluding overseas territories like Bermuda or Gibraltar
  ...)". This closes NI-011.
- N11 (ChatGPT): "New York City is defined as Bronx, Kings, New York, Queens,
  and Richmond counties; the first and last months may be partial."

## C3. Lookup friction

**Change.**

- Discovery takes optional `candidateGroups`, one group of stored forms per
  named value. When every group matches exactly one stored value, the client
  submits all of them, and every group's forms feed the local candidate
  lookup from BUG-009.
- The prompt says to filter directly on full conventional names (a full state
  name in a state column), to look up abbreviations, codes, nicknames and
  misspellings, to word lookup questions for the user, and that every
  candidate must mean exactly what the user named.
- An automatically matched answer is labeled as automatic in the thread sent
  to the model (BUG-015).

**Before and after.**

| Question | Before | After |
|---|---|---|
| B02 California monthly cases (ChatGPT) | 2 model calls, lookup for "California" | 1 call |
| I02 California and Texas (ChatGPT) | user ticks 2 of 58 states | 1 call, no card |
| I09 Brazil, India and Mexico (ChatGPT) | user ticks 3 countries, then a loop (BUG-010) | 1 call, no card |
| I07 US vs UK (ChatGPT) | user had to type "United Kingdom" (BUG-009) | lookup resolves on its own |

## C4. Analytic rigor

**Change.** An ANALYST CHECKS section in the system prompt:

- Take a place's attributes once per row-level place, then add up (MAX per
  state and county, then SUM per state).
- Keep "Unassigned" and "Out of <state>" rows in totals.
- Compute windows over the full series before filtering.
- Flag partial buckets.
- Rank within each thing before taking the top N.
- Avoid ties on empty groups.
- Answer comparison questions with totals.
- Aggregate long periods for charts, and use a DataViz block in the Data
  Explorer only when the user asks for a chart.

Separately, line and area charts over the render cap now sample evenly across
the whole range instead of keeping the first 500 points.

**Before and after.**

| Question | Before | After |
|---|---|---|
| H06 deaths per capita 2021 (ChatGPT) | Oklahoma 4.5 billion people, 0.22 per 100k | Oklahoma 3,956,971 people, 9,930 deaths, 250.95 per 100k (truth 250.9) |
| H01 deaths per 100k (ChatGPT, after the first wording) | MAX population per state: Mississippi 231,840 people | Arizona 454.78, Mississippi 2,976,149 people (truth) |
| H09 top 5 single-day states (ChatGPT) | Florida twice, New York missing | Missouri, Tennessee, Oklahoma, Florida, New York (truth) |
| H07 do the totals match? (ChatGPT) | 1,143 daily rows | one row: 1,123,836 = 1,123,836 |
| I04 7-day average 2022 | Jan 1 average of 1 day | Jan 1 average 409,498 (window includes late December) |
| N10 chart of US deaths | chart stops at June 2021 | monthly chart to March 2023; daily series sampled across the range |
| B08 daily Texas deaths (Claude, after the first chart wording) | answered with a chart | table of 31 days |

Residual: H03 on ChatGPT still returns tied months for American Samoa, which
has no case counts at all (286 rows instead of 58). The answer for every other
state is right.

## C5. Clarification option hygiene

**Change.** `parseClarify` drops fixed options that repeat the card's own
"Something else…" and "None of the above" (or "Other"). The prompt says to
offer only options the data can answer.

## C6. A new chat inherits the explorer's old query

**Change.** The turn context now says the Data Explorer is showing that SQL,
that it may come from before this conversation, and to build on it only when
the user refers to it; its error is to be fixed only when the user asks. With
the explorer reset between test questions, the two models' SQL stopped being
character-identical copies of each other.

## C7. First-run suggestions

**Change.** With a date column and a measure column, the Data Explorer
suggests "Show total daily_new_deaths by month in long-us-deaths.csv" and
"Which Province_State has the highest total daily_new_deaths?" ahead of the
first-rows preview. Latitude, longitude, FIPS and numbered code columns are
never offered for averages.
