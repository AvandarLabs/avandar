-- Gate the `workspaces` storage bucket on dataset-level access.
--
-- Until now these four policies checked only workspace MEMBERSHIP:
--
--   bucket_id = 'workspaces'
--   and foldername[1] = any (util__get_auth_user_workspaces())
--   and foldername[2] = 'datasets'
--
-- That left Supabase Storage as an ungated second read path to dataset
-- content. Any workspace member could call
--   .storage.from('workspaces').download('<workspaceId>/datasets/<datasetId>.parquet')
-- and read (or, via UPDATE/DELETE, overwrite or destroy) the bytes of a
-- dataset that is private to its owner. The Postgres row was correctly
-- hidden by the private-resource hardening; the file behind it was not.
--
-- Object names are `<workspaceId>/datasets/<datasetId>.parquet`, so the
-- dataset id is in the FILENAME and storage.foldername() cannot reach it.
-- public.util__storage_object_dataset_id() extracts it, returning null for
-- any name that does not match that shape. Null is treated as DENY here: an
-- object whose dataset cannot be identified is not one we can prove the
-- caller may read.
--
-- Levels mirror the table policies: viewer to read, editor to write.
--
-- Ordering safety, verified against the client code before writing this:
--   * upload runs in useSaveDataset's onSuccess, AFTER the dataset row is
--     created, so INSERT can require an existing accessible row;
--   * DatasetClient.fullDelete fetches the dataset row, then removes the
--     object, then deletes the row, so DELETE also runs while the row exists.
-- Both would break if a future change moved a storage write before the row.
--
-- The workspace-membership and foldername[2] checks are retained as cheap
-- defence in depth, so a bug in id extraction cannot widen access beyond the
-- workspace.
--
--
-- WHY THIS FILE IS `_STORAGE`-PREFIXED AND LISTED IN config.toml
--
-- It does double duty, which is the convention for every storage migration
-- here (see the supabase-declarative-schema skill):
--
--   1. MIGRATION pass. Applies to remote databases in timestamp order, which
--      is the only way a deployed environment ever gets these policies.
--   2. SEED pass. `supabase db reset` resets the storage schema AFTER running
--      migrations, so locally every storage.objects policy created during the
--      migration pass is wiped. `[db.seed] sql_paths` in supabase/config.toml
--      re-runs the `_STORAGE` migrations afterwards to put them back.
--
-- Serving both passes is why the file must contain storage statements and
-- nothing else: the seed pass re-executes it wholesale on an already-migrated
-- database, so any non-storage statement would run a second time out of order.
-- It is also why every statement is `drop policy if exists` followed by
-- `create policy`, making re-execution idempotent.
--
-- Ordering matters in two directions:
--   * within config.toml, this file must come AFTER
--     20260119164300_STORAGE-workspaces-bucket.sql, whose ungated policies it
--     replaces;
--   * within the migration timeline, it must come after
--     20260813151414_add_util_storage_object_dataset_id.sql, which creates the
--     helper the policies below call. That helper is deliberately NOT in this
--     file, because a `public` function has no business running in the seed
--     pass.
--
-- These policies are mirrored in supabase/schemas/100.storage.sql. Without
-- that mirror, `supabase db diff` sees policies in the database that are
-- absent from the declarative schema and generates a migration dropping them.
-- That has already happened four times in this repo's history.
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
