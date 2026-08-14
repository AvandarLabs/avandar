# Private dashboards P1.5: the "Only me" control - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a resource owner a one-action, atomic "Only me" control in the share modal that clears every non-owner share and restricts the resource, producing the private-to-owner state that P1 already enforces.

**Architecture:** One new `SECURITY INVOKER` Postgres function, `rpc_resources__make_private`, does both writes in a single transaction with an owner check in front and a post-condition assert behind. One new client mutation on `ResourceShareClient` calls it. In the UI, `ShareResourceModal` derives a three-way general-access value from the sharing state, holds a local "I want to add people" intent flag, and opens a stacked confirm modal before invoking the mutation. `ShareGeneralAccess` stays presentational, and its option list is built by a pure exported function so it can be tested without a browser.

**Tech Stack:** Postgres + Supabase declarative schemas, pgTAP, TypeScript, React, Mantine, Lingui, TanStack Query (via `@avandar/query-hooks`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-13-private-dashboards-only-me-control-design.md`

---

## Background the engineer needs

Read this before starting. It is short, and the plan assumes all of it.

- **The predicate.** `util__has_non_owner_share(resource_type, resource_id, workspace_id, owner_id)` in `supabase/schemas/16.utils.resource-permissions.sql` returns true when any share exists whose principal is not the owner. A `workspace`-principal share has `principal_id = null`, which is why the SQL reads `principal_type <> 'user' or principal_id is distinct from p_owner_id`.
- **"Private to owner"** means `is_restricted = true` **and** no non-owner share. P1 made Settings Admins and workspace owners unable to read such resources.
- **Declarative schemas.** Never hand-write a file in `supabase/migrations/`. Edit `supabase/schemas/*.sql`, then run `pnpm db:new-migration <name>`, which diffs and generates the migration.
- **Query hooks.** `withQueryHooks(client, { queryFns, mutationFns })` turns `foo` into `useFoo`. A mutation hook returns a tuple `[mutate, isPending, ...]` and accepts `{ queriesToInvalidate, onError, onSuccess }`.
- **Lingui.** User-facing strings use the `t` macro: `useLingui()` in components, `@lingui/core/macro` in pure modules. After adding strings, run `pnpm i18n:extract`. Do **not** reach for the `plural` function macro; this repo has no precedent for it (only the `<Plural>` component, once), and mixing it with `useLingui()`'s runtime `t` binds against two different i18n instances. Write both branches with `t` explicitly.
- **The type-check script is `type-check`, not `typecheck`.**

### A verified constraint that shapes every UI test

**A Mantine `Select` dropdown cannot be opened in jsdom.** This was measured, not assumed: `fireEvent.click`, `fireEvent.mouseDown`, `fireEvent.focus` + `keyDown ArrowDown`, and a full pointerDown/mouseDown/pointerUp/mouseUp/click sequence all leave `screen.queryAllByRole("option")` empty. `@testing-library/user-event` is not a dependency of this repo, and adding one is out of scope for this phase.

Consequences, which the tasks below already respect:

- Vitest may assert the **selected value** (`toHaveValue("Only me")`), whether a control is **disabled**, and whether the role picker is **rendered**. All of that is observable without opening anything.
- Vitest may **not** assert which options exist, that an option is disabled, or what happens when one is clicked.
- Anything requiring an actual click on an option belongs in the pure option-builder unit test (Task 4) or in Playwright (Task 10).

### File structure

| File | Responsibility |
| --- | --- |
| `supabase/schemas/70.rpc_resources__make_private.sql` | **Create.** The RPC. |
| `supabase/schemas/16.utils.resource-permissions.sql` | **Modify.** Grant `execute` on `util__has_non_owner_share` to `authenticated`. |
| `supabase/tests/database/permissions/rpc_resources__make_private.test.sql` | **Create.** pgTAP truth table. |
| `supabase/tests/database/permissions/rpc_resources__make_private_rollback.test.sql` | **Create.** Post-condition rollback proof. |
| `src/clients/permissions/ResourceShareClient.ts` | **Modify.** Add `makeResourcePrivate`. |
| `src/clients/permissions/ResourceShareClient.test.ts` | **Create.** Unit test for the new member. |
| `.../ShareResourceModal/deriveGeneralAccess/deriveGeneralAccess.ts` | **Create.** Pure predicate, three-way value, option builder. |
| `.../ShareResourceModal/deriveGeneralAccess/deriveGeneralAccess.test.ts` | **Create.** Truth table mirroring pgTAP, plus option-builder cases. |
| `.../ShareResourceModal/shareCopy.ts` | **Modify.** New strings; drop the dead `emptyState.noShares`. |
| `.../ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.tsx` | **Modify.** Consume the built options; new props. |
| `.../ShareResourceModal/openMakePrivateConfirmModal.tsx` | **Create.** Stacked confirm. |
| `.../ShareResourceModal/ShareResourceModal.tsx` | **Modify.** Derivation, intent state, wiring. |
| `.../ShareResourceModal/ShareAddPrincipalRow/ShareAddPrincipalRow.tsx` | **Modify.** Accept `isDisabled`. |
| `.../ShareResourceModal/buildShareSummary/buildShareSummary.ts` | **Modify.** Reword the private branch. |
| `tests/e2e/helpers/shareModalFlow.ts` | **Modify.** Two new helpers. |
| `tests/e2e/share-modal.spec.ts` | **Modify.** One new case. |
| `docs/permissions-architecture.md` | **Modify.** Document the RPC. |

Paths beginning `.../ShareResourceModal/` are under `src/components/permissions/`.

---

## Task 1: The `rpc_resources__make_private` function

**Files:**
- Create: `supabase/schemas/70.rpc_resources__make_private.sql`
- Modify: `supabase/schemas/16.utils.resource-permissions.sql`
- Test: `supabase/tests/database/permissions/rpc_resources__make_private.test.sql`

TDD note: pgTAP aborts the whole file when a function is missing, so Step 1 writes the test, Step 2 confirms it fails on "function does not exist", and Steps 3-4 implement. Same red/green loop, coarser failure message.

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/permissions/rpc_resources__make_private.test.sql`. The `b1` prefix keeps these fixture uuids distinct from every other file (P1 used `a1` through `a8`).

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Fixtures. Prefix b1 keeps these distinct within this file.
insert into auth.users (id, email, aud, role)
values
  ('b1000001-0000-4000-8000-000000000001'::uuid, 'b1_owner@test.dev', 'authenticated', 'authenticated'),
  ('b1000002-0000-4000-8000-000000000002'::uuid, 'b1_admin@test.dev', 'authenticated', 'authenticated'),
  ('b1000003-0000-4000-8000-000000000003'::uuid, 'b1_member@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b1001001-0000-4000-8000-000000000001'::uuid,
  'b1000002-0000-4000-8000-000000000002'::uuid,
  'b1 workspace',
  'b1-make-private-ws'
);

-- b1000002 is a Settings Admin. This is the J1 case most likely to regress,
-- because the resource_shares DELETE policy would otherwise admit them.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('b100cf01-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('b100cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('b1002001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, null),
  ('b1002002-0000-4000-8000-000000000002'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000002-0000-4000-8000-000000000002'::uuid, 'b100cf01-0000-4000-8000-000000000001'::uuid),
  ('b1002003-0000-4000-8000-000000000003'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('b1003001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1002001-0000-4000-8000-000000000001'::uuid, 'B1 Owner', 'B1 Owner'),
  ('b1003002-0000-4000-8000-000000000002'::uuid, 'b1000002-0000-4000-8000-000000000002'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1002002-0000-4000-8000-000000000002'::uuid, 'B1 Admin', 'B1 Admin'),
  ('b1003003-0000-4000-8000-000000000003'::uuid, 'b1000003-0000-4000-8000-000000000003'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1002003-0000-4000-8000-000000000003'::uuid, 'B1 Member', 'B1 Member');

insert into public.user_groups (id, workspace_id, name, color)
values ('b1004001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1 group', '#000000');

-- d1: unrestricted, carrying every share shape at once.
-- d2: already private. Doubles as the "caller cannot see the row" fixture,
--     because a plain member cannot select a private dashboard at all.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted)
values
  ('b1005001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, 'b1003001-0000-4000-8000-000000000001'::uuid, 'b1 shared dashboard', '{}'::jsonb, false),
  ('b1005002-0000-4000-8000-000000000002'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, 'b1003001-0000-4000-8000-000000000001'::uuid, 'b1 already private', '{}'::jsonb, true);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values (
  'b1007001-0000-4000-8000-000000000001'::uuid,
  'b1001001-0000-4000-8000-000000000001'::uuid,
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'b1003001-0000-4000-8000-000000000001'::uuid,
  'b1 shared dataset',
  'virtual'::public.datasets__source_type,
  false
);

-- Every share shape on d1: a user share to someone else, a group share, a
-- workspace share, and the owner's own user share, which must survive.
insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values
  ('b1006001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid, 'user', 'b1000003-0000-4000-8000-000000000003'::uuid, 'viewer'),
  ('b1006002-0000-4000-8000-000000000002'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid, 'user_group', 'b1004001-0000-4000-8000-000000000001'::uuid, 'viewer'),
  ('b1006003-0000-4000-8000-000000000003'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid, 'workspace', null, 'viewer'),
  ('b1006004-0000-4000-8000-000000000004'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid, 'user', 'b1000001-0000-4000-8000-000000000001'::uuid, 'admin'),
  ('b1006005-0000-4000-8000-000000000005'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dataset', 'b1007001-0000-4000-8000-000000000001'::uuid, 'user', 'b1000003-0000-4000-8000-000000000003'::uuid, 'viewer');

select plan(13);

-- === A Settings Admin who is not the owner must be refused. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000002-0000-4000-8000-000000000002"}', true);

select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a settings admin who is not the owner is refused'
);

set local role postgres;

select is(
  (select count(*)::int from public.resource_shares
    where resource_id = 'b1005001-0000-4000-8000-000000000001'::uuid),
  4,
  'the refused settings-admin call deleted nothing'
);

-- === A plain member must be refused. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000003-0000-4000-8000-000000000003"}', true);

select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a non-owner member is refused'
);

-- === Three indistinguishable failures, proving there is no existence oracle:
-- a row that exists but is hidden from this caller, and a row that does not
-- exist at all, must raise exactly the same error. ===
select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005002-0000-4000-8000-000000000002'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a row the caller cannot see raises insufficient_privilege'
);

select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005099-0000-4000-8000-000000000099'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a nonexistent id raises the identical error'
);

-- === The owner succeeds. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000001-0000-4000-8000-000000000001"}', true);

select lives_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid
    )$$,
  'the owner can make their dashboard private'
);

set local role postgres;

select is(
  (select is_restricted from public.dashboards
    where id = 'b1005001-0000-4000-8000-000000000001'::uuid),
  true,
  'is_restricted is set'
);

select is(
  (select count(*)::int from public.resource_shares
    where resource_id = 'b1005001-0000-4000-8000-000000000001'::uuid),
  1,
  'user, group, and workspace shares are gone'
);

select is(
  (select principal_id from public.resource_shares
    where resource_id = 'b1005001-0000-4000-8000-000000000001'::uuid),
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'the surviving share is the owner''s own, which does not defeat privacy'
);

select is(
  public.util__is_resource_private_to_owner (
    'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'the dashboard is now private to its owner'
);

-- === Datasets work the same way. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000001-0000-4000-8000-000000000001"}', true);

select lives_ok(
  $$select public.rpc_resources__make_private (
      'dataset', 'b1007001-0000-4000-8000-000000000001'::uuid
    )$$,
  'datasets go private too'
);

set local role postgres;

select is(
  public.util__is_resource_private_to_owner (
    'dataset', 'b1007001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'the dataset is now private to its owner'
);

-- === Idempotent on an already-private resource. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000001-0000-4000-8000-000000000001"}', true);

select lives_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005002-0000-4000-8000-000000000002'::uuid
    )$$,
  'calling it on an already-private resource succeeds'
);

select finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL with `function public.rpc_resources__make_private(unknown, uuid) does not exist`.

- [ ] **Step 3: Grant execute on the predicate helper**

The RPC's post-condition calls `util__has_non_owner_share`, which P1 revoked from `authenticated`. In `supabase/schemas/16.utils.resource-permissions.sql`, directly after the existing `revoke` block for that function, add:

```sql
-- rpc_resources__make_private is SECURITY INVOKER, so its post-condition runs
-- as the caller and needs execute here. Safe to grant: the function is
-- security definer stable and returns one boolean about a resource the caller
-- has already been proven to own.
grant
execute on function public.util__has_non_owner_share (
  public.resource_type,
  uuid,
  uuid,
  uuid
) to authenticated;
```

- [ ] **Step 4: Write the function**

Create `supabase/schemas/70.rpc_resources__make_private.sql`:

```sql
/**
 * Makes a resource private to its owner in one transaction: deletes every
 * non-owner share and sets `is_restricted`.
 *
 * SECURITY INVOKER, deliberately, unlike every other rpc_ function in this
 * schema. It never needs to touch a row the caller cannot already see: the
 * owner short-circuits to `admin` in util__resource_effective_role, which
 * satisfies both the resource_shares DELETE policy and the resource UPDATE
 * policy. Running as the caller keeps existing RLS as the backstop and adds no
 * new privilege surface. It also closes the existence oracle that
 * rpc_resources__transfer_ownership has to handle by hand: the lookup below is
 * subject to the resource SELECT policy, so a row the caller cannot see and a
 * row that does not exist both leave v_owner_id null and raise the same error.
 *
 * Owner-only. A non-owner resource admin who ran this would delete their own
 * share and lock themselves out on the spot, so they are refused, not warned.
 *
 * @returns void. Nothing about a newly private resource is worth returning.
 */
create or replace function public.rpc_resources__make_private (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns void language plpgsql
set
  search_path = public as $$
declare
  v_owner_id uuid;
  v_workspace_id uuid;
begin
  -- `for update` on an RLS table also applies the UPDATE policy's USING
  -- clause, not just the SELECT policy. The owner satisfies both.
  if p_resource_type = 'dashboard' then
    select d.owner_id, d.workspace_id
    into v_owner_id, v_workspace_id
    from public.dashboards d
    where d.id = p_resource_id
    for update;
  elsif p_resource_type = 'dataset' then
    select ds.owner_id, ds.workspace_id
    into v_owner_id, v_workspace_id
    from public.datasets ds
    where ds.id = p_resource_id
    for update;
  else
    raise exception 'unsupported resource type: %', p_resource_type;
  end if;

  if v_owner_id is null or v_owner_id <> auth.uid () then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  -- Shares first, restriction second. Not load-bearing while this is
  -- owner-only, because the owner short-circuit does not read is_restricted.
  -- Written this way so that if the gate is ever widened past the owner,
  -- restricting first cannot revoke the caller's own DELETE rights midway.
  delete from public.resource_shares rs
  where
    rs.resource_type = p_resource_type and
    rs.resource_id = p_resource_id and
    rs.workspace_id = v_workspace_id and
    (
      rs.principal_type <> 'user'::public.share_principal_type or
      rs.principal_id is distinct from v_owner_id
    );

  if p_resource_type = 'dashboard' then
    update public.dashboards
       set is_restricted = true
     where id = p_resource_id;
  else
    update public.datasets
       set is_restricted = true
     where id = p_resource_id;
  end if;

  -- The DELETE above is RLS-filtered. If a policy silently skipped a row, this
  -- would return success on a still-shared resource, which is the exact
  -- failure mode the function exists to remove. Raise so the whole transaction
  -- rolls back rather than half-landing. Not expected to fire in any known
  -- configuration; it is a tripwire, and the pgTAP suite proves it rolls back
  -- rather than proving it never triggers.
  if public.util__has_non_owner_share (
    p_resource_type,
    p_resource_id,
    v_workspace_id,
    v_owner_id
  ) then
    raise exception 'make_private_incomplete';
  end if;
end;
$$;
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS, 13/13 in `rpc_resources__make_private.test.sql`, and no regressions elsewhere.

- [ ] **Step 6: Generate the migration and regenerate types**

```bash
pnpm db:new-migration make_private_rpc
pnpm db:gen-types
```

Expected: a new file in `supabase/migrations/` containing the `create or replace function` and the `grant`, and nothing else. Read it. If it carries unrelated schema drift, stop and investigate rather than committing it. `shared/types/database.types.ts` gains `rpc_resources__make_private` under `Functions`.

- [ ] **Step 7: Commit**

```bash
git add supabase/schemas supabase/migrations supabase/tests shared/types/database.types.ts
git commit -m "feat(db): add owner-only atomic make-private RPC"
```

---

## Task 2: Prove the post-condition rolls back

Spec §9 requires the partial-failure case be asserted as a **real rollback**, not just an error message. The post-condition cannot fire naturally, so the test forces it by temporarily replacing the predicate it calls. Separate file because it is a separate idea, and because the stub would otherwise contaminate Task 1's assertions.

**Files:**
- Test: `supabase/tests/database/permissions/rpc_resources__make_private_rollback.test.sql`

- [ ] **Step 1: Write the test**

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Prefix b2. Minimal fixtures: one owner, one member, one shared dashboard.
insert into auth.users (id, email, aud, role)
values
  ('b2000001-0000-4000-8000-000000000001'::uuid, 'b2_owner@test.dev', 'authenticated', 'authenticated'),
  ('b2000002-0000-4000-8000-000000000002'::uuid, 'b2_member@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'b2 workspace',
  'b2-rollback-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('b2002001-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid),
  ('b2002002-0000-4000-8000-000000000002'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2000002-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('b2003001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2002001-0000-4000-8000-000000000001'::uuid, 'B2 Owner', 'B2 Owner'),
  ('b2003002-0000-4000-8000-000000000002'::uuid, 'b2000002-0000-4000-8000-000000000002'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2002002-0000-4000-8000-000000000002'::uuid, 'B2 Member', 'B2 Member');

insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted)
values (
  'b2005001-0000-4000-8000-000000000001'::uuid,
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'b2003001-0000-4000-8000-000000000001'::uuid,
  'b2 shared dashboard',
  '{}'::jsonb,
  false
);

insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values (
  'b2006001-0000-4000-8000-000000000001'::uuid,
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'dashboard',
  'b2005001-0000-4000-8000-000000000001'::uuid,
  'user',
  'b2000002-0000-4000-8000-000000000002'::uuid,
  'viewer'
);

select plan(3);

-- Force the post-condition to fire by stubbing the predicate it calls. The
-- whole file runs inside a transaction that rolls back, so this replacement
-- never escapes the test.
create or replace function public.util__has_non_owner_share (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_workspace_id uuid,
  p_owner_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select true;
$$;

grant
execute on function public.util__has_non_owner_share (
  public.resource_type,
  uuid,
  uuid,
  uuid
) to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2000001-0000-4000-8000-000000000001"}', true);

select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b2005001-0000-4000-8000-000000000001'::uuid
    )$$,
  'make_private_incomplete',
  'the post-condition raises when a share survives the delete'
);

set local role postgres;

select is(
  (select count(*)::int from public.resource_shares
    where resource_id = 'b2005001-0000-4000-8000-000000000001'::uuid),
  1,
  'the share is still there: the delete rolled back'
);

select is(
  (select is_restricted from public.dashboards
    where id = 'b2005001-0000-4000-8000-000000000001'::uuid),
  false,
  'is_restricted is unchanged: the update rolled back'
);

select finish();

rollback;
```

- [ ] **Step 2: Run it**

```bash
pnpm test:db
```

Expected: PASS, 3/3. If the two rollback assertions fail (share gone, `is_restricted` true), Task 1's function is swallowing the exception and its implementation is wrong.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/database/permissions/rpc_resources__make_private_rollback.test.sql
git commit -m "test(db): prove make_private rolls back on a surviving share"
```

---

## Task 3: `ResourceShareClient.makeResourcePrivate`

**Files:**
- Modify: `src/clients/permissions/ResourceShareClient.ts`
- Test: `src/clients/permissions/ResourceShareClient.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/clients/permissions/ResourceShareClient.test.ts`. It mocks the Supabase client the way `PrivateResourceAdminClient.test.ts` does, so the import must come after the mock.

```ts
import { describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { rpc: rpcMock };
      },
    },
  };
});

const { ResourceShareClient } = await import("./ResourceShareClient");

describe("ResourceShareClient.makeResourcePrivate", () => {
  it("passes arguments through with p_ prefixes", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });

    await ResourceShareClient.makeResourcePrivate({
      resourceType: "dashboard",
      resourceId: "dash-1",
    });

    expect(rpcMock).toHaveBeenCalledWith("rpc_resources__make_private", {
      p_resource_type: "dashboard",
      p_resource_id: "dash-1",
    });
  });

  it("throws the supabase error message on failure", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "insufficient_privilege" },
    });

    await expect(
      ResourceShareClient.makeResourcePrivate({
        resourceType: "dataset",
        resourceId: "ds-1",
      }),
    ).rejects.toThrow("insufficient_privilege");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test:frontend src/clients/permissions/ResourceShareClient.test.ts
```

Expected: FAIL with `ResourceShareClient.makeResourcePrivate is not a function`.

- [ ] **Step 3: Add the client member**

In `src/clients/permissions/ResourceShareClient.ts`, inside the `withNewMembers({ ... })` object, immediately after `setResourceRestricted`:

```ts
        /**
         * Makes a resource private to its owner: clears every non-owner share
         * and sets `is_restricted`, atomically.
         *
         * Owner-only, enforced by the RPC. `workspaceId` is deliberately not a
         * parameter: the function derives it from the resource row, and a
         * second client-supplied copy could disagree with it.
         */
        makeResourcePrivate: async (options: {
          resourceType: ResourceType;
          resourceId: string;
        }): Promise<void> => {
          const logger = baseLogger.appendName("makeResourcePrivate");
          logger.log("make resource private", options);

          const { error } = await dbClient.rpc("rpc_resources__make_private", {
            p_resource_type: options.resourceType,
            p_resource_id: options.resourceId,
          });
          if (error) {
            throw new Error(error.message);
          }
        },
```

Then add `"makeResourcePrivate"` to `mutationFns`:

```ts
      mutationFns: [
        "upsertResourceShare",
        "deleteResourceShare",
        "setResourceRestricted",
        "makeResourcePrivate",
      ],
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test:frontend src/clients/permissions/ResourceShareClient.test.ts
```

Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/clients/permissions/ResourceShareClient.ts src/clients/permissions/ResourceShareClient.test.ts
git commit -m "feat(clients): add makeResourcePrivate to ResourceShareClient"
```

---

## Task 4: The `deriveGeneralAccess` module

Three pure functions: the client twin of `util__has_non_owner_share`, the three-way value, and the dropdown's option list. The option list lives here rather than inline in the component precisely because jsdom cannot open the dropdown, so a pure builder is the only way to unit-test which options exist and which are disabled.

**Files:**
- Create: `src/components/permissions/ShareResourceModal/deriveGeneralAccess/deriveGeneralAccess.ts`
- Test: `src/components/permissions/ShareResourceModal/deriveGeneralAccess/deriveGeneralAccess.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  buildGeneralAccessOptions,
  deriveGeneralAccessValue,
  hasNonOwnerShare,
} from "./deriveGeneralAccess";
import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const OWNER_ID = "owner-1";

const LABELS = {
  private: "Only me",
  restricted: "Restricted",
  workspace: "Anyone in Dashboards",
};

function share(
  overrides: Partial<ResourceShareRow> &
    Pick<ResourceShareRow, "principalType">,
): ResourceShareRow {
  return {
    id: "share-1",
    workspaceId: "ws-1" as WorkspaceId,
    resourceType: "dashboard",
    resourceId: "res-1",
    principalId: null,
    role: "viewer",
    requiresAppAccess: false,
    ...overrides,
  };
}

describe("hasNonOwnerShare", () => {
  it("is false with no shares", () => {
    expect(hasNonOwnerShare([], OWNER_ID)).toBe(false);
  });

  it("is false for the owner's own user share", () => {
    expect(
      hasNonOwnerShare(
        [share({ principalType: "user", principalId: OWNER_ID })],
        OWNER_ID,
      ),
    ).toBe(false);
  });

  it("is true for a user share to someone else", () => {
    expect(
      hasNonOwnerShare(
        [share({ principalType: "user", principalId: "other-1" })],
        OWNER_ID,
      ),
    ).toBe(true);
  });

  it("is true for a group share", () => {
    expect(
      hasNonOwnerShare(
        [share({ principalType: "user_group", principalId: "group-1" })],
        OWNER_ID,
      ),
    ).toBe(true);
  });

  // The workspace principal carries a null principalId by convention. This is
  // the row a `filter(principalType === "user")` implementation drops, which
  // would report a workspace-shared resource as private.
  it("is true for a workspace share with a null principalId", () => {
    expect(
      hasNonOwnerShare(
        [share({ principalType: "workspace", principalId: null })],
        OWNER_ID,
      ),
    ).toBe(true);
  });
});

describe("deriveGeneralAccessValue", () => {
  it("is workspace when not restricted", () => {
    expect(
      deriveGeneralAccessValue({
        isRestricted: false,
        shares: [],
        ownerId: OWNER_ID,
      }),
    ).toBe("workspace");
  });

  it("is private when restricted with only the owner's own share", () => {
    expect(
      deriveGeneralAccessValue({
        isRestricted: true,
        shares: [share({ principalType: "user", principalId: OWNER_ID })],
        ownerId: OWNER_ID,
      }),
    ).toBe("private");
  });

  it("is restricted when restricted with a non-owner share", () => {
    expect(
      deriveGeneralAccessValue({
        isRestricted: true,
        shares: [share({ principalType: "user", principalId: "other-1" })],
        ownerId: OWNER_ID,
      }),
    ).toBe("restricted");
  });
});

describe("buildGeneralAccessOptions", () => {
  it("lists Only me first, then Restricted, then the workspace option", () => {
    const options = buildGeneralAccessOptions({ isOwner: true, labels: LABELS });
    expect(
      options.map((option) => {
        return option.value;
      }),
    ).toEqual(["private", "restricted", "workspace"]);
  });

  it("enables Only me for the owner", () => {
    const options = buildGeneralAccessOptions({ isOwner: true, labels: LABELS });
    expect(options[0]?.disabled).toBe(false);
  });

  it("disables Only me for a non-owner", () => {
    const options = buildGeneralAccessOptions({
      isOwner: false,
      labels: LABELS,
    });
    expect(options[0]?.disabled).toBe(true);
  });

  it("never disables the other two options", () => {
    const options = buildGeneralAccessOptions({
      isOwner: false,
      labels: LABELS,
    });
    expect(options[1]?.disabled).toBe(false);
    expect(options[2]?.disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test:frontend src/components/permissions/ShareResourceModal/deriveGeneralAccess
```

Expected: FAIL, cannot resolve `./deriveGeneralAccess`.

- [ ] **Step 3: Write the module**

```ts
import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";

/**
 * The three states the General access dropdown can be in.
 *
 * `private` is not a stored column. It is derived: restricted, with no share
 * granting anyone but the owner. It is the same condition
 * `util__is_resource_private_to_owner` evaluates in Postgres.
 */
export type GeneralAccessValue = "private" | "restricted" | "workspace";

export type GeneralAccessOption = {
  value: GeneralAccessValue;
  label: string;
  disabled: boolean;
};

/**
 * Whether any share grants access to a principal other than the owner.
 *
 * Mirrors `util__has_non_owner_share` exactly, including the workspace
 * principal, whose `principalId` is null by convention. Do not reimplement this
 * by filtering to `principalType === "user"` first: that drops the workspace
 * and group rows and reports a shared resource as private.
 */
export function hasNonOwnerShare(
  shares: readonly ResourceShareRow[],
  ownerId: string,
): boolean {
  return shares.some((share) => {
    return share.principalType !== "user" || share.principalId !== ownerId;
  });
}

/**
 * Maps the stored sharing state onto the dropdown's three-way value.
 */
export function deriveGeneralAccessValue(
  options: Readonly<{
    isRestricted: boolean;
    shares: readonly ResourceShareRow[];
    ownerId: string;
  }>,
): GeneralAccessValue {
  if (!options.isRestricted) {
    return "workspace";
  }
  return hasNonOwnerShare(options.shares, options.ownerId) ?
      "restricted"
    : "private";
}

/**
 * Builds the dropdown's option list, with "Only me" first and owner-gated.
 *
 * Extracted from the component because a Mantine `Select` dropdown cannot be
 * opened in jsdom, so this is the only place the option list and its disabled
 * state can be asserted without a real browser. Takes resolved label strings
 * rather than calling Lingui itself, so it stays pure.
 */
export function buildGeneralAccessOptions(
  options: Readonly<{
    isOwner: boolean;
    labels: Record<GeneralAccessValue, string>;
  }>,
): GeneralAccessOption[] {
  return [
    {
      value: "private",
      label: options.labels.private,
      // Owner-only: this deletes every non-owner share, so a non-owner
      // selecting it would lock themselves out on the spot.
      disabled: !options.isOwner,
    },
    { value: "restricted", label: options.labels.restricted, disabled: false },
    { value: "workspace", label: options.labels.workspace, disabled: false },
  ];
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test:frontend src/components/permissions/ShareResourceModal/deriveGeneralAccess
```

Expected: PASS, 12/12.

- [ ] **Step 5: Commit**

```bash
git add src/components/permissions/ShareResourceModal/deriveGeneralAccess
git commit -m "feat(permissions): derive the three-way general-access value"
```

---

## Task 5: Share copy

Copy lands before its consumers so those tasks build and test in one pass.

**Files:**
- Modify: `src/components/permissions/ShareResourceModal/shareCopy.ts`

- [ ] **Step 1: Extend the `ShareCopy` type**

Add these members after `workspaceOptionTooltip`:

```ts
  cancelLabel: string;
  privateOptionLabel: string;
  privateOptionTooltip: (resource: string) => string;
  privateOptionDisabledTooltip: (resource: string) => string;
  makePrivateConfirm: (options: {
    resourceName: string;
    numUsers: number;
    numGroups: number;
    losesWorkspaceAccess: boolean;
    app: string;
  }) => { title: string; body: string; confirmLabel: string };
```

- [ ] **Step 2: Implement them**

Add to the object returned by `useShareCopy()`. Both count branches are written out with `t` rather than using the `plural` macro; see the Background section for why.

```ts
    cancelLabel: t`Cancel`,
    privateOptionLabel: t`Only me`,
    privateOptionTooltip: (resource: string): string => {
      return t`Only you can access this ${resource}. Everyone else loses access, including workspace admins.`;
    },
    privateOptionDisabledTooltip: (resource: string): string => {
      return t`Only the owner can make this ${resource} private.`;
    },
    makePrivateConfirm: ({
      resourceName,
      numUsers,
      numGroups,
      losesWorkspaceAccess,
      app,
    }): { title: string; body: string; confirmLabel: string } => {
      const peopleClause =
        numUsers === 0 ? ""
        : numUsers === 1 ? t`1 person`
        : t`${numUsers} people`;
      const groupClause =
        numGroups === 0 ? ""
        : numGroups === 1 ? t`1 group`
        : t`${numGroups} groups`;
      const shareClause =
        peopleClause && groupClause ? t`${peopleClause} and ${groupClause}`
        : peopleClause || groupClause;

      const sentences = [
        shareClause ? t`${shareClause} will lose access.` : "",
        losesWorkspaceAccess ? t`Everyone in ${app} will lose access.` : "",
        t`Only you will be able to open it. You can share it again at any time.`,
      ].filter(Boolean);

      return {
        title: t`Make "${resourceName}" private?`,
        body: sentences.join(" "),
        confirmLabel: t`Make private`,
      };
    },
```

- [ ] **Step 3: Delete the dead `emptyState.noShares`**

`emptyState.noShares` has no call site. Only `emptyState.noMembersOrTags` is used, in `ShareAddPrincipalRow.tsx`. Task 9 rewords the live copy of that sentence in `buildShareSummary`; leaving a stale second copy here invites a future edit to the wrong one.

Remove the `noShares` member from both the `ShareCopy` type and the returned object, leaving `emptyState` with just `noMembersOrTags`.

Confirm nothing referenced it:

```bash
grep -rn "noShares" src | grep -v node_modules
```

Expected: no output.

- [ ] **Step 4: Verify it compiles**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/permissions/ShareResourceModal/shareCopy.ts
git commit -m "feat(permissions): add Only me and make-private copy"
```

---

## Task 6: The third dropdown option in `ShareGeneralAccess`

The component's props change: it stops taking `isRestricted` and starts taking the derived `value`, because the orchestrator now owns the derivation (Task 4) and the intent state (Task 8).

**Files:**
- Modify: `src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.tsx`
- Test: `src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.test.tsx`

- [ ] **Step 1: Write the failing tests**

Replace the whole contents of `ShareGeneralAccess.test.tsx`. The three pre-existing cases are kept with updated props; the two new ones cover the private value. Nothing here opens the dropdown, because it cannot be opened in jsdom; the option list and its disabled state are covered by Task 4, and clicking an option is covered by Task 10.

```tsx
import { describe, expect, it, vi } from "vitest";
import { ShareGeneralAccess } from "@/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess";
import { render, screen } from "@/test-utils";

function findComboboxByAriaLabel(label: string): HTMLElement | undefined {
  return screen.getAllByRole("combobox").find((el) => {
    return el.getAttribute("aria-label") === label;
  });
}

describe("ShareGeneralAccess", () => {
  it("hides the workspace-role picker when restricted", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="restricted"
        isOwner
        isBusy={false}
        workspaceShareRole={null}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes).toHaveLength(1);
    expect(comboboxes[0]?.getAttribute("aria-label")).toBe("General access");
    expect(
      findComboboxByAriaLabel("Role for everyone in the workspace"),
    ).toBeUndefined();
  });

  it("shows the workspace-role picker when not restricted", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="workspace"
        isOwner
        isBusy={false}
        workspaceShareRole="viewer"
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(
      findComboboxByAriaLabel("Role for everyone in the workspace"),
    ).toBeDefined();
  });

  it("renders the {AppLabel}-aware option for datasets", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="workspace"
        isOwner
        isBusy={false}
        workspaceShareRole="viewer"
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    const generalCombobox = findComboboxByAriaLabel("General access");
    expect(generalCombobox).toBeDefined();
    expect(generalCombobox).toHaveValue("Anyone in Data Sources");
  });

  it("selects Only me when the value is private", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="private"
        isOwner
        isBusy={false}
        workspaceShareRole={null}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(findComboboxByAriaLabel("General access")).toHaveValue("Only me");
    // Private is a restricted state, so the workspace-role picker stays hidden.
    expect(
      findComboboxByAriaLabel("Role for everyone in the workspace"),
    ).toBeUndefined();
  });

  it("disables the dropdown while the mutation is in flight", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="restricted"
        isOwner
        isBusy
        workspaceShareRole={null}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(findComboboxByAriaLabel("General access")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test:frontend src/components/permissions/ShareResourceModal/ShareGeneralAccess
```

Expected: FAIL on the unknown `value`, `isOwner`, and `isBusy` props.

- [ ] **Step 3: Rewrite the component**

Replace the contents of `ShareGeneralAccess.tsx`:

```tsx
import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Group, Select, Stack, Text } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";
import { appLabel } from "$/copy/appLabel";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel";
import { buildGeneralAccessOptions } from "../deriveGeneralAccess/deriveGeneralAccess";
import { appForResource, useShareCopy } from "../shareCopy";
import type { GeneralAccessValue } from "../deriveGeneralAccess/deriveGeneralAccess";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

type Props = {
  resourceType: ResourceType;
  value: GeneralAccessValue;
  isOwner: boolean;
  isBusy: boolean;
  workspaceShareRole: RoleLevel | null;
  onChange: (next: GeneralAccessValue) => void;
  onWorkspaceRoleChange: (role: RoleLevel) => void;
};

/**
 * "General access" section: a single dropdown over the three access shapes.
 *
 * Presentational. The orchestrator derives `value` (see `deriveGeneralAccess`),
 * decides what a change means, and persists it. The option list comes from
 * `buildGeneralAccessOptions` rather than being built inline, so its contents
 * and its owner gate stay unit-testable: a Mantine dropdown cannot be opened
 * in jsdom.
 */
export function ShareGeneralAccess({
  resourceType,
  value,
  isOwner,
  isBusy,
  workspaceShareRole,
  onChange,
  onWorkspaceRoleChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const shareCopy = useShareCopy();
  const app = appLabel(appForResource(resourceType));
  const resource = resourceTypeLabel(resourceType);

  const generalOptions = buildGeneralAccessOptions({
    isOwner,
    labels: {
      private: shareCopy.privateOptionLabel,
      restricted: t`Restricted`,
      workspace: t`Anyone in ${app}`,
    },
  });

  const selectTooltip =
    value === "private" ?
      isOwner ? shareCopy.privateOptionTooltip(resource)
      : shareCopy.privateOptionDisabledTooltip(resource)
    : value === "restricted" ? shareCopy.restrictedOptionTooltip(resource)
    : shareCopy.workspaceOptionTooltip(resource, app);

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        {shareCopy.generalAccessHeading}
      </Text>
      <Group wrap="nowrap" align="flex-end" gap="sm">
        <Tooltip label={selectTooltip} multiline w={320}>
          <Select
            flex={1}
            disabled={isBusy}
            leftSection={<IconBuilding size={16} aria-hidden />}
            data={generalOptions}
            value={value}
            allowDeselect={false}
            onChange={(next) => {
              if (
                next === "private" ||
                next === "restricted" ||
                next === "workspace"
              ) {
                onChange(next);
              }
            }}
            aria-label={t`General access`}
          />
        </Tooltip>
        {value === "workspace" ?
          <Tooltip label={shareCopy.roleSelectTooltip}>
            <Select
              w={120}
              disabled={isBusy}
              data={[
                { value: "viewer", label: t`Viewer` },
                { value: "editor", label: t`Editor` },
                { value: "admin", label: t`Admin` },
              ]}
              value={workspaceShareRole ?? "viewer"}
              allowDeselect={false}
              onChange={(role) => {
                if (role) {
                  onWorkspaceRoleChange(role as RoleLevel);
                }
              }}
              aria-label={t`Role for everyone in the workspace`}
            />
          </Tooltip>
        : null}
      </Group>
      <Text size="xs" c="dimmed">
        {shareCopy.generalAccessHelper}
      </Text>
    </Stack>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test:frontend src/components/permissions/ShareResourceModal/ShareGeneralAccess
```

Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/components/permissions/ShareResourceModal/ShareGeneralAccess
git commit -m "feat(permissions): add the Only me option to general access"
```

---

## Task 7: The confirmation modal

**Files:**
- Create: `src/components/permissions/ShareResourceModal/openMakePrivateConfirmModal.tsx`

No test of its own: its only logic is the copy assembly already covered in Task 5, and Task 10 exercises it in a real browser.

- [ ] **Step 1: Write it**

```tsx
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { ShareCopy } from "./shareCopy";

type OpenMakePrivateConfirmModalOptions = {
  shareCopy: ShareCopy;
  resourceName: string;
  app: string;
  numUsers: number;
  numGroups: number;
  losesWorkspaceAccess: boolean;
  onConfirm: () => void;
};

/**
 * Confirms making a resource private, stacked over the share modal.
 *
 * Never dismiss this with `modals.closeAll()`: the share modal's own Done
 * button calls that, and it would tear down both dialogs. `openConfirmModal`
 * manages its own id and closes only itself.
 *
 * The caller is responsible for skipping this entirely when nothing would be
 * lost, which is the case when the resource is already private.
 */
export function openMakePrivateConfirmModal(
  options: Readonly<OpenMakePrivateConfirmModalOptions>,
): void {
  const { title, body, confirmLabel } = options.shareCopy.makePrivateConfirm({
    resourceName: options.resourceName,
    numUsers: options.numUsers,
    numGroups: options.numGroups,
    losesWorkspaceAccess: options.losesWorkspaceAccess,
    app: options.app,
  });

  modals.openConfirmModal({
    title,
    children: <Text size="sm">{body}</Text>,
    labels: { confirm: confirmLabel, cancel: options.shareCopy.cancelLabel },
    confirmProps: { color: "red" },
    onConfirm: options.onConfirm,
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/permissions/ShareResourceModal/openMakePrivateConfirmModal.tsx
git commit -m "feat(permissions): add the make-private confirmation modal"
```

---

## Task 8: Wire it up in `ShareResourceModal`

**Files:**
- Modify: `src/components/permissions/ShareResourceModal/ShareResourceModal.tsx`
- Modify: `src/components/permissions/ShareResourceModal/ShareAddPrincipalRow/ShareAddPrincipalRow.tsx`
- Test: `src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

The existing test file mocks `useGetResourceSharingState` with a fixed literal. Make it read from the hoisted `mocks` object so cases can vary it.

Extend the hoisted block:

```ts
const mocks = vi.hoisted(() => {
  return {
    membersResult: [undefined, true] as readonly [unknown, boolean],
    sharingState: {
      isRestricted: false,
      ownerId: "user-owner",
      shares: [] as unknown[],
    },
    makeResourcePrivate: vi.fn(),
  };
});
```

In the `ResourceShareClient` mock, replace `useGetResourceSharingState` and add the new hook:

```ts
      useGetResourceSharingState: () => {
        return [mocks.sharingState, false] as const;
      },
      useMakeResourcePrivate: () => {
        return [mocks.makeResourcePrivate, false] as const;
      },
```

Add a `useCurrentUser` mock beside the others:

```ts
vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-owner", email: "john@example.com" };
    },
  };
});
```

In the existing `beforeEach`, reset the new state so cases cannot leak:

```ts
    mocks.sharingState = {
      isRestricted: false,
      ownerId: "user-owner",
      shares: [],
    };
    mocks.makeResourcePrivate.mockClear();
```

Add these cases:

```tsx
  it("shows Only me when restricted with no non-owner share", async () => {
    mocks.sharingState = {
      isRestricted: true,
      ownerId: "user-owner",
      shares: [],
    };
    render(
      <ShareResourceModal
        resourceName="Q3 Revenue"
        resourceType="dashboard"
        resourceId="dash-1"
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(
        screen.getAllByRole("combobox").find((el) => {
          return el.getAttribute("aria-label") === "General access";
        }),
      ).toHaveValue("Only me");
    });
  });

  // The workspace principal is the row a naive derivation drops. If this case
  // reads "Only me", the modal is calling a resource private that the entire
  // workspace can open.
  it("shows Restricted when restricted with a workspace share", async () => {
    mocks.sharingState = {
      isRestricted: true,
      ownerId: "user-owner",
      shares: [
        {
          id: "s-1",
          workspaceId: "workspace-id-1",
          resourceType: "dashboard",
          resourceId: "dash-1",
          principalType: "workspace",
          principalId: null,
          role: "viewer",
          requiresAppAccess: false,
        },
      ],
    };
    render(
      <ShareResourceModal
        resourceName="Q3 Revenue"
        resourceType="dashboard"
        resourceId="dash-1"
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(
        screen.getAllByRole("combobox").find((el) => {
          return el.getAttribute("aria-label") === "General access";
        }),
      ).toHaveValue("Restricted");
    });
  });

  it("disables the add-principal row when the resource is private", async () => {
    mocks.sharingState = {
      isRestricted: true,
      ownerId: "user-owner",
      shares: [],
    };
    render(
      <ShareResourceModal
        resourceName="Q3 Revenue"
        resourceType="dashboard"
        resourceId="dash-1"
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(
        screen.getAllByRole("combobox").find((el) => {
          return el.getAttribute("aria-label") === "Add people or user groups";
        }),
      ).toBeDisabled();
    });
  });
```

`"Add people or user groups"` is the combobox's real `aria-label`, set in `ShareAddPrincipalRow.tsx` and already relied on by the e2e helpers.

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test:frontend src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx
```

Expected: FAIL. The first case reports `"Restricted"` where `"Only me"` is expected, because the component still derives a two-way value.

- [ ] **Step 3: Add `isDisabled` to `ShareAddPrincipalRow`**

In `ShareAddPrincipalRow.tsx`, add `isDisabled?: boolean` to `Props`, destructure it as `isDisabled = false`, and pass `disabled={isDisabled}` to the principal `Select`, the role `Select`, and the Share `Button`.

- [ ] **Step 4: Wire the orchestrator**

In `ShareResourceModal.tsx`:

Extend the existing React import and add the new ones:

```ts
import { useMemo, useState } from "react";
import { appLabel } from "$/copy/appLabel";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { deriveGeneralAccessValue } from "./deriveGeneralAccess/deriveGeneralAccess";
import { openMakePrivateConfirmModal } from "./openMakePrivateConfirmModal";
import { appForResource, useShareCopy } from "./shareCopy";
import type { GeneralAccessValue } from "./deriveGeneralAccess/deriveGeneralAccess";
```

Add this with the other hooks, **above** the early loading `return`, since hooks cannot run conditionally:

```ts
  const currentUser = useCurrentUser();
  const shareCopy = useShareCopy();

  // "I intend to add people", not a stored state. Selecting `Restricted` while
  // private writes nothing, so without this the dropdown would snap straight
  // back to "Only me". Lost on unmount, which is why reopening the modal on a
  // still-empty resource correctly shows "Only me" again.
  const [wantsRestricted, setWantsRestricted] = useState(false);

  const [makeResourcePrivate, isMakingPrivate] =
    ResourceShareClient.useMakeResourcePrivate({
      queriesToInvalidate: invalidateKeys,
      onError: (error: Error) => {
        notifyError({
          title: t`Could not make private`,
          message: error.message,
        });
      },
      onSuccess: () => {
        setWantsRestricted(false);
      },
    });
```

After `const workspaceShare = ...` and `const directShares = ...`, add:

```ts
  // Fails closed. useCurrentUser reads the _auth route context and this modal
  // only ever mounts inside it, so undefined is unreachable in practice;
  // treating it as "not the owner" is still the right default for a control
  // that deletes shares.
  const isOwner = sharingState.ownerId === currentUser?.id;

  const derivedGeneralAccess = deriveGeneralAccessValue({
    isRestricted: sharingState.isRestricted,
    shares: sharingState.shares,
    ownerId: sharingState.ownerId,
  });

  const displayedGeneralAccess: GeneralAccessValue =
    derivedGeneralAccess === "private" && wantsRestricted ?
      "restricted"
    : derivedGeneralAccess;
```

Replace the whole `onGeneralAccessChange` function with the two below. Place them after `userShares` and `groupShares` are defined, since the confirm counts read from them.

```ts
  const onGeneralAccessChange = (next: GeneralAccessValue): void => {
    if (next === displayedGeneralAccess) {
      return;
    }

    if (next === "private") {
      setWantsRestricted(false);
      const numUsers = userShares.length;
      const numGroups = groupShares.length;
      // Keyed off `isRestricted`, NOT off the presence of a workspace-principal
      // share row. An unrestricted resource with no such row still grants
      // access through workspace app roles, so keying off the row would drop
      // the warning in the case that matters most.
      const losesWorkspaceAccess = !sharingState.isRestricted;

      if (numUsers + numGroups === 0 && !losesWorkspaceAccess) {
        makeResourcePrivate({ resourceType, resourceId });
        return;
      }

      openMakePrivateConfirmModal({
        shareCopy,
        resourceName,
        app: appLabel(appForResource(resourceType)),
        numUsers,
        numGroups,
        losesWorkspaceAccess,
        onConfirm: () => {
          makeResourcePrivate({ resourceType, resourceId });
        },
      });
      return;
    }

    if (next === "restricted") {
      // From private this is a pure intent change: the resource is already
      // restricted with no shares, so there is nothing to write.
      setWantsRestricted(derivedGeneralAccess === "private");
      if (!sharingState.isRestricted) {
        setRestricted({
          workspaceId,
          resourceType,
          resourceId,
          isRestricted: true,
        });
        if (workspaceShare) {
          deleteShare({ shareId: workspaceShare.id });
        }
      }
      return;
    }

    // next === "workspace"
    setWantsRestricted(false);
    if (sharingState.isRestricted) {
      setRestricted({
        workspaceId,
        resourceType,
        resourceId,
        isRestricted: false,
      });
    }
    upsertShare({
      workspaceId,
      resourceType,
      resourceId,
      principalType: "workspace",
      principalId: null,
      role: workspaceShare?.role ?? "viewer",
    });
  };

  const onWorkspaceRoleChange = (role: RoleLevel): void => {
    if (role === (workspaceShare?.role ?? null)) {
      return;
    }
    upsertShare({
      workspaceId,
      resourceType,
      resourceId,
      principalType: "workspace",
      principalId: null,
      role,
    });
  };
```

Update the JSX. `ShareAddPrincipalRow` gains one prop:

```tsx
        isAdding={isUpserting}
        isDisabled={displayedGeneralAccess === "private"}
```

And `ShareGeneralAccess` takes the new shape:

```tsx
      <ShareGeneralAccess
        resourceType={resourceType}
        value={displayedGeneralAccess}
        isOwner={isOwner}
        isBusy={isMakingPrivate}
        workspaceShareRole={workspaceShare?.role ?? null}
        onChange={onGeneralAccessChange}
        onWorkspaceRoleChange={onWorkspaceRoleChange}
      />
```

- [ ] **Step 5: Run to verify it passes**

```bash
pnpm test:frontend src/components/permissions/ShareResourceModal
```

Expected: PASS across `ShareResourceModal.test.tsx`, `ShareGeneralAccess.test.tsx`, `deriveGeneralAccess.test.ts`, and the untouched sibling tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/permissions/ShareResourceModal
git commit -m "feat(permissions): wire the Only me control into the share modal"
```

---

## Task 9: Reword the private summary line

**Files:**
- Modify: `src/components/permissions/ShareResourceModal/buildShareSummary/buildShareSummary.ts`
- Test: `src/components/permissions/ShareResourceModal/buildShareSummary/buildShareSummary.test.ts`

- [ ] **Step 1: Update the two existing assertions**

No new test is needed. `buildShareSummary.test.ts` already covers this branch for both resource types, asserting the old third-person sentence through its `flat(spans)` helper. Change both expected strings:

At roughly line 78, in the dataset case:

```ts
    expect(flat(spans)).toBe("Only you have access to this dataset.");
```

At roughly line 186, in the dashboard case:

```ts
    expect(flat(spans)).toBe("Only you have access to this dashboard.");
```

Leave everything else in both cases alone, including their `baseLookups` spread and their `isRestricted: true, shares: []` setup. Those are already the private state.

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test:frontend src/components/permissions/ShareResourceModal/buildShareSummary
```

Expected: FAIL, receiving `"This dashboard is currently only accessible to its owner."`

- [ ] **Step 3: Reword it**

In `buildShareSummary.ts`, replace the no-shares restricted branch:

```ts
    // Second person is correct without an isOwner parameter, and that is an
    // invariant rather than an assumption. If this branch renders, the viewer
    // is necessarily the owner: the owner short-circuits to admin in
    // util__resource_effective_role; a Settings Admin resolves to null on a
    // private resource under P1's narrowing; an explicit admin share would
    // itself be a non-owner share, so the resource would not be private; and a
    // workspace share implies is_restricted = false. If that narrowing is ever
    // widened, this copy starts lying.
    return [
      {
        kind: "text",
        text: t`Only you have access to this ${resource}.`,
      },
    ];
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test:frontend src/components/permissions/ShareResourceModal/buildShareSummary
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/permissions/ShareResourceModal/buildShareSummary
git commit -m "feat(permissions): address the owner directly in the private summary"
```

---

## Task 10: End-to-end coverage

This is the only place the dropdown is actually clicked, so it carries the interaction coverage Vitest cannot.

**Files:**
- Modify: `tests/e2e/helpers/shareModalFlow.ts`
- Modify: `tests/e2e/share-modal.spec.ts`

- [ ] **Step 1: Add the helpers**

In `tests/e2e/helpers/shareModalFlow.ts`, add after `setGeneralAccess`:

```ts
/**
 * Selects "Only me" and confirms the stacked warning dialog. Waits for the
 * dropdown to settle on the new value so callers do not race the mutation.
 */
export async function setGeneralAccessToOnlyMe(page: Page): Promise<void> {
  const dialog = shareDialog(page);
  await dialog.getByRole("combobox", { name: "General access" }).click();
  await page.getByRole("option", { name: "Only me" }).click();

  const confirmDialog = page.getByRole("dialog", { name: /private\?$/ });
  await expect(confirmDialog).toBeVisible({ timeout: MEDIUM_WAIT });
  await confirmDialog.getByRole("button", { name: "Make private" }).click();
  await expect(confirmDialog).toBeHidden({ timeout: MEDIUM_WAIT });

  await expect(
    dialog.getByRole("combobox", { name: "General access" }),
  ).toHaveValue("Only me", { timeout: MEDIUM_WAIT });
}

/**
 * Selects "Restricted" from the private state and asserts the intent-only
 * behaviour: the dropdown moves, and the add-people row unlocks, with no
 * write behind it.
 */
export async function expectRestrictedIsIntentOnly(page: Page): Promise<void> {
  const dialog = shareDialog(page);
  await dialog.getByRole("combobox", { name: "General access" }).click();
  await page.getByRole("option", { name: "Restricted" }).click();

  await expect(
    dialog.getByRole("combobox", { name: "General access" }),
  ).toHaveValue("Restricted", { timeout: MEDIUM_WAIT });
  await expect(
    dialog.getByRole("combobox", { name: "Add people or user groups" }),
  ).toBeEnabled({ timeout: MEDIUM_WAIT });
}
```

- [ ] **Step 2: Add the test case**

In `tests/e2e/share-modal.spec.ts`, add `expectRestrictedIsIntentOnly` and `setGeneralAccessToOnlyMe` to the existing import from `./helpers/shareModalFlow`, then add this case inside `test.describe("Share modal", ...)`. Every other identifier it uses is already imported by that file.

```ts
  test("Only me revokes every share in one action", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin } = e2eViewerMembership;
    const datasetName = "E2E only me";

    let datasetId = "";
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      ({ datasetId } = await uploadCaliforniaCsvDataset({
        page,
        workspaceSlug,
        datasetName,
      }));

      await openShareModal(page);
      await setGeneralAccess(page, "Restricted");
      await addShare({
        page,
        principalLabel: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        role: "editor",
      });
      await closeShareModal(page);

      // Prove the share works before taking it away, so the assertion at the
      // end reflects a change rather than a permanent absence.
      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });
      await expectDatasetVisibleInDataManager(page, {
        workspaceSlug,
        datasetName,
      });

      await switchToWorkspaceUser(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/data-manager/dataset/${datasetId}`);
      await openShareModal(page);
      await setGeneralAccessToOnlyMe(page);
      await expectShareSummaryText(page, ["Only you have access"]);
      await expectRestrictedIsIntentOnly(page);
      await closeShareModal(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });
      await expectDatasetHiddenInDataManager(page, {
        workspaceSlug,
        datasetName,
      });
      await expectDatasetMetaPageDenied(page, { workspaceSlug, datasetId });
    } finally {
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
    }
  });
```

- [ ] **Step 3: Run the new case**

```bash
pnpm test:e2e --grep "Only me revokes every share"
```

Expected: PASS. If the confirm dialog is not found, check its accessible name: Mantine derives it from the modal title, which Task 5 renders as `Make "E2E only me" private?`, hence the `/private\?$/` pattern.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e
git commit -m "test(e2e): prove Only me revokes every share in one action"
```

---

## Task 11: Docs, i18n, and full verification

**Files:**
- Modify: `docs/permissions-architecture.md`

- [ ] **Step 1: Document the RPC**

Find the section listing the resource RPCs (P1 added `rpc_resources__transfer_ownership` and `rpc_workspaces__private_resource_counts` there) and add:

```markdown
### `rpc_resources__make_private`

Clears every non-owner share and sets `is_restricted`, atomically, producing
the `util__is_resource_private_to_owner` state.

Owner-only. A non-owner resource admin is refused rather than warned, because
the call would delete their own share and lock them out.

**The only `SECURITY INVOKER` function in `rpc_*`.** It needs no bypass: the
owner short-circuits to `admin`, which satisfies both the `resource_shares`
DELETE policy and the resource UPDATE policy. Running as the caller keeps RLS
as the backstop and makes a hidden row indistinguishable from a missing one
with no hand-written oracle handling. It ends with a post-condition check,
because an RLS-filtered `DELETE` would otherwise report success on a
still-shared resource.
```

- [ ] **Step 2: Extract translations**

```bash
pnpm i18n:extract
```

Expected: the locale files pick up `Only me`, `Make private`, `Cancel`, the two tooltips, and the confirm sentences.

- [ ] **Step 3: Run the full verification sweep**

```bash
pnpm lint
pnpm type-check
pnpm test:frontend
pnpm test:db
pnpm i18n:check
```

Expected: all pass. Do not proceed while any is red; a failure here is the plan's problem, not a flake to retry.

- [ ] **Step 4: Commit**

```bash
git add docs src/i18n
git commit -m "docs: record the make-private RPC and extract new strings"
```

---

## Verification checklist

- [ ] `pnpm test:db` passes, including 13 assertions in `rpc_resources__make_private.test.sql` and 3 in the rollback file.
- [ ] A Settings Admin calling the RPC on a resource they do not own is refused **and the shares survive**. This is the single most important assertion in the phase.
- [ ] A hidden row and a nonexistent row produce identical errors.
- [ ] `pnpm test:frontend` passes.
- [ ] `pnpm test:e2e --grep "Only me revokes every share"` passes.
- [ ] `pnpm lint`, `pnpm type-check`, and `pnpm i18n:check` pass.
- [ ] Manually: on a dataset you own that is shared with someone, pick "Only me", confirm, and verify the dropdown lands on "Only me" and the summary reads "Only you have access to this dataset."
- [ ] Manually: with that resource private, pick "Restricted". No request should fire (check the network tab), the add-people row should unlock, and closing and reopening the modal should show "Only me" again.
- [ ] The generated migration contains only the new function and the new grant.

---

## Notes for the implementer

**What this phase deliberately does not do**, so you do not add it:

- No warning that making a dataset private breaks dependent dashboards. Spec §7 records why: dataset references live in `dashboards.config jsonb` with no dependency model, so finding them means a JSONB scan across the workspace.
- No badges, filters, or card indicators. Umbrella §7.E assigns those to P3.
- No visibility enum, no publishing, no buckets. That is P2.
- No `@testing-library/user-event` dependency. Its absence is why the option-list assertions live in Task 4 and the click path lives in Task 10.
- No locking of the resource row from the share-write path. Spec §4.4 records a residual race (a concurrent share insert committing after the post-condition check) and accepts it deliberately: closing it would put a serialization point on every ordinary share edit to defend against a window only a resource admin could drive, in a single in-flight transaction, moments before losing the rights to do so.
- **No "disable the per-share role selects while Only me is selected"**, despite umbrella §7.J asking for it. It is unreachable: a private resource has no non-owner share, so the principal list renders only the read-only Owner row. Spec §6.6 explains this. Do not write the branch.
