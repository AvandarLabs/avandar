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
 * A `pipeline_parquet` listing has a null `api_base_url`, so only a prune of
 * every drive (`p_drive_key` null) reaches it, and
 * `rpc_data_catalog_listings__list_pipeline_scopes` never reports it.
 *
 * @param p_pipeline_name The pipeline, as `pipeline_name` names it. Required.
 * @param p_scope_key The scope to remove. Required.
 * @param p_drive_key The drive (`api_base_url`), or null for every drive.
 * @param p_is_dry_run When true, counts what would happen and changes
 *   nothing. Required.
 *
 * @returns One row: listings deleted, listings kept because a workspace uses
 *   them, listings detached, and checkpoints deleted. A real run reports the
 *   rows its statements changed. A dry run returns what a real run would.
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
  v_listings_deleted integer;
  v_listings_kept_in_use integer;
  v_listings_detached integer;
  v_checkpoints_deleted integer;
begin
  if p_pipeline_name is null or p_scope_key is null or p_is_dry_run is null then
    raise exception 'rpc_data_catalog_listings__prune_pipeline_scope needs a pipeline name, a scope key, and a dry-run flag';
  end if;

  if not p_is_dry_run then
    -- Lock the candidate listings before checking which ones a workspace
    -- uses. A workspace dataset added concurrently either commits before
    -- the in-use check below sees it, or waits on this lock and then fails
    -- its foreign key. Without the lock, the delete could cascade away a
    -- just-added workspace dataset's link to its listing.
    perform 1
    from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      (p_drive_key is null or listing.api_base_url = p_drive_key) and
      p_scope_key = any (listing.pipeline_scope_keys)
    for update;
  end if;

  -- `in` over the whole table is hashed once, where a correlated `exists`
  -- would probe `datasets__open_data` once per listing.
  -- `catalog_listing_id` is `not null`, so `not in` below is safe too.
  select
    count(*) filter (where counted.is_shared),
    count(*) filter (where not counted.is_shared and counted.is_in_use),
    count(*) filter (where not counted.is_shared and not counted.is_in_use)
  into v_listings_detached, v_listings_kept_in_use, v_listings_deleted
  from (
    select
      cardinality(array_remove(listing.pipeline_scope_keys, p_scope_key)) > 0
        as is_shared,
      listing.id in (
        select open_data.catalog_listing_id
        from public.datasets__open_data open_data
      ) as is_in_use
    from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      (p_drive_key is null or listing.api_base_url = p_drive_key) and
      p_scope_key = any (listing.pipeline_scope_keys)
  ) counted;

  select count(*)
  into v_checkpoints_deleted
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
    get diagnostics v_listings_detached = row_count;

    delete from public.data_catalog_listings listing
    where
      listing.pipeline_name = p_pipeline_name and
      (p_drive_key is null or listing.api_base_url = p_drive_key) and
      p_scope_key = any (listing.pipeline_scope_keys) and
      cardinality(array_remove(listing.pipeline_scope_keys, p_scope_key)) = 0 and
      listing.id not in (
        select open_data.catalog_listing_id
        from public.datasets__open_data open_data
      );
    get diagnostics v_listings_deleted = row_count;

    delete from public.pipeline_scope_checkpoints scope_checkpoint
    where
      scope_checkpoint.pipeline_name = p_pipeline_name and
      scope_checkpoint.scope_key = p_scope_key and
      (p_drive_key is null or scope_checkpoint.drive_key = p_drive_key);
    get diagnostics v_checkpoints_deleted = row_count;
  end if;

  return query select
    v_listings_deleted,
    v_listings_kept_in_use,
    v_listings_detached,
    v_checkpoints_deleted;
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
