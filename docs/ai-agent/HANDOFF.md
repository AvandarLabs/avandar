# Handoff: from the data agent to the full Avandar agent

> **Delete this file** in the same commit that adds the Phase 1 plan
> (step 5 below), and trash its downloads copy with
> `trash "/Users/pablo/jpsyx-downloads/avandar_pi-agent/ai-agent/HANDOFF.md" "/Users/pablo/jpsyx-downloads/avandar_pi-agent/ai-agent/HANDOFF.pdf"`.
> Everything lasting it points to lives in the other docs in this folder;
> this file only gets a new session started.

Written 2026-11-08 at the end of the session that built the Pi data agent,
offline mode, server-held prompts, and the evals. Pablo approved the plan in
[roadmap.md](roadmap.md) (decision D33) and wants a new session to spec,
plan, and implement it phase by phase.

## Start here

1. **Read, in order:** [roadmap.md](roadmap.md) (the approved phases),
   [decisions.md](decisions.md) (D01 to D33, especially D04, D16, D20, D31,
   D32, D33), [architecture.md](architecture.md) (sections 2 to 5 and 8),
   and [eval.md](eval.md) ("Method in detail" and "Reproducing every
   result").
2. **Branch.** Base every phase on `demo/measles` (the demo branch; a push
   deploys it). Create the worktree with the `using-wt` skill, for example
   `cd "$(wt new feat/agent-default)"`. Run `ava supabase status`, then
   `ava supabase switch` before any database command, as the repo's
   CLAUDE.md requires.
3. **Spec Phase 1** with the `brainstorming` skill: the four items in
   roadmap Phase 1 (dashboards in the agent, "Try again", the browser test,
   on by default). Write it to `docs/ai-agent/specs/phase-1.md` and get
   Pablo's approval before planning.
4. **Plan it** with the `writing-plans` skill, to
   `docs/ai-agent/plans/phase-1.md`, including the dashboard eval questions
   that must exist before the dashboard tool ships.
5. **Delete this file** in the commit that adds the plan (see the note at
   the top).
6. **Implement** with red/green TDD (the `test-driven-development` skill),
   then run the evals. Commit as you go on the phase branch; never push or
   merge without Pablo saying so.
7. **Repeat 3 to 6 for each phase**, updating `roadmap.md` (mark items done)
   and `decisions.md` (a new D-number per decision) as you go.

## What the work is for

One Avandar agent for all platform work: data questions, dashboards,
dataset management, help with the platform, interpretation of the user's
data with social-sector knowledge, ontology and case management, and
workspace management. Every operation becomes a tool. The constraints,
from Pablo:

| Constraint | Meaning |
|---|---|
| Cheap first | Plans are $4 and $15 a user a month; AI spend must stay at or under half of that. Cheaper models are fine if accuracy holds. |
| Accurate | No accuracy lost against what a change replaces, measured by an eval, and nothing invented. |
| Private | Row data reaches a hosted model only when needed and only after the user consents; on a decline, explain how to do it by hand. In-browser models are exempt. |
| Latency | Only has to clear "feels slow". |
| No lock-in | Any provider, any model; compute in the browser (DuckDB, QETL) where possible. |

## Where the code is

| What | Where |
|---|---|
| The data agent (loop, tools, host interface, run state) | `src/lib/agent/dataAgent/` |
| Offline agent and the WebLLM stream function | `src/lib/agent/dataAgent/offline/`, `src/lib/agent/localModels/` |
| Shared prompt, tool definitions, prompt id, model roster | `shared/agent/` |
| Agent proxy (server-held prompt and tools) | `supabase/functions/chat/PostAgentStream/` |
| Today's chat function (dashboards, case manager, Data Explorer without the switch) | `supabase/functions/chat/PostChatMessages/` |
| PDF table assistant route | `supabase/functions/chat/PostExtractMeasurements/` |
| Chat runtime: routing between today's chat, the agent, and offline | `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.ts` |
| Agent turn in the browser | `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/`, `dataAgentTurnHelpers/` |
| The agent switch | `src/lib/agent/dataAgent/browser/DataAgentFeature.ts` (`localStorage["avandar:data-agent"] = "on"`) |
| Evals | `scripts/ai-eval/` (chat), `scripts/ai-eval/pdf/` (PDF assistant) |
| Eval run archive | `docs/ai-agent/eval-runs/` (rebuild with `scripts/ai-eval/archiveEvalRuns.ts`) |

## Phase 1 starting points

- **Dashboards:** today's chat defines `addDashboardBlock` in
  `supabase/functions/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts`
  and the browser applies it in
  `src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.ts`.
  The agent's version belongs in `shared/agent/dataAgent/dataAgentTools.ts`
  (definition, served by the proxy) plus a browser tool that runs it. A new
  tool changes the prompt the proxy serves, so bump `DATA_AGENT_PROMPT_ID`.
- **"Try again":** today's chat sends `retryContext`
  (`buildRetryContext` in `chatRuntimeTurnHelpers.ts`); the agent ignores
  regeneration today.
- **Eval:** the chat eval has no dashboard questions yet. The baseline
  harness (`scripts/ai-eval/harnesses/baseline/BaselineHarness.ts`) sends
  every turn in the Data Explorer context, but the Deno runner behind it
  (`DenoChatTurnRunner`) takes any page context, so a dashboards variant
  can grade the new questions against today's chat first, which sets the
  bar.

## Running the evals

From [eval.md](eval.md#reproducing-every-result):

```sh
# The online agent (about $0.01 and 2 minutes)
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --concurrency 6

# Today's chat (about $0.06 on its default, Haiku 5.5)
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness baseline --model anthropic/claude-haiku-5.5 --concurrency 6

# The PDF table assistant (a few cents)
pnpm vite-script scripts/ai-eval/pdf/runPdfAssistEval.ts -- --setup extract-route --model anthropic/claude-haiku-5.5 --repeat 3

# Archive runs into docs/ai-agent/eval-runs/
pnpm vite-script scripts/ai-eval/archiveEvalRuns.ts
```

Online models vary run to run: rerun a single miss before calling it a
regression (N05 and H06 each missed once and then passed 4 of 4).

## Lessons that cost time

- **Formatter and lint:** the formatter is oxfmt
  (`pnpm exec oxfmt --ignore-path .oxfmtignore <files>`), not Prettier.
  ESLint enforces 80-character lines and block-bodied arrow functions; run
  `eslint --fix` after oxfmt. Functions stay at 45 lines or fewer.
- **Shared code runs in Deno too:** files under `shared/` import each other
  with a `.ts` extension, and a new npm package needs an entry in both
  `deno.json` and `supabase/functions/chat/deno.json`. Check with
  `pnpm type-check:deno`; `deno check` on a sub-folder reports false React
  errors.
- **Scripts cannot load UI modules:** `pnpm vite-script` has no Lingui
  plugin, so an eval that imports anything pulling in `@lingui/core/macro`
  fails. Keep logic the eval needs in pure modules (for example
  `src/workers/pdfSniff/llm/tableToMeasurements.ts`).
- **Never import a runner:** a script that calls `main()` at module scope
  starts a run when imported. Put shared helpers in their own modules.
- **Translations:** every UI string goes through Lingui; then run
  `pnpm i18n:extract` and `pnpm i18n:compile`. Never hand-edit a
  `messages.ts`; merge conflicts in them are fixed by re-extracting and
  recompiling.
- **Chat function tests run in Vitest**, not `deno test`.
- **`supabase/config.toml` stays modified** after `ava supabase switch`;
  never stage it (a commit hook rejects it).
- **Offline eval:** WebLLM needs Playwright's `channel: "chromium"` for
  Metal WebGPU (the default headless shell falls back to a software GPU).
  Two runs need two profiles (`AVA_EVAL_WEBLLM_PROFILE`); a killed run can
  leave `.temp/ai-eval/webllm-profile/SingletonLock`, which must be deleted.
- **OpenRouter credit limits:** firing more than about 100 requests at once
  returned `402 in_flight_budget_exhausted`; the account balance looked low
  on 2026-11-08.
- **Hook noise:** the React Doctor hook reports two `package.json`
  supply-chain warnings on every edit; they predate this work.
- **Known flaky tests (not caused by this work):** Mantine notification
  timers after teardown in `CaseTypeDraftBlock.test.tsx` under full-suite
  load, and the timing test in `withRateLimit`.

## Not done yet, besides the roadmap

- The PDF table assistant has no browser end-to-end test; both server
  routes were checked against the local edge function.
- Offline numbers come from a 64 GB M4 Pro, not a 16 GB laptop (roadmap
  O1).
- Metering and the free plan's cap are future work before `develop`
  (roadmap F1 to F3).
