# Handoff: Phase 1B is built, not merged

> **Delete this file** in the commit that merges `feat/agent-context` into
> `demo/measles`. Everything lasting lives in the other docs in this folder;
> this file only gets a new session started.

Written 2026-11-09 at the end of the session that specced, planned, built,
reviewed, and live-checked Phase 1B (attachable context). The branch
`feat/agent-context` is pushed to origin so work can continue on another
machine.

## Start here

1. **Read, in order:**
   - [specs/phase-1b.md](specs/phase-1b.md): what was built, the decisions
     made while planning and building, the three privacy review rounds, the
     live check, and known follow-ups.
   - [decisions.md](decisions.md): D40 (1E scope), D41 (1B design), D42
     (privacy rules 1B added).
   - [eval.md](eval.md#phase-1b): the Phase 1B results.
   - [roadmap.md](roadmap.md): 1B is done; 1C is next. "What keeps the agent
     off" lists the gaps 1D and 1E close.
2. **Set up the machine** (see "On a new machine" below).
3. **Ask Pablo the open decisions** below, one at a time, recommending an
   option.
4. **Merge** (if approved), then **spec 1C** with the `brainstorming` skill.

## Where things stand (2026-11-09)

| Item | State |
|---|---|
| 1B code | All 22 plan tasks done on `feat/agent-context` (55 commits on top of `demo/measles` at `6915c456e`). Every task passed a spec review and a quality review; a final whole-branch review said ready to merge. |
| Unit tests | `pnpm test:frontend` 8,038 passed. `tsc`, ESLint, Stylelint, `pnpm i18n:check` clean. |
| Deno check | Fails only on `supabase/functions/open-data/requestParquetCache/requestParquetCache.test.ts:237` (`parquetCacheAnswerToStatus`), pre-existing on `demo/measles`. |
| Database tests | `pnpm test:db` 1,275 passed. |
| Browser specs | `agent-chat-mentions.spec.ts` and `agent-chat-result.spec.ts` pass, about 12 s each. |
| Eval | M01 to M06 7/7 on three runs; P01 to P07 7/7; the 45 at 44/45 (N04 varies, passed on rerun). Archived under `phase-1b`. |
| Live check | All six steps passed with live models. |
| Migration | `20261109134745_gadgets_search_stored_prompt.sql`: replaces `rpc_gadgets__search` only. It now reads a tile's prompt from `nl_query` (how saved configs store it), falling back to `nlQuery`. Before this, chart search never found a saved chart (in chat and in comments). |
| Prompt | `data-agent-v3` is the default; v1 and v2 stay served and are pinned by SHA-256 tests. v3 has not shipped, so it can still change in place. |
| Merge | Not done. `demo/measles` is 106 commits ahead of where this branch started on origin (83 of them were local-only at the time of the build and have since been pushed). |

## Open decisions for Pablo (ask first)

| # | Decision | Context |
|---|---|---|
| 1 | **Merge `feat/agent-context` into `demo/measles`?** | Recommended. First merge `origin/demo/measles` into this branch: all 8 `src/i18n/locales/*/messages.po` and `messages.ts` will conflict. Keep both sides' entries, then `pnpm i18n:extract && pnpm i18n:compile` (never hand-merge `messages.ts`), fill any new empty `msgstr` in the 7 non-English catalogs, and rerun `pnpm exec tsc -b --noEmit`, `pnpm test:frontend`, and `pnpm i18n:check`. Then merge into `demo/measles` with `--no-ff`. |
| 2 | **Push `demo/measles` after the merge?** | A push deploys the demo. The browser asks the proxy for `data-agent-v3`, so the `chat` edge function must deploy with the frontend, or agent-on users get "Unknown agent prompt". The agent is off by default (`localStorage["avandar:data-agent"] = "on"`), so the risk is small. After the push, any prompt change needs a v4. |
| 3 | **Vault map-layer queries?** | Still open: a map layer's own filter value can appear in that layer's name, because layer queries are not redacted. Small; could join 1C or a later privacy pass. |

## Next work, in order

| # | Sub-project | Notes |
|---|---|---|
| 1C | Multiple chats and a browser-only archive | Tabs, archive, expand-to-drawer, auto titles, every AI entry point opens a new session (R4), the case designer moves into the main panel. The tray is already stored per workspace and user in `ChatContextTrayStore`; 1C should key it per session. |
| 1D | Dashboard actions from anywhere | `add_dashboard_block`. |
| 1E | "Try again" and parity | Plus the audit log, bias check, and analytics for the agent's question cards (D40). |
| 1F | On by default | After a week on the demo without regressions. |

## On a new machine

```sh
git fetch origin
cd "$(wt go feat/agent-context)"   # use the using-wt skill; never raw git worktree
pnpm install
pnpm build:ava-cli                 # if `ava` is not on PATH
ava supabase status                # then, before any db or e2e command:
ava supabase switch                # gives this branch its own stack and seeds it
pnpm fns:update-env                # otherwise edge functions crash ("supabaseKey is required")
```

- The local Supabase switch is per machine and edits `supabase/config.toml`
  in the working tree. **Never commit `config.toml`** (the pre-push hook
  rejects a changed project id or ports).
- Evals need `OPEN_ROUTER_API_KEY` in `.env.development.edge` and the CSVs in
  `~/cleaned-test-data` (see [eval.md](eval.md#reproducing-every-result)).
  Only one eval run at a time: they share `.temp/ai-eval/covid.duckdb`.
- Not in git, left on the first machine: browser-spec and live-check
  screenshots (`.temp/feat-agent-context/`), the 1A live-check screenshots
  (`.temp/feat-agent-default/`), and the downloads copies of the spec and
  plan. The spec and eval docs describe everything they showed.

## Running things

```sh
# Mention questions (about $0.002 a run)
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --concurrency 3 --questions M
# Page questions, then the 45
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --concurrency 3 --questions P
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --concurrency 3
pnpm vite-script scripts/ai-eval/archiveEvalRuns.ts
# Browser specs, one at a time
pnpm test:e2e agent-chat-mentions.spec.ts
pnpm test:e2e agent-chat-result.spec.ts
```

- **Live check:** `pnpm dev` dies on ngrok. Run
  `npx concurrently "vite --host 127.0.0.1 --port <AVA_VITE_DEV_PORT>" "pnpm fns:serve"`
  (the port is pinned in `.env.development` by the switch), sign in with the
  seeded user from `seed/SeedData.ts`, set the switch in localStorage, and
  drive headless Playwright from a folder outside the repo.

## Where the 1B code is

| What | Where |
|---|---|
| Ref tokens, gadget context, blocks | `shared/agent/mentions/` (`ChatMentionToken`, `AgentGadgetContext`, `buildAgentContextBlocks`) |
| Block escaping, page block, turn text | `shared/agent/pageContext/` (`agentBlockText`, `buildAgentPageContextBlock`, `buildAgentTurnText`) |
| Prompt v3 | `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts`, `dataAgentTools.ts` |
| Loader, per-turn loading, hosted and local message text | `src/components/ChatPanel/useAvandarChatRuntime/agentMentions/` |
| Offline answer marker | `OfflineAnswerMessage` (find with `grep -rn OfflineAnswerMessage src`) |
| Agent turn and adapter | `runDataAgentTurn/`, `dataAgentTurnHelpers/`, `createChatModelAdapter/` in the same folder |
| Tray state and storage | `ChatPanelStateManager` (`contextTray`), `src/components/ChatPanel/ChatContextTrayStore/` |
| Composer, tray, picker, chips | `src/components/ChatPanel/ChatThread/{Composer,ChatContextTray,UserMessage}/` |
| Chat variant of the `@` menu | `src/components/RichText/MentionMenu/` (`variant: "chat"`) |
| Eval | `scripts/ai-eval/covid/covidMentionQuestions.ts`, `harnesses/pi/PiHarness.ts` |
| Browser spec | `tests/e2e/agent-chat-mentions.spec.ts`, `tests/e2e/helpers/openAgentChat.ts` |

## How Pablo wants the work run

- Spec, then plan, then build, per sub-project, with Pablo's approval of the
  spec. Questions one at a time, recommending an option.
- Subagent-driven: an implementer per task or small batch, then a spec
  review, then a quality review, looping until both approve; the most
  capable model for integration, UI, privacy, and review. A final
  whole-branch review before merge.
- Privacy-sensitive work gets an adversarial review that writes real attack
  tests, repeated until a round finds nothing serious (1B took three).
- Live checks with live models after a feature lands.
- Commit as you go on the feature branch; never push or merge without
  Pablo saying so. Merges go into `demo/measles` with `--no-ff`.

## Lessons from 1B

- **The shell and the edit tools mangle escapes.** ` `, `<`, and
  similar written through a heredoc or the Edit tool can turn into raw
  characters or `&lt;`. Write them with Python `chr()` and scan with
  `perl -ne 'print "$.\n" if /[\x{85}\x{2028}\x{2029}]/'`.
- **zsh does not word-split variables:** `E="pnpm ..."; $E` runs nothing.
  Write commands out.
- **Saved dashboard configs are snake-cased** (`DashboardParsers` applies
  `snakeCaseKeysDeep`): `nl_query`, `raw_sql`, `viz_type`. Server-side
  readers and test fixtures must use the stored spelling.
- **Hydrate-then-persist effects in one commit** write the stale initial
  value first; skip the persist that runs in the hydrating commit.
- **A test that passes on first run is not red/green.** Say so in the report.
- **Editor diagnostics are often stale** (from other checkouts or mid-edit).
  Trust `pnpm exec tsc -b --noEmit` in the worktree.
