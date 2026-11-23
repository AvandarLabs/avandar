/**
 * Records that a build of a catalog listing's Parquet copy failed. The
 * listing keeps the copy it had, if it had one. Applies only while
 * `p_build_id` is still the listing's running build.
 *
 * @param p_catalog_listing_id The listing.
 * @param p_build_id The build's id, from
 *   `rpc_data_catalog_listings__request_parquet_cache`.
 * @param p_failure_code Why the build failed, as an open data failure code.
 *
 * @returns Whether the failure was recorded.
 *
 * @throws When an argument is null.
 */
create or replace function public.rpc_data_catalog_listings__fail_parquet_cache (
  p_catalog_listing_id uuid,
  p_build_id uuid,
  p_failure_code text
) returns boolean as $$
begin
  if p_catalog_listing_id is null or p_build_id is null or p_failure_code is null then
    raise exception 'rpc_data_catalog_listings__fail_parquet_cache needs every argument';
  end if;

  update public.data_catalog_listings listing
  set
    parquet_cache_status = 'failed',
    parquet_cache_build_id = null,
    parquet_cache_failure_code = p_failure_code
  where
    listing.id = p_catalog_listing_id and
    listing.parquet_cache_build_id = p_build_id;

  return found;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: the pipeline server records the builds that fail.
revoke
execute on function public.rpc_data_catalog_listings__fail_parquet_cache (uuid, uuid, text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__fail_parquet_cache (uuid, uuid, text) to service_role;
