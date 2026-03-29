-- Create bucket if not exists
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

-- Set policies for the public bucket
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
