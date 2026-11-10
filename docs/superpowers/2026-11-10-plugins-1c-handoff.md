# Handoff: Plugins Slice 1c built, not merged

**Date:** 2026-11-10
**From:** the session that specified and built Slice 1c (AI tools)
**For:** a new session continuing the plugin ecosystem work

## Start here

1. Read this whole document.
2. The work is already on `feat/plugins-columns`, in `~/src/worktrees/avandar/feat/plugins-columns`. Do not check out that branch in another worktree. Load the `using-wt` skill before creating or removing any worktree.
3. Nothing from this slice is pushed. `origin/feat/plugins-columns` is behind. Do not push, and do not merge, unless Pablo asks in that session.
4. The merge target is `demo/measles`, never `develop`.
5. Run `git fetch origin && git rev-list --left-right --count origin/demo/measles...HEAD` before new work. At `964bf7489` that count was `139 28`: measles had moved 139 commits ahead, and this branch had 28 commits measles does not have. Those numbers go stale the same day. If the branch is behind, bring it up to date before starting a new slice. After pulling measles, use `pnpm install --frozen-lockfile`. Do not let `pnpm install --lockfile-only` re-resolve.

Ask Pablo what to pick up. The unfinished part of 1c is below. The next slice (1d) has no spec yet.

## Where things stand

Slice 1c is implemented on this branch only. It is not on `origin/demo/measles` and it has not been deployed.

| Work | State | Docs |
| --- | --- | --- |
| Slice 1a, plugin core and toolbar commands | On `demo/measles` before this slice | `docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md` |
| Slice 1b, viz types and derived columns | On `demo/measles` before this slice | `docs/superpowers/2026-11-09-plugins-1b-handoff.md` |
| Slice 1c, AI tools | Local commits on `feat/plugins-columns`, tip `964bf7489` when this was written. Not pushed | Spec `docs/superpowers/specs/2026-11-09-plugins-1c-ai-tools-design.md`. Plan `docs/superpowers/plans/2026-11-10-plugins-1c-ai-tools.md` |

The plan's task 15 still says `--questions F`. The code uses `--questions R`. Trust the code and this handoff.

Architecture spec for the whole ecosystem: `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`. Milestone 1 still has 1d, 1e, and 1f after 1c.

## What 1c built

The hosted data agent can call the epidemiology plugin's `fitRegression` on the result already on screen. The model receives slope, intercept, rSquared, n, and isTruncated. Row values stay on the device. The person sees only the model's chat reply. The Linear regression button and modal are unchanged.

The agent is off unless `VITE_AVA_DATA_AGENT=on` or `localStorage["avandar:data-agent"]` is `on`. The generateSql and clarify chat was not changed. The offline agent (`queryTools: "plan"`) does not get plugin tools. `run_query` still ends the turn when it returns rows, so a query and a fit in one answer are out of scope.

| Area | Where |
| --- | --- |
| Manifest `contributes.aiTools` | `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts` |
| SDK handler types and `InvalidToolInput` | `packages/web/plugin-sdk/src/PluginApi.types.ts`, `definePlugin/definePlugin.ts`, `PluginError/PluginError.ts` |
| Generated tool list. The write command is `pnpm vite-script packages/shared/plugin-manifest/src/node/emitPluginAiTools.main.ts`. Importing `emitPluginAiTools.ts` does not write the file | `shared/agent/dataAgent/pluginAiTools.gen.ts`, `pluginAiTools.types.ts` |
| Pi conversion and the "installed and every permission granted" check | `shared/agent/dataAgent/makeDataAgentToolsFromPluginAiTools.ts`, `isPluginContributionActive.ts` |
| Prompt `data-agent-v4`. v1, v2, and v3 stay as they were. v4 adds one TOOLS bullet | `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts`, `dataAgentTools.ts` |
| Proxy offers a tool only for an enabled install that has granted every manifest permission. Unknown tools stay refused | `supabase/functions/chat/PostAgentStream/loadInstalledPluginAiTools.ts`, `buildDataAgentProxyContext.ts` |
| Explorer result the chat can read. Cleared on unmount only if that hook still owns the value | `src/lib/plugins/ExplorerPluginResultStore/`, `src/views/DataExplorerApp/useDataExplorerPluginContext/` |
| Which result is on screen. On the Data Explorer, the explorer store, even if a chat result is older. Off it, re-run the latest chat result's stored SQL. A DuckDB error becomes `{ kind: "none" }` and the error text is dropped | `src/lib/agent/dataAgent/getOnScreenQueryResult/` |
| Run the handler. Host messages are `No result is on screen.`, `The tool failed.`, and `The tool result was too large.` Only `InvalidToolInput` forwards its message. A JSON object at or under 2,048 UTF-8 bytes is forwarded as-is, including a `rows` key. Chat handles are released. Explorer handles are not | `src/lib/plugins/runPluginAiTool/` |
| Tools rebuilt on each `ask`. The dynamic import of `runPluginAiTool` is in `runDataAgentTurn`, not in `createDataAgent.ts` | `src/lib/agent/dataAgent/createDataAgent/`, `createDataAgentTools/createPluginAiTool.ts`, `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/` |
| The fit. Column match is case-sensitive. `fetchRows` gets the two columns and no limit. `rSquared` is `null` when the fit has none. `aiTools.fitRegression` is a wrapper, `runFitRegressionTool`, because the narrow string arguments are not assignable to `AiToolHandler`. A non-string throws `Column "xColumn"` or `Column "yColumn"` and does not interpolate the value | `plugins/epidemiology/src/fitRegression/runFitRegression.ts`, `plugins/epidemiology/ava.yaml` |
| Authoring | `docs/plugin-authoring.md`, section 12 |
| Eval question `R01`, selector `--questions R`. `--questions F` still selects follow-ups F01, F02, and F03. The grader checks that `toolNames` includes `fitRegression` and the reply matches `/\b2\b/`. The question is not one of the default 45 | `scripts/ai-eval/covid/fitRegressionQuestions.ts`, `selectEvalQuestions.ts`, `harnesses/pi/PiHarness.ts` |

## Where 1c left off

Do these before treating the slice as finished. None of them are a new slice.

1. **Whole-branch review was not run.** Per-task reviews passed. The final pass over the branch, the one that found the real gaps in slice 1b, did not happen. Run it before merging. Ask it to try to break the privacy claims: a cell quoted in a DuckDB error, a disabled install, a tool the workspace did not install, and a handler result that is not a JSON object.
2. **The live eval was not run.** `OPEN_ROUTER_API_KEY` is in `.env.development.edge`. `~/cleaned-test-data` was not on the machine, and `.temp/ai-eval/` had no earlier score. When the data is available:

   ```bash
   pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --model anthropic/claude-haiku-5.5 --questions R
   pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --model anthropic/claude-haiku-5.5
   ```

   `R` must pass. The default 45 must not score lower than the last recorded run. If there is still no recorded run, report the score and do not invent a baseline.
3. **Sync with `origin/demo/measles` before any merge.** This branch was 139 commits behind when the slice finished. A merge without that update will miss a day of measles work.
4. **Push and merge only when Pablo asks**, each time. Merge with `--no-ff` in a temporary worktree from `origin/demo/measles`, confirm the merge tree, then `git push origin HEAD:demo/measles`. A push to `demo/**` deploys.

Checks that already passed, at `964bf7489`: the vitest trees named in the plan's task 15 (74 files, 908 tests), eslint on those paths, oxfmt with `--ignore-path .oxfmtignore`, and `node apps/ava-cli/dist/main.cjs plugin validate epidemiology` after `pnpm --filter @avandar/ava-cli build`. The global `ava` link was not rebuilt.

`pnpm type-check:deno` fails in `supabase/functions/open-data/requestParquetCache/requestParquetCache.test.ts` (`status: string` where `"ready"` is required). That file is the open-data Parquet work. This slice does not touch it. Do not fix it as part of plugin work.

## Open follow-ups from 1c

None of these block 1d. Ask Pablo before picking one up.

1. A plugin tool named `run_query` would not be rejected. Uniqueness is across plugin tools only.
2. `--questions R01` selects nothing. Only the bare token `R` selects the fit question.
3. While the fit eval question holds `ExplorerPluginResultStore`, a concurrent non-fit ask can be offered `fitRegression`. One fit question, so the window is short.
4. `emitPluginAiTools.main.ts` sits next to `emitPluginAiTools.ts` instead of in a directory.
5. `PluginAiTool` is exported from the manifest package's main entry, not from `runtime.ts`.
6. The prompt bullet is concatenated (`PLUGIN_TOOL_BULLET + SQL_SECTION_START`) instead of interpolated.
7. The two-column check in `runFitRegression.ts` is an imperative loop.

The 1b follow-ups in `docs/superpowers/2026-11-09-plugins-1b-handoff.md` are untouched.

## What comes next in the plugin project

Milestone 1 is first-party plugins, bundled in-process. Permissions are declared, not enforced, until Milestone 2. Do not start the sandbox in Milestone 1.

| Next | Done when | How to start |
| --- | --- | --- |
| 1d. Data slots, content, a minimal wizard | The Mozambique pack installs, and the epidemiology plugin binds a `Case` slot | No spec yet. `brainstorming`, then `writing-plans`, then `subagent-driven-development` |
| 1e. Views and plugin roles | A plugin view appears in the sidebar, gated by role | Same, after 1d. Decision 9 in the ecosystem spec (replacing the `app_type` enum) is up for review in this slice |
| 1f. GIS contributions | The first spatial statistics tool works on `gis.toolbar` and map layers through `MapSpec` | Same, after 1e |

Milestone 1 is done when the epidemiology plugin and the Mozambique pack install and work as first-party plugins.

Milestone 2 is the sandbox: `.ava` files, `ava plugin build` and `dev`, file installs marked Unverified, an opaque-origin iframe plus Worker, Remote DOM, and permission checks in the broker. The ecosystem spec says to run the browser-support spike first. Do not start it until Pablo says Milestone 1 is done.

## Environment

- **Supabase:** this worktree should stay on its switched project `feat-plugins-columns` (API 55321, Vite 6173). Confirm with `node apps/ava-cli/dist/main.cjs supabase status` before any database command. Never run `pnpm db:reset` while the worktree points at the shared `avandar` stack. Slice 1c added no migration. A reset is only needed if the next work is schema or E2E.
- **The global `ava` binary is stale.** It points at another worktree. Use `pnpm --filter @avandar/ava-cli build`, then `node apps/ava-cli/dist/main.cjs`. Do not relink the global binary.
- Never stage `supabase/config.toml` or `.env.development`.
- The epidemiology plugin's `query:addColumns` permission may still need one admin approval in Settings, then Plugins, on the demo workspace, or its commands stay hidden there. Slice 1c added no new permission. `fitRegression` is offered only when the install status is `installed`, which already requires `data:context` and `query:addColumns`.

## Kickoff prompt for the new session

> Read `docs/superpowers/2026-11-10-plugins-1c-handoff.md` in `~/src/worktrees/avandar/feat/plugins-columns`. The slice is local on that branch and is not pushed. Ask me whether to finish 1c (whole-branch review, then the live eval if `~/cleaned-test-data` is available) or to sync with `origin/demo/measles` and start slice 1d. Do not push or merge unless I ask in this session.
