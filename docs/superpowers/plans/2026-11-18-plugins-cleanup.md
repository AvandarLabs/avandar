# Plugins Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every open plugin follow-up before feature B: a dataset delete that sees past the read policy and tells "gone" from "forbidden", desktop IPC replies routed by request id, the demo/measles switch rule, translated plugin errors, the automatic LIMIT outside the derived-columns wrap, a quote-aware single-expression check, fit eval questions that run alone, and the small items.

**Architecture:** One branch, `fix/plugins-cleanup`, cut from local `demo/measles` at `17cf430c4`. Task 1 is the only schema change: an enum and two SECURITY DEFINER rpcs, which `DatasetClient.fullDelete` then calls instead of reading the row under the user's own access. The other tasks are independent frontend, desktop, script, and docs changes. Each task ends in a commit.

**Tech Stack:** Postgres 15 (Supabase declarative schema, pgTAP), TypeScript, React 19, Mantine, Lingui, Vitest (jsdom and node), DuckDB (executed tests), Electrobun IPC, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-plugins-cleanup-design.md`. Read it first. Pablo approved every decision in it one at a time. Do not reopen them.

**Rules to read:** `CLAUDE.md` (scope, TDD, naming, comments, i18n, the Supabase switch rules, E2E rules), `docs/rules/typescript.md` (`function` keyword, `_` prefix for private helpers, block-bodied arrows with `return`, functions of 45 lines or fewer, no `for` loops, readonly inputs), `docs/rules/sql.md`, `docs/rules/testing.md`, `docs/rules/i18n.md`, and `docs/plugin-authoring.md` section 10 (the plugin import allowlist).

**Branch:** `~/src/worktrees/avandar/fix/plugins-cleanup`. No upstream on purpose. Do not push. Merge into `demo/measles` only with Pablo's explicit approval: a push to `demo/**` deploys. Never stage `supabase/config.toml` or `.env.development`. Stage files by path, never with `git add -A`.

**Risk and review:** Three plan tasks are HIGH-RISK and get an Opus (xhigh) task-level review after their unit reviews pass:

- Task 1 (both units): data loss, a migration, and a security definer delete.
- Task 2: IPC routing under concurrency.
- Task 6: the SQL injection guard for plugin expressions.

---

## Deviations from the spec

None of these changes a decision. Each one follows the code where the spec did not name a file or a case.

1. **Section 5 names two hops, the code has four.** `useDataQuery` (`src/views/DataExplorerApp/useDataQuery/useDataQuery.ts`) sits between `runStructuredQueryWithMetadata` and `DataExplorerApp`, so it also carries `unlimitedSql` and `autoLimit`. `DataExplorerBridge` gains an optional `rowLimit`, and `addColumnsForInvocation` passes it to `makeDerivedColumnsSqlFromColumns`.
2. **Section 5, what `unlimitedSql` is built from.** `makeExecutableQueryFromManualQuery` also resets aggregations a list cannot take. `unlimitedSql` is built from the query that function returns with only the automatic limit taken back out. Built from the raw query instead, it could differ from the executed SQL in more than the limit, and the wrap would read a different query than the one on screen.
3. **Section 6, escape strings and dollar quotes.** The spec's lexer knows `""` and `''`. DuckDB also reads `E'...'` (where `\'` is a quote) and `$$...$$`, and a lexer that does not know them disagrees with DuckDB on where they end: `E'\'' ; SELECT 1 --'` would pass with a live `;`. So the quote-aware relief applies only when the expression has no `E'`/`e'` string, no `$`, and no backtick outside quotes. Otherwise today's whole-text rule applies. Every expression the epidemiology plugin builds gets the relief.
4. **Section 8, stale group-by.** The symptom in 1b follow-up 6 (the group-by reappears) no longer reproduces: `ColumnPickers` writes back the value `useRollingAverageForm` already normalized, so the stale group-by lives only in the hook's state. The task still normalizes at write time, as decided. Its test is a guard that passes before the change, proved able to fail by a mutation step.
5. **Section 8, 1b test gaps.** 1b follow-up 5 lists three gaps. The spec's row names two. The plan also closes the third (the integration test's stand-in slot repeats `DOUBLE_REVENUE`), so follow-up 5 can be marked closed.
6. **Section 8, the Undo name.** Testing Library matches a string name exactly, so `notifyDerivedColumnsAdded.test.tsx` and `pluginDerivedColumns.integration.test.tsx` change to "Undo added columns". `tests/e2e/plugins-epidemiology-incidence.spec.ts:150` keeps `name: "Undo"`: Playwright matches a substring by default.
7. **Section 7, where the pool lives.** `runEval.ts` calls `main()` on import, so a test cannot import `_runAll` from it. The pool moves to `scripts/ai-eval/runtime/runEvalConversations/runEvalConversations.ts`.
8. **Section 3, what else in `CLAUDE.md` changes.** The intro sentence above the section (lines 152-153) and the Migrations bullet that names the old heading (lines 238-241) change with it. The new section keeps the list of what the local stack is built from, because the unchanged "Check the switch BEFORE..." section refers to "the changes listed above".
9. **Verification adds commands** the brief did not list, because the changed tests live where the listed ones do not reach: `pnpm test:desktop` and `pnpm type-check:desktop` (the IPC tests), `pnpm type-check:deno` (`shared/` and `packages/shared/`), `pnpm test:executed` (the DuckDB wrap test), and `ava plugin validate epidemiology` (the plugin locale).

**Checked as the spec asked (section 1):** on desktop, `options.client.delete` is `createSqliteCrudClient`'s `delete` (`packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.ts:231-236`), which sends one `delete from datasets where id = ?` over IPC to `registerRdbHandlers` (`apps/desktop/main/ipc/registerRdbHandlers/registerRdbHandlers.ts:35-42`). Nothing queues a server delete, so it cannot fail or loop for a row the server no longer has. On web it is a Data API `DELETE` that matches no row once the rpc has deleted it.

**Not covered, on purpose:** `caseEpicurve.failed` (`plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/useCaseSlotRows.ts:35`) still puts the host message inside its sentence. The spec's section 4 covers the add-columns forms only.

---

## File map

| Task | Files |
| --- | --- |
| 0. Switch | None (local stack only) |
| 1a. Delete rpcs | Create `supabase/schemas/00.enum.datasets__delete_status.sql`, `supabase/schemas/50.rpc_datasets__get_delete_target.sql`, `supabase/schemas/50.rpc_datasets__delete.sql`, `supabase/tests/database/datasets/rpc_datasets__delete.test.sql`. Generated: `supabase/migrations/<timestamp>_add_dataset_delete_rpcs.sql`, `apps/desktop/migrations/<timestamp>_add_dataset_delete_rpcs.gen.sql`, `shared/types/database.types.ts` |
| 1b. `fullDelete` | `src/clients/datasets/DatasetClient/createDatasetMutations.ts` (+ `.test.ts`), `DatasetDeleteError.ts`, `src/hooks/datasets/useNotifyDatasetDeleteError/useNotifyDatasetDeleteError.ts` (+ `.test.ts`), `src/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetCard.test.tsx`, `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.test.tsx`, `docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md` |
| 2. IPC routing | `shared/platform/ipc/client.ts` (+ `.test.ts`), `apps/desktop/main/ipc/desktopIpcBridgeScript/desktopIpcBridgeScript.ts`, create `.../desktopIpcBridgeScript/desktopIpcBridgeScript.test.ts`, `apps/desktop/main/ipc/createIpcServer/createIpcServer.test.ts`, the uninstall spec |
| 3. Switch rule | `CLAUDE.md`, `docs/superpowers/2026-11-09-plugins-1b-handoff.md`, `2026-11-10-plugins-1c-handoff.md`, `2026-11-16-plugins-1d-handoff.md` |
| 4. Plugin errors | `plugins/epidemiology/src/derivedColumns/useAddColumns.ts`, `AddColumnsFooter.tsx`, create `derivedColumns/getAddColumnsErrorKeyFromCode/getAddColumnsErrorKeyFromCode.ts` (+ `.test.ts`), `incidence/IncidenceModal/IncidenceForm.tsx`, `useIncidenceForm.ts`, `IncidenceModal.test.tsx`, `rollingAverage/RollingAverageModal/RollingAverageForm.tsx`, `useRollingAverageForm.ts`, `RollingAverageModal.test.tsx`, `plugins/epidemiology/locales/en.json`, `docs/plugin-authoring.md` |
| 5a. Unlimited SQL | `src/clients/queries/runStructuredQuery/runStructuredQuery.types.ts`, `runStructuredQueryWithMetadata.ts`, `runStructuredQuery.test.ts`, `src/views/DataExplorerApp/useDataQuery/useDataQuery.ts` (+ `.test.tsx`) |
| 5b. Limit outside the wrap | `src/lib/plugins/DataExplorerBridge.types.ts`, `src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns.ts` (+ both tests in `__tests__/`), `src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.ts` (+ `.test.ts`), `src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.ts` (+ `.test.tsx`), `src/views/DataExplorerApp/DataExplorerApp.tsx`, `src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx`, `docs/plugin-authoring.md` |
| 6. Quote-aware check | `src/lib/sql/assertSingleSqlExpression/assertSingleSqlExpression.ts` (+ `.test.ts`), `makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.test.ts`, `docs/plugin-authoring.md` |
| 7. Eval | `scripts/ai-eval/selectEvalQuestions.ts` (+ `.test.ts`), create `scripts/ai-eval/runtime/runEvalConversations/runEvalConversations.ts` (+ `.test.ts`), `scripts/ai-eval/runEval.ts` |
| 8. Epidemiology small items | `plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.ts`, `rollingAverage/RollingAverageModal/useRollingAverageForm.ts`, `RollingAverageModal.test.tsx`, `fitRegression/runFitRegression.ts` (+ `.test.ts`), `caseEpicurve/CaseEpicurveModal/useContainerWidth.ts`, `CaseEpicurveModal.test.tsx` |
| 9. Test gaps and Undo | `plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.test.tsx`, `RollingAverageModal.test.tsx`, `src/lib/plugins/PluginMenuSlot/PluginMenuSlot.test.tsx`, `src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx`, `src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.tsx` (+ `.test.tsx`) |
| 10. Manifest and prompt | Move `packages/shared/plugin-manifest/src/node/emitPluginAiTools.ts`, `emitPluginAiTools.main.ts`, `__tests__/emitPluginAiTools.integration.test.ts` into `src/node/emitPluginAiTools/`. Modify `src/node/index.ts`, `src/runtime.ts`, `README.md`, `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts` |
| 11. Catalogs | `src/i18n/locales/*/messages.po` and `messages.ts` |
| 12. Verify, handoffs | `docs/superpowers/2026-11-09-plugins-1b-handoff.md`, `2026-11-10-plugins-1c-handoff.md` |

Task order: 0, then 1a before 1b. Task 4 before Task 8 (both edit `useRollingAverageForm.ts`). Task 5b before Task 9 (both edit the integration test). Task 11 after every task that adds a string (1b, 9). The rest are independent.

---

### Task 0: Switch the local stack

**Unit:** support work. No code.

`demo/measles` never merges into develop, so the shared `avandar` stack lacks its migrations, and Task 1 adds a migration. Nothing in this plan may touch the database before `ava supabase status` names `fix-plugins-cleanup`.

- [ ] **Step 1: Build the local CLI.** The global `ava` binary is stale (it points at another worktree). Do not relink it.

  ```bash
  pnpm --filter @avandar/ava-cli build
  node apps/ava-cli/dist/main.cjs supabase status
  ```

  Expected: the first line says this is the develop local Supabase, which is the shared stack.

- [ ] **Step 2: Switch.**

  ```bash
  node apps/ava-cli/dist/main.cjs supabase switch
  ```

  The project id is `fix-plugins-cleanup` (the branch kebab-cased). The switch seeds the new stack.

- [ ] **Step 3: Copy the edge function env.** Without it, edge functions crash with "supabaseKey is required".

  ```bash
  pnpm fns:update-env
  ```

- [ ] **Step 4: Confirm.**

  ```bash
  node apps/ava-cli/dist/main.cjs supabase status
  ```

  Expected: the first line names `fix-plugins-cleanup`. Do not continue until it does.

- [ ] **Step 5: Count containers.** `docker ps -q | wc -l`. If more than about 40 run, tell the controller: too many stacks make database tests and E2E time out.

Nothing to commit. A switch changes no tracked file.

---

### Task 1: Dataset delete without guesswork (HIGH-RISK: data loss, migration, security)

Closes the uninstall spec's two dataset "Known limit" notes. Two units: 1a (the database) and 1b (the client). Run the task-level review on Opus (xhigh) once both units pass their unit reviews, over the diff from the commit before Unit 1a to Unit 1b's last commit.

#### Unit 1a: The delete status enum and the two rpcs

**Unit:** ordinary.

**Files:**
- Create: `supabase/schemas/00.enum.datasets__delete_status.sql`
- Create: `supabase/schemas/50.rpc_datasets__get_delete_target.sql`
- Create: `supabase/schemas/50.rpc_datasets__delete.sql`
- Test: `supabase/tests/database/datasets/rpc_datasets__delete.test.sql`
- Generated: `supabase/migrations/<timestamp>_add_dataset_delete_rpcs.sql`, `apps/desktop/migrations/<timestamp>_add_dataset_delete_rpcs.gen.sql`, `shared/types/database.types.ts`

Facts this unit depends on (verified):
- `public.util__auth_user_can_delete_resource(resource_type, uuid)` (`16.utils.resource-permissions.sql:573-597`) is the `datasets` DELETE policy's rule. It reads `auth.uid()`.
- `public.util__auth_user_may_select_dataset` is false for a member whose only grant on another user's unrestricted dataset is a `data_sources` app role at editor or above, with no share and no settings admin. A custom role group with `data_sources` admin and nothing else gives exactly that user: may delete, may not read.
- Every foreign key to `datasets` cascades or sets null, and its only delete trigger is the AFTER DELETE analytics emitter (`31.analytics_event_emitters.sql:57`), which logs `auth.uid()` as the actor. A security definer delete keeps that actor.
- `supabase/tests/database/datasets/rpc_datasets__get_editable_ids.test.sql` is the pattern for the fixtures and the `pg_temp` helpers below.

- [ ] **Step 1: Confirm the switch.** `node apps/ava-cli/dist/main.cjs supabase status` names `fix-plugins-cleanup`. If not, stop: Task 0 is not done.

- [ ] **Step 2: Write the failing pgTAP test** at `supabase/tests/database/datasets/rpc_datasets__delete.test.sql`:

  ```sql
  \set ON_ERROR_STOP on

  /**
   * `rpc_datasets__get_delete_target` and `rpc_datasets__delete` tell a
   * dataset the caller may delete from one they may not, and from one that
   * is gone, whether or not the caller can read the row. A dataset admin who
   * cannot read the row may still delete it. A caller who is not signed in
   * learns nothing.
   */
  begin;

  set search_path to extensions, public;

  -- Runs the rest of a helper as `p_user_id`, or as a signed-out caller for
  -- null.
  create function pg_temp.act_as (p_user_id uuid) returns void language plpgsql as $$
  begin
    execute format(
      $s$
        set local role authenticated;
        select set_config('request.jwt.claims', %L, true);
      $s$,
      json_build_object('sub', p_user_id, 'role', 'authenticated')::text
    );
  end;
  $$;

  -- What the delete target rpc answers for a user, as
  -- `status workspace_id source_type`, leaving out null columns.
  create function pg_temp.delete_target_as (p_user_id uuid, p_dataset_id uuid) returns text language plpgsql as $$
  declare
    v_target text;
  begin
    perform pg_temp.act_as (p_user_id);
    select concat_ws(' ', answer.status, answer.workspace_id, answer.source_type)
    into v_target
    from public.rpc_datasets__get_delete_target (p_dataset_id) answer;
    reset role;
    return v_target;
  end;
  $$;

  -- What the delete rpc answers for a user.
  create function pg_temp.delete_as (p_user_id uuid, p_dataset_id uuid) returns text language plpgsql as $$
  declare
    v_status text;
  begin
    perform pg_temp.act_as (p_user_id);
    v_status := public.rpc_datasets__delete (p_dataset_id)::text;
    reset role;
    return v_status;
  end;
  $$;

  -- How many rows of a dataset the user's own SELECT sees.
  create function pg_temp.visible_count_as (p_user_id uuid, p_dataset_id uuid) returns integer language plpgsql as $$
  declare
    v_count integer;
  begin
    perform pg_temp.act_as (p_user_id);
    select count(*)::integer
    into v_count
    from public.datasets dataset
    where dataset.id = p_dataset_id;
    reset role;
    return v_count;
  end;
  $$;

  insert into auth.users (id, email, aud, role)
  values
    ('de100001-0000-4000-8000-000000000001'::uuid, 'delete_owner@test.dev', 'authenticated', 'authenticated'),
    ('de100002-0000-4000-8000-000000000002'::uuid, 'delete_dataset_admin@test.dev', 'authenticated', 'authenticated'),
    ('de100003-0000-4000-8000-000000000003'::uuid, 'delete_viewer@test.dev', 'authenticated', 'authenticated'),
    ('de100004-0000-4000-8000-000000000004'::uuid, 'delete_outsider@test.dev', 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  -- The owner owns the workspace and every dataset in it. The outsider owns
  -- another workspace.
  insert into public.workspaces (id, owner_id, name, slug)
  values
    ('de110001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'delete ws', 'delete-ws'),
    ('de110002-0000-4000-8000-000000000002'::uuid, 'de100004-0000-4000-8000-000000000004'::uuid, 'delete other ws', 'delete-other-ws')
  on conflict (id) do nothing;

  insert into public.workspace_memberships (id, workspace_id, user_id)
  values
    ('de120001-0000-4000-8000-000000000001'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid),
    ('de120002-0000-4000-8000-000000000002'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de100002-0000-4000-8000-000000000002'::uuid),
    ('de120003-0000-4000-8000-000000000003'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de100003-0000-4000-8000-000000000003'::uuid),
    ('de120004-0000-4000-8000-000000000004'::uuid, 'de110002-0000-4000-8000-000000000002'::uuid, 'de100004-0000-4000-8000-000000000004'::uuid)
  on conflict (id) do nothing;

  insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
  values
    ('de130001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de120001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
    ('de130002-0000-4000-8000-000000000002'::uuid, 'de100002-0000-4000-8000-000000000002'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de120002-0000-4000-8000-000000000002'::uuid, 'Dataset admin', 'Dataset admin'),
    ('de130003-0000-4000-8000-000000000003'::uuid, 'de100003-0000-4000-8000-000000000003'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de120003-0000-4000-8000-000000000003'::uuid, 'Viewer', 'Viewer'),
    ('de130004-0000-4000-8000-000000000004'::uuid, 'de100004-0000-4000-8000-000000000004'::uuid, 'de110002-0000-4000-8000-000000000002'::uuid, 'de120004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
  on conflict (id) do nothing;

  -- The dataset admin's only grant: `data_sources` admin, with no settings
  -- role and no share. That makes them an admin of the owner's datasets who
  -- may not read them.
  insert into public.role_groups (id, workspace_id, name, is_builtin)
  values ('de150001-0000-4000-8000-000000000001'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'delete_test_dataset_admin', false);

  insert into public.role_group_app_roles (role_group_id, app, role)
  values ('de150001-0000-4000-8000-000000000001'::uuid, 'data_sources'::public.app_type, 'admin'::public.role_level);

  update public.workspace_memberships
  set role_group_id = 'de150001-0000-4000-8000-000000000001'::uuid
  where id = 'de120002-0000-4000-8000-000000000002'::uuid;

  update public.workspace_memberships wm
  set role_group_id = rg.id
  from public.role_groups rg
  where
    wm.id = 'de120003-0000-4000-8000-000000000003'::uuid and
    rg.workspace_id = wm.workspace_id and
    rg.is_builtin and
    rg.name = 'Global Viewer';

  insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
  values
    ('de140001-0000-4000-8000-000000000001'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de130001-0000-4000-8000-000000000001'::uuid, 'Asked about', 'csv_file'::public.datasets__source_type),
    ('de140002-0000-4000-8000-000000000002'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de130001-0000-4000-8000-000000000001'::uuid, 'Deleted by the dataset admin', 'csv_file'::public.datasets__source_type),
    ('de140003-0000-4000-8000-000000000003'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de130001-0000-4000-8000-000000000001'::uuid, 'Kept', 'csv_file'::public.datasets__source_type),
    ('de140004-0000-4000-8000-000000000004'::uuid, 'de110001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de130001-0000-4000-8000-000000000001'::uuid, 'A workbook', 'xlsx_file'::public.datasets__source_type)
  on conflict (id) do nothing;

  select plan(19);

  select is(
    pg_temp.delete_target_as ('de100001-0000-4000-8000-000000000001'::uuid, 'de140001-0000-4000-8000-000000000001'::uuid),
    'allowed de110001-0000-4000-8000-000000000001 csv_file',
    'the owner may delete a dataset and gets its workspace and source type'
  );

  select is(
    pg_temp.delete_target_as ('de100001-0000-4000-8000-000000000001'::uuid, 'de140004-0000-4000-8000-000000000004'::uuid),
    'allowed de110001-0000-4000-8000-000000000001 xlsx_file',
    'the target carries the dataset''s own source type'
  );

  select is(
    pg_temp.visible_count_as ('de100002-0000-4000-8000-000000000002'::uuid, 'de140001-0000-4000-8000-000000000001'::uuid),
    0,
    'the dataset admin cannot read another user''s dataset'
  );

  select is(
    pg_temp.delete_target_as ('de100002-0000-4000-8000-000000000002'::uuid, 'de140001-0000-4000-8000-000000000001'::uuid),
    'allowed de110001-0000-4000-8000-000000000001 csv_file',
    'a dataset admin who cannot read the row may still delete it'
  );

  select is(
    pg_temp.delete_target_as ('de100003-0000-4000-8000-000000000003'::uuid, 'de140001-0000-4000-8000-000000000001'::uuid),
    'forbidden',
    'a viewer may not delete and learns nothing about the dataset'
  );

  select is(
    pg_temp.delete_target_as ('de100004-0000-4000-8000-000000000004'::uuid, 'de140001-0000-4000-8000-000000000001'::uuid),
    'forbidden',
    'a user outside the workspace may not delete'
  );

  select is(
    pg_temp.delete_target_as ('de100001-0000-4000-8000-000000000001'::uuid, 'de14ffff-0000-4000-8000-000000000000'::uuid),
    'not_found',
    'an id no dataset has is not_found'
  );

  select is(
    pg_temp.delete_target_as (null::uuid, 'de140001-0000-4000-8000-000000000001'::uuid),
    'forbidden',
    'a caller who is not signed in may not delete'
  );

  select is(
    pg_temp.delete_target_as (null::uuid, 'de14ffff-0000-4000-8000-000000000000'::uuid),
    'forbidden',
    'a caller who is not signed in cannot tell a missing id from a dataset'
  );

  select is(
    pg_temp.delete_as ('de100003-0000-4000-8000-000000000003'::uuid, 'de140002-0000-4000-8000-000000000002'::uuid),
    'forbidden',
    'a viewer''s delete is refused'
  );

  select ok(
    exists (select 1 from public.datasets where id = 'de140002-0000-4000-8000-000000000002'::uuid),
    'a refused delete leaves the row'
  );

  select is(
    pg_temp.delete_as ('de100002-0000-4000-8000-000000000002'::uuid, 'de140002-0000-4000-8000-000000000002'::uuid),
    'deleted',
    'a dataset admin who cannot read the row deletes it'
  );

  select ok(
    not exists (select 1 from public.datasets where id = 'de140002-0000-4000-8000-000000000002'::uuid),
    'the deleted row is gone'
  );

  select is(
    pg_temp.delete_as ('de100002-0000-4000-8000-000000000002'::uuid, 'de140002-0000-4000-8000-000000000002'::uuid),
    'not_found',
    'deleting a dataset already gone is not_found'
  );

  select is(
    pg_temp.delete_as ('de100004-0000-4000-8000-000000000004'::uuid, 'de140003-0000-4000-8000-000000000003'::uuid),
    'forbidden',
    'a user outside the workspace cannot delete'
  );

  select is(
    pg_temp.delete_as (null::uuid, 'de140003-0000-4000-8000-000000000003'::uuid),
    'forbidden',
    'a caller who is not signed in cannot delete'
  );

  select ok(
    exists (select 1 from public.datasets where id = 'de140003-0000-4000-8000-000000000003'::uuid),
    'refused deletes leave the row'
  );

  select ok(
    not has_function_privilege('anon', 'public.rpc_datasets__get_delete_target(uuid)', 'execute'),
    'anon cannot call the delete target rpc'
  );

  select ok(
    not has_function_privilege('anon', 'public.rpc_datasets__delete(uuid)', 'execute'),
    'anon cannot call the delete rpc'
  );

  select * from finish();

  rollback;
  ```

  Keep `reset role` in every helper after the rpc call, as the existing datasets test does.

- [ ] **Step 3: Run it and confirm it fails.**

  ```bash
  supabase test db supabase/tests/database/datasets/rpc_datasets__delete.test.sql
  ```

  Expected: FAIL, `function public.rpc_datasets__get_delete_target(uuid) does not exist`.

- [ ] **Step 4: Create the enum,** `supabase/schemas/00.enum.datasets__delete_status.sql`:

  ```sql
  /**
   * What the dataset delete rpcs answer, so `DatasetClient.fullDelete` can
   * tell a dataset the caller may delete from one they may not, and from one
   * that is already gone.
   *
   * Enum values:
   *
   * `not_found`: no dataset has the id.
   *
   * `forbidden`: the caller is not signed in, or the dataset exists and the
   * caller is not an admin of it.
   *
   * `allowed`: the caller may delete the dataset. Only
   * `rpc_datasets__get_delete_target` answers it.
   *
   * `deleted`: the dataset was deleted. Only `rpc_datasets__delete` answers
   * it.
   */
  create type public.datasets__delete_status as enum('not_found', 'forbidden', 'allowed', 'deleted');
  ```

- [ ] **Step 5: Create the target rpc,** `supabase/schemas/50.rpc_datasets__get_delete_target.sql`:

  ```sql
  /**
   * Whether the caller may delete a dataset, and what deleting its files
   * needs. `DatasetClient.fullDelete` calls it before it deletes anything.
   *
   * SECURITY DEFINER because the `datasets` SELECT policy hides a row from a
   * dataset admin who may not read it, and such an admin may still delete
   * it. The answer is `forbidden`, with null columns, for a caller who is not
   * signed in or is not an admin of the dataset
   * (`util__auth_user_can_delete_resource`), so nothing about the dataset
   * leaks. It is `not_found` for an id no dataset has. Telling the two apart
   * reveals whether an id is a dataset's, which an unguessable v4 id makes
   * harmless. Otherwise it is `allowed`, with the row's workspace and source
   * type, which the Storage cleanup needs.
   *
   * @param p_dataset_id The dataset to delete.
   */
  create or replace function public.rpc_datasets__get_delete_target (p_dataset_id uuid) returns table (
    status public.datasets__delete_status,
    workspace_id uuid,
    source_type public.datasets__source_type
  ) language plpgsql stable security definer
  set
    search_path = '' as $$
  declare
    v_workspace_id uuid;
    v_source_type public.datasets__source_type;
  begin
    if auth.uid () is null then
      return query
      select
        'forbidden'::public.datasets__delete_status,
        null::uuid,
        null::public.datasets__source_type;
      return;
    end if;

    select
      dataset.workspace_id,
      dataset.source_type
    into v_workspace_id, v_source_type
    from
      public.datasets dataset
    where
      dataset.id = p_dataset_id;

    if not found then
      return query
      select
        'not_found'::public.datasets__delete_status,
        null::uuid,
        null::public.datasets__source_type;
      return;
    end if;

    if not public.util__auth_user_can_delete_resource (
      'dataset'::public.resource_type,
      p_dataset_id
    ) then
      return query
      select
        'forbidden'::public.datasets__delete_status,
        null::uuid,
        null::public.datasets__source_type;
      return;
    end if;

    return query
    select
      'allowed'::public.datasets__delete_status,
      v_workspace_id,
      v_source_type;
  end;
  $$;

  -- `authenticated` only: the browser, and the desktop main process with the
  -- user's token, call this through the Data API.
  revoke
  execute on function public.rpc_datasets__get_delete_target (uuid)
  from
    public,
    anon,
    authenticated,
    service_role;

  grant
  execute on function public.rpc_datasets__get_delete_target (uuid) to authenticated;
  ```

  Columns are qualified with the `dataset` alias on purpose: the `returns table` column names are also plpgsql variables, and an unqualified `workspace_id` would be ambiguous.

- [ ] **Step 6: Create the delete rpc,** `supabase/schemas/50.rpc_datasets__delete.sql`:

  ```sql
  /**
   * Deletes a dataset the caller is an admin of, even when they may not read
   * its row. `DatasetClient.fullDelete` calls it once the dataset's files are
   * gone. Answers `deleted`, `not_found` for an id no dataset has (including
   * one deleted since the caller looked), or `forbidden` for a caller who is
   * not signed in or is not an admin of the dataset
   * (`util__auth_user_can_delete_resource`). Access is checked again here,
   * since it can change after `rpc_datasets__get_delete_target`.
   *
   * SECURITY DEFINER because a `DELETE` through the Data API also applies the
   * `datasets` SELECT policy, so a dataset admin who may not read the row
   * would delete nothing and see no error. Telling `not_found` from
   * `forbidden` reveals whether an id is a dataset's, which an unguessable v4
   * id makes harmless.
   *
   * @param p_dataset_id The dataset to delete.
   */
  create or replace function public.rpc_datasets__delete (p_dataset_id uuid) returns public.datasets__delete_status language plpgsql security definer
  set
    search_path = '' as $$
  begin
    if auth.uid () is null then
      return 'forbidden'::public.datasets__delete_status;
    end if;

    if not exists (
      select
        1
      from
        public.datasets dataset
      where
        dataset.id = p_dataset_id
    ) then
      return 'not_found'::public.datasets__delete_status;
    end if;

    if not public.util__auth_user_can_delete_resource (
      'dataset'::public.resource_type,
      p_dataset_id
    ) then
      return 'forbidden'::public.datasets__delete_status;
    end if;

    delete from public.datasets dataset
    where
      dataset.id = p_dataset_id;

    -- Another delete can remove the row between the check and this delete.
    if not found then
      return 'not_found'::public.datasets__delete_status;
    end if;

    return 'deleted'::public.datasets__delete_status;
  end;
  $$;

  -- `authenticated` only: the browser, and the desktop main process with the
  -- user's token, call this through the Data API.
  revoke
  execute on function public.rpc_datasets__delete (uuid)
  from
    public,
    anon,
    authenticated,
    service_role;

  grant
  execute on function public.rpc_datasets__delete (uuid) to authenticated;
  ```

- [ ] **Step 7: Reset, then generate the migration.** Confirm `node apps/ava-cli/dist/main.cjs supabase status` names `fix-plugins-cleanup` first. `CLAUDE.md` requires the reset immediately before the diff.

  ```bash
  pnpm db:reset
  pnpm db:new-migration add_dataset_delete_rpcs
  ```

- [ ] **Step 8: Read the generated migration in full.** It must contain only: `create type "public"."datasets__delete_status"`, the two `create or replace function` statements, and their `revoke`/`grant` statements. If it drops or alters anything else, it is the shared-stack diff bug from `CLAUDE.md`: run `pnpm db:reset`, regenerate, and compare. Do not edit it by hand unless a statement of this unit is missing, and then say so in the commit body.

- [ ] **Step 9: Apply and regenerate the derived files.**

  ```bash
  pnpm db:reset
  pnpm desktop:sqlite:gen-migrations
  git status --short apps/desktop/migrations shared/types/database.types.ts
  pnpm desktop:sqlite:check-migrations
  ```

  `pnpm db:reset` also runs `pnpm db:gen-types`. Expected: a new `apps/desktop/migrations/<timestamp>_add_dataset_delete_rpcs.gen.sql` with "no schema-shape changes", `database.types.ts` gains the enum and both functions, and the check exits 0. If the generator also rewrites older `.gen.sql` files (1d handoff item 13 lists two that it touches), restore them with `git checkout -- <file>`, rerun the check, and stage only the new file. If the check then fails, stop and report.

- [ ] **Step 10: Run the test (green).**

  ```bash
  supabase test db supabase/tests/database/datasets/rpc_datasets__delete.test.sql
  pnpm test:db
  node apps/ava-cli/dist/main.cjs supabase migrations validate
  ```

  Expected: 19 of 19 pass, the full suite and privilege reconciliation exit 0, and validation exits 0.

- [ ] **Step 11: Commit.**

  ```bash
  git add supabase/schemas/00.enum.datasets__delete_status.sql supabase/schemas/50.rpc_datasets__get_delete_target.sql supabase/schemas/50.rpc_datasets__delete.sql supabase/tests/database/datasets/rpc_datasets__delete.test.sql supabase/migrations/*_add_dataset_delete_rpcs.sql apps/desktop/migrations/*_add_dataset_delete_rpcs.gen.sql shared/types/database.types.ts
  git commit -m "fix(datasets): add delete rpcs that tell a gone dataset from a forbidden one

  rpc_datasets__get_delete_target and rpc_datasets__delete answer not_found,
  forbidden, and allowed or deleted. They run as security definer, so a
  dataset admin who may not read the row can still delete it.

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

#### Unit 1b: `fullDelete` through the rpcs, and its consumers

**Unit:** ordinary.

**Files:**
- Modify: `src/clients/datasets/DatasetClient/createDatasetMutations.ts:1-25` (imports), `:224-343` (`_assertCanDeleteDataset`, `_assertDatasetRowGone`, `_deleteDatasetFiles`, `_makeFullDelete`)
- Test: `src/clients/datasets/DatasetClient/createDatasetMutations.test.ts` (the `fullDelete` block, and the `UserClient` mock)
- Modify: `src/clients/datasets/DatasetClient/DatasetDeleteError.ts:3-9` (the `still_present` doc)
- Modify: `src/hooks/datasets/useNotifyDatasetDeleteError/useNotifyDatasetDeleteError.ts:28`
- Test: `useNotifyDatasetDeleteError.test.ts:64`, `src/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetCard.test.tsx:163`, `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.test.tsx:454`
- Modify: `docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md:443-474`

`uninstallPluginAndDeleteDatasets` does not change: it keeps its own pre-read, and its comments stay true (`fullDelete` still checks access before it touches anything, and `still_present` still means the row survived).

- [ ] **Step 1: Write the failing tests.** In `createDatasetMutations.test.ts`:

  Remove `canAccessResourceMock` from the `vi.hoisted` object and delete the `vi.mock("@/clients/UserClient", ...)` block. Replace the whole `describe("fullDelete", ...)` block with:

  ```ts
  describe("fullDelete", () => {
    const datasetId = BASE_PARAMS.datasetId;
    const workspaceId = BASE_PARAMS.workspaceId;
    let callOrder: string[];
    let getByIdMock: ReturnType<typeof vi.fn>;
    let deleteMirrorRowMock: ReturnType<typeof vi.fn>;

    const _fullDelete = (): Promise<void> => {
      const config = {
        ...CONFIG,
        client: {
          getById: getByIdMock,
          delete: deleteMirrorRowMock,
          getAll: vi.fn(),
        },
      } as unknown as DatasetMutationConfig;
      return createDatasetMutations(config).fullDelete({ id: datasetId });
    };

    const _recordCall = (
      name: string,
      mock: ReturnType<typeof vi.fn>,
      result: unknown,
    ): void => {
      mock.mockImplementation(async () => {
        callOrder.push(name);
        return result;
      });
    };

    /**
     * Answers the two delete rpcs: the target status, and what the delete
     * rpc returns. An allowed target carries the workspace and source type.
     */
    const _stubDeleteRpcs = (
      options: Readonly<{
        status: "not_found" | "forbidden" | "allowed";
        sourceType?: string;
        deleteStatus?: "deleted" | "not_found" | "forbidden";
      }>,
    ): void => {
      const isAllowed = options.status === "allowed";
      rpcMock.mockImplementation(async (name: string) => {
        if (name === "rpc_datasets__get_delete_target") {
          callOrder.push("getTarget");
          return [
            {
              status: options.status,
              workspace_id: isAllowed ? workspaceId : null,
              source_type: isAllowed ? (options.sourceType ?? "csv_file") : null,
            },
          ];
        }
        callOrder.push("deleteRow");
        return options.deleteStatus ?? "deleted";
      });
    };

    beforeEach(() => {
      callOrder = [];
      getByIdMock = vi.fn();
      deleteMirrorRowMock = vi.fn();
      Object.values(mocks).forEach((mock) => {
        mock.mockReset();
      });
      _recordCall("deleteParquet", mocks.deleteParquetMock, undefined);
      _recordCall("deleteOriginal", mocks.deleteOriginalFileMock, undefined);
      _recordCall("deleteMirrorRow", deleteMirrorRowMock, undefined);
      _recordCall("deleteLocal", mocks.deleteLocalDatasetMock, undefined);
      _recordCall("dropDuckDb", mocks.dropDuckDbTableMock, undefined);
      mocks.getLocalDatasetMock.mockResolvedValue({ datasetId });
      _stubDeleteRpcs({ status: "allowed" });
    });

    it("deletes the files, then the row, then this device's copies", async () => {
      await _fullDelete();

      expect(callOrder).toEqual([
        "getTarget",
        "deleteParquet",
        "deleteRow",
        "deleteMirrorRow",
        "deleteLocal",
        "dropDuckDb",
      ]);
    });

    it("asks the server about the dataset by its id", async () => {
      await _fullDelete();

      expect(rpcMock).toHaveBeenCalledWith("rpc_datasets__get_delete_target", {
        p_dataset_id: datasetId,
      });
      expect(rpcMock).toHaveBeenCalledWith("rpc_datasets__delete", {
        p_dataset_id: datasetId,
      });
    });

    it("never reads the row through the user's own access", async () => {
      // A dataset admin may not be able to read the row. The rpcs answer
      // without that read, so it must not happen.
      await _fullDelete();

      expect(getByIdMock).not.toHaveBeenCalled();
    });

    it("touches nothing when the user may not delete the dataset", async () => {
      _stubDeleteRpcs({ status: "forbidden" });

      await expect(_fullDelete()).rejects.toMatchObject({
        name: "DatasetDeleteError",
        reason: "not_allowed",
      });
      expect(callOrder).toEqual(["getTarget"]);
    });

    it("only clears this device's copies of a dataset the server no longer has", async () => {
      // As for a dataset deleted on the server but still in the desktop
      // mirror.
      _stubDeleteRpcs({ status: "not_found" });

      await _fullDelete();

      expect(callOrder).toEqual([
        "getTarget",
        "deleteMirrorRow",
        "deleteLocal",
        "dropDuckDb",
      ]);
    });

    it("stops before the row when the parquet delete fails", async () => {
      mocks.deleteParquetMock.mockRejectedValue(new Error("storage down"));

      await expect(_fullDelete()).rejects.toThrow("storage down");
      expect(callOrder).not.toContain("deleteRow");
    });

    it("throws still_present when the server refuses the row after the files went", async () => {
      // Access was revoked between the two rpcs.
      _stubDeleteRpcs({ status: "allowed", deleteStatus: "forbidden" });

      const error = await _fullDelete().catch((caught: unknown) => {
        return caught;
      });

      expect(error).toBeInstanceOf(DatasetDeleteError);
      expect(error).toMatchObject({ reason: "still_present", datasetId });
    });

    it("keeps this device's copies when the server refuses the row", async () => {
      _stubDeleteRpcs({ status: "allowed", deleteStatus: "forbidden" });

      await _fullDelete().catch(() => {
        return undefined;
      });

      expect(callOrder).not.toContain("deleteMirrorRow");
      expect(callOrder).not.toContain("deleteLocal");
    });

    it("counts a row someone else deleted mid-delete as deleted", async () => {
      _stubDeleteRpcs({ status: "allowed", deleteStatus: "not_found" });

      await expect(_fullDelete()).resolves.toBeUndefined();
      expect(callOrder).toContain("dropDuckDb");
    });

    it("does not remove a retained original for a source that keeps none", async () => {
      await _fullDelete();

      expect(mocks.deleteOriginalFileMock).not.toHaveBeenCalled();
    });

    it("removes the retained original of a pdf dataset in the target's workspace", async () => {
      _stubDeleteRpcs({ status: "allowed", sourceType: "pdf_file" });

      await _fullDelete();

      expect(mocks.deleteOriginalFileMock).toHaveBeenCalledWith({
        workspaceId,
        datasetId,
        fileExtension: "pdf",
      });
    });

    it("removes the retained original after the parquet and before the row", async () => {
      _stubDeleteRpcs({ status: "allowed", sourceType: "pdf_file" });

      await _fullDelete();

      expect(callOrder.slice(0, 4)).toEqual([
        "getTarget",
        "deleteParquet",
        "deleteOriginal",
        "deleteRow",
      ]);
    });

    it("still deletes the row when the retained original cannot be removed", async () => {
      _stubDeleteRpcs({ status: "allowed", sourceType: "pdf_file" });
      mocks.deleteOriginalFileMock.mockRejectedValue(new Error("storage down"));

      await _fullDelete();

      expect(callOrder).toContain("deleteRow");
    });
  });
  ```

  In `useNotifyDatasetDeleteError.test.ts:64`, `ResyncDatasetCard.test.tsx:163`, and `DatasetActionsMenu.test.tsx:454`, change the expected message to:

  ```ts
  message: "You don't have permission to delete this dataset.",
  ```

- [ ] **Step 2: Run them and confirm they fail.**

  ```bash
  pnpm vitest run src/clients/datasets/DatasetClient src/hooks/datasets/useNotifyDatasetDeleteError src/views/DataManagerApp/ResyncDatasetsBlock src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu
  ```

  Expected: FAIL. The `fullDelete` tests fail on call order (no `getTarget`), and the three message tests fail on the old text.

- [ ] **Step 3: Rewrite the delete in `createDatasetMutations.ts`.**

  Imports: remove `import { UserClient } from "@/clients/UserClient";`. Add:

  ```ts
  import { assertIsDefined } from "@avandar/utils";
  import type { Workspace } from "$/models/Workspace/Workspace";
  import type { Database } from "$/types/database.types";
  ```

  (`CompositeTypes` is already imported from `$/types/database.types`. Merge `Database` into that import.)

  Delete `_assertCanDeleteDataset`, `_assertDatasetRowGone`, `_deleteDatasetFiles`, and `_makeFullDelete` (lines 224-343), and put this in their place:

  ```ts
  /** What `rpc_datasets__get_delete_target` answers for one dataset. */
  type DatasetDeleteTarget =
    Database["public"]["Functions"]["rpc_datasets__get_delete_target"]["Returns"][number];

  /** What `rpc_datasets__delete` answers. */
  type DatasetDeleteStatus = Database["public"]["Enums"]["datasets__delete_status"];

  /**
   * Asks the server whether the current user may delete the dataset, and what
   * its Storage cleanup needs. The answer does not depend on the user being
   * able to read the row, and tells a dataset already gone from one the user
   * may not delete.
   *
   * The rpc goes through the platform-aware server API, never the webview's
   * own Supabase client. On desktop that client holds no session (only the
   * main process carries the access token), so its rpc would run as `anon`,
   * which may not execute it.
   */
  async function _getDeleteTarget(
    datasetId: Dataset.Id,
  ): Promise<DatasetDeleteTarget> {
    const [target] = await serverApi.rpc<DatasetDeleteTarget[]>(
      "rpc_datasets__get_delete_target",
      { p_dataset_id: datasetId },
    );
    assertIsDefined(target, "rpc_datasets__get_delete_target returned no row");
    return target;
  }

  /**
   * Removes the dataset's parquet and, for a source that keeps one, its
   * retained original from Storage, where `target` says the files are.
   */
  async function _deleteDatasetFiles(
    options: Readonly<{
      datasetId: Dataset.Id;
      target: DatasetDeleteTarget;
      logger: ILogger;
    }>,
  ): Promise<void> {
    const { datasetId, target, logger } = options;
    const workspaceId = target.workspace_id as Workspace.Id;
    await DatasetParquetStorageClient.deleteDataset({ workspaceId, datasetId });
    if (requiresOriginalFileRetention(target.source_type)) {
      // The row deletion that follows is the point of no return for the user
      // (the dataset disappears from their workspace either way), so a
      // failure to remove the retained-original blob must not strand them
      // with a dataset they can no longer delete. Unlike the parquet deletion
      // above, which throws and aborts the delete, we log and swallow: worst
      // case is an orphaned blob to clean up later, not a dataset stuck in
      // limbo.
      await DatasetOriginalFileStorageClient.deleteOriginalFile({
        workspaceId,
        datasetId,
        fileExtension: getOriginalFileExtensionFromSourceType(
          target.source_type,
        ),
      }).catch((error: unknown) => {
        logger.error(
          "Failed to delete the dataset's retained original file; leaving the object storage blob in place",
          { datasetId, error },
        );
      });
    }
  }

  /**
   * Deletes the dataset row on the server. A row already gone counts as
   * deleted. Throws `still_present` when the server refuses, as when the
   * user lost admin access after `_getDeleteTarget` allowed the delete: the
   * files may already be gone by then.
   */
  async function _deleteDatasetRow(datasetId: Dataset.Id): Promise<void> {
    const status = await serverApi.rpc<DatasetDeleteStatus>(
      "rpc_datasets__delete",
      { p_dataset_id: datasetId },
    );
    if (status === "forbidden") {
      throw new DatasetDeleteError({ datasetId, reason: "still_present" });
    }
  }

  /**
   * Removes what this device keeps of a dataset: the desktop mirror row (a
   * Data API delete that matches nothing on web), the local dataset record,
   * and its DuckDB table.
   */
  async function _deleteLocalCopies(
    options: Readonly<{
      client: DatasetMutationConfig["client"];
      datasetId: Dataset.Id;
    }>,
  ): Promise<void> {
    const { client, datasetId } = options;
    await client.delete({ id: datasetId });
    const localDataset = await LocalDatasetClient.getById({ id: datasetId });
    if (!localDataset) {
      return;
    }
    await LocalDatasetClient.delete({ id: localDataset.datasetId });
    await DuckDbClient.dropTableViewAndFile({
      tableOrViewName: localDataset.datasetId,
    });
  }

  function _makeFullDelete(
    options: Readonly<DatasetMutationConfig>,
  ): DatasetMutationRecord["fullDelete"] {
    return async (params) => {
      const logger = options.logger.appendName("fullDelete");
      logger.log("Deleting dataset", params);
      const datasetId = params.id;
      const target = await _getDeleteTarget(datasetId);
      if (target.status === "forbidden") {
        throw new DatasetDeleteError({ datasetId, reason: "not_allowed" });
      }
      // A `not_found` dataset is already gone on the server, so only this
      // device's copies are left, such as a stale desktop mirror row.
      if (target.status === "allowed") {
        // The files go before the row. A failed parquet delete throws here
        // and leaves the row, so the dataset can be deleted again.
        await _deleteDatasetFiles({ datasetId, target, logger });
        await _deleteDatasetRow(datasetId);
      }
      // If anything above throws after the row was deleted (for example a
      // network blip), the local copies stay for a later cleanup.
      await _deleteLocalCopies({ client: options.client, datasetId });
    };
  }
  ```

  `DatasetSource.SourceType` is `Enums<"datasets__source_type">`, so the generated `source_type` matches it. Supabase types a `returns table` column as non-null even though the rpc returns null for `forbidden` and `not_found`. The code reads `workspace_id` and `source_type` only after `status === "allowed"`, where they are set. If the generator types them as nullable instead, add `assertIsDefined(target.source_type, "...")` and the same for `workspace_id` at the top of `_deleteDatasetFiles`.

- [ ] **Step 4: Update the copy and the error doc.**

  `useNotifyDatasetDeleteError.ts:28`:

  ```ts
          error.reason === "not_allowed"
            ? t`You don't have permission to delete this dataset.`
            : t`The dataset could not be fully deleted. Its data may already be gone. Check it in Data Sources and delete it again.`,
  ```

  `DatasetDeleteError.ts`, the type's docblock:

  ```ts
  /**
   * Why a dataset delete did not go through.
   * - `not_allowed`: the current user is not an admin of the dataset, so
   *   nothing was deleted.
   * - `still_present`: the dataset's files may already be gone, but the
   *   server kept its row, as when the user lost admin access between the
   *   access check and the delete.
   */
  ```

- [ ] **Step 5: Run the Step 2 command again.** Expected: PASS. Then `npx tsc -b`. Expected: exit 0.

- [ ] **Step 6: Replace the two dataset "Known limit" notes** in `docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md`. Replace the bullet starting "**Known limit.** A dataset that becomes unreadable" (lines 443-461) with:

  ```md
  - **Closed: a dataset the user may delete but not read.** `fullDelete` now asks `rpc_datasets__get_delete_target` and deletes through `rpc_datasets__delete`, both security definer, so such a dataset is deleted with its files (`docs/superpowers/specs/2026-11-18-plugins-cleanup-design.md`, section 1).
  ```

  Replace the bullet starting "**Known limit, desktop.** A dataset deleted on the server" (lines 462-474) with:

  ```md
  - **Closed: a stale desktop mirror row read as a permission error.** The server now answers `not_found` for a dataset it no longer has, and `fullDelete` then only clears this device's copies and succeeds (`docs/superpowers/specs/2026-11-18-plugins-cleanup-design.md`, section 1).
  ```

  Leave the third note (the IPC one) for Task 2.

- [ ] **Step 7: Commit.**

  ```bash
  git add src/clients/datasets/DatasetClient src/hooks/datasets/useNotifyDatasetDeleteError src/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetCard.test.tsx src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.test.tsx docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md
  git commit -m "fix(datasets): delete through rpcs that see past the read policy

  fullDelete asks rpc_datasets__get_delete_target instead of reading the row
  with the user's own access, so a dataset admin who cannot read a dataset
  deletes it with its files, and a dataset already gone on the server only
  clears this device's copies. The desktop mirror delete is a local SQLite
  delete and queues nothing for the server.

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

- [ ] **Step 8: Task-level review** (Opus, xhigh) of Units 1a and 1b together, once both unit reviews pass. Focus: data loss (Storage deleted for a dataset whose row then stays), security (who can execute the rpcs, what `forbidden` reveals, the definer delete's cascades and analytics actor), and the migration's contents.

---

### Task 2: Desktop IPC routes replies by request id (HIGH-RISK: concurrency)

Closes the uninstall spec's third "Known limit" note. Run the task-level review on Opus (xhigh) after the unit review.

**Unit:** ordinary.

**Files:**
- Modify: `shared/platform/ipc/client.ts:29-121`
- Test: `shared/platform/ipc/client.test.ts` (rewrite)
- Modify: `apps/desktop/main/ipc/desktopIpcBridgeScript/desktopIpcBridgeScript.ts:1-46`
- Create: `apps/desktop/main/ipc/desktopIpcBridgeScript/desktopIpcBridgeScript.test.ts`
- Modify: `apps/desktop/main/ipc/createIpcServer/createIpcServer.test.ts:118-162` (the loopback test)
- Modify: `apps/desktop/preload/index.ts:23` (a comment only)
- Modify: `docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md:476-490`

Facts (verified): the only callers of `IpcBridge.once` are `callIpc` and the loopback test. The preload (`apps/desktop/preload/index.ts:67-93`) forwards every main-process message to the page as an `ava-ipc-in` event, so it needs no change. `jsdom` resolves from `apps/desktop`'s Vitest (its config runs in `node`, so the bridge test opts in with a pragma).

- [ ] **Step 1: Write the failing client tests.** Replace `shared/platform/ipc/client.test.ts` with:

  ```ts
  import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
  import { __setIpcBridgeForTests, callIpc } from "$/platform/ipc/client.ts";
  import { defineIpcContract } from "$/platform/ipc/contracts/defineIpcContract.ts";
  import type { IpcBridge } from "$/platform/ipc/client.ts";
  import type {
    ReplyEnvelope,
    RequestEnvelope,
  } from "$/platform/ipc/envelopes.ts";

  type Listener = (message: unknown) => void;

  const ECHO = defineIpcContract<{ a: number }, { b: number }>("test.echo");
  const ECHO_REPLY_CHANNEL = "test.echo.reply";

  describe("callIpc", () => {
    const sendMock = vi.fn();
    const unsubscribeMock = vi.fn();
    const onMock = vi.fn();
    const listenersByChannel = new Map<string, Set<Listener>>();

    /** Delivers `reply` to every listener on `channel`, as the bridge does. */
    function _reply(channel: string, reply: ReplyEnvelope): void {
      listenersByChannel.get(channel)?.forEach((listener) => {
        listener(reply);
      });
    }

    /** The request ids `callIpc` sent, in order. */
    function _getSentRequestIds(): string[] {
      return sendMock.mock.calls.map((call) => {
        return (call[1] as RequestEnvelope).id;
      });
    }

    beforeEach(() => {
      onMock.mockImplementation((channel: string, callback: Listener) => {
        const listeners = listenersByChannel.get(channel) ?? new Set();
        listeners.add(callback);
        listenersByChannel.set(channel, listeners);
        return () => {
          unsubscribeMock(channel);
          listeners.delete(callback);
        };
      });
      __setIpcBridgeForTests({
        send: sendMock,
        once: vi.fn(),
        on: onMock,
      } satisfies IpcBridge);
    });

    afterEach(() => {
      __setIpcBridgeForTests(undefined);
      sendMock.mockReset();
      unsubscribeMock.mockReset();
      onMock.mockReset();
      listenersByChannel.clear();
    });

    it("sends a request with an id and resolves with the parsed response", async () => {
      const pending = callIpc(ECHO, { a: 1 });
      const [requestId] = _getSentRequestIds();
      _reply(ECHO_REPLY_CHANNEL, {
        id: requestId ?? "",
        ok: true,
        result: { b: 42 },
      });

      await expect(pending).resolves.toEqual({ b: 42 });
      expect(sendMock).toHaveBeenCalledWith("test.echo", {
        id: expect.any(String) as unknown,
        payload: { a: 1 },
      });
    });

    it("resolves two concurrent calls with their own results when the replies arrive out of order", async () => {
      const first = callIpc(ECHO, { a: 1 });
      const second = callIpc(ECHO, { a: 2 });
      const [firstId, secondId] = _getSentRequestIds();

      _reply(ECHO_REPLY_CHANNEL, {
        id: secondId ?? "",
        ok: true,
        result: { b: 2 },
      });
      _reply(ECHO_REPLY_CHANNEL, {
        id: firstId ?? "",
        ok: true,
        result: { b: 1 },
      });

      await expect(first).resolves.toEqual({ b: 1 });
      await expect(second).resolves.toEqual({ b: 2 });
    });

    it("ignores a reply for an id no call waits for, and still resolves the pending call", async () => {
      // Vitest runs with `import.meta.env.DEV` set, so the drop is logged.
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const pending = callIpc(ECHO, { a: 1 });
      const [requestId] = _getSentRequestIds();

      _reply(ECHO_REPLY_CHANNEL, {
        id: "some-other-id",
        ok: true,
        result: { b: 99 },
      });
      _reply(ECHO_REPLY_CHANNEL, {
        id: requestId ?? "",
        ok: true,
        result: { b: 1 },
      });

      await expect(pending).resolves.toEqual({ b: 1 });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("some-other-id"),
      );
      warnSpy.mockRestore();
    });

    it("rejects only the call whose reply is ok: false", async () => {
      const failing = callIpc(ECHO, { a: 1 });
      const passing = callIpc(ECHO, { a: 2 });
      const [failingId, passingId] = _getSentRequestIds();

      _reply(ECHO_REPLY_CHANNEL, {
        id: failingId ?? "",
        ok: false,
        error: "boom",
      });
      _reply(ECHO_REPLY_CHANNEL, {
        id: passingId ?? "",
        ok: true,
        result: { b: 2 },
      });

      await expect(failing).rejects.toThrow(/boom/);
      await expect(passing).resolves.toEqual({ b: 2 });
    });

    it("listens on a reply channel once, and stops when no call waits", async () => {
      const first = callIpc(ECHO, { a: 1 });
      const second = callIpc(ECHO, { a: 2 });
      const [firstId, secondId] = _getSentRequestIds();

      expect(onMock).toHaveBeenCalledTimes(1);
      _reply(ECHO_REPLY_CHANNEL, {
        id: firstId ?? "",
        ok: true,
        result: { b: 1 },
      });
      expect(unsubscribeMock).not.toHaveBeenCalled();
      _reply(ECHO_REPLY_CHANNEL, {
        id: secondId ?? "",
        ok: true,
        result: { b: 2 },
      });

      await Promise.all([first, second]);
      expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    });

    it("rejects when no IPC bridge is available", async () => {
      __setIpcBridgeForTests(undefined);

      await expect(callIpc(ECHO, { a: 1 })).rejects.toThrow(
        /Electrobun IPC bridge not available/,
      );
    });
  });
  ```

- [ ] **Step 2: Write the failing bridge script test** at `apps/desktop/main/ipc/desktopIpcBridgeScript/desktopIpcBridgeScript.test.ts`:

  ```ts
  // @vitest-environment jsdom
  /**
   * Runs the injected bridge script in a DOM and checks its `on` listener:
   * every message on its channel reaches it, until it unsubscribes.
   */
  import { afterEach, describe, expect, it, vi } from "vitest";
  import { DESKTOP_IPC_BRIDGE_SCRIPT } from "./desktopIpcBridgeScript";

  type InstalledBridge = {
    on: (channel: string, callback: (message: unknown) => void) => () => void;
  };

  function _installBridge(): InstalledBridge {
    // The script is plain JavaScript the main process runs in the page.
    new Function(DESKTOP_IPC_BRIDGE_SCRIPT)();
    return Reflect.get(window, "electrobun") as InstalledBridge;
  }

  /** Dispatches a main-process message the way the preload does. */
  function _deliver(channel: string, message: unknown): void {
    document.dispatchEvent(
      new CustomEvent("ava-ipc-in", { detail: { channel, message } }),
    );
  }

  describe("DESKTOP_IPC_BRIDGE_SCRIPT", () => {
    afterEach(() => {
      Reflect.deleteProperty(window, "electrobun");
    });

    it("delivers every message on a channel to an on listener", () => {
      const listener = vi.fn();
      _installBridge().on("rdb.query.reply", listener);

      _deliver("rdb.query.reply", { id: "1" });
      _deliver("rdb.query.reply", { id: "2" });

      expect(listener.mock.calls).toEqual([[{ id: "1" }], [{ id: "2" }]]);
    });

    it("delivers nothing from another channel to an on listener", () => {
      const listener = vi.fn();
      _installBridge().on("rdb.query.reply", listener);

      _deliver("rdb.run.reply", { id: "1" });

      expect(listener).not.toHaveBeenCalled();
    });

    it("delivers nothing once the on listener unsubscribes", () => {
      const listener = vi.fn();
      const unsubscribe = _installBridge().on("rdb.query.reply", listener);

      unsubscribe();
      _deliver("rdb.query.reply", { id: "1" });

      expect(listener).not.toHaveBeenCalled();
    });
  });
  ```

- [ ] **Step 3: Run both and confirm they fail.**

  ```bash
  pnpm vitest run shared/platform/ipc/client.test.ts
  pnpm --filter @avandar/desktop test -- main/ipc/desktopIpcBridgeScript
  ```

  Expected: FAIL. The concurrent-call tests time out (no `on` listener exists yet), and the bridge tests throw `on is not a function`.

- [ ] **Step 4: Implement the client.** In `shared/platform/ipc/client.ts`:

  Replace the `IpcBridge` type:

  ```ts
  export type IpcBridge = {
    send: (channel: string, message: unknown) => void;
    once: (channel: string, callback: (message: unknown) => void) => void;

    /**
     * Calls `callback` with every message on `channel` until the returned
     * function is called. `callIpc` keeps one per reply channel.
     */
    on: (channel: string, callback: (message: unknown) => void) => () => void;
  };
  ```

  Below `let bridge: IpcBridge | undefined;` add:

  ```ts
  /**
   * The calls waiting on one reply channel, by request id, and how to stop
   * the one listener `callIpc` keeps on that channel while any call waits.
   */
  type ReplyChannelWaiters = {
    onReplyByRequestId: Map<string, (reply: ReplyEnvelope) => void>;
    unsubscribe: () => void;
  };

  /** Every reply channel with a call waiting on it. */
  const waitersByReplyChannel = new Map<string, ReplyChannelWaiters>();
  ```

  Replace `__setIpcBridgeForTests`:

  ```ts
  /**
   * Test-only seam for injecting a fake IPC bridge. Pass `undefined` to reset
   * to the default `globalThis.electrobun` lookup. Also forgets every call
   * still waiting for a reply. Do not call from app code.
   *
   * @param testBridge - The bridge implementation to install, or `undefined`
   *   to reset.
   */
  export function __setIpcBridgeForTests(
    testBridge: Readonly<IpcBridge> | undefined,
  ): void {
    bridge = testBridge;
    waitersByReplyChannel.forEach((channelWaiters) => {
      channelWaiters.unsubscribe();
    });
    waitersByReplyChannel.clear();
  }
  ```

  Below `makeRequestId`, add the two helpers:

  ```ts
  /**
   * Hands a reply to the call waiting for its request id, and stops
   * listening on the channel once no call waits there. A reply no call waits
   * for, such as a late duplicate, is dropped.
   */
  function _deliverReply(replyChannel: string, message: unknown): void {
    const reply = message as ReplyEnvelope;
    const channelWaiters = waitersByReplyChannel.get(replyChannel);
    const onReply = channelWaiters?.onReplyByRequestId.get(reply.id);
    if (channelWaiters === undefined || onReply === undefined) {
      if (import.meta.env?.DEV === true) {
        console.warn(
          `Dropped an IPC reply no call waits for on ${replyChannel}: ${reply.id}`,
        );
      }
      return;
    }
    channelWaiters.onReplyByRequestId.delete(reply.id);
    if (channelWaiters.onReplyByRequestId.size === 0) {
      channelWaiters.unsubscribe();
      waitersByReplyChannel.delete(replyChannel);
    }
    onReply(reply);
  }

  /**
   * Waits for the reply with `requestId` on `replyChannel`. The channel's
   * first waiting call subscribes to it, and later ones share that listener.
   */
  function _waitForReply(
    options: Readonly<{
      activeBridge: IpcBridge;
      replyChannel: string;
      requestId: string;
      onReply: (reply: ReplyEnvelope) => void;
    }>,
  ): void {
    const { activeBridge, replyChannel, requestId, onReply } = options;
    const existing = waitersByReplyChannel.get(replyChannel);
    if (existing !== undefined) {
      existing.onReplyByRequestId.set(requestId, onReply);
      return;
    }
    const unsubscribe = activeBridge.on(replyChannel, (message) => {
      _deliverReply(replyChannel, message);
    });
    waitersByReplyChannel.set(replyChannel, {
      onReplyByRequestId: new Map([[requestId, onReply]]),
      unsubscribe,
    });
  }
  ```

  Replace `callIpc` and its docblock:

  ```ts
  /**
   * Issue a typed IPC request through the Electrobun bridge and resolve with
   * the parsed response. Sends a request envelope on `contract.name` and
   * settles with the reply that carries its request id on
   * `${contract.name}.reply`. Any number of calls may be in flight on one
   * contract, and each gets its own reply, in any order.
   *
   * @param contract - The shared {@link IpcContract} declaring the channel and
   *   the request/response shapes. Both the client and the server import the
   *   same contract object, which is what enforces symmetry across the wire.
   * @param request - The request payload, typed by the contract.
   * @returns A promise resolving to the response payload, typed by the
   *   contract. Rejects when the server replies with `ok: false`, or when no
   *   IPC bridge is available.
   */
  export function callIpc<TRequest, TResponse>(
    contract: Readonly<IpcContract<TRequest, TResponse>>,
    request: Readonly<TRequest>,
  ): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      let activeBridge: IpcBridge;
      try {
        activeBridge = getBridge();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      const requestId = makeRequestId();
      _waitForReply({
        activeBridge,
        replyChannel: `${contract.name}.reply`,
        requestId,
        onReply: (reply) => {
          if (reply.ok) {
            resolve(contract.parseResponse(reply.result));
            return;
          }
          reject(new Error(reply.error ?? `${contract.name} failed`));
        },
      });

      const envelope: RequestEnvelope = { id: requestId, payload: request };
      activeBridge.send(contract.name, envelope);
    });
  }
  ```

  `import.meta.env?.X` is how `shared/env/getSupabaseApiUrl.ts` reads Vite env in `shared/`, so it type-checks in the browser, Node, and Deno projects.

- [ ] **Step 5: Implement `on` in the bridge script.** In `desktopIpcBridgeScript.ts`, change the header line "Once injected, `window.electrobun` exposes the `{send, once}` shape" to "Once injected, `window.electrobun` exposes the `{send, once, on}` shape", and add `on` after `once` inside `window.electrobun`:

  ```js
      once: function (channel, callback) {
        function handle(ev) {
          if (ev.detail && ev.detail.channel === channel) {
            document.removeEventListener(IN_EVENT, handle);
            callback(ev.detail.message);
          }
        }
        document.addEventListener(IN_EVENT, handle);
      },
      on: function (channel, callback) {
        function handle(ev) {
          if (ev.detail && ev.detail.channel === channel) {
            callback(ev.detail.message);
          }
        }
        document.addEventListener(IN_EVENT, handle);
        return function unsubscribe() {
          document.removeEventListener(IN_EVENT, handle);
        };
      }
  ```

  `once` itself is unchanged. Only the comma after its closing `}` is new.

  In `apps/desktop/preload/index.ts`, the header comment's "thin `window.electrobun = { send, once }`" becomes "thin `window.electrobun = { send, once, on }`". The preload code does not change.

- [ ] **Step 6: Update the loopback test** in `createIpcServer.test.ts`. The comment "Pair-wire client.send -> server.on and server.send -> client.once" becomes "Pair-wire client.send -> server.on and server.send -> client.on". The bridge it installs becomes:

  ```ts
      __setIpcBridgeForTests({
        send: (channel, message) => {
          serverInbox[channel]?.(message);
        },
        once: (channel, callback) => {
          clientInbox[channel] = callback;
        },
        on: (channel, callback) => {
          clientInbox[channel] = callback;
          return () => {
            delete clientInbox[channel];
          };
        },
      });
  ```

- [ ] **Step 7: Run the Step 3 commands again, then the rest of the desktop tests.**

  ```bash
  pnpm vitest run shared/platform/ipc
  pnpm test:desktop
  pnpm type-check:desktop
  npx tsc -b
  pnpm type-check:deno
  ```

  Expected: all pass and exit 0.

- [ ] **Step 8: Replace the IPC "Known limit" note** in `docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md`. Replace the bullet starting "**Known limit, desktop.** The access check can fail when several run at once" (lines 476-490) with:

  ```md
  - **Closed: concurrent desktop IPC calls could take each other's replies.** `callIpc` now keeps one listener per reply channel and hands each reply to the call with its request id (`docs/superpowers/specs/2026-11-18-plugins-cleanup-design.md`, section 2).
  ```

- [ ] **Step 9: Commit.**

  ```bash
  git add shared/platform/ipc/client.ts shared/platform/ipc/client.test.ts apps/desktop/main/ipc/desktopIpcBridgeScript apps/desktop/main/ipc/createIpcServer/createIpcServer.test.ts apps/desktop/preload/index.ts docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md
  git commit -m "fix(desktop): route each IPC reply to its own call by request id

  The webview bridge gains a persistent on listener. callIpc keeps one per
  reply channel and delivers each reply to the call that sent its id, so
  concurrent calls on one contract no longer take each other's replies.

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

- [ ] **Step 10: Task-level review** (Opus, xhigh). Focus: a reply that arrives before the listener exists, a channel left subscribed after its last call settles, a reply for a settled call, and `__setIpcBridgeForTests` leaving no state between tests.

---

### Task 3: The switch rule on demo/measles

**Unit:** support work (docs). Change this branch's `CLAUDE.md` only. `demo/measles` never merges into develop, so develop's `CLAUDE.md` keeps the old rule.

**Files:**
- Modify: `CLAUDE.md:152-186`, `CLAUDE.md:238-241`
- Modify: `docs/superpowers/2026-11-09-plugins-1b-handoff.md:80-82`, `docs/superpowers/2026-11-10-plugins-1c-handoff.md:107-109`, `docs/superpowers/2026-11-16-plugins-1d-handoff.md:167-169`

- [ ] **Step 1: Rewrite the section.** In `CLAUDE.md`, replace everything from "Every worktree uses the shared `avandar` stack by default, and most branches should" (line 152) through "advice is expected. Do not switch just to follow it." (line 186) with:

  ```md
  A branch based on `develop` uses the shared `avandar` stack by default. A
  branch based on `demo/measles` never does: see the next section.

  ### Switch every demo/measles branch before it touches the database

  `demo/measles` never merges into `develop`. The shared `avandar` stack is
  migrated from `develop`, so it lacks `demo/measles`' migrations and cannot
  serve `demo/measles` or any branch based on it.

  On `demo/measles` and on every branch based on it, run `ava supabase switch`
  before you run database tests (`pnpm test:db`), end-to-end tests, the app
  (`pnpm dev`), or any database command, even when the branch changes nothing
  under `supabase/`. Then run `pnpm fns:update-env`, and go on only once
  `ava supabase status` names the branch's own project.

  A branch based on `develop` keeps the rule in `develop`'s `CLAUDE.md`
  ("Switch only when the branch changes what the local stack is built from").
  It stays on the shared `avandar` stack, and switches only before it edits a
  committed file that defines how the local stack is built:

  - A migration, or any change under `supabase/schemas/`.
  - Adding or removing a storage bucket, or changing a storage policy. This repo
    creates buckets in `*_STORAGE-*.sql` migrations that `[db.seed] sql_paths`
    replays after every reset.
  - A change to `supabase/config.toml`, including the `[functions.*]` block a
    new edge function adds, or to the `supabase` CLI version in `package.json`,
    which changes the Docker images the stack runs.
  - A change to the seed definitions under `seed/`, since verifying it takes a
    `pnpm db:reset` or `pnpm db:seed`.

  Each switch runs a full Supabase Docker stack of its own, so on a
  develop-based branch a switch it does not need only adds load to the machine.
  ```

  The "Check the switch BEFORE any command that rebuilds, resets, or reseeds" section that follows stays exactly as it is. Its "changes listed above" now points at this list.

- [ ] **Step 2: Fix the Migrations bullet.** Replace these four lines (238-241):

  ```md
  - Before any change to what the local stack is built from (see "Switch only
    when the branch changes what the local stack is built from") on a branch
    other than `develop`, create an isolated local Supabase instance with
    `ava supabase switch`, even when no local Supabase instance is running.
  ```

  with:

  ```md
  - On a `demo/measles` branch, switch before any database work (see "Switch
    every demo/measles branch before it touches the database"). On a
    develop-based branch other than `develop`, create an isolated local
    Supabase instance with `ava supabase switch` before any change to what the
    local stack is built from, even when no local Supabase instance is running.
  ```

  The rest of that bullet ("With no project id, the command kebab-cases...") stays.

- [ ] **Step 3: Point the handoffs at the rule.** Add this bullet as the first item of each Environment section: `docs/superpowers/2026-11-09-plugins-1b-handoff.md` ("## Environment state"), `2026-11-10-plugins-1c-handoff.md` ("## Environment"), and `2026-11-16-plugins-1d-handoff.md` ("## Environment"):

  ```md
  - **Switch rule:** every `demo/measles` branch switches its local stack before any database work. See "Switch every demo/measles branch before it touches the database" in `CLAUDE.md`.
  ```

- [ ] **Step 4: Check.** `grep -n "Switch only when" CLAUDE.md` prints only the line in the new section that names develop's heading. `grep -n "—" CLAUDE.md docs/superpowers/2026-11-*-handoff.md` prints nothing.

- [ ] **Step 5: Commit.**

  ```bash
  git add CLAUDE.md docs/superpowers/2026-11-09-plugins-1b-handoff.md docs/superpowers/2026-11-10-plugins-1c-handoff.md docs/superpowers/2026-11-16-plugins-1d-handoff.md
  git commit -m "docs: switch every demo/measles branch before database work

  The shared avandar stack follows develop and lacks demo/measles'
  migrations. Develop-based branches keep the rule in develop's CLAUDE.md.

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 4: Translated plugin errors in the epidemiology plugin

Closes 1b follow-up 1. **Unit:** ordinary.

**Files:**
- Create: `plugins/epidemiology/src/derivedColumns/getAddColumnsErrorKeyFromCode/getAddColumnsErrorKeyFromCode.ts`
- Test: `plugins/epidemiology/src/derivedColumns/getAddColumnsErrorKeyFromCode/getAddColumnsErrorKeyFromCode.test.ts`
- Modify: `plugins/epidemiology/src/derivedColumns/useAddColumns.ts`, `AddColumnsFooter.tsx`
- Modify: `plugins/epidemiology/src/incidence/IncidenceModal/IncidenceForm.tsx:47-57`, `useIncidenceForm.ts:22,50,76`
- Modify: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageForm.tsx:44-54`, `useRollingAverageForm.ts:26,74,106`
- Test: `IncidenceModal.test.tsx:181-198`, `RollingAverageModal.test.tsx:196-213`
- Modify: `plugins/epidemiology/locales/en.json:51,69`
- Modify: `docs/plugin-authoring.md` (section 6's last paragraph, and a new subsection in section 9)

Plugin code may import only from `@avandar/plugin-sdk`, `@avandar/plugin-ui`, react, and the approved npm packages. `PluginError` and `PluginErrorCode` come from `@avandar/plugin-sdk`, and `Text` from `@avandar/plugin-ui`. The plugin's translator is `useT()`, which reads `locales/en.json` at runtime, so these keys are not Lingui strings.

- [ ] **Step 1: Write the failing tests.**

  `getAddColumnsErrorKeyFromCode.test.ts`:

  ```ts
  import { describe, expect, it } from "vitest";
  import { getAddColumnsErrorKeyFromCode } from "./getAddColumnsErrorKeyFromCode";

  describe("getAddColumnsErrorKeyFromCode", () => {
    it.each([
      ["InvalidExpression", "addColumns.error.invalidExpression"],
      ["InvalidHandle", "addColumns.error.resultChanged"],
      ["LoadFailed", "addColumns.error.resultChanged"],
      ["PermissionDenied", "addColumns.error.permissionDenied"],
      ["CommandFailed", "addColumns.error.generic"],
      [undefined, "addColumns.error.generic"],
    ] as const)("maps %s to %s", (code, key) => {
      expect(getAddColumnsErrorKeyFromCode(code)).toBe(key);
    });
  });
  ```

  In `IncidenceModal.test.tsx`, replace the test "shows why the columns were not added and stays open" with:

  ```ts
    it("says the result changed, with the host's message apart, and stays open", async () => {
      const { closeModal } = _renderModal({
        addColumns: () => {
          return Promise.reject(
            new PluginError(
              "InvalidHandle",
              "This query result is no longer available. Run the command again.",
            ),
          );
        },
      });
      _clickAdd();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "The result changed. Run the query again, then try again.",
      );
      expect(
        within(alert).getByText(
          "This query result is no longer available. Run the command again.",
        ),
      ).toHaveAttribute("lang", "en");
      expect(closeModal).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Add columns" })).toBeEnabled();
    });

    it("says the columns could not be added for an error that is not a PluginError", async () => {
      _renderModal({
        addColumns: () => {
          return Promise.reject(new Error("network down"));
        },
      });
      _clickAdd();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("The columns could not be added.");
      expect(within(alert).getByText("network down")).toHaveAttribute(
        "lang",
        "en",
      );
    });
  ```

  In `RollingAverageModal.test.tsx`, replace the test "shows why the column was not added and stays open" with:

  ```ts
    it("says the result changed, with the host's message apart, and stays open", async () => {
      const { closeModal } = _renderModal({
        addColumns: () => {
          return Promise.reject(
            new PluginError(
              "InvalidHandle",
              "This query result is no longer available. Run the command again.",
            ),
          );
        },
      });
      _clickAdd();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "The result changed. Run the query again, then try again.",
      );
      expect(
        within(alert).getByText(
          "This query result is no longer available. Run the command again.",
        ),
      ).toHaveAttribute("lang", "en");
      expect(closeModal).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Add column" })).toBeEnabled();
    });
  ```

  `within` is already imported in both test files.

- [ ] **Step 2: Run them and confirm they fail.**

  ```bash
  pnpm vitest run plugins/epidemiology/src/derivedColumns plugins/epidemiology/src/incidence plugins/epidemiology/src/rollingAverage
  ```

  Expected: FAIL. The helper module is missing, and the alerts still read "Could not add the column(s): ...".

- [ ] **Step 3: Add the locale keys.** In `plugins/epidemiology/locales/en.json`, delete the `"incidence.failed"` line (51) and the `"rollingAverage.failed"` line (69). After the `"rollingAverage.unavailable"` line add:

  ```json
    "addColumns.error.invalidExpression": "The columns could not be built from this result.",
    "addColumns.error.resultChanged": "The result changed. Run the query again, then try again.",
    "addColumns.error.permissionDenied": "This plugin is not allowed to change the query.",
    "addColumns.error.generic": "The columns could not be added.",
  ```

  Keep the JSON valid (commas).

- [ ] **Step 4: Create the helper,** `getAddColumnsErrorKeyFromCode.ts`:

  ```ts
  import type { PluginErrorCode } from "@avandar/plugin-sdk";

  /**
   * The `addColumns` failures that have a sentence of their own. Every other
   * code gets `addColumns.error.generic`.
   */
  const ERROR_KEYS_BY_CODE: Partial<Record<PluginErrorCode, string>> = {
    InvalidExpression: "addColumns.error.invalidExpression",
    InvalidHandle: "addColumns.error.resultChanged",
    LoadFailed: "addColumns.error.resultChanged",
    PermissionDenied: "addColumns.error.permissionDenied",
  };

  /**
   * Gets the locale key of the translated sentence a form shows when adding
   * columns failed with `code`, the `PluginError` code, or undefined for an
   * error that is not a `PluginError`. Use it in a form that adds columns,
   * for example the incidence form, so the user reads the failure in their
   * language rather than the host's English message.
   */
  export function getAddColumnsErrorKeyFromCode(
    code: PluginErrorCode | undefined,
  ): string {
    return (
      (code === undefined ? undefined : ERROR_KEYS_BY_CODE[code]) ??
      "addColumns.error.generic"
    );
  }
  ```

- [ ] **Step 5: Store the code and the message in `useAddColumns.ts`.** Replace the file with:

  ```ts
  import { PluginError, useAvandar } from "@avandar/plugin-sdk";
  import { useState } from "react";
  import type { DerivedColumn, PluginErrorCode } from "@avandar/plugin-sdk";

  /**
   * Why the last attempt to add columns failed: the `PluginError` code, or
   * undefined for any other error, and the error's own message. The message
   * comes from the host in English, so a form shows it apart from its
   * translated sentence.
   */
  export type AddColumnsError = {
    code: PluginErrorCode | undefined;
    detail: string;
  };

  /**
   * What `useAddColumns` gives a command's form: whether columns are being
   * added, why the last attempt failed, and the function that adds them.
   */
  type AddColumnsState = Readonly<{
    isAdding: boolean;

    /** Why the last attempt failed, or undefined when it has not. */
    error: AddColumnsError | undefined;

    /**
     * Adds the columns `makeColumns` returns to the Data Explorer query the
     * command was invoked on, then closes the modal. On a failure, including
     * one thrown by `makeColumns`, it keeps the modal open and sets `error`.
     */
    addColumns: (makeColumns: () => readonly DerivedColumn[]) => Promise<void>;
  }>;

  function _getAddColumnsErrorFromThrown(error: unknown): AddColumnsError {
    return {
      code: error instanceof PluginError ? error.code : undefined,
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  /**
   * Adds computed columns from a command's modal through
   * `avandar.dataExplorer.addColumns`, and closes the modal once they are
   * added. Call it from a form's submit button, for example the incidence
   * command's "Add columns" button.
   */
  export function useAddColumns(): AddColumnsState {
    const avandar = useAvandar();
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<AddColumnsError | undefined>();
    const addColumns = async (
      makeColumns: () => readonly DerivedColumn[],
    ): Promise<void> => {
      const { dataExplorer } = avandar;
      // The modals render no form without the Data Explorer API.
      if (dataExplorer === undefined) {
        return;
      }
      setIsAdding(true);
      setError(undefined);
      try {
        await dataExplorer.addColumns(makeColumns());
        avandar.ui.closeModal();
      } catch (thrown) {
        setError(_getAddColumnsErrorFromThrown(thrown));
      } finally {
        setIsAdding(false);
      }
    };
    return { isAdding, error, addColumns };
  }
  ```

- [ ] **Step 6: Pass `error` through both form hooks.** In `useIncidenceForm.ts` and `useRollingAverageForm.ts`:
  - add `import type { AddColumnsError } from "../../derivedColumns/useAddColumns";`
  - in the state type, replace `errorMessage: string | undefined;` with `error: AddColumnsError | undefined;`
  - replace `const { isAdding, errorMessage, addColumns } = useAddColumns();` with `const { isAdding, error, addColumns } = useAddColumns();`
  - in the returned object, replace `errorMessage,` with `error,`

- [ ] **Step 7: Show the detail apart in `AddColumnsFooter.tsx`:**

  ```tsx
  import { Alert, Button, Text } from "@avandar/plugin-ui";
  import type { ReactNode } from "react";

  type Props = {
    buttonLabel: string;

    /** Why the last attempt failed, translated, or undefined when it has not. */
    errorText: string | undefined;

    /**
     * The error's own message, in English and not translated. Shown under
     * `errorText`, apart from it, so a translated sentence never holds
     * English.
     */
    errorDetail?: string;
    isAdding: boolean;
    isDisabled: boolean;
    onAdd: () => void;
  };

  /**
   * The end of a form that adds columns to the Data Explorer query: why the
   * last attempt failed, if it did, and the button that adds the columns. Use
   * it under a command's fields, for example the incidence command's.
   */
  export function AddColumnsFooter(props: Readonly<Props>): ReactNode {
    return (
      <>
        {props.errorText === undefined ? null : (
          <Alert color="red">
            {props.errorText}
            {props.errorDetail === undefined ? null : (
              <Text size="xs" c="dimmed" mt="xs" lang="en">
                {props.errorDetail}
              </Text>
            )}
          </Alert>
        )}
        <Button
          loading={props.isAdding}
          disabled={props.isDisabled}
          onClick={props.onAdd}
        >
          {props.buttonLabel}
        </Button>
      </>
    );
  }
  ```

- [ ] **Step 8: Translate by code in both forms.** In `IncidenceForm.tsx` and `RollingAverageForm.tsx`, import the helper:

  ```ts
  import { getAddColumnsErrorKeyFromCode } from "../../derivedColumns/getAddColumnsErrorKeyFromCode/getAddColumnsErrorKeyFromCode";
  ```

  and replace the `errorText={...}` prop with these two props:

  ```tsx
          errorText={
            form.error === undefined
              ? undefined
              : t(getAddColumnsErrorKeyFromCode(form.error.code))
          }
          errorDetail={form.error?.detail}
  ```

- [ ] **Step 9: Run the Step 2 command again.** Expected: PASS. Then:

  ```bash
  node apps/ava-cli/dist/main.cjs plugin validate epidemiology
  grep -rn "incidence.failed\|rollingAverage.failed" plugins/epidemiology
  ```

  Expected: validate exits 0, and grep prints nothing.

- [ ] **Step 10: Document the pattern** in `docs/plugin-authoring.md`.

  In section 6, replace the last paragraph (starting "A command that opens a modal and adds columns from its form should await") with:

  ```md
  A command that opens a modal and adds columns from its form should await
  `addColumns`, then call `avandar.ui.closeModal()` to close the modal. On a
  rejection, keep the modal open and show why in the user's language (see
  "Show errors in the user's language" in section 9), so the user can change a
  field and try again. The epidemiology plugin's incidence and rolling average
  commands work this way (`src/derivedColumns/useAddColumns.ts`).
  ```

  At the end of section 9 ("Translate plugin strings"), before "## 10.", add:

  ````md
  ### Show errors in the user's language

  A `PluginError`'s `message` comes from Avandar, in English. Never put it
  inside a translated sentence. Pick your own translated sentence by the
  error's `code`, and show `message`, if at all, as a separate detail marked
  `lang="en"`, so a screen reader reads it as English:

  ```tsx
  const key =
    error instanceof PluginError && error.code === "InvalidHandle"
      ? "addColumns.error.resultChanged"
      : "addColumns.error.generic";

  <Alert color="red">
    {t(key)}
    <Text size="xs" c="dimmed" lang="en">
      {error.message}
    </Text>
  </Alert>;
  ```

  The epidemiology plugin does this in `src/derivedColumns/`:
  `useAddColumns.ts` keeps the code and the message,
  `getAddColumnsErrorKeyFromCode` picks the sentence, and `AddColumnsFooter.tsx`
  shows both.
  ````

- [ ] **Step 11: Commit.**

  ```bash
  git add plugins/epidemiology docs/plugin-authoring.md
  git commit -m "fix(plugins): translate add-columns errors by code and show the host message apart

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 5: The automatic LIMIT stays outside the wrap

Closes 1b follow-up 2. Two units: 5a gives every result its SQL without the automatic limit, and 5b wraps that SQL and applies the limit after the wrap.

#### Unit 5a: `unlimitedSql` and `autoLimit` on every result

**Unit:** ordinary.

**Files:**
- Modify: `src/clients/queries/runStructuredQuery/runStructuredQuery.types.ts:37-53`
- Modify: `src/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata.ts:20-62,128-186`
- Test: `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts` (the `runStructuredQueryWithMetadata` block)
- Modify: `src/views/DataExplorerApp/useDataQuery/useDataQuery.ts:184-250`
- Test: `src/views/DataExplorerApp/useDataQuery/useDataQuery.test.tsx`

Facts (verified): `makeExecutableQueryFromManualQuery` adds the automatic limit only to a query with no limit of its own (`shouldAutoLimitLargeDataset`), and returns `{ query, didAutoLimit, rowCount? }`. It also resets aggregations a list cannot take. The raw SQL path never consults it.

- [ ] **Step 1: Write the failing tests.** In `runStructuredQuery.test.ts`, add `import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";` and add these tests inside `describe("runStructuredQueryWithMetadata", ...)`:

  ```ts
    it("returns the SQL without the automatic limit, and the limit it added", async () => {
      const concept = _createConcept();
      const query = {
        ...StructuredQuery.makeEmpty(),
        dataSource: concept,
        queryColumns: QueryColumn.makeFromConceptAttributes([
          _createConceptAttribute(concept.id, "age"),
        ]),
      };
      makeExecutableQueryFromManualQueryMock.mockImplementation((params) => {
        return Promise.resolve({
          query: { ...params.query, limit: 100 },
          didAutoLimit: true,
          rowCount: 900000,
        });
      });
      runQueryMock.mockResolvedValue({
        id: uuid(),
        data: [],
        columns: [],
        numRows: 0,
      });

      const run = await runStructuredQueryWithMetadata({
        auth: "workspace",
        workspaceId: uuid<Workspace.Id>(),
        query,
        rawSql: undefined,
        isStructuredQueryInSync: true,
      });

      expect(run.executedSql).toBe(structuredQueryToSql({ ...query, limit: 100 }));
      expect(run.unlimitedSql).toBe(structuredQueryToSql(query));
      expect(run.autoLimit).toBe(100);
    });

    it("returns the SQL that ran as the unlimited SQL when no limit was added", async () => {
      runQueryMock.mockResolvedValue({
        id: uuid(),
        data: [],
        columns: [],
        numRows: 0,
      });

      const run = await runStructuredQueryWithMetadata({
        auth: "workspace",
        workspaceId: uuid<Workspace.Id>(),
        query: StructuredQuery.makeEmpty(),
        rawSql: "SELECT 1",
      });

      expect(run.unlimitedSql).toBe("SELECT 1");
      expect(run.autoLimit).toBeUndefined();
    });

    it("returns the compiled SQL without the automatic limit for an out-of-sync query", async () => {
      const concept = _createConcept();
      const query = {
        ...StructuredQuery.makeEmpty(),
        dataSource: concept,
        queryColumns: QueryColumn.makeFromConceptAttributes([
          _createConceptAttribute(concept.id, "age"),
        ]),
      };
      makeExecutableQueryFromManualQueryMock.mockImplementation((params) => {
        return Promise.resolve({
          query: { ...params.query, limit: 100 },
          didAutoLimit: true,
          rowCount: 900000,
        });
      });
      runQueryMock.mockResolvedValue({
        id: uuid(),
        data: [],
        columns: [],
        numRows: 0,
      });

      const run = await runStructuredQueryWithMetadata({
        auth: "workspace",
        workspaceId: uuid<Workspace.Id>(),
        query,
        rawSql: undefined,
        isStructuredQueryInSync: false,
      });

      expect(run.unlimitedSql).toBe(
        StructuredQuery.toRawDuckDbQuery(query as StructuredQuery.T),
      );
      expect(run.unlimitedSql).not.toBe(run.executedSql);
      expect(run.autoLimit).toBe(100);
    });
  ```

  In `useDataQuery.test.tsx`, add inside `describe("useDataQuery analytics", ...)`:

  ```ts
    it("carries the unlimited SQL and the automatic limit into the result", async () => {
      runStructuredQueryWithMetadataMock.mockResolvedValue({
        result: { id: "r3", columns: [], data: [], numRows: 0 },
        didAutoLimit: true,
        executedSql: "SELECT 1 LIMIT 100",
        unlimitedSql: "SELECT 1",
        autoLimit: 100,
      });

      const { result } = renderHook(
        () => {
          return useDataQuery({
            query: TEST_QUERY,
            rawSql: "SELECT 1",
            auth: "workspace",
            workspaceId: TEST_WORKSPACE_ID,
            analyticsSurface: "data_explorer",
            analyticsTrigger: "sql_submit",
          });
        },
        { wrapper: TestQueryClientWrapper },
      );

      await waitFor(() => {
        expect(result.current[0]?.unlimitedSql).toBe("SELECT 1");
      });
      expect(result.current[0]?.autoLimit).toBe(100);
    });
  ```

- [ ] **Step 2: Run them and confirm they fail.**

  ```bash
  pnpm vitest run src/clients/queries/runStructuredQuery src/views/DataExplorerApp/useDataQuery
  ```

  Expected: FAIL. `unlimitedSql` and `autoLimit` are undefined.

- [ ] **Step 3: Add the fields to the result type** in `runStructuredQuery.types.ts`, inside `RunStructuredQueryResult` after `executedSql`:

  ```ts
    /**
     * `executedSql` without the row limit the Data Explorer adds on its own
     * to a large dataset's query, and equal to it when none was added.
     * Undefined when nothing ran. Use it as the SQL a wrapper builds on, such
     * as the plugin derived-columns wrap, so the wrapper's window expressions
     * read every row.
     */
    unlimitedSql: string | undefined;

    /** The row limit added to `executedSql` on its own, or undefined. */
    autoLimit: number | undefined;
  ```

- [ ] **Step 4: Build both SQL strings in `runStructuredQueryWithMetadata.ts`.** Replace `_selectSqlForExecution` (lines 20-62) with:

  ```ts
  /**
   * The SQL a run executes, and the same SQL without the row limit the
   * large-dataset guard adds on its own.
   */
  type SqlSelection = {
    sqlToRun: string | undefined;

    /** `sqlToRun` without the automatic limit, equal to it without one. */
    unlimitedSqlToRun: string | undefined;
    executionQuery: StructuredQuery.Partial;

    /** `executionQuery` without the automatic limit. */
    unlimitedQuery: StructuredQuery.Partial;
    didAutoLimit: boolean;
    autoLimit: number | undefined;
  };

  /**
   * Makes the structured query a run executes: with the large-dataset
   * auto-limit guard applied for workspace callers, and as given otherwise.
   */
  async function _makeExecutableQuery(
    params: RunStructuredQueryParams,
  ): Promise<{ query: StructuredQuery.Partial; didAutoLimit: boolean }> {
    const { query, rawSql } = params;
    if (rawSql !== undefined) {
      return { query, didAutoLimit: false };
    }
    return await match(params)
      .with({ auth: "workspace" }, async ({ workspaceId }) => {
        return await makeExecutableQueryFromManualQuery({ query, workspaceId });
      })
      .with({ auth: "public" }, () => {
        return { query, didAutoLimit: false };
      })
      .with({ auth: "workspace_published" }, () => {
        return { query, didAutoLimit: false };
      })
      .exhaustive();
  }

  /**
   * Resolves the SQL that should actually run: caller-supplied raw SQL takes
   * precedence, otherwise the structured query is resolved (with the
   * large-dataset auto-limit guard applied for workspace callers) and
   * compiled. Also returns that SQL without the automatic limit.
   */
  async function _selectSqlForExecution(
    params: RunStructuredQueryParams,
  ): Promise<SqlSelection> {
    const { query, rawSql, isStructuredQueryInSync = true } = params;
    const resolved = await _makeExecutableQuery(params);
    const autoLimit = resolved.didAutoLimit ? resolved.query.limit : undefined;
    // The guard limits only a query with no limit of its own, so putting the
    // caller's limit back takes out exactly the automatic one, and keeps the
    // guard's other changes.
    const unlimitedQuery =
      autoLimit === undefined
        ? resolved.query
        : { ...resolved.query, limit: query.limit };
    const sqlToRun = selectSqlToExecute({
      rawSql,
      isStructuredQueryInSync,
      executionQuery: resolved.query,
    });
    return {
      sqlToRun,
      unlimitedSqlToRun:
        autoLimit === undefined
          ? sqlToRun
          : selectSqlToExecute({
              rawSql,
              isStructuredQueryInSync,
              executionQuery: unlimitedQuery,
            }),
      executionQuery: resolved.query,
      unlimitedQuery,
      didAutoLimit: resolved.didAutoLimit,
      autoLimit,
    };
  }
  ```

  Replace `_runSourceQuery` (its docblock stays) with:

  ```ts
  async function _runSourceQuery({
    workspaceId,
    dataSource,
    executionQuery,
    unlimitedQuery,
    queryColumnCount,
  }: {
    workspaceId: Workspace.Id;
    dataSource: QueryDataSource.T | undefined;
    executionQuery: StructuredQuery.Partial;
    unlimitedQuery: StructuredQuery.Partial;
    queryColumnCount: number;
  }): Promise<
    Pick<RunStructuredQueryResult, "result" | "executedSql" | "unlimitedSql">
  > {
    if (!dataSource || queryColumnCount === 0) {
      return {
        result: QueryResult.makeEmpty(),
        executedSql: undefined,
        unlimitedSql: undefined,
      };
    }

    const rawSql = StructuredQuery.toRawDuckDbQuery({
      ...executionQuery,
      dataSource,
    } as StructuredQuery.T);
    return {
      result: await WorkspaceQuerySession.runQuery({ rawSql, workspaceId }),
      executedSql: rawSql,
      unlimitedSql: StructuredQuery.toRawDuckDbQuery({
        ...unlimitedQuery,
        dataSource,
      } as StructuredQuery.T),
    };
  }
  ```

  In `runStructuredQueryWithMetadata`, replace the body from `const { sqlToRun, executionQuery, didAutoLimit } =` to the end with:

  ```ts
    const selection = await _selectSqlForExecution(params);
    const { sqlToRun, didAutoLimit, autoLimit } = selection;

    if (sqlToRun) {
      return {
        result: await _runRawSql(params, sqlToRun),
        didAutoLimit,
        autoLimit,
        executedSql: sqlToRun,
        unlimitedSql: selection.unlimitedSqlToRun,
      };
    }

    const sourceRun = await _runSourceQuery({
      workspaceId: _getWorkspaceAuthFromStructuredQuery(params).workspaceId,
      dataSource,
      executionQuery: selection.executionQuery,
      unlimitedQuery: selection.unlimitedQuery,
      queryColumnCount: queryColumns.length,
    });
    return { ...sourceRun, didAutoLimit, autoLimit };
  ```

- [ ] **Step 5: Carry both fields through `useDataQuery.ts`.** In the hook's return type and in `queryFn`'s return type, extend `{ executedSql: string | undefined; metadataProvenance?: QueryMetadataProvenance; }` with:

  ```ts
        unlimitedSql: string | undefined;
        autoLimit: number | undefined;
  ```

  and in `queryFn`, return them:

  ```ts
          return {
            ...run.result,
            executedSql: run.executedSql,
            unlimitedSql: run.unlimitedSql,
            autoLimit: run.autoLimit,
            metadataProvenance: createQueryMetadataProvenance(),
          };
  ```

- [ ] **Step 6: Run the Step 2 command again.** Expected: PASS. Then `npx tsc -b`. If another caller builds a full `RunStructuredQueryResult` or a typed `useDataQuery` result, `tsc` lists it: add the two fields there with the values the run gave (`runLatLngLayer.ts` only reads `result` and `didAutoLimit`, so it should not appear).

- [ ] **Step 7: Commit.**

  ```bash
  git add src/clients/queries/runStructuredQuery src/views/DataExplorerApp/useDataQuery
  git commit -m "fix(data-explorer): return each result's SQL without the automatic row limit

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

#### Unit 5b: The wrap reads the unlimited SQL and limits after itself

**Unit:** ordinary.

**Files:**
- Modify: `src/lib/plugins/DataExplorerBridge.types.ts`
- Modify: `src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns.ts:160-206`
- Test: `.../makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.test.ts`, `.../__tests__/makeDerivedColumnsSqlFromColumns.executed.test.ts`
- Modify: `src/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation.ts:35-42`
- Test: `.../addColumnsForInvocation/addColumnsForInvocation.test.ts`
- Modify: `src/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge.ts`
- Test: `.../useDataExplorerPluginBridge/useDataExplorerPluginBridge.test.tsx`
- Modify: `src/views/DataExplorerApp/DataExplorerApp.tsx:227-229`
- Test: `src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx:63-86`
- Modify: `docs/plugin-authoring.md` (section 6, step 1 of "Avandar then")

A limit the user set in the query builder or wrote in SQL is not automatic: it stays in `unlimitedSql`, inside the wrap. After a plugin's SQL runs, the explorer runs it as raw SQL, so a second command wraps that SQL, limit included, as the user's own.

- [ ] **Step 1: Write the failing tests.**

  `makeDerivedColumnsSqlFromColumns.test.ts`, inside the `describe`:

  ```ts
    it("limits the rows after the row order, outside the wrapped source", () => {
      const { sql } = makeDerivedColumnsSqlFromColumns({
        baseSql: BASE_SQL,
        existingColumnNames: EXISTING_COLUMN_NAMES,
        columns: [RATE_COLUMN],
        rowLimit: 100,
      });

      expect(sql.endsWith("ORDER BY __ava_row\nLIMIT 100")).toBe(true);
      expect(sql.match(/LIMIT/g)).toHaveLength(1);
    });

    it("adds no limit without a row limit", () => {
      const { sql } = _makeSqlFromColumns([RATE_COLUMN]);

      expect(sql).not.toContain("LIMIT");
    });
  ```

  `makeDerivedColumnsSqlFromColumns.executed.test.ts`, below `DERIVED_SQL`:

  ```ts
  /**
   * 200 days of cases, newest first, cut to the 100 newest. The automatic
   * limit is outside the wrap, so the oldest returned day still averages
   * with the day before it.
   */
  const { sql: LIMITED_SQL } = makeDerivedColumnsSqlFromColumns({
    baseSql: `
      SELECT
        range::INTEGER AS id,
        DATE '2024-01-01' + range::INTEGER AS day,
        range::INTEGER AS cases
      FROM range(1, 201)
      ORDER BY day DESC
    `,
    existingColumnNames: ["id", "day", "cases"],
    columns: [
      {
        name: "cases_2d_avg",
        expression:
          "avg({cases}) OVER (ORDER BY {day} RANGE BETWEEN INTERVAL 1 DAY PRECEDING AND CURRENT ROW)",
        inputs: { cases: "cases", day: "day" },
      },
    ],
    rowLimit: 100,
  });
  ```

  and inside the `describe`:

  ```ts
    it("averages over every source row when a row limit cuts the result", async () => {
      const rows = await withDuckDb(async (connection) => {
        const reader = await connection.runAndReadAll(LIMITED_SQL);
        return reader.getRowObjectsJson();
      });

      expect(rows).toHaveLength(100);
      // Day 101 averages days 100 and 101. Day 100 is past the limit, so a
      // limit inside the wrap would give 101 here.
      expect(rows.at(-1)).toMatchObject({ id: 101, cases_2d_avg: 100.5 });
    });
  ```

  `addColumnsForInvocation.test.ts`, inside the `describe`:

  ```ts
    it("limits the wrapped SQL to the bridge's row limit", () => {
      const bridge = { ..._makeBridge(), rowLimit: 100 };

      addColumnsForInvocation({
        context: CONTEXT,
        bridge,
        columns: [RATE_COLUMN],
      });

      expect(bridge.applyDerivedColumnsSql).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringMatching(/ORDER BY __ava_row\nLIMIT 100$/) as unknown,
        }),
      );
    });
  ```

  `useDataExplorerPluginBridge.test.tsx`: the hook's input becomes `unlimitedSql` and `autoLimit`. Change:

  ```ts
  type HookProps = {
    unlimitedSql: string | undefined;
    autoLimit: number | undefined;
  };
  ```

  ```ts
  /**
   * Renders the hook beside the explorer state it reads and writes, starting
   * from `unlimitedSql` and `autoLimit`.
   */
  function _renderBridgeHook(
    unlimitedSql: string | undefined,
    autoLimit: number | undefined = undefined,
  ) {
    return renderHook(
      (props: HookProps) => {
        return {
          getBridge: useDataExplorerPluginBridge(props),
          state: DataExplorerStateManager.useState(),
          dispatch: DataExplorerStateManager.useDispatch(),
        };
      },
      { wrapper: _wrapper, initialProps: { unlimitedSql, autoLimit } },
    );
  }
  ```

  and at line 105: `rendered.rerender({ unlimitedSql: \`SELECT "cases" FROM "nyc"\`, autoLimit: undefined });`. Add:

  ```ts
    it("gives the bridge the automatic row limit of the result on screen", () => {
      const { result } = _renderBridgeHook(BASE_SQL, 100);

      expect(result.current.getBridge?.().rowLimit).toBe(100);
    });
  ```

  `pluginDerivedColumns.integration.test.tsx`: in `RESULTS_BY_SQL`, add `unlimitedSql: BASE_SQL, autoLimit: undefined,` to the base result after `executedSql: BASE_SQL,`, and `unlimitedSql: WRAPPED_SQL, autoLimit: undefined,` to the wrapped result after `executedSql: WRAPPED_SQL,`.

- [ ] **Step 2: Run them and confirm they fail.**

  ```bash
  pnpm vitest run src/lib/plugins/derivedColumns src/views/DataExplorerApp/useDataExplorerPluginBridge src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx
  pnpm test:executed src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.executed.test.ts
  ```

  Expected: FAIL. No `LIMIT` is appended, the bridge has no `rowLimit`, and the hook still reads `executedSql`, so the bridge tests and the integration test find no bridge.

- [ ] **Step 3: Add `rowLimit` to the bridge type** in `DataExplorerBridge.types.ts`, after `baseSql`:

  ```ts
    /**
     * The row limit the Data Explorer added on its own to the result's query,
     * which `baseSql` leaves out. The wrapped SQL applies it after the added
     * columns, so a window expression reads every row. Undefined when none
     * was added.
     */
    rowLimit?: number;
  ```

  and in the `baseSql` comment, replace "The SQL behind the result the command was invoked on" with "The SQL behind the result the command was invoked on, without the row limit the Data Explorer adds on its own".

- [ ] **Step 4: Append the limit in `makeDerivedColumnsSqlFromColumns.ts`.** Add `rowLimit?: number;` to the options type, destructure it (`const { baseSql, existingColumnNames, columns, rowLimit } = options;`), and end the SQL array with:

  ```ts
      "FROM ava_source",
      "ORDER BY __ava_row",
      ...(rowLimit === undefined ? [] : [`LIMIT ${rowLimit}`]),
    ].join("\n");
  ```

  Add one sentence to the docblock after "A row number keeps the base query's row order, which a window expression would otherwise change.": "With `rowLimit`, the SQL returns at most that many rows, counted after the columns are added, so a window expression still reads every row of `baseSql`."

- [ ] **Step 5: Pass it on in `addColumnsForInvocation.ts`:**

  ```ts
    const { sql, columnNames } = makeDerivedColumnsSqlFromColumns({
      baseSql: bridge.baseSql,
      existingColumnNames: context.columns.map((column) => {
        return column.name;
      }),
      columns,
      rowLimit: bridge.rowLimit,
    });
  ```

- [ ] **Step 6: Build the bridge from the unlimited SQL** in `useDataExplorerPluginBridge.ts`. Replace `LatestExplorer`, `_makeBridgeFromBaseSql`'s options and its staleness check, and the hook's input:

  ```ts
  type LatestExplorer = Readonly<{
    unlimitedSql: string | undefined;
    state: DataExplorerAppState;
  }>;
  ```

  ```ts
  function _makeBridgeFromBaseSql(
    options: Readonly<{
      baseSql: string;
      rowLimit: number | undefined;
      latestRef: RefObject<LatestExplorer>;
      dispatch: Dispatch;
    }>,
  ): DataExplorerBridge {
    const { baseSql, rowLimit, latestRef, dispatch } = options;
    return {
      baseSql,
      rowLimit,
      applyDerivedColumnsSql: ({ sql, columnNames }) => {
        const { unlimitedSql, state } = latestRef.current;
        if (
          unlimitedSql === undefined ||
          normalizeSqlForSubquery(unlimitedSql) !==
            normalizeSqlForSubquery(baseSql)
        ) {
          return false;
        }
  ```

  (The rest of `applyDerivedColumnsSql` is unchanged.)

  ```ts
  export function useDataExplorerPluginBridge(
    options: Readonly<{
      /**
       * `unlimitedSql` of the result on screen: its SQL without the row limit
       * the Data Explorer added on its own. Undefined while there is no
       * result or a run is in flight.
       */
      unlimitedSql: string | undefined;

      /** The row limit the Data Explorer added to that result, or undefined. */
      autoLimit: number | undefined;
    }>,
  ): (() => DataExplorerBridge) | undefined {
    const { unlimitedSql, autoLimit } = options;
    const state = DataExplorerStateManager.useState();
    const dispatch = DataExplorerStateManager.useDispatch();
    const latestRef = useRef<LatestExplorer>({ unlimitedSql, state });
    useLayoutEffect(() => {
      latestRef.current = { unlimitedSql, state };
      return () => {
        // Plugin modals live at the app root and can outlast the explorer.
        // With no SQL, an apply after unmount returns false.
        latestRef.current = { unlimitedSql: undefined, state };
      };
    }, [unlimitedSql, state]);

    return useMemo(() => {
      if (unlimitedSql === undefined) {
        return undefined;
      }
      return () => {
        return _makeBridgeFromBaseSql({
          baseSql: unlimitedSql,
          rowLimit: autoLimit,
          latestRef,
          dispatch,
        });
      };
    }, [unlimitedSql, autoLimit, dispatch]);
  }
  ```

  In `DataExplorerApp.tsx`:

  ```tsx
    const pluginBridge = useDataExplorerPluginBridge({
      unlimitedSql: isLoadingResults ? undefined : queryResults?.unlimitedSql,
      autoLimit: isLoadingResults ? undefined : queryResults?.autoLimit,
    });
  ```

- [ ] **Step 7: Run the Step 2 commands again.** Expected: PASS. Then `pnpm vitest run src/views/DataExplorerApp src/lib/plugins` and `npx tsc -b`. Expected: PASS and exit 0.

- [ ] **Step 8: Update the docs.** In `docs/plugin-authoring.md` section 6, step 1 of "Avandar then", replace the paragraph "When the query came from the query builder with no SQL of its own, the automatic row limit the Data Explorer applied to it becomes part of the wrapped SQL." with:

  ```md
     When the Data Explorer limited a large dataset's query on its own, the
     wrap reads the query without that limit and applies the same limit after
     `ORDER BY __ava_row`, so a window expression such as a rolling average
     reads every row. A limit the user set in the query builder, or wrote in
     SQL, stays inside the wrap.
  ```

- [ ] **Step 9: Commit.**

  ```bash
  git add src/lib/plugins src/views/DataExplorerApp docs/plugin-authoring.md
  git commit -m "fix(plugins): apply the automatic row limit outside the derived-columns wrap

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 6: Quote-aware single-expression check (HIGH-RISK: SQL injection guard)

Closes 1b follow-up 3. Run the task-level review on Opus (xhigh) after the unit review. **Unit:** ordinary.

**Files:**
- Modify: `src/lib/sql/assertSingleSqlExpression/assertSingleSqlExpression.ts:5-9,198-237`
- Test: `src/lib/sql/assertSingleSqlExpression/assertSingleSqlExpression.test.ts`
- Test: `src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.test.ts`
- Modify: `docs/plugin-authoring.md:355,362-363`

How the check stays safe. It looks for `;`, `--`, and `/*` only in the text DuckDB reads as SQL, so its split of the expression into quoted and unquoted text must match DuckDB's:

- A double-quoted identifier or a single-quoted string is matched whole, with a doubled quote kept inside, and only a lone quote closing it: `"(?:[^"]|"")*"(?!")`. The `(?!")` stops the pattern from closing on the first half of a doubled quote, so it matches exactly the span DuckDB reads, or nothing.
- A quote the pattern cannot close is unterminated, and the expression is rejected.
- DuckDB also reads escape strings (`E'...'`, where `\'` is a quote and does not close it) and dollar-quoted strings (`$$...$$`). The pattern does not know them, so where they appear it could see a string where DuckDB sees SQL. When an `e'` or `E'` string, a `$`, or a backtick appears outside quotes, the check falls back to today's rule: the tokens are rejected anywhere in the expression.
- The parser and the denied-function walk still run on the whole expression, as before.

- [ ] **Step 1: Write the failing tests.** In `assertSingleSqlExpression.test.ts`, inside the `describe`:

  ```ts
    it.each([
      ["a semicolon", `"a;b" * 2`],
      ["a line comment marker", `"a--b" * 2`],
      ["a block comment marker", `"a/*b" * 2`],
      ["an escaped quote next to a semicolon", `"a"";b" * 2`],
    ])("accepts %s inside a quoted identifier", (_label, expression) => {
      expect(_getThrownCode(expression)).toBeUndefined();
    });

    it("accepts a string literal with an escaped quote and a line comment marker", () => {
      expect(_getThrownCode(`'it''s -- fine'`)).toBeUndefined();
    });

    it.each([
      ["a semicolon after a quoted identifier", `"a;b"; DROP TABLE t`],
      ["a line comment after a string", `'x' -- comment`],
      ["a block comment between quoted spans", `"a" /* x */ || 'b'`],
      ["an unterminated identifier", `"a;b * 2`],
      ["an unterminated string", `'a -- b`],
      ["a doubled quote that leaves the identifier open", `"a"";b`],
      ["a semicolon an escape string hides", String.raw`E'\'' ; SELECT 1 --'`],
      ["a semicolon a dollar-quoted string hides", `$$'$$ ; SELECT 1 --'`],
      ["a semicolon inside an escape string", `E'a;b'`],
    ])("rejects %s with InvalidExpression", (_label, expression) => {
      expect(_getThrownCode(expression)).toBe("InvalidExpression");
    });
  ```

  In `makeDerivedColumnsSqlFromColumns.test.ts`, inside the `describe`:

  ```ts
    it("reads an input column whose name has a semicolon and comment markers", () => {
      const { sql } = _makeSqlFromColumns(
        [{ name: "doubled", expression: "{c} * 2", inputs: { c: "a;b--c" } }],
        ["a;b--c"],
      );

      expect(sql).toContain(`  ("a;b--c" * 2) AS "doubled"`);
    });
  ```

- [ ] **Step 2: Run them and confirm they fail.**

  ```bash
  pnpm vitest run src/lib/sql/assertSingleSqlExpression src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns
  ```

  Expected: FAIL. The quoted cases and `'it''s -- fine'` are rejected today. The new reject cases already pass (they are the guard).

- [ ] **Step 3: Implement.** In `assertSingleSqlExpression.ts`, replace the `FORBIDDEN_SQL_TOKENS` docblock (lines 5-8):

  ```ts
  /**
   * Text that could end the expression early or hide what follows it from
   * the parser. Rejected outside quoted identifiers and string literals, and
   * anywhere in an expression whose quotes the check cannot split the way
   * DuckDB does.
   */
  const FORBIDDEN_SQL_TOKENS = [";", "--", "/*"] as const;

  /**
   * One token of a SQL expression: a whole double-quoted identifier or
   * single-quoted string as DuckDB reads it (a doubled quote stays inside,
   * and only a lone quote closes it), or else one character. A quote the
   * first two cannot close comes out as a one-character token.
   */
  const SQL_TOKEN_PATTERN = /"(?:[^"]|"")*"(?!")|'(?:[^']|'')*'(?!')|[\s\S]/g;

  /**
   * Characters that, outside quotes, start text DuckDB reads in a way
   * `SQL_TOKEN_PATTERN` does not: a dollar-quoted string, or a backtick.
   */
  const UNSPLIT_CHARACTERS = new Set(["$", "`"]);
  ```

  Above `assertSingleSqlExpression`, add:

  ```ts
  function _getSqlTokens(expression: string): string[] {
    return Array.from(expression.matchAll(SQL_TOKEN_PATTERN), (match) => {
      return match[0];
    });
  }

  /**
   * True when `tokens` hold text `SQL_TOKEN_PATTERN` may split differently
   * from DuckDB: an escape string (`E'...'`, where `\'` does not close it),
   * a dollar-quoted string, or a backtick.
   */
  function _hasUnsplitText(tokens: readonly string[]): boolean {
    return tokens.some((token, index) => {
      const previousToken = tokens[index - 1];
      return (
        UNSPLIT_CHARACTERS.has(token) ||
        (token.startsWith("'") &&
          (previousToken === "e" || previousToken === "E"))
      );
    });
  }

  /**
   * The text a forbidden token is looked for in: `expression` with each
   * quoted identifier and string literal replaced by a space, so `;`, `--`,
   * and `/*` are allowed inside quotes. The whole expression when its quotes
   * cannot be split the way DuckDB does. Undefined when a quote is never
   * closed.
   */
  function _getTextOutsideQuotesOrUndefined(
    expression: string,
  ): string | undefined {
    const tokens = _getSqlTokens(expression);
    if (_hasUnsplitText(tokens)) {
      return expression;
    }
    if (
      tokens.some((token) => {
        return token === '"' || token === "'";
      })
    ) {
      return undefined;
    }
    return tokens
      .map((token) => {
        // Every token but a quoted span is one character long.
        return token.length > 1 ? " " : token;
      })
      .join("");
  }
  ```

  In `assertSingleSqlExpression`, replace the first `if` (the `FORBIDDEN_SQL_TOKENS.some(...)` check and its throw) with:

  ```ts
    const textOutsideQuotes = _getTextOutsideQuotesOrUndefined(expression);
    if (textOutsideQuotes === undefined) {
      throw new PluginError(
        "InvalidExpression",
        `The expression has a quote that is never closed: ${expression}`,
      );
    }
    if (
      FORBIDDEN_SQL_TOKENS.some((token) => {
        return textOutsideQuotes.includes(token);
      })
    ) {
      throw new PluginError(
        "InvalidExpression",
        `The expression must not contain ";", "--", or "/*" outside quotes: ${expression}`,
      );
    }
  ```

  In its docblock, replace "no `;` or comment" with "no `;` or comment outside quoted identifiers and string literals".

- [ ] **Step 4: Run the Step 2 command again.** Expected: PASS, including every existing case in both files. Then `pnpm vitest run src/lib/plugins` and `pnpm test:executed src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.executed.test.ts`. Expected: PASS.

- [ ] **Step 5: Update the docs.** In `docs/plugin-authoring.md`, in the `expression` row of the `DerivedColumn` table (line 355), replace "`;`, `--`, and `/*` are rejected anywhere, even inside a string literal." with "`;`, `--`, and `/*` are rejected outside quoted identifiers and string literals. In an expression with an escape string (`E'...'`), a dollar-quoted string, or a backtick, they are rejected anywhere." Below the table, replace the two lines "The expression is checked after the substitution, so a column whose name contains `;`, `--`, or `/*` makes `addColumns` reject." with "A column whose name contains `;`, `--`, or `/*` works too: the check skips quoted identifiers."

- [ ] **Step 6: Commit.**

  ```bash
  git add src/lib/sql/assertSingleSqlExpression src/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/__tests__/makeDerivedColumnsSqlFromColumns.test.ts docs/plugin-authoring.md
  git commit -m "fix(plugins): allow ;, --, and /* inside quotes in derived column expressions

  The single-expression check now looks for them only outside quoted
  identifiers and string literals, split the way DuckDB splits them. An
  expression with an escape string, a dollar quote, or a backtick keeps the
  whole-text rule, since those could hide SQL from the split.

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

- [ ] **Step 7: Task-level review** (Opus, xhigh). Focus: any input where the token split disagrees with DuckDB's lexer so that a `;` or a comment reaches DuckDB as SQL (try escape strings, dollar quotes with tags, `U&` strings, unterminated quotes, doubled quotes at span ends, and quotes inside identifiers), and whether the fallback triggers on every such case.

---

### Task 7: Eval: fit questions run alone, and `R01` selects

Closes 1c follow-ups 2 and 3. **Unit:** ordinary.

**Files:**
- Modify: `scripts/ai-eval/selectEvalQuestions.ts:7-43`
- Test: `scripts/ai-eval/selectEvalQuestions.test.ts`
- Create: `scripts/ai-eval/runtime/runEvalConversations/runEvalConversations.ts`
- Test: `scripts/ai-eval/runtime/runEvalConversations/runEvalConversations.test.ts`
- Modify: `scripts/ai-eval/runEval.ts:1-27,101-115,248-276`

Fact (verified): a fit question publishes its rows to `ExplorerPluginResultStore` for as long as it is asked (`PiHarness.ts:324-343`), and that store is global, so any question asked at the same time can be offered `fitRegression`.

- [ ] **Step 1: Write the failing tests.**

  `selectEvalQuestions.test.ts`, inside the `describe`:

  ```ts
    it("runs only R01 for --questions R01", () => {
      expect(_ids("R01")).toEqual(["R01"]);
    });

    it("combines R01 with another question's id", () => {
      expect(_ids("F01,R01")).toEqual(["F01", "R01"]);
    });
  ```

  `runEvalConversations.test.ts`:

  ```ts
  import { describe, expect, it } from "vitest";
  import { COVID_QUESTIONS } from "../../covid/covidQuestions";
  import { FIT_REGRESSION_QUESTIONS } from "../../covid/fitRegressionQuestions";
  import { runEvalConversations } from "./runEvalConversations";
  import type { EvalQuestion } from "../../EvalQuestion";

  const [COVID_QUESTION] = COVID_QUESTIONS;
  const [FIT_QUESTION] = FIT_REGRESSION_QUESTIONS;

  function _makeConversation(id: string, isFit: boolean): EvalQuestion[] {
    const question = isFit ? FIT_QUESTION : COVID_QUESTION;
    if (question === undefined) {
      throw new Error("The eval has no question to copy");
    }
    return [{ ...question, id }];
  }

  /**
   * Runs the conversations and records, at the start of each, the ids of
   * every conversation running then, itself included.
   */
  async function _getRunningIdsAtEachStart(
    conversations: readonly EvalQuestion[][],
    concurrency: number,
  ): Promise<string[][]> {
    const runningIds = new Set<string>();
    const snapshots: string[][] = [];
    await runEvalConversations({
      conversations,
      concurrency,
      runOne: async (questions) => {
        const id = questions[0]?.id ?? "";
        runningIds.add(id);
        snapshots.push([...runningIds].sort());
        await new Promise((resolve) => {
          setTimeout(resolve, 5);
        });
        runningIds.delete(id);
      },
    });
    return snapshots;
  }

  describe("runEvalConversations", () => {
    it("runs no other conversation while a fit question runs", async () => {
      const snapshots = await _getRunningIdsAtEachStart(
        [
          _makeConversation("B01", false),
          _makeConversation("R01", true),
          _makeConversation("B02", false),
          _makeConversation("B03", false),
        ],
        4,
      );

      expect(
        snapshots.filter((ids) => {
          return ids.includes("R01");
        }),
      ).toEqual([["R01"]]);
    });

    it("runs every conversation once", async () => {
      const snapshots = await _getRunningIdsAtEachStart(
        [
          _makeConversation("B01", false),
          _makeConversation("R01", true),
          _makeConversation("B02", false),
        ],
        2,
      );

      expect(snapshots).toHaveLength(3);
    });

    it("keeps at most the concurrency in flight", async () => {
      const snapshots = await _getRunningIdsAtEachStart(
        ["B01", "B02", "B03", "B04"].map((id) => {
          return _makeConversation(id, false);
        }),
        2,
      );

      expect(
        Math.max(
          ...snapshots.map((ids) => {
            return ids.length;
          }),
        ),
      ).toBe(2);
    });
  });
  ```

- [ ] **Step 2: Run them and confirm they fail.**

  ```bash
  pnpm vitest run scripts/ai-eval/selectEvalQuestions.test.ts scripts/ai-eval/runtime/runEvalConversations
  ```

  Expected: FAIL. `R01` selects nothing, and the module is missing.

- [ ] **Step 3: Select fit questions by id** in `selectEvalQuestions.ts`. Replace the `fitQuestions` constant with:

  ```ts
    const fitQuestions = FIT_REGRESSION_QUESTIONS.filter((question) => {
      return tokens.includes(FIT_REGRESSION_SELECTOR) || wanted.has(question.id);
    });
  ```

  In the docblock, replace "A full id such as `B01` picks one question." with "A full id such as `B01` or `R01` picks one question."

- [ ] **Step 4: Create `runEvalConversations.ts`:**

  ```ts
  import type { EvalQuestion } from "../../EvalQuestion";

  type RunOne = (questions: readonly EvalQuestion[]) => Promise<void>;

  function _isFitConversation(questions: readonly EvalQuestion[]): boolean {
    return questions[0]?.fitRegression !== undefined;
  }

  /** Runs `conversations` with at most `concurrency` in flight. */
  async function _runConcurrently(
    conversations: readonly EvalQuestion[][],
    concurrency: number,
    runOne: RunOne,
  ): Promise<void> {
    const queue = [...conversations];
    const runNext = async (): Promise<void> => {
      const questions = queue.shift();
      if (questions === undefined) {
        return;
      }
      await runOne(questions);
      await runNext();
    };
    await Promise.all(
      Array.from({ length: concurrency }, () => {
        return runNext();
      }),
    );
  }

  /**
   * Runs an eval's conversations. Those that do not open with a fit question
   * run with at most `concurrency` in flight. Each that does runs alone,
   * after them: a fit question publishes its rows as the Data Explorer's
   * result while it runs, so a question asked at the same time could be
   * offered the `fitRegression` tool. `runEval.ts` is its only caller.
   */
  export async function runEvalConversations(
    options: Readonly<{
      conversations: readonly EvalQuestion[][];
      concurrency: number;
      runOne: RunOne;
    }>,
  ): Promise<void> {
    const { conversations, concurrency, runOne } = options;
    await _runConcurrently(
      conversations.filter((questions) => {
        return !_isFitConversation(questions);
      }),
      concurrency,
      runOne,
    );
    await _runConcurrently(conversations.filter(_isFitConversation), 1, runOne);
  }
  ```

- [ ] **Step 5: Use it in `runEval.ts`.** Delete `_runAll` and its docblock (lines 101-115). Add `import { runEvalConversations } from "./runtime/runEvalConversations/runEvalConversations";` beside the other `./runtime/` imports. In `main()`, replace the `await _runAll(` call with:

  ```ts
    await runEvalConversations({
      conversations: _toConversations(
        _selectQuestions(options.questions, workspace.questions),
      ),
      concurrency: Number(options.concurrency),
      runOne: async (questions) => {
        await _runConversation({
          harness,
          database,
          questions,
          onGraded: (answer) => {
            graded.push(answer);
            console.log(
              `${answer.pass ? "PASS" : "FAIL"} ${answer.id} ${answer.questionsAsked > 0 ? `(asked ${answer.questionsAsked}) ` : ""}$${answer.answer.usage.cost.toFixed(5)} ${(answer.answer.latencyMs / 1000).toFixed(1)}s  ${answer.detail}`,
            );
          },
        });
      },
    });
  ```

  In the header comment, replace "`--questions R` runs the fitRegression question, which calls the epidemiology plugin's tool on a result the Data Explorer shows." with "`--questions R` runs the fitRegression questions, and `--questions R01` one of them. They call the epidemiology plugin's tool on a result the Data Explorer shows, and run one at a time after the other questions."

- [ ] **Step 6: Run the Step 2 command again, then every eval test.**

  ```bash
  pnpm vitest run scripts/ai-eval
  npx tsc -b
  ```

  Expected: PASS and exit 0.

- [ ] **Step 7: Commit.**

  ```bash
  git add scripts/ai-eval
  git commit -m "fix(ai-eval): run fit questions alone and select R01 by id

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 8: Epidemiology small items

Closes 1b follow-ups 4 and 6, 1c follow-up 7, and the React Doctor "Derived state stored in an effect" warning. **Unit:** ordinary. Run after Task 4. One commit per item.

**Files:**
- Modify: `plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.ts:26-38`
- Modify: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/useRollingAverageForm.ts`
- Test: `plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.test.tsx`
- Modify: `plugins/epidemiology/src/fitRegression/runFitRegression.ts:30-56`
- Test: `plugins/epidemiology/src/fitRegression/runFitRegression.test.ts`
- Modify: `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/useContainerWidth.ts`
- Test: `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveModal.test.tsx`

- [ ] **Step 1: Array lookup.** In `getColumnNamesFromColumns.ts`, replace the body of `getColumnNamesFromColumns` with:

  ```ts
    const { columns, dataTypes } = options;
    const acceptedDataTypes = new Set(dataTypes);
    return columns
      .filter((column) => {
        return acceptedDataTypes.has(column.dataType);
      })
      .map((column) => {
        return column.name;
      });
  ```

  Run `pnpm vitest run plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns`. Expected: PASS (the existing tests are the guard). Commit:

  ```bash
  git add plugins/epidemiology/src/derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns.ts
  git commit -m "refactor(plugins): look up accepted column types in a set

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

- [ ] **Step 2: Group-by guard test.** In `RollingAverageModal.test.tsx`, after "drops a group-by column once it becomes the value column", add:

  ```ts
    it("keeps the group-by empty after the value column takes it and moves on", async () => {
      const { addColumns } = _renderModal({});
      _pickOption("Group by", "district_id");
      _pickOption("Value column", "district_id");
      _pickOption("Value column", "cases");

      expect(screen.getByRole("combobox", { name: "Group by" })).toHaveValue("");
      _clickAdd();
      await waitFor(() => {
        expect(addColumns).toHaveBeenCalledTimes(1);
      });
      expect(addColumns.mock.calls[0]?.[0]?.[0]?.inputs).toEqual({
        value: "cases",
        date: "report_date",
      });
    });
  ```

  Run `pnpm vitest run plugins/epidemiology/src/rollingAverage`. Expected: PASS already (see deviation 4). The test guards the change below.

- [ ] **Step 3: Normalize at write time.** In `useRollingAverageForm.ts`, replace `_buildGroupByChoices` and its docblock with:

  ```ts
  /**
   * The chosen columns without a group-by column that is also the value or
   * date column, since a column cannot group its own average.
   */
  function _clearGroupByTakenElsewhere(
    columnsInput: RollingAverageColumnsInput,
  ): RollingAverageColumnsInput {
    const { valueColumn, dateColumn, groupByColumn } = columnsInput;
    return groupByColumn !== undefined &&
      (groupByColumn === valueColumn || groupByColumn === dateColumn)
      ? { ...columnsInput, groupByColumn: undefined }
      : columnsInput;
  }

  /** The columns a group-by can be: all but the chosen value and date ones. */
  function _getGroupByColumnNames(
    options: Readonly<{
      columnNames: readonly string[];
      columnsInput: RollingAverageColumnsInput;
    }>,
  ): string[] {
    const { columnNames, columnsInput } = options;
    return columnNames.filter((columnName) => {
      return (
        columnName !== columnsInput.valueColumn &&
        columnName !== columnsInput.dateColumn
      );
    });
  }
  ```

  In the hook, replace the three statements from `const [chosenColumns, setColumnsInput] = useState<RollingAverageColumnsInput>(` through the `_buildGroupByChoices({ ... });` call (the `windowInput` state between them is kept, as below) with:

  ```ts
    const [columnsInput, setNormalizedColumnsInput] =
      useState<RollingAverageColumnsInput>({
        valueColumn: options.initialValueColumn,
        dateColumn: options.initialDateColumn,
        groupByColumn: undefined,
      });
    const setColumnsInput = (
      nextColumnsInput: RollingAverageColumnsInput,
    ): void => {
      setNormalizedColumnsInput(_clearGroupByTakenElsewhere(nextColumnsInput));
    };
    const [windowInput, setWindowInput] = useState(INITIAL_WINDOW_INPUT);
    const groupByColumnNames = _getGroupByColumnNames({
      columnNames: options.columnNames,
      columnsInput,
    });
  ```

  In `RollingAverageFormState`, the `columnsInput` comment becomes: "The chosen columns. Choosing the group-by column as the value or date column clears the group-by."

- [ ] **Step 4: Prove the guard can fail, then pass.** Temporarily replace `setNormalizedColumnsInput(_clearGroupByTakenElsewhere(nextColumnsInput));` with `setNormalizedColumnsInput(nextColumnsInput);` and run `pnpm vitest run plugins/epidemiology/src/rollingAverage`. Expected: FAIL (the group-by stays, and the payload has a group). Restore the line and rerun. Expected: PASS. Commit:

  ```bash
  git add plugins/epidemiology/src/rollingAverage/RollingAverageModal
  git commit -m "fix(plugins): clear a taken rolling-average group-by when it is chosen

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

- [ ] **Step 5: Fit column checks, guard test.** In `runFitRegression.test.ts`, after "rejects a text column even when its values read as numbers, before it fetches rows", add:

  ```ts
    it("reports the X column before the Y column when both are wrong", async () => {
      const avandar = _makeAvandarWithRows({
        rows: [{ y: "a" }],
        columnNames: ["y"],
        dataTypes: { y: "varchar" },
      });
      const error = await _getRejection(
        runFitRegression(avandar, { xColumn: "x", yColumn: "y" }),
      );
      expect((error as PluginError).message).toBe(
        'Column "x" is not on the result.',
      );
    });
  ```

  Run `pnpm vitest run plugins/epidemiology/src/fitRegression`. Expected: PASS (guard).

- [ ] **Step 6: Make the check declarative.** In `runFitRegression.ts`, replace `_assertColumnsAreValid` with:

  ```ts
  /**
   * Why `columnName` cannot be fitted, in words for the model, or undefined
   * when it can.
   */
  function _getColumnProblem(
    columnName: string,
    dataTypesByColumnName: ReadonlyMap<string, PluginColumnDataType>,
  ): string | undefined {
    const dataType = dataTypesByColumnName.get(columnName);
    if (dataType === undefined) {
      return `Column "${columnName}" is not on the result.`;
    }
    if (!NUMERIC_DATA_TYPES.includes(dataType)) {
      return `Column "${columnName}" is not a number column.`;
    }
    return undefined;
  }

  function _assertColumnsAreValid(
    avandar: AvandarApi,
    args: FitRegressionArgs,
  ): void {
    const dataTypesByColumnName = new Map(
      avandar.context.columns.map((column) => {
        return [column.name, column.dataType];
      }),
    );
    // X is checked before Y, so the model hears about X first.
    const columnProblem = [args.xColumn, args.yColumn]
      .map((columnName) => {
        return _getColumnProblem(columnName, dataTypesByColumnName);
      })
      .find((problem) => {
        return problem !== undefined;
      });
    if (columnProblem !== undefined) {
      throw new PluginError("InvalidToolInput", columnProblem);
    }
    if (args.xColumn === args.yColumn) {
      throw new PluginError("InvalidToolInput", "X and Y are the same column.");
    }
  }
  ```

  Add `PluginColumnDataType` to the type import from `@avandar/plugin-sdk`. Run the Step 5 command. Expected: PASS. Prove the order guard can fail: temporarily swap `[args.xColumn, args.yColumn]` to `[args.yColumn, args.xColumn]`, run, expect FAIL, restore, run, expect PASS. Commit:

  ```bash
  git add plugins/epidemiology/src/fitRegression
  git commit -m "refactor(plugins): find the first bad fit column declaratively

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

- [ ] **Step 7: Epicurve width, guard test.** In `CaseEpicurveModal.test.tsx`, add `cleanup` to the `@testing-library/react` import, and inside the `describe` add:

  ```ts
    it("stops following the container's width once the chart unmounts", async () => {
      const disconnectMock = vi.fn();
      class FakeResizeObserver {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {
          disconnectMock();
        }
      }
      vi.stubGlobal("ResizeObserver", FakeResizeObserver);
      _renderModal();
      await screen.findByRole("img", { name: "Case epicurve" });

      cleanup();

      expect(disconnectMock).toHaveBeenCalled();
    });
  ```

  Run `pnpm vitest run plugins/epidemiology/src/caseEpicurve`. Expected: PASS (guard).

- [ ] **Step 8: Measure in the ref callback.** Replace `useContainerWidth.ts` with:

  ```ts
  import { useCallback, useState } from "react";
  import type { RefCallback } from "react";

  /**
   * The width a chart is drawn at before its container has been measured, and
   * when the container has no layout to measure.
   */
  const FALLBACK_WIDTH = 560;

  /**
   * Follows the width of an element, so a chart can be drawn to fill it.
   * Attach `containerRef` to the element. `width` is the element's width in
   * pixels, measured before the first paint and again whenever it resizes. It
   * stays `FALLBACK_WIDTH` while the element has no width, as it does in a
   * test environment with no layout.
   */
  export function useContainerWidth(): Readonly<{
    containerRef: RefCallback<HTMLElement>;
    width: number;
  }> {
    const [width, setWidth] = useState(FALLBACK_WIDTH);
    // React 19 calls the cleanup a ref callback returns when the element goes
    // away, so the observer starts and stops here, with no effect.
    const containerRef = useCallback((container: HTMLElement | null) => {
      if (container === null) {
        return undefined;
      }
      const updateWidth = (measuredWidth: number): void => {
        if (measuredWidth > 0) {
          setWidth(measuredWidth);
        }
      };
      // Not `getBoundingClientRect`: it follows the scale of a modal that is
      // still opening, and no resize is reported when that scale ends.
      updateWidth(container.clientWidth);
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          updateWidth(entry.contentRect.width);
        });
      });
      observer.observe(container);
      return () => {
        observer.disconnect();
      };
    }, []);

    return { containerRef, width };
  }
  ```

  Run `pnpm vitest run plugins/epidemiology/src/caseEpicurve`. Expected: PASS, including "draws the chart as wide as the space it is given" and the min/max width test. Prove the unmount guard can fail: temporarily delete the `return () => { observer.disconnect(); };` lines, run, expect FAIL, restore, run, expect PASS.

- [ ] **Step 9: Check React Doctor and types.**

  ```bash
  CI=1 pnpm exec react-doctor --yes --scope changed --base demo/measles --no-score
  npx tsc -b
  ```

  Expected: no "Array lookup inside a loop" for `getColumnNamesFromColumns.ts` and no "Derived state stored in an effect" for `useContainerWidth.ts`, and `tsc` exits 0. If the CLI rejects these flags, load the `react-doctor` skill and run its changed-files scan against `demo/measles`. Commit:

  ```bash
  git add plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal
  git commit -m "refactor(plugins): measure the epicurve width in its ref callback

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 9: Test gaps and the Undo name

Closes 1b follow-ups 5 and 7. **Unit:** ordinary. Run after Task 5b.

**Files:**
- Test: `plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.test.tsx`, `plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.test.tsx`
- Test: `src/lib/plugins/PluginMenuSlot/PluginMenuSlot.test.tsx`
- Test: `src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx:46-50,128-155,352`
- Modify: `src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.tsx:30-39`
- Test: `src/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded.test.tsx`

- [ ] **Step 1: A second click while adding.** In `IncidenceModal.test.tsx`, add:

  ```ts
    it("adds the columns once when Add columns is clicked twice while adding", () => {
      const { addColumns } = _renderModal({
        addColumns: () => {
          return new Promise<never>(() => {});
        },
      });
      const addButton = screen.getByRole("button", { name: "Add columns" });

      fireEvent.click(addButton);
      fireEvent.click(addButton);

      expect(addColumns).toHaveBeenCalledTimes(1);
    });
  ```

  In `RollingAverageModal.test.tsx`, the same test with the button named "Add column":

  ```ts
    it("adds the column once when Add column is clicked twice while adding", () => {
      const { addColumns } = _renderModal({
        addColumns: () => {
          return new Promise<never>(() => {});
        },
      });
      const addButton = screen.getByRole("button", { name: "Add column" });

      fireEvent.click(addButton);
      fireEvent.click(addButton);

      expect(addColumns).toHaveBeenCalledTimes(1);
    });
  ```

  Run `pnpm vitest run plugins/epidemiology/src/incidence plugins/epidemiology/src/rollingAverage`. Expected: PASS (Mantine's loading button is disabled while adding). Prove they can fail: temporarily delete `loading={props.isAdding}` from `AddColumnsFooter.tsx`, run, expect both to FAIL with 2 calls, restore, run, expect PASS.

- [ ] **Step 2: Context before bridge.** In `PluginMenuSlot.test.tsx`, after "runs the clicked command with the Data Explorer bridge it builds", add:

  ```ts
    it("builds the invocation context before the Data Explorer bridge", async () => {
      mocks.runPluginCommand.mockResolvedValue(undefined);
      _renderSlotWithItems({ itemCount: 1 });

      fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

      await waitFor(() => {
        expect(mocks.runPluginCommand).toHaveBeenCalled();
      });
      const contextCallOrder =
        mocks.getContext.mock.invocationCallOrder[0] ?? Infinity;
      const bridgeCallOrder =
        mocks.getDataExplorerBridge.mock.invocationCallOrder[0] ?? -Infinity;
      expect(contextCallOrder).toBeLessThan(bridgeCallOrder);
    });
  ```

  Run `pnpm vitest run src/lib/plugins/PluginMenuSlot`. Expected: PASS. Prove it can fail: temporarily swap the two lines `const context = getContext();` and `const dataExplorerBridge = getDataExplorerBridge?.();` in `usePluginCommandRunner.ts`, run, expect FAIL, restore, run, expect PASS.

- [ ] **Step 3: Reuse `DOUBLE_REVENUE` in the stand-in slot.** In `pluginDerivedColumns.integration.test.tsx`, replace the `const DOUBLE_REVENUE = { ... };` block (lines 46-50) with:

  ```ts
  // Hoisted so the `PluginMenuSlot` stand-in below adds the same column the
  // expected SQL is built from.
  const { DOUBLE_REVENUE } = vi.hoisted(() => {
    return {
      DOUBLE_REVENUE: {
        name: "double_revenue",
        expression: "{revenue} * 2",
        inputs: { revenue: "revenue" },
      },
    };
  });
  ```

  and in the stand-in slot's `addColumnsForInvocation` call, replace the inline column object with `columns: [DOUBLE_REVENUE],`. Run `pnpm vitest run src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx`. Expected: PASS.

  Commit the three test gaps:

  ```bash
  git add plugins/epidemiology/src/incidence/IncidenceModal/IncidenceModal.test.tsx plugins/epidemiology/src/rollingAverage/RollingAverageModal/RollingAverageModal.test.tsx src/lib/plugins/PluginMenuSlot/PluginMenuSlot.test.tsx src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx
  git commit -m "test(plugins): cover a second Add click, the context order, and one column definition

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

- [ ] **Step 4: Write the failing Undo tests.** In `notifyDerivedColumnsAdded.test.tsx`, change both `{ name: "Undo" }` lookups (lines 37 and 45) to `{ name: "Undo added columns" }`, and add:

  ```ts
    it("names the Undo button after what it undoes, keeping its visible label", async () => {
      _renderNotification();

      const undoButton = await screen.findByRole("button", {
        name: "Undo added columns",
      });

      expect(undoButton).toHaveTextContent("Undo");
    });
  ```

  In `pluginDerivedColumns.integration.test.tsx:352`, change `{ name: "Undo" }` to `{ name: "Undo added columns" }`.

- [ ] **Step 5: Run them and confirm they fail.**

  ```bash
  pnpm vitest run src/views/DataExplorerApp/notifyDerivedColumnsAdded src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx
  ```

  Expected: FAIL, no button named "Undo added columns".

- [ ] **Step 6: Name the button.** In `notifyDerivedColumnsAdded.tsx`:

  ```tsx
          <Button
            size="compact-sm"
            variant="light"
            aria-label={t`Undo added columns`}
            onClick={() => {
              notifications.hide(NOTIFICATION_ID);
              onUndo();
            }}
          >
            {t`Undo`}
          </Button>
  ```

  The accessible name starts with the visible label, so voice control users can still say "Undo".

- [ ] **Step 7: Run the Step 5 command again.** Expected: PASS. `tests/e2e/plugins-epidemiology-incidence.spec.ts:150` keeps `name: "Undo"`: Playwright matches a substring by default. Commit:

  ```bash
  git add src/views/DataExplorerApp/notifyDerivedColumnsAdded src/views/DataExplorerApp/__tests__/pluginDerivedColumns.integration.test.tsx
  git commit -m "fix(data-explorer): name the derived-columns Undo button after what it undoes

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

  Task 11 translates the new string.

---

### Task 10: Manifest package and prompt style

Closes 1c follow-ups 4, 5, and 6. **Unit:** mechanical (moves and one-line edits, complete code below).

**Files:**
- Move: `packages/shared/plugin-manifest/src/node/emitPluginAiTools.ts`, `emitPluginAiTools.main.ts`, `__tests__/emitPluginAiTools.integration.test.ts` into `packages/shared/plugin-manifest/src/node/emitPluginAiTools/`
- Modify: `packages/shared/plugin-manifest/src/node/index.ts:1-4`, `src/runtime.ts:12-23`, `README.md:34,40`
- Modify: `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts:144-147`

- [ ] **Step 1: Baseline.** `cd packages/shared/plugin-manifest && pnpm vitest run && cd -`. Expected: PASS. Note the count.

- [ ] **Step 2: Move the emitter.**

  ```bash
  cd packages/shared/plugin-manifest/src/node
  mkdir emitPluginAiTools
  git mv emitPluginAiTools.ts emitPluginAiTools/emitPluginAiTools.ts
  git mv emitPluginAiTools.main.ts emitPluginAiTools/emitPluginAiTools.main.ts
  git mv __tests__/emitPluginAiTools.integration.test.ts emitPluginAiTools/emitPluginAiTools.integration.test.ts
  cd -
  ```

  `__tests__/` keeps `readPluginFolders.integration.test.ts`.

- [ ] **Step 3: Fix the paths.**
  - `src/node/index.ts`: `from "@plugin-manifest/node/emitPluginAiTools.ts"` becomes `from "@plugin-manifest/node/emitPluginAiTools/emitPluginAiTools.ts"`.
  - `emitPluginAiTools/emitPluginAiTools.main.ts`: the same import change, and the repo root is one level further up:

    ```ts
    const repoRoot = resolve(
      fileURLToPath(new URL(".", import.meta.url)),
      "../../../../../..",
    );
    ```

  - `emitPluginAiTools/emitPluginAiTools.integration.test.ts`: the same import change, and the importer path becomes `"packages/shared/plugin-manifest/src/node/emitPluginAiTools/emitPluginAiTools.ts"`. Its `repoRoot` (`"../../../../../.."`) stays, since the new folder is as deep as `__tests__/`.
  - `emitPluginAiTools/emitPluginAiTools.ts`: its own imports are package aliases, so they do not change. Check with `grep -n "from \"\\./\|from \"\\.\\./" packages/shared/plugin-manifest/src/node/emitPluginAiTools/*.ts`, which must print nothing.

- [ ] **Step 4: Export `PluginAiTool` from `runtime`.** In `src/runtime.ts`, add `PluginAiTool,` as the first name in the `export type { ... } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";` list. The main entry (`src/index.ts:44`) keeps its export.

- [ ] **Step 5: Update the README.** In `packages/shared/plugin-manifest/README.md`:
  - the `emitPluginAiToolsFile` row's command becomes `pnpm vite-script packages/shared/plugin-manifest/src/node/emitPluginAiTools/emitPluginAiTools.main.ts`;
  - the `PluginAiTool` row's Entries becomes `main, runtime`.

- [ ] **Step 6: Interpolate the prompt bullet.** In `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts`:

  ```ts
  const DATA_AGENT_INSTRUCTIONS_V4 = DATA_AGENT_INSTRUCTIONS_V3.replace(
    SQL_SECTION_START,
    `${PLUGIN_TOOL_BULLET}${SQL_SECTION_START}`,
  );
  ```

- [ ] **Step 7: Verify.**

  ```bash
  cd packages/shared/plugin-manifest && pnpm vitest run && cd -
  pnpm vite-script packages/shared/plugin-manifest/src/node/emitPluginAiTools/emitPluginAiTools.main.ts
  git diff --exit-code shared/agent/dataAgent/pluginAiTools.gen.ts
  pnpm vitest run shared/agent/dataAgent
  npx tsc -b
  pnpm type-check:deno
  pnpm verify:packages
  ```

  Expected: the same test count as Step 1 and PASS, the regenerated file is unchanged, the prompt tests pass (they pin v4's SHA-256, so the interpolation must not change a byte), and every check exits 0.

- [ ] **Step 8: Commit.**

  ```bash
  git add packages/shared/plugin-manifest shared/agent/dataAgent/buildDataAgentSystemPrompt.ts
  git commit -m "refactor(plugin-manifest): keep the AI tool emitter in its own folder and export PluginAiTool from runtime

  The data agent prompt also interpolates its plugin tool bullet instead of
  concatenating it.

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 11: Catalog and translate the new strings

**Unit:** support work. Run after Tasks 1b and 9, which add the only two Lingui strings in this plan. The Epidemiology plugin's strings live in its `en.json` and are not Lingui strings.

**Files:** `src/i18n/locales/<lang>/messages.po` and `messages.ts` for `en ar es fr pt sw zh-Hans zh-Hant`

- [ ] **Step 1: Extract.** `pnpm i18n:extract`. Expected: `en/messages.po` gains `msgid "You don't have permission to delete this dataset."` and `msgid "Undo added columns"`. The old "..., or it has already been deleted." entry becomes obsolete (`#~`), as other retired strings are.

- [ ] **Step 2: Translate by hand.** In each locale's `messages.po`, fill the two empty `msgstr` entries. The wording follows each catalog's existing translation of the old delete message and of "Undo", so the accessible name still starts with the visible label:

  | Locale | You don't have permission to delete this dataset. | Undo added columns |
  | --- | --- | --- |
  | ar | ليس لديك إذن لحذف مجموعة البيانات هذه. | التراجع عن الأعمدة المضافة |
  | es | No tiene permiso para eliminar este conjunto de datos. | Deshacer las columnas agregadas |
  | fr | Vous n’avez pas l’autorisation de supprimer ce jeu de données. | Annuler les colonnes ajoutées |
  | pt | Você não tem permissão para excluir este conjunto de dados. | Desfazer as colunas adicionadas |
  | sw | Huna ruhusa ya kufuta seti hii ya data. | Futa safu wima zilizoongezwa |
  | zh-Hans | 您无权删除此数据集。 | 撤销已添加的列 |
  | zh-Hant | 您沒有刪除此資料集的權限。 | 撤銷已新增的欄位 |

  Then confirm none is left empty: `grep -c -A1 'msgid "Undo added columns"' src/i18n/locales/*/messages.po` shows each, and `grep -A1 'msgid "Undo added columns"' src/i18n/locales/*/messages.po | grep 'msgstr ""'` prints nothing (repeat for the delete message).

- [ ] **Step 3: Compile and check.**

  ```bash
  pnpm i18n:compile
  pnpm i18n:check
  ```

  Expected: both exit 0. Never edit `messages.ts` by hand.

- [ ] **Step 4: Commit.**

  ```bash
  git add src/i18n/locales
  git commit -m "chore(i18n): translate the cleanup's delete and Undo strings

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 12: Verify everything and record the closed follow-ups

**Unit:** support work, then docs.

- [ ] **Step 1: Confirm the stack.** `node apps/ava-cli/dist/main.cjs supabase status` names `fix-plugins-cleanup`, and `docker ps -q | wc -l` is under about 40.

- [ ] **Step 2: Run every check, one at a time, never two at once in this worktree.** Report any failure with its output.

  ```bash
  npx tsc -b
  pnpm type-check:deno
  pnpm type-check:desktop
  npx eslint .
  pnpm test:frontend
  pnpm test:desktop
  pnpm test:executed
  cd packages/shared/plugin-manifest && pnpm vitest run && cd -
  cd packages/web/plugin-sdk && pnpm vitest run && cd -
  cd packages/web/plugin-ui && pnpm vitest run && cd -
  pnpm vitest run scripts/ai-eval
  pnpm test:db
  pnpm check:plugin-bundle
  pnpm verify:packages
  pnpm desktop:sqlite:check-migrations
  pnpm i18n:check
  node apps/ava-cli/dist/main.cjs plugin validate epidemiology
  node apps/ava-cli/dist/main.cjs supabase migrations validate
  ```

  `pnpm test:frontend` covers `plugins/`, `scripts/`, `shared/` (but `shared/lib`), and `src/`. `pnpm check:plugin-bundle` has a host budget of 43,000 bytes. If it fails, report the size and stop.

- [ ] **Step 3: E2E, one spec at a time.** Each takes at most 45 seconds per test locally.

  ```bash
  pnpm test:e2e plugins-mozambique-uninstall.spec.ts
  pnpm test:e2e plugins-epidemiology-incidence.spec.ts
  pnpm test:e2e plugins-epidemiology-regression.spec.ts
  ```

  Expected: all pass. The uninstall spec now deletes through the new rpcs, and the incidence spec adds columns and clicks Undo.

- [ ] **Step 4: Record the closed follow-ups.** Get the commits: `git log --format='%h %s' demo/measles..HEAD`. In `docs/superpowers/2026-11-09-plugins-1b-handoff.md`, directly under "## Open follow-ups", add:

  ```md
  ### Closed by `fix/plugins-cleanup`

  | Item | Closed by |
  | --- | --- |
  | 1. Translated host errors | `<Task 4 sha>`. The forms pick a translated sentence by `PluginError.code` and show the host message apart, marked as English |
  | 2. Auto LIMIT baked into the wrap | `<Task 5a sha>` and `<Task 5b sha>`. The wrap reads the SQL without the automatic limit and applies it after `ORDER BY __ava_row` |
  | 3. Column names with `;`, `--`, or `/*` | `<Task 6 sha>`. The check skips quoted identifiers and string literals |
  | 4. React Doctor array lookup | `<Task 8 Step 1 sha>` |
  | 5. Small test gaps | `<Task 9 Step 3 sha>` |
  | 6. Rolling-average group-by state | `<Task 8 Step 4 sha>`. The group-by is cleared when it is chosen as the value or date column |
  | 7. The Undo button's accessible name | `<Task 9 Step 7 sha>` and `<Task 11 sha>` |
  ```

  In `docs/superpowers/2026-11-10-plugins-1c-handoff.md`, directly under "## Open follow-ups from 1c", add:

  ```md
  ### Closed by `fix/plugins-cleanup`

  | Item | Closed by |
  | --- | --- |
  | 2. `--questions R01` selects nothing | `<Task 7 sha>` |
  | 3. A concurrent ask can be offered `fitRegression` | `<Task 7 sha>`. Fit questions run one at a time after the others |
  | 4. `emitPluginAiTools.main.ts` beside its module | `<Task 10 sha>` |
  | 5. `PluginAiTool` not exported from `runtime.ts` | `<Task 10 sha>` |
  | 6. The concatenated prompt bullet | `<Task 10 sha>` |
  | 7. The imperative loop in `runFitRegression.ts` | `<Task 8 Step 6 sha>` |
  ```

  Replace each `<... sha>` with the short hash from the log. In the 1c handoff, also change "The 1b follow-ups in `docs/superpowers/2026-11-09-plugins-1b-handoff.md` are untouched." to "The 1b follow-ups 1 to 7 are closed. See that handoff."

- [ ] **Step 5: Check the docs for em dashes.** `grep -n "—" docs/superpowers/2026-11-09-plugins-1b-handoff.md docs/superpowers/2026-11-10-plugins-1c-handoff.md` prints nothing.

- [ ] **Step 6: Commit.**

  ```bash
  git add docs/superpowers/2026-11-09-plugins-1b-handoff.md docs/superpowers/2026-11-10-plugins-1c-handoff.md
  git commit -m "docs(plugins): record the closed 1b and 1c follow-ups

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

- [ ] **Step 7: Final branch review** (Opus, xhigh) over `demo/measles..HEAD`, then report to Pablo. Do not push or merge.
