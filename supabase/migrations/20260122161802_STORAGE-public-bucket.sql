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
create policy "Anyone can select published datasets" on storage.objects for
select
  to authenticated,
  anon using (
    bucket_id = 'published' and
    (
      storage.foldername (name)
    ) [3] = 'datasets'
  );

create policy "Auth users can upload published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published' and
    (
      storage.foldername (name)
    ) [3] = 'datasets'
  );

create policy "Auth users can update published datasets" on storage.objects
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
