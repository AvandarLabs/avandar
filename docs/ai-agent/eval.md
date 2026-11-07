# AI harness eval

The eval in `scripts/ai-eval` answers one question for every harness or
model change: is it at least as accurate as today's chat, and what does each
answer cost? It runs the 45 questions from the
[COVID audit](../ai-harness-audit/README.md) headlessly, executes each
answer's SQL in DuckDB, and grades it against ground truth.

## Results

All runs on 2026-11-07, 45 questions each. "Correct" is graded against
DuckDB ground truth. Cost is what OpenRouter billed, including prompt-cache
discounts.

### Today's harness compared with the Pi agent

| Harness and model | Correct | Needless or missed questions | Input tokens per call | Share of input cached | Cost per question | Latency p50 / p90 |
|---|---|---|---|---|---|---|
| Today, Claude Sonnet 5 (2 runs) | 44, 44 | 0 | 7,650 to 7,935 | 0% | $0.0234 to $0.0255 | 4.4 to 5.1 s / 9.8 to 13.0 s |
| Today, GPT-5.6 Terra (2 runs) | 44, 44 | 0 | 4,490 | 97 to 99% | $0.0052 to $0.0053 | 3.7 to 3.8 s / 6.9 to 7.5 s |
| Today, Claude Haiku 5.5 (3 runs, control) | 45, 44, 44 | 0 | 7,585 to 8,164 | 0% | $0.0013 to $0.0014 | 4.1 s / 6.2 to 6.6 s |
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
  and missed the first error. The Pi agent's prompt has a rule for it;
  decision D21 asks whether to port it to today's harness.
- **Silent misses vary between runs.** Each of today's setups missed a
  different question across runs (N11, H06, H07), so single runs are not
  enough to compare harnesses.

### Remaining misses on the chosen setup

Across the five final runs (225 answers), one was wrong: N06 ("show me
deaths in georgia") left out the "Out of GA" rows, against the prompt's
rule, for a total 4% low. It ran without error, so escalation could not
catch it.

## How the eval works

| Part | File | What it does |
|---|---|---|
| Data | `runtime/EvalDatabase.ts` | Builds `.temp/ai-eval/covid.duckdb` once from `~/cleaned-test-data`, with tables named by dataset id and typed as the app imported them. Opens it read-only so runs can share it. |
| Workspace | `covid/covidWorkspace.ts` | The three datasets' names, ids, and column types, copied from a local import of the files. |
| Questions | `covid/covidQuestions.ts` | The 45 audit questions, each with its ground-truth SQL, its grader, its clarification policy, and a script for the simulated user. |
| Graders | `grading/ResultChecks.ts`, `grading/ResultMatchers.ts` | Find truth rows in any reasonable result shape: long or wide, months as dates, text, or year and month columns, ratios or percents. |
| Today's harness | `harnesses/baseline/` | Runs the `chat` edge function's own `runChatTurn` through a Deno process (`supabase/functions/_eval/runChatTurnCli.ts`) and plays the Data Explorer's part: alias rewriting, local lookups, automatic matches, question cards, and the consent check on filter values. |
| Pi agent | `harnesses/pi/` | Runs `src/lib/agent/dataAgent` in Node with a host backed by DuckDB and the simulated user, calling OpenRouter directly. |
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

# A subset: question ids, or a category letter (B, I, H, N, F)
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions H,N11
```

It needs the JHU long-format CSVs in `~/cleaned-test-data` and
`OPEN_ROUTER_API_KEY` (read from `.env.development.edge`). Results go to
`.temp/ai-eval/runs/<time>-<label>/`: `results.jsonl` (every answer with its
SQL, a preview of the result, the questions asked, and usage) and
`summary.md`. A full run takes 2 to 5 minutes and costs about $0.01 on Haiku
or $1.15 on today's Claude setup.

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
