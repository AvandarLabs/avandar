# Handoff: continuing the Avandar agent after Phase 1A

> **Delete this file** in the same commit that adds the 1B plan
> (`docs/ai-agent/plans/phase-1b.md`), and trash its downloads copy with
> `trash "/Users/pablo/jpsyx-downloads/avandar_agent-context/ai-agent/HANDOFF.md" "/Users/pablo/jpsyx-downloads/avandar_agent-context/ai-agent/HANDOFF.pdf"`.
> Everything lasting it points to lives in the other docs in this folder;
> this file only gets a new session started.

Written 2026-11-09 at the end of the session that specced, built, and
merged Phase 1A (the page-agnostic agent), its privacy follow-up, and the
fixes from three live checks. This worktree (`feat/agent-context`, based on
the local `demo/measles` merge commit `cc3833377`) is where 1B starts.

## Start here

1. **Read, in order:**
   - [roadmap.md](roadmap.md): Phase 1 is now six sub-projects, 1A to 1F.
   - [specs/phase-1.md](specs/phase-1.md): the four rules (R1 to R4) every
     sub-project follows.
   - [specs/phase-1a.md](specs/phase-1a.md) and
     [specs/phase-1a-redaction.md](specs/phase-1a-redaction.md): what was
     built, as built, with known follow-ups and still-open gaps.
   - [decisions.md](decisions.md): D34 to D39 are this phase's decisions.
   - [eval.md](eval.md): "Phase 1A" results, P01 to P07, and "Reproducing
     every result".
2. **Check the open decisions below with Pablo** before starting work.
3. **Spec 1B** with the `brainstorming` skill, to
   `docs/ai-agent/specs/phase-1b.md`, and get Pablo's approval.
4. **Plan it** with `writing-plans` to `docs/ai-agent/plans/phase-1b.md`,
   and delete this file in that commit.
5. **Implement** with `subagent-driven-development` (see "How Pablo wants
   the work run").

## Open decisions for Pablo (ask first)

| # | Decision | Context |
|---|---|---|
| 1 | **Push `demo/measles`?** | The merge of Phase 1A is local only: `demo/measles` is 69 commits ahead of origin and was not pushed. A push deploys the demo. The agent stays off for users unless `localStorage["avandar:data-agent"] = "on"`. |
| 2 | **Add the audit log, bias check, and analytics to 1E?** | Proposed, not yet approved. See "The agent stays off" below. |
| 3 | **Remove the `feat/agent-default` worktree and its local Supabase stack?** | It is fully merged into local `demo/measles`. Keep it until the push, then clean up with the `using-wt` skill (`wt rm`) and `supabase stop --project-id feat-agent-default`. |

## Where things stand (2026-11-09)

| Done | Notes |
|---|---|
| 1A: the agent answers on every page except the case designer | Behind the switch. Results outside the Data Explorer render in the chat as gadget-style cards that re-run in DuckDB-Wasm. Each turn starts with a `<current_page>` block. Prompt `data-agent-v2` is served beside v1. |
| Privacy for page SQL (D39) | Values compared to personal columns (and values that look personal) reach the model as `'<value N>'`; the browser maps them back before any SQL runs. Survived three adversarial reviews. |
| Composer enabled on every page (switch on) | The case designer keeps its own flow. |
| Split charts | A long result drawn as a line, bar, or area chart shows one series per category, in the chat card and the Data Explorer canvas (not dashboards). |
| Failure handling | Agent failures throw; network failures offer "Answer offline"; other failures reply with a translated message (access or generic). |
| Evals | P01 to P07 7/7; the 45 questions 45/45 on the latest run. Spend for the phase was about $0.15. |
| Browser spec | `tests/e2e/agent-chat-result.spec.ts` passes in about 15 s (6 of 6 since the Docker cleanup). |
| Live checks | Three rounds with live models in the real app (Data Explorer, dashboard, dashboard list, map, dataset, settings, case type, case, case designer, switch off). All passed. Screenshots: `~/src/worktrees/avandar/feat/agent-default/.temp/feat-agent-default/live*/`. |

### The agent stays off (Pablo, 2026-11-09)

Turning it on today would lose things today's chat does:

| Today's chat feature | Agent today | Planned |
|---|---|---|
| "Add a chart to this dashboard" adds a block in the dashboard editor | No dashboard tool; shows the result in the chat instead | 1D |
| "Try again" sends the previous attempt (`retryContext`) | The agent branch runs before the retry logic; it just asks again | 1E |
| Clarification cards are audit-logged (`ClarificationAuditEntryClient.recordShown`) and bias-checked (`detectBias`) in `applyChatModelTurnResponse.ts` | The agent's `ask_user` cards skip both | Proposed for 1E |
| Analytics `chat.sql_generated`, `dashboard.block_added_via_chat` | Not logged (`chat.message_sent` is logged for both) | Proposed for 1E |

Parity or better: data questions (45/45, about a quarter of the cost, about
twice as fast), consent before values or a typed message cross, the case
designer, offline mode. New: questions from maps, datasets, case pages,
settings.

## Next work, in order

| # | Sub-project | Notes |
|---|---|---|
| 1B | `@` mentions of gadgets in the chat composer, and a context picker | Reuse the comment composer's mention menu (`src/components/RichText/MentionMenu/`, `rpc_gadgets__search`) and the gadget registry. Mentioned gadgets add to the page block (metadata only, through the same redaction). Read `docs/measles-demo/gadgets.md`. |
| 1C | Multiple chats and a browser-only archive | Tabs (2 or 3 visible plus a list), the expand-to-drawer button, auto titles (cheap model online, offline model offline, placeholder then rename), every AI entry point opens a new session (R4), the case designer moves into the main panel. |
| 1D | Dashboard actions from anywhere | `add_dashboard_block`; dashboard eval questions graded against today's chat first. |
| 1E | "Try again" | Plus the audit log, bias check, and analytics, if Pablo approves. |
| 1F | On by default | After a week on the demo without regressions. |

Future work already on the roadmap: chat history in the database (F4) and
chat session limits for free and basic plans (F5).

## How Pablo wants the work run

- **Spec, then plan, then build**, per sub-project, with Pablo's approval
  of the spec. Questions to Pablo one at a time; recommend an option.
- **Subagent-driven:** one implementer per task (or per small batch of
  tightly coupled tasks), then a spec-compliance review, then a quality
  review, and loop until both approve. Use the most capable model for
  integration, UI, and review; a cheaper one for mechanical tasks. A
  final whole-branch review before merge.
- **Privacy-sensitive work gets an adversarial review** that writes real
  attack tests (the redaction went through three rounds).
- **Live checks** with live models in the real app after a feature lands
  (see "Running things").
- **Commits** as you go on the feature branch; never push or merge without
  Pablo saying so. Merges go into `demo/measles` with `--no-ff`.

## Where the code is

| What | Where |
|---|---|
| Page context type, block, turn text | `shared/agent/pageContext/` |
| Prompt (v1, v2), tools, prompt ids | `shared/agent/dataAgent/` |
| Proxy (serves v1 and v2) | `supabase/functions/chat/PostAgentStream/` |
| Chat routing, offline fallback, failure replies | `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.ts` |
| Page context from browser state | `src/components/ChatPanel/useAvandarChatRuntime/agentPageContext/` |
| Agent turn, conversations, host routing, chat results | `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/`, `dataAgentTurnHelpers/` |
| Placeholder redaction | `src/lib/agent/dataAgent/pagePrivacy/` |
| Result card | `src/components/ChatPanel/ChatThread/AgentQueryResultPart/` (lazy-loaded) |
| Split charts | `src/components/VisualizationContainer/makeWideResultFromLongResult/`, `useCategorySplitChartInput/` |
| Composer | `src/components/ChatPanel/ChatThread/Composer/Composer.tsx` |
| View-change lines (case ids stripped) | `src/components/ChatPanel/ChatViewEvent/ChatViewEvent.ts` |
| Evals | `scripts/ai-eval/` (page questions in `covid/covidPageQuestions.ts`) |

## Running things

```sh
# The online agent on the original 45 questions (about $0.01)
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --concurrency 3
# The page questions P01 to P07
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --questions P --concurrency 3
# Archive runs (now rebuilds the index from the archive, safe in any worktree)
pnpm vite-script scripts/ai-eval/archiveEvalRuns.ts
```

- **Before any database or e2e command:** `ava supabase status`, then
  `ava supabase switch` (CLAUDE.md requires it), then
  `pnpm fns:update-env` (otherwise edge functions crash with
  "supabaseKey is required"). Run one spec at a time:
  `pnpm test:e2e agent-chat-result.spec.ts`.
- **Live check in the real app:** `pnpm dev` dies on ngrok, so run
  `npx concurrently "vite --host 127.0.0.1 --port <AVA_VITE_DEV_PORT>" "pnpm fns:serve"`
  (the port is pinned in `.env.development` by the switch). Sign in with
  the seeded user from `seed/SeedData.ts`, set the switch in localStorage,
  and drive headless Playwright scripts (`import { chromium } from
  '@playwright/test'`) from a folder outside the repo. Screenshots go in
  `.temp/<branch>/`.

## Lessons that cost time

- **Docker load breaks e2e.** With six local Supabase stacks (about 70
  containers) the browser spec passed 2 of 14 runs; with three stopped (35
  containers) it passed every run. Count containers before blaming a spec,
  and ask Pablo before stopping another branch's stack
  (`supabase stop --project-id <id>` keeps data). On 2026-11-09 the stacks
  `feat-pi-agent`, `feat-demo-measles`, and `demo-measles` were stopped
  with their data kept.
- **Stale editor diagnostics.** The language server sometimes reports
  errors from another checkout (renamed files, missing modules). Trust
  `pnpm exec tsc -b --noEmit` in the worktree.
- **`wt new` adds the type prefix itself.** `wt new feat/x` makes
  `feat/feat/x`; use `wt new feat x <base>`.
- **Prompt v2 ships with the push.** v2 was edited in place because it had
  not shipped. Once `demo/measles` is pushed, any prompt change needs a
  new version (v3) served beside v2, and v1 stays served. v1's exact text
  is pinned by a SHA-256 test.
- **Shared code runs in Deno.** Files under `shared/` import with `$/...`
  and a `.ts` extension; ESLint rejects `./` imports there.
- **Evals cannot load UI modules** (no Lingui in `pnpm vite-script`), and
  the redaction core stays UI-free so the eval can use it.
- **Translations:** run `pnpm i18n:extract && pnpm i18n:compile` and fill
  the 7 non-English `.po` files by hand; never edit `messages.ts`. A merge
  conflict in the catalogs is resolved by keeping both sides' entries,
  then re-extracting and recompiling.
- **A test that passes at once is not red/green.** Several "guard" tests
  passed on their first run; reviewers flagged it. Say so in the report.
- **Pre-existing:** `pnpm type-check:deno` fails on an open-data Parquet
  cache test (`parquetCacheAnswerToStatus`) that came from `demo/measles`,
  not from this work.

## Known follow-ups (not scheduled)

The full lists are in [specs/phase-1a.md](specs/phase-1a.md#known-follow-ups)
and [specs/phase-1a-redaction.md](specs/phase-1a-redaction.md#still-open).
The ones most likely to matter next:

- Saving a split chart to a dashboard draws one line again (dashboards
  were out of scope for the split).
- Placeholders show to the user as `<value N>`; mapping them back for
  display needs the recap path redacted first.
- Today's chat shows endless typing dots on a failed turn (pre-existing);
  rendering assistant-ui's error status would fix it.
- Pass the abort signal into `run_query` and consent so a stopped run ends
  at once.
- One shared helper for "agent on and not the case designer" (it lives in
  both the composer and the adapter), and an accessible label for the chat
  input.
