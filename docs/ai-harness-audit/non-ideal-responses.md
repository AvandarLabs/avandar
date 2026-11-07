# AI harness audit: non-ideal responses

Answers that did not fail but were not what a good analyst tool should do.
Each entry names the question, the model, what happened, and what should
have happened. Categories are assigned at the end, once the question plan
has run, and each category is addressed in
[harness-improvements.md](harness-improvements.md).

| ID | Question | Model | Summary |
|---|---|---|---|
| NI-001 | (empty chat) | n/a | Starter suggestions are not analytic questions ("What is the average Lat in long-global-deaths.csv?") |
| NI-002 | B01 | Claude | Whole-number totals shown with decimals (`63,437.00`) |
| NI-003 | B01 | Claude | The reply says only "I ran the query. Your results are ready." with no answer in words and no note of which dataset it used |
| NI-004 | B02 | ChatGPT | Ran a lookup round trip to confirm "California", the user's exact wording |
| NI-005 | B03 | ChatGPT | Asked whether "most deaths" means the cumulative total or the single-day peak |
| NI-006 | B03 | Claude | A new chat inherits the explorer's previous SQL and error, and the model copied the other model's failed SQL |
| NI-007 | B02 | ChatGPT | The discovery question reads "Which stored state value should I use for California?" |

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
