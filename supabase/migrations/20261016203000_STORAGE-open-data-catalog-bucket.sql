-- Create bucket if not exists
insert into
  storage.buckets (
    id,
    name,
    public
  )
values
  (
    'open-data-catalog',
    'open-data-catalog',
    false
  )
on conflict (id) do nothing;

-- No policy grants `authenticated` or `anon` any access. The only reader or
-- writer of this bucket is the `open-data` edge function's service-role
-- client, which bypasses storage RLS entirely - the browser never learns
-- this bucket exists, the same way it never sees `vault.decrypted_secrets`.
