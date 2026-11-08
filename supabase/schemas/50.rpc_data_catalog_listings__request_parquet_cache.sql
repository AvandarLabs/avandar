/**
 * Claims a build of an API-backed catalog listing's Parquet copy, unless one
 * is already running. A build that has run longer than `p_lost_build_after`
 * is treated as lost and claimed again, under a new build id. A listing that
 * has a copy keeps serving it while the new one builds.
 *
 * Whether a build is needed at all (no copy yet, or a stale one) is the
 * caller's decision: it is the one that reads the source's freshness token.
 *
 * @param p_catalog_listing_id The listing.
 * @param p_lost_build_after How long a build may run before it is treated as
 *   lost.
 *
 * @returns The claimed build's id, which the build must pass back to record
 *   its result, or null when a build is already running.
 *
 * @throws When an argument is null, the listing does not exist, or it is not
 *   API-backed.
 */
create or replace function public.rpc_data_catalog_listings__request_parquet_cache (
  p_catalog_listing_id uuid,
  p_lost_build_after interval
) returns uuid as $$
declare
  v_listing public.data_catalog_listings;
  v_build_id uuid;
begin
  if p_catalog_listing_id is null or p_lost_build_after is null then
    raise exception 'rpc_data_catalog_listings__request_parquet_cache needs a listing id and a lost build interval';
  end if;

  select listing.* into v_listing
  from public.data_catalog_listings listing
  where listing.id = p_catalog_listing_id
  for update;

  if v_listing.id is null then
    raise exception 'Catalog listing % does not exist', p_catalog_listing_id;
  end if;

  if v_listing.access_kind <> 'api_resource' then
    raise exception 'Catalog listing % is not API-backed, so it has no Parquet copy to build',
      p_catalog_listing_id;
  end if;

  -- `clock_timestamp`, not `now`: a claim and a lost-build reclaim in one
  -- transaction must still see time pass.
  if
    v_listing.parquet_cache_status = 'building' and
    v_listing.parquet_cache_build_started_at > clock_timestamp() - p_lost_build_after
  then
    return null;
  end if;

  v_build_id := gen_random_uuid();

  update public.data_catalog_listings listing
  set
    parquet_cache_status = 'building',
    parquet_cache_build_id = v_build_id,
    parquet_cache_build_started_at = clock_timestamp(),
    parquet_cache_failure_code = null
  where listing.id = p_catalog_listing_id;

  return v_build_id;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: the `open-data` edge function requests builds.
revoke
execute on function public.rpc_data_catalog_listings__request_parquet_cache (uuid, interval)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__request_parquet_cache (uuid, interval) to service_role;
