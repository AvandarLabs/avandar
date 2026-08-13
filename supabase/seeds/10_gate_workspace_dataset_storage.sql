-- Seed-pass override: gate the `workspaces` bucket on dataset-level access.
--
-- Why this file exists, and why the change is not made directly in
-- 20260119164300_STORAGE-workspaces-bucket.sql:
--
-- That STORAGE file is listed in `[db.seed] sql_paths` (supabase/config.toml)
-- AND is a migration. `supabase db reset` resets the storage schema after
-- applying migrations, so on a fresh or local database the workspaces-bucket
-- policies come from the SEED pass, which re-runs that file and would overwrite
-- anything a later migration did. But the gate below calls
-- public.util__storage_object_dataset_id, which is only created in an August
-- 2026 migration, so putting it in that January file breaks the MIGRATION pass
-- (the function does not exist yet at that point) and `db reset` fails outright.
--
-- Splitting it out resolves both: this file is seeded AFTER the STORAGE files,
-- so it wins locally, and it never runs during the migration pass. Production
-- and other already-migrated environments get the identical change from
-- 20260813151500_gate_workspace_dataset_storage_on_resource_access.sql. Keep the
-- two in sync; they are deliberately byte-identical below the header.
--
drop policy if exists "Users can SELECT workspace datasets" on storage.objects;

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

drop policy if exists "Users can UPLOAD workspace datasets" on storage.objects;

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

drop policy if exists "Users can UPDATE workspace datasets" on storage.objects;

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

drop policy if exists "Users can DELETE workspace datasets" on storage.objects;

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
