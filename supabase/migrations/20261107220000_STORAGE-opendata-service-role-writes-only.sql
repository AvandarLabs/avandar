-- Nothing but the service role writes to the `opendata` bucket: the
-- pipeline server uploads pipeline listings' Parquet and ODC listings'
-- cached Parquet copies with it, and the service role bypasses storage RLS.
-- These two policies let any signed-in user insert or overwrite any object
-- in the bucket, so a user could replace the data every workspace reads.
-- Reading stays public.
drop policy if exists "Auth users can upload open data datasets" on storage.objects;

drop policy if exists "Auth users can update open data datasets" on storage.objects;
