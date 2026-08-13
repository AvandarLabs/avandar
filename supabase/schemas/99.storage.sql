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
 *  None of those four recreate what they drop, so on a remote database every
 *  storage.objects policy is gone. Local databases hide this because
 *  `[db.seed] sql_paths` replays the `_STORAGE` migrations after the storage
 *  schema is reset.
 *
 *  Buckets themselves are deliberately absent: `insert into storage.buckets`
 *  is DML, which diff does not track. Buckets stay in their migrations.
 *
 *  Numbered 99 rather than 100 so it sorts LAST. Schema files are applied in
 *  lexicographic order, where "100." sorts between "10." and "15.", which
 *  would place these policies before
 *  16.utils.resource-permissions.sql defines the helpers they call.
 *
 *  Requires `16.utils.resource-permissions`.
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
