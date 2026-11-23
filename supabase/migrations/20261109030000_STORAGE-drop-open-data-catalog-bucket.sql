-- The `open-data-catalog` bucket held the open-data edge function's
-- raw-bytes copies of API-backed sources. Those sources are now read from
-- Parquet copies in `opendata`, so nothing reads or writes this bucket.
--
-- Storage refuses deletes from SQL unless the transaction allows them, so
-- that a deleted object row cannot orphan its stored file. This removes the
-- bucket only when it holds no objects, which keeps that guarantee: empty it
-- through the Storage API first, and this deletes it on the next deploy.
-- Safe to replay: a bucket already gone, or one still holding objects, is
-- left as it is.
do $$
begin
  if exists (
    select 1 from storage.buckets where id = 'open-data-catalog'
  ) and not exists (
    select 1 from storage.objects where bucket_id = 'open-data-catalog'
  ) then
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.buckets where id = 'open-data-catalog';
  end if;
end;
$$;
