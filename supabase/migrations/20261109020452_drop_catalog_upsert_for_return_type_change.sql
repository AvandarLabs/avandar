-- `rpc_data_catalog_listings__upsert_with_relation_columns` now returns the
-- stored listings' ids instead of their rows. Postgres cannot change a
-- function's return type with `create or replace`, and `supabase db diff`
-- only emits a `drop function` when the arguments change, so the old
-- function is dropped here. The migration after this one recreates it from
-- `supabase/schemas/` with its privileges.
drop function if exists public.rpc_data_catalog_listings__upsert_with_relation_columns (jsonb);
