/**
 * Removes one scope from a pipeline's listings and deletes its checkpoints,
 * once the pipeline no longer produces that scope. Among the pipeline's
 * listings on the drive (every drive when `p_drive_key` is null) whose
 * `pipeline_scope_keys` contain the scope:
 *
 * - a listing another scope also produces loses only this key (detached);
 * - a listing only this scope produces, that a workspace dataset was added
 *   from, is left as it is, key included (kept in use);
 * - every other listing is deleted.
 *
 * Listings a workspace uses are kept because deleting one would cascade
 * away the workspace dataset's link to its source
 * (`datasets__open_data.catalog_listing_id` is `on delete cascade`).
 *
 * @param p_pipeline_name The pipeline, as `pipeline_name` names it.
 * @param p_scope_key The scope to remove.
 * @param p_drive_key The drive (`api_base_url`), or null for every drive.
 * @param p_is_dry_run When true, counts what would happen and changes
 *   nothing.
 *
 * @returns One row: listings deleted, listings kept because a workspace uses
 *   them, listings detached, and checkpoints deleted. A dry run returns what
 *   a real run would.
 */
create or replace function public.rpc_data_catalog_listings__prune_pipeline_scope (
  p_pipeline_name text,
  p_scope_key text,
  p_drive_key text,
  p_is_dry_run boolean
) returns table (
  listings_deleted integer,
  listings_kept_in_use integer,
  listings_detached integer,
  checkpoints_deleted integer
) as $$
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
$$ language plpgsql security invoker
set
  search_path = '';

-- `service_role` only: the `ava` CLI calls this with the service role key.
revoke
execute on function public.rpc_data_catalog_listings__prune_pipeline_scope (text, text, text, boolean)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__prune_pipeline_scope (text, text, text, boolean) to service_role;
