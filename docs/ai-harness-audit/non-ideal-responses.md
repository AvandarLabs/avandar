# AI harness audit: non-ideal responses

Answers that did not fail but were not what a good analyst tool should do.
Each entry names the question, the model, what happened, and what should
have happened. Categories are assigned at the end, once the question plan
has run, and each category is addressed in
[harness-improvements.md](harness-improvements.md).

| ID | Question | Model | Summary |
|---|---|---|---|
| NI-001 | (empty chat) | n/a | Starter suggestions are not analytic questions ("What is the average Lat in long-global-deaths.csv?") |
| NI-002 | B01 | Claude | Whole-number totals shown with decimals (`63,437.00`). Fixed with BUG-007. |
| NI-003 | B01 | Claude | The reply says only "I ran the query. Your results are ready." with no answer in words and no note of which dataset it used |
| NI-004 | B02 | ChatGPT | Ran a lookup round trip to confirm "California", the user's exact wording |
| NI-005 | B03 | ChatGPT | Asked whether "most deaths" means the cumulative total or the single-day peak |
| NI-006 | B03 | Claude | A new chat inherits the explorer's previous SQL and error, and the model copied the other model's failed SQL |
| NI-007 | B02 | ChatGPT | The discovery question reads "Which stored state value should I use for California?" |
| NI-008 | I02 | ChatGPT | A two-state lookup ("California and Texas") never continues on its own, so the user picks both from 58 states |
| NI-009 | I04, I07 | Both | Boundary effects are silent: a 7-day average restarts at Jan 1, and a partial first week (Dec 28 to Jan 3) is shown as a full week |
| NI-010 | B07 | ChatGPT | Asked which dataset's date range to show, when all three share one range |
| NI-011 | I07 | Both | "The UK" silently includes 14 overseas territories, and the US comes from a different dataset than the UK, with neither choice stated |
| NI-012 | I10 | ChatGPT | Asked whether to "include the United States using the separate U.S. deaths dataset"; the global dataset already holds the US |
| NI-013 | H06 | ChatGPT | **Wrong answer.** Summed `Population` across every daily row: Oklahoma 4.5 billion people, 0.22 deaths per 100k (truth 3,956,971 and 250.9) |
| NI-014 | H07 | ChatGPT | "Does the US total match?" answered with 1,143 daily rows instead of the two totals |
| NI-015 | H09 | ChatGPT | **Wrong answer.** "Which 5 states had the highest single-day death count" ranked state-days, listing Florida twice and dropping New York |
| NI-016 | N01, N02, N09, N11 | Both | Overview questions ("how bad was covid in florida", "when was covid the worst?", "is covid getting better or worse?", "show me covid in new york city") all start with a measure question |
| NI-017 | N04 | Claude | A clarification offered its own "Something else" (the card already has one) and "deaths per capita (if population data available)" for a dataset with no population |
| NI-018 | N10 | Claude | A chart of 1,143 daily points hits the line chart's render cap, so the chart stops at 2021-06-04 |
| NI-019 | H03 | ChatGPT | `RANK()` over American Samoa's all-null months returned 286 rows for "which month had the most cases" |

---

## NI-001: starter suggestions are not analytic questions

The empty chat suggests "Show the first 20 rows of long-global-deaths.csv",
"Count rows in long-global-deaths.csv by Country/Region" and "What is the
average Lat in long-global-deaths.csv?". An average latitude means nothing,
and none of the three touches the measure column (`daily_new_deaths`) or the
date. Better: suggestions built from the measure and date columns, for
example "Total daily_new_deaths by month".

## NI-002: whole-number totals shown with decimals

`SUM("daily_new_deaths")` displays as `63,437.00`. `formatChartNumber` shows
two decimals for every value between 1 and 1,000,000, including integers.
Counts of people should display as `63,437`.

## NI-003: the reply does not answer in words

- **Question:** B01. **Model:** Claude.
- **Reply:** "I ran the query. Your results are ready." The SQL was right,
  but the chat never says what it found ("US deaths peaked in January 2022 at
  63,437 and fell to about 12,000 a month by the end of the year") or which
  dataset it chose (`long-us-deaths.csv`, rather than the US rows of
  `long-global-deaths.csv`).
- **Why it matters:** a non-technical user has to read the grid to learn the
  answer, and cannot tell which of two plausible datasets was used.

## NI-004: a lookup round trip to confirm the user's exact wording

- **Question:** B02. **Model:** ChatGPT.
- **What happened:** the model returned a `discovery` clarification with
  candidates `["California", "CA"]`. The client ran
  `SELECT DISTINCT "Province_State" ...`, matched `California`, and sent a
  second turn. The answer was right, but it took two model calls and loaded
  the 400 MB cases dataset just to learn that "California" is spelled
  "California". Claude wrote `WHERE "Province_State" = 'California'` directly
  and got the same answer in one call.
- **What should happen:** when the value the user typed is a proper name
  that a column of that name almost certainly stores verbatim, write the
  filter and verify it locally after the fact (only if the result is empty)
  rather than asking first.

## NI-005: needless "cumulative or single-day?" clarification

- **Question:** B03, "Which state had the most covid deaths?" **Model:**
  ChatGPT.
- **What happened:** "Should 'most deaths' mean the highest cumulative total
  across all dates, or the highest single-day death count?"
- **Why it is wasteful:** every analyst reads "the most deaths" as the total.
  The system prompt tells the model that "top" and "highest" are ambiguous
  "even ostensibly quantitative words ... when in doubt, clarify", which
  pushes it to ask.
- **What should happen:** default to the total, say so in one line, and
  offer the peak as a follow-up.

## NI-006: a new chat inherits the previous SQL and its error

- **Question:** B03 on Claude, right after B03 on ChatGPT failed (BUG-005).
- **What happened:** the turn context carried the explorer's current SQL and
  error ("Previous SQL ... Error ...") from the other chat, and Claude
  reproduced ChatGPT's CTE almost verbatim, minus `QUALIFY`.
- **Why it matters:** "New chat" reads to a user as a clean start. The
  explorer still shows the old query, so a short note is fair, but an error
  from a query the user has moved on from steers the model toward "fixing"
  something the user did not ask about.

## NI-007: discovery questions are worded for engineers

- **Question:** B02. **Model:** ChatGPT.
- **What happened:** "Which stored state value should I use for
  California?" with the rationale "I need the exact value recorded in the
  cases dataset to filter reliably." A user does not know what a "stored
  value" is.
- **What should happen:** "Which of these is California?" or no question at
  all when the lookup resolves on its own (which it did here, so the user
  never saw it).

## NI-008: multi-value lookups never continue on their own

- **Question:** I02, "Compare monthly covid deaths in California and Texas in
  2021". **Model:** ChatGPT.
- **What happened:** a `discovery` with `multi: true` and candidates
  `["California", "CA", "Texas", "TX"]`. Automatic continuation only runs for
  single-value lookups (`useStartDiscovery` skips `multi`), so the user saw
  every state and had to tick California and Texas by hand, although both
  match exactly.
- **What should happen:** when the candidates resolve to stored values the
  user plainly named, continue with those values. Candidates are a flat list,
  so the client cannot tell "California or CA" from "California and Texas";
  grouping candidates per named value would let it.

## NI-009: boundary effects are silent

- **Questions:** I04 (7-day rolling average of US cases in 2022) and I07
  (weekly deaths in 2021). **Models:** both.
- **What happened:** both models filter to the year before computing the
  window, so the averages for Jan 1 to Jan 6 cover 1 to 6 days instead of 7.
  `date_trunc('week', ...)` makes the first 2021 week start on 2020-12-28 and
  hold only Jan 1 to 3. Neither is mentioned.
- **What should happen:** compute the window over the full series and filter
  afterwards, and either drop or flag partial periods.

## NI-010: asked which dataset's date range to show

- **Question:** B07, "What date range does the data cover?" **Model:**
  ChatGPT (on one of two runs).
- **What happened:** a four-option question (US deaths, US cases, global
  deaths, all three). All three datasets cover 2020-01-22 to 2023-03-09.
  Claude answered directly. On a re-run ChatGPT answered with a `UNION ALL`
  over all three, which is the right default.

## NI-011: unstated choices in country comparisons

- **Question:** I07. **Models:** both.
- **What happened:** "the UK" was taken as every `United Kingdom` row, which
  includes Bermuda, Gibraltar and 12 other territories (2,453 deaths in the
  first week against 2,449 for the mainland row). Claude took the US from
  `long-us-deaths.csv` and the UK from `long-global-deaths.csv`. Both are
  defensible; neither is said.
- **What should happen:** one short line naming the datasets and any
  inclusion choice, for example "UK includes overseas territories".

## NI-012: assumed the global dataset lacks the US

- **Question:** I10, "Which countries had the most covid deaths in 2020?"
  **Model:** ChatGPT.
- **What happened:** "Should the ranking include the United States using the
  separate U.S. deaths dataset?" The global file has a `US` row like every
  other country. The model inferred contents from dataset names.

## NI-013: summed a per-place attribute across days (wrong answer)

- **Question:** H06, "Top 10 states by covid deaths per capita in 2021".
  **Model:** ChatGPT. Claude took population once per county and was right.
- **What happened:** `SUM("Population")` over every daily row, about 1,143
  times each county's population. The ranking came out right by chance
  (every state inflated by the same factor), but every number shown was
  wrong, with no warning.
- **Why it matters:** this is the most common trap in long time-series data,
  and nothing in the schema tells the model that `Population` repeats.

## NI-014: did not answer the yes/no question asked

- **Question:** H07. **Model:** ChatGPT.
- **What happened:** a daily comparison of 1,143 rows; the first row reads
  "Different" (the two files split one death differently across the first
  two days) although the totals match exactly (1,123,836). Claude returned
  the two totals and their difference, which answers the question.

## NI-015: "top 5 states" ranked state-days (wrong answer)

- **Question:** H09. **Model:** ChatGPT.
- **What happened:** `ROW_NUMBER() OVER (ORDER BY single_day_deaths DESC)`
  across all state-days, so Florida appears twice and New York (2020-04-07,
  1,271) is missing. Claude ranked each state's best day first.

## NI-016: overview questions start with a measure question

- **Questions:** N01, N02, N09, N11. **Models:** both.
- **What happened:** every one asked "cases or deaths?" (sometimes plus "US
  or global?") before showing anything. These are overview questions; a
  sensible default (cases and deaths over time, by month) answers them and
  the user can narrow from there. The system prompt lists "bad", "best" and
  "worst" as loaded terms that always need a question, which is right for
  ranking people or programs and wrong for "how bad was covid in florida".
- **Not wasteful (kept as is):** B04 "the most covid" (cases or deaths
  ranks states differently), N03 "how many people died" (US or worldwide),
  N04 "which country did best" (what "best" means), N06 "georgia" (state or
  country).

## NI-017: clarification options that duplicate the card or cannot be met

- **Question:** N04. **Model:** Claude.
- **What happened:** options included "Something else" (the card always adds
  "Something else…" and "None of the above", so it showed twice) and "Lowest
  deaths per capita (if population data available)", which the global file
  cannot compute.

## NI-018: long daily series overflow the chart

- **Question:** N10. **Model:** Claude (after BUG-012).
- **What happened:** 1,143 daily points, truncated by the line chart's render
  cap with a toast. The visible chart ends in June 2021, so it looks like the
  pandemic ended there. A weekly or monthly series shows the whole range.

## NI-019: rank ties over all-null groups

- **Question:** H03. **Model:** ChatGPT.
- **What happened:** American Samoa has no case counts at all, so every month
  ties at null and `RANK() = 1` returns all of them. `ROW_NUMBER()` (Claude)
  or `NULLS LAST` with a filter on non-null totals avoids it.

---

## Permission prompts

No consent prompt appeared in any of the 95 recorded turns, and none should
have: the three datasets hold no personal data. The browser's consent audit
log (`ConsentAuditEntry`, IndexedDB) recorded 19 decisions, all
`discovery_clarification` approved in `clean` mode: the place names a user
picked from a lookup, or that matched automatically, which are the only
values that left the browser. User questions mentioning "covid" and
"deaths" did not trip the health-data detector. No row data was ever sent to
the model. The lookups themselves run locally, and BUG-009's candidate
lookup also runs locally, so no harness change was needed here.

---

## Categories

| Category | Entries | Improvement |
|---|---|---|
| C1. Needless clarification | NI-005, NI-010, NI-012, NI-016 | Clarification policy in the system prompt |
| C2. Silent answers and unstated choices | NI-003, NI-011, BUG-011's "say which period" | A one-line `summary` on `generateSql`, shown as the reply |
| C3. Lookup friction | NI-004, NI-007, NI-008 | Skip lookups for full conventional names, plain wording, grouped candidates so multi-value lookups continue on their own |
| C4. Analytic rigor (incl. wrong answers) | NI-009, NI-013, NI-014, NI-015, NI-018, NI-019 | Analyst rules in the system prompt for long time-series data and charts |
| C5. Clarification option hygiene | NI-017 | Drop options that repeat the card's own choices |
| C6. New chat inherits old explorer state | NI-006 | Label the explorer's SQL and error as possibly from before this conversation |
| C7. First-run suggestions | NI-001 | Suggest questions built from measure and date columns |
| C8. Number display | NI-002 | Fixed with BUG-007 |
