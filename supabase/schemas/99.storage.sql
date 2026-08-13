/**
 *  Declarative mirror of every policy on `storage.objects`.
 *
 *  This file creates nothing that the `_STORAGE`-prefixed migrations do not
 *  already create. It exists so `supabase db diff` knows these policies are
 *  intentional.
 *
 *  Without it, diff compares the live database (which has the policies) to
 *  supabase/schemas/ (which did not) and writes a migration that DROPS them.
 *  That has happened four times already:
 *
 *    20260121014515_offline_only_new_colname.sql          drops 4 (workspaces)
 *    20260123033949_updated_rls_for_dashboard_read.sql    drops 3 (published)
 *    20260329211118_added_open_datasets.sql               drops 3 (opendata)
 *    20260813155544_harden_transfer_ownership_...sql      drops 4 (workspaces)
 *
 *  None of those four recreate what they drop. Before
 *  20260813214231_STORAGE-restore-dropped-object-policies.sql repaired the
 *  timeline, a database built from migrations alone, which is every remote
 *  environment, ended with no storage.objects policies at all.
 *
 *  Local databases did not show the damage, but not for the reason the old
 *  supabase/seeds/ header claimed. Measured on CLI v2.98.2, `db reset` does
 *  NOT wipe the storage schema. The `[db.seed] sql_paths` replay appeared to
 *  be what restored the policies only because the migration timeline happened
 *  to end with all of them dropped, leaving the storage schema empty for the
 *  seed pass to repopulate.
 *
 *  Buckets themselves are deliberately absent here: `insert into
 *  storage.buckets` is DML, which diff does not track. Buckets are asserted by
 *  the `_STORAGE` migrations instead.
 *
 *  Numbered 99 rather than 100 so it sorts LAST. Schema files are applied in
 *  lexicographic order, in which "100." sorts between "10." and "15.". That
 *  would place these policies ahead of 16.utils.resource-permissions.sql,
 *  which defines the helpers they call, and the build would fail.
 *
 *  Requires `16.utils.resource-permissions`.
 *
 *  Keep in sync with the `_STORAGE` migrations. `supabase db diff` must return
 *  empty; any output means this mirror has drifted.
 */
--
-- Bucket `workspaces` (private). Gated on dataset-level access, not mere
-- workspace membership: viewer to read, editor to write. See
-- 20260813151500_STORAGE-gate-workspaces-bucket-on-dataset-access.sql for why
-- the dataset id has to be parsed out of the object name.
--
create policy "Users can SELECT workspace datasets" on storage.objects for
select
  to authenticated using (
    bucket_id = 'workspaces' and
    (
      storage.foldername (name)
    ) [1] = any (
      array(
        select
          unnest(
            public.util__get_auth_user_workspaces ()
          )::text
      )
    ) and
    (
      storage.foldername (name)
    ) [2] = 'datasets' and
    public.util__storage_object_dataset_id (name) is not null and
    public.util__storage_object_workspace_id (name) is not null and
    public.util__auth_user_can_access_resource_in_workspace (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
      public.util__storage_object_workspace_id (name),
      'viewer'::public.role_level
    )
  );

create policy "Users can UPLOAD workspace datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'workspaces' and
    (
      storage.foldername (name)
    ) [1] = any (
      array(
        select
          unnest(
            public.util__get_auth_user_workspaces ()
          )::text
      )
    ) and
    (
      storage.foldername (name)
    ) [2] = 'datasets' and
    public.util__storage_object_dataset_id (name) is not null and
    public.util__storage_object_workspace_id (name) is not null and
    public.util__auth_user_can_access_resource_in_workspace (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
      public.util__storage_object_workspace_id (name),
      'editor'::public.role_level
    )
  );

create policy "Users can UPDATE workspace datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'workspaces' and
    (
      storage.foldername (name)
    ) [1] = any (
      array(
        select
          unnest(
            public.util__get_auth_user_workspaces ()
          )::text
      )
    ) and
    (
      storage.foldername (name)
    ) [2] = 'datasets' and
    public.util__storage_object_dataset_id (name) is not null and
    public.util__storage_object_workspace_id (name) is not null and
    public.util__auth_user_can_access_resource_in_workspace (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
      public.util__storage_object_workspace_id (name),
      'editor'::public.role_level
    )
  )
with
  check (
    bucket_id = 'workspaces' and
    (
      storage.foldername (name)
    ) [1] = any (
      array(
        select
          unnest(
            public.util__get_auth_user_workspaces ()
          )::text
      )
    ) and
    (
      storage.foldername (name)
    ) [2] = 'datasets' and
    public.util__storage_object_dataset_id (name) is not null and
    public.util__storage_object_workspace_id (name) is not null and
    public.util__auth_user_can_access_resource_in_workspace (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
      public.util__storage_object_workspace_id (name),
      'editor'::public.role_level
    )
  );

create policy "Users can DELETE workspace datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'workspaces' and
  (
    storage.foldername (name)
  ) [1] = any (
    array(
      select
        unnest(
          public.util__get_auth_user_workspaces ()
        )::text
    )
  ) and
  (
    storage.foldername (name)
  ) [2] = 'datasets' and
  public.util__storage_object_dataset_id (name) is not null and
  public.util__storage_object_workspace_id (name) is not null and
  public.util__auth_user_can_access_resource_in_workspace (
    'dataset'::public.resource_type,
    public.util__storage_object_dataset_id (name),
    public.util__storage_object_workspace_id (name),
    'editor'::public.role_level
  )
);

--
-- Bucket `published` (public, world-readable snapshots of published
-- dashboards). Gating is by path shape only; anything written here is public
-- by construction.
--
-- NOTE: there is no DELETE policy, and no code path removes objects from this
-- bucket, so snapshots outlive the dashboards they came from. Tracked as
-- defect 1.2.1 in docs/superpowers/specs/2026-08-13-private-dashboards-design.md
-- and fixed in P2. Declared as-is here to match reality rather than to endorse
-- it.
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
    (
      storage.foldername (name)
    ) [3] = 'datasets'
  );

create policy "Authenticated users can UPDATE published datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'published' and
    (
      storage.foldername (name)
    ) [3] = 'datasets'
  )
with
  check (
    bucket_id = 'published' and
    (
      storage.foldername (name)
    ) [3] = 'datasets'
  );

--
-- Bucket `opendata` (public catalogue data). No path-shape restriction: the
-- whole bucket is public read, authenticated write.
--
create policy "Anyone can select open data datasets" on storage.objects for
select
  to authenticated,
  anon using (
    bucket_id = 'opendata'
  );

create policy "Auth users can upload open data datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'opendata'
  );

create policy "Auth users can update open data datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'opendata'
  )
with
  check (
    bucket_id = 'opendata'
  );
