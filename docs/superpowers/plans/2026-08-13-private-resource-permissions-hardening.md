# Private Resource Permissions Hardening (P1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a dashboard or dataset that is restricted with zero non-owner shares readable by its owner alone, closing the Settings-Admin bypass, and give workspace admins a counts-only view plus an ownership-transfer path so offboarding still works.

**Architecture:** Two new SQL predicates (`util__has_non_owner_share`, `util__is_resource_private_to_owner`) gate one short-circuit in `util__resource_effective_role` and two `resource_shares` policies. Two security-definer RPCs expose per-member private counts and ownership transfer without granting read. A third `PrivacyLogTab` sub-tab surfaces both.

**Tech Stack:** Postgres 15 + Supabase declarative schemas (`supabase/schemas/`), pgTAP (`supabase test db`), TypeScript, React 19, Mantine, TanStack Query via `@avandar/query-hooks`, Vitest, Lingui i18n.

**Spec:** `docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md`
**Parent spec:** `docs/superpowers/specs/2026-08-13-private-dashboards-design.md`

---

## Orientation for someone new to this codebase

Read this before Task 1. It will save you hours.

### The permission model in one paragraph

A workspace member gets a role (`viewer` < `editor` < `admin`) per _app_
(`dashboards`, `data_sources`, `data_explorer`, `settings`) through a **role
group**. On top of that, individual resources (a dashboard or a dataset) can
carry **shares** in `resource_shares`, granting a role to a _principal_: one
user, one user group, or the whole workspace. `util__resource_effective_role`
merges all applicable grants by `max(rank)`. A resource flagged
`is_restricted = true` turns **off** the workspace-wide app-role default, so
only explicit shares grant access. `docs/permissions-architecture.md` is the
canonical reference; it is also slightly wrong today, which Task 13 fixes.

### The bug we are fixing

`util__resource_effective_role` short-circuits to `'admin'` for anyone who is a
Settings Admin. So "restricted with no shares" is not actually private: every
Global Admin can read it. We want Google Drive's guarantee instead.

### Declarative schema workflow (do not skip)

**Never hand-edit `supabase/migrations/*.sql` for schema changes.** Edit the
declarative files in `supabase/schemas/`, then generate a migration:

```bash
supabase stop
supabase db diff -f <migration_name>
supabase start
supabase db reset   # replays all migrations onto a clean DB
```

`supabase db diff` **does not reliably capture policy changes**. Tasks 5 and 9
therefore hand-write their migrations. Everything else uses `db diff`.

### Running the database tests

```bash
pnpm test:db                                    # all pgTAP tests
supabase test db supabase/tests/database/permissions/<file>.test.sql   # one file
```

pgTAP files follow a fixed shape. Every file in
`supabase/tests/database/permissions/` looks like this, and yours must too:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- fixture inserts here, as the `postgres` superuser

select plan(<exact number of assertions>);

-- assertions here

select * from finish();

rollback;
```

`select plan(N)` must match the assertion count exactly or the file fails. Every
task below tells you the number. To act as a specific user:

```sql
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"<user uuid>"}',
  true
);

-- ... assertions as that user ...

set local role postgres;   -- back to superuser for more fixture setup
```

Fixture UUIDs use a stable prefix per file so they never collide within a file.
Each file runs in its own transaction and rolls back, so prefixes may repeat
across files.

### A trap that will cost you an hour

`util__resource_effective_role` is `security definer stable` and RLS calls it
**per row**. Do not add a row lookup to it. `v_owner_id` and `v_is_restricted`
are already in scope from its existing per-type `select`; compose with them
inline rather than calling `util__is_resource_private_to_owner`, which would
re-fetch the row. That is why there are two predicate functions and not one.

---

## File structure

**SQL, declarative (`supabase/schemas/`)**

| File                                                  | Change | Responsibility                                                                                                                            |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `16.utils.resource-permissions.sql`                   | Modify | Add both predicates; add `v_is_public` to `util__resource_effective_role`; narrow its Settings-Admin short-circuit                        |
| `17.rls.resource_shares.sql`                          | Modify | Narrow the admin disjunct on INSERT and UPDATE                                                                                            |
| `30.usage_analytics_events.sql`                       | Modify | Widen SELECT to Settings Admins                                                                                                           |
| `70.rpc_workspaces__private_resource_counts.sql`      | Create | Per-member private counts RPC                                                                                                             |
| `70.rpc_resources__transfer_ownership.sql`            | Create | Per-resource ownership transfer RPC (the primitive)                                                                                       |
| `71.rpc_workspaces__transfer_all_owned_resources.sql` | Create | Bulk-by-owner wrapper for offboarding. Numbered `71` because it calls the `70` RPC and `supabase/schemas/` applies in lexicographic order |

**pgTAP (`supabase/tests/database/permissions/`)**

| File                                                    | Change                           |
| ------------------------------------------------------- | -------------------------------- |
| `util_has_non_owner_share.test.sql`                     | Create                           |
| `util_is_resource_private_to_owner.test.sql`            | Create                           |
| `util_resource_effective_role.test.sql`                 | Modify (append cases)            |
| `may_select_private_resource.test.sql`                  | Create                           |
| `resource_shares_private_resource_guard.test.sql`       | Create                           |
| `rpc_workspaces__private_resource_counts.test.sql`      | Create                           |
| `rpc_resources__transfer_ownership.test.sql`            | Create                           |
| `rpc_workspaces__transfer_all_owned_resources.test.sql` | Create                           |
| `resource_rls_role_matrix.test.sql`                     | Modify (flip admin expectations) |
| `rls_datasets_dashboards_manager_writes.test.sql`       | Modify (flip admin expectations) |
| `rls_phase3_policies.test.sql`                          | Modify (flip admin expectations) |

**TypeScript**

| File                                                                                                 | Change | Responsibility                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/clients/permissions/PrivateResourceAdminClient.ts`                                              | Create | The two RPC calls plus query hooks. A dedicated client, matching `ResourceShareClient` / `SubscriptionPermissionsClient`, rather than growing `PermissionsClient` |
| `src/clients/permissions/PrivateResourceAdminClient.test.ts`                                         | Create | Client unit tests                                                                                                                                                 |
| `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivateResourcesPanel/PrivateResourcesPanel.tsx`      | Create | Counts table                                                                                                                                                      |
| `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivateResourcesPanel/PrivateResourcesPanel.test.tsx` | Create | Panel tests                                                                                                                                                       |
| `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivateResourcesPanel/ReassignOwnerModal.tsx`         | Create | Target-member picker                                                                                                                                              |
| `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.tsx`                                    | Modify | Third sub-tab                                                                                                                                                     |
| `src/views/WorkspaceSettingsPage/WorkspaceUsersTab/WorkspaceUsersTab.tsx`                            | Modify | Blocked-removal hint                                                                                                                                              |
| `tests/e2e/private-resource-admin-cannot-read.spec.ts`                                               | Create | End-to-end proof of the phase's guarantee                                                                                                                         |

**Docs**

| File                               | Change                       |
| ---------------------------------- | ---------------------------- |
| `docs/permissions-architecture.md` | Modify (§2, §3, §4, §9, §10) |

---

## Task 1: `util__has_non_owner_share` predicate

The share-existence half of the predicate. Takes `p_owner_id` from the caller so
hot RLS paths do not re-fetch a row they already hold.

**Files:**

- Modify: `supabase/schemas/16.utils.resource-permissions.sql` (append after `util__get_auth_user_user_group_ids`, before `util__resource_effective_role`)
- Test: `supabase/tests/database/permissions/util_has_non_owner_share.test.sql` (create)

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/permissions/util_has_non_owner_share.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Fixtures. Prefix a1 keeps these distinct within this file.
insert into auth.users (id, email, aud, role)
values
  ('a1000001-0000-4000-8000-000000000001'::uuid, 'a1_owner@test.dev', 'authenticated', 'authenticated'),
  ('a1000002-0000-4000-8000-000000000002'::uuid, 'a1_other@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a1001001-0000-4000-8000-000000000001'::uuid,
  'a1000001-0000-4000-8000-000000000001'::uuid,
  'a1 workspace',
  'a1-non-owner-share-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('a1002001-0000-4000-8000-000000000001'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid),
  ('a1002002-0000-4000-8000-000000000002'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000002-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a1003001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1002001-0000-4000-8000-000000000001'::uuid, 'A1 Owner', 'A1 Owner'),
  ('a1003002-0000-4000-8000-000000000002'::uuid, 'a1000002-0000-4000-8000-000000000002'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1002002-0000-4000-8000-000000000002'::uuid, 'A1 Other', 'A1 Other');

insert into public.user_groups (id, workspace_id, name)
values ('a1004001-0000-4000-8000-000000000001'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1 group');

-- Five dashboards, one per share shape under test.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted)
values
  ('a1005001-0000-4000-8000-000000000001'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'no shares', '{}'::jsonb, true),
  ('a1005002-0000-4000-8000-000000000002'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'user share to other', '{}'::jsonb, true),
  ('a1005003-0000-4000-8000-000000000003'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'user share to owner', '{}'::jsonb, true),
  ('a1005004-0000-4000-8000-000000000004'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'workspace share', '{}'::jsonb, true),
  ('a1005005-0000-4000-8000-000000000005'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'group share', '{}'::jsonb, true);

insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values
  ('a1006002-0000-4000-8000-000000000002'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'a1005002-0000-4000-8000-000000000002'::uuid, 'user', 'a1000002-0000-4000-8000-000000000002'::uuid, 'viewer'),
  ('a1006003-0000-4000-8000-000000000003'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'a1005003-0000-4000-8000-000000000003'::uuid, 'user', 'a1000001-0000-4000-8000-000000000001'::uuid, 'viewer'),
  ('a1006004-0000-4000-8000-000000000004'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'a1005004-0000-4000-8000-000000000004'::uuid, 'workspace', null, 'viewer'),
  ('a1006005-0000-4000-8000-000000000005'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'a1005005-0000-4000-8000-000000000005'::uuid, 'user_group', 'a1004001-0000-4000-8000-000000000001'::uuid, 'viewer');

select plan(5);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005001-0000-4000-8000-000000000001'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  false,
  'no shares at all: no non-owner share'
);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005002-0000-4000-8000-000000000002'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'user share to someone else counts'
);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005003-0000-4000-8000-000000000003'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  false,
  'user share whose principal IS the owner does not count'
);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005004-0000-4000-8000-000000000004'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'workspace share counts even though principal_id is null'
);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005005-0000-4000-8000-000000000005'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'user_group share counts'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
supabase start
supabase test db supabase/tests/database/permissions/util_has_non_owner_share.test.sql
```

Expected: FAIL with `function public.util__has_non_owner_share(...) does not exist`.

- [ ] **Step 3: Add the function to the declarative schema**

In `supabase/schemas/16.utils.resource-permissions.sql`, insert this **after**
the `util__get_auth_user_user_group_ids` function and **before** the
`util__resource_effective_role` doc comment:

```sql
/**
 * Whether any share on this resource grants a principal other than its owner.
 *
 * `principal_type <> 'user'` is what catches workspace and user_group
 * principals: workspace shares carry a NULL `principal_id` by convention, so
 * comparing `principal_id` alone would miss them. `is distinct from` keeps a
 * NULL `principal_id` on a user-type row from evaluating to NULL and silently
 * dropping that row.
 *
 * Deliberately ignores `requires_app_access`. A group share that currently
 * reaches nobody is still an expressed intent to share, so the resource is not
 * private.
 *
 * Takes the owner id from the caller rather than looking it up, because the
 * RLS-hot callers already hold it and this runs per row.
 *
 * @param p_owner_id The resource's owner, supplied by the caller.
 * @returns True when at least one non-owner share row exists.
 */
create or replace function public.util__has_non_owner_share (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_owner_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists (
    select 1
    from public.resource_shares rs
    where
      rs.resource_type = p_resource_type and
      rs.resource_id = p_resource_id and
      (
        rs.principal_type <> 'user'::public.share_principal_type or
        rs.principal_id is distinct from p_owner_id
      )
  );
$$;
```

- [ ] **Step 4: Generate the migration**

```bash
supabase stop
supabase db diff -f add_util_has_non_owner_share
```

Open the generated file under `supabase/migrations/` and confirm it contains
only the `create or replace function` for `util__has_non_owner_share`. If it
contains anything else, especially a `drop`, stop and investigate.

- [ ] **Step 5: Run the test to verify it passes**

```bash
supabase start
supabase db reset
supabase test db supabase/tests/database/permissions/util_has_non_owner_share.test.sql
```

Expected: `All 5 subtests passed`.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/16.utils.resource-permissions.sql \
        supabase/tests/database/permissions/util_has_non_owner_share.test.sql \
        supabase/migrations/
git commit -m "feat(db): add util__has_non_owner_share predicate"
```

---

## Task 2: `util__is_resource_private_to_owner` predicate

The id-only entry point, for callers that hold no row: the counts RPC, the
`resource_shares` policies, and (in phase 4) the entitlement trigger.

**Files:**

- Modify: `supabase/schemas/16.utils.resource-permissions.sql` (append directly after `util__has_non_owner_share`)
- Test: `supabase/tests/database/permissions/util_is_resource_private_to_owner.test.sql` (create)

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/permissions/util_is_resource_private_to_owner.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a2000001-0000-4000-8000-000000000001'::uuid, 'a2_owner@test.dev', 'authenticated', 'authenticated'),
  ('a2000002-0000-4000-8000-000000000002'::uuid, 'a2_other@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a2001001-0000-4000-8000-000000000001'::uuid,
  'a2000001-0000-4000-8000-000000000001'::uuid,
  'a2 workspace',
  'a2-private-to-owner-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('a2002001-0000-4000-8000-000000000001'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid),
  ('a2002002-0000-4000-8000-000000000002'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000002-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a2003001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2002001-0000-4000-8000-000000000001'::uuid, 'A2 Owner', 'A2 Owner'),
  ('a2003002-0000-4000-8000-000000000002'::uuid, 'a2000002-0000-4000-8000-000000000002'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2002002-0000-4000-8000-000000000002'::uuid, 'A2 Other', 'A2 Other');

-- d1 restricted no shares (private), d2 restricted + share (not private),
-- d3 unrestricted no shares (not private), d4 public + restricted no shares
-- (generic predicate still says private; callers add the visibility term).
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values
  ('a2005001-0000-4000-8000-000000000001'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'private', '{}'::jsonb, true, false),
  ('a2005002-0000-4000-8000-000000000002'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'shared', '{}'::jsonb, true, false),
  ('a2005003-0000-4000-8000-000000000003'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'unrestricted', '{}'::jsonb, false, false),
  ('a2005004-0000-4000-8000-000000000004'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'public restricted', '{}'::jsonb, true, true);

insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values (
  'a2006002-0000-4000-8000-000000000002'::uuid,
  'a2001001-0000-4000-8000-000000000001'::uuid,
  'dashboard',
  'a2005002-0000-4000-8000-000000000002'::uuid,
  'user',
  'a2000002-0000-4000-8000-000000000002'::uuid,
  'viewer'
);

-- Datasets: one private, one unrestricted. `datasets` has no is_public column.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, is_restricted)
values
  ('a2007001-0000-4000-8000-000000000001'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'private ds', true),
  ('a2007002-0000-4000-8000-000000000002'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'open ds', false);

select plan(7);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005001-0000-4000-8000-000000000001'::uuid),
  true,
  'dashboard restricted with no shares is private'
);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005002-0000-4000-8000-000000000002'::uuid),
  false,
  'dashboard with a non-owner share is not private'
);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005003-0000-4000-8000-000000000003'::uuid),
  false,
  'unrestricted dashboard is not private'
);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005004-0000-4000-8000-000000000004'::uuid),
  true,
  'generic predicate ignores is_public; callers add the visibility term (spec 4.2)'
);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005999-0000-4000-8000-000000000999'::uuid),
  false,
  'nonexistent resource is not private'
);

select is(
  public.util__is_resource_private_to_owner ('dataset', 'a2007001-0000-4000-8000-000000000001'::uuid),
  true,
  'dataset restricted with no shares is private'
);

select is(
  public.util__is_resource_private_to_owner ('dataset', 'a2007002-0000-4000-8000-000000000002'::uuid),
  false,
  'unrestricted dataset is not private'
);

select * from finish();

rollback;
```

> If the `datasets` insert fails on a missing `not null` column, run
> `\d public.datasets` in `supabase db shell` and add the required columns to
> the fixture. Do not weaken the schema to satisfy the test.

- [ ] **Step 2: Run the test to verify it fails**

```bash
supabase test db supabase/tests/database/permissions/util_is_resource_private_to_owner.test.sql
```

Expected: FAIL with `function public.util__is_resource_private_to_owner(...) does not exist`.

- [ ] **Step 3: Add the function to the declarative schema**

In `supabase/schemas/16.utils.resource-permissions.sql`, directly after
`util__has_non_owner_share`:

```sql
/**
 * Whether a resource is private to its owner: restricted, with no share
 * granting any principal other than the owner.
 *
 * Resource-type generic, so it knows nothing about publication. A dashboard can
 * be `is_public` while restricted with no shares, which is world-readable and
 * emphatically not private; callers that care must compose this with their own
 * visibility condition. See the P1 spec section 4.2.
 *
 * Prefer `util__has_non_owner_share` directly when you already hold the row's
 * `owner_id` and `is_restricted`, to avoid this function's extra lookup.
 *
 * @returns True when only the owner has been granted access. False when the
 *   resource does not exist.
 */
create or replace function public.util__is_resource_private_to_owner (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_owner_id uuid;
  v_is_restricted boolean;
begin
  if p_resource_type = 'dashboard' then
    select
      d.owner_id,
      coalesce(d.is_restricted, false)
    into v_owner_id, v_is_restricted
    from public.dashboards d
    where
      d.id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    select
      ds.owner_id,
      coalesce(ds.is_restricted, false)
    into v_owner_id, v_is_restricted
    from public.datasets ds
    where
      ds.id = p_resource_id;
  else
    return false;
  end if;

  if v_owner_id is null then
    return false;
  end if;

  if not v_is_restricted then
    return false;
  end if;

  return not public.util__has_non_owner_share (
    p_resource_type,
    p_resource_id,
    v_owner_id
  );
end;
$$;
```

- [ ] **Step 4: Generate the migration**

```bash
supabase stop
supabase db diff -f add_util_is_resource_private_to_owner
```

- [ ] **Step 5: Run both predicate tests to verify they pass**

```bash
supabase start
supabase db reset
supabase test db supabase/tests/database/permissions/util_is_resource_private_to_owner.test.sql
supabase test db supabase/tests/database/permissions/util_has_non_owner_share.test.sql
```

Expected: 7 subtests pass, then 5 subtests pass.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/16.utils.resource-permissions.sql \
        supabase/tests/database/permissions/util_is_resource_private_to_owner.test.sql \
        supabase/migrations/
git commit -m "feat(db): add util__is_resource_private_to_owner predicate"
```

---

## Task 3: Narrow the Settings-Admin short-circuit

The core behavior change.

**Files:**

- Modify: `supabase/schemas/16.utils.resource-permissions.sql` (`util__resource_effective_role`)
- Test: `supabase/tests/database/permissions/util_resource_effective_role.test.sql` (append)

- [ ] **Step 1: Write the failing test**

Open `supabase/tests/database/permissions/util_resource_effective_role.test.sql`.
Change `select plan(17);` to `select plan(20);`. Then, immediately **before**
`select * from finish();`, append:

```sql
-- ---------------------------------------------------------------------------
-- P1: Settings Admins do not get access to resources private to their owner.
-- See docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
-- ---------------------------------------------------------------------------
set local role postgres;

-- A dashboard owned by bob, restricted, with zero shares: private to bob.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public
)
values (
  '90005090-0000-4000-8000-000000000090'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  '90000003-0000-4000-8000-000000000003'::uuid,
  (
    select up.id from public.user_profiles up
    where up.user_id = '90000003-0000-4000-8000-000000000003'::uuid
      and up.workspace_id = '90001001-0000-4000-8000-000000000001'::uuid
  ),
  'bob private dashboard',
  '{}'::jsonb,
  true,
  false
);

-- Same, but public. Public is never private (spec 4.2).
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public
)
values (
  '90005091-0000-4000-8000-000000000091'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  '90000003-0000-4000-8000-000000000003'::uuid,
  (
    select up.id from public.user_profiles up
    where up.user_id = '90000003-0000-4000-8000-000000000003'::uuid
      and up.workspace_id = '90001001-0000-4000-8000-000000000001'::uuid
  ),
  'bob public restricted dashboard',
  '{}'::jsonb,
  true,
  true
);

-- Make alice a Settings Admin so the short-circuit is the grant under test.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values (
  '9000cf90-0000-4000-8000-000000000090'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'P1 Settings Admin',
  false
)
on conflict do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values (
  '9000cf90-0000-4000-8000-000000000090'::uuid,
  'settings'::public.app_type,
  'admin'::public.role_level
)
on conflict do nothing;

update public.workspace_memberships
   set role_group_id = '9000cf90-0000-4000-8000-000000000090'::uuid
 where workspace_id = '90001001-0000-4000-8000-000000000001'::uuid
   and user_id = '90000002-0000-4000-8000-000000000002'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005090-0000-4000-8000-000000000090'::uuid
  ),
  null::public.role_level,
  'P1: settings admin gets no role on a dashboard private to its owner'
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005091-0000-4000-8000-000000000091'::uuid
  )::text,
  'admin'::text,
  'P1: settings admin keeps admin on a public dashboard even when restricted'
);

set local role postgres;

-- Sharing it to a third party stops it being private, so the admin returns.
insert into public.resource_shares (
  id, workspace_id, resource_type, resource_id, principal_type, principal_id, role
)
values (
  '90006090-0000-4000-8000-000000000090'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'dashboard',
  '90005090-0000-4000-8000-000000000090'::uuid,
  'user',
  '90000001-0000-4000-8000-000000000001'::uuid,
  'viewer'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005090-0000-4000-8000-000000000090'::uuid
  )::text,
  'admin'::text,
  'P1: settings admin regains admin once the resource is shared with anyone'
);

set local role postgres;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
supabase test db supabase/tests/database/permissions/util_resource_effective_role.test.sql
```

Expected: FAIL. The first new assertion reports `have: admin, want: NULL`,
because the unconditional short-circuit still fires.

- [ ] **Step 3: Narrow the short-circuit**

In `supabase/schemas/16.utils.resource-permissions.sql`, inside
`util__resource_effective_role`:

**3a.** Add to the `declare` block, after `v_is_restricted boolean;`:

```sql
  v_is_public boolean := false;
```

**3b.** In the `dashboard` branch, add `is_public` to the select. Replace:

```sql
    select
      d.workspace_id,
      d.owner_id,
      coalesce(d.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.dashboards d
    where
      d.id = p_resource_id;
```

with:

```sql
    select
      d.workspace_id,
      d.owner_id,
      coalesce(d.is_restricted, false),
      coalesce(d.is_public, false)
    into v_workspace_id, v_owner_id, v_is_restricted, v_is_public
    from public.dashboards d
    where
      d.id = p_resource_id;
```

Leave the `dataset` branch alone: `datasets` has no `is_public` column, and
`v_is_public` is already initialised `false`.

**3c.** Replace the short-circuit. From:

```sql
  if public.util__is_settings_admin (v_workspace_id) then
    return 'admin';
  end if;
```

to:

```sql
  -- Settings Admins are admin on everything in this workspace EXCEPT resources
  -- their owner has kept private (restricted, zero non-owner shares). Mirrors
  -- Google Drive: an org admin cannot read an employee's private document.
  --
  -- Public dashboards are never private however `is_restricted` is set, because
  -- the anon policy already exposes them; excluding them here keeps an admin's
  -- edit rights on a dashboard the whole internet can read.
  --
  -- Composed inline from values already in scope rather than calling
  -- util__is_resource_private_to_owner, which would re-fetch the row. RLS calls
  -- this function per row.
  if public.util__is_settings_admin (v_workspace_id) and (
    v_is_public or
    not (
      v_is_restricted and
      not public.util__has_non_owner_share (
        p_resource_type,
        p_resource_id,
        v_owner_id
      )
    )
  ) then
    return 'admin';
  end if;
```

**3d.** Update the function's doc comment. Replace the line:

```
 * - Settings (global) admin in the workspace → admin.
```

with:

```
 * - Settings (global) admin in the workspace → admin, UNLESS the resource is
 *   private to its owner (restricted with zero non-owner shares) and not a
 *   public dashboard. See the P1 spec at
 *   docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
```

- [ ] **Step 4: Generate the migration**

```bash
supabase stop
supabase db diff -f narrow_settings_admin_on_private_resources
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
supabase start
supabase db reset
supabase test db supabase/tests/database/permissions/util_resource_effective_role.test.sql
```

Expected: `All 20 subtests passed`.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/16.utils.resource-permissions.sql \
        supabase/tests/database/permissions/util_resource_effective_role.test.sql \
        supabase/migrations/
git commit -m "feat(db): settings admins lose access to owner-private resources"
```

---

## Task 4: Prove the `may_select_*` helpers inherit the narrowing

Spec §4.3 claims narrowing `util__resource_effective_role` alone is sufficient,
because both `may_select_*` helpers gate on `util__auth_user_can_access_resource`
**before** their own `util__can_manage_workspace_settings` bypass. That claim is
load-bearing and depends on statement order inside those functions, so it needs
its own test. No production change in this task.

**Files:**

- Test: `supabase/tests/database/permissions/may_select_private_resource.test.sql` (create)

- [ ] **Step 1: Write the test**

Create `supabase/tests/database/permissions/may_select_private_resource.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- owner = a4000001, settings admin = a4000002
insert into auth.users (id, email, aud, role)
values
  ('a4000001-0000-4000-8000-000000000001'::uuid, 'a4_owner@test.dev', 'authenticated', 'authenticated'),
  ('a4000002-0000-4000-8000-000000000002'::uuid, 'a4_admin@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a4001001-0000-4000-8000-000000000001'::uuid,
  'a4000001-0000-4000-8000-000000000001'::uuid,
  'a4 workspace',
  'a4-may-select-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a400cf01-0000-4000-8000-000000000001'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('a400cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level),
  ('a400cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'admin'::public.role_level),
  ('a400cf01-0000-4000-8000-000000000001'::uuid, 'data_sources'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a4002001-0000-4000-8000-000000000001'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4000001-0000-4000-8000-000000000001'::uuid, null),
  ('a4002002-0000-4000-8000-000000000002'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4000002-0000-4000-8000-000000000002'::uuid, 'a400cf01-0000-4000-8000-000000000001'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a4003001-0000-4000-8000-000000000001'::uuid, 'a4000001-0000-4000-8000-000000000001'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4002001-0000-4000-8000-000000000001'::uuid, 'A4 Owner', 'A4 Owner'),
  ('a4003002-0000-4000-8000-000000000002'::uuid, 'a4000002-0000-4000-8000-000000000002'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4002002-0000-4000-8000-000000000002'::uuid, 'A4 Admin', 'A4 Admin');

insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values
  ('a4005001-0000-4000-8000-000000000001'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4000001-0000-4000-8000-000000000001'::uuid, 'a4003001-0000-4000-8000-000000000001'::uuid, 'private', '{}'::jsonb, true, false),
  ('a4005002-0000-4000-8000-000000000002'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4000001-0000-4000-8000-000000000001'::uuid, 'a4003001-0000-4000-8000-000000000001'::uuid, 'unrestricted', '{}'::jsonb, false, false);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, is_restricted)
values (
  'a4007001-0000-4000-8000-000000000001'::uuid,
  'a4001001-0000-4000-8000-000000000001'::uuid,
  'a4000001-0000-4000-8000-000000000001'::uuid,
  'a4003001-0000-4000-8000-000000000001'::uuid,
  'private ds',
  true
);

select plan(5);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a4000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('a4005001-0000-4000-8000-000000000001'::uuid),
  false,
  'settings admin may not select a dashboard private to its owner'
);

select is(
  public.util__auth_user_may_select_dataset ('a4007001-0000-4000-8000-000000000001'::uuid),
  false,
  'settings admin may not select a dataset private to its owner'
);

select is(
  public.util__auth_user_may_select_dashboard ('a4005002-0000-4000-8000-000000000002'::uuid),
  true,
  'settings admin may still select an unrestricted dashboard'
);

-- RLS-level proof, not just the helper: the row must be invisible in a select.
select is(
  (
    select count(*)::int
    from public.dashboards
    where id = 'a4005001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'RLS hides the private dashboard row from the settings admin'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a4000001-0000-4000-8000-000000000001"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('a4005001-0000-4000-8000-000000000001'::uuid),
  true,
  'the owner may still select their own private dashboard'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
supabase test db supabase/tests/database/permissions/may_select_private_resource.test.sql
```

Expected: `All 5 subtests passed`. It passes because Task 3 already narrowed
`effective_role`; this test exists to _lock_ that inheritance so a future edit
to either helper cannot silently reopen the hole.

If it FAILS, the statement order in the helper has changed and spec §4.3 no
longer holds. Stop and re-read §4.3 before continuing.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/database/permissions/may_select_private_resource.test.sql
git commit -m "test(db): lock may_select_* inheritance of the private-resource narrowing"
```

---

## Task 5: Close the `resource_shares` self-grant bypass

Spec §4.1. Without this task, a Settings Admin can insert a share granting
themselves `admin` on a private resource, which makes it non-private and
readable. This is the task that actually makes P1's guarantee hold.

**Files:**

- Modify: `supabase/schemas/17.rls.resource_shares.sql`
- Create: `supabase/migrations/<timestamp>_guard_resource_shares_on_private_resources.sql` (hand-written)
- Test: `supabase/tests/database/permissions/resource_shares_private_resource_guard.test.sql` (create)

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/permissions/resource_shares_private_resource_guard.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a5000001-0000-4000-8000-000000000001'::uuid, 'a5_owner@test.dev', 'authenticated', 'authenticated'),
  ('a5000002-0000-4000-8000-000000000002'::uuid, 'a5_admin@test.dev', 'authenticated', 'authenticated'),
  ('a5000003-0000-4000-8000-000000000003'::uuid, 'a5_third@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a5001001-0000-4000-8000-000000000001'::uuid,
  'a5000001-0000-4000-8000-000000000001'::uuid,
  'a5 workspace',
  'a5-shares-guard-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a500cf01-0000-4000-8000-000000000001'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('a500cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level),
  ('a500cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a5002001-0000-4000-8000-000000000001'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000001-0000-4000-8000-000000000001'::uuid, null),
  ('a5002002-0000-4000-8000-000000000002'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000002-0000-4000-8000-000000000002'::uuid, 'a500cf01-0000-4000-8000-000000000001'::uuid),
  ('a5002003-0000-4000-8000-000000000003'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a5003001-0000-4000-8000-000000000001'::uuid, 'a5000001-0000-4000-8000-000000000001'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5002001-0000-4000-8000-000000000001'::uuid, 'A5 Owner', 'A5 Owner'),
  ('a5003002-0000-4000-8000-000000000002'::uuid, 'a5000002-0000-4000-8000-000000000002'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5002002-0000-4000-8000-000000000002'::uuid, 'A5 Admin', 'A5 Admin'),
  ('a5003003-0000-4000-8000-000000000003'::uuid, 'a5000003-0000-4000-8000-000000000003'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5002003-0000-4000-8000-000000000003'::uuid, 'A5 Third', 'A5 Third');

-- d_private is private to a5000001. d_open is unrestricted.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values
  ('a5005001-0000-4000-8000-000000000001'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000001-0000-4000-8000-000000000001'::uuid, 'a5003001-0000-4000-8000-000000000001'::uuid, 'private', '{}'::jsonb, true, false),
  ('a5005002-0000-4000-8000-000000000002'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000001-0000-4000-8000-000000000001'::uuid, 'a5003001-0000-4000-8000-000000000001'::uuid, 'open', '{}'::jsonb, false, false);

-- An existing share on the open dashboard, for the UPDATE-repoint test.
insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values (
  'a5006002-0000-4000-8000-000000000002'::uuid,
  'a5001001-0000-4000-8000-000000000001'::uuid,
  'dashboard',
  'a5005002-0000-4000-8000-000000000002'::uuid,
  'user',
  'a5000003-0000-4000-8000-000000000003'::uuid,
  'viewer'
);

select plan(4);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a5000002-0000-4000-8000-000000000002"}',
  true
);

-- The bypass: self-grant on a private resource must be refused.
select throws_ok(
  $$insert into public.resource_shares (
      workspace_id, resource_type, resource_id, principal_type, principal_id, role
    ) values (
      'a5001001-0000-4000-8000-000000000001'::uuid,
      'dashboard',
      'a5005001-0000-4000-8000-000000000001'::uuid,
      'user',
      'a5000002-0000-4000-8000-000000000002'::uuid,
      'admin'
    )$$,
  '42501',
  'new row violates row-level security policy for table "resource_shares"',
  'settings admin cannot self-grant a share on a private resource'
);

-- The same bypass via UPDATE: repoint an existing share at the private resource.
select throws_ok(
  $$update public.resource_shares
       set resource_id = 'a5005001-0000-4000-8000-000000000001'::uuid
     where id = 'a5006002-0000-4000-8000-000000000002'::uuid$$,
  '42501',
  'new row violates row-level security policy for table "resource_shares"',
  'settings admin cannot repoint a share onto a private resource'
);

-- Legitimate admin sharing must keep working.
select lives_ok(
  $$insert into public.resource_shares (
      workspace_id, resource_type, resource_id, principal_type, principal_id, role
    ) values (
      'a5001001-0000-4000-8000-000000000001'::uuid,
      'dashboard',
      'a5005002-0000-4000-8000-000000000002'::uuid,
      'user',
      'a5000002-0000-4000-8000-000000000002'::uuid,
      'viewer'
    )$$,
  'settings admin can still share a non-private resource'
);

-- The owner can share their own private resource; that is how it stops
-- being private.
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a5000001-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$insert into public.resource_shares (
      workspace_id, resource_type, resource_id, principal_type, principal_id, role
    ) values (
      'a5001001-0000-4000-8000-000000000001'::uuid,
      'dashboard',
      'a5005001-0000-4000-8000-000000000001'::uuid,
      'user',
      'a5000003-0000-4000-8000-000000000003'::uuid,
      'viewer'
    )$$,
  'the owner can share their own private resource'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
supabase test db supabase/tests/database/permissions/resource_shares_private_resource_guard.test.sql
```

Expected: FAIL on the first two assertions. They report that no exception was
thrown, because the unconditional admin disjunct currently permits both writes.
That failure **is** the bypass, demonstrated.

- [ ] **Step 3: Narrow the policies in the declarative schema**

In `supabase/schemas/17.rls.resource_shares.sql`, replace the INSERT policy:

```sql
create policy "Resource admins can insert resource_shares" on public.resource_shares for insert to authenticated
with
  check (
    (
      public.util__is_settings_admin (
        public.resource_shares.workspace_id
      ) and
      not public.util__is_resource_private_to_owner (
        public.resource_shares.resource_type,
        public.resource_shares.resource_id
      )
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  );
```

and the UPDATE policy:

```sql
create policy "Resource admins can update resource_shares" on public.resource_shares
for update
  to authenticated using (
    (
      public.util__is_settings_admin (
        public.resource_shares.workspace_id
      ) and
      not public.util__is_resource_private_to_owner (
        public.resource_shares.resource_type,
        public.resource_shares.resource_id
      )
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  )
with
  check (
    (
      public.util__is_settings_admin (
        public.resource_shares.workspace_id
      ) and
      not public.util__is_resource_private_to_owner (
        public.resource_shares.resource_type,
        public.resource_shares.resource_id
      )
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  );
```

Leave the SELECT and DELETE policies untouched. Then update the file's header
comment, replacing:

```
 *  Resource admins may manage shares and tags. In other words, the admin of
 *  a resource (such as a dataset or a dashboard) can manage who to share it
 *  with.
```

with:

```
 *  Resource admins may manage shares and tags. In other words, the admin of
 *  a resource (such as a dataset or a dashboard) can manage who to share it
 *  with.
 *
 *  The workspace-wide Settings-Admin grant on INSERT and UPDATE is gated on the
 *  resource NOT being private to its owner. Without that gate an admin could
 *  insert a share granting themselves admin on a private resource, which would
 *  make it non-private and readable: a two-statement self-escalation. The owner
 *  path (util__auth_user_can_access_resource) still lets the owner share their
 *  own private resource, which is how it stops being private. See the P1 spec
 *  section 4.1.
 *
 *  DELETE is deliberately not gated: removing a share can only reduce access.
```

- [ ] **Step 4: Hand-write the migration**

`supabase db diff` does not reliably capture policy changes, so write this one
yourself. Create
`supabase/migrations/<YYYYMMDDHHMMSS>_guard_resource_shares_on_private_resources.sql`
using a timestamp later than every existing migration:

```sql
-- Gate the workspace-wide Settings-Admin grant on resource_shares INSERT and
-- UPDATE so an admin cannot self-grant a share on a resource private to its
-- owner (which would make it non-private, and therefore readable).
-- See docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
-- section 4.1. DELETE is intentionally unchanged: removing a share can only
-- reduce access.

drop policy if exists "Resource admins can insert resource_shares" on public.resource_shares;

create policy "Resource admins can insert resource_shares" on public.resource_shares for insert to authenticated
with
  check (
    (
      public.util__is_settings_admin (
        public.resource_shares.workspace_id
      ) and
      not public.util__is_resource_private_to_owner (
        public.resource_shares.resource_type,
        public.resource_shares.resource_id
      )
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  );

drop policy if exists "Resource admins can update resource_shares" on public.resource_shares;

create policy "Resource admins can update resource_shares" on public.resource_shares
for update
  to authenticated using (
    (
      public.util__is_settings_admin (
        public.resource_shares.workspace_id
      ) and
      not public.util__is_resource_private_to_owner (
        public.resource_shares.resource_type,
        public.resource_shares.resource_id
      )
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  )
with
  check (
    (
      public.util__is_settings_admin (
        public.resource_shares.workspace_id
      ) and
      not public.util__is_resource_private_to_owner (
        public.resource_shares.resource_type,
        public.resource_shares.resource_id
      )
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  );
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
supabase db reset
supabase test db supabase/tests/database/permissions/resource_shares_private_resource_guard.test.sql
```

Expected: `All 4 subtests passed`.

If `throws_ok` fails on the error-message argument, print the real message with
`select * from public.resource_shares limit 0;` after attempting the insert in
`supabase db shell`, and paste the exact text into the test. Postgres wording
varies by version.

- [ ] **Step 6: Verify no other test regressed**

```bash
pnpm test:db
```

Some assertions in `resource_shares.test.sql` may now fail if they assumed the
unconditional admin grant. Task 6 handles expectation flips; note any failures
and carry them into that task rather than fixing them here.

- [ ] **Step 7: Commit**

```bash
git add supabase/schemas/17.rls.resource_shares.sql \
        supabase/tests/database/permissions/resource_shares_private_resource_guard.test.sql \
        supabase/migrations/
git commit -m "fix(db): stop settings admins self-granting shares on private resources"
```

---

## Task 6: Confirm the existing RLS suites still hold

> **Premise corrected during execution.** This task was written expecting three
> suites to assert that a Settings Admin can read another member's restricted
> resource, requiring expectation flips. **They do not.** After Task 3 landed,
> the full suite stayed green at 18 files / 134 tests with zero collateral
> failures, and inspection confirmed none of those suites ever asserted the
> admin-reads-restricted case. So there is nothing to flip.
>
> The task is now a verification step, kept because "no flips were needed" is a
> conclusion worth recording rather than assuming. Steps 2 and 3 below apply only
> if Step 1 unexpectedly finds failures.

**Files:**

- Modify: `supabase/tests/database/permissions/resource_rls_role_matrix.test.sql`
- Modify: `supabase/tests/database/permissions/rls_datasets_dashboards_manager_writes.test.sql`
- Modify: `supabase/tests/database/permissions/rls_phase3_policies.test.sql`
- Modify: `supabase/tests/database/permissions/resource_shares.test.sql` (only if Task 5 Step 6 flagged it)

- [ ] **Step 1: Enumerate the failures**

```bash
pnpm test:db 2>&1 | tee /tmp/p1-db-failures.txt
grep -n "not ok" /tmp/p1-db-failures.txt
```

Write down every failing assertion with its file and description. Expect
failures only in the four files above. **A failure anywhere else means Task 3 or
Task 5 changed more than intended: stop and investigate before editing tests.**

- [ ] **Step 2: For each failure, decide flip or fixture change**

Two legitimate outcomes per failing assertion:

1. **The assertion is about a private resource** (restricted, no non-owner
   shares) and the admin was expected to have access. Flip the expected value
   and add the comment from Step 3.
2. **The assertion is incidentally about a private resource** but is really
   testing something else. Add a non-owner share to that fixture so the resource
   is no longer private, preserving the original intent.

Prefer option 2 when the assertion's description does not mention admin
visibility. Do not delete assertions.

- [ ] **Step 3: Apply the flips**

For every flipped assertion, put this comment directly above it, so the reason
travels with the code:

```sql
-- P1: settings admins no longer reach resources private to their owner.
-- Flipped deliberately; see
-- docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
```

Remember to update each file's `select plan(N);` if you added assertions.

- [ ] **Step 4: Run the full database suite**

```bash
pnpm test:db
```

Expected: all files pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/tests/database/permissions/
git commit -m "test(db): flip admin expectations for owner-private resources"
```

---

## Task 7: Private-resource counts RPC

**Files:**

- Create: `supabase/schemas/70.rpc_workspaces__private_resource_counts.sql`
- Test: `supabase/tests/database/permissions/rpc_workspaces__private_resource_counts.test.sql` (create)

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/permissions/rpc_workspaces__private_resource_counts.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a7000001-0000-4000-8000-000000000001'::uuid, 'a7_owner@test.dev', 'authenticated', 'authenticated'),
  ('a7000002-0000-4000-8000-000000000002'::uuid, 'a7_admin@test.dev', 'authenticated', 'authenticated'),
  ('a7000003-0000-4000-8000-000000000003'::uuid, 'a7_plain@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a7001001-0000-4000-8000-000000000001'::uuid,
  'a7000001-0000-4000-8000-000000000001'::uuid,
  'a7 workspace',
  'a7-counts-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a700cf01-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('a700cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a7002001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, null),
  ('a7002002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000002-0000-4000-8000-000000000002'::uuid, 'a700cf01-0000-4000-8000-000000000001'::uuid),
  ('a7002003-0000-4000-8000-000000000003'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a7003001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7002001-0000-4000-8000-000000000001'::uuid, 'A7 Owner', 'A7 Owner'),
  ('a7003002-0000-4000-8000-000000000002'::uuid, 'a7000002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7002002-0000-4000-8000-000000000002'::uuid, 'A7 Admin', 'A7 Admin'),
  ('a7003003-0000-4000-8000-000000000003'::uuid, 'a7000003-0000-4000-8000-000000000003'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7002003-0000-4000-8000-000000000003'::uuid, 'A7 Plain', 'A7 Plain');

-- a7000001 owns: 2 private dashboards, 1 public+restricted (must NOT count),
-- 1 unrestricted (must not count), and 1 private dataset.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values
  ('a7005001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7003001-0000-4000-8000-000000000001'::uuid, 'p1', '{}'::jsonb, true, false),
  ('a7005002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7003001-0000-4000-8000-000000000001'::uuid, 'p2', '{}'::jsonb, true, false),
  ('a7005003-0000-4000-8000-000000000003'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7003001-0000-4000-8000-000000000001'::uuid, 'public restricted', '{}'::jsonb, true, true),
  ('a7005004-0000-4000-8000-000000000004'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7003001-0000-4000-8000-000000000001'::uuid, 'open', '{}'::jsonb, false, false);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, is_restricted)
values (
  'a7007001-0000-4000-8000-000000000001'::uuid,
  'a7001001-0000-4000-8000-000000000001'::uuid,
  'a7000001-0000-4000-8000-000000000001'::uuid,
  'a7003001-0000-4000-8000-000000000001'::uuid,
  'private ds',
  true
);

select plan(5);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a7000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select private_dashboard_count
    from public.rpc_workspaces__private_resource_counts ('a7001001-0000-4000-8000-000000000001'::uuid)
    where user_id = 'a7000001-0000-4000-8000-000000000001'::uuid
  ),
  2::bigint,
  'counts the two private dashboards and excludes public + unrestricted'
);

select is(
  (
    select private_dataset_count
    from public.rpc_workspaces__private_resource_counts ('a7001001-0000-4000-8000-000000000001'::uuid)
    where user_id = 'a7000001-0000-4000-8000-000000000001'::uuid
  ),
  1::bigint,
  'counts the one private dataset'
);

select is(
  (
    select private_dashboard_count
    from public.rpc_workspaces__private_resource_counts ('a7001001-0000-4000-8000-000000000001'::uuid)
    where user_id = 'a7000003-0000-4000-8000-000000000003'::uuid
  ),
  0::bigint,
  'members with nothing private appear with zero'
);

select is(
  (
    select count(*)::int
    from public.rpc_workspaces__private_resource_counts ('a7001001-0000-4000-8000-000000000001'::uuid)
  ),
  3,
  'one row per workspace member'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a7000003-0000-4000-8000-000000000003"}',
  true
);

select throws_ok(
  $$select * from public.rpc_workspaces__private_resource_counts (
      'a7001001-0000-4000-8000-000000000001'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a plain member cannot read private-resource counts'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
supabase test db supabase/tests/database/permissions/rpc_workspaces__private_resource_counts.test.sql
```

Expected: FAIL with `function public.rpc_workspaces__private_resource_counts(uuid) does not exist`.

- [ ] **Step 3: Create the RPC**

Create `supabase/schemas/70.rpc_workspaces__private_resource_counts.sql`:

```sql
/**
 * Per-member counts of resources private to that member, for the workspace
 * settings privacy log.
 *
 * Security definer because the caller is forbidden by design from reading the
 * underlying rows: that is the whole point of P1. This function must therefore
 * return counts ONLY. Never add resource names, ids, or any other column.
 *
 * Dashboards additionally require `not is_public`: a public dashboard is
 * world-readable and must never be reported as private. See the P1 spec
 * section 4.2.
 *
 * @param p_workspace_id Workspace to report on.
 * @returns One row per workspace member, including members with zero of each.
 */
create or replace function public.rpc_workspaces__private_resource_counts (
  p_workspace_id uuid
) returns table (
  user_id uuid,
  private_dashboard_count bigint,
  private_dataset_count bigint
) language plpgsql security definer
set
  search_path = public as $$
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  return query
  select
    wm.user_id,
    (
      select count(*)
      from public.dashboards d
      where
        d.workspace_id = p_workspace_id and
        d.owner_id = wm.user_id and
        not coalesce(d.is_public, false) and
        public.util__is_resource_private_to_owner (
          'dashboard'::public.resource_type,
          d.id
        )
    ),
    (
      select count(*)
      from public.datasets ds
      where
        ds.workspace_id = p_workspace_id and
        ds.owner_id = wm.user_id and
        public.util__is_resource_private_to_owner (
          'dataset'::public.resource_type,
          ds.id
        )
    )
  from public.workspace_memberships wm
  where
    wm.workspace_id = p_workspace_id;
end;
$$;
```

- [ ] **Step 4: Generate the migration**

```bash
supabase stop
supabase db diff -f add_rpc_workspaces_private_resource_counts
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
supabase start
supabase db reset
supabase test db supabase/tests/database/permissions/rpc_workspaces__private_resource_counts.test.sql
```

Expected: `All 5 subtests passed`.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/70.rpc_workspaces__private_resource_counts.sql \
        supabase/tests/database/permissions/rpc_workspaces__private_resource_counts.test.sql \
        supabase/migrations/
git commit -m "feat(db): add private-resource counts RPC"
```

---

## Task 8: Ownership-transfer RPC

Without this, closing the hole deadlocks offboarding: `owner_id` is
`on delete no action`, so a member who owns private resources cannot be removed.

**Files:**

- Create: `supabase/schemas/70.rpc_resources__transfer_ownership.sql`
- Test: `supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql` (create)

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a8000001-0000-4000-8000-000000000001'::uuid, 'a8_owner@test.dev', 'authenticated', 'authenticated'),
  ('a8000002-0000-4000-8000-000000000002'::uuid, 'a8_admin@test.dev', 'authenticated', 'authenticated'),
  ('a8000003-0000-4000-8000-000000000003'::uuid, 'a8_target@test.dev', 'authenticated', 'authenticated'),
  ('a8000004-0000-4000-8000-000000000004'::uuid, 'a8_outsider@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a8001001-0000-4000-8000-000000000001'::uuid,
  'a8000002-0000-4000-8000-000000000002'::uuid,
  'a8 workspace',
  'a8-transfer-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a800cf01-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('a800cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a8002001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8000001-0000-4000-8000-000000000001'::uuid, null),
  ('a8002002-0000-4000-8000-000000000002'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8000002-0000-4000-8000-000000000002'::uuid, 'a800cf01-0000-4000-8000-000000000001'::uuid),
  ('a8002003-0000-4000-8000-000000000003'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a8003001-0000-4000-8000-000000000001'::uuid, 'a8000001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8002001-0000-4000-8000-000000000001'::uuid, 'A8 Owner', 'A8 Owner'),
  ('a8003002-0000-4000-8000-000000000002'::uuid, 'a8000002-0000-4000-8000-000000000002'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8002002-0000-4000-8000-000000000002'::uuid, 'A8 Admin', 'A8 Admin'),
  ('a8003003-0000-4000-8000-000000000003'::uuid, 'a8000003-0000-4000-8000-000000000003'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8002003-0000-4000-8000-000000000003'::uuid, 'A8 Target', 'A8 Target');

insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values (
  'a8005001-0000-4000-8000-000000000001'::uuid,
  'a8001001-0000-4000-8000-000000000001'::uuid,
  'a8000001-0000-4000-8000-000000000001'::uuid,
  'a8003001-0000-4000-8000-000000000001'::uuid,
  'private dashboard',
  '{}'::jsonb,
  true,
  false
);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, is_restricted)
values (
  'a8007001-0000-4000-8000-000000000001'::uuid,
  'a8001001-0000-4000-8000-000000000001'::uuid,
  'a8000001-0000-4000-8000-000000000001'::uuid,
  'a8003001-0000-4000-8000-000000000001'::uuid,
  'private dataset',
  true
);

select plan(9);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000002-0000-4000-8000-000000000002"}',
  true
);

select lives_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dashboard',
      'a8005001-0000-4000-8000-000000000001'::uuid,
      'a8000003-0000-4000-8000-000000000003'::uuid
    )$$,
  'settings admin can transfer a dashboard they cannot read'
);

set local role postgres;

select is(
  (select owner_id from public.dashboards where id = 'a8005001-0000-4000-8000-000000000001'::uuid),
  'a8000003-0000-4000-8000-000000000003'::uuid,
  'dashboard owner_id moved'
);

select is(
  (select owner_profile_id from public.dashboards where id = 'a8005001-0000-4000-8000-000000000001'::uuid),
  'a8003003-0000-4000-8000-000000000003'::uuid,
  'dashboard owner_profile_id moved too, or removal stays blocked'
);

select is(
  (
    select count(*)::int
    from public.usage_analytics_events
    where event_name = 'resource.ownership_transferred'
      and payload ->> 'resourceId' = 'a8005001-0000-4000-8000-000000000001'
  ),
  1,
  'exactly one audit row written'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('a8005001-0000-4000-8000-000000000001'::uuid),
  false,
  'the transferring admin still cannot read the resource'
);

select lives_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dataset',
      'a8007001-0000-4000-8000-000000000001'::uuid,
      'a8000003-0000-4000-8000-000000000003'::uuid
    )$$,
  'datasets transfer too'
);

set local role postgres;

select is(
  (select owner_profile_id from public.datasets where id = 'a8007001-0000-4000-8000-000000000001'::uuid),
  'a8003003-0000-4000-8000-000000000003'::uuid,
  'dataset owner_profile_id moved too'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000002-0000-4000-8000-000000000002"}',
  true
);

select throws_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dashboard',
      'a8005001-0000-4000-8000-000000000001'::uuid,
      'a8000004-0000-4000-8000-000000000004'::uuid
    )$$,
  'new owner must be a member of the resource workspace',
  'cannot transfer to a non-member'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000003-0000-4000-8000-000000000003"}',
  true
);

select throws_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dashboard',
      'a8005001-0000-4000-8000-000000000001'::uuid,
      'a8000003-0000-4000-8000-000000000003'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a plain member cannot transfer ownership'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
supabase test db supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql
```

Expected: FAIL with `function public.rpc_resources__transfer_ownership(...) does not exist`.

- [ ] **Step 3: Create the RPC**

Create `supabase/schemas/70.rpc_resources__transfer_ownership.sql`:

```sql
/**
 * Reassigns a resource's owner without granting the caller any read access.
 *
 * Security definer so a Settings Admin can act on a row RLS hides from them
 * (P1 makes owner-private resources invisible to admins). Returns void
 * precisely so no private data can leak through a return value.
 *
 * Unblocks offboarding: `owner_id` on both resource tables is
 * ON DELETE NO ACTION, so a member who owns resources cannot otherwise be
 * removed from the workspace.
 *
 * Updates `owner_profile_id` as well as `owner_id`. Both tables declare
 * `owner_profile_id uuid not null` referencing `user_profiles` with
 * ON DELETE NO ACTION, so moving `owner_id` alone would leave that FK pointing
 * at the departing member and the removal would stay blocked while this
 * function appeared to succeed.
 *
 * @param p_new_owner_id Must already be a member of the resource's workspace.
 */
create or replace function public.rpc_resources__transfer_ownership (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_new_owner_id uuid
) returns void language plpgsql security definer
set
  search_path = public as $$
declare
  v_workspace_id uuid;
  v_current_owner_id uuid;
  v_new_profile_id uuid;
  v_app public.app_type;
begin
  if p_resource_type = 'dashboard' then
    select d.workspace_id, d.owner_id
    into v_workspace_id, v_current_owner_id
    from public.dashboards d
    where
      d.id = p_resource_id;
    v_app := 'dashboards';
  elsif p_resource_type = 'dataset' then
    select ds.workspace_id, ds.owner_id
    into v_workspace_id, v_current_owner_id
    from public.datasets ds
    where
      ds.id = p_resource_id;
    v_app := 'data_sources';
  else
    raise exception 'unsupported resource type: %', p_resource_type;
  end if;

  if v_workspace_id is null then
    raise exception 'resource not found: % %', p_resource_type, p_resource_id;
  end if;

  if not public.util__can_manage_workspace_settings (v_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  -- A security definer function bypasses the resource UPDATE policy, which
  -- normally enforces that owner_id stays inside the workspace. Re-check here
  -- so this function cannot move a resource out of its workspace.
  if not exists (
    select 1
    from public.workspace_memberships wm
    where
      wm.workspace_id = v_workspace_id and
      wm.user_id = p_new_owner_id
  ) then
    raise exception 'new owner must be a member of the resource workspace';
  end if;

  -- Nothing to do, and nothing worth auditing.
  if v_current_owner_id = p_new_owner_id then
    return;
  end if;

  select up.id
  into v_new_profile_id
  from public.user_profiles up
  where
    up.user_id = p_new_owner_id and
    up.workspace_id = v_workspace_id;

  if v_new_profile_id is null then
    raise exception 'new owner has no user_profile in this workspace';
  end if;

  if p_resource_type = 'dashboard' then
    update public.dashboards
       set owner_id = p_new_owner_id,
           owner_profile_id = v_new_profile_id
     where id = p_resource_id;
  else
    update public.datasets
       set owner_id = p_new_owner_id,
           owner_profile_id = v_new_profile_id
     where id = p_resource_id;
  end if;

  insert into public.usage_analytics_events (
    workspace_id,
    user_id,
    event_name,
    app,
    payload
  )
  values (
    v_workspace_id,
    auth.uid (),
    'resource.ownership_transferred',
    v_app,
    jsonb_build_object(
      'resourceType', p_resource_type,
      'resourceId', p_resource_id,
      'previousOwnerId', v_current_owner_id,
      'newOwnerId', p_new_owner_id
    )
  );
end;
$$;
```

- [ ] **Step 4: Generate the migration**

```bash
supabase stop
supabase db diff -f add_rpc_resources_transfer_ownership
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
supabase start
supabase db reset
supabase test db supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql
```

Expected: `All 9 subtests passed`.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/70.rpc_resources__transfer_ownership.sql \
        supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql \
        supabase/migrations/
git commit -m "feat(db): add ownership-transfer RPC for private resources"
```

---

## Task 8b: Bulk transfer RPC for offboarding

The UI cannot offer per-resource transfer, because an admin cannot see which
private resources exist. Offboarding needs "move everything this member owns",
which this RPC does atomically in one round trip by looping over the Task 8
primitive.

**Not in the spec.** Spec §5.2 describes only the per-resource RPC. Record this
addition in the spec when the phase lands; the "Deliberate deviations" section at
the end of this plan flags it for the reviewer.

**Files:**

- Create: `supabase/schemas/71.rpc_workspaces__transfer_all_owned_resources.sql`
- Test: `supabase/tests/database/permissions/rpc_workspaces__transfer_all_owned_resources.test.sql` (create)

> Numbered `71` rather than `70` because it calls
> `rpc_resources__transfer_ownership`, and `supabase/schemas/` files are applied
> in lexicographic order, so the callee must be defined first.

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/permissions/rpc_workspaces__transfer_all_owned_resources.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a9000001-0000-4000-8000-000000000001'::uuid, 'a9_leaver@test.dev', 'authenticated', 'authenticated'),
  ('a9000002-0000-4000-8000-000000000002'::uuid, 'a9_admin@test.dev', 'authenticated', 'authenticated'),
  ('a9000003-0000-4000-8000-000000000003'::uuid, 'a9_target@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9000002-0000-4000-8000-000000000002'::uuid,
  'a9 workspace',
  'a9-bulk-transfer-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a900cf01-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('a900cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a9002001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, null),
  ('a9002002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000002-0000-4000-8000-000000000002'::uuid, 'a900cf01-0000-4000-8000-000000000001'::uuid),
  ('a9002003-0000-4000-8000-000000000003'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a9003001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9002001-0000-4000-8000-000000000001'::uuid, 'A9 Leaver', 'A9 Leaver'),
  ('a9003002-0000-4000-8000-000000000002'::uuid, 'a9000002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9002002-0000-4000-8000-000000000002'::uuid, 'A9 Admin', 'A9 Admin'),
  ('a9003003-0000-4000-8000-000000000003'::uuid, 'a9000003-0000-4000-8000-000000000003'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9002003-0000-4000-8000-000000000003'::uuid, 'A9 Target', 'A9 Target');

-- The leaver owns two dashboards and one dataset.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values
  ('a9005001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, 'a9003001-0000-4000-8000-000000000001'::uuid, 'p1', '{}'::jsonb, true, false),
  ('a9005002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, 'a9003001-0000-4000-8000-000000000001'::uuid, 'p2', '{}'::jsonb, false, false);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, is_restricted)
values (
  'a9007001-0000-4000-8000-000000000001'::uuid,
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9000001-0000-4000-8000-000000000001'::uuid,
  'a9003001-0000-4000-8000-000000000001'::uuid,
  'ds1',
  true
);

select plan(5);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a9000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.rpc_workspaces__transfer_all_owned_resources (
    'a9001001-0000-4000-8000-000000000001'::uuid,
    'a9000001-0000-4000-8000-000000000001'::uuid,
    'a9000003-0000-4000-8000-000000000003'::uuid
  ),
  3,
  'returns the number of resources moved'
);

set local role postgres;

select is(
  (
    select count(*)::int
    from public.dashboards
    where workspace_id = 'a9001001-0000-4000-8000-000000000001'::uuid
      and owner_id = 'a9000001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'the leaver owns no dashboards afterwards'
);

select is(
  (
    select count(*)::int
    from public.datasets
    where workspace_id = 'a9001001-0000-4000-8000-000000000001'::uuid
      and owner_id = 'a9000001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'the leaver owns no datasets afterwards'
);

select is(
  (
    select count(*)::int
    from public.usage_analytics_events
    where event_name = 'resource.ownership_transferred'
  ),
  3,
  'one audit row per transferred resource'
);

-- The whole point: removal is now possible.
select lives_ok(
  $$delete from public.workspace_memberships
     where workspace_id = 'a9001001-0000-4000-8000-000000000001'::uuid
       and user_id = 'a9000001-0000-4000-8000-000000000001'::uuid$$,
  'the leaver can now be removed from the workspace'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
supabase test db supabase/tests/database/permissions/rpc_workspaces__transfer_all_owned_resources.test.sql
```

Expected: FAIL with `function public.rpc_workspaces__transfer_all_owned_resources(...) does not exist`.

- [ ] **Step 3: Create the RPC**

Create `supabase/schemas/71.rpc_workspaces__transfer_all_owned_resources.sql`:

```sql
/**
 * Moves every dashboard and dataset a member owns in one workspace to a new
 * owner, in a single transaction.
 *
 * This is the shape offboarding needs. A workspace admin cannot see which of a
 * member's resources are private, so a per-resource picker is impossible to
 * build without leaking exactly what P1 hides. Transferring by owner sidesteps
 * that: the admin names a member and a successor, never a resource.
 *
 * Delegates each row to rpc_resources__transfer_ownership so the membership
 * check, the owner_profile_id update, and the audit row stay in one place.
 *
 * @returns The number of resources moved.
 */
create or replace function public.rpc_workspaces__transfer_all_owned_resources (
  p_workspace_id uuid,
  p_from_user_id uuid,
  p_new_owner_id uuid
) returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_moved integer := 0;
  v_row record;
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  for v_row in
    select 'dashboard'::public.resource_type as resource_type, d.id
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      d.owner_id = p_from_user_id
    union all
    select 'dataset'::public.resource_type, ds.id
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      ds.owner_id = p_from_user_id
  loop
    perform public.rpc_resources__transfer_ownership (
      v_row.resource_type,
      v_row.id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  return v_moved;
end;
$$;
```

- [ ] **Step 4: Generate the migration**

```bash
supabase stop
supabase db diff -f add_rpc_transfer_all_owned_resources
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
supabase start
supabase db reset
supabase test db supabase/tests/database/permissions/rpc_workspaces__transfer_all_owned_resources.test.sql
```

Expected: `All 5 subtests passed`.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/71.rpc_workspaces__transfer_all_owned_resources.sql \
        supabase/tests/database/permissions/rpc_workspaces__transfer_all_owned_resources.test.sql \
        supabase/migrations/
git commit -m "feat(db): add bulk ownership transfer for offboarding"
```

---

## Task 9: Widen the audit-log SELECT policy

A Settings Admin who is not the workspace owner can currently write a transfer
audit row and then be unable to read it.

**Files:**

- Modify: `supabase/schemas/30.usage_analytics_events.sql`
- Create: `supabase/migrations/<timestamp>_widen_usage_analytics_events_select.sql` (hand-written)
- Test: `supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql` (append)

- [ ] **Step 1: Write the failing test**

In `supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql`,
change `select plan(9);` to `select plan(10);`, then add this immediately before
`select * from finish();`:

```sql
-- The acting admin (a8000002) IS this workspace's owner, so to test the widened
-- policy we need a settings admin who is not. Promote the target user.
set local role postgres;

update public.workspace_memberships
   set role_group_id = 'a800cf01-0000-4000-8000-000000000001'::uuid
 where workspace_id = 'a8001001-0000-4000-8000-000000000001'::uuid
   and user_id = 'a8000003-0000-4000-8000-000000000003'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000003-0000-4000-8000-000000000003"}',
  true
);

select isnt(
  (
    select count(*)::int
    from public.usage_analytics_events
    where event_name = 'resource.ownership_transferred'
  ),
  0,
  'a settings admin who is not the workspace owner can read the audit log'
);
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
supabase test db supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql
```

Expected: FAIL. The new assertion sees `0` rows, because the current policy
admits only the workspace owner.

- [ ] **Step 3: Widen the policy in the declarative schema**

In `supabase/schemas/30.usage_analytics_events.sql`, replace the SELECT policy:

```sql
-- SELECT: workspace owners and Settings Admins can read events for their
-- workspaces. This powers the workspace usage admin panel and the private
-- resource ownership-transfer audit trail: a Settings Admin who is not the
-- workspace owner performs transfers and must be able to read the record.
create policy "
  Workspace managers can SELECT analytics events for their workspaces
" on public.usage_analytics_events for
select
  to authenticated using (
    workspace_id is not null and
    public.util__can_manage_workspace_settings (
      public.usage_analytics_events.workspace_id
    )
  );
```

- [ ] **Step 4: Hand-write the migration**

Create `supabase/migrations/<YYYYMMDDHHMMSS>_widen_usage_analytics_events_select.sql`:

```sql
-- Widen usage_analytics_events SELECT from workspace-owner-only to any
-- workspace manager, so a Settings Admin who is not the workspace owner can
-- read the resource.ownership_transferred audit trail they generate. See
-- docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
-- section 5.3.

drop policy if exists "
  Workspace owners can SELECT analytics events for their workspaces
" on public.usage_analytics_events;

create policy "
  Workspace managers can SELECT analytics events for their workspaces
" on public.usage_analytics_events for
select
  to authenticated using (
    workspace_id is not null and
    public.util__can_manage_workspace_settings (
      public.usage_analytics_events.workspace_id
    )
  );
```

> The existing policy name contains literal newlines. If `drop policy` cannot
> find it, list the real name with
> `select policyname from pg_policies where tablename = 'usage_analytics_events';`
> in `supabase db shell` and use it verbatim.

- [ ] **Step 5: Run the test to verify it passes**

```bash
supabase db reset
supabase test db supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql
```

Expected: `All 10 subtests passed`.

- [ ] **Step 6: Run the whole database suite**

```bash
pnpm test:db
```

Expected: everything passes. This is the last SQL task, so the suite must be
green before moving to TypeScript.

- [ ] **Step 7: Commit**

```bash
git add supabase/schemas/30.usage_analytics_events.sql \
        supabase/tests/database/permissions/rpc_resources__transfer_ownership.test.sql \
        supabase/migrations/
git commit -m "feat(db): let settings admins read the workspace audit log"
```

---

## Task 10: Regenerate database types and verify the desktop mirror

**Files:**

- Modify: `shared/types/database.types.ts`
- Verify: `apps/desktop/migrations/`

- [ ] **Step 1: Regenerate the TypeScript database types**

```bash
supabase gen types typescript --local > shared/types/database.types.ts
```

- [ ] **Step 2: Confirm the two RPCs appear**

```bash
grep -n "rpc_workspaces__private_resource_counts\|rpc_resources__transfer_ownership" shared/types/database.types.ts
```

Expected: both names appear under `Functions`. If they do not, `supabase db reset`
did not apply your migrations; rerun it and regenerate.

- [ ] **Step 3: Verify the desktop SQLite mirror needs no change**

```bash
pnpm --filter @avandar/desktop exec tsx scripts/check-sqlite-migrations/main.ts || \
  node apps/desktop/scripts/check-sqlite-migrations/main.ts
```

Expected: no drift. This phase adds no tables or columns, only functions and
policies, which the SQLite mirror does not model. If the checker reports drift,
read `apps/desktop/migrations/README.md` before changing anything.

- [ ] **Step 4: Type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add shared/types/database.types.ts
git commit -m "chore(types): regenerate database types for P1 RPCs"
```

---

## Task 11: `PrivateResourceAdminClient`

A dedicated client for the two RPCs, matching the shape of
`src/clients/permissions/ResourceShareClient.ts`.

**Files:**

- Create: `src/clients/permissions/PrivateResourceAdminClient.ts`
- Test: `src/clients/permissions/PrivateResourceAdminClient.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/clients/permissions/PrivateResourceAdminClient.test.ts`:

```typescript
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

const { PrivateResourceAdminClient } =
  await import("@/clients/permissions/PrivateResourceAdminClient");

describe("PrivateResourceAdminClient", () => {
  it("maps count rows to camelCase", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          user_id: "user-1",
          private_dashboard_count: 2,
          private_dataset_count: 5,
        },
      ],
      error: null,
    });

    const result = await PrivateResourceAdminClient.getPrivateResourceCounts({
      workspaceId: "ws-1" as never,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      "rpc_workspaces__private_resource_counts",
      { p_workspace_id: "ws-1" },
    );
    expect(result).toEqual([
      { userId: "user-1", privateDashboardCount: 2, privateDatasetCount: 5 },
    ]);
  });

  it("throws the supabase error message on failure", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "insufficient_privilege" },
    });

    await expect(
      PrivateResourceAdminClient.getPrivateResourceCounts({
        workspaceId: "ws-1" as never,
      }),
    ).rejects.toThrow("insufficient_privilege");
  });

  it("passes transfer arguments through with p_ prefixes", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });

    await PrivateResourceAdminClient.transferResourceOwnership({
      resourceType: "dashboard",
      resourceId: "dash-1",
      newOwnerId: "user-2",
    });

    expect(rpcMock).toHaveBeenCalledWith("rpc_resources__transfer_ownership", {
      p_resource_type: "dashboard",
      p_resource_id: "dash-1",
      p_new_owner_id: "user-2",
    });
  });

  it("returns the moved count from a bulk transfer", async () => {
    rpcMock.mockResolvedValueOnce({ data: 3, error: null });

    const moved = await PrivateResourceAdminClient.transferAllOwnedResources({
      workspaceId: "ws-1" as never,
      fromUserId: "user-1",
      newOwnerId: "user-2",
    });

    expect(rpcMock).toHaveBeenCalledWith(
      "rpc_workspaces__transfer_all_owned_resources",
      {
        p_workspace_id: "ws-1",
        p_from_user_id: "user-1",
        p_new_owner_id: "user-2",
      },
    );
    expect(moved).toBe(3);
  });

  it("treats a null bulk-transfer result as zero moved", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });

    const moved = await PrivateResourceAdminClient.transferAllOwnedResources({
      workspaceId: "ws-1" as never,
      fromUserId: "user-1",
      newOwnerId: "user-2",
    });

    expect(moved).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/clients/permissions/PrivateResourceAdminClient.test.ts
```

Expected: FAIL, cannot resolve `@/clients/permissions/PrivateResourceAdminClient`.

- [ ] **Step 3: Implement the client**

Create `src/clients/permissions/PrivateResourceAdminClient.ts`:

```typescript
import { createServiceClient, withSupabaseClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withNewMembers } from "@avandar/modules";
import { withQueryHooks } from "@avandar/query-hooks";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { ILogger } from "@avandar/logger";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * Per-member count of resources private to that member. Counts only: workspace
 * admins are deliberately unable to see the resources themselves.
 */
export type PrivateResourceCount = {
  userId: string;
  privateDashboardCount: number;
  privateDatasetCount: number;
};

/**
 * Admin-only operations on resources that RLS hides from workspace admins.
 * Both calls are security-definer RPCs; neither returns private content.
 */
function createPrivateResourceAdminClient(supabaseClient: AvaSupabaseDBClient) {
  const baseClient = createServiceClient("PrivateResourceAdminClient").mixin(
    withSupabaseClient(supabaseClient),
  );

  const finalClient = withLogger(baseClient, (baseLogger: ILogger) => {
    const dbClient = baseClient.getDb();
    const newClient = baseClient.mixin(
      withNewMembers({
        /**
         * Loads per-member private-resource counts for a workspace. Throws when
         * the caller is not a workspace manager.
         */
        getPrivateResourceCounts: async (options: {
          workspaceId: WorkspaceId;
        }): Promise<PrivateResourceCount[]> => {
          const logger = baseLogger.appendName("getPrivateResourceCounts");
          logger.log("fetch private resource counts", options);

          const { data, error } = await dbClient.rpc(
            "rpc_workspaces__private_resource_counts",
            { p_workspace_id: options.workspaceId },
          );

          if (error) {
            throw new Error(error.message);
          }

          return (data ?? []).map((row) => {
            return {
              userId: row.user_id,
              privateDashboardCount: row.private_dashboard_count,
              privateDatasetCount: row.private_dataset_count,
            };
          });
        },

        /**
         * Reassigns a resource's owner. Grants the caller no read access to the
         * resource; the RPC writes an audit row.
         */
        transferResourceOwnership: async (options: {
          resourceType: ResourceType;
          resourceId: string;
          newOwnerId: string;
        }): Promise<void> => {
          const logger = baseLogger.appendName("transferResourceOwnership");
          logger.log("transfer resource ownership", options);

          const { error } = await dbClient.rpc(
            "rpc_resources__transfer_ownership",
            {
              p_resource_type: options.resourceType,
              p_resource_id: options.resourceId,
              p_new_owner_id: options.newOwnerId,
            },
          );

          if (error) {
            throw new Error(error.message);
          }
        },

        /**
         * Moves every resource a member owns in this workspace to a new owner.
         *
         * This is what the reassign UI calls. A per-resource picker is
         * impossible to build for an admin, who cannot see which private
         * resources exist, so offboarding transfers by owner instead.
         *
         * @returns The number of resources moved.
         */
        transferAllOwnedResources: async (options: {
          workspaceId: WorkspaceId;
          fromUserId: string;
          newOwnerId: string;
        }): Promise<number> => {
          const logger = baseLogger.appendName("transferAllOwnedResources");
          logger.log("transfer all owned resources", options);

          const { data, error } = await dbClient.rpc(
            "rpc_workspaces__transfer_all_owned_resources",
            {
              p_workspace_id: options.workspaceId,
              p_from_user_id: options.fromUserId,
              p_new_owner_id: options.newOwnerId,
            },
          );

          if (error) {
            throw new Error(error.message);
          }

          return data ?? 0;
        },
      }),
    );

    return withQueryHooks(newClient, {
      queryFns: ["getPrivateResourceCounts"],
      mutationFns: ["transferResourceOwnership", "transferAllOwnedResources"],
    });
  });

  return finalClient;
}

export const PrivateResourceAdminClient = createPrivateResourceAdminClient(
  AvaSupabase.db(),
);
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run src/clients/permissions/PrivateResourceAdminClient.test.ts
```

Expected: 5 tests pass.

If the mock does not intercept because the client is constructed at import time,
match the mocking style already used in
`src/clients/permissions/ResourceShareClient.test.ts` rather than inventing a
new one.

- [ ] **Step 5: Commit**

```bash
git add src/clients/permissions/PrivateResourceAdminClient.ts \
        src/clients/permissions/PrivateResourceAdminClient.test.ts
git commit -m "feat(clients): add PrivateResourceAdminClient"
```

---

## Task 12: `PrivateResourcesPanel` and the reassign modal

**Files:**

- Create: `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivateResourcesPanel/PrivateResourcesPanel.tsx`
- Create: `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivateResourcesPanel/ReassignOwnerModal.tsx`
- Create: `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivateResourcesPanel/PrivateResourcesPanel.test.tsx`
- Modify: `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.tsx`

- [ ] **Step 1: Write the failing test**

Create `.../PrivateResourcesPanel/PrivateResourcesPanel.test.tsx`. Model the
render harness on the existing
`src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.test.tsx`; read it
first and reuse its providers verbatim.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useGetPrivateResourceCounts = vi.fn();

vi.mock("@/clients/permissions/PrivateResourceAdminClient", () => {
  return {
    PrivateResourceAdminClient: {
      useGetPrivateResourceCounts,
      useTransferAllOwnedResources: () => {
        return [vi.fn(), false];
      },
      QueryKeys: {
        getPrivateResourceCounts: () => {
          return ["private-resource-counts"];
        },
      },
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", name: "Acme", slug: "acme", ownerId: "user-1" };
    },
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      useGetUsersForWorkspace: () => {
        return [
          [
            { userId: "user-1", displayName: "Pablo", fullName: "Pablo S" },
            { userId: "user-2", displayName: "Amara", fullName: "Amara K" },
          ],
          false,
        ];
      },
      QueryKeys: { getUsersForWorkspace: () => ["users"] },
    },
  };
});

const { PrivateResourcesPanel } = await import("./PrivateResourcesPanel");

describe("PrivateResourcesPanel", () => {
  it("renders a row per member with their counts", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        { userId: "user-1", privateDashboardCount: 2, privateDatasetCount: 5 },
        { userId: "user-2", privateDashboardCount: 7, privateDatasetCount: 3 },
      ],
      false,
    ]);

    render(<PrivateResourcesPanel />);

    expect(screen.getByText("Pablo")).toBeInTheDocument();
    expect(screen.getByText("Amara")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("states plainly that content is not visible to admins", () => {
    useGetPrivateResourceCounts.mockReturnValue([[], false]);

    render(<PrivateResourcesPanel />);

    expect(
      screen.getByText(/not visible to workspace admins/i),
    ).toBeInTheDocument();
  });

  it("offers no reassign action for a member with nothing private", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        { userId: "user-1", privateDashboardCount: 0, privateDatasetCount: 0 },
        { userId: "user-2", privateDashboardCount: 1, privateDatasetCount: 0 },
      ],
      false,
    ]);

    render(<PrivateResourcesPanel />);

    expect(screen.getAllByRole("button", { name: /reassign/i })).toHaveLength(
      1,
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivateResourcesPanel/PrivateResourcesPanel.test.tsx
```

Expected: FAIL, cannot resolve `./PrivateResourcesPanel`.

- [ ] **Step 3: Implement the panel**

Create `.../PrivateResourcesPanel/PrivateResourcesPanel.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Button, Loader, Stack, Table, Text } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { PrivateResourceAdminClient } from "@/clients/permissions/PrivateResourceAdminClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ReassignOwnerModal } from "./ReassignOwnerModal";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

/**
 * Counts-only view of each member's private dashboards and datasets, plus an
 * ownership-reassignment action.
 *
 * Workspace admins deliberately cannot read resources their owner kept private,
 * which would otherwise make offboarding impossible: `owner_id` is
 * ON DELETE NO ACTION, so a member owning resources cannot be removed. This
 * panel is how an admin discovers that and resolves it without ever seeing the
 * content.
 */
export function PrivateResourcesPanel(): React.ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [reassignUserId, setReassignUserId] = useState<string | undefined>(
    undefined,
  );

  const [counts = [], isLoadingCounts] =
    PrivateResourceAdminClient.useGetPrivateResourceCounts({
      workspaceId: workspace.id as WorkspaceId,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });

  const [members = [], isLoadingMembers] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: workspace.id as WorkspaceId,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });

  const nameByUserId = useMemo((): Record<string, string> => {
    const entries = members.map((member): [string, string] => {
      return [member.userId, member.displayName || member.fullName];
    });
    return Object.fromEntries(entries);
  }, [members]);

  if (isLoadingCounts || isLoadingMembers) {
    return <Loader size="sm" />;
  }

  const rows = counts.map((row) => {
    const hasAnything =
      row.privateDashboardCount > 0 || row.privateDatasetCount > 0;
    return (
      <Table.Tr key={row.userId}>
        <Table.Td>{nameByUserId[row.userId] ?? t`Unknown user`}</Table.Td>
        <Table.Td>{row.privateDashboardCount}</Table.Td>
        <Table.Td>{row.privateDatasetCount}</Table.Td>
        <Table.Td>
          {hasAnything ? (
            <Button
              size="compact-sm"
              variant="subtle"
              onClick={() => {
                setReassignUserId(row.userId);
              }}
            >
              <Trans>Reassign</Trans>
            </Button>
          ) : null}
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Stack gap="md">
      <Alert
        color="blue"
        variant="light"
        icon={<IconLock size={16} aria-hidden />}
      >
        <Text size="sm">
          <Trans>
            Counts only. Private content is never visible to workspace admins.
            You can reassign ownership without gaining access.
          </Trans>
        </Text>
      </Alert>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              <Trans>Member</Trans>
            </Table.Th>
            <Table.Th>
              <Trans>Private dashboards</Trans>
            </Table.Th>
            <Table.Th>
              <Trans>Private datasets</Trans>
            </Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>

      {reassignUserId ? (
        <ReassignOwnerModal
          fromUserId={reassignUserId}
          onClose={() => {
            setReassignUserId(undefined);
          }}
        />
      ) : null}
    </Stack>
  );
}
```

- [ ] **Step 4: Implement the reassign modal**

Create `.../PrivateResourcesPanel/ReassignOwnerModal.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { PrivateResourceAdminClient } from "@/clients/permissions/PrivateResourceAdminClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

type Props = {
  /** The member whose resources are being reassigned. */
  fromUserId: string;
  onClose: () => void;
};

/**
 * Picks a new owner for a departing member's private resources.
 *
 * The admin cannot see the resources, so this transfers by owner rather than
 * per resource: it is the only shape available without leaking what exists.
 * Bulk-by-owner is also what offboarding actually needs.
 */
export function ReassignOwnerModal({
  fromUserId,
  onClose,
}: Props): React.ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [toUserId, setToUserId] = useState<string | null>(null);

  const [members = []] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId: workspace.id as WorkspaceId,
  });

  const [transferAllOwnedResources, isTransferring] =
    PrivateResourceAdminClient.useTransferAllOwnedResources({
      queriesToInvalidate: [
        PrivateResourceAdminClient.QueryKeys.getPrivateResourceCounts({
          workspaceId: workspace.id as WorkspaceId,
        }),
      ],
      onSuccess: () => {
        notifySuccess(t`Ownership reassigned.`);
        onClose();
      },
      onError: (error: Error) => {
        notifyError({ title: t`Reassign failed`, message: error.message });
      },
    });

  const options = members
    .filter((member) => {
      return member.userId !== fromUserId;
    })
    .map((member) => {
      return {
        value: member.userId,
        label: member.displayName || member.fullName,
      };
    });

  return (
    <Modal opened onClose={onClose} title={t`Reassign private resources`}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          <Trans>
            Choose who should own this member&rsquo;s private dashboards and
            datasets. You will not gain access to them.
          </Trans>
        </Text>

        <Select
          label={t`New owner`}
          data={options}
          value={toUserId}
          onChange={setToUserId}
          searchable
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!toUserId}
            loading={isTransferring}
            onClick={() => {
              if (!toUserId) {
                return;
              }
              transferAllOwnedResources({
                workspaceId: workspace.id as WorkspaceId,
                fromUserId,
                newOwnerId: toUserId,
              });
            }}
          >
            <Trans>Reassign</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

This calls `useTransferAllOwnedResources`, which Task 8b adds. The modal
transfers **all** of a member's resources at once rather than letting the admin
pick: the admin cannot see individual private resources, so there is nothing to
pick from. That is also what offboarding actually needs.

- [ ] **Step 5: Wire the sub-tab**

In `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.tsx`, add the
import and the third tab:

```tsx
import { PrivateResourcesPanel } from "./PrivateResourcesPanel/PrivateResourcesPanel";
```

Add inside `<Tabs.List>`, after the `clarifications` tab:

```tsx
<Tabs.Tab value="private-resources">
  <Trans>Private resources</Trans>
</Tabs.Tab>
```

And after the `clarifications` panel:

```tsx
<Tabs.Panel value="private-resources" pt="md">
  <PrivateResourcesPanel />
</Tabs.Panel>
```

- [ ] **Step 6: Run the tests and type-check**

```bash
pnpm vitest run src/views/WorkspaceSettingsPage/PrivacyLogTab/
pnpm type-check
```

Expected: all tests pass, no type errors. Type-check catches the Step 3 typo and
the Step 4 interface mismatch.

- [ ] **Step 7: Commit**

```bash
git add src/views/WorkspaceSettingsPage/PrivacyLogTab/
git commit -m "feat(settings): add private resources panel with ownership reassignment"
```

The SQL landed in Tasks 7, 8, and 8b; the regenerated types in Task 10; the
client in Task 11. Nothing outside `PrivacyLogTab/` should be staged here. If
`git status` shows anything else, you have unstaged work from an earlier task.

---

## Task 13: Blocked-removal hint on the Members tab

Offboarding starts on the Members tab, so that is where an admin meets the
deadlock. Point them at the fix instead of showing a raw database error.

**Files:**

- Modify: `src/views/WorkspaceSettingsPage/WorkspaceUsersTab/WorkspaceUsersTab.tsx`

- [ ] **Step 1: Load the counts in the tab**

Add the imports:

```tsx
import { PrivateResourceAdminClient } from "@/clients/permissions/PrivateResourceAdminClient";
import { IconLock } from "@tabler/icons-react";
```

Add after the existing `roleGroups` query (around line 53):

```tsx
const [privateCounts = []] =
  PrivateResourceAdminClient.useGetPrivateResourceCounts({
    workspaceId: workspace.id,
  });

const privateResourceTotalByUserId = useMemo((): Record<string, number> => {
  const entries = privateCounts.map((row): [string, number] => {
    return [row.userId, row.privateDashboardCount + row.privateDatasetCount];
  });
  return Object.fromEntries(entries);
}, [privateCounts]);
```

Add `useMemo` to the existing `react` import if it is not already there.

- [ ] **Step 2: Pre-empt the blocked removal**

In `memberRows`, replace the `IconTrash` `onClick` body. Currently:

```tsx
                    onClick={() => {
                      modals.openConfirmModal({
                        title: t`Remove User`,
                        children: t`Are you sure you want to remove this user from the workspace?`,
                        labels: { confirm: t`Remove`, cancel: t`Cancel` },
                        confirmProps: { color: "red" },
                        onConfirm: () => {
                          removeMember({
                            workspaceId: workspace.id,
                            userId: user.userId,
                          });
                        },
                      });
                    }}
```

Replace with:

```tsx
                    onClick={() => {
                      const privateTotal =
                        privateResourceTotalByUserId[user.userId] ?? 0;

                      // A member who still owns resources cannot be removed:
                      // owner_id is ON DELETE NO ACTION. Admins cannot see
                      // private ones, so explain it and point at the fix
                      // rather than surfacing a foreign-key error.
                      if (privateTotal > 0) {
                        modals.open({
                          title: t`Reassign private resources first`,
                          children: (
                            <Stack gap="sm">
                              <Text size="sm">
                                <Trans>
                                  This member owns {privateTotal} private
                                  resources. They cannot be removed until
                                  someone else owns them. Private content is
                                  not visible to workspace admins, so reassign
                                  ownership from the Privacy log.
                                </Trans>
                              </Text>
                              <Button
                                leftSection={<IconLock size={16} />}
                                onClick={() => {
                                  modals.closeAll();
                                  navigate({
                                    to: "/$workspaceSlug/settings/$tabName",
                                    params: {
                                      workspaceSlug: workspace.slug,
                                      tabName: "privacy",
                                    },
                                  });
                                }}
                              >
                                <Trans>Go to Privacy log</Trans>
                              </Button>
                            </Stack>
                          ),
                        });
                        return;
                      }

                      modals.openConfirmModal({
                        title: t`Remove User`,
                        children: t`Are you sure you want to remove this user from the workspace?`,
                        labels: { confirm: t`Remove`, cancel: t`Cancel` },
                        confirmProps: { color: "red" },
                        onConfirm: () => {
                          removeMember({
                            workspaceId: workspace.id,
                            userId: user.userId,
                          });
                        },
                      });
                    }}
```

Add `Button`, `Stack`, and `Text` to the `@mantine/core` import if missing, and
`useNavigate` from `@tanstack/react-router` (assigned to `navigate`) if the
component does not already have it.

- [ ] **Step 3: Verify**

```bash
pnpm vitest run src/views/WorkspaceSettingsPage/
pnpm type-check
pnpm lint
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/views/WorkspaceSettingsPage/WorkspaceUsersTab/WorkspaceUsersTab.tsx
git commit -m "feat(settings): explain blocked member removal and link to reassignment"
```

---

## Task 13b: End-to-end proof of the guarantee

Spec §7.3. The pgTAP tests prove the predicate and the policies; this proves the
whole stack, including that no client-side list or route leaks a private
resource. Worth its cost because it is _the_ guarantee of the phase.

**Files:**

- Create: `tests/e2e/private-resource-admin-cannot-read.spec.ts`
- Reference: `tests/e2e/helpers/seedDashboard.ts`, `tests/e2e/helpers/createDashboardWithDataVizBlock.ts`

- [ ] **Step 1: Read the existing e2e helpers first**

```bash
cat tests/e2e/helpers/seedDashboard.ts
ls tests/e2e/helpers/
```

Reuse the established auth and seeding fixtures. Do not invent a new
multi-user harness; find how existing specs obtain a second authenticated user
and follow it. If no such helper exists, seed the second member and their
dashboard through admin or Postgres writes, which is the sanctioned use of
direct-DB setup for pre-UI state, and drive every _assertion_ through the UI.

- [ ] **Step 2: Write the spec**

Create `tests/e2e/private-resource-admin-cannot-read.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

/**
 * The P1 guarantee, end to end: a workspace Settings Admin cannot reach a
 * dashboard another member has kept private, sees only a count of it, and can
 * reassign ownership without ever reading it.
 *
 * Spec: docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
 */
test.describe("private resources are hidden from workspace admins", () => {
  test("admin sees a count, not the dashboard, and can reassign it", async ({
    page,
  }) => {
    // ---- setup -------------------------------------------------------------
    // Seed: a workspace with a Settings Admin and a plain member, plus one
    // dashboard owned by the member with is_restricted = true and no shares.
    // Capture the dashboard id and the workspace slug for the assertions below.
    const { workspaceSlug, dashboardId, memberDisplayName } =
      await seedPrivateDashboardFixture();

    // ---- signed in as the Settings Admin -----------------------------------
    await signInAsSettingsAdmin(page);

    // The dashboard must not appear in the dashboards list.
    await page.goto(`/${workspaceSlug}/dashboards`);
    await expect(
      page.getByRole("heading", { name: "Private e2e dashboard" }),
    ).toHaveCount(0);

    // Nor be reachable by direct URL.
    await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`);
    await expect(page.getByText(/not found|do not have access/i)).toBeVisible();

    // But the count is visible in the privacy log.
    await page.goto(`/${workspaceSlug}/settings/privacy`);
    await page.getByRole("tab", { name: "Private resources" }).click();

    const memberRow = page.getByRole("row", {
      name: new RegExp(memberDisplayName),
    });
    await expect(memberRow).toContainText("1");
    await expect(
      page.getByText(/never visible to workspace admins/i),
    ).toBeVisible();

    // Reassigning moves it without ever showing its contents.
    await memberRow.getByRole("button", { name: /reassign/i }).click();
    await page.getByLabel("New owner").click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: /^reassign$/i }).click();

    await expect(page.getByText(/ownership reassigned/i)).toBeVisible();
    await expect(memberRow).toContainText("0");
  });
});
```

`seedPrivateDashboardFixture` and `signInAsSettingsAdmin` are placeholders for
whatever the existing helpers provide. **Replace them with the real helpers found
in Step 1 before running.** Do not commit the spec with those names unresolved.

- [ ] **Step 3: Run the spec**

```bash
pnpm test:e2e tests/e2e/private-resource-admin-cannot-read.spec.ts
```

Expected: PASS. If the direct-URL assertion fails because the route renders a
blank editor rather than a not-found state, that is a real finding: the loader
throws `notFound()` only when `getById` returns undefined, so confirm RLS returns
no row. Fix the route, not the test.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/private-resource-admin-cannot-read.spec.ts
git commit -m "test(e2e): prove admins cannot read private resources"
```

---

## Task 14: Update `docs/permissions-architecture.md`

The canonical permissions reference. It is currently wrong in one place
independently of this change, and this change makes it wrong in three more.

**Files:**

- Modify: `docs/permissions-architecture.md`

- [ ] **Step 1: Fix the pre-existing divergence in §4**

§4 step 1 reads:

```
1. If the user is **owner** of the workspace → `admin` (short-circuit).
```

`util__resource_effective_role` does **not** do this; it short-circuits only for
the resource owner and for `util__is_settings_admin`. Replace with:

```
1. If the user is the **resource owner** (`owner_id`) → `admin` (short-circuit).
   Note: the **workspace** owner is *not* short-circuited here. They reach
   resources via `util__can_manage_workspace_settings` in the
   `util__auth_user_may_select_*` helpers, and via
   `util__auth_user_meets_min_app_role` for INSERT.
```

- [ ] **Step 2: Narrow the Settings-Admin claims**

§2's **Settings Admin** definition, §3's precedence list item 2, and §4 step 2
all describe the Settings-Admin short-circuit as unconditional. Add this
qualification to each:

```
This short-circuit does **not** apply to resources that are **private to their
owner**: `is_restricted = true` with no `resource_shares` row granting any
principal other than the owner. Public dashboards are exempt from that
exclusion, since the anon policy already exposes them. Mirrors Google Drive:
an organisation admin cannot read an employee's private document.
```

- [ ] **Step 3: Add the term to §2 Vocabulary**

After the **Restriction (`is_restricted`)** entry:

```
**Private to owner** - A resource with `is_restricted = true` and no
`resource_shares` row whose principal is anyone other than the owner. Readable
by its owner alone: not by Settings Admins, not by the workspace owner.
Computed by `util__is_resource_private_to_owner`, or by
`util__has_non_owner_share` when the caller already holds the row. A public
dashboard is never private however `is_restricted` is set.
```

- [ ] **Step 4: Update §5, §9, and §10**

In §5's function list, add `util__has_non_owner_share`,
`util__is_resource_private_to_owner`,
`rpc_workspaces__private_resource_counts`, and
`rpc_resources__transfer_ownership`.

In §9, the "Dashboard visible only to me" recipe is now literally true. Append:

```
As of the private-resource hardening this is a real guarantee: Settings Admins
and the workspace owner are excluded too. An admin can see a *count* of your
private resources in Workspace settings → Privacy log, and can reassign
ownership, but can never read them.
```

In §10 Anti-patterns / non-goals, add:

```
- No admin read access to resources private to their owner, and no break-glass
  path. Admins get counts and ownership transfer only.
```

- [ ] **Step 5: Update the §11 discovery commands**

Add to the `rg` block:

```bash
rg 'util__(has_non_owner_share|is_resource_private_to_owner)' supabase/schemas src
rg 'rpc_(workspaces__private_resource_counts|resources__transfer_ownership)' supabase src
```

- [ ] **Step 6: Commit**

```bash
git add docs/permissions-architecture.md
git commit -m "docs: record private-resource semantics in permissions architecture"
```

---

## Task 15: Extract i18n messages and run full verification

**Files:**

- Modify: `src/i18n/locales/*/messages.po`

- [ ] **Step 1: Extract new messages**

```bash
pnpm i18n:extract
```

- [ ] **Step 2: Confirm the new strings landed**

```bash
grep -c "Private resources" src/i18n/locales/en/messages.po
```

Expected: at least 1. If 0, a string is missing its `<Trans>` or `t\`\`` wrapper.

- [ ] **Step 3: Run every verification gate**

Run each and confirm it passes before claiming the task done. Paste real output;
do not assume.

```bash
pnpm test:db
pnpm test:frontend
pnpm test:e2e tests/e2e/private-resource-admin-cannot-read.spec.ts
pnpm type-check
pnpm lint
pnpm i18n:check
```

- [ ] **Step 4: Confirm the pre-deploy blast-radius query is ready**

The spec requires measuring how many existing resources become invisible before
deploying. Confirm the self-contained query in spec §6.2 runs read-only against
production and record its result in the release PR. Do not run any write.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/
git commit -m "chore(i18n): extract private resources panel messages"
```

---

## Task 16: Write the release note

Spec §6.2 makes this a hard requirement, not a nicety: the change is retroactive
and will look like data loss.

**Files:**

- Create: `docs/release-notes/2026-08-13-private-resource-hardening.md`

- [ ] **Step 1: Check where release notes live**

```bash
ls docs/release-notes/ 2>/dev/null || rg -l "release note" docs/ | head
```

If there is no such directory, put the note in the release PR description
instead and skip to Step 3.

- [ ] **Step 2: Write the note**

```markdown
# Private dashboards and datasets are now private from admins

**What changed.** A dashboard or dataset that is restricted with no shares is
now readable by its owner alone. Workspace owners and Settings Admins are
included in that exclusion. This matches Google Drive, where an organisation
admin cannot read an employee's private document.

**What you will notice.** If you are a workspace admin, resources that other
members had kept private no longer appear in your lists and are not reachable by
URL. They still exist. Nothing was deleted.

**Where to look instead.** Workspace settings → Privacy log → Private resources
shows how many private dashboards and datasets each member holds. You can
reassign ownership from there without gaining access to the content.

**Removing a member.** A member who still owns resources cannot be removed until
someone else owns them. The Members tab now says so and links to the
reassignment screen.

**Number of resources affected in your workspace:** <fill in from the §6.2
pre-deploy query>
```

- [ ] **Step 3: Commit**

```bash
git add docs/release-notes/
git commit -m "docs: add release note for private resource hardening"
```

---

## Post-plan verification checklist

Before opening the PR, confirm each of these, with output:

- [ ] `pnpm test:db` green, including all eight new or extended pgTAP files
- [ ] `pnpm test:frontend` green
- [ ] `tests/e2e/private-resource-admin-cannot-read.spec.ts` green, with the placeholder helper names replaced by real ones
- [ ] `pnpm type-check` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm i18n:check` clean
- [ ] Every generated migration reviewed for unintended `drop` statements
- [ ] Both hand-written policy migrations present (Tasks 5 and 9), since `db diff` does not capture policy changes
- [ ] The §6.2 blast-radius count recorded in the PR description
- [ ] The release note ships in the **same** deploy as the panel, per spec §6.2
- [ ] `docs/permissions-architecture.md` matches the code, including the §4 step 1 fix

## Deliberate deviations from the spec, for the reviewer

- Spec §5.2 describes ownership transfer per resource only. Task 8b adds
  `rpc_workspaces__transfer_all_owned_resources`, a bulk-by-owner wrapper, because
  an admin cannot see individual private resources and so cannot choose among
  them. The per-resource RPC remains the primitive and stays tested; the wrapper
  loops over it inside plpgsql so the membership check, the `owner_profile_id`
  update, and the audit row live in one place. Add this RPC to spec §5.2 when the
  phase lands.
- Spec §9 defers reassign-modal defaults. The modal ships with no default target,
  requiring an explicit choice, which is the safer of the two options it offered.
- Spec §7.1 asks for a `resource_shares.test.sql` extension only if the Task 5
  narrowing broke an existing assertion there. Task 6 Step 1 determines that
  empirically rather than assuming it.
