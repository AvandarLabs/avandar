set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__list_pipeline_scopes(p_pipeline_name text)
 RETURNS TABLE(drive_key text, scope_key text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select distinct stored.drive_key, stored.scope_key
  from (
    select
      listing.api_base_url as drive_key,
      unnest(listing.pipeline_scope_keys) as scope_key
    from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      listing.api_base_url is not null
    union
    select scope_checkpoint.drive_key, scope_checkpoint.scope_key
    from public.pipeline_scope_checkpoints scope_checkpoint
    where scope_checkpoint.pipeline_name = p_pipeline_name
  ) stored
  order by stored.drive_key, stored.scope_key;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__prune_pipeline_scope(p_pipeline_name text, p_scope_key text, p_drive_key text, p_is_dry_run boolean)
 RETURNS TABLE(listings_deleted integer, listings_kept_in_use integer, listings_detached integer, checkpoints_deleted integer)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_deleted integer;
  v_kept_in_use integer;
  v_detached integer;
  v_checkpoints integer;
begin
  select
    count(*) filter (where counted.is_shared),
    count(*) filter (where not counted.is_shared and counted.is_in_use),
    count(*) filter (where not counted.is_shared and not counted.is_in_use)
  into v_detached, v_kept_in_use, v_deleted
  from (
    select
      cardinality(array_remove(listing.pipeline_scope_keys, p_scope_key)) > 0
        as is_shared,
      exists (
        select 1
        from public.datasets__open_data open_data
        where open_data.catalog_listing_id = listing.id
      ) as is_in_use
    from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      (p_drive_key is null or listing.api_base_url = p_drive_key) and
      p_scope_key = any (listing.pipeline_scope_keys)
  ) counted;

  select count(*)
  into v_checkpoints
  from public.pipeline_scope_checkpoints scope_checkpoint
  where
    scope_checkpoint.pipeline_name = p_pipeline_name and
    scope_checkpoint.scope_key = p_scope_key and
    (p_drive_key is null or scope_checkpoint.drive_key = p_drive_key);

  if not p_is_dry_run then
    update public.data_catalog_listings listing
    set
      pipeline_scope_keys = array_remove(listing.pipeline_scope_keys, p_scope_key)
    where
      listing.pipeline_name = p_pipeline_name and
      (p_drive_key is null or listing.api_base_url = p_drive_key) and
      p_scope_key = any (listing.pipeline_scope_keys) and
      cardinality(array_remove(listing.pipeline_scope_keys, p_scope_key)) > 0;

    delete from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      (p_drive_key is null or listing.api_base_url = p_drive_key) and
      p_scope_key = any (listing.pipeline_scope_keys) and
      cardinality(array_remove(listing.pipeline_scope_keys, p_scope_key)) = 0 and
      not exists (
        select 1
        from public.datasets__open_data open_data
        where open_data.catalog_listing_id = listing.id
      );

    delete from public.pipeline_scope_checkpoints scope_checkpoint
    where
      scope_checkpoint.pipeline_name = p_pipeline_name and
      scope_checkpoint.scope_key = p_scope_key and
      (p_drive_key is null or scope_checkpoint.drive_key = p_drive_key);
  end if;

  return query select v_deleted, v_kept_in_use, v_detached, v_checkpoints;
end;
$function$
;


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_data_catalog_listings__list_pipeline_scopes(p_pipeline_name text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__list_pipeline_scopes(p_pipeline_name text) to "service_role";
revoke all privileges on function public.rpc_data_catalog_listings__prune_pipeline_scope(p_pipeline_name text, p_scope_key text, p_drive_key text, p_is_dry_run boolean) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__prune_pipeline_scope(p_pipeline_name text, p_scope_key text, p_drive_key text, p_is_dry_run boolean) to "service_role";
