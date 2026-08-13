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
-- See docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md

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
    public.util__auth_user_can_access_resource (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
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
    public.util__auth_user_can_access_resource (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
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
    public.util__auth_user_can_access_resource (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
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
    public.util__auth_user_can_access_resource (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
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
  public.util__auth_user_can_access_resource (
    'dataset'::public.resource_type,
    public.util__storage_object_dataset_id (name),
    'editor'::public.role_level
  )
);
