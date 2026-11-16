/**
 * Whether a listing last changed within one of the catalog's update windows.
 * The windows are cumulative: a listing updated last week is also within the
 * past year. A listing with no date is in `any` and in no other window.
 *
 * The windows' dates are `data_catalog_listings__updated_window`'s.
 *
 * @param p_last_updated_at When the listing last changed, as the catalog dates
 * it: the source's own update date, otherwise Avandar's last sync.
 * @param p_updated_within One of the windows above. Any other value is in no
 * window; callers validate it first.
 */
create or replace function public.data_catalog_listings__is_updated_within (
  p_last_updated_at timestamptz,
  p_updated_within text
) returns boolean as $$
  select
    case p_updated_within
      when 'any' then true
      else coalesce(
        p_last_updated_at <@ public.data_catalog_listings__updated_window (p_updated_within),
        false
      )
    end;
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only: the catalog's search and facet RPCs run as the
-- caller and call this for every listing.
revoke all on function public.data_catalog_listings__is_updated_within (timestamptz, text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.data_catalog_listings__is_updated_within (timestamptz, text) to authenticated;
