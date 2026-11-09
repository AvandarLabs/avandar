/**
 * Records a read of a catalog listing's freshness token, so the `open-data`
 * edge function can answer from it instead of reading the source again until
 * the recheck window passes.
 *
 * @param p_catalog_listing_id The listing.
 * @param p_source_version The freshness token the read returned.
 *
 * @returns Whether the listing exists.
 *
 * @throws When an argument is null.
 */
create or replace function public.rpc_data_catalog_listings__record_freshness_check (
  p_catalog_listing_id uuid,
  p_source_version text
) returns boolean as $$
begin
  if p_catalog_listing_id is null or p_source_version is null then
    raise exception 'rpc_data_catalog_listings__record_freshness_check needs every argument';
  end if;

  update public.data_catalog_listings listing
  set
    parquet_cache_checked_at = now(),
    parquet_cache_checked_source_version = p_source_version
  where listing.id = p_catalog_listing_id;

  return found;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: the `open-data` edge function records its own reads.
revoke
execute on function public.rpc_data_catalog_listings__record_freshness_check (uuid, text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__record_freshness_check (uuid, text) to service_role;
