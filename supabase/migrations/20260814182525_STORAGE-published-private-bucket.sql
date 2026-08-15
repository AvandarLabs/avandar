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
--   2. SEED pass. `[db.seed] sql_paths` in supabase/config.toml re-runs the
--      `_STORAGE` migrations after the migration timeline, reasserting the
--      desired policies as the final storage policy state.
--
-- Serving both passes is why the file contains storage statements and nothing
-- else, and why every statement is idempotent. The helper it calls,
-- public.util__storage_object_dashboard_id, is created in its own non-storage
-- migration which must appear EARLIER in the timeline.
--
-- WHAT CHANGES ON THE `published` BUCKET
--
--   * DELETE supports dashboard deletion and visibility-downgrade cleanup.
--   * INSERT and UPDATE bind the object path to the authorized dashboard and
--     caller.
--   * SELECT is unchanged. The bucket is world-readable by design; that is
--     what "published publicly" means.
--
-- The gate splits by verb in both buckets: reading a snapshot is "may I see
-- this dashboard", writing one is "may I change this dashboard".
--
insert into
  storage.buckets (
    id,
    name,
    public
  )
values
  (
    'published-private',
    'published-private',
    false
  )
on conflict (id) do nothing;

-- Ensure `published` exists in replay environments where it is absent.
insert into
  storage.buckets (
    id,
    name,
    public
  )
values
  (
    'published',
    'published',
    true
  )
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
