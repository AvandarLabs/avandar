# Handoff: Plugins Slice 1b complete, what comes next

**Date:** 2026-11-09
**From:** the session that planned and built Slice 1b Part B (derived columns)
**For:** a new Claude Code session continuing the plugin ecosystem work

## Start here

1. Read this whole document.
2. Work in the existing worktree `~/src/worktrees/avandar/feat/plugins-columns` (branch `feat/plugins-columns`). It was fast-forwarded to `origin/demo/measles` at `32a16aa59` and its dependencies are installed. Load the `using-wt` skill before creating or removing any worktree.
3. Run `git fetch origin && git rev-list --left-right --count origin/demo/measles...HEAD` first. `demo/measles` moves several times a day. If the branch is behind, bring it up to date before starting new work.
4. Ask Pablo what to pick up: a follow-up from "Open follow-ups" below, or the next slice (1c, AI tools). The next slice has no spec yet, so it starts with the `brainstorming` skill, then `writing-plans`, then `subagent-driven-development`, the same flow the earlier slices used.

## Where things stand

Everything below is merged into and pushed to `origin/demo/measles`, and deployed to the demo by `demo.yaml`.

| Work | State | Docs |
| --- | --- | --- |
| Slice 1a, plugin core and toolbar commands | Merged | Spec `docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`, plan `docs/superpowers/plans/2026-11-06-plugins-1a-core-commands.md` |
| Slice 1b Part A, plugin chart types (epicurve, rate plot) | Merged | Spec `docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`, plan `docs/superpowers/plans/2026-11-07-plugins-1b-part-a-viz-types.md` |
| Slice 1b Part B, derived columns | Merged as `e2f65917e` plus `ce256e01d` (translations). Deploy succeeded | Same spec, "Part B". Plan `docs/superpowers/plans/2026-11-09-plugins-1b-part-b-derived-columns.md` (its "Decisions made while planning" and "Known risks" sections explain the design) |
| Pablo's follow-up: a rolling average with no value column counts each row as 1 | On `demo/measles` as `f6fecb818` | See "Changes after the merge" |

Architecture spec for the whole ecosystem: `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`. Its "Milestone 1" table lists the remaining slices: 1c AI tools, 1d data slots and content, 1e views and plugin roles, 1f GIS contributions.

## What Part B built

A Data Explorer toolbar command can call `avandar.dataExplorer.addColumns([{ name, expression, inputs }])`. The host checks each expression, wraps the explorer's SQL so row order is kept, runs it, keeps the chart on its existing columns, and shows a "Columns added" notification with **Undo**.

| Area | Where |
| --- | --- |
| SDK types: `DerivedColumn`, `AddColumnsResult`, `avandar.dataExplorer`, `ui.closeModal`, the `InvalidExpression` error code | `packages/web/plugin-sdk/src/PluginApi.types.ts`, `PluginError/PluginError.ts` |
| `query:addColumns` permission and its line on the plugin card | `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection.tsx` |
| `SegmentedControl` in plugin UI | `packages/web/plugin-ui/src/index.ts` |
| Expression check: one scalar or window expression, no clauses, no `;`/`--`/`/*`, and a deny-list of file, query, and extension functions (`read_*`, `query*`, `glob`, `current_setting`, `sqlite_*`, `postgres_*`, and others) | `src/lib/plugins/derivedColumns/assertSingleSqlExpression/` |
| Placeholder binding, name rules, `_2`/`_3` clash suffixes, the row-order CTE, reserved `__ava_row` | `src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/` |
| Invocation glue and the bridge type | `src/lib/plugins/derivedColumns/addColumnsForInvocation/`, `src/lib/plugins/DataExplorerBridge.types.ts`, `makePluginApi/`, `runPluginCommand/`, `PluginMenuSlot/` |
| Data Explorer state: `applyDerivedColumnsSql`, `restoreDerivedColumnsSnapshot`, the `plugin_command` analytics trigger | `src/views/DataExplorerApp/DataExplorerStateManager/`, `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` |
| Column IDs survive the wrap (seeded bindings) | `src/views/DataExplorerApp/useQueryResultColumnBindings/` |
| The bridge, Undo, and the notification | `src/views/DataExplorerApp/useDataExplorerPluginBridge/`, `notifyDerivedColumnsAdded/` |
| Epidemiology commands: Incidence per 100k (Byar 95% CI) and Rolling average | `plugins/epidemiology/src/incidence/`, `rollingAverage/`, `derivedColumns/`, `ava.yaml`, `locales/en.json` |
| Docs | `docs/plugin-authoring.md`, section "6. Add columns to the Data Explorer query" |
| E2E | `tests/e2e/plugins-epidemiology-incidence.spec.ts` (incidence, Undo, then the rate plot's whiskers) |

Two design facts a new session will not guess:

1. **The SQL analyzer is not what stops file reads in a derived column.** `DuckDbSqlAnalyzer` only inspects functions after `FROM`/`JOIN`. The host deny-list in `assertSingleSqlExpression` and DuckDB's binder ("table function used as a scalar function") are what stop `read_csv(...)`. A deny-list is never complete, so keep the binder test (`makeDerivedColumnsSqlFromColumns/__tests__/*.executed.test.ts`) when touching this.
2. **The wrapped SQL gets fresh column IDs unless the bindings are re-keyed.** `applyDerivedColumnsSql` re-keys the column bindings to the wrapped SQL, and `useQueryResultColumnBindings` prefers a seed registry whose key matches. Undo restores the original bindings the same way. Removing either half makes the user's chart go blank after a command runs.

## Changes after the merge

`f6fecb818` (Pablo, "count each line-list row when no value column is set") changed Part B code after it merged:

- `rolling.average` now shows when `dateColumnCount gte 1` only. The value column is optional.
- With no value column, the command adds `count_<n>d_avg` (or `_<n>w_avg`), computed as `count(*) OVER (<frame>) / <window days>.0`, so a day with no rows counts as zero.
- New plugin strings: `rollingAverage.valueColumn.none`, `rollingAverage.valueColumn.clear`, `rollingAverage.eachRowCounts`. `viz.epicurve.countColumn` and `rollingAverage.missingColumns` changed.

The Part B plan still describes the older behavior (a required numeric value column). It is a record of what was planned, so read the code for current behavior. `docs/plugin-authoring.md` only lists the rolling-average files, so it needs no change.

## Open follow-ups

None of these block anything. Ask Pablo before picking one up.

### From Part B reviews

1. **Translated host errors.** `PluginError` messages are English only and reach users through `incidence.failed` and `rollingAverage.failed` as `{message}`.
2. **Auto LIMIT baked into the wrap.** When the query came from the query builder with no SQL of its own, `executedSql` includes the explorer's automatic row limit, and the wrap keeps it. Documented in `docs/plugin-authoring.md`. A fix would wrap `selectSqlToExecute`'s SQL without the auto limit.
3. **Column names with `;`, `--`, or `/*`** can never be `addColumns` inputs, because the expression check runs after quoting. Documented.
4. **React Doctor warning** "Array lookup inside a loop" at `plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.ts:35`. Column lists are small.
5. **Small test gaps:** no test that a second click is ignored while `addColumns` is pending (Mantine's loading button handles it). No test that `getDataExplorerBridge` runs exactly once and after `getContext` (the `PluginMenuSlot` level covers it). In `pluginDerivedColumns.integration.test.tsx`, the stand-in slot repeats the column definition instead of reusing `DOUBLE_REVENUE`.
6. **Rolling-average group-by state.** If the user picks the group-by column as the value column, the group-by is dropped from the payload but stays in form state, and reappears if they change the value column again. The submitted payload is always correct.
7. **The Undo button's accessible name** is just "Undo". "Undo added columns" would read better to a screen reader.

### From Part A (carried over, still open)

8. The dashboard editor's plugin settings panel can crash on a hand-corrupted plugin config (`PluginVizSettingControls`). Validate with `AvaPluginVizConfigSchema` before drawing controls.
9. Chart type icons are not shown in the picker. The manifest-string localizer is repeated in five places. Plugin model types are imported from `.types.ts` instead of the namespace. A version 0 dashboard block silently ignores plugin picks. No E2E covers the signed-in dashboard view.

## Environment state

- **Supabase:** the worktree is switched to its own project `feat-plugins-columns` (API 55321, Vite dev server 6173). Its database is behind `demo/measles`, which has added migrations since (for example `20261109082310_...`, `20261109103343_add_places_datasets.sql`, `20261109134745_...`, `20261109155144_...`). Before an E2E, confirm the switch, then bring the database up to date with `pnpm db:reset` on this switched project. Never run it while the worktree points at the shared `avandar` stack.
- **The global `ava` binary is stale.** It points at `~/src/worktrees/avandar/fix/sheets-e2e`. Use this worktree's build: `pnpm --filter @avandar/ava-cli build`, then `node apps/ava-cli/dist/main.cjs supabase status`. Do not rebuild the global link without asking Pablo, since other worktrees use it.
- **Restore before leaving:** when this worktree is done, `ava supabase restore` (with the local build), then `git checkout -- supabase/config.toml` if the restore leaves a stale copy. Never stage `supabase/config.toml` or `.env.development`.
- **Demo workspace:** after the Part B deploy, the epidemiology plugin's new `query:addColumns` permission needs one admin approval in Settings → Plugins, or its commands and charts stay hidden there. Ask Pablo whether he has done it.
- **Downloads folder:** the Part B plan, the earlier handoff, and their PDFs are in `~/jpsyx-downloads/avandar_plugins-columns/plugin-ecosystem/`.

## How the previous sessions worked (keep doing this)

- **Plan drafting:** gather the facts first with a read-only investigator, then write a shared contracts file (names, paths, signatures, decisions). Next, one or two drafters write the plan tasks and apply each one in their own scratch worktree (`wt new chore <name> origin/demo/measles`, removed with `wt rm` afterwards). That made the plan's code real: 18 of 19 Part B tasks applied with no changes.
- **Execution:** split the plan into one file per task and write a shared brief (rules, worktree, process, report format). Then run one implementer per task: Sonnet for well-specified tasks, the default model for integration-heavy ones. One reviewer does both stages in order, spec compliance then code quality. Fix every Important finding and the cheap Minor ones, then re-review the fix.
- **Final review:** the whole-branch review is where the real gaps turn up. In Part B it found that the SQL analyzer did not stop file reads, that a command could report success after the user left the Data Explorer, and the malformed-input crashes. Keep it, and ask it to try to break the security claims, not just read them.
- **Verification:** run every check on its own (format, lint, type-check, frontend tests, package tests, executed tests, catalog check, plugin validate, `verify:packages`, `check:plugin-bundle`, the plugin E2Es one at a time).

## Lessons learned

1. **Naming.** Exported functions use `make[Target]From[Source]` and `get[Target]From[Source]`. Private `_` helpers may use `_build...` (`docs/rules/typescript.md` allows it), never `_resolve...`.
2. **Never leave background processes running.** Put "kill everything you start, no artificial CPU load" in every implementer brief.
3. **Lockfile:** never let `pnpm install --lockfile-only` re-resolve during a rebase or merge. After pulling `demo/measles`, run `pnpm install --frozen-lockfile`.
4. **Rebase before merging.** `demo/measles` gained 19 commits during Part B and 185 more within hours of the merge. The only conflict was the compiled `messages.ts` files: take the upstream copy, run `pnpm i18n:extract && pnpm i18n:compile`, and check that no active `msgid` was removed.
5. **Merging into `demo/measles`:** merge with `--no-ff` in a temporary worktree from `origin/demo/measles`, confirm the merge tree equals the tested branch, then `git push origin HEAD:demo/measles`. Check first that the local `demo/measles` has no unpushed work from someone else. A push to `demo/**` deploys (`demo.yaml`, about 5 minutes; watch it with `gh run watch`).
6. **The pre-push hook translates new strings** with an LLM and blocks the push. Audit with `git diff --no-ext-diff -- 'src/i18n/locales/*.po'`: only `msgstr` filled, no `msgid` removed, placeholders such as `{columnList}` kept. Commit as `chore(i18n): ...` and push again. Plain `grep` treats `fr/messages.po` as binary, so use `grep -a`.
7. **Bundle budget:** `pnpm check:plugin-bundle` prints no byte count on success. To measure, set `HOST_BUDGET_BYTES` to 0 for one run and read the failure line. After Part B's host changes, headroom was about 324 bytes of 39,600.
8. **Plugin test limits:** plugin files, tests included, cannot import the repo's `tests/` helpers (`withDuckDb`). Executed tests in a plugin open their own `DuckDBInstance` and close it in `finally`. A function with both a unit test and an executed test keeps both in `<function>/__tests__/`.
9. **Toolbar crowding:** with more than two matching commands, all of a plugin's commands collapse into one "Plugins" menu. E2Es pick results that keep the commands they need as buttons.
10. **Subagent commit trailers:** Sonnet implementers sign commits as `Claude Sonnet 5.5`. That is accurate and was accepted.
11. **Pushes and merges need Pablo's explicit request each time.** Earlier approval does not carry over.
12. **Copy reviews matter.** Show Pablo copy options for anything prominent. For Part B he chose "keep current".

## Known issues on `demo/measles` (not plugin work; do not fix without asking)

These were true at `ce256e01d`. `32a16aa59` ("resolve type errors that break the demo build") may have fixed the first one. Recheck before trusting this list.

- Deno type-check fails at `supabase/functions/open-data/requestParquetCache/requestParquetCache.test.ts:237` (TS2345).
- `pnpm desktop:sqlite:check-migrations` reports drift for `20261109032546_individuals_assignment.gen.sql`.
- A rare test leak in `src/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftBlock.test.tsx`, and `withRateLimit`'s timing test can fail under full-suite load.

## Kickoff prompt for the new session

> Read the handoff at `docs/superpowers/2026-11-09-plugins-1b-handoff.md` in `~/src/worktrees/avandar/feat/plugins-columns`. Use superpowers. Bring the branch up to date with `origin/demo/measles`, then ask me whether to take a follow-up or start Slice 1c (AI tools). Do not push or merge without asking.
