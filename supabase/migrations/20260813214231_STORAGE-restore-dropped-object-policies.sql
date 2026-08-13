-- Restore every policy on `storage.objects` that an auto-generated migration
-- dropped and never recreated, and re-assert the three buckets.
--
-- Four `supabase db diff` runs removed 14 policies between them and put back
-- zero:
--
--   20260121014515_offline_only_new_colname.sql          -4  (workspaces)
--   20260123033949_updated_rls_for_dashboard_read.sql    -3  (published)
--   20260329211118_added_open_datasets.sql               -3  (opendata)
--   20260813155544_harden_transfer_ownership_...sql      -4  (workspaces)
--
-- None of those four set out to touch storage. They dropped the policies
-- because `supabase/schemas/` did not declare them, so diff read each one as
-- an object present in the database but absent from the desired state. The
-- root cause is fixed by supabase/schemas/99.storage.sql, which declares them.
-- This migration repairs the damage already committed to the timeline.
--
-- Consequence before this migration: a database built from migrations alone,
-- which is every remote environment, ends with a `workspaces` bucket carrying
-- no policies at all. Local databases were masked by the [db.seed] replay in
-- supabase/config.toml, and even locally the `opendata` bucket really did have
-- zero policies, because its seed entry named a file that does not exist (a
-- hyphen where the filename has an underscore).
--
-- Every statement is idempotent: `on conflict do nothing` for the buckets, and
-- `drop policy if exists` before each `create policy`. That is required, not
-- cosmetic. This file is the sole entry in [db.seed] sql_paths, so the seed
-- pass runs it a second time against a database that already applied it as a
-- migration. A bare `create policy` there aborts the reset with SQLSTATE
-- 42710.
--
-- The four `workspaces` policies below are the dataset-access-gated versions
-- from 20260813151500_STORAGE-gate-workspaces-bucket-on-dataset-access.sql,
-- not the original membership-only ones.
--
insert into
  storage.buckets (
    id,
    name,
    public
  )
values
  (
    'workspaces',
    'workspaces',
    false
  ),
  (
    'published',
    'published',
    true
  ),
  (
    'opendata',
    'opendata',
    true
  )
on conflict (id) do nothing;

drop policy if exists "Anyone can SELECT published datasets" on storage.objects;

create policy "Anyone can SELECT published datasets" on "storage"."objects" as permissive for
select
  to authenticated,
  anon using (
    (
      (
        bucket_id = 'published'::text
      ) and
      (
        (
          storage.foldername (name)
        ) [3] = 'datasets'::text
      )
    )
  );

drop policy if exists "Anyone can select open data datasets" on storage.objects;

create policy "Anyone can select open data datasets" on "storage"."objects" as permissive for
select
  to authenticated,
  anon using (
    (
      bucket_id = 'opendata'::text
    )
  );

drop policy if exists "Auth users can update open data datasets" on storage.objects;

create policy "Auth users can update open data datasets" on "storage"."objects" as permissive
for update
  to authenticated using (
    (
      bucket_id = 'opendata'::text
    )
  )
with
  check (
    (
      bucket_id = 'opendata'::text
    )
  );

drop policy if exists "Auth users can upload open data datasets" on storage.objects;

create policy "Auth users can upload open data datasets" on "storage"."objects" as permissive for insert to authenticated
with
  check (
    (
      bucket_id = 'opendata'::text
    )
  );

drop policy if exists "Authenticated users can UPDATE published datasets" on storage.objects;

create policy "Authenticated users can UPDATE published datasets" on "storage"."objects" as permissive
for update
  to authenticated using (
    (
      (
        bucket_id = 'published'::text
      ) and
      (
        (
          storage.foldername (name)
        ) [3] = 'datasets'::text
      )
    )
  )
with
  check (
    (
      (
        bucket_id = 'published'::text
      ) and
      (
        (
          storage.foldername (name)
        ) [3] = 'datasets'::text
      )
    )
  );

drop policy if exists "Authenticated users can UPLOAD published datasets" on storage.objects;

create policy "Authenticated users can UPLOAD published datasets" on "storage"."objects" as permissive for insert to authenticated
with
  check (
    (
      (
        bucket_id = 'published'::text
      ) and
      (
        (
          storage.foldername (name)
        ) [3] = 'datasets'::text
      )
    )
  );

drop policy if exists "Users can DELETE workspace datasets" on storage.objects;

create policy "Users can DELETE workspace datasets" on "storage"."objects" as permissive for delete to authenticated using (
  (
    (
      bucket_id = 'workspaces'::text
    ) and
    (
      (
        storage.foldername (name)
      ) [1] = any (
        array(
          select
            (
              unnest(
                public.util__get_auth_user_workspaces ()
              )
            )::text as unnest
        )
      )
    ) and
    (
      (
        storage.foldername (name)
      ) [2] = 'datasets'::text
    ) and
    (
      public.util__storage_object_dataset_id (name) is not null
    ) and
    (
      public.util__storage_object_workspace_id (name) is not null
    ) and
    public.util__auth_user_can_access_resource_in_workspace (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
      public.util__storage_object_workspace_id (name),
      'editor'::public.role_level
    )
  )
);

drop policy if exists "Users can SELECT workspace datasets" on storage.objects;

create policy "Users can SELECT workspace datasets" on "storage"."objects" as permissive for
select
  to authenticated using (
    (
      (
        bucket_id = 'workspaces'::text
      ) and
      (
        (
          storage.foldername (name)
        ) [1] = any (
          array(
            select
              (
                unnest(
                  public.util__get_auth_user_workspaces ()
                )
              )::text as unnest
          )
        )
      ) and
      (
        (
          storage.foldername (name)
        ) [2] = 'datasets'::text
      ) and
      (
        public.util__storage_object_dataset_id (name) is not null
      ) and
      (
        public.util__storage_object_workspace_id (name) is not null
      ) and
      public.util__auth_user_can_access_resource_in_workspace (
        'dataset'::public.resource_type,
        public.util__storage_object_dataset_id (name),
        public.util__storage_object_workspace_id (name),
        'viewer'::public.role_level
      )
    )
  );

drop policy if exists "Users can UPDATE workspace datasets" on storage.objects;

create policy "Users can UPDATE workspace datasets" on "storage"."objects" as permissive
for update
  to authenticated using (
    (
      (
        bucket_id = 'workspaces'::text
      ) and
      (
        (
          storage.foldername (name)
        ) [1] = any (
          array(
            select
              (
                unnest(
                  public.util__get_auth_user_workspaces ()
                )
              )::text as unnest
          )
        )
      ) and
      (
        (
          storage.foldername (name)
        ) [2] = 'datasets'::text
      ) and
      (
        public.util__storage_object_dataset_id (name) is not null
      ) and
      (
        public.util__storage_object_workspace_id (name) is not null
      ) and
      public.util__auth_user_can_access_resource_in_workspace (
        'dataset'::public.resource_type,
        public.util__storage_object_dataset_id (name),
        public.util__storage_object_workspace_id (name),
        'editor'::public.role_level
      )
    )
  )
with
  check (
    (
      (
        bucket_id = 'workspaces'::text
      ) and
      (
        (
          storage.foldername (name)
        ) [1] = any (
          array(
            select
              (
                unnest(
                  public.util__get_auth_user_workspaces ()
                )
              )::text as unnest
          )
        )
      ) and
      (
        (
          storage.foldername (name)
        ) [2] = 'datasets'::text
      ) and
      (
        public.util__storage_object_dataset_id (name) is not null
      ) and
      (
        public.util__storage_object_workspace_id (name) is not null
      ) and
      public.util__auth_user_can_access_resource_in_workspace (
        'dataset'::public.resource_type,
        public.util__storage_object_dataset_id (name),
        public.util__storage_object_workspace_id (name),
        'editor'::public.role_level
      )
    )
  );

drop policy if exists "Users can UPLOAD workspace datasets" on storage.objects;

create policy "Users can UPLOAD workspace datasets" on "storage"."objects" as permissive for insert to authenticated
with
  check (
    (
      (
        bucket_id = 'workspaces'::text
      ) and
      (
        (
          storage.foldername (name)
        ) [1] = any (
          array(
            select
              (
                unnest(
                  public.util__get_auth_user_workspaces ()
                )
              )::text as unnest
          )
        )
      ) and
      (
        (
          storage.foldername (name)
        ) [2] = 'datasets'::text
      ) and
      (
        public.util__storage_object_dataset_id (name) is not null
      ) and
      (
        public.util__storage_object_workspace_id (name) is not null
      ) and
      public.util__auth_user_can_access_resource_in_workspace (
        'dataset'::public.resource_type,
        public.util__storage_object_dataset_id (name),
        public.util__storage_object_workspace_id (name),
        'editor'::public.role_level
      )
    )
  );
