-- Create bucket if not exists
insert into
  storage.buckets (
    id,
    name,
    public
  )
values
  (
    'opendata',
    'opendata',
    true
  )
on conflict (id) do nothing;

-- Set policies for the public bucket
create policy "Anyone can select open data datasets" on storage.objects for
select
  to authenticated,
  anon using (
    bucket_id = 'opendata'
  );

-- Note: this was a mistake and the following policy is incorrect. It gets
-- dropped in the next migration.
create policy "Auth users can upload open data datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'opendata'
  );

-- Note: this was a mistake and the following policy is incorrect. It gets
-- dropped in the next migration.
create policy "Auth users can update open data datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'opendata'
  )
with
  check (
    bucket_id = 'opendata'
  );
