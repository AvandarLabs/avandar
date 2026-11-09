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
borderline questions pass moves between runs, the total does not. It
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

# A subset: question ids, or a category letter (B, I, H, N, F)
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
running a query fails.

`covid/covidPageQuestions.ts` adds seven page-context questions, P01 to P07,
for the page-agnostic agent. Each carries a `pageContext`: what the user
has open when asking. The Pi harness renders it with
`buildAgentPageContextBlock`, and the baseline harness passes the matching
`ChatPageContext` where today's chat has one. They run only with
`--questions P`: the default run stays at the original 45.

| Id | Page | Question shape |
|---|---|---|
| P01 | Data Explorer, global deaths open | A total over "this dataset" |
| P02 | Data Explorer, a query on screen | "Break this down by state", graded by the resulting state |
| P03 | Dashboard, one tile visible | "Show this chart by month" |
| P04 | Dashboard, two tiles visible | "Make this a line chart" (asking one question is expected) |
| P05 | Map page | A data question that has nothing to do with the page |
| P06 | Follows P03 | A follow-up on the new result |

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
the repo root and writes `.temp/ai-eval/runs/<time>-<label>/`.

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
| Today's chat on the page questions it has context for | `--harness baseline --model anthropic/claude-haiku-5.5 --questions P01,P02,P05` |

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
chat index lists all 112 runs (every
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

After the last two changes, needless and missed questions on the chosen
setup went from 1 per run to 0.

## Limits

- One dataset family. The questions cover counts, rankings, windows,
  per-capita math, lookups, clarifications, and follow-ups on COVID data;
  other domains (program data, survey data) need their own question sets.
- The simulated user answers instantly and always cooperates.
- The browser path (Data Explorer, DuckDB-Wasm, question cards) is tested
  separately; see [spike-findings.md](spike-findings.md).
