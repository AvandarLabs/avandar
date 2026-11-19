# AI harness eval

The eval in `scripts/ai-eval` answers one question for every harness or
model change: is it at least as accurate as today's chat, and what does each
answer cost? It runs the 45 questions from the
[COVID audit](../ai-harness-audit/README.md) headlessly, executes each
answer's SQL in DuckDB, and grades it against ground truth.

## Results

Runs on 2026-11-07 and 2026-11-08, 45 questions each unless a row says
otherwise. Every run is archived with its answers in
[eval-runs/](eval-runs/README.md). "Correct" is graded against
DuckDB ground truth. Cost is what OpenRouter billed, including prompt-cache
discounts.

### Today's harness compared with the Pi agent

| Harness and model | Correct | Needless or missed questions | Input tokens per call | Share of input cached | Cost per question | Latency p50 / p90 |
|---|---|---|---|---|---|---|
| Today, Claude Sonnet 5 (2 runs) | 44, 44 | 0 | 7,650 to 7,935 | 0% | $0.0234 to $0.0255 | 4.4 to 5.1 s / 9.8 to 13.0 s |
| Today, GPT-5.6 Terra (2 runs) | 44, 44 | 0 | 4,490 | 97 to 99% | $0.0052 to $0.0053 | 3.7 to 3.8 s / 6.9 to 7.5 s |
| Today, Claude Haiku 5.5 (3 runs, control) | 45, 44, 44 | 0 | 7,585 to 8,164 | 0% | $0.0013 to $0.0014 | 4.1 s / 6.2 to 6.6 s |
| Today with the D21 fix, Claude Sonnet 5 (1 run) | 42 | 1 | 7,768 | 0% | $0.0238 | 4.7 s / 11.7 s |
| **Today with the D21 fix, Claude Haiku 5.5 (2 runs; the default since D31)** | **44, 45** | **0** | 7,693 to 8,270 | 0% | **$0.0013 to $0.0015** | 4.1 s / 6.2 to 6.3 s |
| Pi agent, Claude Sonnet 5 (2 runs) | 44, 45 | 0 to 2 | 2,690 to 2,840 | 89 to 95% | $0.0045 to $0.0050 | 3.7 to 3.8 s / 5.7 to 5.9 s |
| Pi agent, GPT-5.6 Terra (2 runs) | 45, 45 | 1 to 2 | 1,440 to 1,550 | 21 to 27% | $0.0058 to $0.0061 | 2.3 to 2.6 s / 3.2 to 3.8 s |
| **Pi agent, Haiku 5.5 with Sonnet 5.5 escalation (5 final runs)** | **45, 45, 45, 45, 44** | **0** | **2,795 to 2,817** | **88 to 90%** | **$0.00028 to $0.00055** | **2.2 to 2.4 s / 3.2 to 3.8 s** |

How the savings split, on Claude:

| Step | Cost per question | Saving |
|---|---|---|
| Today's harness, Sonnet 5 | $0.0255 | |
| Same harness, Haiku 5.5 (model swap only) | $0.0014 | 18x |
| Pi agent, Haiku 5.5 (smaller prompt, prompt caching, thinking off) | $0.0003 | another 4 to 5x |

Today's harness sends about 7,600 tokens per call with no cache markers, so
Anthropic models re-read the whole prompt every time, and Sonnet 5 spent
12,443 reasoning tokens on one run. The Pi agent's prompt is about a third
of the size, its fixed part is cached (88 to 95% of input tokens were cache
reads on Anthropic models), and thinking is off.

### Model sweep on the Pi agent

One run each, thinking off. The first eight ran before the last two prompt
fixes (see "Changes made while running the eval"); the final round ran on
the frozen prompt.

| Model | Correct | Cost per question | Latency p50 | Notes |
|---|---|---|---|---|
| Claude Haiku 5.5 | 45 | $0.00030 | 2.5 s | First run; chosen |
| GPT-6 Luna | 42; final 44 | $0.00026 | 2.3 to 2.5 s | Best non-Anthropic option; misses on rolling averages and weekly sums |
| GLM 5.3 | final 44 | $0.00210 | 2.1 s | As accurate as Haiku in one run, 7x the cost, slow p90 (7.4 s) |
| GLM 5.3 Flash | 41; final 42 | $0.00046 to $0.00060 | 4.0 to 4.6 s | p90 over 13 s |
| DeepSeek V4 Pro | final 41 | $0.00120 | 4.0 s | |
| Qwen 3.7 Plus | final 40 | $0.00071 | 5.6 s | |
| MiMo 2.6 Pro | final 40 | $0.00035 | 4.2 s | p90 12.7 s |
| MiMo 2.6 Flash | 38 | $0.00013 | 3.1 s | |
| Kimi K2.6 | final 38 | $0.00138 | 2.9 s | 3 needless questions |
| Qwen 3.7 Flash | 36 | $0.00009 | 2.6 s | Cheapest; misses per-capita and window questions |
| Mercury 3 | 36 | $0.00018 | 1.0 s | Fastest; misses most hard questions |
| Gemini 3.5 Flash-Lite | final 32 | $0.00158 | 1.5 s | |
| DeepSeek V4 Flash | 28 | $0.00029 | 2.3 s | |
| MiniMax M3.1 Flash | 27 | $0.00074 | 3.8 s | |

The cheaper models fail mostly on the hard questions (per-capita math,
per-group rankings, rolling windows), and they fail silently: the SQL runs
and returns wrong numbers, so escalating on errors cannot catch them. That
is why the primary model is Haiku rather than a router over cheaper models
(decision D12).

### What the eval found in today's harness

- **New York City (N11) is wrong on both of today's models.** GPT-5.6 Terra
  filtered `Admin2 IN ('Bronx', 'Kings', 'New York', 'Queens', 'Richmond')`
  without the state, which adds Kings County, CA and the Richmond counties
  in Virginia, Georgia, and North Carolina (April 2020 cases: 128,918
  instead of 128,276). Claude Sonnet 5 accepted an automatic match of "New
  York" and showed Manhattan alone. The audit graded this question by eye
  and missed the first error. The Pi agent's prompt had a rule for it;
  decision D21 ported it to today's harness, and N11 then passed 4 of 4
  runs (Sonnet 5 twice, GPT-5.6 Terra twice). The Sonnet 5 run after the
  fix scored 42 because one follow-up chain failed together (F01 read the
  CSV file name as a table, and F02 and F03 build on it); the chain passed
  10 of 10 on two reruns.
- **Silent misses vary between runs.** Each of today's setups missed a
  different question across runs (N11, H06, H07), so single runs are not
  enough to compare harnesses.

### Remaining misses on the chosen setup

Across the five final runs (225 answers), one was wrong: N06 ("show me
deaths in georgia") left out the "Out of GA" rows, against the prompt's
rule, for a total 4% low. It ran without error, so escalation could not
catch it.

### Phase 1A

Runs on 2026-11-09 for the page-agnostic agent (D35), archived under the
`phase-1a` label. The agent ran with prompt v2, which reads the current page
block. The six page questions P01 to P06 are described under "Questions and
ground truth". Today's chat only ran the three that give it the same
context (P01, P02, P05).

| Run | Correct | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|
| phase-1a:agent-45 (agent, prompt v2, 45 questions) | 45/45 | 0 / 0 | $0.00030 | 3,026 | 2.7 s / 8.8 s |
| phase-1a:agent-page #1-#3 (agent, P01-P06) | 6/6, 6/6, 6/6 | 0 / 0 | $0.00019 to $0.00021 | 3,127 to 3,128 | 5.4 to 7.9 s / 5.9 to 8.3 s |
| phase-1a:today-page (today's chat, P01, P02, P05) | 2/3 | 1 / 0 | $0.00190 | 11,585 | 6.3 s / 7.1 s |

- P04 ("Make this a line chart" with two tiles on screen) asked exactly one
  question in every run, as expected.
- Today's chat missed P01: it asked which dataset to use, then totalled US
  deaths instead of the open global dataset.
- Prompt v2 costs about 210 more input tokens per call (+7%) and stays
  inside D10's cost range.

Then, on 2026-11-09, personal values in page SQL became placeholders
(D39, [phase-1a-redaction.md](specs/phase-1a-redaction.md)), archived under
the `phase-1a-redaction` label. P07 shows a dashboard chart of Kings County
deaths in 2022, with `Admin2` treated as personal, so the model reads
`"Admin2" = '<value 1>'` and must keep it when asked for the chart by week.

| Run | Correct | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|
| phase-1a-redaction:agent-page #1 (title named the county) | 7/7 | 0 / 0 | $0.00036 | 3,123 | 2.2 s / 2.7 s |
| phase-1a-redaction:agent-page #2 (no placeholder rule) | 6/7 | 1 / 0 | $0.00021 | 3,138 | 1.8 s / 2.7 s |
| phase-1a-redaction:agent-page #3 (final) | 7/7 | 0 / 0 | $0.00031 | 3,213 | 1.8 s / 2.9 s |
| phase-1a-redaction:p07-repeat #1-#2 (P07 alone) | 1/1, 1/1 | 0 / 0 | $0.00019 | | 2.0 s |
| phase-1a-redaction:agent-45 (prompt v2 with the placeholder rule) | 45/45 | 0 / 0 | $0.00026 | 3,110 | 2.1 s / 3.3 s |

- Run #1 passed P07 without testing it: the tile was titled "Deaths in
  Kings County by month", titles get only the content check, and the model
  wrote `'Kings'` from the title. The tile is now "Deaths in one county by
  month".
- Run #2 missed P07: Haiku read `'<value 1>'` as an unknown value and asked
  which New York county to use. Prompt v2 now says to keep a placeholder
  exactly as written and never ask what it is.
- From run #3 on, P07 passed three times in a row, each time with
  `'<value 1>'` kept in the model's SQL and restored on the device to sum
  to 2,707. P01 to P06 and the 45 questions still pass. The placeholder
  rule adds about 75 to 85 input tokens per call. All seven runs cost $0.018.

After an adversarial review, the redaction was hardened (D39): values are
masked in what comes back from a query, detection fails closed, and
prompt v2 gained rules on using placeholders. Runs archived under the
`phase-1a-redaction-review` label.

| Run | Correct | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|
| phase-1a-redaction-review:agent-page (P01-P07) | 7/7 | 0 / 0 | $0.00022 | 3,257 | 1.8 s / 2.6 s |
| phase-1a-redaction-review:agent-45 | 43/45 | 0 / 0 | $0.00030 | 3,193 | 2.4 s / 3.4 s |
| phase-1a-redaction-review:rerun #1-#3 (H06, N04) | H06 2/3, N04 3/3 | 0 / 0 | $0.00035 | | 3.2 s |

- Neither miss had a page block, so neither touched placeholders. H06
  rounded per-capita rates to five places, which reordered tied states,
  and on one rerun dropped "Unassigned" rows. N04 left out countries with
  zero deaths. Both are known to vary between runs (see "Remaining misses
  on the chosen setup").
- The longer prompt rules add about 45 to 85 input tokens per call over
  the first placeholder rule. The review runs cost $0.017.

A second review narrowed word masking to values compared with a personal
column and fixed large ids (D39). Runs archived under the
`phase-1a-redaction-review2` label.

| Run | Correct | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|
| review2:agent-page (P01-P07) | 6/7 | 0 / 1 | $0.00034 | 3,224 | 1.9 s / 2.1 s |
| review2:agent-45 | 43/45 | 0 / 0 | $0.00062 | 3,177 | 2.1 s / 3.3 s |
| review2:rerun #1-#3 (P04, N02, N04) | P04 1/3, N02 3/3, N04 1/3 | | $0.00017 to $0.00031 | | |
| review2:p04-check #1-#4 (scoped "never ask") | P04 4/4, P07 4/4 | 0 / 0 | $0.00017 to $0.00055 | | |
| review2:agent-45-final | 44/45 | 0 / 0 | $0.00026 | 3,164 | 2.1 s / 3.2 s |
| review2:agent-page-final | 7/7 | 0 / 0 | $0.00020 | 3,264 | 1.7 s / 2.8 s |

- P04 ("make this a pie chart" with two charts) answered without asking in
  3 of 4 runs once the placeholder rule said "page text". Its page block
  had no placeholders and was unchanged, so the cause was the rule's
  unscoped "Never ask what it is". Scoped to "never ask the user what a
  placeholder stands for", P04 asked in 5 of 5 runs.
- N02 and N04 have no page block. N02 missed once and passed 3 of 3 on
  rerun; N04 left out zero-death countries, as it does on some runs.
- The second review's runs cost $0.048.

Then the page block named the open dataset before its alias
(`"Response cases" (query it as t0)`), prompt v2 said never to show the
user an alias such as `t0`, and view-change lines stopped carrying a
case's id. Runs archived under the `phase-1a-fixes` label.

| Run | Correct | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|
| phase-1a-fixes:agent-page (P01-P07) | 7/7 | 0 / 0 | $0.00036 | 3,280 | 1.9 s / 2.5 s |
| phase-1a-fixes:agent-45 | 45/45 | 0 / 0 | $0.00028 | 3,232 | 2.2 s / 3.3 s |

- No reply in either run named a table alias. Both runs cost $0.015.

### Phase 1B

Runs on 2026-11-09 for attachable context (D41, [phase-1b.md](specs/phase-1b.md)),
archived under the `phase-1b` label. The agent ran with prompt v3, which reads
the `<attached>` and `<mentioned>` blocks. The mention questions M01 to M06 are
described under "Questions and ground truth".

| Run | Correct | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|
| phase-1b:agent-mentions #1-#3 (M01-M06, M03b) | 7/7, 7/7, 7/7 | 0 / 0 | $0.00018 to $0.00036 | 3,557 to 3,560 | 1.8 to 2.2 s / 2.3 to 2.4 s |
| phase-1b:agent-page (P01-P07) | 7/7 | 0 / 0 | $0.00021 | 3,556 | 1.7 s / 2.7 s |
| phase-1b:agent-45 | 44/45 | 0 / 0 | $0.00055 | 3,478 | 2.1 s / 3.5 s |
| phase-1b:rerun-n04 | 1/1 | 0 / 0 | $0.00036 | | 3.5 s |

- The bar is met: every mention question passes on all three runs, P01 to P07
  still pass on v3, and the 45 questions score 44/45. The miss, N04, left out
  zero-death countries, as it does on some runs, and passed on rerun.
- M05 (an unavailable dashboard) ran no query and told the user it cannot see
  it on every run. M06 kept `'<value 1>'` for the mentioned Kings County chart.
- Prompt v3 adds about 290 input tokens per call (+9%) over v2's last runs.
  Cost per question on the 45 was $0.00055 against $0.00028 on v2's last run,
  with fewer model calls (58 against 62). It stays inside the range v2's own
  runs showed ($0.00026 to $0.00062), so the difference is run-to-run
  variance and caching, not more work per question. All Phase 1B runs cost
  about $0.03.

### Coded columns

Runs on 2026-11-13 for dictionaries attached as reference, archived under the
`attach-dictionaries` label. These runs used the coded-column prompt before
it was merged with the plugin AI tools: v3 plus CODED COLUMNS, then named v4.
It ships as `data-agent-v5`, which also carries the plugin tools' v4 TOOLS
bullet. The measles questions were rerun with v5 on 2026-11-13, under
the `dictionary-conversions` label (see "Converted columns"). The prompt lists each bound column's codes and
description on its own line under its dataset, the offline agent reads the
code lists in its profile and question values, and `lookup_values` answers
from a code list without running a query. The coded-column questions D01 to
D04 run over the measles line list (`--workspace measles`) and are described
under "Questions and ground truth".

| Run | Correct | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|
| attach-dictionaries:coded #1-#3 (D01-D04) | 4/4, 4/4, 4/4 | 0 / 0 | $0.00013 to $0.00306 | 3,721 to 3,781 | 1.7 to 2.5 s / 1.8 to 3.2 s |
| attach-dictionaries:coded-offline (Qwen3 4B, D01-D04) | 4/4 | 0 / 0 | $0 | 814 | 6.0 s / 72.7 s |
| attach-dictionaries:agent-page #1 (P01-P07) | 6/7 | 0 / 1 | $0.00020 | 3,950 | 1.9 s / 2.2 s |
| attach-dictionaries:agent-page #2 (P01-P07, rerun) | 7/7 | 0 / 0 | $0.00020 | 3,980 | 2.2 s / 3.7 s |
| attach-dictionaries:agent-mentions #1 (M01-M06, M03b) | 6/7 | 0 / 0 | $0.00021 | 3,985 | 2.1 s / 2.9 s |
| attach-dictionaries:agent-mentions #2 (M01-M06, M03b, rerun) | 7/7 | 0 / 0 | $0.00019 | 3,989 | 2.1 s / 2.7 s |
| attach-dictionaries:agent-45 | 44/45 | 0 / 0 | $0.00032 | 3,904 | 2.3 s / 3.4 s |

- The plan's bar: "D01 to D04 pass on all three online runs; the 45
  questions score 43/45 or better (v3's last run scored 44/45, and one
  borderline question moves between runs); P01 to P07 and every mention
  question pass." Counting both page and mention runs, it is met on the
  rerun and not on the first run: D01 to D04 passed on all three online
  runs, the 45 questions scored 44/45, and the page and mention questions
  scored 6/7 and 6/7 on the first runs, then 7/7 and 7/7 on the rerun. No
  prompt was changed between the runs.
- N04, the miss on the 45, left out zero-death countries, as it does on
  some runs (see Phase 1B).
- P04 ("make this a pie chart" with two charts on screen) missed on run #1:
  it answered without asking which chart. On run #2 it asked one question
  and found all 12 truth rows. It has varied between runs before (1 of 3 in
  Phase 1A's second review), and it involves no code list.
- M05 (an unavailable dashboard) failed on run #1 only because of the
  grader: the agent ran no query and said it cannot see the dashboard, but
  its reply described the datasets as "COVID-19" data, and
  `runtime/gradeEvalAnswer.ts:47` fails any digit in that reply. On run #2
  it passed. The grader is unchanged.
- After review, the coded-column graders were tightened: D01 to D03 now pass
  only a one-row result holding exactly one number, equal to the count, so a
  code shown beside a wrong count (D01's 1 is also the Male code, D03's 3 the
  Upper-middle code) fails. D04 no longer accepts "not recorded", which an
  invented meaning can say. The four coded runs were re-graded from their
  saved answers and complete result previews, with no new model calls: every
  run still scores 4/4, and each D01 to D03 answer was a single `count(*)`
  or `SUM(CASE ...)` column.
- D04 ("What does a GENDER value of 9 mean?"): every online run said the
  code has no label, quoted `(no label)`, named the labelled codes (1 Male,
  2 Female), and said it cannot tell what 9 stands for. The offline run said
  9 "represents 'No label' as per the dataset's coding" and invented no
  meaning. No run ran a query for it.
- The offline run took 72.7 s on its first answer, which loads the model and
  profiles the data, and about 6 s per answer after that.
- The coded-column prompt adds about 400 to 430 input tokens per call over Phase 1B's v3
  runs (3,904 against 3,478 on the 45 questions, +12%), all from the coded
  columns instructions, since the COVID datasets have no code lists. All
  online runs cost about $0.035.

### Converted columns

Runs on 2026-11-13 for columns converted by a dictionary, archived under the
`dictionary-conversions` label. A converted column's code line is written
for the labels it holds (`values Male, Female`), so `data-agent-v5` reads it
as stored labels with no new prompt version. The measles workspace now also
holds the line list's linked dataset, `measles-line-list-small (labeled)`,
whose GENDER, hosp_yn, and ses_cat are converted by the app's own
`ColumnConversion` SQL (ses_cat as the ordered `ENUM`, GENDER's unlabeled 9
passed through as `'9'`). E01 to E03 ask about it; D01 to D04 run beside it.

| Run | Correct | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|
| dictionary-conversions:converted #1-#3 (D01-D04, E01-E03) | 7/7, 7/7, 7/7 | 0 / 0 | $0.00014 to $0.00041 | 3,957 | 1.7 to 2.0 s / 2.0 to 2.1 s |
| dictionary-conversions:converted-offline (Qwen3 4B, D01-D04, E01-E03) | 6/7 | 1 / 0 | $0 | 836 | 8.6 s / 76.8 s |

- The bar, "D01 to D04 and E01 to E03 pass on all three online runs", is
  met: every online run scored 7/7. The offline run is recorded, not gated.
- Every E answer, online and offline, filtered the labeled dataset on labels
  (`"GENDER" = 'Female' AND "hosp_yn" = 'Yes'`, `"ses_cat" = 'Lower-middle'`,
  `"ses_cat" IN ('Upper-middle', 'High')`, or offline the same with `OR`),
  never on codes.
- With both datasets in the prompt, the online runs answered D01 over the
  labeled dataset on all three runs (filtering on labels, with the right
  count), and D02 and D03 over the coded one on codes. Offline, D03 went to
  the labeled dataset and filtered `'High'`. Every one of those counts was
  right.
- The offline D04 missed: instead of saying 9 has no label, it asked the
  simulated user whether 9 means "Unknown" or "Not applicable", took
  "Unknown", and replied that 9 means "Unknown". The `attach-dictionaries`
  offline run passed D04 with one dataset in the prompt. No prompt changed.
- The second dataset adds about 180 to 240 input tokens per call online
  (3,957 against 3,721 to 3,781 on the `attach-dictionaries:coded` runs) and
  22 offline (836 against 814). All online runs cost about $0.005.
### Phase 1D

Runs for dashboard actions from anywhere (D44,
[phase-1d.md](specs/phase-1d.md)), archived under the `phase-1d` label. The
dashboard questions D01 to D09 are described under "Questions and ground
truth". Today's chat set the bar first, on 2026-11-11, before the agent's
dashboard tool was built.

| Run | Correct | D01 to D05 (open editor) | D06 to D09 (elsewhere) | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|---|---|
| phase-1d:today-dashboards #1 (D05 before its wording fix) | 5/9 | 5/5 | 0/4 | 1 / 0 | $0.00149 | 10,981 | 3.0 s / 9.1 s |
| phase-1d:today-dashboards #2 | 5/9 | 5/5 | 0/4 | 0 / 0 | $0.00122 | 9,599 | 2.8 s / 4.7 s |
| phase-1d:today-dashboards #3 | 5/9 | 5/5 | 0/4 | 0 / 0 | $0.00124 | 9,599 | 3.0 s / 4.8 s |

- **The bar for the agent:** D01 to D05 at least 5/5, as today's chat
  scores on every run, and D06 to D09 on all three agent runs.
- Today's chat fails D06 to D09 by design. In the Data Explorer (D06) it
  shows the chart in the explorer and adds nothing to the mentioned
  dashboard. On a map page (D07 to D09) it offers a block that the app
  drops, because no editor is open, and it never says a named dashboard
  does not exist (D08).
- On run #1, D05 ("What were total deaths in 2022?") asked which dataset
  to use. With US and global deaths in the workspace, that question was
  fair, so D05 now says "US deaths" (see "Changes made while running the
  eval"). Runs #2 and #3 use the fixed wording. The three runs cost $0.035.
- After the baseline, a review of the questions made D07 and D09 fail a
  table, since both ask for a chart. Today's chat added no block on either,
  so its numbers do not change.

**Prompt v6, the shipping prompt (2026-11-18).** These are the final runs.
`data-agent-v6` is v5 plus DASHBOARD BLOCKS, and v5 is v3 plus the plugin
tools' TOOLS bullet and the CODED COLUMNS rules, both from `demo/measles`.
The prompt text did not change during these runs. A bullet was added to it
afterwards: see "Closing the open items" below. Every run is on the Pi
harness with Haiku 5.5 and Sonnet 5.5 escalation unless the row says
offline (Qwen3 4B). `--questions D` on the default COVID workspace selects
the dashboard questions D01 to D09. The measles workspace's coded-column
questions also have the ids D01 to D04, but they run only with
`--workspace measles`, so the two sets are never mixed.

| Run | Correct | D01 to D05 (open editor) | D06 to D09 (elsewhere) | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|---|---|
| phase-1d:agent-dashboards #1 (v6; 39% of input cached) | 9/9 | 5/5 | 4/4 | 0 / 0 | $0.00065 | 5,544 | 2.6 s / 3.2 s |
| phase-1d:agent-dashboards #2 (v6) | 9/9 | 5/5 | 4/4 | 0 / 0 | $0.00022 | 5,544 | 1.9 s / 2.4 s |
| phase-1d:agent-dashboards #3 (v6) | 9/9 | 5/5 | 4/4 | 0 / 0 | $0.00023 | 5,543 | 1.9 s / 2.3 s |
| phase-1d:agent-page (P01 to P07) | 6/7 | | | 0 / 1 | $0.00023 | 5,575 | 1.9 s / 2.5 s |
| phase-1d:rerun-p04 (nine single reruns of P04) | 5/9 | | | 0 / 4 | $0.00020 to $0.00039 | 5,636 to 5,756 | 1.7 to 3.9 s |
| phase-1d:agent-mentions (M01 to M06, M03b) | 7/7 | | | 0 / 0 | $0.00023 | 5,607 | 1.9 s / 2.6 s |
| phase-1d:agent-45 | 45/45 | | | 0 / 0 | $0.00031 | 5,534 | 2.2 s / 3.3 s |
| phase-1d:offline-45 (Qwen3 4B, no page block, before the offline prompt fix) | 25/45 | | | 0 / 1 | $0 | 1,109 | 19.5 s / 28.1 s |
| **phase-1d:offline-45 (Qwen3 4B, no page block, after the offline prompt fix)** | **26/45** | | | **0 / 1** | **$0** | **1,015** | **16.4 s / 27.7 s** |
| phase-1d:offline-dashboards (Qwen3 4B, after the fix) | 6/9 | 4/5 | 2/4 | 1 / 0 | $0 | 880 | 18.0 s / 83.2 s |

- **Bars.** Dashboards D01 to D09 on all three runs: **met**. P 7/7:
  **missed** (6/7 on the run, see the next bullet), and **met** afterwards
  (7/7 once the prompt asks which chart, see "Closing the open items").
  M 7/7: **met**. The 45
  at 44 or 45: **met** (45/45). Offline: D05 and D08 write nothing and every
  write outside the editor has `via: "card"`: **met**. The D score is
  recorded (6/9). The offline 45 at 26 or better: **met at exactly 26, after
  one fix** (25/45 before it). A later change raised it to 30/45. None of
  those offline runs sent a page block, which the app does on every turn.
  With the page block the app sends, the final code scores 30/45 on an
  empty Data Explorer (27/45 with the dashboard gate on any block, 26/45
  with the gate on dashboard turns and every empty page block sent): see
  "Closing the open items" below, which says what that score does and does
  not measure.
- **P04 missed on the P run, and the cause is v5, not the dashboard rules.**
  "make this a pie chart", with two charts on the dashboard, should ask
  which one. The miss ran `run_query` on the cases chart and replied that it
  matched the "Monthly US cases in 2022" chart, with no question. Nine
  single reruns passed 5 and missed 4, so P04 is 5 of 10 on v6. The same
  question on older prompts (ten runs each, a temporary local edit of
  `DATA_AGENT_PROMPT_ID`, labels `phase-1d:diag-p04-v3`, `-v4`, and `-v5`):

  | Prompt | P04 asked and passed | Input tokens per call (two-call runs) |
  |---|---|---|
  | v3 | 10/10 | 3,889 to 3,921 |
  | v4 (v3 plus the plugin tools' bullet) | 10/10 | 3,956 to 3,970 |
  | v5 (v4 plus CODED COLUMNS) | 5/10 | 4,166 to 4,197 |
  | v6 (v5 plus DASHBOARD BLOCKS) | 5/10 | 5,730 to 5,756 |

  The drop is between v4 and v5, and v6 matches v5, so the dashboard rules
  did not change P04's rate. v5 is already on `demo/measles`. No prompt was
  changed for it in these runs: a fix would be new text in v6 (for example,
  ask which chart when "this" could mean several), outside the dashboard
  rules this eval set out to check. The samples are small (10 runs each).
  Three such wordings were tried afterwards. The third closed it (`5a508a3c2`)
  and the first two were not kept: see "Closing the open items" below.
- **The 45 scored 45/45.** The 45's earlier miss, H07, passed.
- **No dashboard prompt fix was needed.** The three D runs passed every
  question, including D01 (a chart with the editor open, 3 of 3) and D08 (a
  missing dashboard, 3 of 3 with the widened phrase list), so
  `DASHBOARD_BLOCK_RULES` is as it was before these runs.
- **v6 costs about 1,550 more input tokens per call than v5 and about
  1,850 more than v3.** On the same question (P04, two calls): 5,730 to
  5,756 on v6, 4,166 to 4,197 on v5, 3,889 to 3,921 on v3 (+37% and +47%).
  Across whole runs against v3's last runs: P 5,575 against 3,556 (+57%),
  the 45 5,534 against 3,478 (+59%), M 5,607 against 3,557 to 3,560 (+58%).
  Against the first-numbered prompt's runs below, v6 adds 221 to 285 tokens
  per call (+4 to +5%): the plugin tools' bullet and CODED COLUMNS. The
  dashboard tool's schema and rules are in the cached prefix: 95 to 100% of
  input tokens were cache reads on every run but D run #1
  (39% cached, which cost $0.00065 per question against $0.00022 and
  $0.00023 on the next two). The 45 cost $0.00031 per question against
  $0.00055 on v3's last run.
- **The offline 45 scored 25/45 on the rebased tree, then 26/45 after a
  fix.** Compared with the last archived offline run before dashboards
  (`local_qwen3-4b_final2`, 26/45), question by question:

  | Question | `final2` | Rebased tree | After the fix |
  |---|---|---|---|
  | B09 | miss | pass | pass |
  | H04 | pass | miss | pass |
  | N05 | pass | miss | pass |
  | N01 | pass | pass | miss |

  Every other question kept its result in all three runs. The same three
  flips (B09, H04, N05) showed on 2026-11-17, so offline runs repeat for the
  same code. H04 and N05 missed as before: N05 ("covid deaths last year")
  filtered 2025 where `final2` chose 2022, and H04 put the 2021 range in
  the WHERE clause, so its 2022 column was empty. Neither touches
  dashboards. The cause was the longer offline prompt: this phase appended
  the CONTEXT and DASHBOARDS rules and the dashboard form of the run-query
  rule to every turn, and a 4B model reads a longer prompt less well. The
  prompt grew from 953 input tokens per call in `final2` to 1,109. The fix
  (`7c4f95033`) adds them only on a turn that carries context blocks or
  names a dashboard (later narrowed to turns that can be about a dashboard,
  since the app sends a page block on every turn: see "Closing the open
  items"). A plain question gets the prompt `demo/measles` builds,
  byte for byte (a hash test pins it). H04, N05, and B09 passed in a
  targeted run (`phase-1d:offline-diag-a`) before the full run, which
  scored 26/45 at 1,015 tokens per call.
- **N01 now misses, because of the dashboard tool in the tool list.** N01
  ("how bad was covid in florida") filtered the dates to end at
  `"date" < '2023-01-01'`, which dropped the last three months of the
  data. With `add_dashboard_block` taken out of the tool list in a
  temporary local edit (`phase-1d:offline-diag-notool`), N01 ended its
  filter at `'2024-01-01'` and passed. At that point a plain question still
  saw that one tool entry. Offering the tool only on a turn with dashboard
  context was the next candidate and was done afterwards (`a68dac7f8`, see
  "Closing the open items" below). The offline agent has no plugin tools, so
  until then its tool list differed from `demo/measles` by that one tool.
- **Offline, nothing was written that should not have been.** D05 (a data
  question) and D08 (a missing dashboard) wrote no block. The editor
  questions D01 to D03 wrote through the editor, and the two other writes
  (D06 and D07) have `via: "card"`. Neither offline 45 run wrote a block or
  called the dashboard tool. The offline questions' results did not change
  from the first-numbered prompt's run (6/9, the same questions missed):
  D01 to D03 passed in the editor, D04 ("a table of the 5 states with the
  most deaths") ran `run_query` and answered in words with no block, D06
  added a bar chart through the card, and D07 asked which dashboard (a
  needless question, since the request named it) before adding the weekly
  chart. On D08 and D09 it asked which dashboard twice, got an answer both
  times, and ended with no reply text and no block: it neither said it
  cannot find "Budget" (D08) nor added to the chosen dashboard (D09).
- All the v6 runs on this page cost $0.0395 in 45 online runs: the six
  final runs $0.0272 (D $0.0099, P $0.0016, M $0.0016, the 45 $0.0140),
  the nine P04 reruns $0.0028, and the 30 prompt comparison runs $0.0096.
  The five offline runs cost $0.

**Closing the open items (2026-11-18, after the v6 runs above).** Two open
items were worked on the committed v6 prompt: the online P04 miss and the
offline margin. P04 closed on the third prompt wording (`5a508a3c2`), after
two wordings that did not and were not kept. The offline margin closed in
one change (`a68dac7f8`). A third item came up on the way: D04, a question
that was flaky on committed v6 itself and missed the three-run D bar. It
closed on the sixth wording overall (`a4def86ad`), after two wordings that
did not and were not kept. Every run is the Pi harness on Haiku 5.5 with
Sonnet 5.5 escalation unless the row says offline (Qwen3 4B). "Wording 1" to
"wording 3" are the P04 iterations and "wording A" to "wording C" the D04
iterations, quoted below.

| Run | What it tested | Result | Bar |
|---|---|---|---|
| phase-1d:p04-fix1 (10 runs) | P04, wording 1 | 10/10 | P04 target 10/10: **met** |
| phase-1d:agent-page-fix1 | P, wording 1 | 7/7 | P 7/7: **met** |
| phase-1d:agent-mentions-fix1 | M, wording 1 | 7/7 | M 7/7: **met** |
| phase-1d:agent-45-fix1 | The 45, wording 1 | 42/45 (F02, F03, N11) | 44 or 45: **missed** |
| phase-1d:agent-dashboards-fix1 (3 runs) | D, wording 1 | 7/9, 7/9, 8/9 | D01 to D05 5/5 and D06 to D09 on every run: **missed** |
| phase-1d:diag-d-fix1 (8 runs) | D01, D04, D06, wording 1 | D01 missed 8 of 8, D06 4 of 8, D04 1 of 8 | A diagnostic, no bar |
| phase-1d:p04-fix2 (10 runs) | P04, wording 2 | 8/10 | P04 target 10/10, or 9/10 with one explained miss: **missed** |
| phase-1d:p04-fix3 (10 runs) | P04, wording 3 | 10/10 | P04 target 10/10: **met** |
| phase-1d:agent-dashboards-fix3 (3 runs) | D, wording 3 | 9/9, 9/9, 8/9 (D04) | D01 to D05 5/5 and D06 to D09 on every run: **missed** by D04 alone, which is not caused by the wording (see below) |
| phase-1d:agent-dashboards-fix3b (3 more runs) | D, wording 3 | 9/9, 9/9, 8/9 (D04) | Same: **missed** by D04 alone |
| phase-1d:agent-page-fix3 | P, wording 3 | 7/7 | P 7/7: **met** |
| phase-1d:agent-mentions-fix3 | M, wording 3 | 7/7 | M 7/7: **met** |
| phase-1d:agent-45-fix3 | The 45, wording 3 | 45/45 | 44 or 45: **met** |
| phase-1d:diag-d04-fix3 (10 runs) | D04 alone, wording 3 | 7/10 | A diagnostic, no bar |
| phase-1d:diag-d04-v6 (10 runs) | D04 alone, committed v6 without wording 3 | 3/10 | A diagnostic, no bar |
| phase-1d:d04-fix-a (10 runs) | D04 alone, wording A | 9/10 | D04 10/10, or 9/10 with one explained miss: **met** |
| phase-1d:agent-dashboards-d04a (3 runs) | D, wording A | 8/9, 8/9, 9/9 (D04) | Every D run 9/9: **missed** |
| phase-1d:agent-page-d04a | P, wording A | 7/7 | P 7/7: **met** |
| phase-1d:p04-d04a (10 runs) | P04, wording A | 10/10 | P04 10/10: **met** |
| phase-1d:agent-mentions-d04a | M, wording A | 7/7 | M 7/7: **met** |
| phase-1d:agent-45-d04a | The 45, wording A | 44/45 (N11) | 44 or 45: **met** |
| phase-1d:d04-fix-b (10 runs) | D04 alone, wording B | 8/10 | D04 10/10, or 9/10 with one explained miss: **missed** |
| phase-1d:d04-fix-c (10 runs) | D04 alone, wording C | 10/10 | D04 10/10: **met** |
| phase-1d:agent-dashboards-d04c (3 runs) | D, wording C | 9/9, 9/9, 9/9 | Every D run 9/9: **met** |
| phase-1d:agent-page-d04c | P, wording C | 7/7 | P 7/7: **met** |
| phase-1d:p04-d04c (10 runs) | P04, wording C | 10/10 | P04 10/10: **met** |
| phase-1d:agent-mentions-d04c | M, wording C | 7/7 | M 7/7: **met** |
| phase-1d:agent-45-d04c | The 45, wording C | 44/45 (N11 answered in text) | 44 or 45: **met** |
| phase-1d:offline-45-tool-gate | Offline 45, no page block, the dashboard tool only on turns with blocks or a dashboard in the message | 30/45 | 26 or better: **met** |
| phase-1d:offline-dashboards-tool-gate | Offline D, the dashboard tool only on turns with blocks or a dashboard in the message | 6/9 | D05 and D08 write nothing, every write outside the editor has `via: "card"`: **met** |
| phase-1d:offline-45-page-before | Offline 45 with the page block the app sends (`--page data-explorer`), the rules and tool on any turn with a block | 27/45 | 26 or better: **met** |
| phase-1d:offline-45-page-after | Offline 45 with the page block, the rules and tool only on dashboard turns | 26/45 | 26 or better: **met, with no margin** |
| phase-1d:offline-45-page-omit | Offline 45 with the page block, an empty Data Explorer's block left out | 30/45 | 26 or better: **met** |
| phase-1d:offline-dashboards-page-gate | Offline D, the rules and tool only on dashboard turns | 6/9 | D05 and D08 write nothing, every write outside the editor has `via: "card"`: **met** |
| phase-1d:offline-dashboards-page-omit | Offline D, an empty Data Explorer's block left out | 6/9 | D05 and D08 write nothing, every write outside the editor has `via: "card"`: **met** |

- **P04 before and after, ten runs each.**

  | Prompt | P04 asked and passed |
  |---|---|
  | v3 | 10/10 |
  | v4 | 10/10 |
  | v5 | 5/10 |
  | v6 as committed | 5/10 (and 5 of 9 on the single reruns) |
  | v6 with wording 1 | 10/10 |
  | v6 with wording 2 | 8/10 |
  | **v6 with wording 3 (committed)** | **10/10** (and 1 of 1 in the P run) |

- **Wording 1 fixed P04 and broke other questions.** It was a new last
  section, after DASHBOARD BLOCKS:

  ```text
  WHICH CHART
  - When "this" or "it" could mean any of several charts on the page and no @mention says which, call ask_user with their titles as options before you run any query or add any block. Never pick one yourself.
  ```

  P04 asked once and passed on 10 of 10 runs, and P and M scored 7/7. The
  rest missed. Over the three D runs and the eight-run diagnostic (11 runs
  of D01, D04, and D06), D01 missed 10 times: it ran `run_query` and said it
  had not added the chart to the dashboard, the failure that DASHBOARD BLOCKS
  was written to stop, and it passed on every earlier v6 run. D06 ("Add this
  as a bar chart to @COVID 2022", on a page showing a deaths query) missed 6
  times by adding the mentioned dashboard's cases chart instead of the
  Explorer's deaths query. D04 missed 2 times with a wrong ranking, which
  turned out to be noise (see the D04 bullet below). In the 45, F02 ("make it weekly instead") asked "Should the
  weekly view cover California, Texas, or both?", a needless question, and F03
  followed it. N11 has missed on other runs before. The likely causes are
  "or it" (follow-ups say "it" all the time), the "@mention" clause (D06 has
  a mention), and "add any block". That is a reading of the answers, not an
  experiment. Wording 3 drops all three, and D01, D06, F02, and F03 passed.
- **Wording 2 was narrower and still missed.** It names only "this" on a page
  that lists several charts, drops "@mention" and the query and block
  clause, and sits before DASHBOARD BLOCKS so that section stays last:

  ```text
  WHICH CHART
  - When the page lists several charts and the user says "this" about a chart without naming it, your first step is ask_user with their titles as options. Never pick one yourself.
  ```

  P04 scored 8/10. One miss answered in plain text with no query and no
  `ask_user`, and one ran the cases chart's query without asking. Two
  iterations were allowed at that point, so no suite ran on wording 2 and
  its D runs are unknown. Neither wording 1 nor wording 2 was kept.
- **Wording 3 closed P04 (`5a508a3c2`).** It reads the prompt's order: the
  model chose `run_query` at the last sentence of DASHBOARD BLOCKS' first
  bullet ("A chart that only needs to show here ... uses `run_query`"), so
  the new rule is a bullet right after that sentence, inside DASHBOARD
  BLOCKS (which stays last). It covers only a change to how an existing
  chart is shown, with examples that differ from the eval's own wording,
  says an add to a dashboard is not covered, and has no "it" and no
  "@mention" clause. It names `ask_user`, which the grader needs: a
  clarification counts only when asked through that tool, and an answer in
  plain text has no result.

  ```text
  - Changing how a chart on the page is shown (for example "show this as a table" or "turn this into a line chart") is a different request from adding to a dashboard. When the page lists more than one chart and the user names none, call ask_user with their titles as options, and run no query until they answer. Never pick a chart yourself. A request to add, put, or pin something on a dashboard is not covered by this rule, and neither is a question with one clear target.
  ```

  P04 asked once and passed on 10 of 10 runs, then 1 of 1 inside the P run.
  P scored 7/7, M 7/7, and the 45 scored 45/45 (F02, F03, and N11, which
  wording 1 broke, passed). D01 and D06 passed on all six D runs (two sets
  of three). The v1 to v5 hash tests pass.
- **D04 is flaky on committed v6, and wording 3 does not cause it.** D04
  ("Add a table of the 5 states with the most deaths") missed once in each
  of the two D sets on wording 3, so by the strict reading the D bar (D01 to
  D05 5/5 on every run) is **missed** on 2 of 6 runs. The miss is the model
  adding `year("date") = 2022` to a request that names no period, because
  the dashboard is titled "COVID 2022". The request has no "this" and is not
  a chart change, so the new bullet does not apply to it. Ten runs of D04
  alone passed 7 on wording 3 and 3 on committed v6 (the bullet emptied
  temporarily, then restored), so the wording does not make D04 worse:
  counting the first D set on committed v6 (3 of 3 passed), D04 is
  6 of 13 on committed v6 against 11 of 16 on wording 3. The earlier 9/9 on
  three D runs was luck, and the D bar as written cannot be met reliably
  by any v6 text until D04 is settled. That was open then, and it was the
  Phase 1D eval's remaining miss until wording C below. It was not part of
  the P04 fix, and no prompt or grader was changed for it in that
  commit. The options were a rule against taking a
  period from a dashboard's title, or a question wording that names "overall"
  (the D05 precedent).
- **Two wordings for D04 were tried and not kept.** Each is a bullet right
  after the DataViz bullet in DASHBOARD BLOCKS, with no "it", no place name,
  and no year. Wording A:

  ```text
  - A dashboard's name or title is a label, not a filter. Build a chart or table from the user's words with only the filters and period they asked for, and no period when they named none, unless they refer to the dashboard's own period or to a chart on the page. A chart copied from the page keeps its own filters.
  ```

  D04 alone scored 9/10 (the miss added the year "so it matches the
  dashboard's year"), P04 10/10, P 7/7, M 7/7, and the 45 44/45 (N11). The D
  set then missed D04 in 2 of 3 runs (8/9, 8/9, 9/9), both times with the
  year in the title and the filter, so "every D run 9/9" failed. That is 3
  misses in 13 runs of D04 against 7 in 13 on committed v6. Wording B:

  ```text
  - A dashboard's name, title, and charts are labels, not filters. Never copy their year or place into a chart or table you build from the user's words: use only the filters and period the user asked for, and all dates when they named no period, even when the dashboard is about one year. Take a period from the dashboard or from a chart on the page only when the user refers to that period. A chart copied from the page keeps its own filters.
  ```

  D04 alone scored 8/10. Neither miss added a year: both said "using all
  dates ... since you named no period". Both dropped the "Unassigned" and
  "Out of <state>" county rows from the totals (`"Admin2" <> 'Unassigned'`),
  which the SQL rules say to keep, so row 3 was not Florida. No suite ran on
  wording B, because D04 alone missed the gate, and the two iterations
  allowed for D04 were used. The prompt in the tree is the one committed in
  `5a508a3c2`. **Root cause, a reading of the answers:** D04 has two
  independent failure modes. Taking the year from the dashboard's title is
  the common one on committed v6 (6 of the 7 misses in ten runs), and
  wording B removed it (0 of 10 runs added a year). What is left is the
  model dropping the "Unassigned" and "Out of" rows from a ranking, which
  showed up in 2 of 10 runs on wording B, in 1 of 11 on wording 1, and in 0
  of 10 on committed v6. A third wording would pair wording B with a sentence
  that a ranking or a total over the data keeps the "Unassigned" and "Out of
  <state>" rows, in the same bullet. That is wording C.
- **Wording C closed D04 (`a4def86ad`).** It is wording B plus a last
  sentence in the same bullet, which points at the SQL rule that already
  says to keep "Unassigned" and "Out of <state>" rows in totals (it does not
  change that rule: a ranking by state was not being read as a total):

  ```text
  - A dashboard's name, title, and charts are labels, not filters. Never copy their year or place into a chart or table you build from the user's words: use only the filters and period the user asked for, and all dates when they named no period, even when the dashboard is about one year. Take a period from the dashboard or from a chart on the page only when the user refers to that period. A chart copied from the page keeps its own filters. A ranking or top-N is still a total, so each total keeps the "Unassigned" and "Out of <state>" rows, as the SQL rules say.
  ```

  D04 alone scored 10/10 (0 year filters, 0 dropped rows), and the three D
  runs scored 9/9 each. P scored 7/7, P04 10/10 (so `5a508a3c2` still
  works), M 7/7, and the 45 44/45 (N11 answered in text without a query, a
  known flaky question). The v1 to v5 hash tests pass.

  | D04 alone | Passed |
  |---|---|
  | v6 as committed before the D04 work | 3/10 (6 of 13 with the first D set) |
  | v6 with the P04 bullet (wording 3) | 7/10 |
  | wording A | 9/10 |
  | wording B | 8/10 |
  | **wording C (committed)** | **10/10** |
- **Offline: the dashboard tool only on a turn that can use it (`a68dac7f8`).**
  The offline agent lists `add_dashboard_block` only on a turn with context
  blocks or a dashboard named in the message, the condition that then added
  the dashboard rules to its prompt (later narrowed, see the offline 45 with
  the page block below). `createDataAgent` takes a
  `shouldOfferDashboardTool` option, read at the start of every `ask`. It
  defaults to always, so the online agent and the per-version tool lists are
  unchanged. A second change was needed. Pi declares a tool-list change as a
  system message with an empty body, and the local model conversion sent it to
  the model as an empty user message, so a turn that added or removed the
  tool showed the model an empty user turn. `toLocalLlmMessages` now drops a
  system update that has no text, since the model learns its tools from the
  instructions and the action schema.
- **The offline 45 scored 30/45, up from 26, with no page block.** Compared with the run before
  the change (26/45) and with `local_qwen3-4b_final2` (26/45):

  | Question | `final2` | Before the change | After |
  |---|---|---|---|
  | N01 | pass | miss | pass |
  | H05 | miss | miss | pass |
  | I06 | miss | miss | pass |
  | N12 | miss | miss | pass |
  | B09 | miss | pass | pass |

  Every other question kept its result, so nothing that passed before
  missed. Why H05, I06, and N12 also flipped was not investigated. A plain
  question now gets the prompt and the tool list `demo/measles` builds. The
  run used 962 input tokens per call (1,015 before, 1,109 on the rebased
  tree) at 15.1 s / 24.5 s. It called no dashboard tool and wrote no block.
  The 15 misses are B08, I04, I07, I08, I09, H01, H02, H06, H09, H10, N03,
  N04, N07, N10, and N11.
- **The offline D questions are unchanged at 6/9.** Same questions and same
  tool calls as the run before the change: D04 ran `run_query` with no
  block, D08 and D09 asked twice and ended with no reply and no block, and D07
  asked once. D05 and D08 wrote nothing, D01 to D03 wrote through the editor,
  and D06 and D07 wrote through the card.
- **The offline 45, re-measured with the page block the app sends
  (2026-11-18).** Every offline 45 run above asked the 45 questions with no
  page, so no turn carried a `<current_page>` block. The app sends one on
  every turn, and a one-line "unchanged" block on a later turn that did not
  change. The offline agent turned its dashboard rules and tool on for any
  turn with a block, so in the app every offline turn had the longer prompt
  and the dashboard tool, the configuration the 25/45 run measured. The
  30/45 above measured a path the app never takes. `--page data-explorer`
  (`runEval.ts`, on `pi` and `pi-local`) now gives every question that sets
  no page of its own the Data Explorer page block, and a follow-up the query
  and columns the last answer left on screen, as the app does. The runs
  without the flag are as before. The gate changed too: the rules and tool
  now come only when the page is a dashboard, a dashboard or one of its
  charts is attached or mentioned, the turn has a card line, or the message
  names a dashboard. A page block that says "unchanged" keeps the answer of
  the turn before it. A last change leaves out the page block of a Data
  Explorer that shows nothing (only `Page: Data Explorer`), on device turns
  only: the offline model cannot use it, and it costs the model questions
  (below). A page that shows a dataset, a query and its columns, a
  dashboard, or a map keeps its block, and so does an empty one once the
  model last heard of something on screen.

  | Run (Qwen3 4B) | Correct | Input tokens per call | Misses |
  |---|---|---|---|
  | `phase-1d:offline-45-tool-gate`, no page block, gate on any block (earlier) | 30/45 | 962 | B08 H01 H02 H06 H09 H10 I04 I07 I08 I09 N03 N04 N07 N10 N11 |
  | `phase-1d:offline-45-page-before`, page block, rules and tool on every turn | 27/45 | 1,129 | B08 H01 H02 H06 H09 H10 I04 I07 I08 I09 N01 N03 N04 N05 N06 N07 N11 N12 |
  | `phase-1d:offline-45-page-after`, page block, rules and tool only on dashboard turns | 26/45 | 939 | B08 H01 H02 H05 H06 H09 H10 I04 I07 I08 I09 N01 N03 N04 N05 N07 N10 N11 N12 |
  | **`phase-1d:offline-45-page-omit`, as above, an empty Data Explorer's page block left out** | **30/45** | **970** | B08 H01 H02 H06 H09 H10 I04 I07 I08 I09 N03 N04 N07 N10 N11 |

  - **Before the gate, with the page block, the offline 45 scored 27/45,
    not the 25/45 the rebased tree scored.** The longer prompt and the tool
    were on every turn in both runs, but the page block changed which
    borderline questions pass. Against the 30/45 run, N01, N05, N06, and N12
    missed and N10 passed.
  - **With the gate, the score is 26/45, and no answer called the dashboard
    tool.** The prompt is the one `demo/measles` builds, byte for byte, on
    every one of the 45 questions (a hash test pins it), and 939 tokens per
    call against 1,129. Against the run before the gate, H05 and N10 now miss and
    N06 passes: the three questions that move between these runs, as before.
    The gate is right by construction and by prompt length, not by this
    score.
  - **The page block itself costs the offline model four questions.** The
    prompt is the same as in the 30/45 run, so the difference is the block's
    text in the user message: H05, N01, N05, and N12 passed without it and
    miss with it, and N06 passes in both. A block that says only `Page: Data
    Explorer` tells the model nothing it can use.
  - **Leaving that block out brings the score back to 30/45.** A device turn
    now sends no page block while the Data Explorer shows nothing, so a plain
    question reaches the model as it did on `demo/measles`. The 41 questions
    that are not follow-ups reach it exactly as in the run with no page
    block, and the four follow-ups (N12, F01, F02, and F03, which follow an
    answer) are sent the query and columns the last answer left on screen.
    The miss list is identical to the no-page-block run's, and the run used
    970 input tokens per call against 962. Hosted turns are unchanged, and
    the page block is still sent for a dashboard, a map, an open dataset, a
    query on screen, and for an empty Data Explorer once the model last
    heard of something on screen. Every question that differs among the four
    runs:

    | Question | No page block (30/45) | Block, gate on any block (27/45) | Block, gate on dashboard turns (26/45) | Block left out when empty (30/45) |
    |---|---|---|---|---|
    | H05 | pass | pass | miss | pass |
    | N01 | pass | miss | miss | pass |
    | N05 | pass | miss | miss | pass |
    | N06 | pass | miss | pass | pass |
    | N10 | miss | pass | miss | miss |
    | N12 | pass | miss | miss | pass |
  - **What the 30/45 measures.** The run with `--page data-explorer` is a
    fresh, empty Data Explorer: no open dataset, no query on screen, so the
    41 questions that are not follow-ups reach the model with no page block.
    In the app the Data Explorer keeps its last query and open dataset across
    chats, so a first turn there often carries a non-empty page block, and
    such a turn behaves like the earlier 26/45 and 27/45 runs, which sent the
    block. The score in the real app depends on that state, and 30/45 is the
    score for an empty Data Explorer. The eval also differs from the app after
    a failed query: it keeps the previous query on screen for the next
    follow-up, while the app shows the failed SQL.
  - **Offline D stayed at 6/9** (`phase-1d:offline-dashboards-page-gate` and
    `phase-1d:offline-dashboards-page-omit`): D01 to D03 passed in the
    editor, D04 ran `run_query` with no block, D05 and D08 wrote nothing, D06
    and D07 wrote through the card, and D08 and D09 asked twice and ended
    with no reply and no block, as in every earlier run. Offline runs repeat
    exactly for the same code and the same block text, so 30/45 holds for
    this code, and moves with any change to the prompt or the block.
  - The five runs cost $0.
- **Cost.** The 135 online runs cost $0.1579: wording 1 $0.0329 (P04 $0.0042,
  P $0.0017, M $0.0016, the 45 $0.0134, D $0.0062, the diagnostic $0.0058),
  wording 2 $0.0036, wording 3 $0.0389 (P04 $0.0039, the two D sets
  $0.0063 and $0.0061, P $0.0017, M $0.0016, the 45 $0.0135, the D04
  diagnostics $0.0058), wording A $0.0298 (D04 $0.0031, D $0.0063, P $0.0017,
  P04 $0.0033, M $0.0016, the 45 $0.0138), wording B $0.0030, and wording C
  $0.0497 (D04 $0.0031, D $0.0063, P $0.0017, P04 $0.0032, M $0.0016, the 45
  $0.0337, which ran on a cold cache). The two offline runs cost $0.

**Earlier runs on the first-numbered prompt (v4), kept as history.** They
ran on 2026-11-17, before the rebase, with the dashboard prompt as first
numbered, v4: v3 plus DASHBOARD BLOCKS. It ships as `data-agent-v6`, v5
plus DASHBOARD BLOCKS, because `demo/measles` shipped v4 (the plugin tools'
TOOLS bullet) and v5 (CODED COLUMNS) first. The v6 runs above repeat all of
them. All runs below are on the Pi harness with Haiku 5.5 and Sonnet 5.5
escalation unless the row says offline.

| Run | Correct | D01 to D05 (open editor) | D06 to D09 (elsewhere) | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|---|---|
| phase-1d:agent-dashboards #1 (v4 as first written) | 8/9 | 4/5 | 4/4 | 0 / 0 | $0.00061 | 5,166 | 2.5 s / 3.2 s |
| phase-1d:agent-dashboards #2-#4 (after the first prompt fix) | 9/9, 7/9, 8/9 | 5/5, 4/5, 5/5 | 4/4, 3/4, 3/4 | 0 / 0 | $0.00021 to $0.00024 | 5,236 to 5,237 | 1.9 to 2.0 s / 2.3 to 2.9 s |
| **phase-1d:agent-dashboards #5-#7 (after the second prompt fix; final)** | **9/9, 9/9, 9/9** | **5/5, 5/5, 5/5** | **4/4, 4/4, 4/4** | **0 / 0** | **$0.00020 to $0.00042** | **5,259** | **2.0 to 2.1 s / 2.2 to 2.9 s** |
| phase-1d:agent-page (P01 to P07) | 7/7 | | | 0 / 0 | $0.00239 | 5,354 | 2.0 s / 3.3 s |
| phase-1d:agent-mentions (M01 to M06, M03b) | 7/7 | | | 0 / 0 | $0.00023 | 5,334 | 2.0 s / 2.5 s |
| phase-1d:agent-45 | 44/45 | | | 0 / 0 | $0.00045 | 5,250 | 2.3 s / 3.5 s |
| phase-1d:offline-dashboards (Qwen3 4B) | 6/9 | 4/5 | 2/4 | 1 / 0 | $0 | 880 | 18.0 s / 82.8 s |
| phase-1d:offline-45 (Qwen3 4B, no page block) | 25/45 | | | 0 / 1 | $0 | 1,101 | 16.9 s / 23.0 s |

- **The agent's bars were met on that prompt, after its second fix.** D01 to D05 scored 5/5
  and D06 to D09 4/4 on all three final runs, P and M scored 7/7, and the
  45 scored 44/45. The runs before the final prompt are kept in the table
  because they missed (see below).
- **D01 missed on the first prompt, every time.** "Add a line chart of
  monthly US deaths in 2022" with the editor open ran `run_query` and showed
  the chart in the reply, with no block (4 of 4 runs, 3 of them single
  reruns). The prompt said to call the dashboard tool "only when the user
  asks to add, put, or pin something on a dashboard", and the message never
  says "dashboard". The prompt now says that when the page block shows a
  dashboard, "add a chart, table, heading, or note" with no dashboard named
  means that dashboard, and the first fix alone still let D01 slip once in
  five runs (run #3). The second fix added "even for a chart or table of
  data. Never answer such a request with `run_query` alone". D01 then
  passed 3 of 3.
- **D08 missed twice after the first fix, then passed.** The Map-page
  request for a Budget dashboard that does not exist wrote nothing, as
  required, and replied "I couldn't add the heading because I don't have a
  dashboard named "Budget" that you can edit". That says it cannot find the
  dashboard, but the question's phrase list (`NOT_FOUND_PATTERN`) has no
  match for "don't have", so the grader failed it. The second fix tells the
  model to say plainly that it cannot find a dashboard with that name. On
  the final runs the replies said "I can't find a dashboard ..." and D08
  passed 3 of 3, in one call each: the model answered from the page and
  dashboard list without calling the tool. The grader was not changed.
- **The 45 missed H07 once.** It compared the two files day by day instead
  of comparing their totals, as it does on some runs, and passed on 2 of 2
  reruns. P01 cost $0.0152 in the P run (two calls, 10,645 prompt tokens),
  which is why that row costs $0.00239 per question against $0.00021 on
  Phase 1B's last run. The other six P questions cost $0.0002 to $0.0004.
- **The dashboard prompt (then v4) costs about 1,700 to 1,800 more input
  tokens per call than v3.** P: 5,354 against 3,556 (+51%). The 45: 5,250 against 3,478 (+51%).
  M: 5,334 against 3,557 to 3,560 (+50%). Most of it is the dashboard
  tool's schema and the dashboard rules, in the cached prefix: on the runs
  that followed another run, 85 to 100% of input tokens were cache reads.
  The first run of each batch is partly cold (38% cached on D run #1, 64%
  on D run #5), and cost $0.00061 and $0.00042 per question against about
  $0.00021 warm. The 45 cost $0.00045 per question against $0.00055 on
  v3's last run, inside the range v2 and v3 showed.
- **Offline, nothing was written that should not have been.** D05 (a data
  question) and D08 (a missing dashboard) wrote no block, and every write
  outside the editor (D06 and D07) has `via: "card"`. The 45 questions wrote
  no block at all. Qwen3 4B did D01 to D03 in the editor, added a bar chart
  to the mentioned dashboard through the card (D06), and asked which
  dashboard to use before adding the weekly chart (D07, answered by the
  simulated user). It missed D04: the top 5 states came back as a reply
  with no block. On D08 and D09 it asked which dashboard twice, got an
  answer both times, and then ended with no reply text and no block: it
  neither said it cannot find "Budget" (D08) nor added to the chosen
  dashboard (D09). Offline runs repeat exactly for the same code, so these
  are not noise.
- **The offline 45 scored 25/45, one under the bar of 26.** Compared with
  the last archived offline run (26/45, `local_qwen3-4b_final2`), H04 and
  N05 now miss and B09 now passes. Both misses repeat on a rerun. N05
  ("covid deaths last year") now filters on 2025 (last year relative to the
  run's date), where the older run chose 2022. H04 now puts the 2021 range
  in the WHERE clause, so its 2022 column is empty. Neither question touches dashboards.
  The offline prompt changed in this phase (the dashboard rules and the
  page in context), and the earlier note holds that borderline questions
  move between prompt revisions, but this total is below the bar. The v6
  runs above repeat it (25/45), find the cause, and fix it.
- The first-numbered prompt's online runs cost $0.06, in 17 runs, reruns
  included (the baseline's $0.035 not included).

### Phase 1E

Runs for Try again and parity in the agent (D45,
[phase-1e.md](specs/phase-1e.md)), archived under the `phase-1e` label.
The Try again questions T01 to T06 are described under "Questions and
ground truth". Today's chat set the bar first, on 2026-11-19, before the
agent side was built. It ran with its `retryContext`, on
`anthropic/claude-haiku-5.5`.

| Run | Correct | T01 | T02 | T03 | T04 | T05 | T06 | Repeats (T01 and T04 / all) | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| phase-1e:today-retry #1 | 6/6 | pass | pass | pass | pass | pass (repeat) | pass | 0 / 1 | 1 / 0 | $0.00301 | 10,425 | 5.3 s / 6.4 s |
| phase-1e:today-retry #2 | 6/6 | pass | pass | pass | pass | pass | pass | 0 / 0 | 1 / 0 | $0.00292 | 10,433 | 4.6 s / 5.0 s |
| phase-1e:today-retry #3 | 6/6 | pass | pass | pass | pass | pass | pass | 0 / 0 | 0 / 0 | $0.00280 | 10,627 | 4.6 s / 4.8 s |

- **The bars for the agent:** today's chat passes 18 of the 18 graded
  answers, and repeats on T01 and T04 sum to 0 over the three runs.
- On T01 the first attempt asked whether to rank by cases or deaths, and
  the retry ran a different query. On T04 the first attempt asked which
  Georgia, and the retry answered without asking, with the US state's
  monthly deaths, on all three runs.
- T05's retry asked a needless question on runs #1 and #2 (what to put
  under the heading) before it wrote the heading again. It repeated the
  first attempt's block on run #1. On runs #2 and #3 it avoided a repeat
  only narrowly: the block differs only in its heading level or alignment.
  T05 has one right answer, so a repeat there is fine.
- The three runs cost $0.052.

The agent then ran the same set on prompt v6, on the Pi harness with
Haiku 5.5 and Sonnet 5.5 escalation and `--page data-explorer`, on
2026-11-19. Each retry is a hosted Try again, so its turn text carries the
Try again line (`TRY_AGAIN_LINE` in
`shared/agent/pageContext/buildAgentTurnText.ts`) before the message. Three
wordings of the line ran, three times each. The row label names the
wording.

| Run | Correct | T01 | T02 | T03 | T04 | T05 | T06 | Repeats (T01 and T04 / all) | Needless / missed | Cost per question | Input tokens per call | Latency p50 / p90 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| phase-1e:agent-retry #1 (starting line) | 4/6 | pass | fail | pass | pass | fail | pass | 0 / 0 | 1 / 0 | $0.00096 | 6,134 | 3.2 s / 4.1 s |
| phase-1e:agent-retry #2 (starting line) | 5/6 | pass | fail | pass | pass | pass | pass | 0 / 0 | 0 / 0 | $0.00046 | 6,056 | 2.1 s / 3.0 s |
| phase-1e:agent-retry #3 (starting line) | 6/6 | pass | pass | pass | pass | pass | pass | 0 / 0 | 1 / 0 | $0.00047 | 6,079 | 2.1 s / 3.7 s |
| phase-1e:agent-retry-w2 #1 (wording 2) | 6/6 | pass | pass | pass | pass | pass | pass | 0 / 0 | 0 / 0 | $0.00052 | 6,163 | 2.8 s / 3.6 s |
| phase-1e:agent-retry-w2 #2 (wording 2) | 5/6 | pass | pass | pass | pass | fail | pass | 0 / 0 | 0 / 0 | $0.00046 | 6,086 | 1.9 s / 2.5 s |
| phase-1e:agent-retry-w2 #3 (wording 2) | 4/6 (5/6 regraded) | pass | pass | fail (grader gap, passes regraded) | pass | fail | pass | 0 / 0 | 0 / 0 | $0.00046 | 6,086 | 1.8 s / 3.0 s |
| phase-1e:agent-retry-w2-recheck (T03, three runs) | 3/3 | | | pass, pass, pass | | | | 0 / 0 | 0 / 0 | $0.00069 to $0.00075 | 6,113 to 6,138 | 2.4 to 2.9 s |
| **phase-1e:agent-retry-w3 #1 (wording 3, shipped)** | **6/6** | **pass** | **pass** | **pass** | **pass** | **pass** | **pass** | **0 / 0** | **0 / 0** | **$0.00098** | **6,180** | **2.3 s / 3.2 s** |
| **phase-1e:agent-retry-w3 #2 (wording 3, shipped)** | **6/6** | **pass** | **pass** | **pass** | **pass** | **pass** | **pass** | **0 / 0** | **0 / 0** | **$0.00053** | **6,184** | **2.4 s / 2.8 s** |
| **phase-1e:agent-retry-w3 #3 (wording 3, shipped)** | **6/6** | **pass** | **pass** | **pass** | **pass** | **pass** | **pass** | **0 / 0** | **0 / 0** | **$0.00048** | **6,113** | **2.1 s / 2.8 s** |

- **The agent met all five bars on wording 3.** Against today's chat's
  three runs:

  | # | Bar | Today's chat | Starting line | Wording 2 | Wording 3 |
  |---|---|---|---|---|---|
  | 1 | Right: passes over T01 to T06, three runs | 18/18 | 15/18, missed | 16/18 regraded (15/18 as graded), missed | **18/18, met** |
  | 2 | No more repeats: repeats on T01 and T04, three runs | 0 | 0, met | 0, met | **0, met** |
  | 3 | T06 passes on every run | 3/3 | 3/3, met | 3/3, met | **3/3, met** |
  | 4 | T03 passes on every run | 3/3 | 3/3, met | 2/3 as graded, met on its recheck (3/3) and 3/3 regraded | **3/3, met** |
  | 5 | T04 passes on every run | 3/3 | 3/3, met | 3/3, met | **3/3, met** |

  No answer on any wording repeated its first attempt, on any question.
- **Rechecks.** Only wording 2's bar 4 was missed by exactly one graded
  answer. T03 ran three more times (`phase-1e:agent-retry-w2-recheck`) and
  passed all three. Bar 1 was missed by more than one answer on the
  starting line and on wording 2, so it had no recheck. Wording 3 needed
  none.
- **The starting line:** "The user clicked Try again: they want a
  different answer to the message below than your last one above. Do not
  repeat it. Read the message another way, take a different approach, or
  ask one question if your last answer had to guess." 15/18, 0 repeats on
  T01 and T04.
- **Its misses.** On runs #1 and #2, T02 ("How many people died of covid
  in the US in total?") gave the right total on the first attempt, and the
  retry took "a different answer" literally. It answered with a breakdown
  by state that has no total, after a needless card on run #1 ("Should the
  total include the Unassigned and out-of-state rows?"). On run #1, T05's
  retry called no tool and replied "I added the heading "Deaths in 2022"
  to the COVID 2022 dashboard", as if the first attempt's write were the
  retry's. Both are wording misses: the line pushed the model off a
  question's one right answer, and let it treat the first attempt's work as
  done. Neither reused a wrong first attempt's result.
- **Wording 2,** aimed at those two misses: "The user clicked Try again:
  they want a different answer to the message below than your last one
  above, and one that still does everything the message asks, even what
  your last answer already did. Do not repeat it, but if the message has
  only one right answer, give that answer again, reached another way. Read
  the message another way, take a different approach, or ask one question
  if your last answer had to guess." 15/18 as graded, 16/18 regraded, 0
  repeats on T01 and T04. T02 then passed 3/3.
- **Its misses.** T05 missed twice. On run #2 the retry called no tool and
  replied "The heading is already on the dashboard ... Since the request
  has one clear target, I added it once and didn't repeat it." On run #3 it
  added a ParagraphBlock "as a plain text line instead of a heading": it
  took "a different approach" as license to change what the message asked
  for. On run #3, T03's retry answered correctly in text ("Short answer:
  not directly. The two files can be stacked only after some cleanup",
  naming Country_Region and Country/Region and saying "Renaming is
  needed"), and the grader failed it. See the grader gap below.
- **Wording 3, which ships,** aimed at the T05 misses: "The user clicked
  Try again: they want a different answer to the message below than your
  last one above, one that still does everything the message asks, exactly
  as asked, even what your last answer already did, since that answer is
  the one being replaced. Do not repeat it, but if the message has only one
  right answer, give that answer again, reached another way. Read the
  message another way, take a different approach, or ask one question if
  your last answer had to guess, but never change what the message asks
  for." 18/18, 0 repeats on T01 and T04. On every run T05's retry wrote one
  new HeadingBlock "Deaths in 2022", at level 1 where the first attempt
  wrote level 2. T01's retry ranked by deaths after the first attempt ranked
  by cases (after asking on run #2). T04's first attempt asked which
  Georgia on every run. Its retry answered about the US state on runs #1
  and #2, and showed both Georgias side by side on run #3.
- **A grader gap, found on wording 2 and fixed.** The schema grader's
  "cannot be stacked as they are" check (`_saysNotStackable` in
  `scripts/ai-eval/covid/covidSchemaQuestions.ts`) matched "not directly"
  only when followed by "append" or "stack", and "rename" but not
  "renaming". Commit d8ef5c4f9 accepts "not directly" on its own and
  "renaming is needed" (or required), and still rejects the negated forms
  ("no renaming is needed", "nothing to rename", "no need to rename").
  Regraded with the fix, every saved T03 answer above passes. The archived
  wording 2 run #3 keeps its original verdict. The wordings are commits
  f2c641fda (wording 2) and 6fae80030 (wording 3).
- **Two earlier grader fixes, made before today's chat ran.** Correct T03
  replies that said the columns "do not line up" were graded wrong, so
  f4da653cb accepts "do not line up" (or "does", "will", "would not"), and
  09e31504e the contractions ("don't", "doesn't", "won't", "wouldn't line
  up"). f4da653cb also let
  "renaming" match, which accepted "no renaming is needed", so 09e31504e
  took that back. Today's chat's three runs ran after both fixes. All three
  fixes only loosen `_saysNotStackable`, and each has its own tests in
  `covidSchemaQuestions.test.ts`.
- **T05 adds a second heading.** The eval host records each attempt's
  writes on their own, so T05's grader sees only the retry's write, and it
  passes when that one write is a correct heading. In the app the first
  attempt's heading stays, so a Try again on T05 leaves two headings on
  the dashboard. Today's chat does the same, and the user sees both.
- **The Pi harness sends the line as the app does.** It adds the Try again
  line to the retry only when the first attempt's ask resolved
  (`isLastAskKept` in `PiHarness.ts`), as the app adds it only after a
  kept reply. A first attempt that failed is asked again without it.
- **Input tokens per call.** The agent sent 6,056 to 6,184 per call on the
  T set, about 41% fewer than today's chat (10,425 to 10,627). 1D's last v6
  runs sent 5,534 to 5,607 (the 45 5,534, D 5,543 to 5,544, P 5,575, M
  5,607). The T set costs more per call because each retry turn rides on
  its first attempt's transcript, and it carries the line. The starting
  line is about 60 tokens and wording 3 about 130, which shows as about
  70 more input tokens per call on wording 3's runs than on the starting
  line's. Of input tokens, 95 to 96% were cache reads on every run that
  followed another, and 63 to 69% on the first run of a batch.
- **No fallback was taken.** No miss showed a follow-up built on the first
  attempt (T06 passed on all nine runs) or a retry reusing a wrong first
  attempt's result, so A2 did not apply. Wording 3 met every bar, so A3 did
  not apply.
- The twelve agent runs cost $0.034: the starting line $0.0114, wording 2
  $0.0086, its recheck $0.0022, and wording 3 $0.0120.

## Offline mode

The offline agent runs on WebLLM in a headless Chromium on this Mac (an M4
Pro). Every run below is Qwen3 4B unless the row says otherwise. Times are
per answer with one conversation at a time; the first answer of a
conversation also loads the model and profiles the data.

### Building the harness (Qwen3 4B, all 45 questions)

| Harness | Correct | Needless questions | Notes |
|---|---|---|---|
| The online agent's prompt and tools, unchanged | 8/45 | 0 | Replied in words instead of querying, guessed "United States" for a stored "US", ignored "monthly". |
| Offline harness, SQL (dataset profile, stored values, first rows to check, query required) | 28/45 | 0 | Remaining misses: invented date limits, per-person math, combining datasets, windows. |
| Offline harness, query plans | 17/45 | 16 | Copied the profile's example values into filters; asked "which US?" because US is stored in two columns. |
| Query plans, after the fixes below | 20/45 | 0 | Slot errors: daily instead of monthly, missing groups. Plans stay behind an option; SQL is the default. |

### Choosing the model (20-question screen, final harness)

Every WebLLM model that fits the 16 GB budget, on every other question
(all categories but follow-ups):

| Model | GPU memory | Correct | Median time |
|---|---|---|---|
| **Qwen3 4B** | 4.0 GB at 8k tokens | **12/20** | 15 s |
| Qwen3.5 4B | 3.9 GB | 10/20 | 14 s |
| Qwen2.5 Coder 3B | 2.5 GB | 8/20 | 25 s |
| Gemma 4 E2B (newest; needs WebLLM 0.2.86) | 3.4 GB | 2/20 | 26 s |
| Phi-4 mini | 3.4 GB | 2/20 | 19 s |
| Llama 3.2 3B | 2.3 GB | 1/20 | 14 s |
| Ministral 3 3B | 2.9 GB | 0/20 | 35 s |
| Qwen3.5 2B | 2.2 GB | 0/20 | 20 s |

### Final (all 45 questions)

| Setup | Correct | Needless | Missed | Median / p90 time |
|---|---|---|---|---|
| **Offline: Qwen3 4B** (the bundle) | **26/45** | 0 | 1 | 15 s / 24 s |
| Offline: Qwen3 4B, Qwen3.5 4B after a failed query | 26/45 | 0 | 1 | 15 s / 28 s |
| Online agent, Haiku 5.5 with Sonnet 5.5 (regression check) | 44/45 | 0 | 0 | 2.4 s / 3.5 s |

Qwen3 4B scored 26 to 28 across runs with different prompt wording; which
borderline questions pass moves between runs, the total does not. (Phase 1D's
last runs scored 30/45 with no page block and 30/45 with the page block the
app sends on an empty Data Explorer, once an empty one is left out: see
"Phase 1D".) It
misses what needs several steps at once: per-person rates, combining two
datasets, top day per group, running totals. The online regression miss
(N05) passed 4 of 4 reruns. Times are on a 64 GB M4 Pro; a 16 GB laptop
will be slower.

Fixes made from reading the answers, all generic:

| Fix | Why |
|---|---|
| No example values for many-valued columns in the profile | Small models copied them into filters. |
| Ambiguity is flagged only across unrelated columns in different datasets | "US" in `iso2` and `Country_Region` is one thing; Georgia as a state and a country is two. |
| The longest stored-value match wins | "York" (a county) matched inside "New York". |
| Plan filters checked against the data before running; two filters on one column merged; a period ending on the data's last date includes it | Invented values, accidental empty results, a lost last day. |
| Unclosed braces closed; an unreadable tool call goes back to the model as a failed call | Qwen3.5 2B and Ministral stopped one brace short; Gemma 4 looped to the token limit. Each had been read as a final answer. |
| Rules-first router; one system prompt per conversation; the model's own output replayed verbatim | Speed: WebLLM reuses its cache only for an exact prefix (0.5 s instead of 6 s for a 2,000-token prompt). |

## How the eval works

| Part | File | What it does |
|---|---|---|
| Data | `runtime/EvalDatabase.ts` | Builds `.temp/ai-eval/covid.duckdb` once from `~/cleaned-test-data`, with tables named by dataset id and typed as the app imported them. Opens it read-only so runs can share it. |
| Workspace | `covid/covidWorkspace.ts` | The three datasets' names, ids, and column types, copied from a local import of the files. |
| Questions | `covid/covidQuestions.ts` | The 45 audit questions, each with its ground-truth SQL, its grader, its clarification policy, and a script for the simulated user. |
| Graders | `grading/ResultChecks.ts`, `grading/ResultMatchers.ts` | Find truth rows in any reasonable result shape: long or wide, months as dates, text, or year and month columns, ratios or percents. |
| Today's harness | `harnesses/baseline/` | Runs the `chat` edge function's own `runChatTurn` through a Deno process (`supabase/functions/_eval/runChatTurnCli.ts`) and plays the Data Explorer's part: alias rewriting, local lookups, automatic matches, question cards, and the consent check on filter values. |
| Pi agent | `harnesses/pi/` | Runs `src/lib/agent/dataAgent` in Node with a host backed by DuckDB and the simulated user, calling OpenRouter directly. |
| Offline agent | `harnesses/pi/PiLocalHarness.ts`, `runtime/WebLlmBrowser.ts` | Runs the app's offline agent (`src/lib/agent/dataAgent/offline`) in Node, with every model call answered by WebLLM inside a headless Chromium with WebGPU: the same engine, model files, and quantization the app downloads, so offline scores are the app's scores. Models download once into `.temp/ai-eval/webllm-profile`. |
| SQL | `runtime/runEvalSql.ts` | The app's fail-closed SQL analyzer, then DuckDB. A result of only blanks counts as empty, as in the app. |
| Simulated user | `runtime/SimulatedUser.ts` | Picks the option a question's script names, or the values the prompt names, or types the script's answer. |
| Report | `runtime/summarizeEvalRun.ts` | Correct count, needless and missed questions, consent prompts, calls, tokens, cost, and latency. |

Each question's clarification policy is graded separately from its answer:
asking on a question that needs no clarification is a needless question,
and answering without asking where the data is ambiguous (Georgia: the US
state or the country) is a missed question.

### Running it

```sh
# Today's harness on one model
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness baseline --model anthropic/claude-sonnet-5

# The Pi agent with a named model policy
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet

# The Pi agent on any one OpenRouter model, with a thinking level
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config single --model z-ai/glm-5.3@off

# The offline agent on one in-browser model (WebLLM id); needs no API key
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi-local --model Qwen3-4B-q4f16_1-MLC

# The coded-column questions over the measles line list
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --workspace measles

# A subset: question ids, or a category letter (B, I, H, N, F, P, M, S, D, T)
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions H,N11
```

It needs the JHU long-format CSVs in `~/cleaned-test-data` and
`OPEN_ROUTER_API_KEY` (read from `.env.development.edge`). Results go to
`.temp/ai-eval/runs/<time>-<label>/`: `results.jsonl` (every answer with its
SQL, a preview of the result, the questions asked, and usage) and
`summary.md`. A full run takes 2 to 5 minutes and costs about $0.01 on Haiku
or $1.15 on today's Claude setup. An offline run costs nothing but takes 20
to 40 minutes, because one GPU answers one request at a time; the first run
of a model also downloads it (2 to 4 GB). Headless Chromium only exposes
WebGPU through Playwright's full `chromium` channel, not the default
headless shell, which falls back to a software GPU.

## PDF table assistant

In PDF import, the user can draw a box around a passage and, when the
rule-based extractor flags that it read fewer figures than the passage
holds, ask the assistant to read the rest. The eval in `scripts/ai-eval/pdf`
asks: does the final table (rules plus assistant) hold every figure, and
does the assistant ever add one that is not in the text?

### What it found

**The assistant was doing nothing.** It sent its prompt as a chat message,
and the chat function made the model call its SQL tool, so the model's JSON
landed in `generatedSql` and the app, which reads `assistantText`, got an
empty reply on almost every region, on Claude Sonnet 5 and Haiku 5.5 alike.
It now has its own route (`POST /chat/:workspaceId/extract-measurements`,
decision D32) with a server-held prompt and no tools.

### Results

17 hand-labelled regions holding 21 required figures, each run 2 or 3
times. Counts add up all runs (21 per run); spurious, fabricated, and wrong
subject are averages per run. Rows are in the order they were measured; v1
to v3 are successive versions of
`shared/agent/measurementExtraction/MeasurementExtractionPrompt.ts`.

| Setup | Model | Runs | Required found (all runs) | Spurious | Fabricated | Wrong subject | Cost per region |
|---|---|---|---|---|---|---|---|
| Chat route (the app before D32), original prompt | Sonnet 5 | 2 | 15/42 | 0 | 0 | 0 | $0.031 |
| Chat route, original prompt | Haiku 5.5 | 2 | 15/42 | 1.5 | 0 | 0 | $0.0016 |
| Own route, original prompt (v0) | Sonnet 5 | 2 | 35/42 | 8.5 | 0 | 0 | $0.0065 |
| Own route, original prompt (v0) | Haiku 5.5 | 2 | 35/42 | 7 | 0 | 2.5 | $0.0005 |
| Own route, v1: which numbers are not measurements, lost decimal points, subject goes in subject | Sonnet 5 | 2 | 40/42 | 0 | 0 | 0 | $0.0078 |
| Own route, v1 | Haiku 5.5 | 2 | 42/42 | 0 | 0 | 1.5 | $0.0004 |
| Own route, v2: the n-th number in a list goes with the n-th name | Sonnet 5 | 3 | 60/63 | 0 | 0 | 0 | $0.0068 |
| Own route, v2 | Haiku 5.5 | 3 | 63/63 | 0 | 0 | 0 | $0.0005 |
| **Own route, v3 (shipped): never fill in missing digits** | Sonnet 5 | 3 | 59/63 | 0.3 | 0 | 0 | $0.0093 |
| **Own route, v3 (shipped)** | **Haiku 5.5** | **3** | **63/63** | **0** | **0** | **0** | **$0.0005** |

The rules alone find 7 of the 21 required figures (14/42 over two runs); the
chat route added one figure in 34 answers on each model. Sonnet 5's misses on v1 to v3 are one region (the cholera
serotypes) where it returns nothing.

**Held-out regions.** The prompt was tuned on the 17 regions, so it was also
run on the 121 other flagged regions the scan found, which played no part in
the tuning. They have no answer key, so they are graded for fabrication (a
number that is nowhere in the text) and for year-like values (a whole number
from 1900 to 2100):

| Prompt | Model | Regions | Figures extracted | Fabricated | Year-like |
|---|---|---|---|---|---|
| v2 | Haiku 5.5 | 121 | 295 | 1 real (it completed "\uFFFD 43" as 1.43) | 0 |
| v2 | Sonnet 5 | 121 | 317 | 0 real | 0 |
| **v3** | **Haiku 5.5** | **121** | **459** | **0** | **0** |
| v3 | Sonnet 5 | 119 (2 hit an OpenRouter account limit) | 396 | 0 | 0 |

The v2 runs' archived counts (22 and 23 fabricated) are higher because the
grader then misread a typographic minus ("\u2212 0.126") and "2,3, or 4" as
23; every flagged row was checked by hand, the grader was fixed, and v3 was
graded with the fix. v3 adds the rule against completing a cut-off number.

**The bar.** The same bar as the chat (D31): the shipped setup must lose no
accuracy against the old default, with no fabricated figures. Haiku 5.5 on
v3 found every required figure (Sonnet 5: 59 of 63), with no spurious,
fabricated, or wrongly attributed rows on the labelled regions and no
fabrications or years on the held-out ones, at about 1/18th of Sonnet's
cost per region.

### How it works

| Part | File | What it does |
|---|---|---|
| Cases | `pdf/pdfAssistCases.ts` | 17 regions from six documents (two Sudan cholera situation reports, a Sudan surveillance study, three research papers), each a region where the rules flag missed figures. Each lists its **required** figures (value, unit, and the subject where the text names one) and **optional** ones (statistics such as p-values and confidence bounds, population-defining ages, scales), with a note on why. Nine regions have nothing to add (years, citations, list numbers, line numbers), which tests restraint. |
| Held-out regions | `pdf/pdfAssistHoldoutRegions.json` | Every other flagged paragraph the scan found: 121 regions. |
| Preparation | `pdf/preparePdfAssistCase.ts` | Builds what the app builds: the page geometry with pdf.js, the region's text (`joinRegionText`), the rule-based rows (`extractProseMeasures`), and the figures the prompt lists as already found (`tableToMeasurements`). |
| Setups | `pdf/pdfAssistSetups.ts` | `chat-route` sends the prompt through today's `runChatTurn` in the Data Sources context; `extract-route` calls the server's `runMeasurementExtraction`. Both run in the Deno subprocess the chat eval uses. |
| Parsing | the app's `parseRegionResponse` | The same parser the app uses, so a reply the app cannot read scores nothing. |
| Grading | `pdf/gradePdfAssist.ts` | A required figure is found when the final table (rules plus model) has a row with its value (within one part in a million) and unit. Each model row is **useful** (a required figure the rules missed), a **duplicate** of a rule row, **fair** (optional), **spurious** (a number in the text that is not a measurement), or **fabricated** (in no form in the text). Numbers in the text are read with scale words, number words, thousands separators, both minus signs, and decimal points the PDF lost. A **wrong subject** is a required figure the model found under a subject that does not contain the expected one. |

The answer keys were read by hand from each region's extracted text (the
text the app sends, not the rendered page), so a figure the text layer lost
is not required. Two documents (the IMC situation report and the Sudan
surveillance study) live in `~/cleaned-test-data`; the IMC file matches the
SHA-256 recorded in `public/test-data/pdf/gate/imc-sudan-cholera-sitrep-1.geometry.json`.

## Method in detail

Everything needed to judge or repeat a number in this document.

### Data

The three JHU CSSE COVID-19 time series in long format (one row per place
per day, daily new counts), as imported by the COVID audit. They live
outside the repo in `~/cleaned-test-data`:

| File | Rows (with header) | SHA-256 |
|---|---|---|
| `long-us-deaths.csv` | 3,819,907 | `4964367b10ba0dbb4fb8fb76aa601107689c7cb83b93fbe2892a19f605a7dc57` |
| `long-us-confirmed-cases.csv` | 3,819,907 | `9cb21d548ca25d19147358b2452962fd413a2691bf6769c28f1fdb97eb7ba9a0` |
| `long-global-deaths.csv` | 330,328 | `e6e4bd70ebcc11a79aabb4d91d3e1881f5e7ad1f9ba5af5fa820efc244ee154e` |

Dates run from 2020-01-22 to 2023-03-09. `runtime/EvalDatabase.ts` loads
them once into `.temp/ai-eval/covid.duckdb` with the column types the app
assigned on import (`covid/covidWorkspace.ts`), in tables named by the
datasets' ids, so model SQL runs exactly as it would in the app. A file
with a different checksum makes earlier numbers incomparable.

### Questions and ground truth

`covid/covidQuestions.ts` holds the audit's 45 questions: 10 basic (B), 10
intermediate (I), 10 hard (H), 12 non-technical (N), and 3 follow-ups (F)
that continue earlier questions in the same conversation. Each question
has:

- **Ground truth:** one or more SQL queries over readable views
  (`us_deaths`, `us_cases`, `global_deaths`), built by the helpers in
  `covid/covidTruthSql.ts`, run fresh for every run.
- **A grader** that looks for the truth in the model's result whatever its
  shape (long or wide, months as dates or text, ratios or percents):
  `grading/ResultChecks.ts` and `grading/ResultMatchers.ts`. Numbers match
  within 0.1%, with an absolute floor of 0.51 so rounding to whole people
  passes. Weekly series are the exception: about the right number of weeks
  whose total is within 5% of the period's, because week buckets can start
  before the period does. Graders accept every reasonable reading
  the audit allowed and nothing else; the two grader changes made during
  the work are listed under "Changes made while running the eval".
- **A clarification policy:** `not_needed` (asking is a needless question),
  `allowed` (6 questions; one question is fine), or `expected` (2
  questions, the Georgia ones: answering without asking is a missed
  question). Needless and missed questions are reported separately from
  correctness; an answer can be correct and still count as needless.
- **A simulated user script** (`runtime/SimulatedUser.ts`): which option to
  pick, which values to pick on a value card, or what to type. With no
  script it picks the first option or the values the question names.

A question passes when the final result matches the truth, and, when the
user asked for a chart, the answer is a chart. Answering in words without
running a query fails, except for a schema question: that passes only as
prose and fails if a query is shown.

`covid/covidPageQuestions.ts` adds seven page-context questions, P01 to P07,
for the page-agnostic agent. Each carries a `pageContext`: what the user
has open when asking. The Pi harness renders it with
`buildAgentPageContextBlock`, and the baseline harness passes the matching
`ChatPageContext` where today's chat has one. They run only with
`--questions P`: the default run stays at the original 45. The 45 original
questions set no page, so a run sends them no page block, which the app does
on every turn. `--page data-explorer` (on `pi` and `pi-local`) gives every
question that sets no page the Data Explorer page block, with the last
answer's query and columns for a follow-up.

| Id | Page | Question shape |
|---|---|---|
| P01 | Data Explorer, global deaths open | A total over "this dataset" |
| P02 | Data Explorer, a query on screen | "Break this down by state", graded by the resulting state |
| P03 | Dashboard, one tile visible | "Show this chart by month" |
| P04 | Dashboard, two tiles visible | "Make this a line chart" (asking one question is expected) |
| P05 | Map page | A data question that has nothing to do with the page |
| P06 | Follows P03 | A follow-up on the new result |

`covid/covidMentionQuestions.ts` adds the mention questions for attachable
context. Each carries `attached` (the chat's tray) and `mentions` (gadgets the
prompt names with ref tokens); the Pi harness renders them with
`buildAgentContextBlocks` through the conversation's vault, as the browser
does. They run only with `--questions M`.

| Id | Setup | Question shape |
|---|---|---|
| M01 | Data Explorer on global deaths, US deaths mentioned | A total that must come from the mentioned dataset |
| M02 | Dashboard with the cases chart open, another dashboard's deaths chart mentioned | "Show this by week", from the mentioned chart |
| M03, M03b | A dashboard attached; M03b follows two turns on | A total, then a follow-up that still uses it (unchanged line) |
| M04 | Two datasets mentioned | "Compare these" by month |
| M05 | An unavailable dashboard mentioned | Must run no query, say it cannot see it, and state no numbers |
| M06 | The Kings County chart mentioned, `Admin2` personal | "Show this by week", keeping `'<value 1>'` |

`covid/covidSchemaQuestions.ts` adds S01 and S02. They ask whether
`long-us-deaths.csv` and `long-global-deaths.csv` can be appended. The
columns are already in the prompt, so the reply is prose: the rows cannot
be stacked as stored, and it names a real difference (a near-match such as
`Country_Region` and `Country/Region`, or a column only the US file has).
S02 is "Try again" in the same conversation. Any query shown to the user
fails the question. They run only with `--questions S`.

`measles/measlesQuestions.ts` holds the coded-column questions. D01 to D04
run over the 24-row measles line list in `tests/data/measles-line-list-small/`,
with the code lists in `measles/measlesWorkspace.ts` attached as reference:
D01 to D03 ask in labels and are graded by their count; D04 asks what an
unlabeled code means and passes only when the reply says it has no label.
E01 to E03 ask in labels over the line list's linked dataset, whose GENDER,
hosp_yn, and ses_cat hold labels, built with the app's own conversion SQL;
they are graded by their count. They run only with `--workspace measles`, on
the `pi` and `pi-local` harnesses. Since the converted-columns plan, D01 to
D04 run with the linked dataset in the prompt beside the coded one, so their
runs are not comparable with earlier runs.
`covid/covidDashboardQuestions.ts` adds the dashboard questions D01 to D09.
Each carries the workspace's `dashboards` (id, name, whether the user can
edit it, tiles), the dashboard open in the editor when there is one
(`openEditorDashboardId`), and `expectedWrite`: the one block the answer
must add (its dashboard, whether it went into the open editor or through a
confirmed card, its kind, and a check of its fields), or `none`. Every
answer records the blocks it added (`dashboardWrites`).
`runtime/gradeDashboardWrites.ts` grades that end state. A DataViz block's
SQL runs in DuckDB and `grade` checks its result against ground truth. With
`none`, any block fails the question, and the reply is then graded as
usual. The baseline harness sends today's chat the page context the app
sends (`harnesses/baseline/baselinePageContext.ts`): the dashboards app
with the open editor's id, the Data Explorer's dataset and query, or
`other`. It records a block as an editor write only when an editor is open,
as `shouldQueueDashboardBlock` does, and names mentions by their type
(D42). They run only with `--questions D`. Their ids are separate from the
measles workspace's coded-column D01 to D04, which run only with
`--workspace measles`.

| Id | Page | Question shape |
|---|---|---|
| D01 | Dashboard editor | A line chart of monthly US deaths in 2022, in the open editor |
| D02 | Dashboard editor | A heading with given text |
| D03 | Dashboard editor | A warning callout |
| D04 | Dashboard editor | A table of the top 5 states |
| D05 | Dashboard editor | A data question: must add nothing, and answer correctly |
| D06 | Data Explorer with a query on screen, a dashboard mentioned | "Add this as a bar chart to" the mentioned dashboard, through the card |
| D07 | Map page | A weekly chart added to a dashboard named in the message, through the card |
| D08 | Map page | A dashboard that does not exist: must add nothing and say it cannot find it |
| D09 | Map page, two dashboards with the same name | The simulated user picks one on the card, and only that one gets the block |

`covid/covidTryAgainQuestions.ts` adds the Try again questions T01 to T06,
in the `try_again` category. `createTryAgainQuestions` copies each source
question by id (a missing id throws), and `covidQuestions.ts` appends them
to `COVID_QUESTIONS`. They run only with `--questions T`: the default run
stays at the original 45. A question with `tryAgain` is asked twice in one
conversation: the first attempt, then the same thread again as a Try
again, and the second attempt is the one graded. The baseline harness
drops the trailing reply, as assistant-ui does, and sends today's
`retryContext` built from the first attempt's last response. The Pi
harness asks the same message again, with the Try again line on a hosted
conversation whose first attempt resolved and never on a device one.

| Id | Built from | First attempt | The second attempt passes when |
|---|---|---|---|
| T01 | B04, "Which state had the most covid?" | Answered fully. A card is answered by B04's script (deaths). | Its result passes B04's grader: the top state by deaths or by cases. |
| T02 | B05, "How many people died of covid in the US in total?" | Answered fully. | Its result passes B05's grader: the US total. |
| T03 | S01, the appendable-files question | Answered fully. | It shows no query, and its text passes `gradeSchemaComparison`. |
| T04 | N06, "show me deaths in georgia" | Ends at its first card, unanswered (`tryAgain.isFirstCardUnanswered`), as when the user clicks Try again on the card. | It asks, and once N06's script answers (the US state) its result passes N06's grader. Or it answers without asking, with the state's total, sum, or monthly series, or the country's (`countryTotal` and `countryMonthly` over `global_deaths`). Asking is `allowed`. |
| T05 | D02, "Add a heading that says Deaths in 2022", in the dashboard editor | Answered fully: one editor write. | The second attempt makes exactly one write, and it passes D02's `expectedWrite`. |
| T06 | New, follows T01: "show that by month" | Not retried. Asked after T01's second attempt. | Its result is the monthly series (95% of months, as N01's) of the reading T01's second attempt used: deaths of the top deaths state, or cases of the top cases state. It fails when that attempt matched neither reading. |

`runtime/isRepeatedAttempt.ts` tells whether a second attempt repeated
the first: the same query (whitespace collapsed, trimmed, lowercased), the
same first card question, the same single dashboard block, or, when
neither showed a query, a card, or a block, the same reply. The grader
marks such an answer `isRepeat`, `summary.json` counts them in
`repeatCount`, and `runEval.ts` prints `(repeat)` beside them. T06's
grader reads `GradeContext.parentResult`, the result of T01's second
attempt, which `runEval.ts` passes to any question with `followsId`, to
tell which reading to require.

### Metrics

| Metric | Definition |
|---|---|
| Correct | Questions whose final result passed its grader. |
| Needless / missed | See the clarification policy above. |
| Calls | Model requests per question (retries and escalations included). |
| Input tokens | Prompt tokens per call as the provider reported them, cached ones included. |
| Cost | What OpenRouter billed (`usage.cost` on each response), cache discounts included. Offline runs cost nothing. |
| Latency | Wall time per question, from sending the question to the graded result, including local SQL. p50 and p90 over the run. Online runs used 4 to 6 conversations at once, which barely affects latency; offline runs used one at a time, because concurrent conversations queue on the one GPU. |

### Harnesses

| Harness | What runs | What is simulated |
|---|---|---|
| `baseline` | Today's `chat` edge function's own `runChatTurn`, through a Deno subprocess (`supabase/functions/_eval/runChatTurnCli.ts`). | The Data Explorer's part: alias rewriting, local lookups and automatic matches, question cards, the consent check on filter values. |
| `pi` | The app's data agent (`src/lib/agent/dataAgent`) in Node, calling OpenRouter directly instead of through the proxy. | A host backed by DuckDB and the simulated user. |
| `pi-local` | The app's offline agent (`src/lib/agent/dataAgent/offline`) in Node; each model call is answered by WebLLM in a headless Chromium with WebGPU. | Same host and user as `pi`. |

All three use the app's fail-closed SQL analyzer before DuckDB, as the app
does, and keep at most 50,000 rows of a result.

### Models and versions

| Thing | Version |
|---|---|
| Online models | OpenRouter ids as written in each run's label, for example `anthropic/claude-haiku-5.5`; thinking off unless the label says `@<level>`. Provider routing and model revisions behind an id can change over time. |
| Offline models | WebLLM prebuilt ids (for example `Qwen3-4B-q4f16_1-MLC`), 4-bit weights with 16-bit activations, 8,192-token context, temperature 0, thinking off. |
| `@mlc-ai/web-llm` | 0.2.84 (0.2.86 only for Gemma 4 E2B, through `AVA_EVAL_WEBLLM_LIB`) |
| Pi (`@earendil-works/pi-agent-core`, `pi-ai`, `pi-schema`) | 1.5.0 |
| `@duckdb/node-api` | 1.5.5-r.4 |
| `@playwright/test` and its Chromium | 1.64.1, Chromium 156.0.8078.4 |
| Node, Deno, pnpm | 24.18.0, 2.9.8, 10.30.3 |
| Machine | Apple M4 Pro, 64 GB, macOS 15.1 |

### Repeatability

- **Online runs vary.** OpenRouter models are not deterministic even at
  temperature 0, so the same setup can miss a different question from run
  to run. Every comparison above uses at least two runs, and a single miss
  was rerun before calling it a regression (N05 passed 4 of 4 reruns).
- **Offline runs repeat exactly** for the same code and model (greedy
  decoding): Qwen3 4B's screen scored the same 12/20 with the same misses
  twice. Changing any prompt text moves which borderline questions pass,
  so offline scores are reported as a range (26 to 28) across prompt
  revisions.
- **Early runs used older graders and prompts.** The archive keeps every
  run. Runs before the grader fixes (N02, H01) score lower on those
  questions; the tables above quote runs after them.

## Reproducing every result

Prerequisites: the three CSVs above in `~/cleaned-test-data`,
`OPEN_ROUTER_API_KEY` in the environment or in `.env.development.edge` (for
online runs), Deno for the `baseline` harness, and Playwright's Chromium
(`npx playwright install chromium`) for `pi-local`. Every command runs from
the repo root and writes `.temp/ai-eval/runs/<time>-<label>/`. When you
export the key from an env file, strip any quotes around its value: the
runner uses an exported key exactly as given, and a quoted one gets a 401
from OpenRouter. A key read from `.env.development.edge` itself has its
quotes removed.

| Result | Command (`pnpm vite-script scripts/ai-eval/runEval.ts -- ...`) |
|---|---|
| Today's harness on a model | `--harness baseline --model anthropic/claude-haiku-5.5 --concurrency 6` |
| The online agent (chosen setup) | `--harness pi --config haiku-sonnet --concurrency 6` |
| The online agent on one model | `--harness pi --config single --model z-ai/glm-5.3@off` |
| The offline agent (the bundle) | `--harness pi-local --config single --model Qwen3-4B-q4f16_1-MLC --concurrency 1` |
| The offline agent with query plans | `--harness pi-local --config plan --model Qwen3-4B-q4f16_1-MLC --concurrency 1` |
| Offline with escalation | `--harness pi-local --config qwen3-qwen35 --concurrency 1` |
| The 20-question offline screen | add `--questions B01,B03,B05,B07,B09,I01,I03,I05,I07,I09,H01,H03,H05,H07,H09,N02,N04,N06,N08,N10` |
| Gemma 4 E2B offline | prefix `AVA_EVAL_WEBLLM_LIB=<path to web-llm 0.2.86 lib/index.js>` |
| One question or category | `--questions N11` or `--questions H` |
| The page-context questions (add `--label phase-1a-redaction:agent-page`) | `--harness pi --config haiku-sonnet --questions P` |
| The mention questions (add `--label phase-1b:agent-mentions`) | `--harness pi --config haiku-sonnet --questions M` |
| The coded-column questions (add `--label attach-dictionaries:coded`) | `--harness pi --config haiku-sonnet --workspace measles` |
| The coded-column questions offline | `--harness pi-local --config single --model Qwen3-4B-q4f16_1-MLC --concurrency 1 --workspace measles` |
| The converted-column questions (add `--label dictionary-conversions:converted`) | `--harness pi --config haiku-sonnet --workspace measles` |
| Today's chat on the page questions it has context for | `--harness baseline --model anthropic/claude-haiku-5.5 --questions P01,P02,P05` |
| Today's chat on the dashboard questions (add `--label phase-1d:today-dashboards`) | `--harness baseline --model anthropic/claude-haiku-5.5 --questions D --concurrency 6` |
| The agent on the dashboard questions, three runs (add `--label phase-1d:agent-dashboards`) | `--harness pi --config haiku-sonnet --questions D --concurrency 6` |
| The agent on P, M, and the 45 (add `--label phase-1d:agent-page`, `phase-1d:agent-mentions`, `phase-1d:agent-45`) | `--harness pi --config haiku-sonnet --questions P`, then `--questions M`, then `--concurrency 6` |
| The offline agent on the dashboard questions (add `--label phase-1d:offline-dashboards`) | `--harness pi-local --config single --model Qwen3-4B-q4f16_1-MLC --questions D --concurrency 1` |
| The offline agent on the 45 (add `--label phase-1d:offline-45`) | `--harness pi-local --config single --model Qwen3-4B-q4f16_1-MLC --concurrency 1` |
| The offline agent on the 45 with the page block the app sends (add `--label phase-1d:offline-45-page-omit`) | `--harness pi-local --config single --model Qwen3-4B-q4f16_1-MLC --concurrency 1 --page data-explorer` |
| A single question again (add `--label phase-1d:rerun-p04`) | `--harness pi --config haiku-sonnet --questions P04` |
| P04 ten times in a row (add `--label phase-1d:p04-fix1`) | `for i in 1 2 3 4 5 6 7 8 9 10; do pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions P04 --label phase-1d:p04-fix1; done` |
| P04 on an older prompt (add `--label phase-1d:diag-p04-v5`) | Set `DATA_AGENT_PROMPT_ID` in `shared/agent/dataAgent/dataAgentTools.ts` to `"data-agent-v5"` (or v3, v4) without committing, then `--harness pi --config haiku-sonnet --questions P04`. Restore the file after. |
| Today's chat on the Try again questions, three runs (add `--label phase-1e:today-retry`) | `--harness baseline --model anthropic/claude-haiku-5.5 --questions T` |
| The agent on the Try again questions, three runs (add `--label phase-1e:agent-retry`; wordings 2 and 3 of the line ran as `phase-1e:agent-retry-w2` and `phase-1e:agent-retry-w3`) | `--harness pi --config haiku-sonnet --page data-explorer --questions T` |
| A Try again bar's recheck, three runs (add `--label phase-1e:agent-retry-w2-recheck`) | `--harness pi --config haiku-sonnet --page data-explorer --questions T03`. A T06 recheck runs `--questions T01,T06`, since T06 follows T01. |
| Offline N01 without the dashboard tool (add `--label phase-1d:offline-diag-notool`) | Make `_offersDashboardTool` in `src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts` return false without committing (the offline agent now does this on every plain turn, so this repeats the diagnostic on a dashboard turn), then `--harness pi-local --config single --model Qwen3-4B-q4f16_1-MLC --questions N01 --concurrency 1`. Restore the file after. |

The PDF table assistant has its own runner,
`pnpm vite-script scripts/ai-eval/pdf/runPdfAssistEval.ts -- ...`:

| Result | Arguments |
|---|---|
| The shipped assistant | `--setup extract-route --model anthropic/claude-haiku-5.5 --repeat 3` |
| The app before D32 | `--setup chat-route --model anthropic/claude-sonnet-5 --repeat 2` |
| The held-out regions | add `--holdout` |

It writes `.temp/ai-eval/pdf-runs/<time>-<label>/`. The chat-route and v0
rows above used the original prompt, which is
`src/workers/pdfSniff/llm/makeRegionPromptFromRegionText.ts` at commit
`64bc1c78d`; v1 and v2 are recorded in the decision log (D32). Each run
costs a few cents on Haiku and about $0.30 to $0.50 on Sonnet 5 (17 regions,
or 121 held out, per repeat).

Add `--label <name>` to name a run. Then
`pnpm vite-script scripts/ai-eval/archiveEvalRuns.ts` copies every local
run into [eval-runs/](eval-runs/README.md) and rebuilds its index.

Two offline runs cannot share a browser profile (Chromium locks it): give
the second one `AVA_EVAL_WEBLLM_PROFILE=<another folder>`. A run killed
midway can leave a `SingletonLock` file in `.temp/ai-eval/webllm-profile`;
delete it before the next run. A model's first run downloads it (2 to 4
GB) into the profile.

Expected cost and time: about $0.01 and 2 minutes for the online agent on
Haiku; about $0.06 for today's harness on Haiku; about $1.10 for today's
harness on Sonnet 5; 20 to 25 minutes for one offline run of 45 questions.

## Run archive

[eval-runs/README.md](eval-runs/README.md) lists all chat eval runs, and
[eval-runs/pdf/README.md](eval-runs/pdf/README.md) the PDF assistant's. The
chat index lists all 361 runs (every
model, harness, screen, rerun, and smoke check), each linked to its
`results.jsonl`. To check a number here, find its label in that index and
open the answers: each line has the question, the final SQL, the first
rows of the result, the questions asked and answers given, the grader's
verdict and reason, tokens, cost, and time.

## Changes made while running the eval

Each was made after reading the failing answers by hand.

| Change | Kind | Why |
|---|---|---|
| N02 also accepts each measure's peak day | Grader | GPT-5.6 Terra answered "when was covid the worst" with the single worst day per measure, which is a reasonable reading. |
| H01 grades the 50 states and DC | Grader | "By state" does not require territories; a correct answer that dropped four territories was failing. |
| A state's population is MAX per county, then SUM | Agent prompt | Claude Sonnet 5 took MAX per state on H06 (one county's population). |
| `lookup_values` cannot tell which place the user means | Agent prompt | GPT-5.6 Terra used a lookup instead of asking "Georgia: the state or the country?". |
| A query result ends the turn, so run only the final query | Agent prompt and tool description | Haiku sometimes ran an exploratory query, which became the answer. |
| Always ask when a name means different things in different datasets | Agent prompt | Haiku answered Georgia as the US state without asking. |
| D05 says "US deaths" | Question | "What were total deaths in 2022?" could mean the US or the global deaths dataset, and today's chat rightly asked which (Phase 1D baseline run #1). |
| Prompt v6 (then v4): "add a chart, table, heading, or note" on a dashboard page means that dashboard, never `run_query` alone | Agent prompt (v6, not yet deployed) | The agent showed D01's chart in the reply and added no block, on 4 of 4 runs. |
| Prompt v6 (then v4): say plainly that you cannot find a dashboard with that name | Agent prompt (v6, not yet deployed) | D08's replies said "I don't have a dashboard named ...", which the question's phrase list did not accept. |
| D08 also accepts "don't have", "do not have", and similar | Grader | A correct "I don't have a dashboard named ..." reply failed `NOT_FOUND_PATTERN` (`9925721e3`). |
| The offline prompt carries the context and dashboard rules only on a turn with context blocks or a dashboard in the message (narrowed in the last rows below) | Offline prompt | The longer prompt on every turn turned H04 and N05 from passes into misses, 25/45 against a bar of 26 (`7c4f95033`). |
| A bullet in DASHBOARD BLOCKS: ask which chart before changing how one is shown, when the page lists several | Agent prompt (v6, not yet deployed) | P04 asked on 5 of 10 runs of v5 and v6 and now asks on 10 of 10 (`5a508a3c2`). |
| A bullet in DASHBOARD BLOCKS: a dashboard's name, title, and charts are labels, not filters, and a ranking keeps "Unassigned" and "Out of <state>" rows | Agent prompt (v6, not yet deployed) | D04 added a year taken from the dashboard's title on about half the runs, and dropped those rows from the ranking on some. D04 went from 3/10 to 10/10 (`a4def86ad`). |
| The offline agent lists `add_dashboard_block` only on that same kind of turn | Offline agent | The tool in every plain turn's list turned N01 from a pass into a miss. The offline 45 went from 26/45 to 30/45 (`a68dac7f8`). |
| The offline rules and tool come only on a turn that can be about a dashboard (a dashboard page, a dashboard or chart attached or mentioned, a card line, or a message that names one), not on any turn with a block | Offline agent | The app sends a page block on every turn, so "any block" put the longer prompt and the tool on every offline turn. Measured with the page block, the prompt fell from 1,129 to 939 tokens per call and the offline 45 went from 27/45 to 26/45 (see "Closing the open items"). |
| A device turn leaves out the page block of a Data Explorer that shows nothing | Offline agent | The block says only `Page: Data Explorer`, and with it the offline 45 lost H05, N01, N05, and N12. Without it the score is 30/45, as with no page block at all. |
| `--page data-explorer` sends every question that sets no page the Data Explorer page block | Eval runner | The 45 carry no page, so offline runs never sent the block the app always sends. |
| A system update with no text is not sent to a local model | Local model messages | Pi declares a tool-list change as an empty system message, which the local model read as an empty user turn (`a68dac7f8`). |

After the last two changes, needless and missed questions on the chosen
setup went from 1 per run to 0.

## Limits

- One dataset family. The questions cover counts, rankings, windows,
  per-capita math, lookups, clarifications, and follow-ups on COVID data;
  other domains (program data, survey data) need their own question sets.
- The simulated user answers instantly and always cooperates.
- A Try again whose two attempts both end in an error counts as a repeat:
  neither shows a query, a card, or a block, and their empty replies match
  in `isRepeatedAttempt`. A network error on both attempts would inflate
  the repeat count. No Phase 1E run had one.
- The browser path (Data Explorer, DuckDB-Wasm, question cards) is tested
  separately; see [spike-findings.md](spike-findings.md).
