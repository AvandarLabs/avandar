/**
 * Marks one catalog listing's dataset as one that cannot be loaded, and why.
 * The `open-data` edge function calls this when reading a sample of the
 * source fails for a reason that is not the catalog API's own outage, or
 * when the app's DuckDB could not parse a sample it served.
 *
 * @param p_catalog_listing_id The listing.
 * @param p_reason Why its dataset cannot be loaded.
 *
 * @returns The updated listing.
 *
 * @throws When an argument is null or the listing does not exist.
 */
create or replace function public.rpc_data_catalog_listings__mark_invalid (
  p_catalog_listing_id uuid,
  p_reason public.data_catalog_listings__invalid_dataset_reason
) returns public.data_catalog_listings as $$
declare
  v_listing public.data_catalog_listings;
begin
  if p_catalog_listing_id is null or p_reason is null then
    raise exception 'rpc_data_catalog_listings__mark_invalid needs a listing id and a reason';
  end if;

  update public.data_catalog_listings listing
  set
    is_invalid = true,
    invalid_dataset_reason = p_reason
  where listing.id = p_catalog_listing_id
  returning listing.* into v_listing;

  if v_listing.id is null then
    raise exception 'Catalog listing % does not exist', p_catalog_listing_id;
  end if;

  return v_listing;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: the `open-data` edge function calls this after a
-- sample of the listing's source fails.
revoke
execute on function public.rpc_data_catalog_listings__mark_invalid (
  uuid,
  public.data_catalog_listings__invalid_dataset_reason
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__mark_invalid (
  uuid,
  public.data_catalog_listings__invalid_dataset_reason
) to service_role;
