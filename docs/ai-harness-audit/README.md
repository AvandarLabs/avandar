# AI harness audit: COVID datasets

Status: in progress. Started 2026-11-06 on `demo/measles`.

This audit drives the real app, end to end, with the large JHU COVID files
and real OpenRouter models, to find where the Ask Avandar chat and the Data
Explorer return wrong data, fail, ask needless questions, or ask for data
access they should not need. Every finding is logged here so each fix can
later land in `develop` as its own PR.

| File | What it holds |
|---|---|
| [bug-log.md](bug-log.md) | Failures: errors, empty results, or wrong data where the question had a real answer. Each entry has the question, the error, the root cause, and the fix commit. |
| [non-ideal-responses.md](non-ideal-responses.md) | Answers that did not fail but were not what a good analyst tool should do. Bucketed into categories at the end. |
| [harness-improvements.md](harness-improvements.md) | The harness changes made for each non-ideal category, with before and after results. |

## 1. Setup

### Data

The three files come from the cleaned JHU CSSE time series (long format, one
row per place per day). They are imported through **Data Sources > Upload**
with their default names, the way a typical user would leave them.

| Dataset name in the app | Rows | Columns | Grain | Measure column |
|---|---|---|---|---|
| `long-us-deaths.csv` | 3,819,906 | 14 | US county x day, 2020-01-22 to 2023-03-09 | `daily_new_deaths` |
| `long-us-confirmed-cases.csv` | 3,819,906 | 13 | US county x day, same range | `daily_new_cases` |
| `long-global-deaths.csv` | 330,327 | 6 | Country or province x day, same range | `daily_new_deaths` |

Facts about the data that matter for correct answers:

- The US files include 58 `Province_State` values: the 50 states, DC, five
  territories, and the cruise ships `Diamond Princess` and `Grand Princess`.
- `Admin2` holds the county. It also holds `Unassigned` and `Out of <ST>`
  rows, and is null for some territory rows.
- `Population` exists only in the US deaths file, and repeats on every daily
  row of a county. Summing it across rows inflates it about 1,143 times.
- Daily values can be negative (data corrections). The most negative daily
  US deaths value is -25,525.
- In the global file the US is stored as `US`, the UK as `United Kingdom`
  (with 14 overseas-territory provinces plus a null-province mainland row),
  and `Georgia` is a country. `Georgia` is also a US state.
- The global file quotes `"Korea, North"` and `"Korea, South"`. DuckDB's CSV
  sniffer misses the quoting when it samples only the first 20,480 rows, but
  the app's import read the file correctly (330,327 rows).

### Models

Each question runs on the two frontier models offered in the chat model
picker, chosen in the UI:

| Picker label | OpenRouter id |
|---|---|
| Claude | `anthropic/claude-sonnet-5` |
| ChatGPT | `openai/gpt-5.6-terra` |

### Environment

- Local stack for the `demo/measles` worktree (switched Supabase project
  `demo-measles`), vite on port 6213, `supabase functions serve` for the
  `chat` edge function, real `OPEN_ROUTER_API_KEY`.
- Headless Chromium driven by Playwright, signed in as the seeded dev user,
  browser time zone `America/New_York`. The time zone matters: it is how the
  date display bug in BUG-003 surfaced.
- Ground truth for every question is computed independently with DuckDB
  (Python) straight from the CSV files, not through the app.

## 2. Question plan

Each question records: the expected answer (from ground truth), whether a
clarifying question is warranted, and whether any raw data should need to
cross to the model.

Clarification guidance used when grading:

- **Warranted:** the answer changes materially with the interpretation and
  the data cannot settle it. Example: "Georgia" (state or country), "the
  most covid" (cases or deaths), "best" (by what measure).
- **Wasteful:** the schema or general knowledge already settles it.
  Example: asking whether "the US" means `US` or `USA`, or which dataset to
  use for "US deaths" when only one US deaths dataset exists.

Permission guidance used when grading: the model should never need to see
row values to write SQL for these questions. Looking up a stored spelling
(for example `California`) runs locally as a discovery query, and only the
single matched value is sent back. A consent prompt is warranted only when
the values sent could identify a person.

### Basic questions (an analyst's first pass)

| ID | Question | Expected answer | Clarify? |
|---|---|---|---|
| B01 | Show me monthly covid deaths in the US in 2022 | 12 rows. Jan 63,437, Feb 61,417, Mar 32,820 ... Dec 12,298 | No |
| B02 | Show me monthly covid cases in California in 2022 | 12 rows. Jan 2,922,730 ... Dec 293,439 | No |
| B03 | Which state had the most covid deaths? | California, 101,159 | No |
| B04 | Which state had the most covid? | California (cases 12,129,699; deaths 101,159) | One question (cases or deaths) is acceptable, or answer with a stated assumption |
| B05 | How many people died of covid in the US in total? | 1,123,836 | No |
| B06 | Top 10 countries by total covid deaths | US 1,123,836; Brazil 699,276; India 530,779 ... France 166,176 | No |
| B07 | What date range does the data cover? | 2020-01-22 to 2023-03-09 | No |
| B08 | Show daily covid deaths in Texas in January 2021 | 31 daily rows | No |
| B09 | Total covid cases in New York in 2021 | See ground truth | No |
| B10 | How many covid deaths were there in each year in the US? | 4 rows, 2020 to 2023 | No |

### Intermediate questions

| ID | Question | Clarify? |
|---|---|---|
| I01 | Which county had the most covid deaths? | No |
| I02 | Compare monthly covid deaths in California and Texas in 2021 | No |
| I03 | What was the deadliest month for covid in the US? | No |
| I04 | Show the 7-day rolling average of new US cases in 2022 | No |
| I05 | Which day had the most new covid cases in the US? | No |
| I06 | Top 10 counties in Florida by covid cases | No |
| I07 | Weekly covid deaths in the US vs the UK in 2021 | No |
| I08 | What share of global covid deaths happened in the US? | No |
| I09 | Covid deaths by year for Brazil, India and Mexico | No |
| I10 | Which countries had the most covid deaths in 2020? | No |

### Hard questions

| ID | Question | What makes it hard |
|---|---|---|
| H01 | Covid deaths per 100,000 people by state | Population repeats per daily row. It must be taken once per county. |
| H02 | Case fatality rate by state | Two datasets. Aggregate each, then divide. A row-level join on 3.8M rows is slow. |
| H03 | For each state, which month had the most covid cases? | Window function per group |
| H04 | Year-over-year change in covid deaths by state, 2021 vs 2022 | Pivot or self-join |
| H05 | Which states had more deaths in 2022 than in 2021? | Filtered comparison |
| H06 | Top 10 states by covid deaths per capita in 2021 | Population plus a date filter |
| H07 | Does the US total in the global deaths file match the US deaths file? | Cross-dataset check |
| H08 | Show counties in New York state with more than 1,000 covid deaths | "New York" is both a state and a county |
| H09 | Which 5 states had the highest single-day death count, and when? | Arg-max per group |
| H10 | Cumulative covid deaths in the US by month | Running total |

### Questions a non-technical user might ask

| ID | Question | Good behavior |
|---|---|---|
| N01 | how bad was covid in florida | Reasonable default (cases and deaths over time, or totals), stated briefly |
| N02 | when was covid the worst? | Default to deaths or cases by month, say which |
| N03 | how many people died from covid | One question (US or worldwide) is acceptable since both datasets exist |
| N04 | which country did best with covid | Clarify the measure ("best" is loaded) |
| N05 | covid deaths last year | The data ends 2023-03-09. Say so instead of returning an empty table. |
| N06 | show me deaths in georgia | Clarify: the US state or the country |
| N07 | how many ppl got covid in NY | NY means New York state. No clarification. |
| N08 | covid deths in califronia 2021 | Read through the typos |
| N09 | is covid getting better or worse? | Recent trend, stated plainly |
| N10 | make me a chart of us deaths over time | Line chart of US deaths by month or week |
| N11 | show me covid in new york city | NYC spans five counties (New York, Kings, Queens, Bronx, Richmond) |
| N12 | what about texas? (after N01) | Same analysis as N01, for Texas |

### Follow-up questions (conversation memory)

| ID | Asked after | Question |
|---|---|---|
| F01 | B02 | now do the same for Texas |
| F02 | F01 | make it weekly instead |
| F03 | F02 | only show the first half of the year |

## 3. How the audit is run

A small Playwright driver (kept in the gitignored `.temp/` folder, not in the
repo) keeps one headless browser signed in, types each question into the
chat composer, and records:

- the chat request and response JSON from the `chat` edge function,
- the chat panel text (assistant reply, clarification card, banners),
- any open modal (consent prompts),
- the result grid's headers and first rows, and any error alert,
- a screenshot.

The generated SQL is then checked against the ground-truth answer.
