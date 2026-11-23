/**
 * Records a finished build's Parquet copy on its catalog listing, and marks
 * the listing ready. Applies only while `p_build_id` is still the listing's
 * running build, so a build that was given up as lost cannot overwrite the
 * build that replaced it. The build read the source's freshness token, so
 * that read also becomes the listing's latest freshness check: an older
 * check would otherwise call the new copy stale and start another build.
 *
 * @param p_catalog_listing_id The listing.
 * @param p_build_id The build's id, from
 *   `rpc_data_catalog_listings__request_parquet_cache`.
 * @param p_folder_path The `opendata` bucket folder holding the copy's
 *   parts.
 * @param p_part_count How many parts the folder holds.
 * @param p_source_version The source's freshness token the copy was built
 *   from.
 * @param p_row_count How many rows the copy holds.
 * @param p_byte_size The copy's size in bytes.
 *
 * @returns Whether the copy was recorded, and the folder of the copy it
 *   replaced, which the caller deletes once nothing names it.
 *
 * @throws When an argument is null.
 */
create or replace function public.rpc_data_catalog_listings__write_parquet_cache (
  p_catalog_listing_id uuid,
  p_build_id uuid,
  p_folder_path text,
  p_part_count integer,
  p_source_version text,
  p_row_count bigint,
  p_byte_size bigint
) returns table (
  is_applied boolean,
  previous_folder_path text
) as $$
declare
  v_previous_folder_path text;
begin
  if
    p_catalog_listing_id is null or
    p_build_id is null or
    p_folder_path is null or
    p_part_count is null or
    p_source_version is null or
    p_row_count is null or
    p_byte_size is null
  then
    raise exception 'rpc_data_catalog_listings__write_parquet_cache needs every argument';
  end if;

  select listing.parquet_cache_folder_path into v_previous_folder_path
  from public.data_catalog_listings listing
  where
    listing.id = p_catalog_listing_id and
    listing.parquet_cache_build_id = p_build_id
  for update;

  if not found then
    return query select false, null::text;
    return;
  end if;

  update public.data_catalog_listings listing
  set
    parquet_cache_status = 'ready',
    parquet_cache_build_id = null,
    parquet_cache_failure_code = null,
    parquet_cache_folder_path = p_folder_path,
    parquet_cache_part_count = p_part_count,
    parquet_cache_source_version = p_source_version,
    parquet_cache_built_at = now(),
    parquet_cache_row_count = p_row_count,
    parquet_cache_byte_size = p_byte_size,
    parquet_cache_checked_at = now(),
    parquet_cache_checked_source_version = p_source_version
  where listing.id = p_catalog_listing_id;

  return query select
    true,
    case
      when v_previous_folder_path is distinct from p_folder_path then v_previous_folder_path
    end;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: the pipeline server records the copies it builds.
revoke
execute on function public.rpc_data_catalog_listings__write_parquet_cache (
  uuid,
  uuid,
  text,
  integer,
  text,
  bigint,
  bigint
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__write_parquet_cache (
  uuid,
  uuid,
  text,
  integer,
  text,
  bigint,
  bigint
) to service_role;
