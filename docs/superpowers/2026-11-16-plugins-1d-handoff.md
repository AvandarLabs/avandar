# Handoff: Plugins Slice 1d built, not merged

**Date:** 2026-11-16
**From:** the session that planned and built Slice 1d (data slots, content, install wizard)
**For:** a new session continuing the plugin ecosystem work

> **Do not merge anything into `demo/measles` without Pablo's explicit approval.** The owner has said that nothing from this slice, or any other branch, is to be merged there until they approve it in that session. Nothing is pushed or merged today. A push to `demo/**` deploys.

## Start here

1. Read this whole document.
2. The work is on `feat/plugins-slots`, in `~/src/worktrees/avandar/feat/plugins-slots`. Do not check out that branch in another worktree. Load the `using-wt` skill before creating or removing any worktree.
3. Nothing from this slice is pushed. Do not push, and do not merge, unless Pablo asks in that session.
4. The merge target is `demo/measles`, never `develop`. A push to `demo/**` deploys.
5. The pre-push hook translates new strings with an LLM and formats files. The catalogs were extracted and compiled twice (`ac8b31f80`, then `53b0b4259`). The non-English locales still have untranslated `msgid`s, so the first push will run the translation. Audit it as the 1b handoff describes (`git diff --no-ext-diff -- 'src/i18n/locales/*.po'`, only `msgstr` filled, no `msgid` removed, placeholders kept, `grep -a` for `.po` files).
6. Run `git fetch origin && git rev-list --left-right --count origin/demo/measles...HEAD` before new work. At `53b0b4259` on 2026-11-16 the count was `0 63`. Measles moves several times a day, so the numbers go stale. If the branch is behind, bring it up to date first. After pulling measles, use `pnpm install --frozen-lockfile`. Do not let `pnpm install --lockfile-only` re-resolve.
7. The branch's migration `supabase/migrations/20261116192935_add_plugin_data_slots.sql` is the only migration of this slice and sorts after measles' newest one at the last sync (`20261114213908_crosswalks.sql`). Its desktop counterpart is `apps/desktop/migrations/20261116192935_add_plugin_data_slots.gen.sql`. If measles adds a newer migration before this merges, check the order again.

Ask Pablo what to pick up. The unfinished part of 1d is below. The next slice (1e) has no spec yet.

## Where things stand

Slice 1d is implemented on this branch only. It is not on `origin/demo/measles` and it has not been deployed. The branch has 63 commits that measles does not have and is 0 commits behind it. The diff is 234 files, about 43,000 added lines. The plan file alone is about 21,500 of those.

The 1d leftovers are on `fix/plugins-leftovers`, not merged, and they add a migration (`supabase/migrations/20261116222442_harden_plugin_data_slot_bindings.sql`).

| Work | State | Docs |
| --- | --- | --- |
| Slice 1a, plugin core and toolbar commands | On `demo/measles` | `docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md` |
| Slice 1b, viz types and derived columns | On `demo/measles` | `docs/superpowers/2026-11-09-plugins-1b-handoff.md` |
| Slice 1c, AI tools | On `demo/measles` (`964bf7489` is an ancestor of `origin/demo/measles`). The branch also took a sync commit from measles (`14e144978`) | `docs/superpowers/2026-11-10-plugins-1c-handoff.md` |
| Slice 1d, data slots, content, install wizard | Local commits on `feat/plugins-slots`, tip `53b0b4259` when this was last updated. Not pushed | Spec `docs/superpowers/specs/2026-11-11-plugins-1d-data-slots-design.md`. Plan `docs/superpowers/plans/2026-11-11-plugins-1d-data-slots.md` |

Architecture spec for the whole ecosystem: `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`. Milestone 1 still has 1e and 1f after 1d.

## What 1d built

A plugin can declare `dataSlots`: the shape of the data it needs, such as a `Case` with an onset date and a district. An admin binds each slot to a case type or a dataset, attribute by attribute, in the install wizard or later on the plugin card. A command reads a bound slot with `avandar.data.querySlot`, through a query handle, with the current user's own data access. A plugin can also declare `content` (bundled CSV datasets) and ship with no code. Installing it imports each chosen item as an ordinary workspace dataset. The install flow is a wizard that shows only the steps a manifest needs: Review, Data slots, Content, Confirm. The epidemiology `cases` slot drives a new Case epicurve command, and the new Mozambique pack imports province and district boundaries.

| Area | Where |
| --- | --- |
| Manifest: `dataSlots`, `contributes.content`, the `data:slots` permission, a plugin with no `entry`, reserved built-in AI tool names (`cae365908`, plus `plan_query` in `7bcce710d`), attribute keys that differ only by case rejected | `packages/shared/plugin-manifest/src/PluginManifest/PluginDataSlotSchema.ts`, `PluginContentSchema.ts`, `PluginManifestSchema.ts`, `makeComparableAiToolName.ts`, `src/compileManifest/compileManifest.ts`, `src/node/readPluginDirectory.ts` |
| Build: bundled content files become lazy asset URLs, no-code plugins build, the bundle check works again with a 43,000 byte host budget | `scripts/vite-plugin-ava-plugins/` (`makePluginModuleSources`, `checkPluginBundle`, `pluginModuleIds.ts`, `makeOptimizeDepsEntriesFromPlugins`), `apps/ava-cli/src/PluginCli/ValidatePluginCli/ValidatePluginCli.ts` |
| SDK and UI kit: `querySlot` and `openDataSlotBinding` types, the data slot error codes, `Bar` and `Switch` | `packages/web/plugin-sdk/src/PluginApi.types.ts`, `PluginError/PluginError.ts`, `packages/web/plugin-ui/src/index.ts`, `charts.ts` |
| Database: `plugin_data_slot_bindings` and `plugin_content_imports` tables, a `source_type` enum, the save-binding RPC, the install RPC (writes the install and its bindings atomically), a trigger that stamps `bound_by` from `auth.uid()`, a trigger that requires a source id (`tr__plugin_data_slot_bindings__check_source`), pgTAP suites | `supabase/schemas/11.plugin_data_slot_bindings.sql`, `11.plugin_content_imports.sql`, `00.enum.plugin_data_slot_bindings__source_type.sql`, `50.rpc_plugin_data_slot_bindings__save.sql`, `50.rpc_plugin_installations__install.sql`, `supabase/migrations/20261116192935_add_plugin_data_slots.sql`, `supabase/tests/database/` |
| Desktop sync: the new tables, their generated SQLite migration, and a reformat of two earlier generated migrations | `apps/desktop/sync/syncable-tables.ts`, `apps/desktop/migrations/20261116192935_add_plugin_data_slots.gen.sql` |
| Models and clients | `shared/models/PluginDataSlotBinding/`, `shared/models/PluginContentImport/`, `src/clients/plugins/PluginDataSlotBindingClient/`, `PluginContentImportClient/`, `PluginInstallationClient/` |
| Shared slot logic: load a binding's source, check a binding against it, status, SQL from a binding, run the query | `src/lib/pluginDataSlots/` (`loadDataSlotSource`, `makeDataSlotSourceFromConcept`, `makeDataSlotSourceFromDataset`, `isDataTypeAcceptedBySlotAttribute`, `checkDataSlotBinding`, `getDataSlotBindingStatus`, `makeDataSlotSqlFromBinding`, `runDataSlotQuery`) |
| Command runtime for `querySlot`. Errors the plugin sees are generic, calls run one at a time, at most 3 handles stay readable, the host and install status are re-checked on every call | `src/lib/plugins/dataSlots/makeDataSlotApiForInvocation/`, `src/lib/plugins/makePluginApi/`, `runPluginCommand/`, `fetchRowsForInvocation/`, `QueryHandleRegistry/` |
| Install wizard. Mantine `Stepper` in a large modal. It cannot close while imports run, and focus returns to the Install button or card heading | `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/` (`getInstallWizardStepsFromManifest`, `useInstallWizardState`, `useInstallPlugin`, `openPluginInstallWizard.tsx`) |
| Binding form and live check preview | `.../WorkspacePluginsTab/DataSlotBinding/` (`DataSlotBindingForm`, `DataSlotPanel`, `DataSlotCheckPreview`, `openDataSlotBindingModal.tsx`) |
| Content import | `.../WorkspacePluginsTab/pluginContent/` (`importPluginContentItem`, `useImportedPluginContent`) |
| Plugin card: data slots and content sections, remove binding, per-row status | `.../WorkspacePluginsTab/PluginSettingsCard/` (`PluginDataSlotsSection`, `PluginContentSection`, `PluginActions`, `usePluginInstallationActions`) |
| Chart settings: an unreadable stored config shows a Reset notice, keys named like object members are read safely | `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/` (`UnreadablePluginVizSettings.tsx`, `pluginVizSettingFormHelpers.ts`) |
| Moved module: `assertSingleSqlExpression` left the plugin host folder, because newer crosswalk code imports it statically and it counted against the host budget | `src/lib/sql/assertSingleSqlExpression/` (was `src/lib/plugins/derivedColumns/`) |
| Epidemiology: the `cases` slot, the `data:slots` permission, the Case epicurve command and modal (chart, stacking, "Show as table", a note for uncharted records) | `plugins/epidemiology/ava.yaml`, `src/index.tsx`, `src/caseEpicurve/CaseEpicurveModal/`, `locales/en.json` |
| Mozambique pack: no code, no entry, no permissions. Two datasets from geoBoundaries gbHumanitarian (CC BY 3.0 IGO) | `plugins/mozambique/` (`ava.yaml`, `content/mz-adm1.csv`, `content/mz-adm2.csv`, `content/README.md`), listed in `plugins/bundled.yaml` |
| Boundary build script. Rerun with `pnpm vite-script scripts/plugins/buildMozambiqueBoundaries.ts` | `scripts/plugins/buildMozambiqueBoundaries.ts`, `scripts/plugins/mozambiqueBoundaryHelpers/` |
| E2E (each ran green on its own) | `tests/e2e/plugins-mozambique-install.spec.ts`, `plugins-epidemiology-case-slot.spec.ts`, `-regression.spec.ts`, `-incidence.spec.ts`, `-epicurve.spec.ts`, helpers `tests/e2e/helpers/pluginFlow.ts`, `CaseTypeSeedHelpers.ts`, fixture `tests/data/case-line-list/case-line-list.csv` |
| Docs | `docs/plugin-authoring.md` section 13 (read records an admin chooses) and section 14 (bundle datasets), the package READMEs under `packages/`, the 1d spec and plan |
| Strings | `src/i18n/locales/*/messages.po`. English is extracted and compiled. The other seven locales still have untranslated `msgid`s, which the pre-push hook translates |

Facts a new session will not guess:

1. **Binding is the permission grant, but the database does not prove the source is readable.** The binding stores a case type or dataset id and an attribute map. `querySlot` checks the current user's access when it reads. A source that is deleted later leaves both ids null, which the check constraint allows on purpose (`on delete set null` needs it). `getDataSlotBindingStatus` then reports the binding as `broken` with a `source_missing` problem, and the card lists it. A binding can no longer be created without a source: see fact 5.
2. **`bound_by` is stamped by a trigger.** `tr__plugin_data_slot_bindings__stamp_bound_by` (commit `76076ed4f`) overwrites it from `auth.uid()`. A review found the RPC argument could be spoofed.
3. **A plugin's `querySlot` errors are deliberately vague.** The plugin sees `CommandFailed` with a fixed message, so it cannot learn why a source was unreadable.
4. **Existing Epidemiology installs show "needs review"** until an admin approves the new `data:slots` permission in Settings, then Plugins. The spec expected this.
5. **A binding needs a source when it is written.** `tr__plugin_data_slot_bindings__check_source` (`0e4d8818b`, refined in `7bf09f378`) requires the id named by `source_type` to be non-null on insert and when the type changes. A missing `source_type` reports the not-null error. A direct write that nulls the id is refused. The `on delete set null` cascade is exempt through `pg_trigger_depth() > 1`, and the cascade no longer restamps `bound_by`, so a binding whose source is deleted later is still Broken. Any future writer of that table from inside a trigger would be exempt from this check too.

## Where 1d left off

Do these before treating the slice as finished. None of them are a new slice.

1. **Verification, last full run (2026-11-16).** `pnpm test:frontend` ran 1,432 files that pass and 1 that fails (the maplibre file in item 2, pre-existing). Plugin package tests: manifest 217, sdk 50, ui 11. `pnpm test:executed` 37, `pnpm test:ava-cli` 712, `pnpm test:db` 124 files and 1,834 tests. These all exit 0: `tsc -b`, `pnpm type-check:deno`, `eslint .`, `pnpm check:plugin-bundle` (host budget 43,000 bytes), `pnpm verify:packages`, `pnpm desktop:sqlite:check-migrations`, `ava plugin validate`. Plugin E2E specs `plugins-mozambique-install`, `plugins-epidemiology-case-slot`, `-regression`, `-incidence` and `-epicurve` passed. The first three were re-run last, after the final schema change.
2. **One frontend test file fails at import, and it is not ours.** `src/routes/_auth/$workspaceSlug/dashboards/edit/-$dashboardId.test.tsx` fails with `TypeError: window.URL.createObjectURL is not a function` from maplibre-gl at module load in jsdom. It fails identically on a clean checkout of `origin/demo/measles` (`c3bb19d8c`), so this branch did not cause it. Closed after the handoff was first written (see below).
3. **Live AI eval, 2026-11-16,** with `pi` and `anthropic/claude-haiku-5.5`, the default 45 questions. It scored 42/45, the same as 1c. The full run failed H06, N04, and N09. On reruns H06 and N09 passed 3 of 3 and N04 failed 2 of 3 (it also failed in 1c). N02, a 1c failure, passed. R01 failed once because the model wrote "2x" and the old grader pattern (`\b2\b`) wanted a standalone 2. It then passed 3 of 3. `d2f76e218` changed the grader to accept a slope written as a coefficient such as "2x" and to reject 2.5 and 12x. That is stricter than before, because the old regex also matched the 2 in 2.5. R01 is expected to pass after the grader change, but it was NOT re-run. The pi harness calls the epidemiology `fitRegression` handler directly and never installs the plugin, so it does not exercise slots. No harness change was needed.
4. **Manual headless check of the done-when,** with screenshots in the gitignored `.temp/feat-plugins-slots/`. The Mozambique install imports both datasets. They appear in Data Sources and in the Maps boundary picker (the picker lists every workspace dataset, not only these). The Epidemiology `cases` slot binds, and the Case epicurve renders bars, stacking, and "Show as table". It found epoch milliseconds shown for dates in the check preview, which `7db64748b` fixed.
5. **Deviations from the plan,** all in the code now:
   - The Task 10 schema gained the `bound_by` trigger (`76076ed4f`).
   - `assertSingleSqlExpression` moved to `src/lib/sql/` (`16b1df138`). The docs under `docs/measles-demo` and two 1b docs still named the old path when this was written. Closed after the handoff was first written (see below).
   - The manifest rejects slot attribute keys that differ only by case, because DuckDB identifiers are case-insensitive (`754207c6c`).
   - `plan_query` joined the reserved AI tool names (`7bcce710d`).
   - After a security review of the runtime: errors the plugin sees are generic (`CommandFailed`), calls run one at a time per invocation, at most 3 slot handles stay readable per invocation, the host and install status are re-checked on every call, and a host change aborts (`29450f90d`, `76fb6664f`).
   - The wizard modal cannot close while imports run, and focus returns to the Install button or card heading (`77470c919`, `f0da258a3`).
   - An unreadable stored plugin chart config shows a Reset notice (`eff10ca51`).
6. **Sync with `origin/demo/measles` before any merge.** Last synced 2026-11-16, 0 behind. Check the count again.
7. **Push and merge only when Pablo asks,** each time, and never into `demo/measles` without their explicit approval. Merge with `--no-ff` in a temporary worktree from `origin/demo/measles`, confirm the merge tree equals the tested branch, then `git push origin HEAD:demo/measles`. The branch adds a migration, so tell Pablo that before asking for the go-ahead.

## Open follow-ups

None of these block 1e. Ask Pablo before picking one up.

### Closed by 1d

| From | Item | Closed by |
| --- | --- | --- |
| 1c, follow-up 1 | A plugin AI tool named `run_query` was not rejected | `cae365908` reserves the data agent's built-in tool names. `7bcce710d` adds `plan_query` |
| 1b, follow-up 8 | The dashboard editor's plugin settings panel could crash on a hand-corrupted config | `eff10ca51` shows a Reset notice. `57a1e6407` reads keys named like object members safely in the form helpers |
| 1d spec hardening goal | `pnpm check:plugin-bundle` failed | `4f76b376b`. The host budget is now 43,000 bytes. The check prints only on failure |

The other 1c follow-ups (2 to 7) and 1b follow-ups (1 to 7 and 9) are untouched.

### Closed after the handoff was first written

| Item | Closed by |
| --- | --- |
| A binding could be created without a source | Trigger `tr__plugin_data_slot_bindings__check_source`. `0e4d8818b` (schema and migration), `b31a1f6f4` (tests), refined by `7bf09f378` (the set-null cascade no longer restamps `bound_by`, a missing `source_type` reports the not-null error) and `18da7ab52` (tests). The rule is in fact 5 above |
| Unguarded chart setting reads in three places: `PluginVizSettingControls.tsx`, `PluginVizConfiguredChart.tsx` (under `src/lib/plugins/vizs/PluginVizRenderer/`) and `AvaPluginVizConfigs.ts` (under `shared/models/vizs/AvaPluginVizConfig/`) | `c9b2143c0` |
| The uninstall dialog did not say that imported datasets stay | `8a136c6de`. The dialog now says the datasets a plugin imported stay in Data Sources. Behavior is intentionally unchanged |
| The Case epicurve Interval indicator was a thin offset sliver on first open | `61284b6be`. The root cause was measurement during the modal's scale-in animation. A `SegmentedControl` wrapper in plugin-ui re-measures after the transition. E2E runs with reduced motion, so it cannot catch this class of bug |
| The Case epicurve chart was clipped at 1280 wide | `84bc04847`. The chart now fits its container |
| The R01 grader accepted only a standalone "2" | `d2f76e218`. It now accepts a slope written as a coefficient such as "2x" and rejects 2.5 and 12x. It is stricter than before: the old regex also matched the 2 in 2.5 |
| Lingui catalogs were stale | Extracted and compiled twice, in `ac8b31f80` and `53b0b4259`. Non-English locales still have untranslated `msgid`s that the pre-push hook translates |
| Grants and probe ordering on `plugin_data_slot_bindings` (follow-up 1) | `46b4e1cbc`. The workspace check trigger is gone, so RLS refuses a non-member before any id is looked up. UPDATE is granted only on the columns a rebind changes |
| Composite foreign keys instead of the workspace trigger (follow-up 2) | `46b4e1cbc`. The installation, concept and dataset links are composite foreign keys that include `workspace_id` |
| Missing indexes on the binding and content import tables (follow-up 3) | `46b4e1cbc`. Indexes on `workspace_id`, `concept_id` and `dataset_id` in `plugin_data_slot_bindings`, and on `dataset_id` in `plugin_content_imports` |
| Permission errors on a case type are not `PermissionDenied` (follow-up 4, first half) | `f0f83c78d`. An unreadable case type now reports `PermissionDenied`. The second half, that `querySlot` does not check `case_records__can_view_record`, stays as the owner chose |
| Dataset-ready toasts show the file name (follow-up 6) | `661e1aefc`. The toast names the dataset, not the bundled file |
| A struct cell in the check preview renders `[object Object]` (follow-up 7) | `6ece22172` shows struct cells as JSON. `54c295a2d` keeps typed arrays as lists. The check preview and the Data Explorer grid share `makeDataGridColumnDefs`, so both change |
| Dead exports (follow-up 8) | `2ede7b5b9`. `PluginDataSlotAttributeSchema` and `DATA_SLOT_ACCEPTED_DATA_TYPES` are now module-private. `DATA_SLOT_ATTRIBUTE_TYPES` stays exported because it is documented as public API |
| Docs name the old `assertSingleSqlExpression` path (follow-up 9) | `2ede7b5b9` and `c4a4a848c`. The docs point at `src/lib/sql/assertSingleSqlExpression/` |
| The maplibre `createObjectURL` test failure (follow-up 10) | `471d12005`. The dashboard editor route test mocks maplibre-gl. The file passes in the `pnpm test:frontend` run on 2026-11-16 |
| The host error text is English inside translated sentences (follow-up 12) | `0e287f8cc`. Raw error details are kept apart from translated sentences. The detail text is still English, because it comes from DuckDB, Supabase or the network |

### Still open

None of these block 1e. Ask Pablo before picking one up.

- **5.** **A command can retain the `avandar` object and call `querySlot` from an AI tool handler.** `docs/plugin-authoring.md` section 13 documents this as forbidden. It is not enforced and cannot be while plugins run in the host's JS context.
- **11.** **Local state, now moot:** the `avandar-labs` workspace had a Free subscription row from manual verification. The database was re-seeded, so the row is gone.
- **13.** **Header count changes in two older generated desktop migrations.** The desktop `.gen.sql` reformat touches `apps/desktop/migrations/20261109134745_gadgets_search_stored_prompt.gen.sql` and `apps/desktop/migrations/20261109155144_catalog_loadable_search.gen.sql` (one line each).

## What comes next in the plugin project

Milestone 1 is first-party plugins, bundled in-process. Permissions are declared, not enforced, until Milestone 2. Do not start the sandbox in Milestone 1.

| Next | Done when | How to start |
| --- | --- | --- |
| 1e. Views and plugin roles | A plugin view appears in the sidebar, gated by role. The ecosystem spec lists it as "A catch-all route, sidebar links, per-plugin app roles, chat page context, plugin storage" | No spec yet. `brainstorming`, then `writing-plans`, then `subagent-driven-development`. Decision 9 in the ecosystem spec is up for review in this slice |
| 1f. GIS contributions | The first spatial statistics tool works on `gis.toolbar` and map layers through `MapSpec` | Same, after 1e |

The 1c handoff queued the same two slices, with the same "done when" and the same note on decision 9. The ecosystem spec says Decision 9 is "up for review in slice 1e": replacing the `app_type` enum with an `apps` table is roughly a 300 to 600 line migration through every RLS policy, and a cheaper alternative keeps `app_type` for the built-in apps and adds a separate `plugin_app_roles` table with its own role-check helper. Read that section of `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md` before brainstorming 1e.

The 1d spec lists these as non-goals. They are deferred, and no spec assigns them to 1e or 1f yet. Do not fold them into 1e without asking Pablo:

- AI slot prefill, ranking candidates by a data profile, and binding to another plugin's content.
- Checking `geo.admin1` and `geo.admin2` values against known boundaries.
- `querySlot` for AI tool handlers. The spec says a tool that aggregates every bound record without anyone looking at it needs its own privacy review.
- The wizard's Dependencies, Settings and services, and Access steps.
- A keep-or-delete choice per content item at uninstall. Imported datasets are always kept.
- Registry-hosted content, `.ava` files, and permission enforcement (Milestones 2 and 4).
- Content kinds other than `dataset`, and content formats other than CSV.

Milestone 1 is done when the epidemiology plugin and the Mozambique pack install and work as first-party plugins. Milestone 2 is the sandbox: `.ava` files, `ava plugin build` and `dev`, file installs marked Unverified, an opaque-origin iframe plus Worker, Remote DOM, and permission checks in the broker. The ecosystem spec says to run the browser-support spike first. Do not start it until Pablo says Milestone 1 is done.

## Environment

- **Supabase:** this worktree is on its switched project `feat-plugins-slots` (API 55321, DB 55322, Studio 55323, Vite 6173). Confirm with `ava supabase status` (or `node apps/ava-cli/dist/main.cjs supabase status`) before any database command. Never run `pnpm db:reset` while the worktree points at the shared `avandar` stack. The branch adds a migration, so a reset is needed after pulling in schema changes.
- **After `ava supabase switch`,** run `pnpm fns:update-env`. Without it, edge functions crash with "supabaseKey is required".
- **`pnpm db:reset` wipes the seed** on the switched stack. Run `pnpm db:seed` (only on a switched stack) before manual checks.
- **pgTAP fixtures must clear `request.jwt.claims` after `reset role`.** `set_config` survives the role reset and stamps later fixture rows with the earlier user.
- **E2E runs with reduced motion,** so animation-timing bugs need a manual check with `page.emulateMedia({ reducedMotion: "no-preference" })`.
- **`pnpm dev` dies here** because ngrok is unauthenticated (`ERR_NGROK_4018`). Run `npx concurrently --names "vite,functions" --prefix "{name}" "vite --host 127.0.0.1 --port 6173" "pnpm fns:serve"`, or let Playwright's `webServer` start them for E2E.
- **Too many running Supabase stacks make E2E time out.** Count them with `docker ps -q | wc -l` before an E2E run.
- **zsh does not word-split an unquoted `$(...)` list,** so `oxfmt $(git diff ...)` formats nothing. Pipe through `xargs`.
- **The root vitest config excludes `packages/**`.** Run vitest inside the package directory. An unscoped `pnpm vitest run` is slow, so always scope it.
- **The global `ava` binary may be stale.** Prefer `pnpm --filter @avandar/ava-cli build`, then `node apps/ava-cli/dist/main.cjs`. Do not relink the global binary.
- Never stage `supabase/config.toml` or `.env.development`.
- The epidemiology plugin needs an admin to approve the new `data:slots` permission in Settings, then Plugins, on any workspace where it is already installed. Until then its commands stay hidden and the card says "needs review".

## Kickoff prompt for the new session

> Read `docs/superpowers/2026-11-16-plugins-1d-handoff.md` in `~/src/worktrees/avandar/feat/plugins-slots`. The slice is local on that branch and is not pushed. Ask me whether to finish 1d (sync, then review the translation audit before a push), take one of the open follow-ups (the maplibre test failure is confirmed pre-existing), or start slice 1e. Do not merge anything into `demo/measles` without my explicit approval. Do not push unless I ask in this session.
