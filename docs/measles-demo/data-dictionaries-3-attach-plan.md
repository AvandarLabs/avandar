# Data Dictionaries 3: Attach as Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let someone who can edit a dataset apply one or more dictionaries to it as reference: Avandar matches the dataset's columns to dictionary entries on the device, the user picks per column, and attaching stores a binding per column without changing a single value. Bound columns then show their code list in a popover (dataset page, Data Summary, Data Explorer grid), the dataset rail and the dictionary's Used by tab say where each dictionary is applied, and Ask Avandar reads the code lists online and offline, so "how many female cases" becomes `"GENDER" = 2`.

**Architecture:** One new table, `dataset_columns__dictionary_bindings`, stores a column's entry, code list, `mode`, and `direction`. It is select-only for signed-in users (rows follow the dataset's visibility) and is written whole per dataset by one SECURITY DEFINER RPC, `rpc_dataset_columns__apply_dictionaries`, which accepts `reference` only until conversions exist. Two shared, dependency-light models carry the logic: `ColumnCodes` (what a binding says about a column, and how prompts write it) and `DictionaryMatch` (scoring a profiled column against entries, deterministic). The apply flow is a two-step task view (Match columns, Attach) built on slice 2's profiling. Every model path that describes datasets gains the code lists: prompt `data-agent-v4` (online proxy and in-browser agent), the legacy schema block (case designer and the offline pipeline), the offline agent's profile and question values, and `lookup_values`.

**Tech Stack:** Supabase Postgres (declarative schemas, pgTAP), TypeScript, React 19, Mantine 9 (`Stepper`, `Table`, `Popover`, `Pill`, `Select`), TanStack Query and Router, zod 4, Lingui, DuckDB-WASM through QETL, the Pi data agent (`@earendil-works/pi-*`) online through the `chat` Supabase edge function and offline on WebLLM, ag-grid, Vitest, Playwright, the `scripts/ai-eval` harness.

**Spec:** [data-dictionaries-design.md](data-dictionaries-design.md), slice 3 of section 16. Read sections 3, 4, 5.2, 6.5, 7.1, 7.2, 7.4, 7.5, 10, 11, 12, 13, and 14 first. The Refinements at the end of this file override the spec where they differ; the four spec edits this plan made are listed there too.

**Scope:** Slice 3 only: the bindings table and apply RPC, applying dictionaries as reference, the code-list popover, the dataset rail group, the dictionary's Used by tab and "Apply to a dataset", the Save step's "Apply it to <dataset> next", the dataset menu's "Apply a dictionary" (and hiding "Create a dictionary from this dataset" once one is applied), Ask Avandar context, and evals. Out: conversions, linked datasets, converting in place, unmatched values, the preview drawer, Re-apply, the synced-data warning (all slice 4), crosswalks (slice 5), and "Add from datasets into an existing dictionary" (a separate small piece after this slice).

**Builds on:** slice 1 ([data-dictionaries-1-dictionaries-plan.md](data-dictionaries-1-dictionaries-plan.md), feature log F129) for the dictionary tables, `rpc_data_dictionaries__save`, the models, clients, and the Dictionary view; slice 2 ([data-dictionaries-2-inference-plan.md](data-dictionaries-2-inference-plan.md), F130) for `ColumnProfile` (the scorer), `profileDatasetColumns`, the create flow and its footer, `useListPaneToggle`, and `CreateDictionaryMenuItem`.

**Prototype:** `.impeccable/mocks/prototype/data-dictionaries.html` in this worktree (gitignored). `renderApply()`, `applyMatch()`, and `applyPane()` are the apply flow; `codesPopover()` and `renderDataset()` the dataset page; `dictUsed()` the Used by tab; `renderChat()` the Ask Avandar example. Open it in a browser and pick each surface in its guide.

---

## Before you start

Read once:

- `AGENTS.md` (root; `CLAUDE.md` is a symlink to it): scope, naming, comments, i18n, the Supabase switch stop condition, e2e rules.
- `docs/rules/typescript.md`, `docs/rules/sql.md` (Tasks 1 to 3), `docs/rules/testing.md`, `docs/rules/e2e-testing.md`, `docs/rules/i18n.md`.
- `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md` before Tasks 9 to 19. The apply flow is a new surface: load the `impeccable` skill before Task 14.
- `docs/ai-agent/eval.md` before Task 27.
- The code this plan reuses:
  - `supabase/schemas/50.rpc_data_dictionaries__save.sql` and `supabase/tests/database/data_dictionaries/rpc_data_dictionaries__save.test.sql`: the SECURITY DEFINER whole-set write and its `pg_temp.error_hint` test helper. The apply RPC copies both.
  - `shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts`: `getComparisonKey`, `getNameScore`, `SUGGESTION_SCORE`.
  - `src/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns.ts`: two queries per dataset, through QETL, on the device.
  - `src/views/DataManagerApp/NewDictionaryFromDatasetsView/`: the task-view frame (`NewDictionaryFooter`, the step bar, the step heading that takes focus on a step change).
  - `src/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/`: a table with a selected row and a side pane.
  - `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts` and its frozen-prompt tests.

House conventions:

- `shared/` imports siblings with `.ts` and never imports `src/`. `src/` imports shared through `$/` without the extension.
- Import a model's entry file and use its namespace (`ColumnCodes.T`, `DictionaryBinding.Input`). Files inside a model folder may import sibling `*.types.ts` files.
- Every user-facing string goes through Lingui (`<Trans>`, `<Plural>`, `plural`, or `t` from `useLingui()`). Placeholders are named variables (`${datasetName}`), never expressions. Compute a plural into its own variable and never put `plural()` inside `t`. Numbers shown to the user go through `i18n.number`. Never pass `t` into a module-level helper. No em dashes anywhere, including comments.
- Functions stay at 45 lines or fewer. Docstrings on every exported function, type, constant, and module key, saying what it is for. Comments describe the code as it is, never this plan or its slices.
- Component tests use `render`, `renderHook`, `screen`, `fireEvent`, `waitFor`, `within`, `act`, and `TestProviders` from `@/test-utils`. A hook that calls `useLingui` renders with `{ wrapper: TestProviders }`.
- Run one Vitest file: `pnpm vitest run <path>`.
- Before each commit format what you touched: `pnpm exec oxfmt --ignore-path .oxfmtignore <ts/tsx files>`, `pnpm exec eslint --fix <files>`, `pnpm exec stylelint <css files>`, and `pnpm exec prettier --write <sql files>`.
- Verify types with `pnpm exec tsc -b --force --noEmit` (plain `tsc -b` can report clean from a stale cache) and the edge functions with `pnpm type-check:deno`.
- Commit by explicit path, never `git add -A`. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Lessons from slices 1 and 2, and where this plan handles them

| Lesson | Where |
| --- | --- |
| Late async results: tag requests, drop stale replies, guard side effects after unmount, guard double submits | `useDatasetProfiles` tags each read with its dataset and columns (Task 13); `useAttachDictionaries` ignores a second press and never navigates after unmount (Task 16); `useOpenAfterCreate` checks `isMountedRef` (Task 18) |
| Privacy and security on the server | Bindings are select-only and follow the dataset (Task 1); the RPC is SECURITY DEFINER with `search_path = ''`, checks dataset editor and Data Sources viewer before reading anything, refuses cross-dataset and cross-workspace ids, and raises the same error for a missing and a forbidden dataset (Task 2); the edge loader reads with the caller's own client, so RLS hides what the caller cannot see (Task 22) |
| Edge function imports | `ColumnCodes` imports nothing but types; Task 22 runs `deno info` with `supabase/functions/chat/deno.json` and `pnpm type-check:deno` |
| 45-line functions | Components are split up front (Tasks 14 to 19); every block in this plan was checked |
| Named Lingui placeholders, plurals in variables, `i18n.number` | Tasks 10, 14, 15, 16, 18, 19 |
| Accessibility | Focus moves to the step heading on a step change (Task 14); picks are toggle buttons with `aria-pressed` and `aria-describedby` to their column, so the visible text starts the name (Task 15); the unmatched toggle sets `aria-expanded` and `aria-controls` (Task 15); the popover opens on hover, focus, and click, closes on Escape, returns focus, and its dialog is named (Task 9); the column name is the only extra tab stop per row (Task 15) |
| e2e: UI-driven, under 45 s, no sleeps, cleanup in `finally`, `ALWAYS_REFETCH_ON_MOUNT` | Task 28; bindings queries refetch on mount (Tasks 8, 13, 19) |
| Order-dependent algorithms | `DictionaryMatch.compareMatches` orders by score, coverage, dictionary rank, entry position, then id; `makeInitialSelection` ranks dictionaries by covered columns, then list order; both have order-independence tests (Tasks 6, 13) |
| Agent changes need evals | Task 27 adds a coded-columns workspace and questions D01 to D04 for the online and offline agents, and reruns the 45 COVID questions on v4 |

## File structure

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.dataset_columns__binding_mode.sql`, `00.enum.dataset_columns__binding_direction.sql` | `reference` / `convert`, `decode` / `encode` |
| `supabase/schemas/30.dataset_columns__dictionary_bindings.sql` | The bindings table, its select policy, workspace guard, and the triggers that remove reference bindings when a dictionary or entry is deleted |
| `supabase/schemas/50.rpc_dataset_columns__apply_dictionaries.sql` | The apply RPC and its three helpers |
| `supabase/tests/database/permissions/rls_dataset_columns__dictionary_bindings.test.sql` | RLS, no direct writes, delete cascades |
| `supabase/tests/database/dictionary_bindings/rpc_dataset_columns__apply_dictionaries.test.sql` | Every refusal, and whole-set replacement |
| `supabase/tests/database/permissions/exact_data_api_grants.test.sql` | Modify: the new select-only table |
| `supabase/migrations/*_dictionary_bindings.sql`, `apps/desktop/migrations/*_dictionary_bindings.gen.sql`, `shared/types/database.types.ts` | Generated |
| `apps/desktop/sync/syncable-tables.ts` | Modify: sync the bindings to the desktop |
| `shared/models/dataDictionaries/DictionaryBinding/` | The binding model, its parsers, and apply error hints |
| `shared/models/dataDictionaries/ColumnCodes/` | Joining a binding to its rows, reading stored pairs, writing pairs and descriptions for prompts, finding a pair by label |
| `shared/models/dataDictionaries/DictionaryMatch/` | Matching profiled columns to entries |
| `shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts` | Modify: expose `getNameScore` |
| `src/clients/dataDictionaries/DictionaryBindingClient.ts` | Bindings CRUD reads and `applyToDataset` |
| `src/lib/dataDictionaries/loadColumnCodes/` | A workspace's column codes, for the agents' schemas |
| `src/hooks/datasets/useCanEditDataset/`, `src/hooks/dataDictionaries/useDatasetColumnCodes/`, `src/hooks/dataDictionaries/useDatasetHasBindings.ts` | Edit rights on a dataset; one dataset's column codes; whether it has bindings |
| `src/components/dataDictionaries/CodeListPopover/` | The tag button and popover |
| `src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/` | The column name with its tag and entry description, the Columns count, the rail's Dictionaries group |
| `src/views/DataManagerApp/DatasetMetaView/{DatasetMetaView,DatasetMetadataList,DatasetSourceRail}.tsx`, `DatasetSummaryView/{DatasetSummaryView,ColumnSection/ColumnSection}.tsx` | Modify: show the codes |
| `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/` | Modify: Apply a dictionary, and Create only while nothing is applied |
| `src/routes/_auth/$workspaceSlug/data-manager/$datasetId_.apply-dictionaries.tsx`, `src/config/AppLinks/AppLinks.tsx`, `src/views/DataManagerApp/useListPaneToggle/` | The apply route (outside the dataset view's subtree), its link, and the hidden list |
| `src/views/DataManagerApp/ApplyDictionariesView/` | The apply flow |
| `src/views/DataManagerApp/NewDictionaryFromDatasetsView/` | Modify: "Apply it to <dataset> next" on Save, and opening Apply after create |
| `src/views/DataManagerApp/DataDictionaryView/` | Modify: Used by tab and count, Apply to a dataset |
| `src/lib/dataDictionaries/getResultColumnCodes/`, `src/lib/ui/viz/DataGridColumnTitle/`, `src/views/DataExplorerApp/useExplorerColumnCodes/`, `src/views/DataExplorerApp/DataExplorerApp.tsx` | Codes in the Data Explorer grid's headers |
| `shared/agent/dataAgent/{buildDataAgentSystemPrompt,dataAgentTools}.ts` | Modify: prompt v4 |
| `supabase/functions/chat/utils/loadColumnCodes/`, `PostAgentStream/loadDataAgentDatasets.ts`, `PostChatMessages/schema/fetchWorkspaceSchema.ts` | The edge function reads column codes |
| `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`, `shared/types/offlineChat.types.ts` | Modify: codes in the legacy schema block |
| `src/components/ChatPanel/useAvandarChatRuntime/{dataAgentTurnHelpers/dataAgentTurnHelpers.ts,runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts}` | Modify: the browser loads column codes |
| `src/lib/agent/dataAgent/offline/{profileOfflineDatasets,buildOfflineDataAgentSystemPrompt,findQuestionValues}/` | Modify: the offline agent reads code lists |
| `src/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool.ts`, `createDataAgent/createDataAgent.ts` | Modify: `lookup_values` answers from code lists |
| `scripts/ai-eval/measles/`, `scripts/ai-eval/{EvalQuestion,runEval}.ts`, `runtime/EvalDatabase.ts`, `harnesses/pi/{PiHarness,PiLocalHarness}.ts` | The coded-columns eval |
| `tests/e2e/dictionary-apply-reference.spec.ts`, `tests/e2e/helpers/seedDataDictionary.ts` | E2E |
| `tests/e2e/agent-chat-{result,sessions,mentions}.spec.ts` | Modify: the stream route is now `data-agent-v4` |
| `tests/e2e/dictionary-create-from-dataset.spec.ts` | Modify: saving now opens Apply first |
| `docs/measles-demo/pr-feature-log.md`, `docs/ai-agent/eval.md`, `docs/ai-agent/eval-runs/` | F131, eval results |

---

### Task 0: Preflight

**Files:** none

- [ ] **Step 1:** `git rev-parse --abbrev-ref HEAD`. Expected: `feat/attach-dictionaries`.
- [ ] **Step 2: Switch to this branch's own local Supabase.** This slice adds tables, enums, triggers, and an RPC under `supabase/schemas/`, so it must not touch the shared `avandar` stack. Run `ava supabase switch` (it seeds the new stack), then `ava supabase status`. Do not continue until its output names `feat-attach-dictionaries` as this branch's switched project (the project line may be the second line of the output). If `ava` is missing, run `pnpm build:ava-cli`. Never edit `supabase/config.toml` or the switch block in `.env.development`. If the switch reports a failed seed, run the `pnpm db:seed` retry it prints, after confirming status again.
- [ ] **Step 3: Point the edge runtime at the switched stack.** A switch rewrites `.env.development.edge` but not the gitignored `supabase/functions/.env`, so the `chat` function would refuse every user token with `unexpected "iss"`. Run `diff .env.development.edge supabase/functions/.env`. If they differ or the second file is missing, `cp .env.development.edge supabase/functions/.env`, keeping `OPEN_ROUTER_API_KEY` if it was there, then `supabase stop` and `ava supabase switch feat-attach-dictionaries`, and confirm with `ava supabase status`.
- [ ] **Step 4:** `pnpm vitest run src/views/DataManagerApp shared/models/dataDictionaries src/clients/dataDictionaries shared/agent src/lib/agent src/lib/dataDictionaries supabase/functions/chat`. Expected: PASS. This is the baseline the later tasks keep green.

Before any `pnpm db:reset`, `pnpm db:new-migration`, `pnpm db:seed`, `supabase db diff`, `supabase start`, or `supabase stop`, run `ava supabase status` and confirm it names `feat-attach-dictionaries`. Never run them while it points at the shared `avandar` stack.

---

### Task 1: Binding enums, table, and RLS (schema, red until Task 3)

A binding is one dataset column bound to one dictionary entry, with the code list chosen for the column, a `mode`, and a `direction`. Signed-in users read the bindings of the datasets they can see and never write them: Task 2's RPC is the only write path, as `rpc_data_dictionaries__save` is for dictionaries. Two triggers keep bindings honest when dictionary rows go away: deleting a dictionary or an entry removes its `reference` bindings first (a `convert` binding will be pinned instead, when conversions exist), and a deleted code list leaves the binding with its entry and description through `on delete set null`. The table stores `mode` and `direction` now, so conversions need no destructive migration.

**Files:**
- Create: `supabase/schemas/00.enum.dataset_columns__binding_mode.sql`
- Create: `supabase/schemas/00.enum.dataset_columns__binding_direction.sql`
- Create: `supabase/schemas/30.dataset_columns__dictionary_bindings.sql`
- Create: `supabase/tests/database/permissions/rls_dataset_columns__dictionary_bindings.test.sql`
- Modify: `supabase/tests/database/permissions/exact_data_api_grants.test.sql`

`30.` because the table depends on `datasets` (10), `dataset_columns`, the dictionary entries and code lists (20), and `data_dictionaries` (10). Nothing at 30 depends on it.

- [ ] **Step 1: Write the failing pgTAP test.**

`supabase/tests/database/permissions/rls_dataset_columns__dictionary_bindings.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * RLS for `dataset_columns__dictionary_bindings`, and what happens to
 * bindings when the dictionary rows they name go away.
 *
 *   dataset viewer: SELECT the bindings of the datasets they can see
 *   everyone signed in: no INSERT, UPDATE, or DELETE (the apply RPC writes)
 *
 * A dictionary or entry that is deleted takes its reference bindings with
 * it. A code list that is deleted leaves the binding with its description.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('db000001-0000-4000-8000-000000000001'::uuid, 'binding_owner@test.dev', 'authenticated', 'authenticated'),
  ('db000002-0000-4000-8000-000000000002'::uuid, 'binding_viewer@test.dev', 'authenticated', 'authenticated'),
  ('db000003-0000-4000-8000-000000000003'::uuid, 'binding_editor@test.dev', 'authenticated', 'authenticated'),
  ('db000004-0000-4000-8000-000000000004'::uuid, 'binding_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'binding rls ws', 'binding-rls-ws'),
  ('db100002-0000-4000-8000-000000000002'::uuid, 'db000004-0000-4000-8000-000000000004'::uuid, 'binding other ws', 'binding-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('db200001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid),
  ('db200002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000002-0000-4000-8000-000000000002'::uuid),
  ('db200003-0000-4000-8000-000000000003'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000003-0000-4000-8000-000000000003'::uuid),
  ('db200004-0000-4000-8000-000000000004'::uuid, 'db100002-0000-4000-8000-000000000002'::uuid, 'db000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('db300001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('db300002-0000-4000-8000-000000000002'::uuid, 'db000002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('db300003-0000-4000-8000-000000000003'::uuid, 'db000003-0000-4000-8000-000000000003'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db200003-0000-4000-8000-000000000003'::uuid, 'Editor', 'Editor'),
  ('db300004-0000-4000-8000-000000000004'::uuid, 'db000004-0000-4000-8000-000000000004'::uuid, 'db100002-0000-4000-8000-000000000002'::uuid, 'db200004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The viewer gets Global Viewer, the editor Global Editor. The owner owns
-- the workspace.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'db100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id <> 'db000001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'db000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

-- A dataset everyone in the workspace can see, and a restricted one that
-- app roles do not reach.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values
  ('db450001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'db300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type, false),
  ('db450002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'db300001-0000-4000-8000-000000000001'::uuid, 'Restricted list', 'csv_file'::public.datasets__source_type, true)
on conflict (id) do nothing;

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('db460001-0000-4000-8000-000000000001'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('db460002-0000-4000-8000-000000000002'::uuid, 'db450002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('db460003-0000-4000-8000-000000000003'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'hosp_yn', 'hosp_yn', 'VARCHAR', 'VARCHAR', 'varchar', 1)
on conflict (id) do nothing;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values ('db400001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'db300001-0000-4000-8000-000000000001'::uuid, 'NYS codes')
on conflict (id) do nothing;

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values
  ('db500001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'Sex (1/2/9)', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('db500002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'Yes/No', '[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false}]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('db600001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('db600002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'hospitalized', 'categorical', 1);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values
  ('db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600001-0000-4000-8000-000000000001'::uuid, 'db500001-0000-4000-8000-000000000001'::uuid, true),
  ('db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600002-0000-4000-8000-000000000002'::uuid, 'db500002-0000-4000-8000-000000000002'::uuid, true);

insert into public.dataset_columns__dictionary_bindings (id, workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id, applied_dictionary_version)
values
  ('db470001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db460001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600001-0000-4000-8000-000000000001'::uuid, 'db500001-0000-4000-8000-000000000001'::uuid, 1),
  ('db470002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db450002-0000-4000-8000-000000000002'::uuid, 'db460002-0000-4000-8000-000000000002'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600001-0000-4000-8000-000000000001'::uuid, 'db500001-0000-4000-8000-000000000001'::uuid, 1),
  ('db470003-0000-4000-8000-000000000003'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db460003-0000-4000-8000-000000000003'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600002-0000-4000-8000-000000000002'::uuid, 'db500002-0000-4000-8000-000000000002'::uuid, 1);

-- Counts the bindings a user can read on one dataset.
create function pg_temp.visible_bindings (p_user_id uuid, p_dataset_id uuid) returns integer language plpgsql as $$
declare
  v_count integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*)::int into v_count
  from public.dataset_columns__dictionary_bindings
  where dataset_id = p_dataset_id;
  reset role;
  return v_count;
end;
$$;

select plan (14);

-- 1.
select is (
  pg_temp.visible_bindings ('db000002-0000-4000-8000-000000000002'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid),
  2,
  'a viewer reads the bindings of a dataset they can see'
);

-- 2.
select is (
  pg_temp.visible_bindings ('db000002-0000-4000-8000-000000000002'::uuid, 'db450002-0000-4000-8000-000000000002'::uuid),
  0,
  'a viewer reads no binding of a dataset they cannot see'
);

-- 3.
select is (
  pg_temp.visible_bindings ('db000004-0000-4000-8000-000000000004'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid),
  0,
  'a user outside the workspace reads no binding'
);

-- 4.
select throws_ok (
  $t4$
  set local role anon;
  select count(*) from public.dataset_columns__dictionary_bindings;
  $t4$,
  '42501',
  null,
  'anon cannot select bindings'
);
reset role;

-- 5.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.dataset_columns__dictionary_bindings (workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, applied_dictionary_version)
  values ('db100001-0000-4000-8000-000000000001'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db460003-0000-4000-8000-000000000003'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600002-0000-4000-8000-000000000002'::uuid, 1);
  $t5$,
  '42501',
  null,
  'an editor cannot insert a binding directly'
);
reset role;

-- 6.
select throws_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.dataset_columns__dictionary_bindings set code_list_id = null where id = 'db470001-0000-4000-8000-000000000001'::uuid;
  $t6$,
  '42501',
  null,
  'an editor cannot update a binding directly'
);
reset role;

-- 7.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.dataset_columns__dictionary_bindings where id = 'db470001-0000-4000-8000-000000000001'::uuid;
  $t7$,
  '42501',
  null,
  'even the workspace owner cannot delete a binding directly'
);
reset role;

-- 8.
select throws_ok (
  $t8$
  update public.dataset_columns__dictionary_bindings
  set workspace_id = 'db100002-0000-4000-8000-000000000002'::uuid
  where id = 'db470001-0000-4000-8000-000000000001'::uuid;
  $t8$,
  '23514',
  null,
  'a binding cannot move to another workspace'
);

-- 9. A save that gives hospitalized a new code list deletes Yes/No.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_data_dictionaries__save (
    'db400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"db500001-0000-4000-8000-000000000001","name":"Sex (1/2/9)","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]},{"id":"db500003-0000-4000-8000-000000000003","name":"Y/N/U","is_ordered":false,"pairs":[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[{"id":"db600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"db500001-0000-4000-8000-000000000001","is_primary":true}]},{"id":"db600002-0000-4000-8000-000000000002","name":"hospitalized","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":1,"codings":[{"code_list_id":"db500003-0000-4000-8000-000000000003","is_primary":true}]}]'::jsonb
  );
  $t9$,
  'a save that deletes a code list a binding uses succeeds'
);
reset role;

-- 10.
select results_eq (
  $q$
    select entry_id, code_list_id
    from public.dataset_columns__dictionary_bindings
    where id = 'db470003-0000-4000-8000-000000000003'::uuid
  $q$,
  $q$ values ('db600002-0000-4000-8000-000000000002'::uuid, null::uuid) $q$,
  'the binding keeps its entry, and its description, when its code list is deleted'
);

-- 11. A save that leaves hospitalized out deletes the entry.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_data_dictionaries__save (
    'db400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"db500001-0000-4000-8000-000000000001","name":"Sex (1/2/9)","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[{"id":"db600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"db500001-0000-4000-8000-000000000001","is_primary":true}]}]'::jsonb
  );
  $t11$,
  'the owner saves the dictionary without the hospitalized entry'
);
reset role;

-- 12.
select results_eq (
  'select id from public.dataset_columns__dictionary_bindings order by id',
  $$ values ('db470001-0000-4000-8000-000000000001'::uuid), ('db470002-0000-4000-8000-000000000002'::uuid) $$,
  'a deleted entry takes its reference bindings with it'
);

-- 13. The owner may delete the dictionary without editing either dataset.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'db400001-0000-4000-8000-000000000001'::uuid;
  $t13$,
  'the owner deletes the dictionary'
);
reset role;

-- 14.
select is (
  (select count(*)::int from public.dataset_columns__dictionary_bindings),
  0,
  'a deleted dictionary takes its reference bindings with it'
);

select * from finish ();

rollback;
```

- [ ] **Step 2: Add the table to the grants contract.** It is select-only for `authenticated`, like the dictionary children:

`supabase/tests/database/permissions/exact_data_api_grants.test.sql`:

```diff
--- a/supabase/tests/database/permissions/exact_data_api_grants.test.sql
+++ b/supabase/tests/database/permissions/exact_data_api_grants.test.sql
@@ -44,6 +44,7 @@
       'data_dictionaries__code_lists',
       'data_dictionaries__entries',
       'data_dictionaries__entry_codings',
+      'dataset_columns__dictionary_bindings',
       'datasets__postgres_table',
       'map_jitter_salts',
       -- Service role only: no `authenticated` grant at all.
@@ -107,6 +108,7 @@
       'data_dictionaries__code_lists',
       'data_dictionaries__entries',
       'data_dictionaries__entry_codings',
+      'dataset_columns__dictionary_bindings',
       'subscriptions',
       'usage_analytics_events'
     )
```

- [ ] **Step 3: Write the enums and the table.**

`supabase/schemas/00.enum.dataset_columns__binding_mode.sql`:

```sql
/**
 * What applying a dictionary entry to a dataset column does.
 *
 * Enum values:
 *
 * `reference`: the entry's description and code list are attached to the
 * column. The values in the data stay as they are.
 *
 * `convert`: the column's values are translated through the code list when
 * the dataset loads.
 *
 * Note: `rpc_dataset_columns__apply_dictionaries` refuses `convert`, since
 * nothing translates values at load time yet.
 */
create type public.dataset_columns__binding_mode as enum('reference', 'convert');
```

`supabase/schemas/00.enum.dataset_columns__binding_direction.sql`:

```sql
/**
 * Which side of each code pair a bound column holds.
 *
 * Enum values:
 *
 * `decode`: the column holds codes, such as 1 and 2, and the code list says
 * what each means.
 *
 * `encode`: the column holds labels, such as Male, and the code list gives
 * each one's code.
 */
create type public.dataset_columns__binding_direction as enum('decode', 'encode');
```

`supabase/schemas/30.dataset_columns__dictionary_bindings.sql`:

```sql
/**
 * One dataset column bound to one dictionary entry. The entry's description
 * and the chosen code list explain the column. With `convert` its values
 * would also be translated when the dataset loads. Select-only for signed-in
 * users, who see the bindings of the datasets they can see. Written by
 * `rpc_dataset_columns__apply_dictionaries`, which replaces a dataset's
 * bindings whole.
 */
create table public.dataset_columns__dictionary_bindings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this binding belongs to, always its dataset's
  workspace_id uuid not null,
  -- Dataset the bound column belongs to
  dataset_id uuid not null,
  -- The bound column. A column has at most one binding.
  dataset_column_id uuid not null unique references public.dataset_columns (id) on update cascade on delete cascade,
  -- The dictionary the entry belongs to. Null once the dictionary is gone.
  dictionary_id uuid references public.data_dictionaries (id) on update cascade on delete set null,
  -- The bound entry. Null once the entry is gone.
  entry_id uuid references public.data_dictionaries__entries (id) on update cascade on delete set null,
  -- The entry's code list chosen for this column. Null for an entry with no
  -- codes, or once the code list is gone.
  code_list_id uuid references public.data_dictionaries__code_lists (id) on update cascade on delete set null,
  -- Whether the values are only explained or also converted
  mode public.dataset_columns__binding_mode not null default 'reference',
  -- Which side of each code pair the column holds
  direction public.dataset_columns__binding_direction not null default 'decode',
  -- The dictionary's version when this binding was written
  applied_dictionary_version integer not null,
  -- Timestamp of when the binding was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the binding was last updated
  updated_at timestamptz not null default now(),
  -- Keeps the binding in its dataset's workspace.
  foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on update cascade on delete cascade
);

alter table public.dataset_columns__dictionary_bindings enable row level security;

-- Signed-in users read only. Writes go through the apply RPC.
grant
select
  on table public.dataset_columns__dictionary_bindings to authenticated;

grant
select
,
  insert,
update,
delete on table public.dataset_columns__dictionary_bindings to service_role;

-- Bindings follow their dataset: a reader who cannot see a dataset never
-- sees its bindings, whatever their dictionary role.
create policy "Dataset viewers can select their columns' dictionary bindings" on public.dataset_columns__dictionary_bindings for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.dataset_columns__dictionary_bindings.dataset_id,
      'viewer'
    )
  );

/** Prevents a binding from being moved to another workspace. */
create or replace function public.dataset_columns__dictionary_bindings__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'binding workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__prevent_workspace_id_change ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Removes the reference bindings of a dictionary that is being deleted, so
 * no column keeps pointing at it. SECURITY DEFINER because the owner who
 * deletes a dictionary may not edit every dataset that uses it, and a
 * reference binding changes no data.
 */
create or replace function public.dataset_columns__dictionary_bindings__remove_for_dictionary () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.dictionary_id = old.id and b.mode = 'reference';

  return old;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__remove_for_dictionary ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Removes the reference bindings of an entry that is being deleted, for
 * example by a dictionary save that leaves it out. SECURITY DEFINER for the
 * same reason as `..._remove_for_dictionary`.
 */
create or replace function public.dataset_columns__dictionary_bindings__remove_for_entry () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.entry_id = old.id and b.mode = 'reference';

  return old;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__remove_for_entry ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__dataset_columns__dictionary_bindings__prevent_workspace_id_change before
update of workspace_id on public.dataset_columns__dictionary_bindings for each row
execute function public.dataset_columns__dictionary_bindings__prevent_workspace_id_change ();

create trigger tr__dataset_columns__dictionary_bindings__set_updated_at before
update on public.dataset_columns__dictionary_bindings for each row
execute function public.util__set_updated_at ();

create trigger tr__data_dictionaries__remove_reference_bindings before delete on public.data_dictionaries for each row
execute function public.dataset_columns__dictionary_bindings__remove_for_dictionary ();

create trigger tr__data_dictionaries__entries__remove_reference_bindings before delete on public.data_dictionaries__entries for each row
execute function public.dataset_columns__dictionary_bindings__remove_for_entry ();

create index idx_dataset_columns__dictionary_bindings__dataset_id on public.dataset_columns__dictionary_bindings (dataset_id);

create index idx_dataset_columns__dictionary_bindings__dictionary_id on public.dataset_columns__dictionary_bindings (dictionary_id);

create index idx_dataset_columns__dictionary_bindings__entry_id on public.dataset_columns__dictionary_bindings (entry_id);

create index idx_dataset_columns__dictionary_bindings__code_list_id on public.dataset_columns__dictionary_bindings (code_list_id);
```

The tests stay red until Task 3 builds a migration from these files: `pnpm test:db` runs against migrations, never against `supabase/schemas/`.

---

### Task 2: The apply RPC (schema, red until Task 3)

`rpc_dataset_columns__apply_dictionaries(p_dataset_id, p_bindings)` replaces one dataset's bindings whole: it deletes the ones the set leaves out and upserts the rest, recording each dictionary's version. It refuses, with a stable `hint`, a caller who cannot edit the dataset (`dataset_editor_required`, the same for a dataset that does not exist), a caller who cannot read dictionaries in the dataset's workspace (`dictionary_viewer_required`), a malformed or duplicated binding (`binding_payload_invalid`), `convert` (`binding_mode_unsupported`), a column of another dataset (`column_not_in_dataset`), an entry outside its dictionary or the workspace (`entry_not_in_dictionary`), and a code list the entry does not use (`code_list_not_in_entry`). Every check runs before any write, so a refusal changes nothing.

**Files:**
- Create: `supabase/schemas/50.rpc_dataset_columns__apply_dictionaries.sql`
- Create: `supabase/tests/database/dictionary_bindings/rpc_dataset_columns__apply_dictionaries.test.sql`

- [ ] **Step 1: Write the failing pgTAP test.** Each apply runs in a statement of its own and each check in the next one, because a statement sees the data as it was when it began.

`supabase/tests/database/dictionary_bindings/rpc_dataset_columns__apply_dictionaries.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * `rpc_dataset_columns__apply_dictionaries` replaces one dataset's
 * dictionary bindings in one transaction. Only an editor of the dataset who
 * can read dictionaries may call it, every column, entry, and code list must
 * belong where the binding says, and only reference bindings are accepted.
 * Refusals raise a stable `hint` and change nothing.
 */
begin;

set search_path to extensions, public;

create function pg_temp.error_hint (p_sql text) returns text language plpgsql as $$
declare
  v_hint text;
begin
  execute p_sql;
  return 'no error';
exception
  when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    return v_hint;
end;
$$;

-- Runs one apply as the given user and returns its hint, or 'no error'.
create function pg_temp.apply_as (p_user_id uuid, p_dataset_id uuid, p_bindings jsonb) returns text language plpgsql as $$
begin
  return pg_temp.error_hint (format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
      select public.rpc_dataset_columns__apply_dictionaries (%L::uuid, %L::jsonb);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    p_dataset_id,
    p_bindings
  ));
end;
$$;

-- One binding of the sex entry, as JSON, for a column.
create function pg_temp.sex_binding (p_column_id uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'dataset_column_id', p_column_id,
    'dictionary_id', 'dc400001-0000-4000-8000-000000000001',
    'entry_id', 'dc600001-0000-4000-8000-000000000001',
    'code_list_id', 'dc500001-0000-4000-8000-000000000001',
    'mode', 'reference',
    'direction', 'decode'
  );
$$;

insert into auth.users (id, email, aud, role)
values
  ('dc000001-0000-4000-8000-000000000001'::uuid, 'bind_editor@test.dev', 'authenticated', 'authenticated'),
  ('dc000002-0000-4000-8000-000000000002'::uuid, 'bind_viewer@test.dev', 'authenticated', 'authenticated'),
  ('dc000003-0000-4000-8000-000000000003'::uuid, 'bind_outsider@test.dev', 'authenticated', 'authenticated'),
  ('dc000004-0000-4000-8000-000000000004'::uuid, 'bind_shared_editor@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- The editor owns the workspace; the outsider owns another.
insert into public.workspaces (id, owner_id, name, slug)
values
  ('dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'bind ws', 'bind-ws'),
  ('dc100002-0000-4000-8000-000000000002'::uuid, 'dc000003-0000-4000-8000-000000000003'::uuid, 'bind other ws', 'bind-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('dc200001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid),
  ('dc200002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000002-0000-4000-8000-000000000002'::uuid),
  ('dc200003-0000-4000-8000-000000000003'::uuid, 'dc100002-0000-4000-8000-000000000002'::uuid, 'dc000003-0000-4000-8000-000000000003'::uuid),
  ('dc200004-0000-4000-8000-000000000004'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('dc300001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc200001-0000-4000-8000-000000000001'::uuid, 'Editor', 'Editor'),
  ('dc300002-0000-4000-8000-000000000002'::uuid, 'dc000002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('dc300003-0000-4000-8000-000000000003'::uuid, 'dc000003-0000-4000-8000-000000000003'::uuid, 'dc100002-0000-4000-8000-000000000002'::uuid, 'dc200003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider'),
  ('dc300004-0000-4000-8000-000000000004'::uuid, 'dc000004-0000-4000-8000-000000000004'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc200004-0000-4000-8000-000000000004'::uuid, 'Shared editor', 'Shared editor')
on conflict (id) do nothing;

-- The viewer gets Global Viewer. The shared editor has no app role at all:
-- only a share on the first dataset.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'dc100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id = 'dc000002-0000-4000-8000-000000000002'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = 'Global Viewer';

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('dc450001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type),
  ('dc450002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.resource_shares (workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values (
  'dc100001-0000-4000-8000-000000000001'::uuid,
  'dataset'::public.resource_type,
  'dc450001-0000-4000-8000-000000000001'::uuid,
  'user'::public.share_principal_type,
  'dc000004-0000-4000-8000-000000000004'::uuid,
  'editor'::public.role_level
);

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('dc460001-0000-4000-8000-000000000001'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('dc460002-0000-4000-8000-000000000002'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'CaseNo', 'CaseNo', 'VARCHAR', 'VARCHAR', 'varchar', 1),
  ('dc460003-0000-4000-8000-000000000003'::uuid, 'dc450002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0)
on conflict (id) do nothing;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('dc400001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc300001-0000-4000-8000-000000000001'::uuid, 'NYS codes'),
  ('dc400002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc300001-0000-4000-8000-000000000001'::uuid, 'Other codes'),
  ('dc400009-0000-4000-8000-000000000009'::uuid, 'dc100002-0000-4000-8000-000000000002'::uuid, 'dc000003-0000-4000-8000-000000000003'::uuid, 'dc300003-0000-4000-8000-000000000003'::uuid, 'Elsewhere')
on conflict (id) do nothing;

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values (
  'dc500001-0000-4000-8000-000000000001'::uuid,
  'dc100001-0000-4000-8000-000000000001'::uuid,
  'dc400001-0000-4000-8000-000000000001'::uuid,
  'Sex (1/2/9)',
  '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb
);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('dc600001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('dc600002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc400001-0000-4000-8000-000000000001'::uuid, 'case_id', 'identifier', 1),
  ('dc600003-0000-4000-8000-000000000003'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc400002-0000-4000-8000-000000000002'::uuid, 'sex', 'text', 0),
  ('dc600009-0000-4000-8000-000000000009'::uuid, 'dc100002-0000-4000-8000-000000000002'::uuid, 'dc400009-0000-4000-8000-000000000009'::uuid, 'sex', 'text', 0);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values (
  'dc100001-0000-4000-8000-000000000001'::uuid,
  'dc400001-0000-4000-8000-000000000001'::uuid,
  'dc600001-0000-4000-8000-000000000001'::uuid,
  'dc500001-0000-4000-8000-000000000001'::uuid,
  true
);

select plan (20);

-- Refusals. None of them changes anything.

-- 1.
select is (
  pg_temp.apply_as ('dc000002-0000-4000-8000-000000000002'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb),
  'dataset_editor_required',
  'a viewer of the dataset cannot apply dictionaries to it'
);
reset role;

-- 2.
select is (
  pg_temp.apply_as ('dc000003-0000-4000-8000-000000000003'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb),
  'dataset_editor_required',
  'a user outside the workspace cannot apply dictionaries'
);
reset role;

-- 3.
select is (
  pg_temp.apply_as ('dc000001-0000-4000-8000-000000000001'::uuid, 'dc45ffff-0000-4000-8000-00000000ffff'::uuid, '[]'::jsonb),
  'dataset_editor_required',
  'a dataset that does not exist is refused like a forbidden one'
);
reset role;

-- 4.
select is (
  pg_temp.apply_as ('dc000004-0000-4000-8000-000000000004'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb),
  'dictionary_viewer_required',
  'an editor of the dataset with no Data Sources role cannot read dictionaries to apply'
);
reset role;

-- 5.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460003-0000-4000-8000-000000000003'::uuid))
  ),
  'column_not_in_dataset',
  'a column of another dataset is refused'
);
reset role;

-- 6.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"dictionary_id":"dc400009-0000-4000-8000-000000000009","entry_id":"dc600009-0000-4000-8000-000000000009","code_list_id":null}'::jsonb)
  ),
  'entry_not_in_dictionary',
  'an entry of another workspace''s dictionary is refused'
);
reset role;

-- 7.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"entry_id":"dc600003-0000-4000-8000-000000000003","code_list_id":null}'::jsonb)
  ),
  'entry_not_in_dictionary',
  'an entry of a different dictionary than the binding names is refused'
);
reset role;

-- 8.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460002-0000-4000-8000-000000000002'::uuid) || '{"entry_id":"dc600002-0000-4000-8000-000000000002"}'::jsonb)
  ),
  'code_list_not_in_entry',
  'a code list the entry does not use is refused'
);
reset role;

-- 9.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"mode":"convert"}'::jsonb)
  ),
  'binding_mode_unsupported',
  'a convert binding is refused'
);
reset role;

-- 10.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(
      pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid),
      pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid)
    )
  ),
  'binding_payload_invalid',
  'one column bound twice is refused'
);
reset role;

-- 11.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"direction":"sideways"}'::jsonb)
  ),
  'binding_payload_invalid',
  'an unknown direction is refused'
);
reset role;

-- 12.
select is (
  (select count(*)::int from public.dataset_columns__dictionary_bindings),
  0,
  'no refusal wrote a binding'
);

-- Applies.

-- 13.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(
      pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid),
      pg_temp.sex_binding ('dc460002-0000-4000-8000-000000000002'::uuid) || '{"entry_id":"dc600002-0000-4000-8000-000000000002","code_list_id":null}'::jsonb
    )
  ),
  'no error',
  'an editor attaches a code list and a description'
);
reset role;

-- 14.
select results_eq (
  $q$
    select dataset_column_id, mode::text, applied_dictionary_version
    from public.dataset_columns__dictionary_bindings
    order by dataset_column_id
  $q$,
  $q$
    values
      ('dc460001-0000-4000-8000-000000000001'::uuid, 'reference', 1),
      ('dc460002-0000-4000-8000-000000000002'::uuid, 'reference', 1)
  $q$,
  'both bindings are stored as reference with the dictionary''s version'
);

-- 15.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(
      pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid),
      pg_temp.sex_binding ('dc460003-0000-4000-8000-000000000003'::uuid)
    )
  ),
  'column_not_in_dataset',
  'an apply with one bad column is refused'
);
reset role;

-- 16. A statement sees the data as it was when it began, so each check
-- below reads the bindings in a statement of its own.
select is (
  (select count(*)::int from public.dataset_columns__dictionary_bindings),
  2,
  'a refused apply leaves the earlier bindings as they were'
);

-- 17.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid))
  ),
  'no error',
  'an editor applies a smaller set'
);
reset role;

-- 18.
select results_eq (
  'select dataset_column_id from public.dataset_columns__dictionary_bindings',
  $$values ('dc460001-0000-4000-8000-000000000001'::uuid)$$,
  'the smaller set replaces the dataset''s bindings'
);

-- 19.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb
  ),
  'no error',
  'an editor applies an empty set'
);
reset role;

-- 20.
select is (
  (select count(*)::int from public.dataset_columns__dictionary_bindings),
  0,
  'an empty set removes every binding'
);

select * from finish ();

rollback;
```

- [ ] **Step 2: Write the RPC.** `50.` because it is an RPC that depends on the 30-level table; it does not depend on `50.rpc_data_dictionaries__save.sql`, so the two share an index.

`supabase/schemas/50.rpc_dataset_columns__apply_dictionaries.sql`:

```sql
/**
 * Replaces every dictionary binding of one dataset with the given set in
 * one transaction and returns how many the dataset has now. An empty set
 * removes them all.
 *
 * SECURITY DEFINER because bindings are select-only for signed-in users:
 * this function is their only write path. Before it reads anything else it
 * checks that the caller can edit the dataset and can read dictionaries in
 * the dataset's own workspace, and it refuses any column, entry, or code
 * list from another dataset, dictionary, or workspace. It accepts
 * `reference` bindings only, since nothing converts values at load time
 * yet. Every refusal raises with a stable `hint` the client maps to copy.
 *
 * @param p_dataset_id The dataset whose bindings are replaced.
 * @param p_bindings The full set, as `[{ dataset_column_id, dictionary_id,
 *   entry_id, code_list_id, mode, direction }]`.
 * @returns How many bindings the dataset has after the apply.
 */
create or replace function public.rpc_dataset_columns__apply_dictionaries (
  p_dataset_id uuid,
  p_bindings jsonb
) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_bindings jsonb := coalesce(p_bindings, '[]'::jsonb);
  v_count integer;
begin
  -- Read without a lock: the caller has not been authorized yet.
  select ds.workspace_id
  into v_workspace_id
  from public.datasets ds
  where ds.id = p_dataset_id;

  -- A missing dataset and a forbidden one raise the same error, so the
  -- function cannot be used to probe for dataset ids.
  if v_workspace_id is null or not public.util__auth_user_can_access_resource (
    'dataset'::public.resource_type,
    p_dataset_id,
    'editor'::public.role_level
  ) then
    raise exception 'Only an editor of this dataset can apply dictionaries to it'
      using errcode = '42501', hint = 'dataset_editor_required';
  end if;

  if not public.util__auth_user_meets_min_app_role (
    v_workspace_id,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ) then
    raise exception 'Only Data Sources viewers can read dictionaries'
      using errcode = '42501', hint = 'dictionary_viewer_required';
  end if;

  -- Two applies to one dataset run one at a time.
  perform 1 from public.datasets where id = p_dataset_id for update;

  perform public.dataset_columns__check_bindings (p_dataset_id, v_workspace_id, v_bindings);
  perform public.dataset_columns__write_bindings (p_dataset_id, v_workspace_id, v_bindings);

  select count(*)::integer
  into v_count
  from public.dataset_columns__dictionary_bindings b
  where b.dataset_id = p_dataset_id;

  return v_count;
end;
$$;

/**
 * Raises with a stable hint when a set of bindings cannot be written to a
 * dataset: a malformed payload, a column listed twice, a mode other than
 * `reference`, a column from another dataset, an entry outside its
 * dictionary or the dataset's workspace, or a code list the entry does not
 * use. Called only by `rpc_dataset_columns__apply_dictionaries`.
 */
create or replace function public.dataset_columns__check_bindings (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_bindings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if jsonb_typeof(p_bindings) is distinct from 'array' or exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (
      dataset_column_id uuid, dictionary_id uuid, entry_id uuid, mode text, direction text
    )
    where
      b.dataset_column_id is null or
      b.dictionary_id is null or
      b.entry_id is null or
      b.mode is null or
      b.mode not in (select unnest(enum_range(null::public.dataset_columns__binding_mode))::text) or
      b.direction is null or
      b.direction not in (select unnest(enum_range(null::public.dataset_columns__binding_direction))::text)
  ) then
    raise exception 'Bindings must be an array of complete bindings'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dataset_column_id uuid)
    group by b.dataset_column_id
    having count(*) > 1
  ) then
    raise exception 'A column appears more than once'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (mode text)
    where b.mode <> 'reference'
  ) then
    raise exception 'Only reference bindings can be applied'
      using errcode = '0A000', hint = 'binding_mode_unsupported';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dataset_column_id uuid)
    left join public.dataset_columns dc on dc.id = b.dataset_column_id
    where dc.id is null or dc.dataset_id <> p_dataset_id
  ) then
    raise exception 'Every column must belong to this dataset'
      using errcode = '23514', hint = 'column_not_in_dataset';
  end if;

  perform public.dataset_columns__check_binding_entries (p_workspace_id, p_bindings);
end;
$$;

/**
 * Raises with a stable hint when a binding's entry is not in its dictionary
 * and the dataset's workspace, or its code list is not one the entry uses.
 * Called only by `dataset_columns__check_bindings`.
 */
create or replace function public.dataset_columns__check_binding_entries (
  p_workspace_id uuid,
  p_bindings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dictionary_id uuid, entry_id uuid)
    left join public.data_dictionaries__entries en on
      en.id = b.entry_id and
      en.dictionary_id = b.dictionary_id and
      en.workspace_id = p_workspace_id
    where en.id is null
  ) then
    raise exception 'Every entry must belong to its dictionary in this workspace'
      using errcode = '23514', hint = 'entry_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (entry_id uuid, code_list_id uuid)
    where
      b.code_list_id is not null and
      not exists (
        select 1
        from public.data_dictionaries__entry_codings ec
        where ec.entry_id = b.entry_id and ec.code_list_id = b.code_list_id
      )
  ) then
    raise exception 'A binding''s code list must be one its entry uses'
      using errcode = '23514', hint = 'code_list_not_in_entry';
  end if;
end;
$$;

/**
 * Deletes a dataset's bindings that the new set leaves out and upserts the
 * rest, recording each dictionary's current version. Called only by
 * `rpc_dataset_columns__apply_dictionaries` after its checks pass.
 */
create or replace function public.dataset_columns__write_bindings (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_bindings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where
    b.dataset_id = p_dataset_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_bindings) as n (dataset_column_id uuid)
      where n.dataset_column_id = b.dataset_column_id
    );

  insert into public.dataset_columns__dictionary_bindings (
    workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id,
    code_list_id, mode, direction, applied_dictionary_version
  )
  select
    p_workspace_id, p_dataset_id, n.dataset_column_id, n.dictionary_id, n.entry_id,
    n.code_list_id, n.mode::public.dataset_columns__binding_mode,
    n.direction::public.dataset_columns__binding_direction, d.version
  from jsonb_to_recordset(p_bindings) as n (
    dataset_column_id uuid, dictionary_id uuid, entry_id uuid,
    code_list_id uuid, mode text, direction text
  )
  join public.data_dictionaries d on d.id = n.dictionary_id
  on conflict (dataset_column_id) do update
  set
    dictionary_id = excluded.dictionary_id,
    entry_id = excluded.entry_id,
    code_list_id = excluded.code_list_id,
    mode = excluded.mode,
    direction = excluded.direction,
    applied_dictionary_version = excluded.applied_dictionary_version;
end;
$$;

revoke
execute on function public.rpc_dataset_columns__apply_dictionaries (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks dataset edit rights itself.
grant
execute on function public.rpc_dataset_columns__apply_dictionaries (uuid, jsonb) to authenticated;

-- The helpers run inside the SECURITY DEFINER apply and are never called
-- directly, so no Data API role gets EXECUTE.
revoke
execute on function public.dataset_columns__check_bindings (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__check_binding_entries (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__write_bindings (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;
```

---

### Task 3: Migration, types, desktop, commit

**Files:** generated migration, `shared/types/database.types.ts`, `apps/desktop/migrations/*_dictionary_bindings.gen.sql`, `apps/desktop/sync/syncable-tables.ts`

- [ ] **Step 1:** `ava supabase status` (must name `feat-attach-dictionaries`). Then, with nothing in between, `pnpm db:reset && pnpm db:new-migration dictionary_bindings`. Open the generated file under `supabase/migrations/`. It must create the two enums, the table, its policy, grants, triggers (two on the bindings table, one on `data_dictionaries`, one on `data_dictionaries__entries`), four indexes, the seven functions with their revokes and the one grant, and nothing else. A `drop` of anything this branch did not add means the stack is not this branch's own: stop, re-check Task 0, reset, and regenerate.
- [ ] **Step 2:** `pnpm exec prettier --write` on the four new schema files, the two new test files, and `exact_data_api_grants.test.sql`.
- [ ] **Step 3:** `pnpm test:db`. Expected: PASS, including `rls_dataset_columns__dictionary_bindings.test.sql` (14 tests), `rpc_dataset_columns__apply_dictionaries.test.sql` (20 tests), `exact_data_api_grants.test.sql`, slice 1's tests unchanged, and the privilege reconcile step.
- [ ] **Step 4:** `pnpm db:gen-types`. `shared/types/database.types.ts` now has the `dataset_columns__dictionary_bindings` table (with `dictionary_id`, `entry_id`, `code_list_id` nullable and four relationships), the enums `dataset_columns__binding_mode` and `dataset_columns__binding_direction`, and `rpc_dataset_columns__apply_dictionaries: { Args: { p_bindings: Json; p_dataset_id: string }; Returns: number }`.
- [ ] **Step 5: Sync the table to the desktop.** The desktop reads every CRUD table through its SQLite mirror, so the offline agent and the dataset page need the bindings there:

`apps/desktop/sync/syncable-tables.ts`:

```diff
--- a/apps/desktop/sync/syncable-tables.ts
+++ b/apps/desktop/sync/syncable-tables.ts
@@ -19,7 +19,8 @@
  *   - ACTIVE: dataset definitions and their per-format detail rows,
  *     catalog listings and their drives, dashboards, concepts + their
  *     statuses, attributes, and attribute mappings, data dictionaries and
- *     their contents, individuals, user
+ *     their contents, the dictionary bindings of dataset columns,
+ *     individuals, user
  *     profile, plus `workspaces` and `workspace_memberships` so the
  *     workspace picker renders offline.
  *   - EXCLUDED: collaborative invitation state, permissions tables,
@@ -53,6 +54,7 @@
   "data_dictionaries__code_lists",
   "data_dictionaries__entries",
   "data_dictionaries__entry_codings",
+  "dataset_columns__dictionary_bindings",
   "concept_attributes",
   "attribute_mappings__dataset_column",
   "attribute_mappings__manual_entry",
```

  Then `pnpm desktop:sqlite:gen-migrations` and `pnpm test:desktop`. Expected: a new `apps/desktop/migrations/*_dictionary_bindings.gen.sql` with the table and indexes (enums, policies, triggers, and functions are dropped by the generator, as for slice 1), and tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/00.enum.dataset_columns__binding_mode.sql \
  supabase/schemas/00.enum.dataset_columns__binding_direction.sql \
  supabase/schemas/30.dataset_columns__dictionary_bindings.sql \
  supabase/schemas/50.rpc_dataset_columns__apply_dictionaries.sql \
  supabase/migrations/*_dictionary_bindings.sql shared/types/database.types.ts \
  supabase/tests/database/permissions/rls_dataset_columns__dictionary_bindings.test.sql \
  supabase/tests/database/dictionary_bindings \
  supabase/tests/database/permissions/exact_data_api_grants.test.sql \
  apps/desktop/sync/syncable-tables.ts apps/desktop/migrations/*_dictionary_bindings.gen.sql
git status --short supabase/config.toml   # may be modified by the switch; must not be staged
git commit -m "feat(data-dictionaries): add dictionary bindings and the apply RPC

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The DictionaryBinding model

The binding's read model, its parsers, the shape the apply RPC takes (`DictionaryBinding.Input`), and the RPC's refusal hints.

**Files:**
- Create: `shared/models/dataDictionaries/DictionaryBinding/DictionaryBinding.types.ts`
- Create: `shared/models/dataDictionaries/DictionaryBinding/DictionaryBindingParsers.ts` (+ test)
- Create: `shared/models/dataDictionaries/DictionaryBinding/DictionaryBindingModule/DictionaryBindingModule.ts` (+ test)
- Create: `shared/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts`

- [ ] **Step 1: Write the failing tests.**

`shared/models/dataDictionaries/DictionaryBinding/DictionaryBindingParsers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DictionaryBindingParsers } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";

const ROW = {
  applied_dictionary_version: 3,
  code_list_id: null,
  created_at: "2026-11-12T10:00:00+00:00",
  dataset_column_id: "11111111-1111-4111-8111-111111111111",
  dataset_id: "22222222-2222-4222-8222-222222222222",
  dictionary_id: "33333333-3333-4333-8333-333333333333",
  direction: "decode" as const,
  entry_id: "44444444-4444-4444-8444-444444444444",
  id: "55555555-5555-4555-8555-555555555555",
  mode: "reference" as const,
  updated_at: "2026-11-12T10:00:00+00:00",
  workspace_id: "66666666-6666-4666-8666-666666666666",
};

describe("DictionaryBindingParsers", () => {
  it("reads a description-only binding with no code list", () => {
    const binding = DictionaryBindingParsers.fromDBReadToModelRead(ROW);

    expect(binding.codeListId).toBeUndefined();
    expect(binding.entryId).toBe(ROW.entry_id);
    expect(binding.mode).toBe("reference");
  });

  it("refuses a mode the schema does not know", () => {
    expect(() => {
      return DictionaryBindingParsers.fromDBReadToModelRead({
        ...ROW,
        mode: "translate" as "reference",
      });
    }).toThrow();
  });
});
```

`shared/models/dataDictionaries/DictionaryBinding/DictionaryBindingModule/DictionaryBindingModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";

describe("DictionaryBinding.toApplyErrorHint", () => {
  it("reads a hint the apply RPC sends", () => {
    expect(
      DictionaryBinding.toApplyErrorHint({ hint: "dataset_editor_required" }),
    ).toBe("dataset_editor_required");
  });

  it("ignores a hint it does not know", () => {
    expect(
      DictionaryBinding.toApplyErrorHint({ hint: "something_else" }),
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2:** `pnpm vitest run shared/models/dataDictionaries/DictionaryBinding`. Expected: FAIL, the module does not exist.
- [ ] **Step 3: Write the model.**

`shared/models/dataDictionaries/DictionaryBinding/DictionaryBinding.types.ts`:

```ts
import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { DataDictionaryCodeListId } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { DataDictionaryEntryId } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DictionaryBinding";
export type DictionaryBindingId = UUID<ModelType>;

/**
 * What applying a dictionary does to a column. `reference` attaches the
 * entry's description and code list and leaves the values alone. `convert`
 * changes the values when the dataset loads.
 */
export type DictionaryBindingMode = "reference" | "convert";

/**
 * Which side of each code pair the column holds. `decode`: the column holds
 * codes, such as 1 and 2. `encode`: it holds labels, such as Male.
 */
export type DictionaryBindingDirection = "decode" | "encode";

/** One dataset column bound to one dictionary entry. */
type DictionaryBindingRead = Model.Base<
  ModelType,
  {
    /** The dictionary's version when this binding was written */
    appliedDictionaryVersion: number;

    /** The entry's code list chosen for this column, if it has one */
    codeListId: DataDictionaryCodeListId | undefined;

    /** Timestamp of when the binding was created */
    createdAt: string;

    /** The bound column */
    datasetColumnId: DatasetColumn.Id;

    /** The dataset the column belongs to */
    datasetId: Dataset.Id;

    /** The dictionary the entry belongs to. Undefined once it is deleted. */
    dictionaryId: DataDictionaryId | undefined;

    /** Which side of each pair the column holds */
    direction: DictionaryBindingDirection;

    /** The bound entry. Undefined once it is deleted. */
    entryId: DataDictionaryEntryId | undefined;

    /** Unique identifier of the binding */
    id: DictionaryBindingId;

    /** Whether the column's values are converted or only explained */
    mode: DictionaryBindingMode;

    /** Timestamp of when the binding was last updated */
    updatedAt: string;

    /** Workspace this binding belongs to, always its dataset's */
    workspaceId: Workspace.Id;
  }
>;

/**
 * One column's binding as the apply RPC takes it: everything the user
 * chose, nothing the database fills in.
 */
export type DictionaryBindingInput = {
  datasetColumnId: DatasetColumn.Id;
  dictionaryId: DataDictionaryId;
  entryId: DataDictionaryEntryId;
  codeListId: DataDictionaryCodeListId | undefined;
  mode: DictionaryBindingMode;
  direction: DictionaryBindingDirection;
};

/**
 * A stable reason `rpc_dataset_columns__apply_dictionaries` refuses an
 * apply, sent as the error's `hint`.
 */
export type DictionaryBindingApplyErrorHint =
  | "dataset_editor_required"
  | "dictionary_viewer_required"
  | "binding_payload_invalid"
  | "binding_mode_unsupported"
  | "column_not_in_dataset"
  | "entry_not_in_dictionary"
  | "code_list_not_in_entry";

/** CRUD type definitions for the DictionaryBinding model. */
export type DictionaryBindingModel = SupabaseCrudModelSpec<
  {
    tableName: "dataset_columns__dictionary_bindings";
    modelName: "DictionaryBinding";
    modelPrimaryKeyType: DictionaryBindingId;
    modelTypes: {
      Read: DictionaryBindingRead;
      Insert: SetOptional<
        DictionaryBindingRead,
        | "codeListId"
        | "createdAt"
        | "dictionaryId"
        | "direction"
        | "entryId"
        | "id"
        | "mode"
        | "updatedAt"
      >;
      Update: Partial<DictionaryBindingRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
```

`shared/models/dataDictionaries/DictionaryBinding/DictionaryBindingParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { DataDictionaryCodeListId } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { DataDictionaryEntryId } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type {
  DictionaryBindingId,
  DictionaryBindingModel,
} from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  applied_dictionary_version: z.number().int(),
  code_list_id: z.uuid().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  dataset_column_id: z.uuid(),
  dataset_id: z.uuid(),
  dictionary_id: z.uuid().nullable(),
  direction: z.enum(["decode", "encode"]),
  entry_id: z.uuid().nullable(),
  id: z.uuid(),
  mode: z.enum(["reference", "convert"]),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/**
 * Parses `public.dataset_columns__dictionary_bindings` rows. Writes go
 * through `rpc_dataset_columns__apply_dictionaries`, so the insert and
 * update transforms exist only to satisfy the CRUD client.
 */
export const DictionaryBindingParsers =
  makeParserRegistry<DictionaryBindingModel>().build({
    modelName: "DictionaryBinding",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DictionaryBindingModel["Read"] => {
        return Model.make("DictionaryBinding", {
          ...obj,
          id: obj.id as DictionaryBindingId,
          codeListId: obj.codeListId as DataDictionaryCodeListId | undefined,
          datasetColumnId: obj.datasetColumnId as DatasetColumn.Id,
          datasetId: obj.datasetId as Dataset.Id,
          dictionaryId: obj.dictionaryId as DataDictionaryId | undefined,
          entryId: obj.entryId as DataDictionaryEntryId | undefined,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps(["code_list_id", "dictionary_id", "entry_id"]),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps(["code_list_id", "dictionary_id", "entry_id"]),
    ),
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = DictionaryBindingModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
```

`shared/models/dataDictionaries/DictionaryBinding/DictionaryBindingModule/DictionaryBindingModule.ts`:

```ts
import type { DictionaryBindingApplyErrorHint } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.types.ts";

const APPLY_ERROR_HINTS: readonly DictionaryBindingApplyErrorHint[] = [
  "dataset_editor_required",
  "dictionary_viewer_required",
  "binding_payload_invalid",
  "binding_mode_unsupported",
  "column_not_in_dataset",
  "entry_not_in_dictionary",
  "code_list_not_in_entry",
];

/**
 * The apply RPC's `hint` on a thrown database error, when it is one the
 * client knows how to explain.
 */
function toApplyErrorHint(
  error: unknown,
): DictionaryBindingApplyErrorHint | undefined {
  if (typeof error !== "object" || error === null || !("hint" in error)) {
    return undefined;
  }
  const { hint } = error;
  return APPLY_ERROR_HINTS.find((knownHint) => {
    return knownHint === hint;
  });
}

/**
 * Helpers for dictionary bindings, such as reading why an apply was
 * refused so a view can explain it.
 */
export const DictionaryBindingModule = {
  toApplyErrorHint,
};
```

`shared/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DictionaryBindingApplyErrorHint,
  DictionaryBindingDirection,
  DictionaryBindingId,
  DictionaryBindingInput,
  DictionaryBindingMode,
  DictionaryBindingModel,
} from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.types.ts";

export { DictionaryBindingParsers } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBindingParsers.ts";
export { DictionaryBindingModule as DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBindingModule/DictionaryBindingModule.ts";

/** Public namespace for dataset columns bound to dictionary entries. */
export namespace DictionaryBinding {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof DictionaryBindingModel = "Read"> =
    DictionaryBindingModel[K];

  /** Identifies a binding. */
  export type Id = DictionaryBindingId;

  /** Whether a column's values are converted or only explained. */
  export type Mode = DictionaryBindingMode;

  /** Which side of each code pair a column holds. */
  export type Direction = DictionaryBindingDirection;

  /** One column's binding as the apply RPC takes it. */
  export type Input = DictionaryBindingInput;

  /** Why the apply RPC refused an apply. */
  export type ApplyErrorHint = DictionaryBindingApplyErrorHint;
}
```

- [ ] **Step 4:** `pnpm vitest run shared/models/dataDictionaries/DictionaryBinding`. Expected: PASS (4 tests). The parser file's `ZodConsistencyTests` type check needs Task 3's generated types; `pnpm exec tsc -b --force --noEmit` must be clean.
- [ ] **Step 5: Commit** `shared/models/dataDictionaries/DictionaryBinding` as `feat(data-dictionaries): add the dictionary binding model`.

---

### Task 5: ColumnCodes: what a dictionary says about a column

One non-persisted model that every surface reads: `fromRows` joins bindings to their dictionary, entry, and code list (leaving out a binding whose rows are gone or hidden from the reader), `toContext` keeps what a model needs, `fromStoredPairs` reads stored snake_case pairs without zod (the edge function uses it), `formatPairs` and `formatDescription` write prompt text (30 pairs then "and n more", 120 characters of description), and `findPairByLabel` finds the code for a label or accepted spelling, ignoring case, never matching a blank label. It imports nothing but types, so the `chat` edge function can load it.

**Files:**
- Create: `shared/models/dataDictionaries/ColumnCodes/ColumnCodes.types.ts`
- Create: `shared/models/dataDictionaries/ColumnCodes/ColumnCodesModule/ColumnCodesModule.ts` (+ test)
- Create: `shared/models/dataDictionaries/ColumnCodes/ColumnCodes.ts`

- [ ] **Step 1: Write the failing test.**

`shared/models/dataDictionaries/ColumnCodes/ColumnCodesModule/ColumnCodesModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";

const SEX_PAIRS: ColumnCodes.Pair[] = [
  { code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false },
  { code: "2", label: "Female", acceptedSpellings: ["F"], isMissing: false },
  { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
];

const ROWS: ColumnCodes.Rows = {
  bindings: [
    {
      datasetColumnId: "col-gender",
      dictionaryId: "dict-1",
      entryId: "entry-sex",
      codeListId: "list-sex",
      mode: "reference",
      direction: "decode",
    },
    {
      datasetColumnId: "col-case",
      dictionaryId: "dict-1",
      entryId: "entry-case",
      codeListId: undefined,
      mode: "reference",
      direction: "decode",
    },
    {
      datasetColumnId: "col-orphan",
      dictionaryId: undefined,
      entryId: undefined,
      codeListId: undefined,
      mode: "reference",
      direction: "decode",
    },
  ],
  dictionaries: [{ id: "dict-1", name: "NYS measles case report" }],
  entries: [
    { id: "entry-sex", name: "sex", description: "Sex on the report." },
    { id: "entry-case", name: "case_id", description: undefined },
  ],
  codeLists: [
    { id: "list-sex", name: "Sex (1/2/9)", isOrdered: false, pairs: SEX_PAIRS },
  ],
};

describe("ColumnCodes.fromRows", () => {
  it("joins a binding to its dictionary, entry, and code list", () => {
    const codes = ColumnCodes.fromRows(ROWS).get("col-gender");

    expect(codes).toMatchObject({
      dictionaryName: "NYS measles case report",
      entryName: "sex",
      codeListName: "Sex (1/2/9)",
      description: "Sex on the report.",
      pairs: SEX_PAIRS,
    });
  });

  it("keeps a description-only binding with no pairs", () => {
    const codes = ColumnCodes.fromRows(ROWS).get("col-case");

    expect(codes?.pairs).toEqual([]);
    expect(codes?.codeListName).toBeUndefined();
  });

  it("leaves out a binding whose entry is gone", () => {
    expect(ColumnCodes.fromRows(ROWS).has("col-orphan")).toBe(false);
  });
});

describe("ColumnCodes.fromStoredPairs", () => {
  it("reads stored snake_case pairs", () => {
    expect(
      ColumnCodes.fromStoredPairs([
        {
          code: "1",
          label: "Male",
          accepted_spellings: ["M"],
          is_missing: false,
        },
      ]),
    ).toEqual([
      { code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false },
    ]);
  });

  it("skips a pair without a code", () => {
    expect(ColumnCodes.fromStoredPairs([{ label: "Male" }, "junk"])).toEqual(
      [],
    );
  });
});

describe("ColumnCodes.formatPairs", () => {
  it("writes codes with their labels and marks missing values", () => {
    expect(
      ColumnCodes.formatPairs({ direction: "decode", pairs: SEX_PAIRS }),
    ).toBe("1=Male, 2=Female, 9=Unknown (missing)");
  });

  it("says when a code has no label yet", () => {
    expect(
      ColumnCodes.formatPairs({
        direction: "decode",
        pairs: [{ ...SEX_PAIRS[0]!, label: "  " }],
      }),
    ).toBe("1=(no label)");
  });

  it("lists only the labels for a column that holds labels", () => {
    expect(
      ColumnCodes.formatPairs({ direction: "encode", pairs: SEX_PAIRS }),
    ).toBe("Male, Female, Unknown (missing)");
  });

  it("stops after 30 pairs and says how many more there are", () => {
    const pairs = Array.from({ length: 42 }, (_, index) => {
      return {
        code: String(index),
        label: `Label ${index}`,
        acceptedSpellings: [],
        isMissing: false,
      };
    });

    const text = ColumnCodes.formatPairs({ direction: "decode", pairs });

    expect(text.endsWith("29=Label 29, and 12 more")).toBe(true);
  });
});

describe("ColumnCodes.formatDescription", () => {
  it("cuts a long description to 120 characters", () => {
    const text = ColumnCodes.formatDescription("word ".repeat(40));

    expect(text?.length).toBeLessThanOrEqual(120);
    expect(text?.endsWith("...")).toBe(true);
  });

  it("gives nothing for a blank description", () => {
    expect(ColumnCodes.formatDescription("   ")).toBeUndefined();
  });
});

describe("ColumnCodes.findPairByLabel", () => {
  it("finds a pair by its label, ignoring case", () => {
    expect(
      ColumnCodes.findPairByLabel(
        { direction: "decode", pairs: SEX_PAIRS },
        "female",
      )?.code,
    ).toBe("2");
  });

  it("finds a pair by an accepted spelling", () => {
    expect(
      ColumnCodes.findPairByLabel(
        { direction: "decode", pairs: SEX_PAIRS },
        "m",
      )?.code,
    ).toBe("1");
  });

  it("never matches a blank label", () => {
    expect(
      ColumnCodes.findPairByLabel(
        {
          direction: "decode",
          pairs: [{ ...SEX_PAIRS[0]!, label: "", acceptedSpellings: [] }],
        },
        "",
      ),
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2:** `pnpm vitest run shared/models/dataDictionaries/ColumnCodes`. Expected: FAIL, the module does not exist.
- [ ] **Step 3: Write the model.**

`shared/models/dataDictionaries/ColumnCodes/ColumnCodes.types.ts`:

```ts
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";

/** One value of a column's code list: the code, what it means, and more. */
export type ColumnCodePair = {
  code: string;
  /** Blank while nobody has said what the code means. */
  label: string;
  acceptedSpellings: readonly string[];
  isMissing: boolean;
};

/**
 * What a model is told about one bound column: which side of the pairs the
 * column holds, the pairs, and the entry's description. Plain JSON, so it
 * can sit in a cached dataset schema.
 */
export type ColumnCodesContext = {
  direction: DictionaryBinding.Direction;
  /** Empty for an entry with no code list, which only describes. */
  pairs: readonly ColumnCodePair[];
  description?: string;
};

/**
 * Everything Avandar shows about one bound column: the context a model
 * gets, plus where it came from for the code-list popover and the rail.
 */
export type ColumnCodesT = ColumnCodesContext & {
  datasetColumnId: string;
  dictionaryId: string;
  dictionaryName: string;
  entryName: string;
  codeListName: string | undefined;
  isOrdered: boolean;
  mode: DictionaryBinding.Mode;
};

/**
 * The rows `ColumnCodes.fromRows` joins, in a shape both the browser's
 * models and an edge function's raw rows can fill.
 */
export type ColumnCodesRows = {
  bindings: ReadonlyArray<{
    datasetColumnId: string;
    dictionaryId: string | undefined;
    entryId: string | undefined;
    codeListId: string | undefined;
    mode: DictionaryBinding.Mode;
    direction: DictionaryBinding.Direction;
  }>;
  dictionaries: ReadonlyArray<{ id: string; name: string }>;
  entries: ReadonlyArray<{
    id: string;
    name: string;
    description: string | undefined;
  }>;
  codeLists: ReadonlyArray<{
    id: string;
    name: string;
    isOrdered: boolean;
    pairs: readonly ColumnCodePair[];
  }>;
};
```

`shared/models/dataDictionaries/ColumnCodes/ColumnCodesModule/ColumnCodesModule.ts`:

```ts
import type {
  ColumnCodePair,
  ColumnCodesContext,
  ColumnCodesRows,
  ColumnCodesT,
} from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.types.ts";

/** The most pairs one column lists in a prompt before "and n more". */
const MAX_PROMPT_PAIRS = 30;

/** The longest description one column carries into a prompt. */
const MAX_PROMPT_DESCRIPTION_CHARS = 120;

/** Trims, lowercases, and collapses inner spaces, for comparing labels. */
function _toComparable(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function _byId<Row extends { id: string }>(
  rows: readonly Row[],
): Map<string, Row> {
  return new Map(
    rows.map((row) => {
      return [row.id, row] as const;
    }),
  );
}

/**
 * Joins bindings to the dictionary rows they name, one result per bound
 * column. A binding whose dictionary or entry is gone, or not visible to
 * the reader, is left out.
 */
function fromRows(rows: Readonly<ColumnCodesRows>): Map<string, ColumnCodesT> {
  const dictionaries = _byId(rows.dictionaries);
  const entries = _byId(rows.entries);
  const codeLists = _byId(rows.codeLists);
  const result = new Map<string, ColumnCodesT>();
  rows.bindings.forEach((binding) => {
    const dictionary = dictionaries.get(binding.dictionaryId ?? "");
    const entry = entries.get(binding.entryId ?? "");
    if (!dictionary || !entry) {
      return;
    }
    const codeList = codeLists.get(binding.codeListId ?? "");
    result.set(binding.datasetColumnId, {
      datasetColumnId: binding.datasetColumnId,
      dictionaryId: dictionary.id,
      dictionaryName: dictionary.name,
      entryName: entry.name,
      description: entry.description,
      codeListName: codeList?.name,
      isOrdered: codeList?.isOrdered ?? false,
      pairs: codeList?.pairs ?? [],
      mode: binding.mode,
      direction: binding.direction,
    });
  });
  return result;
}

/** The part of a column's codes a model reads. */
function toContext(codes: Readonly<ColumnCodesContext>): ColumnCodesContext {
  return {
    direction: codes.direction,
    pairs: codes.pairs,
    ...(codes.description ? { description: codes.description } : {}),
  };
}

function _isStoredPair(value: unknown): value is {
  code: string;
  label: string;
  accepted_spellings?: unknown;
  is_missing?: unknown;
} {
  const pair = value as { code?: unknown; label?: unknown } | null;
  return typeof pair?.code === "string" && typeof pair.label === "string";
}

/**
 * Reads `data_dictionaries__code_lists.pairs` as stored (snake_case JSON).
 * A malformed pair is skipped rather than failing the whole list.
 */
function fromStoredPairs(value: unknown): ColumnCodePair[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(_isStoredPair).map((pair) => {
    const spellings = Array.isArray(pair.accepted_spellings)
      ? pair.accepted_spellings.filter((spelling): spelling is string => {
          return typeof spelling === "string";
        })
      : [];
    return {
      code: pair.code,
      label: pair.label,
      acceptedSpellings: spellings,
      isMissing: pair.is_missing === true,
    };
  });
}

function _formatPair(
  pair: Readonly<ColumnCodePair>,
  direction: ColumnCodesContext["direction"],
): string {
  const label = pair.label.trim() === "" ? "(no label)" : pair.label.trim();
  const missing = pair.isMissing ? " (missing)" : "";
  return direction === "decode"
    ? `${pair.code}=${label}${missing}`
    : `${label}${missing}`;
}

/**
 * A column's pairs as one line of prompt text, such as `1=Male, 2=Female,
 * 9=Unknown (missing)`. A column holding labels lists just the labels.
 * Past 30 pairs it ends with "and 12 more".
 */
function formatPairs(codes: Readonly<ColumnCodesContext>): string {
  const pairs =
    codes.direction === "encode"
      ? codes.pairs.filter((pair) => {
          return pair.label.trim() !== "";
        })
      : codes.pairs;
  const shown = pairs.slice(0, MAX_PROMPT_PAIRS).map((pair) => {
    return _formatPair(pair, codes.direction);
  });
  const hiddenCount = pairs.length - shown.length;
  return hiddenCount > 0
    ? `${shown.join(", ")}, and ${hiddenCount} more`
    : shown.join(", ");
}

/** A description cut to 120 characters for a prompt, or undefined. */
function formatDescription(
  description: string | undefined,
): string | undefined {
  const text = description?.trim().replace(/\s+/g, " ") ?? "";
  if (text === "") {
    return undefined;
  }
  return text.length > MAX_PROMPT_DESCRIPTION_CHARS
    ? `${text.slice(0, MAX_PROMPT_DESCRIPTION_CHARS - 3).trimEnd()}...`
    : text;
}

/**
 * The pair whose label or accepted spelling is `text`, ignoring case and
 * spaces, or undefined. A blank label never matches.
 */
function findPairByLabel(
  codes: Readonly<ColumnCodesContext>,
  text: string,
): ColumnCodePair | undefined {
  const wanted = _toComparable(text);
  if (wanted === "") {
    return undefined;
  }
  return codes.pairs.find((pair) => {
    return [pair.label, ...pair.acceptedSpellings].some((spelling) => {
      return spelling.trim() !== "" && _toComparable(spelling) === wanted;
    });
  });
}

/**
 * Pure helpers for what a dictionary says about a bound column: joining a
 * binding to its dictionary rows, reading stored pairs, and writing the
 * pairs into a model's prompt. Used wherever a bound column is shown or
 * described, for example a code-list popover or the data agent's schema.
 */
export const ColumnCodesModule = {
  MAX_PROMPT_PAIRS,
  MAX_PROMPT_DESCRIPTION_CHARS,
  fromRows,
  toContext,
  fromStoredPairs,
  formatPairs,
  formatDescription,
  findPairByLabel,
};
```

`shared/models/dataDictionaries/ColumnCodes/ColumnCodes.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ColumnCodePair,
  ColumnCodesContext,
  ColumnCodesRows,
  ColumnCodesT,
} from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.types.ts";

export { ColumnCodesModule as ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodesModule/ColumnCodesModule.ts";

/** Public namespace for what a dictionary says about one bound column. */
export namespace ColumnCodes {
  export type T = ColumnCodesT;
  export type Pair = ColumnCodePair;
  export type Context = ColumnCodesContext;
  export type Rows = ColumnCodesRows;
}
```

- [ ] **Step 4:** `pnpm vitest run shared/models/dataDictionaries/ColumnCodes`. Expected: PASS (14 tests).
- [ ] **Step 5: Commit** `shared/models/dataDictionaries/ColumnCodes` as `feat(data-dictionaries): describe a bound column's codes for screens and prompts`.

---

### Task 6: DictionaryMatch: matching columns to entries

Scores one profiled column against one entry with the spec's weights (name 0.45 against the entry's name and its other column names, values 0.35 as the share of the column's rows its best code list covers, type 0.2 from the entry's kind), rescaled when values cannot be compared. The best list and direction win, the primary list and decoding winning ties. Under `ColumnProfile.SUGGESTION_SCORE` (0.6) there is no match. A coded entry whose list covers under half the rows is `values_dont_fit`; an entry without codes is a `description`. Matches sort deterministically: score, coverage, the dictionary's place in the list, the entry's position, then id by code unit, so the order never depends on input order. `pickDefaultMatch` starts a column on the list covering the most rows, else the best description, never on a list that does not fit.

**Files:**
- Modify: `shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts`
- Create: `shared/models/dataDictionaries/DictionaryMatch/DictionaryMatch.types.ts`
- Create: `shared/models/dataDictionaries/DictionaryMatch/DictionaryMatchModule/DictionaryMatchModule.ts` (+ test)
- Create: `shared/models/dataDictionaries/DictionaryMatch/DictionaryMatch.ts`

- [ ] **Step 1: Write the failing test.**

`shared/models/dataDictionaries/DictionaryMatch/DictionaryMatchModule/DictionaryMatchModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const NYS = "dict-nys" as DataDictionary.Id;
const CDC = "dict-cdc" as DataDictionary.Id;

function _profile(
  columnName: string,
  values: ReadonlyArray<readonly [string, number]> | undefined,
  dataType: ColumnProfile.T["dataType"] = "bigint",
): ColumnProfile.T {
  const listed = values?.map(([value, rowCount]) => {
    return { value, rowCount };
  });
  const rowCount = (listed ?? []).reduce((sum, item) => {
    return sum + item.rowCount;
  }, 0);
  return {
    datasetId: "dataset-1" as Dataset.Id,
    datasetName: "Bronx line list",
    columnName,
    dataType,
    rowCount,
    nonNullCount: rowCount,
    distinctCount: listed?.length ?? 1000,
    values: listed,
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _pairs(
  pairs: ReadonlyArray<readonly [string, string]>,
): DataDictionaryCodeList.Pair[] {
  return pairs.map(([code, label]) => {
    return { code, label, acceptedSpellings: [], isMissing: false };
  });
}

function _entry(
  options: Partial<DictionaryMatch.Entry> &
    Pick<DictionaryMatch.Entry, "entryId" | "entryName">,
): DictionaryMatch.Entry {
  return {
    dictionaryId: NYS,
    dictionaryRank: 0,
    columnNames: [],
    kind: "categorical",
    position: 0,
    codeLists: [],
    ...options,
  };
}

const SEX_129 = {
  id: "list-129" as DataDictionaryCodeList.Id,
  name: "Sex (1/2/9)",
  pairs: _pairs([
    ["1", "Male"],
    ["2", "Female"],
    ["9", "Unknown"],
  ]),
};
const SEX_MFU = {
  id: "list-mfu" as DataDictionaryCodeList.Id,
  name: "Sex (M/F/U)",
  pairs: _pairs([
    ["M", "Male"],
    ["F", "Female"],
    ["U", "Unknown"],
  ]),
};
const GENDER = _profile("GENDER", [
  ["1", 611],
  ["2", 577],
  ["9", 16],
]);

describe("DictionaryMatch.getEntryMatch", () => {
  it("picks the code list that covers the column's values", () => {
    const match = DictionaryMatch.getEntryMatch(
      GENDER,
      _entry({
        entryId: "entry-sex" as DataDictionaryEntry.Id,
        entryName: "sex",
        columnNames: ["GENDER"],
        codeLists: [SEX_MFU, SEX_129],
      }),
    );

    expect(match).toMatchObject({
      codeListId: SEX_129.id,
      coverage: 1,
      direction: "decode",
      fit: "fits",
    });
  });

  it("reads a column of labels as labels", () => {
    const match = DictionaryMatch.getEntryMatch(
      _profile(
        "sex",
        [
          ["Male", 10],
          ["female", 8],
        ],
        "varchar",
      ),
      _entry({
        entryId: "entry-sex" as DataDictionaryEntry.Id,
        entryName: "sex",
        codeLists: [SEX_129],
      }),
    );

    expect(match?.direction).toBe("encode");
    expect(match?.coverage).toBe(1);
  });

  it("says the values do not fit when the names match but the codes do not", () => {
    const match = DictionaryMatch.getEntryMatch(
      GENDER,
      _entry({
        entryId: "entry-sex" as DataDictionaryEntry.Id,
        entryName: "sex",
        columnNames: ["GENDER"],
        codeLists: [SEX_MFU],
      }),
    );

    expect(match?.fit).toBe("values_dont_fit");
    expect(match?.coverage).toBe(0);
  });

  it("matches an entry with no codes as a description", () => {
    const match = DictionaryMatch.getEntryMatch(
      _profile("CaseNo", undefined, "varchar"),
      _entry({
        entryId: "entry-case" as DataDictionaryEntry.Id,
        entryName: "case_id",
        columnNames: ["CaseNo"],
        kind: "identifier",
      }),
    );

    expect(match?.fit).toBe("description");
  });

  it("ignores an entry whose name and values share nothing with the column", () => {
    expect(
      DictionaryMatch.getEntryMatch(
        GENDER,
        _entry({
          entryId: "entry-zip" as DataDictionaryEntry.Id,
          entryName: "zip_code",
          kind: "text",
        }),
      ),
    ).toBeUndefined();
  });
});

describe("DictionaryMatch.findColumnMatches", () => {
  const nysSex = _entry({
    entryId: "entry-nys-sex" as DataDictionaryEntry.Id,
    entryName: "sex",
    columnNames: ["GENDER"],
    codeLists: [SEX_MFU],
  });
  const cdcSex = _entry({
    dictionaryId: CDC,
    dictionaryRank: 1,
    entryId: "entry-cdc-sex" as DataDictionaryEntry.Id,
    entryName: "sex",
    columnNames: ["GENDER"],
    codeLists: [SEX_129],
  });

  it("puts the match whose codes fit first", () => {
    const matches = DictionaryMatch.findColumnMatches(
      [GENDER],
      [nysSex, cdcSex],
    ).get("GENDER");

    expect(
      matches?.map((match) => {
        return match.dictionaryId;
      }),
    ).toEqual([CDC, NYS]);
  });

  it("orders matches the same whatever order the entries arrive in", () => {
    const forward = DictionaryMatch.findColumnMatches(
      [GENDER],
      [nysSex, cdcSex],
    );
    const backward = DictionaryMatch.findColumnMatches(
      [GENDER],
      [cdcSex, nysSex],
    );

    expect(backward).toEqual(forward);
  });

  it("breaks a tie by the dictionary's place in the list", () => {
    const sameInCdc = { ...cdcSex, codeLists: [SEX_129] };
    const sameInNys = { ...nysSex, codeLists: [SEX_129] };

    const matches = DictionaryMatch.findColumnMatches(
      [GENDER],
      [sameInCdc, sameInNys],
    ).get("GENDER");

    expect(matches?.[0]?.dictionaryId).toBe(NYS);
  });
});

describe("DictionaryMatch.pickDefaultMatch", () => {
  it("never starts a column on a list whose values do not fit", () => {
    const match = DictionaryMatch.getEntryMatch(
      GENDER,
      _entry({
        entryId: "entry-sex" as DataDictionaryEntry.Id,
        entryName: "sex",
        columnNames: ["GENDER"],
        codeLists: [SEX_MFU],
      }),
    );

    expect(
      DictionaryMatch.pickDefaultMatch(match ? [match] : []),
    ).toBeUndefined();
  });

  it("falls back to a description when no list fits", () => {
    const description = DictionaryMatch.getEntryMatch(
      _profile("CaseNo", undefined, "varchar"),
      _entry({
        entryId: "entry-case" as DataDictionaryEntry.Id,
        entryName: "case_id",
        columnNames: ["CaseNo"],
        kind: "identifier",
      }),
    );

    expect(
      DictionaryMatch.pickDefaultMatch(description ? [description] : [])?.fit,
    ).toBe("description");
  });
});
```

- [ ] **Step 2:** `pnpm vitest run shared/models/dataDictionaries/DictionaryMatch`. Expected: FAIL, the module does not exist.
- [ ] **Step 3: Expose the name score.** Slice 2 imports `getNameScore` but does not put it on the module:

`shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts`:

```diff
--- a/shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts
+++ b/shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts
@@ -422,6 +422,12 @@
    * weights rescaled when values cannot be compared.
    */
   getMatchScore,
+
+  /**
+   * How alike two column names are, from 0 to 1, from the words they
+   * share. `zip_code` and `ZIP` score 1.
+   */
+  getNameScore,
 
   /**
    * A scorer for the name scores of many columns: it tokenizes each name
```

- [ ] **Step 4: Write the model.**

`shared/models/dataDictionaries/DictionaryMatch/DictionaryMatch.types.ts`:

```ts
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";

/**
 * How an entry's values relate to a column's. `fits`: half or more of the
 * column's rows hold a code or label from the entry's code list.
 * `values_dont_fit`: the entry has codes but the column's values are not
 * them. `description`: the entry has no codes, so only its description
 * applies.
 */
export type DictionaryMatchFit = "fits" | "values_dont_fit" | "description";

/**
 * A dictionary entry ready to be matched against columns: its names, kind,
 * and the code lists it recognizes, primary first. `dictionaryRank` is the
 * dictionary's place in the user's list, which breaks ties.
 */
export type DictionaryMatchEntry = {
  dictionaryId: DataDictionary.Id;
  dictionaryRank: number;
  entryId: DataDictionaryEntry.Id;
  entryName: string;
  columnNames: readonly string[];
  kind: DataDictionaryEntry.Kind;
  position: number;
  codeLists: ReadonlyArray<{
    id: DataDictionaryCodeList.Id;
    name: string;
    pairs: readonly DataDictionaryCodeList.Pair[];
  }>;
};

/** How well one dictionary entry matches one dataset column. */
export type DictionaryMatchT = {
  dictionaryId: DataDictionary.Id;
  dictionaryRank: number;
  entryId: DataDictionaryEntry.Id;
  entryName: string;
  position: number;
  /** The entry's code list that fits the column best, if it has any. */
  codeListId: DataDictionaryCodeList.Id | undefined;
  codeListName: string | undefined;
  /**
   * The share of the column's rows the code list covers, from 0 to 1.
   * Undefined for a description, or when the column has too many values
   * to list.
   */
  coverage: number | undefined;
  /** Whether the column holds the list's codes or its labels. */
  direction: DictionaryBinding.Direction;
  fit: DictionaryMatchFit;
  /** Name 0.45, values 0.35, type 0.2, rescaled when values are unknown. */
  score: number;
};
```

`shared/models/dataDictionaries/DictionaryMatch/DictionaryMatchModule/DictionaryMatchModule.ts`:

```ts
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DataDictionaryEntryCoding } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.ts";
import type {
  DictionaryMatchEntry,
  DictionaryMatchT,
} from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch.types.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";

/** A code list fits a column when it covers at least this share of rows. */
const FITS_SHARE = 0.5;

type ListCoverage = {
  codeListId: DataDictionaryCodeList.Id;
  codeListName: string;
  coverage: number | undefined;
  direction: DictionaryMatchT["direction"];
};

/** Orders two ids by code unit, so the order never depends on locale. */
function _compareIds(idA: string, idB: string): number {
  if (idA === idB) {
    return 0;
  }
  return idA < idB ? -1 : 1;
}

/** How well a column's data type suits an entry's kind: 1, 0.5, or 0. */
function _getKindTypeScore(
  kind: DataDictionaryEntry.Kind,
  dataType: AvaDataType.T,
): number {
  const expected =
    kind === "number"
      ? ["bigint", "double"]
      : kind === "date"
        ? ["date", "timestamp"]
        : undefined;
  if (!expected || expected.includes(dataType)) {
    return 1;
  }
  return dataType === "varchar" ? 0.5 : 0;
}

function _getEntryNameScore(
  columnName: string,
  entry: Readonly<DictionaryMatchEntry>,
): number {
  return Math.max(
    ...[entry.entryName, ...entry.columnNames].map((name) => {
      return ColumnProfile.getNameScore(columnName, name);
    }),
  );
}

/** The share of a profiled column's rows whose value is one of `keys`. */
function _getCoverage(
  profile: Readonly<ColumnProfile.T>,
  keys: ReadonlySet<string>,
): number | undefined {
  if (!profile.values) {
    return undefined;
  }
  let totalRows = 0;
  let coveredRows = 0;
  profile.values.forEach((item) => {
    totalRows += item.rowCount;
    if (keys.has(ColumnProfile.getComparisonKey(item.value))) {
      coveredRows += item.rowCount;
    }
  });
  return totalRows === 0 ? undefined : coveredRows / totalRows;
}

function _getListCoverages(
  profile: Readonly<ColumnProfile.T>,
  list: DictionaryMatchEntry["codeLists"][number],
): ListCoverage[] {
  const codeKeys = new Set(
    list.pairs.map((pair) => {
      return ColumnProfile.getComparisonKey(pair.code);
    }),
  );
  const labelKeys = new Set(
    list.pairs
      .flatMap((pair) => {
        return [pair.label, ...pair.acceptedSpellings];
      })
      .filter((spelling) => {
        return spelling.trim() !== "";
      })
      .map(ColumnProfile.getComparisonKey),
  );
  const base = { codeListId: list.id, codeListName: list.name };
  return [
    { ...base, coverage: _getCoverage(profile, codeKeys), direction: "decode" },
    {
      ...base,
      coverage: _getCoverage(profile, labelKeys),
      direction: "encode",
    },
  ];
}

/**
 * The list and direction covering the most rows. The first best wins, so
 * the primary list beats an equal one and codes beat labels on a tie.
 */
function _getBestCoverage(
  profile: Readonly<ColumnProfile.T>,
  entry: Readonly<DictionaryMatchEntry>,
): ListCoverage | undefined {
  return entry.codeLists
    .flatMap((list) => {
      return _getListCoverages(profile, list);
    })
    .reduce<ListCoverage | undefined>((best, candidate) => {
      return best && (candidate.coverage ?? -1) <= (best.coverage ?? -1)
        ? best
        : candidate;
    }, undefined);
}

/** Name 0.45, type 0.2, values 0.35, rescaled when values are unknown. */
function _getScore(
  nameScore: number,
  typeScore: number,
  coverage: number | undefined,
): number {
  const weighted = 0.45 * nameScore + 0.2 * typeScore;
  return coverage === undefined ? weighted / 0.65 : weighted + 0.35 * coverage;
}

/**
 * How well one entry matches one profiled column, or undefined below the
 * suggestion score.
 */
function getEntryMatch(
  profile: Readonly<ColumnProfile.T>,
  entry: Readonly<DictionaryMatchEntry>,
): DictionaryMatchT | undefined {
  const best = _getBestCoverage(profile, entry);
  const score = _getScore(
    _getEntryNameScore(profile.columnName, entry),
    _getKindTypeScore(entry.kind, profile.dataType),
    best?.coverage,
  );
  if (score < ColumnProfile.SUGGESTION_SCORE) {
    return undefined;
  }
  const isFitting = (best?.coverage ?? 0) >= FITS_SHARE;
  return {
    dictionaryId: entry.dictionaryId,
    dictionaryRank: entry.dictionaryRank,
    entryId: entry.entryId,
    entryName: entry.entryName,
    position: entry.position,
    codeListId: best?.codeListId,
    codeListName: best?.codeListName,
    coverage: best?.coverage,
    direction: best?.direction ?? "decode",
    fit: !best ? "description" : isFitting ? "fits" : "values_dont_fit",
    score,
  };
}

/**
 * Orders matches best first: score, then coverage, then the dictionary's
 * place in the list, then the entry's place in its dictionary, then id. The
 * order never depends on the order the inputs arrived in.
 */
function compareMatches(
  matchA: Readonly<DictionaryMatchT>,
  matchB: Readonly<DictionaryMatchT>,
): number {
  return (
    matchB.score - matchA.score ||
    (matchB.coverage ?? -1) - (matchA.coverage ?? -1) ||
    matchA.dictionaryRank - matchB.dictionaryRank ||
    matchA.position - matchB.position ||
    _compareIds(matchA.entryId, matchB.entryId)
  );
}

/** Every entry that matches each profiled column, best first, by name. */
function findColumnMatches(
  profiles: readonly ColumnProfile.T[],
  entries: readonly DictionaryMatchEntry[],
): Map<string, DictionaryMatchT[]> {
  return new Map(
    profiles.map((profile) => {
      const matches = entries
        .flatMap((entry) => {
          const match = getEntryMatch(profile, entry);
          return match ? [match] : [];
        })
        .sort(compareMatches);
      return [profile.columnName, matches] as const;
    }),
  );
}

/**
 * The match a column starts with: the code list covering the most of its
 * rows, else the best description-only entry. A list whose values do not
 * fit is never picked for the user.
 */
function pickDefaultMatch(
  matches: readonly DictionaryMatchT[],
): DictionaryMatchT | undefined {
  const fitting = matches
    .filter((match) => {
      return match.fit === "fits";
    })
    .sort((matchA, matchB) => {
      return (
        (matchB.coverage ?? 0) - (matchA.coverage ?? 0) ||
        compareMatches(matchA, matchB)
      );
    });
  return (
    fitting[0] ??
    matches.find((match) => {
      return match.fit === "description";
    })
  );
}

/**
 * Builds the entries of `dictionaries` for matching, in that order. Each
 * entry's code lists come from its codings, primary first.
 */
function toMatchEntries(
  options: Readonly<{
    dictionaries: ReadonlyArray<{ id: DataDictionary.Id }>;
    entries: readonly DataDictionaryEntry.T[];
    codeLists: readonly DataDictionaryCodeList.T[];
    codings: readonly DataDictionaryEntryCoding.T[];
  }>,
): DictionaryMatchEntry[] {
  const rankById = new Map(
    options.dictionaries.map((dictionary, index) => {
      return [dictionary.id, index] as const;
    }),
  );
  const listsById = new Map(
    options.codeLists.map((list) => {
      return [list.id, list] as const;
    }),
  );
  return options.entries.flatMap((entry) => {
    const rank = rankById.get(entry.dictionaryId);
    return rank === undefined
      ? []
      : [_toMatchEntry({ entry, rank, listsById, codings: options.codings })];
  });
}

function _toMatchEntry(
  options: Readonly<{
    entry: DataDictionaryEntry.T;
    rank: number;
    listsById: ReadonlyMap<DataDictionaryCodeList.Id, DataDictionaryCodeList.T>;
    codings: readonly DataDictionaryEntryCoding.T[];
  }>,
): DictionaryMatchEntry {
  const { entry } = options;
  const codeLists = options.codings
    .filter((coding) => {
      return coding.entryId === entry.id;
    })
    .sort((codingA, codingB) => {
      return (
        Number(codingB.isPrimary) - Number(codingA.isPrimary) ||
        _compareIds(codingA.codeListId, codingB.codeListId)
      );
    })
    .flatMap((coding) => {
      const list = options.listsById.get(coding.codeListId);
      return list ? [{ id: list.id, name: list.name, pairs: list.pairs }] : [];
    });
  return {
    dictionaryId: entry.dictionaryId,
    dictionaryRank: options.rank,
    entryId: entry.id,
    entryName: entry.name,
    columnNames: entry.columnNames,
    kind: entry.kind,
    position: entry.position,
    codeLists,
  };
}

/**
 * Pure helpers for matching dataset columns to dictionary entries when a
 * dictionary is applied: how well each entry fits each profiled column,
 * which code list and direction fit best, and the match a column starts
 * with. Runs on the device from column profiles, so it works offline.
 */
export const DictionaryMatchModule = {
  FITS_SHARE,
  toMatchEntries,
  getEntryMatch,
  findColumnMatches,
  compareMatches,
  pickDefaultMatch,
};
```

`shared/models/dataDictionaries/DictionaryMatch/DictionaryMatch.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DictionaryMatchEntry,
  DictionaryMatchFit,
  DictionaryMatchT,
} from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch.types.ts";

export { DictionaryMatchModule as DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatchModule/DictionaryMatchModule.ts";

/** Public namespace for matching dataset columns to dictionary entries. */
export namespace DictionaryMatch {
  export type T = DictionaryMatchT;
  export type Entry = DictionaryMatchEntry;
  export type Fit = DictionaryMatchFit;
}
```

- [ ] **Step 5:** `pnpm vitest run shared/models/dataDictionaries`. Expected: PASS, slice 2's `ColumnProfile` tests included.
- [ ] **Step 6: Commit** `shared/models/dataDictionaries/DictionaryMatch` and `ColumnProfileModule.ts` as `feat(data-dictionaries): match dataset columns to dictionary entries`.

---

### Task 7: The binding client and loading column codes

`DictionaryBindingClient` reads bindings through the CRUD client (on the desktop, through its SQLite mirror) and writes them only through `applyToDataset`. `loadColumnCodes(workspaceId)` reads every binding in a workspace and the dictionary rows they name, with the user's permissions, for the agents' dataset schemas. Codes only add context, so a failed read logs and returns none instead of stopping a schema from loading.

**Files:**
- Create: `src/clients/dataDictionaries/DictionaryBindingClient.ts`
- Create: `src/lib/dataDictionaries/loadColumnCodes/loadColumnCodes.ts` (+ test)

- [ ] **Step 1: Write the failing test.**

`src/lib/dataDictionaries/loadColumnCodes/loadColumnCodes.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadColumnCodes } from "@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes";
import type { Workspace } from "$/models/Workspace/Workspace";

const { bindingsMock, dictionariesMock, entriesMock, codeListsMock } =
  vi.hoisted(() => {
    return {
      bindingsMock: vi.fn(),
      dictionariesMock: vi.fn(),
      entriesMock: vi.fn(),
      codeListsMock: vi.fn(),
    };
  });

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return { DictionaryBindingClient: { getAll: bindingsMock } };
});
vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return { DataDictionaryClient: { getAll: dictionariesMock } };
  },
);
vi.mock("@/clients/dataDictionaries/DataDictionaryEntryClient", () => {
  return { DataDictionaryEntryClient: { getAll: entriesMock } };
});
vi.mock("@/clients/dataDictionaries/DataDictionaryCodeListClient", () => {
  return { DataDictionaryCodeListClient: { getAll: codeListsMock } };
});

const WORKSPACE_ID = "workspace-1" as Workspace.Id;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadColumnCodes", () => {
  it("reads nothing else when no column is bound", async () => {
    bindingsMock.mockResolvedValue([]);

    const codes = await loadColumnCodes(WORKSPACE_ID);

    expect(codes.size).toBe(0);
    expect(dictionariesMock).not.toHaveBeenCalled();
  });

  it("joins each binding to its dictionary, entry, and code list", async () => {
    bindingsMock.mockResolvedValue([
      {
        datasetColumnId: "col-gender",
        dictionaryId: "dict-1",
        entryId: "entry-sex",
        codeListId: "list-sex",
        mode: "reference",
        direction: "decode",
      },
    ]);
    dictionariesMock.mockResolvedValue([{ id: "dict-1", name: "NYS codes" }]);
    entriesMock.mockResolvedValue([
      { id: "entry-sex", name: "sex", description: undefined },
    ]);
    codeListsMock.mockResolvedValue([
      {
        id: "list-sex",
        name: "Sex (1/2/9)",
        isOrdered: false,
        pairs: [
          { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
        ],
      },
    ]);

    const codes = await loadColumnCodes(WORKSPACE_ID);

    expect(codes.get("col-gender")?.codeListName).toBe("Sex (1/2/9)");
    expect(codeListsMock).toHaveBeenCalledWith({
      where: { id: { in: ["list-sex"] } },
    });
  });

  it("gives no codes when the bindings cannot be read", async () => {
    bindingsMock.mockRejectedValue(new Error("Failed to fetch"));

    await expect(loadColumnCodes(WORKSPACE_ID)).resolves.toEqual(new Map());
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/lib/dataDictionaries/loadColumnCodes`. Expected: FAIL.
- [ ] **Step 3: Write the client and the loader.**

`src/clients/dataDictionaries/DictionaryBindingClient.ts`:

```ts
import { DictionaryBindingParsers } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _bindingToRpcArg(binding: DictionaryBinding.Input) {
  return {
    dataset_column_id: binding.datasetColumnId,
    dictionary_id: binding.dictionaryId,
    entry_id: binding.entryId,
    code_list_id: binding.codeListId ?? null,
    mode: binding.mode,
    direction: binding.direction,
  };
}

/**
 * Reads the dictionary bindings of dataset columns, and replaces a dataset's
 * bindings in one call with `applyToDataset`. Bindings are never written row
 * by row, so a dataset never holds half of an apply.
 */
export const DictionaryBindingClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DictionaryBinding",
    tableName: "dataset_columns__dictionary_bindings",
    dbTablePrimaryKey: "id",
    parsers: DictionaryBindingParsers,
    mutations: ({ clientLogger, dbClient }) => {
      return {
        /**
         * Replaces every binding of one dataset with `bindings` in one
         * transaction and returns how many were written. A refusal rejects
         * with the RPC's `hint`.
         */
        applyToDataset: async (
          options: Readonly<{
            datasetId: Dataset.Id;
            bindings: readonly DictionaryBinding.Input[];
          }>,
        ): Promise<number> => {
          const logger = clientLogger.appendName("applyToDataset");
          logger.log("Applying dictionaries", {
            datasetId: options.datasetId,
            bindingCount: options.bindings.length,
          });
          const { data } = await dbClient
            .rpc("rpc_dataset_columns__apply_dictionaries", {
              p_dataset_id: options.datasetId,
              p_bindings: options.bindings.map(_bindingToRpcArg),
            })
            .throwOnError();
          return data;
        },
      };
    },
  }),
  {
    mutationFns: ["applyToDataset"],
  },
);
```

`src/lib/dataDictionaries/loadColumnCodes/loadColumnCodes.ts`:

```ts
import { isDefined, prop, where } from "@avandar/utils";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { Logger } from "@/utils/Logger";
import type { Workspace } from "$/models/Workspace/Workspace";

function _uniqueIds<Id extends string>(
  ids: ReadonlyArray<Id | undefined>,
): Id[] {
  return [...new Set(ids.filter(isDefined))];
}

async function _readColumnCodes(
  workspaceId: Workspace.Id,
): Promise<Map<string, ColumnCodes.T>> {
  const bindings = await DictionaryBindingClient.getAll(
    where("workspace_id", "eq", workspaceId),
  );
  if (bindings.length === 0) {
    return new Map();
  }
  const dictionaryIds = _uniqueIds(bindings.map(prop("dictionaryId")));
  const entryIds = _uniqueIds(bindings.map(prop("entryId")));
  const codeListIds = _uniqueIds(bindings.map(prop("codeListId")));
  const [dictionaries, entries, codeLists] = await Promise.all([
    dictionaryIds.length === 0
      ? []
      : DataDictionaryClient.getAll(where("id", "in", dictionaryIds)),
    entryIds.length === 0
      ? []
      : DataDictionaryEntryClient.getAll(where("id", "in", entryIds)),
    codeListIds.length === 0
      ? []
      : DataDictionaryCodeListClient.getAll(where("id", "in", codeListIds)),
  ]);
  return ColumnCodes.fromRows({ bindings, dictionaries, entries, codeLists });
}

/**
 * What every attached dictionary says about the workspace's bound columns,
 * by dataset column id, read with the user's own permissions. A column whose
 * dictionary the user cannot read is left out. Used where a model is told
 * about datasets, for example the data agent's dataset schema. Codes only
 * add context, so a failed read logs and returns none rather than stopping
 * the schema from loading.
 */
export async function loadColumnCodes(
  workspaceId: Workspace.Id,
): Promise<Map<string, ColumnCodes.T>> {
  try {
    return await _readColumnCodes(workspaceId);
  } catch (error) {
    Logger.error(error);
    return new Map();
  }
}
```

- [ ] **Step 4:** `pnpm vitest run src/lib/dataDictionaries/loadColumnCodes`. Expected: PASS (3 tests).
- [ ] **Step 5: Commit** both paths as `feat(data-dictionaries): read and apply dictionary bindings`.

---

### Task 8: Hooks: editing a dataset, a dataset's codes, and whether it has any

`useCanEditDataset` reads the user's effective role on a dataset (an app role or a share), which is what the RPC checks. `useDatasetColumnCodes` loads one dataset's bindings (refetched on mount, since the apply flow changes them) and the rows they name, keyed by column id and by column name. `useDatasetHasBindings` answers whether anything is applied, false while loading, so the dataset menu never flashes an item it then hides.

**Files:**
- Create: `src/hooks/datasets/useCanEditDataset/useCanEditDataset.ts`
- Create: `src/hooks/dataDictionaries/useDatasetColumnCodes/useDatasetColumnCodes.ts`
- Create: `src/hooks/dataDictionaries/useDatasetHasBindings.ts`

These hooks are thin wrappers over client hooks and `ColumnCodes.fromRows` (tested in Task 5). They are covered by the components that use them (Tasks 10, 11, 20) and the e2e spec.

- [ ] **Step 1: Write the hooks.**

`src/hooks/datasets/useCanEditDataset/useCanEditDataset.ts`:

```ts
import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * Whether the signed-in user may edit one dataset, from their effective
 * role on it (an app role or a share). Use it to offer an action only to
 * people the server will let do it, such as applying a dictionary.
 */
export function useCanEditDataset(datasetId: Dataset.Id | undefined): {
  canEdit: boolean;
  isLoading: boolean;
} {
  const [role, isLoading] = useResourceRole({
    resourceType: "dataset",
    resourceId: datasetId,
  });
  return { canEdit: role === "editor" || role === "admin", isLoading };
}
```

`src/hooks/dataDictionaries/useDatasetColumnCodes/useDatasetColumnCodes.ts`:

```ts
import { isDefined, prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const NO_BINDINGS: DictionaryBinding.T[] = [];

/** What a dataset's attached dictionaries say about its columns. */
export type DatasetColumnCodes = {
  /** By dataset column id. */
  byColumnId: ReadonlyMap<string, ColumnCodes.T>;
  /** By column name, for views that only know a column's name. */
  byColumnName: ReadonlyMap<string, ColumnCodes.T>;
  isLoading: boolean;
};

function _uniqueIds<Id extends string>(
  ids: ReadonlyArray<Id | undefined>,
): Id[] {
  return [...new Set(ids.filter(isDefined))];
}

type BoundDictionaryRows = Omit<ColumnCodes.Rows, "bindings"> & {
  isLoading: boolean;
};

/** The dictionaries, entries, and code lists a set of bindings names. */
function useBoundDictionaryRows(
  bindings: readonly DictionaryBinding.T[],
): BoundDictionaryRows {
  const ids = useMemo(() => {
    return {
      dictionaryIds: _uniqueIds(bindings.map(prop("dictionaryId"))),
      entryIds: _uniqueIds(bindings.map(prop("entryId"))),
      codeListIds: _uniqueIds(bindings.map(prop("codeListId"))),
    };
  }, [bindings]);
  const [dictionaries, isLoadingDictionaries] = DataDictionaryClient.useGetAll({
    ...where("id", "in", ids.dictionaryIds),
    useQueryOptions: { enabled: ids.dictionaryIds.length > 0 },
  });
  const [entries, isLoadingEntries] = DataDictionaryEntryClient.useGetAll({
    ...where("id", "in", ids.entryIds),
    useQueryOptions: { enabled: ids.entryIds.length > 0 },
  });
  const [codeLists, isLoadingCodeLists] =
    DataDictionaryCodeListClient.useGetAll({
      ...where("id", "in", ids.codeListIds),
      useQueryOptions: { enabled: ids.codeListIds.length > 0 },
    });
  const isLoading =
    isLoadingDictionaries || isLoadingEntries || isLoadingCodeLists;
  return useMemo(() => {
    return {
      dictionaries: dictionaries ?? [],
      entries: entries ?? [],
      codeLists: codeLists ?? [],
      isLoading,
    };
  }, [dictionaries, entries, codeLists, isLoading]);
}

/**
 * What the dictionaries attached to one dataset say about its columns: each
 * bound column's code list and description, read with the user's own
 * permissions. Bindings refetch on mount, so a dataset page opened right
 * after an apply shows it. Use it wherever a dataset's columns are listed,
 * for example its metadata or the Data Explorer's grid.
 */
export function useDatasetColumnCodes(
  options: Readonly<{
    datasetId: Dataset.Id | undefined;
    columns: ReadonlyArray<Pick<DatasetColumn.T, "id" | "name">> | undefined;
  }>,
): DatasetColumnCodes {
  const [bindings, isLoadingBindings] = DictionaryBindingClient.useGetAll({
    ...where("dataset_id", "eq", options.datasetId),
    useQueryOptions: {
      ...ALWAYS_REFETCH_ON_MOUNT,
      enabled: options.datasetId !== undefined,
    },
  });
  const boundBindings = bindings ?? NO_BINDINGS;
  const rows = useBoundDictionaryRows(boundBindings);
  const byColumnId = useMemo(() => {
    return ColumnCodes.fromRows({ ...rows, bindings: boundBindings });
  }, [rows, boundBindings]);
  const byColumnName = useMemo(() => {
    return new Map(
      (options.columns ?? []).flatMap((column) => {
        const codes = byColumnId.get(column.id);
        return codes ? [[column.name, codes] as const] : [];
      }),
    );
  }, [options.columns, byColumnId]);
  return {
    byColumnId,
    byColumnName,
    isLoading: isLoadingBindings || rows.isLoading,
  };
}
```

`src/hooks/dataDictionaries/useDatasetHasBindings.ts`:

```ts
import { where } from "@avandar/utils";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * Whether any dictionary is attached to a dataset's columns. Use it to
 * offer an action only to a dataset with no dictionary yet, such as
 * learning a dictionary from it. `hasBindings` is false while loading.
 */
export function useDatasetHasBindings(datasetId: Dataset.Id): {
  hasBindings: boolean;
  isLoading: boolean;
} {
  const [bindings, isLoading] = DictionaryBindingClient.useGetAll({
    ...where("dataset_id", "eq", datasetId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  return {
    hasBindings: (bindings?.length ?? 0) > 0,
    isLoading: isLoading || bindings === undefined,
  };
}
```

- [ ] **Step 2:** `pnpm exec tsc -b --force --noEmit`. Expected: clean.
- [ ] **Step 3: Commit** the three paths as `feat(data-dictionaries): read a dataset's column codes`.

---

### Task 9: The code-list popover

A small tag button after a bound column's name opens a popover with the list's name, every pair (`9  Unknown (missing value)`, or "No label yet" for a blank label), and where it came from: "From <dictionary> › <entry>. Attached as reference. The values in the data are unchanged." It opens on hover, on keyboard focus, and on click, and closes a moment after the pointer or focus leaves, or on Escape, returning focus to the tag. A click only opens it: in a browser the pointer or focus has already opened it before the click lands, so a toggle would close it again. A click does not bubble, so a grid header does not sort. The dialog is named after the button.

**Files:**
- Create: `src/components/dataDictionaries/CodeListPopover/useHoverOrFocusOpen.ts`
- Create: `src/components/dataDictionaries/CodeListPopover/CodeListPopoverContent.tsx`
- Create: `src/components/dataDictionaries/CodeListPopover/CodeListPopover.module.css`
- Create: `src/components/dataDictionaries/CodeListPopover/CodeListPopover.tsx` (+ test)

- [ ] **Step 1: Write the failing test.**

`src/components/dataDictionaries/CodeListPopover/CodeListPopover.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";

const CODES: ColumnCodes.T = {
  datasetColumnId: "col-gender",
  dictionaryId: "dict-1",
  dictionaryName: "NYS measles case report",
  entryName: "sex",
  codeListName: "Sex (1/2/9)",
  isOrdered: false,
  mode: "reference",
  direction: "decode",
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
    { code: "2", label: "", acceptedSpellings: [], isMissing: false },
    { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
  ],
};

describe("CodeListPopover", () => {
  it("shows the code list when the tag gets keyboard focus", async () => {
    render(<CodeListPopover columnName="GENDER" codes={CODES} />);

    fireEvent.focus(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Code list for GENDER",
    });
    expect(dialog).toHaveTextContent("Sex (1/2/9)");
    expect(dialog).toHaveTextContent("Unknown (missing value)");
    expect(dialog).toHaveTextContent(
      "From NYS measles case report › sex. Attached as reference.",
    );
  });

  it("says a code has no label yet", async () => {
    render(<CodeListPopover columnName="GENDER" codes={CODES} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );

    expect(await screen.findByText("No label yet")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<CodeListPopover columnName="GENDER" codes={CODES} />);
    const tag = screen.getByRole("button", { name: "Code list for GENDER" });
    fireEvent.click(tag);
    const dialog = await screen.findByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/components/dataDictionaries`. Expected: FAIL.
- [ ] **Step 3: Write the component.**

`src/components/dataDictionaries/CodeListPopover/useHoverOrFocusOpen.ts`:

```ts
import { useEffect, useRef, useState } from "react";

/** How long a popover waits after the pointer leaves before it closes. */
const CLOSE_DELAY_MS = 150;

type HoverOrFocusOpen = {
  isOpen: boolean;
  open: () => void;
  /** Closes after a short delay, so the pointer can cross to the popover. */
  closeSoon: () => void;
  close: () => void;
};

/**
 * Open state for a popover that opens on hover, on keyboard focus, and on
 * click, and closes a moment after the pointer or focus leaves. A click
 * only opens: the pointer or focus already opened it before the click
 * lands, so toggling would close it again. Use it for a popover that only
 * shows information, such as a column's code list.
 */
export function useHoverOrFocusOpen(): HoverOrFocusOpen {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const cancelClose = (): void => {
    clearTimeout(closeTimerRef.current);
  };
  useEffect(() => {
    return cancelClose;
  }, []);
  return {
    isOpen,
    open: () => {
      cancelClose();
      setIsOpen(true);
    },
    closeSoon: () => {
      cancelClose();
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, CLOSE_DELAY_MS);
    },
    close: () => {
      cancelClose();
      setIsOpen(false);
    },
  };
}
```

`src/components/dataDictionaries/CodeListPopover/CodeListPopoverContent.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Stack, Table, Text } from "@mantine/core";
import css from "@/components/dataDictionaries/CodeListPopover/CodeListPopover.module.css";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  codes: ColumnCodes.T;
};

function PairLabel({ pair }: Readonly<{ pair: ColumnCodes.Pair }>): ReactNode {
  const label = pair.label.trim();
  return (
    <>
      {label === "" ? (
        <Text span c="dimmed" fs="italic" size="sm">
          <Trans>No label yet</Trans>
        </Text>
      ) : (
        label
      )}
      {pair.isMissing ? (
        <Text span c="dimmed" size="sm">
          {" "}
          <Trans>(missing value)</Trans>
        </Text>
      ) : null}
    </>
  );
}

/**
 * What a column's code list says: its name, every pair, and where it came
 * from. The body of `CodeListPopover`.
 */
export function CodeListPopoverContent({ codes }: Readonly<Props>): ReactNode {
  const { dictionaryName, entryName } = codes;
  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        {codes.codeListName ?? entryName}
      </Text>
      <Table className={css.codeListPopoverTable} verticalSpacing={2}>
        <Table.Tbody>
          {codes.pairs.map((pair) => {
            return (
              <Table.Tr key={pair.code}>
                <Table.Td className={css.codeListPopoverCode}>
                  {pair.code}
                </Table.Td>
                <Table.Td>
                  <PairLabel pair={pair} />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed">
        <Trans>
          From {dictionaryName} › {entryName}. Attached as reference. The values
          in the data are unchanged.
        </Trans>
      </Text>
    </Stack>
  );
}
```

`src/components/dataDictionaries/CodeListPopover/CodeListPopover.module.css`:

```css
/* Codes in a fixed-width column so the labels line up. */
.codeListPopoverTable {
  font-size: var(--mantine-font-size-sm);
}

.codeListPopoverCode {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
  width: 1%;
}
```

`src/components/dataDictionaries/CodeListPopover/CodeListPopover.tsx`:

```tsx
import { ActionIcon } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Popover } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import { CodeListPopoverContent } from "@/components/dataDictionaries/CodeListPopover/CodeListPopoverContent";
import { useHoverOrFocusOpen } from "@/components/dataDictionaries/CodeListPopover/useHoverOrFocusOpen";
import { POPOVER_Z_INDEX } from "@/config/Theme/Theme";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  /** The column the code list explains, named in the button's label. */
  columnName: string;
  codes: ColumnCodes.T;
};

/**
 * A tag button that shows what a column's codes mean. It opens on hover,
 * on keyboard focus, and on click, and Escape closes it. Use it next to a
 * column a dictionary is attached to, for example in a column list or a
 * results grid's header.
 */
export function CodeListPopover({
  columnName,
  codes,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const popover = useHoverOrFocusOpen();
  const label = t`Code list for ${columnName}`;
  return (
    <Popover
      opened={popover.isOpen}
      onChange={(isOpen) => {
        return isOpen ? popover.open() : popover.close();
      }}
      position="bottom-start"
      width={300}
      shadow="md"
      withArrow
      returnFocus
      zIndex={POPOVER_Z_INDEX}
    >
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-label={label}
          onMouseEnter={popover.open}
          onMouseLeave={popover.closeSoon}
          onFocus={popover.open}
          onBlur={popover.closeSoon}
          onClick={(event) => {
            // In a grid header, a click that bubbles up would sort the column.
            event.stopPropagation();
            popover.open();
          }}
        >
          <IconTag size={14} aria-hidden />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown
        aria-label={label}
        onMouseEnter={popover.open}
        onMouseLeave={popover.closeSoon}
      >
        <CodeListPopoverContent codes={codes} />
      </Popover.Dropdown>
    </Popover>
  );
}
```

- [ ] **Step 4:** `pnpm vitest run src/components/dataDictionaries`. Expected: PASS (3 tests).
- [ ] **Step 5: Commit** `src/components/dataDictionaries` as `feat(data-dictionaries): show a column's code list in a popover`.

---

### Task 10: Codes on the dataset page

The Metadata tab's column list shows the tag after a bound column's name, and under the name the entry's description captioned "From <dictionary>" when the column has no description of its own (a column's own description always wins). It goes under the name because `ObjectDescriptionList` hands a cell only its own value, never its row, so the Description cell cannot tell which column it is in (see Refinements). The Columns section's count reads "22 · 7 with a code list: hover the tag to read it". Each Data Summary section puts the tag after its type. The rail gains a Dictionaries group naming each attached dictionary (a link to it) with "Attached as reference · data unchanged", and shows nothing while none is attached. The rail's new prop is optional, since the video producer renders the rail with no dictionary data.

**Files:**
- Create: `src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/EntryDescription.tsx`
- Create: `src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/BoundColumnName.tsx` (+ test)
- Create: `src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/useColumnsSectionMeta.ts`
- Create: `src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/DatasetDictionariesRailGroup.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetMetadataList.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetSourceRail.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection/ColumnSection.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx`

- [ ] **Step 1: Write the failing test.**

`src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/BoundColumnName.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { BoundColumnName } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/BoundColumnName";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";

const CODES = {
  dictionaryName: "NYS codes",
  entryName: "sex",
  codeListName: "Sex (1/2/9)",
  description: "Sex recorded on the case report.",
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  ],
} as unknown as ColumnCodes.T;

describe("BoundColumnName", () => {
  it("shows the entry's description, from its dictionary, for a column with none", () => {
    render(
      <BoundColumnName name="GENDER" codes={CODES} showsEntryDescription />,
    );

    expect(
      screen.getByText("Sex recorded on the case report."),
    ).toBeInTheDocument();
    expect(screen.getByText("From NYS codes")).toBeInTheDocument();
  });

  it("lets a column's own description win", () => {
    render(
      <BoundColumnName
        name="GENDER"
        codes={CODES}
        showsEntryDescription={false}
      />,
    );

    expect(screen.queryByText("Sex recorded on the case report.")).toBeNull();
  });

  it("puts a code-list tag after the name", () => {
    render(
      <BoundColumnName name="GENDER" codes={CODES} showsEntryDescription />,
    );

    expect(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes`. Expected: FAIL.
- [ ] **Step 3: Write the pieces.**

`src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/EntryDescription.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  codes: ColumnCodes.T;
};

/**
 * A dictionary entry's description, shown for a column that has none of
 * its own, captioned with where it came from.
 */
export function EntryDescription({ codes }: Readonly<Props>): ReactNode {
  const { dictionaryName } = codes;
  return (
    <Stack gap={0}>
      <Text size="sm">{codes.description}</Text>
      <Text size="xs" c="dimmed">
        <Trans>From {dictionaryName}</Trans>
      </Text>
    </Stack>
  );
}
```

`src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/BoundColumnName.tsx`:

```tsx
import { Group, Stack } from "@mantine/core";
import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
import { EntryDescription } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/EntryDescription";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  name: string;
  codes: ColumnCodes.T;
  /** False when the column has a description of its own, which wins. */
  showsEntryDescription: boolean;
};

/**
 * A bound column's name in the dataset's column list: the name, the tag
 * that opens its code list, and the entry's description when the column
 * has none of its own.
 */
export function BoundColumnName({
  name,
  codes,
  showsEntryDescription,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap={2}>
      <Group gap={4} wrap="nowrap">
        <span>{name}</span>
        {codes.pairs.length > 0 ? (
          <CodeListPopover columnName={name} codes={codes} />
        ) : null}
      </Group>
      {showsEntryDescription && codes.description ? (
        <EntryDescription codes={codes} />
      ) : null}
    </Stack>
  );
}
```

`src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/useColumnsSectionMeta.ts`:

```ts
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";

/**
 * The Columns section's count: `22`, or `22 · 7 with a code list: hover
 * the tag to read it` once dictionaries are attached. Undefined until the
 * columns load.
 */
export function useColumnsSectionMeta(
  options: Readonly<{
    columnCount: number | undefined;
    columnCodes: ReadonlyMap<string, ColumnCodes.T>;
  }>,
): string | undefined {
  const { t, i18n } = useLingui();
  if (options.columnCount === undefined) {
    return undefined;
  }
  const columnCountText = i18n.number(options.columnCount);
  const codedCount = [...options.columnCodes.values()].filter((codes) => {
    return codes.pairs.length > 0;
  }).length;
  if (codedCount === 0) {
    return columnCountText;
  }
  const codedText = plural(codedCount, {
    one: "# with a code list: hover the tag to read it",
    other: "# with a code list: hover the tag to read it",
  });
  return t`${columnCountText} · ${codedText}`;
}
```

`src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/DatasetDictionariesRailGroup.tsx`:

```tsx
import { Link } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  columnCodes: ReadonlyMap<string, ColumnCodes.T>;
};

/** Each attached dictionary once, sorted by name. */
function _listDictionaries(
  columnCodes: ReadonlyMap<string, ColumnCodes.T>,
): Array<{ id: string; name: string }> {
  const byId = new Map<string, string>();
  columnCodes.forEach((codes) => {
    byId.set(codes.dictionaryId, codes.dictionaryName);
  });
  return [...byId]
    .map(([id, name]) => {
      return { id, name };
    })
    .sort((dictionaryA, dictionaryB) => {
      return dictionaryA.name < dictionaryB.name ? -1 : 1;
    });
}

/**
 * The rail group naming each dictionary attached to a dataset and how it
 * was applied. Nothing renders while no dictionary is attached.
 */
export function DatasetDictionariesRailGroup({
  columnCodes,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const dictionaries = _listDictionaries(columnCodes);
  if (dictionaries.length === 0) {
    return null;
  }
  return (
    <AppViewRail.Group title={<Trans>Dictionaries</Trans>}>
      {dictionaries.map((dictionary) => {
        const link = AppLinks.dataManagerDictionaryView({
          workspaceSlug: workspace.slug,
          dictionaryId: dictionary.id,
          dictionaryName: dictionary.name,
        });
        return (
          <AppViewRail.Fact key={dictionary.id} label={t`Dictionary`}>
            <Link to={link.to} params={link.params} size="sm">
              {dictionary.name}
            </Link>
            <Text component="span" display="block" size="xs" c="dimmed">
              <Trans>Attached as reference · data unchanged</Trans>
            </Text>
          </AppViewRail.Fact>
        );
      })}
    </AppViewRail.Group>
  );
}
```

- [ ] **Step 4: Wire them into the dataset page.**

`src/views/DataManagerApp/DatasetMetaView/DatasetMetadataList.tsx`:

```diff
--- a/src/views/DataManagerApp/DatasetMetaView/DatasetMetadataList.tsx
+++ b/src/views/DataManagerApp/DatasetMetaView/DatasetMetadataList.tsx
@@ -9,6 +9,8 @@
 import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
 import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
 import { notifySuccess } from "@/utils/notifications/notify";
+import { BoundColumnName } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/BoundColumnName";
+import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
 import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
 import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
@@ -42,6 +44,8 @@
 
 type Props = {
   dataset: DatasetWithColumnsAndSource;
+  /** What attached dictionaries say about each column, by column name. */
+  columnCodesByName: ReadonlyMap<string, ColumnCodes.T>;
 };
 
 /**
@@ -54,7 +58,10 @@
  * record: that gives a column's name the same visual weight as the CSV escape
  * character.
  */
-export function DatasetMetadataList({ dataset }: Props): JSX.Element {
+export function DatasetMetadataList({
+  dataset,
+  columnCodesByName,
+}: Props): JSX.Element {
   const { t } = useLingui();
 
   // Only the three shown columns get a header. Anything else falls back to
@@ -108,6 +115,24 @@
         itemRenderOptions={{
           includeKeys: ["name", "dataType", "description"],
           keyRenderOptions: {
+            name: {
+              // The table hands a cell only its own value, so a bound
+              // column's entry description shows under its name.
+              renderValue: (name) => {
+                const columnName = String(name);
+                const codes = columnCodesByName.get(columnName);
+                const ownDescription = dataset.columns?.find((column) => {
+                  return column.name === columnName;
+                })?.description;
+                return codes ? (
+                  <BoundColumnName
+                    name={columnName}
+                    codes={codes}
+                    showsEntryDescription={!ownDescription}
+                  />
+                ) : undefined;
+              },
+            },
             description: {
               renderAsType: "text",
             },
```

`src/views/DataManagerApp/DatasetMetaView/DatasetSourceRail.tsx`:

```diff
--- a/src/views/DataManagerApp/DatasetMetaView/DatasetSourceRail.tsx
+++ b/src/views/DataManagerApp/DatasetMetaView/DatasetSourceRail.tsx
@@ -2,6 +2,8 @@
 import { Trans, useLingui } from "@lingui/react/macro";
 import { match } from "ts-pattern";
 import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
+import { DatasetDictionariesRailGroup } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/DatasetDictionariesRailGroup";
+import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
 import type { Dataset } from "$/models/datasets/Dataset/Dataset";
 import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
@@ -24,8 +26,15 @@
 type Props = {
   dataset: Dataset.T;
   source: DatasetSourceRecord | undefined;
+  /**
+   * What attached dictionaries say about each column, by column id. Left
+   * out where no dictionary data is loaded, such as a preview.
+   */
+  columnCodes?: ReadonlyMap<string, ColumnCodes.T>;
 };
 
+const NO_CODES: ReadonlyMap<string, ColumnCodes.T> = new Map();
+
 /**
  * The provenance of a dataset: how it was read, and where the bytes live.
  *
@@ -41,6 +50,7 @@
 export function DatasetSourceRail({
   dataset,
   source,
+  columnCodes = NO_CODES,
 }: Readonly<Props>): ReactNode {
   const { t, i18n } = useLingui();
 
@@ -173,6 +183,7 @@
           </AppViewRail.Fact>
         ) : null}
       </AppViewRail.Group>
+      <DatasetDictionariesRailGroup columnCodes={columnCodes} />
     </AppViewRail>
   );
 }
```

`src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView.tsx`:

```diff
--- a/src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView.tsx
+++ b/src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView.tsx
@@ -4,10 +4,13 @@
 import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
 import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
 import { ColumnSection } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection/ColumnSection";
+import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import type { ReactNode } from "react";
 
 type Props = {
   datasetId: Dataset.Id;
+  /** What attached dictionaries say about each column, by column name. */
+  columnCodesByName: ReadonlyMap<string, ColumnCodes.T>;
 };
 
 /**
@@ -33,7 +36,10 @@
  * the lazy-loaders use, which works incrementally and avoids a second
  * observer pass.
  */
-export function DatasetSummaryView({ datasetId }: Readonly<Props>): ReactNode {
+export function DatasetSummaryView({
+  datasetId,
+  columnCodesByName,
+}: Readonly<Props>): ReactNode {
   const workspace = useCurrentWorkspace();
   const [meta, isLoadingMeta] = DatasetQueryClient.useGetDatasetMeta({
     datasetId,
@@ -66,6 +72,7 @@
             columnName={column.name}
             dataType={column.dataType}
             totalRows={meta.rows}
+            codes={columnCodesByName.get(column.name)}
           />
         );
       })}
```

`src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection/ColumnSection.tsx`:

```diff
--- a/src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection/ColumnSection.tsx
+++ b/src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection/ColumnSection.tsx
@@ -3,11 +3,13 @@
 import { useIntersection } from "@mantine/hooks";
 import { useContext, useEffect, useState } from "react";
 import { Dataset } from "$/models/datasets/Dataset/Dataset";
+import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
 import { ActiveColumnContext } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ActiveColumnContext";
 import css from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection/ColumnSection.module.css";
 import { ColumnSummaryBody } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSummaryBody/ColumnSummaryBody";
 import { buildFullDataTypeLabel } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/datasetSummaryLabels";
 import { makeColumnSectionIdFromColumnName } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/makeColumnSectionIdFromColumnName";
+import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import type { ReactNode } from "react";
 
 /** How far ahead of the viewport a section's summary query is started. */
@@ -24,6 +26,8 @@
   columnName: string;
   dataType: string;
   totalRows: number;
+  /** The column's code list, when a dictionary is attached to it. */
+  codes: ColumnCodes.T | undefined;
 };
 
 /** Lazily loads one column summary and updates the active outline entry. */
@@ -32,6 +36,7 @@
   columnName,
   dataType,
   totalRows,
+  codes,
 }: Props): ReactNode {
   const { i18n } = useLingui();
   const setActiveColumn = useContext(ActiveColumnContext);
@@ -97,6 +102,9 @@
           <Text className={css.columnSectionType}>
             {buildFullDataTypeLabel(dataType, i18n)}
           </Text>
+          {codes && codes.pairs.length > 0 ? (
+            <CodeListPopover columnName={columnName} codes={codes} />
+          ) : null}
         </Group>
         {isReadyToLoad ? (
           <ColumnSummaryBody
```

`src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx`:

```diff
--- a/src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx
+++ b/src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx
@@ -16,11 +16,13 @@
 import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
 import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
 import { ShareResourceButton } from "@/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton";
+import { useDatasetColumnCodes } from "@/hooks/dataDictionaries/useDatasetColumnCodes/useDatasetColumnCodes";
 import { useDatasetSourceLabels } from "@/hooks/datasets/useDatasetSourceLabels";
 import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
 import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
 import { notifyError, notifySuccess } from "@/utils/notifications/notify";
 import { DatasetActionsMenu } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu";
+import { useColumnsSectionMeta } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/useColumnsSectionMeta";
 import { DatasetMetadataList } from "@/views/DataManagerApp/DatasetMetaView/DatasetMetadataList";
 import css from "@/views/DataManagerApp/DatasetMetaView/DatasetMetaView.module.css";
 import { DatasetSourceRail } from "@/views/DataManagerApp/DatasetMetaView/DatasetSourceRail";
@@ -77,6 +79,10 @@
     });
   const [datasetColumns, isLoadingDatasetColumns] =
     DatasetColumnClient.useGetAll(where("dataset_id", "eq", dataset.id));
+  const columnCodes = useDatasetColumnCodes({
+    datasetId: dataset.id,
+    columns: datasetColumns,
+  });
   const [datasetMeta, isLoadingDatasetMeta] =
     DatasetQueryClient.useGetDatasetMeta({
       datasetId: dataset.id,
@@ -145,6 +151,10 @@
       dataset.sourceType === "pdf_file");
 
   const numColumns = datasetColumns?.length ?? datasetMeta?.columns.length;
+  const columnsSectionMeta = useColumnsSectionMeta({
+    columnCount: numColumns,
+    columnCodes: columnCodes.byColumnId,
+  });
 
   const headerFacts = [
     sourceLabels[dataset.sourceType],
@@ -178,6 +188,7 @@
       <DatasetSourceRail
         dataset={dataset}
         source={datasetWithColumnsAndSource.source}
+        columnCodes={columnCodes.byColumnId}
       />
     );
 
@@ -295,10 +306,11 @@
 
                     <AppViewSection
                       title={<Trans>Columns</Trans>}
-                      meta={numColumns === undefined ? undefined : numColumns}
+                      meta={columnsSectionMeta}
                     >
                       <DatasetMetadataList
                         dataset={datasetWithColumnsAndSource}
+                        columnCodesByName={columnCodes.byColumnName}
                       />
                     </AppViewSection>
 
@@ -318,7 +330,10 @@
                 return isLoadingFullDataset ||
                   !previewData ||
                   !datasetColumns ? null : (
-                  <DatasetSummaryView datasetId={dataset.id} />
+                  <DatasetSummaryView
+                    datasetId={dataset.id}
+                    columnCodesByName={columnCodes.byColumnName}
+                  />
                 );
               },
             }}
```

- [ ] **Step 5:** `pnpm vitest run src/views/DataManagerApp/DatasetMetaView && pnpm exec tsc -b --force --noEmit`. Expected: PASS and clean (the video producer's `SavedSource.tsx` still compiles because `columnCodes` is optional).
- [ ] **Step 6: Commit** the paths above as `feat(data-dictionaries): show attached code lists on the dataset page`.

---

### Task 11: The dataset menu's dictionary items

"Apply a dictionary" ("Show what codes mean and add column descriptions") opens the apply flow for someone who can edit the dataset and read dictionaries. "Create a dictionary from this dataset" now shows only to a dictionary editor while no dictionary is attached to the dataset, and not while that is loading. One divider follows whichever items show. The reference-only sub-line replaces the spec's "Turn codes into labels and add column descriptions" until conversions exist (see Refinements).

**Files:**
- Create: `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/ApplyDictionaryMenuItem.tsx`
- Create: `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DictionaryMenuItems.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/CreateDictionaryMenuItem.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.test.tsx`

This task needs Task 12's `AppLinks.dataManagerApplyDictionaries`. Run Task 12 first, or add that link entry here.

- [ ] **Step 1: Write the failing tests.** The menu now asks three hooks, so the test mocks each:

`src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.test.tsx`:

```diff
--- a/src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.test.tsx
+++ b/src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.test.tsx
@@ -7,18 +7,41 @@
 const { navigateMock, permissionState } = vi.hoisted(() => {
   return {
     navigateMock: vi.fn(),
-    permissionState: { canEditDictionaries: true },
+    permissionState: {
+      canEditDictionaries: true,
+      canViewDictionaries: true,
+      canEditDataset: true,
+      hasBindings: false,
+    },
   };
 });
 
 vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
   return {
-    useHasPermission: () => {
-      return permissionState.canEditDictionaries;
+    useHasPermission: (permission: string) => {
+      return permission === "data_sources__can_edit_dictionaries"
+        ? permissionState.canEditDictionaries
+        : permissionState.canViewDictionaries;
     },
   };
 });
 
+vi.mock("@/hooks/datasets/useCanEditDataset/useCanEditDataset", () => {
+  return {
+    useCanEditDataset: () => {
+      return { canEdit: permissionState.canEditDataset, isLoading: false };
+    },
+  };
+});
+
+vi.mock("@/hooks/dataDictionaries/useDatasetHasBindings", () => {
+  return {
+    useDatasetHasBindings: () => {
+      return { hasBindings: permissionState.hasBindings, isLoading: false };
+    },
+  };
+});
+
 vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
   return {
     useCurrentWorkspace: () => {
@@ -84,6 +107,9 @@
   beforeEach(() => {
     vi.clearAllMocks();
     permissionState.canEditDictionaries = true;
+    permissionState.canViewDictionaries = true;
+    permissionState.canEditDataset = true;
+    permissionState.hasBindings = false;
   });
 
   it("opens learning a dictionary from this dataset", async () => {
@@ -118,4 +144,50 @@
       }),
     ).toBeNull();
   });
+
+  it("opens applying a dictionary to this dataset", async () => {
+    render(<DatasetActionsMenu dataset={DATASET} />);
+    fireEvent.click(
+      screen.getByRole("button", { name: "More dataset actions" }),
+    );
+    fireEvent.click(
+      await screen.findByRole("menuitem", { name: /Apply a dictionary/ }),
+    );
+    expect(navigateMock).toHaveBeenCalledWith(
+      expect.objectContaining({
+        to: "/$workspaceSlug/data-manager/$datasetId/apply-dictionaries",
+        params: { workspaceSlug: "demo", datasetId: DATASET.id },
+      }),
+    );
+  });
+
+  it("does not offer Apply to someone who cannot edit the dataset", async () => {
+    permissionState.canEditDataset = false;
+    render(<DatasetActionsMenu dataset={DATASET} />);
+    fireEvent.click(
+      screen.getByRole("button", { name: "More dataset actions" }),
+    );
+    expect(
+      await screen.findByRole("menuitem", { name: /Delete Dataset/ }),
+    ).toBeInTheDocument();
+    expect(
+      screen.queryByRole("menuitem", { name: /Apply a dictionary/ }),
+    ).toBeNull();
+  });
+
+  it("stops offering to learn a dictionary once one is attached", async () => {
+    permissionState.hasBindings = true;
+    render(<DatasetActionsMenu dataset={DATASET} />);
+    fireEvent.click(
+      screen.getByRole("button", { name: "More dataset actions" }),
+    );
+    expect(
+      await screen.findByRole("menuitem", { name: /Apply a dictionary/ }),
+    ).toBeInTheDocument();
+    expect(
+      screen.queryByRole("menuitem", {
+        name: /Create a dictionary from this dataset/,
+      }),
+    ).toBeNull();
+  });
 });
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu`. Expected: the three new tests FAIL.
- [ ] **Step 3: Write the items.** `CreateDictionaryMenuItem` loses its permission check and its divider, which move to `DictionaryMenuItems`:

`src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/CreateDictionaryMenuItem.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
};

/**
 * A dataset menu's way into learning a dictionary from that dataset. It
 * opens the create flow at Review with the dataset already being read.
 * `DictionaryMenuItems` decides who sees it.
 */
export function CreateDictionaryMenuItem({
  datasetId,
}: Readonly<Props>): ReactNode {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const link = AppLinks.dataManagerNewDictionary(workspace.slug);
  return (
    <Menu.Item
      leftSection={<IconSparkles size={16} aria-hidden />}
      onClick={() => {
        navigate({
          to: link.to,
          params: link.params,
          search: { fromDatasetId: datasetId },
        });
      }}
    >
      <Text size="sm">
        <Trans>Create a dictionary from this dataset</Trans>
      </Text>
      <Text size="xs" c="dimmed">
        <Trans>Saved to Dictionaries, so other datasets can use it too</Trans>
      </Text>
    </Menu.Item>
  );
}
```

`src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/ApplyDictionaryMenuItem.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
};

/**
 * A dataset menu's way into applying dictionaries to that dataset.
 * `DictionaryMenuItems` decides who sees it.
 */
export function ApplyDictionaryMenuItem({
  datasetId,
}: Readonly<Props>): ReactNode {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  return (
    <Menu.Item
      leftSection={<IconBook size={16} aria-hidden />}
      onClick={() => {
        navigate(
          AppLinks.dataManagerApplyDictionaries({
            workspaceSlug: workspace.slug,
            datasetId,
          }),
        );
      }}
    >
      <Text size="sm">
        <Trans>Apply a dictionary</Trans>
      </Text>
      <Text size="xs" c="dimmed">
        <Trans>Show what codes mean and add column descriptions</Trans>
      </Text>
    </Menu.Item>
  );
}
```

`src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DictionaryMenuItems.tsx`:

```tsx
import { Menu } from "@mantine/core";
import { useDatasetHasBindings } from "@/hooks/dataDictionaries/useDatasetHasBindings";
import { useCanEditDataset } from "@/hooks/datasets/useCanEditDataset/useCanEditDataset";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { ApplyDictionaryMenuItem } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/ApplyDictionaryMenuItem";
import { CreateDictionaryMenuItem } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/CreateDictionaryMenuItem";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
};

/**
 * The dataset menu's dictionary actions, and a divider after them when any
 * shows. Apply shows to someone who can edit the dataset and read
 * dictionaries. Create shows to a dictionary editor while no dictionary is
 * attached to the dataset, and not while that is still loading.
 */
export function DictionaryMenuItems({ datasetId }: Readonly<Props>): ReactNode {
  const canViewDictionaries = useHasPermission(
    "data_sources__can_view_dictionaries",
  );
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );
  const { canEdit } = useCanEditDataset(datasetId);
  const { hasBindings, isLoading } = useDatasetHasBindings(datasetId);
  const canApply = canEdit && canViewDictionaries;
  const canCreate = canEditDictionaries && !isLoading && !hasBindings;
  if (!canApply && !canCreate) {
    return null;
  }
  return (
    <>
      {canApply ? <ApplyDictionaryMenuItem datasetId={datasetId} /> : null}
      {canCreate ? <CreateDictionaryMenuItem datasetId={datasetId} /> : null}
      <Menu.Divider />
    </>
  );
}
```

`src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.tsx`:

```diff
--- a/src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.tsx
+++ b/src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.tsx
@@ -9,8 +9,8 @@
 import { POPOVER_Z_INDEX } from "@/config/Theme";
 import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
 import { notifySuccess } from "@/utils/notifications/notify";
-import { CreateDictionaryMenuItem } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/CreateDictionaryMenuItem";
 import { DatasetRefreshMenuItem } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetRefreshMenuItem";
+import { DictionaryMenuItems } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DictionaryMenuItems";
 import type { Dataset } from "$/models/datasets/Dataset/Dataset";
 import type { ReactNode } from "react";
 
@@ -20,7 +20,8 @@
 
 /**
  * The actions that apply to a whole dataset but are not what the user came
- * to do: learning a dictionary from it, re-syncing it, and deleting it.
+ * to do: applying a dictionary to it, learning one from it, re-syncing it,
+ * and deleting it.
  *
  * Delete lives in this menu rather than as a filled red button at the foot of
  * the page: making the most destructive action the largest and lowest thing
@@ -77,7 +78,7 @@
         </ActionIcon>
       </Menu.Target>
       <Menu.Dropdown>
-        <CreateDictionaryMenuItem datasetId={dataset.id} />
+        <DictionaryMenuItems datasetId={dataset.id} />
         <DatasetRefreshMenuItem dataset={dataset} />
         <Menu.Item
           color="danger"
```

- [ ] **Step 4:** `pnpm vitest run src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu`. Expected: PASS (5 tests).
- [ ] **Step 5: Commit** the menu folder as `feat(data-dictionaries): offer Apply a dictionary on a dataset's menu`.

---

### Task 12: The apply route, its link, and the hidden list

The route is `/$workspaceSlug/data-manager/$datasetId/apply-dictionaries`, as the spec names it. Its file is `$datasetId_.apply-dictionaries.tsx`: the trailing `_` keeps it out of `$datasetId.tsx`'s subtree, because the dataset view is a leaf with no `<Outlet />` (verified with the router generator while planning: the route's parent is `data-manager`). The search takes an optional `dictionaryId`, the dictionary to apply on its own when the flow opens from a dictionary or the Save step. The step is not in the URL, as in slice 2: Match columns needs the in-memory read of the columns. The list pane hides on this task view, like the create flow.

**Files:**
- Create: `src/routes/_auth/$workspaceSlug/data-manager/$datasetId_.apply-dictionaries.tsx`
- Modify: `src/config/AppLinks/AppLinks.tsx`
- Modify: `src/views/DataManagerApp/useListPaneToggle/useListPaneToggle.ts` (+ test)
- Generated: `src/routeTree.gen.ts`

- [ ] **Step 1: Write the failing test.** The mock now matches one task route at a time:

`src/views/DataManagerApp/useListPaneToggle/useListPaneToggle.test.ts`:

```diff
--- a/src/views/DataManagerApp/useListPaneToggle/useListPaneToggle.test.ts
+++ b/src/views/DataManagerApp/useListPaneToggle/useListPaneToggle.test.ts
@@ -8,6 +8,7 @@
       isPhone: false,
       pathname: "/demo/data-manager/dictionaries/new",
       isTaskView: true,
+      taskRoute: "/$workspaceSlug/data-manager/dictionaries/new",
     },
   };
 });
@@ -28,8 +29,10 @@
   return {
     ...actual,
     useMatchRoute: () => {
-      return () => {
-        return routeState.isTaskView ? {} : false;
+      return (options: { to: string }) => {
+        return routeState.isTaskView && options.to === routeState.taskRoute
+          ? {}
+          : false;
       };
     },
     useLocation: (options: {
@@ -45,8 +48,22 @@
     routeState.pathname = "/demo/data-manager/dictionaries/new";
     routeState.isTaskView = true;
     routeState.isPhone = false;
+    routeState.taskRoute = "/$workspaceSlug/data-manager/dictionaries/new";
   });
 
+  it("hides the list while dictionaries are applied to a dataset", () => {
+    routeState.pathname = "/demo/data-manager/1/apply-dictionaries";
+    routeState.taskRoute =
+      "/$workspaceSlug/data-manager/$datasetId/apply-dictionaries";
+    const { result } = renderHook(() => {
+      return useListPaneToggle();
+    });
+    expect(result.current).toMatchObject({
+      isTaskView: true,
+      isListShown: false,
+    });
+  });
+
   it("hides the list on a task view until it is shown", () => {
     const { result } = renderHook(() => {
       return useListPaneToggle();
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/useListPaneToggle`. Expected: the new test FAILS.
- [ ] **Step 3: Add the task route to the toggle.**

`src/views/DataManagerApp/useListPaneToggle/useListPaneToggle.ts`:

```diff
--- a/src/views/DataManagerApp/useListPaneToggle/useListPaneToggle.ts
+++ b/src/views/DataManagerApp/useListPaneToggle/useListPaneToggle.ts
@@ -2,13 +2,20 @@
 import { useLocation, useMatchRoute } from "@tanstack/react-router";
 import { useState } from "react";
 
+/** The task views that hide the list by default. */
+const TASK_ROUTES = [
+  "/$workspaceSlug/data-manager/dictionaries/new",
+  "/$workspaceSlug/data-manager/$datasetId/apply-dictionaries",
+] as const;
+
 /**
  * Whether the Data Sources list shows beside the current view. A task view
- * (the create flow) hides it by default to free width for its tables, and
- * Show list brings it back until the pathname changes, including on coming
- * back to the same route later. Every other view always shows it. On a
- * phone the list and the view never share the row, so the toggle is not
- * offered. Used by `DataManagerApp` and its toolbar.
+ * (creating a dictionary, applying dictionaries) hides it by default to
+ * free width for its tables, and Show list brings it back until the
+ * pathname changes, including on coming back to the same route later.
+ * Every other view always shows it. On a phone the list and the view never
+ * share the row, so the toggle is not offered. Used by `DataManagerApp` and
+ * its toolbar.
  */
 export function useListPaneToggle(): {
   isTaskView: boolean;
@@ -31,9 +38,9 @@
     setShownPathname(pathname);
     setIsShown(false);
   }
-  const isTaskView = Boolean(
-    matchRoute({ to: "/$workspaceSlug/data-manager/dictionaries/new" }),
-  );
+  const isTaskView = TASK_ROUTES.some((to) => {
+    return Boolean(matchRoute({ to }));
+  });
   return {
     isTaskView,
     isToggleOffered: isTaskView && !isPhone,
```

- [ ] **Step 4: Add the link.**

`src/config/AppLinks/AppLinks.tsx`:

```diff
--- a/src/config/AppLinks/AppLinks.tsx
+++ b/src/config/AppLinks/AppLinks.tsx
@@ -126,6 +126,25 @@
       isAvailableOffline: true,
     };
   },
+  dataManagerApplyDictionaries: ({
+    workspaceSlug,
+    datasetId,
+  }: {
+    workspaceSlug: string;
+    datasetId: string;
+  }) => {
+    return {
+      key: "data-manager-apply-dictionaries",
+      to: "/$workspaceSlug/data-manager/$datasetId/apply-dictionaries",
+      params: { workspaceSlug, datasetId },
+      label: (): string => {
+        return t`Apply dictionaries`;
+      },
+      // Matching runs on the device. Only attaching needs a connection, and
+      // the Attach step gates that button itself.
+      isAvailableOffline: true,
+    };
+  },
   dataManagerDictionaryView: ({
     workspaceSlug,
     dictionaryId,
```

- [ ] **Step 5: Add the route.** It imports `ApplyDictionariesView`, written in Task 17. Write this file at the start of Task 17 if you run the tasks strictly in order, and do Steps 6 and 7 there.

`src/routes/_auth/$workspaceSlug/data-manager/$datasetId_.apply-dictionaries.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ApplyDictionariesView } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesView";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

// `$datasetId_` keeps this route out of the dataset view's subtree: the
// dataset view is a leaf with no outlet.
export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/$datasetId_/apply-dictionaries",
)({
  component: RouteComponent,
  validateSearch: z.object({
    dictionaryId: z.uuid().optional().catch(undefined),
  }),
});

function RouteComponent(): ReactNode {
  const { datasetId } = Route.useParams();
  const { dictionaryId } = Route.useSearch();
  // The router's typing drops the ids' brands, so restore them. A new key
  // starts the flow over for another dataset or dictionary.
  return (
    <ApplyDictionariesView
      key={`${datasetId}:${dictionaryId ?? ""}`}
      datasetId={datasetId as Dataset.Id}
      preselectedDictionaryId={dictionaryId as DataDictionary.Id | undefined}
    />
  );
}
```

- [ ] **Step 6: Regenerate the route tree.** It is written by the router plugin when Vite starts: run `pnpm dev`, wait for Vite's "ready" line, and stop it. `src/routeTree.gen.ts` now has `/_auth/$workspaceSlug/data-manager/$datasetId_/apply-dictionaries` with path `/$datasetId/apply-dictionaries` under the `data-manager` route. Never edit it by hand.
- [ ] **Step 7:** `pnpm vitest run src/views/DataManagerApp/useListPaneToggle`. Expected: PASS (6 tests).
- [ ] **Step 8: Commit** the toggle, `AppLinks.tsx`, the route file, and `src/routeTree.gen.ts` as `feat(data-dictionaries): add the apply dictionaries route`.

---

### Task 13: Apply state: matches, defaults, and reading the columns

The flow's state is a reducer: the dictionaries in use (undefined until the columns are matched), each column's pick, the selected column, whether unmatched columns show, and the step. Picks are toggles: choosing the picked match again clears it. Removing a dictionary clears its picks; adding one fills only columns with no pick.

`makeInitialSelection` decides how the flow opens. A dataset that already has bindings opens with them (applying again replaces them, so the user edits what is there). A dictionary named in the URL is the only one used for new picks. Otherwise every dictionary that gives at least one column a default pick is used, ranked by how many columns it covers, then by its place in the name-sorted list, so the order never depends on the order columns arrive in.

`useDatasetProfiles` reads the columns on the device with slice 2's `profileDatasetColumns`. Each read is tagged with the dataset and its columns, and a reply for an older tag, or one that lands after the view closed, is dropped. `useApplyFlow` matches the profiles against every dictionary in the workspace and dispatches the first selection once; the reducer ignores any later one.

**Files:**
- Create: `src/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer.ts` (+ test)
- Create: `src/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults.ts` (+ test)
- Create: `src/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles.ts` (+ test)
- Create: `src/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents.ts`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData.ts`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/applyLookups.ts`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/useApplyFlow.ts`

- [ ] **Step 1: Write the failing tests.**

`src/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applyDictionariesReducer,
  makeInitialApplyState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

const NYS = "dict-nys" as DataDictionary.Id;
const CDC = "dict-cdc" as DataDictionary.Id;
const GENDER = "col-gender" as DatasetColumn.Id;
const SEX_PICK: ColumnPick = {
  dictionaryId: NYS,
  entryId: "entry-sex" as DataDictionaryEntry.Id,
  codeListId: undefined,
  direction: "decode",
};
const READY = applyDictionariesReducer(makeInitialApplyState(), {
  type: "matches_ready",
  dictionaryIds: [NYS],
  picks: { [GENDER]: SEX_PICK },
  selectedColumnId: GENDER,
});

describe("applyDictionariesReducer", () => {
  it("ignores a second match result", () => {
    const state = applyDictionariesReducer(READY, {
      type: "matches_ready",
      dictionaryIds: [CDC],
      picks: {},
      selectedColumnId: undefined,
    });

    expect(state).toBe(READY);
  });

  it("clears a pick when the picked match is chosen again", () => {
    const state = applyDictionariesReducer(READY, {
      type: "toggle_pick",
      columnId: GENDER,
      pick: SEX_PICK,
    });

    expect(state.picks[GENDER]).toBeUndefined();
  });

  it("drops every pick from a dictionary that stops being used", () => {
    const state = applyDictionariesReducer(READY, {
      type: "remove_dictionary",
      dictionaryId: NYS,
    });

    expect(state.dictionaryIds).toEqual([]);
    expect(state.picks).toEqual({});
  });

  it("keeps the user's picks when a dictionary is added", () => {
    const state = applyDictionariesReducer(READY, {
      type: "add_dictionary",
      dictionaryId: CDC,
      picks: { [GENDER]: { ...SEX_PICK, dictionaryId: CDC } },
    });

    expect(state.dictionaryIds).toEqual([NYS, CDC]);
    expect(state.picks[GENDER]?.dictionaryId).toBe(NYS);
  });
});
```

`src/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeInitialSelection } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const NYS = "dict-nys" as DataDictionary.Id;
const CDC = "dict-cdc" as DataDictionary.Id;
const GENDER = { id: "col-gender" as DatasetColumn.Id, name: "GENDER" };
const CASE_NO = { id: "col-case" as DatasetColumn.Id, name: "CaseNo" };

function _match(
  options: Partial<DictionaryMatch.T> &
    Pick<DictionaryMatch.T, "dictionaryId" | "entryId" | "fit">,
): DictionaryMatch.T {
  return {
    dictionaryRank: 0,
    entryName: "entry",
    position: 0,
    codeListId: undefined,
    codeListName: undefined,
    coverage: undefined,
    direction: "decode",
    score: 0.9,
    ...options,
  };
}

const MATCHES = new Map([
  [
    "GENDER",
    [
      _match({
        dictionaryId: CDC,
        entryId: "entry-cdc-sex" as DataDictionaryEntry.Id,
        codeListId: "list-129" as DataDictionaryCodeList.Id,
        coverage: 1,
        fit: "fits",
      }),
    ],
  ],
  [
    "CaseNo",
    [
      _match({
        dictionaryId: NYS,
        entryId: "entry-case" as DataDictionaryEntry.Id,
        fit: "description",
      }),
    ],
  ],
]);
const DICTIONARIES = [{ id: NYS }, { id: CDC }];

describe("makeInitialSelection", () => {
  it("uses every dictionary that matches a column, and only those", () => {
    const selection = makeInitialSelection({
      columns: [GENDER, CASE_NO],
      matchesByColumnName: MATCHES,
      existingBindings: [],
      preselectedDictionaryId: undefined,
      dictionaries: [
        ...DICTIONARIES,
        { id: "dict-unused" as DataDictionary.Id },
      ],
    });

    expect(selection.dictionaryIds).toEqual([NYS, CDC]);
    expect(selection.picks[GENDER.id]?.dictionaryId).toBe(CDC);
  });

  it("uses only the dictionary named when the flow opened", () => {
    const selection = makeInitialSelection({
      columns: [GENDER, CASE_NO],
      matchesByColumnName: MATCHES,
      existingBindings: [],
      preselectedDictionaryId: NYS,
      dictionaries: DICTIONARIES,
    });

    expect(selection.dictionaryIds).toEqual([NYS]);
    expect(selection.picks[GENDER.id]).toBeUndefined();
  });

  it("opens with the dataset's current bindings", () => {
    const binding = {
      datasetColumnId: GENDER.id,
      dictionaryId: NYS,
      entryId: "entry-nys-sex" as DataDictionaryEntry.Id,
      codeListId: undefined,
      direction: "decode",
    } as DictionaryBinding.T;

    const selection = makeInitialSelection({
      columns: [GENDER, CASE_NO],
      matchesByColumnName: MATCHES,
      existingBindings: [binding],
      preselectedDictionaryId: undefined,
      dictionaries: DICTIONARIES,
    });

    expect(selection.dictionaryIds).toEqual([NYS]);
    expect(selection.picks[GENDER.id]?.entryId).toBe("entry-nys-sex");
    expect(selection.picks[CASE_NO.id]).toBeUndefined();
  });

  it("ranks dictionaries the same whatever order the columns arrive in", () => {
    const forward = makeInitialSelection({
      columns: [GENDER, CASE_NO],
      matchesByColumnName: MATCHES,
      existingBindings: [],
      preselectedDictionaryId: undefined,
      dictionaries: DICTIONARIES,
    });
    const backward = makeInitialSelection({
      columns: [CASE_NO, GENDER],
      matchesByColumnName: MATCHES,
      existingBindings: [],
      preselectedDictionaryId: undefined,
      dictionaries: DICTIONARIES,
    });

    expect(backward.dictionaryIds).toEqual(forward.dictionaryIds);
  });
});
```

`src/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@/test-utils";
import { useDatasetProfiles } from "@/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const { profileMock } = vi.hoisted(() => {
  return { profileMock: vi.fn() };
});

vi.mock(
  "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns",
  () => {
    return { profileDatasetColumns: profileMock };
  },
);
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});

const DATASET = { id: "dataset-1", name: "Kings" } as Dataset.T;

function _column(name: string): DatasetColumn.T {
  return {
    id: `col-${name}`,
    name,
    dataType: "varchar",
    columnIdx: 0,
  } as DatasetColumn.T;
}

describe("useDatasetProfiles", () => {
  it("drops a read that finishes after the columns changed", async () => {
    let finishFirst: (profiles: ColumnProfile.T[]) => void = () => {
      return undefined;
    };
    profileMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
      )
      .mockResolvedValueOnce([{ columnName: "renamed" }]);
    const { result, rerender } = renderHook(
      (props: { columns: DatasetColumn.T[] }) => {
        return useDatasetProfiles({ dataset: DATASET, columns: props.columns });
      },
      { initialProps: { columns: [_column("GENDER")] } },
    );

    rerender({ columns: [_column("renamed")] });
    await act(async () => {
      finishFirst([{ columnName: "GENDER" } as ColumnProfile.T]);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "ready",
        profiles: [{ columnName: "renamed" }],
      });
    });
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/ApplyDictionariesView`. Expected: FAIL.
- [ ] **Step 3: Write the reducer and the defaults.**

`src/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer.ts`:

```ts
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** The steps of applying dictionaries, in order. */
export type ApplyStep = "match" | "attach";

/** The entry chosen for one column, with the code list that fits it. */
export type ColumnPick = {
  dictionaryId: DataDictionary.Id;
  entryId: DataDictionaryEntry.Id;
  codeListId: DataDictionaryCodeList.Id | undefined;
  direction: DictionaryBinding.Direction;
};

/** Everything the apply flow remembers while the user works. */
export type ApplyDictionariesState = {
  step: ApplyStep;
  /**
   * The dictionaries in use, in the order shown. Undefined until the
   * columns are matched.
   */
  dictionaryIds: readonly DataDictionary.Id[] | undefined;
  /** Each picked column's pick, by dataset column id. */
  picks: Readonly<Record<string, ColumnPick>>;
  selectedColumnId: DatasetColumn.Id | undefined;
  isShowingUnmatched: boolean;
};

/** Everything that changes the apply flow. */
export type ApplyDictionariesAction =
  | {
      /** The columns are matched. Ignored once a first match has landed. */
      type: "matches_ready";
      dictionaryIds: readonly DataDictionary.Id[];
      picks: Readonly<Record<string, ColumnPick>>;
      selectedColumnId: DatasetColumn.Id | undefined;
    }
  /** Picks a match, or clears it when it is already the column's pick. */
  | { type: "toggle_pick"; columnId: DatasetColumn.Id; pick: ColumnPick }
  /** Sets or clears a column's pick, as a select does. */
  | {
      type: "set_pick";
      columnId: DatasetColumn.Id;
      pick: ColumnPick | undefined;
    }
  | { type: "select_column"; columnId: DatasetColumn.Id }
  /** Adds a dictionary and the picks it brings to columns with none. */
  | {
      type: "add_dictionary";
      dictionaryId: DataDictionary.Id;
      picks: Readonly<Record<string, ColumnPick>>;
    }
  /** Stops using a dictionary and clears every pick from it. */
  | { type: "remove_dictionary"; dictionaryId: DataDictionary.Id }
  | { type: "toggle_unmatched" }
  | { type: "go_to_step"; step: ApplyStep };

/** The state before the columns are matched. */
export function makeInitialApplyState(): ApplyDictionariesState {
  return {
    step: "match",
    dictionaryIds: undefined,
    picks: {},
    selectedColumnId: undefined,
    isShowingUnmatched: false,
  };
}

/** Whether two picks name the same entry of the same dictionary. */
export function isSamePick(
  pickA: Readonly<ColumnPick> | undefined,
  pickB: Readonly<ColumnPick> | undefined,
): boolean {
  return (
    pickA !== undefined &&
    pickB !== undefined &&
    pickA.dictionaryId === pickB.dictionaryId &&
    pickA.entryId === pickB.entryId
  );
}

function _withPick(
  picks: Readonly<Record<string, ColumnPick>>,
  columnId: DatasetColumn.Id,
  pick: ColumnPick | undefined,
): Record<string, ColumnPick> {
  const { [columnId]: _replaced, ...rest } = picks;
  return pick ? { ...rest, [columnId]: pick } : rest;
}

function _withoutDictionary(
  state: ApplyDictionariesState,
  dictionaryId: DataDictionary.Id,
): ApplyDictionariesState {
  const picks = Object.fromEntries(
    Object.entries(state.picks).filter(([, pick]) => {
      return pick.dictionaryId !== dictionaryId;
    }),
  );
  const dictionaryIds = (state.dictionaryIds ?? []).filter((id) => {
    return id !== dictionaryId;
  });
  return { ...state, dictionaryIds, picks };
}

function _withDictionary(
  state: ApplyDictionariesState,
  action: Extract<ApplyDictionariesAction, { type: "add_dictionary" }>,
): ApplyDictionariesState {
  const dictionaryIds = state.dictionaryIds ?? [];
  if (dictionaryIds.includes(action.dictionaryId)) {
    return state;
  }
  return {
    ...state,
    dictionaryIds: [...dictionaryIds, action.dictionaryId],
    // A column the user already picked keeps its pick.
    picks: { ...action.picks, ...state.picks },
  };
}

/**
 * The apply flow's reducer: which dictionaries are in use, each column's
 * pick, the selected column, and the step. Used by the apply view.
 */
export function applyDictionariesReducer(
  state: ApplyDictionariesState,
  action: ApplyDictionariesAction,
): ApplyDictionariesState {
  switch (action.type) {
    case "matches_ready":
      return state.dictionaryIds !== undefined
        ? state
        : {
            ...state,
            dictionaryIds: action.dictionaryIds,
            picks: action.picks,
            selectedColumnId: action.selectedColumnId,
          };
    case "toggle_pick": {
      const isPicked = isSamePick(state.picks[action.columnId], action.pick);
      return {
        ...state,
        selectedColumnId: action.columnId,
        picks: _withPick(
          state.picks,
          action.columnId,
          isPicked ? undefined : action.pick,
        ),
      };
    }
    case "set_pick":
      return {
        ...state,
        selectedColumnId: action.columnId,
        picks: _withPick(state.picks, action.columnId, action.pick),
      };
    case "select_column":
      return { ...state, selectedColumnId: action.columnId };
    case "add_dictionary":
      return _withDictionary(state, action);
    case "remove_dictionary":
      return _withoutDictionary(state, action.dictionaryId);
    case "toggle_unmatched":
      return { ...state, isShowingUnmatched: !state.isShowingUnmatched };
    case "go_to_step":
      return { ...state, step: action.step };
  }
}
```

`src/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults.ts`:

```ts
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

type ApplyColumnRef = Readonly<{ id: DatasetColumn.Id; name: string }>;

/** Every match of every column, by column name. */
export type MatchesByColumnName = ReadonlyMap<
  string,
  readonly DictionaryMatch.T[]
>;

/** The pick a match stands for. */
export function toColumnPick(match: Readonly<DictionaryMatch.T>): ColumnPick {
  return {
    dictionaryId: match.dictionaryId,
    entryId: match.entryId,
    codeListId: match.codeListId,
    direction: match.direction,
  };
}

/**
 * The pick each column starts with from `dictionaryIds` alone: the code
 * list covering the most of its rows, else a description.
 */
export function pickDefaultsForColumns(
  options: Readonly<{
    columns: readonly ApplyColumnRef[];
    matchesByColumnName: MatchesByColumnName;
    dictionaryIds: readonly DataDictionary.Id[];
  }>,
): Record<string, ColumnPick> {
  const picks: Record<string, ColumnPick> = {};
  options.columns.forEach((column) => {
    const matches = (options.matchesByColumnName.get(column.name) ?? []).filter(
      (match) => {
        return options.dictionaryIds.includes(match.dictionaryId);
      },
    );
    const match = DictionaryMatch.pickDefaultMatch(matches);
    if (match) {
      picks[column.id] = toColumnPick(match);
    }
  });
  return picks;
}

/**
 * The dictionaries that give at least one column a default pick, most
 * columns first, then in `dictionaries` order. The order never depends on
 * the order the columns arrived in.
 */
function _rankDictionariesByPicks(
  picks: Readonly<Record<string, ColumnPick>>,
  dictionaries: ReadonlyArray<{ id: DataDictionary.Id }>,
): DataDictionary.Id[] {
  const counts = new Map<DataDictionary.Id, number>();
  Object.values(picks).forEach((pick) => {
    counts.set(pick.dictionaryId, (counts.get(pick.dictionaryId) ?? 0) + 1);
  });
  return dictionaries
    .map((dictionary, index) => {
      return {
        id: dictionary.id,
        index,
        count: counts.get(dictionary.id) ?? 0,
      };
    })
    .filter((item) => {
      return item.count > 0;
    })
    .sort((itemA, itemB) => {
      return itemB.count - itemA.count || itemA.index - itemB.index;
    })
    .map((item) => {
      return item.id;
    });
}

function _picksFromBindings(
  bindings: readonly DictionaryBinding.T[],
): Record<string, ColumnPick> {
  const picks: Record<string, ColumnPick> = {};
  bindings.forEach((binding) => {
    if (binding.dictionaryId && binding.entryId) {
      picks[binding.datasetColumnId] = {
        dictionaryId: binding.dictionaryId,
        entryId: binding.entryId,
        codeListId: binding.codeListId,
        direction: binding.direction,
      };
    }
  });
  return picks;
}

/**
 * The dictionaries and picks the apply flow opens with. A dataset that
 * already has bindings opens with them. A dictionary named when the flow
 * opened is the only one used for new picks. Otherwise every dictionary
 * that matches a column is used, ranked by how many columns it covers.
 */
export function makeInitialSelection(
  options: Readonly<{
    columns: readonly ApplyColumnRef[];
    matchesByColumnName: MatchesByColumnName;
    existingBindings: readonly DictionaryBinding.T[];
    preselectedDictionaryId: DataDictionary.Id | undefined;
    dictionaries: ReadonlyArray<{ id: DataDictionary.Id }>;
  }>,
): { dictionaryIds: DataDictionary.Id[]; picks: Record<string, ColumnPick> } {
  const existing = _picksFromBindings(options.existingBindings);
  const existingIds = _rankDictionariesByPicks(existing, options.dictionaries);
  const newIds = options.preselectedDictionaryId
    ? [options.preselectedDictionaryId]
    : existingIds.length > 0
      ? []
      : options.dictionaries.map((dictionary) => {
          return dictionary.id;
        });
  const defaults = pickDefaultsForColumns({
    ...options,
    dictionaryIds: newIds,
  });
  const picks = { ...defaults, ...existing };
  const rankedIds = _rankDictionariesByPicks(picks, options.dictionaries);
  // A dictionary the user named stays in use even when nothing matched.
  const named = options.preselectedDictionaryId;
  const dictionaryIds =
    named && !rankedIds.includes(named) ? [...rankedIds, named] : rankedIds;
  return { dictionaryIds, picks };
}
```

- [ ] **Step 4: Write the data hooks and the flow.**

`src/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles.ts`:

```ts
import { useEffect, useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { profileDatasetColumns } from "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns";
import { Logger } from "@/utils/Logger";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** Where reading a dataset's columns has got to. */
export type DatasetProfiles =
  | { status: "reading" }
  | { status: "ready"; profiles: readonly ColumnProfile.T[] }
  | { status: "failed" };

/** A read and the dataset and columns it is for. */
type TaggedRead = { key: string | undefined; profiles: DatasetProfiles };

/**
 * Reads one dataset's columns on this device: their values and row counts,
 * for matching them to dictionary entries. A read that finishes after the
 * dataset or its columns changed, or after the view closed, is dropped.
 */
export function useDatasetProfiles(
  options: Readonly<{
    dataset: Dataset.T | undefined;
    columns: readonly DatasetColumn.T[] | undefined;
  }>,
): DatasetProfiles {
  const workspace = useCurrentWorkspace();
  const { dataset, columns } = options;
  const key =
    dataset && columns
      ? `${dataset.id}:${columns
          .map((column) => {
            return `${column.id}=${column.name}`;
          })
          .join(",")}`
      : undefined;
  const [read, setRead] = useState<TaggedRead>({
    key: undefined,
    profiles: { status: "reading" },
  });
  useEffect(() => {
    if (!dataset || !columns || key === undefined) {
      return;
    }
    // Each read is tagged with its key, so a late reply cannot land.
    let isCurrent = true;
    profileDatasetColumns({
      workspaceId: workspace.id,
      dataset,
      columns: [...columns]
        .sort((columnA, columnB) => {
          return columnA.columnIdx - columnB.columnIdx;
        })
        .map((column) => {
          return { name: column.name, dataType: column.dataType };
        }),
    })
      .then((profiles) => {
        if (isCurrent) {
          setRead({ key, profiles: { status: "ready", profiles } });
        }
      })
      .catch((error: unknown) => {
        Logger.error(error, { devMsg: "Reading a dataset to apply failed" });
        if (isCurrent) {
          setRead({ key, profiles: { status: "failed" } });
        }
      });
    return () => {
      isCurrent = false;
    };
    // `key` stands for the dataset and its columns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, workspace.id]);
  return read.key === key ? read.profiles : { status: "reading" };
}
```

`src/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents.ts`:

```ts
import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DataDictionaryEntryCodingClient } from "@/clients/dataDictionaries/DataDictionaryEntryCodingClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DataDictionaryEntryCoding } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Every dictionary in a workspace, with everything matching needs. */
export type WorkspaceDictionaryContents = {
  /** Sorted by name, then id, so the order never depends on the server. */
  dictionaries: readonly DataDictionary.T[];
  entries: readonly DataDictionaryEntry.T[];
  codeLists: readonly DataDictionaryCodeList.T[];
  codings: readonly DataDictionaryEntryCoding.T[];
  isLoading: boolean;
  hasLoadFailed: boolean;
};

function _compareDictionaries(
  dictionaryA: DataDictionary.T,
  dictionaryB: DataDictionary.T,
): number {
  const nameA = dictionaryA.name.toLowerCase();
  const nameB = dictionaryB.name.toLowerCase();
  if (nameA !== nameB) {
    return nameA < nameB ? -1 : 1;
  }
  return dictionaryA.id < dictionaryB.id ? -1 : 1;
}

/**
 * Loads every dictionary in the workspace with its entries, code lists, and
 * codings, for matching a dataset's columns against all of them. Each
 * query refetches on mount, so an edit made in another tab is used.
 */
export function useWorkspaceDictionaryContents(
  workspaceId: Workspace.Id,
): WorkspaceDictionaryContents {
  const inWorkspace = {
    ...where("workspace_id", "eq", workspaceId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  };
  const [dictionaries, , dictionariesQuery] =
    DataDictionaryClient.useGetAll(inWorkspace);
  const [entries, , entriesQuery] =
    DataDictionaryEntryClient.useGetAll(inWorkspace);
  const [codeLists, , codeListsQuery] =
    DataDictionaryCodeListClient.useGetAll(inWorkspace);
  const [codings, , codingsQuery] =
    DataDictionaryEntryCodingClient.useGetAll(inWorkspace);
  const sorted = useMemo(() => {
    return [...(dictionaries ?? [])].sort(_compareDictionaries);
  }, [dictionaries]);
  const queries = [
    dictionariesQuery,
    entriesQuery,
    codeListsQuery,
    codingsQuery,
  ];
  return {
    dictionaries: sorted,
    entries: entries ?? [],
    codeLists: codeLists ?? [],
    codings: codings ?? [],
    isLoading: !dictionaries || !entries || !codeLists || !codings,
    hasLoadFailed: queries.some((query) => {
      return query.isLoadingError;
    }),
  };
}
```

`src/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData.ts`:

```ts
import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceDictionaryContents } from "@/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { WorkspaceDictionaryContents } from "@/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents";

/** Everything the apply flow reads before matching. */
export type ApplyDictionariesData = WorkspaceDictionaryContents & {
  dataset: Dataset.T | undefined;
  /** Sorted by the dataset's column order. Undefined while loading. */
  columns: readonly DatasetColumn.T[] | undefined;
  existingBindings: readonly DictionaryBinding.T[];
  /** Every entry of every dictionary, ready to match. */
  matchEntries: readonly DictionaryMatch.Entry[];
};

/**
 * Loads one dataset, its columns, its current bindings, and every
 * dictionary in the workspace, for the apply flow. Bindings refetch on
 * mount, since this flow is what changes them.
 */
export function useApplyDictionariesData(
  datasetId: Dataset.Id,
): ApplyDictionariesData {
  const workspace = useCurrentWorkspace();
  const ofDataset = {
    ...where("dataset_id", "eq", datasetId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  };
  const [dataset, , datasetQuery] = DatasetClient.useGetById({ id: datasetId });
  const [columns, , columnsQuery] = DatasetColumnClient.useGetAll(ofDataset);
  const [bindings, , bindingsQuery] =
    DictionaryBindingClient.useGetAll(ofDataset);
  const contents = useWorkspaceDictionaryContents(workspace.id);
  const sortedColumns = useMemo(() => {
    return columns
      ? [...columns].sort((columnA, columnB) => {
          return columnA.columnIdx - columnB.columnIdx;
        })
      : undefined;
  }, [columns]);
  const { dictionaries, entries, codeLists, codings } = contents;
  const matchEntries = useMemo(() => {
    return DictionaryMatch.toMatchEntries({
      dictionaries,
      entries,
      codeLists,
      codings,
    });
  }, [dictionaries, entries, codeLists, codings]);
  const ownQueries = [datasetQuery, columnsQuery, bindingsQuery];
  return {
    ...contents,
    dataset,
    columns: sortedColumns,
    existingBindings: bindings ?? [],
    matchEntries,
    isLoading: contents.isLoading || !dataset || !columns || !bindings,
    hasLoadFailed:
      contents.hasLoadFailed ||
      ownQueries.some((query) => {
        return query.isLoadingError;
      }),
  };
}
```

`src/views/DataManagerApp/ApplyDictionariesView/applyLookups.ts`:

```ts
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { WorkspaceDictionaryContents } from "@/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents";

/**
 * The workspace's dictionary rows by id, for the apply flow's side pane and
 * summary, which name a pick's dictionary, entry, and code list.
 */
export type ApplyLookups = {
  dictionaryNames: ReadonlyMap<string, string>;
  entries: ReadonlyMap<string, DataDictionaryEntry.T>;
  codeLists: ReadonlyMap<string, DataDictionaryCodeList.T>;
};

/** Indexes the workspace's dictionary rows by id. */
export function makeApplyLookups(
  contents: Readonly<
    Pick<WorkspaceDictionaryContents, "dictionaries" | "entries" | "codeLists">
  >,
): ApplyLookups {
  return {
    dictionaryNames: new Map(
      contents.dictionaries.map((dictionary) => {
        return [dictionary.id, dictionary.name] as const;
      }),
    ),
    entries: new Map(
      contents.entries.map((entry) => {
        return [entry.id, entry] as const;
      }),
    ),
    codeLists: new Map(
      contents.codeLists.map((codeList) => {
        return [codeList.id, codeList] as const;
      }),
    ),
  };
}
```

`src/views/DataManagerApp/ApplyDictionariesView/useApplyFlow.ts`:

```ts
import { useEffect, useMemo, useReducer } from "react";
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import {
  makeInitialSelection,
  pickDefaultsForColumns,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import {
  applyDictionariesReducer,
  makeInitialApplyState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { useDatasetProfiles } from "@/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { MatchesByColumnName } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { Dispatch } from "react";

const NO_PROFILES: readonly ColumnProfile.T[] = [];

/** One column of the dataset as the pairing table shows it. */
export type ApplyColumnRow = {
  column: DatasetColumn.T;
  profile: ColumnProfile.T | undefined;
  /** Matches from the dictionaries in use, best first. */
  matches: readonly DictionaryMatch.T[];
};

/** The apply flow's state and what its steps read and do. */
export type ApplyFlow = {
  state: ApplyDictionariesState;
  dispatch: Dispatch<ApplyDictionariesAction>;
  /** Columns with a match or a pick, in the dataset's order. */
  rows: readonly ApplyColumnRow[];
  /** Columns no dictionary in use matches. */
  unmatchedRows: readonly ApplyColumnRow[];
  addDictionary: (dictionaryId: DataDictionary.Id) => void;
  isMatching: boolean;
  hasReadFailed: boolean;
};

function _buildRows(
  data: Readonly<ApplyDictionariesData>,
  options: Readonly<{
    state: ApplyDictionariesState;
    profiles: readonly ColumnProfile.T[];
    matchesByColumnName: MatchesByColumnName;
  }>,
): { rows: ApplyColumnRow[]; unmatchedRows: ApplyColumnRow[] } {
  const dictionaryIds = options.state.dictionaryIds ?? [];
  const all = (data.columns ?? []).map((column) => {
    return {
      column,
      profile: options.profiles.find((profile) => {
        return profile.columnName === column.name;
      }),
      matches: (options.matchesByColumnName.get(column.name) ?? []).filter(
        (match) => {
          return dictionaryIds.includes(match.dictionaryId);
        },
      ),
    };
  });
  const isShown = (row: ApplyColumnRow): boolean => {
    return (
      row.matches.length > 0 || options.state.picks[row.column.id] !== undefined
    );
  };
  return {
    rows: all.filter(isShown),
    unmatchedRows: all.filter((row) => {
      return !isShown(row);
    }),
  };
}

/**
 * The apply flow: reads the dataset's columns on the device, matches them
 * against every dictionary, opens with the default picks, and keeps the
 * user's choices. Used by the apply view.
 */
export function useApplyFlow(
  options: Readonly<{
    data: ApplyDictionariesData;
    preselectedDictionaryId: DataDictionary.Id | undefined;
  }>,
): ApplyFlow {
  const { data } = options;
  const [state, dispatch] = useReducer(
    applyDictionariesReducer,
    undefined,
    makeInitialApplyState,
  );
  const read = useDatasetProfiles({
    dataset: data.dataset,
    columns: data.columns,
  });
  const profiles = read.status === "ready" ? read.profiles : NO_PROFILES;
  const matchesByColumnName = useMemo(() => {
    return DictionaryMatch.findColumnMatches(profiles, data.matchEntries);
  }, [profiles, data.matchEntries]);
  const isReady = read.status === "ready" && !data.isLoading;
  useOpenWithDefaults({
    data,
    matchesByColumnName,
    isReady,
    dispatch,
    preselectedDictionaryId: options.preselectedDictionaryId,
  });
  const { rows, unmatchedRows } = useMemo(() => {
    return _buildRows(data, { state, profiles, matchesByColumnName });
  }, [data, state, profiles, matchesByColumnName]);
  return {
    state,
    dispatch,
    rows,
    unmatchedRows,
    addDictionary: (dictionaryId) => {
      const picks = pickDefaultsForColumns({
        columns: data.columns ?? [],
        matchesByColumnName,
        dictionaryIds: [dictionaryId],
      });
      dispatch({ type: "add_dictionary", dictionaryId, picks });
    },
    isMatching: !isReady,
    hasReadFailed: read.status === "failed",
  };
}

/** Dispatches the first picks once the columns are read and matched. */
function useOpenWithDefaults(
  options: Readonly<{
    data: ApplyDictionariesData;
    matchesByColumnName: MatchesByColumnName;
    isReady: boolean;
    preselectedDictionaryId: DataDictionary.Id | undefined;
    dispatch: Dispatch<ApplyDictionariesAction>;
  }>,
): void {
  const { data, matchesByColumnName, isReady, dispatch } = options;
  useEffect(() => {
    if (!isReady) {
      return;
    }
    const selection = makeInitialSelection({
      columns: data.columns ?? [],
      matchesByColumnName,
      existingBindings: data.existingBindings,
      preselectedDictionaryId: options.preselectedDictionaryId,
      dictionaries: data.dictionaries,
    });
    const firstColumn = (data.columns ?? []).find((column) => {
      return selection.picks[column.id] !== undefined;
    });
    // The reducer keeps the first result, so a later run changes nothing.
    dispatch({
      type: "matches_ready",
      ...selection,
      selectedColumnId: firstColumn?.id,
    });
  }, [
    isReady,
    data,
    matchesByColumnName,
    options.preselectedDictionaryId,
    dispatch,
  ]);
}
```

- [ ] **Step 5:** `pnpm vitest run src/views/DataManagerApp/ApplyDictionariesView`. Expected: PASS (9 tests).
- [ ] **Step 6: Commit** the seven files and their tests as `feat(data-dictionaries): match a dataset's columns to dictionaries`.

---

### Task 14: The apply flow's frame

Load the `impeccable` skill before this task: the apply flow is a new surface. The header names the task ("Apply dictionaries to <dataset>") and states what the picks add up to: `1 attached as reference · 3 described · of 22 columns · from 2 of 2 dictionaries`, with "Nothing picked yet" in place of the first two when there are none; its one action is Cancel, back to the dataset. The step bar has two steps, Match columns and Attach (the spec's middle step, Unmatched values, belongs to conversions). The step's name is also a visually hidden heading that takes focus when the step changes, as in the create flow.

**Files:**
- Create: `src/views/DataManagerApp/ApplyDictionariesView/useApplyFacts.ts` (+ test)
- Create: `src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesHeader.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/useApplyStepLabels.ts`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper.module.css`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepHeading.tsx`

- [ ] **Step 1: Write the failing test.**

`src/views/DataManagerApp/ApplyDictionariesView/useApplyFacts.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import {
  countPicks,
  useApplyFacts,
} from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

const PICKS = {
  "col-gender": {
    dictionaryId: "nys",
    entryId: "sex",
    codeListId: "list",
    direction: "decode",
  },
  "col-case": {
    dictionaryId: "nys",
    entryId: "case",
    codeListId: undefined,
    direction: "decode",
  },
} as unknown as Record<string, ColumnPick>;

describe("useApplyFacts", () => {
  it("counts code lists, descriptions, columns, and dictionaries", () => {
    const { result } = renderHook(
      () => {
        return useApplyFacts({
          counts: countPicks(PICKS),
          columnCount: 22,
          dictionaryCount: 2,
        });
      },
      { wrapper: TestProviders },
    );

    expect(result.current).toEqual([
      "1 attached as reference",
      "1 described",
      "of 22 columns",
      "from 1 of 2 dictionaries",
    ]);
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/ApplyDictionariesView/useApplyFacts.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Write the frame.**

`src/views/DataManagerApp/ApplyDictionariesView/useApplyFacts.ts`:

```ts
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

/** How many columns each kind of pick covers. */
export type ApplyCounts = {
  /** Columns getting a code list. */
  attachedCount: number;
  /** Columns getting only a description. */
  describedCount: number;
  /** Dictionaries at least one pick comes from. */
  usedDictionaryCount: number;
};

/** Counts the picks: code lists, descriptions, and dictionaries used. */
export function countPicks(
  picks: Readonly<Record<string, ColumnPick>>,
): ApplyCounts {
  const all = Object.values(picks);
  const attachedCount = all.filter((pick) => {
    return pick.codeListId !== undefined;
  }).length;
  return {
    attachedCount,
    describedCount: all.length - attachedCount,
    usedDictionaryCount: new Set(
      all.map((pick) => {
        return pick.dictionaryId;
      }),
    ).size,
  };
}

/**
 * The apply header's facts: `1 attached as reference · 3 described · of 22
 * columns · from 2 of 2 dictionaries`. Counts that are zero are left out.
 */
export function useApplyFacts(
  options: Readonly<{
    counts: ApplyCounts;
    columnCount: number;
    dictionaryCount: number;
  }>,
): string[] {
  const { t, i18n } = useLingui();
  const { attachedCount, describedCount } = options.counts;
  const usedText = i18n.number(options.counts.usedDictionaryCount);
  const attachedText = plural(attachedCount, {
    one: "# attached as reference",
    other: "# attached as reference",
  });
  const describedText = plural(describedCount, {
    one: "# described",
    other: "# described",
  });
  const columnsText = plural(options.columnCount, {
    one: "of # column",
    other: "of # columns",
  });
  const dictionariesText = plural(options.dictionaryCount, {
    one: `from ${usedText} of # dictionary`,
    other: `from ${usedText} of # dictionaries`,
  });
  const pickedFacts = [
    ...(attachedCount > 0 ? [attachedText] : []),
    ...(describedCount > 0 ? [describedText] : []),
  ];
  return [
    ...(pickedFacts.length > 0 ? pickedFacts : [t`Nothing picked yet`]),
    columnsText,
    dictionariesText,
  ];
}
```

`src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesHeader.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  facts: readonly string[];
};

/**
 * The apply flow's header band: which dataset the dictionaries are for, how
 * many columns each kind of pick covers, and Cancel, which goes back to the
 * dataset.
 */
export function ApplyDictionariesHeader({
  dataset,
  facts,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const datasetName = dataset.name;
  return (
    <AppViewHeader
      title={t`Apply dictionaries to ${datasetName}`}
      facts={facts}
      actions={
        <Button
          variant="default"
          onClick={() => {
            navigate(
              AppLinks.dataManagerDatasetView({
                workspaceSlug: workspace.slug,
                datasetId: dataset.id,
                datasetName,
              }),
            );
          }}
        >
          <Trans>Cancel</Trans>
        </Button>
      }
    />
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/useApplyStepLabels.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import type { ApplyStep } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

/** The name of each apply step, as the step bar and its heading say it. */
export function useApplyStepLabels(): Record<ApplyStep, string> {
  const { t } = useLingui();
  return { match: t`Match columns`, attach: t`Attach` };
}
```

`src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper.module.css`:

```css
/* The step bar sits between the header band and the step, on the lit surface. */
.applyDictionariesStepper {
  border-block-end: 1px solid var(--ava-border-default);
  flex: none;
  padding: var(--mantine-spacing-sm) var(--mantine-spacing-lg);
}
```

`src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper.tsx`:

```tsx
import { Stepper } from "@mantine/core";
import css from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper.module.css";
import { useApplyStepLabels } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyStepLabels";
import type {
  ApplyDictionariesAction,
  ApplyStep,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { Dispatch, ReactNode } from "react";

const STEPS: readonly ApplyStep[] = ["match", "attach"];

type Props = {
  step: ApplyStep;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

/**
 * The apply flow's step bar: Match columns, then Attach, with the earlier
 * step one click away.
 */
export function ApplyDictionariesStepper({
  step,
  dispatch,
}: Readonly<Props>): ReactNode {
  const labels = useApplyStepLabels();
  return (
    <div className={css.applyDictionariesStepper}>
      <Stepper
        size="sm"
        active={STEPS.indexOf(step)}
        allowNextStepsSelect={false}
        onStepClick={(index) => {
          const nextStep = STEPS[index];
          if (nextStep) {
            dispatch({ type: "go_to_step", step: nextStep });
          }
        }}
      >
        {STEPS.map((item) => {
          return <Stepper.Step key={item} label={labels[item]} />;
        })}
      </Stepper>
    </div>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepHeading.tsx`:

```tsx
import { Title, VisuallyHidden } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useApplyStepLabels } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyStepLabels";
import type { ApplyStep } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ReactNode } from "react";

type Props = {
  step: ApplyStep;
};

/**
 * The current step's name as a heading only assistive tech reads, since
 * the step bar shows it. Focus moves here when the step changes, so a
 * keyboard user lands at the top of the new step. It does not take focus
 * when the flow opens.
 */
export function ApplyDictionariesStepHeading({
  step,
}: Readonly<Props>): ReactNode {
  const labels = useApplyStepLabels();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef(step);
  useEffect(() => {
    if (previousStepRef.current !== step) {
      previousStepRef.current = step;
      headingRef.current?.focus();
    }
  }, [step]);
  return (
    <VisuallyHidden>
      <Title order={2} tabIndex={-1} ref={headingRef}>
        {labels[step]}
      </Title>
    </VisuallyHidden>
  );
}
```

- [ ] **Step 4:** `pnpm vitest run src/views/DataManagerApp/ApplyDictionariesView/useApplyFacts.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** the six files and the test as `feat(data-dictionaries): add the apply flow's header and step bar`.

---

### Task 15: Match columns

A bar of dictionary chips ("Using" each dictionary, removable with "Stop using <name>", and Add dictionary), then the pairing table and the selected column's pane side by side (the pane drops under the table below 62em). With three dictionaries or fewer, each dictionary is a table column and each cell is that dictionary's best match for the row: a toggle button reading `sex · Sex (1/2/9)` and `100%`, or "values don't fit", or `case_id · description`, or "No match". Its accessible name is its visible text, and `aria-describedby` points at the column's name. With more than three, one Select per row lists every match ("Don't apply" first, then `entry · list · from dictionary`), with an "Other matches" count. Each row's column name is a button that selects the row; it is the only extra tab stop. Columns no dictionary in use matches hide behind "Show n columns with no match" (`aria-expanded`, `aria-controls`). With no dictionary in use and nothing to show, an empty state points at Add dictionary.

The pane names the column, its type, and how many different values it has. For a picked code list it says where it comes from, then "How to apply the dictionary: Attached as reference" with the spec's reference explanation, whether the values are codes or labels ("Chosen from the data"), and a Value in data · Rows · Means table that marks values not in the list. For a description-only entry it shows the description that will be added. It ends with the column's other matches. The global "Convert all / Attach dictionaries only as references" switch, the pane's "Apply conversions / Attach labels only as reference" switch, the direction switch, and the row chip are not shown: with one mode available they would be controls that do nothing (see Refinements).

The footer repeats the header's facts and has Next: attach. It reuses slice 2's `NewDictionaryFooter`, which carries `data-sticky-action-bar`.

**Files:**
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchPickButton.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnNameCell.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingTable.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingSelectTable.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/AddDictionaryMenu.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/DictionaryChips.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnValuesTable.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PickedEntryDetails.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnPane.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/UnmatchedColumnsToggle.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/NoDictionaryInUse.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsFooter.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.tsx` (+ test)

- [ ] **Step 1: Write the failing test.**

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { makeInitialApplyState } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { MatchColumnsStep } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";

const NYS = "dict-nys" as DataDictionary.Id;
const GENDER = {
  id: "col-gender" as DatasetColumn.Id,
  name: "GENDER",
  dataType: "bigint",
} as DatasetColumn.T;
const COUNTY = {
  id: "col-county" as DatasetColumn.Id,
  name: "county",
  dataType: "varchar",
} as DatasetColumn.T;
const SEX_MATCH: DictionaryMatch.T = {
  dictionaryId: NYS,
  dictionaryRank: 0,
  entryId: "entry-sex" as DataDictionaryEntry.Id,
  entryName: "sex",
  position: 0,
  codeListId: "list-sex" as DataDictionaryCodeList.Id,
  codeListName: "Sex (1/2/9)",
  coverage: 1,
  direction: "decode",
  fit: "fits",
  score: 1,
};

function _flow(dictionaryCount: number): ApplyFlow {
  const dictionaryIds = Array.from({ length: dictionaryCount }, (_, index) => {
    return (index === 0 ? NYS : `dict-${index}`) as DataDictionary.Id;
  });
  return {
    state: { ...makeInitialApplyState(), dictionaryIds },
    dispatch: vi.fn(),
    rows: [{ column: GENDER, profile: undefined, matches: [SEX_MATCH] }],
    unmatchedRows: [{ column: COUNTY, profile: undefined, matches: [] }],
    addDictionary: vi.fn(),
    isMatching: false,
    hasReadFailed: false,
  };
}

function _render(flow: ApplyFlow) {
  const dictionaries = (flow.state.dictionaryIds ?? []).map((id) => {
    return { id, name: id === NYS ? "NYS codes" : `Codes ${id}` };
  }) as DataDictionary.T[];
  render(
    <MatchColumnsStep
      flow={flow}
      dictionaries={dictionaries}
      lookups={{
        dictionaryNames: new Map(),
        entries: new Map(),
        codeLists: new Map(),
      }}
      summary="1 attached as reference"
    />,
  );
}

describe("MatchColumnsStep", () => {
  it("picks a dictionary's match for a column", () => {
    const flow = _flow(1);
    _render(flow);

    fireEvent.click(
      screen.getByRole("button", { name: /sex · Sex \(1\/2\/9\)/ }),
    );

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "toggle_pick",
      columnId: GENDER.id,
      pick: {
        dictionaryId: NYS,
        entryId: SEX_MATCH.entryId,
        codeListId: SEX_MATCH.codeListId,
        direction: "decode",
      },
    });
  });

  it("uses one Select per column past three dictionaries", () => {
    _render(_flow(4));

    expect(
      screen.getByRole("combobox", { name: "Entry to apply to GENDER" }),
    ).toBeInTheDocument();
  });

  it("says whether the columns with no match are shown", () => {
    _render(_flow(1));

    expect(
      screen.getByRole("button", { name: "Show 1 column with no match" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep`. Expected: FAIL.
- [ ] **Step 3: Write the table.**

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css`:

```css
/*
 * The pairing table and the selected column's pane side by side. Below 62em
 * the pane drops under the table instead of squeezing it.
 */
.matchColumns {
  display: grid;
  gap: var(--mantine-spacing-lg);
  grid-template-columns: minmax(0, 1fr) 20rem;
}

.matchColumns[data-has-pane="false"] {
  grid-template-columns: minmax(0, 1fr);
}

.matchColumnsPane {
  align-self: start;
  background-color: var(--ava-surface-body);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  padding: var(--mantine-spacing-md);
}

.matchColumnsChips {
  border-block-end: 1px solid var(--ava-border-default);
  flex: none;
  padding: var(--mantine-spacing-sm) var(--mantine-spacing-lg);
}

.matchColumnsRow[data-selected="true"] td {
  background-color: var(--mantine-color-primary-0);
}

.matchPick {
  align-items: center;
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  display: flex;
  gap: var(--mantine-spacing-xs);
  padding: var(--mantine-spacing-xxs) var(--mantine-spacing-xs);
  transition: var(--ava-transition-interactive);
  width: 100%;
}

.matchPick[data-picked="true"] {
  background-color: var(--mantine-color-primary-0);
  border-color: var(--mantine-color-primary-5);
}

.matchPickRadio {
  border: 1px solid var(--ava-border-strong);
  border-radius: 50%;
  flex: none;
  height: 12px;
  width: 12px;
}

.matchPick[data-picked="true"] .matchPickRadio {
  background-color: var(--mantine-color-primary-5);
  border-color: var(--mantine-color-primary-5);
}

.matchPickText {
  flex: 1;
  min-width: 0;
}

@media (width < 62em) {
  .matchColumns {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchPickButton.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Text, UnstyledButton } from "@mantine/core";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { ReactNode } from "react";

type Props = {
  match: DictionaryMatch.T;
  isPicked: boolean;
  /** The id of the column name this match is for. */
  describedById: string;
  onPick: () => void;
};

/**
 * One dictionary's best match for a column, as a toggle: the entry, its
 * code list, and how much of the column the list covers. Pressing the
 * picked match again clears it.
 */
export function MatchPickButton({
  match,
  isPicked,
  describedById,
  onPick,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const { entryName, codeListName } = match;
  const what =
    codeListName === undefined
      ? t`${entryName} · description`
      : t`${entryName} · ${codeListName}`;
  const fitText =
    match.fit === "values_dont_fit"
      ? t`values don't fit`
      : match.coverage === undefined
        ? undefined
        : i18n.number(match.coverage, {
            style: "percent",
            maximumFractionDigits: 0,
          });
  return (
    <UnstyledButton
      className={css.matchPick}
      data-picked={isPicked}
      aria-pressed={isPicked}
      aria-describedby={describedById}
      onClick={onPick}
    >
      <span className={css.matchPickRadio} aria-hidden />
      <Text span size="sm" className={css.matchPickText}>
        {what}
      </Text>
      {fitText ? (
        <Text span size="xs" c="dimmed">
          {fitText}
        </Text>
      ) : null}
    </UnstyledButton>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnNameCell.tsx`:

```tsx
import { Text, UnstyledButton } from "@mantine/core";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

/** How many of a column's values the table lists under its name. */
const SAMPLE_VALUE_COUNT = 4;

type Props = {
  row: ApplyColumnRow;
  /** The id other cells point at to say which column they are for. */
  nameId: string;
  isSelected: boolean;
  onSelect: () => void;
};

function _formatSample(row: ApplyColumnRow): string {
  const values = row.profile?.values ?? [];
  const sample = values.slice(0, SAMPLE_VALUE_COUNT).map((item) => {
    return item.value;
  });
  return values.length > SAMPLE_VALUE_COUNT
    ? `${sample.join(", ")}…`
    : sample.join(", ");
}

/**
 * A column's name, which selects the column for the side pane, and its
 * first few values.
 */
export function ColumnNameCell({
  row,
  nameId,
  isSelected,
  onSelect,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <UnstyledButton
        id={nameId}
        fw={500}
        fz="sm"
        aria-current={isSelected || undefined}
        onClick={onSelect}
      >
        {row.column.name}
      </UnstyledButton>
      <Text size="xs" c="dimmed" truncate>
        {_formatSample(row)}
      </Text>
    </>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingTable.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Table, Text } from "@mantine/core";
import { toColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import { isSamePick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { ColumnNameCell } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnNameCell";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import { MatchPickButton } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchPickButton";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { Dispatch, ReactNode } from "react";

type Props = {
  rows: readonly ApplyColumnRow[];
  /** The dictionaries in use, one table column each. */
  dictionaries: ReadonlyArray<Pick<DataDictionary.T, "id" | "name">>;
  state: ApplyDictionariesState;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

function PairingRow(
  props: Readonly<Omit<Props, "rows"> & { row: ApplyColumnRow }>,
): ReactNode {
  const { row, state, dispatch } = props;
  const columnId = row.column.id;
  const nameId = `apply-column-${columnId}`;
  return (
    <Table.Tr
      className={css.matchColumnsRow}
      data-selected={state.selectedColumnId === columnId}
    >
      <Table.Td>
        <ColumnNameCell
          row={row}
          nameId={nameId}
          isSelected={state.selectedColumnId === columnId}
          onSelect={() => {
            dispatch({ type: "select_column", columnId });
          }}
        />
      </Table.Td>
      {props.dictionaries.map((dictionary) => {
        const match = row.matches.find((candidate) => {
          return candidate.dictionaryId === dictionary.id;
        });
        return (
          <Table.Td key={dictionary.id}>
            {match ? (
              <MatchPickButton
                match={match}
                isPicked={isSamePick(
                  state.picks[columnId],
                  toColumnPick(match),
                )}
                describedById={nameId}
                onPick={() => {
                  dispatch({
                    type: "toggle_pick",
                    columnId,
                    pick: toColumnPick(match),
                  });
                }}
              />
            ) : (
              <Text size="sm" c="dimmed">
                <Trans>No match</Trans>
              </Text>
            )}
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
}

/**
 * One row per column and one column per dictionary in use, each cell that
 * dictionary's best match for the column. Used with three dictionaries or
 * fewer.
 */
export function PairingTable(props: Readonly<Props>): ReactNode {
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="22%">
            <Trans>Column in this dataset</Trans>
          </Table.Th>
          {props.dictionaries.map((dictionary) => {
            return <Table.Th key={dictionary.id}>{dictionary.name}</Table.Th>;
          })}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {props.rows.map((row) => {
          return <PairingRow key={row.column.id} {...props} row={row} />;
        })}
      </Table.Tbody>
    </Table>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingSelectTable.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Select, Table, Text } from "@mantine/core";
import { toColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import { ColumnNameCell } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnNameCell";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { Dispatch, ReactNode } from "react";

type Props = {
  rows: readonly ApplyColumnRow[];
  dictionaries: ReadonlyArray<Pick<DataDictionary.T, "id" | "name">>;
  state: ApplyDictionariesState;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

function _toKey(
  match: Pick<DictionaryMatch.T, "dictionaryId" | "entryId">,
): string {
  return `${match.dictionaryId}:${match.entryId}`;
}

/** The Select's options: Don't apply, then each match, best first. */
function useMatchOptions(
  row: ApplyColumnRow,
  dictionaries: Props["dictionaries"],
): Array<{ value: string; label: string }> {
  const { t } = useLingui();
  return [
    { value: "", label: t`Don't apply` },
    ...row.matches.map((match) => {
      const { entryName } = match;
      const what = match.codeListName ?? t`description`;
      const from = dictionaries.find((dictionary) => {
        return dictionary.id === match.dictionaryId;
      })?.name;
      return {
        value: _toKey(match),
        label: t`${entryName} · ${what} · from ${from}`,
      };
    }),
  ];
}

function OtherMatchesText({
  row,
}: Readonly<{ row: ApplyColumnRow }>): ReactNode {
  const otherCount = row.matches.length - 1;
  if (row.matches.length === 0) {
    return <Trans>No match</Trans>;
  }
  return otherCount === 0 ? (
    <Trans>Only match</Trans>
  ) : (
    plural(otherCount, { one: "# other match", other: "# other matches" })
  );
}

function SelectRow(
  props: Readonly<Omit<Props, "rows"> & { row: ApplyColumnRow }>,
): ReactNode {
  const { t } = useLingui();
  const { row, state, dispatch } = props;
  const columnId = row.column.id;
  const columnName = row.column.name;
  const options = useMatchOptions(row, props.dictionaries);
  const pick = state.picks[columnId];
  return (
    <Table.Tr
      className={css.matchColumnsRow}
      data-selected={state.selectedColumnId === columnId}
    >
      <Table.Td>
        <ColumnNameCell
          row={row}
          nameId={`apply-column-${columnId}`}
          isSelected={state.selectedColumnId === columnId}
          onSelect={() => {
            dispatch({ type: "select_column", columnId });
          }}
        />
      </Table.Td>
      <Table.Td>
        <Select
          aria-label={t`Entry to apply to ${columnName}`}
          data={options}
          value={pick ? _toKey(pick) : ""}
          allowDeselect={false}
          onChange={(value) => {
            const match = row.matches.find((candidate) => {
              return _toKey(candidate) === value;
            });
            dispatch({
              type: "set_pick",
              columnId,
              pick: match ? toColumnPick(match) : undefined,
            });
          }}
        />
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          <OtherMatchesText row={row} />
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * One row per column with one Select of every match from every dictionary
 * in use. Used with more than three dictionaries, where a column per
 * dictionary would not fit.
 */
export function PairingSelectTable(props: Readonly<Props>): ReactNode {
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="22%">
            <Trans>Column in this dataset</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Apply</Trans>
          </Table.Th>
          <Table.Th w="18%">
            <Trans>Other matches</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {props.rows.map((row) => {
          return <SelectRow key={row.column.id} {...props} row={row} />;
        })}
      </Table.Tbody>
    </Table>
  );
}
```

- [ ] **Step 4: Write the chips, the pane, and the step.**

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/AddDictionaryMenu.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button, Menu } from "@mantine/core";
import { IconBook, IconPlus } from "@tabler/icons-react";
import { POPOVER_Z_INDEX } from "@/config/Theme/Theme";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  /** Dictionaries not in use yet, in the order to list them. */
  available: readonly DataDictionary.T[];
  onAdd: (dictionaryId: DataDictionary.Id) => void;
};

/** Adds one more dictionary to match the dataset's columns against. */
export function AddDictionaryMenu({
  available,
  onAdd,
}: Readonly<Props>): ReactNode {
  return (
    <Menu position="bottom-start" width={280} zIndex={POPOVER_Z_INDEX}>
      <Menu.Target>
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={14} aria-hidden />}
        >
          <Trans>Add dictionary</Trans>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {available.map((dictionary) => {
          return (
            <Menu.Item
              key={dictionary.id}
              leftSection={<IconBook size={16} aria-hidden />}
              onClick={() => {
                onAdd(dictionary.id);
              }}
            >
              {dictionary.name}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/DictionaryChips.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Pill, Text } from "@mantine/core";
import { AddDictionaryMenu } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/AddDictionaryMenu";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionaryIds: readonly DataDictionary.Id[];
  /** Every dictionary in the workspace. */
  dictionaries: readonly DataDictionary.T[];
  onAdd: (dictionaryId: DataDictionary.Id) => void;
  onRemove: (dictionaryId: DataDictionary.Id) => void;
};

/**
 * The dictionaries the columns are matched against, each removable, and a
 * menu to add another.
 */
export function DictionaryChips({
  dictionaryIds,
  dictionaries,
  onAdd,
  onRemove,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const available = dictionaries.filter((dictionary) => {
    return !dictionaryIds.includes(dictionary.id);
  });
  return (
    <Group gap="xs" className={css.matchColumnsChips}>
      <Text size="sm" c="dimmed">
        <Trans>Using</Trans>
      </Text>
      {dictionaryIds.map((dictionaryId) => {
        const name =
          dictionaries.find((dictionary) => {
            return dictionary.id === dictionaryId;
          })?.name ?? "";
        return (
          <Pill
            key={dictionaryId}
            size="md"
            withRemoveButton
            onRemove={() => {
              onRemove(dictionaryId);
            }}
            removeButtonProps={{ "aria-label": t`Stop using ${name}` }}
          >
            {name}
          </Pill>
        );
      })}
      {available.length > 0 ? (
        <AddDictionaryMenu available={available} onAdd={onAdd} />
      ) : null}
    </Group>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnValuesTable.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Table, Text } from "@mantine/core";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { ReactNode } from "react";

type Props = {
  values: readonly ColumnProfile.Value[];
  pairs: readonly DataDictionaryCodeList.Pair[];
  direction: DictionaryBinding.Direction;
};

/** The pair a value in the data stands for, in the column's direction. */
function _findPair(
  value: string,
  props: Readonly<Props>,
): DataDictionaryCodeList.Pair | undefined {
  const key = ColumnProfile.getComparisonKey(value);
  return props.pairs.find((pair) => {
    const spellings =
      props.direction === "decode"
        ? [pair.code]
        : [pair.label, ...pair.acceptedSpellings];
    return spellings.some((spelling) => {
      return (
        spelling.trim() !== "" &&
        ColumnProfile.getComparisonKey(spelling) === key
      );
    });
  });
}

function MeaningCell(
  props: Readonly<{
    pair: DataDictionaryCodeList.Pair | undefined;
    direction: Props["direction"];
  }>,
): ReactNode {
  const { pair } = props;
  if (!pair) {
    return (
      <Text size="sm" c="warning.8">
        <Trans>Not in the list</Trans>
      </Text>
    );
  }
  const code = pair.code;
  if (props.direction === "encode") {
    return <Trans>code {code}</Trans>;
  }
  return pair.label.trim() === "" ? (
    <Text size="sm" c="dimmed" fs="italic">
      <Trans>No label yet</Trans>
    </Text>
  ) : (
    pair.label
  );
}

/**
 * Each value in a column, its rows, and what the code list says it means,
 * so the user can check a match before attaching it.
 */
export function ColumnValuesTable(props: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  return (
    <Table verticalSpacing={4} fz="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <Trans>Value in data</Trans>
          </Table.Th>
          <Table.Th ta="end">
            <Trans>Rows</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Means</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {props.values.map((item) => {
          return (
            <Table.Tr key={item.value}>
              <Table.Td fw={600}>{item.value}</Table.Td>
              <Table.Td ta="end">{i18n.number(item.rowCount)}</Table.Td>
              <Table.Td>
                <MeaningCell
                  pair={_findPair(item.value, props)}
                  direction={props.direction}
                />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PickedEntryDetails.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { ColumnValuesTable } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnValuesTable";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  row: ApplyColumnRow;
  pick: ColumnPick;
  lookups: ApplyLookups;
};

function AppliedFrom(
  props: Readonly<{
    dictionaryName: string;
    entryName: string;
    codeListName: string | undefined;
  }>,
): ReactNode {
  const { dictionaryName, entryName, codeListName } = props;
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
        <Trans>Applying</Trans>
      </Text>
      <Text size="sm" fw={500}>
        <Trans>
          {dictionaryName} › {entryName}
        </Trans>
      </Text>
      {codeListName ? (
        <Text size="xs" c="dimmed">
          <Trans>Code list: {codeListName}</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}

function ReferenceExplanation({
  direction,
}: Readonly<Pick<ColumnPick, "direction">>): ReactNode {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
        <Trans>How to apply the dictionary</Trans>
      </Text>
      <Text size="sm" fw={500}>
        <Trans>Attached as reference</Trans>
      </Text>
      <Text size="xs" c="dimmed">
        <Trans>
          Your data stays the same, which is what you want for models and
          exports that need the original values. Hover the column to see the
          labels.
        </Trans>
      </Text>
      <Text size="xs" c="dimmed">
        {direction === "decode" ? (
          <Trans>Chosen from the data: these values are codes.</Trans>
        ) : (
          <Trans>Chosen from the data: these values are labels.</Trans>
        )}
      </Text>
    </Stack>
  );
}

function DescriptionOnly({
  description,
}: Readonly<{ description: string | undefined }>): ReactNode {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
        <Trans>Description added to the column</Trans>
      </Text>
      <Text size="sm">{description || <Trans>No description yet</Trans>}</Text>
      <Text size="xs" c="dimmed">
        <Trans>
          This entry has no codes, so only its description is attached.
        </Trans>
      </Text>
    </Stack>
  );
}

function CodedDetails(
  props: Readonly<{
    row: ApplyColumnRow;
    pick: ColumnPick;
    codeList: DataDictionaryCodeList.T;
  }>,
): ReactNode {
  const values = props.row.profile?.values;
  return (
    <>
      <ReferenceExplanation direction={props.pick.direction} />
      {values ? (
        <ColumnValuesTable
          values={values}
          pairs={props.codeList.pairs}
          direction={props.pick.direction}
        />
      ) : null}
    </>
  );
}

/**
 * What applying the picked entry does to a column: where it comes from,
 * that the data stays the same, and what each value in the column means.
 */
export function PickedEntryDetails({
  row,
  pick,
  lookups,
}: Readonly<Props>): ReactNode {
  const entry = lookups.entries.get(pick.entryId);
  const codeList = pick.codeListId
    ? lookups.codeLists.get(pick.codeListId)
    : undefined;
  return (
    <Stack gap="md">
      <AppliedFrom
        dictionaryName={lookups.dictionaryNames.get(pick.dictionaryId) ?? ""}
        entryName={entry?.name ?? ""}
        codeListName={codeList?.name}
      />
      {codeList ? (
        <CodedDetails row={row} pick={pick} codeList={codeList} />
      ) : (
        <DescriptionOnly description={entry?.description} />
      )}
    </Stack>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnPane.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text, Title } from "@mantine/core";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
import { PickedEntryDetails } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PickedEntryDetails";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  row: ApplyColumnRow;
  pick: ColumnPick | undefined;
  lookups: ApplyLookups;
};

function OtherMatchesNote(props: Readonly<Props>): ReactNode {
  const others = props.row.matches.filter((match) => {
    return match.entryId !== props.pick?.entryId;
  });
  if (others.length === 0) {
    return null;
  }
  const names = others
    .map((match) => {
      const dictionaryName = props.lookups.dictionaryNames.get(
        match.dictionaryId,
      );
      return `${dictionaryName ?? ""} › ${match.entryName}`;
    })
    .join(", ");
  return (
    <Text size="xs" c="dimmed">
      <Trans>Also matches {names}.</Trans>
    </Text>
  );
}

/**
 * The selected column: its type and values, the entry applied to it, and
 * what that does. Sits beside the pairing table.
 */
export function ColumnPane(props: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const { column, profile } = props.row;
  const typeLabel = avaDataTypeLabel(column.dataType);
  const distinctText = profile ? i18n.number(profile.distinctCount) : undefined;
  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Title order={3} size="h5">
          {column.name}
        </Title>
        <Text size="xs" c="dimmed">
          {distinctText ? (
            <Trans>
              {typeLabel} · {distinctText} different values
            </Trans>
          ) : (
            typeLabel
          )}
        </Text>
      </Stack>
      {props.pick ? (
        <PickedEntryDetails
          row={props.row}
          pick={props.pick}
          lookups={props.lookups}
        />
      ) : (
        <Text size="sm" c="dimmed">
          {props.row.matches.length > 0 ? (
            <Trans>
              Nothing is applied to this column. Pick a match in the table to
              apply it.
            </Trans>
          ) : (
            <Trans>
              No entry in the dictionaries you are using matches this column.
            </Trans>
          )}
        </Text>
      )}
      <OtherMatchesNote {...props} />
    </Stack>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/UnmatchedColumnsToggle.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { Button } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  count: number;
  isShowing: boolean;
  /** The id of the table the hidden rows join. */
  tableId: string;
  onToggle: () => void;
};

/** Shows or hides the columns no dictionary in use matches. */
export function UnmatchedColumnsToggle({
  count,
  isShowing,
  tableId,
  onToggle,
}: Readonly<Props>): ReactNode {
  if (count === 0) {
    return null;
  }
  const label = isShowing
    ? plural(count, {
        one: "Hide # column with no match",
        other: "Hide # columns with no match",
      })
    : plural(count, {
        one: "Show # column with no match",
        other: "Show # columns with no match",
      });
  return (
    <Button
      variant="subtle"
      size="compact-sm"
      aria-expanded={isShowing}
      aria-controls={tableId}
      onClick={onToggle}
      w="fit-content"
    >
      {label}
    </Button>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/NoDictionaryInUse.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { IconBook } from "@tabler/icons-react";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import type { ReactNode } from "react";

/** What Match columns shows when no dictionary is in use. */
export function NoDictionaryInUse(): ReactNode {
  const { t } = useLingui();
  return (
    <AppSlateEmptyState
      icon={<IconBook size={32} stroke={1.5} aria-hidden />}
      title={t`No dictionary matches these columns yet`}
      message={
        <Trans>
          Add a dictionary above to pick its entries for these columns by hand.
        </Trans>
      }
    />
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsFooter.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { ApplyDictionariesAction } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  /** The header's facts, joined, so the summary stays in view. */
  summary: string;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

/** What the matches add up to, and Next to the Attach step. */
export function MatchColumnsFooter({
  summary,
  dispatch,
}: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter
      start={
        <Text size="sm" c="dimmed">
          {summary}
        </Text>
      }
    >
      <Button
        onClick={() => {
          dispatch({ type: "go_to_step", step: "attach" });
        }}
      >
        <Trans>Next: attach</Trans>
      </Button>
    </NewDictionaryFooter>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { ColumnPane } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnPane";
import { DictionaryChips } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/DictionaryChips";
import { MatchColumnsFooter } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsFooter";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import { NoDictionaryInUse } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/NoDictionaryInUse";
import { PairingSelectTable } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingSelectTable";
import { PairingTable } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PairingTable";
import { UnmatchedColumnsToggle } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/UnmatchedColumnsToggle";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

/** Past this many dictionaries in use, one Select replaces a column each. */
const MAX_DICTIONARY_COLUMNS = 3;

const PAIRING_TABLE_ID = "apply-dictionaries-pairing-table";

type Props = {
  flow: ApplyFlow;
  dictionaries: readonly DataDictionary.T[];
  lookups: ApplyLookups;
  summary: string;
};

function _getDictionariesInUse(props: Readonly<Props>): DataDictionary.T[] {
  return (props.flow.state.dictionaryIds ?? []).flatMap((dictionaryId) => {
    const dictionary = props.dictionaries.find((candidate) => {
      return candidate.id === dictionaryId;
    });
    return dictionary ? [dictionary] : [];
  });
}

/**
 * The Match columns step: the dictionaries in use, one row per matched
 * column with its picks, and the selected column's pane.
 */
export function MatchColumnsStep(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { state, dispatch } = props.flow;
  const inUse = _getDictionariesInUse(props);
  const rows = state.isShowingUnmatched
    ? [...props.flow.rows, ...props.flow.unmatchedRows]
    : props.flow.rows;
  const selected = rows.find((row) => {
    return row.column.id === state.selectedColumnId;
  });
  const Pairing =
    inUse.length > MAX_DICTIONARY_COLUMNS ? PairingSelectTable : PairingTable;
  return (
    <>
      <DictionaryChips
        dictionaryIds={state.dictionaryIds ?? []}
        dictionaries={props.dictionaries}
        onAdd={props.flow.addDictionary}
        onRemove={(dictionaryId) => {
          dispatch({ type: "remove_dictionary", dictionaryId });
        }}
      />
      <AppViewBody>
        <div
          className={css.matchColumns}
          data-has-pane={selected !== undefined}
        >
          <Stack gap="sm" id={PAIRING_TABLE_ID}>
            {inUse.length === 0 && rows.length === 0 ? (
              <NoDictionaryInUse />
            ) : (
              <Pairing
                rows={rows}
                dictionaries={inUse}
                state={state}
                dispatch={dispatch}
              />
            )}
            <UnmatchedColumnsToggle
              count={props.flow.unmatchedRows.length}
              isShowing={state.isShowingUnmatched}
              tableId={PAIRING_TABLE_ID}
              onToggle={() => {
                dispatch({ type: "toggle_unmatched" });
              }}
            />
          </Stack>
          {selected ? (
            <aside
              className={css.matchColumnsPane}
              aria-label={t`Selected column`}
            >
              <ColumnPane
                row={selected}
                pick={state.picks[selected.column.id]}
                lookups={props.lookups}
              />
            </aside>
          ) : null}
        </div>
      </AppViewBody>
      <MatchColumnsFooter summary={props.summary} dispatch={dispatch} />
    </>
  );
}
```

- [ ] **Step 5:** `pnpm vitest run src/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep`. Expected: PASS (3 tests).
- [ ] **Step 6: Commit** `MatchColumnsStep/` as `feat(data-dictionaries): match columns to dictionary entries`.

---

### Task 16: Attach

The Attach step says what attaching does, in the spec's copy: "Nothing in your data changes. 2 columns keep their values, with labels attached as reference. Edits to the dictionaries show up here right away.", plus how many columns get a description and how many bound columns this leaves without a dictionary. A Summary table lists each picked column, where its entry comes from, and what happens ("Attached as reference, values unchanged" with the tag, or "Description added"). Back returns to Match columns. The primary button reads "Attach to <dataset>", or "Remove dictionaries from <dataset>" when every pick was cleared from a dataset that had bindings, and is disabled when there is nothing to do. It is wrapped in `OfflineGated`, like the app's other saves. `useAttachDictionaries` sends every binding as `reference` in one call, ignores a second press while one is in flight, toasts "Attached to <dataset>. The data is unchanged.", and returns to the dataset only while the view is still open. A refusal is explained from its hint.

**Files:**
- Create: `src/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries.ts` (+ test)
- Create: `src/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryText.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryTable.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachFooter.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachStep.tsx` (+ test)

- [ ] **Step 1: Write the failing tests.**

`src/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders } from "@/test-utils";
import { useAttachDictionaries } from "@/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    applyMock: vi.fn(),
    navigateMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    options: undefined as
      | undefined
      | {
          onSuccess: () => void;
          onError: (error: unknown) => void;
          onSettled: () => void;
        },
  };
});

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      getClientName: () => {
        return "DictionaryBindingClient";
      },
      useApplyToDataset: (options: typeof mocks.options) => {
        mocks.options = options;
        return [mocks.applyMock, false];
      },
    },
  };
});
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useNavigate: () => {
      return mocks.navigateMock;
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifyError: mocks.notifyErrorMock,
    notifySuccess: mocks.notifySuccessMock,
  };
});

const DATASET = { id: "dataset-1", name: "Kings line list" } as Dataset.T;
const BINDINGS = [{ datasetColumnId: "col-1" }] as DictionaryBinding.Input[];

describe("useAttachDictionaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends one apply while the first is in flight", () => {
    const { result } = renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );

    act(() => {
      result.current[0](BINDINGS);
      result.current[0](BINDINGS);
    });

    expect(mocks.applyMock).toHaveBeenCalledTimes(1);
    expect(mocks.applyMock).toHaveBeenCalledWith({
      datasetId: DATASET.id,
      bindings: BINDINGS,
    });
  });

  it("returns to the dataset once the dictionaries are attached", () => {
    renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );

    act(() => {
      mocks.options?.onSuccess();
    });

    expect(mocks.notifySuccessMock).toHaveBeenCalledWith(
      "Attached to Kings line list. The data is unchanged.",
    );
    expect(mocks.navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/$workspaceSlug/data-manager/$datasetId",
        params: { workspaceSlug: "demo", datasetId: DATASET.id },
      }),
    );
  });

  it("does not navigate once the user has left the view", () => {
    const { unmount } = renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );
    unmount();

    mocks.options?.onSuccess();

    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it("explains a refusal for someone who cannot edit the dataset", () => {
    renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );

    act(() => {
      mocks.options?.onError({ hint: "dataset_editor_required" });
    });

    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "You need edit access to Kings line list to apply a dictionary.",
    );
  });
});
```

`src/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachStep.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { makeInitialApplyState } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { AttachStep } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachStep";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";

const { attachMock } = vi.hoisted(() => {
  return { attachMock: vi.fn() };
});

vi.mock(
  "@/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries",
  () => {
    return {
      useAttachDictionaries: () => {
        return [attachMock, false];
      },
    };
  },
);

const DATASET = { id: "dataset-1", name: "Kings line list" } as Dataset.T;
const GENDER = { id: "col-gender", name: "GENDER" } as DatasetColumn.T;
const PICK = {
  dictionaryId: "dict-1",
  entryId: "entry-sex",
  codeListId: "list-sex",
  direction: "decode",
} as unknown as ColumnPick;

function _render(
  picks: Record<string, ColumnPick>,
  existingBindings: readonly DictionaryBinding.T[] = [],
) {
  const flow = {
    state: {
      ...makeInitialApplyState(),
      dictionaryIds: [],
      step: "attach",
      picks,
    },
    dispatch: vi.fn(),
  } as unknown as ApplyFlow;
  render(
    <AttachStep
      dataset={DATASET}
      columns={[GENDER]}
      existingBindings={existingBindings}
      flow={flow}
      counts={{
        attachedCount: Object.keys(picks).length,
        describedCount: 0,
        usedDictionaryCount: 1,
      }}
      lookups={{
        dictionaryNames: new Map(),
        entries: new Map(),
        codeLists: new Map(),
      }}
      summary=""
    />,
  );
}

describe("AttachStep", () => {
  it("attaches each pick as reference", () => {
    _render({ [GENDER.id]: PICK });

    expect(
      screen.getByText(
        /Nothing in your data changes. 1 column keeps its values/,
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Attach to Kings line list" }),
    );

    expect(attachMock).toHaveBeenCalledWith([
      { datasetColumnId: GENDER.id, ...PICK, mode: "reference" },
    ]);
  });

  it("offers to remove the dictionaries when every pick was cleared", () => {
    _render({}, [{ datasetColumnId: GENDER.id } as DictionaryBinding.T]);

    expect(
      screen.getByRole("button", {
        name: "Remove dictionaries from Kings line list",
      }),
    ).toBeEnabled();
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries.test.tsx src/views/DataManagerApp/ApplyDictionariesView/AttachStep`. Expected: FAIL.
- [ ] **Step 3: Write the mutation and the step.**

`src/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * Attaches the picked entries to a dataset in one call, then returns to the
 * dataset with a toast. A second press while the first is in flight is
 * ignored, and nothing navigates once the user has left the view.
 */
export function useAttachDictionaries(
  dataset: Dataset.T,
): [
  attach: (bindings: readonly DictionaryBinding.Input[]) => void,
  isAttaching: boolean,
] {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const isMountedRef = useIsMounted();
  const isAttachingRef = useRef(false);
  const datasetName = dataset.name;
  const [applyToDataset, isAttaching] =
    DictionaryBindingClient.useApplyToDataset({
      queryToInvalidate: [DictionaryBindingClient.getClientName()],
      onSuccess: () => {
        notifySuccess(t`Attached to ${datasetName}. The data is unchanged.`);
        if (isMountedRef.current) {
          navigate(
            AppLinks.dataManagerDatasetView({
              workspaceSlug: workspace.slug,
              datasetId: dataset.id,
              datasetName,
            }),
          );
        }
      },
      onError: (error) => {
        Logger.error(error, { devMsg: "Applying dictionaries failed" });
        const hint = DictionaryBinding.toApplyErrorHint(error);
        notifyError(
          hint === "dataset_editor_required"
            ? t`You need edit access to ${datasetName} to apply a dictionary.`
            : hint === "entry_not_in_dictionary" ||
                hint === "code_list_not_in_entry"
              ? t`A dictionary changed while you were applying it. Reload the page and try again.`
              : t`The dictionaries were not attached. Please try again.`,
        );
      },
      onSettled: () => {
        isAttachingRef.current = false;
      },
    });
  const attach = (bindings: readonly DictionaryBinding.Input[]): void => {
    if (isAttachingRef.current) {
      return;
    }
    isAttachingRef.current = true;
    applyToDataset({ datasetId: dataset.id, bindings });
  };
  return [attach, isAttaching];
}
```

`src/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryText.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import type { ApplyCounts } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ReactNode } from "react";

type Props = {
  counts: ApplyCounts;
  /** Bound columns this apply leaves without a dictionary. */
  removedCount: number;
};

/** What attaching does, in a sentence or three: nothing in the data changes. */
export function AttachSummaryText({
  counts,
  removedCount,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const attached =
    counts.attachedCount > 0
      ? plural(counts.attachedCount, {
          one: "Nothing in your data changes. # column keeps its values, with labels attached as reference. Edits to the dictionaries show up here right away.",
          other:
            "Nothing in your data changes. # columns keep their values, with labels attached as reference. Edits to the dictionaries show up here right away.",
        })
      : t`Nothing in your data changes. Edits to the dictionaries show up here right away.`;
  const described = plural(counts.describedCount, {
    one: "# column gets a description from a dictionary.",
    other: "# columns get descriptions from dictionaries.",
  });
  const removed = plural(removedCount, {
    one: "# column no longer uses a dictionary.",
    other: "# columns no longer use a dictionary.",
  });
  return (
    <Stack gap="xs" maw="72ch">
      <Text size="sm">{attached}</Text>
      {counts.describedCount > 0 ? <Text size="sm">{described}</Text> : null}
      {removedCount > 0 ? <Text size="sm">{removed}</Text> : null}
    </Stack>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryTable.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Group, Table } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ReactNode } from "react";

type Props = {
  /** The picked columns, in the dataset's order. */
  picked: ReadonlyArray<{ column: DatasetColumn.T; pick: ColumnPick }>;
  lookups: ApplyLookups;
};

function WhatHappens({ pick }: Readonly<{ pick: ColumnPick }>): ReactNode {
  return pick.codeListId ? (
    <Group gap={6} wrap="nowrap">
      <IconTag size={14} aria-hidden />
      <Trans>Attached as reference, values unchanged</Trans>
    </Group>
  ) : (
    <Trans>Description added</Trans>
  );
}

/** One row per picked column: where its entry comes from and what happens. */
export function AttachSummaryTable({
  picked,
  lookups,
}: Readonly<Props>): ReactNode {
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="24%">
            <Trans>Column</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>From</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>What happens</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {picked.map(({ column, pick }) => {
          const dictionaryName =
            lookups.dictionaryNames.get(pick.dictionaryId) ?? "";
          const entryName = lookups.entries.get(pick.entryId)?.name ?? "";
          return (
            <Table.Tr key={column.id}>
              <Table.Td fw={500}>{column.name}</Table.Td>
              <Table.Td>
                <Trans>
                  {dictionaryName} › {entryName}
                </Trans>
              </Table.Td>
              <Table.Td>
                <WhatHappens pick={pick} />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachFooter.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { ReactNode } from "react";

type Props = {
  datasetName: string;
  pickedCount: number;
  removedCount: number;
  isAttaching: boolean;
  onBack: () => void;
  onAttach: () => void;
};

/**
 * Back, and the button that attaches the picks. With nothing picked but
 * bindings to drop, the button says it removes them instead.
 */
export function AttachFooter(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { datasetName } = props;
  const isRemovingOnly = props.pickedCount === 0 && props.removedCount > 0;
  return (
    <NewDictionaryFooter
      start={
        <Button variant="default" onClick={props.onBack}>
          <Trans>Back</Trans>
        </Button>
      }
    >
      <OfflineGated>
        <Button
          loading={props.isAttaching}
          disabled={props.pickedCount === 0 && props.removedCount === 0}
          onClick={props.onAttach}
        >
          {isRemovingOnly
            ? t`Remove dictionaries from ${datasetName}`
            : t`Attach to ${datasetName}`}
        </Button>
      </OfflineGated>
    </NewDictionaryFooter>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachStep.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { AttachFooter } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachFooter";
import { AttachSummaryTable } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryTable";
import { AttachSummaryText } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachSummaryText";
import { useAttachDictionaries } from "@/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyCounts } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  columns: readonly DatasetColumn.T[];
  existingBindings: readonly DictionaryBinding.T[];
  flow: ApplyFlow;
  counts: ApplyCounts;
  lookups: ApplyLookups;
  summary: string;
};

function _getPicked(
  props: Readonly<Props>,
): Array<{ column: DatasetColumn.T; pick: ColumnPick }> {
  return props.columns.flatMap((column) => {
    const pick = props.flow.state.picks[column.id];
    return pick ? [{ column, pick }] : [];
  });
}

/**
 * The Attach step: what attaching does, one row per picked column, and the
 * button that writes every binding at once. Attaching needs a connection.
 */
export function AttachStep(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const datasetName = props.dataset.name;
  const picked = _getPicked(props);
  const [attach, isAttaching] = useAttachDictionaries(props.dataset);
  const removedCount = props.existingBindings.filter((binding) => {
    return props.flow.state.picks[binding.datasetColumnId] === undefined;
  }).length;
  const bindings = picked.map(({ column, pick }) => {
    return { datasetColumnId: column.id, ...pick, mode: "reference" as const };
  });
  return (
    <>
      <AppViewBody>
        <Stack gap="xl">
          <AppViewSection title={t`Attach to ${datasetName}`}>
            <AttachSummaryText
              counts={props.counts}
              removedCount={removedCount}
            />
          </AppViewSection>
          {picked.length > 0 ? (
            <AppViewSection title={<Trans>Summary</Trans>} meta={props.summary}>
              <AttachSummaryTable picked={picked} lookups={props.lookups} />
            </AppViewSection>
          ) : null}
        </Stack>
      </AppViewBody>
      <AttachFooter
        datasetName={datasetName}
        pickedCount={picked.length}
        removedCount={removedCount}
        isAttaching={isAttaching}
        onBack={() => {
          props.flow.dispatch({ type: "go_to_step", step: "match" });
        }}
        onAttach={() => {
          attach(bindings);
        }}
      />
    </>
  );
}
```

- [ ] **Step 4:** Run the same command. Expected: PASS (6 tests).
- [ ] **Step 5: Commit** the five files and tests as `feat(data-dictionaries): attach dictionaries to a dataset as reference`.

---

### Task 17: The apply view

The view loads the dataset, its columns and bindings, and every dictionary, and lets in only someone who can edit the dataset and read dictionaries. Anyone else is sent back to the dataset once with "You need edit access to <dataset> to apply a dictionary." (spec section 14). While the columns are read it says so ("Reading the columns of <dataset> on this device"). A failed read or load shows a Callout, which is for failures.

**Files:**
- Create: `src/views/DataManagerApp/ApplyDictionariesView/useApplyAccess.ts` (+ test)
- Create: `src/views/DataManagerApp/ApplyDictionariesView/ApplyStepBody.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesFlowView.tsx`
- Create: `src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesView.tsx`

- [ ] **Step 1: Write the failing test.**

`src/views/DataManagerApp/ApplyDictionariesView/useApplyAccess.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useApplyAccess } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyAccess";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    access: { canEdit: true, isLoading: false, canViewDictionaries: true },
  };
});

vi.mock("@/hooks/datasets/useCanEditDataset/useCanEditDataset", () => {
  return {
    useCanEditDataset: () => {
      return {
        canEdit: mocks.access.canEdit,
        isLoading: mocks.access.isLoading,
      };
    },
  };
});
vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return mocks.access.canViewDictionaries;
    },
  };
});
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useNavigate: () => {
      return mocks.navigateMock;
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: mocks.notifyErrorMock };
});

const DATASET = { id: "dataset-1", name: "Kings line list" } as Dataset.T;

describe("useApplyAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access = {
      canEdit: true,
      isLoading: false,
      canViewDictionaries: true,
    };
  });

  it("lets in someone who can edit the dataset and read dictionaries", () => {
    const { result } = renderHook(
      () => {
        return useApplyAccess(DATASET);
      },
      { wrapper: TestProviders },
    );

    expect(result.current).toBe("allowed");
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it("sends someone who cannot edit the dataset back to it, once", () => {
    mocks.access.canEdit = false;
    const { result, rerender } = renderHook(
      () => {
        return useApplyAccess(DATASET);
      },
      { wrapper: TestProviders },
    );
    rerender();

    expect(result.current).toBe("denied");
    expect(mocks.notifyErrorMock).toHaveBeenCalledTimes(1);
    expect(mocks.navigateMock).toHaveBeenCalledTimes(1);
  });

  it("waits while the role is loading", () => {
    mocks.access.isLoading = true;
    const { result } = renderHook(
      () => {
        return useApplyAccess(DATASET);
      },
      { wrapper: TestProviders },
    );

    expect(result.current).toBe("checking");
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/ApplyDictionariesView/useApplyAccess.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Write the view.**

`src/views/DataManagerApp/ApplyDictionariesView/useApplyAccess.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCanEditDataset } from "@/hooks/datasets/useCanEditDataset/useCanEditDataset";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError } from "@/utils/notifications/notify";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** Whether the user may apply dictionaries to the dataset yet. */
export type ApplyAccess = "checking" | "allowed" | "denied";

/**
 * Whether the user may apply dictionaries to a dataset: they need to edit
 * the dataset and to read dictionaries. Someone who may not is sent back to
 * the dataset with a toast, once. The server refuses them either way.
 */
export function useApplyAccess(dataset: Dataset.T | undefined): ApplyAccess {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const canViewDictionaries = useHasPermission(
    "data_sources__can_view_dictionaries",
  );
  const { canEdit, isLoading } = useCanEditDataset(dataset?.id);
  const access: ApplyAccess =
    !dataset || isLoading
      ? "checking"
      : canEdit && canViewDictionaries
        ? "allowed"
        : "denied";
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (access !== "denied" || !dataset || hasRedirectedRef.current) {
      return;
    }
    hasRedirectedRef.current = true;
    const datasetName = dataset.name;
    notifyError(
      t`You need edit access to ${datasetName} to apply a dictionary.`,
    );
    navigate(
      AppLinks.dataManagerDatasetView({
        workspaceSlug: workspace.slug,
        datasetId: dataset.id,
        datasetName,
      }),
    );
  }, [access, dataset, navigate, t, workspace.slug]);
  return access;
}
```

`src/views/DataManagerApp/ApplyDictionariesView/ApplyStepBody.tsx`:

```tsx
import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { AttachStep } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachStep";
import { MatchColumnsStep } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { ApplyCounts } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  data: ApplyDictionariesData;
  flow: ApplyFlow;
  counts: ApplyCounts;
  lookups: ApplyLookups;
  summary: string;
};

function ReadingColumns({
  datasetName,
}: Readonly<{ datasetName: string }>): ReactNode {
  return (
    <Center flex={1} p="lg">
      <Stack align="center" gap="sm">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          <Trans>Reading the columns of {datasetName} on this device</Trans>
        </Text>
      </Stack>
    </Center>
  );
}

/** The current step, or why it cannot show yet. */
export function ApplyStepBody(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { flow } = props;
  if (flow.hasReadFailed) {
    return (
      <Center flex={1} p="lg">
        <Callout
          maw={520}
          title={t`The columns could not be read`}
          message={t`Avandar could not read this dataset's columns to match them. Please try again later or reach out to support.`}
        />
      </Center>
    );
  }
  if (flow.isMatching || flow.state.dictionaryIds === undefined) {
    return <ReadingColumns datasetName={props.dataset.name} />;
  }
  if (flow.state.step === "attach") {
    return (
      <AttachStep
        dataset={props.dataset}
        columns={props.data.columns ?? []}
        existingBindings={props.data.existingBindings}
        flow={flow}
        counts={props.counts}
        lookups={props.lookups}
        summary={props.summary}
      />
    );
  }
  return (
    <MatchColumnsStep
      flow={flow}
      dictionaries={props.data.dictionaries}
      lookups={props.lookups}
      summary={props.summary}
    />
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesFlowView.tsx`:

```tsx
import { useMemo } from "react";
import { AppView } from "@/components/layouts/AppView/AppView";
import { ApplyDictionariesHeader } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesHeader";
import { ApplyDictionariesStepHeading } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepHeading";
import { ApplyDictionariesStepper } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper";
import { makeApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import { ApplyStepBody } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyStepBody";
import {
  countPicks,
  useApplyFacts,
} from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import { useApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  data: ApplyDictionariesData;
  preselectedDictionaryId: DataDictionary.Id | undefined;
};

/**
 * The apply flow once everything it reads has loaded: the header with what
 * the picks add up to, the step bar, and the current step.
 */
export function ApplyDictionariesFlowView({
  dataset,
  data,
  preselectedDictionaryId,
}: Readonly<Props>): ReactNode {
  const flow = useApplyFlow({ data, preselectedDictionaryId });
  const counts = countPicks(flow.state.picks);
  const facts = useApplyFacts({
    counts,
    columnCount: data.columns?.length ?? 0,
    dictionaryCount: flow.state.dictionaryIds?.length ?? 0,
  });
  const { dictionaries, entries, codeLists } = data;
  const lookups = useMemo(() => {
    return makeApplyLookups({ dictionaries, entries, codeLists });
  }, [dictionaries, entries, codeLists]);
  return (
    <AppView>
      <ApplyDictionariesHeader dataset={dataset} facts={facts} />
      <ApplyDictionariesStepper
        step={flow.state.step}
        dispatch={flow.dispatch}
      />
      <ApplyDictionariesStepHeading step={flow.state.step} />
      <ApplyStepBody
        dataset={dataset}
        data={data}
        flow={flow}
        counts={counts}
        lookups={lookups}
        summary={facts.join(" · ")}
      />
    </AppView>
  );
}
```

`src/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesView.tsx`:

```tsx
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";
import { AppView } from "@/components/layouts/AppView/AppView";
import { ApplyDictionariesFlowView } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesFlowView";
import { useApplyAccess } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyAccess";
import { useApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
  /** A dictionary to apply on its own, when the flow opened from one. */
  preselectedDictionaryId: DataDictionary.Id | undefined;
};

function Loading(): ReactNode {
  return (
    <AppView>
      <Center flex={1}>
        <Loader size="sm" />
      </Center>
    </AppView>
  );
}

/**
 * Applies dictionaries to one dataset as reference: matches its columns to
 * dictionary entries, then attaches the picks without changing the data.
 * Only someone who can edit the dataset and read dictionaries gets in.
 */
export function ApplyDictionariesView({
  datasetId,
  preselectedDictionaryId,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const data = useApplyDictionariesData(datasetId);
  const access = useApplyAccess(data.dataset);
  if (data.hasLoadFailed) {
    return (
      <AppView>
        <Center flex={1} p="lg">
          <Callout
            maw={520}
            title={t`Dictionaries failed to load`}
            message={t`The dataset or its dictionaries failed to load. Please try again later or reach out to support.`}
          />
        </Center>
      </AppView>
    );
  }
  if (access !== "allowed" || !data.dataset) {
    return <Loading />;
  }
  return (
    <ApplyDictionariesFlowView
      dataset={data.dataset}
      data={data}
      preselectedDictionaryId={preselectedDictionaryId}
    />
  );
}
```

- [ ] **Step 4:** If Task 12's route file waits for this task, add it now and regenerate the route tree (Task 12, Steps 5 and 6).
- [ ] **Step 5:** `pnpm vitest run src/views/DataManagerApp && pnpm exec tsc -b --force --noEmit`. Expected: PASS and clean.
- [ ] **Step 6: Commit** the four files and the test as `feat(data-dictionaries): open the apply flow for a dataset`.

---

### Task 18: Apply it next, from the Save step

Slice 2 deferred this (its Refinements: "No 'Apply it to <dataset> next' on Save"). The Save step gains a checkbox, checked by default: "Apply it to <dataset> next" when the dictionary was learned from one dataset, or "Apply it to these 2 datasets after saving" with "<first> opens first. Apply it to the others from each dataset's menu." when it came from several. The first is the dataset that opened the flow, else the first one picked. After a successful save, `useOpenAfterCreate` toasts and opens Apply for the first dataset with the new dictionary as the only one in use, or the dictionary itself when the box is cleared; the toast names the other datasets, since a toast holds text only (see Refinements). Slice 2's create e2e spec expects the dictionary to open after Create; Task 28 updates it.

**Files:**
- Create: `src/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate.ts`
- Create: `src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveApplyNextField.tsx`
- Modify: `src/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer.ts`
- Modify: `src/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary.ts` (+ test)
- Modify: `src/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow.ts`
- Modify: `src/views/DataManagerApp/NewDictionaryFromDatasetsView/ProposalStepBody.tsx`
- Modify: `src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep.tsx` (+ test)

- [ ] **Step 1: Write the failing tests.**

`src/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary.test.tsx`:

```diff
--- a/src/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary.test.tsx
+++ b/src/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary.test.tsx
@@ -50,6 +50,7 @@
 
 const VARIABLES = {
   name: "Kings codes",
+  applyNext: [],
 } as unknown as CreateDictionaryVariables;
 
 function _render() {
@@ -132,4 +133,50 @@
     });
     expect(mocks.navigateMock).not.toHaveBeenCalled();
   });
+
+  it("opens Apply for the dataset it was learned from when asked to apply it next", async () => {
+    mocks.createMock.mockResolvedValue({
+      id: "dictionary-1",
+      name: "Kings codes",
+    });
+    const { result } = _render();
+    act(() => {
+      result.current[0]({
+        ...VARIABLES,
+        applyNext: [{ datasetId: "dataset-1", name: "Kings line list" }],
+      } as unknown as CreateDictionaryVariables);
+    });
+    await waitFor(() => {
+      expect(mocks.navigateMock).toHaveBeenCalledWith({
+        key: "data-manager-apply-dictionaries",
+        to: "/$workspaceSlug/data-manager/$datasetId/apply-dictionaries",
+        params: { workspaceSlug: "demo", datasetId: "dataset-1" },
+        label: expect.any(Function),
+        isAvailableOffline: true,
+        search: { dictionaryId: "dictionary-1" },
+      });
+    });
+  });
+
+  it("names the other datasets to apply it to in the toast", async () => {
+    mocks.createMock.mockResolvedValue({
+      id: "dictionary-1",
+      name: "Kings codes",
+    });
+    const { result } = _render();
+    act(() => {
+      result.current[0]({
+        ...VARIABLES,
+        applyNext: [
+          { datasetId: "dataset-1", name: "Kings line list" },
+          { datasetId: "dataset-2", name: "Bronx line list" },
+        ],
+      } as unknown as CreateDictionaryVariables);
+    });
+    await waitFor(() => {
+      expect(mocks.notifySuccessMock).toHaveBeenCalledWith(
+        "Saved Kings codes to Dictionaries. Apply it to Bronx line list too, from each dataset's menu.",
+      );
+    });
+  });
 });
```

`src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep.test.tsx`:

```diff
--- a/src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep.test.tsx
+++ b/src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep.test.tsx
@@ -5,6 +5,7 @@
 import { SaveStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep";
 import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
 import type { Dataset } from "$/models/datasets/Dataset/Dataset";
+import type { ApplyTarget } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
 
 /** jsdom has no `document.fonts`, which autosize textareas listen to. */
 beforeAll(() => {
@@ -62,6 +63,7 @@
     originDatasetName?: string;
     labels?: DictionaryProposal.Labels;
     proposal?: DictionaryProposal.T;
+    applyTargets?: readonly ApplyTarget[];
   } = {},
 ) {
   const dispatch = vi.fn();
@@ -74,6 +76,8 @@
       description=""
       originDatasetName={options.originDatasetName}
       learnedFromNames={["Kings line list"]}
+      appliesNext
+      applyTargets={options.applyTargets ?? []}
       isCreating={false}
       dispatch={dispatch}
       onCreate={onCreate}
@@ -177,4 +181,43 @@
       screen.getByText(/Kings line list is only where it started/),
     ).toBeInTheDocument();
   });
+
+  it("offers to apply the dictionary to the one dataset it was learned from", () => {
+    const { dispatch } = _renderStep({
+      applyTargets: [
+        { datasetId: uuid<Dataset.Id>(), name: "Kings line list" },
+      ],
+    });
+
+    fireEvent.click(
+      screen.getByRole("checkbox", {
+        name: "Apply it to Kings line list next",
+      }),
+    );
+
+    expect(dispatch).toHaveBeenCalledWith({
+      type: "set_applies_next",
+      appliesNext: false,
+    });
+  });
+
+  it("says which of several datasets opens first", () => {
+    _renderStep({
+      applyTargets: [
+        { datasetId: uuid<Dataset.Id>(), name: "Kings line list" },
+        { datasetId: uuid<Dataset.Id>(), name: "Bronx line list" },
+      ],
+    });
+
+    expect(
+      screen.getByRole("checkbox", {
+        name: "Apply it to these 2 datasets after saving",
+      }),
+    ).toBeChecked();
+    expect(
+      screen.getByText(
+        "Kings line list opens first. Apply it to the others from each dataset's menu.",
+      ),
+    ).toBeInTheDocument();
+  });
 });
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary.test.tsx src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep`. Expected: the new tests FAIL.
- [ ] **Step 3: Keep the choice in the flow's state.**

`src/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer.ts`:

```diff
--- a/src/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer.ts
+++ b/src/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer.ts
@@ -43,6 +43,8 @@
   name: string;
   description: string;
   suggestionConsent: SuggestionConsent;
+  /** Whether saving goes on to apply the dictionary to the datasets. */
+  appliesNext: boolean;
 };
 
 /** Everything the create flow's steps can change. */
@@ -103,6 +105,7 @@
   | { type: "accept_code_list"; codeListKey: string }
   | { type: "set_name"; name: string }
   | { type: "set_description"; description: string }
+  | { type: "set_applies_next"; appliesNext: boolean }
   | { type: "suggestion_consent_decided"; isApproved: boolean };
 
 type Handlers = {
@@ -366,6 +369,9 @@
   set_description: (state, action) => {
     return { ...state, description: action.description };
   },
+  set_applies_next: (state, action) => {
+    return { ...state, appliesNext: action.appliesNext };
+  },
   suggestion_consent_decided: (state, action) => {
     const suggestionConsent = action.isApproved ? "approved" : "declined";
     return { ...state, suggestionConsent };
@@ -392,6 +398,7 @@
     name: "",
     description: "",
     suggestionConsent: "not_asked",
+    appliesNext: true,
   };
 }
 
```

- [ ] **Step 4: Open what comes next.**

`src/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate.ts`:

```ts
import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { notifySuccess } from "@/utils/notifications/notify";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** A dataset a new dictionary can be applied to once it is saved. */
export type ApplyTarget = { datasetId: Dataset.Id; name: string };

/**
 * What happens once a learned dictionary is saved: a toast, then Apply for
 * the first dataset with the dictionary picked, or the dictionary itself
 * when the user did not ask to apply it. Other datasets to apply it to are
 * named in the toast. Nothing navigates once the user has left the flow.
 * Used by `useCreateDictionary`.
 */
export function useOpenAfterCreate(): (
  dictionary: Readonly<{ id: DataDictionary.Id; name: string }>,
  applyNext: readonly ApplyTarget[],
) => void {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const isMountedRef = useIsMounted();
  return (dictionary, applyNext) => {
    const dictionaryName = dictionary.name;
    const [first, ...rest] = applyNext;
    const restNames = rest.map(prop("name")).join(", ");
    notifySuccess(
      !first
        ? t`Saved ${dictionaryName} to Dictionaries.`
        : rest.length === 0
          ? t`Saved ${dictionaryName} to Dictionaries. Now choose how to apply it.`
          : t`Saved ${dictionaryName} to Dictionaries. Apply it to ${restNames} too, from each dataset's menu.`,
    );
    if (!isMountedRef.current) {
      return;
    }
    navigate(
      first
        ? {
            ...AppLinks.dataManagerApplyDictionaries({
              workspaceSlug: workspace.slug,
              datasetId: first.datasetId,
            }),
            search: { dictionaryId: dictionary.id },
          }
        : AppLinks.dataManagerDictionaryView({
            workspaceSlug: workspace.slug,
            dictionaryId: dictionary.id,
            dictionaryName,
          }),
    );
  };
}
```

`src/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary.ts`:

```diff
--- a/src/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary.ts
+++ b/src/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary.ts
@@ -1,60 +1,58 @@
 import { useMutation } from "@avandar/query-hooks";
 import { useLingui } from "@lingui/react/macro";
 import { useQueryClient } from "@tanstack/react-query";
-import { useNavigate } from "@tanstack/react-router";
 import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
-import { AppLinks } from "@/config/AppLinks/AppLinks";
 import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
-import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
-import { notifyError, notifySuccess } from "@/utils/notifications/notify";
+import { notifyError } from "@/utils/notifications/notify";
 import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
 import {
   createDictionaryFromDraft,
   DictionaryLeftBehindError,
 } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/createDictionaryFromDraft/createDictionaryFromDraft";
+import { useOpenAfterCreate } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
+import type { ApplyTarget } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
 
 /** What the Save step hands over to create a dictionary. */
 export type CreateDictionaryVariables = Omit<
   Parameters<typeof createDictionaryFromDraft>[0],
   "workspaceId"
->;
+> & {
+  /**
+   * The datasets to apply the dictionary to once saved. The first opens
+   * next and the rest are named in the toast. Empty opens the dictionary.
+   */
+  applyNext: readonly ApplyTarget[];
+};
 
 /**
- * Creates the dictionary a proposal describes and opens it, unless the user
- * has already left the create flow. A refusal is explained with the same
- * copy as a save on the Dictionary view, and the create flow keeps its state
- * so the user can retry. The dictionaries list is refreshed after a failure
- * too, because a failed save can leave an empty dictionary in it.
+ * Creates the dictionary a proposal describes, then opens Apply for it or
+ * the dictionary itself (`useOpenAfterCreate`). A refusal is explained with
+ * the same copy as a save on the Dictionary view, and the create flow keeps
+ * its state so the user can retry. The dictionaries list is refreshed after
+ * a failure too, because a failed save can leave an empty dictionary in it.
  */
 export function useCreateDictionary(): [
   create: (variables: CreateDictionaryVariables) => void,
   isCreating: boolean,
 ] {
   const workspace = useCurrentWorkspace();
-  const navigate = useNavigate();
   const { t } = useLingui();
   const copy = useDictionaryCopy();
   const queryClient = useQueryClient();
-  const isMountedRef = useIsMounted();
+  const openAfterCreate = useOpenAfterCreate();
   const [create, isCreating] = useMutation({
-    mutationFn: (variables: CreateDictionaryVariables) => {
+    mutationFn: ({
+      applyNext: _applyNext,
+      ...variables
+    }: CreateDictionaryVariables) => {
       return createDictionaryFromDraft({
         ...variables,
         workspaceId: workspace.id,
       });
     },
     queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
-    onSuccess: (dictionary) => {
-      const dictionaryName = dictionary.name;
-      notifySuccess(t`Saved ${dictionaryName} to Dictionaries.`);
-      const link = AppLinks.dataManagerDictionaryView({
-        workspaceSlug: workspace.slug,
-        dictionaryId: dictionary.id,
-        dictionaryName,
-      });
-      if (isMountedRef.current) {
-        navigate({ to: link.to, params: link.params });
-      }
+    onSuccess: (dictionary, variables) => {
+      openAfterCreate(dictionary, variables.applyNext);
     },
     onError: (error) => {
       queryClient.invalidateQueries({
```

`src/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow.ts`:

```diff
--- a/src/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow.ts
+++ b/src/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow.ts
@@ -23,6 +23,7 @@
 import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
 import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
 import type { NewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";
+import type { ApplyTarget } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
 import type { ReadableDataset } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useReadDatasets";
 import type { Dispatch, RefObject } from "react";
 
@@ -39,6 +40,11 @@
   suggestingCodeListKey: string | undefined;
   createDictionary: () => void;
   isCreating: boolean;
+  /**
+   * The datasets the dictionary is learned from, the one that opened the
+   * flow or else the first picked first. Saving can go on to apply it.
+   */
+  applyTargets: readonly ApplyTarget[];
 };
 
 type FlowOptions = {
@@ -60,10 +66,33 @@
   });
 }
 
+/** The read datasets: the one that opened the flow, or the picked ones. */
+function _getApplyTargets(
+  state: NewDictionaryState,
+  sources: Readonly<NewDictionarySources>,
+): ApplyTarget[] {
+  if (!state.proposal) {
+    return [];
+  }
+  const readIds = DictionaryProposal.getDatasetIds(state.proposal);
+  const orderedIds = state.originDatasetId
+    ? [state.originDatasetId]
+    : state.pickedDatasetIds;
+  return orderedIds.flatMap((datasetId) => {
+    const dataset = sources.datasets.find((current) => {
+      return current.id === datasetId;
+    });
+    return dataset && readIds.includes(datasetId)
+      ? [{ datasetId, name: dataset.name }]
+      : [];
+  });
+}
+
 function _makeCreateDictionary(
   options: Readonly<{
     state: NewDictionaryState;
     userProfile: UserProfile.T | undefined;
+    applyTargets: readonly ApplyTarget[];
     create: (variables: CreateDictionaryVariables) => void;
     isCreatingRef: RefObject<boolean>;
   }>,
@@ -84,6 +113,7 @@
         proposal: state.proposal,
         labels: state.labels,
       }),
+      applyNext: state.appliesNext ? options.applyTargets : [],
     });
   };
 }
@@ -282,6 +312,7 @@
   });
   const readPicked = useReadPicked({ state, sources, read: reading.read });
   const [create, isCreating] = useCreateDictionary();
+  const applyTargets = _getApplyTargets(state, sources);
   const isCreatingRef = useRef(false);
   useEffect(() => {
     if (!isCreating) {
@@ -299,9 +330,11 @@
     createDictionary: _makeCreateDictionary({
       state,
       userProfile,
+      applyTargets,
       create,
       isCreatingRef,
     }),
     isCreating,
+    applyTargets,
   };
 }
```

- [ ] **Step 5: Show the checkbox.**

`src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveApplyNextField.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Checkbox } from "@mantine/core";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ApplyTarget } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
import type { Dispatch, ReactNode } from "react";

type Props = {
  appliesNext: boolean;
  /** The datasets the dictionary was learned from, the first opened next. */
  applyTargets: readonly ApplyTarget[];
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * Whether saving goes on to apply the new dictionary: to the one dataset it
 * was learned from, or to the first of several.
 */
export function SaveApplyNextField({
  appliesNext,
  applyTargets,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [first] = applyTargets;
  if (!first) {
    return null;
  }
  const firstName = first.name;
  const label =
    applyTargets.length === 1
      ? t`Apply it to ${firstName} next`
      : plural(applyTargets.length, {
          one: "Apply it to this dataset after saving",
          other: "Apply it to these # datasets after saving",
        });
  return (
    <Checkbox
      label={label}
      description={
        applyTargets.length > 1
          ? t`${firstName} opens first. Apply it to the others from each dataset's menu.`
          : undefined
      }
      checked={appliesNext}
      onChange={(event) => {
        const isChecked = event.currentTarget.checked;
        dispatch({ type: "set_applies_next", appliesNext: isChecked });
      }}
    />
  );
}
```

`src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep.tsx`:

```diff
--- a/src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep.tsx
+++ b/src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep.tsx
@@ -3,11 +3,13 @@
 import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
 import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
 import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
+import { SaveApplyNextField } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveApplyNextField";
 import { SaveFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveFooter";
 import { SaveNameFields } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveNameFields";
 import { SaveSummary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveSummary";
 import { SaveWarnings } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveWarnings";
 import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
+import type { ApplyTarget } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
 import type { Dispatch, ReactNode } from "react";
 
 type Props = {
@@ -17,6 +19,8 @@
   description: string;
   originDatasetName: string | undefined;
   learnedFromNames: readonly string[];
+  appliesNext: boolean;
+  applyTargets: readonly ApplyTarget[];
   isCreating: boolean;
   dispatch: Dispatch<NewDictionaryAction>;
   onCreate: () => void;
@@ -60,6 +64,11 @@
             proposal={proposal}
             labels={labels}
           />
+          <SaveApplyNextField
+            appliesNext={props.appliesNext}
+            applyTargets={props.applyTargets}
+            dispatch={dispatch}
+          />
         </Stack>
       </AppViewBody>
       <SaveFooter
```

`src/views/DataManagerApp/NewDictionaryFromDatasetsView/ProposalStepBody.tsx`:

```diff
--- a/src/views/DataManagerApp/NewDictionaryFromDatasetsView/ProposalStepBody.tsx
+++ b/src/views/DataManagerApp/NewDictionaryFromDatasetsView/ProposalStepBody.tsx
@@ -57,6 +57,8 @@
         description={state.description}
         originDatasetName={originDatasetName}
         learnedFromNames={_getLearnedFromNames(proposal)}
+        appliesNext={state.appliesNext}
+        applyTargets={flow.applyTargets}
         isCreating={flow.isCreating}
         dispatch={dispatch}
         onCreate={flow.createDictionary}
```

- [ ] **Step 6:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView`. Expected: PASS, slice 2's tests included.
- [ ] **Step 7: Commit** the paths above as `feat(data-dictionaries): apply a learned dictionary right after saving it`.

---

### Task 19: The Dictionary view: Used by, and Apply to a dataset

The Used by tab lists each dataset the user can see that uses the dictionary: its name (a link), how it was applied (a Reference badge and "data unchanged, always current"), how many entries its columns use, and "Up to date" (a reference binding always shows the dictionary's latest version, so there is no Re-apply). The header's facts gain "Used by n datasets" and the tab reads "Used by · n". A dataset the user cannot read is never counted: its bindings are hidden with it. The header's primary action, "Apply to a dataset", shows to anyone with `data_sources__can_edit_dataset` and opens a dialog with a searchable Select of the workspace's datasets; Continue opens the apply flow with this dictionary as the only one in use. The apply view still checks edit rights on the chosen dataset (Task 17).

**Files:**
- Create: `src/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage.ts`
- Create: `src/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTable.tsx`
- Modify: `src/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab.tsx` (+ test)
- Create: `src/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetModal.tsx`
- Create: `src/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetButton.tsx`
- Modify: `src/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader.tsx` (+ test)
- Modify: `src/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor.tsx`
- Modify: `src/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs.tsx`

- [ ] **Step 1: Write the failing tests.**

`src/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DictionaryUsedByTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
vi.mock("@avandar/ui", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    Link: (props: { children: string }) => {
      return <a href="#dataset">{props.children}</a>;
    },
  };
});

describe("DictionaryUsedByTab", () => {
  it("lists each dataset with how the dictionary was applied", () => {
    render(
      <DictionaryUsedByTab
        usage={{
          isLoading: false,
          rows: [
            {
              datasetId: "dataset-1" as Dataset.Id,
              datasetName: "Kings line list",
              entryCount: 3,
            },
          ],
        }}
      />,
    );

    const row = screen.getByRole("row", { name: /Kings line list/ });
    expect(row).toHaveTextContent("Reference");
    expect(row).toHaveTextContent("data unchanged, always current");
    expect(row).toHaveTextContent("Up to date");
  });

  it("says when no dataset uses the dictionary", () => {
    render(<DictionaryUsedByTab usage={{ isLoading: false, rows: [] }} />);

    expect(
      screen.getByText("No datasets use this dictionary yet"),
    ).toBeInTheDocument();
  });
});
```

`src/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader.test.tsx`:

```diff
--- a/src/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader.test.tsx
+++ b/src/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader.test.tsx
@@ -39,6 +39,17 @@
 );
 
 vi.mock(
+  "@/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetButton",
+  () => {
+    return {
+      ApplyToDatasetButton: () => {
+        return <button type="button">Apply to a dataset</button>;
+      },
+    };
+  },
+);
+
+vi.mock(
   "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryNameField",
   () => {
     return {
@@ -63,6 +74,7 @@
       dictionary={DICTIONARY}
       draft={{ entries: [], codeLists: [] }}
       canEdit={false}
+      usedByCount={2}
     />,
   );
 }
@@ -73,6 +85,7 @@
       dictionary={DICTIONARY}
       draft={{ entries: [], codeLists: [] }}
       canEdit
+      usedByCount={2}
     />,
   );
 }
@@ -114,3 +127,30 @@
     ).not.toBeInTheDocument();
   });
 });
+
+describe("DataDictionaryHeader use", () => {
+  beforeEach(() => {
+    mocks.currentUserId = OWNER_ID;
+    mocks.dataSourcesRole = "editor";
+  });
+
+  it("says how many datasets use the dictionary", () => {
+    _renderHeader();
+    expect(screen.getByText(/Used by 2 datasets/)).toBeInTheDocument();
+  });
+
+  it("offers Apply to a dataset to someone who can edit datasets", () => {
+    _renderHeader();
+    expect(
+      screen.getByRole("button", { name: "Apply to a dataset" }),
+    ).toBeInTheDocument();
+  });
+
+  it("does not offer it to a Data Sources viewer", () => {
+    mocks.dataSourcesRole = "viewer";
+    _renderHeader();
+    expect(
+      screen.queryByRole("button", { name: "Apply to a dataset" }),
+    ).toBeNull();
+  });
+});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/DataDictionaryView`. Expected: the new tests FAIL.
- [ ] **Step 3: Write Used by.**

`src/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage.ts`:

```ts
import { prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** One dataset a dictionary is applied to, as the Used by tab lists it. */
export type DictionaryUsageRow = {
  datasetId: Dataset.Id;
  datasetName: string;
  /** How many of the dictionary's entries the dataset's columns use. */
  entryCount: number;
};

/** The datasets a dictionary is applied to, sorted by name. */
export type DictionaryUsage = {
  rows: readonly DictionaryUsageRow[];
  isLoading: boolean;
};

function _toRows(
  bindings: readonly DictionaryBinding.T[],
  datasets: readonly Dataset.T[],
): DictionaryUsageRow[] {
  return datasets
    .map((dataset) => {
      const entryIds = bindings
        .filter((binding) => {
          return binding.datasetId === dataset.id;
        })
        .map(prop("entryId"));
      return {
        datasetId: dataset.id,
        datasetName: dataset.name,
        entryCount: new Set(entryIds).size,
      };
    })
    .sort((rowA, rowB) => {
      return rowA.datasetName.localeCompare(rowB.datasetName);
    });
}

/**
 * The datasets one dictionary is applied to, that the user can see. A
 * dataset the user cannot read is never counted, because its bindings are
 * hidden with it. Bindings refetch on mount, so an apply made a moment ago
 * is listed. Used by the Dictionary view's header and Used by tab.
 */
export function useDictionaryUsage(
  dictionaryId: DataDictionary.Id,
): DictionaryUsage {
  const [bindings, isLoadingBindings] = DictionaryBindingClient.useGetAll({
    ...where("dictionary_id", "eq", dictionaryId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const datasetIds = useMemo(() => {
    return [...new Set((bindings ?? []).map(prop("datasetId")))];
  }, [bindings]);
  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    ...where("id", "in", datasetIds),
    useQueryOptions: { enabled: datasetIds.length > 0 },
  });
  const rows = useMemo(() => {
    return _toRows(
      bindings ?? [],
      datasetIds.length > 0 ? (datasets ?? []) : [],
    );
  }, [bindings, datasets, datasetIds]);
  return { rows, isLoading: isLoadingBindings || isLoadingDatasets };
}
```

`src/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTable.tsx`:

```tsx
import { Link } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Badge, Group, Table, Text } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { DictionaryUsageRow } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { ReactNode } from "react";

type Props = {
  rows: readonly DictionaryUsageRow[];
};

function UsageRow({ row }: Readonly<{ row: DictionaryUsageRow }>): ReactNode {
  const workspace = useCurrentWorkspace();
  const link = AppLinks.dataManagerDatasetView({
    workspaceSlug: workspace.slug,
    datasetId: row.datasetId,
    datasetName: row.datasetName,
  });
  return (
    <Table.Tr>
      <Table.Td>
        <Link to={link.to} params={link.params} size="sm" fw={500}>
          {row.datasetName}
        </Link>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Badge
            variant="light"
            color="neutral"
            leftSection={<IconTag size={12} aria-hidden />}
          >
            <Trans>Reference</Trans>
          </Badge>
          <Text size="xs" c="dimmed">
            <Trans>data unchanged, always current</Trans>
          </Text>
        </Group>
      </Table.Td>
      <Table.Td ta="end">{row.entryCount}</Table.Td>
      <Table.Td>
        <Badge variant="light" color="green">
          <Trans>Up to date</Trans>
        </Badge>
      </Table.Td>
    </Table.Tr>
  );
}

/** One row per dataset the dictionary is applied to, and how. */
export function DictionaryUsedByTable({ rows }: Readonly<Props>): ReactNode {
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <Trans>Dataset</Trans>
          </Table.Th>
          <Table.Th w="40%">
            <Trans>How it was applied</Trans>
          </Table.Th>
          <Table.Th w="10%" ta="end">
            <Trans>Entries</Trans>
          </Table.Th>
          <Table.Th w="16%">
            <Trans>Status</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => {
          return <UsageRow key={row.datasetId} row={row} />;
        })}
      </Table.Tbody>
    </Table>
  );
}
```

`src/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";
import { IconTableOff } from "@tabler/icons-react";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { DictionaryUsedByTable } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTable";
import type { DictionaryUsage } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { ReactNode } from "react";

type Props = {
  usage: DictionaryUsage;
};

/**
 * The datasets a dictionary is applied to and how. Applying it as reference
 * never changes the data and always shows the dictionary's latest version,
 * so every row is up to date.
 */
export function DictionaryUsedByTab({ usage }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  if (usage.isLoading) {
    return (
      <Center p="xl">
        <Loader size="sm" />
      </Center>
    );
  }
  if (usage.rows.length === 0) {
    return (
      <AppSlateEmptyState
        icon={<IconTableOff size={32} stroke={1.5} aria-hidden />}
        title={t`No datasets use this dictionary yet`}
        message={
          <Trans>
            Apply it to a dataset to explain its codes and describe its columns.
            The datasets it is applied to are listed here.
          </Trans>
        }
      />
    );
  }
  return <DictionaryUsedByTable rows={usage.rows} />;
}
```

- [ ] **Step 4: Write Apply to a dataset.**

`src/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetModal.tsx`:

```tsx
import { Modal } from "@avandar/ui";
import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Select, Stack } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Picks the dataset to apply a dictionary to, then opens the apply flow for
 * it with only that dictionary in use.
 */
export function ApplyToDatasetModal({
  dictionary,
  isOpen,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [datasets] = DatasetClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: { enabled: isOpen },
  });
  const options = (datasets ?? []).map((dataset) => {
    return { value: dataset.id, label: dataset.name };
  });
  const dictionaryName = dictionary.name;
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={t`Apply ${dictionaryName} to a dataset`}
    >
      <Stack gap="md">
        <Select
          label={t`Dataset`}
          data={options}
          value={datasetId}
          onChange={setDatasetId}
          searchable
          nothingFoundMessage={t`No dataset has that name`}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!datasetId}
            onClick={() => {
              if (datasetId) {
                navigate({
                  ...AppLinks.dataManagerApplyDictionaries({
                    workspaceSlug: workspace.slug,
                    datasetId,
                  }),
                  search: { dictionaryId: dictionary.id },
                });
              }
            }}
          >
            <Trans>Continue</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

`src/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetButton.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ApplyToDatasetModal } from "@/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetModal";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
};

/** The Dictionary view's main action: applying it to a dataset. */
export function ApplyToDatasetButton({
  dictionary,
}: Readonly<Props>): ReactNode {
  const [isOpen, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button onClick={open}>
        <Trans>Apply to a dataset</Trans>
      </Button>
      <ApplyToDatasetModal
        dictionary={dictionary}
        isOpen={isOpen}
        onClose={close}
      />
    </>
  );
}
```

- [ ] **Step 5: Wire both into the view.**

`src/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader.tsx`:

```diff
--- a/src/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader.tsx
+++ b/src/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader.tsx
@@ -2,6 +2,8 @@
 import { plural } from "@lingui/core/macro";
 import { useLingui } from "@lingui/react/macro";
 import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
+import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
+import { ApplyToDatasetButton } from "@/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetButton";
 import { DataDictionaryActionsMenu } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryActionsMenu/DataDictionaryActionsMenu";
 import { DataDictionaryNameField } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryNameField";
 import { useCanDeleteDictionary } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/useCanDeleteDictionary";
@@ -12,6 +14,8 @@
   dictionary: DataDictionary.T;
   draft: DataDictionary.Draft;
   canEdit: boolean;
+  /** How many datasets the user can see that use this dictionary. */
+  usedByCount: number;
 };
 
 /** The dictionary's name, the facts that identify it, and its actions. */
@@ -19,11 +23,13 @@
   dictionary,
   draft,
   canEdit,
+  usedByCount,
 }: Readonly<Props>): ReactNode {
   const { t } = useLingui();
   const entryCount = draft.entries.length;
   const codeListCount = draft.codeLists.length;
   const canDelete = useCanDeleteDictionary(dictionary);
+  const canApply = useHasPermission("data_sources__can_edit_dataset");
   const updatedDate = formatDate(dictionary.updatedAt, {
     format: "MMM D, YYYY",
   });
@@ -41,13 +47,20 @@
         t`Dictionary`,
         plural(entryCount, { one: "# entry", other: "# entries" }),
         plural(codeListCount, { one: "# code list", other: "# code lists" }),
+        plural(usedByCount, {
+          one: "Used by # dataset",
+          other: "Used by # datasets",
+        }),
         t`Version ${dictionary.version}`,
         t`Updated ${updatedDate}`,
       ]}
       actions={
-        canEdit && canDelete ? (
-          <DataDictionaryActionsMenu dictionary={dictionary} />
-        ) : undefined
+        <>
+          {canApply ? <ApplyToDatasetButton dictionary={dictionary} /> : null}
+          {canEdit && canDelete ? (
+            <DataDictionaryActionsMenu dictionary={dictionary} />
+          ) : null}
+        </>
       }
     />
   );
```

`src/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor.tsx`:

```diff
--- a/src/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor.tsx
+++ b/src/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor.tsx
@@ -9,6 +9,7 @@
 import { DataDictionaryHeader } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader";
 import { DataDictionaryRail } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryRail/DataDictionaryRail";
 import { useDataDictionaryDraft } from "@/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft/useDataDictionaryDraft";
+import { useDictionaryUsage } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
 import type { DataDictionaryTabId } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs";
 import type { ReactNode } from "react";
 
@@ -46,6 +47,7 @@
     return DataDictionary.findDraftIssues(draft);
   }, [draft]);
   const selection = useEditorSelection(draft);
+  const usage = useDictionaryUsage(dictionary.id);
 
   return (
     <AppView>
@@ -53,6 +55,7 @@
         dictionary={dictionary}
         draft={draft}
         canEdit={canEdit}
+        usedByCount={usage.rows.length}
       />
       <AppViewBody
         rail={_buildRail({ activeTab: selection.activeTab, dictionary })}
@@ -62,6 +65,7 @@
           issues={issues}
           canEdit={canEdit}
           selection={selection}
+          usage={usage}
           onDraftChange={setDraft}
         />
         <DataDictionaryEditorSaveBar
```

`src/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs.tsx`:

```diff
--- a/src/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs.tsx
+++ b/src/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs.tsx
@@ -6,6 +6,7 @@
 import { DictionaryUsedByTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab";
 import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
 import type { EditorSelection } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/useEditorSelection";
+import type { DictionaryUsage } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
 import type { ReactNode } from "react";
 
 const TAB_IDS = ["entries", "code-lists", "used-by"] as const;
@@ -18,6 +19,8 @@
   issues: readonly DataDictionary.DraftIssue[];
   canEdit: boolean;
   selection: EditorSelection;
+  /** The datasets the dictionary is applied to. */
+  usage: DictionaryUsage;
   onDraftChange: (draft: DataDictionary.Draft) => void;
 };
 
@@ -27,6 +30,7 @@
   const { t } = useLingui();
   const entryCount = draft.entries.length;
   const codeListCount = draft.codeLists.length;
+  const usedByCount = props.usage.rows.length;
 
   return (
     <Tabs
@@ -37,7 +41,7 @@
       renderTabHeader={{
         entries: t`Entries · ${entryCount}`,
         "code-lists": t`Code lists · ${codeListCount}`,
-        "used-by": t`Used by`,
+        "used-by": t`Used by · ${usedByCount}`,
       }}
       renderTabPanel={{
         entries: () => {
@@ -64,7 +68,7 @@
           );
         },
         "used-by": () => {
-          return <DictionaryUsedByTab />;
+          return <DictionaryUsedByTab usage={props.usage} />;
         },
       }}
     />
```

- [ ] **Step 6:** `pnpm vitest run src/views/DataManagerApp/DataDictionaryView`. Expected: PASS, slice 1's tests included.
- [ ] **Step 7: Commit** the paths above as `feat(data-dictionaries): list the datasets a dictionary is applied to`.

---

### Task 20: Codes in the Data Explorer grid

A result column that is a bound dataset column selected as is gets the tag in its header. "As is" is read from the projection descriptors the Data Explorer already builds: a projection whose `sqlExpressionKey` is the plain, unaggregated column of one dataset (`["sql",[null,null,"<dataset id>"],"GENDER","none"]`). That covers the query builder (a picked or grouped column) and plain SQL selects; an aggregate, an expression, a join, or SQL the projection reader cannot follow gets no tag (see Refinements). The codes reach the grid through a React context read by `DataGridColumnTitle`, so `VisualizationContainer`, `BuiltInVizContainer`, and `UiVizConfigRenderer` stay as they are; a test proves the context reaches ag-grid's header components.

**Files:**
- Create: `src/lib/dataDictionaries/getResultColumnCodes/getResultColumnCodes.ts` (+ test)
- Create: `src/lib/ui/viz/DataGridColumnTitle/ColumnCodesContext.ts`
- Modify: `src/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.tsx`
- Modify: `src/lib/ui/viz/DataGrid.test.tsx`
- Create: `src/views/DataExplorerApp/useExplorerColumnCodes/useExplorerColumnCodes.ts`
- Modify: `src/views/DataExplorerApp/DataExplorerApp.tsx`
- Modify: `src/views/DataExplorerApp/DataExplorerApp.test.tsx`

- [ ] **Step 1: Write the failing tests.**

`src/lib/dataDictionaries/getResultColumnCodes/getResultColumnCodes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import {
  getResultColumnCodes,
  getSourceDatasetId,
} from "@/lib/dataDictionaries/getResultColumnCodes/getResultColumnCodes";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const GENDER_CODES = {
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  ],
} as unknown as ColumnCodes.T;
const CODES = new Map([["GENDER", GENDER_CODES]]);

function _projections(sql: string, columnNames: readonly string[]) {
  return makeProjectionDescriptorsFromSql({
    sql,
    columns: columnNames.map((name) => {
      return { name, dataType: "varchar" };
    }) as never,
  });
}

describe("getResultColumnCodes", () => {
  it("gives a column selected as is its code list", () => {
    const projections = _projections(
      `SELECT "GENDER", "county" FROM "${DATASET_ID}"`,
      ["GENDER", "county"],
    );

    expect(getSourceDatasetId(projections)).toBe(DATASET_ID);
    expect(
      getResultColumnCodes({
        projections,
        datasetId: DATASET_ID,
        codesByColumnName: CODES,
      }).get("GENDER"),
    ).toBe(GENDER_CODES);
  });

  it("gives an aggregated column none", () => {
    const projections = _projections(
      `SELECT max("GENDER") AS top FROM "${DATASET_ID}"`,
      ["top"],
    );

    expect(
      getResultColumnCodes({
        projections,
        datasetId: DATASET_ID,
        codesByColumnName: CODES,
      }).size,
    ).toBe(0);
  });
});
```

`src/lib/ui/viz/DataGrid.test.tsx`:

```diff
--- a/src/lib/ui/viz/DataGrid.test.tsx
+++ b/src/lib/ui/viz/DataGrid.test.tsx
@@ -2,8 +2,10 @@
 import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
 import { describe, expect, it } from "vitest";
 import { DataGrid } from "@/lib/ui/viz/DataGrid";
+import { ColumnCodesContext } from "@/lib/ui/viz/DataGridColumnTitle/ColumnCodesContext";
 import { DataGridColumnTitle } from "@/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle";
 import { render } from "@/test-utils";
+import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import type { GridApi } from "ag-grid-community";
 
 ModuleRegistry.registerModules([AllCommunityModule]);
@@ -32,4 +34,30 @@
     expect(columnDef?.headerTooltip).toBeUndefined();
     expect(screen.getByText("county_of_residence")).toBeInTheDocument();
   });
+
+  it("puts a code-list tag on a column title that has one", async () => {
+    const codes = {
+      dictionaryName: "NYS codes",
+      entryName: "sex",
+      codeListName: "Sex (1/2/9)",
+      pairs: [
+        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
+      ],
+    } as unknown as ColumnCodes.T;
+    render(
+      <ColumnCodesContext.Provider value={new Map([["GENDER", codes]])}>
+        <DataGrid
+          columnNames={["GENDER", "county"]}
+          data={[{ GENDER: 1, county: "Kings" }]}
+        />
+      </ColumnCodesContext.Provider>,
+    );
+
+    expect(
+      await screen.findByRole("button", { name: "Code list for GENDER" }),
+    ).toBeInTheDocument();
+    expect(
+      screen.queryByRole("button", { name: "Code list for county" }),
+    ).toBeNull();
+  });
 });
```

- [ ] **Step 2:** `pnpm vitest run src/lib/dataDictionaries/getResultColumnCodes src/lib/ui/viz/DataGrid.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Write the lookup, the context, and the title.**

`src/lib/dataDictionaries/getResultColumnCodes/getResultColumnCodes.ts`:

```ts
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ProjectionDescriptor } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";

/** A projection's source table and column, when it selects one column as is. */
type PlainColumn = { table: string; column: string };

/**
 * Reads `makeSqlExpressionKeyFromColumnExpression`'s key back: the table
 * and column of a projection that selects a column with no aggregation.
 * Undefined for an aggregate, an expression, or a qualified table.
 */
function _readPlainColumn(
  projection: Pick<ProjectionDescriptor, "sqlExpressionKey">,
): PlainColumn | undefined {
  try {
    const key: unknown = JSON.parse(projection.sqlExpressionKey);
    if (!Array.isArray(key) || key[0] !== "sql" || key[3] !== "none") {
      return undefined;
    }
    const [database, schema, table] = key[1] as unknown[];
    const column = key[2];
    return database === null &&
      schema === null &&
      typeof table === "string" &&
      typeof column === "string"
      ? { table, column }
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The one dataset every plain column of a query result comes from, or
 * undefined when there is none or several. Use it to look up the codes of
 * a result's columns, for example in the Data Explorer.
 */
export function getSourceDatasetId(
  projections: ReadonlyArray<Pick<ProjectionDescriptor, "sqlExpressionKey">>,
): Dataset.Id | undefined {
  const datasetIds = new Set(
    projections.flatMap((projection) => {
      const plain = _readPlainColumn(projection);
      const ref = plain ? RelationRef.fromTableName(plain.table) : undefined;
      return ref?.kind === "dataset" ? [ref.id] : [];
    }),
  );
  return datasetIds.size === 1 ? [...datasetIds][0] : undefined;
}

/**
 * The code list of each result column that is a bound dataset column
 * selected as is, by result column name. A column that was aggregated,
 * computed, or renamed from another dataset gets none.
 */
export function getResultColumnCodes(
  options: Readonly<{
    projections: ReadonlyArray<
      Pick<ProjectionDescriptor, "sqlExpressionKey" | "queryResultColumnName">
    >;
    datasetId: Dataset.Id;
    codesByColumnName: ReadonlyMap<string, ColumnCodes.T>;
  }>,
): Map<string, ColumnCodes.T> {
  const result = new Map<string, ColumnCodes.T>();
  options.projections.forEach((projection) => {
    const plain = _readPlainColumn(projection);
    const codes = plain
      ? options.codesByColumnName.get(plain.column)
      : undefined;
    if (plain?.table === options.datasetId && codes && codes.pairs.length > 0) {
      result.set(projection.queryResultColumnName, codes);
    }
  });
  return result;
}
```

`src/lib/ui/viz/DataGridColumnTitle/ColumnCodesContext.ts`:

```ts
import { createContext } from "react";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";

/**
 * The code list of each grid column that has one, by column name. A view
 * that knows which result columns are bound dataset columns provides it,
 * for example the Data Explorer, and `DataGridColumnTitle` shows a tag for
 * each. Empty by default, so other grids show no tags.
 */
export const ColumnCodesContext = createContext<
  ReadonlyMap<string, ColumnCodes.T>
>(new Map());
```

`src/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.tsx`:

```diff
--- a/src/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.tsx
+++ b/src/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.tsx
@@ -1,15 +1,21 @@
 import { TruncatedText } from "@avandar/ui";
+import { Group } from "@mantine/core";
+import { useContext } from "react";
+import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
+import { ColumnCodesContext } from "@/lib/ui/viz/DataGridColumnTitle/ColumnCodesContext";
 import css from "@/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle.module.css";
 import type { IHeaderParams } from "ag-grid-community";
 import type { ReactNode } from "react";
 
 /**
  * The text of one grid column title. A title that does not fit the header
- * ends in an ellipsis, and hovering it shows the full name. Sort, filter,
+ * ends in an ellipsis, and hovering it shows the full name. A column with a
+ * code list in `ColumnCodesContext` gets a tag that opens it. Sort, filter,
  * and resize stay on the grid's own header around this text.
  */
 export function DataGridColumnTitle({ displayName }: IHeaderParams): ReactNode {
-  return (
+  const codes = useContext(ColumnCodesContext).get(displayName);
+  const title = (
     <TruncatedText
       className={css.columnTitle}
       tooltipProps={{ position: "bottom" }}
@@ -17,4 +23,13 @@
       {displayName}
     </TruncatedText>
   );
+  if (!codes) {
+    return title;
+  }
+  return (
+    <Group gap={4} wrap="nowrap" miw={0}>
+      {title}
+      <CodeListPopover columnName={displayName} codes={codes} />
+    </Group>
+  );
 }
```

- [ ] **Step 4: Provide the codes in the Data Explorer.** Its test renders without a query client, so it mocks the new hook:

`src/views/DataExplorerApp/useExplorerColumnCodes/useExplorerColumnCodes.ts`:

```ts
import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useDatasetColumnCodes } from "@/hooks/dataDictionaries/useDatasetColumnCodes/useDatasetColumnCodes";
import {
  getResultColumnCodes,
  getSourceDatasetId,
} from "@/lib/dataDictionaries/getResultColumnCodes/getResultColumnCodes";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ProjectionDescriptor } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";

const NO_CODES: ReadonlyMap<string, ColumnCodes.T> = new Map();

/**
 * The code list of each Data Explorer result column that is a bound dataset
 * column selected as is, by result column name, for the grid's column
 * titles. A query over several datasets, or one the SQL reader cannot
 * follow, gets none. Used by `DataExplorerApp`.
 */
export function useExplorerColumnCodes(
  projections: readonly ProjectionDescriptor[],
): ReadonlyMap<string, ColumnCodes.T> {
  const datasetId = getSourceDatasetId(projections);
  const [columns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", datasetId),
    useQueryOptions: { enabled: datasetId !== undefined },
  });
  const { byColumnName } = useDatasetColumnCodes({ datasetId, columns });
  return useMemo(() => {
    return datasetId
      ? getResultColumnCodes({
          projections,
          datasetId,
          codesByColumnName: byColumnName,
        })
      : NO_CODES;
  }, [datasetId, projections, byColumnName]);
}
```

`src/views/DataExplorerApp/DataExplorerApp.tsx`:

```diff
--- a/src/views/DataExplorerApp/DataExplorerApp.tsx
+++ b/src/views/DataExplorerApp/DataExplorerApp.tsx
@@ -26,6 +26,7 @@
 import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
 import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
 import { PluginMenuSlot } from "@/lib/plugins/PluginMenuSlot/PluginMenuSlot";
+import { ColumnCodesContext } from "@/lib/ui/viz/DataGridColumnTitle/ColumnCodesContext";
 import css from "@/views/DataExplorerApp/DataExplorerApp.module.css";
 import { DataExplorerDrawer } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";
 import { DataExplorerSaveMenu } from "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerSaveMenu";
@@ -42,6 +43,7 @@
 import { useDataExplorerPluginContext } from "@/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext";
 import { useDataExplorerUrlSync } from "@/views/DataExplorerApp/useDataExplorerUrlSync";
 import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
+import { useExplorerColumnCodes } from "@/views/DataExplorerApp/useExplorerColumnCodes/useExplorerColumnCodes";
 import { useQueryResultColumnBindings } from "@/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings";
 import { useSyncLargeDatasetAutoLimit } from "@/views/DataExplorerApp/useSyncLargeDatasetAutoLimit/useSyncLargeDatasetAutoLimit";
 import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
@@ -170,6 +172,7 @@
     savableSql,
     queryResults?.columns,
   ]);
+  const columnCodes = useExplorerColumnCodes(projections);
   const schema = useQueryResultColumnBindings({
     scopeKey: `${workspace.id}:${columnBindingScope.current}`,
     sqlKey: savableSql ?? "",
@@ -329,13 +332,15 @@
             aria-hidden
           />
           <LoadingOverlay visible={isLoadingResults} zIndex={99} />
-          <VisualizationContainer
-            rawColumns={queryResults?.columns}
-            columns={chartInput.columns}
-            data={chartInput.data}
-            dateColumns={chartInput.dateColumns}
-            vizConfig={chartInput.vizConfig}
-          />
+          <ColumnCodesContext.Provider value={columnCodes}>
+            <VisualizationContainer
+              rawColumns={queryResults?.columns}
+              columns={chartInput.columns}
+              data={chartInput.data}
+              dateColumns={chartInput.dateColumns}
+              vizConfig={chartInput.vizConfig}
+            />
+          </ColumnCodesContext.Provider>
         </Box>
         <DataExplorerDrawer
           columns={queryResultColumns}
```

`src/views/DataExplorerApp/DataExplorerApp.test.tsx`:

```diff
--- a/src/views/DataExplorerApp/DataExplorerApp.test.tsx
+++ b/src/views/DataExplorerApp/DataExplorerApp.test.tsx
@@ -40,6 +40,16 @@
   },
 );
 
+vi.mock(
+  "@/views/DataExplorerApp/useExplorerColumnCodes/useExplorerColumnCodes",
+  () => {
+    return {
+      useExplorerColumnCodes: () => {
+        return new Map();
+      },
+    };
+  },
+);
 vi.mock("@/views/DataExplorerApp/useDataQuery/useDataQuery", () => {
   return {
     useDataQuery: () => {
```

- [ ] **Step 5:** `pnpm vitest run src/lib/dataDictionaries src/lib/ui/viz src/views/DataExplorerApp`. Expected: PASS.
- [ ] **Step 6: Commit** the paths above as `feat(data-dictionaries): show code lists in the Data Explorer grid`.

---

### Task 21: Prompt v4: code lists in the data agent's prompt

`DataAgentDataset` columns gain an optional `codes` (`ColumnCodes.Context`), and a new prompt version, `data-agent-v4`, lists each bound column on its own line under its dataset:

```text
t0 = "Bronx line list": CaseNo text, GENDER int, onset_dt date
  - CaseNo: Case number from the county.
  - GENDER: codes 1=Male, 2=Female, 9=(no label) (missing). Sex recorded on the case report.
```

A separate line keeps the codes' commas apart from the commas between columns, which the spec's inline `GENDER int codes 1=Male, 2=Female` would mix (spec section 10 edited to match). A column holding labels reads `values Male, Female`. v4's instructions are v3's plus a CODED COLUMNS block: filter and group on the code and name the label in the summary, never call `lookup_values` for a listed label, never guess a code with no label. v1 to v3 stay exactly as shipped: a new test freezes v3's instructions by length and SHA-256 (6,828 characters, computed while planning), and v3 never lists codes even when the datasets carry them. Tabs opened before the deploy keep asking for v3, which the proxy keeps serving. The browser now names v4 in the proxy URL, so three e2e specs that stub that URL change with it.

**Files:**
- Modify: `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts` (+ test)
- Modify: `shared/agent/dataAgent/dataAgentTools.ts`
- Modify: `tests/e2e/agent-chat-result.spec.ts`, `tests/e2e/agent-chat-sessions.spec.ts`, `tests/e2e/agent-chat-mentions.spec.ts`

- [ ] **Step 1: Write the failing tests.**

`shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts`:

```diff
--- a/shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts
+++ b/shared/agent/dataAgent/buildDataAgentSystemPrompt.test.ts
@@ -17,6 +17,56 @@
 const V2_INSTRUCTIONS_SHA256 =
   "99ccfa97cf7b7516cf31eb90cd72ec64ce4dbb8b401c2f342054438f1cdb25a4";
 
+/**
+ * SHA-256 of prompt v3's instructions (everything before DATASETS), as
+ * shipped on 2026-11-09. Tabs opened before a deploy still request v3.
+ */
+const V3_INSTRUCTIONS_SHA256 =
+  "251d390134571b4ab6200d01a9641fae13cd9eda35909f6def1ceee9e6ec824b";
+
+/** A line list whose GENDER and hosp_yn columns have code lists attached. */
+const CODED_DATASETS = [
+  {
+    id: "cccccccc-3333-4333-8333-cccccccccccc",
+    name: "Bronx line list",
+    columns: [
+      {
+        name: "CaseNo",
+        dataType: "varchar",
+        codes: {
+          direction: "decode" as const,
+          pairs: [],
+          description: "Case number from the county.",
+        },
+      },
+      {
+        name: "GENDER",
+        dataType: "bigint",
+        codes: {
+          direction: "decode" as const,
+          pairs: [
+            {
+              code: "1",
+              label: "Male",
+              acceptedSpellings: [],
+              isMissing: false,
+            },
+            {
+              code: "2",
+              label: "Female",
+              acceptedSpellings: [],
+              isMissing: false,
+            },
+            { code: "9", label: "", acceptedSpellings: [], isMissing: true },
+          ],
+          description: "Sex recorded on the case report.",
+        },
+      },
+      { name: "onset_dt", dataType: "date" },
+    ],
+  },
+];
+
 const DATASETS = [
   {
     id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
@@ -190,4 +240,55 @@
     expect(v3).toContain("call run_query to list or compare columns");
     expect(v2).not.toContain("call run_query to list or compare columns");
   });
+
+  it("keeps every character of v3's instructions", () => {
+    const prompt = buildDataAgentSystemPrompt({
+      datasets: DATASETS,
+      today: "2026-11-12",
+      promptId: "data-agent-v3",
+    });
+    const instructions = prompt.slice(0, prompt.indexOf("\n\nDATASETS\n"));
+
+    expect(instructions.length).toBe(6828);
+    expect(createHash("sha256").update(instructions).digest("hex")).toBe(
+      V3_INSTRUCTIONS_SHA256,
+    );
+  });
+
+  it("lists a coded column's codes and description under its dataset in v4", () => {
+    const prompt = buildDataAgentSystemPrompt({
+      datasets: CODED_DATASETS,
+      today: "2026-11-12",
+      promptId: "data-agent-v4",
+    });
+
+    expect(prompt).toContain(
+      't0 = "Bronx line list": CaseNo text, GENDER int, onset_dt date\n  - CaseNo: Case number from the county.\n  - GENDER: codes 1=Male, 2=Female, 9=(no label) (missing). Sex recorded on the case report.',
+    );
+  });
+
+  it("leaves code lists out of v3's datasets", () => {
+    const prompt = buildDataAgentSystemPrompt({
+      datasets: CODED_DATASETS,
+      today: "2026-11-12",
+      promptId: "data-agent-v3",
+    });
+
+    expect(prompt).not.toContain("1=Male");
+    expect(prompt).toContain(
+      't0 = "Bronx line list": CaseNo text, GENDER int, onset_dt date\n\nToday',
+    );
+  });
+
+  it("tells v4 to filter on the code and never guess a missing label", () => {
+    const v4 = buildDataAgentSystemPrompt({
+      datasets: DATASETS,
+      today: "2026-11-12",
+      promptId: "data-agent-v4",
+    });
+
+    expect(v4).toContain("CODED COLUMNS");
+    expect(v4).toContain('Filter and group on the code ("GENDER" = 2');
+    expect(v4).toContain("Never guess it.");
+  });
 });
```

- [ ] **Step 2:** `pnpm vitest run shared/agent/dataAgent`. Expected: the v3 freeze test PASSES (it pins today's v3) and the three v4 tests FAIL.
- [ ] **Step 3: Write v4.**

`shared/agent/dataAgent/buildDataAgentSystemPrompt.ts`:

```diff
--- a/shared/agent/dataAgent/buildDataAgentSystemPrompt.ts
+++ b/shared/agent/dataAgent/buildDataAgentSystemPrompt.ts
@@ -1,11 +1,20 @@
 import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
+import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";
 import type { DataAgentPromptId } from "$/agent/dataAgent/dataAgentTools.ts";
 
-/** A dataset as the data agent sees it: names and column types, no rows. */
+/**
+ * A dataset as the data agent sees it: names, column types, and what an
+ * attached dictionary says about a column. Never rows.
+ */
 export type DataAgentDataset = {
   id: string;
   name: string;
-  columns: ReadonlyArray<{ name: string; dataType: string }>;
+  columns: ReadonlyArray<{
+    name: string;
+    dataType: string;
+    /** The column's code list and description, from an attached dictionary. */
+    codes?: ColumnCodes.Context;
+  }>;
 };
 
 const SHORT_TYPE_BY_DATA_TYPE: Record<string, string> = {
@@ -118,15 +127,58 @@
   ATTACHED_AND_MENTIONED_RULES +
   SCHEMA_ANSWER_RULES;
 
+const CODED_COLUMN_RULES = `
+
+CODED COLUMNS
+- A line such as "  - GENDER: codes 1=Male, 2=Female" under a dataset means the column stores codes. Filter and group on the code ("GENDER" = 2, or 'Y' for a text code) and name the label in your summary. Do not call lookup_values for a label listed there.
+- "(no label)" means nobody has recorded what that code means. Never guess it. If the question needs it, say that code has no label yet.
+- A line such as "  - sex: values Male, Female" means the column stores those labels as written.
+- Text after the codes, or alone after the column name, says what the column means.`;
+
+/** v4: v3's rules, plus how to read the code lists listed under DATASETS. */
+const DATA_AGENT_INSTRUCTIONS_V4 =
+  DATA_AGENT_INSTRUCTIONS_V3 + CODED_COLUMN_RULES;
+
 const INSTRUCTIONS_BY_PROMPT_ID: Record<DataAgentPromptId, string> = {
   "data-agent-v1": DATA_AGENT_INSTRUCTIONS_V1,
   "data-agent-v2": DATA_AGENT_INSTRUCTIONS_V2,
   "data-agent-v3": DATA_AGENT_INSTRUCTIONS_V3,
+  "data-agent-v4": DATA_AGENT_INSTRUCTIONS_V4,
 };
 
+/**
+ * Whether a version lists columns' code lists under DATASETS. Versions
+ * before v4 never do, so their prompts stay as they shipped.
+ */
+const LISTS_COLUMN_CODES: Record<DataAgentPromptId, boolean> = {
+  "data-agent-v1": false,
+  "data-agent-v2": false,
+  "data-agent-v3": false,
+  "data-agent-v4": true,
+};
+
+/** `  - GENDER: codes 1=Male, 2=Female. Sex at intake.`, or undefined. */
+function _formatColumnCodesLine(
+  column: DataAgentDataset["columns"][number],
+): string | undefined {
+  const { codes } = column;
+  const pairsText = codes ? ColumnCodes.formatPairs(codes) : "";
+  const description = ColumnCodes.formatDescription(codes?.description);
+  const parts = [
+    ...(pairsText === ""
+      ? []
+      : [`${codes?.direction === "encode" ? "values" : "codes"} ${pairsText}`]),
+    ...(description ? [description] : []),
+  ];
+  return parts.length === 0
+    ? undefined
+    : `  - ${column.name}: ${parts.join(". ")}`;
+}
+
 function _formatDatasetLine(
   alias: string,
   dataset: Readonly<DataAgentDataset>,
+  listsColumnCodes: boolean,
 ): string {
   const columns = dataset.columns
     .map((column) => {
@@ -136,7 +188,12 @@
       return `${column.name} ${shortType}`;
     })
     .join(", ");
-  return `${alias} = "${dataset.name}": ${columns}`;
+  const codeLines = listsColumnCodes
+    ? dataset.columns.flatMap((column) => {
+        return _formatColumnCodesLine(column) ?? [];
+      })
+    : [];
+  return [`${alias} = "${dataset.name}": ${columns}`, ...codeLines].join("\n");
 }
 
 /**
@@ -157,7 +214,13 @@
     const dataset = options.datasets.find((candidate) => {
       return entry.kind === "dataset" && candidate.id === entry.datasetId;
     });
-    return dataset ? _formatDatasetLine(entry.alias, dataset) : "";
+    return dataset
+      ? _formatDatasetLine(
+          entry.alias,
+          dataset,
+          LISTS_COLUMN_CODES[options.promptId],
+        )
+      : "";
   });
   return `${INSTRUCTIONS_BY_PROMPT_ID[options.promptId]}
 
```

`shared/agent/dataAgent/dataAgentTools.ts`:

```diff
--- a/shared/agent/dataAgent/dataAgentTools.ts
+++ b/shared/agent/dataAgent/dataAgentTools.ts
@@ -97,6 +97,7 @@
   "data-agent-v1",
   "data-agent-v2",
   "data-agent-v3",
+  "data-agent-v4",
 ] as const;
 
 /** One served prompt version. */
@@ -106,9 +107,10 @@
  * The version of the data agent's prompt this build uses. Only the prompt is
  * versioned: every version shares the same tools. The browser names it in
  * the proxy URL. v2 adds the current page block. v3 adds the attached
- * and mentioned blocks.
+ * and mentioned blocks. v4 adds the code lists of columns a dictionary is
+ * attached to.
  */
-export const DATA_AGENT_PROMPT_ID: DataAgentPromptId = "data-agent-v3";
+export const DATA_AGENT_PROMPT_ID: DataAgentPromptId = "data-agent-v4";
 
 /** Whether the proxy serves a prompt version. */
 export function isDataAgentPromptId(value: string): value is DataAgentPromptId {
```

- [ ] **Step 4: Follow the URL in the e2e stubs.** In each of the three specs, change `"**/functions/v1/chat/*/agent/data-agent-v3/api/stream"` to `"**/functions/v1/chat/*/agent/data-agent-v4/api/stream"` (one line each).
- [ ] **Step 5:** `pnpm vitest run shared/agent supabase/functions/chat src/lib/agent`. Expected: PASS.
- [ ] **Step 6: Commit** the five files as `feat(data-agent): add prompt v4 with the code lists of bound columns`.

---

### Task 22: The chat function loads column codes

`loadColumnCodes` for the `chat` edge function reads every binding of the workspace with its dictionary, entry, and code list embedded through the binding's foreign keys, with the caller's own client, so row level security hides what the caller cannot see: a binding of a dataset they cannot read, or a dictionary they cannot read (no Data Sources role), never reaches the prompt. It fails soft, like the browser's. The data agent's loader gives each bound column its `codes`, and the legacy schema (the case designer's chat) gives its columns the same, for Task 23's schema block.

**Files:**
- Create: `supabase/functions/chat/utils/loadColumnCodes/loadColumnCodes.ts` (+ test)
- Modify: `supabase/functions/chat/PostAgentStream/loadDataAgentDatasets.ts` (+ new test)
- Modify: `supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts` (+ test)

- [ ] **Step 1: Write the failing tests.**

`supabase/functions/chat/utils/loadColumnCodes/loadColumnCodes.test.ts`:

```ts
import { loadColumnCodes } from "@sbfn/chat/utils/loadColumnCodes/loadColumnCodes.ts";
import { describe, expect, it } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/** A client whose bindings query answers `rows`, or fails. */
function _createClient(
  answer: { rows: unknown[] } | { error: Error },
): AvaSupabaseClient {
  const chain = {
    select: () => {
      return chain;
    },
    eq: () => {
      return chain;
    },
    throwOnError: async () => {
      if ("error" in answer) {
        throw answer.error;
      }
      return { data: answer.rows };
    },
  };
  return {
    from: () => {
      return chain;
    },
  } as unknown as AvaSupabaseClient;
}

const BOUND_ROW = {
  dataset_column_id: "col-gender",
  mode: "reference",
  direction: "decode",
  dictionary: { id: "dict-1", name: "NYS codes" },
  entry: { id: "entry-sex", name: "sex", description: null },
  code_list: {
    id: "list-sex",
    name: "Sex (1/2/9)",
    is_ordered: false,
    pairs: [
      { code: "2", label: "Female", accepted_spellings: [], is_missing: false },
    ],
  },
};

describe("loadColumnCodes", () => {
  it("reads each bound column's stored pairs", async () => {
    const codes = await loadColumnCodes({
      supabaseClient: _createClient({ rows: [BOUND_ROW] }),
      workspaceId: "workspace-1",
    });

    expect(codes.get("col-gender")?.pairs).toEqual([
      { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
    ]);
  });

  it("leaves out a column whose dictionary the reader cannot see", async () => {
    const codes = await loadColumnCodes({
      supabaseClient: _createClient({
        rows: [
          { ...BOUND_ROW, dictionary: null, entry: null, code_list: null },
        ],
      }),
      workspaceId: "workspace-1",
    });

    expect(codes.size).toBe(0);
  });

  it("gives no codes when the bindings cannot be read", async () => {
    const codes = await loadColumnCodes({
      supabaseClient: _createClient({ error: new Error("relation missing") }),
      workspaceId: "workspace-1",
    });

    expect(codes.size).toBe(0);
  });
});
```

`supabase/functions/chat/PostAgentStream/loadDataAgentDatasets.test.ts`:

```ts
import { loadDataAgentDatasets } from "@sbfn/chat/PostAgentStream/loadDataAgentDatasets.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

const { loadColumnCodesMock } = vi.hoisted(() => {
  return { loadColumnCodesMock: vi.fn() };
});

vi.mock("@sbfn/chat/utils/loadColumnCodes/loadColumnCodes.ts", () => {
  return { loadColumnCodes: loadColumnCodesMock };
});

/** A client that answers each table's query with its rows. */
function _createClient(
  rowsByTable: Record<string, unknown[]>,
): AvaSupabaseClient {
  return {
    from: (table: string) => {
      const chain = {
        select: () => {
          return chain;
        },
        eq: () => {
          return chain;
        },
        order: () => {
          return chain;
        },
        throwOnError: async () => {
          return { data: rowsByTable[table] ?? [] };
        },
      };
      return chain;
    },
  } as unknown as AvaSupabaseClient;
}

const DATASET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(() => {
  loadColumnCodesMock.mockResolvedValue(new Map());
});

describe("loadDataAgentDatasets", () => {
  it("gives a bound column its code list and description", async () => {
    loadColumnCodesMock.mockResolvedValue(
      new Map([
        [
          "col-gender",
          {
            direction: "decode",
            pairs: [
              {
                code: "2",
                label: "Female",
                acceptedSpellings: [],
                isMissing: false,
              },
            ],
            description: "Sex on the report.",
          },
        ],
      ]),
    );

    const datasets = await loadDataAgentDatasets({
      supabaseClient: _createClient({
        datasets: [{ id: DATASET_ID, name: "Line list" }],
        dataset_columns: [
          {
            id: "col-gender",
            dataset_id: DATASET_ID,
            name: "GENDER",
            data_type: "bigint",
          },
          {
            id: "col-county",
            dataset_id: DATASET_ID,
            name: "county",
            data_type: "varchar",
          },
        ],
      }),
      workspaceId: "workspace-1",
    });

    expect(datasets[0]?.columns).toEqual([
      {
        name: "GENDER",
        dataType: "bigint",
        codes: {
          direction: "decode",
          pairs: [
            {
              code: "2",
              label: "Female",
              acceptedSpellings: [],
              isMissing: false,
            },
          ],
          description: "Sex on the report.",
        },
      },
      { name: "county", dataType: "varchar" },
    ]);
  });
});
```

`supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.test.ts`:

```diff
--- a/supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.test.ts
+++ b/supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.test.ts
@@ -3,9 +3,21 @@
  * datasets, and must not pull attribute values.
  */
 import { fetchWorkspaceSchema } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";
-import { describe, expect, it } from "vitest";
+import { beforeEach, describe, expect, it, vi } from "vitest";
 import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
 
+const { loadColumnCodesMock } = vi.hoisted(() => {
+  return { loadColumnCodesMock: vi.fn() };
+});
+
+vi.mock("@sbfn/chat/utils/loadColumnCodes/loadColumnCodes.ts", () => {
+  return { loadColumnCodes: loadColumnCodesMock };
+});
+
+beforeEach(() => {
+  loadColumnCodesMock.mockResolvedValue(new Map());
+});
+
 function createFakeClient(rowsByTable: Record<string, unknown[]>): {
   supabaseClient: AvaSupabaseClient;
   queriedTables: string[];
@@ -86,6 +98,36 @@
     ]);
   });
 
+  it("gives a bound column its code list", async () => {
+    const datasetId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
+    const codes = {
+      direction: "decode",
+      pairs: [
+        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
+      ],
+    };
+    loadColumnCodesMock.mockResolvedValue(new Map([["col-gender", codes]]));
+    const fake = createFakeClient({
+      datasets: [{ id: datasetId, name: "Line list" }],
+      dataset_columns: [
+        {
+          id: "col-gender",
+          dataset_id: datasetId,
+          name: "GENDER",
+          data_type: "bigint",
+        },
+      ],
+      concepts: [],
+    });
+
+    const schema = await fetchWorkspaceSchema({
+      supabaseClient: fake.supabaseClient,
+      workspaceId: WORKSPACE_ID,
+    });
+
+    expect(schema.columns[0]?.codes).toEqual(codes);
+  });
+
   it("does not query concept attributes or statuses when the workspace has no concepts", async () => {
     const fake = createFakeClient({
       datasets: [
```

- [ ] **Step 2:** `pnpm vitest run supabase/functions/chat`. Expected: FAIL.
- [ ] **Step 3: Write the loader and use it.** The embedded select is typed by the generated database types, so no cast is needed:

`supabase/functions/chat/utils/loadColumnCodes/loadColumnCodes.ts`:

```ts
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/**
 * Each binding with the dictionary, entry, and code list it names, embedded
 * through the binding's foreign keys. Row level security applies to every
 * embedded table, so a reader who cannot see a dictionary gets null.
 */
const BINDING_SELECT =
  "dataset_column_id, mode, direction, dictionary:data_dictionaries(id, name), entry:data_dictionaries__entries(id, name, description), code_list:data_dictionaries__code_lists(id, name, is_ordered, pairs)";

async function _readColumnCodes(
  options: Readonly<{ supabaseClient: AvaSupabaseClient; workspaceId: string }>,
): Promise<Map<string, ColumnCodes.T>> {
  const { data } = await options.supabaseClient
    .from("dataset_columns__dictionary_bindings")
    .select(BINDING_SELECT)
    .eq("workspace_id", options.workspaceId)
    .throwOnError();
  const rows = data ?? [];
  return ColumnCodes.fromRows({
    bindings: rows.map((row) => {
      return {
        datasetColumnId: row.dataset_column_id,
        dictionaryId: row.dictionary?.id,
        entryId: row.entry?.id,
        codeListId: row.code_list?.id,
        mode: row.mode,
        direction: row.direction,
      };
    }),
    dictionaries: rows.flatMap((row) => {
      return row.dictionary ? [row.dictionary] : [];
    }),
    entries: rows.flatMap((row) => {
      return row.entry
        ? [{ ...row.entry, description: row.entry.description ?? undefined }]
        : [];
    }),
    codeLists: rows.flatMap((row) => {
      return row.code_list
        ? [
            {
              id: row.code_list.id,
              name: row.code_list.name,
              isOrdered: row.code_list.is_ordered,
              pairs: ColumnCodes.fromStoredPairs(row.code_list.pairs),
            },
          ]
        : [];
    }),
  });
}

/**
 * What every attached dictionary says about the workspace's bound columns,
 * by dataset column id, read with the caller's own permissions. Used where
 * the `chat` function tells a model about datasets, for example the data
 * agent's prompt. Codes only add context, so a failed read logs and returns
 * none rather than failing the request.
 */
export async function loadColumnCodes(
  options: Readonly<{ supabaseClient: AvaSupabaseClient; workspaceId: string }>,
): Promise<Map<string, ColumnCodes.T>> {
  try {
    return await _readColumnCodes(options);
  } catch (error) {
    console.error("Could not read column code lists", error);
    return new Map();
  }
}
```

`supabase/functions/chat/PostAgentStream/loadDataAgentDatasets.ts`:

```diff
--- a/supabase/functions/chat/PostAgentStream/loadDataAgentDatasets.ts
+++ b/supabase/functions/chat/PostAgentStream/loadDataAgentDatasets.ts
@@ -1,10 +1,30 @@
+import { loadColumnCodes } from "@sbfn/chat/utils/loadColumnCodes/loadColumnCodes.ts";
+import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";
 import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt.ts";
 import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
 
-type ColumnRow = { dataset_id: string; name: string; data_type: string };
+type ColumnRow = {
+  id: string;
+  dataset_id: string;
+  name: string;
+  data_type: string;
+};
 
+function _toAgentColumn(
+  column: Readonly<ColumnRow>,
+  codesByColumnId: ReadonlyMap<string, ColumnCodes.T>,
+): DataAgentDataset["columns"][number] {
+  const codes = codesByColumnId.get(column.id);
+  return {
+    name: column.name,
+    dataType: column.data_type,
+    ...(codes ? { codes: ColumnCodes.toContext(codes) } : {}),
+  };
+}
+
 /**
- * The workspace's datasets and columns for the data agent's prompt, read
+ * The workspace's datasets and columns for the data agent's prompt, with the
+ * code list and description of each column a dictionary is attached to, read
  * with the caller's own permissions. Columns come in their dataset's order
  * (`column_idx`), so the prompt is the same on every request and stays in
  * the provider's cache.
@@ -20,12 +40,15 @@
   if (!datasets || datasets.length === 0) {
     return [];
   }
-  const { data: columns } = await options.supabaseClient
-    .from("dataset_columns")
-    .select("dataset_id, name, data_type")
-    .eq("workspace_id", options.workspaceId)
-    .order("column_idx")
-    .throwOnError();
+  const [{ data: columns }, codesByColumnId] = await Promise.all([
+    options.supabaseClient
+      .from("dataset_columns")
+      .select("id, dataset_id, name, data_type")
+      .eq("workspace_id", options.workspaceId)
+      .order("column_idx")
+      .throwOnError(),
+    loadColumnCodes(options),
+  ]);
   const rows = (columns ?? []) as ColumnRow[];
   return datasets.map((dataset: { id: string; name: string }) => {
     return {
@@ -36,7 +59,7 @@
           return column.dataset_id === dataset.id;
         })
         .map((column) => {
-          return { name: column.name, dataType: column.data_type };
+          return _toAgentColumn(column, codesByColumnId);
         }),
     };
   });
```

`supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts`:

```diff
--- a/supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts
+++ b/supabase/functions/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts
@@ -1,3 +1,5 @@
+import { loadColumnCodes } from "@sbfn/chat/utils/loadColumnCodes/loadColumnCodes.ts";
+import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";
 import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
 
 export type Dataset = { id: string; name: string; description?: string | null };
@@ -6,6 +8,8 @@
   dataset_id: string;
   name: string;
   data_type: string;
+  /** The column's code list, when a dictionary is attached to it. */
+  codes?: ColumnCodes.Context;
 };
 export type Concept = {
   id: string;
@@ -52,19 +56,30 @@
     return { datasets: [], columns: [] };
   }
 
-  const { data: columns } = await options.supabaseClient
-    .from("dataset_columns")
-    .select("id, dataset_id, name, data_type")
-    .eq("workspace_id", options.workspaceId)
-    .in(
-      "dataset_id",
-      datasets.map((dataset: Dataset) => {
-        return dataset.id;
-      }),
-    )
-    .throwOnError();
+  const [{ data: columns }, codesByColumnId] = await Promise.all([
+    options.supabaseClient
+      .from("dataset_columns")
+      .select("id, dataset_id, name, data_type")
+      .eq("workspace_id", options.workspaceId)
+      .in(
+        "dataset_id",
+        datasets.map((dataset: Dataset) => {
+          return dataset.id;
+        }),
+      )
+      .throwOnError(),
+    loadColumnCodes(options),
+  ]);
 
-  return { datasets: datasets ?? [], columns: columns ?? [] };
+  return {
+    datasets: datasets ?? [],
+    columns: (columns ?? []).map((column: DatasetColumn) => {
+      const codes = column.id ? codesByColumnId.get(column.id) : undefined;
+      return codes
+        ? { ...column, codes: ColumnCodes.toContext(codes) }
+        : column;
+    }),
+  };
 }
 
 async function _fetchConcepts(options: {
```

- [ ] **Step 4:** `pnpm vitest run supabase/functions/chat`. Expected: PASS.
- [ ] **Step 5: Check that the function still boots.** Every module the `chat` function now pulls in through `shared/` must resolve under its own import map (a missing `uuid` entry once stopped it from booting):

```bash
deno info --config supabase/functions/chat/deno.json supabase/functions/chat/index.ts 2>&1 \
  | grep -iE "error|not found|unable to" ; echo "exit: $?"
pnpm type-check:deno
```

  Expected: the `grep` prints nothing (`exit: 1`), and `type-check:deno` is clean. `ColumnCodes` imports only types, and the module graph was resolved with this config while planning.
- [ ] **Step 6: Commit** the five files as `feat(data-agent): load column code lists in the chat function`.

---

### Task 23: Code lists in the legacy schema block and the offline pipeline

The legacy schema block (the case designer's online chat, and the offline multi-pass pipeline outside the Data Explorer) names a coded column `GENDER [1=Male, 2=Female, 9=Unknown (missing)]`, as spec section 10 says, and a column of labels `sex [values Male, Female]`. The list is part of the column's name in the block, so `truncateSchemaForOffline` keeps it whole whenever it keeps the column. The offline pipeline's schema loads the codes with Task 7's `loadColumnCodes`.

**Files:**
- Modify: `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts` (+ test)
- Modify: `shared/types/offlineChat.types.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts` (+ test)
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline.test.ts`

- [ ] **Step 1: Write the failing tests.**

`shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts`:

```diff
--- a/shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts
+++ b/shared/models/chat/SqlTableAlias/SqlTableAlias.test.ts
@@ -112,6 +112,42 @@
 
     expect(block).toContain("- t0: Cholera cases (case_id, onset_date)");
     expect(block).not.toContain(DATASET_B.id);
+  });
+
+  it("lists a coded column's codes beside its name", () => {
+    const aliases = SqlTableAlias.fromDatasets([DATASET_B]);
+    const block = SqlTableAlias.formatSchemaBlock({
+      aliases,
+      columns: [
+        {
+          dataset_id: DATASET_B.id,
+          name: "GENDER",
+          data_type: "bigint",
+          codes: {
+            direction: "decode",
+            pairs: [
+              {
+                code: "1",
+                label: "Male",
+                acceptedSpellings: [],
+                isMissing: false,
+              },
+              {
+                code: "2",
+                label: "Female",
+                acceptedSpellings: [],
+                isMissing: false,
+              },
+            ],
+          },
+        },
+        { dataset_id: DATASET_B.id, name: "county", data_type: "varchar" },
+      ],
+    });
+
+    expect(block).toContain(
+      "- t0: Cholera cases (GENDER [1=Male, 2=Female], county)",
+    );
   });
 
   it("lists concept attribute names without concept UUIDs", () => {
```

`src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.test.ts`:

```diff
--- a/src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.test.ts
+++ b/src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.test.ts
@@ -15,12 +15,14 @@
   conceptGetAllMock,
   conceptAttributeGetAllMock,
   conceptStatusGetAllMock,
+  loadColumnCodesMock,
 } = vi.hoisted(() => {
   return {
     datasetsWithColumnsMock: vi.fn(),
     conceptGetAllMock: vi.fn(),
     conceptAttributeGetAllMock: vi.fn(),
     conceptStatusGetAllMock: vi.fn(),
+    loadColumnCodesMock: vi.fn(),
   };
 });
 
@@ -29,6 +31,9 @@
     DatasetClient: { getAllDatasetsWithColumns: datasetsWithColumnsMock },
   };
 });
+vi.mock("@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes", () => {
+  return { loadColumnCodes: loadColumnCodesMock };
+});
 vi.mock("@/clients/ontology/ConceptClient", () => {
   return { ConceptClient: { getAll: conceptGetAllMock } };
 });
@@ -43,6 +48,7 @@
   vi.clearAllMocks();
   window.sessionStorage.clear();
   datasetsWithColumnsMock.mockResolvedValue([]);
+  loadColumnCodesMock.mockResolvedValue(new Map());
   conceptGetAllMock.mockResolvedValue([{ id: CONCEPT_ID, name: "Case" }]);
   conceptAttributeGetAllMock.mockResolvedValue([]);
   conceptStatusGetAllMock.mockResolvedValue([
@@ -52,6 +58,30 @@
 });
 
 describe("fetchOfflineChatSchema", () => {
+  it("carries a bound column's code list into the offline schema", async () => {
+    datasetsWithColumnsMock.mockResolvedValue([
+      {
+        id: "dataset-1",
+        name: "line list",
+        columns: [{ id: "col-gender", name: "GENDER", dataType: "bigint" }],
+      },
+    ]);
+    const codes = {
+      direction: "decode",
+      pairs: [
+        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
+      ],
+    };
+    loadColumnCodesMock.mockResolvedValue(new Map([["col-gender", codes]]));
+
+    const schema = await fetchOfflineChatSchema({
+      workspace: { id: WORKSPACE_ID } as Workspace.T,
+      navigatorOnLine: true,
+    });
+
+    expect(schema.columns[0]?.codes).toEqual(codes);
+  });
+
   it("carries each case type's statuses into the offline schema", async () => {
     const schema = await fetchOfflineChatSchema({
       workspace: { id: WORKSPACE_ID } as Workspace.T,
```

`src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline.test.ts`:

```diff
--- a/src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline.test.ts
+++ b/src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline.test.ts
@@ -3,6 +3,32 @@
 import { truncateSchemaForOffline } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline";
 
 describe("truncateSchemaForOffline", () => {
+  it("keeps a kept column's code list whole", () => {
+    const pairs = Array.from({ length: 40 }, (_, index) => {
+      return {
+        code: String(index),
+        label: `Label ${index}`,
+        acceptedSpellings: [],
+        isMissing: false,
+      };
+    });
+    const schema = {
+      datasets: [{ id: "id-cases", name: "cases.csv" }],
+      columns: [
+        {
+          dataset_id: "id-cases",
+          name: "race_cd",
+          data_type: "bigint",
+          codes: { direction: "decode" as const, pairs },
+        },
+      ],
+    };
+
+    const truncated = truncateSchemaForOffline(schema);
+
+    expect(truncated.columns[0]?.codes?.pairs).toHaveLength(40);
+  });
+
   it("keeps dataset labels when there are no columns yet", () => {
     const schema = {
       datasets: [
```

- [ ] **Step 2:** `pnpm vitest run shared/models/chat src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn`. Expected: the new schema block and fetch tests FAIL (the truncation test passes already, and stays as a guard).
- [ ] **Step 3: Write the block and load the codes.**

`shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts`:

```diff
--- a/shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts
+++ b/shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts
@@ -1,4 +1,5 @@
 import { makeBucketMap } from "@avandar/utils";
+import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";
 import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";
 import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
 import { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
@@ -25,6 +26,8 @@
   dataset_id: string;
   name: string;
   data_type: string;
+  /** The column's code list, when a dictionary is attached to it. */
+  codes?: ColumnCodes.Context;
 };
 
 function _sortNamedRelations<T extends { id: string }>(
@@ -112,6 +115,22 @@
     return `- ${entry.alias}: ${entry.name}`;
   }
   return `- ${entry.alias}: ${entry.name} (${names.join(", ")})`;
+}
+
+/**
+ * A dataset column as the schema block names it: `GENDER [1=Male,
+ * 2=Female]` for a column holding codes, `sex [values Male, Female]` for
+ * one holding labels, and the bare name otherwise. The list stays whole
+ * however the block is cut, because it is part of the column's name.
+ */
+function _formatColumnName(column: Readonly<SchemaColumn>): string {
+  const pairsText = column.codes ? ColumnCodes.formatPairs(column.codes) : "";
+  if (pairsText === "") {
+    return column.name;
+  }
+  return column.codes?.direction === "encode"
+    ? `${column.name} [values ${pairsText}]`
+    : `${column.name} [${pairsText}]`;
 }
 
 /**
@@ -232,10 +251,15 @@
     conceptStatuses?: readonly SqlTableAliasConceptStatus[];
   }>,
 ): string {
-  const namesByDatasetId = makeBucketMap(args.columns, {
-    key: "dataset_id",
-    valueKey: "name",
-  });
+  const namesByDatasetId = makeBucketMap(
+    args.columns.map((column) => {
+      return {
+        dataset_id: column.dataset_id,
+        label: _formatColumnName(column),
+      };
+    }),
+    { key: "dataset_id", valueKey: "label" },
+  );
   const namesByConceptId = _formatConceptAttributeNames(
     args.conceptAttributes ?? [],
   );
```

`shared/types/offlineChat.types.ts`:

```diff
--- a/shared/types/offlineChat.types.ts
+++ b/shared/types/offlineChat.types.ts
@@ -1,5 +1,6 @@
 import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
 import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
+import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";
 import type { ChatClarifyRequest } from "$/types/chat.types.ts";
 
 /** Compact schema slice sent to offline prompts. */
@@ -12,6 +13,8 @@
   dataset_id: string;
   name: string;
   data_type: string;
+  /** The column's code list. Absent without a dictionary or in an old cache. */
+  codes?: ColumnCodes.Context;
 };
 
 export type OfflineChatSchemaConcept = {
```

`src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts`:

```diff
--- a/src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts
+++ b/src/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema.ts
@@ -1,10 +1,12 @@
 import { where } from "@avandar/utils";
+import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
 import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
 import { ConceptClient } from "@/clients/ontology/ConceptClient";
 import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
 import { OfflineChatSchemaCache } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/OfflineChatSchemaCache";
 import { truncateSchemaForOffline } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline";
+import { loadColumnCodes } from "@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes";
 import type { Dataset } from "$/models/datasets/Dataset/Dataset";
 import type { Concept } from "$/models/ontology/Concept/Concept";
 import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
@@ -22,16 +24,19 @@
 
 function _mapDatasets(
   rows: readonly Dataset.WithColumns[],
+  codesByColumnId: ReadonlyMap<string, ColumnCodes.T>,
 ): Pick<OfflineChatSchema, "datasets" | "columns"> {
   const datasets = rows.map((row) => {
     return { id: row.id, name: row.name };
   });
   const columns = rows.flatMap((row) => {
     return row.columns.map((column) => {
+      const codes = codesByColumnId.get(column.id);
       return {
         dataset_id: row.id,
         name: column.name,
         data_type: column.dataType,
+        ...(codes ? { codes: ColumnCodes.toContext(codes) } : {}),
       };
     });
   });
@@ -101,18 +106,19 @@
 
   if (args.navigatorOnLine) {
     try {
-      const [datasetRows, concepts] = await Promise.all([
+      const [datasetRows, concepts, codesByColumnId] = await Promise.all([
         DatasetClient.getAllDatasetsWithColumns(
           where("workspace_id", "eq", args.workspace.id),
         ),
         ConceptClient.getAll(where("workspace_id", "eq", args.workspace.id)),
+        loadColumnCodes(args.workspace.id),
       ]);
       const conceptDetails =
         concepts.length === 0
           ? { attributes: [], statuses: [] }
           : await _fetchConceptDetails(args.workspace.id);
       const schema: OfflineChatSchema = {
-        ..._mapDatasets(datasetRows),
+        ..._mapDatasets(datasetRows, codesByColumnId),
         ..._mapConcepts({ concepts, ...conceptDetails }),
       };
       OfflineChatSchemaCache.write(args.workspace.id, schema);
```

- [ ] **Step 4:** Run the same command, then `pnpm vitest run supabase/functions/chat`. Expected: PASS (the edge prompt builder `buildSqlSystemPrompt` reads the same block).
- [ ] **Step 5: Commit** the paths above as `feat(data-agent): name coded columns with their codes in the schema block`.

---

### Task 24: Code lists in the browser's data agent datasets

The browser loads the data agent's datasets for its alias rewriting, for the offline agent, and for the tab's session cache that lets the offline agent answer after the connection drops. Each bound column now carries its `codes`, so the cache keeps them too.

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts` (+ test)

- [ ] **Step 1: Write the failing test.**

`src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.test.ts`:

```diff
--- a/src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.test.ts
+++ b/src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.test.ts
@@ -1,5 +1,5 @@
 import { Model } from "@avandar/models";
-import { afterEach, describe, expect, it, vi } from "vitest";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
 import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
 import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
@@ -15,6 +15,14 @@
   DataAgentTurnOptions,
 } from "./dataAgentConversation.types";
 
+const { loadColumnCodesMock } = vi.hoisted(() => {
+  return { loadColumnCodesMock: vi.fn() };
+});
+
+vi.mock("@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes", () => {
+  return { loadColumnCodes: loadColumnCodesMock };
+});
+
 vi.mock(
   "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome",
   () => {
@@ -149,11 +157,54 @@
     columns: [{ name: "cases", dataType: "bigint" }],
   };
 
+  beforeEach(() => {
+    loadColumnCodesMock.mockResolvedValue(new Map());
+  });
+
   afterEach(() => {
     vi.restoreAllMocks();
     window.sessionStorage.clear();
   });
 
+  it("gives a column the code list a dictionary attaches to it", async () => {
+    vi.spyOn(DatasetClient, "getAllDatasetsWithColumns").mockResolvedValue([
+      {
+        id: "dataset-1",
+        name: "line list",
+        columns: [{ id: "col-gender", name: "GENDER", dataType: "bigint" }],
+      },
+    ] as never);
+    loadColumnCodesMock.mockResolvedValue(
+      new Map([
+        [
+          "col-gender",
+          {
+            direction: "decode",
+            pairs: [
+              {
+                code: "2",
+                label: "Female",
+                acceptedSpellings: [],
+                isMissing: false,
+              },
+            ],
+            description: "Sex on the report.",
+          },
+        ],
+      ]),
+    );
+
+    const datasets = await loadDataAgentDatasets(WORKSPACE_ID);
+
+    expect(datasets[0]?.columns[0]?.codes).toEqual({
+      direction: "decode",
+      pairs: [
+        { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
+      ],
+      description: "Sex on the report.",
+    });
+  });
+
   it("keeps what it loads online for later", async () => {
     vi.spyOn(DatasetClient, "getAllDatasetsWithColumns").mockResolvedValue([
       DATASET,
```

- [ ] **Step 2:** `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers`. Expected: FAIL.
- [ ] **Step 3: Load the codes with the datasets.**

`src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts`:

```diff
--- a/src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts
+++ b/src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts
@@ -1,6 +1,7 @@
 import { where } from "@avandar/utils";
 import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
 import { buildAgentTurnText } from "$/agent/pageContext/buildAgentTurnText";
+import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
 import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
 import { buildLocalGadgetName } from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/loadTurnGadgetContext";
@@ -11,6 +12,7 @@
   waitForAppliedSqlOutcome,
 } from "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome";
 import { AvaQueryClient } from "@/config/AvaQueryClient";
+import { loadColumnCodes } from "@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes";
 import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
 import type { AgentContextBlocks } from "$/agent/mentions/buildAgentContextBlocks";
 import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
@@ -140,15 +142,23 @@
 async function _fetchDataAgentDatasets(
   workspaceId: Workspace.Id,
 ): Promise<DataAgentDataset[]> {
-  const datasets = await DatasetClient.getAllDatasetsWithColumns(
-    where("workspace_id", "eq", workspaceId),
-  );
+  const [datasets, codesByColumnId] = await Promise.all([
+    DatasetClient.getAllDatasetsWithColumns(
+      where("workspace_id", "eq", workspaceId),
+    ),
+    loadColumnCodes(workspaceId),
+  ]);
   return datasets.map((dataset) => {
     return {
       id: dataset.id,
       name: dataset.name,
       columns: dataset.columns.map((column) => {
-        return { name: column.name, dataType: String(column.dataType) };
+        const codes = codesByColumnId.get(column.id);
+        return {
+          name: column.name,
+          dataType: String(column.dataType),
+          ...(codes ? { codes: ColumnCodes.toContext(codes) } : {}),
+        };
       }),
     };
   });
```

- [ ] **Step 4:** `pnpm vitest run src/components/ChatPanel`. Expected: PASS.
- [ ] **Step 5: Commit** both files as `feat(data-agent): give the browser's agent the code lists of bound columns`.

---

### Task 25: The offline data agent reads code lists

A small model on the device needs the codes written out: a decoded column's profile line becomes `GENDER bigint, codes: 1 = "Male", 2 = "Female", 9 = (no label) (missing value)` (text codes quoted, so the model copies the quotes), replacing its stored values. `findQuestionValues` also matches the question's words against labels and accepted spellings, from the code lists alone, with no query, so "female" adds `- "female" is code 2 in t0."GENDER" (2 = Female).` to VALUES IN THE QUESTION. Entry descriptions stay out of the offline prompt (spec section 10: Pi data agent only).

**Files:**
- Modify: `src/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets.ts`
- Modify: `src/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt.ts`
- Modify: `src/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues.ts`
- Modify: `src/lib/agent/dataAgent/offline/offlineDataAgent.test.ts`

- [ ] **Step 1: Write the failing tests.**

`src/lib/agent/dataAgent/offline/offlineDataAgent.test.ts`:

```diff
--- a/src/lib/agent/dataAgent/offline/offlineDataAgent.test.ts
+++ b/src/lib/agent/dataAgent/offline/offlineDataAgent.test.ts
@@ -31,6 +31,32 @@
   columns: [{ name: "country", dataType: "varchar" }],
 };
 
+/** A line list whose GENDER column has a code list attached. */
+const LINE_LIST = {
+  id: "cccccccc-3333-4333-8333-cccccccccccc",
+  name: "line list",
+  columns: [
+    {
+      name: "GENDER",
+      dataType: "bigint",
+      codes: {
+        direction: "decode" as const,
+        pairs: [
+          { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
+          {
+            code: "2",
+            label: "Female",
+            acceptedSpellings: ["F"],
+            isMissing: false,
+          },
+          { code: "9", label: "", acceptedSpellings: [], isMissing: true },
+        ],
+      },
+    },
+    { name: "hosp_yn", dataType: "varchar" },
+  ],
+};
+
 /** Answers the profile and lookup queries the offline agent sends. */
 function _createHost(overrides: Partial<DataAgentHost> = {}): DataAgentHost {
   return {
@@ -126,9 +152,75 @@
         return match.storedValue;
       }),
     ).toEqual(["New York"]);
+  });
+});
+
+describe("findQuestionValues with code lists", () => {
+  it("finds a label in a code list and gives the code to filter on", async () => {
+    const host = _createHost({
+      readColumnValues: vi.fn(async (sql: string) => {
+        return sql.includes("concat_ws") ? ["24|2"] : [];
+      }),
+    });
+    const profiles = await profileOfflineDatasets(host, [LINE_LIST]);
+
+    const matches = await findQuestionValues(host, {
+      datasets: [LINE_LIST],
+      profiles,
+      question: "How many female cases were hospitalized?",
+    });
+
+    expect(matches).toContainEqual({
+      term: "female",
+      datasetId: LINE_LIST.id,
+      column: "GENDER",
+      storedValue: "2",
+      codeLabel: "Female",
+    });
   });
 });
 
+describe("offline prompt with code lists", () => {
+  it("lists a coded column's codes and marks a code with no label", async () => {
+    const host = _createHost({
+      readColumnValues: vi.fn(async (sql: string) => {
+        return sql.includes("concat_ws") ? ["24|2"] : ["Y", "N"];
+      }),
+    });
+    const profiles = await profileOfflineDatasets(host, [LINE_LIST]);
+
+    const prompt = buildOfflineDataAgentSystemPrompt({
+      datasets: [LINE_LIST],
+      profiles,
+      today: "2026-11-12",
+    });
+
+    expect(prompt).toContain(
+      '- GENDER bigint, codes: 1 = "Male", 2 = "Female", 9 = (no label) (missing value)',
+    );
+  });
+
+  it("tells the model the code a label in the question stands for", () => {
+    const message = buildOfflineQuestionMessage({
+      question: "How many female cases?",
+      matches: [
+        {
+          term: "female",
+          datasetId: LINE_LIST.id,
+          column: "GENDER",
+          storedValue: "2",
+          codeLabel: "Female",
+        },
+      ],
+      datasets: [LINE_LIST],
+    });
+
+    expect(message).toContain(
+      '- "female" is code 2 in t0."GENDER" (2 = Female).',
+    );
+  });
+});
+
 describe("offline prompt", () => {
   it("lists profiled values and flags a name stored in two kinds of column", async () => {
     const host = _createHost();
```

- [ ] **Step 2:** `pnpm vitest run src/lib/agent/dataAgent/offline`. Expected: the three new tests FAIL.
- [ ] **Step 3: Profile, write, and find the codes.**

`src/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets.ts`:

```diff
--- a/src/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets.ts
+++ b/src/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets.ts
@@ -1,5 +1,6 @@
 import { quoteSqlIdentifier } from "@avandar/utils/sql";
 import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
+import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
 
 /** A text column holding this many values or fewer is listed in full. */
@@ -18,6 +19,8 @@
   values?: string[];
   /** First and last value, for date columns. */
   range?: { min: string; max: string };
+  /** The code list of a column a dictionary is attached to. */
+  codes?: ColumnCodes.Context;
 };
 
 /** What an offline model is told about one dataset. */
@@ -37,6 +40,16 @@
 }
 
 /**
+ * True for a column holding codes its code list explains. Its list is shown
+ * instead of its stored values.
+ */
+export function hasListedCodes(
+  column: Readonly<{ codes?: ColumnCodes.Context }>,
+): boolean {
+  return column.codes?.direction === "decode" && column.codes.pairs.length > 0;
+}
+
+/**
  * One query for a dataset's row count, text columns' distinct counts, and
  * date columns' ranges, joined into one `|`-separated text value so it fits
  * the host's one-column reader.
@@ -76,6 +89,7 @@
     const profile: OfflineColumnProfile = {
       name: column.name,
       dataType: column.dataType,
+      ...(column.codes ? { codes: column.codes } : {}),
     };
     if (isTextColumn(column)) {
       profile.distinctCount = Number(fields[index++] ?? 0);
@@ -104,7 +118,8 @@
     // copy them into filters. The question's own values are looked up.
     if (
       column.distinctCount === undefined ||
-      column.distinctCount > MAX_FULLY_LISTED_VALUES
+      column.distinctCount > MAX_FULLY_LISTED_VALUES ||
+      hasListedCodes(column)
     ) {
       continue;
     }
```

`src/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt.ts`:

```diff
--- a/src/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt.ts
+++ b/src/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt.ts
@@ -1,5 +1,10 @@
 import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
+import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import { OFFLINE_PLAN_INSTRUCTIONS } from "@/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/offlinePlanInstructions";
+import {
+  hasListedCodes,
+  isTextColumn,
+} from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";
 import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
 import type { QuestionValueMatch } from "@/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues";
 import type {
@@ -56,8 +61,30 @@
     .join(", ");
 }
 
+/**
+ * A coded column's list for a small model, written out in full: `1 =
+ * "Male", 2 = "Female", 9 = "Unknown" (missing value)`. Text codes are
+ * quoted, so the model copies the quotes into its filter.
+ */
+function _formatCodes(column: Readonly<OfflineColumnProfile>): string {
+  const pairs = column.codes?.pairs ?? [];
+  const shown = pairs.slice(0, ColumnCodes.MAX_PROMPT_PAIRS).map((pair) => {
+    const code = isTextColumn(column) ? `"${pair.code}"` : pair.code;
+    const label = pair.label.trim();
+    const meaning = label === "" ? "(no label)" : `"${label}"`;
+    return `${code} = ${meaning}${pair.isMissing ? " (missing value)" : ""}`;
+  });
+  const hiddenCount = pairs.length - shown.length;
+  return hiddenCount > 0
+    ? `${shown.join(", ")}, and ${hiddenCount} more`
+    : shown.join(", ");
+}
+
 function _formatColumn(column: Readonly<OfflineColumnProfile>): string {
   const type = column.dataType.toLowerCase();
+  if (hasListedCodes(column)) {
+    return `${column.name} ${type}, codes: ${_formatCodes(column)}`;
+  }
   if (column.range) {
     return `${column.name} ${type}, ${column.range.min} to ${column.range.max}`;
   }
@@ -126,7 +153,48 @@
   });
 }
 
-/** Lists matched values and flags names that mean different things. */
+/** One line per stored value the question names, with any ambiguity. */
+function _formatStoredValueLines(
+  matches: readonly QuestionValueMatch[],
+  aliasOf: (datasetId: string) => string,
+): string[] {
+  const values = [
+    ...new Set(
+      matches.map((match) => {
+        return match.storedValue;
+      }),
+    ),
+  ];
+  return values.map((value) => {
+    const places = matches.filter((match) => {
+      return match.storedValue === value;
+    });
+    const where = places
+      .map((match) => {
+        return `${aliasOf(match.datasetId)}."${match.column}"`;
+      })
+      .join(", ");
+    const note = _isAmbiguousAcrossDatasets(places)
+      ? " This name means different things in different datasets: ask the user which one they mean."
+      : "";
+    return `- "${value}" is stored in ${where}.${note}`;
+  });
+}
+
+/** One line per label the question names that a code list turns into a code. */
+function _formatCodeLines(
+  matches: readonly QuestionValueMatch[],
+  aliasOf: (datasetId: string) => string,
+): string[] {
+  return matches.map((match) => {
+    return `- "${match.term}" is code ${match.storedValue} in ${aliasOf(match.datasetId)}."${match.column}" (${match.storedValue} = ${match.codeLabel}).`;
+  });
+}
+
+/**
+ * Lists matched values and flags names that mean different things. A label
+ * found in a column's code list is listed with the code to filter on.
+ */
 export function formatQuestionValues(
   matches: readonly QuestionValueMatch[],
   datasets: readonly DataAgentDataset[],
@@ -139,29 +207,16 @@
       })?.alias ?? datasetId
     );
   };
-  const values = [
-    ...new Set(
-      matches.map((match) => {
-        return match.storedValue;
-      }),
-    ),
-  ];
-  return values
-    .map((value) => {
-      const places = matches.filter((match) => {
-        return match.storedValue === value;
-      });
-      const where = places
-        .map((match) => {
-          return `${aliasOf(match.datasetId)}."${match.column}"`;
-        })
-        .join(", ");
-      const note = _isAmbiguousAcrossDatasets(places)
-        ? " This name means different things in different datasets: ask the user which one they mean."
-        : "";
-      return `- "${value}" is stored in ${where}.${note}`;
-    })
-    .join("\n");
+  const stored = matches.filter((match) => {
+    return match.codeLabel === undefined;
+  });
+  const coded = matches.filter((match) => {
+    return match.codeLabel !== undefined;
+  });
+  return [
+    ..._formatStoredValueLines(stored, aliasOf),
+    ..._formatCodeLines(coded, aliasOf),
+  ].join("\n");
 }
 
 /**
```

`src/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues.ts`:

```diff
--- a/src/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues.ts
+++ b/src/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues.ts
@@ -1,4 +1,5 @@
 import { quoteSqlIdentifier } from "@avandar/utils/sql";
+import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
 import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
 import type { OfflineDatasetProfile } from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";
@@ -27,6 +28,11 @@
   datasetId: string;
   column: string;
   storedValue: string;
+  /**
+   * Set when the words are a label in the column's code list. `storedValue`
+   * is then the code to filter on, and this is the label it stands for.
+   */
+  codeLabel?: string;
 };
 
 function _isUsableTerm(words: readonly string[]): boolean {
@@ -92,6 +98,38 @@
 }
 
 /**
+ * The question's words that are labels in a column's code list, each with
+ * the code to filter on. Found from the code lists alone, so no query runs.
+ */
+function _findCodeMatches(
+  datasets: readonly DataAgentDataset[],
+  terms: readonly string[],
+): QuestionValueMatch[] {
+  return datasets.flatMap((dataset) => {
+    return dataset.columns.flatMap((column) => {
+      const { codes } = column;
+      if (codes?.direction !== "decode") {
+        return [];
+      }
+      return terms.flatMap((term) => {
+        const pair = ColumnCodes.findPairByLabel(codes, term);
+        return pair
+          ? [
+              {
+                term,
+                datasetId: dataset.id,
+                column: column.name,
+                storedValue: pair.code,
+                codeLabel: pair.label,
+              },
+            ]
+          : [];
+      });
+    });
+  });
+}
+
+/**
  * Keeps the longest matches: "York" (a county) inside a matched "New York"
  * is part of that name, not a second place the user named.
  */
@@ -115,8 +153,9 @@
 
 /**
  * Finds which words in the question are stored values, and in which text
- * columns, by searching the data on the device. An offline model then uses
- * the exact stored spelling instead of guessing it.
+ * columns, by searching the data on the device, and which are labels in a
+ * column's code list. An offline model then uses the exact stored spelling,
+ * or the code, instead of guessing it.
  */
 export async function findQuestionValues(
   host: DataAgentHost,
@@ -130,7 +169,7 @@
   if (terms.length === 0) {
     return [];
   }
-  const matches: QuestionValueMatch[] = [];
+  const matches = _findCodeMatches(options.datasets, terms);
   for (const profile of options.profiles) {
     for (const column of profile.columns) {
       const distinctCount = column.distinctCount ?? 0;
```

- [ ] **Step 4:** `pnpm vitest run src/lib/agent/dataAgent/offline`. Expected: PASS (18 tests).
- [ ] **Step 5: Commit** the four files as `feat(data-agent): tell the offline agent what codes mean`.

---

### Task 26: lookup_values answers from code lists

When the model looks up a value in a coded column, the tool answers from the column's code list first: `"female" is stored as code 2 (Female in the column's code list).`, with no query, no card, and no approval, since a code list is metadata the model already has, not row data. Values found by searching the data are approved and recorded as before, and the tool no longer asks to approve an empty list. The tool gets the datasets so it can find a column's codes; its description, shared by every prompt version, is unchanged.

**Files:**
- Modify: `src/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool.ts`
- Modify: `src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts`
- Modify: `src/lib/agent/dataAgent/createDataAgentTools/dataAgentTools.test.ts`
- Modify: `src/lib/agent/dataAgent/pagePrivacy/__tests__/placeholderRoundTrip.executed.test.ts`

- [ ] **Step 1: Write the failing test** (the existing calls gain `datasets: []`):

`src/lib/agent/dataAgent/createDataAgentTools/dataAgentTools.test.ts`:

```diff
--- a/src/lib/agent/dataAgent/createDataAgentTools/dataAgentTools.test.ts
+++ b/src/lib/agent/dataAgent/createDataAgentTools/dataAgentTools.test.ts
@@ -113,7 +113,12 @@
     const host = _createHost({
       readColumnValues: vi.fn().mockResolvedValue(["United Kingdom"]),
     });
-    const tool = createLookupValuesTool({ host, aliases: ALIASES, state });
+    const tool = createLookupValuesTool({
+      host,
+      aliases: ALIASES,
+      datasets: [],
+      state,
+    });
 
     const result = await tool.execute("call-1", {
       table: "t0",
@@ -136,7 +141,12 @@
         .mockResolvedValue(["Youth Mentoring", "Youth Sports"]),
       askUser: vi.fn().mockResolvedValue({ kind: "deferred" }),
     });
-    const tool = createLookupValuesTool({ host, aliases: ALIASES, state });
+    const tool = createLookupValuesTool({
+      host,
+      aliases: ALIASES,
+      datasets: [],
+      state,
+    });
 
     const result = await tool.execute("call-1", {
       table: "t0",
@@ -155,10 +165,57 @@
     expect(state.valuesSentToModel).toEqual([]);
   });
 
+  it("answers a label from the column's code list with its code, without a query", async () => {
+    const state = createDataAgentRunState();
+    const host = _createHost();
+    const tool = createLookupValuesTool({
+      host,
+      aliases: ALIASES,
+      datasets: [
+        {
+          id: DATASET_ID,
+          name: "deaths.csv",
+          columns: [
+            {
+              name: "GENDER",
+              dataType: "bigint",
+              codes: {
+                direction: "decode",
+                pairs: [
+                  {
+                    code: "2",
+                    label: "Female",
+                    acceptedSpellings: [],
+                    isMissing: false,
+                  },
+                ],
+              },
+            },
+          ],
+        },
+      ],
+      state,
+    });
+
+    const result = await tool.execute("call-1", {
+      table: "t0",
+      column: "GENDER",
+      values: [{ named: "female", forms: ["women"] }],
+      question: "Which of these is female?",
+    });
+
+    expect(_textOf(result)).toBe(
+      '"female" is stored as code 2 (Female in the column\'s code list).',
+    );
+    expect(host.readColumnValues).not.toHaveBeenCalled();
+    expect(host.approveValuesForModel).not.toHaveBeenCalled();
+  });
+
   it("refuses an alias that is not in the schema", async () => {
     const tool = createLookupValuesTool({
       host: _createHost(),
       aliases: ALIASES,
+      datasets: [],
       state: createDataAgentRunState(),
     });
 
```

`src/lib/agent/dataAgent/pagePrivacy/__tests__/placeholderRoundTrip.executed.test.ts`:

```diff
--- a/src/lib/agent/dataAgent/pagePrivacy/__tests__/placeholderRoundTrip.executed.test.ts
+++ b/src/lib/agent/dataAgent/pagePrivacy/__tests__/placeholderRoundTrip.executed.test.ts
@@ -108,6 +108,7 @@
       const tool = createLookupValuesTool({
         host: createPlaceholderRestoringHost(inner, _createVault()),
         aliases: ALIASES,
+        datasets: [],
         state: createDataAgentRunState(),
       });
 
@@ -133,6 +134,7 @@
       const tool = createLookupValuesTool({
         host: createPlaceholderRestoringHost(inner, _createVault()),
         aliases: ALIASES,
+        datasets: [],
         state: createDataAgentRunState(),
       });
 
@@ -157,6 +159,7 @@
       const tool = createLookupValuesTool({
         host: createPlaceholderRestoringHost(inner, _createVault()),
         aliases: ALIASES,
+        datasets: [],
         state: createDataAgentRunState(),
       });
 
```

- [ ] **Step 2:** `pnpm vitest run src/lib/agent/dataAgent/createDataAgentTools`. Expected: FAIL.
- [ ] **Step 3: Answer from the code list.** `_execute` is split so each part stays under 45 lines:

`src/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool.ts`:

```diff
--- a/src/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool.ts
+++ b/src/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool.ts
@@ -1,8 +1,11 @@
+import { isDefined } from "@avandar/utils";
 import { quoteSqlIdentifier } from "@avandar/utils/sql";
 import { LOOKUP_VALUES_TOOL } from "$/agent/dataAgent/dataAgentTools";
+import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
 import { DiscoveryCandidateValues } from "@/components/ChatPanel/ClarificationCard/DiscoveryCandidateValues/DiscoveryCandidateValues";
 import { buildCandidateLookupSqlFromDiscovery } from "@/components/ChatPanel/PendingClarificationBlock/buildCandidateLookupSqlFromDiscovery/buildCandidateLookupSqlFromDiscovery";
 import { DEFERRED_ANSWER_TEXT } from "@/lib/agent/dataAgent/createDataAgentTools/askUserTool";
+import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
 import type { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
 import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
 import type { DataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
@@ -15,9 +18,16 @@
   state: DataAgentRunState;
   tableName: string;
   column: string;
+  /** The column's code list, when a dictionary is attached to it. */
+  codes: ColumnCodes.Context | undefined;
 }>;
 
-type LookupMatch = { named: string; storedValue: string | undefined };
+type LookupMatch = {
+  named: string;
+  storedValue: string | undefined;
+  /** Set when the code list answered: the label `storedValue` stands for. */
+  codeLabel?: string;
+};
 
 /** Text the model may have meant as a page placeholder, with any spacing. */
 const PLACEHOLDER_LIKE = /^['"`]?\s*<\s*value\s*(\d+)\s*>\s*['"`]?$/i;
@@ -40,6 +50,28 @@
 }
 
 /**
+ * The code a named value stands for in the column's code list, when the
+ * value or one of its forms is a label or accepted spelling there.
+ */
+function _findCodeListMatch(
+  context: LookupContext,
+  value: Readonly<{ named: string; forms: readonly string[] }>,
+): LookupMatch | undefined {
+  const { codes } = context;
+  if (codes?.direction !== "decode") {
+    return undefined;
+  }
+  const pair = [value.named, ...value.forms]
+    .map((text) => {
+      return ColumnCodes.findPairByLabel(codes, text);
+    })
+    .find(isDefined);
+  return pair
+    ? { named: value.named, storedValue: pair.code, codeLabel: pair.label }
+    : undefined;
+}
+
+/**
  * How a value is stored. A page placeholder the host holds (`<value 1>`)
  * is already the stored value as far as the model knows, so it matches
  * itself without a query: a lookup would compare its value in lower case,
@@ -53,6 +85,10 @@
   if (placeholder && context.host.isHeldPlaceholder?.(placeholder)) {
     return { named: placeholder, storedValue: placeholder };
   }
+  const codeListMatch = _findCodeListMatch(context, value);
+  if (codeListMatch) {
+    return codeListMatch;
+  }
   const candidateValues = [value.named, ...value.forms];
   const sql = buildCandidateLookupSqlFromDiscovery({
     discoveryQuery: `SELECT DISTINCT ${quoteSqlIdentifier(context.column)} FROM ${quoteSqlIdentifier(context.tableName)}`,
@@ -188,6 +224,50 @@
       };
 }
 
+/**
+ * Reports the values found by searching the data, once the host approves
+ * sending them to the model, and records them as an automatic answer.
+ */
+async function _reportDataMatches(
+  context: LookupContext,
+  matched: readonly LookupMatch[],
+  question: string,
+): Promise<string[]> {
+  if (matched.length === 0) {
+    return [];
+  }
+  const matchedValues = matched.map((lookup) => {
+    return lookup.storedValue!;
+  });
+  const isApproved = await context.host.approveValuesForModel({
+    values: matchedValues,
+    reason: "matched_lookup",
+  });
+  if (!isApproved) {
+    return [];
+  }
+  context.state.valuesSentToModel.push(...matchedValues);
+  context.state.questions.push({
+    kind: "values",
+    question,
+    answer: matchedValues.join(", "),
+    isAutomatic: true,
+  });
+  return [
+    `${_describeMatches(matched)} (matched automatically; use only if it means exactly what the user named).`,
+  ];
+}
+
+/**
+ * Reports codes a column's code list gave. A code list is metadata the
+ * model already has, not row data, so nothing here asks for approval.
+ */
+function _describeCodeListMatches(matched: readonly LookupMatch[]): string[] {
+  return matched.map((match) => {
+    return `"${match.named}" is stored as code ${match.storedValue} (${match.codeLabel} in the column's code list).`;
+  });
+}
+
 async function _execute(
   context: LookupContext,
   params: Readonly<{
@@ -204,32 +284,19 @@
       return _findStoredValue(context, value);
     }),
   );
-  const matched = lookups.filter((lookup) => {
-    return lookup.storedValue !== undefined;
+  const fromCodeList = lookups.filter((lookup) => {
+    return lookup.codeLabel !== undefined;
   });
+  const fromData = lookups.filter((lookup) => {
+    return lookup.storedValue !== undefined && lookup.codeLabel === undefined;
+  });
   const unmatched = lookups.filter((lookup) => {
     return lookup.storedValue === undefined;
   });
-  const matchedValues = matched.map((lookup) => {
-    return lookup.storedValue!;
-  });
-  const isApproved = await context.host.approveValuesForModel({
-    values: matchedValues,
-    reason: "matched_lookup",
-  });
-  const parts: string[] = [];
-  if (matched.length > 0 && isApproved) {
-    context.state.valuesSentToModel.push(...matchedValues);
-    context.state.questions.push({
-      kind: "values",
-      question: params.question,
-      answer: matchedValues.join(", "),
-      isAutomatic: true,
-    });
-    parts.push(
-      `${_describeMatches(matched)} (matched automatically; use only if it means exactly what the user named).`,
-    );
-  }
+  const parts = [
+    ..._describeCodeListMatches(fromCodeList),
+    ...(await _reportDataMatches(context, fromData, params.question)),
+  ];
   if (unmatched.length > 0) {
     parts.push(await _askUserToPick(context, unmatched, params.question));
   }
@@ -242,16 +309,37 @@
   };
 }
 
+/** The code list of one column of the dataset an alias names, if any. */
+function _findColumnCodes(
+  datasets: readonly DataAgentDataset[],
+  alias: SqlTableAlias.T,
+  columnName: string,
+): ColumnCodes.Context | undefined {
+  if (alias.kind !== "dataset") {
+    return undefined;
+  }
+  return datasets
+    .find((dataset) => {
+      return dataset.id === alias.datasetId;
+    })
+    ?.columns.find((column) => {
+      return column.name === columnName;
+    })?.codes;
+}
+
 /**
  * The tool that finds how values the user named are stored. It runs on the
- * device: an exact match (ignoring case and spaces) answers on its own, and
- * anything else shows the user a card of stored values to pick from. Only
- * matched or picked values reach the model.
+ * device: a label in the column's code list answers with its code, an
+ * exact match (ignoring case and spaces) answers on its own, and anything
+ * else shows the user a card of stored values to pick from. Only matched or
+ * picked values reach the model.
  */
 export function createLookupValuesTool(
   options: Readonly<{
     host: DataAgentHost;
     aliases: readonly SqlTableAlias.T[];
+    /** The datasets under DATASETS, whose columns may carry code lists. */
+    datasets: readonly DataAgentDataset[];
     state: DataAgentRunState;
   }>,
 ): AgentTool<typeof LOOKUP_VALUES_TOOL.parameters> {
@@ -273,6 +361,7 @@
           state: options.state,
           tableName: alias.tableName,
           column: params.column,
+          codes: _findColumnCodes(options.datasets, alias, params.column),
         },
         params,
       );
```

`src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts`:

```diff
--- a/src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts
+++ b/src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts
@@ -168,7 +168,12 @@
   }
   return [
     createRunQueryTool(queryContext),
-    createLookupValuesTool({ host: options.host, aliases, state }),
+    createLookupValuesTool({
+      host: options.host,
+      aliases,
+      datasets: options.datasets,
+      state,
+    }),
     askUser,
   ];
 }
```

- [ ] **Step 4:** `pnpm vitest run src/lib/agent src/components/ChatPanel && pnpm vitest run --config vitest.executed.config.ts src/lib/agent/dataAgent/pagePrivacy`. Expected: PASS.
- [ ] **Step 5: Commit** the four files as `feat(data-agent): answer lookups in coded columns from their code lists`.

---

### Task 27: Eval: coded columns

The 45 COVID questions have no coded column, so they cannot show whether the agents read code lists. A second eval workspace, `--workspace measles`, is the e2e line list (`tests/data/measles-line-list-small/measles-line-list-small.csv`, 24 rows) with a dictionary attached as reference: `GENDER` 1/2/9 where 9 has no label yet, `hosp_yn` Y/N, `ses_cat` 1 to 4 with no description, and a description on `case_id`. Its datasets carry the codes the way the app's loaders hand them to `createDataAgent` and `createOfflineDataAgent`, so the eval runs prompt v4 and the real tools, `lookup_values` included. Four questions, asked in labels:

| Id | Question | Truth |
| --- | --- | --- |
| D01 | How many female cases were hospitalized? | 1 (`"GENDER" = 2 AND "hosp_yn" = 'Y'`) |
| D02 | How many male cases were there? | 11 |
| D03 | How many cases had a high socioeconomic status? | 3 (`"ses_cat" = 4`) |
| D04 | What does a GENDER value of 9 mean in the line list? | Prose: says the code has no label, and invents no meaning |

The truth counts were computed with DuckDB over the CSV while planning. The `baseline` harness has no notion of code lists, so a measles run refuses it.

**Files:**
- Create: `scripts/ai-eval/measles/measlesWorkspace.ts`
- Create: `scripts/ai-eval/measles/measlesQuestions.ts` (+ test)
- Modify: `scripts/ai-eval/EvalQuestion.ts`, `scripts/ai-eval/runtime/EvalDatabase.ts`, `scripts/ai-eval/harnesses/pi/PiHarness.ts`, `scripts/ai-eval/harnesses/pi/PiLocalHarness.ts`, `scripts/ai-eval/runEval.ts`
- Modify: `docs/ai-agent/eval.md`; archived runs under `docs/ai-agent/eval-runs/`

- [ ] **Step 1: Write the failing test.**

`scripts/ai-eval/measles/measlesQuestions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { gradeNoLabelAnswer } from "./measlesQuestions";

describe("gradeNoLabelAnswer", () => {
  it("passes a reply that says the code has no label", () => {
    expect(
      gradeNoLabelAnswer("Code 9 has no label yet in the dictionary.").pass,
    ).toBe(true);
  });

  it("fails a reply that invents a meaning", () => {
    expect(gradeNoLabelAnswer("9 means Unknown.").pass).toBe(false);
  });
});
```

- [ ] **Step 2:** `pnpm vitest run scripts/ai-eval/measles`. Expected: FAIL (the module does not exist).
- [ ] **Step 3: Write the workspace and its questions.**

`scripts/ai-eval/measles/measlesWorkspace.ts`:

```ts
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { CovidDataset } from "../covid/covidWorkspace";

/** A coded line list's dataset, with the code lists a dictionary attaches. */
export type MeaslesDataset = Omit<CovidDataset, "columns"> & {
  columns: ReadonlyArray<{
    name: string;
    dataType: string;
    codes?: ColumnCodes.Context;
  }>;
};

function _pair(
  code: string,
  label: string,
  isMissing = false,
): ColumnCodes.Pair {
  return { code, label, acceptedSpellings: [], isMissing };
}

/**
 * The coded-columns workspace: the 24-row measles line list the e2e tests
 * import, with a dictionary attached as reference. GENDER's code 9 has no
 * label yet, as a dictionary learned from data can leave it.
 */
export const MEASLES_DATASETS: readonly MeaslesDataset[] = [
  {
    id: "5e1b7c2a-8d4f-4a6e-9b3c-2f7d1e0a4c58",
    name: "measles-line-list-small.csv",
    fileName: "measles-line-list-small.csv",
    truthViewName: "line_list",
    columns: [
      {
        name: "case_id",
        dataType: "varchar",
        codes: {
          direction: "decode",
          pairs: [],
          description: "Case number assigned by the reporting county.",
        },
      },
      {
        name: "GENDER",
        dataType: "bigint",
        codes: {
          direction: "decode",
          pairs: [_pair("1", "Male"), _pair("2", "Female"), _pair("9", "")],
          description: "Sex recorded on the case report.",
        },
      },
      {
        name: "hosp_yn",
        dataType: "varchar",
        codes: {
          direction: "decode",
          pairs: [_pair("Y", "Yes"), _pair("N", "No")],
          description: "Admitted to a hospital for at least one night.",
        },
      },
      {
        name: "ses_cat",
        dataType: "bigint",
        codes: {
          direction: "decode",
          pairs: [
            _pair("1", "Low"),
            _pair("2", "Lower-middle"),
            _pair("3", "Upper-middle"),
            _pair("4", "High"),
          ],
        },
      },
      { name: "onset_dt", dataType: "date" },
      { name: "county", dataType: "varchar" },
    ],
  },
];
```

`scripts/ai-eval/measles/measlesQuestions.ts`:

```ts
import { ResultChecks } from "../grading/ResultChecks";
import type { EvalQuestion, GradeContext } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";

/** The one count a truth query returns. */
function _count(context: GradeContext): number {
  return Number(context.truth.count?.rows[0]?.[0] ?? Number.NaN);
}

function _hasCount(context: GradeContext): Verdict {
  return ResultChecks.hasValue(context.result, _count(context), { maxRows: 1 });
}

/**
 * Grades a reply about a code with no label. It passes when the reply says
 * the code has no label, so a model that invents a meaning fails.
 */
export function gradeNoLabelAnswer(text: string): Verdict {
  const saysNoLabel =
    /no label|not labell?ed|unlabell?ed|doesn't have a label|does not have a label|hasn't been labell?ed|has not been labell?ed|not recorded/i.test(
      text,
    );
  return saysNoLabel
    ? { pass: true, detail: "said the code has no label" }
    : { pass: false, detail: "did not say the code has no label" };
}

const NOT_A_QUERY: EvalQuestion["grade"] = () => {
  return { pass: false, detail: "graded a prose answer as a query result" };
};

/**
 * Questions about coded columns, asked in labels, over the measles line
 * list. Run with `--workspace measles`.
 */
export const MEASLES_QUESTIONS: readonly EvalQuestion[] = [
  {
    id: "D01",
    category: "coded",
    prompt: "How many female cases were hospitalized?",
    clarification: "not_needed",
    truth: {
      count: `SELECT count(*) FROM line_list WHERE "GENDER" = 2 AND "hosp_yn" = 'Y'`,
    },
    grade: _hasCount,
  },
  {
    id: "D02",
    category: "coded",
    prompt: "How many male cases were there?",
    clarification: "not_needed",
    truth: { count: `SELECT count(*) FROM line_list WHERE "GENDER" = 1` },
    grade: _hasCount,
  },
  {
    id: "D03",
    category: "coded",
    prompt: "How many cases had a high socioeconomic status?",
    clarification: "not_needed",
    truth: { count: `SELECT count(*) FROM line_list WHERE "ses_cat" = 4` },
    grade: _hasCount,
  },
  {
    id: "D04",
    category: "coded",
    prompt: "What does a GENDER value of 9 mean in the line list?",
    clarification: "not_needed",
    truth: {},
    gradeText: gradeNoLabelAnswer,
    grade: NOT_A_QUERY,
  },
];
```

- [ ] **Step 4: Let a run pick its workspace.** The database builds `.temp/ai-eval/measles.duckdb` from the CSV in the repo on first use, so the measles run needs no `~/cleaned-test-data`:

`scripts/ai-eval/EvalQuestion.ts`:

```diff
--- a/scripts/ai-eval/EvalQuestion.ts
+++ b/scripts/ai-eval/EvalQuestion.ts
@@ -33,7 +33,8 @@
     | "follow_up"
     | "page_context"
     | "mentions"
-    | "schema";
+    | "schema"
+    | "coded";
   prompt: string;
   /** The question this one follows in the same conversation. */
   followsId?: string;
@@ -44,8 +45,8 @@
   clarification: "not_needed" | "allowed" | "expected";
   user?: SimulatedUserScript;
   /**
-   * Ground-truth SQL by name, over the `us_deaths`, `us_cases`, and
-   * `global_deaths` views.
+   * Ground-truth SQL by name, over the workspace's truth views: `us_deaths`,
+   * `us_cases`, and `global_deaths`, or `line_list` for coded questions.
    */
   truth: Readonly<Record<string, string>>;
   grade: (context: GradeContext) => Verdict;
```

`scripts/ai-eval/runtime/EvalDatabase.ts`:

```diff
--- a/scripts/ai-eval/runtime/EvalDatabase.ts
+++ b/scripts/ai-eval/runtime/EvalDatabase.ts
@@ -19,7 +19,13 @@
   date: "DATE",
 };
 
-function _buildCreateTableSql(dataset: CovidDataset, dataDir: string): string {
+/** A dataset the eval database loads, from a CSV under its data directory. */
+type EvalDataset = Pick<
+  CovidDataset,
+  "id" | "fileName" | "truthViewName" | "columns"
+>;
+
+function _buildCreateTableSql(dataset: EvalDataset, dataDir: string): string {
   const castColumns = dataset.columns
     .map((column) => {
       const duckDbType = DUCKDB_TYPE_BY_APP_TYPE[column.dataType] ?? "VARCHAR";
@@ -44,27 +50,35 @@
 async function _createTables(
   connection: DuckDBConnection,
   dataDir: string,
+  datasets: readonly EvalDataset[],
 ): Promise<void> {
-  for (const dataset of COVID_DATASETS) {
+  for (const dataset of datasets) {
     await connection.run(_buildCreateTableSql(dataset, dataDir));
   }
 }
 
-async function _createTruthViews(connection: DuckDBConnection): Promise<void> {
-  for (const dataset of COVID_DATASETS) {
+async function _createTruthViews(
+  connection: DuckDBConnection,
+  datasets: readonly EvalDataset[],
+): Promise<void> {
+  for (const dataset of datasets) {
     await connection.run(
       `CREATE OR REPLACE VIEW ${dataset.truthViewName} AS SELECT * FROM "${dataset.id}"`,
     );
   }
 }
 
-async function _build(databasePath: string, dataDir: string): Promise<void> {
+async function _build(
+  databasePath: string,
+  dataDir: string,
+  datasets: readonly EvalDataset[],
+): Promise<void> {
   mkdirSync(dirname(databasePath), { recursive: true });
   const instance = await DuckDBInstance.create(databasePath);
   const connection = await instance.connect();
   try {
-    await _createTables(connection, dataDir);
-    await _createTruthViews(connection);
+    await _createTables(connection, dataDir, datasets);
+    await _createTruthViews(connection, datasets);
   } finally {
     connection.closeSync();
     instance.closeSync();
@@ -72,18 +86,24 @@
 }
 
 /**
- * Opens the eval's DuckDB copy of the COVID workspace, building it from the
- * CSV files on first use. Tables are named by dataset id, as in the app, and
- * the `us_deaths`, `us_cases`, and `global_deaths` views serve the
- * ground-truth SQL. Opens read-only, so several eval runs can share the file.
+ * Opens the eval's DuckDB copy of a workspace, building it from the CSV
+ * files on first use: the COVID workspace by default, or `datasets` from
+ * `dataDir`. Tables are named by dataset id, as in the app, and each
+ * dataset's truth view serves the ground-truth SQL. Opens read-only, so
+ * several eval runs can share the file.
  */
 async function _open(
-  options: Readonly<{ databasePath: string; dataDir?: string }>,
+  options: Readonly<{
+    databasePath: string;
+    dataDir?: string;
+    datasets?: readonly EvalDataset[];
+  }>,
 ): Promise<EvalDatabase> {
   if (!existsSync(options.databasePath)) {
     await _build(
       options.databasePath,
       options.dataDir ?? join(homedir(), "cleaned-test-data"),
+      options.datasets ?? COVID_DATASETS,
     );
   }
   const instance = await DuckDBInstance.create(options.databasePath, {
```

`scripts/ai-eval/harnesses/pi/PiHarness.ts`:

```diff
--- a/scripts/ai-eval/harnesses/pi/PiHarness.ts
+++ b/scripts/ai-eval/harnesses/pi/PiHarness.ts
@@ -20,6 +20,7 @@
 import { SimulatedUser } from "../../runtime/SimulatedUser";
 import { EMPTY_EVAL_USAGE } from "../EvalHarness";
 import { PI_EVAL_CONFIGS } from "./piEvalConfigs";
+import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
 import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
 import type { AgentContextBlocks } from "$/agent/mentions/buildAgentContextBlocks";
 import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
@@ -373,6 +374,8 @@
     database: EvalDatabase;
     configName: string;
     model: string;
+    /** The workspace's datasets as the agent sees them. COVID by default. */
+    datasets?: readonly DataAgentDataset[];
   }>,
 ): EvalHarness {
   const models = createModels();
@@ -402,7 +405,7 @@
         database: options.database,
         createAgent: (host) => {
           return createDataAgent({
-            datasets: COVID_DATASETS,
+            datasets: options.datasets ?? COVID_DATASETS,
             host,
             policy,
             streamFn,
```

`scripts/ai-eval/harnesses/pi/PiLocalHarness.ts`:

```diff
--- a/scripts/ai-eval/harnesses/pi/PiLocalHarness.ts
+++ b/scripts/ai-eval/harnesses/pi/PiLocalHarness.ts
@@ -2,6 +2,7 @@
 import { COVID_DATASETS } from "../../covid/covidWorkspace";
 import { WebLlmBrowser } from "../../runtime/WebLlmBrowser";
 import { createPiConversation } from "./PiHarness";
+import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
 import type { EvalDatabase } from "../../runtime/EvalDatabase";
 import type { EvalHarness } from "../EvalHarness";
 import type { OfflineDataAgentModels } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";
@@ -38,6 +39,8 @@
     database: EvalDatabase;
     configName: string;
     model: string;
+    /** The workspace's datasets as the agent sees them. COVID by default. */
+    datasets?: readonly DataAgentDataset[];
   }>,
 ): Promise<EvalHarness> {
   const isPlan = options.configName === "plan";
@@ -61,7 +64,7 @@
         database: options.database,
         createAgent: (host) => {
           return createOfflineDataAgent({
-            datasets: COVID_DATASETS,
+            datasets: options.datasets ?? COVID_DATASETS,
             host,
             llm: browser,
             models,
```

`scripts/ai-eval/runEval.ts`:

```diff
--- a/scripts/ai-eval/runEval.ts
+++ b/scripts/ai-eval/runEval.ts
@@ -16,6 +16,10 @@
  * `--harness pi-local --model <WebLLM id>` runs the offline agent on WebLLM
  * in a headless Chromium instead of calling OpenRouter.
  *
+ * `--workspace measles` asks the coded-column questions (D) over the
+ * measles line list with its code lists attached, on the `pi` and
+ * `pi-local` harnesses. It needs no `~/cleaned-test-data`.
+ *
  * Needs `~/cleaned-test-data` (the JHU long-format CSVs) and
  * `OPEN_ROUTER_API_KEY` (read from `.env.development.edge` when not set).
  * Writes `results.jsonl` and `summary.md` under `.temp/ai-eval/runs/`.
@@ -27,6 +31,8 @@
 import { createBaselineHarness } from "./harnesses/baseline/BaselineHarness";
 import { createPiHarness } from "./harnesses/pi/PiHarness";
 import { createPiLocalHarness } from "./harnesses/pi/PiLocalHarness";
+import { MEASLES_QUESTIONS } from "./measles/measlesQuestions";
+import { MEASLES_DATASETS } from "./measles/measlesWorkspace";
 import { EvalDatabase } from "./runtime/EvalDatabase";
 import { gradeEvalAnswer } from "./runtime/gradeEvalAnswer";
 import { readOpenRouterApiKey } from "./runtime/readOpenRouterApiKey";
@@ -119,12 +125,41 @@
       questions: { type: "string", default: "" },
       concurrency: { type: "string", default: "4" },
       label: { type: "string", default: "" },
+      workspace: { type: "string", default: "covid" },
     },
   });
   return values;
 }
 
-function _selectQuestions(ids: string): readonly EvalQuestion[] {
+/** The questions and data of the workspace a run asks about. */
+function _getWorkspace(name: string) {
+  if (name === "measles") {
+    return {
+      questions: MEASLES_QUESTIONS,
+      datasets: MEASLES_DATASETS,
+      databasePath: join(REPO_ROOT, ".temp/ai-eval/measles.duckdb"),
+      dataDir: join(REPO_ROOT, "tests/data/measles-line-list-small"),
+    };
+  }
+  return {
+    questions: undefined,
+    datasets: undefined,
+    databasePath: join(REPO_ROOT, ".temp/ai-eval/covid.duckdb"),
+    dataDir: undefined,
+  };
+}
+
+function _selectQuestions(
+  ids: string,
+  workspaceQuestions: readonly EvalQuestion[] | undefined,
+): readonly EvalQuestion[] {
+  if (workspaceQuestions) {
+    return ids
+      ? workspaceQuestions.filter((question) => {
+          return ids.split(",").includes(question.id);
+        })
+      : workspaceQuestions;
+  }
   if (!ids) {
     // The default run stays the audit's 45 questions, so archived runs
     // compare. Page questions run with `--questions P`, mention questions
@@ -152,12 +187,14 @@
   options: ReturnType<typeof _parseOptions>,
   database: EvalDatabase,
 ): Promise<EvalHarness> {
+  const { datasets } = _getWorkspace(options.workspace);
   if (options.harness === "pi-local") {
     return createPiLocalHarness({
       repoRoot: REPO_ROOT,
       database,
       configName: options.config || "default",
       model: options.model,
+      datasets,
     });
   }
   const openRouterApiKey = readOpenRouterApiKey(REPO_ROOT);
@@ -167,8 +204,14 @@
       database,
       configName: options.config || "default",
       model: options.model,
+      datasets,
     });
   }
+  if (datasets) {
+    throw new Error(
+      `The ${options.workspace} workspace runs on the pi and pi-local harnesses only`,
+    );
+  }
   return createBaselineHarness({
     repoRoot: REPO_ROOT,
     openRouterApiKey,
@@ -206,14 +249,17 @@
 
 async function main(): Promise<void> {
   const options = _parseOptions();
+  const workspace = _getWorkspace(options.workspace);
   const database = await EvalDatabase.open({
-    databasePath: join(REPO_ROOT, ".temp/ai-eval/covid.duckdb"),
+    databasePath: workspace.databasePath,
+    dataDir: workspace.dataDir,
+    datasets: workspace.datasets,
   });
   const harness = await _createHarness(options, database);
   const label = options.label || harness.label;
   const graded: GradedAnswer[] = [];
   await _runAll(
-    _toConversations(_selectQuestions(options.questions)),
+    _toConversations(_selectQuestions(options.questions, workspace.questions)),
     Number(options.concurrency),
     async (questions) => {
       await _runConversation({
```

- [ ] **Step 5:** `pnpm vitest run scripts/ai-eval && pnpm exec tsc -b --force --noEmit`. Expected: PASS and clean.
- [ ] **Step 6: Commit** the eight files as `test(ai-eval): ask coded-column questions over the measles line list`.
- [ ] **Step 7: Run the evals.** They need `OPEN_ROUTER_API_KEY` (read from `.env.development.edge`), cost about $0.05 online in all, and the offline run takes about 5 minutes on WebGPU:

```bash
for run in 1 2 3; do
  pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet \
    --workspace measles --label attach-dictionaries:coded
done
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet \
  --concurrency 6 --label attach-dictionaries:agent-45
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet \
  --questions P --label attach-dictionaries:agent-page
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet \
  --questions M --label attach-dictionaries:agent-mentions
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi-local --config single \
  --model Qwen3-4B-q4f16_1-MLC --concurrency 1 --workspace measles \
  --label attach-dictionaries:coded-offline
```

  The bar: D01 to D04 pass on all three online runs; the 45 questions score 43/45 or better (v3's last run scored 44/45, and one borderline question moves between runs); P01 to P07 and every mention question pass. If a question misses, read its line in the run's `results.jsonl` (final SQL and reply) before changing anything. Change only v4's CODED COLUMNS block (Task 21), never v1 to v3, and rerun every command above. The offline run is recorded, not gated (see Open questions).
- [ ] **Step 8:** `pnpm vite-script scripts/ai-eval/archiveEvalRuns.ts`.
- [ ] **Step 9: Write it up in `docs/ai-agent/eval.md`.**
  - After the `### Phase 1B` section, before `## Offline mode`, add a `### Coded columns` section: one paragraph saying when the runs were made, that prompt v4 lists each bound column's codes on its own line under its dataset (Task 21), that the offline agent reads them in its profile and question values (Task 25), and that `lookup_values` answers from a code list without a query (Task 26); then a table with the Phase 1B section's columns (Run, Correct, Needless / missed, Cost per question, Input tokens per call, Latency p50 / p90) and one row each for `attach-dictionaries:coded #1-#3`, `attach-dictionaries:coded-offline`, `attach-dictionaries:agent-page`, `attach-dictionaries:agent-mentions`, and `attach-dictionaries:agent-45`, filled from each run's `summary.md`; then bullets on whether the bar is met, how D04 was answered, and how many input tokens v4 adds per call against Phase 1B's runs.
  - Under `### Questions and ground truth`, after the S01 and S02 paragraph, add: "`measles/measlesQuestions.ts` holds the coded-column questions D01 to D04, over the 24-row measles line list in `tests/data/measles-line-list-small/`, with the code lists in `measles/measlesWorkspace.ts` attached as reference. D01 to D03 ask in labels and are graded by their count; D04 asks what an unlabeled code means and passes only when the reply says it has no label. They run only with `--workspace measles`, on the `pi` and `pi-local` harnesses."
  - In `### Running it`, add before the subset example: `# The coded-column questions over the measles line list` and `pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --workspace measles`.
  - In the `## Reproducing every result` table, add after the mention questions' row: `| The coded-column questions (add \`--label attach-dictionaries:coded\`) | \`--harness pi --config haiku-sonnet --workspace measles\` |` and `| The coded-column questions offline | \`--harness pi-local --config single --model Qwen3-4B-q4f16_1-MLC --concurrency 1 --workspace measles\` |`.
- [ ] **Step 10: Commit** `docs/ai-agent/eval.md` and the new run folders under `docs/ai-agent/eval-runs/` (with its `README.md` index) as `docs(ai-agent): record the coded-column eval`.

---

### Task 28: End-to-end

Two tests in a new spec, both driven through the UI with only the dictionary seeded beforehand (creating one through the UI is slice 1's and 2's specs' job). The first imports the line list, applies the dictionary from the dataset's ⋯ menu, accepts the default picks, attaches, and then reads the codes back: the popover opened by focus (and closed with Escape), the entry description under `case_id`, the rail's Dictionaries group, the menu with Apply and without Create, and the tag in a Data Explorer result's header. The only database read is the final oracle: three `reference` bindings. The second runs Ask Avandar offline on the scripted model: the script answers only when the system prompt contains `"female" is code 2`, which is there only when the code list reached the offline agent, and the test counts zero requests to the online agent. The stubbed online path is not driven here: the server's prompt is covered by Tasks 21 and 22's tests and Task 27's eval.

Slice 2's create spec changes too: saving now opens Apply for the dataset by default (Task 18), so its first test checks the box is on, sees Apply open with the new dictionary in use, cancels, and opens the dictionary from the list as before.

**Files:**
- Create: `tests/e2e/helpers/seedDataDictionary.ts`
- Create: `tests/e2e/dictionary-apply-reference.spec.ts`
- Modify: `tests/e2e/dictionary-create-from-dataset.spec.ts`

- [ ] **Step 1: Write the seed helper.** It inserts a dictionary, its code lists, entries, and column names with the admin client, as the owner of the worker's workspace. It is pre-test setup only, and the spec deletes the dictionary in `finally` (its children cascade):

`tests/e2e/helpers/seedDataDictionary.ts`:

```ts
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** One code pair as `data_dictionaries__code_lists.pairs` stores it. */
type StoredPair = {
  code: string;
  label: string;
  accepted_spellings: string[];
  is_missing: boolean;
};

/** One entry to seed, with the code list it uses, if any. */
export type SeedEntry = {
  name: string;
  columnNames: readonly string[];
  kind: "categorical" | "identifier";
  description?: string;
  codeList?: { name: string; pairs: readonly StoredPair[] };
};

async function _getOwnerProfile(
  admin: AvaSupabaseDBClient,
  workspaceId: string,
): Promise<{ id: string; user_id: string }> {
  const { data: workspace } = await admin
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single()
    .throwOnError();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", workspace.owner_id)
    .single()
    .throwOnError();
  return profile;
}

async function _seedEntry(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    workspaceId: string;
    dictionaryId: string;
    entry: SeedEntry;
    position: number;
  }>,
): Promise<void> {
  const { admin, workspaceId, dictionaryId, entry } = options;
  const { data: row } = await admin
    .from("data_dictionaries__entries")
    .insert({
      workspace_id: workspaceId,
      dictionary_id: dictionaryId,
      name: entry.name,
      column_names: [...entry.columnNames],
      kind: entry.kind,
      description: entry.description ?? null,
      position: options.position,
    })
    .select("id")
    .single()
    .throwOnError();
  if (!entry.codeList) {
    return;
  }
  const { data: list } = await admin
    .from("data_dictionaries__code_lists")
    .insert({
      workspace_id: workspaceId,
      dictionary_id: dictionaryId,
      name: entry.codeList.name,
      pairs: [...entry.codeList.pairs],
    })
    .select("id")
    .single()
    .throwOnError();
  await admin
    .from("data_dictionaries__entry_codings")
    .insert({
      workspace_id: workspaceId,
      dictionary_id: dictionaryId,
      entry_id: row.id,
      code_list_id: list.id,
      is_primary: true,
    })
    .throwOnError();
}

/**
 * Seeds a dictionary owned by the workspace owner, with its entries and
 * code lists, through the service role. Use it before the first page load
 * when a spec needs a dictionary to exist but does not test creating one,
 * for example a spec that applies a dictionary. Returns the dictionary id.
 */
export async function seedDataDictionary(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    workspaceId: string;
    name: string;
    entries: readonly SeedEntry[];
  }>,
): Promise<string> {
  const { admin, workspaceId } = options;
  const owner = await _getOwnerProfile(admin, workspaceId);
  const { data: dictionary } = await admin
    .from("data_dictionaries")
    .insert({
      workspace_id: workspaceId,
      owner_id: owner.user_id,
      owner_profile_id: owner.id,
      name: options.name,
    })
    .select("id")
    .single()
    .throwOnError();
  for (const [position, entry] of options.entries.entries()) {
    await _seedEntry({
      admin,
      workspaceId,
      dictionaryId: dictionary.id,
      entry,
      position,
    });
  }
  return dictionary.id;
}
```

- [ ] **Step 2: Write the spec.** The offline test learns the dataset's table alias the way the agent assigns it (its position among the workspace's dataset ids, sorted), then swaps the real script in through `page.evaluate`, since the offline engine reads the script on every request:

`tests/e2e/dictionary-apply-reference.spec.ts`:

```ts
/*
 * A workspace owner imports a coded line list, applies a dictionary to it
 * as reference from the dataset's menu, and reads the codes back: in the
 * dataset's column list, in its rail, in the Data Explorer's grid, and in
 * Ask Avandar's offline answer to a question asked in labels. The imported
 * dataset is a precondition and the dictionary is seeded before the first
 * page load. Everything the tests create is deleted afterwards.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
  MEASLES_LINE_LIST_CSV_PATH,
} from "./helpers/constants";
import { runSqlOverDataset } from "./helpers/dataExplorerFlow";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { openAgentChat } from "./helpers/openAgentChat";
import { seedDataDictionary } from "./helpers/seedDataDictionary";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { SeedEntry } from "./helpers/seedDataDictionary";
import type { Page } from "@playwright/test";

const DICTIONARY_NAME = "E2E line list codes to apply";

const ENTRIES: readonly SeedEntry[] = [
  {
    name: "sex",
    columnNames: ["GENDER"],
    kind: "categorical",
    description: "Sex recorded on the case report.",
    codeList: {
      name: "Sex (1/2/9)",
      pairs: [
        { code: "1", label: "Male", accepted_spellings: [], is_missing: false },
        {
          code: "2",
          label: "Female",
          accepted_spellings: [],
          is_missing: false,
        },
        {
          code: "9",
          label: "Unknown",
          accepted_spellings: [],
          is_missing: true,
        },
      ],
    },
  },
  {
    name: "hospitalized",
    columnNames: ["hosp_yn"],
    kind: "categorical",
    codeList: {
      name: "Yes/No",
      pairs: [
        { code: "Y", label: "Yes", accepted_spellings: [], is_missing: false },
        { code: "N", label: "No", accepted_spellings: [], is_missing: false },
      ],
    },
  },
  {
    name: "case_id",
    columnNames: [],
    kind: "identifier",
    description: "Case number assigned by the county.",
  },
];

/** Applies the seeded dictionary to the open dataset through its menu. */
async function _attachDictionary(page: Page): Promise<void> {
  await page.getByRole("button", { name: "More dataset actions" }).click();
  await page.getByRole("menuitem", { name: /Apply a dictionary/ }).click();
  const genderPick = page.getByRole("button", {
    name: /sex · Sex \(1\/2\/9\) 100%/,
  });
  await expect(genderPick).toHaveAttribute("aria-pressed", "true", {
    timeout: LONG_WAIT,
  });
  await page.getByRole("button", { name: "Next: attach" }).click();
  await expect(
    page.getByText(/Nothing in your data changes. 2 columns keep their values/),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Attach to / }).click();
  await expect(page.getByText(/The data is unchanged\./)).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/** The dataset page shows the codes, the entry's description, and the rail. */
async function _expectCodesOnDatasetPage(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Code list for GENDER" }).focus();
  const popover = page.getByRole("dialog", { name: "Code list for GENDER" });
  await expect(popover).toContainText("Female");
  await expect(popover).toContainText(
    "Attached as reference. The values in the data are unchanged.",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Case number assigned by the county."),
  ).toBeVisible();
  // The rail's caption, since the list pane links to the dictionary too.
  await expect(
    page.getByText("Attached as reference · data unchanged"),
  ).toBeVisible();
  await page.getByRole("button", { name: "More dataset actions" }).click();
  await expect(
    page.getByRole("menuitem", { name: /Apply a dictionary/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", {
      name: /Create a dictionary from this dataset/,
    }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
}

/** A Data Explorer query of the bound column shows its tag in the header. */
async function _expectCodesInExplorer(
  page: Page,
  options: Readonly<{ admin: AvaSupabaseDBClient; datasetId: string }>,
): Promise<void> {
  const { data: dataset } = await options.admin
    .from("datasets")
    .select("name")
    .eq("id", options.datasetId)
    .single()
    .throwOnError();
  await runSqlOverDataset({
    page,
    datasetName: dataset.name,
    columnName: "GENDER",
    sql: `SELECT "GENDER", "hosp_yn" FROM "${options.datasetId}"`,
  });
  await expect(
    page.getByRole("button", { name: "Code list for GENDER" }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/** The table alias the agent gives a dataset: its place among the ids. */
async function _getAlias(
  admin: AvaSupabaseDBClient,
  options: Readonly<{ workspaceId: string; datasetId: string }>,
): Promise<string> {
  const { data } = await admin
    .from("datasets")
    .select("id")
    .eq("workspace_id", options.workspaceId)
    .throwOnError();
  const ids = data
    .map((row) => {
      return row.id;
    })
    .sort((left, right) => {
      return left.localeCompare(right);
    });
  return `t${ids.indexOf(options.datasetId)}`;
}

/** The scripted offline model: a code-list question, then its reply. */
function _buildOfflineScript(alias: string) {
  const sql = `SELECT count(*) AS female_hospitalized FROM "${alias}" WHERE "GENDER" = 2 AND "hosp_yn" = 'Y'`;
  return [
    {
      match: "female_hospitalized",
      response: JSON.stringify({
        action: "reply",
        text: "One female case was hospitalized.",
      }),
    },
    {
      match: '"female" is code 2',
      response: JSON.stringify({
        action: "run_query",
        args: { sql, summary: "Female cases that were hospitalized." },
      }),
    },
  ];
}

test.describe("applying a dictionary as reference", () => {
  test("an applied dictionary explains the codes without changing them", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    const dictionaryId = await seedDataDictionary({
      admin,
      workspaceId,
      name: DICTIONARY_NAME,
      entries: ENTRIES,
    });
    let datasetId: string | undefined;
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      datasetId = await importDatasetViaUi({
        page,
        filePath: MEASLES_LINE_LIST_CSV_PATH,
        expectedRowCount: MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await _attachDictionary(page);
      await _expectCodesOnDatasetPage(page);
      await _expectCodesInExplorer(page, { admin, datasetId });

      const { data: bindings } = await admin
        .from("dataset_columns__dictionary_bindings")
        .select("mode")
        .eq("dataset_id", datasetId)
        .throwOnError();
      expect(
        bindings.map((binding) => {
          return binding.mode;
        }),
      ).toEqual(["reference", "reference", "reference"]);
    } finally {
      await admin.from("data_dictionaries").delete().eq("id", dictionaryId);
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
    }
  });

  test("Ask Avandar answers a question in labels from the code list, offline", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    const dictionaryId = await seedDataDictionary({
      admin,
      workspaceId,
      name: DICTIONARY_NAME,
      entries: ENTRIES,
    });
    let datasetId: string | undefined;
    let onlineAgentRequestCount = 0;
    await page.route("**/functions/v1/chat/*/agent/**", async (route) => {
      onlineAgentRequestCount += 1;
      await route.abort();
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("avandar:data-agent", "on");
      window.localStorage.setItem("avandar.offlineChat.isOfflineModeOn", "on");
      window.localStorage.setItem(
        "avandar.offlineChat.downloadedModels",
        JSON.stringify({ "Qwen3-4B-q4f16_1-MLC": true }),
      );
      // A placeholder, so the app picks the scripted model. The test fills
      // in the real script once it knows the dataset's alias.
      Object.assign(window, {
        __AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__: [
          { match: "never matches", response: "{}" },
        ],
      });
    });
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      datasetId = await importDatasetViaUi({
        page,
        filePath: MEASLES_LINE_LIST_CSV_PATH,
        expectedRowCount: MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await _attachDictionary(page);
      const alias = await _getAlias(admin, { workspaceId, datasetId });
      await page.evaluate((script) => {
        Object.assign(window, { __AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__: script });
      }, _buildOfflineScript(alias));

      await page
        .getByRole("link", { name: "Data Explorer", exact: true })
        .click();
      await openAgentChat(page);
      const composer = page.getByLabel("Message", { exact: true });
      await composer.fill("How many female cases were hospitalized?");
      await composer.press("Enter");

      await expect(
        page.getByText("One female case was hospitalized."),
      ).toBeVisible({
        timeout: LONG_WAIT,
      });
      await expect(
        page.getByRole("columnheader", { name: /female_hospitalized/ }),
      ).toBeVisible();
      expect(onlineAgentRequestCount).toBe(0);
    } finally {
      await admin.from("data_dictionaries").delete().eq("id", dictionaryId);
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
    }
  });
});
```

- [ ] **Step 3: Follow Save's new default in slice 2's spec.**

`tests/e2e/dictionary-create-from-dataset.spec.ts`:

```diff
--- a/tests/e2e/dictionary-create-from-dataset.spec.ts
+++ b/tests/e2e/dictionary-create-from-dataset.spec.ts
@@ -1,11 +1,12 @@
 /*
  * A workspace owner imports a small line list, opens "Create a dictionary
  * from this dataset" from its menu, has the values of gender suggested, and
- * saves with hosp_yn still unlabeled. The first test agrees to the consent
- * prompt and answers suggestions from a stubbed online route. The second
- * runs them on the scripted offline model and checks that no prompt opened
- * and nothing went online. The imported dataset is a precondition. Everything
- * the tests create is deleted afterwards.
+ * saves with hosp_yn still unlabeled, which opens Apply for the dataset. The
+ * first test agrees to the consent prompt and answers suggestions from a
+ * stubbed online route. The second runs them on the scripted offline model
+ * and checks that no prompt opened and nothing went online. The imported
+ * dataset is a precondition. Everything the tests create is deleted
+ * afterwards.
  */
 import { expect, test } from "./fixtures/e2e.fixture";
 import { signInWithEmailPassword } from "./helpers/auth";
@@ -137,9 +138,21 @@
       await page
         .getByRole("textbox", { name: "Dictionary name" })
         .fill(DICTIONARY_NAME);
+      await expect(
+        page.getByRole("checkbox", { name: /^Apply it to .+ next$/ }),
+      ).toBeChecked();
       await page.getByRole("button", { name: "Create dictionary" }).click();
 
+      // Saving opens Apply with the new dictionary in use. Leave it and
+      // open the dictionary from the list.
       await expect(
+        page.getByRole("button", { name: `Stop using ${DICTIONARY_NAME}` }),
+      ).toBeVisible({ timeout: LONG_WAIT });
+      await page.getByRole("button", { name: "Cancel" }).click();
+      await page
+        .getByRole("link", { name: DICTIONARY_NAME, exact: true })
+        .click();
+      await expect(
         page.getByRole("heading", { name: DICTIONARY_NAME }),
       ).toBeVisible({ timeout: LONG_WAIT });
       await expect(
```

- [ ] **Step 4:** Stop any `pnpm dev` in this worktree first: the Playwright config starts its own Vite and refuses a busy port. Run each spec on its own: `pnpm test:e2e dictionary-apply-reference.spec.ts`, then `pnpm test:e2e dictionary-create-from-dataset.spec.ts`. Expected: PASS, each test well under 45 s. If the Apply pick is not pressed in time, check that `useDatasetProfiles` refetches on mount (`ALWAYS_REFETCH_ON_MOUNT`); never raise the timeout. If a test fails midway, check that its `finally` removed the dictionary and the dataset (`select id from data_dictionaries where name like 'E2E line list codes%'` on the local stack must return nothing).
- [ ] **Step 5:** Run the three specs whose stream route Task 21 changed, one at a time: `pnpm test:e2e agent-chat-result.spec.ts`, `pnpm test:e2e agent-chat-sessions.spec.ts`, `pnpm test:e2e agent-chat-mentions.spec.ts`. Expected: PASS.
- [ ] **Step 6: Commit** the three files as `test(data-dictionaries): apply a dictionary as reference end to end`.

---

### Task 29: Look at it, design detector, translations, feature log

**Files:**
- Modify: `src/i18n/locales/*/messages.po|ts` (generated)
- Modify: `docs/measles-demo/pr-feature-log.md`
- Modify (only when a later decision changes them): `docs/measles-demo/data-dictionaries-design.md`

- [ ] **Step 1: Capture the prototype.** With a headless Playwright session (the Playwright MCP, or `pnpm exec playwright` in a scratch script), open `file://<worktree>/.impeccable/mocks/prototype/data-dictionaries.html` and capture into `.temp/feat-attach-dictionaries/`: from its guide, "Dataset with codes attached" (the column list with tags, GENDER's popover open, the rail's Dictionaries group, and Ask Avandar open) as `prototype-dataset-*.png`; "Dataset with no dictionary" with its ⋯ menu open as `prototype-menu.png`; "Apply to an uploaded dataset" on Match columns (with a coded column selected) and on Attach as `prototype-apply-*.png`; and "Dictionary" on its Used by tab as `prototype-used-by.png`.
- [ ] **Step 2: Capture the app.** Run `pnpm dev`. Headless, sign in with the seeded credentials from `seed/SeedData.ts` (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, workspace `TEST_WORKSPACE_SLUG`), import `tests/data/measles-line-list-small/measles-line-list-small.csv`, and create a dictionary from it through slice 2's flow. Capture into `.temp/feat-attach-dictionaries/` as `app-*.png`: the Save step with "Apply it to <dataset> next"; Match columns as it opens, with `GENDER` selected, and with "Show n columns with no match" expanded; Match columns at 900 px wide (the pane drops under the table); Attach; the dataset page after attaching (the column list with tags and the `case_id` description, the popover opened by keyboard focus, the rail, the Data Summary tab); the ⋯ menu before and after attaching; the dictionary's header and Used by tab; the "Apply to a dataset" dialog; a Data Explorer result with the `GENDER` tag; and an Ask Avandar answer to "How many female cases were hospitalized?" (online if `OPEN_ROUTER_API_KEY` is in `supabase/functions/.env`, else offline after downloading the bundle, or note that it was not captured).
- [ ] **Step 3: Compare.** Put each app capture beside its prototype capture. Fix what differs from the prototype or from `docs/design/app-view-layout.md`, except what this plan's Refinements change on purpose: no conversion controls (global switch, pane switch, direction switch, row chip) and no Values column, two steps instead of three, no preview drawer, the menu's reference-only sub-line, the entry description under the column name, no rail group while nothing is attached, and no Re-apply. Check: no `Paper` or `Card` between the slate and the content, no `Callout color="info"`, more space above a heading than below, every sticky footer carries `data-sticky-action-bar`, tables fill the content column, the popover opens on focus and hover and closes on Escape, and the visible text starts every pick's accessible name.
- [ ] **Step 4:** `.claude/skills/impeccable/scripts/impeccable detect --json src/views/DataManagerApp/ApplyDictionariesView src/components/dataDictionaries/CodeListPopover src/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes src/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab src/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep`. Fix every mechanical finding; list the rest in the PR description.
- [ ] **Step 5:** `pnpm i18n:extract && pnpm i18n:compile`. Confirm `src/i18n/locales/en/messages.po` has `#:` references to `ApplyDictionariesView/` and `CodeListPopover/`. Commit `src/i18n/locales` as `chore(data-dictionaries): extract attaching messages`. (The pre-push hook adds machine translations; that is expected.)
- [ ] **Step 6: Log the feature.** In `docs/measles-demo/pr-feature-log.md`:
  - add a Features table row after F130: `| F131 | Apply a dictionary to a dataset as reference: code lists on the dataset page, in the Data Explorer, and in Ask Avandar online and offline | not started | F129, F130 | |`
  - add a Merge order row after F130's: `| after F130 | F131 | Builds on F129's tables and Dictionary view and F130's profiling, create flow, and dataset menu item. Adds the bindings table and the apply RPC (migration) and prompt \`data-agent-v4\`. Deploy the migration, then the \`chat\` edge function (it serves v4 and reads bindings, and the new frontend asks for v4), then the frontend. |`
  - add a `## F131: Apply a dictionary to a dataset as reference` section after F130's, in its format: Status (built on `feat/attach-dictionaries`, branched from `demo/measles` at `71a2a4769`); Purpose (someone who can edit a dataset applies one or more dictionaries to it from its ⋯ menu, from a dictionary's "Apply to a dataset", or right after creating one; columns are matched to entries on the device; attaching stores a reference binding per column and changes no value; bound columns show their code list in a popover on the dataset page, Data Summary, and the Data Explorer grid; the dataset rail and the dictionary's Used by tab show where a dictionary is applied; Ask Avandar reads the code lists online through prompt v4 and offline through its profile, question values, and `lookup_values`); Value (a coded column explains itself wherever it is read, and "how many female cases" becomes `"GENDER" = 2` without anyone remembering the code); Design (the spec and this plan); PR title `feat(data-dictionaries): apply dictionaries to datasets as reference`; Depends on F129 and F130; Files by area with each area's commit SHAs (list them with `git log --oneline 71a2a4769..HEAD` and put each short SHA beside the files it touched: schema, migration, desktop twin, sync list, and pgTAP; shared models; client, loaders, and hooks; the popover; the dataset page and menu; the route, link, and list toggle; the apply flow; the Save step; the Dictionary view; the Data Explorer; prompt v4 and the `chat` function; the legacy schema block and offline pipeline; the browser's agent datasets; the offline agent; `lookup_values`; evals; e2e; translations; this plan); Schema: yes, one migration (`dictionary_bindings`) with two enums, the bindings table (select-only for signed-in users), its triggers, and `rpc_dataset_columns__apply_dictionaries`, plus its desktop SQLite twin and the table in `apps/desktop/sync/syncable-tables.ts`; Deploy: the migration first, then the `chat` edge function, then the frontend (tabs opened before the deploy keep asking for v3, which the function still serves); Known gaps (conversions, linked datasets, unmatched values, the preview drawer, Re-apply, and the synced-data warning are slice 4; crosswalks are slice 5; "Add from datasets" into an existing dictionary is a separate small piece; the open questions at the end of this plan); and Verification (the commands in Task 30).
  - for each file below that already has a row under **Files shared by several features** (`grep -n "<path>" docs/measles-demo/pr-feature-log.md`), add F131 to the row with one sentence on its hunks; add a row for any that another feature also changed: `DatasetMetaView.tsx`, `DatasetMetadataList.tsx`, `DatasetSourceRail.tsx`, `DatasetSummaryView.tsx`, `DatasetActionsMenu.tsx`, `DataExplorerApp.tsx`, `DataGridColumnTitle.tsx`, `AppLinks.tsx`, `buildDataAgentSystemPrompt.ts`, `dataAgentTools.ts`, `SqlTableAliasModule.ts`, `offlineChat.types.ts`, `dataAgentTurnHelpers.ts`, `fetchOfflineChatSchema.ts`, `loadDataAgentDatasets.ts`, `fetchWorkspaceSchema.ts`, `profileOfflineDatasets.ts`, `buildOfflineDataAgentSystemPrompt.ts`, `findQuestionValues.ts`, `lookupValuesTool.ts`, `createDataAgent.ts`, `syncable-tables.ts`, `exact_data_api_grants.test.sql`, and the `scripts/ai-eval/` runner files.
- [ ] **Step 7:** Commit the log as `docs(measles-demo): log attaching dictionaries as reference`.

---

### Task 30: Final verification

Run each command and read its real exit code (not through `head`).

- [ ] `ava supabase status`. Expected: it names `feat-attach-dictionaries` as this branch's switched project.
- [ ] `pnpm lint`
- [ ] `pnpm exec tsc -b --force --noEmit && pnpm type-check:deno`
- [ ] `deno info --config supabase/functions/chat/deno.json supabase/functions/chat/index.ts 2>&1 | grep -iE "error|not found|unable to"`. Expected: no output.
- [ ] `pnpm test:frontend`
- [ ] `pnpm vitest run --config vitest.executed.config.ts src/lib/agent/dataAgent/pagePrivacy src/lib/dataDictionaries`
- [ ] `pnpm test:db` (the two new pgTAP files, the grants contract, slices 1 and 2 unchanged, and the privilege reconcile step)
- [ ] `ava supabase migrations validate`
- [ ] `pnpm desktop:sqlite:gen-migrations`, then `git status`: no new or changed file (Task 3 committed the twin). Then `pnpm test:desktop`.
- [ ] `pnpm i18n:check`
- [ ] Stop Task 29's `pnpm dev`, then one at a time: `pnpm test:e2e dictionary-apply-reference.spec.ts`, `pnpm test:e2e dictionary-create-from-dataset.spec.ts`, `pnpm test:e2e data-dictionary-edit.spec.ts`, `pnpm test:e2e agent-chat-result.spec.ts`, `pnpm test:e2e agent-chat-sessions.spec.ts`, `pnpm test:e2e agent-chat-mentions.spec.ts`, `pnpm test:e2e data-explorer-grid-layout.spec.ts` (grid headers now read a context), `pnpm test:e2e web-offline-mode.spec.ts` (the offline schema now loads column codes)
- [ ] `git status` is clean apart from generated files already committed. Leave the `ava supabase switch` in place (it changes no tracked file).

---

## Executing this plan in batches

The tasks are ordered so each batch can go to one subagent, with independent batches in parallel. Task 0 runs first, by the coordinating session. Parallel batches share one worktree: each commits only its own paths, by name, and retries a commit that meets `index.lock`.

| Batch | Tasks | Needs | Runs alongside |
| --- | --- | --- | --- |
| S: schema | 1, 2, then 3 | Task 0, with `ava supabase status` naming `feat-attach-dictionaries` | none |
| A: shared models | 4, 5, 6 (any order) | S (Task 3's generated types) | none |
| B: client and hooks | 7, then 8 | A | none |
| G: agent context | 21, then 22, 23, 24 (any order), then 25 and 26 | B (Tasks 23 and 24 use Task 7's `loadColumnCodes`) | D, C, E, F |
| D: apply flow | 12, 13, 14, 15, 16, 17 (in order) | A, B | G |
| C: dataset page and popover | 9, 10, 11 (in order) | B, and D's Task 12 (Task 11 links to the apply route) | G, the rest of D |
| E: entry points | 18, then 19 | D | G, F |
| F: Data Explorer | 20 | B, and C's Task 9 (the popover) | G, E |
| H: eval | 27 | G | I |
| I: e2e | 28 | C, D, E, F, G | H |
| J: finish | 29, then 30 | H, I | none |

Every batch ends with its own tests green and a commit per task. Review between batches with the `avandar-code-review` skill.

---

## Refinements made while planning

These override the spec where they differ.

- **Bindings are written by one RPC only.** The spec's section 11 row let dataset editors insert and update bindings directly. Here signed-in users can only read them, and `rpc_dataset_columns__apply_dictionaries` replaces a dataset's set whole, after checking dataset editor and Data Sources viewer, every id's dataset, dictionary, entry, and code list, and the workspace. That puts every cross-table rule in one place that cannot be skipped from the browser, as `rpc_data_dictionaries__save` does for dictionaries. Spec section 11 is edited to match.
- **Reference only, with room for conversions.** The table stores `mode` and `direction` now (`reference` / `decode` by default), so conversions add columns without a destructive migration. The RPC refuses `convert` with `binding_mode_unsupported` until conversions exist. The columns conversions need (`keeps_original`, `value_overrides`, `pinned_pairs`) are not created yet; spec section 4's binding paragraph says so.
- **Convert controls are hidden, not disabled (copy handling).** With one mode available, the global "Convert all / Attach dictionaries only as references" switch, the pane's "Apply conversions / Attach labels only as reference" switch, the direction switch, the row's mode chip, and the pairing table's Values column would be controls that do nothing. The pane says "How to apply the dictionary: Attached as reference" with the spec's reference explanation, the Attach step uses the spec's reference copy ("Nothing in your data changes. ..."), and the summary reads "Attached as reference, values unchanged".
- **Two steps: Match columns and Attach.** The spec's Unmatched values step and the preview drawer only matter when values are converted, so they come with conversions.
- **The menu's sub-line is reference-only.** "Apply a dictionary" reads "Show what codes mean and add column descriptions" instead of the spec's "Turn codes into labels and add column descriptions", which promises a conversion this slice cannot make. Restore the spec's copy when conversions ship.
- **Deleting dictionary rows.** Deleting a dictionary or an entry removes its `reference` bindings first (a `convert` binding will be pinned instead, when conversions exist). A deleted code list leaves the binding with its entry and description (`on delete set null`), and the column loses its tag. Slice 1's save keeps a list's id when the list is edited, so edits reach every bound column at once; only deleting the list (for instance, replacing an entry's list with a new one and removing the old) leaves the binding without one until Apply runs again. Spec section 14 gains that row (see Open questions).
- **The entry description shows under the column name.** `ObjectDescriptionList` hands a cell only its own value, never its row, so the Description cell cannot know its column. The entry's description, captioned "From <dictionary>", goes under the column name instead, and only when the column has no description of its own.
- **The rail group shows only when something is attached.** An empty "Dictionaries" group would be chrome with nothing in it.
- **The Data Explorer tags plain columns only.** A header gets the tag when its projection is a plain, unaggregated column of one dataset. The SQL projection reader returns nothing for a `GROUP BY` with `count(*)`, so a grouped SQL result shows no tag yet (see Open questions).
- **Prompt v4 lists codes on their own line.** Spec section 10's inline `GENDER int codes 1=Male, 2=Female` would mix the codes' commas with the commas between columns, so each bound column gets a sub-line under its dataset. Descriptions go to the online data agent only, as spec section 10 says; the offline profile lists codes without them. Spec section 10's Pi row is edited to match.
- **`lookup_values` answers from code lists without approval.** A code list is metadata the model already sees, not row data, so a code-list answer runs no query, shows no card, and asks nothing. Data matches are approved as before, and an empty match list no longer asks for approval.
- **Apply opens with the existing bindings.** Re-opening Apply on a bound dataset starts from what is attached, and clearing every pick offers "Remove dictionaries from <dataset>".
- **Which dictionaries are in use at first.** A dataset with bindings opens with them and the dictionaries they use. Otherwise, opened from the dataset menu, Apply uses every dictionary that matches at least one column, ranked by how many columns it covers, then in list order. Opened from a dictionary (Save, or "Apply to a dataset"), that dictionary is the only one used for new picks, and stays in use even when nothing matches.
- **Save's hand-off with several datasets.** The toast names the other datasets in text (notifications take text, not links) and tells the user to apply from each dataset's menu.
- **"Apply to a dataset" lists the workspace's datasets.** The dialog does not filter by edit rights (that needs a permission read per dataset); the apply view refuses a dataset the user cannot edit, with the spec's message.
- **The step is not in the URL.** Every step needs the profile read on the device, so a reloaded step URL would have nothing to show. Only the preselected `dictionaryId` is a search param.
- **The legacy baseline eval harness is not extended.** It cannot read code lists; a measles run refuses it.
- **The e2e online path checks the route, not the server's prompt.** The stubbed stream answers whatever it is sent, so the spec asserts the v4 route only, and the server's prompt is covered by unit tests and Task 27's eval.

### Spec edits made with this plan

`docs/measles-demo/data-dictionaries-design.md`, four edits:

1. Section 4, after the paragraph on a binding with no `entry_id`: this slice creates the bindings table without `keeps_original`, `value_overrides`, and `pinned_pairs` (conversions add them, non-destructively), and bindings are select-only, written by `rpc_dataset_columns__apply_dictionaries`.
2. Section 10, the Pi data agent row: each bound column's codes and description go on a sub-line under its dataset.
3. Section 11, the bindings row: no direct writes; the RPC checks dataset editor and Data Sources viewer.
4. Section 14, a new row, "A code list a binding uses is deleted": the binding keeps its entry and description and shows no code list until a dictionary is applied again, since a save can delete the list before it adds the entry's new one.

## Owner decisions kept

- The dataset ⋯ menu has "Apply a dictionary" for someone who can edit the dataset and read dictionaries, and "Create a dictionary from this dataset" only while no dictionary is applied (Task 11).
- Save's "Apply it to <dataset> next", checked by default: one dataset opens Apply with the new dictionary in use; several open the first and name the rest in the toast (Task 18).
- Reference only in this slice, with `mode` and `direction` stored so conversions need no destructive migration (Tasks 1, 2).
- Blank labels: the popover and the Match pane say "No label yet", prompts write `9=(no label)`, and the agent is told never to guess what an unlabeled code means (Tasks 5, 9, 15, 21, 25; eval D04).
- "Add from datasets into an existing dictionary" stays out.
- Offline parity: the bindings sync to the desktop (Task 3), the offline agent and pipeline read code lists (Tasks 23 to 26), and the e2e asks a coded question offline (Task 28).
- The synced-data warning stays out (slice 4).

## Open questions for the product owner

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | The entry description shows under the column name, because the description cell cannot see its row. Should `ObjectDescriptionList` pass the row to `renderValue` so it can sit in the Description column as designed? | Ship under the name now; extend `ObjectDescriptionList` in a small follow-up, since other lists use it too. |
| 2 | Save's toast names the other datasets as text. Should it link to each? | Keep text. A toast that disappears is a poor place for several links; the dictionary's Used by tab and each dataset's menu are where the next apply starts. |
| 3 | "Apply to a dataset" lists every workspace dataset, and the apply view refuses one the user cannot edit. Should the list show only editable datasets? | Later, with a server-side list of datasets the user can edit, when that read exists for other features. |
| 4 | Opened from a dataset's menu, Apply starts with every dictionary that matches a column. Should it start with none, and let the user add them? | Keep automatic: most workspaces will have one or two dictionaries, and each is removable with one click. |
| 5 | When an entry's list is replaced by a new one and the old list is deleted in the same save, a reference binding loses its list (it keeps its entry and description) until Apply runs again. Should the save re-point bindings to the entry's new primary list? | Leave it for this slice (the column keeps its description, and the tag returns on the next apply); decide it with conversions, where a convert binding must be pinned rather than re-pointed. |
| 6 | When conversions ship, should the menu's sub-line go back to the spec's "Turn codes into labels and add column descriptions"? | Yes, restore it then. |
| 7 | A grouped SQL query (`GROUP BY` with `count(*)`) shows no tag in the Data Explorer, because the SQL projection reader returns nothing for it. Extend the reader? | Later, as its own change to the projection reader; the query builder's grouped columns are tagged already. |
| 8 | Should the offline coded-column score gate the release? | Record it, do not gate: the offline model's scores move between runs (26 to 28 of 45), and four questions are too few to gate on. |

## Verification done while planning

All the code in this plan was written into a scratch copy of the worktree at `71a2a4769` and checked there:

- Vitest: 332 files and 2,584 tests passing, covering every suite this plan adds or changes (including `scripts/ai-eval`).
- `tsc -p tsconfig.app.json --noEmit`: clean, apart from a `simple-statistics` resolution error that comes from the scratch copy (the plugins' `node_modules` were not linked) and exists without these changes.
- `deno check` on `supabase/functions/chat/index.ts` and `shared/`: clean. `deno info --config supabase/functions/chat/deno.json supabase/functions/chat/index.ts`: no resolution errors.
- ESLint and stylelint: clean. `oxfmt` applied.
- TanStack Router's generator, run on the new route file: id `/_auth/$workspaceSlug/data-manager/$datasetId_/apply-dictionaries`, path `/$datasetId/apply-dictionaries`, under the data manager and outside the dataset view.
- ag-grid reads a React context in a custom header under jsdom (Task 20's test).
- DuckDB over the measles CSV: the truth counts 1, 11, and 3 for D01 to D03.
- Prompt v3's instructions: 6,828 characters, SHA-256 `251d390134571b4ab6200d01a9641fae13cd9eda35909f6def1ceee9e6ec824b`, pinned by Task 21's test.

Not run, because planning used no database and no network: pgTAP, the migration, `pnpm db:gen-types` (the scratch copy's `database.types.ts` was written by hand to match Task 1's table; Task 3 regenerates it, and a difference shows up as a type error in Tasks 4 and 7), the desktop migration generator, e2e, and the evals.
