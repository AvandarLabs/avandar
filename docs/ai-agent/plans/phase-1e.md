# Phase 1E: "Try again" and parity in the agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turning the agent on loses nothing today's chat does on three counts: Try again reruns an agent answer with its first attempt as context, every card the agent shows is bias-checked and audit-logged, and the agent logs `chat.sql_generated` and `dashboard.block_added_via_chat`.

**Architecture:** Each agent conversation keeps an in-memory record of the thread it was last asked. `askConversationDataAgent` compares the turn's thread with that record: the same thread after a kept hosted reply is a Try again, asked on the same conversation with one plain line before the message, and a thread that rewinds starts a new conversation from the recap. Cards go through one shared `recordClarificationShown`, which today's chat and the agent's conversation host both await before the card shows. The conversation host notes the last query it showed, and the agent's dashboard paths log a block when it reaches a dashboard.

**Tech Stack:** TypeScript, React 19, assistant-ui, Pi (`@earendil-works/pi-agent-core`), Dexie (`fake-indexeddb` in tests), Vitest, the AI eval scripts (`scripts/ai-eval`, DuckDB in Node, Deno for today's chat, OpenRouter).

**Spec:** [../specs/phase-1e.md](../specs/phase-1e.md) (the source of truth). The [brainstorm](../specs/phase-1e-brainstorm.md) is background only. Decisions D40 and D45 in [../decisions.md](../decisions.md) (D45 is written in Task 7). Rules R1 to R4 in [../specs/phase-1.md](../specs/phase-1.md).

This plan lives beside the Phase 1A to 1D plans. That location overrides the writing-plans default of `docs/superpowers/plans/`.

---

## Before you start

- Work in this worktree, on branch `jpsyx/agent-parity-1e` (based on `demo/measles`). Commit after every unit. Never push or merge.
- Read `CLAUDE.md`, `docs/rules/typescript.md`, `docs/rules/testing.md`, and the spec. No unit adds a view or touches `src/components/layouts/`, so `docs/design/app-view-layout.md` is not needed.
- Formatting: `pnpm exec oxfmt --ignore-path .oxfmtignore <files>`, then `pnpm exec eslint --fix <files>`. ESLint wants block-bodied arrow functions. Functions stay at 45 lines or fewer. New helpers with three or more parameters take one `options` object (RO-RO). Parameters are `Readonly<>` or `readonly`.
- Files under `shared/` import each other with `$/...` and never import from `src/`. Files under `src/` and `scripts/` import shared files with `$/...` and no extension.
- Run one test file with `pnpm vitest run <path>`. Type check with `pnpm exec tsc -b --force --noEmit`. Trust that over editor diagnostics, which come from other tsconfigs.
- 1E adds no user-facing string. The Try again line is model input and is not translated. `pnpm i18n:check` must show no catalog change.
- 1E changes nothing the local Supabase stack is built from: no migration, no schema, no bucket, no `supabase/config.toml`, no seed. No unit runs a stack command (`pnpm db:reset`, `pnpm db:seed`, `supabase start`, `supabase stop`), and the eval runs need no Supabase stack at all.
- Do not edit prompts v1 to v6 or anything they are built from. A fallback that adds a prompt version (Unit 4.3) is the only exception, and it adds v7 beside them.
- A test that passes on its first run is not red/green. Say so in your report when it happens. Units 3.2, 3.5, and the guard steps in 3.1 and 5.1 are the expected cases: they pin behavior that already exists or was just built.
- Comments describe the code as it is. Never name this plan, a unit, a task, or "1E" in a code comment.

## Decisions made while planning

| Spec says | Plan does | Why |
|---|---|---|
| `getAgentTurnKind.ts` sits in `dataAgentTurnHelpers/` | It goes in `dataAgentTurnHelpers/getAgentTurnKind/getAgentTurnKind.ts`, with its test beside it. | `docs/rules/testing.md` allows one test file per directory outside `__tests__/`, and `dataAgentTurnHelpers/` already holds four. A new module gets its own directory (option 2 of that rule). |
| The stop loop moves into `_resolveTurnConversation` | `_resolveTurnConversation` stops runs before it classifies, and `askConversationDataAgent` keeps its own inline `while (conversation.activeAsk)` loop right before the ask. A `_startTurn` helper takes the per-turn reset. | The inline loop keeps today's guarantee that nothing awaits between the last `activeAsk` check and the ask. An extracted async loop would add an `await` there. `_startTurn` keeps the function under 45 lines. |
| The stopped run does not write the record | The record write is guarded by `conversation.turnRef.current === turn`, as the spec designs it. A stopped run that settles before the newer turn takes the conversation may still write its own record. | The newer turn's thread extends the stopped one either way, so it is `continues`, and the newer turn writes its record last. The test pins that the record ends as the newer turn's. |
| Tests stay as they are | Seven tests in `dataAgentTurnHelpers.test.ts` and five in `runDataAgentTurn.test.ts` send a second turn whose thread does not extend the first (for example `["How many?"]` then `["And deaths?"]`). Unit 3.4 makes those threads extend the earlier one, as the app's threads always do, and leaves every assertion unchanged. | After 3.4 such a thread is a rewind and starts a new conversation, which is the new behavior. The tests are about blocks, vaults, and stopping runs, not rewinds. |
| `toBaselinePageContext` is not in the file list | Unit 1.6 also treats a question that sets `dashboards` as a dashboard question in `scripts/ai-eval/harnesses/baseline/baselinePageContext.ts`. | It keys on `category === "dashboards"`. T05 copies D02 with the `try_again` category, so today's chat would lose the open editor and fail T05 for a harness reason. |
| `buildBaselineTryAgainTurn(messages, lastResult)` | It takes `{ messages, lastResult }`. | RO-RO in `docs/rules/typescript.md`. |
| `summarizeEvalRun.ts` gains `repeatCount` | A new `summarizeEvalRun.test.ts` covers it. | Requirement 23: every behavior gets a test written first. |
| The spec does not say what a Try again answer's usage covers | Both harnesses return the second attempt with `usage` summed over both attempts, `latencyMs` the second attempt's, and the first attempt's own usage kept in `firstAttempt`. | Cost per question and input tokens per call then count everything the question cost. Latency is the wait after the user clicks Try again. |
| Test files under `scripts/ai-eval` | New eval tests sit beside their modules, as the spec names them, though `runtime/` and `harnesses/baseline/` then hold several. | `scripts/ai-eval` keeps this flat layout throughout, and the testing rules' checks scan `src`, `shared`, `packages`, and `apps` only. |
| `gradeEvalAnswer` passes `parentResult` to `grade` | It takes `parentResult` as an optional fourth parameter. | Its three positional parameters are called from many tests. One optional parameter changes none of them. |
| The offline card writes a row | The test in `runOfflineDataAgentTurn.test.ts` uses the real Dexie table (`fake-indexeddb`), not a mock. | It then checks the row, which a mock cannot. |
| The bar rechecks rerun "that question" | A T06 recheck runs `--questions T01,T06`. | T06 follows T01. Alone it has no parent result and always fails. |
| A2 and A3 are designed fallbacks | Units 4.3 and 4.4 give their files, tests, and core code. If a trigger fires, the controller first writes an addendum with complete code for that unit, has it reviewed, then dispatches. | Which fallback ships, and parts of its code (A2's summary, A3's wording), depend on what the misses show. |
| Docs that ship | Task 7 also moves `docs/ai-agent/README.md`'s decision range to "D01 to D45". | D45 is added. 1D did the same for D44. |
| High-risk units | Unit 3.4 is high-risk. | It touches concurrency: it moves the loop that stops a run in progress, aborts and replaces a conversation, and adds a write that a stopped run must not get wrong. No unit loses or corrupts data, touches persistence formats, security, migrations, or installers. |

## File structure

| File | Responsibility |
|---|---|
| `shared/agent/pageContext/buildAgentTurnText.ts` | `TRY_AGAIN_LINE` and the `isRetry` option. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/getAgentTurnKind/getAgentTurnKind.ts` (new) | `AgentTurnKind` and `getAgentTurnKind`. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts` | `AgentAskRecord`, `lastAsk`, `lastShownQuery`, `analyticsApp`, `dashboardEditor.getState`. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts` | `_resolveTurnConversation`, `_startTurn`, `_recordAsk`, `_logShownQuery`. |
| `src/components/ChatPanel/recordClarificationShown/recordClarificationShown.ts` (new) | The shared bias check and audit write. |
| `src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.ts` | Today's chat calls the shared function, and passes `dashboardId` to the payload builder. |
| `src/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions.ts` | `buildClarificationTurnNumber`. |
| `src/lib/agent/dataAgent/browser/createBrowserDataAgentHost.ts` | An awaited `showQuestionCard` with no `turnNumber`. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.ts` | Records each card and sets it with its `auditId`. Notes the last shown query. |
| `src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.ts` | `toAnalyticsApp`, and `fromDashboardBlock` with `dashboardId`. |
| `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.ts` | `chat.message_sent` through `toAnalyticsApp`. The agent turn's `analyticsApp` and `dashboardEditor.getState`. |
| `src/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks/addAgentDashboardBlock.ts` | The open editor path's event. |
| `src/components/ChatPanel/ChatThread/AgentDashboardBlockPart/{confirmAgentDashboardCard.ts,AgentDashboardBlockPart.tsx}` | The two Confirm paths' events, and `editor.editorData`. |
| `src/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers.ts` | `RetryContextSource`, the type `buildRetryContext` reads. |
| `scripts/ai-eval/EvalQuestion.ts`, `harnesses/EvalHarness.ts` | `try_again`, `tryAgain`, `GradeContext.parentResult`, `EvalAnswer.firstAttempt`. |
| `scripts/ai-eval/covid/covidTryAgainQuestions.ts` (new), `covid/covidQuestions.ts`, `selectEvalQuestions.ts` | T01 to T06, appended to `COVID_QUESTIONS`, selected with `T`, left out of the default 45. |
| `scripts/ai-eval/runtime/{isRepeatedAttempt.ts (new),gradeEvalAnswer.ts,summarizeEvalRun.ts}`, `runEval.ts` | The repeat test, `isRepeat`, `repeatCount`, the parent's result, `(repeat)` in the console. |
| `scripts/ai-eval/harnesses/baseline/{BaselineHarness.ts,DenoChatTurnRunner.ts,baselinePageContext.ts}` | Try again on today's chat, with `retryContext`. |
| `scripts/ai-eval/harnesses/pi/PiHarness.ts` | Try again on the agent, with the line on a hosted conversation. |

---

## Order and dependencies

The spec orders today's chat first: its eval support lands and its baseline runs before the agent side is built. Units run one at a time, in this order.

| Task | Unit | Label | Depends on |
|---|---|---|---|
| 1. Eval support for today's chat | 1.1 The Try again questions | ordinary | none |
| | 1.2 Selecting T | ordinary | 1.1 |
| | 1.3 The repeat test | ordinary | none |
| | 1.4 Grading with the parent's result and repeats | ordinary | 1.1, 1.3 |
| | 1.5 The baseline's Try again turn | ordinary | none |
| | 1.6 The baseline asks a Try again question | ordinary | 1.1, 1.3, 1.5 |
| 2. Today's chat on the T set | 2.1 Baseline runs | eval run | Task 1 |
| 3. Try again in the agent (high-risk task) | 3.1 The Try again line | mechanical | none |
| | 3.2 A retried column question stays one | mechanical | 3.1 |
| | 3.3 Classifying a turn | ordinary | none |
| | 3.4 Retry, restart, and record in `askConversationDataAgent` | ordinary, **high-risk** | 3.1, 3.3 |
| | 3.5 Try again through the adapter | mechanical | 3.4 |
| 4. The agent's Try again in the eval | 4.1 The Pi harness asks a Try again question | ordinary | 1.1, 1.3, 3.1 |
| | 4.2 Agent runs, bars, and wordings | eval run | Task 2, 4.1 |
| | 4.3 Fallback A3 (only if triggered) | ordinary | 4.2 |
| | 4.4 Fallback A2 (only if triggered) | ordinary | 4.2 |
| 5. Question cards | 5.1 The shared `recordClarificationShown` | ordinary | none |
| | 5.2 `buildClarificationTurnNumber` | mechanical | none |
| | 5.3 The hosts record every card | ordinary | 5.1, 5.2 |
| 6. Analytics | 6.1 The payload builders | ordinary | none |
| | 6.2 The adapter gives the agent its app and the editor | ordinary | 6.1 |
| | 6.3 One `chat.sql_generated` per answer | ordinary | 3.4, 5.3, 6.2 |
| | 6.4 The tool's editor path logs its block | mechanical | 6.1, 6.2 |
| | 6.5 Confirm logs its block | ordinary | 6.1 |
| 7. Docs | 7.1 The docs that ship | ordinary | everything |

**Full suite, once per task** (after the task's last unit, not per unit):

```bash
pnpm exec tsc -b --force --noEmit
pnpm lint
pnpm i18n:check
pnpm test:frontend
```

Run them one after another, never at the same time. `pnpm i18n:check` rewrites the catalogs before it diffs them: it must show no change. Tasks 2 and 4.2 change no code, so they need no full-suite run unless a wording or fallback changed code. Run the full suite again before the final branch review.

**Task-level review:** Task 3 holds the one high-risk unit (3.4), so Task 3 gets a task-level review after its unit reviews pass, covering everything from before Unit 3.1 to after Unit 3.5. Ask the reviewer to check, in particular, the interleavings of a run a newer message stops, a rewind while nothing runs, and a failed ask followed by a Try again.

**Eval runs (Tasks 2 and 4):** they call live models through OpenRouter and cost money, a few cents per run (the T set is six questions, eight asks). They need:

- `OPEN_ROUTER_API_KEY`, which `scripts/ai-eval/runtime/readOpenRouterApiKey.ts` reads from the environment or from `.env.development.edge`. That file is empty in this worktree, so export the key in the shell, or copy its `OPEN_ROUTER_API_KEY=` line from the main checkout's `.env.development.edge`. If neither is available, stop and ask Pablo.
- `~/cleaned-test-data` with the JHU long-format CSVs (present on this machine).
- Deno on `PATH` for the baseline harness (present on this machine).
- No Supabase stack: the eval runs SQL in DuckDB in Node, and the baseline runs the `chat` edge function's code through Deno without auth or a database.

---

## Task 1: Eval support for today's chat

### Unit 1.1: The Try again questions

**Label:** ordinary (3 files). Not high-risk.

**Files:**
- Modify: `scripts/ai-eval/EvalQuestion.ts`
- Create: `scripts/ai-eval/covid/covidTryAgainQuestions.ts`
- Test: `scripts/ai-eval/covid/covidTryAgainQuestions.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `scripts/ai-eval/covid/covidTryAgainQuestions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createTryAgainQuestions } from "./covidTryAgainQuestions";
import type { EvalQuestion } from "../EvalQuestion";
import type { EvalQueryResult } from "../runtime/EvalDatabase";

/** A stand-in source question whose grader names it. */
function _source(id: string): EvalQuestion {
  return {
    id,
    category: "basic",
    prompt: `prompt of ${id}`,
    clarification: "not_needed",
    truth: { total: `SELECT ${id.length}` },
    grade: () => {
      return { pass: true, detail: `graded by ${id}` };
    },
  };
}

const SOURCES = ["B04", "B05", "S01", "N06", "D02"].map(_source);

function _byId(questions: readonly EvalQuestion[], id: string): EvalQuestion {
  return questions.find((question) => {
    return question.id === id;
  })!;
}

function _result(
  columns: readonly string[],
  rows: ReadonlyArray<readonly unknown[]>,
): EvalQueryResult {
  return {
    columns: columns.map((name) => {
      return { name, type: "VARCHAR" };
    }),
    rows,
  };
}

describe("createTryAgainQuestions", () => {
  it.each([
    ["T01", "B04"],
    ["T02", "B05"],
    ["T03", "S01"],
    ["T05", "D02"],
  ])("gives %s the prompt, truth, and grader of %s", (id, sourceId) => {
    const question = _byId(createTryAgainQuestions(SOURCES), id);
    const source = _byId(SOURCES, sourceId);

    expect(question).toMatchObject({
      id,
      category: "try_again",
      prompt: source.prompt,
      truth: source.truth,
      tryAgain: {},
    });
    expect(question.grade).toBe(source.grade);
  });

  it("leaves T04's first card unanswered and adds Georgia the country to N06's truth", () => {
    const question = _byId(createTryAgainQuestions(SOURCES), "T04");

    expect(question).toMatchObject({
      category: "try_again",
      prompt: "prompt of N06",
      clarification: "allowed",
      tryAgain: { isFirstCardUnanswered: true },
    });
    expect(Object.keys(question.truth)).toEqual([
      "total",
      "countryTotal",
      "countryMonthly",
    ]);
    expect(question.truth.countryTotal).toContain(
      `"Country/Region" = 'Georgia'`,
    );
  });

  it("passes T04 on the country's total when N06's grader fails it", () => {
    const failingN06: EvalQuestion = {
      ..._source("N06"),
      grade: () => {
        return { pass: false, detail: "not the state" };
      },
    };
    const sources = SOURCES.map((source) => {
      return source.id === "N06" ? failingN06 : source;
    });
    const question = _byId(createTryAgainQuestions(sources), "T04");
    const truth = {
      countryTotal: _result(["value"], [[1234]]),
      countryMonthly: _result(["month", "value"], [["2021-01", 1234]]),
    };

    expect(
      question.grade({ result: _result(["deaths"], [[1234]]), truth }).pass,
    ).toBe(true);
    expect(
      question.grade({ result: _result(["deaths"], [[99]]), truth }).pass,
    ).toBe(false);
  });

  it("throws when a source question is missing", () => {
    expect(() => {
      return createTryAgainQuestions(
        SOURCES.filter((source) => {
          return source.id !== "S01";
        }),
      );
    }).toThrow(/"S01"/);
  });
});

describe("T06", () => {
  const TRUTH = {
    deathsTop: _result(["name", "value"], [["California", 100]]),
    casesTop: _result(["name", "value"], [["California", 5000]]),
    deathsMonthly: _result(
      ["month", "value"],
      [
        ["2020-03", 10],
        ["2020-04", 90],
      ],
    ),
    casesMonthly: _result(
      ["month", "value"],
      [
        ["2020-03", 1000],
        ["2020-04", 4000],
      ],
    ),
  };
  const T06 = _byId(createTryAgainQuestions(SOURCES), "T06");

  function _grade(
    result: EvalQueryResult,
    parentResult: EvalQueryResult | undefined,
  ): boolean {
    return T06.grade({ result, truth: TRUTH, parentResult }).pass;
  }

  it("follows T01 once, with no Try again of its own", () => {
    expect(T06).toMatchObject({
      followsId: "T01",
      category: "try_again",
      prompt: "show that by month",
    });
    expect(T06.tryAgain).toBeUndefined();
  });

  it("passes the deaths series after T01 read deaths", () => {
    expect(_grade(TRUTH.deathsMonthly, TRUTH.deathsTop)).toBe(true);
  });

  it("passes the cases series after T01 read cases", () => {
    expect(_grade(TRUTH.casesMonthly, TRUTH.casesTop)).toBe(true);
  });

  it("fails the cases series after T01 read deaths", () => {
    expect(_grade(TRUTH.casesMonthly, TRUTH.deathsTop)).toBe(false);
  });

  it("fails when T01's result matched neither reading", () => {
    expect(
      _grade(TRUTH.deathsMonthly, _result(["name", "value"], [["Texas", 7]])),
    ).toBe(false);
  });

  it("fails when T01 showed no result", () => {
    expect(_grade(TRUTH.deathsMonthly, undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run scripts/ai-eval/covid/covidTryAgainQuestions.test.ts`
Expected: FAIL, cannot resolve `./covidTryAgainQuestions`.

- [ ] **Step 3: Extend `EvalQuestion.ts`**

Replace `GradeContext` with:

```ts
/** What a grader sees: the model's final result and the truth results. */
export type GradeContext = {
  result: EvalQueryResult;
  truth: Readonly<Record<string, EvalQueryResult>>;
  /**
   * The result of the question this one follows, as it was graded: for a
   * Try again question, its second attempt's. Unset when the parent showed
   * no result or there is no parent.
   */
  parentResult?: EvalQueryResult;
};
```

Add `| "try_again"` as the last member of `EvalQuestion["category"]`. Add this field after `expectedWrite`:

```ts
  /**
   * Set on a Try again question. The harness asks `prompt`, keeps the first
   * attempt, then reruns the same thread as a Try again and returns the
   * second attempt. With `isFirstCardUnanswered`, the first attempt ends at
   * its first question card, left unanswered, as when the user clicks Try
   * again on the card.
   */
  tryAgain?: { isFirstCardUnanswered?: boolean };
```

- [ ] **Step 4: Write `covidTryAgainQuestions.ts`**

```ts
import { ResultChecks } from "../grading/ResultChecks";
import { MatcherText } from "../grading/ResultMatchers";
import { CovidTruthSql as Sql } from "./covidTruthSql";
import type { EvalQuestion, GradeContext } from "../EvalQuestion";
import type { TruthRowSpec } from "../grading/ResultChecks";
import type { Verdict } from "../grading/ResultMatchers";

const US_STATE = `"Province_State"`;
const GEORGIA_COUNTRY = `"Country/Region" = 'Georgia'`;

/** The first row's name and value, as B04 grades its answer. */
const TOP_ONE: TruthRowSpec = {
  keys: ["name"],
  values: ["value"],
  mode: "prefix",
  prefixLength: 1,
};

/** A monthly series with 95% of its months, as N01 grades one. */
const NEARLY_ALL_MONTHS: TruthRowSpec = {
  keys: ["month"],
  values: ["value"],
  mode: "all",
  minShare: 0.95,
};

function _sourceById(
  sources: readonly EvalQuestion[],
  id: string,
): EvalQuestion {
  const source = sources.find((question) => {
    return question.id === id;
  });
  if (!source) {
    throw new Error(`The Try again questions need source question "${id}"`);
  }
  return source;
}

/** A Try again copy of a source question, under its own id. */
function _tryAgainOf(
  options: Readonly<{
    source: EvalQuestion;
    id: string;
    isFirstCardUnanswered?: boolean;
  }>,
): EvalQuestion {
  return {
    ...options.source,
    id: options.id,
    category: "try_again",
    tryAgain: options.isFirstCardUnanswered
      ? { isFirstCardUnanswered: true }
      : {},
  };
}

/** A truth result's first cell, as a number. */
function _scalar(context: GradeContext, name: string): number {
  return MatcherText.toNumber(context.truth[name]?.rows[0]?.[0]) ?? Number.NaN;
}

/**
 * N06's grader, or Georgia the country: its total as one number or as rows
 * that add up to it, or its monthly series.
 */
function _gradeStateOrCountry(source: EvalQuestion): EvalQuestion["grade"] {
  return (context) => {
    return ResultChecks.anyOf([
      () => {
        return source.grade(context);
      },
      () => {
        return ResultChecks.hasValue(
          context.result,
          _scalar(context, "countryTotal"),
        );
      },
      () => {
        return ResultChecks.hasColumnSum(
          context.result,
          _scalar(context, "countryTotal"),
          { tolerance: 0.001 },
        );
      },
      () => {
        return ResultChecks.matchTruthRows(
          context.result,
          context.truth.countryMonthly!,
          NEARLY_ALL_MONTHS,
        );
      },
    ]);
  };
}

/** `"Province_State"` equal to the state with the most of `view`'s measure. */
function _topStateWhere(view: "us_deaths" | "us_cases"): string {
  return `${US_STATE} = (SELECT name FROM (${Sql.ranked(view, US_STATE, { limit: 1 })}))`;
}

/**
 * T06's grader: the monthly series of the reading T01's second attempt
 * used. Monthly deaths of the top deaths state, or monthly cases of the top
 * cases state. A parent that matched neither reading fails.
 */
function _gradeMonthlyOfParentReading(context: GradeContext): Verdict {
  const parent = context.parentResult;
  if (!parent) {
    return { pass: false, detail: "T01's second attempt showed no result" };
  }
  if (
    ResultChecks.matchTruthRows(parent, context.truth.deathsTop!, TOP_ONE).pass
  ) {
    return ResultChecks.matchTruthRows(
      context.result,
      context.truth.deathsMonthly!,
      NEARLY_ALL_MONTHS,
    );
  }
  if (
    ResultChecks.matchTruthRows(parent, context.truth.casesTop!, TOP_ONE).pass
  ) {
    return ResultChecks.matchTruthRows(
      context.result,
      context.truth.casesMonthly!,
      NEARLY_ALL_MONTHS,
    );
  }
  return { pass: false, detail: "T01's second attempt matched neither reading" };
}

/** A follow-up asked once, after T01's second attempt. */
const T06: EvalQuestion = {
  id: "T06",
  category: "try_again",
  prompt: "show that by month",
  followsId: "T01",
  clarification: "not_needed",
  truth: {
    deathsTop: Sql.ranked("us_deaths", US_STATE, { limit: 1 }),
    casesTop: Sql.ranked("us_cases", US_STATE, { limit: 1 }),
    deathsMonthly: Sql.monthly("us_deaths", _topStateWhere("us_deaths")),
    casesMonthly: Sql.monthly("us_cases", _topStateWhere("us_cases")),
  },
  grade: _gradeMonthlyOfParentReading,
};

/**
 * The Try again set. T01 to T05 copy B04, B05, S01, N06, and D02 by id, and
 * each is asked twice, the second time as a Try again. T04 leaves its first
 * card unanswered and also accepts Georgia the country. T06 follows T01's
 * second attempt. Throws when a source id is missing from `sources`.
 */
export function createTryAgainQuestions(
  sources: readonly EvalQuestion[],
): EvalQuestion[] {
  const n06Source = _sourceById(sources, "N06");
  return [
    _tryAgainOf({ source: _sourceById(sources, "B04"), id: "T01" }),
    _tryAgainOf({ source: _sourceById(sources, "B05"), id: "T02" }),
    _tryAgainOf({ source: _sourceById(sources, "S01"), id: "T03" }),
    {
      ..._tryAgainOf({
        source: n06Source,
        id: "T04",
        isFirstCardUnanswered: true,
      }),
      clarification: "allowed",
      truth: {
        ...n06Source.truth,
        countryTotal: Sql.total("global_deaths", GEORGIA_COUNTRY),
        countryMonthly: Sql.monthly("global_deaths", GEORGIA_COUNTRY),
      },
      grade: _gradeStateOrCountry(n06Source),
    },
    _tryAgainOf({ source: _sourceById(sources, "D02"), id: "T05" }),
    T06,
  ];
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run scripts/ai-eval/covid/covidTryAgainQuestions.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/ai-eval/EvalQuestion.ts scripts/ai-eval/covid/covidTryAgainQuestions.ts scripts/ai-eval/covid/covidTryAgainQuestions.test.ts
git commit -m "feat(ai-eval): add the Try again questions T01 to T06"
```

---

### Unit 1.2: Selecting T

**Label:** ordinary (3 files, full code). Not high-risk.

**Files:**
- Modify: `scripts/ai-eval/covid/covidQuestions.ts`
- Modify: `scripts/ai-eval/selectEvalQuestions.ts`
- Test: `scripts/ai-eval/selectEvalQuestions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside `describe("selectEvalQuestions", ...)`:

```ts
  it("selects the Try again questions for T", () => {
    expect(_ids("T")).toEqual(["T01", "T02", "T03", "T04", "T05", "T06"]);
  });

  it("keeps the Try again questions out of the default run", () => {
    const questions = selectEvalQuestions("");

    expect(questions).toHaveLength(45);
    expect(
      questions.filter((question) => {
        return question.category === "try_again";
      }),
    ).toEqual([]);
  });
```

- [ ] **Step 2: Run them to verify the first fails**

Run: `pnpm vitest run scripts/ai-eval/selectEvalQuestions.test.ts`
Expected: FAIL on "selects the Try again questions for T" (`[]`).

- [ ] **Step 3: Append the T questions to `COVID_QUESTIONS`**

In `covidQuestions.ts`, add `import { createTryAgainQuestions } from "./covidTryAgainQuestions";` with the other `./covid*` imports, and end `COVID_QUESTIONS` with:

```ts
  ...DASHBOARD_QUESTIONS,
  ...createTryAgainQuestions([
    ...BASIC_QUESTIONS,
    ...NON_TECHNICAL_QUESTIONS,
    ...SCHEMA_QUESTIONS,
    ...DASHBOARD_QUESTIONS,
  ]),
];
```

- [ ] **Step 4: Leave `try_again` out of the default run**

In `selectEvalQuestions.ts`, add `question.category !== "try_again"` as the last condition of the default filter, and change the doc comment's selector list to:

```ts
/**
 * The questions a `--questions` value selects. With no value it is the
 * audit's 45 questions, so archived runs compare. A one-letter selector
 * picks a category: `P` page questions, `M` mention questions, `S` schema
 * questions, `D` dashboard questions, `F` follow-ups, `T` the Try again
 * questions, `R` the fitRegression questions. A full id such as `B01` picks
 * one question.
 */
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run scripts/ai-eval/selectEvalQuestions.test.ts scripts/ai-eval/covid`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/ai-eval/covid/covidQuestions.ts scripts/ai-eval/selectEvalQuestions.ts scripts/ai-eval/selectEvalQuestions.test.ts
git commit -m "feat(ai-eval): select the Try again questions with T, outside the default 45"
```

---

### Unit 1.3: The repeat test

**Label:** ordinary (3 files, full code). Not high-risk.

**Files:**
- Modify: `scripts/ai-eval/harnesses/EvalHarness.ts`
- Create: `scripts/ai-eval/runtime/isRepeatedAttempt.ts`
- Test: `scripts/ai-eval/runtime/isRepeatedAttempt.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { isRepeatedAttempt } from "./isRepeatedAttempt";
import type { EvalAnswer, EvalClarification } from "../harnesses/EvalHarness";

function _attempt(overrides: Partial<EvalAnswer>): EvalAnswer {
  return {
    assistantText: "",
    clarifications: [],
    consentPrompts: 0,
    valuesSentToModel: [],
    toolNames: [],
    usage: {
      calls: 1,
      promptTokens: 0,
      cachedPromptTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      cost: 0,
    },
    latencyMs: 0,
    ...overrides,
  };
}

function _card(question: string, isAutomatic = false): EvalClarification {
  return { kind: "fixed_options", question, answer: "deaths", isAutomatic };
}

const HEADING = { kind: "HeadingBlock", text: "Deaths in 2022" } as const;

describe("isRepeatedAttempt", () => {
  it("counts the same query, spaced and cased differently, as a repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ finalSql: "SELECT  state\nFROM t0" }),
        _attempt({ finalSql: " select state from T0 " }),
      ),
    ).toBe(true);
  });

  it("counts a different query as no repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ finalSql: "SELECT state FROM t0" }),
        _attempt({ finalSql: "SELECT state FROM t1" }),
      ),
    ).toBe(false);
  });

  it("counts the same first card question as a repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ clarifications: [_card("Deaths or cases?")] }),
        _attempt({ clarifications: [_card(" Deaths or cases? ")] }),
      ),
    ).toBe(true);
  });

  it("counts a different first card question as no repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ clarifications: [_card("Deaths or cases?")] }),
        _attempt({ clarifications: [_card("Which year?")] }),
      ),
    ).toBe(false);
  });

  it("skips a card the client answered on its own", () => {
    expect(
      isRepeatedAttempt(
        _attempt({
          clarifications: [_card("Which county?", true), _card("Which year?")],
        }),
        _attempt({ clarifications: [_card("Which year?")] }),
      ),
    ).toBe(true);
  });

  it("counts the same single block as a repeat", () => {
    const write = { dashboardId: "d-1", via: "editor", block: HEADING } as const;

    expect(
      isRepeatedAttempt(
        _attempt({ dashboardWrites: [write] }),
        _attempt({ dashboardWrites: [{ ...write }] }),
      ),
    ).toBe(true);
  });

  it("counts a different block as no repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({
          dashboardWrites: [{ dashboardId: "d-1", via: "editor", block: HEADING }],
        }),
        _attempt({
          dashboardWrites: [
            {
              dashboardId: "d-1",
              via: "editor",
              block: { kind: "HeadingBlock", text: "Deaths, 2022" },
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("counts the same reply with no query, card, or block as a repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ assistantText: "They differ. " }),
        _attempt({ assistantText: "They differ." }),
      ),
    ).toBe(true);
  });

  it("counts different replies as no repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ assistantText: "They differ." }),
        _attempt({ assistantText: "They cannot be stacked." }),
      ),
    ).toBe(false);
  });

  it("does not compare replies when only one attempt showed a query", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ finalSql: "SELECT 1", assistantText: "Done." }),
        _attempt({ assistantText: "Done." }),
      ),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run scripts/ai-eval/runtime/isRepeatedAttempt.test.ts`
Expected: FAIL, cannot resolve `./isRepeatedAttempt`.

- [ ] **Step 3: Add `firstAttempt` to `EvalAnswer`**

In `EvalHarness.ts`, after `dashboardWrites`:

```ts
  /**
   * On a Try again question, the first attempt. The answer itself is the
   * second attempt's.
   */
  firstAttempt?: Omit<EvalAnswer, "result" | "firstAttempt">;
```

- [ ] **Step 4: Write `isRepeatedAttempt.ts`**

```ts
import { isDeepStrictEqual } from "node:util";
import type { EvalAnswer } from "../harnesses/EvalHarness";

/** One attempt at a Try again question, without its result. */
type Attempt = Omit<EvalAnswer, "result" | "firstAttempt">;

function _normalizeSql(sql: string): string {
  return sql.replaceAll(/\s+/g, " ").trim().toLowerCase();
}

/** The question on the first card the user saw, trimmed. */
function _firstCardQuestion(attempt: Readonly<Attempt>): string | undefined {
  return attempt.clarifications
    .find((clarification) => {
      return !clarification.isAutomatic;
    })
    ?.question.trim();
}

function _isSameQuery(
  first: Readonly<Attempt>,
  second: Readonly<Attempt>,
): boolean {
  return (
    first.finalSql !== undefined &&
    second.finalSql !== undefined &&
    _normalizeSql(first.finalSql) === _normalizeSql(second.finalSql)
  );
}

function _isSameCard(
  first: Readonly<Attempt>,
  second: Readonly<Attempt>,
): boolean {
  const firstCard = _firstCardQuestion(first);
  return firstCard !== undefined && firstCard === _firstCardQuestion(second);
}

function _isSameBlock(
  first: Readonly<Attempt>,
  second: Readonly<Attempt>,
): boolean {
  const firstWrites = first.dashboardWrites ?? [];
  const secondWrites = second.dashboardWrites ?? [];
  return (
    firstWrites.length === 1 &&
    secondWrites.length === 1 &&
    isDeepStrictEqual(firstWrites[0]!.block, secondWrites[0]!.block)
  );
}

/** Showed no query, asked no card, and wrote no block. */
function _isTextOnly(attempt: Readonly<Attempt>): boolean {
  return (
    attempt.finalSql === undefined &&
    _firstCardQuestion(attempt) === undefined &&
    (attempt.dashboardWrites ?? []).length === 0
  );
}

/**
 * Whether a Try again repeated its first attempt: the same query (whitespace
 * collapsed, trimmed, lowercased), the same first card question (trimmed),
 * the same single dashboard block, or, when neither attempt showed a query,
 * a card, or a block, the same reply (trimmed).
 */
export function isRepeatedAttempt(
  first: Readonly<Attempt>,
  second: Readonly<Attempt>,
): boolean {
  if (
    _isSameQuery(first, second) ||
    _isSameCard(first, second) ||
    _isSameBlock(first, second)
  ) {
    return true;
  }
  return (
    _isTextOnly(first) &&
    _isTextOnly(second) &&
    first.assistantText.trim() === second.assistantText.trim()
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run scripts/ai-eval/runtime/isRepeatedAttempt.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/ai-eval/harnesses/EvalHarness.ts scripts/ai-eval/runtime/isRepeatedAttempt.ts scripts/ai-eval/runtime/isRepeatedAttempt.test.ts
git commit -m "feat(ai-eval): tell when a Try again repeated its first attempt"
```

---

### Unit 1.4: Grading with the parent's result and repeats

**Label:** ordinary (5 files). Not high-risk.

**Files:**
- Modify: `scripts/ai-eval/runtime/gradeEvalAnswer.ts`
- Test: `scripts/ai-eval/runtime/gradeEvalAnswer.test.ts`
- Modify: `scripts/ai-eval/runtime/summarizeEvalRun.ts`
- Test: `scripts/ai-eval/runtime/summarizeEvalRun.test.ts` (new)
- Modify: `scripts/ai-eval/runEval.ts`

- [ ] **Step 1: Write the failing tests**

In `gradeEvalAnswer.test.ts`, add `vi` to the `vitest` import and append:

```ts
describe("gradeEvalAnswer on a follow-up and a Try again", () => {
  const RESULT = { columns: [{ name: "value", type: "BIGINT" }], rows: [[42]] };
  const PARENT_RESULT = {
    columns: [{ name: "name", type: "VARCHAR" }],
    rows: [["Ohio"]],
  };

  function _queryQuestion(grade: EvalQuestion["grade"]): EvalQuestion {
    return {
      id: "T06",
      category: "try_again",
      prompt: "show that by month",
      clarification: "not_needed",
      truth: {},
      grade,
    };
  }

  it("passes the parent's result to the grader", () => {
    const grade = vi.fn(() => {
      return { pass: true, detail: "ok" };
    });

    gradeEvalAnswer(
      _queryQuestion(grade),
      _createAnswer({ result: RESULT, error: undefined }),
      {},
      PARENT_RESULT,
    );

    expect(grade).toHaveBeenCalledWith({
      result: RESULT,
      truth: {},
      parentResult: PARENT_RESULT,
    });
  });

  it("marks a Try again that repeated its first attempt", () => {
    const graded = gradeEvalAnswer(
      NO_QUERY_QUESTION,
      _createAnswer({
        assistantText: "I can't see that dashboard.",
        firstAttempt: _createAnswer({
          assistantText: "I can't see that dashboard.",
        }),
      }),
      {},
    );

    expect(graded.isRepeat).toBe(true);
  });

  it("leaves isRepeat unset on an answer with no first attempt", () => {
    const graded = gradeEvalAnswer(
      NO_QUERY_QUESTION,
      _createAnswer({ assistantText: "I can't see that dashboard." }),
      {},
    );

    expect(graded).not.toHaveProperty("isRepeat");
  });
});
```

Create `scripts/ai-eval/runtime/summarizeEvalRun.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizeEvalRun } from "./summarizeEvalRun";
import type { GradedAnswer } from "./gradeEvalAnswer";

function _graded(id: string, isRepeat?: boolean): GradedAnswer {
  return {
    id,
    category: "try_again",
    prompt: "p",
    pass: true,
    detail: "",
    questionsAsked: 0,
    isNeedlessQuestion: false,
    isMissedQuestion: false,
    ...(isRepeat === undefined ? {} : { isRepeat }),
    answer: {
      assistantText: "",
      clarifications: [],
      consentPrompts: 0,
      valuesSentToModel: [],
      toolNames: [],
      usage: {
        calls: 1,
        promptTokens: 0,
        cachedPromptTokens: 0,
        completionTokens: 0,
        reasoningTokens: 0,
        cost: 0,
      },
      latencyMs: 0,
    },
  };
}

describe("summarizeEvalRun", () => {
  it("counts the Try again answers that repeated their first attempt", () => {
    const summary = summarizeEvalRun("run", [
      _graded("T01", true),
      _graded("T02", false),
      _graded("B01"),
    ]);

    expect(summary.repeatCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run scripts/ai-eval/runtime/gradeEvalAnswer.test.ts scripts/ai-eval/runtime/summarizeEvalRun.test.ts`
Expected: FAIL. `grade` is called without `parentResult`, `isRepeat` is undefined, `repeatCount` is undefined.

- [ ] **Step 3: Grade with the parent's result and mark repeats**

In `gradeEvalAnswer.ts`, import `isRepeatedAttempt` from `./isRepeatedAttempt`. Add this field to `GradedAnswer` after `isMissedQuestion`:

```ts
  /**
   * On a Try again question, whether the second attempt repeated the first
   * (`isRepeatedAttempt`). Unset on every other question.
   */
  isRepeat?: boolean;
```

Give `_gradeResult` a fourth parameter, `parentResult: EvalQueryResult | undefined`, and change its last call to `question.grade({ result: answer.result, truth, parentResult })`. Replace `gradeEvalAnswer` with:

```ts
/**
 * Grades one answer against the question's ground truth and policy. A
 * follow-up's grader also reads `parentResult`, the result of the question
 * it follows.
 */
export function gradeEvalAnswer(
  question: EvalQuestion,
  answer: EvalAnswer,
  truth: Readonly<Record<string, EvalQueryResult>>,
  parentResult?: EvalQueryResult,
): GradedAnswer {
  const verdict = _gradeResult(question, answer, truth, parentResult);
  const questionsAsked = answer.clarifications.filter((clarification) => {
    return !clarification.isAutomatic;
  }).length;
  const { result, ...answerWithoutResult } = answer;
  return {
    id: question.id,
    category: question.category,
    prompt: question.prompt,
    pass: verdict.pass,
    detail: verdict.detail,
    questionsAsked,
    isNeedlessQuestion:
      question.clarification === "not_needed" && questionsAsked > 0,
    isMissedQuestion:
      question.clarification === "expected" && questionsAsked === 0,
    ...(answer.firstAttempt
      ? { isRepeat: isRepeatedAttempt(answer.firstAttempt, answer) }
      : {}),
    answer: {
      ...answerWithoutResult,
      resultColumns: result?.columns.map((column) => {
        return column.name;
      }),
      resultRowCount: result?.rows.length,
      resultPreview: result?.rows.slice(0, 5),
    },
  };
}
```

- [ ] **Step 4: Count repeats in the summary**

In `summarizeEvalRun.ts`, add to `EvalRunSummary` after `missedQuestions`:

```ts
  /** Try again answers whose second attempt repeated the first. */
  repeatCount: number;
```

and to the returned object after `missedQuestions`:

```ts
    repeatCount: answers.filter((answer) => {
      return answer.isRepeat === true;
    }).length,
```

`formatSummaryRow` and `SUMMARY_TABLE_HEADER` do not change, so `summary.md` is unchanged.

- [ ] **Step 5: Pass the parent's result and print repeats in `runEval.ts`**

Add to the header comment, after the `--questions D` sentence:

```ts
 * `--questions T` runs the Try again questions: each is asked, then asked
 * again as a Try again, and the second attempt is graded. T06 follows
 * T01's second attempt.
```

Replace `_runConversation`'s loop body:

```ts
  const conversation = options.harness.startConversation();
  // Each answer's result by question id, so a follow-up's grader reads its
  // parent's.
  const resultsById = new Map<string, EvalQueryResult | undefined>();
  for (const question of options.questions) {
    const [answer, truth] = await Promise.all([
      conversation.ask(question),
      _computeTruth(options.database, question),
    ]);
    resultsById.set(question.id, answer.result);
    const parentResult =
      question.followsId === undefined
        ? undefined
        : resultsById.get(question.followsId);
    options.onGraded(gradeEvalAnswer(question, answer, truth, parentResult));
  }
```

In `main`'s `console.log`, put `${answer.isRepeat ? "(repeat) " : ""}` right after the `(asked N) ` part.

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run scripts/ai-eval/runtime`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/ai-eval/runtime/gradeEvalAnswer.ts scripts/ai-eval/runtime/gradeEvalAnswer.test.ts scripts/ai-eval/runtime/summarizeEvalRun.ts scripts/ai-eval/runtime/summarizeEvalRun.test.ts scripts/ai-eval/runEval.ts
git commit -m "feat(ai-eval): grade follow-ups with their parent's result and count repeats"
```

---

### Unit 1.5: The baseline's Try again turn

**Label:** ordinary (4 files). Not high-risk.

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers.ts`
- Modify: `scripts/ai-eval/harnesses/baseline/DenoChatTurnRunner.ts`
- Modify: `scripts/ai-eval/harnesses/baseline/BaselineHarness.ts`
- Test: `scripts/ai-eval/harnesses/baseline/BaselineHarness.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `BaselineHarness.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildBaselineTryAgainTurn } from "./BaselineHarness";

const QUESTION = [
  { role: "user", content: "Which state had the most covid?" },
] as const;

describe("buildBaselineTryAgainTurn", () => {
  it("drops the trailing assistant message, as assistant-ui does", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: [...QUESTION, { role: "assistant", content: "California." }],
      lastResult: { assistantText: "California." },
    });

    expect(turn.messages).toEqual(QUESTION);
  });

  it("describes the last response's SQL", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: { assistantText: "", generatedSql: { sql: "SELECT 1" } },
    });

    expect(turn.retryContext).toEqual({ priorGeneratedSql: "SELECT 1" });
  });

  it("describes the last response's card question", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: {
        assistantText: "Which one?",
        clarification: { question: "Deaths or cases?" },
      },
    });

    expect(turn.retryContext).toEqual({
      priorAssistantText: "Which one?",
      priorClarificationQuestion: "Deaths or cases?",
    });
  });

  it("describes the last response's block kind", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: { assistantText: "", dashboardBlock: { kind: "HeadingBlock" } },
    });

    expect(turn.retryContext).toEqual({
      priorDashboardBlockKind: "HeadingBlock",
    });
  });

  it("sends no retry context when the last call failed", () => {
    const turn = buildBaselineTryAgainTurn({
      messages: QUESTION,
      lastResult: undefined,
    });

    expect(turn.retryContext).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run scripts/ai-eval/harnesses/baseline/BaselineHarness.test.ts`
Expected: FAIL, `buildBaselineTryAgainTurn` is not exported.

- [ ] **Step 3: Let `buildRetryContext` read any response with the four fields**

In `chatRuntimeTurnHelpers.ts`, add above `buildRetryContext`:

```ts
/**
 * The four fields of a response that a retry context describes.
 * `ChatResponse.T` has them, and so does the eval's response from today's
 * chat.
 */
export type RetryContextSource = {
  assistantText?: string;
  generatedSql?: { sql: string };
  clarification?: { question: string };
  dashboardBlock?: { kind: string };
};
```

and change only its parameter: `response: Readonly<RetryContextSource>`. The body does not change, and today's chat calls it as before.

- [ ] **Step 4: Let the Deno turn carry a retry context**

In `DenoChatTurnRunner.ts`, import `ChatRetryContext` with `ChatGeneratedDashboardBlock` from `$/types/chat.types`, and change `DenoChatTurn.retryContext` to:

```ts
  /** Sent on a Try again's first model call, as today's chat sends it. */
  retryContext: ChatRetryContext | undefined;
```

`supabase/functions/_eval/runChatTurnCli.ts` passes the whole turn to `runChatTurn` already, so the Deno side needs no change.

- [ ] **Step 5: Export `buildBaselineTryAgainTurn`**

In `BaselineHarness.ts`, add `import { buildRetryContext } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";`, `ChatRetryContext` to the `$/types/chat.types` type import, and `import type { RetryContextSource } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";`. Add below `_needsConsent`:

```ts
/**
 * The thread and retry context today's chat sends when the user clicks Try
 * again on the latest answer. assistant-ui drops the trailing assistant
 * message, and the adapter describes the last response it got with
 * `buildRetryContext`.
 */
export function buildBaselineTryAgainTurn(
  options: Readonly<{
    messages: readonly ThreadMessage[];
    lastResult: Readonly<RetryContextSource> | undefined;
  }>,
): { messages: ThreadMessage[]; retryContext: ChatRetryContext | undefined } {
  const isAssistantLast = options.messages.at(-1)?.role === "assistant";
  return {
    messages: isAssistantLast
      ? options.messages.slice(0, -1)
      : [...options.messages],
    retryContext: options.lastResult
      ? buildRetryContext(options.lastResult)
      : undefined,
  };
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run scripts/ai-eval/harnesses/baseline src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.retryContext.test.tsx`
Expected: PASS, the retryContext test unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers.ts scripts/ai-eval/harnesses/baseline/DenoChatTurnRunner.ts scripts/ai-eval/harnesses/baseline/BaselineHarness.ts scripts/ai-eval/harnesses/baseline/BaselineHarness.test.ts
git commit -m "feat(ai-eval): build today's chat's Try again turn for the baseline"
```

---

### Unit 1.6: The baseline asks a Try again question

**Label:** ordinary (4 files, a class change). Not high-risk.

**Files:**
- Modify: `scripts/ai-eval/harnesses/baseline/BaselineHarness.ts`
- Test: `scripts/ai-eval/harnesses/baseline/BaselineHarness.test.ts`
- Modify: `scripts/ai-eval/harnesses/baseline/baselinePageContext.ts`
- Test: `scripts/ai-eval/harnesses/baseline/baselinePageContext.test.ts`

- [ ] **Step 1: Write the failing tests**

In `BaselineHarness.test.ts`, change the imports to:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBaselineTryAgainTurn, createBaselineHarness } from "./BaselineHarness";
import type { EvalQuestion } from "../../EvalQuestion";
import type { EvalDatabase } from "../../runtime/EvalDatabase";
import type { DenoChatTurn, DenoChatTurnResponse } from "./DenoChatTurnRunner";
```

Add the mocks under the imports:

```ts
const { runTurnMock, runEvalSqlMock } = vi.hoisted(() => {
  return { runTurnMock: vi.fn(), runEvalSqlMock: vi.fn() };
});

vi.mock("./DenoChatTurnRunner", () => {
  return {
    DenoChatTurnRunner: class {
      runTurn = runTurnMock;
      close(): void {}
    },
  };
});

vi.mock("../../runtime/runEvalSql", () => {
  return { runEvalSql: runEvalSqlMock };
});
```

Append:

```ts
const TRY_AGAIN_QUESTION: EvalQuestion = {
  id: "T02",
  category: "try_again",
  prompt: "How many people died of covid in the US in total?",
  clarification: "not_needed",
  user: { choose: /state/i },
  truth: {},
  grade: () => {
    return { pass: true, detail: "ok" };
  },
  tryAgain: {},
};

const CARD_RESPONSE: DenoChatTurnResponse = {
  result: {
    assistantText: "Which Georgia?",
    clarification: {
      question: "The state or the country?",
      responseShape: {
        kind: "fixed_options",
        options: ["The US state", "The country"],
        multi: false,
      },
    },
  },
  latencyMs: 1,
};

function _sqlResponse(sql: string): DenoChatTurnResponse {
  return {
    result: { assistantText: "Here it is.", generatedSql: { sql } },
    latencyMs: 1,
  };
}

describe("the baseline conversation on a Try again question", () => {
  const sentTurns: DenoChatTurn[] = [];

  /** Answers each model call in turn, keeping a copy of what was sent. */
  function _respondWith(responses: readonly DenoChatTurnResponse[]): void {
    runTurnMock.mockReset().mockImplementation(async (turn: DenoChatTurn) => {
      sentTurns.push(JSON.parse(JSON.stringify(turn)));
      return responses[sentTurns.length - 1];
    });
  }

  function _ask(question: EvalQuestion) {
    return createBaselineHarness({
      repoRoot: "/repo",
      openRouterApiKey: "key",
      database: {} as EvalDatabase,
      model: "anthropic/claude-haiku-5.5",
    })
      .startConversation()
      .ask(question);
  }

  beforeEach(() => {
    sentTurns.length = 0;
    runEvalSqlMock.mockReset().mockResolvedValue({
      kind: "rows",
      result: { columns: [{ name: "value", type: "BIGINT" }], rows: [[42]] },
    });
  });

  it("sends the retry context on the second attempt's first call only", async () => {
    _respondWith([_sqlResponse("SELECT 1"), _sqlResponse("SELECT 2")]);

    await _ask(TRY_AGAIN_QUESTION);

    expect(
      sentTurns.map((turn) => {
        return turn.retryContext;
      }),
    ).toEqual([
      undefined,
      { priorAssistantText: "Here it is.", priorGeneratedSql: "SELECT 1" },
    ]);
  });

  it("asks the second attempt on the thread without the first reply", async () => {
    _respondWith([_sqlResponse("SELECT 1"), _sqlResponse("SELECT 2")]);

    await _ask(TRY_AGAIN_QUESTION);

    expect(sentTurns[1]!.messages).toEqual([
      { role: "user", content: TRY_AGAIN_QUESTION.prompt },
    ]);
  });

  it("returns the second attempt, with the first beside it", async () => {
    _respondWith([_sqlResponse("SELECT 1"), _sqlResponse("SELECT 2")]);

    const answer = await _ask(TRY_AGAIN_QUESTION);

    expect(answer.finalSql).toBe("SELECT 2");
    expect(answer.firstAttempt?.finalSql).toBe("SELECT 1");
    expect(answer.firstAttempt).not.toHaveProperty("result");
  });

  it("counts both attempts' model calls in the question's usage", async () => {
    const usage = {
      calls: 1,
      promptTokens: 10,
      cachedPromptTokens: 0,
      completionTokens: 2,
      reasoningTokens: 0,
      cost: 0.001,
    };
    _respondWith([
      { ..._sqlResponse("SELECT 1"), usage },
      { ..._sqlResponse("SELECT 2"), usage },
    ]);

    const answer = await _ask(TRY_AGAIN_QUESTION);

    expect(answer.usage.calls).toBe(2);
    expect(answer.firstAttempt?.usage.calls).toBe(1);
  });

  it("ends the first attempt at a card it leaves unanswered", async () => {
    _respondWith([CARD_RESPONSE, _sqlResponse("SELECT 2")]);

    const answer = await _ask({
      ...TRY_AGAIN_QUESTION,
      tryAgain: { isFirstCardUnanswered: true },
    });

    expect(answer.firstAttempt?.clarifications).toEqual([
      {
        kind: "fixed_options",
        question: "The state or the country?",
        answer: "(unanswered)",
        isAutomatic: false,
      },
    ]);
    expect(sentTurns[1]!.messages).toEqual([
      { role: "user", content: TRY_AGAIN_QUESTION.prompt },
    ]);
    expect(sentTurns[1]!.retryContext).toEqual({
      priorAssistantText: "Which Georgia?",
      priorClarificationQuestion: "The state or the country?",
    });
  });

  it("sends no retry context after the second attempt's card is answered", async () => {
    _respondWith([
      _sqlResponse("SELECT 1"),
      CARD_RESPONSE,
      _sqlResponse("SELECT 3"),
    ]);

    const answer = await _ask(TRY_AGAIN_QUESTION);

    expect(sentTurns[2]!.retryContext).toBeUndefined();
    expect(answer.clarifications[0]?.question).toBe(
      "The state or the country?",
    );
  });
});
```

In `baselinePageContext.test.ts`, append inside `describe("toBaselinePageContext", ...)`:

```ts
  it("names the open editor's dashboard for a Try again of a dashboard question", () => {
    const context = toBaselinePageContext(
      _question({
        category: "try_again",
        dashboards: [],
        pageContext: {
          app: "dashboard",
          dashboard: { id: DASHBOARD_ID, name: "COVID 2022", tiles: [] },
        },
        openEditorDashboardId: DASHBOARD_ID,
      }),
    );

    expect(context).toEqual({ app: "dashboards", dashboardId: DASHBOARD_ID });
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run scripts/ai-eval/harnesses/baseline`
Expected: FAIL. The conversation asks once, and the Try again page context is undefined.

- [ ] **Step 3: Treat a Try again of a dashboard question as one**

In `toBaselinePageContext`, replace the category check with:

```ts
  // A Try again copy of a dashboard question keeps its dashboards, so it
  // reads as a dashboard question here too.
  if (question.category !== "dashboards" && question.dashboards === undefined) {
    return undefined;
  }
```

and change the doc comment's second sentence to "A dashboard question elsewhere, or a Try again of one, sends the dashboards app with the open editor's id, or `other`, as the app does."

- [ ] **Step 4: Ask a Try again question in `BaselineConversation`**

In `BaselineHarness.ts`, add `import { omit } from "@avandar/utils";`, and this constant under `COPY`:

```ts
/** What the first attempt records for a card the user left on screen. */
const UNANSWERED_CARD_ANSWER = "(unanswered)";
```

Add these fields to `BaselineConversation`, under `context`:

```ts
  /** The last model call's response, which a Try again describes. */
  private lastResult: DenoChatTurnResponse["result"] = undefined;
  /** Sent with the next model call only: a Try again's first call. */
  private pendingRetryContext: ChatRetryContext | undefined = undefined;
  /** The attempt ends at its first card, left unanswered on screen. */
  private isFirstCardLeftOpen = false;
```

Replace `ask` with these three methods:

```ts
  async ask(question: EvalQuestion): Promise<EvalAnswer> {
    // Today's chat hears each mention by its type only (D42).
    this.messages.push({
      role: "user",
      content: ChatMentionToken.toModelText(question.prompt, getGadgetTypeName),
    });
    if (!question.tryAgain) {
      return this.runAttempt(question);
    }
    return this.askTryAgain(question, question.tryAgain);
  }

  /**
   * Answers the question once, then again as today's chat does when the
   * user clicks Try again: on the thread without the last reply, with the
   * retry context on the first model call. Returns the second attempt, with
   * the first beside it.
   */
  private async askTryAgain(
    question: EvalQuestion,
    tryAgain: NonNullable<EvalQuestion["tryAgain"]>,
  ): Promise<EvalAnswer> {
    this.isFirstCardLeftOpen = tryAgain.isFirstCardUnanswered === true;
    const firstAttempt = await this.runAttempt(question);
    this.isFirstCardLeftOpen = false;
    const retryTurn = buildBaselineTryAgainTurn({
      messages: this.messages,
      lastResult: this.lastResult,
    });
    this.messages.splice(0, this.messages.length, ...retryTurn.messages);
    this.pendingRetryContext = retryTurn.retryContext;
    const secondAttempt = await this.runAttempt(question);
    return {
      ...secondAttempt,
      // The question cost both attempts. Its latency stays the second
      // attempt's: the wait after the user clicks Try again.
      usage: addEvalUsage(firstAttempt.usage, secondAttempt.usage),
      firstAttempt: omit(firstAttempt, ["result", "firstAttempt"]),
    };
  }

  /** Runs model calls on the thread as it stands until the question is answered. */
  private async runAttempt(question: EvalQuestion): Promise<EvalAnswer> {
    const startedAt = performance.now();
    const answer: EvalAnswer = {
      assistantText: "",
      clarifications: [],
      consentPrompts: 0,
      valuesSentToModel: [],
      toolNames: [],
      usage: EMPTY_EVAL_USAGE,
      latencyMs: 0,
      dashboardWrites: [],
    };
    this.context = toBaselinePageContext(question) ?? this.context;
    for (let turn = 0; turn < MAX_MODEL_TURNS_PER_QUESTION; turn += 1) {
      const isDone = await this.runModelTurn(question, answer);
      if (isDone) {
        return { ...answer, latencyMs: performance.now() - startedAt };
      }
    }
    return {
      ...answer,
      error: "Too many model turns without an answer",
      latencyMs: performance.now() - startedAt,
    };
  }
```

Add `callModel` and `applyClarification` above `runModelTurn`:

```ts
  /** One model call on the thread, its usage added to the answer. */
  private async callModel(answer: EvalAnswer): Promise<DenoChatTurnResponse> {
    const retryContext = this.pendingRetryContext;
    this.pendingRetryContext = undefined;
    const response = await this.runner.runTurn({
      messages: this.messages,
      context: this.context,
      model: this.model,
      retryContext,
      schema: COVID_WORKSPACE_SCHEMA,
    });
    answer.usage = addEvalUsage(
      answer.usage,
      response.usage ?? EMPTY_EVAL_USAGE,
    );
    this.lastResult = response.result;
    return response;
  }

  /**
   * Adds the card's text to the thread and has the simulated user answer
   * it, which leaves the question open. A card the attempt leaves on screen
   * ends the attempt unanswered instead.
   */
  private async applyClarification(
    options: Readonly<{
      question: EvalQuestion;
      assistantText: string;
      clarification: Clarification;
      answer: EvalAnswer;
    }>,
  ): Promise<boolean> {
    const { question, assistantText, clarification, answer } = options;
    this.messages.push({ role: "assistant", content: assistantText });
    if (!this.isFirstCardLeftOpen) {
      await this.answerClarification(question, clarification, answer);
      return false;
    }
    this.isFirstCardLeftOpen = false;
    answer.assistantText = assistantText;
    answer.clarifications.push({
      kind: clarification.responseShape.kind,
      question: clarification.question,
      answer: UNANSWERED_CARD_ANSWER,
      isAutomatic: false,
    });
    return true;
  }
```

In `runModelTurn`, replace the `runner.runTurn` call and the usage line with `const response = await this.callModel(answer);`, and replace the `if (response.result.clarification) { ... }` block with:

```ts
    const { clarification } = response.result;
    if (clarification) {
      return this.applyClarification({
        question,
        assistantText: response.result.assistantText,
        clarification,
        answer,
      });
    }
```

`runModelTurn` ends at about 40 lines, under the 45-line rule it was over before.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run scripts/ai-eval/harnesses/baseline`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/ai-eval/harnesses/baseline
git commit -m "feat(ai-eval): ask Try again questions on today's chat with its retry context"
```

- [ ] **Step 7: Task 1 full suite**

Run the four full-suite commands under [Order and dependencies](#order-and-dependencies), one after another.
Expected: all PASS, no catalog change.

---

## Task 2: Today's chat on the T set

### Unit 2.1: Baseline runs

**Label:** eval run (no code). Not high-risk. Live models, a few cents per run.

**Files:**
- Modify: `docs/ai-agent/eval.md`
- Add: `docs/ai-agent/eval-runs/**` (archived runs)

- [ ] **Step 1: Check what the runs need**

```bash
deno --version
ls ~/cleaned-test-data/long-us-deaths.csv ~/cleaned-test-data/long-global-deaths.csv
test -n "$OPEN_ROUTER_API_KEY" || grep -c '^OPEN_ROUTER_API_KEY=.' .env.development.edge
```

Expected: a Deno version, both CSVs, and a key from one of the two sources. With no key, stop and ask Pablo (see [Order and dependencies](#order-and-dependencies)).

- [ ] **Step 2: Three runs of today's chat with `retryContext`**

```bash
for run in 1 2 3; do
  pnpm vite-script scripts/ai-eval/runEval.ts -- --harness baseline --model anthropic/claude-haiku-5.5 --questions T --label phase-1e:today-retry
done
```

Each run writes `.temp/ai-eval/runs/<time>-phase-1e_today-retry/` with `results.jsonl`, `summary.json`, and `summary.md`.

- [ ] **Step 3: Read the runs**

From each run's `summary.json` and `results.jsonl`, note: passes per question (T01 to T06), passes summed over the three runs (out of 18), `isRepeat` per question, repeats on T01 and T04 summed over the three runs, needless and missed questions, cost per question, input tokens per call, and latency p50 / p90. A miss that looks like a harness bug (not today's chat's answer) is a bug to fix in Task 1 before the runs count: fix it under TDD, rerun all three.

- [ ] **Step 4: Archive and record**

Run `pnpm vite-script scripts/ai-eval/archiveEvalRuns.ts`. In `eval.md`, add a `### Phase 1E` section after the Phase 1D section (before `## Offline mode`):

- One paragraph: runs for Try again and parity in the agent (D45, [phase-1e.md](specs/phase-1e.md)), archived under the `phase-1e` label. Today's chat set the bar first, on the run date, before the agent side was built. T01 to T06 are described under "Questions and ground truth" (Task 7 adds that paragraph).
- A table with columns: Run, Correct, T01, T02, T03, T04, T05, T06, Repeats (T01 and T04 / all), Needless / missed, Cost per question, Input tokens per call, Latency p50 / p90. One row per run, labelled `phase-1e:today-retry #1` to `#3`.
- A bullet giving the baseline's two sums that the agent's bars 1 and 2 compare against: passes over the 18 graded answers, and repeats on T01 and T04 over the three runs.

- [ ] **Step 5: Commit**

```bash
git add docs/ai-agent/eval.md docs/ai-agent/eval-runs
git commit -m "docs(ai-eval): record today's chat on the Try again set"
```

---

## Task 3: Try again in the agent

This task holds the high-risk unit 3.4, so it gets a task-level review after its unit reviews pass.

### Unit 3.1: The Try again line

**Label:** mechanical (2 files, full code). Not high-risk.

**Files:**
- Modify: `shared/agent/pageContext/buildAgentTurnText.ts`
- Test: `shared/agent/pageContext/buildAgentTurnText.test.ts`

- [ ] **Step 1: Write the guard test (green from the start)**

Append to `buildAgentTurnText.test.ts`:

```ts
describe("turn text that is not a Try again", () => {
  it.each([
    [
      "card lines, a changed page block, and a mentioned block",
      {
        message: "m",
        dashboardCardLines: ["<dashboard_card>C</dashboard_card>"],
        pageBlock: "<current_page>B</current_page>",
        previousPageBlock: "<current_page>A</current_page>",
        mentionedBlock: "<mentioned>M</mentioned>",
      },
      "<dashboard_card>C</dashboard_card>\n\n<current_page>B</current_page>\n\n<mentioned>M</mentioned>\n\nm",
    ],
    [
      "an unchanged page and attached block",
      {
        message: "m",
        pageBlock: "<current_page>A</current_page>",
        previousPageBlock: "<current_page>A</current_page>",
        attachedBlock: "<attached>T</attached>",
        previousAttachedBlock: "<attached>T</attached>",
      },
      "<current_page>Unchanged since the last message.</current_page>\n\n<attached>Unchanged since the last message.</attached>\n\nm",
    ],
    [
      "a cleared attached block",
      { message: "m", previousAttachedBlock: "<attached>T</attached>" },
      "<attached>Nothing is attached any more.</attached>\n\nm",
    ],
    ["a message alone", { message: "m" }, "m"],
  ])("is exactly today's text for %s", (_label, options, expected) => {
    expect(buildAgentTurnText(options)).toBe(expected);
    expect(buildAgentTurnText({ ...options, isRetry: false })).toBe(expected);
  });
});
```

Run: `pnpm vitest run shared/agent/pageContext/buildAgentTurnText.test.ts`
Expected: PASS (it pins today's output). Vitest does not type-check, so `isRetry` runs before it exists.

- [ ] **Step 2: Write the failing tests**

Add `TRY_AGAIN_LINE` to the test file's import from `$/agent/pageContext/buildAgentTurnText.ts`, and append:

```ts
describe("the Try again line", () => {
  const CARD_LINE =
    "<dashboard_card>Cancelled: nothing was added.</dashboard_card>";
  const PAGE = "<current_page>Page: Map</current_page>";

  it("goes after the card lines and blocks and before the message", () => {
    expect(
      buildAgentTurnText({
        message: "how many?",
        pageBlock: PAGE,
        dashboardCardLines: [CARD_LINE],
        isRetry: true,
      }),
    ).toBe([CARD_LINE, PAGE, TRY_AGAIN_LINE, "how many?"].join("\n\n"));
  });

  it("comes first when the turn has no blocks", () => {
    expect(buildAgentTurnText({ message: "how many?", isRetry: true })).toBe(
      `${TRY_AGAIN_LINE}\n\nhow many?`,
    );
  });
});

describe("TRY_AGAIN_LINE", () => {
  /** The words the column-question patterns in `isSchemaAnswerTurn` use. */
  const COLUMN_PATTERN_WORDS = [
    "column",
    "columns",
    "same",
    "similar",
    "matching",
    "append",
    "appended",
    "appendable",
    "stack",
    "stacked",
    "compare",
    "comparing",
  ];

  it("uses none of the words the column-question patterns are built from", () => {
    const words = TRY_AGAIN_LINE.toLowerCase().match(/[a-z]+/g) ?? [];

    expect(
      words.filter((word) => {
        return COLUMN_PATTERN_WORDS.includes(word);
      }),
    ).toEqual([]);
  });

  it("does not start like a retry follow-up", () => {
    expect(TRY_AGAIN_LINE).not.toMatch(/^(?:try again\b|that query failed\b)/i);
  });

  it("is at most three sentences of plain text, with no tag and no em dash", () => {
    expect(TRY_AGAIN_LINE).not.toMatch(/[<>\u2014]/);
    expect(
      TRY_AGAIN_LINE.split(/(?<=[.!?])\s+/).length,
    ).toBeLessThanOrEqual(3);
  });

  it("names no tool and asks for no query", () => {
    expect(TRY_AGAIN_LINE).not.toMatch(/_|\bquer(?:y|ies)\b/i);
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm vitest run shared/agent/pageContext/buildAgentTurnText.test.ts`
Expected: FAIL. `TRY_AGAIN_LINE` is undefined, and `isRetry` adds nothing.

- [ ] **Step 4: Add the line and `isRetry`**

In `buildAgentTurnText.ts`, add under `ATTACHED_CLEARED_BLOCK`:

```ts
/** Sent before the message on a hosted Try again of the latest answer. */
export const TRY_AGAIN_LINE =
  "The user clicked Try again: they want a different answer to the message below than your last one above. Do not repeat it. Read the message another way, take a different approach, or ask one question if your last answer had to guess.";
```

Change `buildAgentTurnText`'s doc comment to start "The text of one agent turn: the dashboard card lines, the page block, the attached block, the mentioned block, on a Try again the Try again line, then the user's message." Add the option after `dashboardCardLines`:

```ts
    /**
     * A hosted Try again of the latest answer: the line goes before the
     * message.
     */
    isRetry?: boolean;
```

and change the return to:

```ts
  const retryLines = options.isRetry ? [TRY_AGAIN_LINE] : [];
  return [...blocks, ...retryLines, options.message].join("\n\n");
```

`LEADING_TURN_BLOCKS` and `splitAgentTurnText` do not change: only the offline agent splits turn text, and it is never sent the line.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run shared/agent/pageContext/buildAgentTurnText.test.ts`
Expected: PASS, every existing case unchanged.

- [ ] **Step 6: Commit**

```bash
git add shared/agent/pageContext/buildAgentTurnText.ts shared/agent/pageContext/buildAgentTurnText.test.ts
git commit -m "feat(ai-agent): add the Try again line to the agent's turn text"
```

---

### Unit 3.2: A retried column question stays one

**Label:** mechanical (1 file, full code). Not high-risk. These tests pin requirement 9 and pass on their first run.

**Files:**
- Test: `src/lib/agent/schemaAnswer/isSchemaAnswerTurn.test.ts`

- [ ] **Step 1: Write the tests**

Add these imports:

```ts
import {
  buildAgentTurnText,
  TRY_AGAIN_LINE,
} from "$/agent/pageContext/buildAgentTurnText";
```

Append inside `describe("isSchemaAnswerTurn", ...)`:

```ts
  const S01 =
    "Look at long-us-deaths.csv and long-global-deaths.csv. Are they appendable? Do they have the same or similar columns?";
  const PAGE_BLOCK = "<current_page>\nPage: Data Explorer\n</current_page>";

  function _retryText(message: string): string {
    return buildAgentTurnText({ message, pageBlock: PAGE_BLOCK, isRetry: true });
  }

  it("does not read the Try again line alone as a column question", () => {
    expect(isSchemaAnswerTurn([TRY_AGAIN_LINE])).toBe(false);
  });

  it("keeps a retried column question a column question", () => {
    expect(isSchemaAnswerTurn([S01, _retryText(S01)])).toBe(true);
  });

  it("leaves a retried question about rows to the explorer after a column question", () => {
    expect(isSchemaAnswerTurn([S01, _retryText("show me deaths")])).toBe(false);
  });
```

- [ ] **Step 2: Run them**

Run: `pnpm vitest run src/lib/agent/schemaAnswer/isSchemaAnswerTurn.test.ts`
Expected: PASS on the first run. Report that this unit pins behavior and was green from the start. If one fails, the wording breaks rule 3 or 4 of the spec's line rules: stop and report it, since Unit 3.1's tests should have caught it.

- [ ] **Step 3: Commit**

```bash
git add src/lib/agent/schemaAnswer/isSchemaAnswerTurn.test.ts
git commit -m "test(ai-agent): keep a retried column question a column question"
```

---

### Unit 3.3: Classifying a turn

**Label:** ordinary (3 files, full code). Not high-risk.

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts`
- Create: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/getAgentTurnKind/getAgentTurnKind.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/getAgentTurnKind/getAgentTurnKind.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { chatMessagesKey } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import { getAgentTurnKind } from "./getAgentTurnKind";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { AgentAskRecord } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";

/** A thread whose messages alternate user and assistant, user first. */
function _thread(contents: readonly string[]): ChatClientMessage.T[] {
  return contents.map((content, index) => {
    return Model.make("ChatClientMessage", {
      role: index % 2 === 0 ? "user" : "assistant",
      content,
    });
  });
}

function _record(messages: readonly ChatClientMessage.T[]): AgentAskRecord {
  return {
    threadKey: chatMessagesKey(messages),
    messageCount: messages.length,
    isKept: true,
  };
}

const ASKED = _thread(["How many?", "Forty-two.", "And deaths?"]);

describe("getAgentTurnKind", () => {
  it("calls a conversation with no record a first turn", () => {
    expect(getAgentTurnKind({ lastAsk: undefined, apiMessages: ASKED })).toBe(
      "first",
    );
  });

  it("calls the recorded thread again the same thread", () => {
    expect(
      getAgentTurnKind({
        lastAsk: _record(ASKED),
        apiMessages: _thread(["How many?", "Forty-two.", "And deaths?"]),
      }),
    ).toBe("same_thread");
  });

  it("calls a longer thread that starts with the recorded one a continuation", () => {
    expect(
      getAgentTurnKind({
        lastAsk: _record(ASKED),
        apiMessages: _thread([
          "How many?",
          "Forty-two.",
          "And deaths?",
          "Seven.",
          "And cases?",
        ]),
      }),
    ).toBe("continues");
  });

  it.each([
    ["a shorter prefix", ["How many?"]],
    ["the same length with one message changed", ["How many?", "Forty-two.", "And cases?"]],
    [
      "a longer thread whose start differs",
      ["How many?", "Forty-three.", "And deaths?", "Seven.", "And cases?"],
    ],
  ])("calls %s rewound", (_label, contents) => {
    expect(
      getAgentTurnKind({ lastAsk: _record(ASKED), apiMessages: _thread(contents) }),
    ).toBe("rewound");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/getAgentTurnKind`
Expected: FAIL, cannot resolve `./getAgentTurnKind`.

- [ ] **Step 3: Add the record type**

In `dataAgentConversation.types.ts`, add above `DataAgentConversation`:

```ts
/** The thread one ask was given, and how the ask ended. */
export type AgentAskRecord = {
  /** `chatMessagesKey` of the turn's `apiMessages`. */
  threadKey: string;
  /** How many messages that thread held. */
  messageCount: number;
  /** The ask resolved and its turn was not stale. */
  isKept: boolean;
};
```

and add this field to `DataAgentConversation` after `activeAsk`:

```ts
  /**
   * The last ask that settled, to tell a Try again from a follow-up. Unset
   * until one does. In memory only, so a reload or a session switch forgets
   * it.
   */
  lastAsk?: AgentAskRecord;
```

- [ ] **Step 4: Write `getAgentTurnKind.ts`**

```ts
import { chatMessagesKey } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { AgentAskRecord } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";

/**
 * How a turn's thread relates to the thread its conversation was last
 * asked. `first`: no ask has settled. `continues`: the thread adds messages
 * after the recorded one (a follow-up, a card answer, a view change).
 * `same_thread`: the recorded thread again, which assistant-ui sends on Try
 * again of the latest answer. `rewound`: anything else, such as Try again
 * on an earlier answer.
 */
export type AgentTurnKind = "first" | "continues" | "same_thread" | "rewound";

/**
 * Classifies a turn against its conversation's last ask. Two threads match
 * only when every message's role and text match, so only a thread
 * assistant-ui reran repeats exactly.
 */
export function getAgentTurnKind(
  options: Readonly<{
    lastAsk: AgentAskRecord | undefined;
    apiMessages: readonly ChatClientMessage.T[];
  }>,
): AgentTurnKind {
  const { lastAsk, apiMessages } = options;
  if (lastAsk === undefined) {
    return "first";
  }
  if (apiMessages.length < lastAsk.messageCount) {
    return "rewound";
  }
  const startKey = chatMessagesKey(apiMessages.slice(0, lastAsk.messageCount));
  if (startKey !== lastAsk.threadKey) {
    return "rewound";
  }
  return apiMessages.length === lastAsk.messageCount
    ? "same_thread"
    : "continues";
}
```

- [ ] **Step 5: Run the test**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/getAgentTurnKind`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/getAgentTurnKind
git commit -m "feat(ai-agent): classify an agent turn against its conversation's last ask"
```

---

### Unit 3.4: Retry, restart, and record in `askConversationDataAgent`

**Label:** ordinary. **High-risk** (concurrency: moves the stop-in-progress loop, aborts and replaces a conversation, adds a guarded write). Its unit reviews must walk the interleavings named under [Order and dependencies](#order-and-dependencies).

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.test.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.test.ts` (threads only)

- [ ] **Step 1: Write the failing tests**

In `dataAgentTurnHelpers.test.ts`, add these imports:

```ts
import { TRY_AGAIN_LINE } from "$/agent/pageContext/buildAgentTurnText";
import { chatMessagesKey } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
```

Append this block inside `describe("askConversationDataAgent", ...)`, after its last test:

```ts
  describe("on Try again", () => {
    const KEY = "workspace-1:0";

    it("asks the same conversation the line after a kept hosted reply", async () => {
      const conversation = _fakeConversation();
      const conversations = new Map([[KEY, conversation]]);

      await _ask(conversations, _turn("How many?"));
      await _ask(conversations, _turn("How many?"));

      expect(conversations.get(KEY)).toBe(conversation);
      expect(conversation.asked).toEqual([
        "How many?",
        `${TRY_AGAIN_LINE}\n\nHow many?`,
      ]);
      expect(conversation.dataAgent.agent.state.messages).toEqual(
        conversation.asked,
      );
    });

    it("asks again with no line after the ask was rejected", async () => {
      const conversation = _fakeConversation();
      const conversations = new Map([[KEY, conversation]]);
      vi.mocked(conversation.dataAgent.ask).mockRejectedValueOnce(
        new Error("model down"),
      );
      await expect(
        _ask(conversations, _turn("How many?")),
      ).rejects.toThrow("model down");

      await _ask(conversations, _turn("How many?"));

      expect(conversations.get(KEY)).toBe(conversation);
      expect(conversation.asked).toEqual(["How many?"]);
    });

    it("asks again with no line after a reply the chat discarded", async () => {
      const conversation = _fakeConversation();
      const conversations = new Map([[KEY, conversation]]);
      await _ask(conversations, {
        ..._turn("How many?"),
        isStale: () => {
          return true;
        },
      });

      await _ask(conversations, _turn("How many?"));

      expect(conversation.asked).toEqual(["How many?", "How many?"]);
    });

    it("sends an offline Try again no line", async () => {
      const conversation = _fakeConversation();
      const conversations = new Map([[KEY, conversation]]);
      const offlineTurn = { ..._turn("How many?"), isOffline: true };

      await _ask(conversations, offlineTurn);
      await _ask(conversations, { ...offlineTurn });

      expect(conversations.get(KEY)).toBe(conversation);
      expect(conversation.asked).toEqual(["How many?", "How many?"]);
    });

    it.each([
      ["a follow-up", ["How many?", "Here it is.", "And deaths?"]],
      [
        "a card answer",
        ["How many?", "Which state?", "[Clarification answer: Ohio]"],
      ],
      [
        "a view change",
        [
          "How many?",
          "Here it is.",
          ChatViewEvent.format({ app: "dashboards", route: "/acme/dashboards" }),
        ],
      ],
    ])("asks %s on the same conversation with no line", async (_label, thread) => {
      const conversation = _fakeConversation();
      const conversations = new Map([[KEY, conversation]]);

      await _ask(conversations, _turn("How many?"));
      await _ask(conversations, _turn(thread));

      expect(conversations.get(KEY)).toBe(conversation);
      expect(conversation.asked[1]).not.toContain(TRY_AGAIN_LINE);
    });

    it("starts a new conversation from the recap when the thread rewinds", async () => {
      const oldConversation = _fakeConversation();
      const newConversation = _fakeConversation();
      const conversations = new Map<string, DataAgentConversation>([
        [KEY, oldConversation],
      ]);
      const askThread = (thread: readonly string[]) => {
        return askConversationDataAgent({
          conversations,
          turn: _turn(thread),
          buildTurnInputs: () => {
            return { blocks: {}, nameOf: _noName, maskAssistantText: _keepText };
          },
          createConversation: async () => {
            return newConversation;
          },
        });
      };
      const second = ["How many?", "Here it is.", "And deaths?"];

      await askThread(["How many?"]);
      await askThread(second);
      await askThread([...second, "Here it is.", "And cases?"]);
      await askThread(second);

      expect(oldConversation.dataAgent.agent.abort).toHaveBeenCalledTimes(1);
      expect(conversations.get(KEY)).toBe(newConversation);
      expect(newConversation.asked).toEqual([
        "Earlier in this conversation:\nUser: How many?\nAssistant: Here it is.\n\nAnd deaths?",
      ]);
    });

    it("asks a new chat's same question with no line", async () => {
      const newChat = _fakeConversation();
      const conversations = new Map<string, DataAgentConversation>([
        [KEY, _fakeConversation()],
      ]);
      await _ask(conversations, _turn("How many?"));

      await askConversationDataAgent({
        conversations,
        turn: _turn("How many?", 1),
        createConversation: async () => {
          return newChat;
        },
      });

      expect(newChat.asked).toEqual(["How many?"]);
    });

    it("keeps the newer turn's record when a run it stopped settles", async () => {
      let finishFirstRun: (() => void) | undefined;
      const conversation = _fakeConversation(async (text) => {
        if (text === "First?") {
          await new Promise<void>((resolve) => {
            finishFirstRun = resolve;
          });
          return { text: "Stopped." };
        }
        return { text: "Second." };
      });
      vi.mocked(conversation.dataAgent.agent.abort).mockImplementation(() => {
        finishFirstRun?.();
      });
      const conversations = new Map([[KEY, conversation]]);
      const secondTurn = _turn(["First?", "Stopped.", "Second?"]);

      const firstReply = _ask(conversations, _turn("First?"));
      const secondReply = _ask(conversations, secondTurn);
      await Promise.all([firstReply, secondReply]);

      expect(conversation.lastAsk).toEqual({
        threadKey: chatMessagesKey(secondTurn.apiMessages),
        messageCount: 3,
        isKept: true,
      });
      expect(conversation.asked).toEqual(["First?", "Second?"]);
    });
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.test.ts`
Expected: FAIL. No line on a Try again, no restart on a rewind, and `lastAsk` is undefined.

- [ ] **Step 3: Make the existing multi-turn threads extend the earlier thread**

After this unit, a second turn whose thread neither repeats nor extends the first is a rewind. These tests send such threads only because their fixtures were written before the agent read the thread's shape. Change only the threads named here. Every assertion stays as it is.

In `dataAgentTurnHelpers.test.ts`:

| Test | Change |
|---|---|
| "sends the page block first, then 'unchanged' on the same page" | `_turn("And deaths?")` becomes `_turn(["How many?", "Here it is.", "And deaths?"])` |
| "sends the full block again when the page changes" | `_turn("And here?")` becomes `_turn(["How many?", "Here it is.", "And here?"])` |
| "resends a block the agent never took" | both `_turn("And here?")` become `_turn(["How many?", "Here it is.", "And here?"])` |
| "remembers a block the agent took and then failed to answer" | `_turn("And here?")` becomes `_turn(["How many?", "Here it is.", "And here?"])` |
| "sends the page in full on the turn after a failed turn on another page" | `_turn("And here?")` becomes `_turn(["How many?", "Here it is.", "And here?"])`, and `_turn("And back?")` becomes `_turn(["How many?", "Here it is.", "And here?", "Could not answer.", "And back?"])` |
| "keeps a stopped turn's late results out of the next turn" | `_turn("Second?")` becomes `_turn(["First?", "Stopped.", "Second?"])` |
| "stops a run still in progress before the next turn starts" | `_turn("Second?")` becomes `_turn(["First?", "Stopped.", "Second?"])` |

In `runDataAgentTurn.test.ts`:

| Test | Change |
|---|---|
| "names tables in the page block as the agent knows them" | `_turn("workspace-aliases", "And this one?")` becomes `_turn("workspace-aliases", ["How many?", "Done.", "And this one?"])` |
| "keeps a value's placeholder across turns and restores it" | `_turn("workspace-vault", "And now?")` becomes `_turn("workspace-vault", ["What is this?", "Done.", "And now?"])` |
| "sends no gadget blocks when loading failed, keeping last turn's tray" | the second `_turn(...)` becomes ``_turn("workspace-load-failed", ["What is pinned?", "Done.", `Totals for ${DATASET_TOKEN}`])`` |
| "says once that the tray was emptied" | `_turn("workspace-tray-emptied", "And now?")` becomes `_turn("workspace-tray-emptied", ["What is pinned?", "Done.", "And now?"])`, and `_turn("workspace-tray-emptied", "And still?")` becomes `_turn("workspace-tray-emptied", ["What is pinned?", "Done.", "And now?", "Done.", "And still?"])` |
| "says the tray was emptied when loading failed with an empty tray" | the second `_turn(...)` becomes ``_turn("workspace-load-failed-empty", ["What is pinned?", "Done.", `Totals for ${DATASET_TOKEN}`])`` |

`runOfflineDataAgentTurn.test.ts` needs no change: its repeated turns send the same thread, which offline is asked again on the same conversation with no line.

- [ ] **Step 4: Implement**

In `dataAgentTurnHelpers.ts`, add these imports:

```ts
import { chatMessagesKey } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import { getAgentTurnKind } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/getAgentTurnKind/getAgentTurnKind";
```

Add these helpers between `_reportReplyIfKept` and `askConversationDataAgent`:

```ts
/** The conversation a turn goes to, and whether the turn is a hosted Try again. */
type TurnConversation = {
  conversation: DataAgentConversation;
  isNew: boolean;
  /** A hosted Try again of the latest answer after a kept reply. */
  isRetry: boolean;
};

/**
 * Stops a conversation's agent and removes it from the map, so the next
 * lookup starts a new conversation from the thread's recap.
 */
function _dropConversation(
  options: Readonly<{
    conversations: Map<string, DataAgentConversation>;
    turn: Readonly<DataAgentTurnOptions>;
    conversation: DataAgentConversation;
  }>,
): void {
  options.conversation.dataAgent.agent.abort();
  options.conversations.delete(buildConversationKey(options.turn));
}

/**
 * The conversation a turn goes to. Any run in progress is stopped first, so
 * the turn is classified against the last ask that settled. A thread that
 * neither repeats nor extends that ask's (Try again on an earlier answer)
 * starts a new conversation, as after a reload. The same thread after a kept
 * reply is a Try again of the latest answer, which a hosted turn marks with
 * the Try again line.
 */
async function _resolveTurnConversation(
  options: Readonly<AskConversationDataAgentOptions>,
): Promise<TurnConversation> {
  const { turn } = options;
  const found = await _getConversation(options);
  while (found.conversation.activeAsk) {
    await _stopAsk(found.conversation, found.conversation.activeAsk);
  }
  const { lastAsk } = found.conversation;
  const kind = getAgentTurnKind({ lastAsk, apiMessages: turn.apiMessages });
  if (kind !== "rewound") {
    return {
      ...found,
      isRetry:
        kind === "same_thread" &&
        lastAsk?.isKept === true &&
        turn.isOffline !== true,
    };
  }
  _dropConversation({
    conversations: options.conversations,
    turn,
    conversation: found.conversation,
  });
  return { ...(await _getConversation(options)), isRetry: false };
}

/**
 * Points the conversation at the turn. Each turn gets fresh lists, so a
 * stopped run's late results and cards land in its own, and the last
 * turn's question card is cleared.
 */
function _startTurn(
  conversation: DataAgentConversation,
  turn: Readonly<DataAgentTurnOptions>,
): {
  results: AgentQueryResultData[];
  dashboardCards: AgentDashboardBlockData[];
} {
  const results: AgentQueryResultData[] = [];
  const dashboardCards: AgentDashboardBlockData[] = [];
  conversation.turnRef.current = turn;
  conversation.results = results;
  conversation.resultsByTurn.push(results);
  conversation.dashboardCards = dashboardCards;
  turn.chatPanelDispatch.setPendingClarification(undefined);
  return { results, dashboardCards };
}

/**
 * Runs the ask, then records the thread it was given and whether its reply
 * is kept: the ask resolved and the turn is not stale. A rejected ask is
 * recorded as not kept and rethrown. Only the conversation's current turn
 * writes, so a run a newer message stopped never overwrites the newer
 * turn's record.
 */
async function _recordAsk<Reply>(
  options: Readonly<{
    conversation: DataAgentConversation;
    turn: Readonly<DataAgentTurnOptions>;
    ask: () => Promise<Reply>;
  }>,
): Promise<Reply> {
  const { conversation, turn } = options;
  const record = (isKept: boolean): void => {
    if (conversation.turnRef.current === turn) {
      conversation.lastAsk = {
        threadKey: chatMessagesKey(turn.apiMessages),
        messageCount: turn.apiMessages.length,
        isKept,
      };
    }
  };
  try {
    const reply = await options.ask();
    record(!turn.isStale?.());
    return reply;
  } catch (error) {
    record(false);
    throw error;
  }
}
```

Replace `askConversationDataAgent` (keep its doc comment, adding the sentence "The same thread again is a Try again: a hosted turn after a kept reply puts the Try again line before the message, and a thread that rewinds starts a new conversation from its recap.") with:

```ts
export async function askConversationDataAgent(
  options: Readonly<AskConversationDataAgentOptions>,
): Promise<ChatModelRunResult> {
  const { turn } = options;
  const { conversation, isNew, isRetry } =
    await _resolveTurnConversation(options);
  // Checked again after every wait: another message may have started a run
  // meanwhile. From the last check to the ask, nothing awaits.
  while (conversation.activeAsk) {
    await _stopAsk(conversation, conversation.activeAsk);
  }
  const { results, dashboardCards } = _startTurn(conversation, turn);
  options.onConversationReady?.(conversation);
  const inputs = options.buildTurnInputs?.(conversation);
  const blocks = inputs?.blocks ?? {};
  const text = buildAgentTurnText({
    message: _buildPromptText(_namedMessages(turn, inputs, isNew), isNew),
    pageBlock: blocks.pageBlock,
    previousPageBlock: conversation.lastPageBlock,
    attachedBlock: blocks.attachedBlock,
    previousAttachedBlock: conversation.lastAttachedBlock,
    mentionedBlock: blocks.mentionedBlock,
    dashboardCardLines: inputs?.dashboardCardLines,
    isRetry,
  });
  const reply = await _recordAsk({
    conversation,
    turn,
    ask: () => {
      return _askAndRememberBlocks(conversation, blocks, text);
    },
  });
  _reportReplyIfKept(turn, inputs);
  return _toRunResult({
    replyText: _replyTextOf(reply, turn),
    inputs,
    results,
    dashboardCards,
  });
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn src/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn src/components/ChatPanel/useAvandarChatRuntime/__tests__`
Expected: PASS, including `useAvandarChatRuntime.retryContext.test.tsx` and `hostedReplyPrivacy.integration.test.ts` unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.test.ts src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.test.ts
git commit -m "feat(ai-agent): rerun the agent's latest answer with the Try again line, and restart on an earlier one"
```

---

### Unit 3.5: Try again through the adapter

**Label:** mechanical (1 file, full code). Not high-risk. It checks Unit 3.4 through the real adapter and passes on its first run.

**Files:**
- Test: `src/components/ChatPanel/useAvandarChatRuntime/__tests__/agentTryAgain.integration.test.ts` (new)

- [ ] **Step 1: Write the test**

```ts
/**
 * Guards Try again on the agent path: the real adapter, `runDataAgentTurn`,
 * and `askConversationDataAgent`, with the model, the network, and the page
 * read stood in. The same thread twice is a Try again of the latest answer,
 * asked on the same agent with the Try again line. Try again on an earlier
 * answer starts a new agent from the thread's recap. With the agent
 * switched off, today's chat still posts its retry context.
 */
import { Model } from "@avandar/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRY_AGAIN_LINE } from "$/agent/pageContext/buildAgentTurnText";
import { createChatModelAdapter } from "@/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { CreateChatModelAdapterOptions } from "@/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter";
import type { ChatModelAdapter, ThreadMessageLike } from "@assistant-ui/react";

const {
  apiPostMock,
  askMock,
  createAgentPageContextMock,
  createDataAgentMock,
  getAllDatasetsMock,
  isAgentEnabledMock,
} = vi.hoisted(() => {
  return {
    apiPostMock: vi.fn(),
    askMock: vi.fn(),
    createAgentPageContextMock: vi.fn(),
    createDataAgentMock: vi.fn(),
    getAllDatasetsMock: vi.fn(),
    isAgentEnabledMock: vi.fn(),
  };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: apiPostMock } };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: vi.fn() } };
});

vi.mock("@/components/privacy/privacy-helpers/PendingAcks", () => {
  return { PendingAcks: { consumeAckForText: vi.fn() } };
});

vi.mock("@/stores/OfflineChatEngineStore/OfflineChatEngineStore", () => {
  return { OfflineChatEngineStore: { complete: vi.fn() } };
});

vi.mock("@/lib/agent/dataAgent/browser/DataAgentFeature", () => {
  return { DataAgentFeature: { isEnabled: isAgentEnabledMock } };
});

vi.mock("@/lib/agent/dataAgent/createDataAgent/createDataAgent", () => {
  return { createDataAgent: createDataAgentMock };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getAllDatasetsWithColumns: getAllDatasetsMock } };
});

vi.mock("@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes", () => {
  return { loadColumnCodes: vi.fn().mockResolvedValue(new Map()) };
});

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/agentPageNameLoader",
  () => {
    return { createAgentPageNameLoader: vi.fn() };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext",
  () => {
    return { createAgentPageContext: createAgentPageContextMock };
  },
);

// Today's chat applies its reply here. Only the request it posts is under
// test, so the reply is shown as its text.
vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse",
  () => {
    return {
      applyChatModelTurnResponse: async (options: {
        response: { assistantText: string };
      }) => {
        return {
          content: [{ type: "text", text: options.response.assistantText }],
        };
      },
    };
  },
);

const DASHBOARD_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const DATASET = {
  id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  name: "cases.csv",
  columns: [{ name: "cases", dataType: "bigint" }],
};
const PAGE: AgentPageContext = {
  app: "dashboard",
  dashboard: { id: DASHBOARD_ID, name: "Outbreak", tiles: [] },
};

let workspaceCount = 0;

/** A fresh adapter on its own workspace, so no conversation carries over. */
function _createAdapter(): ChatModelAdapter {
  workspaceCount += 1;
  const workspaceId = `workspace-try-again-${workspaceCount}`;
  const ref = <T>(current: T) => {
    return { current };
  };
  return createChatModelAdapter({
    chatGenerationRef: ref(0),
    lastTurnRef: ref(undefined),
    pageContextRef: ref(Model.make("ChatPageContext", { app: "dashboards" })),
    userRef: ref(undefined),
    workspaceIdRef: ref(workspaceId),
    workspaceRef: ref({ id: workspaceId, slug: "acme" }),
    pathnameRef: ref(`/acme/dashboards/edit/${DASHBOARD_ID}`),
    dashboardEditorStateRef: ref({}),
    parseSqlRef: ref(vi.fn()),
    copyRef: ref({ agentUnavailable: "Could not answer." }),
    dataExplorerDispatch: {},
    dashboardEditorDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
    contextTrayRef: ref([]),
    sessionKindRef: ref("data"),
    activeSessionIdRef: ref(undefined),
  } as unknown as CreateChatModelAdapterOptions);
}

function _user(text: string): ThreadMessageLike {
  return { role: "user", content: [{ type: "text", text }], metadata: {} };
}

function _assistant(text: string): ThreadMessageLike {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
    metadata: { custom: {} },
  };
}

async function _run(
  adapter: ChatModelAdapter,
  messages: readonly ThreadMessageLike[],
): Promise<void> {
  await adapter.run({
    messages,
  } as unknown as Parameters<ChatModelAdapter["run"]>[0]);
}

/** The text the agent was asked on its `index`th ask. */
function _askedText(index: number): string {
  return askMock.mock.calls[index]![0] as string;
}

describe("agent Try again", () => {
  beforeEach(() => {
    isAgentEnabledMock.mockReset().mockReturnValue(true);
    askMock.mockReset();
    apiPostMock.mockReset();
    getAllDatasetsMock.mockReset().mockResolvedValue([DATASET]);
    createAgentPageContextMock.mockReset().mockResolvedValue(PAGE);
    createDataAgentMock.mockReset().mockImplementation(() => {
      return {
        agent: { abort: vi.fn(), state: { messages: [] } },
        ask: askMock,
      };
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("sends the Try again line on the same agent when the latest answer is retried", async () => {
    const adapter = _createAdapter();
    askMock.mockResolvedValue({ text: "Forty-two." });
    const thread = [_user("How many cases?")];

    await _run(adapter, thread);
    await _run(adapter, thread);

    expect(createDataAgentMock).toHaveBeenCalledTimes(1);
    expect(_askedText(0)).not.toContain(TRY_AGAIN_LINE);
    expect(
      _askedText(1).endsWith(`${TRY_AGAIN_LINE}\n\nHow many cases?`),
    ).toBe(true);
  });

  it("starts a new agent from the recap, with no line, when an earlier answer is retried", async () => {
    const adapter = _createAdapter();
    askMock
      .mockResolvedValueOnce({ text: "Forty-two." })
      .mockResolvedValueOnce({ text: "Seven." })
      .mockResolvedValueOnce({ text: "Three." })
      .mockResolvedValueOnce({ text: "Eight." });
    const first = [_user("How many cases?")];
    const second = [...first, _assistant("Forty-two."), _user("And deaths?")];
    const third = [...second, _assistant("Seven."), _user("And in 2022?")];

    await _run(adapter, first);
    await _run(adapter, second);
    await _run(adapter, third);
    await _run(adapter, second);

    expect(createDataAgentMock).toHaveBeenCalledTimes(2);
    expect(_askedText(3)).toContain(
      "Earlier in this conversation:\nUser: How many cases?\nAssistant: Forty-two.\n\nAnd deaths?",
    );
    expect(_askedText(3)).not.toContain(TRY_AGAIN_LINE);
  });

  it("still posts today's retry context with the agent switched off", async () => {
    isAgentEnabledMock.mockReturnValue(false);
    apiPostMock.mockResolvedValue(
      Model.make("ChatResponse", { assistantText: "Forty-two." }),
    );
    const adapter = _createAdapter();
    const thread = [_user("How many cases?")];

    await _run(adapter, thread);
    await _run(adapter, thread);

    expect(apiPostMock.mock.calls[1]![0].body.retryContext).toEqual({
      priorAssistantText: "Forty-two.",
    });
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/__tests__/agentTryAgain.integration.test.ts src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.retryContext.test.tsx`
Expected: PASS on the first run (Unit 3.4 built the behavior). Report that. If the switched-off case fails on something other than `retryContext`, it is a stand-in this file lacks: add the missing mock, never a change to the adapter.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/__tests__/agentTryAgain.integration.test.ts
git commit -m "test(ai-agent): guard Try again through the chat adapter"
```

- [ ] **Step 4: Task 3 full suite, then the task-level review**

Run the four full-suite commands. Expected: all PASS. Then dispatch the task-level review of Task 3 (from the commit before Unit 3.1 to after Unit 3.5).

---

## Task 4: The agent's Try again in the eval

### Unit 4.1: The Pi harness asks a Try again question

**Label:** ordinary (2 files). Not high-risk.

**Files:**
- Modify: `scripts/ai-eval/harnesses/pi/PiHarness.ts`
- Test: `scripts/ai-eval/harnesses/pi/PiHarness.test.ts`

- [ ] **Step 1: Write the failing tests**

In `PiHarness.test.ts`, add `import { TRY_AGAIN_LINE } from "$/agent/pageContext/buildAgentTurnText";`, add `DataAgentUserAnswer` to the `@/lib/agent/dataAgent/DataAgentHost` type import, and append:

```ts
/** QUESTION as a Try again question. */
const TRY_AGAIN_QUESTION = {
  ...QUESTION,
  id: "T02",
  category: "try_again",
  tryAgain: {},
} as unknown as EvalQuestion;

/**
 * A data agent that records each message and answers "First." then
 * "Second.". With `cardAnswers`, each ask shows one card first and records
 * the host's answer to it.
 */
function _createTwoAttemptAgent(
  host: DataAgentHost,
  asked: string[],
  cardAnswers?: DataAgentUserAnswer[],
): DataAgent {
  return {
    agent: { state: { messages: [] } },
    ask: async (text: string) => {
      asked.push(text);
      if (cardAnswers) {
        cardAnswers.push(
          await host.askUser({
            question: "Which Georgia?",
            options: ["The US state", "The country"],
            isMulti: false,
            kind: "choice",
          }),
        );
      }
      return {
        text: asked.length === 1 ? "First." : "Second.",
        state: { questions: [], valuesSentToModel: [] },
        usage: {
          calls: 1,
          inputTokens: 10,
          cachedInputTokens: 0,
          outputTokens: 2,
          reasoningTokens: 0,
          cost: 0.001,
        },
      };
    },
  } as unknown as DataAgent;
}

describe("createPiConversation with a Try again question", () => {
  it("asks twice on one conversation, the second time with the Try again line", async () => {
    const asked: string[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: (host) => {
        return _createTwoAttemptAgent(host, asked);
      },
    });

    await conversation.ask(TRY_AGAIN_QUESTION);

    expect(asked).toEqual([
      "How many cases?",
      `${TRY_AGAIN_LINE}\n\nHow many cases?`,
    ]);
  });

  it("sends a device conversation's Try again no line", async () => {
    const asked: string[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      privacy: "device",
      createAgent: (host) => {
        return _createTwoAttemptAgent(host, asked);
      },
    });

    await conversation.ask(TRY_AGAIN_QUESTION);

    expect(asked).toEqual(["How many cases?", "How many cases?"]);
  });

  it("leaves the first attempt's first card on screen and answers the second's", async () => {
    const asked: string[] = [];
    const cardAnswers: DataAgentUserAnswer[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: (host) => {
        return _createTwoAttemptAgent(host, asked, cardAnswers);
      },
    });

    await conversation.ask({
      ...TRY_AGAIN_QUESTION,
      tryAgain: { isFirstCardUnanswered: true },
    });

    expect(cardAnswers).toEqual([
      { kind: "deferred" },
      { kind: "picked", values: ["The US state"] },
    ]);
  });

  it("returns the second attempt, with the first kept beside it", async () => {
    const asked: string[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: (host) => {
        return _createTwoAttemptAgent(host, asked);
      },
    });

    const answer = await conversation.ask(TRY_AGAIN_QUESTION);

    expect(answer.assistantText).toBe("Second.");
    expect(answer.firstAttempt?.assistantText).toBe("First.");
    expect(answer.firstAttempt).not.toHaveProperty("result");
  });

  it("counts both attempts' model calls in the question's usage", async () => {
    const asked: string[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: (host) => {
        return _createTwoAttemptAgent(host, asked);
      },
    });

    const answer = await conversation.ask(TRY_AGAIN_QUESTION);

    expect(answer.usage.calls).toBe(2);
    expect(answer.firstAttempt?.usage.calls).toBe(1);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run scripts/ai-eval/harnesses/pi/PiHarness.test.ts`
Expected: FAIL. The question is asked once.

- [ ] **Step 3: Implement**

In `PiHarness.ts`, add `import { omit } from "@avandar/utils";`. Add this field to `QuestionRecorder`:

```ts
  /**
   * The next card stays on screen, unanswered, so the agent's turn ends
   * there, as in the browser. Set for the first attempt of a Try again
   * question that leaves its first card unanswered.
   */
  isNextCardDeferred: boolean;
```

and `isNextCardDeferred: false,` to the object `_startQuestion` returns. Add above `_createEvalHost`:

```ts
/** The simulated user's answer to a card, or a card left on screen. */
function _answerEvalCard(
  options: Readonly<{
    recorder: QuestionRecorder;
    request: Parameters<DataAgentHost["askUser"]>[0];
  }>,
): DataAgentUserAnswer {
  const { recorder, request } = options;
  if (recorder.isNextCardDeferred) {
    recorder.isNextCardDeferred = false;
    return { kind: "deferred" };
  }
  const script = recorder.question?.user;
  return _toUserAnswer(
    request.kind === "values"
      ? SimulatedUser.pickValues(
          request.options,
          script,
          recorder.question?.prompt ?? "",
        )
      : SimulatedUser.answerOptions(request.options, script),
  );
}
```

and make the host's `askUser`:

```ts
    askUser: async (request) => {
      return _answerEvalCard({ recorder, request });
    },
```

Add above `_askPiQuestion`:

```ts
/** How one attempt at a question is asked. */
type PiAttempt = {
  /** A Try again: a hosted conversation's turn text carries the line. */
  isRetry: boolean;
  /** The attempt's first card stays on screen, unanswered. */
  isFirstCardDeferred: boolean;
};

/** An ordinary question's only attempt. */
const ONLY_ATTEMPT: PiAttempt = { isRetry: false, isFirstCardDeferred: false };
```

Give `_askPiQuestion` a third parameter, `attempt: Readonly<PiAttempt> = ONLY_ATTEMPT`. Right after `Object.assign(recorder, _startQuestion(shown));` add `recorder.isNextCardDeferred = attempt.isFirstCardDeferred;`, and add this option to its `buildAgentTurnText` call:

```ts
        isRetry: attempt.isRetry && state.privacy === "hosted",
```

Add below `_askPiQuestion`:

```ts
/**
 * Asks a Try again question: the question, then the same message again on
 * the same conversation, as a Try again. A hosted conversation's second
 * turn carries the Try again line, and a device one's never does. The page
 * block is built as for any turn, so the Data Explorer shows the first
 * attempt's query. Returns the second attempt, with the first beside it.
 */
async function _askPiTryAgain(
  state: PiConversationState,
  question: EvalQuestion,
): Promise<EvalAnswer> {
  const firstAttempt = await _askPiQuestion(state, question, {
    isRetry: false,
    isFirstCardDeferred: question.tryAgain?.isFirstCardUnanswered === true,
  });
  const secondAttempt = await _askPiQuestion(state, question, {
    isRetry: true,
    isFirstCardDeferred: false,
  });
  return {
    ...secondAttempt,
    // The question cost both attempts. Its latency stays the second
    // attempt's: the wait after the user clicks Try again.
    usage: addEvalUsage(firstAttempt.usage, secondAttempt.usage),
    firstAttempt: omit(firstAttempt, ["result", "firstAttempt"]),
  };
}
```

Change the `../EvalHarness` import to `import { addEvalUsage, EMPTY_EVAL_USAGE } from "../EvalHarness";`.

In `createPiConversation`, make `ask`:

```ts
    ask: (question) => {
      return _withFitRegressionResult(question, () => {
        return question.tryAgain
          ? _askPiTryAgain(state, question)
          : _askPiQuestion(state, question);
      });
    },
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run scripts/ai-eval/harnesses/pi`
Expected: PASS, every existing case unchanged.

- [ ] **Step 5: Commit**

```bash
git add scripts/ai-eval/harnesses/pi/PiHarness.ts scripts/ai-eval/harnesses/pi/PiHarness.test.ts
git commit -m "feat(ai-eval): ask Try again questions on the agent with the Try again line"
```

- [ ] **Step 6: Task 4 full suite (code part)**

Run the four full-suite commands. Expected: all PASS.

---

### Unit 4.2: Agent runs, bars, and wordings

**Label:** eval run. Not high-risk. Live models, a few cents per run. Same preconditions as Unit 2.1, Step 1 (Deno is not needed).

**Files:**
- Modify: `docs/ai-agent/eval.md`
- Add: `docs/ai-agent/eval-runs/**`
- Modify, only on a new wording: `shared/agent/pageContext/buildAgentTurnText.ts`

- [ ] **Step 1: Three runs of the agent on v6 with the starting line**

```bash
for run in 1 2 3; do
  pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --page data-explorer --questions T --label phase-1e:agent-retry
done
```

- [ ] **Step 2: Check the bars against the baseline's three runs**

| # | Bar | Met when |
|---|---|---|
| 1 | Right | The agent's passes over T01 to T06, summed over its three runs (18 graded answers), are at least the baseline's sum. |
| 2 | No more repeats | The agent's `isRepeat` count on T01 and T04, summed over its three runs, is at most the baseline's. Record repeats on every question. |
| 3 | The follow-up builds on the retry | T06 passes on all three runs. |
| 4 | A column question stays one | T03 passes on all three runs. |
| 5 | Nothing invented | T04 passes on all three runs. |

A bar missed by exactly one graded answer is checked again: the question that missed runs three more times on the agent, and the bar is met when all three pass (for bar 2, when none of the three repeats). For bar 1, recheck the question whose agent passes fell short of the baseline's on it. T06 cannot run alone, so its recheck runs T01 with it:

```bash
for run in 1 2 3; do
  pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --page data-explorer --questions T04 --label phase-1e:agent-retry-recheck
done
# T06: --questions T01,T06
```

- [ ] **Step 3: When a bar is missed, read the misses before changing anything**

Read each miss's line in its run's `results.jsonl` and sort it:

| What the misses show | Next step |
|---|---|
| A retry that replies to the line ("Sure, trying again") with no tool call, repeats the first attempt, or ignores the line (bars 1, 2, 4, 5) | A new wording, below. When the third wording misses: Unit 4.3 (A3). |
| A follow-up built on the first attempt (bar 3), or a retry that reuses a wrong first attempt's result (bar 1) | Unit 4.4 (A2). |

A new wording changes only `TRY_AGAIN_LINE` and must keep the spec's six line rules, which Unit 3.1's tests check. Change what the misses point at, nothing else. Then:

```bash
pnpm vitest run shared/agent/pageContext/buildAgentTurnText.test.ts src/lib/agent/schemaAnswer/isSchemaAnswerTurn.test.ts scripts/ai-eval/harnesses/pi
git add shared/agent/pageContext/buildAgentTurnText.ts
git commit -m "fix(ai-agent): reword the Try again line"
for run in 1 2 3; do
  pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --page data-explorer --questions T --label phase-1e:agent-retry-w2
done
```

The third wording uses the label `phase-1e:agent-retry-w3`. At most three wordings in all: the starting one and two more.

- [ ] **Step 4: Archive and record**

Run `pnpm vite-script scripts/ai-eval/archiveEvalRuns.ts`. In `eval.md`'s Phase 1E section, add a table of the agent's runs in the baseline table's shape, one row per run, with the wording in the row label (for example `phase-1e:agent-retry #1 (starting line)`). Then add bullets for:

- each bar and whether it is met, with both sums
- every recheck and its result
- every wording tried, quoted, with its numbers
- every miss and what it showed
- the input tokens per call against the baseline and 1D's last v6 runs (the line adds about 50 uncached tokens on a retry turn)
- the fallback taken, if any

- [ ] **Step 5: Commit**

```bash
git add docs/ai-agent/eval.md docs/ai-agent/eval-runs
git commit -m "docs(ai-eval): record the agent's Try again runs against today's chat"
```

---

### Unit 4.3: Fallback A3, a tagged block under prompt v7 (only if triggered)

**Label:** ordinary. Not high-risk. Dispatch only when the third wording misses a bar on wording grounds. Before dispatch, the controller writes an addendum to this plan with the complete code below filled in (the v6 hash, the final TRY AGAIN text) and has it reviewed.

**Files:**
- Modify: `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts`, `buildDataAgentSystemPrompt.test.ts`
- Modify: `shared/agent/dataAgent/dataAgentTools.ts`, `dataAgentTools.test.ts`
- Modify: `shared/agent/pageContext/agentBlockText.ts`, `buildAgentTurnText.ts`, and their tests
- Modify: `tests/e2e/agent-chat-result.spec.ts`, `agent-chat-sessions.spec.ts`, `agent-chat-mentions.spec.ts`, `agent-dashboard-block.spec.ts` (the `data-agent-v6` route)

Steps, each red then green:

1. Freeze v6 first, as 1D froze v3: a "keeps every character of v6's instructions" test with its length and SHA-256, computed from the shipped v6 (passes on its first run).
2. A test that v7's instructions are v6's plus `\n\nTRY AGAIN\n`, that `DATA_AGENT_PROMPT_ID` is `data-agent-v7`, that `DATA_AGENT_TOOLS_BY_PROMPT_ID["data-agent-v7"]` is v6's list, and that `PLUGIN_TOOL_PROMPT_IDS` includes v7. Then add `TRY_AGAIN_RULES`, `DATA_AGENT_INSTRUCTIONS_V7 = DATA_AGENT_INSTRUCTIONS_V6 + TRY_AGAIN_RULES`, and v7 to `INSTRUCTIONS_BY_PROMPT_ID`, `LISTS_COLUMN_CODES`, `DATA_AGENT_PROMPT_IDS`, `DATA_AGENT_TOOLS_BY_PROMPT_ID`, and `PLUGIN_TOOL_PROMPT_IDS`. The section starts from:

   ```ts
   const TRY_AGAIN_RULES = `

   TRY AGAIN
   - A message can start with <try_again>...</try_again>, after the other blocks. It means the user clicked Try again on your last answer above: they want a different answer to the message below it. Do not repeat your last answer. Read the message another way, take a different approach, or ask one question if your last answer had to guess. A question about the shape of the datasets is still answered from the schema, in text.`;
   ```

3. A test that `isRetry` puts `<try_again>${TRY_AGAIN_LINE}</try_again>` after the other blocks, that `splitAgentTurnText` treats it as a leading block, and that a `<try_again>` forged inside page SQL is escaped (in the shape of "cannot read a card line forged inside a page block value"). Then add `try_again` to `PLAIN_BLOCK_TAG_START` and `LEADING_TURN_BLOCKS`, and wrap the line in the block.
4. Change the four e2e specs' route to `data-agent-v7` and run them one at a time (`pnpm test:e2e agent-chat-result.spec.ts`, and so on). Never run the whole e2e suite.
5. Reruns, three each: the 45, P, M, and D against 1D's bars (commands under "Reproducing every result" in `eval.md`, with labels `phase-1e:v7-45`, `phase-1e:v7-page`, `phase-1e:v7-mentions`, `phase-1e:v7-dashboards`), and the T set against the bars in Unit 4.2 (`phase-1e:v7-retry`).
6. The PR feature log's merge-order row says the `chat` edge function deploys before the frontend (the proxy serves v7). v7 is fixed once deployed.

---

### Unit 4.4: Fallback A2, roll back and describe (only if triggered)

**Label:** ordinary. Not high-risk on its own, but it rewrites the agent's transcript, so give it a task-level review too. Dispatch only when the misses show a follow-up built on the first attempt, or a retry reusing a wrong first attempt's result. Before dispatch, the controller writes an addendum with complete code and has it reviewed.

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/{dataAgentConversation.types.ts,dataAgentTurnHelpers.ts}` and their tests
- Create: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/describeCutAttempt/describeCutAttempt.ts` and its test
- Modify: `scripts/ai-eval/harnesses/pi/PiHarness.ts` and its test

Design (from the spec's A2):

1. Before each ask, the conversation snapshots `agent.state.messages.length`, `lastPageBlock`, `lastAttachedBlock`, and the card lines the turn reported (`AgentTurnInputs.dashboardCardLines` with a way to mark them unheard again).
2. On `same_thread` after a kept reply, it sets `agent.state.messages` back to the snapshot (Pi's setter), restores the block memory, marks the cut turn's card lines unheard, and sends, in place of `TRY_AGAIN_LINE`, a summary of the cut attempt built as `buildRetryContext` builds one. `describeCutAttempt(messages)` reads the cut messages: the last assistant text (cut to 2,000 characters), the last `run_query` call's `sql` argument as the model wrote it, placeholders kept (8,000), the last `ask_user` call's `question` (400), and the last `add_dashboard_block` call's `block.kind`. The summary is plain text, obeys the line rules (no banned words, no tag, does not start with "try again"), and starts "The user clicked Try again on an answer you gave and want a different one.".
3. Tests, each written first:
   - The transcript after the retry has the snapshot's length plus the new turn.
   - The page block reads in full again when the cut turn had changed it.
   - A cut turn's card line is sent again.
   - The summary has each part, each cut to its cap.
   - A `continues` or `rewound` turn never rolls back.
4. The Pi harness mirrors the rollback on a hosted conversation, and the T set reruns three times against Unit 4.2's bars (`phase-1e:agent-rollback`).

---

## Task 5: Question cards

### Unit 5.1: The shared `recordClarificationShown`

**Label:** ordinary (4 files). Not high-risk.

**Files:**
- Create: `src/components/ChatPanel/recordClarificationShown/recordClarificationShown.ts`
- Test: `src/components/ChatPanel/recordClarificationShown/recordClarificationShown.test.ts` (new)
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.test.ts`

- [ ] **Step 1: Write the guard test (green from the start)**

In `applyChatModelTurnResponse.test.ts`, put `import "fake-indexeddb/auto";` first, add `beforeEach` to the `vitest` import and `import { AvaDexie } from "@/db/dexie/AvaDexie";`, and replace the `applyChatTurnResponse` mock with a hoisted one:

```ts
const { applyChatTurnResponseMock } = vi.hoisted(() => {
  return { applyChatTurnResponseMock: vi.fn() };
});

vi.mock(
  "@/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse",
  () => {
    return { applyChatTurnResponse: applyChatTurnResponseMock };
  },
);

beforeEach(() => {
  applyChatTurnResponseMock.mockReset().mockReturnValue({ content: [] });
});
```

Append:

```ts
describe("applyChatModelTurnResponse question cards", () => {
  beforeEach(async () => {
    await AvaDexie.DB.ClarificationAuditEntry.clear();
    const actual = await vi.importActual<
      typeof import("@/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse")
    >("@/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse");
    applyChatTurnResponseMock.mockImplementation(actual.applyChatTurnResponse);
  });

  it("records a card once and gives the card its row's audit id", async () => {
    const setPendingClarification = vi.fn();

    await applyChatModelTurnResponse({
      response: Model.make("ChatResponse", {
        assistantText: "Which state?",
        clarification: {
          question: "Which state do you mean?",
          responseShape: {
            kind: "fixed_options",
            options: ["Georgia", "Texas"],
            multi: false,
          },
          turnNumber: 1,
        },
      }),
      apiMessages: [
        Model.make("ChatClientMessage", {
          role: "user",
          content: "show me deaths in georgia",
        }),
      ],
      currentUser: undefined,
      currentPageContext: Model.make("ChatPageContext", { app: "other" }),
      workspaceId: "workspace-1",
      isGenerationStale: () => {
        return false;
      },
      copyRef: { current: {} as ChatRuntimeCopy },
      parseSqlRef: { current: vi.fn() },
      dashboardEditorStateRef: { current: {} },
      dataExplorerDispatch: {},
      dashboardEditorDispatch: {},
      chatPanelDispatch: { setPendingClarification },
    } as unknown as Parameters<typeof applyChatModelTurnResponse>[0]);

    const rows = await AvaDexie.DB.ClarificationAuditEntry.toArray();
    expect(rows).toHaveLength(1);
    expect(setPendingClarification).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "Which state do you mean?",
        auditId: rows[0]!.id,
      }),
    );
  });
});
```

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.test.ts`
Expected: PASS before the move. This guard must stay green after it.

- [ ] **Step 2: Write the failing test**

Create `recordClarificationShown.test.ts`:

```ts
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { recordClarificationShown } from "./recordClarificationShown";
import type { ChatClarifyRequest } from "$/types/chat.types";

const CLARIFICATION: ChatClarifyRequest = {
  question: "Which state do you mean?",
  responseShape: {
    kind: "fixed_options",
    options: ["Georgia", "Texas"],
    multi: false,
  },
  turnNumber: 2,
};

describe("recordClarificationShown", () => {
  beforeEach(async () => {
    await AvaDexie.DB.ClarificationAuditEntry.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records the card's shape, question length, option count, and turn number", async () => {
    const auditId = await recordClarificationShown({
      workspaceId: "workspace-1",
      clarification: CLARIFICATION,
    });

    expect(await AvaDexie.DB.ClarificationAuditEntry.toArray()).toEqual([
      expect.objectContaining({
        id: auditId,
        workspaceId: "workspace-1",
        responseShape: "fixed_options_single",
        questionLengthChars: 24,
        optionsCount: 2,
        turnNumber: 2,
      }),
    ]);
  });

  it("warns with the hit labels on a biased question and still records it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const auditId = await recordClarificationShown({
      workspaceId: "workspace-1",
      clarification: {
        ...CLARIFICATION,
        question: "women are always more careful with money",
      },
    });

    expect(warn).toHaveBeenCalledWith(
      "[chat] LLM clarification trips bias detector; passing through:",
      ["Gender generalization"],
    );
    expect(auditId).toEqual(expect.any(String));
  });

  it("returns an id when the audit write fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(AvaDexie.DB.ClarificationAuditEntry, "add").mockRejectedValueOnce(
      new Error("write failed"),
    );

    const auditId = await recordClarificationShown({
      workspaceId: "workspace-1",
      clarification: CLARIFICATION,
    });

    expect(auditId).toEqual(expect.any(String));
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/recordClarificationShown`
Expected: FAIL, cannot resolve `./recordClarificationShown`.

- [ ] **Step 4: Write the shared function**

```ts
import { prop } from "@avandar/utils";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { detectBias } from "@/components/privacy/privacy-helpers/detectBias/detectBias";
import type { ChatClarifyRequest } from "$/types/chat.types";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";

/**
 * Bias-checks a clarification card's question, warns on a hit and lets
 * the card through, and records that the card was shown. Returns the
 * audit id the card carries. A failed write still returns an id.
 */
export async function recordClarificationShown(
  options: Readonly<{
    workspaceId: string;
    clarification: ChatClarifyRequest;
  }>,
): Promise<ClarificationAuditEntry.Id> {
  const questionBias = detectBias(options.clarification.question);
  if (questionBias.hits.length > 0) {
    console.warn(
      "[chat] LLM clarification trips bias detector; passing through:",
      questionBias.hits.map(prop("label")),
    );
  }
  return ClarificationAuditEntryClient.recordShown({
    workspaceId: options.workspaceId,
    request: options.clarification,
  });
}
```

- [ ] **Step 5: Today's chat calls it**

In `applyChatModelTurnResponse.ts`, replace the `recordClarificationShown` handler with:

```ts
      recordClarificationShown: (clarification) => {
        return recordClarificationShown({
          workspaceId: options.workspaceId,
          clarification,
        });
      },
```

Add `import { recordClarificationShown } from "@/components/ChatPanel/recordClarificationShown/recordClarificationShown";`, and remove the `prop`, `detectBias`, and `ClarificationAuditEntryClient` imports, which nothing else in the file uses.

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/components/ChatPanel/recordClarificationShown src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.test.ts src/components/ChatPanel/applyChatTurnResponse`
Expected: PASS, the guard unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/components/ChatPanel/recordClarificationShown src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.ts src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.test.ts
git commit -m "refactor(ai-agent): share recordClarificationShown between today's chat and the agent"
```

---

### Unit 5.2: `buildClarificationTurnNumber`

**Label:** mechanical (2 files, full code). Not high-risk.

**Files:**
- Modify: `src/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions.ts`
- Test: `src/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions.test.ts`

- [ ] **Step 1: Write the failing test**

Add `buildClarificationTurnNumber` to the test's import from `./generatedSqlAssumptions`, and append:

```ts
describe("buildClarificationTurnNumber", () => {
  function _threadWithAnswers(answerCount: number) {
    return [
      { role: "user", content: "show me deaths in georgia" },
      ...Array.from({ length: answerCount }, (_unused, index) => {
        return { role: "user", content: `[Clarification answer: ${index}]` };
      }),
    ];
  }

  it.each([
    [0, 1],
    [1, 2],
    [2, 3],
    [5, 3],
  ])("numbers a card after %i card answers as %i", (answerCount, turnNumber) => {
    expect(buildClarificationTurnNumber(_threadWithAnswers(answerCount))).toBe(
      turnNumber,
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/components/privacy/privacy-helpers/generatedSqlAssumptions`
Expected: FAIL, `buildClarificationTurnNumber` is not a function.

- [ ] **Step 3: Implement**

Add below `countClarificationAnswersInThread`:

```ts
/** Every turn number a clarification card can carry, in order. */
const CLARIFICATION_TURN_NUMBERS = [1, 2, 3] as const;

/**
 * The turn number of a card shown now: one more than the thread's card
 * answers, at most `MAX_CLARIFICATIONS_PER_QUESTION`, as the edge function
 * counts it.
 */
export function buildClarificationTurnNumber(
  messages: readonly ThreadMessage[],
): 1 | 2 | 3 {
  const answerCount = countClarificationAnswersInThread(messages);
  return (
    CLARIFICATION_TURN_NUMBERS[
      Math.min(answerCount, MAX_CLARIFICATIONS_PER_QUESTION - 1)
    ] ?? MAX_CLARIFICATIONS_PER_QUESTION
  );
}
```

`MAX_CLARIFICATIONS_PER_QUESTION` is declared `= 3`, so its type is the literal `3` and no cast is needed.

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run src/components/privacy/privacy-helpers/generatedSqlAssumptions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/privacy/privacy-helpers/generatedSqlAssumptions
git commit -m "feat(ai-agent): count a card's turn number from the thread"
```

---

### Unit 5.3: The hosts record every card

**Label:** ordinary (5 files). Not high-risk. The host type and its one caller change together, so they land in one unit.

**Files:**
- Modify: `src/lib/agent/dataAgent/browser/createBrowserDataAgentHost.ts`
- Test: `src/lib/agent/dataAgent/browser/createBrowserDataAgentHost.test.ts` (new)
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.test.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn/runOfflineDataAgentTurn.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `createBrowserDataAgentHost.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createBrowserDataAgentHost } from "./createBrowserDataAgentHost";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { BrowserDataAgentHostOptions } from "./createBrowserDataAgentHost";

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: vi.fn() } };
});

vi.mock(
  "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary",
  () => {
    return { decideIfDataCanCrossBoundary: vi.fn() };
  },
);

function _host(
  showQuestionCard: BrowserDataAgentHostOptions["showQuestionCard"],
) {
  return createBrowserDataAgentHost({
    workspaceId: "workspace-1" as Workspace.Id,
    userId: "user-1",
    showQuery: vi.fn(),
    showQuestionCard,
  });
}

describe("createBrowserDataAgentHost askUser", () => {
  it("ends the agent's turn only after the card is recorded and shown", async () => {
    let finishCard: (() => void) | undefined;
    let isSettled = false;
    const showQuestionCard = vi.fn(() => {
      return new Promise<void>((resolve) => {
        finishCard = resolve;
      });
    });

    const answer = _host(showQuestionCard)
      .askUser({ question: "Which?", options: ["A", "B"], isMulti: false, kind: "choice" })
      .then((result) => {
        isSettled = true;
        return result;
      });
    await vi.waitFor(() => {
      expect(showQuestionCard).toHaveBeenCalled();
    });

    expect(isSettled).toBe(false);
    finishCard!();
    await expect(answer).resolves.toEqual({ kind: "deferred" });
  });

  it("shows an ask_user card with its options and no turn number", async () => {
    const showQuestionCard = vi.fn().mockResolvedValue(undefined);

    await _host(showQuestionCard).askUser({
      question: "Which?",
      options: ["A", "B"],
      optionLabels: ["Alpha", "Beta"],
      isMulti: true,
      kind: "choice",
    });

    expect(showQuestionCard).toHaveBeenCalledWith({
      question: "Which?",
      responseShape: {
        kind: "fixed_options",
        options: ["A", "B"],
        optionLabels: ["Alpha", "Beta"],
        multi: true,
      },
    });
  });

  it("shows a value card as a discovery card with no turn number", async () => {
    const showQuestionCard = vi.fn().mockResolvedValue(undefined);

    await _host(showQuestionCard).askUser({
      question: "Which county?",
      options: ["Kings"],
      isMulti: false,
      kind: "values",
      lookup: {
        listQuery: "SELECT DISTINCT x FROM t",
        column: "x",
        candidateValues: ["Kings"],
      },
    });

    expect(showQuestionCard).toHaveBeenCalledWith({
      question: "Which county?",
      responseShape: {
        kind: "discovery",
        query: "SELECT DISTINCT x FROM t",
        column: "x",
        multi: false,
        candidateValues: ["Kings"],
      },
    });
  });
});
```

In `createConversationAgentHost.test.ts`, add `recordClarificationShownMock: vi.fn().mockResolvedValue("audit-1"),` to the hoisted mocks (and to the destructured names), and this mock:

```ts
vi.mock(
  "@/components/ChatPanel/recordClarificationShown/recordClarificationShown",
  () => {
    return { recordClarificationShown: recordClarificationShownMock };
  },
);
```

Append:

```ts
describe("createConversationAgentHost question cards", () => {
  const CHOICE = {
    question: "Which?",
    options: ["A", "B"],
    isMulti: false,
    kind: "choice",
  } as const;

  it("sets an ask_user card with the audit id its row got", async () => {
    const turn = _turn("dashboard");

    await createConversationAgentHost(_state(turn)).askUser(CHOICE);

    expect(turn.chatPanelDispatch.setPendingClarification).toHaveBeenCalledWith(
      expect.objectContaining({ question: "Which?", auditId: "audit-1" }),
    );
  });

  it("records a value card and sets it with the audit id its row got", async () => {
    const turn = _turn("dashboard");

    await createConversationAgentHost(_state(turn)).askUser({
      question: "Which county?",
      options: ["Kings"],
      isMulti: false,
      kind: "values",
      lookup: {
        listQuery: "SELECT DISTINCT x FROM t",
        column: "x",
        candidateValues: ["Kings"],
      },
    });

    expect(recordClarificationShownMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      clarification: expect.objectContaining({
        responseShape: expect.objectContaining({ kind: "discovery" }),
      }),
    });
    expect(turn.chatPanelDispatch.setPendingClarification).toHaveBeenCalledWith(
      expect.objectContaining({ auditId: "audit-1" }),
    );
  });

  it("numbers a card after two card answers as the third", async () => {
    const turn = _turn("dashboard", {
      apiMessages: [
        { role: "user", content: "show me deaths in georgia" },
        { role: "assistant", content: "Which Georgia?" },
        { role: "user", content: "[Clarification answer: The US state]" },
        { role: "assistant", content: "Which year?" },
        { role: "user", content: "[Clarification answer: 2022]" },
      ],
    } as unknown as Partial<DataAgentTurnOptions>);

    await createConversationAgentHost(_state(turn)).askUser(CHOICE);

    expect(recordClarificationShownMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clarification: expect.objectContaining({ turnNumber: 3 }),
      }),
    );
  });

  it("sets no card when the turn went stale while its row was written", async () => {
    let isStale = false;
    const turn = _turn("dashboard", {
      isStale: () => {
        return isStale;
      },
    });
    recordClarificationShownMock.mockImplementationOnce(async () => {
      isStale = true;
      return "audit-1";
    });

    await createConversationAgentHost(_state(turn)).askUser(CHOICE);

    expect(
      turn.chatPanelDispatch.setPendingClarification,
    ).not.toHaveBeenCalled();
  });

  it("sets no card when a newer turn took the conversation while its row was written", async () => {
    const turn = _turn("dashboard");
    const state = _state(turn);
    const newerTurn = _turn("dashboard");
    recordClarificationShownMock.mockImplementationOnce(async () => {
      state.turnRef.current = newerTurn;
      return "audit-1";
    });

    await createConversationAgentHost(state).askUser(CHOICE);

    expect(
      turn.chatPanelDispatch.setPendingClarification,
    ).not.toHaveBeenCalled();
    expect(
      newerTurn.chatPanelDispatch.setPendingClarification,
    ).not.toHaveBeenCalled();
  });

  it("bias-checks the question the user reads, with real values restored", async () => {
    await createConversationAgentHost(
      _stateWithKings(_turn("dashboard")),
    ).askUser({
      question: "Did you mean <value 1>?",
      options: ["<value 1>", "Queens"],
      isMulti: false,
      kind: "choice",
    });

    expect(recordClarificationShownMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clarification: expect.objectContaining({
          question: "Did you mean Kings?",
        }),
      }),
    );
  });
});
```

In `runOfflineDataAgentTurn.test.ts`, put `import "fake-indexeddb/auto";` first, add `import { AvaDexie } from "@/db/dexie/AvaDexie";`, and append inside `describe("runOfflineDataAgentTurn", ...)`:

```ts
  it("records an offline card and gives it its row's audit id", async () => {
    await AvaDexie.DB.ClarificationAuditEntry.clear();
    const turn = _createTurnOptions({ chatGeneration: 11 });
    await runOfflineDataAgentTurn(turn);

    await _lastAgentOptions().host.askUser({
      question: "Which state?",
      options: ["Georgia", "Texas"],
      isMulti: false,
      kind: "choice",
    });

    const rows = await AvaDexie.DB.ClarificationAuditEntry.toArray();
    expect(rows).toHaveLength(1);
    expect(turn.chatPanelDispatch.setPendingClarification).toHaveBeenLastCalledWith(
      expect.objectContaining({ question: "Which state?", auditId: rows[0]!.id }),
    );
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/lib/agent/dataAgent/browser src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.test.ts src/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn`
Expected: FAIL. Cards carry `turnNumber: 1`, no row is written, and `askUser` resolves before the card is shown.

- [ ] **Step 3: An awaited card with no turn number in the browser host**

In `createBrowserDataAgentHost.ts`, change the option to:

```ts
  /**
   * Records and shows a question card in the chat panel. The turn number
   * is the caller's, which reads the thread.
   */
  showQuestionCard: (
    card: Omit<ChatClarifyRequest, "turnNumber">,
  ) => Promise<void>;
```

and `askUser` to:

```ts
    askUser: async (request) => {
      await options.showQuestionCard({
        question: request.question,
        responseShape: _buildResponseShape(request),
      });
      return { kind: "deferred" };
    },
```

- [ ] **Step 4: The conversation host records the card and sets it with its audit id**

In `createConversationAgentHost.ts`, add:

```ts
import { recordClarificationShown } from "@/components/ChatPanel/recordClarificationShown/recordClarificationShown";
import { buildClarificationTurnNumber } from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import type { ChatClarifyRequest } from "$/types/chat.types";
```

Add above `createConversationAgentHost`:

```ts
/**
 * Bias-checks and records a question card the agent shows, then sets it in
 * the current turn's chat panel with its audit id. The turn number counts
 * the turn's card answers. A card whose turn went stale, or stopped being
 * the conversation's current turn, while its row was written is not set.
 * The row stays.
 */
async function _showQuestionCard(
  state: AgentConversationState,
  card: Omit<ChatClarifyRequest, "turnNumber">,
): Promise<void> {
  const turn = state.turnRef.current;
  const clarification: ChatClarifyRequest = {
    ...card,
    turnNumber: buildClarificationTurnNumber(turn.apiMessages),
  };
  const auditId = await recordClarificationShown({
    workspaceId: turn.workspaceId,
    clarification,
  });
  if (turn.isStale?.() || state.turnRef.current !== turn) {
    return;
  }
  turn.chatPanelDispatch.setPendingClarification({ ...clarification, auditId });
}
```

and replace the host's `showQuestionCard` with:

```ts
    showQuestionCard: (card) => {
      return _showQuestionCard(state, card);
    },
```

The hosted conversation's host is wrapped by `createPlaceholderRestoringHost`, whose `askUser` restores the question first, so the bias check reads what the user reads. `useClarificationSubmission.ts`, `resolveClarificationAnswer.ts`, and `useDiscoveryRecovery.ts` record outcomes by `auditId` with no change.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/lib/agent/dataAgent src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers src/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn src/components/ChatPanel/PendingClarificationBlock`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/agent/dataAgent/browser src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.ts src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.test.ts src/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn/runOfflineDataAgentTurn.test.ts
git commit -m "feat(ai-agent): bias-check and audit-log every card the agent shows"
```

- [ ] **Step 7: Task 5 full suite**

Run the four full-suite commands. Expected: all PASS.

---

## Task 6: Analytics

### Unit 6.1: The payload builders

**Label:** ordinary (3 files, full code). Not high-risk.

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.test.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.ts`

- [ ] **Step 1: Write the failing tests**

In `ChatAnalyticsPayloads.test.ts`, change the two existing `fromDashboardBlock` calls from `pageContext: ChatPageContext.createDashboardsViewContext({ dashboardId: "dashboard-1" })` to `dashboardId: "dashboard-1"`, keeping their `editorState` and expectations (today's call, today's payload). Append inside `describe("ChatAnalyticsPayloads", ...)`:

```ts
  it.each([
    ["data-explorer", "data_explorer"],
    ["dashboards", "dashboards"],
    ["data-sources", "data_sources"],
    ["case-manager", undefined],
    ["other", undefined],
  ] as const)("maps the %s page to the %s app", (app, analyticsApp) => {
    expect(
      ChatAnalyticsPayloads.toAnalyticsApp(
        Model.make("ChatPageContext", { app }),
      ),
    ).toBe(analyticsApp);
  });

  it("leaves out the block count with no editor state", () => {
    expect(
      ChatAnalyticsPayloads.fromDashboardBlock({
        block: { kind: "HeadingBlock", text: "Sales" },
        dashboardId: "dashboard-1",
      }),
    ).toEqual({ blockKind: "HeadingBlock", dashboardId: "dashboard-1" });
  });

  it("leaves out the block count when the editor shows another dashboard", () => {
    expect(
      ChatAnalyticsPayloads.fromDashboardBlock({
        block: { kind: "HeadingBlock", text: "Sales" },
        dashboardId: "dashboard-2",
        editorState: EDITOR_STATE_WITH_TWO_BLOCKS,
      }),
    ).toEqual({ blockKind: "HeadingBlock", dashboardId: "dashboard-2" });
  });
```

Add `import { Model } from "@avandar/models";`, and remove the `ChatPageContext` import if nothing else in the file uses it.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads`
Expected: FAIL. `toAnalyticsApp` is not a function, and `dashboardId` is read from a missing `pageContext`.

- [ ] **Step 3: Implement**

Replace `_fromDashboardBlock` and add `_toAnalyticsApp` in `ChatAnalyticsPayloads.ts`:

```ts
/** The analytics app for each chat page app that has one. */
const ANALYTICS_APP_BY_PAGE_APP: Partial<
  Record<ChatPageContext.ChatApp, AnalyticsApp>
> = {
  "data-explorer": "data_explorer",
  dashboards: "dashboards",
  "data-sources": "data_sources",
};

/** The page's app as chat analytics record it, or none. */
function _toAnalyticsApp(
  pageContext: Readonly<Pick<ChatPageContext.T, "app">>,
): AnalyticsApp | undefined {
  return ANALYTICS_APP_BY_PAGE_APP[pageContext.app];
}

/**
 * A block that reached a dashboard. `blockCountAfter` is set when the
 * editor state is given and the editor shows that dashboard.
 */
function _fromDashboardBlock(
  options: Readonly<{
    block: ChatGeneratedDashboardBlock;
    dashboardId: string | undefined;
    editorState?: Pick<
      DashboardEditorAppState,
      "activeDashboardId" | "editorData"
    >;
  }>,
): AnalyticsEventPayloads["dashboard.block_added_via_chat"] {
  const { dashboardId, editorState } = options;
  const editorData =
    editorState && dashboardId === editorState.activeDashboardId
      ? editorState.editorData
      : undefined;
  const blockCountAfter = editorData
    ? editorData.content.length + 1
    : undefined;

  return excludeUndefinedShallow({
    blockKind: options.block.kind,
    vizType:
      options.block.kind === "DataViz" ? options.block.vizType : undefined,
    dashboardId: dashboardId || undefined,
    blockCountAfter,
  });
}
```

Add `toAnalyticsApp: _toAnalyticsApp,` to `ChatAnalyticsPayloads`, and `import type { AnalyticsApp } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";` to the type imports.

In `applyChatModelTurnResponse.ts`, change the payload call to:

```ts
        const payload = ChatAnalyticsPayloads.fromDashboardBlock({
          block,
          dashboardId: options.currentPageContext.dashboardId,
          editorState: options.dashboardEditorStateRef.current,
        });
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.ts
git commit -m "refactor(ai-agent): map chat analytics apps in one place and name a block's dashboard directly"
```

---

### Unit 6.2: The adapter gives the agent its app and the editor

**Label:** ordinary (3 files). Not high-risk.

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside `describe("createChatModelAdapter with the agent on", ...)`:

```ts
  it.each([
    ["data-explorer", "data_explorer"],
    ["dashboards", "dashboards"],
    ["data-sources", "data_sources"],
    ["other", undefined],
  ] as const)(
    "logs a message on %s with app %s and gives the agent the same app",
    async (app, analyticsApp) => {
      vi.mocked(AnalyticsClient.logEvent).mockClear();

      await _ask(_createAdapter(app));

      const event = vi.mocked(AnalyticsClient.logEvent).mock.calls[0]![0];
      expect(event).toMatchObject({ event: "chat.message_sent" });
      expect(event.app).toBe(analyticsApp);
      expect(runDataAgentTurnMock.mock.calls[0]![0].analyticsApp).toBe(
        analyticsApp,
      );
    },
  );

  it("lets the agent read the editor's state as it is when a block is added", async () => {
    const dashboardEditorStateRef = { current: { activeDashboardId: "d-open" } };
    await _ask(
      _createAdapter("dashboards", {
        dashboardEditorStateRef,
      } as unknown as Partial<CreateChatModelAdapterOptions>),
    );
    const laterState = {
      activeDashboardId: "d-open",
      editorData: { content: [] },
    };
    dashboardEditorStateRef.current = laterState;

    expect(
      runDataAgentTurnMock.mock.calls[0]![0].dashboardEditor.getState(),
    ).toBe(laterState);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.test.ts`
Expected: FAIL. `analyticsApp` and `getState` are missing.

- [ ] **Step 3: Extend the turn options**

In `dataAgentConversation.types.ts`, add `import type { AnalyticsApp } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";` and `DashboardEditorAppState` to the `DashboardEditorStateManager` type import. Add to `DataAgentTurnOptions` after `pageContext`:

```ts
  /**
   * The page's app as `chat.message_sent` records it. A shown query's
   * `chat.sql_generated` names it, unless the query went to the Data
   * Explorer.
   */
  analyticsApp?: AnalyticsApp;
```

and to `dashboardEditor`, after `dispatch`:

```ts
    /** Reads the editor's state now, for a block's analytics payload. */
    getState: () => DashboardEditorAppState;
```

- [ ] **Step 4: Set them in the adapter**

In `createChatModelAdapter.ts`, right before the `chat.message_sent` block, add:

```ts
      // Both chat events name the page the same way.
      const analyticsApp = ChatAnalyticsPayloads.toAnalyticsApp(
        currentPageContext,
      );
```

replace the nested `app:` ternary with `app: analyticsApp,`, add `analyticsApp,` to `dataAgentTurn`, and make its `dashboardEditor`:

```ts
        dashboardEditor: {
          activeDashboardId: currentDashboardEditorState.activeDashboardId,
          dispatch: dashboardEditorDispatch,
          getState: () => {
            return dashboardEditorStateRef.current;
          },
        },
```

The offline turn spreads `dataAgentTurn`, so it carries both.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter`
Expected: PASS, every existing `chat.message_sent` assertion unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter
git commit -m "feat(ai-agent): give the agent's turn its analytics app and the editor's state"
```

---

### Unit 6.3: One `chat.sql_generated` per answer

**Label:** ordinary (5 files). Not high-risk.

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.test.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `createConversationAgentHost.test.ts`:

```ts
describe("createConversationAgentHost shown queries", () => {
  const KINGS_SQL = `SELECT 1 FROM t WHERE "patient_name" = '<value 1>'`;
  const RESTORED_SQL = `SELECT 1 FROM t WHERE "patient_name" = 'Kings'`;

  it("notes the restored SQL as sent to the Data Explorer on that page", async () => {
    const state = _stateWithKings(_turn("data-explorer"));

    await createConversationAgentHost(state).showQuery({
      sql: KINGS_SQL,
      summary: "s",
    });

    expect(state.lastShownQuery).toEqual({
      sql: RESTORED_SQL,
      app: "data_explorer",
    });
  });

  it("notes the turn's app for a query shown in the chat", async () => {
    const state = _state(
      _turn("dashboard", {
        analyticsApp: "dashboards",
      } as Partial<DataAgentTurnOptions>),
    );

    await createConversationAgentHost(state).showQuery(REQUEST);

    expect(state.lastShownQuery).toEqual({
      sql: REQUEST.sql,
      app: "dashboards",
    });
  });

  it("notes the Data Explorer for an offline turn with no page", async () => {
    const state = _state(_turn(undefined, { isOffline: true }));

    await createConversationAgentHost(state).showQuery(REQUEST);

    expect(state.lastShownQuery?.app).toBe("data_explorer");
  });
});
```

In `dataAgentTurnHelpers.test.ts`, add `import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";` and this mock:

```ts
vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: vi.fn() } };
});
```

Append inside `describe("askConversationDataAgent", ...)`:

```ts
  describe("the chat.sql_generated event", () => {
    /** A conversation whose ask shows each query in turn, as the host would. */
    function _showing(
      sqls: readonly string[],
      app: "data_explorer" | "dashboards" = "data_explorer",
    ): FakeConversation {
      const conversation = _fakeConversation(async () => {
        sqls.forEach((sql) => {
          conversation.lastShownQuery = { sql, app };
        });
        return { text: "Here it is." };
      });
      return conversation;
    }

    beforeEach(() => {
      vi.mocked(AnalyticsClient.logEvent).mockClear();
    });

    it("logs one event with the shown query's length", async () => {
      await _ask(new Map([["workspace-1:0", _showing(["SELECT 1"])]]), _turn("How many?"));

      expect(AnalyticsClient.logEvent).toHaveBeenCalledTimes(1);
      expect(AnalyticsClient.logEvent).toHaveBeenCalledWith({
        event: "chat.sql_generated",
        workspaceId: "workspace-1",
        app: "data_explorer",
        payload: { sqlChars: 8 },
      });
    });

    it("logs one event for three queries, with the last one's length", async () => {
      await _ask(
        new Map([["workspace-1:0", _showing(["SELECT 1", "SELECT 22", "SELECT 333"])]]),
        _turn("How many?"),
      );

      expect(AnalyticsClient.logEvent).toHaveBeenCalledTimes(1);
      expect(AnalyticsClient.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { sqlChars: 10 } }),
      );
    });

    it("names the app the host noted", async () => {
      await _ask(
        new Map([["workspace-1:0", _showing(["SELECT 1"], "dashboards")]]),
        _turn("How many?"),
      );

      expect(AnalyticsClient.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ app: "dashboards" }),
      );
    });

    it("logs nothing for an answer that showed no query", async () => {
      await _ask(new Map([["workspace-1:0", _showing([])]]), _turn("How many?"));

      expect(AnalyticsClient.logEvent).not.toHaveBeenCalled();
    });

    it("logs nothing when the ask rejects after showing a query", async () => {
      const conversation = _fakeConversation(async () => {
        conversation.lastShownQuery = { sql: "SELECT 1", app: "data_explorer" };
        throw new Error("model down");
      });

      await expect(
        _ask(new Map([["workspace-1:0", conversation]]), _turn("How many?")),
      ).rejects.toThrow("model down");

      expect(AnalyticsClient.logEvent).not.toHaveBeenCalled();
    });

    it("logs nothing for a turn that went stale", async () => {
      await _ask(new Map([["workspace-1:0", _showing(["SELECT 1"])]]), {
        ..._turn("How many?"),
        isStale: () => {
          return true;
        },
      });

      expect(AnalyticsClient.logEvent).not.toHaveBeenCalled();
    });

    it("does not log an earlier turn's query again", async () => {
      const conversation = _showing(["SELECT 1"]);
      const conversations = new Map([["workspace-1:0", conversation]]);
      await _ask(conversations, _turn("How many?"));
      vi.mocked(conversation.dataAgent.ask).mockResolvedValueOnce({
        text: "Hello.",
      } as never);

      await _ask(conversations, _turn(["How many?", "Here it is.", "Thanks!"]));

      expect(AnalyticsClient.logEvent).toHaveBeenCalledTimes(1);
    });
  });
```

Add `beforeEach` to the file's `vitest` import if it is not there.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers`
Expected: FAIL. `lastShownQuery` is never set and nothing is logged.

- [ ] **Step 3: The state field**

In `dataAgentConversation.types.ts`, add to `AgentConversationState` after `dashboardCards`:

```ts
  /**
   * The last query this turn showed, and where it went, for the turn's one
   * `chat.sql_generated`. Reset every turn.
   */
  lastShownQuery?: { sql: string; app: AnalyticsApp | undefined };
```

- [ ] **Step 4: The host notes the query before it shows it**

In `createConversationAgentHost.ts`, add above `createConversationAgentHost`:

```ts
/**
 * Shows the agent's query where the turn's page sends it, first noting it as
 * the turn's last shown query: `data_explorer` when it goes to the Data
 * Explorer, the turn's app otherwise. The SQL is already restored.
 */
function _showQuery(
  state: AgentConversationState,
  request: Parameters<DataAgentHost["showQuery"]>[0],
): ReturnType<DataAgentHost["showQuery"]> {
  const turn = state.turnRef.current;
  const isOnExplorer = _isOnDataExplorer(turn);
  state.lastShownQuery = {
    sql: request.sql,
    app: isOnExplorer ? "data_explorer" : turn.analyticsApp,
  };
  if (isOnExplorer) {
    return createExplorerShowQuery(turn)(request);
  }
  return showQueryInChat({
    workspaceId: turn.workspaceId,
    title: getTurnQuestionLabel(turn),
    results: state.results,
    request,
  });
}
```

and replace the host's `showQuery` with:

```ts
    showQuery: (request) => {
      return _showQuery(state, request);
    },
```

- [ ] **Step 5: Reset per turn and log once after the ask**

In `dataAgentTurnHelpers.ts`, add:

```ts
import { ChatAnalyticsPayloads } from "@/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
```

In `_startTurn`, add `conversation.lastShownQuery = undefined;` after `conversation.dashboardCards = dashboardCards;`, and add "and no query an earlier turn showed is logged again" to its doc comment. Add below `_recordAsk`:

```ts
/**
 * Logs one `chat.sql_generated` for a kept answer that showed a query, with
 * the last query it showed. An answer whose turn went stale logs nothing.
 */
function _logShownQuery(
  conversation: DataAgentConversation,
  turn: Readonly<DataAgentTurnOptions>,
): void {
  const shownQuery = conversation.lastShownQuery;
  if (shownQuery === undefined || turn.isStale?.()) {
    return;
  }
  void AnalyticsClient.logEvent({
    event: "chat.sql_generated",
    workspaceId: turn.workspaceId,
    app: shownQuery.app,
    payload: ChatAnalyticsPayloads.fromSql(shownQuery.sql),
  });
}
```

In `askConversationDataAgent`, add `_logShownQuery(conversation, turn);` right after `_reportReplyIfKept(turn, inputs);`. A rejected ask rethrows from `_recordAsk`, so it never logs.

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn src/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn src/components/ChatPanel/useAvandarChatRuntime/__tests__`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers
git commit -m "feat(ai-agent): log one chat.sql_generated per agent answer that showed a query"
```

---

### Unit 6.4: The tool's editor path logs its block

**Label:** mechanical (2 files, full code). Not high-risk.

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks/addAgentDashboardBlock.ts`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks/addAgentDashboardBlock.test.ts`

- [ ] **Step 1: Write the failing tests**

In `addAgentDashboardBlock.test.ts`, change the `vitest` import to `import { beforeEach, describe, expect, it, vi } from "vitest";`, add `import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";`, and add:

```ts
vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: vi.fn() } };
});

/** The open editor, showing two blocks of the open dashboard. */
const EDITOR_STATE = {
  activeDashboardId: "d-open",
  editorData: {
    content: [
      { type: "Card", props: { id: "block-1", content: [], title: "First" } },
      { type: "Card", props: { id: "block-2", content: [], title: "Second" } },
    ],
  },
};
```

In `_turn`, add `getState: () => { return EDITOR_STATE; },` to `dashboardEditor`. Append inside `describe("addAgentDashboardBlock", ...)`:

```ts
  describe("analytics", () => {
    beforeEach(() => {
      vi.mocked(AnalyticsClient.logEvent).mockClear();
    });

    it("logs a block queued into the open editor with the editor's count", async () => {
      canEditMock.mockResolvedValue(true);

      await addAgentDashboardBlock({
        turn: _turn({}),
        cards: [],
        request: { dashboard: "current", block: HEADING },
      });

      expect(AnalyticsClient.logEvent).toHaveBeenCalledTimes(1);
      expect(AnalyticsClient.logEvent).toHaveBeenCalledWith({
        event: "dashboard.block_added_via_chat",
        workspaceId: "ws-1",
        app: "dashboards",
        payload: {
          blockKind: "HeadingBlock",
          dashboardId: "d-open",
          blockCountAfter: 3,
        },
      });
    });

    it("logs nothing when the block goes on a card", async () => {
      canEditMock.mockResolvedValue(true);
      loadCandidatesMock.mockResolvedValue([
        { id: "d-mortality", name: "Mortality" },
      ]);

      await addAgentDashboardBlock({
        turn: _turn({}),
        cards: [],
        request: { dashboard: "Mortality", block: HEADING },
      });

      expect(AnalyticsClient.logEvent).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks`
Expected: FAIL on the editor path (no event).

- [ ] **Step 3: Implement**

In `addAgentDashboardBlock.ts`, add:

```ts
import { ChatAnalyticsPayloads } from "@/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
```

Add above `addAgentDashboardBlock`:

```ts
/**
 * Queues the block unsaved into the open editor and logs that it reached
 * the dashboard. The payload is built first, so its count reads the
 * editor's content before the block lands.
 */
function _queueIntoEditor(
  options: Readonly<{
    turn: DataAgentTurnOptions;
    editor: NonNullable<DataAgentTurnOptions["dashboardEditor"]>;
    block: ChatGeneratedDashboardBlock;
    dashboardId: string;
  }>,
): void {
  const { editor, block, dashboardId } = options;
  const payload = ChatAnalyticsPayloads.fromDashboardBlock({
    block,
    dashboardId,
    editorState: editor.getState(),
  });
  editor.dispatch.queuePendingBlock({
    pendingId: crypto.randomUUID(),
    block: buildPendingDashboardBlock(block),
    dashboardId,
  });
  void AnalyticsClient.logEvent({
    event: "dashboard.block_added_via_chat",
    workspaceId: options.turn.workspaceId,
    app: "dashboards",
    payload,
  });
}
```

and replace the editor branch with:

```ts
  if (target.kind === "editor" && turn.dashboardEditor) {
    _queueIntoEditor({
      turn,
      editor: turn.dashboardEditor,
      block: request.block,
      dashboardId: target.dashboardId,
    });
    return { kind: "added_to_editor" };
  }
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks
git commit -m "feat(ai-agent): log a block the agent queues into the open editor"
```

---

### Unit 6.5: Confirm logs its block

**Label:** ordinary (3 files, full code). Not high-risk.

**Files:**
- Modify: `src/components/ChatPanel/ChatThread/AgentDashboardBlockPart/confirmAgentDashboardCard.ts`
- Test: `src/components/ChatPanel/ChatThread/AgentDashboardBlockPart/confirmAgentDashboardCard.test.ts`
- Modify: `src/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlockPart.tsx`

- [ ] **Step 1: Write the failing tests**

In `confirmAgentDashboardCard.test.ts`, add `import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";` and:

```ts
vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: vi.fn() } };
});

/** Editor content with two blocks. */
const EDITOR_DATA = {
  content: [
    { type: "Card", props: { id: "block-1", content: [], title: "First" } },
    { type: "Card", props: { id: "block-2", content: [], title: "Second" } },
  ],
} as unknown as DashboardEditorAppState["editorData"];
```

with `import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";`. Change `_closedEditor` to return `editorData: undefined` too (add `editorData: undefined;` to its return type), and the editor test's `editor` to `{ activeDashboardId: "d-1", editorData: EDITOR_DATA, dispatch: { queuePendingBlock } }`. Append inside `describe("confirmAgentDashboardCard", ...)`:

```ts
  it("logs a block confirmed into the editor with the editor's count", async () => {
    await confirmAgentDashboardCard({
      card: CARD,
      dashboard: CARD.candidates[0]!,
      identity: IDENTITY,
      editor: {
        activeDashboardId: "d-1",
        editorData: EDITOR_DATA,
        dispatch: { queuePendingBlock: vi.fn() },
      },
    });

    expect(AnalyticsClient.logEvent).toHaveBeenCalledTimes(1);
    expect(AnalyticsClient.logEvent).toHaveBeenCalledWith({
      event: "dashboard.block_added_via_chat",
      workspaceId: "ws-1",
      app: "dashboards",
      payload: { blockKind: "HeadingBlock", dashboardId: "d-1", blockCountAfter: 3 },
    });
  });

  it("logs a saved block with no count", async () => {
    appendMock.mockResolvedValue({ kind: "saved" });

    await confirmAgentDashboardCard({
      card: CARD,
      dashboard: CARD.candidates[0]!,
      identity: IDENTITY,
      editor: _closedEditor(),
    });

    expect(AnalyticsClient.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { blockKind: "HeadingBlock", dashboardId: "d-1" },
      }),
    );
  });

  it("logs nothing for a failed save, and once for the Retry that succeeds", async () => {
    appendMock.mockResolvedValueOnce({ kind: "failed" });
    const confirm = () => {
      return confirmAgentDashboardCard({
        card: CARD,
        dashboard: CARD.candidates[0]!,
        identity: IDENTITY,
        editor: _closedEditor(),
      });
    };

    await confirm();
    expect(AnalyticsClient.logEvent).not.toHaveBeenCalled();
    appendMock.mockResolvedValueOnce({ kind: "saved" });
    await confirm();

    expect(AnalyticsClient.logEvent).toHaveBeenCalledTimes(1);
  });
```

The file's `afterEach` already calls `vi.resetAllMocks()`, which clears `logEvent` between tests.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/components/ChatPanel/ChatThread/AgentDashboardBlockPart/confirmAgentDashboardCard.test.ts`
Expected: FAIL. No event is logged.

- [ ] **Step 3: Implement**

Replace `confirmAgentDashboardCard.ts`'s function and its options with:

```ts
/** What confirming a card needs: the card, its dashboard, and the editor. */
type ConfirmAgentDashboardCardOptions = {
  card: AgentDashboardBlockData;
  dashboard: AgentDashboardCandidate;
  identity: AgentDashboardCardIdentity;
  editor: {
    activeDashboardId: string | undefined;
    editorData: DashboardEditorAppState["editorData"];
    dispatch: Pick<
      ReturnType<typeof DashboardEditorStateManager.useDispatch>,
      "queuePendingBlock"
    >;
  };
};

/** Logs that a confirmed card's block reached its dashboard. */
function _logBlockAdded(
  identity: AgentDashboardCardIdentity,
  payload: AnalyticsEventPayloads["dashboard.block_added_via_chat"],
): void {
  void AnalyticsClient.logEvent({
    event: "dashboard.block_added_via_chat",
    workspaceId: identity.workspaceId as Workspace.Id,
    app: "dashboards",
    payload,
  });
}

/**
 * Queues the card's block unsaved into the editor showing its dashboard,
 * logs it, and records the card confirmed. The payload is built first, so
 * its count reads the editor's content before the block lands.
 */
function _confirmIntoEditor(
  options: Readonly<ConfirmAgentDashboardCardOptions>,
): AgentDashboardCardStatus {
  const { card, dashboard, identity, editor } = options;
  const payload = ChatAnalyticsPayloads.fromDashboardBlock({
    block: card.block,
    dashboardId: dashboard.id,
    editorState: editor,
  });
  editor.dispatch.queuePendingBlock({
    pendingId: card.cardId,
    block: buildPendingDashboardBlock(card.block),
    dashboardId: dashboard.id,
  });
  _logBlockAdded(identity, payload);
  const status = _confirmedStatus(dashboard, true);
  AgentDashboardCardStore.setStatus(identity, card.cardId, status);
  return status;
}

/**
 * Confirms a dashboard card. When the dashboard is open in the editor right
 * now, the block goes there unsaved, since the editor's next Save would
 * overwrite a row written underneath it. Otherwise the block is saved to
 * the dashboard. A block that reaches the dashboard is logged once. The
 * card's status records how it ended.
 */
export async function confirmAgentDashboardCard(
  options: Readonly<ConfirmAgentDashboardCardOptions>,
): Promise<AgentDashboardCardStatus> {
  const { card, dashboard, identity, editor } = options;
  if (editor.activeDashboardId === dashboard.id) {
    return _confirmIntoEditor(options);
  }
  const result = await appendBlockToDashboard({
    workspaceId: identity.workspaceId as Workspace.Id,
    dashboardId: dashboard.id,
    block: card.block,
  });
  if (result.kind === "saved") {
    _logBlockAdded(
      identity,
      ChatAnalyticsPayloads.fromDashboardBlock({
        block: card.block,
        dashboardId: dashboard.id,
      }),
    );
  }
  const status: AgentDashboardCardStatus =
    result.kind === "saved"
      ? _confirmedStatus(dashboard, false)
      : { status: "failed", reason: FAILURE_REASONS[result.kind] };
  AgentDashboardCardStore.setStatus(identity, card.cardId, status);
  return status;
}
```

Add these imports:

```ts
import { ChatAnalyticsPayloads } from "@/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import type { AnalyticsEventPayloads } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
```

(`DashboardEditorStateManager` stays a type import, so merge `DashboardEditorAppState` into that line.)

In `AgentDashboardBlockPart.tsx`'s `useConfirmCard`, pass the editor's content:

```ts
        editor: {
          activeDashboardId: editorState.activeDashboardId,
          editorData: editorState.editorData,
          dispatch,
        },
```

The `editorData` field is required on Confirm's options, so the type check enforces this call site.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/components/ChatPanel/ChatThread/AgentDashboardBlockPart`
Expected: PASS, `AgentDashboardBlockPart.test.tsx` unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatThread/AgentDashboardBlockPart
git commit -m "feat(ai-agent): log a block a confirmed dashboard card adds"
```

- [ ] **Step 6: Task 6 full suite**

Run the four full-suite commands. Expected: all PASS, no catalog change.

---

## Task 7: Docs

### Unit 7.1: The docs that ship

**Label:** ordinary (docs only). Not high-risk.

**Files:**
- Modify: `docs/ai-agent/decisions.md`, `docs/ai-agent/README.md`
- Modify: `docs/ai-agent/specs/phase-1.md`
- Modify: `docs/ai-agent/eval.md`, `docs/ai-agent/architecture.md`
- Modify: `docs/measles-demo/pr-feature-log.md`

- [ ] **Step 1: `decisions.md` and `README.md`**

Add the D45 entry after D44, with the text under "Docs that ship with 1E" in the spec, word for word. Then add one sentence to **Decision** quoting the final wording of `TRY_AGAIN_LINE` (the constant at the commit that deploys 1E), and, if a fallback shipped, one sentence to **Fallbacks** naming it, with its design replacing the line's in **Decision**. Add rows for D43, D44, and D45 to the index table at the top (it ends at D42), each with the status its entry's heading gives: D43 Approved, D44 Approved, D45 Built. In `README.md`, change "D01 to D44" to "D01 to D45".

- [ ] **Step 2: `specs/phase-1.md`**

Replace the 1E row of `specs/phase-1.md` with the spec's text under "`specs/phase-1.md`".

- [ ] **Step 3: `eval.md`**

- The Phase 1E section (Units 2.1 and 4.2 wrote its runs): check it has both tables, each bar and whether it was met, every wording tried with its numbers, and the fallback taken, if any.
- Under "Questions and ground truth", a paragraph on `scripts/ai-eval/covid/covidTryAgainQuestions.ts` with the spec's T table (built from, first attempt, what passes), and one sentence each on the repeat test (`isRepeatedAttempt`) and on T06 reading `GradeContext.parentResult`.
- Under "Reproducing every result", the two commands from the spec's "Runs and bars" table.
- Under "Run archive", the new run count from `docs/ai-agent/eval-runs/README.md`.
- Add `T` to the category letters in "Running it" (`B, I, H, N, F, P, M, S, D, T`).

- [ ] **Step 4: `architecture.md`**

Replace section 8, item 1 with:

```markdown
1. Move the remaining Data Explorer features into the agent path: charts
   (done through `run_query`'s `chart`), dashboards (`add_dashboard_block`,
   done in 1D, [spec](specs/phase-1d.md)), and "Try again" (done in 1E,
   [spec](specs/phase-1e.md)). Phase 1A is done: the agent answers on every
   page and results outside the Data Explorer show in the chat
   ([spec](specs/phase-1a.md)).
```

- [ ] **Step 5: The PR feature log**

In `docs/measles-demo/pr-feature-log.md`, F140 is the next free id:

- Features table row: `| F140 | Try again and parity in the agent: the Try again line, the shared card audit, and the agent's analytics events | not started | F139 | |`
- Merge order row after F139's: `| after F139 | F140 | Frontend only: no edge function or migration to deploy first. It changes the agent turn F139 builds and the dashboard paths F139 adds. |` (if A3 shipped, say instead that the `chat` edge function deploys first, since it serves v7).
- A `## F140: Try again and parity in the agent` section in F139's format: Status, **Purpose**, **Value**, **Eval** (the Unit 4.2 bars and numbers), **Design** (`docs/ai-agent/specs/phase-1e.md` and D45), **PR title** `feat(ai-agent): try again and parity in the agent`, **Depends on** F139, **Commits to read** (`git log --reverse --format='%h %s' demo/measles..HEAD`), **Files** by area with their commits (`git show --stat --format= <sha>`), **Schema** none.
- Rows in the files-by-area tables for the shared files this branch changes (`createChatModelAdapter.ts`, `dataAgentTurnHelpers.ts`, `createConversationAgentHost.ts`, `buildAgentTurnText.ts`, `ChatAnalyticsPayloads.ts`, `applyChatModelTurnResponse.ts`, `createBrowserDataAgentHost.ts`, `confirmAgentDashboardCard.ts`, `addAgentDashboardBlock.ts`, the eval scripts, and the `docs/ai-agent` files), appending F140 and its commits to each row's list.

- [ ] **Step 6: Final checks**

Run the four full-suite commands.
Expected: all PASS, no catalog change.

- [ ] **Step 7: Commit**

```bash
git add docs
git commit -m "docs(ai-agent): record Phase 1E, Try again and parity in the agent, as built"
```

---

## Execution notes for the controller

- **Red/green TDD.** Every unit writes its failing test first, runs it, and watches it fail for the reason the step names, before any implementation. Guard steps (3.1 Step 1, 5.1 Step 1) and pin units (3.2, 3.5) pass on their first run by design: the implementer says so in the report. Any other test that passes before its code exists is a bad test: fix the test before going on.
- **One run at a time.** Never run two builds, test runs, type checks, lints, or eval runs at the same time in this worktree.
- **No push, no merge.** Commit on `jpsyx/agent-parity-1e` after every unit. Never push, open a PR, or merge.
- **Git identity.** Author commits as the repo's configured git identity (`git config user.name` and `git config user.email` in this worktree). Never pass `--author` or change the config. Add the session's attribution trailer only if the session's own rules ask for one.
- **Routing.** Dispatch by each unit's label: mechanical units to the mechanical implementer row, ordinary units to the ordinary row, and the high-risk Task 3 gets its task-level review. Eval run units (2.1, 4.2) need the live-model preconditions above and cost a few cents per run.
- **Scope.** A unit touches only its files. A fix outside them goes in the report with one sentence on why.
- **Stop conditions.** No OpenRouter key: ask Pablo. A bar still missed after the third wording or a fallback's reruns: stop and escalate with the numbers, since the spec's "Done when" is then not met. A fallback triggered: write its addendum and have it reviewed before dispatch.
- **Final branch review is mandatory.** After Task 7, run the full suite once more, then the final branch review of the whole branch against the spec, before `finishing-a-development-branch`.

## Self-review against the spec

| Spec section | Unit |
|---|---|
| Requirement 1 (the line on a hosted `same_thread` after a kept reply) | 3.1, 3.4, 3.5 |
| Requirement 2 (the first attempt stays in the transcript) | 3.4 |
| Requirement 3 (offline, failed, or discarded: no line, same conversation) | 3.4 |
| Requirement 4 (a longer thread is asked as today) | 3.4 |
| Requirement 5 (a rewind restarts from the recap) | 3.4, 3.5 |
| Requirement 6 (the in-memory record) | 3.3, 3.4 |
| Requirement 7 (`buildAgentTurnText` unchanged without `isRetry`) | 3.1 (guard) |
| Requirements 8 and 9 (the line rules, a column question stays one) | 3.1, 3.2 |
| Requirements 10 and 11 (nothing undone, `chat.message_sent` unchanged) | no code change: 3.4 changes neither, 6.2 pins `chat.message_sent` |
| Requirements 12 to 16 (cards: bias check, row, `auditId`, `turnNumber`, stale turn) | 5.1, 5.2, 5.3 |
| Requirements 17 and 18 (`chat.sql_generated`) | 6.2, 6.3 |
| Requirements 19 and 20 (`dashboard.block_added_via_chat`) | 6.1, 6.4, 6.5 |
| Requirement 21 (today's chat logs the same) | 6.1, 6.2 |
| Requirement 22 (no model call, no prompt change) | no unit adds either. 4.3 adds v7 only if its trigger fires |
| Requirement 23 (tests first) | every unit |
| Requirement 24 (the Try again eval meets its bars) | 2.1, 4.2 |
| Eval: the T set, harness support, repeat test, runs and bars | 1.1 to 1.6, 4.1, 2.1, 4.2 |
| Fallbacks A2 and A3 | 4.4, 4.3 |
| Docs that ship with 1E | 7.1 |
| Done when: tsc, lint, i18n, test:frontend, docs | full suite per task, 7.1 |
