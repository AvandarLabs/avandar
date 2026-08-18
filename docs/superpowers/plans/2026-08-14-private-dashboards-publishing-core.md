# Private dashboards publishing core (P2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the machinery that lets a dashboard be published to its workspace only (visibility model, private snapshot bucket, audience-scoped viewer URLs), without shipping the control that sets it.

**Architecture:** A `dashboard_visibility` enum replaces the boolean `is_public`, which survives as a stored generated column so every existing read-side consumer keeps working. Snapshots route to one of two Storage buckets by visibility: the existing world-readable `published`, or a new `published-private` gated on `util__auth_user_may_select_dashboard`. Viewer URLs split by audience, `/d/<slugOrId>` for public and `/<workspaceSlug>/d/<slugOrId>` for workspace-only, each with its own slug uniqueness namespace.

**Tech Stack:** Postgres 15 / Supabase (declarative schema in `supabase/schemas/`, hand-written storage migrations), pgTAP, TypeScript, React, TanStack Router, Dexie (IndexedDB), Vitest, Playwright, Lingui.

**Spec:** `docs/superpowers/specs/2026-08-14-private-dashboards-publishing-core-design.md`

---

## Before you start

Read the spec. This plan implements it and does not repeat its reasoning.

**Two conventions in this repo will bite you if you skip them:**

1. **Schema changes are declarative.** You edit `supabase/schemas/*.sql` and
   *generate* the migration with `pnpm db:new-migration <name>`. You never
   hand-write a migration for `public` schema objects. Task 1 is the one place
   you edit a generated migration afterwards, and only to insert a DML backfill
   that `db diff` structurally cannot produce.

2. **Storage is the exact inverse.** Migrations touching `storage.objects` or
   `storage.buckets` are hand-written, must contain storage statements and
   *nothing else*, must be named `{timestamp}_STORAGE-<desc>.sql`, must have
   every statement idempotent, must be registered in `[db.seed] sql_paths` in
   `supabase/config.toml`, and must be mirrored into
   `supabase/schemas/99.storage.sql`. Miss the mirror and the next unrelated
   `db diff` writes a migration that silently drops your policies. That has
   already happened four times in this repo; read the header of
   `supabase/schemas/99.storage.sql` before Task 3.

**Local setup**

```bash
pnpm install
supabase start
pnpm db:reset
```

Note that the local Supabase stack is shared across every worktree of this
repo. If someone else's session runs `db:reset` while you work, your migrations
are gone and you re-run `pnpm db:reset` from your branch.

**Command reference used throughout**

| Command | What it does |
| --- | --- |
| `pnpm db:new-migration <name>` | `supabase stop` then `db diff -f <name>`; generates a migration from `supabase/schemas/` |
| `pnpm db:reset` | Rebuilds the local DB from migrations, then replays `[db.seed] sql_paths` |
| `pnpm test:db` | Runs pgTAP (`supabase test db`) |
| `pnpm db:gen-types` | Regenerates `shared/types/database.types.ts` |
| `pnpm type-check` | `tsc -b --noEmit` across the monorepo |
| `pnpm test:frontend` | Vitest for `src/` |
| `pnpm test:e2e` | Playwright |
| `pnpm desktop:sqlite:gen-migrations` | Regenerates the desktop SQLite mirror |
| `pnpm desktop:sqlite:check-migrations` | Verifies the mirror matches |
| `pnpm i18n:extract` | Extracts Lingui strings |

---

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `supabase/schemas/00.enum.dashboard_visibility.sql` | The `dashboard_visibility` enum, alone, so it sorts before the table that uses it |
| `supabase/migrations/<ts>_dashboard_visibility_model.sql` | Generated, then hand-edited to add the backfill |
| `supabase/migrations/<ts>_add_util_storage_object_dashboard_id.sql` | Generated; the helper the storage policies call. Non-storage, so it must land before the `_STORAGE` migration |
| `supabase/migrations/<ts>_STORAGE-published-private-bucket.sql` | Hand-written: the new bucket, its four policies, and the narrowed `published` policies |
| `supabase/tests/database/dashboards/dashboard_visibility_slug_namespaces.test.sql` | pgTAP: the two slug namespaces and the generated column |
| `supabase/tests/database/dashboards/storage_published_buckets.test.sql` | pgTAP: both buckets' policies, per role |
| `src/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView.tsx` | The single "You need access" surface used by every viewer route |
| `src/clients/dashboards/buildSnapshotTransitionPlan.ts` | Which bucket a publish writes and which it clears; the ordering both transitions depend on |
| `src/clients/dashboards/resolveDashboardRoute.ts` | All `<slugOrId>` branching for both viewer routes, with reads injected so it is testable |
| `src/clients/dashboards/makeDashboardRouteDeps.ts` | Binds those injected reads to the real clients |
| `src/routes/d/$slugOrId.tsx` | Public viewer route, replaces `d/$slug.tsx`; turns resolver outcomes into router calls |
| `src/routes/_auth/$workspaceSlug/d/$slugOrId.tsx` | Workspace-only viewer route, same shape |
| `src/clients/dashboards/resolveDashboardRoute.test.ts` | Vitest for every loader branch |
| `src/clients/dashboards/buildSnapshotTransitionPlan.test.ts` | Vitest for the transition ordering |
| `src/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard.test.ts` | Vitest for the surface-to-auth mapping |
| `src/clients/storage/PublicDatasetParquetStorageClient/utils.test.ts` | Vitest for bucket routing |
| `tests/e2e/dashboard-private-snapshot-bucket.spec.ts` | Playwright: the bucket really is private over HTTP |
| `tests/e2e/dashboard-viewer-role-routing.spec.ts` | Playwright: a viewer-role user lands on preview, not the editor |

**Modified**

| File | Change |
| --- | --- |
| `supabase/schemas/10.dashboards.sql` | `visibility` column, `is_public` becomes generated, two slug indexes |
| `supabase/schemas/16.utils.resource-permissions.sql` | Adds `util__storage_object_dashboard_id` |
| `supabase/schemas/99.storage.sql` | Mirrors the new and narrowed policies |
| `supabase/config.toml` | Registers the new `_STORAGE` migration in `[db.seed] sql_paths` |
| `apps/desktop/migrations/*.gen.sql` | Regenerated, then hand-edited for the enum and generated column |
| `shared/models/Dashboard/Dashboard.types.ts` | `visibility` added; `isPublic` removed from Insert/Update |
| `shared/models/Dashboard/DashboardParsers.ts` | `visibility` in the DB read schema |
| `shared/types/database.types.ts` | Regenerated |
| `supabase/functions/dashboards/DashboardsRoutes/DashboardsRoutes.ts` | Namespace-aware slug check |
| `supabase/functions/dashboards/DashboardsRoutes/DashboardsRoutes.types.ts` | `visibility` on the body, `reserved` reason |
| `supabase/functions/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.ts` | Rejects UUID-shaped slugs |
| `src/clients/storage/PublicDatasetParquetStorageClient/utils.ts` | Bucket map, both bucket names |
| `src/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient.ts` | Takes visibility; gains `deleteDatasetsForDashboard` |
| `src/clients/dexie/DexieCrudClient.types.ts` | `primaryKey` accepts an array |
| `src/clients/dexie/DexieDBVersionManager.ts` | Emits a compound Dexie key; table type follows |
| `src/clients/dexie/createDexieCrudClient.ts` | Key casts use `modelPrimaryKeyType` |
| `src/models/LocalPublicDataset/LocalPublicDataset.types.ts` | Compound primary key |
| `src/db/dexie/dexieVersions/dexieVersions.ts` | Version 8 |
| `src/db/dexie/dexieVersions/dexieVersions.test.ts` | Asserts v8 |
| `src/clients/datasets/LocalPublicDatasetClient.ts` | Compound key, visibility |
| `src/clients/datasets/LocalPublicDatasetRawDataClient.ts` | Compound key, visibility |
| `src/clients/qetl/PublicQetlClient.ts` | Visibility in the cache key and the storage calls |
| `src/clients/queries/runStructuredQuery/runStructuredQuery.ts` | Third auth variant |
| `src/views/DashboardApp/AvaPage/useAvaPageMetadata.ts` | Third auth variant |
| `src/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard.ts` | Takes the rendering surface |
| `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx` | Maps the third variant |
| `src/views/DashboardApp/DashboardEditorView/DashboardEditorView.tsx` | Passes surface `editor` |
| `src/views/DashboardApp/DashboardViewerView/DashboardViewerView.tsx` | `published` / `preview` modes |
| `src/views/DashboardApp/DashboardViewerView/useEnsurePublishedDashboardDatasets.ts` | Keys off `visibility` |
| `src/clients/dashboards/DashboardClient.ts` | `publishDashboard` takes visibility; adds `unpublishDashboard`, `fullDelete` |
| `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx` | Passes `visibility: "public"`; `reserved` copy |
| `src/views/DashboardApp/DashboardEditorView/DeleteDashboardButton.tsx` | Uses `fullDelete` |
| `src/views/DashboardApp/DashboardListView/DashboardListView.tsx` | Drops `isPublic: false` |
| `src/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.tsx` | Drops `isPublic: false` |
| `src/routes/public/dashboards/$workspaceSlug/$dashboardId.tsx` | Becomes an unconditional redirect |
| `src/routes/_auth/$workspaceSlug/dashboards/edit/$dashboardId.tsx` | Redirects non-editors to preview |
| `src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx` | Passes edit rights to the banner |

**Deleted**

| File | Why |
| --- | --- |
| `src/routes/d/$slug.tsx` | Replaced by `d/$slugOrId.tsx` |

---

# Phase 1: Database

## Task 1: The visibility model

**Files:**
- Create: `supabase/schemas/00.enum.dashboard_visibility.sql`
- Modify: `supabase/schemas/10.dashboards.sql:20` (the `is_public` column) and `:66-73` (the slug index)
- Create: `supabase/migrations/<timestamp>_dashboard_visibility_model.sql` (generated, then edited)
- Test: `supabase/tests/database/dashboards/dashboard_visibility_slug_namespaces.test.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create the directory and the file. The uuid prefix `d1` is unique to this file
so it cannot collide with the other suites that share the database inside a
transaction.

Create `supabase/tests/database/dashboards/dashboard_visibility_slug_namespaces.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Vanity slugs live in two namespaces, because they are served from two
-- different URLs (see the P2 design, section 4.3):
--
--   visibility = 'public'    -> /d/<slug>, globally unique
--   visibility = 'workspace' -> /<workspaceSlug>/d/<slug>, unique per workspace
--
-- `draft` rows are unconstrained in both, matching the old behaviour for
-- non-public dashboards.
--
insert into auth.users (id, email, aud, role)
values
  ('d1000001-0000-4000-8000-000000000001'::uuid, 'd1_owner@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values
  (
    'd1001001-0000-4000-8000-000000000001'::uuid,
    'd1000001-0000-4000-8000-000000000001'::uuid,
    'd1 workspace a',
    'd1-visibility-ws-a'
  ),
  (
    'd1001002-0000-4000-8000-000000000002'::uuid,
    'd1000001-0000-4000-8000-000000000001'::uuid,
    'd1 workspace b',
    'd1-visibility-ws-b'
  );

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('d1002001-0000-4000-8000-000000000001'::uuid, 'd1001001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, null),
  ('d1002002-0000-4000-8000-000000000002'::uuid, 'd1001002-0000-4000-8000-000000000002'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d1003001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'd1001001-0000-4000-8000-000000000001'::uuid, 'd1002001-0000-4000-8000-000000000001'::uuid, 'D1 Owner A', 'D1 Owner A'),
  ('d1003002-0000-4000-8000-000000000002'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'd1001002-0000-4000-8000-000000000002'::uuid, 'd1002002-0000-4000-8000-000000000002'::uuid, 'D1 Owner B', 'D1 Owner B');

select plan(8);

-- Helper: inserts a dashboard with an explicit visibility and slug.
create or replace function pg_temp.d1_insert_dashboard (
  p_id uuid,
  p_workspace_id uuid,
  p_profile_id uuid,
  p_visibility public.dashboard_visibility,
  p_slug text
) returns void language sql as $$
  insert into public.dashboards (
    id, workspace_id, owner_id, owner_profile_id, name, config, visibility, slug
  )
  values (
    p_id,
    p_workspace_id,
    'd1000001-0000-4000-8000-000000000001'::uuid,
    p_profile_id,
    'd1 dashboard',
    '{}'::jsonb,
    p_visibility,
    p_slug
  );
$$;

-- The generated column ------------------------------------------------------

select lives_ok(
  $$select pg_temp.d1_insert_dashboard(
      'd1004001-0000-4000-8000-000000000001'::uuid,
      'd1001001-0000-4000-8000-000000000001'::uuid,
      'd1003001-0000-4000-8000-000000000001'::uuid,
      'public'::public.dashboard_visibility,
      'd1-shared-slug'
    )$$,
  'a public dashboard with a slug inserts'
);

select is(
  (select is_public from public.dashboards where id = 'd1004001-0000-4000-8000-000000000001'::uuid),
  true,
  'is_public is derived as true for visibility = public'
);

select throws_ok(
  $$update public.dashboards
       set is_public = false
     where id = 'd1004001-0000-4000-8000-000000000001'::uuid$$,
  '428C9',
  null,
  'is_public cannot be written directly; it is generated'
);

-- The public namespace is global -------------------------------------------

select throws_ok(
  $$select pg_temp.d1_insert_dashboard(
      'd1004002-0000-4000-8000-000000000002'::uuid,
      'd1001002-0000-4000-8000-000000000002'::uuid,
      'd1003002-0000-4000-8000-000000000002'::uuid,
      'public'::public.dashboard_visibility,
      'd1-shared-slug'
    )$$,
  '23505',
  null,
  'a second public dashboard cannot take the same slug, even in another workspace'
);

-- The workspace namespace is per workspace ---------------------------------

select lives_ok(
  $$select pg_temp.d1_insert_dashboard(
      'd1004003-0000-4000-8000-000000000003'::uuid,
      'd1001001-0000-4000-8000-000000000001'::uuid,
      'd1003001-0000-4000-8000-000000000001'::uuid,
      'workspace'::public.dashboard_visibility,
      'd1-internal-slug'
    )$$,
  'a workspace dashboard can take a slug'
);

select lives_ok(
  $$select pg_temp.d1_insert_dashboard(
      'd1004004-0000-4000-8000-000000000004'::uuid,
      'd1001002-0000-4000-8000-000000000002'::uuid,
      'd1003002-0000-4000-8000-000000000002'::uuid,
      'workspace'::public.dashboard_visibility,
      'd1-internal-slug'
    )$$,
  'another workspace can take the same internal slug'
);

select throws_ok(
  $$select pg_temp.d1_insert_dashboard(
      'd1004005-0000-4000-8000-000000000005'::uuid,
      'd1001001-0000-4000-8000-000000000001'::uuid,
      'd1003001-0000-4000-8000-000000000001'::uuid,
      'workspace'::public.dashboard_visibility,
      'd1-internal-slug'
    )$$,
  '23505',
  null,
  'the same workspace cannot reuse an internal slug'
);

-- Drafts are unconstrained -------------------------------------------------

select lives_ok(
  $$select pg_temp.d1_insert_dashboard(
      'd1004006-0000-4000-8000-000000000006'::uuid,
      'd1001001-0000-4000-8000-000000000001'::uuid,
      'd1003001-0000-4000-8000-000000000001'::uuid,
      'draft'::public.dashboard_visibility,
      'd1-internal-slug'
    )$$,
  'a draft may reuse a slug already held by a published dashboard'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:db`

Expected: FAIL. The `dashboards` table has no `visibility` column, so the
helper function's insert errors with `column "visibility" of relation
"dashboards" does not exist`.

- [ ] **Step 3: Add the enum to the declarative schema**

Create `supabase/schemas/00.enum.dashboard_visibility.sql`:

```sql
/**
 * Publication state of a dashboard.
 *
 *   draft     - not published. Visible only to people who can edit it.
 *   workspace - published to the workspace, served from /<workspaceSlug>/d/<slug>,
 *               snapshots live in the `published-private` bucket.
 *   public    - world-readable, served from /d/<slug>, snapshots live in the
 *               world-readable `published` bucket.
 *
 * `dashboards.is_public` is generated from this column, so every read-side
 * consumer of the old boolean keeps working. See
 * docs/superpowers/specs/2026-08-14-private-dashboards-publishing-core-design.md
 */
create type public.dashboard_visibility as enum ('draft', 'workspace', 'public');
```

- [ ] **Step 4: Update the dashboards table in the declarative schema**

In `supabase/schemas/10.dashboards.sql`, replace the `is_public` column line:

```sql
  -- Whether the dashboard is public
  is_public boolean not null default false,
```

with:

```sql
  -- Publication state. See `00.enum.dashboard_visibility.sql`.
  visibility public.dashboard_visibility not null default 'draft',
  -- Whether the dashboard is public. Derived from `visibility` rather than
  -- stored, so the anon RLS policy in `17.rls.dashboards.sql`, the `is_public`
  -- short-circuits in `16.utils.resource-permissions.sql`, and every read-side
  -- TS call site keep working with no edit.
  --
  -- Declared immediately AFTER `visibility` on purpose: a generated column has
  -- to be able to see the column it reads. This is the one place we do not
  -- follow the "append new columns at the end" convention.
  is_public boolean generated always as (
    visibility = 'public'::public.dashboard_visibility
  ) stored not null,
```

Then replace the slug index at the bottom of the same file:

```sql
-- Globally unique vanity slug for public dashboards. Non-public dashboards
-- can hold any slug (or repeat one) freely; the constraint only kicks in
-- when `is_public = true` so vanity URLs like `/d/<slug>` resolve to at
-- most one dashboard. Publishing with a colliding slug therefore fails at
-- the DB level if the frontend check has been bypassed.
create unique index dashboards__slug_unique_when_public on public.dashboards (slug)
where
  is_public = true and
  slug is not null;
```

with:

```sql
-- Vanity slugs live in two namespaces because they are served from two URLs.
--
-- Public dashboards resolve at `/d/<slug>` for an anonymous visitor who has no
-- workspace context, so their slugs must be globally unique.
create unique index dashboards__slug_unique_when_public on public.dashboards (slug)
where
  visibility = 'public'::public.dashboard_visibility and
  slug is not null;

-- Workspace-only dashboards resolve at `/<workspaceSlug>/d/<slug>`, so they
-- only need to be unique inside their workspace. Scoping them here rather than
-- globally stops a dashboard nobody outside the workspace can see from
-- squatting a name every other tenant then cannot use.
create unique index dashboards__slug_unique_per_workspace_when_internal on public.dashboards (
  workspace_id,
  slug
)
where
  visibility = 'workspace'::public.dashboard_visibility and
  slug is not null;
```

- [ ] **Step 5: Generate the migration**

Run: `pnpm db:new-migration dashboard_visibility_model`

Expected: a new file at `supabase/migrations/<timestamp>_dashboard_visibility_model.sql`.

- [ ] **Step 6: Hand-edit the generated migration**

Open the generated file and replace its entire contents with the following.
Two things the generator cannot get right on its own, which is why this step
exists:

- `db diff` never emits DML, so the backfill is missing. Without it every
  existing public dashboard silently becomes a draft on deploy.
- The anon RLS policy and the old slug index both depend on `is_public`, so
  they have to be dropped before the column and recreated after it.

```sql
-- Replace the boolean `is_public` with a three-state `visibility` enum, and
-- bring `is_public` back as a stored generated column so every existing
-- read-side consumer keeps working untouched.
--
-- HAND-EDITED after `supabase db diff -f dashboard_visibility_model`.
-- Two corrections the generator structurally cannot make:
--
--   1. The `update` backfill below. `db diff` compares schema, never data, so
--      it emits no DML. Without this statement every dashboard that is public
--      today silently becomes a draft, un-publishing the entire product.
--   2. The drop/recreate of the anon policy and the slug index. Both depend on
--      `is_public`, so Postgres refuses to drop the column while they exist.
--
-- The declarative sources in supabase/schemas/ are still the source of truth.
-- `supabase db diff` must return empty after this migration applies.
--
drop policy if exists "Anon can read public dashboards" on public.dashboards;

drop index if exists public.dashboards__slug_unique_when_public;

create type public.dashboard_visibility as enum ('draft', 'workspace', 'public');

alter table public.dashboards
add column visibility public.dashboard_visibility not null default 'draft';

-- The backfill. Everything currently public becomes 'public'; everything else
-- is a draft, which is what `is_public = false` meant.
update public.dashboards
set
  visibility = 'public'::public.dashboard_visibility
where
  is_public = true;

alter table public.dashboards
drop column is_public;

alter table public.dashboards
add column is_public boolean generated always as (
  visibility = 'public'::public.dashboard_visibility
) stored not null;

-- Recreated verbatim from supabase/schemas/17.rls.dashboards.sql. `is_public`
-- still exists and still means the same thing, so the policy body is unchanged.
create policy "Anon can read public dashboards" on public.dashboards for
select
  to anon using (
    public.dashboards.is_public = true
  );

create unique index dashboards__slug_unique_when_public on public.dashboards (slug)
where
  visibility = 'public'::public.dashboard_visibility and
  slug is not null;

create unique index dashboards__slug_unique_per_workspace_when_internal on public.dashboards (
  workspace_id,
  slug
)
where
  visibility = 'workspace'::public.dashboard_visibility and
  slug is not null;
```

- [ ] **Step 7: Apply and run the test**

Run: `pnpm db:reset && pnpm test:db`

Expected: PASS, 8 assertions in the new file, and every pre-existing pgTAP file
still passing.

- [ ] **Step 8: Verify the declarative loop is closed**

Run: `supabase stop && PGSSLMODE=disable supabase db diff`

Expected: **empty output**. Any output means `supabase/schemas/` and the
migration disagree. In particular, a `drop policy` in that output means the
mirror in `99.storage.sql` has drifted and you must stop and fix it before
continuing.

- [ ] **Step 9: Regenerate the database types**

Run: `supabase start && pnpm db:gen-types`

Then confirm the generated column landed in `Row` only:

Run: `grep -n "is_public\|visibility" shared/types/database.types.ts | head -20`

Expected: `dashboards` shows `is_public` and `visibility` under `Row`, and
`visibility` (but **not** `is_public`) under `Insert` and `Update`. If
`is_public` still appears in `Insert`, the column did not come back as
generated and Step 6 was applied incorrectly.

- [ ] **Step 10: Commit**

```bash
git add supabase/schemas/00.enum.dashboard_visibility.sql \
        supabase/schemas/10.dashboards.sql \
        supabase/migrations/*_dashboard_visibility_model.sql \
        supabase/tests/database/dashboards/dashboard_visibility_slug_namespaces.test.sql \
        shared/types/database.types.ts
git commit -m "feat(db): add dashboard visibility enum and split slug namespaces"
```

---

## Task 2: The storage path helper

`util__storage_object_dashboard_id` extracts a dashboard id from a snapshot
object path. It has to exist before Task 3, and it has to live in its own
non-storage migration, because a `_STORAGE` migration is replayed wholesale by
the seed pass and must contain storage statements only.

**Files:**
- Modify: `supabase/schemas/16.utils.resource-permissions.sql` (append after `util__storage_object_workspace_id`, around line 802)
- Create: `supabase/migrations/<timestamp>_add_util_storage_object_dashboard_id.sql` (generated)
- Test: `supabase/tests/database/dashboards/storage_published_buckets.test.sql` (created here, extended in Task 3)

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/dashboards/storage_published_buckets.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Snapshot objects are named `dashboards/<dashboardId>/datasets/<datasetId>.parquet`
-- in both snapshot buckets. `util__storage_object_dashboard_id` is what the
-- storage policies use to get from an object name back to the dashboard whose
-- access rules apply. It returns null rather than raising on a path it does not
-- recognise, so a malformed name is a policy DENIAL instead of a storage error.
--
select plan(5);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/d2004001-0000-4000-8000-000000000001/datasets/d2007001-0000-4000-8000-000000000001.parquet'
  ),
  'd2004001-0000-4000-8000-000000000001'::uuid,
  'extracts the dashboard id from a real snapshot path'
);

select is(
  public.util__storage_object_dashboard_id (
    'workspaces/d2004001-0000-4000-8000-000000000001/datasets/x.parquet'
  ),
  null::uuid,
  'returns null when the prefix is not `dashboards`'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/d2004001-0000-4000-8000-000000000001/exports/x.parquet'
  ),
  null::uuid,
  'returns null when the third segment is not `datasets`'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/not-a-uuid/datasets/x.parquet'
  ),
  null::uuid,
  'returns null rather than raising when the id segment is not a uuid'
);

select is(
  public.util__storage_object_dashboard_id (''),
  null::uuid,
  'returns null on an empty object name'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:db`

Expected: FAIL with `function public.util__storage_object_dashboard_id(unknown) does not exist`.

- [ ] **Step 3: Add the helper to the declarative schema**

Append to `supabase/schemas/16.utils.resource-permissions.sql`, directly after
the `util__storage_object_workspace_id` function:

```sql
/**
 * Extracts a dashboard UUID from a published snapshot object path.
 *
 * Snapshot objects are named
 * `dashboards/<dashboardId>/datasets/<datasetId>.parquet` in both the
 * `published` and `published-private` buckets.
 *
 * Returns NULL for any name that does not match that shape, including a
 * non-UUID id segment. NULL is DENY in the storage policies that call this:
 * an object whose dashboard cannot be identified is not one we can prove the
 * caller may read. Returning NULL rather than casting blindly also keeps a
 * malformed upload a policy denial instead of a storage error.
 *
 * @param p_object_name The `storage.objects.name` value.
 * @returns The dashboard UUID, or NULL when the path is not a snapshot path.
 */
create or replace function public.util__storage_object_dashboard_id (
  p_object_name text
) returns uuid language sql immutable
set
  search_path = public as $$
  select case
    when split_part(p_object_name, '/', 1) = 'dashboards'
      and split_part(p_object_name, '/', 3) = 'datasets'
      and split_part(p_object_name, '/', 2) ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(p_object_name, '/', 2)::uuid
    else null
  end;
$$;
```

- [ ] **Step 4: Generate the migration**

Run: `pnpm db:new-migration add_util_storage_object_dashboard_id`

Expected: a migration containing only the `create or replace function`
statement. Open it and confirm it does **not** contain any `storage.` statement.
If it does, something else drifted and you must resolve that first.

- [ ] **Step 5: Apply and run the test**

Run: `supabase start && pnpm db:reset && pnpm test:db`

Expected: PASS, 5 assertions in the new file.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/16.utils.resource-permissions.sql \
        supabase/migrations/*_add_util_storage_object_dashboard_id.sql \
        supabase/tests/database/dashboards/storage_published_buckets.test.sql
git commit -m "feat(db): add util__storage_object_dashboard_id"
```

---

## Task 3: The private snapshot bucket and its policies

Read `supabase/schemas/99.storage.sql`'s header before starting. This task is
where the repo has historically lost policies.

**Files:**
- Create: `supabase/migrations/<timestamp>_STORAGE-published-private-bucket.sql` (hand-written)
- Modify: `supabase/config.toml` (the `[db.seed] sql_paths` array, around line 61)
- Modify: `supabase/schemas/99.storage.sql:180-224` (the `published` block)
- Test: `supabase/tests/database/dashboards/storage_published_buckets.test.sql` (extend)

- [ ] **Step 1: Extend the pgTAP test with the policy truth table**

In `supabase/tests/database/dashboards/storage_published_buckets.test.sql`,
replace `select plan(5);` with `select plan(12);` and insert the following
**between** the last `select is(... '')` assertion and `select * from finish();`:

```sql
-- The policy boundary ------------------------------------------------------
--
-- storage.objects is an ordinary RLS-protected table, so the policies are
-- testable here directly (the same approach as
-- permissions/storage_private_dataset_guard.test.sql).
--
-- NOTE what this does NOT prove: that `published-private` is actually a
-- private bucket. A bucket created with `public = true` is served through a
-- path that never consults storage.objects RLS at all, so these assertions
-- would still pass. tests/e2e/dashboard-private-snapshot-bucket.spec.ts covers
-- that over real HTTP.
--
insert into auth.users (id, email, aud, role)
values
  ('d2000001-0000-4000-8000-000000000001'::uuid, 'd2_owner@test.dev', 'authenticated', 'authenticated'),
  ('d2000002-0000-4000-8000-000000000002'::uuid, 'd2_shared@test.dev', 'authenticated', 'authenticated'),
  ('d2000003-0000-4000-8000-000000000003'::uuid, 'd2_member@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values
  (
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'd2000001-0000-4000-8000-000000000001'::uuid,
    'd2 workspace',
    'd2-storage-ws'
  );

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('d200cf01-0000-4000-8000-000000000001'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2 dashboards editor', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('d200cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'editor'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('d2002001-0000-4000-8000-000000000001'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'd200cf01-0000-4000-8000-000000000001'::uuid),
  ('d2002002-0000-4000-8000-000000000002'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2000002-0000-4000-8000-000000000002'::uuid, 'd200cf01-0000-4000-8000-000000000001'::uuid),
  ('d2002003-0000-4000-8000-000000000003'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2000003-0000-4000-8000-000000000003'::uuid, 'd200cf01-0000-4000-8000-000000000001'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d2003001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2002001-0000-4000-8000-000000000001'::uuid, 'D2 Owner', 'D2 Owner'),
  ('d2003002-0000-4000-8000-000000000002'::uuid, 'd2000002-0000-4000-8000-000000000002'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2002002-0000-4000-8000-000000000002'::uuid, 'D2 Shared', 'D2 Shared'),
  ('d2003003-0000-4000-8000-000000000003'::uuid, 'd2000003-0000-4000-8000-000000000003'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2002003-0000-4000-8000-000000000003'::uuid, 'D2 Member', 'D2 Member');

-- A workspace-published dashboard, restricted, shared with d2000002 only.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, visibility, is_restricted
)
values (
  'd2004001-0000-4000-8000-000000000001'::uuid,
  'd2001001-0000-4000-8000-000000000001'::uuid,
  'd2000001-0000-4000-8000-000000000001'::uuid,
  'd2003001-0000-4000-8000-000000000001'::uuid,
  'd2 internal dashboard',
  '{}'::jsonb,
  'workspace'::public.dashboard_visibility,
  true
);

insert into public.resource_shares (
  resource_type, resource_id, workspace_id, principal_type, principal_id, role
)
values (
  'dashboard'::public.resource_type,
  'd2004001-0000-4000-8000-000000000001'::uuid,
  'd2001001-0000-4000-8000-000000000001'::uuid,
  'user'::public.share_principal_type,
  'd2000002-0000-4000-8000-000000000002'::uuid,
  'viewer'::public.role_level
);

insert into storage.buckets (id, name, public)
values
  ('published', 'published', true),
  ('published-private', 'published-private', false)
on conflict (id) do nothing;

insert into storage.objects (bucket_id, name, owner)
values
  (
    'published-private',
    'dashboards/d2004001-0000-4000-8000-000000000001/datasets/d2007001-0000-4000-8000-000000000001.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  );

-- A member with no share cannot read the private snapshot -------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
  ),
  0,
  'a workspace member with no share cannot see a published-private object'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/d2004001-0000-4000-8000-000000000001/datasets/d2007002-0000-4000-8000-000000000002.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a member with no share cannot write into the private bucket'
);

-- ...but a member with a viewer share can read it --------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
  ),
  1,
  'a member with a viewer share can see the published-private object'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/d2004001-0000-4000-8000-000000000001/datasets/d2007003-0000-4000-8000-000000000003.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a viewer share grants read but not write on the private bucket'
);

-- The owner (an editor on the row) can write and delete --------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000001-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/d2004001-0000-4000-8000-000000000001/datasets/d2007004-0000-4000-8000-000000000004.parquet'
    )$$,
  'the dashboard owner can write into the private bucket'
);

select lives_ok(
  $$delete from storage.objects
     where bucket_id = 'published-private'
       and name = 'dashboards/d2004001-0000-4000-8000-000000000001/datasets/d2007004-0000-4000-8000-000000000004.parquet'$$,
  'the dashboard owner can delete from the private bucket, which is what makes cleanup possible'
);

-- The public bucket no longer accepts writes from just anyone --------------
-- (defect D1: its INSERT/UPDATE policies used to check the path shape only)

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/d2004001-0000-4000-8000-000000000001/datasets/d2007005-0000-4000-8000-000000000005.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a non-editor cannot overwrite another dashboard''s public snapshot'
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:db`

Expected: FAIL. The `published-private` bucket has no policies, so the owner's
insert is rejected and the "owner can write" assertion fails. The public-bucket
assertion also fails, because the current policy admits any authenticated user.

- [ ] **Step 3: Write the storage migration**

The filename timestamp must sort after the `add_util_storage_object_dashboard_id`
migration from Task 2. Use a timestamp in `YYYYMMDDHHMMSS` form.

Create `supabase/migrations/<timestamp>_STORAGE-published-private-bucket.sql`:

```sql
-- Add the `published-private` bucket for workspace-only dashboard snapshots,
-- and close two holes in the existing `published` bucket.
--
-- WHY THIS FILE IS `_STORAGE`-PREFIXED AND LISTED IN config.toml
--
-- It does double duty, which is the convention for every storage migration
-- here (see the supabase-declarative-schema skill):
--
--   1. MIGRATION pass. Applies to remote databases in timestamp order, which
--      is the only way a deployed environment ever gets these policies.
--   2. SEED pass. `supabase db reset` resets the storage schema AFTER running
--      migrations, so `[db.seed] sql_paths` in supabase/config.toml re-runs the
--      `_STORAGE` migrations to put them back.
--
-- Serving both passes is why the file contains storage statements and nothing
-- else, and why every statement is idempotent. The helper it calls,
-- public.util__storage_object_dashboard_id, is created in its own non-storage
-- migration which must appear EARLIER in the timeline.
--
-- WHAT CHANGES ON THE `published` BUCKET
--
--   * A DELETE policy is added. There was none, and no code path removed
--     objects, so snapshots outlived the dashboards they came from
--     indefinitely. Cleanup on delete and on downgrade both need this.
--   * INSERT and UPDATE are narrowed. They used to check the path shape only:
--     `bucket_id = 'published' and foldername[3] = 'datasets'`, with no
--     reference to the dashboard or the caller. Any authenticated user in any
--     workspace could overwrite the parquet behind any published dashboard in
--     the product.
--   * SELECT is unchanged. The bucket is world-readable by design; that is
--     what "published publicly" means.
--
-- The gate splits by verb in both buckets: reading a snapshot is "may I see
-- this dashboard", writing one is "may I change this dashboard".
--
insert into
  storage.buckets (id, name, public)
values
  ('published-private', 'published-private', false)
on conflict (id) do nothing;

-- Re-assert `published` so a database built from migrations alone has it even
-- if an earlier migration was skipped. It stays public: true.
insert into
  storage.buckets (id, name, public)
values
  ('published', 'published', true)
on conflict (id) do nothing;

--
-- Bucket `published-private` (workspace-only snapshots).
--
drop policy if exists "Users can SELECT private published datasets" on storage.objects;

create policy "Users can SELECT private published datasets" on storage.objects for
select
  to authenticated using (
    bucket_id = 'published-private' and
    public.util__auth_user_may_select_dashboard (
      public.util__storage_object_dashboard_id (name)
    )
  );

drop policy if exists "Users can UPLOAD private published datasets" on storage.objects;

create policy "Users can UPLOAD private published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published-private' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  );

drop policy if exists "Users can UPDATE private published datasets" on storage.objects;

create policy "Users can UPDATE private published datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'published-private' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  )
with
  check (
    bucket_id = 'published-private' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  );

drop policy if exists "Users can DELETE private published datasets" on storage.objects;

create policy "Users can DELETE private published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published-private' and
  public.util__auth_user_can_update_resource (
    'dashboard'::public.resource_type,
    public.util__storage_object_dashboard_id (name)
  )
);

--
-- Bucket `published` (world-readable snapshots). SELECT unchanged; writes
-- narrowed; DELETE added.
--
drop policy if exists "Anyone can SELECT published datasets" on storage.objects;

create policy "Anyone can SELECT published datasets" on storage.objects for
select
  to authenticated,
  anon using (
    bucket_id = 'published' and
    (
      storage.foldername (name)
    ) [3] = 'datasets'
  );

drop policy if exists "Authenticated users can UPLOAD published datasets" on storage.objects;

create policy "Authenticated users can UPLOAD published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  );

drop policy if exists "Authenticated users can UPDATE published datasets" on storage.objects;

create policy "Authenticated users can UPDATE published datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'published' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  )
with
  check (
    bucket_id = 'published' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  );

drop policy if exists "Authenticated users can DELETE published datasets" on storage.objects;

create policy "Authenticated users can DELETE published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published' and
  public.util__auth_user_can_update_resource (
    'dashboard'::public.resource_type,
    public.util__storage_object_dashboard_id (name)
  )
);
```

- [ ] **Step 4: Register the migration in the seed replay**

In `supabase/config.toml`, change the `sql_paths` array to:

```toml
sql_paths = [
  "./migrations/20260813214231_STORAGE-restore-dropped-object-policies.sql",
  "./migrations/<timestamp>_STORAGE-published-private-bucket.sql",
]
```

Order matters and it is not timestamp order: later entries overwrite policies
created by earlier ones. This file narrows policies the restore file creates,
so it must come after it. Substitute the real filename; a path matching no file
is a **warning**, not an error, and would silently leave the bucket with no
policies at all.

- [ ] **Step 5: Mirror the policies into the declarative schema**

In `supabase/schemas/99.storage.sql`, replace the entire `published` block
(the comment beginning `-- Bucket \`published\`` through the closing of the
`"Authenticated users can UPDATE published datasets"` policy) with:

```sql
--
-- Bucket `published` (public, world-readable snapshots of published
-- dashboards). SELECT is by path shape only: anything readable here is public
-- by construction, which is what publishing publicly means.
--
-- Writes are gated on edit rights on the dashboard the object belongs to.
-- They used to check the path shape only, which let any authenticated user in
-- any workspace overwrite any published dashboard's snapshot.
--
create policy "Anyone can SELECT published datasets" on storage.objects for
select
  to authenticated,
  anon using (
    bucket_id = 'published' and
    (
      storage.foldername (name)
    ) [3] = 'datasets'
  );

create policy "Authenticated users can UPLOAD published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  );

create policy "Authenticated users can UPDATE published datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'published' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  )
with
  check (
    bucket_id = 'published' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  );

create policy "Authenticated users can DELETE published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published' and
  public.util__auth_user_can_update_resource (
    'dashboard'::public.resource_type,
    public.util__storage_object_dashboard_id (name)
  )
);

--
-- Bucket `published-private` (workspace-only snapshots). Same object paths as
-- `published`; only the bucket varies with visibility. SELECT is exactly "may
-- this user see the dashboard", so a workspace member with no share on a
-- restricted dashboard cannot read its data either.
--
create policy "Users can SELECT private published datasets" on storage.objects for
select
  to authenticated using (
    bucket_id = 'published-private' and
    public.util__auth_user_may_select_dashboard (
      public.util__storage_object_dashboard_id (name)
    )
  );

create policy "Users can UPLOAD private published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published-private' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  );

create policy "Users can UPDATE private published datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'published-private' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  )
with
  check (
    bucket_id = 'published-private' and
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (name)
    )
  );

create policy "Users can DELETE private published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published-private' and
  public.util__auth_user_can_update_resource (
    'dashboard'::public.resource_type,
    public.util__storage_object_dashboard_id (name)
  )
);
```

- [ ] **Step 6: Apply and run the test**

Run: `pnpm db:reset && pnpm test:db`

Expected: PASS, 12 assertions in `storage_published_buckets.test.sql`.

- [ ] **Step 7: Verify the policies actually exist on the database**

Run:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname;"
```

Expected: 16 rows, including all four `... private published datasets` policies
and all four `... published datasets` policies. If any are missing, the
`sql_paths` entry in Step 4 does not match a real filename.

- [ ] **Step 8: Verify the declarative loop is closed**

Run: `supabase stop && PGSSLMODE=disable supabase db diff`

Expected: **empty output**. A `drop policy` here means the mirror in Step 5 does
not match the migration in Step 3.

- [ ] **Step 9: Commit**

```bash
supabase start
git add supabase/migrations/*_STORAGE-published-private-bucket.sql \
        supabase/config.toml \
        supabase/schemas/99.storage.sql \
        supabase/tests/database/dashboards/storage_published_buckets.test.sql
git commit -m "feat(db): add the published-private bucket and gate snapshot writes"
```

---

## Task 4: The desktop SQLite mirror

**Files:**
- Modify: `apps/desktop/migrations/<generated>.gen.sql`

- [ ] **Step 1: Regenerate the mirror**

Run: `pnpm desktop:sqlite:gen-migrations`

Expected: new `.gen.sql` files for the migrations from Tasks 1 to 3. The
generator may print warnings; read them.

- [ ] **Step 2: Run the checker to see what fails**

Run: `pnpm desktop:sqlite:check-migrations`

Expected: FAIL, or a generated file containing SQLite that will not execute.
Two constructs do not survive transpile, and `partition.ts` will not flag
either, because `_needsHandEdit` only routes `ADD CONSTRAINT` and `ALTER COLUMN`
statements for review and both of ours are `ADD COLUMN`:

- `create type ... as enum`. SQLite has no enums.
- `generated always as (...) stored`. SQLite supports generated columns but
  `ALTER TABLE ... ADD COLUMN` accepts only `VIRTUAL`.

- [ ] **Step 3: Hand-edit the generated file**

In the `.gen.sql` file for the visibility migration, delete the `create type`
statement entirely and rewrite the two `alter table` statements so the file
reads:

```sql
-- HAND-EDITED. Two constructs do not survive the Postgres -> SQLite transpile:
--
--   * `create type ... as enum`. SQLite has no enums, so `visibility` is TEXT.
--     The values are still constrained upstream by Postgres, and the mirror is
--     read-only for the desktop client.
--   * `generated always as (...) stored`. SQLite supports generated columns,
--     but ALTER TABLE ADD COLUMN accepts only VIRTUAL. VIRTUAL is
--     read-identical for every consumer of `is_public`.
--
-- apps/desktop/scripts/gen-sqlite-migrations does not flag either case:
-- partition.ts routes only ADD CONSTRAINT and ALTER COLUMN to needsHandEdit,
-- and both statements here are ADD COLUMN.
--
alter table "dashboards" add column "visibility" text not null default 'draft';

update "dashboards" set "visibility" = 'public' where "is_public" = 1;

alter table "dashboards" drop column "is_public";

alter table "dashboards" add column "is_public" integer generated always as (
  case when "visibility" = 'public' then 1 else 0 end
) virtual;
```

Delete any transpiled `create policy`, `drop policy`, or `create function`
statements from the Task 2 and Task 3 mirrors; SQLite has none of those
concepts and the mirror only tracks table shape.

- [ ] **Step 4: Verify the mirror**

Run: `pnpm desktop:sqlite:check-migrations`

Expected: PASS.

- [ ] **Step 5: Type-check the desktop app**

Run: `pnpm type-check:desktop`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/migrations/
git commit -m "chore(desktop): mirror the dashboard visibility migration to SQLite"
```

---

# Phase 2: Model and edge function

## Task 5: Dashboard model types

**Files:**
- Modify: `shared/models/Dashboard/Dashboard.types.ts`
- Modify: `shared/models/Dashboard/DashboardParsers.ts:28`
- Modify: `src/views/DashboardApp/DashboardListView/DashboardListView.tsx:112`
- Modify: `src/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.tsx:224`

- [ ] **Step 1: Update the model types**

In `shared/models/Dashboard/Dashboard.types.ts`, add the visibility type above
`DashboardRead`:

```ts
/**
 * Publication state of a dashboard. Mirrors the `dashboard_visibility` enum in
 * `supabase/schemas/00.enum.dashboard_visibility.sql`.
 */
export type DashboardVisibility = "draft" | "workspace" | "public";
```

In the `DashboardRead` body, add `visibility` next to `isPublic` and expand
`isPublic`'s docstring:

```ts
    /**
     * Whether the dashboard is public. Derived in Postgres from `visibility`,
     * so it is read-only: it appears on `Read` and on neither `Insert` nor
     * `Update`.
     */
    isPublic: boolean;

    /** Publication state. Write this, not `isPublic`. */
    visibility: DashboardVisibility;
```

Then replace the `modelTypes` block, since `Insert` and `Update` currently
derive from `DashboardRead` wholesale and would otherwise keep offering the
generated column:

```ts
    modelTypes: {
      Read: DashboardRead;
      Insert: SetOptional<
        Omit<DashboardRead, "isPublic">,
        "createdAt" | "id" | "isRestricted" | "updatedAt" | "visibility"
      >;
      Update: Partial<Omit<DashboardRead, "isPublic">>;
    };
```

- [ ] **Step 2: Update the parser**

In `shared/models/Dashboard/DashboardParsers.ts`, add to the DB read schema,
directly after the `is_public` line:

```ts
  visibility: z.enum(["draft", "workspace", "public"]),
```

- [ ] **Step 3: Run the type check to find the broken insert call sites**

Run: `pnpm type-check`

Expected: FAIL with two errors, one in `DashboardListView.tsx` and one in
`SaveToDashboardModal.tsx`, both saying `isPublic` does not exist in the
expected insert type.

- [ ] **Step 4: Fix both insert call sites**

In `src/views/DashboardApp/DashboardListView/DashboardListView.tsx`, delete
this line from the `Model.make("Dashboard", {...})` object:

```ts
        isPublic: false,
```

Do not replace it with anything. `visibility` is optional on insert and the
column defaults to `'draft'`, which is what `isPublic: false` meant.

Make the identical deletion in
`src/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.tsx`.

- [ ] **Step 5: Run the type check again**

Run: `pnpm type-check`

Expected: PASS.

- [ ] **Step 6: Run the frontend tests**

Run: `pnpm test:frontend`

Expected: PASS. If `SaveToDashboardModal.test.tsx` or
`DashboardEditorView.test.tsx` assert on `isPublic` in an insert payload,
update those assertions to drop the field.

- [ ] **Step 7: Commit**

```bash
git add shared/models/Dashboard/ \
        src/views/DashboardApp/DashboardListView/DashboardListView.tsx \
        src/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.tsx
git commit -m "feat(models): add dashboard visibility and make isPublic read-only"
```

---

## Task 6: Namespace-aware slug validation

**Files:**
- Modify: `supabase/functions/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.ts`
- Test: `supabase/functions/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.test.ts`
- Modify: `supabase/functions/dashboards/DashboardsRoutes/DashboardsRoutes.types.ts`
- Modify: `supabase/functions/dashboards/DashboardsRoutes/DashboardsRoutes.ts`
- Modify: `src/clients/dashboards/DashboardClient.ts:314-334`
- Modify: `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx:28-40`

- [ ] **Step 1: Write the failing test for the reserved rule**

Append to
`supabase/functions/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.test.ts`,
matching the surrounding test style in that file:

```ts
Deno.test("rejects a UUID-shaped slug so it cannot shadow a dashboard id", () => {
  // `/d/<slugOrId>` resolves a UUID-shaped segment as an id. The slug pattern
  // `^[a-z0-9-]+$` with a 64 character limit already admits a 36 character
  // UUID, so without this rule the two namespaces genuinely overlap.
  const result = validateDashboardSlug(
    "550e8400-e29b-41d4-a716-446655440000",
  );
  assertEquals(result, { isValid: false, reason: "reserved" });
});

Deno.test("still accepts a slug that merely contains hex and hyphens", () => {
  assertEquals(validateDashboardSlug("q3-2026-revenue"), undefined);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `deno test --allow-all supabase/functions/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.test.ts`

Expected: FAIL. The UUID-shaped slug currently validates as available.

- [ ] **Step 3: Add the reserved reason to the API types**

In `supabase/functions/dashboards/DashboardsRoutes/DashboardsRoutes.types.ts`,
add `"reserved"` to the reason union and `visibility` to the request body:

```ts
/** Reasons a requested dashboard slug cannot be used. */
export type DashboardSlugValidationReason =
  | "empty"
  | "spaces"
  | "invalid_characters"
  | "too_short"
  | "too_long"
  | "taken"
  /**
   * The slug is shaped like a UUID. `/d/<slugOrId>` resolves a UUID-shaped
   * segment as a dashboard id, so a slug of that shape would be unreachable
   * and would shadow a real dashboard.
   */
  | "reserved";

/** The audience a slug is being validated for. */
export type DashboardSlugVisibility = "workspace" | "public";
```

Then update the API definition's `/validate-slug` entry:

```ts
    /**
     * Check whether a dashboard slug is available for the given audience.
     *
     * Slugs live in two namespaces, because they are served from two URLs:
     * `public` slugs are globally unique (`/d/<slug>`), `workspace` slugs are
     * unique within their workspace (`/<workspaceSlug>/d/<slug>`).
     *
     * `dashboardId` excludes the dashboard being edited from the "already
     * taken" check, so re-publishing with the same slug still validates. It is
     * REQUIRED when `visibility` is `workspace`, because the workspace to scope
     * to is derived from it rather than trusted from the request.
     */
    "/validate-slug": {
      POST: {
        body: {
          slug: string;
          dashboardId?: string;
          visibility: DashboardSlugVisibility;
        };
        returnType:
          | {
              isValid: true;
            }
          | DashboardSlugValidationFailure;
      };
    };
```

- [ ] **Step 4: Implement the reserved rule**

In `validateDashboardSlug.ts`, add the constant and the check. The check goes
**after** the character-class check (so a malformed slug still reports the more
useful reason) and **before** the length checks (so a UUID never reports
"too long"):

```ts
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 64;

/**
 * A slug of this shape would be resolved as a dashboard id by `/d/<slugOrId>`,
 * so it can never be reached as a slug and would shadow a real dashboard.
 */
const UUID_SHAPED = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/** Returns the format violation for a requested dashboard vanity slug. */
export function validateDashboardSlug(
  slug: string,
): DashboardSlugValidationFailure | undefined {
  if (!slug) {
    return { isValid: false, reason: "empty" };
  }
  if (slug.includes(" ")) {
    return { isValid: false, reason: "spaces" };
  }
  if (!slug.match(/^[a-z0-9-]+$/u)) {
    return { isValid: false, reason: "invalid_characters" };
  }
  if (UUID_SHAPED.test(slug)) {
    return { isValid: false, reason: "reserved" };
  }
  if (slug.length < SLUG_MIN_LENGTH) {
    return { isValid: false, reason: "too_short", limit: SLUG_MIN_LENGTH };
  }
  return slug.length > SLUG_MAX_LENGTH ?
      { isValid: false, reason: "too_long", limit: SLUG_MAX_LENGTH }
    : undefined;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `deno test --allow-all supabase/functions/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.test.ts`

Expected: PASS.

- [ ] **Step 6: Make the route namespace-aware**

Replace the `/validate-slug` action in
`supabase/functions/dashboards/DashboardsRoutes/DashboardsRoutes.ts`:

```ts
import { propNotEq } from "@avandar/utils";
import { defineRoutes, POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { validateDashboardSlug } from "@sbfn/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.ts";
import { z } from "zod";
import type { DashboardsApi } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types.ts";

/** Defines HTTP routes for dashboard publication helpers. */
export const DashboardsRoutes = defineRoutes<DashboardsApi>("dashboards", {
  /**
   * Check whether a dashboard slug is available for the requested audience.
   *
   * Slugs live in two namespaces (see
   * `dashboards__slug_unique_when_public` and
   * `dashboards__slug_unique_per_workspace_when_internal` in
   * `supabase/schemas/10.dashboards.sql`): public slugs are globally unique,
   * workspace slugs are unique within their workspace.
   *
   * The workspace to scope to is looked up from `dashboardId` with the admin
   * client. It is deliberately not accepted from the request body: a
   * client-supplied workspace id would let a caller probe another tenant's
   * slug namespace.
   */
  "/validate-slug": {
    POST: POST("/validate-slug")
      .bodySchema({
        slug: z.string(),
        dashboardId: z.string().optional(),
        visibility: z.enum(["workspace", "public"]),
      })
      .action(
        async ({
          body: { slug, dashboardId, visibility },
          supabaseAdminClient,
        }) => {
          const validationFailure = validateDashboardSlug(slug);
          if (validationFailure) {
            return validationFailure;
          }

          let query = supabaseAdminClient
            .from("dashboards")
            .select("id")
            .eq("slug", slug)
            .eq("visibility", visibility);

          if (visibility === "workspace") {
            // Scope to the dashboard's own workspace. Without a dashboard we
            // have no workspace to scope to, and falling back to a global
            // check would report collisions that do not exist.
            if (!dashboardId) {
              return { isValid: false, reason: "taken" as const };
            }

            const { data: subject, error: subjectError } =
              await supabaseAdminClient
                .from("dashboards")
                .select("workspace_id")
                .eq("id", dashboardId)
                .maybeSingle();
            if (subjectError) {
              throw subjectError;
            }
            if (!subject) {
              return { isValid: false, reason: "taken" as const };
            }

            query = query.eq("workspace_id", subject.workspace_id);
          }

          const { data: existing, error } = await query;
          if (error) {
            throw error;
          }

          const collision =
            dashboardId ?
              (existing ?? []).find(propNotEq("id", dashboardId))
            : existing?.at(0);

          if (collision) {
            return {
              isValid: false,
              reason: "taken" as const,
            };
          }

          return { isValid: true };
        },
      ),
  },
});
```

- [ ] **Step 7: Thread visibility through the client**

In `src/clients/dashboards/DashboardClient.ts`, update `validateDashboardSlug`:

```ts
        /**
         * Check whether a dashboard slug is available for the given audience.
         * Backed by the `POST dashboards/validate-slug` edge function so the
         * lookup runs with admin privileges and isn't gated by RLS.
         *
         * Slugs live in two namespaces: `public` is global (`/d/<slug>`),
         * `workspace` is per workspace (`/<workspaceSlug>/d/<slug>`). A
         * `workspace` check needs `dashboardId` so the server can derive the
         * workspace to scope to.
         */
        validateDashboardSlug: async (options: {
          slug: string;
          visibility: "workspace" | "public";
          /**
           * The dashboard the user is currently editing. Excluded from the
           * "already taken" check so a dashboard re-publishing with its
           * existing slug still validates as available.
           */
          dashboardId?: Dashboard.Id;
        }): Promise<{ isValid: true } | DashboardSlugValidationFailure> => {
          const logger = config.clientLogger.appendName(
            "validateDashboardSlug",
          );
          logger.log("Checking dashboard slug availability", options);
          return APIClient.post({
            route: "dashboards/validate-slug",
            body: {
              slug: options.slug,
              dashboardId: options.dashboardId,
              visibility: options.visibility,
            },
          });
        },
```

- [ ] **Step 8: Add the copy for the new reason**

In
`src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx`,
add a `reserved` entry to the `matchLiteral` block (the helper is exhaustive,
so this will not compile without it):

```ts
    taken: i18n._(msg`This custom URL is already taken`),
    reserved: i18n._(
      msg`This custom URL is reserved. Try adding a word to it.`,
    ),
```

Then find the call to `validateDashboardSlug` in the same file and add
`visibility: "public"` to its arguments. P2 ships no way to request a
`workspace` slug; P3's merged modal is what passes the other value.

- [ ] **Step 9: Type-check, extract strings, and run the tests**

Run: `pnpm type-check && pnpm i18n:extract && pnpm test:frontend`

Expected: all PASS, and `src/i18n/locales/en/messages.po` gains the reserved
string.

- [ ] **Step 10: Commit**

```bash
git add supabase/functions/dashboards/ \
        src/clients/dashboards/DashboardClient.ts \
        src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx \
        src/i18n/locales/
git commit -m "feat(dashboards): scope slug validation to the target namespace"
```

---

# Phase 3: Storage clients and transitions

## Task 7: Bucket routing in the snapshot storage client

**Files:**
- Modify: `src/clients/storage/PublicDatasetParquetStorageClient/utils.ts`
- Create: `src/clients/storage/PublicDatasetParquetStorageClient/utils.test.ts`
- Modify: `src/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient.ts`

- [ ] **Step 1: Write the failing test**

Create `src/clients/storage/PublicDatasetParquetStorageClient/utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getOtherSnapshotBucketName,
  getPublicDatasetParquetStoragePath,
  getSnapshotBucketName,
  PRIVATE_BUCKET_NAME,
  PUBLIC_BUCKET_NAME,
} from "@/clients/storage/PublicDatasetParquetStorageClient/utils";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as DashboardId;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as DatasetId;

describe("snapshot bucket routing", () => {
  it("sends public dashboards to the world-readable bucket", () => {
    expect(getSnapshotBucketName("public")).toBe(PUBLIC_BUCKET_NAME);
  });

  it("sends workspace dashboards to the private bucket", () => {
    expect(getSnapshotBucketName("workspace")).toBe(PRIVATE_BUCKET_NAME);
  });

  it("names the opposite bucket, which is the one a transition must clear", () => {
    expect(getOtherSnapshotBucketName("public")).toBe(PRIVATE_BUCKET_NAME);
    expect(getOtherSnapshotBucketName("workspace")).toBe(PUBLIC_BUCKET_NAME);
  });

  it("uses the same object path in both buckets, so only the bucket varies", () => {
    expect(
      getPublicDatasetParquetStoragePath({
        dashboardId: DASHBOARD_ID,
        datasetId: DATASET_ID,
      }),
    ).toBe(`dashboards/${DASHBOARD_ID}/datasets/${DATASET_ID}.parquet`);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend -- utils.test.ts`

Expected: FAIL. `getSnapshotBucketName` is not exported.

- [ ] **Step 3: Implement the bucket map**

Replace the top of
`src/clients/storage/PublicDatasetParquetStorageClient/utils.ts` (keep
`getPublicDatasetParquetStoragePath` exactly as it is):

```ts
import type { DashboardId, DashboardVisibility } from "$/models/Dashboard/Dashboard.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

// Due to a Supabase bug we cannot use "public" as a bucket name, so
// we use "published" instead.
export const PUBLIC_BUCKET_NAME = "published" as const;

/**
 * Private twin of `published`, for workspace-only dashboards. Reads are gated
 * by `util__auth_user_may_select_dashboard`; see
 * `supabase/schemas/99.storage.sql`.
 */
export const PRIVATE_BUCKET_NAME = "published-private" as const;

/** The visibilities that have a snapshot bucket at all. `draft` has none. */
export type PublishedVisibility = Exclude<DashboardVisibility, "draft">;

export type SnapshotBucketName =
  | typeof PUBLIC_BUCKET_NAME
  | typeof PRIVATE_BUCKET_NAME;

/**
 * The only place that maps visibility to bucket. Callers pass visibility so no
 * call site can pick the wrong bucket by hand.
 *
 * Typed over `PublishedVisibility` rather than `DashboardVisibility` on
 * purpose: a future fourth visibility fails to compile here until someone
 * decides where its snapshots live.
 */
const BUCKET_BY_VISIBILITY = {
  public: PUBLIC_BUCKET_NAME,
  workspace: PRIVATE_BUCKET_NAME,
} as const satisfies Record<PublishedVisibility, SnapshotBucketName>;

/** The bucket a dashboard's snapshots belong in at this visibility. */
export function getSnapshotBucketName(
  visibility: PublishedVisibility,
): SnapshotBucketName {
  return BUCKET_BY_VISIBILITY[visibility];
}

/**
 * The bucket a dashboard's snapshots must be REMOVED from when it reaches this
 * visibility. Publishing writes one bucket and clears the other; leaving the
 * old copy behind is what keeps a downgraded dashboard world-readable.
 */
export function getOtherSnapshotBucketName(
  visibility: PublishedVisibility,
): SnapshotBucketName {
  return visibility === "public" ? PRIVATE_BUCKET_NAME : PUBLIC_BUCKET_NAME;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend -- utils.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 5: Take a bucket in every storage operation**

Rewrite
`src/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient.ts`.
Every function takes an explicit `bucket`, and a new
`deleteDatasetsForDashboard` clears a dashboard's whole prefix:

```ts
import { MIMEType } from "@avandar/utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import {
  getPublicDatasetParquetStoragePath,
  type SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/utils";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

/** Folder prefix holding every snapshot for one dashboard, in either bucket. */
function _getDashboardDatasetsFolder(dashboardId: DashboardId): string {
  return `dashboards/${dashboardId}/datasets`;
}

/**
 * Uploads a published dataset Parquet blob to a snapshot bucket.
 *
 * @param options.bucket Which snapshot bucket to write to. Derive it from the
 * dashboard's target visibility with `getSnapshotBucketName`; never hardcode.
 */
async function uploadDataset(options: {
  bucket: SnapshotBucketName;
  dashboardId: DashboardId;
  datasetId: DatasetId;
  parquetBlob: Blob;
}): Promise<void> {
  const { bucket, dashboardId, datasetId, parquetBlob } = options;

  const objectPath = getPublicDatasetParquetStoragePath({
    dashboardId,
    datasetId,
  });

  const { error } = await AvaSupabase.db()
    .storage.from(bucket)
    .upload(objectPath, parquetBlob, {
      contentType: MIMEType.APPLICATION_PARQUET,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Downloads a published dataset's Parquet file from a snapshot bucket.
 *
 * @param options The options for downloading the dataset's Parquet file.
 * @param options.bucket Which snapshot bucket to read from.
 * @param options.dashboardId The dashboard ID that owns this published copy.
 * @param options.datasetId The ID of the dataset to download the Parquet file
 * for.
 * @param options.throwIfNotFound Whether to throw an error if the Parquet file
 * is not found. If false, the function will return undefined if the Parquet
 * file is not found. Defaults to false (does not throw error).
 */
async function downloadDataset(options: {
  bucket: SnapshotBucketName;
  dashboardId: DashboardId;
  datasetId: DatasetId;
  throwIfNotFound?: false | undefined;
}): Promise<Blob | undefined>;
async function downloadDataset(options: {
  bucket: SnapshotBucketName;
  dashboardId: DashboardId;
  datasetId: DatasetId;
  throwIfNotFound: true;
}): Promise<Blob>;
async function downloadDataset({
  bucket,
  dashboardId,
  datasetId,
  throwIfNotFound = false,
}: {
  bucket: SnapshotBucketName;
  dashboardId: DashboardId;
  datasetId: DatasetId;
  throwIfNotFound?: boolean;
}): Promise<Blob | undefined> {
  const objectPath = getPublicDatasetParquetStoragePath({
    dashboardId,
    datasetId,
  });

  const { data: parquetBlob, error: downloadError } = await AvaSupabase.db()
    .storage.from(bucket)
    .download(objectPath);

  if (!downloadError && parquetBlob) {
    return parquetBlob;
  }

  if (throwIfNotFound) {
    const message: string = downloadError?.message ?? "Unknown download error";
    throw new Error(
      "Published parquet download failed. " +
        `Bucket: ${bucket}. ` +
        `Path: ${objectPath}. ` +
        `Error: ${message}.`,
    );
  }

  return undefined;
}

/**
 * Lists dataset IDs that have a published Parquet object under the dashboard's
 * `dashboards/{dashboardId}/datasets/` prefix in the given bucket.
 *
 * @param options.bucket Which snapshot bucket to list.
 * @param options.dashboardId The dashboard whose published datasets to list.
 */
async function listDatasetIdsForDashboard(options: {
  bucket: SnapshotBucketName;
  dashboardId: DashboardId;
}): Promise<readonly DatasetId[]> {
  const { bucket, dashboardId } = options;
  const folderPath = _getDashboardDatasetsFolder(dashboardId);

  // TODO(jpsyx): we are limiting to 1000 datasets per dashboard for now, but
  // when we switch to data cubes and dice we may need to change to something
  // more dynamic
  const pageSize = 1000;

  const collectFromOffset = async (
    offset: number,
    acc: readonly DatasetId[],
  ): Promise<readonly DatasetId[]> => {
    const { data, error } = await AvaSupabase.db()
      .storage.from(bucket)
      .list(folderPath, {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return acc;
    }

    const pageIds = data
      .filter((file) => {
        return file.name.endsWith(".parquet");
      })
      .map((file) => {
        return file.name.slice(0, -".parquet".length);
      }) as DatasetId[];

    const nextAcc = acc.concat(pageIds);

    if (data.length < pageSize) {
      return nextAcc;
    }

    return collectFromOffset(offset + pageSize, nextAcc);
  };

  return collectFromOffset(0, []);
}

/**
 * Removes every snapshot object for a dashboard from one bucket.
 *
 * Idempotent: removing objects that are already gone succeeds, so a failed
 * publish or delete can simply be retried. That property is what the
 * transition ordering in `DashboardClient` relies on.
 *
 * @param options.bucket Which snapshot bucket to clear.
 * @param options.dashboardId The dashboard whose snapshots to remove.
 */
async function deleteDatasetsForDashboard(options: {
  bucket: SnapshotBucketName;
  dashboardId: DashboardId;
}): Promise<void> {
  const { bucket, dashboardId } = options;

  const datasetIds = await listDatasetIdsForDashboard({ bucket, dashboardId });
  if (datasetIds.length === 0) {
    return;
  }

  const objectPaths = datasetIds.map((datasetId) => {
    return getPublicDatasetParquetStoragePath({ dashboardId, datasetId });
  });

  const { error } = await AvaSupabase.db()
    .storage.from(bucket)
    .remove(objectPaths);

  if (error) {
    throw new Error(
      `Failed to clear snapshots from ${bucket} for dashboard ${dashboardId}: ${error.message}`,
    );
  }
}

export const PublicDatasetParquetStorageClient = {
  uploadDataset,
  downloadDataset,
  listDatasetIdsForDashboard,
  deleteDatasetsForDashboard,
};
```

- [ ] **Step 6: Confirm the compiler found every call site**

Run: `pnpm type-check`

Expected: FAIL, with errors in `DashboardClient.ts`, `PublicQetlClient.ts`, and
`LocalPublicDatasetClient.ts`, all missing the new `bucket` argument. Those are
fixed in Tasks 9 and 11. Leave them failing and commit only what this task owns.

- [ ] **Step 7: Commit**

```bash
git add src/clients/storage/PublicDatasetParquetStorageClient/
git commit -m "refactor(storage): route snapshot reads and writes by bucket"
```

---

## Task 8: A compound key for the local snapshot cache

`LocalPublicDataset` is keyed by `datasetId` alone while storing `dashboardId`,
so two dashboards publishing the same dataset with different slices overwrite
each other. After P2 that means a private snapshot can be served into a public
dashboard's render.

The Dexie CRUD layer's runtime already handles compound key paths
(`_extractPrimaryKeyFromRow` branches on `keyPath` being an array). Only the
types and the schema-string emission need to change.

**Files:**
- Modify: `src/clients/dexie/DexieCrudClient.types.ts:12`
- Modify: `src/clients/dexie/DexieDBVersionManager.ts:10-21` and `:158-172`
- Modify: `src/clients/dexie/createDexieCrudClient.ts` (the `IDType` casts)
- Modify: `src/models/LocalPublicDataset/LocalPublicDataset.types.ts`
- Modify: `src/db/dexie/dexieVersions/dexieVersions.ts`
- Modify: `src/db/dexie/dexieVersions/dexieVersions.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/db/dexie/dexieVersions/dexieVersions.test.ts`, update the version
constant assertion and add a schema assertion. Replace `const db =
AvaDexieVersionManager.getVersion("v7");` with `const db =
AvaDexieVersionManager.getVersion("v8");`, rename the `describe` block to
`AvaDexie v8 schema`, change `expect(CURRENT_AVA_DEXIE_VERSION).toBe("v7")` to
`"v8"`, add `const v8Schemas = v7Schemas;` beside the existing
`const v7Schemas = v5Schemas;`, replace the remaining `v7Schemas` references in
that block with `v8Schemas`, and append this test inside the describe block:

```ts
  it("keys the public snapshot cache by dashboard and dataset together", () => {
    // Two dashboards can publish the same dataset with different slices. Keyed
    // by datasetId alone they overwrite each other, which after P2 means a
    // private snapshot can be served into a public dashboard's render.
    expect(db.LocalPublicDataset.schema.primKey.keyPath).toEqual([
      "dashboardId",
      "datasetId",
    ]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend -- dexieVersions.test.ts`

Expected: FAIL. `getVersion("v8")` throws `Could not find a Dexie DB with
version v8`.

- [ ] **Step 3: Let the model spec describe a compound key**

In `src/clients/dexie/DexieCrudClient.types.ts`, widen `primaryKey` in
`DefaultModelTypes`:

```ts
  /**
   * The name of the primary key of *both* the db and frontend model. They
   * should both have the same key.
   *
   * An array declares a Dexie compound primary key over those columns, in
   * order. The columns stay separate fields on the row; nothing is
   * concatenated.
   */
  primaryKey: string | readonly string[];
```

- [ ] **Step 4: Emit a compound Dexie schema string**

In `src/clients/dexie/DexieDBVersionManager.ts`, widen the imports:

```ts
import Dexie, { EntityTable, IndexableType, Table, Transaction } from "dexie";
```

Replace the `DexieModelTableRecord` helper:

```ts
/**
 * The Dexie table type for one model.
 *
 * A single-column key resolves to `EntityTable`, which is what every model
 * used before compound keys existed. A compound key cannot: `EntityTable`
 * requires its second parameter to be a `keyof T`, and an array is not one.
 * That branch names the key type directly instead.
 */
type DexieModelTable<M extends DexieCrudModelSpec> =
  M["modelPrimaryKey"] extends keyof M["DBRead"] ?
    EntityTable<M["DBRead"], M["modelPrimaryKey"]>
  : Table<M["DBRead"], M["modelPrimaryKeyType"] & IndexableType, M["DBRead"]>;

/**
 * A record of Dexie tables representing CRUD models.
 * Each key is a model name and the values are Dexie tables type definitions.
 */
type DexieModelTableRecord<M extends DexieCrudModelSpec> = UnionToIntersection<
  // we use a distributive conditional here to create a union of records, so
  // we can then intersect them all together. This way we can ensure each
  // model name is associated to its correct model type, rather than being a
  // union of all model types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M extends any ?
    {
      [K in M["modelName"]]: DexieModelTable<M>;
    }
  : never
>;
```

Then replace the schema-string emission inside `_registerDexieDBVersion`:

```ts
    objectKeys(models).forEach((modelName) => {
      const { primaryKey, columnsToIndex = [] } = models[modelName]!;
      const isCompoundKey = Array.isArray(primaryKey);

      // A compound primary key is written `[a+b]` and is inherently unique, so
      // it takes no `&` prefix; a single-column key does, to tell Dexie the
      // key is unique.
      const primaryKeySpec =
        isCompoundKey ?
          `[${(primaryKey as readonly string[]).join("+")}]`
        : `&${primaryKey as string}`;

      // Only a single-column key is implicitly indexed by its own name. The
      // components of a compound key are not, so a `columnsToIndex` entry
      // naming one of them is meaningful and must be kept.
      const columnsWithoutPrimaryKey = columnsToIndex.filter((columnName) => {
        return isCompoundKey || columnName !== primaryKey;
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore This is safe
      dexieTableDefs[modelName] = [
        primaryKeySpec,
        ...columnsWithoutPrimaryKey,
      ].join(",");
    });
```

- [ ] **Step 5: Fix the key casts in the CRUD client**

In `src/clients/dexie/createDexieCrudClient.ts`, replace every occurrence of

```ts
IDType<M["DBRead"], M["modelPrimaryKey"]>
```

with

```ts
IDType<M["DBRead"], M["modelPrimaryKeyType"]>
```

There are 10 occurrences (lines 206, 285, 309, 358, 439, 538, 569, 596, 612,
and 621). Nothing else in the file changes.

This resolves identically for existing models. `IDType<T, "datasetId">` gives
`T["datasetId"]`, and `IDType<T, DatasetId>` gives `DatasetId`, which is the
same type. For a compound key, `IDType` passes the tuple straight through,
which is what the table now expects.

- [ ] **Step 6: Give the model its compound key**

In `src/models/LocalPublicDataset/LocalPublicDataset.types.ts`, replace the
model spec:

```ts
export type LocalPublicDatasetModel = DexieCrudModelSpec<{
  modelName: "LocalPublicDataset";
  /**
   * Compound over the two columns already on the row. The same dataset can be
   * published by more than one dashboard, with a different slice each time, so
   * `datasetId` alone does not identify a cached blob.
   */
  primaryKey: ["dashboardId", "datasetId"];
  primaryKeyType: [DashboardId, DatasetId];
  dbTypes: {
    DBRead: PublicDatasetDBRead;
    DBUpdate: Partial<PublicDatasetDBRead>;
  };
  modelTypes: {
    Read: PublicDatasetDBRead;
    Update: Partial<PublicDatasetDBRead>;
  };
}>;
```

- [ ] **Step 7: Add Dexie version 8**

In `src/db/dexie/dexieVersions/dexieVersions.ts`, add to the `Schemas` type
after `v7`:

```ts
  v8: {
    version: 8;
    models: [
      LocalDatasetModel,
      LocalPublicDatasetModel,
      ConsentAuditEntry.Model,
      ClarificationAuditEntry.Model,
    ];
  };
```

Add this entry at the end of the `DBDefinitions` array, after the `<7>` entry:

```ts
  /**
   * Re-keys the public snapshot cache on [dashboardId+datasetId].
   *
   * Keyed by `datasetId` alone, two dashboards publishing the same dataset
   * with different slices overwrote each other. Once workspace-only snapshots
   * exist that also means a private snapshot can be served into a public
   * dashboard's render, and can linger after a downgrade.
   *
   * The old rows are dropped rather than migrated: they are a pure cache of
   * re-downloadable blobs, and a row keyed the old way cannot be attributed to
   * one dashboard with confidence anyway.
   */
  AvaDexieVersionManager.defineVersion<8>({
    db,
    version: 8,
    models: {
      LocalDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["userId", "workspaceId"],
      },
      LocalPublicDataset: {
        primaryKey: ["dashboardId", "datasetId"],
        columnsToIndex: ["dashboardId"],
      },
      ConsentAuditEntry: {
        primaryKey: "id",
        columnsToIndex: [
          "workspaceId",
          "userId",
          "timestamp",
          "context",
          "decision",
        ],
      },
      ClarificationAuditEntry: {
        primaryKey: "id",
        columnsToIndex: ["workspaceId", "timestamp", "outcome", "turnNumber"],
      },
    },

    upgrader: async (tx) => {
      await tx.table("LocalPublicDataset").clear();
    },
  }),
```

Finally update the exported constant at the bottom of the file:

```ts
/** Registry key for the current AvaDexie schema version. */
export const CURRENT_AVA_DEXIE_VERSION = "v8" as const satisfies keyof Schemas;
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm test:frontend -- dexieVersions.test.ts`

Expected: PASS.

- [ ] **Step 9: Type-check**

Run: `pnpm type-check`

Expected: errors only in `LocalPublicDatasetClient.ts`,
`LocalPublicDatasetRawDataClient.ts`, `PublicQetlClient.ts`, and
`DashboardClient.ts`, which Tasks 9 and 11 fix. No errors in any other Dexie
model; if `LocalDataset`, `ConsentAuditEntry`, or `ClarificationAuditEntry`
report a type error, the conditional in Step 4 is wrong and must be fixed
before continuing.

- [ ] **Step 10: Commit**

```bash
git add src/clients/dexie/ src/models/LocalPublicDataset/ src/db/dexie/
git commit -m "fix(dexie): key the public snapshot cache by dashboard and dataset"
```

---

## Task 9: Thread visibility through the snapshot caches

**Files:**
- Modify: `src/clients/datasets/LocalPublicDatasetClient.ts`
- Modify: `src/clients/datasets/LocalPublicDatasetRawDataClient.ts`
- Modify: `src/clients/qetl/PublicQetlClient.ts`

- [ ] **Step 1: Update `LocalPublicDatasetClient`**

In `src/clients/datasets/LocalPublicDatasetClient.ts`, change the mutation type
and its implementation to take a bucket and use the compound key:

```ts
type LocalPublicDatasetClientMutations = {
  /**
   * Downloads a published dataset parquet blob from the given snapshot bucket
   * and caches it in IndexedDB.
   */
  fetchPublicDatasetToIndexedDB: (params: {
    bucket: SnapshotBucketName;
    dashboardId: DashboardId;
    datasetId: DatasetId;
  }) => Promise<LocalPublicDataset>;
};
```

Add the import:

```ts
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/utils";
```

Then replace the mutation body. Note that the in-flight dedup map is now keyed
by both ids, because the same dataset can be downloading for two dashboards at
once:

```ts
      fetchPublicDatasetToIndexedDB: async (params: {
        bucket: SnapshotBucketName;
        dashboardId: DashboardId;
        datasetId: DatasetId;
      }): Promise<LocalPublicDataset> => {
        const { bucket, dashboardId, datasetId } = params;
        // Keyed by both ids: the same dataset can be downloading for two
        // dashboards at once, with a different slice in each.
        const inFlightKey = `${dashboardId}/${datasetId}`;
        const existingPromise =
          downloadsInProgressByPublicDatasetId.get(inFlightKey);
        if (existingPromise) {
          return await existingPromise;
        }

        const downloadPromise = (async () => {
          const logger = config.logger.appendName(
            "fetchPublicDatasetToIndexedDB",
          );
          logger.log("Fetching public dataset to IndexedDB", params);

          const existing = await LocalPublicDatasetClient.getById({
            id: [dashboardId, datasetId],
          });
          if (existing) {
            return existing;
          }

          const parquetBlob =
            await PublicDatasetParquetStorageClient.downloadDataset({
              bucket,
              dashboardId,
              datasetId,
              throwIfNotFound: true,
            });

          const publicDataset = await LocalPublicDatasetClient.insert({
            data: {
              dashboardId,
              datasetId,
              parquetData: parquetBlob,
              downloadedAt: new Date().toISOString(),
            },
          });

          return publicDataset;
        })().finally(() => {
          downloadsInProgressByPublicDatasetId.delete(inFlightKey);
        });

        downloadsInProgressByPublicDatasetId.set(inFlightKey, downloadPromise);
        return await downloadPromise;
      },
```

- [ ] **Step 2: Update `LocalPublicDatasetRawDataClient`**

In `src/clients/datasets/LocalPublicDatasetRawDataClient.ts`, add `bucket` to
the mutation params and thread it through. Replace the mutation type:

```ts
type LocalPublicDatasetRawDataClientMutations = {
  /**
   * Loads the given published datasets into DuckDB memory.
   *
   * @param params The load parameters.
   * @param params.bucket Which snapshot bucket the dashboard's data lives in.
   * @param params.dashboardId The published dashboard being viewed.
   * @param params.datasetIds The dataset IDs to load.
   */
  loadDatasetsToMemory: (params: {
    bucket: SnapshotBucketName;
    dashboardId: DashboardId;
    datasetIds: readonly DatasetId[];
  }) => Promise<{ loadedDatasetIds: readonly DatasetId[] }>;
};
```

Add the import alongside the others:

```ts
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/utils";
```

In the implementation, destructure `bucket` and use the compound key. Replace
the destructuring line and the two lookups:

```ts
        const { bucket, dashboardId, datasetIds } = params;
```

```ts
            const cachedDataset = await LocalPublicDatasetClient.getById({
              id: [dashboardId, datasetId],
            });
```

```ts
                publicDataset =
                  await LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
                    bucket,
                    dashboardId,
                    datasetId,
                  });
```

Task 8 fixed the IndexedDB collision, but DuckDB has the same one and it is not
fixed by a compound key. The DuckDB table **must** keep the bare `datasetId` as
its name, because published SQL references datasets by that id and
`PublicQetlClient.getDiceFromSql` matches ids against the raw SQL by substring.
So two dashboards publishing the same dataset still compete for one table, and
`hasTableOrView` makes the second one silently reuse the first one's slice.

Track which dashboard's slice is loaded and reload when it changes. Add this
above `createLocalPublicDatasetRawQueryClient`:

```ts
/**
 * Which dashboard's slice of each dataset is currently in DuckDB.
 *
 * The DuckDB table has to keep the bare `datasetId` as its name, because
 * published SQL references datasets by that id (see
 * `PublicQetlClient.getDiceFromSql`, which matches ids against the raw SQL by
 * substring). Two dashboards publishing the same dataset therefore compete for
 * one table name, and each slices it differently.
 *
 * Recording the owner lets us reload when it changes instead of serving the
 * other dashboard's rows. An entry missing entirely means the table was loaded
 * by some other path, such as live workspace data in the editor, which is also
 * not the published slice, so that case reloads too.
 */
const loadedSliceOwnerByDatasetId = new Map<DatasetId, DashboardId>();
```

Then replace the in-memory check at the top of the `promiseMap` callback:

```ts
            const isAlreadyInMemory: boolean =
              await DuckDbClient.hasTableOrView(datasetId);
            const loadedOwner = loadedSliceOwnerByDatasetId.get(datasetId);

            if (isAlreadyInMemory && loadedOwner === dashboardId) {
              return;
            }

            if (isAlreadyInMemory) {
              // Someone else's slice is sitting under this name. Drop it
              // rather than render their rows on this dashboard.
              await DuckDbClient.dropTableViewAndFile(datasetId);
            }
```

and record the owner immediately after the load:

```ts
            await DuckDbClient.loadParquet({
              tableName: datasetId,
              blob: publicDataset.parquetData,
            });
            loadedSliceOwnerByDatasetId.set(datasetId, dashboardId);
```

- [ ] **Step 3: Update `PublicQetlClient`**

In `src/clients/qetl/PublicQetlClient.ts`, add visibility to the public API and
to the client cache key, since a dashboard that changes audience within a
session must stop reading the old bucket:

```ts
export type IPublicQetlClient = Module<
  "PublicQetlClient",
  EmptyObject,
  {
    runQuery: <RowObject extends UnknownRow = UnknownRow>(params: {
      rawSql: string;
      dashboardId: DashboardId;
      visibility: PublishedVisibility;
    }) => Promise<QueryResult<RowObject>>;
  }
>;
```

Add the imports:

```ts
import {
  getSnapshotBucketName,
  type PublishedVisibility,
} from "@/clients/storage/PublicDatasetParquetStorageClient/utils";
```

Then thread it through the builder:

```ts
    const clientCache: Record<string, IQetlClient> = {};
    const _getClient = async ({
      dashboardId,
      visibility,
    }: {
      dashboardId: DashboardId;
      visibility: PublishedVisibility;
    }) => {
      // Keyed by visibility too: a dashboard that changes audience mid-session
      // must stop reading the bucket it used to live in.
      const cacheKey = `${dashboardId}/${visibility}`;
      if (clientCache[cacheKey]) {
        return clientCache[cacheKey];
      }

      const bucket = getSnapshotBucketName(visibility);

      const qetlClient = QetlClientFactory.create({
        getDiceFromSql: async (rawSql: string) => {
          const publishedDatasetIds =
            await PublicDatasetParquetStorageClient.listDatasetIdsForDashboard({
              bucket,
              dashboardId,
            });

          return publishedDatasetIds.filter((datasetId) => {
            return rawSql.includes(datasetId);
          });
        },
```

and the exported `runQuery`:

```ts
      runQuery: async <RowObject extends UnknownRow = UnknownRow>({
        rawSql,
        dashboardId,
        visibility,
      }: {
        rawSql: string;
        dashboardId: DashboardId;
        visibility: PublishedVisibility;
      }): Promise<QueryResult<RowObject>> => {
        const client = await _getClient({ dashboardId, visibility });
        const queryResults = await client.runQuery<RowObject>({ rawSql });
        return queryResults;
      },
```

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`

Expected: remaining errors only in `runStructuredQuery.ts` (no `visibility` on
the `PublicQetlClient.runQuery` call) and `DashboardClient.ts`. Tasks 10 and 11
fix those.

- [ ] **Step 5: Commit**

```bash
git add src/clients/datasets/ src/clients/qetl/
git commit -m "refactor(clients): thread snapshot visibility through the local caches"
```

---

## Task 10: The third page-metadata variant

**Files:**
- Modify: `src/views/DashboardApp/AvaPage/useAvaPageMetadata.ts`
- Modify: `src/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard.ts`
- Create: `src/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard.test.ts`
- Modify: `src/clients/queries/runStructuredQuery/runStructuredQuery.ts`
- Modify: `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx:84-92`
- Modify: `src/views/DashboardApp/DashboardEditorView/DashboardEditorView.tsx:126`
- Modify: `src/views/DashboardApp/DashboardViewerView/useEnsurePublishedDashboardDatasets.ts`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardVisibility } from "$/models/Dashboard/Dashboard.types";

function makeDashboard(visibility: DashboardVisibility): Dashboard.T {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    visibility,
    isPublic: visibility === "public",
  } as unknown as Dashboard.T;
}

describe("getAvaPageMetadataFromDashboard", () => {
  it("always reads live workspace data in the editor", () => {
    // Keying off the row alone is what made the editor of a published
    // dashboard preview its last published snapshot instead of live data.
    (["draft", "workspace", "public"] as const).forEach((visibility) => {
      expect(
        getAvaPageMetadataFromDashboard(makeDashboard(visibility), "editor"),
      ).toEqual({
        auth: "workspace",
        workspaceId: "22222222-2222-4222-8222-222222222222",
        dashboardId: "11111111-1111-4111-8111-111111111111",
      });
    });
  });

  it("reads the private snapshot for a workspace-published dashboard", () => {
    expect(
      getAvaPageMetadataFromDashboard(makeDashboard("workspace"), "published"),
    ).toEqual({
      auth: "workspace_published",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      dashboardId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("reads the public snapshot for a public dashboard", () => {
    expect(
      getAvaPageMetadataFromDashboard(makeDashboard("public"), "published"),
    ).toEqual({
      auth: "public",
      workspaceId: undefined,
      dashboardId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("falls back to live data when previewing a draft, which has no snapshot", () => {
    expect(
      getAvaPageMetadataFromDashboard(makeDashboard("draft"), "preview"),
    ).toEqual({
      auth: "workspace",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      dashboardId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("shows what a viewer would see when previewing something published", () => {
    expect(
      getAvaPageMetadataFromDashboard(makeDashboard("workspace"), "preview"),
    ).toEqual({
      auth: "workspace_published",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      dashboardId: "11111111-1111-4111-8111-111111111111",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend -- getAvaPageMetadataFromDashboard.test.ts`

Expected: FAIL. The function takes one argument and knows nothing about
`workspace_published`.

- [ ] **Step 3: Add the third metadata variant**

Replace the type and schema in
`src/views/DashboardApp/AvaPage/useAvaPageMetadata.ts`:

```ts
/**
 * Where a page's data comes from.
 *
 *   workspace           - live workspace data, through WorkspaceQetlClient.
 *   public              - the world-readable snapshot in the `published` bucket.
 *   workspace_published - the snapshot in the `published-private` bucket, which
 *                         only people who may see the dashboard can read.
 */
export type AvaPageMetadata = {
  dashboardId: Dashboard.Id;
} & (
  | {
      auth: "public";
      workspaceId?: undefined;
    }
  | {
      auth: "workspace";
      workspaceId: Workspace.Id;
    }
  | {
      auth: "workspace_published";
      workspaceId: Workspace.Id;
    }
);

const AvaPageMetadataSchema = z
  .object({
    dashboardId: uuidType<Dashboard.Id>(),
  })
  .and(
    z.discriminatedUnion("auth", [
      z.object({
        auth: z.literal("public"),
      }),
      z.object({
        auth: z.literal("workspace"),
        workspaceId: uuidType<Workspace.Id>(),
      }),
      z.object({
        auth: z.literal("workspace_published"),
        workspaceId: uuidType<Workspace.Id>(),
      }),
    ]),
  );
```

- [ ] **Step 4: Make the surface explicit**

Replace
`src/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard.ts`
entirely:

```ts
import type { AvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Where the page is being rendered. This is always known at the call site, and
 * passing it explicitly is what keeps the editor on live data.
 *
 *   editor    - the Puck editor. Always live workspace data: you cannot edit
 *               against a snapshot of your last publish.
 *   preview   - the owner's "what will viewers see" surface. Shows the snapshot
 *               when there is one, and falls back to live data for a draft.
 *   published - a real viewer route. Always a snapshot.
 */
export type AvaPageSurface = "editor" | "preview" | "published";

/**
 * Resolves which data source a dashboard render should read from.
 *
 * @param dashboard The dashboard being rendered.
 * @param surface Where it is being rendered. See {@link AvaPageSurface}.
 */
export function getAvaPageMetadataFromDashboard(
  dashboard: Dashboard.T,
  surface: AvaPageSurface,
): AvaPageMetadata {
  const isLive = surface === "editor" || dashboard.visibility === "draft";

  if (isLive) {
    return {
      auth: "workspace",
      workspaceId: dashboard.workspaceId,
      dashboardId: dashboard.id,
    };
  }

  if (dashboard.visibility === "public") {
    return {
      auth: "public",
      workspaceId: undefined,
      dashboardId: dashboard.id,
    };
  }

  return {
    auth: "workspace_published",
    workspaceId: dashboard.workspaceId,
    dashboardId: dashboard.id,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:frontend -- getAvaPageMetadataFromDashboard.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 6: Add the third query auth variant**

In `src/clients/queries/runStructuredQuery/runStructuredQuery.ts`, replace the
auth union:

```ts
/** Who is asking, which decides which QETL client answers. */
export type StructuredQueryAuth =
  | { auth: "workspace"; workspaceId: Workspace.Id }
  | { auth: "public"; publicAvaPageId: Dashboard.Id }
  | { auth: "workspace_published"; publicAvaPageId: Dashboard.Id };
```

and replace `_runRawSql`:

```ts
/** Runs already-compiled SQL against the client that matches the auth mode. */
async function _runRawSql(
  params: RunStructuredQueryParams,
  sqlToRun: string,
): Promise<QueryResult.T<UnknownRow>> {
  if (params.auth === "workspace") {
    return await WorkspaceQetlClient.runQuery({
      rawSql: sqlToRun,
      workspaceId: params.workspaceId,
    });
  }

  return await PublicQetlClient.runQuery({
    rawSql: sqlToRun,
    dashboardId: params.publicAvaPageId,
    visibility: params.auth === "public" ? "public" : "workspace",
  });
}
```

Then find the remaining `params.auth === "public"` branch further down the file
(around line 220) and widen it to `params.auth !== "workspace"`, since both
snapshot modes must take the same path. Read the surrounding code before
editing: if the branch is guarding "structured queries are not permitted for a
published page", both snapshot modes need that guard.

- [ ] **Step 7: Map the variant in `DataVizPBlock`**

In
`src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx`,
replace the auth spread:

```ts
    ...(metadata.auth === "workspace" ?
      {
        auth: "workspace" as const,
        workspaceId: metadata.workspaceId,
      }
    : metadata.auth === "workspace_published" ?
      {
        auth: "workspace_published" as const,
        publicAvaPageId: metadata.dashboardId,
      }
    : {
        auth: "public" as const,
        publicAvaPageId: metadata.dashboardId,
      }),
```

- [ ] **Step 8: Pass the surface at both call sites**

In `src/views/DashboardApp/DashboardEditorView/DashboardEditorView.tsx:126`:

```ts
  const avaPageMetadata = useMemo(() => {
    return getAvaPageMetadataFromDashboard(dashboard, "editor");
  }, [dashboard]);
```

In `src/views/DashboardApp/DashboardViewerView/DashboardViewerView.tsx`, leave
the call for now; Task 12 rewrites that file and passes the mode through.

- [ ] **Step 9: Key dataset loading off visibility**

Replace `src/views/DashboardApp/DashboardViewerView/useEnsurePublishedDashboardDatasets.ts`:

```ts
import { useQuery } from "@avandar/query-hooks";
import { useMemo } from "react";
import { extractDatasetIdsFromDashboardConfig } from "@/clients/dashboards/extractDatasetIdsFromDashboardConfig";
import { LocalPublicDatasetRawDataClient } from "@/clients/datasets/LocalPublicDatasetRawDataClient";
import { getSnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/utils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * Ensures all published dataset dependencies for a dashboard are loaded into
 * DuckDB before rendering DataViz blocks.
 *
 * A draft has no snapshot at all, so there is nothing to load; its blocks read
 * live workspace data instead.
 */
export function useEnsurePublishedDashboardDatasets(
  dashboard: Dashboard.T | undefined,
): [isLoadingDatasets: boolean, error: Error | undefined] {
  const dashboardId = dashboard?.id;
  const visibility = dashboard?.visibility;
  const isPublished = visibility !== undefined && visibility !== "draft";

  const datasetIds = useMemo(() => {
    if (dashboard && isPublished) {
      return extractDatasetIdsFromDashboardConfig(
        dashboard.config,
      ) as readonly Dataset.Id[];
    }
    return [];
  }, [dashboard, isPublished]);

  const [loadDatasetsToMemory] =
    LocalPublicDatasetRawDataClient.useLoadDatasetsToMemory();

  const [, isLoadingDatasets, loadingDatasetsQuery] = useQuery({
    queryKey: ["public-datasets", dashboardId, visibility, datasetIds],
    queryFn: async () => {
      if (!dashboardId || !isPublished || visibility === undefined) {
        return;
      }

      return await loadDatasetsToMemory.async({
        bucket: getSnapshotBucketName(visibility),
        dashboardId,
        datasetIds,
      });
    },
    enabled: !!dashboardId && isPublished && datasetIds.length > 0,
  });

  return [isLoadingDatasets, loadingDatasetsQuery.error ?? undefined];
}
```

- [ ] **Step 10: Type-check and test**

Run: `pnpm type-check && pnpm test:frontend`

Expected: the only remaining type errors are in `DashboardClient.ts` (Task 11)
and `DashboardViewerView.tsx` (Task 12).

- [ ] **Step 11: Commit**

```bash
git add src/views/DashboardApp/AvaPage/ \
        src/clients/queries/runStructuredQuery/runStructuredQuery.ts \
        src/views/DashboardApp/DashboardEditorView/DashboardEditorView.tsx \
        src/views/DashboardApp/DashboardViewerView/useEnsurePublishedDashboardDatasets.ts
git commit -m "feat(dashboards): route page data by visibility and render surface"
```

---

## Task 11: Publish, unpublish, and delete transitions

**Files:**
- Modify: `src/clients/dashboards/DashboardClient.ts`
- Create: `src/clients/dashboards/buildSnapshotTransitionPlan.test.ts`
- Modify: `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx:208-212`
- Modify: `src/views/DashboardApp/DashboardEditorView/DeleteDashboardButton.tsx:23`

- [ ] **Step 1: Write the failing test for the transition ordering**

Create `src/clients/dashboards/buildSnapshotTransitionPlan.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { buildSnapshotTransitionPlan } from "@/clients/dashboards/buildSnapshotTransitionPlan";

describe("buildSnapshotTransitionPlan", () => {
  it("writes the target bucket before clearing the other one", () => {
    // Ordering is the whole point. Clearing first would leave a window where a
    // dashboard is published with no data; writing first means the worst case
    // is a duplicate copy, which the clear step then removes.
    const plan = buildSnapshotTransitionPlan({ visibility: "workspace" });
    expect(plan).toEqual({
      uploadBucket: "published-private",
      clearBucket: "published",
    });
  });

  it("clears the private bucket when going public", () => {
    const plan = buildSnapshotTransitionPlan({ visibility: "public" });
    expect(plan).toEqual({
      uploadBucket: "published",
      clearBucket: "published-private",
    });
  });
});

describe("unpublish and delete cleanup", () => {
  it("clears both buckets", async () => {
    const deleteDatasetsForDashboard = vi.fn().mockResolvedValue(undefined);
    await clearAllSnapshotBuckets({
      dashboardId: "11111111-1111-4111-8111-111111111111",
      deleteDatasetsForDashboard,
    });

    expect(deleteDatasetsForDashboard).toHaveBeenCalledTimes(2);
    expect(deleteDatasetsForDashboard.mock.calls.map(([c]) => c.bucket).sort())
      .toEqual(["published", "published-private"]);
  });
});
```

Note the second describe block references `clearAllSnapshotBuckets`; import it
from the same new module:

```ts
import {
  buildSnapshotTransitionPlan,
  clearAllSnapshotBuckets,
} from "@/clients/dashboards/buildSnapshotTransitionPlan";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend -- buildSnapshotTransitionPlan.test.ts`

Expected: FAIL, module not found.

- [ ] **Step 3: Create the transition helper**

Extracting the ordering into its own module keeps it testable without mocking
Supabase, and keeps `DashboardClient.ts` from growing further.

Create `src/clients/dashboards/buildSnapshotTransitionPlan.ts`:

```ts
import {
  getOtherSnapshotBucketName,
  getSnapshotBucketName,
  PRIVATE_BUCKET_NAME,
  PUBLIC_BUCKET_NAME,
} from "@/clients/storage/PublicDatasetParquetStorageClient/utils";
import type {
  PublishedVisibility,
  SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/utils";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";

/** Which bucket a publish writes, and which one it must clear afterwards. */
export type SnapshotTransitionPlan = {
  uploadBucket: SnapshotBucketName;
  clearBucket: SnapshotBucketName;
};

/**
 * Resolves the two buckets a publish touches.
 *
 * The caller must upload to `uploadBucket` BEFORE clearing `clearBucket`, and
 * must flip `visibility` only after both succeed. That order prefers transient
 * breakage over transient exposure: a failure partway through leaves a
 * dashboard that renders wrong, never one whose data is readable by an
 * audience it no longer belongs to.
 */
export function buildSnapshotTransitionPlan(options: {
  visibility: PublishedVisibility;
}): SnapshotTransitionPlan {
  return {
    uploadBucket: getSnapshotBucketName(options.visibility),
    clearBucket: getOtherSnapshotBucketName(options.visibility),
  };
}

/**
 * Removes a dashboard's snapshots from both buckets.
 *
 * Used by unpublish (where the dashboard keeps existing with no data) and by
 * delete (where cleanup runs BEFORE the row is removed, so a failure leaves a
 * retriable dashboard rather than orphaned objects nothing can locate).
 *
 * @param options.deleteDatasetsForDashboard Injected so this stays testable
 * without a live Supabase client.
 */
export async function clearAllSnapshotBuckets(options: {
  dashboardId: DashboardId;
  deleteDatasetsForDashboard: (params: {
    bucket: SnapshotBucketName;
    dashboardId: DashboardId;
  }) => Promise<void>;
}): Promise<void> {
  const { dashboardId, deleteDatasetsForDashboard } = options;

  await deleteDatasetsForDashboard({
    bucket: PUBLIC_BUCKET_NAME,
    dashboardId,
  });
  await deleteDatasetsForDashboard({
    bucket: PRIVATE_BUCKET_NAME,
    dashboardId,
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend -- buildSnapshotTransitionPlan.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Rewire `publishDashboard`**

In `src/clients/dashboards/DashboardClient.ts`, add the imports:

```ts
import {
  buildSnapshotTransitionPlan,
  clearAllSnapshotBuckets,
} from "@/clients/dashboards/buildSnapshotTransitionPlan";
import type { PublishedVisibility } from "@/clients/storage/PublicDatasetParquetStorageClient/utils";
```

Change the signature and docstring:

```ts
        /**
         * Publishes a dashboard to the given audience and copies its dependent
         * dataset parquet blobs into that audience's snapshot bucket.
         *
         * Order is deliberate and must not be rearranged:
         *
         *   1. validate the slug in the TARGET namespace, before any upload,
         *      so a cross-namespace collision cannot half-publish;
         *   2. upload snapshots to the target bucket;
         *   3. clear the other bucket;
         *   4. flip `visibility`.
         *
         * A failure partway through leaves a dashboard that renders broken
         * rather than one whose data is still readable by the audience it just
         * left. Every step is idempotent, so the fix is to publish again.
         */
        publishDashboard: async (params: {
          dashboardId: Dashboard.Id;
          /**
           * Target audience. `workspace` writes to the private bucket and is
           * readable only by people who may see the dashboard; `public` writes
           * to the world-readable bucket.
           */
          visibility: PublishedVisibility;
          /**
           * Optional vanity slug. The caller is responsible for snake-casing /
           * sanitising; the server-side uniqueness constraint catches
           * collisions.
           *
           * Omit the option to preserve the current slug. Use `set` to
           * register a vanity URL or `clear` to remove the existing slug.
           */
          slug?: { action: "set"; value: string } | { action: "clear" };
          /**
           * Per-dataset slice configuration. When provided, replaces any
           * previously-persisted slice config and is also persisted into the
           * dashboard's `config` JSON blob so subsequent re-publishes default
           * to the same selection. When omitted, falls back to whatever is
           * already persisted (or the narrowest default per dataset).
           */
          publishConfig?: PublishSliceConfig.Dashboard;
        }): Promise<Dashboard.T> => {
          const {
            dashboardId,
            visibility,
            slug,
            publishConfig: incomingPublishConfig,
          } = params;
          const logger = config.clientLogger.appendName("publishDashboard");

          const dashboard = await DashboardClient.getById({
            id: dashboardId,
          });
          assertIsDefined(dashboard, { name: "dashboard" });

          const { uploadBucket, clearBucket } = buildSnapshotTransitionPlan({
            visibility,
          });

          // Step 1: fail before touching storage if the slug is taken in the
          // namespace we are moving INTO. A workspace -> public flip can
          // collide with a public slug that did not matter while the dashboard
          // was internal.
          if (slug?.action === "set") {
            const slugCheck = await DashboardClient.validateDashboardSlug({
              slug: slug.value,
              visibility,
              dashboardId,
            });
            if (!slugCheck.isValid) {
              throw new Error(
                `Cannot publish: the custom URL "${slug.value}" is not available (${slugCheck.reason}).`,
              );
            }
          }
```

Inside the existing dataset loop, every
`PublicDatasetParquetStorageClient.uploadDataset({ ... })` call (there are four,
at roughly lines 162, 198, 237, and 253) gains `bucket: uploadBucket,` as its
first property. Change the surrounding log line too:

```ts
            logger.log("Copying dataset parquet blobs to the snapshot bucket", {
              dashboardId,
              dependentDatasetIds,
              uploadBucket,
            });
```

Then, after the dataset loop closes and before the `nextConfig` computation,
add the clear step:

```ts
          // Step 3: clear the bucket this dashboard no longer belongs in.
          // Doing this AFTER the upload means the worst case is a duplicate
          // copy rather than a window with no data at all.
          await PublicDatasetParquetStorageClient.deleteDatasetsForDashboard({
            bucket: clearBucket,
            dashboardId,
          });
```

Finally replace `isPublic: true` in the update model with the enum:

```ts
          const updateModel: Partial<Dashboard.T> = {
            visibility,
            ...(slug ?
              { slug: slug.action === "set" ? slug.value : undefined }
            : {}),
            ...(nextConfig ?
              {
                config: nextConfig as unknown as Dashboard.T["config"],
              }
            : {}),
          };
```

- [ ] **Step 6: Add unpublish and fullDelete**

Add these two mutations after `validateDashboardSlug` in the same `mutations`
block. `fullDelete` mirrors `DatasetClient.fullDelete`, which is the existing
precedent for "clean storage, then delete the row".

```ts
        /**
         * Returns a dashboard to `draft` and removes its snapshots from both
         * buckets.
         *
         * Storage is cleared BEFORE the visibility flip for the same reason
         * publish clears after the upload: an unpublished dashboard with data
         * still sitting in a bucket is the failure mode worth avoiding.
         *
         * P2 ships no UI for this; the merged share modal in P3 is its first
         * caller. It exists here so P3 wires a tested API rather than building
         * the state machine and the interface at once.
         */
        unpublishDashboard: async (params: {
          dashboardId: Dashboard.Id;
        }): Promise<Dashboard.T> => {
          const { dashboardId } = params;
          const logger = config.clientLogger.appendName("unpublishDashboard");
          logger.log("Unpublishing dashboard", params);

          await clearAllSnapshotBuckets({
            dashboardId,
            deleteDatasetsForDashboard:
              PublicDatasetParquetStorageClient.deleteDatasetsForDashboard,
          });

          const dbUpdate = config.parsers.fromModelUpdateToDBUpdate({
            visibility: "draft",
          });

          const { data: updatedDBDashboard } = await config.dbClient
            .from("dashboards")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(dbUpdate as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .eq("id", dashboardId as any)
            .select("*")
            .single()
            .throwOnError();

          return config.parsers.fromDBReadToModelRead(updatedDBDashboard);
        },

        /**
         * Deletes a dashboard and its published snapshots.
         *
         * Storage cleanup runs FIRST and a failure aborts the delete. Deleting
         * the row first is what let snapshots outlive the only record that
         * could locate them; this way a failed delete is simply retried.
         *
         * Note the residual gap: a client that dies between the two steps
         * still orphans objects. Nothing sweeps that yet.
         */
        fullDelete: async (params: { id: Dashboard.Id }): Promise<void> => {
          const logger = config.clientLogger.appendName("fullDelete");
          logger.log("Deleting dashboard", params);

          await clearAllSnapshotBuckets({
            dashboardId: params.id,
            deleteDatasetsForDashboard:
              PublicDatasetParquetStorageClient.deleteDatasetsForDashboard,
          });

          await DashboardClient.delete({ id: params.id });
        },
```

Then register the new mutations at the bottom of the file:

```ts
  {
    mutationFns: [
      "publishDashboard",
      "unpublishDashboard",
      "validateDashboardSlug",
      "delete",
      "fullDelete",
    ],
  },
```

- [ ] **Step 7: Update the two callers**

In `PublishDashboardModal.tsx`, add the audience to the publish call:

```ts
    publishDashboard({
      dashboardId: currentDashboard.id,
      visibility: "public",
      ...(slugUpdate ? { slug: slugUpdate } : {}),
      publishConfig,
    });
```

In `DeleteDashboardButton.tsx`, switch the hook:

```ts
  const [deleteDashboard, isDeleting] = DashboardClient.useFullDelete({
```

The call site at line 60 already passes `{ id: dashboardId }`, which matches
`fullDelete`'s signature, so it needs no change.

- [ ] **Step 8: Type-check and test**

Run: `pnpm type-check && pnpm test:frontend`

Expected: the only remaining type error is in `DashboardViewerView.tsx`, fixed
in Task 12. If `DashboardEditorView.test.tsx` mocks `usePublishDashboard`,
update the mock's expected arguments to include `visibility: "public"`.

- [ ] **Step 9: Commit**

```bash
git add src/clients/dashboards/ \
        src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx \
        src/views/DashboardApp/DashboardEditorView/DeleteDashboardButton.tsx
git commit -m "feat(dashboards): add visibility-aware publish, unpublish, and delete"
```

---

# Phase 4: Routing

## Task 12: The access-denied surface and the viewer modes

**Files:**
- Create: `src/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView.tsx`
- Modify: `src/views/DashboardApp/DashboardViewerView/DashboardViewerView.tsx`

- [ ] **Step 1: Create the shared access-denied component**

Every viewer route needs the same answer for "you cannot see this", and the
copy must not drift between them.

Create `src/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { Paper } from "@avandar/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  /**
   * When true, offer a sign-in link. Arriving at an internal link while signed
   * into the wrong account is the common failure, and the fix is to switch
   * accounts rather than to ask anyone for access.
   */
  canSwitchAccount?: boolean;
};

/**
 * The single "you cannot see this dashboard" surface.
 *
 * Shared by `/d/$slugOrId`, `/<workspaceSlug>/d/$slugOrId`, and the viewer
 * itself so the copy cannot drift. There is deliberately no request-access
 * action; that is out of scope for P2.
 */
export function DashboardAccessDeniedView({
  canSwitchAccount = false,
}: Props): ReactNode {
  return (
    <Paper p="xxl" maw={720} mx="auto">
      <Stack gap="xs">
        <Title order={2} fw={650}>
          <Trans>You need access</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>Ask the dashboard's owner to share it with you.</Trans>
        </Text>
        {canSwitchAccount ?
          <Group mt="md">
            <Button component={Link} to="/signin" variant="outline">
              <Trans>Sign in with a different account</Trans>
            </Button>
          </Group>
        : null}
      </Stack>
    </Paper>
  );
}
```

- [ ] **Step 2: Switch the viewer to the new modes**

In `src/views/DashboardApp/DashboardViewerView/DashboardViewerView.tsx`, change
the props and the two places that read `isPublic`.

Replace the `Props` type and the destructuring:

```tsx
type Props = {
  dashboard: Dashboard.T;
  /**
   * "published" (default): a real viewer route. The loader has already decided
   *   the caller may see this dashboard, so the view does not re-derive access;
   *   it only asserts the dashboard is actually published.
   * "preview": auth-gated owner preview. Shows the snapshot when there is one
   *   and live data for a draft, plus a banner back to the editor.
   */
  mode?: "published" | "preview";
  workspaceSlug?: string;
  /** Whether the current user may edit. Controls the "Back to editor" button. */
  canEdit?: boolean;
};

/** Renders a published dashboard or an authenticated publication preview. */
export function DashboardViewerView({
  dashboard,
  mode = "published",
  workspaceSlug,
  canEdit = false,
}: Props): ReactNode {
```

Replace the metadata memo so it passes the surface through:

```tsx
  const avaPageMetadata = useMemo(() => {
    return getAvaPageMetadataFromDashboard(
      dashboard,
      mode === "preview" ? "preview" : "published",
    );
  }, [dashboard, mode]);
```

Replace the access gate. It is now an assertion rather than the access decision:

```tsx
  // Defense in depth only. The route loaders own the access decision and have
  // already made it; a draft reaching this view means a loader branch is wrong.
  if (mode === "published" && dashboard.visibility === "draft") {
    return <DashboardAccessDeniedView />;
  }
```

Replace the preview banner's status line and its button guard:

```tsx
              <Text size="xs" c="dimmed">
                {dashboard.visibility === "public" ?
                  <Trans>This dashboard is published publicly.</Trans>
                : dashboard.visibility === "workspace" ?
                  <Trans>Published to your workspace.</Trans>
                : <Trans>Not yet published. Viewers will not see this.</Trans>}
              </Text>
            </Group>
            {canEdit ?
              <Button
                size="compact-sm"
                variant="outline"
                color="neutral"
                leftSection={<IconArrowLeft size={14} />}
                onClick={() => {
                  navigate({
                    to: "/$workspaceSlug/dashboards/edit/$dashboardId",
                    params: { workspaceSlug, dashboardId: dashboard.id },
                  });
                }}
              >
                <Trans>Back to editor</Trans>
              </Button>
            : null}
```

Add the import:

```tsx
import { DashboardAccessDeniedView } from "@/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView";
```

- [ ] **Step 3: Type-check and extract strings**

Run: `pnpm type-check && pnpm i18n:extract`

Expected: `type-check` fails only in `src/routes/d/$slug.tsx` and
`src/routes/public/dashboards/...`, which pass `mode="public"`. Tasks 14 and 16
replace both files.

- [ ] **Step 4: Commit**

```bash
git add src/views/DashboardApp/DashboardViewerView/ src/i18n/locales/
git commit -m "feat(dashboards): extract the access-denied view and rework viewer modes"
```

---

## Task 13: The slug-or-id resolver

Both viewer routes answer the same question, and neither can be unit-tested
while the answer lives inside a route loader. Extracting the branching into one
module with injected reads makes it testable and keeps the two routes from
drifting apart.

**Files:**
- Create: `src/clients/dashboards/resolveDashboardRoute.ts`
- Create: `src/clients/dashboards/resolveDashboardRoute.test.ts`
- Create: `src/clients/dashboards/makeDashboardRouteDeps.ts`

- [ ] **Step 1: Write the failing test**

Create `src/clients/dashboards/resolveDashboardRoute.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  resolvePublicDashboardRoute,
  resolveWorkspaceDashboardRoute,
} from "@/clients/dashboards/resolveDashboardRoute";
import type { DashboardRouteDeps } from "@/clients/dashboards/resolveDashboardRoute";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardVisibility } from "$/models/Dashboard/Dashboard.types";

const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";

function makeDashboard(options: {
  visibility: DashboardVisibility;
  slug?: string;
  workspaceId?: string;
}): Dashboard.T {
  return {
    id: DASHBOARD_ID,
    workspaceId: options.workspaceId ?? WORKSPACE_ID,
    visibility: options.visibility,
    slug: options.slug,
  } as unknown as Dashboard.T;
}

function makeDeps(overrides: Partial<DashboardRouteDeps>): DashboardRouteDeps {
  return {
    getById: vi.fn().mockResolvedValue(undefined),
    findBySlug: vi.fn().mockResolvedValue([]),
    getViewerWorkspaces: vi
      .fn()
      .mockResolvedValue([{ id: WORKSPACE_ID, slug: "acme" }]),
    isAuthenticated: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("resolvePublicDashboardRoute", () => {
  it("renders a public dashboard reached by its slug", async () => {
    const dashboard = makeDashboard({ visibility: "public", slug: "q3" });
    const outcome = await resolvePublicDashboardRoute({
      slugOrId: "q3",
      deps: makeDeps({ findBySlug: vi.fn().mockResolvedValue([dashboard]) }),
    });
    expect(outcome).toEqual({ kind: "render", dashboard });
  });

  it("canonicalises an id onto the prettier slug URL", async () => {
    const dashboard = makeDashboard({ visibility: "public", slug: "q3" });
    const outcome = await resolvePublicDashboardRoute({
      slugOrId: DASHBOARD_ID,
      deps: makeDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
    });
    expect(outcome).toEqual({ kind: "redirectToPublic", slugOrId: "q3" });
  });

  it("renders a public dashboard by id when it has no slug", async () => {
    const dashboard = makeDashboard({ visibility: "public" });
    const outcome = await resolvePublicDashboardRoute({
      slugOrId: DASHBOARD_ID,
      deps: makeDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
    });
    expect(outcome).toEqual({ kind: "render", dashboard });
  });

  it("forwards a workspace-only dashboard to its workspace URL", async () => {
    // A link pasted before a public -> workspace flip still lands.
    const dashboard = makeDashboard({ visibility: "workspace", slug: "q3" });
    const outcome = await resolvePublicDashboardRoute({
      slugOrId: DASHBOARD_ID,
      deps: makeDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
    });
    expect(outcome).toEqual({
      kind: "redirectToWorkspace",
      workspaceSlug: "acme",
      slugOrId: "q3",
    });
  });

  it("sends an anonymous visitor to sign in on any miss", async () => {
    // RLS cannot tell "no such slug" from "a slug you cannot see" without
    // leaking the difference, so both go the same way.
    const outcome = await resolvePublicDashboardRoute({
      slugOrId: "does-not-exist",
      deps: makeDeps({ isAuthenticated: vi.fn().mockResolvedValue(false) }),
    });
    expect(outcome).toEqual({ kind: "signIn" });
  });

  it("forwards an authenticated viewer to their one matching workspace", async () => {
    const dashboard = makeDashboard({ visibility: "workspace", slug: "q3" });
    const findBySlug = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([dashboard]);
    const outcome = await resolvePublicDashboardRoute({
      slugOrId: "q3",
      deps: makeDeps({ findBySlug }),
    });
    expect(outcome).toEqual({
      kind: "redirectToWorkspace",
      workspaceSlug: "acme",
      slugOrId: "q3",
    });
  });

  it("refuses to guess when two workspaces used the same slug", async () => {
    const findBySlug = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeDashboard({ visibility: "workspace", slug: "q3" }),
        makeDashboard({
          visibility: "workspace",
          slug: "q3",
          workspaceId: OTHER_WORKSPACE_ID,
        }),
      ]);
    const outcome = await resolvePublicDashboardRoute({
      slugOrId: "q3",
      deps: makeDeps({ findBySlug }),
    });
    expect(outcome).toEqual({ kind: "denied" });
  });

  it("denies a draft, which has no viewer URL at all", async () => {
    const outcome = await resolvePublicDashboardRoute({
      slugOrId: DASHBOARD_ID,
      deps: makeDeps({
        getById: vi.fn().mockResolvedValue(
          makeDashboard({ visibility: "draft", slug: "q3" }),
        ),
      }),
    });
    expect(outcome).toEqual({ kind: "denied" });
  });
});

describe("resolveWorkspaceDashboardRoute", () => {
  it("renders a workspace dashboard reached by its slug", async () => {
    const dashboard = makeDashboard({ visibility: "workspace", slug: "q3" });
    const outcome = await resolveWorkspaceDashboardRoute({
      slugOrId: "q3",
      workspaceSlug: "acme",
      deps: makeDeps({ findBySlug: vi.fn().mockResolvedValue([dashboard]) }),
    });
    expect(outcome).toEqual({ kind: "render", dashboard });
  });

  it("forwards a public dashboard back to the public URL", async () => {
    const dashboard = makeDashboard({ visibility: "public", slug: "q3" });
    const outcome = await resolveWorkspaceDashboardRoute({
      slugOrId: DASHBOARD_ID,
      workspaceSlug: "acme",
      deps: makeDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
    });
    expect(outcome).toEqual({ kind: "redirectToPublic", slugOrId: "q3" });
  });

  it("denies an id belonging to a different workspace", async () => {
    // Knowing a workspace slug you belong to must not let you render another
    // workspace's dashboard through it.
    const dashboard = makeDashboard({
      visibility: "workspace",
      slug: "q3",
      workspaceId: OTHER_WORKSPACE_ID,
    });
    const outcome = await resolveWorkspaceDashboardRoute({
      slugOrId: DASHBOARD_ID,
      workspaceSlug: "acme",
      deps: makeDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
    });
    expect(outcome).toEqual({ kind: "denied" });
  });

  it("denies when the viewer is not in the workspace", async () => {
    const outcome = await resolveWorkspaceDashboardRoute({
      slugOrId: "q3",
      workspaceSlug: "not-mine",
      deps: makeDeps({}),
    });
    expect(outcome).toEqual({ kind: "denied" });
  });

  it("canonicalises an id onto the slug", async () => {
    const dashboard = makeDashboard({ visibility: "workspace", slug: "q3" });
    const outcome = await resolveWorkspaceDashboardRoute({
      slugOrId: DASHBOARD_ID,
      workspaceSlug: "acme",
      deps: makeDeps({ getById: vi.fn().mockResolvedValue(dashboard) }),
    });
    expect(outcome).toEqual({
      kind: "redirectToWorkspace",
      workspaceSlug: "acme",
      slugOrId: "q3",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend -- resolveDashboardRoute.test.ts`

Expected: FAIL, module not found.

- [ ] **Step 3: Write the resolver**

Create `src/clients/dashboards/resolveDashboardRoute.ts`:

```ts
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Strict UUID shape. A `<slugOrId>` segment matching this is a dashboard id;
 * anything else is a slug.
 *
 * `validateDashboardSlug` rejects UUID-shaped slugs with reason `reserved`,
 * which is what makes this fork total rather than a guess. Without that rule
 * the slug pattern `^[a-z0-9-]+$` with a 64 character limit already admits a
 * 36 character UUID, and the two namespaces would genuinely overlap.
 */
const UUID_SHAPED =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/** Whether a `<slugOrId>` segment should be resolved as a dashboard id. */
export function isUuidShaped(value: string): boolean {
  return UUID_SHAPED.test(value);
}

/** What a viewer route should do with a `<slugOrId>` segment. */
export type DashboardRouteOutcome =
  | { kind: "render"; dashboard: Dashboard.T }
  | { kind: "redirectToPublic"; slugOrId: string }
  | { kind: "redirectToWorkspace"; workspaceSlug: string; slugOrId: string }
  | { kind: "signIn" }
  | { kind: "denied" };

/** A workspace the current viewer belongs to. */
export type ViewerWorkspace = { id: Workspace.Id; slug: string };

/**
 * Everything the resolvers read, injected so the branching can be tested
 * without a database, a session, or a router.
 */
export type DashboardRouteDeps = {
  getById: (id: DashboardId) => Promise<Dashboard.T | undefined>;
  findBySlug: (params: {
    slug: string;
    visibility: "public" | "workspace";
    workspaceId?: Workspace.Id;
  }) => Promise<readonly Dashboard.T[]>;
  getViewerWorkspaces: () => Promise<readonly ViewerWorkspace[]>;
  isAuthenticated: () => Promise<boolean>;
};

/** Points a workspace-only dashboard at its workspace-scoped URL. */
async function _sendToWorkspaceUrl(params: {
  dashboard: Dashboard.T;
  deps: DashboardRouteDeps;
}): Promise<DashboardRouteOutcome> {
  const { dashboard, deps } = params;

  const workspace = (await deps.getViewerWorkspaces()).find((candidate) => {
    return candidate.id === dashboard.workspaceId;
  });

  if (!workspace) {
    // The row was readable but its workspace is not one of ours, so the
    // workspace-scoped route cannot serve it either.
    return (await deps.isAuthenticated()) ?
        { kind: "denied" }
      : { kind: "signIn" };
  }

  return {
    kind: "redirectToWorkspace",
    workspaceSlug: workspace.slug,
    slugOrId: dashboard.slug ?? dashboard.id,
  };
}

/**
 * Resolves `/d/<slugOrId>`, the canonical public URL.
 *
 * Public slugs are globally unique, so a slug alone resolves for an anonymous
 * visitor who has no workspace context.
 */
export async function resolvePublicDashboardRoute(params: {
  slugOrId: string;
  deps: DashboardRouteDeps;
}): Promise<DashboardRouteOutcome> {
  const { slugOrId, deps } = params;

  const candidate =
    isUuidShaped(slugOrId) ?
      await deps.getById(slugOrId as DashboardId)
    : (await deps.findBySlug({ slug: slugOrId, visibility: "public" }))[0];

  if (candidate?.visibility === "public") {
    return candidate.slug && candidate.slug !== slugOrId ?
        { kind: "redirectToPublic", slugOrId: candidate.slug }
      : { kind: "render", dashboard: candidate };
  }

  if (candidate?.visibility === "workspace") {
    return await _sendToWorkspaceUrl({ dashboard: candidate, deps });
  }

  // Nothing in the public namespace. An anonymous visitor is sent to sign in
  // whether the slug is wrong or merely invisible: RLS cannot tell those apart
  // without leaking the difference, and Google Drive behaves the same way.
  if (!(await deps.isAuthenticated())) {
    return { kind: "signIn" };
  }

  // A link pasted before a public -> workspace flip still lands, as long as it
  // is unambiguous. Two matches means the viewer belongs to two workspaces that
  // both used the slug, and guessing between them is worse than saying so.
  if (!isUuidShaped(slugOrId)) {
    const matches = await deps.findBySlug({
      slug: slugOrId,
      visibility: "workspace",
    });
    const onlyMatch = matches.length === 1 ? matches[0] : undefined;
    if (onlyMatch) {
      return await _sendToWorkspaceUrl({ dashboard: onlyMatch, deps });
    }
  }

  return { kind: "denied" };
}

/**
 * Resolves `/<workspaceSlug>/d/<slugOrId>`, the workspace-only URL.
 *
 * The `_auth` layout has already sent anonymous visitors to sign in, and
 * `_auth/$workspaceSlug` has already bounced non-members, so what is left here
 * is the case those layouts cannot judge: a member RLS hides the row from.
 */
export async function resolveWorkspaceDashboardRoute(params: {
  slugOrId: string;
  workspaceSlug: string;
  deps: DashboardRouteDeps;
}): Promise<DashboardRouteOutcome> {
  const { slugOrId, workspaceSlug, deps } = params;

  const workspace = (await deps.getViewerWorkspaces()).find((candidate) => {
    return candidate.slug === workspaceSlug;
  });
  if (!workspace) {
    return { kind: "denied" };
  }

  const candidate =
    isUuidShaped(slugOrId) ?
      await deps.getById(slugOrId as DashboardId)
    : (
        await deps.findBySlug({
          slug: slugOrId,
          visibility: "workspace",
          workspaceId: workspace.id,
        })
      )[0];

  // Knowing a workspace slug you belong to must not let you render another
  // workspace's dashboard through it.
  if (!candidate || candidate.workspaceId !== workspace.id) {
    return { kind: "denied" };
  }

  if (candidate.visibility === "public") {
    return {
      kind: "redirectToPublic",
      slugOrId: candidate.slug ?? candidate.id,
    };
  }

  if (candidate.visibility === "draft") {
    // Nobody has published this, so it has no viewer URL yet.
    return { kind: "denied" };
  }

  return candidate.slug && candidate.slug !== slugOrId ?
      { kind: "redirectToWorkspace", workspaceSlug, slugOrId: candidate.slug }
    : { kind: "render", dashboard: candidate };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend -- resolveDashboardRoute.test.ts`

Expected: PASS, 13 tests.

- [ ] **Step 5: Wire the resolver's reads to the real clients**

Create `src/clients/dashboards/makeDashboardRouteDeps.ts`:

```ts
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import type { DashboardRouteDeps } from "@/clients/dashboards/resolveDashboardRoute";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Binds the viewer-route resolvers to the real clients.
 *
 * Kept separate from the resolvers so their branching stays testable without
 * a database or a session, and separate from the routes so both use the same
 * reads.
 */
export function makeDashboardRouteDeps(
  queryClient: QueryClient,
): DashboardRouteDeps {
  return {
    getById: async (id) => {
      return await DashboardClient.getById({ id });
    },
    findBySlug: async ({ slug, visibility, workspaceId }) => {
      return await DashboardClient.getAll({
        where: {
          slug: { eq: slug },
          visibility: { eq: visibility },
          ...(workspaceId ? { workspace_id: { eq: workspaceId } } : {}),
        },
      });
    },
    getViewerWorkspaces: async () => {
      return await WorkspaceClient.withCache(queryClient)
        .withFetchQuery()
        .getWorkspacesOfCurrentUser();
    },
    isAuthenticated: async () => {
      const session = await AuthClient.getCurrentSession();
      return !!session?.user;
    },
  };
}
```

- [ ] **Step 6: Type-check and commit**

Run: `pnpm type-check`

Expected: no new errors from these two files. `getWorkspacesOfCurrentUser`
returns workspaces carrying `id` and `slug`, which is what `ViewerWorkspace`
requires; if its shape differs, widen `ViewerWorkspace` rather than mapping,
so the resolver keeps working off the real type.

```bash
git add src/clients/dashboards/resolveDashboardRoute.ts \
        src/clients/dashboards/resolveDashboardRoute.test.ts \
        src/clients/dashboards/makeDashboardRouteDeps.ts
git commit -m "feat(dashboards): add the slug-or-id viewer route resolver"
```

---

## Task 14: The public viewer route

**Files:**
- Create: `src/routes/d/$slugOrId.tsx`
- Delete: `src/routes/d/$slug.tsx`

- [ ] **Step 1: Create the new route**

Create `src/routes/d/$slugOrId.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { makeDashboardRouteDeps } from "@/clients/dashboards/makeDashboardRouteDeps";
import { resolvePublicDashboardRoute } from "@/clients/dashboards/resolveDashboardRoute";
import { DashboardAccessDeniedView } from "@/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type LoaderResult =
  | { kind: "render"; dashboard: Dashboard.T }
  | { kind: "denied" };

/**
 * Canonical public URL for a published dashboard:
 *   /d/<slug>  or  /d/<dashboardId>
 *
 * Public slugs are globally unique (`dashboards__slug_unique_when_public`), so
 * a slug alone resolves to at most one dashboard for an anonymous visitor who
 * has no workspace context.
 *
 * Workspace-only dashboards live at `/<workspaceSlug>/d/<slugOrId>` instead,
 * because their slugs are only unique within a workspace. This route still
 * accepts them and redirects, so a link pasted before an audience flip keeps
 * working.
 *
 * All the branching lives in `resolvePublicDashboardRoute`, which is unit
 * tested. This file only turns its answer into router calls.
 */
export const Route = createFileRoute("/d/$slugOrId")({
  loader: async ({ params, context, location }): Promise<LoaderResult> => {
    const outcome = await resolvePublicDashboardRoute({
      slugOrId: params.slugOrId,
      deps: makeDashboardRouteDeps(context.queryClient),
    });

    switch (outcome.kind) {
      case "redirectToPublic":
        throw redirect({
          to: "/d/$slugOrId",
          params: { slugOrId: outcome.slugOrId },
          replace: true,
        });
      case "redirectToWorkspace":
        throw redirect({
          to: "/$workspaceSlug/d/$slugOrId",
          params: {
            workspaceSlug: outcome.workspaceSlug,
            slugOrId: outcome.slugOrId,
          },
          replace: true,
        });
      case "signIn":
        throw redirect({ to: "/signin", search: { redirect: location.href } });
      default:
        return outcome;
    }
  },
  component: DashboardVanityPage,
});

function DashboardVanityPage(): JSX.Element {
  const outcome = Route.useLoaderData();

  if (outcome.kind === "denied") {
    // Anonymous visitors never reach this branch; the resolver sends them to
    // sign in, so anyone here is signed into the wrong account.
    return <DashboardAccessDeniedView canSwitchAccount />;
  }

  return (
    <DataExplorerStateManager.Provider>
      <DashboardViewerView dashboard={outcome.dashboard} mode="published" />
    </DataExplorerStateManager.Provider>
  );
}
```

- [ ] **Step 2: Delete the old route**

```bash
git rm src/routes/d/\$slug.tsx
```

- [ ] **Step 3: Regenerate the route tree and type-check**

Run: `pnpm type-check`

Expected: the TanStack route tree regenerates on the next dev/build run. If
`src/routeTree.gen.ts` is checked in and stale, run `pnpm dev` briefly or the
project's route generator to refresh it, then re-run `pnpm type-check`.
Remaining errors should be only in
`src/routes/public/dashboards/$workspaceSlug/$dashboardId.tsx`, fixed in
Task 16, plus the missing `/$workspaceSlug/d/$slugOrId` route, added in
Task 15.

- [ ] **Step 4: Commit**

```bash
git add src/routes/d/ src/routeTree.gen.ts
git commit -m "feat(routes): accept a slug or id at the public dashboard URL"
```

---

## Task 15: The workspace-scoped viewer route

**Files:**
- Create: `src/routes/_auth/$workspaceSlug/d/$slugOrId.tsx`

- [ ] **Step 1: Create the route**

Placing it inside `_auth` is deliberate: `_auth`'s `beforeLoad` already
redirects anonymous visitors to `/signin?redirect=…` and returns them after
login, and `_auth/$workspaceSlug`'s loader already bounces non-members to
`/invalid-workspace`.

Create `src/routes/_auth/$workspaceSlug/d/$slugOrId.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { makeDashboardRouteDeps } from "@/clients/dashboards/makeDashboardRouteDeps";
import { resolveWorkspaceDashboardRoute } from "@/clients/dashboards/resolveDashboardRoute";
import { DashboardAccessDeniedView } from "@/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type LoaderResult =
  | { kind: "render"; dashboard: Dashboard.T }
  | { kind: "denied" };

/**
 * Workspace-only URL for a published dashboard:
 *   /<workspaceSlug>/d/<slug>  or  /<workspaceSlug>/d/<dashboardId>
 *
 * Workspace slugs are unique per workspace
 * (`dashboards__slug_unique_per_workspace_when_internal`), which is why the
 * workspace has to be in the path. Public dashboards live at `/d/<slugOrId>`
 * and are redirected there, so the two routes cross-redirect and a link
 * survives an audience flip in either direction.
 *
 * Access comes from the layout for free: `_auth` sends an anonymous visitor to
 * sign in and back, and `_auth/$workspaceSlug` sends a non-member to
 * `/invalid-workspace`. What is left for the resolver is the case the layouts
 * cannot judge: a member with no share on this particular dashboard, whom RLS
 * hides the row from.
 */
export const Route = createFileRoute("/_auth/$workspaceSlug/d/$slugOrId")({
  loader: async ({ params, context }): Promise<LoaderResult> => {
    const outcome = await resolveWorkspaceDashboardRoute({
      slugOrId: params.slugOrId,
      workspaceSlug: params.workspaceSlug,
      deps: makeDashboardRouteDeps(context.queryClient),
    });

    switch (outcome.kind) {
      case "redirectToPublic":
        throw redirect({
          to: "/d/$slugOrId",
          params: { slugOrId: outcome.slugOrId },
          replace: true,
        });
      case "redirectToWorkspace":
        throw redirect({
          to: "/$workspaceSlug/d/$slugOrId",
          params: {
            workspaceSlug: outcome.workspaceSlug,
            slugOrId: outcome.slugOrId,
          },
          replace: true,
        });
      case "signIn":
        // Unreachable: `_auth` already bounced anonymous visitors. Handled so
        // the switch stays exhaustive if the resolver grows a new branch.
        throw redirect({ to: "/signin" });
      default:
        return outcome;
    }
  },
  component: WorkspaceDashboardPage,
});

function WorkspaceDashboardPage(): JSX.Element {
  const outcome = Route.useLoaderData();

  if (outcome.kind === "denied") {
    return <DashboardAccessDeniedView canSwitchAccount />;
  }

  return (
    <DataExplorerStateManager.Provider>
      <DashboardViewerView dashboard={outcome.dashboard} mode="published" />
    </DataExplorerStateManager.Provider>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`

Expected: the `/d/$slugOrId` redirect target now resolves. If TanStack Router
reports a route conflict on `$workspaceSlug`, stop: the route was placed
outside `_auth` by mistake, or the route tree is stale.

- [ ] **Step 3: Commit**

```bash
git add src/routes/_auth/\$workspaceSlug/d/ src/routeTree.gen.ts
git commit -m "feat(routes): add the workspace-scoped dashboard viewer URL"
```

---

## Task 16: Reduce the legacy route to a redirect

**Files:**
- Modify: `src/routes/public/dashboards/$workspaceSlug/$dashboardId.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";

/**
 * Legacy canonical dashboard URL. **Deprecated; do not add behaviour here.**
 *
 * This path is what QR codes already printed on flyers and in reports encode,
 * and those are the one class of link that cannot be edited after
 * distribution. That is the only reason it still exists, so the path must not
 * be renamed and this redirect must not be made conditional. Delete the file
 * once those codes are out of circulation.
 *
 * It forwards unconditionally to `/d/<dashboardId>` with no lookup of its own.
 * That route resolves the dashboard, decides access, and forwards a
 * workspace-only dashboard on to `/<workspaceSlug>/d/<slug>`, so every branch
 * lives in exactly one place. `workspaceSlug` is discarded: `/d/<id>` recovers
 * the workspace from the row when it needs it.
 *
 * Worst case is two hops for a legacy link, which is the right price for a
 * route we want to stop maintaining.
 */
export const Route = createFileRoute(
  "/public/dashboards/$workspaceSlug/$dashboardId",
)({
  loader: ({ params }): never => {
    throw redirect({
      to: "/d/$slugOrId",
      params: { slugOrId: params.dashboardId as DashboardId },
      replace: true,
    });
  },
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`

Expected: PASS across the repo. This is the last file that referenced the old
viewer mode.

- [ ] **Step 3: Run the full frontend suite**

Run: `pnpm test:frontend`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/public/ src/routeTree.gen.ts
git commit -m "refactor(routes): reduce the legacy dashboard URL to a redirect"
```

---

## Task 17: Route viewer-role users to preview, not the editor

**Files:**
- Modify: `src/routes/_auth/$workspaceSlug/dashboards/edit/$dashboardId.tsx`
- Modify: `src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx`
- Create: `tests/e2e/dashboard-viewer-role-routing.spec.ts`

- [ ] **Step 1: Write the failing Playwright test**

Create `tests/e2e/dashboard-viewer-role-routing.spec.ts`:

```ts
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT } from "./helpers/timeouts";

/**
 * A viewer-role share used to open the full Puck editor, with Save, Publish,
 * and Delete all present. The writes failed at RLS, but every affordance was
 * there.
 */
test.describe("viewer-role dashboard routing", () => {
  test("a viewer-role user lands on preview, not the editor", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;

    const dashboardId = await seedDashboard({
      admin,
      workspaceId: e2eWorkerDb.workspaceId,
      ownerEmail: primaryUser.email,
      name: "Viewer routing e2e dashboard",
      isRestricted: true,
    });

    await admin.from("resource_shares").insert({
      resource_type: "dashboard",
      resource_id: dashboardId,
      workspace_id: e2eWorkerDb.workspaceId,
      principal_type: "user",
      principal_id: secondaryUser.userId,
      role: "viewer",
    });

    await signInWithEmailPassword(page, secondaryUser);

    await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`);

    await expect(page).toHaveURL(
      new RegExp(`/${workspaceSlug}/dashboards/preview/${dashboardId}`),
      { timeout: LONG_WAIT },
    );
    await expect(
      page.getByRole("button", { name: /back to editor/i }),
    ).toHaveCount(0);

    await deleteDashboardsByIds({ admin, dashboardIds: [dashboardId] });
  });
});
```

Read `tests/e2e/private-resource-admin-cannot-read.spec.ts` first and match the
exact fixture field names it uses (`e2eWorkerDb.workspaceId`,
`secondaryUser.userId`, and so on); adjust the seed calls above if they differ.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:e2e -- dashboard-viewer-role-routing.spec.ts`

Expected: FAIL. The URL stays on `/dashboards/edit/…` and the editor renders.

- [ ] **Step 3: Add the editor guard**

Replace `src/routes/_auth/$workspaceSlug/dashboards/edit/$dashboardId.tsx`:

```tsx
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { UserClient } from "@/clients/UserClient";
import { DashboardEditorView } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView";
import type {
  DashboardId,
  DashboardRead,
} from "$/models/Dashboard/Dashboard.types";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/dashboards/edit/$dashboardId",
)({
  /**
   * The dashboards route guard admits `viewer`, so without this check a
   * viewer-role share opened the full Puck editor with Save, Publish, and
   * Delete. The writes failed at RLS, but every affordance was present.
   *
   * Anyone below `editor` on the row goes to the read-only preview instead,
   * which is a surface that already exists and is already auth-gated.
   */
  beforeLoad: async ({ params, context }) => {
    const canEdit = await UserClient.withCache(context.queryClient)
      .withFetchQuery()
      .canAccessResource({
        resourceType: "dashboard",
        resourceId: params.dashboardId,
        minRole: "editor",
      });

    if (!canEdit) {
      throw redirect({
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
        params: {
          workspaceSlug: params.workspaceSlug,
          dashboardId: params.dashboardId,
        },
        replace: true,
      });
    }
  },
  loader: async ({ params }): Promise<{ dashboard: DashboardRead }> => {
    const dashboard = await DashboardClient.getById({
      id: params.dashboardId as DashboardId,
    });

    if (!dashboard) {
      throw notFound();
    }

    return { dashboard };
  },
  component: DashboardEditorPage,
});

function DashboardEditorPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();
  const { dashboard } = Route.useLoaderData() as {
    dashboard: DashboardRead;
  };
  return (
    <DashboardEditorView dashboard={dashboard} workspaceSlug={workspaceSlug} />
  );
}
```

`context.queryClient` is available in `beforeLoad`; `RouteMiddleware.ts:64-71`
declares exactly that shape (`{ context: { queryClient }, params }`) for the
guard it returns, and that guard is already used as this route tree's
`beforeLoad`.

- [ ] **Step 4: Pass edit rights into the preview banner**

Replace `src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx`
entirely, so a viewer-role user does not see a button back to an editor they
would only be redirected out of:

```tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { UserClient } from "@/clients/UserClient";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

/**
 * Auth-gated preview of a dashboard, rendered with the same viewer component
 * the public route uses. Two audiences reach it:
 *
 *   * an editor clicking "View" to see the read-only experience before
 *     publishing;
 *   * a viewer-role user redirected here from the editor route, because the
 *     dashboards guard admits `viewer` and the editor is not for them.
 *
 * It does not gate on visibility, so a draft previews with live workspace
 * data. Once P3 ships a control that publishes to the workspace, viewer-role
 * access here should additionally require `visibility <> 'draft'`; see the
 * deferred section of the P2 design.
 */
export const Route = createFileRoute(
  "/_auth/$workspaceSlug/dashboards/preview/$dashboardId",
)({
  loader: async ({
    params,
    context,
  }): Promise<{ dashboard: Dashboard.T; canEdit: boolean }> => {
    const dashboard = await DashboardClient.getById({
      id: params.dashboardId as Dashboard.Id,
    });
    if (!dashboard) {
      throw notFound();
    }

    const canEdit = await UserClient.withCache(context.queryClient)
      .withFetchQuery()
      .canAccessResource({
        resourceType: "dashboard",
        resourceId: params.dashboardId,
        minRole: "editor",
      });

    return { dashboard, canEdit };
  },
  component: DashboardPreviewPage,
});

function DashboardPreviewPage() {
  const { workspaceSlug } = Route.useParams();
  const { dashboard, canEdit } = Route.useLoaderData() as {
    dashboard: Dashboard.T;
    canEdit: boolean;
  };
  return (
    <DataExplorerStateManager.Provider>
      <DashboardViewerView
        dashboard={dashboard}
        mode="preview"
        workspaceSlug={workspaceSlug}
        canEdit={canEdit}
      />
    </DataExplorerStateManager.Provider>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:e2e -- dashboard-viewer-role-routing.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/_auth/\$workspaceSlug/dashboards/ tests/e2e/dashboard-viewer-role-routing.spec.ts
git commit -m "fix(dashboards): send viewer-role users to preview instead of the editor"
```

---

## Task 18: Prove the private bucket is actually private

The pgTAP tests in Task 3 prove the *policies* are right. They prove nothing
about the bucket being private: a bucket created with `public = true` is served
through a path that never consults `storage.objects` RLS at all, and every one
of those assertions would still pass.

**Files:**
- Create: `tests/e2e/dashboard-private-snapshot-bucket.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { createE2ESupabaseViewerClient } from "./helpers/supabase";

const PRIVATE_BUCKET = "published-private";

/**
 * The pgTAP suite covers the policies on storage.objects. It cannot cover the
 * bucket's own `public` flag, which short-circuits those policies entirely for
 * reads. This test goes through the real HTTP storage API instead.
 */
test.describe("published-private bucket", () => {
  test("a member with no share cannot download a workspace snapshot", async ({
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const admin = createSupabaseAdminClient();
    const { primaryUser, secondaryUser, workspaceId } = e2eWorkerDb;

    const dashboardId = await seedDashboard({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
      name: "Private snapshot e2e dashboard",
      isRestricted: true,
    });

    await admin
      .from("dashboards")
      .update({ visibility: "workspace" })
      .eq("id", dashboardId);

    const objectPath = `dashboards/${dashboardId}/datasets/00000000-0000-4000-8000-000000000001.parquet`;
    const { error: uploadError } = await admin.storage
      .from(PRIVATE_BUCKET)
      .upload(objectPath, new Blob([new Uint8Array([1, 2, 3])]), {
        contentType: "application/vnd.apache.parquet",
        upsert: true,
      });
    expect(uploadError).toBeNull();

    // The member has no share on this restricted dashboard.
    const viewerClient = await createE2ESupabaseViewerClient({
      email: secondaryUser.email,
      password: secondaryUser.password,
    });

    const { data, error } = await viewerClient.storage
      .from(PRIVATE_BUCKET)
      .download(objectPath);

    expect(data).toBeNull();
    expect(error).not.toBeNull();

    await admin.storage.from(PRIVATE_BUCKET).remove([objectPath]);
    await deleteDashboardsByIds({ admin, dashboardIds: [dashboardId] });
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test:e2e -- dashboard-private-snapshot-bucket.spec.ts`

Expected: PASS if Task 3 created the bucket with `public: false`. If it FAILS
with the download succeeding, the bucket was created public and the migration
in Task 3 must be corrected. Verify with:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "select id, public from storage.buckets where id like 'published%';"
```

Expected: `published | t` and `published-private | f`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/dashboard-private-snapshot-bucket.spec.ts
git commit -m "test(e2e): prove the private snapshot bucket is not world-readable"
```

---

## Task 19: Full verification sweep

- [ ] **Step 1: Rebuild the database from scratch**

Run: `pnpm db:reset`

Expected: no errors, and no warnings about a `sql_paths` entry that matches no
file.

- [ ] **Step 2: Confirm the storage policies survived the rebuild**

Run:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname;"
```

Expected: 16 rows.

- [ ] **Step 3: Confirm the declarative schema and the migrations agree**

Run: `supabase stop && PGSSLMODE=disable supabase db diff`

Expected: **empty output**. Any `drop policy` means the mirror in
`99.storage.sql` drifted and the next unrelated migration will delete your
policies.

- [ ] **Step 4: Run every suite**

```bash
supabase start
pnpm test:db
pnpm type-check
pnpm test:frontend
pnpm desktop:sqlite:check-migrations
pnpm lint
pnpm i18n:check
pnpm test:e2e
```

Expected: all PASS. `i18n:check` failing means extracted strings were not
committed; run `pnpm i18n:extract` and commit the result.

- [ ] **Step 5: Confirm nothing still writes the generated column**

Run: `rg -n "isPublic:" src/ shared/`

Expected: no matches in any insert or update payload. Read-side reads of
`dashboard.isPublic` are fine and expected; they are exactly what the generated
column exists to keep working.

- [ ] **Step 6: Commit any straggling formatting**

```bash
pnpm format
git add -A
git commit -m "chore: formatting after the P2 publishing core"
```

---

## Notes for the implementer

**The three places where the order of operations is the point, not a detail:**

1. **Task 1, Step 6.** The backfill `update` must sit between adding
   `visibility` and dropping `is_public`. Move it or drop it and every public
   dashboard in production silently becomes a draft.

2. **Task 3, Step 4.** The `sql_paths` entry must name a real file and must
   come after the restore migration. A typo there is a *warning*, not an error:
   `db reset` reports success and the bucket ends up with no policies. Step 7
   is what catches it.

3. **Task 11, Step 5.** Upload to the target bucket, then clear the other one,
   then flip `visibility`. Reordering to clear first opens a window where a
   published dashboard has no data; reordering to flip first opens one where a
   workspace-only dashboard's data is still world-readable. The second is the
   one this whole phase exists to prevent.

**Two shapes worth confirming against the code as you go:**

- `WorkspaceClient.getWorkspacesOfCurrentUser()` is used through
  `withCache(queryClient).withFetchQuery()` in loaders;
  `_auth/$workspaceSlug/route.tsx:16` shows the form. Task 13's
  `makeDashboardRouteDeps` assumes each returned workspace carries `id` and
  `slug`. If the shape differs, widen `ViewerWorkspace` rather than mapping, so
  the resolver keeps working off the real type.

- Task 8 changes a generic Dexie layer used by four models. After Step 9, only
  `LocalPublicDataset` consumers should show type errors. An error in
  `LocalDataset`, `ConsentAuditEntry`, or `ClarificationAuditEntry` means the
  conditional in Step 4 collapsed for single-column keys, and it must be fixed
  before moving on rather than cast away.

**What P2 deliberately leaves undone**, so it is not mistaken for an oversight
in review: no control sets `visibility = 'workspace'` (P3), `unpublishDashboard`
has tests but no caller (P3), viewer-role preview access is not yet gated on the
dashboard being published, and nothing sweeps snapshot objects orphaned by a
client that dies mid-operation.
