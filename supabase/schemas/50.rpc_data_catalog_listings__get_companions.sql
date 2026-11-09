/**
 * Lists the listings recommended alongside a catalog listing, in the order
 * its `companion_listings` names them. A member is matched by the API key
 * `data_catalog_listings__api_resource_unique` covers, within the listing's
 * own drive. A member no listing matches yet is left out, as is a member
 * naming the listing itself.
 *
 * Runs as the caller, so `is_in_workspace` only sees datasets the caller may
 * see: a caller outside `p_workspace_id` gets `false` for every companion.
 *
 * @param p_catalog_listing_id The listing whose companions to list.
 * @param p_workspace_id The workspace to report membership for.
 *
 * @returns One row per companion that resolves: its id, name, whether it can
 *   be added and is valid, why it is recommended (`kind`), the column pairs
 *   that join the two (`join_on`), and whether the workspace already has it.
 */
create or replace function public.rpc_data_catalog_listings__get_companions (
  p_catalog_listing_id uuid,
  p_workspace_id uuid
) returns table (
  catalog_listing_id uuid,
  display_name text,
  is_workspace_loadable boolean,
  is_invalid boolean,
  kind text,
  join_on jsonb,
  is_in_workspace boolean
) as $$
  select
    companion.id,
    companion.display_name,
    companion.is_workspace_loadable,
    companion.is_invalid,
    member.value ->> 'kind',
    coalesce(member.value -> 'joinOn', '[]'::jsonb),
    exists (
      select 1
      from public.datasets__open_data open_data
      where
        open_data.catalog_listing_id = companion.id and
        open_data.workspace_id = p_workspace_id
    )
  from public.data_catalog_listings listing
  cross join lateral jsonb_array_elements(listing.companion_listings)
    with ordinality as member (value, position)
  join public.data_catalog_listings companion on
    companion.api_service = listing.api_service and
    companion.api_base_url = listing.api_base_url and
    companion.external_dataset_id = member.value ->> 'externalDatasetId' and
    companion.api_resource_id = member.value ->> 'apiResourceId' and
    companion.id <> listing.id
  where listing.id = p_catalog_listing_id
  order by member.position;
$$ language sql stable security invoker
set
  search_path = '';

-- Signed-in users read the catalog, so they may read its recommendations.
revoke
execute on function public.rpc_data_catalog_listings__get_companions (uuid, uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__get_companions (uuid, uuid) to authenticated,
service_role;
