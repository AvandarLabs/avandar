drop policy if exists "Authenticated users can DELETE published datasets" on storage.objects;

drop policy if exists "Authenticated users can UPDATE published datasets" on storage.objects;

drop policy if exists "Authenticated users can UPLOAD published datasets" on storage.objects;

drop policy if exists "Users can DELETE private published datasets" on storage.objects;

drop policy if exists "Users can UPDATE private published datasets" on storage.objects;

drop policy if exists "Users can UPLOAD private published datasets" on storage.objects;

create policy "Authenticated users can DELETE published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published' and
  public.util__auth_user_can_delete_dashboard_snapshot_object (name)
);

create policy "Authenticated users can UPDATE published datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'published' and
    public.util__auth_user_can_write_dashboard_snapshot_object (name)
  )
with
  check (
    bucket_id = 'published' and
    public.util__auth_user_can_write_dashboard_snapshot_object (name)
  );

create policy "Authenticated users can UPLOAD published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published' and
    public.util__auth_user_can_write_dashboard_snapshot_object (name)
  );

create policy "Users can DELETE private published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published-private' and
  public.util__auth_user_can_delete_dashboard_snapshot_object (name)
);

create policy "Users can UPDATE private published datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'published-private' and
    public.util__auth_user_can_write_dashboard_snapshot_object (name)
  )
with
  check (
    bucket_id = 'published-private' and
    public.util__auth_user_can_write_dashboard_snapshot_object (name)
  );

create policy "Users can UPLOAD private published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published-private' and
    public.util__auth_user_can_write_dashboard_snapshot_object (name)
  );
