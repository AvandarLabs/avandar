# Data Dictionaries 1: Dictionaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Data Sources editor create a data dictionary, define its entries and bidirectional code lists by hand, and see dictionaries listed beside datasets.

**Architecture:** Four new tables (`data_dictionaries` plus three children) hold dictionaries, entries, code lists, and entry codings. The children are select-only for signed-in users and are written whole through one SECURITY DEFINER RPC, `rpc_data_dictionaries__save`, which validates the set and bumps the dictionary's version once per save. The Dictionary view edits a client-side draft built by a pure `DataDictionary` module and saves it with that RPC.

**Tech Stack:** Supabase Postgres (declarative schemas, RLS, pgTAP), TypeScript, React 19, Mantine 9, `@dnd-kit/react`, TanStack Query and Router, zod 4, Lingui, Vitest, Playwright.

**Spec:** [data-dictionaries-design.md](data-dictionaries-design.md), slice 1 of section 16. Read sections 1 to 5, 7.1, 7.2, 11, 12, and 13 first. Refinements made while planning are listed at the end of this file and override the spec where they differ.

**Scope:** Slice 1 only. Learning from datasets (slice 2), applying and Ask Avandar context (slice 3), conversions (slice 4), and crosswalks (slice 5) get their own plans, written when each slice starts.

**Prototype:** `.impeccable/mocks/prototype/data-dictionaries.html` in this worktree (gitignored). Open it in a browser for the Dictionary view's Entries and Code lists tabs.

---

## Before you start

Read once:

- `AGENTS.md` (root; `CLAUDE.md` is a symlink to it): scope, naming, comments, i18n, the Supabase switch stop condition, e2e rules.
- `docs/rules/typescript.md`, `docs/rules/sql.md`, `docs/rules/testing.md`, `docs/rules/e2e-testing.md`.
- `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md` (before Tasks 9 to 13).
- The code this plan copies: `supabase/schemas/10.maps.sql` (owner triggers), `supabase/schemas/50.rpc_concept_statuses__save.sql` (validated whole-set save), `shared/models/ontology/ConceptStatus/` (model, parsers, module), `src/clients/ontology/ConceptStatusClient.ts`, `src/components/caseStatuses/StatusSetEditor/` (sortable rows), `src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx` (view frame).

House conventions:

- `shared/` imports siblings with `.ts` and never imports `src/`. `src/` imports shared via `$/` without the extension.
- Import a model's entry file and use its namespace (`DataDictionary.T`, `DataDictionaryEntry.Kind`). Files inside a model folder may import sibling `*.types.ts` files.
- Every user-facing string goes through Lingui (`<Trans>` or `t`). No em dashes anywhere, including comments.
- Functions stay at 45 lines or fewer. Docstrings on every exported function, type, and constant.
- Component tests use `render`, `screen`, `fireEvent`, `waitFor`, `act` from `@/test-utils`.
- Run one Vitest file: `pnpm vitest run <path>`.
- Before each commit format what you touched: `pnpm exec oxfmt --ignore-path .oxfmtignore <ts/tsx files>`, `pnpm exec eslint --fix <files>`, `pnpm exec stylelint <css files>`, `pnpm exec prettier --write <sql files>`.
- Commit by explicit path, never `git add -A`; never stage `supabase/config.toml`. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File structure

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.data_dictionaries__entry_kind.sql` | Entry kinds |
| `supabase/schemas/10.data_dictionaries.sql` | Dictionaries, owner and managed-column triggers, RLS |
| `supabase/schemas/20.data_dictionaries__code_lists.sql` | Code lists with their pairs as JSON, select-only RLS |
| `supabase/schemas/20.data_dictionaries__entries.sql` | Entries, select-only RLS |
| `supabase/schemas/21.data_dictionaries__entry_codings.sql` | Which code lists an entry recognizes, select-only RLS |
| `supabase/schemas/50.rpc_data_dictionaries__save.sql` | Validated whole-dictionary save, bumps version |
| `supabase/tests/database/permissions/rls_data_dictionaries.test.sql` | RLS and guards for all four tables |
| `supabase/tests/database/data_dictionaries/rpc_data_dictionaries__save.test.sql` | Save RPC |
| `supabase/tests/database/permissions/exact_data_api_grants.test.sql` | Modify: three select-only tables |
| `apps/desktop/sync/syncable-tables.ts` | Modify: four active tables |
| `shared/models/dataDictionaries/DataDictionaryCodeList/*` | Code list model, `CodePair`, pair JSON conversion |
| `shared/models/dataDictionaries/DataDictionaryEntry/*` | Entry model and kinds |
| `shared/models/dataDictionaries/DataDictionaryEntryCoding/*` | Coding model |
| `shared/models/dataDictionaries/DataDictionary/*` | Dictionary model, draft types, `DataDictionaryModule` |
| `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts` | Modify: two keys |
| `src/clients/dataDictionaries/*` | Four clients; `saveContents` mutation |
| `src/config/AppLinks/AppLinks.tsx` | Modify: dictionary view link |
| `src/routes/_auth/$workspaceSlug/data-manager/dictionaries/$dictionaryId.tsx` | Route |
| `src/views/DataManagerApp/DatasetNavbar/DatasetNavbar.tsx` (+ test) | Modify: "All data" with a Dictionaries group |
| `src/views/DataManagerApp/DataManagerApp.tsx` | Modify: load dictionaries, New dictionary button |
| `src/views/DataManagerApp/NewDataDictionaryModal/*` | Name and description, then create |
| `src/views/DataManagerApp/DataDictionaryView/*` | The view: header, tabs, editor panes, save bar |

---

### Task 0: Preflight

**Files:** none

- [ ] **Step 1:** `git rev-parse --abbrev-ref HEAD`. Expected: `feat/data-dictionaries`.
- [ ] **Step 2:** This slice changes `supabase/schemas/`, so it needs its own local stack. Run `ava supabase status`. If its first line does not name this branch's own project, run `ava supabase switch` and check status again. Do not run any database command until status names `feat-data-dictionaries`. If `ava` is missing, run `pnpm build:ava-cli`.
- [ ] **Step 3:** `pnpm vitest run src/views/DataManagerApp shared/models/Permissions`. Expected: PASS. This is the baseline the later tasks must keep green.

---

### Task 1: Tables and RLS (red, then green with Task 3)

Load the `supabase-declarative-schema` and `supabase-postgres-best-practices` skills.

**Files:**
- Create: `supabase/tests/database/permissions/rls_data_dictionaries.test.sql`
- Create: `supabase/schemas/00.enum.data_dictionaries__entry_kind.sql`
- Create: `supabase/schemas/10.data_dictionaries.sql`
- Create: `supabase/schemas/20.data_dictionaries__code_lists.sql`
- Create: `supabase/schemas/20.data_dictionaries__entries.sql`
- Create: `supabase/schemas/21.data_dictionaries__entry_codings.sql`
- Modify: `supabase/tests/database/permissions/exact_data_api_grants.test.sql`

- [ ] **Step 1: Write the failing RLS test**

```sql
\set ON_ERROR_STOP on

/**
 * RLS for `data_dictionaries` and its three child tables.
 *
 *   viewer: SELECT everything in the workspace
 *   editor: INSERT and UPDATE dictionaries, DELETE their own
 *   admin:  DELETE any dictionary in the workspace
 *
 * Children are select-only for signed-in users: entries, code lists, and
 * codings change only through `rpc_data_dictionaries__save`. A signed-in
 * user cannot move a dictionary to another workspace or edit its version
 * or owner directly.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('dd000001-0000-4000-8000-000000000001'::uuid, 'dict_owner@test.dev', 'authenticated', 'authenticated'),
  ('dd000002-0000-4000-8000-000000000002'::uuid, 'dict_viewer@test.dev', 'authenticated', 'authenticated'),
  ('dd000003-0000-4000-8000-000000000003'::uuid, 'dict_editor@test.dev', 'authenticated', 'authenticated'),
  ('dd000004-0000-4000-8000-000000000004'::uuid, 'dict_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd000001-0000-4000-8000-000000000001'::uuid, 'dict rls ws', 'dict-rls-ws'),
  ('dd100002-0000-4000-8000-000000000002'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid, 'dict other ws', 'dict-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('dd200001-0000-4000-8000-000000000001'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000001-0000-4000-8000-000000000001'::uuid),
  ('dd200002-0000-4000-8000-000000000002'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000002-0000-4000-8000-000000000002'::uuid),
  ('dd200003-0000-4000-8000-000000000003'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid),
  ('dd200004-0000-4000-8000-000000000004'::uuid, 'dd100002-0000-4000-8000-000000000002'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('dd300001-0000-4000-8000-000000000001'::uuid, 'dd000001-0000-4000-8000-000000000001'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('dd300002-0000-4000-8000-000000000002'::uuid, 'dd000002-0000-4000-8000-000000000002'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('dd300003-0000-4000-8000-000000000003'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd200003-0000-4000-8000-000000000003'::uuid, 'Editor', 'Editor'),
  ('dd300004-0000-4000-8000-000000000004'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid, 'dd100002-0000-4000-8000-000000000002'::uuid, 'dd200004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The viewer gets Global Viewer, everyone else in the workspace Global
-- Editor. The owner is also the workspace owner, which is the admin path.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'dd000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('dd400001-0000-4000-8000-000000000001'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000001-0000-4000-8000-000000000001'::uuid, 'dd300001-0000-4000-8000-000000000001'::uuid, 'NYS codes'),
  ('dd400002-0000-4000-8000-000000000002'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid, 'dd300003-0000-4000-8000-000000000003'::uuid, 'Editor codes'),
  ('dd400003-0000-4000-8000-000000000003'::uuid, 'dd100002-0000-4000-8000-000000000002'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid, 'dd300004-0000-4000-8000-000000000004'::uuid, 'Other workspace codes'),
  ('dd400004-0000-4000-8000-000000000004'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid, 'dd300003-0000-4000-8000-000000000003'::uuid, 'Admin deletes this')
on conflict (id) do nothing;

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values (
  'dd500001-0000-4000-8000-000000000001'::uuid,
  'dd100001-0000-4000-8000-000000000001'::uuid,
  'dd400001-0000-4000-8000-000000000001'::uuid,
  'Sex (1/2/9)',
  '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb
);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values (
  'dd600001-0000-4000-8000-000000000001'::uuid,
  'dd100001-0000-4000-8000-000000000001'::uuid,
  'dd400001-0000-4000-8000-000000000001'::uuid,
  'sex',
  'categorical',
  0
);

insert into public.data_dictionaries__entry_codings (id, workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values (
  'dd700001-0000-4000-8000-000000000001'::uuid,
  'dd100001-0000-4000-8000-000000000001'::uuid,
  'dd400001-0000-4000-8000-000000000001'::uuid,
  'dd600001-0000-4000-8000-000000000001'::uuid,
  'dd500001-0000-4000-8000-000000000001'::uuid,
  true
);

select plan (19);

-- 1. A viewer reads a dictionary in their workspace.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'viewer cannot read the dictionary';
    end if;
  end $chk$;
  $t1$,
  'a viewer reads a dictionary in their workspace'
);
reset role;

-- 2. A viewer reads its code lists, entries, and codings.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries__code_lists where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1
      or (select count(*)::int from public.data_dictionaries__entries where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1
      or (select count(*)::int from public.data_dictionaries__entry_codings where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1
    then
      raise exception 'viewer cannot read the dictionary contents';
    end if;
  end $chk$;
  $t2$,
  'a viewer reads code lists, entries, and codings'
);
reset role;

-- 3. A member of another workspace reads none of it.
select lives_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid) <> 0
      or (select count(*)::int from public.data_dictionaries__code_lists where workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid) <> 0
      or (select count(*)::int from public.data_dictionaries__entries where workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid) <> 0
      or (select count(*)::int from public.data_dictionaries__entry_codings where workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid) <> 0
    then
      raise exception 'outsider read another workspace''s dictionaries';
    end if;
  end $chk$;
  $t3$,
  'a user outside the workspace reads no dictionaries or contents'
);
reset role;

-- 4. Anonymous callers cannot reach the table.
select throws_ok (
  $t4$
  set local role anon;
  select count(*) from public.data_dictionaries;
  $t4$,
  '42501',
  null,
  'anon cannot select dictionaries'
);
reset role;

-- 5. A viewer cannot create a dictionary.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.data_dictionaries (workspace_id, owner_id, owner_profile_id, name)
  values ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd000002-0000-4000-8000-000000000002'::uuid, 'dd300002-0000-4000-8000-000000000002'::uuid, 'viewer attempt');
  $t5$,
  '42501',
  null,
  'a viewer cannot create a dictionary'
);
reset role;

-- 6. An editor creates a dictionary they own.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.data_dictionaries (workspace_id, owner_id, owner_profile_id, name)
  values ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid, 'dd300003-0000-4000-8000-000000000003'::uuid, 'editor dictionary');
  $t6$,
  'an editor creates a dictionary'
);
reset role;

-- 7. A user outside the workspace cannot create a dictionary in it.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.data_dictionaries (workspace_id, owner_id, owner_profile_id, name)
  values ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid, 'dd300004-0000-4000-8000-000000000004'::uuid, 'outsider attempt');
  $t7$,
  '42501',
  null,
  'a user outside the workspace cannot create a dictionary in it'
);
reset role;

-- 8. An editor renames another member's dictionary.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.data_dictionaries set name = 'NYS codes (renamed)' where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 'NYS codes (renamed)' then
      raise exception 'editor rename did not apply';
    end if;
  end $chk$;
  $t8$,
  'an editor renames a dictionary'
);

-- 9. A viewer's update is filtered out.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.data_dictionaries set name = 'viewer rename' where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) = 'viewer rename' then
      raise exception 'viewer renamed a dictionary';
    end if;
  end $chk$;
  $t9$,
  'a viewer cannot rename a dictionary'
);

-- 10. An outsider's update is filtered out.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  update public.data_dictionaries set name = 'outsider rename' where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) = 'outsider rename' then
      raise exception 'outsider renamed a dictionary';
    end if;
  end $chk$;
  $t10$,
  'a user outside the workspace cannot rename a dictionary'
);

-- 11. A dictionary cannot move to another workspace.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.data_dictionaries set workspace_id = 'dd100002-0000-4000-8000-000000000002'::uuid where id = 'dd400002-0000-4000-8000-000000000002'::uuid;
  $t11$,
  '23514',
  null,
  'a dictionary cannot be moved to another workspace'
);
reset role;

-- 12. A signed-in user cannot set the version directly.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.data_dictionaries set version = 99 where id = 'dd400002-0000-4000-8000-000000000002'::uuid;
  $t12$,
  '42501',
  null,
  'the version only changes through the save RPC'
);
reset role;

-- 13. An editor cannot delete another member's dictionary.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'an editor deleted another member''s dictionary';
    end if;
  end $chk$;
  $t13$,
  'an editor cannot delete another member''s dictionary'
);

-- 14. A viewer cannot delete.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'dd400002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400002-0000-4000-8000-000000000002'::uuid) <> 1 then
      raise exception 'a viewer deleted a dictionary';
    end if;
  end $chk$;
  $t14$,
  'a viewer cannot delete a dictionary'
);

-- 15. An editor deletes their own dictionary.
select lives_ok (
  $t15$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'dd400002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400002-0000-4000-8000-000000000002'::uuid) <> 0 then
      raise exception 'an editor could not delete their own dictionary';
    end if;
  end $chk$;
  $t15$,
  'an editor deletes their own dictionary'
);

-- 16. A workspace admin deletes another member's dictionary.
select lives_ok (
  $t16$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'dd400004-0000-4000-8000-000000000004'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400004-0000-4000-8000-000000000004'::uuid) <> 0 then
      raise exception 'an admin could not delete another member''s dictionary';
    end if;
  end $chk$;
  $t16$,
  'a workspace admin deletes another member''s dictionary'
);

-- 17. An editor cannot write a code list directly.
select throws_ok (
  $t17$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.data_dictionaries__code_lists (workspace_id, dictionary_id, name, pairs)
  values ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd400001-0000-4000-8000-000000000001'::uuid, 'direct write', '[]'::jsonb);
  $t17$,
  '42501',
  null,
  'code lists are written only through the save RPC'
);
reset role;

-- 18. An editor cannot edit an entry directly.
select throws_ok (
  $t18$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.data_dictionaries__entries set name = 'direct' where id = 'dd600001-0000-4000-8000-000000000001'::uuid;
  $t18$,
  '42501',
  null,
  'entries are written only through the save RPC'
);
reset role;

-- 19. Deleting a dictionary deletes its contents.
delete from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
select is (
  (
    select count(*)::int from public.data_dictionaries__code_lists where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid
  ) + (
    select count(*)::int from public.data_dictionaries__entries where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid
  ) + (
    select count(*)::int from public.data_dictionaries__entry_codings where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'deleting a dictionary deletes its code lists, entries, and codings'
);

select * from finish ();

rollback;
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm test:db`
Expected: FAIL in `rls_data_dictionaries.test.sql` with `relation "public.data_dictionaries" does not exist`. (The suite runs against migrations, so it stays red until Task 3 generates one.)

- [ ] **Step 3: Write the enum**

`supabase/schemas/00.enum.data_dictionaries__entry_kind.sql`:

```sql
/**
 * What kind of column a data dictionary entry describes.
 *
 * Enum values:
 *
 * `categorical`: named groups, such as sex or outcome. May carry code lists.
 *
 * `ordered`: levels with an order, such as low to high. May carry code
 * lists; the primary list's pair order is the scale's order.
 *
 * `number`: a measurement or count, optionally with a unit and a valid range.
 *
 * `date`: a date or a timestamp.
 *
 * `text`: free text.
 *
 * `identifier`: a value unique to each row, such as a case number.
 */
create type public.data_dictionaries__entry_kind as enum(
  'categorical',
  'ordered',
  'number',
  'date',
  'text',
  'identifier'
);
```

- [ ] **Step 4: Write the dictionaries table**

`supabase/schemas/10.data_dictionaries.sql`:

```sql
/**
 * A reusable, workspace-level record of what columns mean: entries, and the
 * code lists that translate a column's codes to labels and back. Entries,
 * code lists, and codings are written only through
 * `rpc_data_dictionaries__save`, which bumps `version` once per save.
 */
create table public.data_dictionaries (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this dictionary belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- User id of the owner. A user who still owns a dictionary cannot be
  -- deleted.
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- The owner's profile in this workspace
  owner_profile_id uuid not null references public.user_profiles (id) on update cascade on delete no action,
  -- Timestamp of when the dictionary was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the dictionary was last updated
  updated_at timestamptz not null default now(),
  -- Name of the dictionary
  name text not null,
  -- Description of the dictionary
  description text,
  -- Bumped by `rpc_data_dictionaries__save` on every save of entries and
  -- code lists. A dataset converted in place records the version it got.
  version integer not null default 1,
  -- The datasets this dictionary was learned from, for the "Made from"
  -- rail group. Not foreign keys: a deleted dataset leaves an id the rail
  -- skips.
  created_from_dataset_ids uuid[] not null default '{}',
  -- Lets child tables use a composite foreign key that keeps them in the
  -- dictionary's workspace.
  unique (id, workspace_id),
  constraint data_dictionaries__name_not_blank check (btrim(name) <> '')
);

alter table public.data_dictionaries enable row level security;

grant
select
,
  insert,
update,
delete on table public.data_dictionaries to authenticated,
service_role;

create policy "Data Sources viewers can select dictionaries" on public.data_dictionaries for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create policy "Data Sources editors can insert dictionaries they own" on public.data_dictionaries for insert to authenticated
with
  check (
    public.data_dictionaries.owner_id = (
      select
        auth.uid ()
    ) and
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "Data Sources editors can update dictionaries" on public.data_dictionaries
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  );

-- An editor deletes their own dictionaries; a Data Sources admin deletes
-- any dictionary in the workspace.
create policy "Owners and Data Sources admins can delete dictionaries" on public.data_dictionaries for delete to authenticated using (
  (
    public.data_dictionaries.owner_id = (
      select
        auth.uid ()
    ) and
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  ) or
  public.util__auth_user_meets_min_app_role (
    public.data_dictionaries.workspace_id,
    'data_sources'::public.app_type,
    'admin'::public.role_level
  )
);

/** Prevents a dictionary from being reassigned to another workspace. */
create or replace function public.data_dictionaries__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'dictionary workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE.
revoke
execute on function public.data_dictionaries__prevent_workspace_id_change ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Refuses direct edits by a signed-in user to the columns this schema
 * manages: the version, which only `rpc_data_dictionaries__save` bumps,
 * and ownership and provenance, which no client flow changes. The save RPC
 * runs as the function owner, so its version bump passes.
 */
create or replace function public.data_dictionaries__guard_managed_columns () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if current_user = 'authenticated' and (
    new.version is distinct from old.version or
    new.owner_id is distinct from old.owner_id or
    new.owner_profile_id is distinct from old.owner_profile_id or
    new.created_from_dataset_ids is distinct from old.created_from_dataset_ids
  ) then
    raise exception 'a dictionary''s version, owner, and sources are managed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke
execute on function public.data_dictionaries__guard_managed_columns ()
from
  public,
  anon,
  authenticated,
  service_role;

/** Ensures a dictionary owner profile belongs to its owner and workspace. */
create or replace function public.data_dictionaries__validate_owner_profile () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if not exists (
    select 1
    from public.user_profiles up
    where
      up.id = new.owner_profile_id and
      up.user_id = new.owner_id and
      up.workspace_id = new.workspace_id
  ) then
    raise exception 'dictionary owner profile must match owner and workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke
execute on function public.data_dictionaries__validate_owner_profile ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__data_dictionaries__prevent_workspace_id_change before
update of workspace_id on public.data_dictionaries for each row
execute function public.data_dictionaries__prevent_workspace_id_change ();

create trigger tr__data_dictionaries__guard_managed_columns before
update on public.data_dictionaries for each row
execute function public.data_dictionaries__guard_managed_columns ();

create trigger tr__data_dictionaries__validate_owner_profile before insert or
update of owner_id,
owner_profile_id,
workspace_id on public.data_dictionaries for each row
execute function public.data_dictionaries__validate_owner_profile ();

create trigger tr__data_dictionaries__set_updated_at before
update on public.data_dictionaries for each row
execute function public.util__set_updated_at ();

create index idx_data_dictionaries__workspace_owner on public.data_dictionaries (workspace_id, owner_id);

create index idx_data_dictionaries__owner_profile_id on public.data_dictionaries (owner_profile_id);
```

- [ ] **Step 5: Write the code lists table**

`supabase/schemas/20.data_dictionaries__code_lists.sql`:

```sql
/**
 * An ordered list of code pairs in a dictionary, such as `1 = Male`. Pairs
 * work both ways: coded data decodes to labels, and labelled data encodes
 * to codes. Select-only for signed-in users; written by
 * `rpc_data_dictionaries__save`.
 */
create table public.data_dictionaries__code_lists (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this code list belongs to, always its dictionary's
  workspace_id uuid not null,
  -- Dictionary this code list belongs to
  dictionary_id uuid not null,
  -- Timestamp of when the code list was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the code list was last updated
  updated_at timestamptz not null default now(),
  -- Name of the code list, such as "Sex (1/2/9)"
  name text not null,
  -- Whether the pairs are levels of a scale, kept in order in charts
  is_ordered boolean not null default false,
  -- The pairs in display order, as
  -- `[{ code, label, accepted_spellings, is_missing }]`. Parsed by
  -- `DataDictionaryCodeListParsers`.
  pairs jsonb not null default '[]'::jsonb,
  -- Lets codings check that a code list and an entry share a dictionary.
  unique (id, dictionary_id),
  foreign key (dictionary_id, workspace_id) references public.data_dictionaries (id, workspace_id) on update cascade on delete cascade,
  constraint data_dictionaries__code_lists__pairs_is_array check (jsonb_typeof(pairs) = 'array')
);

alter table public.data_dictionaries__code_lists enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.data_dictionaries__code_lists to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_dictionaries__code_lists to service_role;

create policy "Data Sources viewers can select dictionary code lists" on public.data_dictionaries__code_lists for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries__code_lists.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr__data_dictionaries__code_lists__set_updated_at before
update on public.data_dictionaries__code_lists for each row
execute function public.util__set_updated_at ();

create index idx_data_dictionaries__code_lists__dictionary_id on public.data_dictionaries__code_lists (dictionary_id);
```

- [ ] **Step 6: Write the entries table**

`supabase/schemas/20.data_dictionaries__entries.sql`:

```sql
/**
 * One kind of column a dictionary describes: its name, the other column
 * names it matches, its kind, and its description. Select-only for
 * signed-in users; written by `rpc_data_dictionaries__save`.
 */
create table public.data_dictionaries__entries (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this entry belongs to, always its dictionary's
  workspace_id uuid not null,
  -- Dictionary this entry belongs to
  dictionary_id uuid not null,
  -- Timestamp of when the entry was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the entry was last updated
  updated_at timestamptz not null default now(),
  -- The entry's name, unique per dictionary ignoring case
  name text not null,
  -- The other column names this entry matches, such as GENDER
  column_names text[] not null default '{}',
  -- What kind of column this is
  kind public.data_dictionaries__entry_kind not null,
  -- Unit of a number entry, such as "years"
  unit text,
  -- Lowest valid value of a number entry
  valid_min numeric,
  -- Highest valid value of a number entry
  valid_max numeric,
  -- What the column means
  description text,
  -- Display order within the dictionary, ascending
  position integer not null,
  -- Lets codings check that an entry and a code list share a dictionary.
  unique (id, dictionary_id),
  foreign key (dictionary_id, workspace_id) references public.data_dictionaries (id, workspace_id) on update cascade on delete cascade,
  constraint data_dictionaries__entries__valid_range check (
    valid_min is null or
    valid_max is null or
    valid_min <= valid_max
  )
);

alter table public.data_dictionaries__entries enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.data_dictionaries__entries to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_dictionaries__entries to service_role;

create policy "Data Sources viewers can select dictionary entries" on public.data_dictionaries__entries for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries__entries.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr__data_dictionaries__entries__set_updated_at before
update on public.data_dictionaries__entries for each row
execute function public.util__set_updated_at ();

create unique index data_dictionaries__entries__name_unique on public.data_dictionaries__entries (dictionary_id, lower(name));
```

- [ ] **Step 7: Write the codings table**

`supabase/schemas/21.data_dictionaries__entry_codings.sql`:

```sql
/**
 * Which code lists an entry recognizes. One `sex` entry can recognize both
 * `1/2/9` and `M/F/U`; the primary coding's labels are the entry's
 * canonical labels. Select-only for signed-in users; written by
 * `rpc_data_dictionaries__save`.
 */
create table public.data_dictionaries__entry_codings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this coding belongs to, always its dictionary's
  workspace_id uuid not null,
  -- Dictionary the entry and the code list both belong to
  dictionary_id uuid not null,
  -- The entry
  entry_id uuid not null,
  -- The code list the entry recognizes
  code_list_id uuid not null,
  -- Whether this is the entry's canonical coding
  is_primary boolean not null default false,
  -- Timestamp of when the coding was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the coding was last updated
  updated_at timestamptz not null default now(),
  unique (entry_id, code_list_id),
  foreign key (dictionary_id, workspace_id) references public.data_dictionaries (id, workspace_id) on update cascade on delete cascade,
  -- The composite keys keep the entry and the code list in this dictionary.
  foreign key (entry_id, dictionary_id) references public.data_dictionaries__entries (id, dictionary_id) on update cascade on delete cascade,
  foreign key (code_list_id, dictionary_id) references public.data_dictionaries__code_lists (id, dictionary_id) on update cascade on delete cascade
);

alter table public.data_dictionaries__entry_codings enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.data_dictionaries__entry_codings to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_dictionaries__entry_codings to service_role;

create policy "Data Sources viewers can select dictionary entry codings" on public.data_dictionaries__entry_codings for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries__entry_codings.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr__data_dictionaries__entry_codings__set_updated_at before
update on public.data_dictionaries__entry_codings for each row
execute function public.util__set_updated_at ();

-- At most one primary coding per entry.
create unique index data_dictionaries__entry_codings__one_primary on public.data_dictionaries__entry_codings (entry_id)
where
  is_primary;

create index idx_data_dictionaries__entry_codings__dictionary_id on public.data_dictionaries__entry_codings (dictionary_id);

create index idx_data_dictionaries__entry_codings__code_list_id on public.data_dictionaries__entry_codings (code_list_id);
```

- [ ] **Step 8: Teach the grants test about the select-only tables**

In `supabase/tests/database/permissions/exact_data_api_grants.test.sql`, add the three child tables to both lists:

```sql
-- inside `standard_authenticated_tables`, in the `not in (...)` list,
-- keeping alphabetical order:
      'data_catalog_listings',
      'data_dictionaries__code_lists',
      'data_dictionaries__entries',
      'data_dictionaries__entry_codings',
      'datasets__postgres_table',
```

```sql
-- inside the SELECT-only `table_name in (...)` list:
      'data_catalog_listings',
      'data_dictionaries__code_lists',
      'data_dictionaries__entries',
      'data_dictionaries__entry_codings',
      'subscriptions',
```

`data_dictionaries` itself needs no change: it is a standard table.

---

### Task 2: Save RPC (red, then green with Task 3)

**Files:**
- Create: `supabase/tests/database/data_dictionaries/rpc_data_dictionaries__save.test.sql`
- Create: `supabase/schemas/50.rpc_data_dictionaries__save.sql`

- [ ] **Step 1: Write the failing test**

```sql
\set ON_ERROR_STOP on

/**
 * `rpc_data_dictionaries__save` replaces a dictionary's code lists,
 * entries, and codings in one transaction and bumps its version once.
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

-- Runs one save as the given user and returns its hint, or 'no error'.
create function pg_temp.save_as (p_user_id uuid, p_dictionary_id uuid, p_code_lists jsonb, p_entries jsonb) returns text language plpgsql as $$
begin
  return pg_temp.error_hint (format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
      select public.rpc_data_dictionaries__save (%L::uuid, %L::jsonb, %L::jsonb);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    p_dictionary_id,
    p_code_lists,
    p_entries
  ));
end;
$$;

insert into auth.users (id, email, aud, role)
values
  ('de000001-0000-4000-8000-000000000001'::uuid, 'dict_save_editor@test.dev', 'authenticated', 'authenticated'),
  ('de000002-0000-4000-8000-000000000002'::uuid, 'dict_save_viewer@test.dev', 'authenticated', 'authenticated'),
  ('de000003-0000-4000-8000-000000000003'::uuid, 'dict_save_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- The editor owns the dictionary's workspace; the outsider owns another.
insert into public.workspaces (id, owner_id, name, slug)
values
  ('de100001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid, 'dict save ws', 'dict-save-ws'),
  ('de100002-0000-4000-8000-000000000002'::uuid, 'de000003-0000-4000-8000-000000000003'::uuid, 'dict save other', 'dict-save-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('de200001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid),
  ('de200002-0000-4000-8000-000000000002'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de000002-0000-4000-8000-000000000002'::uuid),
  ('de200003-0000-4000-8000-000000000003'::uuid, 'de100002-0000-4000-8000-000000000002'::uuid, 'de000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('de300001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de200001-0000-4000-8000-000000000001'::uuid, 'Editor', 'Editor'),
  ('de300002-0000-4000-8000-000000000002'::uuid, 'de000002-0000-4000-8000-000000000002'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('de300003-0000-4000-8000-000000000003'::uuid, 'de000003-0000-4000-8000-000000000003'::uuid, 'de100002-0000-4000-8000-000000000002'::uuid, 'de200003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'de100001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'de000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('de400001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid, 'de300001-0000-4000-8000-000000000001'::uuid, 'Save target'),
  ('de400002-0000-4000-8000-000000000002'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid, 'de300001-0000-4000-8000-000000000001'::uuid, 'Another dictionary')
on conflict (id) do nothing;

-- A code list that belongs to the other dictionary.
insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values ('de500009-0000-4000-8000-000000000009'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de400002-0000-4000-8000-000000000002'::uuid, 'Not yours', '[]'::jsonb);

select plan (17);

-- Refusals. None of them changes anything.

-- 1.
select is (
  pg_temp.save_as ('de000002-0000-4000-8000-000000000002'::uuid, 'de400001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb, '[]'::jsonb),
  'dictionary_editor_required',
  'a Data Sources viewer cannot save a dictionary'
);
reset role;

-- 2.
select is (
  pg_temp.save_as ('de000003-0000-4000-8000-000000000003'::uuid, 'de400001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb, '[]'::jsonb),
  'dictionary_editor_required',
  'a user outside the workspace cannot save a dictionary'
);
reset role;

-- 3.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"  ","is_ordered":false,"pairs":[]}]'::jsonb,
    '[]'::jsonb
  ),
  'code_list_name_required',
  'a code list needs a name'
);
reset role;

-- 4.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[{"code":"1","label":" ","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[]'::jsonb
  ),
  'code_pair_incomplete',
  'every pair needs a code and a label'
);
reset role;

-- 5.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[{"code":"M","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"m","label":"Man","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[]'::jsonb
  ),
  'codes_not_unique',
  'two codes that differ only in case are refused'
);
reset role;

-- 6.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":["male"],"is_missing":false}]}]'::jsonb,
    '[]'::jsonb
  ),
  'labels_not_unique',
  'an accepted spelling cannot repeat another pair''s label'
);
reset role;

-- 7.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"Sex","column_names":[],"kind":"text","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[]},{"id":"de600002-0000-4000-8000-000000000002","name":"sex ","column_names":[],"kind":"text","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":1,"codings":[]}]'::jsonb
  ),
  'entry_names_not_unique',
  'two entries cannot share a name ignoring case and spaces'
);
reset role;

-- 8.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[]}]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"age","column_names":[],"kind":"number","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":true}]}]'::jsonb
  ),
  'coding_kind_mismatch',
  'only categorical and ordered entries recognize code lists'
);
reset role;

-- 9.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":true}]}]'::jsonb
  ),
  'coding_list_not_in_dictionary',
  'a coding must point at a code list in the same save'
);
reset role;

-- 10.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex (1/2)","is_ordered":false,"pairs":[]},{"id":"de500002-0000-4000-8000-000000000002","name":"Sex (M/F)","is_ordered":false,"pairs":[]}]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":false},{"code_list_id":"de500002-0000-4000-8000-000000000002","is_primary":false}]}]'::jsonb
  ),
  'coding_primary_required',
  'an entry with code lists names exactly one primary'
);
reset role;

-- 11.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"age","column_names":[],"kind":"number","unit":"years","valid_min":120,"valid_max":0,"description":null,"position":0,"codings":[]}]'::jsonb
  ),
  'entry_range_invalid',
  'the lowest valid value cannot exceed the highest'
);
reset role;

-- 12.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500009-0000-4000-8000-000000000009","name":"Stolen","is_ordered":false,"pairs":[]}]'::jsonb,
    '[]'::jsonb
  ),
  'item_not_in_dictionary',
  'a code list from another dictionary cannot be saved into this one'
);
reset role;

-- 13. Nothing above changed the dictionary.
select is (
  (select version from public.data_dictionaries where id = 'de400001-0000-4000-8000-000000000001'::uuid) * 1000 + (
    select count(*)::int from public.data_dictionaries__entries where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid
  ),
  1000,
  'refused saves leave the version at 1 and add no entries'
);

-- A save that succeeds.

-- 14.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex (1/2/9)","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":["M"],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":["F"],"is_missing":false},{"code":"9","label":"Unknown","accepted_spellings":[],"is_missing":true}]}]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"sex","column_names":["GENDER"],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":"Sex recorded on the case report.","position":0,"codings":[{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":true}]},{"id":"de600002-0000-4000-8000-000000000002","name":"age_years","column_names":["age"],"kind":"number","unit":"years","valid_min":0,"valid_max":120,"description":null,"position":1,"codings":[]}]'::jsonb
  ),
  'no error',
  'a Data Sources editor saves code lists, entries, and codings'
);
reset role;

-- 15.
select is (
  format(
    'v%s lists=%s entries=%s primary=%s columns=%s',
    (select version from public.data_dictionaries where id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__code_lists where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__entries where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__entry_codings where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid and is_primary),
    (select array_to_string(column_names, ',') from public.data_dictionaries__entries where id = 'de600001-0000-4000-8000-000000000001'::uuid)
  ),
  'v2 lists=1 entries=2 primary=1 columns=GENDER',
  'the save wrote everything and bumped the version once'
);

-- 16. A second save swaps two entry names and drops the code list.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"age_years","column_names":[],"kind":"number","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[]},{"id":"de600002-0000-4000-8000-000000000002","name":"sex","column_names":[],"kind":"text","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":1,"codings":[]}]'::jsonb
  ),
  'no error',
  'a save that swaps two entry names and removes a code list succeeds'
);
reset role;

-- 17. Read in its own statement: the outer query of a statement does not
-- see writes made by a function it calls.
select is (
  format(
    'v%s lists=%s codings=%s first=%s',
    (select version from public.data_dictionaries where id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__code_lists where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__entry_codings where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select name from public.data_dictionaries__entries where id = 'de600001-0000-4000-8000-000000000001'::uuid)
  ),
  'v3 lists=0 codings=0 first=age_years',
  'the second save swapped the names, removed the list and its codings, and made version 3'
);

select * from finish ();

rollback;
```

- [ ] **Step 2: Write the RPC**

`supabase/schemas/50.rpc_data_dictionaries__save.sql`:

```sql
/**
 * Replaces a dictionary's code lists, entries, and entry codings with the
 * given sets in one transaction, and bumps its version once.
 *
 * SECURITY DEFINER because entries, code lists, and codings are
 * select-only for signed-in users: this function is their only write path,
 * so the version always moves with the content. It checks Data Sources
 * editor against the dictionary's own workspace before it reads or writes
 * anything else. Every refusal raises with a stable `hint` that the client
 * maps to copy.
 *
 * @param p_dictionary_id The dictionary whose contents are replaced.
 * @param p_code_lists The full set, as `{ id, name, is_ordered, pairs }`,
 *   where `pairs` is `[{ code, label, accepted_spellings, is_missing }]`.
 * @param p_entries The full set, as `{ id, name, column_names, kind, unit,
 *   valid_min, valid_max, description, position, codings }`, where
 *   `codings` is `[{ code_list_id, is_primary }]`.
 * @returns The dictionary's new version.
 */
create or replace function public.rpc_data_dictionaries__save (
  p_dictionary_id uuid,
  p_code_lists jsonb,
  p_entries jsonb
) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_code_lists jsonb := coalesce(p_code_lists, '[]'::jsonb);
  v_entries jsonb := coalesce(p_entries, '[]'::jsonb);
  v_version integer;
begin
  -- Read without a lock: the caller has not been authorized yet.
  select d.workspace_id
  into v_workspace_id
  from public.data_dictionaries d
  where d.id = p_dictionary_id;

  -- A missing dictionary and a forbidden one raise the same error, so the
  -- function cannot be used to probe for dictionary ids.
  if v_workspace_id is null or not public.util__auth_user_meets_min_app_role (
    v_workspace_id,
    'data_sources'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Data Sources editors can change a dictionary'
      using errcode = '42501', hint = 'dictionary_editor_required';
  end if;

  -- Two saves of one dictionary run one at a time.
  perform 1 from public.data_dictionaries where id = p_dictionary_id for update;

  perform public.data_dictionaries__check_code_lists (p_dictionary_id, v_code_lists);
  perform public.data_dictionaries__check_entries (p_dictionary_id, v_entries, v_code_lists);

  delete from public.data_dictionaries__entry_codings ec
  where ec.dictionary_id = p_dictionary_id;

  perform public.data_dictionaries__write_code_lists (p_dictionary_id, v_workspace_id, v_code_lists);
  perform public.data_dictionaries__write_entries (p_dictionary_id, v_workspace_id, v_entries);

  update public.data_dictionaries
  set version = version + 1
  where id = p_dictionary_id
  returning version into v_version;

  return v_version;
end;
$$;

/**
 * Raises with a stable hint when a set of code lists cannot be saved into
 * a dictionary. Called only by `rpc_data_dictionaries__save`.
 */
create or replace function public.data_dictionaries__check_code_lists (
  p_dictionary_id uuid,
  p_code_lists jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if jsonb_typeof(p_code_lists) is distinct from 'array' or exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    where jsonb_typeof(l.list -> 'pairs') is distinct from 'array'
  ) then
    raise exception 'Code lists must be an array of lists with pairs'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_code_lists) as l (id uuid)
    left join public.data_dictionaries__code_lists cl on cl.id = l.id
    where l.id is null or cl.dictionary_id <> p_dictionary_id
  ) then
    raise exception 'Every code list must be new or belong to this dictionary'
      using errcode = '23514', hint = 'item_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_code_lists) as l (name text)
    where coalesce(btrim(l.name), '') = ''
  ) then
    raise exception 'Every code list needs a name'
      using errcode = '23514', hint = 'code_list_name_required';
  end if;

  perform public.data_dictionaries__check_pairs (p_code_lists);
end;
$$;

/**
 * Raises with a stable hint when any code list's pairs are incomplete or
 * ambiguous: a blank code or label, two codes that differ only in case,
 * or a label or accepted spelling shared by two pairs.
 */
create or replace function public.data_dictionaries__check_pairs (p_code_lists jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    where
      coalesce(btrim(p.pair ->> 'code'), '') = '' or
      coalesce(btrim(p.pair ->> 'label'), '') = ''
  ) then
    raise exception 'Every value needs a code and a label'
      using errcode = '23514', hint = 'code_pair_incomplete';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) with ordinality as l (list, list_index)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    group by l.list_index, lower(btrim(p.pair ->> 'code'))
    having count(*) > 1
  ) then
    raise exception 'Two codes in one list only differ in capitalization or spaces'
      using errcode = '23514', hint = 'codes_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) with ordinality as l (list, list_index)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') with ordinality as p (pair, pair_index)
    cross join lateral (
      select p.pair ->> 'label' as spelling
      union all
      select s.spelling
      from jsonb_array_elements_text(coalesce(p.pair -> 'accepted_spellings', '[]'::jsonb)) as s (spelling)
    ) as spellings
    where btrim(spellings.spelling) <> ''
    group by l.list_index, lower(btrim(spellings.spelling))
    having count(distinct p.pair_index) > 1
  ) then
    raise exception 'Two values in one list share a label or an accepted spelling'
      using errcode = '23514', hint = 'labels_not_unique';
  end if;
end;
$$;

/**
 * Raises with a stable hint when a set of entries cannot be saved into a
 * dictionary alongside the given code lists.
 */
create or replace function public.data_dictionaries__check_entries (
  p_dictionary_id uuid,
  p_entries jsonb,
  p_code_lists jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if jsonb_typeof(p_entries) is distinct from 'array' or exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (kind text)
    where e.kind is null or e.kind not in (
      select unnest(enum_range(null::public.data_dictionaries__entry_kind))::text
    )
  ) then
    raise exception 'Entries must be an array with a known kind each'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (id uuid)
    left join public.data_dictionaries__entries en on en.id = e.id
    where e.id is null or en.dictionary_id <> p_dictionary_id
  ) then
    raise exception 'Every entry must be new or belong to this dictionary'
      using errcode = '23514', hint = 'item_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (name text)
    where coalesce(btrim(e.name), '') = ''
  ) then
    raise exception 'Every entry needs a name'
      using errcode = '23514', hint = 'entry_name_required';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (name text)
    group by lower(btrim(e.name))
    having count(*) > 1
  ) then
    raise exception 'Two entries in one dictionary cannot share a name'
      using errcode = '23505', hint = 'entry_names_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (valid_min numeric, valid_max numeric)
    where e.valid_min > e.valid_max
  ) then
    raise exception 'The lowest valid value cannot be above the highest'
      using errcode = '23514', hint = 'entry_range_invalid';
  end if;

  perform public.data_dictionaries__check_codings (p_entries, p_code_lists);
end;
$$;

/**
 * Raises with a stable hint when an entry's codings are not allowed: only
 * categorical and ordered entries have them, each points at a code list in
 * the same save, and exactly one is primary.
 */
create or replace function public.data_dictionaries__check_codings (p_entries jsonb, p_code_lists jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_array_elements(p_entries) as e (entry)
    where
      jsonb_array_length(coalesce(e.entry -> 'codings', '[]'::jsonb)) > 0 and
      e.entry ->> 'kind' not in ('categorical', 'ordered')
  ) then
    raise exception 'Only categorical and ordered entries have code lists'
      using errcode = '23514', hint = 'coding_kind_mismatch';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) as e (entry)
    cross join lateral jsonb_to_recordset(coalesce(e.entry -> 'codings', '[]'::jsonb)) as c (code_list_id uuid)
    where not exists (
      select 1
      from jsonb_to_recordset(p_code_lists) as l (id uuid)
      where l.id = c.code_list_id
    )
  ) then
    raise exception 'A code list an entry uses must be saved with it'
      using errcode = '23514', hint = 'coding_list_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) as e (entry)
    where
      jsonb_array_length(coalesce(e.entry -> 'codings', '[]'::jsonb)) > 0 and
      (
        select count(*)
        from jsonb_to_recordset(e.entry -> 'codings') as c (is_primary boolean)
        where c.is_primary
      ) <> 1
  ) then
    raise exception 'An entry with code lists needs exactly one primary list'
      using errcode = '23514', hint = 'coding_primary_required';
  end if;
end;
$$;

/** Upserts a dictionary's code lists and deletes the ones left out. */
create or replace function public.data_dictionaries__write_code_lists (
  p_dictionary_id uuid,
  p_workspace_id uuid,
  p_code_lists jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, is_ordered, pairs)
  select l.id, p_workspace_id, p_dictionary_id, btrim(l.name), coalesce(l.is_ordered, false), l.pairs
  from jsonb_to_recordset(p_code_lists) as l (id uuid, name text, is_ordered boolean, pairs jsonb)
  on conflict (id) do update
  set
    name = excluded.name,
    is_ordered = excluded.is_ordered,
    pairs = excluded.pairs;

  delete from public.data_dictionaries__code_lists cl
  where
    cl.dictionary_id = p_dictionary_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_code_lists) as l (id uuid)
      where l.id = cl.id
    );
end;
$$;

/**
 * Upserts a dictionary's entries, deletes the ones left out, and inserts
 * every entry's codings. Codings were already deleted by the caller.
 */
create or replace function public.data_dictionaries__write_entries (
  p_dictionary_id uuid,
  p_workspace_id uuid,
  p_entries jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  -- Park saved names under a unique placeholder first, so a save that swaps
  -- two names never meets the unique name index partway through.
  update public.data_dictionaries__entries en
  set name = '~' || en.id::text
  where en.dictionary_id = p_dictionary_id;

  insert into public.data_dictionaries__entries (
    id, workspace_id, dictionary_id, name, column_names, kind, unit, valid_min, valid_max, description, position
  )
  select
    e.id, p_workspace_id, p_dictionary_id, btrim(e.name), coalesce(e.column_names, '{}'),
    e.kind::public.data_dictionaries__entry_kind, nullif(btrim(e.unit), ''), e.valid_min, e.valid_max,
    nullif(btrim(e.description), ''), e.position
  from jsonb_to_recordset(p_entries) as e (
    id uuid, name text, column_names text[], kind text, unit text,
    valid_min numeric, valid_max numeric, description text, position integer
  )
  on conflict (id) do update
  set
    name = excluded.name,
    column_names = excluded.column_names,
    kind = excluded.kind,
    unit = excluded.unit,
    valid_min = excluded.valid_min,
    valid_max = excluded.valid_max,
    description = excluded.description,
    position = excluded.position;

  delete from public.data_dictionaries__entries en
  where
    en.dictionary_id = p_dictionary_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_entries) as e (id uuid)
      where e.id = en.id
    );

  insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
  select p_workspace_id, p_dictionary_id, (e.entry ->> 'id')::uuid, c.code_list_id, coalesce(c.is_primary, false)
  from jsonb_array_elements(p_entries) as e (entry)
  cross join lateral jsonb_to_recordset(coalesce(e.entry -> 'codings', '[]'::jsonb)) as c (code_list_id uuid, is_primary boolean);
end;
$$;

revoke
execute on function public.rpc_data_dictionaries__save (uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks Data Sources editor itself.
grant
execute on function public.rpc_data_dictionaries__save (uuid, jsonb, jsonb) to authenticated;

-- The helpers run inside the SECURITY DEFINER save and are never called
-- directly, so no Data API role gets EXECUTE.
revoke
execute on function public.data_dictionaries__check_code_lists (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__check_pairs (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__check_entries (uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__check_codings (jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__write_code_lists (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__write_entries (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;
```

The helpers are split out to keep each function short. They are declared after the RPC in the same file; plpgsql resolves calls at run time, so the order is fine.

---

### Task 3: Migration, types, desktop, commit

**Files:** generated migration, `shared/types/database.types.ts`, `apps/desktop/migrations/*_data_dictionaries.gen.sql`, `apps/desktop/sync/syncable-tables.ts`

- [ ] **Step 1:** `ava supabase status` (must name this branch's project). Then `pnpm db:reset && pnpm db:new-migration data_dictionaries`. Open the generated file under `supabase/migrations/`: it must create the enum, the four tables, their policies, triggers, indexes, the seven functions, and the grants, with no `drop` of anything this branch did not add. A `drop` of an unrelated object means the stack is not this branch's own: stop and re-check Task 0.
- [ ] **Step 2:** `pnpm exec prettier --write` on the new `.sql` files and the changed grants test.
- [ ] **Step 3:** `pnpm test:db`. Expected: PASS, including `rls_data_dictionaries.test.sql`, `rpc_data_dictionaries__save.test.sql`, and `exact_data_api_grants.test.sql`.
- [ ] **Step 4:** `pnpm db:gen-types`. `shared/types/database.types.ts` now has the four tables, the enum, and `rpc_data_dictionaries__save` returning `number`.
- [ ] **Step 5:** The desktop reads every table through its SQLite mirror, so a table it does not sync cannot be shown there at all. In `apps/desktop/sync/syncable-tables.ts`, add to `ACTIVE_TABLES` after `"concept_statuses"`:

```ts
  "data_dictionaries",
  "data_dictionaries__code_lists",
  "data_dictionaries__entries",
  "data_dictionaries__entry_codings",
```

and add "data dictionaries and their contents" to the `ACTIVE:` line of the header comment. Then run `pnpm desktop:sqlite:gen-migrations` and `pnpm test:desktop`. Expected: a new `apps/desktop/migrations/*_data_dictionaries.gen.sql`, tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/00.enum.data_dictionaries__entry_kind.sql \
  supabase/schemas/10.data_dictionaries.sql \
  supabase/schemas/20.data_dictionaries__code_lists.sql \
  supabase/schemas/20.data_dictionaries__entries.sql \
  supabase/schemas/21.data_dictionaries__entry_codings.sql \
  supabase/schemas/50.rpc_data_dictionaries__save.sql \
  supabase/migrations/*_data_dictionaries.sql shared/types/database.types.ts \
  supabase/tests/database/permissions/rls_data_dictionaries.test.sql \
  supabase/tests/database/data_dictionaries \
  supabase/tests/database/permissions/exact_data_api_grants.test.sql \
  apps/desktop/sync/syncable-tables.ts apps/desktop/migrations/*_data_dictionaries.gen.sql
git status --short supabase/config.toml   # may be modified by the switch; must not be staged
git commit -m "feat(data-dictionaries): add dictionary tables and the save RPC

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Child models (code lists, entries, codings)

**Files:**
- Create: `shared/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts`
- Create: `shared/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeListParsers.ts`
- Create: `shared/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts`
- Test: `shared/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeListParsers.test.ts`
- Create: `shared/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts`
- Create: `shared/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntryParsers.ts`
- Create: `shared/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts`
- Create: `shared/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.types.ts`
- Create: `shared/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCodingParsers.ts`
- Create: `shared/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.ts`

- [ ] **Step 1: Write the failing parser test**

`DataDictionaryCodeListParsers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  codePairsToDBJson,
  DataDictionaryCodeListParsers,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";

const DB_ROW = {
  created_at: "2026-11-11T10:00:00+00:00",
  dictionary_id: "4c8c5f38-0f4e-4d3b-9a32-0d1c51f8b001",
  id: "4c8c5f38-0f4e-4d3b-9a32-0d1c51f8b002",
  is_ordered: false,
  name: "Sex (1/2/9)",
  pairs: [
    { code: "1", label: "Male", accepted_spellings: ["M"], is_missing: false },
    { code: "9", label: "Unknown", accepted_spellings: [], is_missing: true },
  ],
  updated_at: "2026-11-11T10:00:00+00:00",
  workspace_id: "4c8c5f38-0f4e-4d3b-9a32-0d1c51f8b003",
};

describe("DataDictionaryCodeListParsers", () => {
  it("reads stored pairs into camel-cased pairs in order", () => {
    const codeList = DataDictionaryCodeListParsers.fromDBReadToModelRead(DB_ROW);

    expect(codeList.pairs).toEqual([
      { code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false },
      { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
    ]);
    expect(codeList.dictionaryId).toBe(DB_ROW.dictionary_id);
  });

  it("refuses stored pairs missing a field", () => {
    expect(() => {
      return DataDictionaryCodeListParsers.fromDBReadToModelRead({
        ...DB_ROW,
        pairs: [{ code: "1", label: "Male" }],
      });
    }).toThrow();
  });

  it("writes pairs back in the stored shape", () => {
    expect(
      codePairsToDBJson([
        { code: "2", label: "Female", acceptedSpellings: ["F"], isMissing: false },
      ]),
    ).toEqual([
      { code: "2", label: "Female", accepted_spellings: ["F"], is_missing: false },
    ]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run shared/models/dataDictionaries`
Expected: FAIL, cannot resolve `DataDictionaryCodeList.ts`.

- [ ] **Step 3: Write the code list model**

`DataDictionaryCodeList.types.ts`:

```ts
import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DataDictionaryCodeList";
export type DataDictionaryCodeListId = UUID<ModelType>;

/**
 * One value in a code list. It works both ways: data holding `code`
 * decodes to `label`, and data holding `label` or any of
 * `acceptedSpellings` encodes to `code`.
 */
export type CodePair = {
  /** The value as stored in coded data, such as "1" or "M". */
  code: string;

  /** What the code means, such as "Male". */
  label: string;

  /** Other spellings that also encode to `code`, such as "man". */
  acceptedSpellings: string[];

  /** Whether this value stands for a missing answer, such as "Unknown". */
  isMissing: boolean;
};

/** A named, ordered list of code pairs in a dictionary. */
type DataDictionaryCodeListRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the code list was created */
    createdAt: string;

    /** Dictionary this code list belongs to */
    dictionaryId: DataDictionaryId;

    /** Unique identifier of the code list */
    id: DataDictionaryCodeListId;

    /** Whether the pairs are levels of a scale, kept in order in charts */
    isOrdered: boolean;

    /** Name of the code list, such as "Sex (1/2/9)" */
    name: string;

    /** The pairs, in display order */
    pairs: CodePair[];

    /** Timestamp of when the code list was last updated */
    updatedAt: string;

    /** Workspace this code list belongs to */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the DataDictionaryCodeList model. */
export type DataDictionaryCodeListModel = SupabaseCrudModelSpec<
  {
    tableName: "data_dictionaries__code_lists";
    modelName: "DataDictionaryCodeList";
    modelPrimaryKeyType: DataDictionaryCodeListId;
    modelTypes: {
      Read: DataDictionaryCodeListRead;
      Insert: SetOptional<
        DataDictionaryCodeListRead,
        "createdAt" | "id" | "isOrdered" | "updatedAt"
      >;
      Update: Partial<DataDictionaryCodeListRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
```

`DataDictionaryCodeListParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema as supabaseJsonSchema } from "$/lib/zodHelpers.ts";
import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type {
  CodePair,
  DataDictionaryCodeListId,
  DataDictionaryCodeListModel,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { Json } from "$/types/database.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  dictionary_id: z.uuid(),
  id: z.uuid(),
  is_ordered: z.boolean(),
  name: z.string(),
  pairs: supabaseJsonSchema,
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/** The stored shape of `data_dictionaries__code_lists.pairs`. */
const StoredCodePairsSchema = z.array(
  z.object({
    code: z.string(),
    label: z.string(),
    accepted_spellings: z.array(z.string()),
    is_missing: z.boolean(),
  }),
);

type StoredCodePair = z.infer<typeof StoredCodePairsSchema>[number];
type ReadWithoutPairs = Omit<DataDictionaryCodeListModel["Read"], "pairs">;
type DBReadWithoutPairs = Omit<DataDictionaryCodeListModel["DBRead"], "pairs">;

/** Parses stored pairs, throwing when one is missing a field. */
function _pairsFromJson(pairs: Json): CodePair[] {
  return StoredCodePairsSchema.parse(pairs).map((pair) => {
    return {
      code: pair.code,
      label: pair.label,
      acceptedSpellings: pair.accepted_spellings,
      isMissing: pair.is_missing,
    };
  });
}

/**
 * Pairs in the stored JSON shape, for `data_dictionaries__code_lists.pairs`
 * and the save RPC.
 */
export function codePairsToDBJson(
  pairs: readonly CodePair[],
): StoredCodePair[] {
  return pairs.map((pair) => {
    return {
      code: pair.code,
      label: pair.label,
      accepted_spellings: pair.acceptedSpellings,
      is_missing: pair.isMissing,
    };
  });
}

function _readRow(row: DBReadWithoutPairs): ReadWithoutPairs {
  const camelCaseRow = camelCaseKeysDeep(row) as ReadWithoutPairs;
  return nullsToUndefinedDeep(camelCaseRow) as ReadWithoutPairs;
}

/**
 * Parses `public.data_dictionaries__code_lists` rows. Pairs stay outside the
 * deep key transforms and go through their own schema, so a malformed pair
 * fails loudly instead of loading half a list.
 */
export const DataDictionaryCodeListParsers =
  makeParserRegistry<DataDictionaryCodeListModel>().build({
    modelName: "DataDictionaryCodeList",
    DBReadSchema,
    fromDBReadToModelRead: (dbRow): DataDictionaryCodeListModel["Read"] => {
      const { pairs, ...row } = dbRow;
      const modelRow = _readRow(row);
      return Model.make("DataDictionaryCodeList", {
        ...modelRow,
        id: modelRow.id as DataDictionaryCodeListId,
        dictionaryId: modelRow.dictionaryId as DataDictionaryId,
        workspaceId: modelRow.workspaceId as Workspace.Id,
        pairs: _pairsFromJson(pairs),
      });
    },
    fromModelInsertToDBInsert: (model) => {
      const { pairs, ...row } = model;
      return {
        ...(undefinedsToNullsDeep(snakeCaseKeysDeep(row)) as Omit<
          DataDictionaryCodeListModel["DBInsert"],
          "pairs"
        >),
        pairs: codePairsToDBJson(pairs),
      };
    },
    fromModelUpdateToDBUpdate: (model) => {
      const { pairs, ...row } = model;
      return {
        ...(undefinedsToNullsDeep(snakeCaseKeysDeep(row)) as Omit<
          DataDictionaryCodeListModel["DBUpdate"],
          "pairs"
        >),
        ...(pairs === undefined ? {} : { pairs: codePairsToDBJson(pairs) }),
      };
    },
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = DataDictionaryCodeListModel;
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

`DataDictionaryCodeList.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CodePair,
  DataDictionaryCodeListId,
  DataDictionaryCodeListModel,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";

export {
  codePairsToDBJson,
  DataDictionaryCodeListParsers,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeListParsers.ts";

/** Public namespace for dictionary code lists. */
export namespace DataDictionaryCodeList {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof DataDictionaryCodeListModel = "Read"> =
    DataDictionaryCodeListModel[K];

  /** Identifies a code list. */
  export type Id = DataDictionaryCodeListId;

  /** One two-way value in a code list. */
  export type Pair = CodePair;
}
```

- [ ] **Step 4: Write the entry model**

`DataDictionaryEntry.types.ts`:

```ts
import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DataDictionaryEntry";
export type DataDictionaryEntryId = UUID<ModelType>;

/** What kind of column an entry describes. */
export type DataDictionaryEntryKind =
  | "categorical"
  | "ordered"
  | "number"
  | "date"
  | "text"
  | "identifier";

/** One kind of column a dictionary describes. */
type DataDictionaryEntryRead = Model.Base<
  ModelType,
  {
    /** The other column names this entry matches, such as GENDER */
    columnNames: string[];

    /** Timestamp of when the entry was created */
    createdAt: string;

    /** What the column means */
    description: string | undefined;

    /** Dictionary this entry belongs to */
    dictionaryId: DataDictionaryId;

    /** Unique identifier of the entry */
    id: DataDictionaryEntryId;

    /** What kind of column this is */
    kind: DataDictionaryEntryKind;

    /** The entry's name, unique per dictionary ignoring case */
    name: string;

    /** Display order within the dictionary, ascending */
    position: number;

    /** Unit of a number entry, such as "years" */
    unit: string | undefined;

    /** Timestamp of when the entry was last updated */
    updatedAt: string;

    /** Highest valid value of a number entry */
    validMax: number | undefined;

    /** Lowest valid value of a number entry */
    validMin: number | undefined;

    /** Workspace this entry belongs to */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the DataDictionaryEntry model. */
export type DataDictionaryEntryModel = SupabaseCrudModelSpec<
  {
    tableName: "data_dictionaries__entries";
    modelName: "DataDictionaryEntry";
    modelPrimaryKeyType: DataDictionaryEntryId;
    modelTypes: {
      Read: DataDictionaryEntryRead;
      Insert: SetOptional<
        DataDictionaryEntryRead,
        | "columnNames"
        | "createdAt"
        | "description"
        | "id"
        | "unit"
        | "updatedAt"
        | "validMax"
        | "validMin"
      >;
      Update: Partial<DataDictionaryEntryRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
```

`DataDictionaryEntryParsers.ts`:

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
import type {
  DataDictionaryEntryId,
  DataDictionaryEntryModel,
} from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  column_names: z.array(z.string()),
  created_at: z.iso.datetime({ offset: true }),
  description: z.string().nullable(),
  dictionary_id: z.uuid(),
  id: z.uuid(),
  kind: z.enum([
    "categorical",
    "ordered",
    "number",
    "date",
    "text",
    "identifier",
  ]),
  name: z.string(),
  position: z.number().int(),
  unit: z.string().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  valid_max: z.number().nullable(),
  valid_min: z.number().nullable(),
  workspace_id: z.uuid(),
});

/** Parses `public.data_dictionaries__entries` rows. */
export const DataDictionaryEntryParsers =
  makeParserRegistry<DataDictionaryEntryModel>().build({
    modelName: "DataDictionaryEntry",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DataDictionaryEntryModel["Read"] => {
        return Model.make("DataDictionaryEntry", {
          ...obj,
          id: obj.id as DataDictionaryEntryId,
          dictionaryId: obj.dictionaryId as DataDictionaryId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps(["description", "unit", "valid_min", "valid_max"]),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps(["description", "unit", "valid_min", "valid_max"]),
    ),
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = DataDictionaryEntryModel;
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

`DataDictionaryEntry.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DataDictionaryEntryId,
  DataDictionaryEntryKind,
  DataDictionaryEntryModel,
} from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";

export { DataDictionaryEntryParsers } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntryParsers.ts";

/** Public namespace for dictionary entries. */
export namespace DataDictionaryEntry {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof DataDictionaryEntryModel = "Read"> =
    DataDictionaryEntryModel[K];

  /** Identifies an entry. */
  export type Id = DataDictionaryEntryId;

  /** What kind of column an entry describes. */
  export type Kind = DataDictionaryEntryKind;
}
```

- [ ] **Step 5: Write the coding model**

`DataDictionaryEntryCoding.types.ts`:

```ts
import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { DataDictionaryCodeListId } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { DataDictionaryEntryId } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DataDictionaryEntryCoding";
export type DataDictionaryEntryCodingId = UUID<ModelType>;

/** A code list an entry recognizes. */
type DataDictionaryEntryCodingRead = Model.Base<
  ModelType,
  {
    /** The code list the entry recognizes */
    codeListId: DataDictionaryCodeListId;

    /** Timestamp of when the coding was created */
    createdAt: string;

    /** Dictionary the entry and the code list belong to */
    dictionaryId: DataDictionaryId;

    /** The entry */
    entryId: DataDictionaryEntryId;

    /** Unique identifier of the coding */
    id: DataDictionaryEntryCodingId;

    /** Whether this is the entry's canonical coding */
    isPrimary: boolean;

    /** Timestamp of when the coding was last updated */
    updatedAt: string;

    /** Workspace this coding belongs to */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the DataDictionaryEntryCoding model. */
export type DataDictionaryEntryCodingModel = SupabaseCrudModelSpec<
  {
    tableName: "data_dictionaries__entry_codings";
    modelName: "DataDictionaryEntryCoding";
    modelPrimaryKeyType: DataDictionaryEntryCodingId;
    modelTypes: {
      Read: DataDictionaryEntryCodingRead;
      Insert: SetOptional<
        DataDictionaryEntryCodingRead,
        "createdAt" | "id" | "isPrimary" | "updatedAt"
      >;
      Update: Partial<DataDictionaryEntryCodingRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
```

`DataDictionaryEntryCodingParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
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
  DataDictionaryEntryCodingId,
  DataDictionaryEntryCodingModel,
} from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  code_list_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  dictionary_id: z.uuid(),
  entry_id: z.uuid(),
  id: z.uuid(),
  is_primary: z.boolean(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/** Parses `public.data_dictionaries__entry_codings` rows. */
export const DataDictionaryEntryCodingParsers =
  makeParserRegistry<DataDictionaryEntryCodingModel>().build({
    modelName: "DataDictionaryEntryCoding",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DataDictionaryEntryCodingModel["Read"] => {
        return Model.make("DataDictionaryEntryCoding", {
          ...obj,
          id: obj.id as DataDictionaryEntryCodingId,
          codeListId: obj.codeListId as DataDictionaryCodeListId,
          dictionaryId: obj.dictionaryId as DataDictionaryId,
          entryId: obj.entryId as DataDictionaryEntryId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: pipe(snakeCaseKeysDeep, undefinedsToNullsDeep),
    fromModelUpdateToDBUpdate: pipe(snakeCaseKeysDeep, undefinedsToNullsDeep),
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = DataDictionaryEntryCodingModel;
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

`DataDictionaryEntryCoding.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DataDictionaryEntryCodingId,
  DataDictionaryEntryCodingModel,
} from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.types.ts";

export { DataDictionaryEntryCodingParsers } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCodingParsers.ts";

/** Public namespace for the code lists an entry recognizes. */
export namespace DataDictionaryEntryCoding {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof DataDictionaryEntryCodingModel = "Read"> =
    DataDictionaryEntryCodingModel[K];

  /** Identifies a coding. */
  export type Id = DataDictionaryEntryCodingId;
}
```

These three files import `DataDictionaryId` from `DataDictionary.types.ts`, which Task 5 creates. Create a one-line placeholder now so the test compiles, and Task 5 fills it in:

```ts
// shared/models/dataDictionaries/DataDictionary/DataDictionary.types.ts
import type { UUID } from "@avandar/utils";

export type DataDictionaryId = UUID<"DataDictionary">;
```

- [ ] **Step 5b: Run the test to see it pass**

Run: `pnpm vitest run shared/models/dataDictionaries`
Expected: PASS (3 tests). If the `pipe(...)` parsers fail to type-check against `excludeNullsExceptInProps`, compare with `ConceptStatusParsers.ts`, which passes a string for one prop; this repo's helper also accepts an array (see `AvaMapParsers.ts`).

- [ ] **Step 6: Commit**

```bash
git add shared/models/dataDictionaries
git commit -m "feat(data-dictionaries): add code list, entry, and coding models

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Dictionary model and the draft module

**Files:**
- Modify: `shared/models/dataDictionaries/DataDictionary/DataDictionary.types.ts`
- Create: `shared/models/dataDictionaries/DataDictionary/DataDictionaryParsers.ts`
- Create: `shared/models/dataDictionaries/DataDictionary/DataDictionary.ts`
- Create: `shared/models/dataDictionaries/DataDictionary/DataDictionaryModule/DataDictionaryModule.ts`
- Test: `shared/models/dataDictionaries/DataDictionary/DataDictionaryModule/DataDictionaryModule.test.ts`

- [ ] **Step 1: Write the dictionary types**

Replace the placeholder `DataDictionary.types.ts` with:

```ts
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { UserProfile } from "$/models/User/UserProfile.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DataDictionary";
export type DataDictionaryId = UUID<ModelType>;

/** A reusable record of what columns mean, and how their codes read. */
type DataDictionaryRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the dictionary was created */
    createdAt: string;

    /** The datasets this dictionary was learned from */
    createdFromDatasetIds: Dataset.Id[];

    /** Description of the dictionary */
    description: string | undefined;

    /** Unique identifier of the dictionary */
    id: DataDictionaryId;

    /** Name of the dictionary */
    name: string;

    /** User id of the owner */
    ownerId: User.Id;

    /** The owner's profile in this workspace */
    ownerProfileId: UserProfile.Id;

    /** Timestamp of when the dictionary was last updated */
    updatedAt: string;

    /** Bumped on every save of entries and code lists */
    version: number;

    /** Workspace this dictionary belongs to */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the DataDictionary model. */
export type DataDictionaryModel = SupabaseCrudModelSpec<
  {
    tableName: "data_dictionaries";
    modelName: "DataDictionary";
    modelPrimaryKeyType: DataDictionaryId;
    modelTypes: {
      Read: DataDictionaryRead;
      Insert: SetOptional<
        DataDictionaryRead,
        | "createdAt"
        | "createdFromDatasetIds"
        | "description"
        | "id"
        | "ownerId"
        | "updatedAt"
        | "version"
      >;
      Update: Partial<DataDictionaryRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

/** How an entry recognizes one code list while it is being edited. */
export type DataDictionaryEntryCodingDraft = {
  codeListId: DataDictionaryCodeList.Id;
  isPrimary: boolean;
};

/**
 * An entry while someone edits a dictionary. Text fields hold `""` instead
 * of `undefined` so inputs stay controlled; its position is its index.
 */
export type DataDictionaryEntryDraft = {
  id: DataDictionaryEntry.Id;
  name: string;
  columnNames: string[];
  kind: DataDictionaryEntry.Kind;
  unit: string;
  validMin: number | undefined;
  validMax: number | undefined;
  description: string;
  codings: DataDictionaryEntryCodingDraft[];
};

/** A code list while someone edits a dictionary. */
export type DataDictionaryCodeListDraft = {
  id: DataDictionaryCodeList.Id;
  name: string;
  isOrdered: boolean;
  pairs: DataDictionaryCodeList.Pair[];
};

/** A dictionary's contents while someone edits them. */
export type DataDictionaryDraft = {
  entries: DataDictionaryEntryDraft[];
  codeLists: DataDictionaryCodeListDraft[];
};

/** One reason a dictionary draft cannot be saved yet. */
export type DataDictionaryDraftIssue =
  | { type: "entry_name_required"; entryId: DataDictionaryEntry.Id }
  | { type: "entry_name_not_unique"; entryId: DataDictionaryEntry.Id }
  | { type: "entry_range_invalid"; entryId: DataDictionaryEntry.Id }
  | { type: "entry_primary_required"; entryId: DataDictionaryEntry.Id }
  | { type: "code_list_name_required"; codeListId: DataDictionaryCodeList.Id }
  | {
      type: "code_pair_incomplete";
      codeListId: DataDictionaryCodeList.Id;
      pairIndex: number;
    }
  | {
      type: "code_not_unique";
      codeListId: DataDictionaryCodeList.Id;
      pairIndex: number;
    }
  | {
      type: "label_not_unique";
      codeListId: DataDictionaryCodeList.Id;
      pairIndex: number;
    };

/** The arguments of `rpc_data_dictionaries__save`, in model shape. */
export type DataDictionarySavePayload = {
  dictionaryId: DataDictionaryId;
  codeLists: Array<{
    id: DataDictionaryCodeList.Id;
    name: string;
    isOrdered: boolean;
    pairs: DataDictionaryCodeList.Pair[];
  }>;
  entries: Array<{
    id: DataDictionaryEntry.Id;
    name: string;
    columnNames: string[];
    kind: DataDictionaryEntry.Kind;
    unit: string | undefined;
    validMin: number | undefined;
    validMax: number | undefined;
    description: string | undefined;
    position: number;
    codings: DataDictionaryEntryCodingDraft[];
  }>;
};

/** The stable `hint` values `rpc_data_dictionaries__save` raises with. */
export type DataDictionarySaveErrorHint =
  | "dictionary_editor_required"
  | "dictionary_payload_invalid"
  | "item_not_in_dictionary"
  | "code_list_name_required"
  | "code_pair_incomplete"
  | "codes_not_unique"
  | "labels_not_unique"
  | "entry_name_required"
  | "entry_names_not_unique"
  | "entry_range_invalid"
  | "coding_kind_mismatch"
  | "coding_list_not_in_dictionary"
  | "coding_primary_required";
```

- [ ] **Step 2: Write the dictionary parsers and namespace**

`DataDictionaryParsers.ts`:

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
import type {
  DataDictionaryId,
  DataDictionaryModel,
} from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { User } from "$/models/User/User.ts";
import type { UserProfile } from "$/models/User/UserProfile.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  created_from_dataset_ids: z.array(z.uuid()),
  description: z.string().nullable(),
  id: z.uuid(),
  name: z.string(),
  owner_id: z.uuid(),
  owner_profile_id: z.uuid(),
  updated_at: z.iso.datetime({ offset: true }),
  version: z.number().int(),
  workspace_id: z.uuid(),
});

/** Parses `public.data_dictionaries` rows. */
export const DataDictionaryParsers =
  makeParserRegistry<DataDictionaryModel>().build({
    modelName: "DataDictionary",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DataDictionaryModel["Read"] => {
        return Model.make("DataDictionary", {
          ...obj,
          id: obj.id as DataDictionaryId,
          createdFromDatasetIds: obj.createdFromDatasetIds as Dataset.Id[],
          ownerId: obj.ownerId as User.Id,
          ownerProfileId: obj.ownerProfileId as UserProfile.Id,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps("description"),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps("description"),
    ),
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = DataDictionaryModel;
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

`DataDictionary.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DataDictionaryCodeListDraft,
  DataDictionaryDraft,
  DataDictionaryDraftIssue,
  DataDictionaryEntryCodingDraft,
  DataDictionaryEntryDraft,
  DataDictionaryId,
  DataDictionaryModel,
  DataDictionarySaveErrorHint,
  DataDictionarySavePayload,
} from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";

export { DataDictionaryParsers } from "$/models/dataDictionaries/DataDictionary/DataDictionaryParsers.ts";
export { DataDictionaryModule as DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionaryModule/DataDictionaryModule.ts";

/** Public namespace for data dictionaries and their editable drafts. */
export namespace DataDictionary {
  export type T<K extends keyof DataDictionaryModel = "Read"> =
    DataDictionaryModel[K];
  export type Id = DataDictionaryId;
  export type Draft = DataDictionaryDraft;
  export type EntryDraft = DataDictionaryEntryDraft;
  export type CodeListDraft = DataDictionaryCodeListDraft;
  export type CodingDraft = DataDictionaryEntryCodingDraft;
  export type DraftIssue = DataDictionaryDraftIssue;
  export type SavePayload = DataDictionarySavePayload;
  export type SaveErrorHint = DataDictionarySaveErrorHint;
}
```

- [ ] **Step 3: Write the failing module test**

`DataDictionaryModule.test.ts`:

```ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DataDictionaryEntryCoding } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const WORKSPACE_ID = uuid<Workspace.Id>();
const DICTIONARY_ID = uuid<DataDictionary.Id>();
const NOW = "2026-11-11T10:00:00.000Z";

function _pair(code: string, label: string): DataDictionaryCodeList.Pair {
  return { code, label, acceptedSpellings: [], isMissing: false };
}

function _entryDraft(
  overrides: Partial<DataDictionary.EntryDraft> = {},
): DataDictionary.EntryDraft {
  return {
    id: uuid<DataDictionaryEntry.Id>(),
    name: "sex",
    columnNames: [],
    kind: "categorical",
    unit: "",
    validMin: undefined,
    validMax: undefined,
    description: "",
    codings: [],
    ...overrides,
  };
}

function _listDraft(
  overrides: Partial<DataDictionary.CodeListDraft> = {},
): DataDictionary.CodeListDraft {
  return {
    id: uuid<DataDictionaryCodeList.Id>(),
    name: "Sex (1/2)",
    isOrdered: false,
    pairs: [_pair("1", "Male"), _pair("2", "Female")],
    ...overrides,
  };
}

describe("DataDictionary.toDraft", () => {
  it("orders entries by position and puts each entry's primary coding first", () => {
    const listA = uuid<DataDictionaryCodeList.Id>();
    const listB = uuid<DataDictionaryCodeList.Id>();
    const sexId = uuid<DataDictionaryEntry.Id>();
    const entries: DataDictionaryEntry.T[] = [
      Model.make("DataDictionaryEntry", { id: uuid<DataDictionaryEntry.Id>(), workspaceId: WORKSPACE_ID, dictionaryId: DICTIONARY_ID, name: "age", columnNames: [], kind: "number", unit: "years", validMin: 0, validMax: 120, description: undefined, position: 1, createdAt: NOW, updatedAt: NOW }),
      Model.make("DataDictionaryEntry", { id: sexId, workspaceId: WORKSPACE_ID, dictionaryId: DICTIONARY_ID, name: "sex", columnNames: ["GENDER"], kind: "categorical", unit: undefined, validMin: undefined, validMax: undefined, description: "Sex.", position: 0, createdAt: NOW, updatedAt: NOW }),
    ];
    const codings: DataDictionaryEntryCoding.T[] = [
      Model.make("DataDictionaryEntryCoding", { id: uuid<DataDictionaryEntryCoding.Id>(), workspaceId: WORKSPACE_ID, dictionaryId: DICTIONARY_ID, entryId: sexId, codeListId: listB, isPrimary: false, createdAt: NOW, updatedAt: NOW }),
      Model.make("DataDictionaryEntryCoding", { id: uuid<DataDictionaryEntryCoding.Id>(), workspaceId: WORKSPACE_ID, dictionaryId: DICTIONARY_ID, entryId: sexId, codeListId: listA, isPrimary: true, createdAt: NOW, updatedAt: NOW }),
    ];

    const draft = DataDictionary.toDraft({ entries, codeLists: [], codings });

    expect(draft.entries.map((entry) => { return entry.name; })).toEqual(["sex", "age"]);
    expect(draft.entries[0]?.codings).toEqual([
      { codeListId: listA, isPrimary: true },
      { codeListId: listB, isPrimary: false },
    ]);
    expect(draft.entries[0]?.description).toBe("Sex.");
    expect(draft.entries[1]?.unit).toBe("years");
  });
});

describe("DataDictionary.findDraftIssues", () => {
  it("returns nothing for a valid draft", () => {
    const list = _listDraft();
    const draft = {
      codeLists: [list],
      entries: [_entryDraft({ codings: [{ codeListId: list.id, isPrimary: true }] })],
    };
    expect(DataDictionary.findDraftIssues(draft)).toEqual([]);
  });

  it("flags blank and duplicate entry names ignoring case and spaces", () => {
    const blank = _entryDraft({ name: "  " });
    const first = _entryDraft({ name: "sex" });
    const second = _entryDraft({ name: " SEX " });
    const issues = DataDictionary.findDraftIssues({ codeLists: [], entries: [blank, first, second] });
    expect(issues).toEqual([
      { type: "entry_name_required", entryId: blank.id },
      { type: "entry_name_not_unique", entryId: first.id },
      { type: "entry_name_not_unique", entryId: second.id },
    ]);
  });

  it("flags a range whose lowest value is above its highest", () => {
    const age = _entryDraft({ name: "age", kind: "number", validMin: 120, validMax: 0 });
    expect(DataDictionary.findDraftIssues({ codeLists: [], entries: [age] })).toEqual([
      { type: "entry_range_invalid", entryId: age.id },
    ]);
  });

  it("flags an incomplete pair, a repeated code, and a label reused as a spelling", () => {
    const list = _listDraft({
      pairs: [
        _pair("1", "Male"),
        _pair("1 ", "Man"),
        { code: "2", label: "Female", acceptedSpellings: ["male"], isMissing: false },
        _pair("", "Unknown"),
      ],
    });
    expect(DataDictionary.findDraftIssues({ codeLists: [list], entries: [] })).toEqual([
      { type: "code_not_unique", codeListId: list.id, pairIndex: 0 },
      { type: "code_not_unique", codeListId: list.id, pairIndex: 1 },
      { type: "label_not_unique", codeListId: list.id, pairIndex: 2 },
      { type: "code_pair_incomplete", codeListId: list.id, pairIndex: 3 },
    ]);
  });
});

describe("DataDictionary.buildSavePayload", () => {
  it("trims text, numbers positions, and drops codings and number fields that do not apply", () => {
    const list = _listDraft({
      name: " Sex ",
      pairs: [{ code: " 1 ", label: " Male ", acceptedSpellings: [" M ", "", "male", "M"], isMissing: false }],
    });
    const sex = _entryDraft({
      name: " sex ",
      columnNames: [" GENDER ", "", "gender"],
      unit: "years",
      validMin: 0,
      description: "  ",
      codings: [{ codeListId: list.id, isPrimary: true }],
    });
    const notes = _entryDraft({ name: "notes", kind: "text", codings: [{ codeListId: list.id, isPrimary: true }] });

    const payload = DataDictionary.buildSavePayload({
      dictionaryId: DICTIONARY_ID,
      draft: { codeLists: [list], entries: [sex, notes] },
    });

    expect(payload.codeLists[0]).toEqual({
      id: list.id,
      name: "Sex",
      isOrdered: false,
      pairs: [{ code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false }],
    });
    expect(payload.entries[0]).toEqual({
      id: sex.id,
      name: "sex",
      columnNames: ["GENDER"],
      kind: "categorical",
      unit: undefined,
      validMin: undefined,
      validMax: undefined,
      description: undefined,
      position: 0,
      codings: [{ codeListId: list.id, isPrimary: true }],
    });
    expect(payload.entries[1]?.codings).toEqual([]);
    expect(payload.entries[1]?.position).toBe(1);
  });
});

describe("DataDictionary.removeCodeList", () => {
  it("removes the list and every coding to it, promoting another coding to primary", () => {
    const listA = _listDraft({ name: "A" });
    const listB = _listDraft({ name: "B" });
    const sex = _entryDraft({
      codings: [
        { codeListId: listA.id, isPrimary: true },
        { codeListId: listB.id, isPrimary: false },
      ],
    });
    const draft = DataDictionary.removeCodeList(
      { codeLists: [listA, listB], entries: [sex] },
      listA.id,
    );
    expect(draft.codeLists).toEqual([listB]);
    expect(draft.entries[0]?.codings).toEqual([{ codeListId: listB.id, isPrimary: true }]);
  });
});

describe("DataDictionary.setPrimaryCodeList", () => {
  it("makes a list primary, keeps other codings, and clears all codings for none", () => {
    const listA = _listDraft({ name: "A" });
    const listB = _listDraft({ name: "B" });
    const sex = _entryDraft({ codings: [{ codeListId: listA.id, isPrimary: true }] });
    const draft = { codeLists: [listA, listB], entries: [sex] };

    const withB = DataDictionary.setPrimaryCodeList(draft, { entryId: sex.id, codeListId: listB.id });
    expect(withB.entries[0]?.codings).toEqual([
      { codeListId: listB.id, isPrimary: true },
      { codeListId: listA.id, isPrimary: false },
    ]);

    const cleared = DataDictionary.setPrimaryCodeList(withB, { entryId: sex.id, codeListId: undefined });
    expect(cleared.entries[0]?.codings).toEqual([]);
  });
});

describe("DataDictionary.addCodeListForEntry", () => {
  it("adds an empty list named after the entry and makes it the entry's primary", () => {
    const sex = _entryDraft({ name: "sex" });
    const { draft, codeListId } = DataDictionary.addCodeListForEntry(
      { codeLists: [], entries: [sex] },
      sex.id,
    );
    expect(draft.codeLists).toHaveLength(1);
    expect(draft.codeLists[0]?.id).toBe(codeListId);
    expect(draft.codeLists[0]?.name).toBe("sex codes");
    expect(draft.entries[0]?.codings).toEqual([{ codeListId, isPrimary: true }]);
  });
});

describe("DataDictionary.parsePastedPairs", () => {
  it("reads one pair per line with =, :, a tab, or a comma, splitting at the first", () => {
    expect(
      DataDictionary.parsePastedPairs("1 = Male\n2: Female\n\n3\tBlack, non-Hispanic\n9, Unknown\nno separator"),
    ).toEqual([
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
      { code: "3", label: "Black, non-Hispanic", acceptedSpellings: [], isMissing: false },
      { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: false },
      { code: "no separator", label: "", acceptedSpellings: [], isMissing: false },
    ]);
  });
});

describe("DataDictionary.makeNewEntry and makeNewCodeList", () => {
  it("picks names that do not clash with existing ones", () => {
    expect(DataDictionary.makeNewEntry(["new_entry", "NEW_ENTRY_2"]).name).toBe("new_entry_3");
    expect(DataDictionary.makeNewCodeList(["New code list"]).name).toBe("New code list 2");
  });
});

describe("DataDictionary.toSaveErrorHint", () => {
  it("reads a known hint and ignores anything else", () => {
    expect(DataDictionary.toSaveErrorHint({ hint: "codes_not_unique" })).toBe("codes_not_unique");
    expect(DataDictionary.toSaveErrorHint({ hint: "something else" })).toBeUndefined();
    expect(DataDictionary.toSaveErrorHint(new Error("boom"))).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `pnpm vitest run shared/models/dataDictionaries/DataDictionary`
Expected: FAIL, cannot resolve `DataDictionaryModule.ts`.

- [ ] **Step 5: Write the module**

`DataDictionaryModule.ts`:

```ts
import { makeBucketMap, prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import type {
  DataDictionaryCodeListDraft,
  DataDictionaryDraft,
  DataDictionaryDraftIssue,
  DataDictionaryEntryCodingDraft,
  DataDictionaryEntryDraft,
  DataDictionaryId,
  DataDictionarySaveErrorHint,
  DataDictionarySavePayload,
} from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type {
  CodePair,
  DataDictionaryCodeListId,
  DataDictionaryCodeListModel,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type {
  DataDictionaryEntryId,
  DataDictionaryEntryKind,
  DataDictionaryEntryModel,
} from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type { DataDictionaryEntryCodingModel } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.types.ts";

/** Every entry kind, in the order the Kind select lists them. */
const ENTRY_KINDS: readonly DataDictionaryEntryKind[] = [
  "categorical",
  "ordered",
  "number",
  "date",
  "text",
  "identifier",
];

const SAVE_ERROR_HINTS: readonly DataDictionarySaveErrorHint[] = [
  "dictionary_editor_required",
  "dictionary_payload_invalid",
  "item_not_in_dictionary",
  "code_list_name_required",
  "code_pair_incomplete",
  "codes_not_unique",
  "labels_not_unique",
  "entry_name_required",
  "entry_names_not_unique",
  "entry_range_invalid",
  "coding_kind_mismatch",
  "coding_list_not_in_dictionary",
  "coding_primary_required",
];

/** A line of pasted pairs: the code, a separator, then the label. */
const PASTED_PAIR_PATTERN = /^(.*?)\s*(?:=|:|\t|,)\s*(.*)$/;

/** Trims and lowercases a name, code, or label for comparison. */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Whether entries of this kind translate codes to labels. */
function isCodedKind(kind: DataDictionaryEntryKind): boolean {
  return kind === "categorical" || kind === "ordered";
}

function _uniqueName(options: {
  base: string;
  separator: string;
  existingNames: readonly string[];
}): string {
  const taken = new Set(options.existingNames.map(normalizeKey));
  if (!taken.has(normalizeKey(options.base))) {
    return options.base;
  }
  let suffix = 2;
  while (taken.has(normalizeKey(`${options.base}${options.separator}${suffix}`))) {
    suffix += 1;
  }
  return `${options.base}${options.separator}${suffix}`;
}

/** An empty pair, for a new row in a code list. */
function makeEmptyPair(): CodePair {
  return { code: "", label: "", acceptedSpellings: [], isMissing: false };
}

/** A blank text entry whose name clashes with none of `existingNames`. */
function makeNewEntry(existingNames: readonly string[]): DataDictionaryEntryDraft {
  return {
    id: uuid<DataDictionaryEntryId>(),
    name: _uniqueName({ base: "new_entry", separator: "_", existingNames }),
    columnNames: [],
    kind: "text",
    unit: "",
    validMin: undefined,
    validMax: undefined,
    description: "",
    codings: [],
  };
}

/** A code list with one empty pair, named so it clashes with none. */
function makeNewCodeList(
  existingNames: readonly string[],
  base = "New code list",
): DataDictionaryCodeListDraft {
  return {
    id: uuid<DataDictionaryCodeListId>(),
    name: _uniqueName({ base, separator: " ", existingNames }),
    isOrdered: false,
    pairs: [makeEmptyPair()],
  };
}

function _toCodingDrafts(
  codings: ReadonlyArray<DataDictionaryEntryCodingModel["Read"]>,
): DataDictionaryEntryCodingDraft[] {
  return [...codings]
    .sort((codingA, codingB) => {
      return Number(codingB.isPrimary) - Number(codingA.isPrimary);
    })
    .map((coding) => {
      return { codeListId: coding.codeListId, isPrimary: coding.isPrimary };
    });
}

/**
 * Saved rows as an editable draft: entries by position, code lists by
 * name, and each entry's primary coding first.
 */
function toDraft(options: {
  entries: ReadonlyArray<DataDictionaryEntryModel["Read"]>;
  codeLists: ReadonlyArray<DataDictionaryCodeListModel["Read"]>;
  codings: ReadonlyArray<DataDictionaryEntryCodingModel["Read"]>;
}): DataDictionaryDraft {
  const codingsByEntryId = makeBucketMap(options.codings, {
    keyFn: prop("entryId"),
  });
  const entries = [...options.entries]
    .sort((entryA, entryB) => {
      return entryA.position - entryB.position || entryA.name.localeCompare(entryB.name);
    })
    .map((entry): DataDictionaryEntryDraft => {
      return {
        id: entry.id,
        name: entry.name,
        columnNames: [...entry.columnNames],
        kind: entry.kind,
        unit: entry.unit ?? "",
        validMin: entry.validMin,
        validMax: entry.validMax,
        description: entry.description ?? "",
        codings: _toCodingDrafts(codingsByEntryId.get(entry.id) ?? []),
      };
    });
  const codeLists = [...options.codeLists]
    .sort((listA, listB) => {
      return listA.name.localeCompare(listB.name);
    })
    .map((list): DataDictionaryCodeListDraft => {
      return { id: list.id, name: list.name, isOrdered: list.isOrdered, pairs: list.pairs.map((pair) => { return { ...pair, acceptedSpellings: [...pair.acceptedSpellings] }; }) };
    });
  return { entries, codeLists };
}

/** The draft with one entry replaced by id. */
function replaceEntry(
  draft: DataDictionaryDraft,
  entry: DataDictionaryEntryDraft,
): DataDictionaryDraft {
  return {
    ...draft,
    entries: draft.entries.map((current) => {
      return current.id === entry.id ? entry : current;
    }),
  };
}

/** The draft without one entry. */
function removeEntry(
  draft: DataDictionaryDraft,
  entryId: DataDictionaryEntryId,
): DataDictionaryDraft {
  return {
    ...draft,
    entries: draft.entries.filter((entry) => {
      return entry.id !== entryId;
    }),
  };
}

/** The draft with one code list replaced by id. */
function replaceCodeList(
  draft: DataDictionaryDraft,
  codeList: DataDictionaryCodeListDraft,
): DataDictionaryDraft {
  return {
    ...draft,
    codeLists: draft.codeLists.map((current) => {
      return current.id === codeList.id ? codeList : current;
    }),
  };
}

function _withPrimaryPromoted(
  codings: readonly DataDictionaryEntryCodingDraft[],
): DataDictionaryEntryCodingDraft[] {
  if (codings.length === 0 || codings.some(prop("isPrimary"))) {
    return [...codings];
  }
  return codings.map((coding, index) => {
    return { ...coding, isPrimary: index === 0 };
  });
}

/**
 * The draft without one code list, and without every coding that pointed
 * at it. An entry that lost its primary coding promotes its next one.
 */
function removeCodeList(
  draft: DataDictionaryDraft,
  codeListId: DataDictionaryCodeListId,
): DataDictionaryDraft {
  return {
    codeLists: draft.codeLists.filter((list) => {
      return list.id !== codeListId;
    }),
    entries: draft.entries.map((entry) => {
      const kept = entry.codings.filter((coding) => {
        return coding.codeListId !== codeListId;
      });
      return kept.length === entry.codings.length
        ? entry
        : { ...entry, codings: _withPrimaryPromoted(kept) };
    }),
  };
}

/**
 * The draft with one entry's primary code list set. Other codings stay as
 * non-primary. `undefined` removes every coding from the entry.
 */
function setPrimaryCodeList(
  draft: DataDictionaryDraft,
  options: {
    entryId: DataDictionaryEntryId;
    codeListId: DataDictionaryCodeListId | undefined;
  },
): DataDictionaryDraft {
  return {
    ...draft,
    entries: draft.entries.map((entry) => {
      if (entry.id !== options.entryId) {
        return entry;
      }
      if (options.codeListId === undefined) {
        return { ...entry, codings: [] };
      }
      const others = entry.codings
        .filter((coding) => {
          return coding.codeListId !== options.codeListId;
        })
        .map((coding) => {
          return { ...coding, isPrimary: false };
        });
      return {
        ...entry,
        codings: [{ codeListId: options.codeListId, isPrimary: true }, ...others],
      };
    }),
  };
}

/**
 * The draft with one entry's non-primary codings replaced by
 * `codeListIds`, keeping its primary coding first.
 */
function setOtherCodeLists(
  draft: DataDictionaryDraft,
  options: {
    entryId: DataDictionaryEntryId;
    codeListIds: readonly DataDictionaryCodeListId[];
  },
): DataDictionaryDraft {
  return {
    ...draft,
    entries: draft.entries.map((entry) => {
      if (entry.id !== options.entryId) {
        return entry;
      }
      const primary = entry.codings.filter(prop("isPrimary"));
      const primaryIds = new Set(primary.map(prop("codeListId")));
      const others = options.codeListIds
        .filter((codeListId) => {
          return !primaryIds.has(codeListId);
        })
        .map((codeListId) => {
          return { codeListId, isPrimary: false };
        });
      return { ...entry, codings: _withPrimaryPromoted([...primary, ...others]) };
    }),
  };
}

/**
 * Adds an empty code list named after an entry ("sex codes") and makes it
 * that entry's primary coding.
 */
function addCodeListForEntry(
  draft: DataDictionaryDraft,
  entryId: DataDictionaryEntryId,
): { draft: DataDictionaryDraft; codeListId: DataDictionaryCodeListId } {
  const entry = draft.entries.find((current) => {
    return current.id === entryId;
  });
  const codeList = makeNewCodeList(
    draft.codeLists.map(prop("name")),
    `${entry?.name.trim() || "New"} codes`,
  );
  const withList = { ...draft, codeLists: [...draft.codeLists, codeList] };
  return {
    draft: setPrimaryCodeList(withList, { entryId, codeListId: codeList.id }),
    codeListId: codeList.id,
  };
}

/** The entries that recognize a code list, in display order. */
function getEntriesUsingCodeList(
  draft: DataDictionaryDraft,
  codeListId: DataDictionaryCodeListId,
): DataDictionaryEntryDraft[] {
  return draft.entries.filter((entry) => {
    return entry.codings.some((coding) => {
      return coding.codeListId === codeListId;
    });
  });
}

/** An entry's primary code list, if it has one. */
function getPrimaryCodeListId(
  entry: DataDictionaryEntryDraft,
): DataDictionaryCodeListId | undefined {
  return entry.codings.find(prop("isPrimary"))?.codeListId;
}

function _countByKey(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const key = normalizeKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

function _findEntryIssues(
  entries: readonly DataDictionaryEntryDraft[],
): DataDictionaryDraftIssue[] {
  const nameCounts = _countByKey(entries.map(prop("name")));
  return entries.flatMap((entry): DataDictionaryDraftIssue[] => {
    const issues: DataDictionaryDraftIssue[] = [];
    const nameKey = normalizeKey(entry.name);
    if (nameKey === "") {
      issues.push({ type: "entry_name_required", entryId: entry.id });
    } else if ((nameCounts.get(nameKey) ?? 0) > 1) {
      issues.push({ type: "entry_name_not_unique", entryId: entry.id });
    }
    if (entry.kind === "number" && entry.validMin !== undefined && entry.validMax !== undefined && entry.validMin > entry.validMax) {
      issues.push({ type: "entry_range_invalid", entryId: entry.id });
    }
    const primaryCount = entry.codings.filter(prop("isPrimary")).length;
    if (isCodedKind(entry.kind) && entry.codings.length > 0 && primaryCount !== 1) {
      issues.push({ type: "entry_primary_required", entryId: entry.id });
    }
    return issues;
  });
}

function _pairSpellings(pair: CodePair): string[] {
  return [pair.label, ...pair.acceptedSpellings]
    .map(normalizeKey)
    .filter((spelling) => {
      return spelling !== "";
    });
}

function _findPairIssues(
  codeList: DataDictionaryCodeListDraft,
): DataDictionaryDraftIssue[] {
  const codeCounts = _countByKey(codeList.pairs.map(prop("code")));
  const pairsBySpelling = new Map<string, Set<number>>();
  codeList.pairs.forEach((pair, pairIndex) => {
    _pairSpellings(pair).forEach((spelling) => {
      pairsBySpelling.set(spelling, (pairsBySpelling.get(spelling) ?? new Set()).add(pairIndex));
    });
  });
  return codeList.pairs.flatMap((pair, pairIndex): DataDictionaryDraftIssue[] => {
    const at = { codeListId: codeList.id, pairIndex };
    if (normalizeKey(pair.code) === "" || normalizeKey(pair.label) === "") {
      return [{ type: "code_pair_incomplete", ...at }];
    }
    if ((codeCounts.get(normalizeKey(pair.code)) ?? 0) > 1) {
      return [{ type: "code_not_unique", ...at }];
    }
    const sharesSpelling = _pairSpellings(pair).some((spelling) => {
      return (pairsBySpelling.get(spelling)?.size ?? 0) > 1;
    });
    return sharesSpelling ? [{ type: "label_not_unique", ...at }] : [];
  });
}

/**
 * Every reason the draft cannot be saved yet: entry issues first, then
 * code list issues, each in display order. Empty when it can be saved.
 */
function findDraftIssues(draft: DataDictionaryDraft): DataDictionaryDraftIssue[] {
  return [
    ..._findEntryIssues(draft.entries),
    ...draft.codeLists.flatMap((codeList): DataDictionaryDraftIssue[] => {
      return [
        ...(normalizeKey(codeList.name) === ""
          ? [{ type: "code_list_name_required", codeListId: codeList.id } as const]
          : []),
        ..._findPairIssues(codeList),
      ];
    }),
  ];
}

function _cleanList(
  values: readonly string[],
  exclude: readonly string[] = [],
): string[] {
  const seen = new Set(exclude.map(normalizeKey));
  return values
    .map((value) => {
      return value.trim();
    })
    .filter((value) => {
      const key = normalizeKey(value);
      if (key === "" || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

/**
 * The save RPC's payload for a draft: text trimmed, blanks dropped,
 * positions following the draft's order, and codings and number fields
 * kept only for the kinds they apply to.
 */
function buildSavePayload(options: {
  dictionaryId: DataDictionaryId;
  draft: DataDictionaryDraft;
}): DataDictionarySavePayload {
  const { dictionaryId, draft } = options;
  return {
    dictionaryId,
    codeLists: draft.codeLists.map((list) => {
      return {
        id: list.id,
        name: list.name.trim(),
        isOrdered: list.isOrdered,
        pairs: list.pairs.map((pair) => {
          const label = pair.label.trim();
          return { code: pair.code.trim(), label, acceptedSpellings: _cleanList(pair.acceptedSpellings, [label]), isMissing: pair.isMissing };
        }),
      };
    }),
    entries: draft.entries.map((entry, index) => {
      const isNumber = entry.kind === "number";
      return {
        id: entry.id,
        name: entry.name.trim(),
        columnNames: _cleanList(entry.columnNames),
        kind: entry.kind,
        unit: isNumber ? entry.unit.trim() || undefined : undefined,
        validMin: isNumber ? entry.validMin : undefined,
        validMax: isNumber ? entry.validMax : undefined,
        description: entry.description.trim() || undefined,
        position: index,
        codings: isCodedKind(entry.kind) ? entry.codings : [],
      };
    }),
  };
}

/**
 * Pairs from pasted text, one per line. A line splits at its first `=`,
 * `:`, tab, or comma, so a label may itself contain commas. A line with no
 * separator becomes a code with an empty label. Blank lines are skipped.
 */
function parsePastedPairs(text: string): CodePair[] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      return line.trim();
    })
    .filter((line) => {
      return line !== "";
    })
    .map((line) => {
      const match = PASTED_PAIR_PATTERN.exec(line);
      return {
        ...makeEmptyPair(),
        code: (match?.[1] ?? line).trim(),
        label: (match?.[2] ?? "").trim(),
      };
    });
}

/**
 * The save RPC's `hint` on a thrown database error, when it is one the
 * client knows how to explain.
 */
function toSaveErrorHint(error: unknown): DataDictionarySaveErrorHint | undefined {
  if (typeof error !== "object" || error === null || !("hint" in error)) {
    return undefined;
  }
  const { hint } = error;
  return SAVE_ERROR_HINTS.find((knownHint) => {
    return knownHint === hint;
  });
}

/**
 * Pure helpers for editing a dictionary's contents: building and changing
 * a draft, validating it, and turning it into the save RPC's payload.
 */
export const DataDictionaryModule = {
  ENTRY_KINDS,
  normalizeKey,
  isCodedKind,
  makeEmptyPair,
  makeNewEntry,
  makeNewCodeList,
  toDraft,
  replaceEntry,
  removeEntry,
  replaceCodeList,
  removeCodeList,
  setPrimaryCodeList,
  setOtherCodeLists,
  addCodeListForEntry,
  getEntriesUsingCodeList,
  getPrimaryCodeListId,
  findDraftIssues,
  buildSavePayload,
  parsePastedPairs,
  toSaveErrorHint,
};
```

Note on the `parsePastedPairs` test: `"no separator"` has no `=`, `:`, tab, or comma, so the regex does not match and the whole line becomes the code. A line like `no separator` that contains a space is still not split, because a space is not a separator.

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm vitest run shared/models/dataDictionaries`
Expected: PASS. Then run `pnpm exec oxfmt --ignore-path .oxfmtignore shared/models/dataDictionaries` so the long lines in the test and module are wrapped to house style before committing.

- [ ] **Step 7: Commit**

```bash
git add shared/models/dataDictionaries
git commit -m "feat(data-dictionaries): add the dictionary model and draft helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Clients and permission keys

**Files:**
- Create: `src/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient.ts`
- Test: `src/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient.test.ts`
- Create: `src/clients/dataDictionaries/DataDictionaryCodeListClient.ts`
- Create: `src/clients/dataDictionaries/DataDictionaryEntryClient.ts`
- Create: `src/clients/dataDictionaries/DataDictionaryEntryCodingClient.ts`
- Modify: `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts`
- Modify: `shared/models/Permissions/PermissionsModule/__tests__/PermissionsModule.test.ts`

- [ ] **Step 1: Write the failing client test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: vi.fn(), rpc: rpcMock };
      },
    },
  };
});

const { DataDictionaryClient } = await import("./DataDictionaryClient");

describe("DataDictionaryClient.saveContents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the contents to the save RPC in its stored shape and returns the new version", async () => {
    rpcMock.mockReturnValue({
      throwOnError: () => {
        return Promise.resolve({ data: 4 });
      },
    });
    const dictionaryId = uuid<DataDictionary.Id>();
    const codeListId = uuid<DataDictionaryCodeList.Id>();
    const entryId = uuid<DataDictionaryEntry.Id>();

    const version = await DataDictionaryClient.saveContents({
      dictionaryId,
      codeLists: [
        {
          id: codeListId,
          name: "Sex",
          isOrdered: false,
          pairs: [{ code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false }],
        },
      ],
      entries: [
        {
          id: entryId,
          name: "sex",
          columnNames: ["GENDER"],
          kind: "categorical",
          unit: undefined,
          validMin: undefined,
          validMax: undefined,
          description: undefined,
          position: 0,
          codings: [{ codeListId, isPrimary: true }],
        },
      ],
    });

    expect(version).toBe(4);
    expect(rpcMock).toHaveBeenCalledWith("rpc_data_dictionaries__save", {
      p_dictionary_id: dictionaryId,
      p_code_lists: [
        {
          id: codeListId,
          name: "Sex",
          is_ordered: false,
          pairs: [{ code: "1", label: "Male", accepted_spellings: ["M"], is_missing: false }],
        },
      ],
      p_entries: [
        {
          id: entryId,
          name: "sex",
          column_names: ["GENDER"],
          kind: "categorical",
          unit: null,
          valid_min: null,
          valid_max: null,
          description: null,
          position: 0,
          codings: [{ code_list_id: codeListId, is_primary: true }],
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/clients/dataDictionaries`
Expected: FAIL, cannot resolve `./DataDictionaryClient`.

- [ ] **Step 3: Write the clients**

`DataDictionaryClient.ts`:

```ts
import { codePairsToDBJson } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import { DataDictionaryParsers } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

type SavePayload = DataDictionary.SavePayload;

function _codeListToRpcArg(codeList: SavePayload["codeLists"][number]) {
  return {
    id: codeList.id,
    name: codeList.name,
    is_ordered: codeList.isOrdered,
    pairs: codePairsToDBJson(codeList.pairs),
  };
}

function _entryToRpcArg(entry: SavePayload["entries"][number]) {
  return {
    id: entry.id,
    name: entry.name,
    column_names: entry.columnNames,
    kind: entry.kind,
    unit: entry.unit ?? null,
    valid_min: entry.validMin ?? null,
    valid_max: entry.validMax ?? null,
    description: entry.description ?? null,
    position: entry.position,
    codings: entry.codings.map((coding) => {
      return { code_list_id: coding.codeListId, is_primary: coding.isPrimary };
    }),
  };
}

/**
 * Reads, creates, renames, and deletes dictionaries, and saves their
 * contents. Entries and code lists are saved whole through `saveContents`,
 * never row by row, so the dictionary's version moves once per save.
 */
export const DataDictionaryClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataDictionary",
    tableName: "data_dictionaries",
    dbTablePrimaryKey: "id",
    parsers: DataDictionaryParsers,
    mutations: ({ clientLogger, dbClient }) => {
      return {
        /**
         * Replaces a dictionary's entries and code lists in one transaction
         * and returns its new version. A refusal rejects with the RPC's
         * `hint`; read it with `DataDictionary.toSaveErrorHint`.
         */
        saveContents: async (payload: SavePayload): Promise<number> => {
          const logger = clientLogger.appendName("saveContents");
          logger.log("Saving dictionary contents", {
            dictionaryId: payload.dictionaryId,
          });
          const { data } = await dbClient
            .rpc("rpc_data_dictionaries__save", {
              p_dictionary_id: payload.dictionaryId,
              p_code_lists: payload.codeLists.map(_codeListToRpcArg),
              p_entries: payload.entries.map(_entryToRpcArg),
            })
            .throwOnError();
          return data;
        },
      };
    },
  }),
  {
    mutationFns: ["saveContents"],
  },
);
```

If `tsc` rejects the RPC argument objects as not assignable to `Json`, annotate the two helpers' return types as `Json` (import `type { Json } from "$/types/database.types"`); do not cast the whole call.

`DataDictionaryCodeListClient.ts`:

```ts
import { DataDictionaryCodeListParsers } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads a dictionary's code lists. Writes go through
 * `DataDictionaryClient.saveContents`.
 */
export const DataDictionaryCodeListClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataDictionaryCodeList",
    tableName: "data_dictionaries__code_lists",
    dbTablePrimaryKey: "id",
    parsers: DataDictionaryCodeListParsers,
  }),
);
```

`DataDictionaryEntryClient.ts`:

```ts
import { DataDictionaryEntryParsers } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads a dictionary's entries. Writes go through
 * `DataDictionaryClient.saveContents`.
 */
export const DataDictionaryEntryClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataDictionaryEntry",
    tableName: "data_dictionaries__entries",
    dbTablePrimaryKey: "id",
    parsers: DataDictionaryEntryParsers,
  }),
);
```

`DataDictionaryEntryCodingClient.ts`:

```ts
import { DataDictionaryEntryCodingParsers } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads which code lists each entry of a dictionary recognizes. Writes go
 * through `DataDictionaryClient.saveContents`.
 */
export const DataDictionaryEntryCodingClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataDictionaryEntryCoding",
    tableName: "data_dictionaries__entry_codings",
    dbTablePrimaryKey: "id",
    parsers: DataDictionaryEntryCodingParsers,
  }),
);
```

- [ ] **Step 4: Add the permission keys**

In `PermissionRegistry.ts`, under `data_sources`:

```ts
    viewer: [
      "data_sources__can_view_dataset",
      "data_sources__can_list_sources",
      "data_sources__can_view_dictionaries",
    ] as const,
    editor: [
      "data_sources__can_view_dataset",
      "data_sources__can_list_sources",
      "data_sources__can_edit_dataset",
      "data_sources__can_create_dataset",
      "data_sources__can_view_dictionaries",
      "data_sources__can_edit_dictionaries",
    ] as const,
    admin: [
      "data_sources__can_view_dataset",
      "data_sources__can_list_sources",
      "data_sources__can_edit_dataset",
      "data_sources__can_create_dataset",
      "data_sources__can_manage_sources",
      "data_sources__can_view_dictionaries",
      "data_sources__can_edit_dictionaries",
    ] as const,
```

In `PermissionsModule.test.ts`, next to the assertion for `data_sources__can_manage_sources` (line 99), add:

```ts
    expect(keys.has("data_sources__can_edit_dictionaries")).toBe(true);
```

Read the surrounding test first: if `keys` there is the admin key set, the line above is right; if it is a viewer set, assert `data_sources__can_view_dictionaries` instead.

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm vitest run src/clients/dataDictionaries shared/models/Permissions`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/clients/dataDictionaries shared/models/Permissions/PermissionsModule/PermissionRegistry.ts \
  shared/models/Permissions/PermissionsModule/__tests__/PermissionsModule.test.ts
git commit -m "feat(data-dictionaries): add dictionary clients and permission keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Route and link

**Files:**
- Modify: `src/config/AppLinks/AppLinks.tsx`
- Create: `src/routes/_auth/$workspaceSlug/data-manager/dictionaries/$dictionaryId.tsx`
- Generated: `src/routeTree.gen.ts`

- [ ] **Step 1: Add the link** after `dataManagerDatasetView` in `AppLinks.tsx`:

```tsx
  dataManagerDictionaryView: ({
    workspaceSlug,
    dictionaryId,
    dictionaryName,
  }: {
    workspaceSlug: string;
    dictionaryId: string;
    dictionaryName: string;
  }) => {
    return {
      key: "data-manager-dictionary-view",
      to: "/$workspaceSlug/data-manager/dictionaries/$dictionaryId",
      params: {
        workspaceSlug,
        dictionaryId,
      },
      label: () => {
        return dictionaryName;
      },
      isAvailableOffline: true,
    };
  },
```

- [ ] **Step 2: Write the route**

```tsx
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { Logger } from "@/utils/Logger";
import { DataDictionaryView } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryView";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/dictionaries/$dictionaryId",
)({
  component: RouteComponent,
  // The loader only turns a missing or unreadable dictionary into a 404.
  // The view reads the dictionary through its query so edits show live.
  loader: async ({ params: { dictionaryId } }): Promise<DataDictionary.Id> => {
    const dictionary = await DataDictionaryClient.getById({
      id: dictionaryId as DataDictionary.Id,
    });
    if (!dictionary) {
      throw notFound();
    }
    return dictionary.id;
  },
  errorComponent: DataDictionaryErrorView,
});

function RouteComponent(): ReactNode {
  const dictionaryId = Route.useLoaderData();
  return <DataDictionaryView dictionaryId={dictionaryId} />;
}

function DataDictionaryErrorView({ error }: ErrorComponentProps): ReactNode {
  const { t } = useLingui();
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <Center flex={1} p="lg">
      <Callout
        maw={520}
        title={t`Dictionary failed to load`}
        message={t`The dictionary failed to load. Please try again later or reach out to support.`}
      />
    </Center>
  );
}
```

- [ ] **Step 3: Regenerate the route tree.** It is written by the router plugin when Vite starts. Create a temporary `src/views/DataManagerApp/DataDictionaryView/DataDictionaryView.tsx` that exports `export function DataDictionaryView(_props: { dictionaryId: string }): null { return null; }` so the route compiles, then run `pnpm dev`, wait for Vite's "ready" line, and stop it. `src/routeTree.gen.ts` now includes `/_auth/$workspaceSlug/data-manager/dictionaries/$dictionaryId`. Never edit it by hand.

- [ ] **Step 4:** `pnpm exec tsc -b --force --noEmit`. Expected: no errors in the files this task touched. (Plain `tsc -b` can report clean from a stale incremental cache; `--force` cannot.)

- [ ] **Step 5: Commit**

```bash
git add src/config/AppLinks/AppLinks.tsx "src/routes/_auth/\$workspaceSlug/data-manager/dictionaries" src/routeTree.gen.ts
git commit -m "feat(data-dictionaries): add the dictionary route

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Leave the temporary `DataDictionaryView.tsx` uncommitted; Task 10 replaces it.)

---

### Task 8: Dictionaries in the Data Sources list, and creating one

Read `docs/design/app-view-layout.md` ("Withhold chrome until it earns its line") before this task.

**Files:**
- Modify: `src/views/DataManagerApp/DatasetNavbar/DatasetNavbar.tsx`
- Test: `src/views/DataManagerApp/DatasetNavbar/DatasetNavbar.test.tsx`
- Modify: `src/views/DataManagerApp/DataManagerApp.tsx`
- Create: `src/views/DataManagerApp/NewDataDictionaryModal/NewDataDictionaryModal.tsx`
- Test: `src/views/DataManagerApp/NewDataDictionaryModal/NewDataDictionaryModal.test.tsx`

- [ ] **Step 1: Write the failing navbar test.** Add to `DatasetNavbar.test.tsx`:

```tsx
function _createDictionary(name: string): DataDictionary.T {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    name,
  } as DataDictionary.T;
}

describe("DatasetNavbar dictionaries", () => {
  it("lists dictionaries under their own heading in an All data list", () => {
    render(
      <DatasetNavbar
        datasets={[_createDataset("Bronx line list")]}
        dictionaries={[_createDictionary("NYS measles case report")]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("All data")).toBeInTheDocument();
    expect(screen.getByText("Dictionaries")).toBeInTheDocument();
    expect(screen.getByText("NYS measles case report")).toBeInTheDocument();
    expect(screen.getByText("Bronx line list")).toBeInTheDocument();
  });

  it("shows no group headings when only datasets of one kind exist", () => {
    render(
      <DatasetNavbar
        datasets={[_createDataset("Bronx line list")]}
        isLoading={false}
      />,
    );

    expect(screen.queryByText("Dictionaries")).not.toBeInTheDocument();
    expect(screen.queryByText("CSV")).not.toBeInTheDocument();
  });
});
```

and `import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";` at the top.

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/views/DataManagerApp/DatasetNavbar`
Expected: FAIL, `dictionaries` is not a prop and "All data" is not rendered.

- [ ] **Step 3: Change `DatasetNavbar`**

1. Add the prop and its type:

```tsx
type Props = {
  datasets: Dataset.T[];
  /** Dictionaries listed in their own group below the datasets. */
  dictionaries?: readonly DataDictionary.T[];
  isLoading: boolean;
  className?: string;
};

const NO_DICTIONARIES: readonly DataDictionary.T[] = [];
```

2. Add a link builder next to `makeDatasetLink`:

```tsx
function makeDictionaryLink(options: {
  workspaceSlug: string;
  dictionary: DataDictionary.T;
}): NavLinkProps & { key: string } {
  const { workspaceSlug, dictionary } = options;
  // Destination only, for the same reasons as `makeDatasetLink`.
  const { to, params } = AppLinks.dataManagerDictionaryView({
    workspaceSlug,
    dictionaryId: dictionary.id,
    dictionaryName: dictionary.name,
  });
  return {
    key: dictionary.id,
    to,
    params,
    className: css.datasetNavbarLink,
    leftSection: <IconBook size={16} stroke={1.6} aria-hidden />,
    label: <DatasetNavbarName name={dictionary.name} />,
  } as NavLinkProps & { key: string };
}
```

(`import { IconBook, IconDatabaseOff, IconSearch } from "@tabler/icons-react";`)

3. In the component, destructure `dictionaries = NO_DICTIONARIES`, then filter and link them beside the datasets:

```tsx
  const matchingDictionaries = useMemo(() => {
    const query = deferredFilter.trim().toLocaleLowerCase();
    return query === ""
      ? dictionaries
      : dictionaries.filter((dictionary) => {
          return dictionary.name.toLocaleLowerCase().includes(query);
        });
  }, [dictionaries, deferredFilter]);

  const dictionaryLinks = useMemo(() => {
    return matchingDictionaries.map((dictionary) => {
      return makeDictionaryLink({ workspaceSlug, dictionary });
    });
  }, [matchingDictionaries, workspaceSlug]);

  const totalCount = datasets.length + dictionaries.length;
  const isGrouped =
    datasetGroups.length + (dictionaryLinks.length > 0 ? 1 : 0) > 1;
```

Replace the old `const isGrouped = datasetGroups.length > 1;`.

4. Render the dictionary group after the dataset groups inside `elements.groups()`:

```tsx
    groups() {
      return (
        <>
          {datasetGroups.map((group) => {
            return (
              <div key={group.sourceType} className={css.datasetNavbarGroup}>
                {isGrouped ? (
                  <Text component="h4" className={css.datasetNavbarGroupTitle}>
                    {sourceGroupLabels[group.sourceType]}
                  </Text>
                ) : null}
                <NavLinkList links={group.links} gap={6} inactiveHoverColor="neutral.1" />
              </div>
            );
          })}
          {dictionaryLinks.length > 0 ? (
            <div className={css.datasetNavbarGroup}>
              {isGrouped ? (
                <Text component="h4" className={css.datasetNavbarGroupTitle}>
                  <Trans>Dictionaries</Trans>
                </Text>
              ) : null}
              <NavLinkList links={dictionaryLinks} gap={6} inactiveHoverColor="neutral.1" />
            </div>
          ) : null}
        </>
      );
    },
```

5. Update the pane: title `<Trans>All data</Trans>`, `count={isLoading ? undefined : totalCount}`, the filter threshold `totalCount >= FILTER_VISIBLE_THRESHOLD`, the filter's label and placeholder `t\`Filter data\``, the empty check `datasetGroups.length === 0 && dictionaryLinks.length === 0`, and in `elements.empty()` show `No data yet` when `totalCount === 0` and `Nothing matches your filter` otherwise. Update the component docstring: "every dataset and dictionary in the workspace, datasets grouped by where they came from".

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run src/views/DataManagerApp/DatasetNavbar`
Expected: PASS, including the two older tests.

- [ ] **Step 5: Write the failing modal test**

`NewDataDictionaryModal.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { NewDataDictionaryModal } from "@/views/DataManagerApp/NewDataDictionaryModal/NewDataDictionaryModal";

const { insertMock, navigateMock } = vi.hoisted(() => {
  return { insertMock: vi.fn(), navigateMock: vi.fn() };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});

vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: () => {
      return [{ id: "profile-id" }, false, {}];
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return navigateMock;
    },
  };
});

vi.mock("@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient", () => {
  return {
    DataDictionaryClient: {
      QueryKeys: { getAll: () => { return ["DataDictionaryClient", "getAll"]; } },
      useInsert: (options: { onSuccess: (dictionary: { id: string; name: string }) => void }) => {
        return [
          (data: unknown) => {
            insertMock(data);
            options.onSuccess({ id: "new-dictionary-id", name: "NYS codes" });
          },
          false,
        ];
      },
    },
  };
});

describe("NewDataDictionaryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a dictionary owned by the current profile and opens it", async () => {
    render(<NewDataDictionaryModal opened onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  NYS codes " } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Case report codes." } });
    fireEvent.click(screen.getByRole("button", { name: "Create dictionary" }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith({
        data: {
          workspaceId: "workspace-id",
          ownerProfileId: "profile-id",
          name: "NYS codes",
          description: "Case report codes.",
        },
      });
    });
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/$workspaceSlug/data-manager/dictionaries/$dictionaryId",
        params: { workspaceSlug: "demo", dictionaryId: "new-dictionary-id" },
      }),
    );
  });

  it("does not submit a blank name", () => {
    render(<NewDataDictionaryModal opened onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Create dictionary" })).toBeDisabled();
  });
});
```

The `useInsert` call shape (`insert({ data })`) follows `DataManagerApp`'s other insert hooks; check `src/views/DashboardApp` for an existing `useInsert` call and match its argument shape exactly before writing the component.

- [ ] **Step 6: Run it to see it fail**

Run: `pnpm vitest run src/views/DataManagerApp/NewDataDictionaryModal`
Expected: FAIL, cannot resolve the component.

- [ ] **Step 7: Write the modal**

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Modal, Stack, Textarea, TextInput } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError } from "@/utils/notifications/notify";
import type { ReactNode } from "react";

type Props = {
  opened: boolean;
  onClose: () => void;
};

/**
 * Names a new, empty dictionary, creates it, and opens it. A modal because
 * creating needs only a name before the dictionary has a page of its own.
 */
export function NewDataDictionaryModal({ opened, onClose }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [insertDictionary, isInserting] = DataDictionaryClient.useInsert({
    queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
    onSuccess: (dictionary) => {
      onClose();
      setName("");
      setDescription("");
      navigate(
        AppLinks.dataManagerDictionaryView({
          workspaceSlug: workspace.slug,
          dictionaryId: dictionary.id,
          dictionaryName: dictionary.name,
        }),
      );
    },
    onError: (error) => {
      notifyError(t`The dictionary could not be created: ${error.message}`);
    },
  });
  const trimmedName = name.trim();

  return (
    <Modal opened={opened} onClose={onClose} title={t`New dictionary`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!userProfile || trimmedName === "") {
            return;
          }
          insertDictionary({
            data: {
              workspaceId: workspace.id,
              ownerProfileId: userProfile.id,
              name: trimmedName,
              description: description.trim() || undefined,
            },
          });
        }}
      >
        <Stack gap="md">
          {/* No `required`: its asterisk joins the label's text, and the
              disabled Create button already says a name is needed. */}
          <TextInput label={t`Name`} placeholder={t`NYS measles case report`} value={name} onChange={(event) => { setName(event.currentTarget.value); }} data-autofocus />
          <Textarea label={t`Description`} placeholder={t`What these codes cover and where they come from`} value={description} onChange={(event) => { setDescription(event.currentTarget.value); }} autosize minRows={2} />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose}>
              <Trans>Cancel</Trans>
            </Button>
            <OfflineGated>
              <Button type="submit" loading={isInserting} disabled={trimmedName === "" || !userProfile}>
                <Trans>Create dictionary</Trans>
              </Button>
            </OfflineGated>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 8: Wire `DataManagerApp`**

1. Load dictionaries next to datasets:

```tsx
  const [allDictionaries] = DataDictionaryClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const canEditDictionaries = useHasPermission("data_sources__can_edit_dictionaries");
  const [isNewDictionaryOpen, setIsNewDictionaryOpen] = useState(false);
  const hasListItems = (allDatasets ?? []).length + (allDictionaries ?? []).length > 0;
  const phonePane = isOnHome && (isLoadingDatasets || hasListItems) ? "list" : "detail";
```

2. Keep the existing "Add new dataset" button (e2e helpers click it by name) and add a second button beside it, inside a `Group gap="xs"`:

```tsx
      toolbarButtonSection={
        <Group gap="xs" wrap="nowrap">
          {canEditDictionaries ? (
            <Button
              leftSection={<IconBook size={18} />}
              onClick={() => {
                setIsNewDictionaryOpen(true);
              }}
              size="compact-sm"
              variant="default"
            >
              {t`New dictionary`}
            </Button>
          ) : null}
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => {
              navigate(AppLinks.dataImport(workspace.slug));
            }}
            size="compact-sm"
            variant="light"
          >
            {t`Add new dataset`}
          </Button>
        </Group>
      }
```

3. Pass `dictionaries={allDictionaries ?? []}` to `DatasetNavbar`, and render `<NewDataDictionaryModal opened={isNewDictionaryOpen} onClose={() => { setIsNewDictionaryOpen(false); }} />` after the outer `Flex`. Update the component docstring's first line to "the list of datasets and dictionaries beside whichever one is open".

- [ ] **Step 9: Run the tests**

Run: `pnpm vitest run src/views/DataManagerApp`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/views/DataManagerApp/DatasetNavbar src/views/DataManagerApp/DataManagerApp.tsx \
  src/views/DataManagerApp/NewDataDictionaryModal
git commit -m "feat(data-dictionaries): list dictionaries in Data Sources and create them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Draft state, save, and issue copy

**Files:**
- Create: `src/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft/useDataDictionaryDraft.ts`
- Test: `src/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft/useDataDictionaryDraft.test.ts`
- Create: `src/views/DataManagerApp/DataDictionaryView/useSaveDataDictionary.ts`
- Create: `src/views/DataManagerApp/DataDictionaryView/useDictionaryCopy.ts`

- [ ] **Step 1: Write the failing draft hook test**

```ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDataDictionaryDraft } from "@/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft/useDataDictionaryDraft";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

function _draft(name: string): DataDictionary.Draft {
  return {
    codeLists: [],
    entries: [
      {
        id: "11111111-1111-4111-8111-111111111111" as DataDictionaryEntry.Id,
        name,
        columnNames: [],
        kind: "text",
        unit: "",
        validMin: undefined,
        validMax: undefined,
        description: "",
        codings: [],
      },
    ],
  };
}

describe("useDataDictionaryDraft", () => {
  it("is dirty after an edit and clean again after discard", () => {
    const { result } = renderHook(() => {
      return useDataDictionaryDraft(_draft("sex"));
    });
    act(() => {
      result.current.setDraft(_draft("gender"));
    });
    expect(result.current.isDirty).toBe(true);
    act(() => {
      result.current.discard();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft.entries[0]?.name).toBe("sex");
  });

  it("adopts a newer saved draft while clean, and keeps unsaved edits while dirty", () => {
    const { result, rerender } = renderHook(
      (saved: DataDictionary.Draft) => {
        return useDataDictionaryDraft(saved);
      },
      { initialProps: _draft("sex") },
    );
    rerender(_draft("sex_at_birth"));
    expect(result.current.draft.entries[0]?.name).toBe("sex_at_birth");

    act(() => {
      result.current.setDraft(_draft("mine"));
    });
    rerender(_draft("theirs"));
    expect(result.current.draft.entries[0]?.name).toBe("mine");
  });

  it("treats the just-saved draft as clean", () => {
    const { result } = renderHook(() => {
      return useDataDictionaryDraft(_draft("sex"));
    });
    act(() => {
      result.current.setDraft(_draft("gender"));
    });
    act(() => {
      result.current.markSaved();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft.entries[0]?.name).toBe("gender");
  });
});
```

(Use `renderHook` and `act` from `@/test-utils` if that module re-exports them; otherwise from `@testing-library/react` as written.)

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft`
Expected: FAIL, cannot resolve the hook.

- [ ] **Step 3: Write the hook**

```ts
import { useState } from "react";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

type DataDictionaryDraftState = {
  draft: DataDictionary.Draft;
  setDraft: (draft: DataDictionary.Draft) => void;
  /** Whether the draft differs from what was last loaded or saved. */
  isDirty: boolean;
  /** Throws the edits away and returns to the last loaded or saved draft. */
  discard: () => void;
  /** Records the current draft as saved, so it reads as clean. */
  markSaved: () => void;
};

/**
 * Holds the editable copy of a dictionary's contents.
 *
 * A newer saved draft from the server replaces the editable copy only while
 * there are no unsaved edits, so a background refetch never wipes someone's
 * work and a fresh load always shows up when nothing is being edited.
 *
 * @param savedDraft The contents as last loaded from the server.
 */
export function useDataDictionaryDraft(
  savedDraft: DataDictionary.Draft,
): DataDictionaryDraftState {
  const savedKey = JSON.stringify(savedDraft);
  const [syncedKey, setSyncedKey] = useState(savedKey);
  const [base, setBase] = useState(savedDraft);
  const [draft, setDraft] = useState(savedDraft);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(base);

  // Adjusting state during render, rather than in an effect, so the newer
  // saved draft and the screen never disagree for a frame.
  if (savedKey !== syncedKey && !isDirty) {
    setSyncedKey(savedKey);
    setBase(savedDraft);
    setDraft(savedDraft);
  }

  return {
    draft,
    setDraft,
    isDirty,
    discard: () => {
      setDraft(base);
    },
    markSaved: () => {
      setBase(draft);
    },
  };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run src/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft`
Expected: PASS. If the second test fails because `rerender` with an equal-content draft still dirties state, check that `isDirty` compares `draft` to `base`, not to `savedDraft`.

- [ ] **Step 5: Write the save hook**

`useSaveDataDictionary.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DataDictionaryEntryCodingClient } from "@/clients/dataDictionaries/DataDictionaryEntryCodingClient";
import { Logger } from "@/utils/Logger";
import { notifySuccess } from "@/utils/notifications/notify";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

type SaveDataDictionary = {
  save: (payload: DataDictionary.SavePayload) => void;
  isSaving: boolean;
  /** The last save's failure, until the next save. */
  saveError: unknown;
};

/**
 * Saves a dictionary's contents in one call, then refreshes the dictionary
 * and its entries, code lists, and codings.
 *
 * A failure is logged, not toasted: the save bar shows it as translated
 * copy next to the Save button.
 *
 * @param options.onSaved Called after a save succeeds, before the refresh
 *   lands, so the editor can mark what it sent as saved.
 */
export function useSaveDataDictionary(
  options: Readonly<{ onSaved: () => void }>,
): SaveDataDictionary {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [saveContents, isSaving, mutation] = DataDictionaryClient.useSaveContents({
    onSuccess: async () => {
      options.onSaved();
      await Promise.all(
        [
          DataDictionaryClient,
          DataDictionaryEntryClient,
          DataDictionaryCodeListClient,
          DataDictionaryEntryCodingClient,
        ].map((client) => {
          return queryClient.invalidateQueries({
            queryKey: [client.getClientName()],
          });
        }),
      );
      notifySuccess(t`Dictionary saved`);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Saving dictionary contents failed" });
    },
  });

  return {
    save: saveContents,
    isSaving,
    saveError: mutation.error ?? undefined,
  };
}
```

- [ ] **Step 6: Write the copy hook**

`useDictionaryCopy.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

type DictionaryCopy = {
  /** Each entry kind's label and its one-line explanation. */
  kindLabels: Record<DataDictionaryEntry.Kind, string>;
  /** What one draft issue means, as shown beside the field it is about. */
  describeIssue: (issue: DataDictionary.DraftIssue) => string;
  /** What a save refusal means, or a generic failure for anything else. */
  describeSaveError: (error: unknown) => string;
};

/** Translated copy for the Dictionary view's kinds, issues, and errors. */
export function useDictionaryCopy(): DictionaryCopy {
  const { t } = useLingui();
  return useMemo((): DictionaryCopy => {
    const kindLabels: Record<DataDictionaryEntry.Kind, string> = {
      categorical: t`Categorical: named groups, such as sex or outcome`,
      ordered: t`Ordered: levels with an order, such as low to high`,
      number: t`Number: a measurement or a count`,
      date: t`Date`,
      text: t`Text`,
      identifier: t`Identifier: unique to each row, such as a case number`,
    };
    const issueCopy: Record<DataDictionary.DraftIssue["type"], string> = {
      entry_name_required: t`Give this entry a name.`,
      entry_name_not_unique: t`Another entry already has this name.`,
      entry_range_invalid: t`The lowest valid value is above the highest.`,
      entry_primary_required: t`Pick the code list this entry uses.`,
      code_list_name_required: t`Give this code list a name.`,
      code_pair_incomplete: t`Every value needs a code and a label.`,
      code_not_unique: t`This code is already in the list. Codes are matched ignoring capitalization.`,
      label_not_unique: t`Another value in this list already uses this label or spelling.`,
    };
    return {
      kindLabels,
      describeIssue: (issue) => {
        return issueCopy[issue.type];
      },
      describeSaveError: (error) => {
        const hint = DataDictionary.toSaveErrorHint(error);
        if (hint === "dictionary_editor_required") {
          return t`You need edit access to Data Sources to change this dictionary.`;
        }
        return hint
          ? t`The dictionary was not saved. Check the highlighted fields and try again.`
          : t`The dictionary was not saved. Please try again.`;
      },
    };
  }, [t]);
}
```

- [ ] **Step 7: Commit**

```bash
git add src/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft \
  src/views/DataManagerApp/DataDictionaryView/useSaveDataDictionary.ts \
  src/views/DataManagerApp/DataDictionaryView/useDictionaryCopy.ts
git commit -m "feat(data-dictionaries): add the dictionary draft, save, and copy hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The Dictionary view frame

Read `docs/design/app-view-layout.md` and `DESIGN.md` Named Rules first. Load the `impeccable` skill only if you change the composition from what the prototype shows; this task builds a surface the user already approved in the prototype.

**Files:**
- Replace: `src/views/DataManagerApp/DataDictionaryView/DataDictionaryView.tsx` (the temporary file from Task 7)
- Create: `src/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor.tsx` (+ `.module.css`)
- Create: `src/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader.tsx`
- Create: `src/views/DataManagerApp/DataDictionaryView/DataDictionaryActionsMenu/DataDictionaryActionsMenu.tsx`
- Create: `src/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar/DataDictionarySaveBar.tsx` (+ `.module.css`)
- Create: `src/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab.tsx`
- Create: `src/views/DataManagerApp/DataDictionaryView/DataDictionaryRail/DataDictionaryRail.tsx`
- Test: `src/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar/DataDictionarySaveBar.test.tsx`

- [ ] **Step 1: Write the failing save bar test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DataDictionarySaveBar } from "@/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar/DataDictionarySaveBar";

describe("DataDictionarySaveBar", () => {
  it("blocks saving while there are issues and says how many", () => {
    render(
      <DataDictionarySaveBar issueCount={2} isSaving={false} saveErrorMessage={undefined} onDiscard={vi.fn()} onSave={vi.fn()} />,
    );
    expect(screen.getByText("2 things to fix before saving")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("saves and discards", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    render(
      <DataDictionarySaveBar issueCount={0} isSaving={false} saveErrorMessage="The dictionary was not saved." onDiscard={onDiscard} onSave={onSave} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The dictionary was not saved.");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar`
Expected: FAIL, cannot resolve the component.

- [ ] **Step 3: Write the save bar**

`DataDictionarySaveBar.module.css`:

```css
/*
 * Sticks to the bottom of the view body while there are unsaved edits. The
 * opaque background and top hairline keep the table behind it from
 * reading through.
 */
.dataDictionarySaveBar {
  background-color: var(--ava-surface-raised);
  border-top: 1px solid var(--ava-border-default);
  bottom: 0;
  padding-block: var(--mantine-spacing-sm);
  position: sticky;
  z-index: 1;
}
```

`DataDictionarySaveBar.tsx`:

```tsx
import { Plural, Trans } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import css from "@/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar/DataDictionarySaveBar.module.css";
import type { ReactNode } from "react";

type Props = {
  issueCount: number;
  isSaving: boolean;
  /** Why the last save failed, shown until the next save. */
  saveErrorMessage: string | undefined;
  onDiscard: () => void;
  onSave: () => void;
};

/**
 * The bar that appears while a dictionary has unsaved edits. Edits are kept
 * as a draft and saved together, so the dictionary's version moves once per
 * save instead of once per keystroke.
 */
export function DataDictionarySaveBar({
  issueCount,
  isSaving,
  saveErrorMessage,
  onDiscard,
  onSave,
}: Readonly<Props>): ReactNode {
  return (
    // `data-sticky-action-bar` is what the NUX checklist and toasts clear.
    <div className={css.dataDictionarySaveBar} data-sticky-action-bar>
      <Group justify="space-between" gap="md" wrap="wrap">
        <Text size="sm" c={issueCount > 0 ? "danger" : "dimmed"}>
          {issueCount > 0 ? (
            <Plural value={issueCount} one="# thing to fix before saving" other="# things to fix before saving" />
          ) : (
            <Trans>Unsaved changes</Trans>
          )}
        </Text>
        <Group gap="sm">
          {saveErrorMessage ? (
            <Text size="sm" c="danger" role="alert">
              {saveErrorMessage}
            </Text>
          ) : null}
          <Button variant="default" onClick={onDiscard} disabled={isSaving}>
            <Trans>Discard</Trans>
          </Button>
          <OfflineGated>
            <Button onClick={onSave} loading={isSaving} disabled={issueCount > 0}>
              <Trans>Save changes</Trans>
            </Button>
          </OfflineGated>
        </Group>
      </Group>
    </div>
  );
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run src/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar`
Expected: PASS.

- [ ] **Step 5: Write the view, header, menu, rail, and Used by tab**

`DataDictionaryView.tsx`:

```tsx
import { where } from "@avandar/utils";
import { Center, Loader } from "@mantine/core";
import { useMemo } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DataDictionaryEntryCodingClient } from "@/clients/dataDictionaries/DataDictionaryEntryCodingClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { DataDictionaryEditor } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor";
import type { ReactNode } from "react";

type Props = {
  dictionaryId: DataDictionary.Id;
};

/**
 * One dictionary: its entries, its code lists, and the datasets that use
 * it. Loads the dictionary and its contents, then hands the editor a draft.
 */
export function DataDictionaryView({ dictionaryId }: Readonly<Props>): ReactNode {
  const [dictionary] = DataDictionaryClient.useGetById({ id: dictionaryId });
  const [entries] = DataDictionaryEntryClient.useGetAll(where("dictionary_id", "eq", dictionaryId));
  const [codeLists] = DataDictionaryCodeListClient.useGetAll(where("dictionary_id", "eq", dictionaryId));
  const [codings] = DataDictionaryEntryCodingClient.useGetAll(where("dictionary_id", "eq", dictionaryId));
  const savedDraft = useMemo(() => {
    return entries && codeLists && codings
      ? DataDictionary.toDraft({ entries, codeLists, codings })
      : undefined;
  }, [entries, codeLists, codings]);

  if (!dictionary || !savedDraft) {
    return (
      <AppView>
        <Center flex={1}>
          <Loader size="sm" />
        </Center>
      </AppView>
    );
  }
  return <DataDictionaryEditor key={dictionary.id} dictionary={dictionary} savedDraft={savedDraft} />;
}
```

`DataDictionaryActionsMenu.tsx`:

```tsx
import { ActionIcon } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { POPOVER_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
};

/** Actions on a whole dictionary that are not what someone came to do. */
export function DataDictionaryActionsMenu({ dictionary }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [deleteDictionary] = DataDictionaryClient.useDelete({
    queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
    onSuccess: () => {
      navigate(AppLinks.dataManagerHome(workspace.slug));
      notifySuccess({ title: t`Dictionary deleted`, message: t`${dictionary.name} was deleted.` });
    },
    onError: (error) => {
      notifyError(t`The dictionary could not be deleted: ${error.message}`);
    },
  });

  const onDelete = (): void => {
    modals.openConfirmModal({
      title: t`Delete dictionary`,
      children: (
        <Text>
          <Trans>Delete {dictionary.name} and all of its entries and code lists?</Trans>
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => {
        deleteDictionary({ id: dictionary.id });
      },
    });
  };

  return (
    <Menu position="bottom-end" width={230} zIndex={POPOVER_Z_INDEX}>
      <Menu.Target>
        <ActionIcon variant="default" color="neutral" tooltip={t`More dictionary actions`} aria-label={t`More dictionary actions`}>
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item color="danger" leftSection={<IconTrash size={16} />} onClick={onDelete}>
          <Trans>Delete dictionary</Trans>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
```

`DataDictionaryHeader.tsx`:

```tsx
import { EditableDisplayText } from "@avandar/ui";
import { formatDate } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { notifyError } from "@/utils/notifications/notify";
import { DataDictionaryActionsMenu } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryActionsMenu/DataDictionaryActionsMenu";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
  draft: DataDictionary.Draft;
  canEdit: boolean;
};

/** The dictionary's name, the facts that identify it, and its actions. */
export function DataDictionaryHeader({ dictionary, draft, canEdit }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [name, setName] = useState(dictionary.name);
  useEffect(() => {
    setName(dictionary.name);
  }, [dictionary.name]);
  const [updateDictionary, isUpdating] = DataDictionaryClient.useUpdate({
    queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
    onError: (error) => {
      notifyError(t`The name could not be saved: ${error.message}`);
    },
  });
  const entryCount = draft.entries.length;
  const codeListCount = draft.codeLists.length;

  return (
    <AppViewHeader
      title={
        canEdit ? (
          <EditableDisplayText
            name={t`dictionary name`}
            value={name}
            onChange={setName}
            onSave={(newName) => {
              updateDictionary({ id: dictionary.id, data: { name: newName.trim() } });
            }}
            onCancel={() => {
              setName(dictionary.name);
            }}
            isSaving={isUpdating}
            isSaveDisabled={name.trim().length === 0}
            minRows={1}
            maxRows={2}
            emptyDisplayText={t`Untitled dictionary`}
            displayTextProps={{ fz: "inherit", fw: "inherit", m: 0 }}
            fz="inherit"
            fw="inherit"
          />
        ) : (
          dictionary.name
        )
      }
      facts={[
        t`Dictionary`,
        t`${entryCount} entries`,
        t`${codeListCount} code lists`,
        t`Version ${dictionary.version}`,
        t`Updated ${formatDate(dictionary.updatedAt, { format: "MMM D, YYYY" })}`,
      ]}
      actions={canEdit ? <DataDictionaryActionsMenu dictionary={dictionary} /> : undefined}
    />
  );
}
```

(Use `<Plural>` for the two counts if Lingui's extraction warns about plural forms; follow how `DatasetMetaView` writes `t\`${numColumns} columns\`` if it does not.)

`DataDictionaryRail.tsx`:

```tsx
import { formatDate } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
};

/** Reference facts about a dictionary: where it came from and when. */
export function DataDictionaryRail({ dictionary }: Readonly<Props>): ReactNode {
  return (
    <AppViewRail>
      <AppViewRail.Group title={<Trans>Details</Trans>}>
        <AppViewRail.Fact label={<Trans>Made from</Trans>}>
          {dictionary.createdFromDatasetIds.length === 0 ? (
            <Trans>Built by hand</Trans>
          ) : (
            <Trans>{dictionary.createdFromDatasetIds.length} datasets</Trans>
          )}
        </AppViewRail.Fact>
        <AppViewRail.Fact label={<Trans>Created</Trans>}>
          {formatDate(dictionary.createdAt, { format: "MMM D, YYYY" })}
        </AppViewRail.Fact>
        <AppViewRail.Fact label={<Trans>Version</Trans>}>{dictionary.version}</AppViewRail.Fact>
      </AppViewRail.Group>
      {/* Group children render inside a `<dl>`, so the explanation is a
          fact rather than a paragraph. */}
      <AppViewRail.Group title={<Trans>How codes work</Trans>}>
        <AppViewRail.Fact label={<Trans>Both ways</Trans>}>
          <Trans>
            Data holding 1 becomes Male, and data holding Male becomes 1, from
            the same pair.
          </Trans>
        </AppViewRail.Fact>
      </AppViewRail.Group>
    </AppViewRail>
  );
}
```

`DictionaryUsedByTab.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { IconTableOff } from "@tabler/icons-react";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import type { ReactNode } from "react";

/**
 * The datasets that use a dictionary. Applying a dictionary to a dataset
 * is not built yet, so this always shows its empty state.
 */
export function DictionaryUsedByTab(): ReactNode {
  const { t } = useLingui();
  return (
    <AppSlateEmptyState
      icon={<IconTableOff size={32} stroke={1.5} aria-hidden />}
      title={t`No datasets use this dictionary yet`}
      message={<Trans>Datasets this dictionary is applied to will be listed here.</Trans>}
    />
  );
}
```

- [ ] **Step 6: Write the editor frame**

`DataDictionaryEditor.module.css`:

```css
.dataDictionaryEditorTabList {
  margin-block-end: var(--mantine-spacing-md);
}
```

`DataDictionaryEditor.tsx`:

```tsx
import { Tabs } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { DataDictionaryHeader } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader";
import css from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor.module.css";
import { DataDictionaryRail } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryRail/DataDictionaryRail";
import { DataDictionarySaveBar } from "@/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar/DataDictionarySaveBar";
import { DictionaryCodeListsTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryCodeListsTab/DictionaryCodeListsTab";
import { DictionaryEntriesTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab";
import { DictionaryUsedByTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab";
import { useDataDictionaryDraft } from "@/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft/useDataDictionaryDraft";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import { useSaveDataDictionary } from "@/views/DataManagerApp/DataDictionaryView/useSaveDataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

const TAB_IDS = ["entries", "code-lists", "used-by"] as const;
type TabId = (typeof TAB_IDS)[number];

type Props = {
  dictionary: DataDictionary.T;
  savedDraft: DataDictionary.Draft;
};

/**
 * Edits one dictionary. Entries and code lists are edited as one draft and
 * saved together from the save bar. The rail appears on the Used by tab
 * only, so the entry and code list editors get the full width for their
 * own side panes.
 */
export function DataDictionaryEditor({ dictionary, savedDraft }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const canEdit = useHasPermission("data_sources__can_edit_dictionaries");
  const { draft, setDraft, isDirty, discard, markSaved } = useDataDictionaryDraft(savedDraft);
  const issues = useMemo(() => {
    return DataDictionary.findDraftIssues(draft);
  }, [draft]);
  const { save, isSaving, saveError } = useSaveDataDictionary({ onSaved: markSaved });
  const [activeTab, setActiveTab] = useState<TabId>("entries");
  const [selectedCodeListId, setSelectedCodeListId] = useState<DataDictionaryCodeList.Id | undefined>(draft.codeLists[0]?.id);
  const openCodeList = (codeListId: DataDictionaryCodeList.Id): void => {
    setSelectedCodeListId(codeListId);
    setActiveTab("code-lists");
  };

  return (
    <AppView>
      <DataDictionaryHeader dictionary={dictionary} draft={draft} canEdit={canEdit} />
      <AppViewBody rail={activeTab === "used-by" ? <DataDictionaryRail dictionary={dictionary} /> : undefined}>
        <Tabs
          tabIds={TAB_IDS}
          value={activeTab}
          onTabChange={setActiveTab}
          classNames={{ list: css.dataDictionaryEditorTabList }}
          renderTabHeader={{
            entries: t`Entries · ${draft.entries.length}`,
            "code-lists": t`Code lists · ${draft.codeLists.length}`,
            "used-by": t`Used by`,
          }}
          renderTabPanel={{
            entries: () => {
              return <DictionaryEntriesTab draft={draft} issues={issues} canEdit={canEdit} onDraftChange={setDraft} onOpenCodeList={openCodeList} />;
            },
            "code-lists": () => {
              return <DictionaryCodeListsTab draft={draft} issues={issues} canEdit={canEdit} selectedCodeListId={selectedCodeListId} onSelectCodeList={setSelectedCodeListId} onDraftChange={setDraft} />;
            },
            "used-by": () => {
              return <DictionaryUsedByTab />;
            },
          }}
        />
        {isDirty ? (
          <DataDictionarySaveBar
            issueCount={issues.length}
            isSaving={isSaving}
            saveErrorMessage={saveError ? copy.describeSaveError(saveError) : undefined}
            onDiscard={discard}
            onSave={() => {
              save(DataDictionary.buildSavePayload({ dictionaryId: dictionary.id, draft }));
            }}
          />
        ) : null}
      </AppViewBody>
    </AppView>
  );
}
```

`DictionaryEntriesTab` and `DictionaryCodeListsTab` come in Tasks 11 and 12. Until then, stub each with a component that returns `null` and accepts the props above, so this task compiles.

- [ ] **Step 7:** `pnpm exec tsc -b --force --noEmit` and `pnpm vitest run src/views/DataManagerApp`. Expected: clean, PASS.

- [ ] **Step 8: Commit**

```bash
git add src/views/DataManagerApp/DataDictionaryView
git commit -m "feat(data-dictionaries): add the dictionary view frame

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Entries tab and entry pane

**Files:**
- Replace stub: `src/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab.tsx` (+ `.module.css`)
- Create: `src/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/DictionaryEntryPane.tsx`
- Test: `src/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DictionaryEntriesTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

const LIST_ID = "33333333-3333-4333-8333-333333333333" as DataDictionaryCodeList.Id;
const SEX_ID = "44444444-4444-4444-8444-444444444444" as DataDictionaryEntry.Id;
const AGE_ID = "55555555-5555-4555-8555-555555555555" as DataDictionaryEntry.Id;

const DRAFT: DataDictionary.Draft = {
  codeLists: [{ id: LIST_ID, name: "Sex (1/2/9)", isOrdered: false, pairs: [{ code: "1", label: "Male", acceptedSpellings: [], isMissing: false }] }],
  entries: [
    { id: SEX_ID, name: "sex", columnNames: ["GENDER"], kind: "categorical", unit: "", validMin: undefined, validMax: undefined, description: "Sex recorded on the case report.", codings: [{ codeListId: LIST_ID, isPrimary: true }] },
    { id: AGE_ID, name: "age_years", columnNames: ["age"], kind: "number", unit: "years", validMin: 0, validMax: 120, description: "", codings: [] },
  ],
};

describe("DictionaryEntriesTab", () => {
  it("lists entries with their other column names and code list, and filters by either name", () => {
    render(<DictionaryEntriesTab draft={DRAFT} issues={[]} canEdit onDraftChange={vi.fn()} onOpenCodeList={vi.fn()} />);
    expect(screen.getByRole("button", { name: "sex" })).toBeInTheDocument();
    expect(screen.getAllByText("Sex (1/2/9)").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Filter entries"), { target: { value: "age" } });
    expect(screen.queryByRole("button", { name: "sex" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "age_years" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter entries"), { target: { value: "gender" } });
    expect(screen.getByRole("button", { name: "sex" })).toBeInTheDocument();
  });

  it("edits the selected entry's description through the pane", () => {
    const onDraftChange = vi.fn();
    render(<DictionaryEntriesTab draft={DRAFT} issues={[]} canEdit onDraftChange={onDraftChange} onOpenCodeList={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Sex at birth." } });
    const nextDraft = onDraftChange.mock.calls[0]?.[0] as DataDictionary.Draft;
    expect(nextDraft.entries[0]?.description).toBe("Sex at birth.");
  });

  it("adds an entry", () => {
    const onDraftChange = vi.fn();
    render(<DictionaryEntriesTab draft={DRAFT} issues={[]} canEdit onDraftChange={onDraftChange} onOpenCodeList={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));
    const nextDraft = onDraftChange.mock.calls[0]?.[0] as DataDictionary.Draft;
    expect(nextDraft.entries).toHaveLength(3);
    expect(nextDraft.entries[2]?.name).toBe("new_entry");
  });

  it("shows an issue beside the field it is about", () => {
    render(
      <DictionaryEntriesTab draft={DRAFT} issues={[{ type: "entry_name_not_unique", entryId: SEX_ID }]} canEdit onDraftChange={vi.fn()} onOpenCodeList={vi.fn()} />,
    );
    expect(screen.getByText("Another entry already has this name.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab`
Expected: FAIL (the stub renders nothing).

- [ ] **Step 3: Write the pane**

`DictionaryEntryPane.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, MultiSelect, NumberInput, Select, Stack, Table, Text, Textarea, TextInput, TagsInput, Group } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { ReactNode } from "react";

/** The Code list select's value for "make a new list for this entry". */
const NEW_CODE_LIST_VALUE = "__new__";

type Props = {
  draft: DataDictionary.Draft;
  entry: DataDictionary.EntryDraft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
  onOpenCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
};

function _issueFor(issues: readonly DataDictionary.DraftIssue[], entryId: DataDictionaryEntry.Id, types: ReadonlyArray<DataDictionary.DraftIssue["type"]>): DataDictionary.DraftIssue | undefined {
  return issues.find((issue) => {
    return "entryId" in issue && issue.entryId === entryId && types.includes(issue.type);
  });
}

/** Edits one entry: its name, other column names, kind, codes, and description. */
export function DictionaryEntryPane({ draft, entry, issues, canEdit, onDraftChange, onOpenCodeList }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const update = (changes: Partial<DataDictionary.EntryDraft>): void => {
    onDraftChange(DataDictionary.replaceEntry(draft, { ...entry, ...changes }));
  };
  const nameIssue = _issueFor(issues, entry.id, ["entry_name_required", "entry_name_not_unique"]);

  return (
    <Stack gap="md">
      <TextInput label={t`Name`} value={entry.name} disabled={!canEdit} error={nameIssue ? copy.describeIssue(nameIssue) : undefined} onChange={(event) => { update({ name: event.currentTarget.value }); }} />
      <TagsInput label={t`Also matches columns named`} placeholder={t`Type a column name and press Enter`} value={entry.columnNames} disabled={!canEdit} onChange={(columnNames) => { update({ columnNames }); }} />
      <Select
        label={t`Kind`}
        value={entry.kind}
        disabled={!canEdit}
        allowDeselect={false}
        data={DataDictionary.ENTRY_KINDS.map((kind) => { return { value: kind, label: copy.kindLabels[kind] }; })}
        onChange={(kind) => { if (kind) { update({ kind: kind as DataDictionaryEntry.Kind }); } }}
      />
      {DataDictionary.isCodedKind(entry.kind) ? (
        <EntryCodesFields draft={draft} entry={entry} issues={issues} canEdit={canEdit} onDraftChange={onDraftChange} onOpenCodeList={onOpenCodeList} />
      ) : null}
      {entry.kind === "number" ? (
        <EntryNumberFields entry={entry} issues={issues} canEdit={canEdit} onChange={update} />
      ) : null}
      <Textarea
        label={t`Description`}
        description={t`Applying this entry to a dataset adds this description to the column.`}
        placeholder={t`What this column means, so teammates read it the same way`}
        value={entry.description}
        disabled={!canEdit}
        autosize
        minRows={3}
        onChange={(event) => { update({ description: event.currentTarget.value }); }}
      />
      {canEdit ? (
        <Group>
          <Button variant="subtle" color="danger" leftSection={<IconTrash size={14} aria-hidden />} onClick={() => { onDraftChange(DataDictionary.removeEntry(draft, entry.id)); }}>
            <Trans>Remove entry</Trans>
          </Button>
        </Group>
      ) : null}
    </Stack>
  );
}

function EntryCodesFields({ draft, entry, issues, canEdit, onDraftChange, onOpenCodeList }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const primaryId = DataDictionary.getPrimaryCodeListId(entry);
  const primaryList = draft.codeLists.find((list) => { return list.id === primaryId; });
  const listOptions = draft.codeLists.map((list) => { return { value: list.id, label: list.name }; });
  const primaryIssue = _issueFor(issues, entry.id, ["entry_primary_required"]);

  return (
    <Stack gap="xs">
      <Select
        label={t`Code list`}
        placeholder={t`No code list`}
        value={primaryId ?? null}
        disabled={!canEdit}
        clearable
        error={primaryIssue ? copy.describeIssue(primaryIssue) : undefined}
        data={[...listOptions, { value: NEW_CODE_LIST_VALUE, label: t`New code list for this entry` }]}
        onChange={(value) => {
          if (value === NEW_CODE_LIST_VALUE) {
            onDraftChange(DataDictionary.addCodeListForEntry(draft, entry.id).draft);
            return;
          }
          onDraftChange(DataDictionary.setPrimaryCodeList(draft, { entryId: entry.id, codeListId: (value ?? undefined) as DataDictionaryCodeList.Id | undefined }));
        }}
      />
      {primaryList ? (
        <>
          <Table withTableBorder fz="sm" aria-label={t`Values in ${primaryList.name}`}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th><Trans>Code</Trans></Table.Th>
                <Table.Th><Trans>Label</Trans></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {primaryList.pairs.map((pair, index) => {
                return (
                  <Table.Tr key={`${pair.code}-${index}`}>
                    <Table.Td fw={600}>{pair.code}</Table.Td>
                    <Table.Td>{pair.label}{pair.isMissing ? <Text span c="dimmed" size="xs">{" "}<Trans>(missing value)</Trans></Text> : null}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          <Group>
            <Button variant="subtle" size="compact-sm" onClick={() => { onOpenCodeList(primaryList.id); }}>
              <Trans>Edit {primaryList.name}</Trans>
            </Button>
          </Group>
          <MultiSelect
            label={t`Also recognizes these code lists`}
            description={t`For data that writes the same values another way, such as M and F instead of 1 and 2.`}
            value={entry.codings.filter((coding) => { return !coding.isPrimary; }).map((coding) => { return coding.codeListId; })}
            data={listOptions.filter((option) => { return option.value !== primaryId; })}
            disabled={!canEdit}
            onChange={(codeListIds) => {
              onDraftChange(DataDictionary.setOtherCodeLists(draft, { entryId: entry.id, codeListIds: codeListIds as DataDictionaryCodeList.Id[] }));
            }}
          />
        </>
      ) : null}
    </Stack>
  );
}

function EntryNumberFields({ entry, issues, canEdit, onChange }: Readonly<{
  entry: DataDictionary.EntryDraft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onChange: (changes: Partial<DataDictionary.EntryDraft>) => void;
}>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const rangeIssue = _issueFor(issues, entry.id, ["entry_range_invalid"]);
  const toNumber = (value: string | number): number | undefined => {
    return typeof value === "number" ? value : undefined;
  };

  return (
    <Stack gap="xs">
      <TextInput label={t`Unit`} placeholder={t`For example, years`} value={entry.unit} disabled={!canEdit} onChange={(event) => { onChange({ unit: event.currentTarget.value }); }} />
      <Group grow align="flex-start">
        <NumberInput label={t`Lowest valid value`} value={entry.validMin ?? ""} disabled={!canEdit} onChange={(value) => { onChange({ validMin: toNumber(value) }); }} />
        <NumberInput label={t`Highest valid value`} value={entry.validMax ?? ""} disabled={!canEdit} error={rangeIssue ? copy.describeIssue(rangeIssue) : undefined} onChange={(value) => { onChange({ validMax: toNumber(value) }); }} />
      </Group>
    </Stack>
  );
}
```

`DictionaryEntryPane` and its two field groups each stay under 45 lines once `oxfmt` wraps them; if one grows past that, move `EntryCodesFields` to its own file beside the pane.

- [ ] **Step 4: Write the tab**

`DictionaryEntriesTab.module.css`:

```css
/*
 * The entries table and the selected entry's pane side by side. Below 62em
 * the pane drops under the table instead of squeezing it.
 */
.dictionaryEntriesTab {
  display: grid;
  gap: var(--mantine-spacing-lg);
  grid-template-columns: minmax(0, 1fr) 22rem;
}

.dictionaryEntriesTabPane {
  background-color: var(--ava-surface-body);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  padding: var(--mantine-spacing-md);
}

.dictionaryEntriesTabRow[data-selected="true"] td {
  background-color: var(--mantine-color-primary-0);
}

.dictionaryEntriesTabAlias {
  margin-inline-end: var(--mantine-spacing-xxs);
}

@media (width < 62em) {
  .dictionaryEntriesTab {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

`DictionaryEntriesTab.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Button, Group, Stack, Table, Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DictionaryEntryPane } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/DictionaryEntryPane";
import css from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab.module.css";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
  onOpenCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
};

function _matchesFilter(entry: DataDictionary.EntryDraft, query: string): boolean {
  return query === "" || [entry.name, ...entry.columnNames].some((name) => {
    return DataDictionary.normalizeKey(name).includes(query);
  });
}

/**
 * Every entry in the dictionary beside the selected entry's pane. The filter
 * matches an entry's own name and every column name it also matches.
 */
export function DictionaryEntriesTab({ draft, issues, canEdit, onDraftChange, onOpenCodeList }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<DataDictionaryEntry.Id | undefined>(draft.entries[0]?.id);
  const query = DataDictionary.normalizeKey(filter);
  const rows = useMemo(() => {
    return draft.entries.filter((entry) => { return _matchesFilter(entry, query); });
  }, [draft.entries, query]);
  const selected = draft.entries.find((entry) => { return entry.id === selectedId; }) ?? draft.entries[0];
  const listNames = new Map(draft.codeLists.map((list) => { return [list.id, list.name] as const; }));

  return (
    <div className={css.dictionaryEntriesTab}>
      <Stack gap="sm" miw={0}>
        <Group justify="space-between" gap="sm">
          <TextInput aria-label={t`Filter entries`} placeholder={t`Filter entries or column names`} leftSection={<IconSearch size={14} stroke={1.6} />} value={filter} onChange={(event) => { setFilter(event.currentTarget.value); }} w={280} />
          {canEdit ? (
            <Button variant="default" leftSection={<IconPlus size={14} aria-hidden />} onClick={() => {
              const entry = DataDictionary.makeNewEntry(draft.entries.map((current) => { return current.name; }));
              onDraftChange({ ...draft, entries: [...draft.entries, entry] });
              setSelectedId(entry.id);
            }}>
              <Trans>Add entry</Trans>
            </Button>
          ) : null}
        </Group>
        <EntriesTable rows={rows} selectedId={selected?.id} listNames={listNames} kindLabels={copy.kindLabels} onSelect={setSelectedId} />
        {draft.entries.length === 0 ? (
          <Text c="dimmed" size="sm"><Trans>No entries yet. Add one for each kind of column this dictionary describes.</Trans></Text>
        ) : rows.length === 0 ? (
          <Text c="dimmed" size="sm"><Trans>No entries match “{filter}”. Entries match on their own name and on every column name they also match.</Trans></Text>
        ) : null}
      </Stack>
      {selected ? (
        <aside className={css.dictionaryEntriesTabPane} aria-label={t`Edit ${selected.name || "entry"}`}>
          <DictionaryEntryPane draft={draft} entry={selected} issues={issues} canEdit={canEdit} onDraftChange={onDraftChange} onOpenCodeList={onOpenCodeList} />
        </aside>
      ) : null}
    </div>
  );
}

function EntriesTable({ rows, selectedId, listNames, kindLabels, onSelect }: Readonly<{
  rows: readonly DataDictionary.EntryDraft[];
  selectedId: DataDictionaryEntry.Id | undefined;
  listNames: ReadonlyMap<DataDictionaryCodeList.Id, string>;
  kindLabels: Record<DataDictionaryEntry.Kind, string>;
  onSelect: (entryId: DataDictionaryEntry.Id) => void;
}>): ReactNode {
  return (
    <Table highlightOnHover layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={160}><Trans>Entry</Trans></Table.Th>
          <Table.Th w={190}><Trans>Also matches columns named</Trans></Table.Th>
          <Table.Th w={170}><Trans>Kind and values</Trans></Table.Th>
          <Table.Th><Trans>Description</Trans></Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((entry) => {
          const primaryId = DataDictionary.getPrimaryCodeListId(entry);
          return (
            <Table.Tr key={entry.id} className={css.dictionaryEntriesTabRow} data-selected={entry.id === selectedId}>
              <Table.Td>
                <UnstyledButton fw={500} onClick={() => { onSelect(entry.id); }}>{entry.name}</UnstyledButton>
              </Table.Td>
              <Table.Td>
                {entry.columnNames.map((name) => {
                  return <Badge key={name} variant="outline" color="neutral" size="sm" radius="xs" tt="none" className={css.dictionaryEntriesTabAlias}>{name}</Badge>;
                })}
              </Table.Td>
              <Table.Td>
                <Text size="sm">{kindLabels[entry.kind].split(":")[0]}</Text>
                <Text size="xs" c="dimmed">{primaryId ? listNames.get(primaryId) : <Trans>Any value</Trans>}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" lineClamp={2} c={entry.description ? undefined : "dimmed"}>
                  {entry.description || <Trans>No description</Trans>}
                </Text>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
```

`kindLabels[entry.kind].split(":")[0]` shows the short form ("Categorical") of a label like "Categorical: named groups...". This relies on every locale keeping the colon; if a translation drops it, the whole label shows, which is still correct. If you prefer, add a separate `kindShortLabels` record to `useDictionaryCopy` instead.

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm vitest run src/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab \
  src/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane
git commit -m "feat(data-dictionaries): edit dictionary entries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Code lists tab and code list editor

**Files:**
- Replace stub: `src/views/DataManagerApp/DataDictionaryView/DictionaryCodeListsTab/DictionaryCodeListsTab.tsx` (+ `.module.css`)
- Create: `src/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.tsx` (+ `.module.css`)
- Create: `src/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairRow.tsx`
- Create: `src/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairDragHandle.tsx`
- Create: `src/views/DataManagerApp/DataDictionaryView/CodeListEditor/PastePairsModal.tsx`
- Test: `src/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { CodeListEditor } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";

const LIST_ID = "66666666-6666-4666-8666-666666666666" as DataDictionaryCodeList.Id;

function _draft(pairs: DataDictionaryCodeList.Pair[]): DataDictionary.Draft {
  return { entries: [], codeLists: [{ id: LIST_ID, name: "Sex", isOrdered: false, pairs }] };
}

function _lastDraft(onDraftChange: ReturnType<typeof vi.fn>): DataDictionary.Draft {
  return onDraftChange.mock.calls.at(-1)?.[0] as DataDictionary.Draft;
}

describe("CodeListEditor", () => {
  it("edits a label and adds a value", () => {
    const onDraftChange = vi.fn();
    const draft = _draft([{ code: "1", label: "Male", acceptedSpellings: [], isMissing: false }]);
    render(<CodeListEditor draft={draft} codeListId={LIST_ID} issues={[]} canEdit onDraftChange={onDraftChange} />);

    fireEvent.change(screen.getByLabelText("Label 1"), { target: { value: "Man" } });
    expect(_lastDraft(onDraftChange).codeLists[0]?.pairs[0]?.label).toBe("Man");

    fireEvent.click(screen.getByRole("button", { name: "Add value" }));
    expect(_lastDraft(onDraftChange).codeLists[0]?.pairs).toHaveLength(2);
  });

  it("replaces a single empty row with pasted values", () => {
    const onDraftChange = vi.fn();
    const draft = _draft([{ code: "", label: "", acceptedSpellings: [], isMissing: false }]);
    render(<CodeListEditor draft={draft} codeListId={LIST_ID} issues={[]} canEdit onDraftChange={onDraftChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Paste a list" }));
    fireEvent.change(screen.getByLabelText("Values to add"), { target: { value: "1 = Male\n2 = Female" } });
    fireEvent.click(screen.getByRole("button", { name: "Add 2 values" }));

    expect(_lastDraft(onDraftChange).codeLists[0]?.pairs.map((pair) => { return pair.label; })).toEqual(["Male", "Female"]);
  });

  it("explains that pairs work both ways and shows pair issues on their row", () => {
    const draft = _draft([
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "1", label: "Man", acceptedSpellings: [], isMissing: false },
    ]);
    render(
      <CodeListEditor draft={draft} codeListId={LIST_ID} issues={[{ type: "code_not_unique", codeListId: LIST_ID, pairIndex: 1 }]} canEdit onDraftChange={vi.fn()} />,
    );
    expect(screen.getByText(/Pairs work both ways/)).toBeInTheDocument();
    expect(screen.getByText(/This code is already in the list/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/views/DataManagerApp/DataDictionaryView/CodeListEditor`
Expected: FAIL, cannot resolve the component.

- [ ] **Step 3: Write the drag handle**

Copy `src/components/caseStatuses/StatusSetEditor/StatusDragHandle.tsx` to `CodePairDragHandle.tsx` and change only the names and copy, so it describes a value in a list:

```tsx
import { useLingui } from "@lingui/react/macro";
import { VisuallyHidden } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { useId } from "react";
import css from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.module.css";
import type { KeyboardEvent, ReactNode, Ref } from "react";

type Props = {
  valueName: string;
  handleRef: Ref<HTMLButtonElement>;
  isDragging: boolean;
  onMoveByOffset: (offset: -1 | 1) => void;
};

function _onMoveKeyDown(event: KeyboardEvent<HTMLButtonElement>, onMoveByOffset: Props["onMoveByOffset"]): void {
  if (!event.altKey) {
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    onMoveByOffset(-1);
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    onMoveByOffset(1);
  }
}

/**
 * The reorder handle of one value in an ordered code list. Pointer users
 * drag it. Keyboard users pick the row up with Space or Enter and move it
 * with the arrow keys, or hold Alt and press an arrow to move it one place.
 */
export function CodePairDragHandle({ valueName, handleRef, isDragging, onMoveByOffset }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const instructionsId = useId();
  return (
    <>
      <button
        type="button"
        ref={handleRef}
        className={css.codeListEditorHandle}
        aria-label={t`Reorder ${valueName}`}
        aria-describedby={instructionsId}
        aria-keyshortcuts="Space Enter Alt+ArrowUp Alt+ArrowDown"
        onKeyDown={(event) => {
          if (!isDragging) {
            _onMoveKeyDown(event, onMoveByOffset);
          }
        }}
      >
        <IconGripVertical size={14} stroke={2} aria-hidden />
      </button>
      <VisuallyHidden id={instructionsId}>
        {t`Press Space or Enter to pick up this value, move it with the arrow keys, then press Space or Enter to drop it. Or hold Alt and press the up or down arrow to move it one place.`}
      </VisuallyHidden>
    </>
  );
}
```

- [ ] **Step 4: Write the row**

`CodePairRow.tsx`:

```tsx
import { ActionIcon } from "@avandar/ui";
import { useSortable } from "@dnd-kit/react/sortable";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, TagsInput, Text, TextInput } from "@mantine/core";
import { IconArrowsLeftRight, IconTrash } from "@tabler/icons-react";
import { CodePairDragHandle } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairDragHandle";
import css from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.module.css";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  /** A stable key for the sortable, since pairs have no id. */
  sortableId: string;
  pair: DataDictionaryCodeList.Pair;
  index: number;
  isOrdered: boolean;
  canEdit: boolean;
  issueMessage: string | undefined;
  onChange: (pair: DataDictionaryCodeList.Pair) => void;
  onRemove: () => void;
  onMoveByOffset: (offset: -1 | 1) => void;
};

/**
 * One value in a code list: its code, a two-way arrow, its label, the other
 * spellings that also mean it, and whether it stands for a missing answer.
 * Every control is named after its row number, so a screen reader user
 * knows which value they are in.
 */
export function CodePairRow({ sortableId, pair, index, isOrdered, canEdit, issueMessage, onChange, onRemove, onMoveByOffset }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { ref, handleRef, isDragging } = useSortable({ id: sortableId, index, disabled: !isOrdered || !canEdit });
  const rowNumber = index + 1;
  const valueName = pair.label.trim() || t`value ${rowNumber}`;

  return (
    <li ref={ref} className={css.codeListEditorRow} data-dragging={isDragging} aria-label={valueName}>
      {isOrdered && canEdit ? (
        <CodePairDragHandle valueName={valueName} handleRef={handleRef} isDragging={isDragging} onMoveByOffset={onMoveByOffset} />
      ) : null}
      <TextInput aria-label={t`Code ${rowNumber}`} value={pair.code} disabled={!canEdit} className={css.codeListEditorCode} onChange={(event) => { onChange({ ...pair, code: event.currentTarget.value }); }} />
      <IconArrowsLeftRight size={14} aria-hidden className={css.codeListEditorArrow} />
      <TextInput aria-label={t`Label ${rowNumber}`} value={pair.label} disabled={!canEdit} onChange={(event) => { onChange({ ...pair, label: event.currentTarget.value }); }} />
      <TagsInput aria-label={t`Other spellings of value ${rowNumber}`} placeholder={t`Also accept`} value={pair.acceptedSpellings} disabled={!canEdit} onChange={(acceptedSpellings) => { onChange({ ...pair, acceptedSpellings }); }} />
      <Checkbox label={t`Missing`} checked={pair.isMissing} disabled={!canEdit} onChange={(event) => { onChange({ ...pair, isMissing: event.currentTarget.checked }); }} />
      {canEdit ? (
        <ActionIcon variant="subtle" color="neutral" tooltip={t`Remove ${valueName}`} aria-label={t`Remove ${valueName}`} onClick={onRemove}>
          <IconTrash size={14} aria-hidden />
        </ActionIcon>
      ) : null}
      {issueMessage ? (
        <Text size="xs" c="danger" role="alert" className={css.codeListEditorRowIssue}>{issueMessage}</Text>
      ) : null}
    </li>
  );
}
```

Pairs have no id, so `CodeListEditor` gives each row a `sortableId` of `${codeListId}-${index}` and remounts the list after every reorder by keying the `ul` on a reorder counter. This is the one place this plan reaches for an index key; it is safe because a reorder is the only edit that moves a pair to another index, and it rebuilds the rows. The counter is not the codes themselves: keying on the codes would remount the list, and lose focus, on every keystroke in a Code field.

- [ ] **Step 5: Write the paste modal**

`PastePairsModal.tsx`:

```tsx
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  opened: boolean;
  onClose: () => void;
  onAdd: (pairs: DataDictionaryCodeList.Pair[]) => void;
};

/**
 * Adds many values at once from pasted text, one per line, such as
 * `1 = Male` or `1, Male`. Typing twelve race codes one row at a time is
 * the chore a dictionary exists to remove.
 */
export function PastePairsModal({ opened, onClose, onAdd }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [text, setText] = useState("");
  const pairs = DataDictionary.parsePastedPairs(text);

  return (
    <Modal opened={opened} onClose={onClose} title={t`Paste a list`}>
      <Stack gap="md">
        <Textarea
          label={t`Values to add`}
          description={t`One per line, with the code first: 1 = Male, 1: Male, or 1, Male.`}
          autosize
          minRows={6}
          value={text}
          onChange={(event) => { setText(event.currentTarget.value); }}
          data-autofocus
        />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            <Plural value={pairs.length} one="# value found" other="# values found" />
          </Text>
          <Group gap="sm">
            <Button variant="default" onClick={onClose}><Trans>Cancel</Trans></Button>
            <Button disabled={pairs.length === 0} onClick={() => { onAdd(pairs); setText(""); onClose(); }}>
              <Plural value={pairs.length} one="Add # value" other="Add # values" />
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
```

- [ ] **Step 6: Write the editor**

`CodeListEditor.module.css`:

```css
.codeListEditorList {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}

.codeListEditorRow {
  align-items: center;
  display: grid;
  gap: var(--mantine-spacing-xs);
  grid-template-columns: auto 7rem auto minmax(8rem, 1fr) minmax(8rem, 1fr) auto auto;
}

.codeListEditorRow[data-dragging="true"] {
  opacity: 0.6;
}

.codeListEditorRowIssue {
  grid-column: 2 / -1;
}

.codeListEditorCode {
  font-variant-numeric: tabular-nums;
}

.codeListEditorArrow {
  color: var(--mantine-color-neutral-5);
}

.codeListEditorHandle {
  background: none;
  border: 0;
  border-radius: var(--mantine-radius-xs);
  color: var(--mantine-color-neutral-5);
  cursor: grab;
  display: inline-flex;
  padding: var(--mantine-spacing-xxs);
}
```

When the list is unordered there is no handle, so the first grid track collapses to zero width.

`CodeListEditor.tsx`:

```tsx
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { IconClipboardText, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import css from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.module.css";
import { CodePairRow } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairRow";
import { PastePairsModal } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/PastePairsModal";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  codeListId: DataDictionaryCodeList.Id;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
};

function _isBlank(pairs: readonly DataDictionaryCodeList.Pair[]): boolean {
  return pairs.every((pair) => { return pair.code.trim() === "" && pair.label.trim() === ""; });
}

/**
 * Edits one code list: its name, whether it is ordered, and its values.
 * Ordered lists can be reordered by dragging, and that order is the
 * scale's order wherever the list is used.
 */
export function CodeListEditor({ draft, codeListId, issues, canEdit, onDraftChange }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  // Bumped on every reorder, to remount the index-keyed rows.
  const [orderVersion, setOrderVersion] = useState(0);
  const list = draft.codeLists.find((current) => { return current.id === codeListId; });
  if (!list) {
    return null;
  }
  const setPairs = (pairs: DataDictionaryCodeList.Pair[]): void => {
    onDraftChange(DataDictionary.replaceCodeList(draft, { ...list, pairs }));
  };
  const reorderPairs = (pairs: DataDictionaryCodeList.Pair[]): void => {
    setPairs(pairs);
    setOrderVersion((version) => { return version + 1; });
  };
  const usedBy = DataDictionary.getEntriesUsingCodeList(draft, list.id).map((entry) => { return entry.name; });
  const nameIssue = issues.find((issue) => { return issue.type === "code_list_name_required" && issue.codeListId === list.id; });
  const pairIssue = (index: number): string | undefined => {
    const issue = issues.find((current) => { return "pairIndex" in current && current.codeListId === list.id && current.pairIndex === index; });
    return issue ? copy.describeIssue(issue) : undefined;
  };

  return (
    <Stack gap="md">
      <Group align="flex-end" justify="space-between" gap="md">
        <TextInput label={t`Name`} value={list.name} disabled={!canEdit} w={320} error={nameIssue ? copy.describeIssue(nameIssue) : undefined} onChange={(event) => { onDraftChange(DataDictionary.replaceCodeList(draft, { ...list, name: event.currentTarget.value })); }} />
        <SegmentedControl aria-label={t`Order`} value={list.isOrdered ? "ordered" : "unordered"} disabled={!canEdit} data={[{ value: "unordered", label: t`Unordered` }, { value: "ordered", label: t`Ordered` }]} onChange={(value) => { onDraftChange(DataDictionary.replaceCodeList(draft, { ...list, isOrdered: value === "ordered" })); }} />
      </Group>
      <Text size="sm" c="dimmed">
        {usedBy.length > 0 ? <Trans>Used by {usedBy.join(", ")}.</Trans> : <Trans>No entry uses this code list yet.</Trans>}
      </Text>
      <DragDropProvider onDragEnd={(event) => { reorderPairs(move([...list.pairs], event)); }}>
        <ul key={orderVersion} className={css.codeListEditorList} aria-label={t`Values in ${list.name}`}>
          {list.pairs.map((pair, index) => {
            return (
              <CodePairRow
                key={`${list.id}-${index}`}
                sortableId={`${list.id}-${index}`}
                pair={pair}
                index={index}
                isOrdered={list.isOrdered}
                canEdit={canEdit}
                issueMessage={pairIssue(index)}
                onChange={(nextPair) => { setPairs(list.pairs.map((current, currentIndex) => { return currentIndex === index ? nextPair : current; })); }}
                onRemove={() => { setPairs(list.pairs.filter((_pair, currentIndex) => { return currentIndex !== index; })); }}
                onMoveByOffset={(offset) => {
                  const target = index + offset;
                  if (target < 0 || target >= list.pairs.length) { return; }
                  const next = [...list.pairs];
                  [next[index], next[target]] = [next[target]!, next[index]!];
                  reorderPairs(next);
                }}
              />
            );
          })}
        </ul>
      </DragDropProvider>
      {canEdit ? (
        <Group gap="sm">
          <Button variant="default" size="compact-sm" leftSection={<IconPlus size={14} aria-hidden />} onClick={() => { setPairs([...list.pairs, DataDictionary.makeEmptyPair()]); }}>
            <Trans>Add value</Trans>
          </Button>
          <Button variant="subtle" size="compact-sm" leftSection={<IconClipboardText size={14} aria-hidden />} onClick={() => { setIsPasteOpen(true); }}>
            <Trans>Paste a list</Trans>
          </Button>
        </Group>
      ) : null}
      <Text size="sm" c="dimmed" maw="70ch">
        <Trans>Pairs work both ways. Applying this list to a column of codes turns them into labels, and applying it to a column of labels turns them into codes. Matching ignores capitalization and extra spaces, and also accepts the other spellings listed beside each label.</Trans>
      </Text>
      <PastePairsModal opened={isPasteOpen} onClose={() => { setIsPasteOpen(false); }} onAdd={(pasted) => { setPairs(_isBlank(list.pairs) ? pasted : [...list.pairs, ...pasted]); }} />
    </Stack>
  );
}
```

`CodeListEditor` is over 45 lines. Split it before committing: move the pairs list (`DragDropProvider` through the closing `</DragDropProvider>`) and the `orderVersion` state into a `CodePairList` component in its own file beside it, taking `list`, `canEdit`, `pairIssue`, and `setPairs` as props.

- [ ] **Step 7: Write the tab**

`DictionaryCodeListsTab.module.css`:

```css
/* The list of code lists beside the selected list's editor. */
.dictionaryCodeListsTab {
  display: grid;
  gap: var(--mantine-spacing-lg);
  grid-template-columns: 16rem minmax(0, 1fr);
}

.dictionaryCodeListsTabList {
  background-color: var(--ava-surface-body);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  padding: var(--mantine-spacing-xs);
}

@media (width < 62em) {
  .dictionaryCodeListsTab {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

`DictionaryCodeListsTab.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, NavLink, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { CodeListEditor } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor";
import css from "@/views/DataManagerApp/DataDictionaryView/DictionaryCodeListsTab/DictionaryCodeListsTab.module.css";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  selectedCodeListId: DataDictionaryCodeList.Id | undefined;
  onSelectCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
  onDraftChange: (draft: DataDictionary.Draft) => void;
};

/** Every code list in the dictionary beside the selected list's editor. */
export function DictionaryCodeListsTab({ draft, issues, canEdit, selectedCodeListId, onSelectCodeList, onDraftChange }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const selected = draft.codeLists.find((list) => { return list.id === selectedCodeListId; }) ?? draft.codeLists[0];

  const onRemove = (list: DataDictionary.CodeListDraft): void => {
    const usedBy = DataDictionary.getEntriesUsingCodeList(draft, list.id).length;
    modals.openConfirmModal({
      title: t`Remove ${list.name}`,
      children: <Text>{usedBy > 0 ? <Trans>{usedBy} entries use this code list. Removing it removes it from them too.</Trans> : <Trans>No entry uses this code list.</Trans>}</Text>,
      labels: { confirm: t`Remove`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => { onDraftChange(DataDictionary.removeCodeList(draft, list.id)); },
    });
  };

  return (
    <div className={css.dictionaryCodeListsTab}>
      <Stack gap="xs" className={css.dictionaryCodeListsTabList}>
        {draft.codeLists.map((list) => {
          const usedBy = DataDictionary.getEntriesUsingCodeList(draft, list.id).length;
          return (
            <NavLink key={list.id} active={list.id === selected?.id} label={list.name} description={t`${list.pairs.length} values · used by ${usedBy}`} onClick={() => { onSelectCodeList(list.id); }} />
          );
        })}
        {canEdit ? (
          <Button variant="subtle" size="compact-sm" leftSection={<IconPlus size={14} aria-hidden />} onClick={() => {
            const list = DataDictionary.makeNewCodeList(draft.codeLists.map((current) => { return current.name; }));
            onDraftChange({ ...draft, codeLists: [...draft.codeLists, list] });
            onSelectCodeList(list.id);
          }}>
            <Trans>New code list</Trans>
          </Button>
        ) : null}
      </Stack>
      {selected ? (
        <Stack gap="md" miw={0}>
          <CodeListEditor draft={draft} codeListId={selected.id} issues={issues} canEdit={canEdit} onDraftChange={onDraftChange} />
          {canEdit ? (
            <div>
              <Button variant="subtle" color="danger" size="compact-sm" leftSection={<IconTrash size={14} aria-hidden />} onClick={() => { onRemove(selected); }}>
                <Trans>Remove code list</Trans>
              </Button>
            </div>
          ) : null}
        </Stack>
      ) : (
        <Text c="dimmed"><Trans>No code lists yet. A code list holds values such as 1 = Male, and any entry can use it.</Trans></Text>
      )}
    </div>
  );
}
```

`NavLink` with `active` uses Mantine's primary fill. If that reads louder than the Data Sources list's rows, use `NavLinkList` from `@avandar/ui` with `inactiveHoverColor="neutral.1"` instead, as `DatasetNavbar` does.

- [ ] **Step 8: Run the tests to see them pass**

Run: `pnpm vitest run src/views/DataManagerApp/DataDictionaryView`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/views/DataManagerApp/DataDictionaryView/CodeListEditor \
  src/views/DataManagerApp/DataDictionaryView/DictionaryCodeListsTab
git commit -m "feat(data-dictionaries): edit code lists with two-way pairs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Look at it, translations, design detector, docs

**Files:**
- Modify: `src/i18n/locales/*/messages.po|ts` (generated)
- Modify: `docs/measles-demo/pr-feature-log.md`

- [ ] **Step 1: Look at it.** Run `pnpm dev`, sign in with the seeded credentials from `seed/SeedData.ts` (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, workspace `TEST_WORKSPACE_SLUG`), and with a headless Playwright session capture into `.temp/feat-data-dictionaries/`: the Data Sources list with a Dictionaries group, the New dictionary modal, the Entries tab with a selected categorical entry, the Code lists tab with an ordered list, the save bar with an issue, and the Used by tab with its rail. Compare against the prototype. Fix what differs from it or from `docs/design/app-view-layout.md` (no `Paper` or `Card` between the slate and the content, no `Callout color="info"`, more space above a heading than below it, the save bar sets `data-sticky-action-bar`).
- [ ] **Step 2:** `.claude/skills/impeccable/scripts/impeccable detect --json src/views/DataManagerApp/DataDictionaryView src/views/DataManagerApp/NewDataDictionaryModal src/views/DataManagerApp/DatasetNavbar`. Fix every finding that is mechanical; list the rest in the PR.
- [ ] **Step 3:** `pnpm i18n:extract && pnpm i18n:compile`; commit `src/i18n/locales` as `chore(data-dictionaries): extract dictionary messages`. (The pre-push hook adds machine translations; that is expected.)
- [ ] **Step 4:** Add this slice to `docs/measles-demo/pr-feature-log.md` as the next free F number: the commits from Tasks 3 to 12, the files, the schema (four tables, one enum, one RPC with six helpers), and the verification commands. Follow the existing entries' format.
- [ ] **Step 5:** Commit the log: `docs(measles-demo): log the data dictionaries slice`.

---

### Task 14: End-to-end spec

Load the `playwright-best-practices` skill. Read `docs/rules/e2e-testing.md`.

**Files:**
- Create: `tests/e2e/data-dictionary-edit.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
/*
 * A workspace owner creates a dictionary, pastes a code list, adds a
 * categorical entry that uses it, and saves. Nothing is seeded: the whole
 * flow goes through the UI. The dictionary is deleted afterwards.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { createSupabaseAdminClient, getWorkspaceIdBySlug } from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

const DICTIONARY_NAME = "E2E measles codes";

test.describe("data dictionaries", () => {
  test("creates a dictionary with a pasted code list and an entry that uses it", async ({ page, e2eWorkerDb }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug(admin, e2eWorkerDb.workspaceSlug);
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await page.getByRole("link", { name: "Data Sources" }).click();

      await page.getByRole("button", { name: "New dictionary" }).click();
      const createDialog = page.getByRole("dialog", { name: "New dictionary" });
      await createDialog.getByLabel("Name").fill(DICTIONARY_NAME);
      await createDialog.getByRole("button", { name: "Create dictionary" }).click();
      await expect(page.getByRole("heading", { name: DICTIONARY_NAME })).toBeVisible({ timeout: LONG_WAIT });

      // Scope to the visible panel: inactive tab panels may stay mounted.
      await page.getByRole("tab", { name: /Code lists/ }).click();
      const codeListsPanel = page.getByRole("tabpanel", { name: /Code lists/ });
      await codeListsPanel.getByRole("button", { name: "New code list" }).click();
      await codeListsPanel.getByLabel("Name").fill("Sex (1/2/9)");
      await codeListsPanel.getByRole("button", { name: "Paste a list" }).click();
      const pasteDialog = page.getByRole("dialog", { name: "Paste a list" });
      await pasteDialog.getByLabel("Values to add").fill("1 = Male\n2 = Female\n9 = Unknown");
      await pasteDialog.getByRole("button", { name: "Add 3 values" }).click();
      await codeListsPanel.getByRole("listitem", { name: "Unknown" }).getByLabel("Missing").check();

      await page.getByRole("tab", { name: /Entries/ }).click();
      const entriesPanel = page.getByRole("tabpanel", { name: /Entries/ });
      await entriesPanel.getByRole("button", { name: "Add entry" }).click();
      const pane = entriesPanel.getByRole("complementary", { name: /Edit/ });
      await pane.getByLabel("Name").fill("sex");
      await pane.getByLabel("Also matches columns named").fill("GENDER");
      await pane.getByLabel("Also matches columns named").press("Enter");
      await pane.getByLabel("Kind").click();
      await page.getByRole("option", { name: /^Categorical/ }).click();
      await pane.getByLabel("Code list").click();
      await page.getByRole("option", { name: "Sex (1/2/9)" }).click();

      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("Dictionary saved")).toBeVisible({ timeout: MEDIUM_WAIT });
      await expect(page.getByText("Version 2")).toBeVisible();

      await page.reload();
      await expect(page.getByRole("button", { name: "sex" })).toBeVisible({ timeout: LONG_WAIT });
      await expect(page.getByRole("navigation", { name: /data/i }).getByText(DICTIONARY_NAME)).toBeVisible();
    } finally {
      await admin.from("data_dictionaries").delete().eq("workspace_id", workspaceId).eq("name", DICTIONARY_NAME);
    }
  });
});
```

Check the `getWorkspaceIdBySlug` signature in `tests/e2e/helpers/supabaseAdminClient.ts` before running, and the list pane's accessible name in `AppListPane` for the last assertion (use whatever landmark or heading `AppListPane` renders around "All data").

- [ ] **Step 2:** `pnpm test:e2e data-dictionary-edit.spec.ts`. Expected: PASS within 45 s. Fix the UI or the locators, not the timeout.
- [ ] **Step 3:** Commit: `test(data-dictionaries): cover creating and editing a dictionary`.

---

### Task 15: Final verification

- [ ] `pnpm lint && pnpm type-check && pnpm test:frontend`
- [ ] `ava supabase status && pnpm test:db`
- [ ] `pnpm test:desktop`
- [ ] `pnpm i18n:check`
- [ ] `pnpm test:e2e data-dictionary-edit.spec.ts`, then one existing spec that clicks the Data Sources toolbar to confirm the new button did not move it: `pnpm test:e2e csv-import.spec.ts`
- [ ] Leave the `ava supabase switch` in place (it changes no tracked file).

---

## Refinements made while planning

- **Children are written only through the save RPC.** The spec's section 11 gave entries, code lists, and codings editor INSERT and UPDATE policies. Here signed-in users get SELECT only on those three tables, and `rpc_data_dictionaries__save` (SECURITY DEFINER, checks Data Sources editor itself) is the one write path. That keeps every save atomic and makes the version honest.
- **The version is bumped by the save RPC, not by a trigger.** Spec 5.1 said a trigger bumps it on any child change. With a whole-set save, a per-row trigger would bump it many times per save. A guard trigger, `data_dictionaries__guard_managed_columns`, refuses direct changes to `version`, the owner columns, and `created_from_dataset_ids` from signed-in users.
- **Code pairs are a plain JSON array validated by Zod,** not a versioned config schema. A flat list of four-field objects is unlikely to change shape, and a data migration can rewrite it if it does.
- **Codings have their own `id` primary key** plus `unique (entry_id, code_list_id)`, because the CRUD client expects a single-column key. Composite foreign keys keep an entry and its code lists in the same dictionary.
- **File numbers are 10, 20, 20, 21, and 50.** Codings depend on both 20-level tables, so they are 21 under the numbering rule in `docs/rules/sql.md`.
- **The desktop syncs all four tables.** Its CRUD reads go through the local SQLite mirror, so a table left out of `ACTIVE_TABLES` could not be shown on the desktop at all.
- **The toolbar gets a "New dictionary" button beside "Add new dataset"** instead of an Add menu. Five e2e helpers click "Add new dataset" by name. The menu can come with crosswalks (slice 5), when it would hold three items, along with an update to those helpers.
- **The rail shows on the Used by tab only.** The Entries and Code lists tabs use the full width for their own side panes, as in the approved prototype.
- **No Share button and no Owner fact in slice 1.** Sharing is not per dictionary in v1, so a disabled Share button would be a control that does nothing; the rail shows Created and Version instead of an owner name, which would need a profile lookup this slice has no other use for.
- **"Add from datasets" and "Apply to a dataset" are left out** until slices 2 and 3 build what they open.
